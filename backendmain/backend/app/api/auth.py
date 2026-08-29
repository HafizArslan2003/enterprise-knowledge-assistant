from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from backend.app.database.dependencies import get_db
from backend.app.models.user import User
from backend.app.schemas.user import GeminiApiKeyStatus, GeminiApiKeyUpdate, UserCreate, UserResponse
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
    
    # Safely truncate password bytes to prevent passlib/bcrypt 72-byte restriction crash
    safe_password = user_in.password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    
    # Automatically assign role based on username or provided role
    user_role = "employee"
    if user_in.username.lower() == "admin" or "admin" in user_in.username.lower():
        user_role = "admin"
    if user_in.role in ["admin", "employee"]:
        user_role = user_in.role
        
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=get_password_hash(safe_password),
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
    safe_password = form_data.password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    user = db.query(User).filter(
        (User.username == form_data.username) | (User.email == form_data.username)
    ).first()
    if not user or not verify_password(safe_password, user.hashed_password):
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
