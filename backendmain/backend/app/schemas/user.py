from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: str | None = None

class UserResponse(UserBase):
    id: int
    username: str
    email: EmailStr
    role: str
    slack_user_id: str | None = None

    class Config:
        from_attributes = True


class GeminiApiKeyUpdate(BaseModel):
    api_key: str


class GeminiApiKeyStatus(BaseModel):
    configured: bool
    masked_key: str | None = None

class SlackLinkRequest(BaseModel):
    slack_user_id: str
