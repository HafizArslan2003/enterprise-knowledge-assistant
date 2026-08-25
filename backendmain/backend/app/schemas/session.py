from pydantic import BaseModel
from datetime import datetime


class SessionCreateResponse(BaseModel):
    id: int
    title: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    feedback: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class SessionDetailResponse(BaseModel):
    id: int
    title: str | None
    created_at: datetime
    messages: list[MessageResponse]

    class Config:
        from_attributes = True


class FeedbackRequest(BaseModel):
    feedback: int  # 1 for thumbs up, -1 for thumbs down