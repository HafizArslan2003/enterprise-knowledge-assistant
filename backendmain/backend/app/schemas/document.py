from pydantic import BaseModel
from datetime import datetime

class DocumentResponse(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    chunk_count: int

    class Config:
        from_attributes = True