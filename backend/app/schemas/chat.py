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