from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database.dependencies import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.chat import ChatSession, ChatMessage
from backend.app.schemas.analytics import AnalyticsSummary, PopularDocument, UsagePoint, UsageSummary

router = APIRouter()


@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_documents = db.query(Document).filter(Document.uploaded_by == current_user.id).count()
    total_sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).count()
    total_questions_asked = (
        db.query(ChatMessage)
        .join(ChatSession)
        .filter(ChatSession.user_id == current_user.id, ChatMessage.role == "user")
        .count()
    )

    top_documents = (
        db.query(Document)
        .filter(Document.uploaded_by == current_user.id, Document.access_count > 0)
        .order_by(Document.access_count.desc())
        .limit(5)
        .all()
    )

    recent_user_messages = (
        db.query(ChatMessage)
        .join(ChatSession)
        .filter(ChatSession.user_id == current_user.id, ChatMessage.role == "user")
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


@router.get("/usage", response_model=UsageSummary)
def get_usage_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    points = []
    for offset in range(6, -1, -1):
        day = date.today() - timedelta(days=offset)
        count = (
            db.query(ChatMessage)
            .join(ChatSession)
            .filter(ChatSession.user_id == current_user.id, ChatMessage.role == "user")
            .filter(func.date(ChatMessage.created_at) == day)
            .count()
        )
        points.append(UsagePoint(label=day.strftime("%a"), value=count))

    total_questions = sum(point.value for point in points)
    automation_rate = min(100, int(round((total_questions / max(1, len(points) * 6)) * 100)))

    return UsageSummary(
        labels=[point.label for point in points],
        values=[point.value for point in points],
        automation_rate=automation_rate,
    )