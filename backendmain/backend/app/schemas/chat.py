from datetime import datetime

from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str
    session_id: int | None = None


class Source(BaseModel):
    document_name: str
    page_number: int | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source] = []
    session_id: int | None = None


class ChatHistoryMessage(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatHistorySession(BaseModel):
    id: int
    title: str | None = None
    created_at: datetime
    messages: list[ChatHistoryMessage] = []

    class Config:
        from_attributes = True