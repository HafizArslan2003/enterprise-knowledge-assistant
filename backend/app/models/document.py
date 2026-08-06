from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from pgvector.sqlalchemy import Vector
from backend.app.database.base import Base

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    chunks = relationship("DocumentChunk", back_populates="document")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    text = Column(String, nullable=False)
    page_number = Column(Integer, nullable=True)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(Vector(768))  # Gemini's embedding size — confirm in step 4

    document = relationship("Document", back_populates="chunks")