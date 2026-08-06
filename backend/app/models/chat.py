from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database.base import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="session", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    role = Column(String, nullable=False)   # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    feedback = Column(Integer, nullable=True)  # 1 = thumbs up, -1 = thumbs down, null = no feedback yet

    session = relationship("ChatSession", back_populates="messages")