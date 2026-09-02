from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from backend.app.database.dependencies import get_db
from backend.app.models.user import User
from backend.app.schemas.user import GeminiApiKeyStatus, GeminiApiKeyUpdate, UserCreate, UserResponse, SlackLinkRequest
from backend.app.schemas.token import Token
from backend.app.core.security import get_password_hash, verify_password, create_access_token, ALGORITHM
from backend.app.core.config import settings
from backend.app.core.api_key_crypto import encrypt_api_key, decrypt_api_key

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.email == user_in.email) | (User.username == user_in.username)
    ).first()
    
    if user:
        raise HTTPException(
            status_code=400,
            detail="User with this email or username already exists"
        )
    
    # Automatically assign role based on username or provided role
    user_role = "employee"
    if user_in.username.lower() == "admin" or "admin" in user_in.username.lower():
        user_role = "admin"
    if user_in.role in ["admin", "employee"]:
        user_role = user_in.role
        
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),  # security.py handles 72-byte cap
        role=user_role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username)
    ).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/gemini-key", response_model=GeminiApiKeyStatus)
def get_gemini_key_status(current_user: User = Depends(get_current_user)):
    api_key = decrypt_api_key(current_user.encrypted_gemini_api_key)
    return GeminiApiKeyStatus(
        configured=bool(api_key),
        masked_key=f"••••••••{api_key[-4:]}" if api_key else None,
    )


@router.put("/gemini-key", response_model=GeminiApiKeyStatus)
def save_gemini_key(
    payload: GeminiApiKeyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    api_key = payload.api_key.strip()
    if len(api_key) < 20:
        raise HTTPException(status_code=400, detail="Enter a valid Gemini API key")

    current_user.encrypted_gemini_api_key = encrypt_api_key(api_key)
    db.commit()
    return GeminiApiKeyStatus(configured=True, masked_key=f"••••••••{api_key[-4:]}")


@router.put("/users/{user_id}/slack-id", response_model=UserResponse)
def link_slack_account(
    user_id: int,
    payload: SlackLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin only: Link an existing Agilo user to their Slack User ID."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can link Slack accounts")
    
    slack_id = payload.slack_user_id.strip()
    
    # Slack user IDs typically start with U or W and are alphanumeric
    if not slack_id.startswith(("U", "W")) or len(slack_id) < 5:
        raise HTTPException(status_code=400, detail="Invalid Slack user ID format (must start with U or W)")
        
    # Ensure this Slack ID isn't already assigned to someone else
    existing = db.query(User).filter(User.slack_user_id == slack_id).first()
    if existing and existing.id != user_id:
        raise HTTPException(status_code=400, detail=f"Slack ID {slack_id} is already linked to another user ({existing.username})")
        
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    target_user.slack_user_id = slack_id
    db.commit()
    db.refresh(target_user)
    return target_user


# ─── SLACK OAUTH AUTOMATIC LINKING ──────────────────────────────────────────

import urllib.parse
from datetime import datetime, timedelta
import httpx
from fastapi.responses import RedirectResponse

@router.get("/slack/connect")
def connect_slack(current_user: User = Depends(get_current_user)):
    """
    Starts the Slack OAuth flow.
    Generates a secure, short-lived JWT state tied to the authenticated user.
    """
    if not settings.SLACK_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Slack OAuth is not configured on the server")
        
    # Create a secure state token valid for 15 minutes
    state_payload = {
        "user_id": current_user.id,
        "exp": datetime.utcnow() + timedelta(minutes=15)
    }
    state_token = jwt.encode(state_payload, settings.SECRET_KEY, algorithm=ALGORITHM)
    
    # Slack OAuth v2 authorization URL
    params = {
        "client_id": settings.SLACK_CLIENT_ID,
        "scope": "users:read",  # Minimum scope to read the authenticating user's identity
        "user_scope": "users:read",
        "redirect_uri": settings.SLACK_REDIRECT_URI,
        "state": state_token
    }
    slack_oauth_url = f"https://slack.com/oauth/v2/authorize?{urllib.parse.urlencode(params)}"
    
    return {"url": slack_oauth_url}


@router.get("/slack/callback")
def slack_callback(code: str, state: str, db: Session = Depends(get_db)):
    """
    Handles the Slack redirect. Verifies the state, exchanges the code,
    and maps the Slack User ID to the original Agilo user.
    """
    # 1. Verify the state token to prevent CSRF and guarantee identity binding
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}?slack_error=invalid_state")
    except JWTError:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?slack_error=expired_state")
        
    # 2. Exchange OAuth code for Slack identity
    data = {
        "client_id": settings.SLACK_CLIENT_ID,
        "client_secret": settings.SLACK_CLIENT_SECRET,
        "code": code,
        "redirect_uri": settings.SLACK_REDIRECT_URI
    }
    
    try:
        # We use httpx synchronously here for simplicity, or requests
        import requests
        response = requests.post("https://slack.com/api/oauth.v2.access", data=data)
        result = response.json()
        
        if not result.get("ok"):
            error_msg = result.get("error", "unknown_error")
            return RedirectResponse(url=f"{settings.FRONTEND_URL}?slack_error={error_msg}")
            
        slack_user_id = result.get("authed_user", {}).get("id")
        if not slack_user_id:
            return RedirectResponse(url=f"{settings.FRONTEND_URL}?slack_error=missing_identity")
            
        # 3. Check for existing mapping
        existing = db.query(User).filter(User.slack_user_id == slack_user_id).first()
        if existing and existing.id != user_id:
            # Already linked to someone else!
            return RedirectResponse(url=f"{settings.FRONTEND_URL}?slack_error=already_linked")
            
        # 4. Map it to our securely authenticated user
        target_user = db.query(User).filter(User.id == user_id).first()
        if target_user:
            target_user.slack_user_id = slack_user_id
            db.commit()
            
        # 5. Success redirect
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?slack_success=true")
        
    except Exception as e:
        print(f"Slack OAuth Error: {e}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?slack_error=server_error")


@router.delete("/slack/disconnect")
def disconnect_slack(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Allows a user to unlink their own Slack account."""
    if not current_user.slack_user_id:
        return {"status": "already_disconnected"}
        
    current_user.slack_user_id = None
    db.commit()
    return {"status": "success"}
