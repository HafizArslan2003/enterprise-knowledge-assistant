from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database.dependencies import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.chat import ChatSession, ChatMessage
from backend.app.schemas.analytics import AnalyticsSummary, PopularDocument

router = APIRouter()


@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_documents = db.query(Document).count()
    total_sessions = db.query(ChatSession).count()
    total_questions_asked = db.query(ChatMessage).filter(ChatMessage.role == "user").count()

    top_documents = (
        db.query(Document)
        .filter(Document.access_count > 0)
        .order_by(Document.access_count.desc())
        .limit(5)
        .all()
    )

    recent_user_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.role == "user")
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
        .all()
    )

    return AnalyticsSummary(
        total_documents=total_documents,
        total_sessions=total_sessions,
        total_questions_asked=total_questions_asked,
        top_documents=[
            PopularDocument(filename=d.filename, access_count=d.access_count) for d in top_documents
        ],
        recent_questions=[m.content for m in recent_user_messages],
    )