from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.dependencies import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.chat import ChatSession, ChatMessage
from backend.app.schemas.chat import ChatHistoryMessage, ChatHistorySession, ChatRequest, ChatResponse
from backend.app.services.search import search_documents
from backend.app.core.llm import get_grounded_response, REFUSAL_MESSAGE

router = APIRouter()


@router.get("/history", response_model=list[ChatHistorySession])
def get_chat_history(
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

    return [
        ChatHistorySession(
            id=session.id,
            title=session.title or "Untitled conversation",
            created_at=session.created_at,
            messages=[
                ChatHistoryMessage(
                    id=message.id,
                    role=message.role,
                    content=message.content,
                    created_at=message.created_at,
                )
                for message in sorted(session.messages, key=lambda item: item.created_at)
            ],
        )
        for session in sessions
    ]


@router.post("/ask", response_model=ChatResponse)
def ask_question(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        # 1. Get or create the session
        if request.session_id:
            session = (
                db.query(ChatSession)
                .filter(ChatSession.id == request.session_id, ChatSession.user_id == current_user.id)
                .first()
            )
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")
        else:
            title = request.question.strip()
            if len(title) > 50:
                title = title[:50].rsplit(" ", 1)[0] + "..."

            session = ChatSession(user_id=current_user.id, title=title)
            db.add(session)
            db.commit()
            db.refresh(session)

        # 2. Save the user's new message
        user_message = ChatMessage(session_id=session.id, role="user", content=request.question)
        db.add(user_message)
        db.commit()

        # 3. Always search the documents first — no LLM judgment call, no bypass
        results = search_documents(db, request.question, top_k=3)

        source_doc_ids_str = None
        sources = []

        if not results:
            answer = REFUSAL_MESSAGE
        else:
            context_text = "\n\n---\n\n".join(
                f"[Source: {chunk.document.filename}, Page {chunk.page_number}]\n{chunk.text}"
                for chunk, _ in results
            )
            generated = get_grounded_response(request.question, context_text)

            if not generated:
                answer = "The AI service is currently unavailable. Please try again shortly."
            elif REFUSAL_MESSAGE in generated:
                # Model correctly found nothing usable — don't attach sources
                # even though the vector search returned candidate chunks.
                answer = generated
            else:
                answer = generated
                raw_sources = [
                    {
                        "document_name": chunk.document.filename,
                        "page_number": chunk.page_number,
                        "accuracy": pct,
                        "text_snippet": chunk.text[:200],
                    }
                    for chunk, pct in results
                ]
                seen = set()
                for s in raw_sources:
                    key = (s["document_name"], s["page_number"])
                    if key not in seen:
                        seen.add(key)
                        sources.append(s)

                seen_doc_ids = set()
                for chunk, _ in results:
                    if chunk.document_id not in seen_doc_ids:
                        chunk.document.access_count = (chunk.document.access_count or 0) + 1
                        seen_doc_ids.add(chunk.document_id)
                source_doc_ids_str = ",".join(str(doc_id) for doc_id in seen_doc_ids)

        # 4. Save the assistant's answer, including which documents it was grounded in
        assistant_message = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=answer,
            source_document_ids=source_doc_ids_str,
        )
        db.add(assistant_message)
        db.commit()

        return ChatResponse(answer=answer, sources=sources, session_id=session.id)

    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating answer: {str(e)}")