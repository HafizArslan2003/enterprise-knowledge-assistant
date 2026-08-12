from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.dependencies import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.chat import ChatSession, ChatMessage
from backend.app.models.document import Document
from backend.app.schemas.session import SessionCreateResponse, SessionDetailResponse, FeedbackRequest

router = APIRouter()


@router.post("/", response_model=SessionCreateResponse)
def create_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_session = ChatSession(user_id=current_user.id)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@router.get("/", response_model=list[SessionCreateResponse])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sessions = (
    db.query(ChatSession)
    .filter(ChatSession.user_id == current_user.id)
    .filter(ChatSession.messages.any())
    .order_by(ChatSession.created_at.desc())
    .all()
)
    return sessions

@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/messages/{message_id}/feedback")
def submit_feedback(
    message_id: int,
    request: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if request.feedback not in (1, -1):
        raise HTTPException(status_code=400, detail="feedback must be 1 or -1")

    if message.feedback and message.source_document_ids:
        doc_ids = [int(x) for x in message.source_document_ids.split(",") if x]
        for doc_id in doc_ids:
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if doc:
                doc.feedback_score -= message.feedback

    message.feedback = request.feedback

    if message.source_document_ids:
        doc_ids = [int(x) for x in message.source_document_ids.split(",") if x]
        for doc_id in doc_ids:
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if doc:
                doc.feedback_score += request.feedback

    db.commit()
    return {"status": "feedback recorded"}