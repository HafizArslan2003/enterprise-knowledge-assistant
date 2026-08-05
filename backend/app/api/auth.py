from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from backend.app.database.dependencies import get_db
from backend.app.models.user import User
from backend.app.schemas.user import UserCreate, UserResponse
from backend.app.schemas.token import Token
from backend.app.core.security import get_password_hash, verify_password, create_access_token, ALGORITHM
from backend.app.core.config import settings

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
    
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=get_password_hash(safe_password)
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
    user = db.query(User).filter(User.username == form_data.username).first()
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