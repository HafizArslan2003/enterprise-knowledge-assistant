import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.dependencies import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.chat import ChatSession, ChatMessage
from backend.app.schemas.chat import ChatHistoryMessage, ChatHistorySession, ChatRequest, ChatResponse
from backend.app.services.search import search_documents
from backend.app.core.llm import get_grounded_response, REFUSAL_MESSAGE
from backend.app.core.config import settings
from backend.app.core.api_key_crypto import decrypt_api_key

router = APIRouter()

GREETING_PATTERN = re.compile(r"^(hi|hello|hey|greetings)$", re.IGNORECASE)
NAME_QUERY_PATTERN = re.compile(r"\b(?:what(?:'s| is)|tell me|do you know|remember)\b.*\bmy name\b|\bwho am i\b", re.IGNORECASE)
NAME_STATEMENT_PATTERN = re.compile(
    r"\b(?:my name is|remember my name(?: is)?|i am|i'm)\s*[:,-]?\s*"
    r"([A-Za-z][A-Za-z '-]{1,60})",
    re.IGNORECASE,
)


def remembered_name(messages: list[ChatMessage]) -> str | None:
    """Return the latest explicit name supplied by the user in this session."""
    for message in reversed(messages):
        if message.role != "user":
            continue
        match = NAME_STATEMENT_PATTERN.search(message.content)
        if match:
            return match.group(1).strip(" .,!?")
    return None


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

        # 3. Resolve simple session-memory interactions locally. They do not need
        # an embedding request, vector search, or LLM call.
        question = request.question.strip()
        if GREETING_PATTERN.fullmatch(question):
            answer = "Hello! How can I help you with your uploaded documents?"
            sources = []
            source_doc_ids_str = None
        elif NAME_QUERY_PATTERN.search(question):
            prior_user_messages = (
                db.query(ChatMessage)
                .filter(
                    ChatMessage.session_id == session.id,
                    ChatMessage.id != user_message.id,
                    ChatMessage.role == "user",
                )
                .order_by(ChatMessage.created_at.desc())
                .all()
            )
            stated_name = remembered_name(prior_user_messages)
            answer = f"Your name is {stated_name}." if stated_name else "You have not told me your name in this chat."
            sources = []
            source_doc_ids_str = None
        elif NAME_STATEMENT_PATTERN.search(question):
            stated_name = remembered_name([user_message])
            answer = f"Understood, {stated_name}. I will remember your name for this chat."
            sources = []
            source_doc_ids_str = None
        else:
            api_key = decrypt_api_key(current_user.encrypted_gemini_api_key)
            if not api_key:
                raise HTTPException(status_code=400, detail="Add your Gemini API key in Settings before asking document questions")
            answer, sources, source_doc_ids_str = answer_document_question(
                db, request.question, current_user, api_key
            )

        # 4. Save the assistant's answer, including any documents it used.
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


def answer_document_question(db: Session, question: str, user: User, api_key: str):
    """Run the slow RAG path only for questions that require documents."""
    results = search_documents(db, question, api_key, top_k=settings.RAG_TOP_K, user=user)
    if not results:
        return REFUSAL_MESSAGE, [], None

    context_text = "\n\n---\n\n".join(
        f"[Source: {chunk.document.filename}, Page {chunk.page_number}]\n{chunk.text}"
        for chunk, _ in results
    )
    answer = get_grounded_response(api_key, question, context_text, user_role=user.role)
    if not answer:
        return "The AI service is currently unavailable. Please try again shortly.", [], None
    if REFUSAL_MESSAGE in answer:
        return REFUSAL_MESSAGE, [], None

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
    sources = []
    for source in raw_sources:
        key = (source["document_name"], source["page_number"])
        if key not in seen:
            seen.add(key)
            sources.append(source)

    seen_doc_ids = set()
    for chunk, _ in results:
        if chunk.document_id not in seen_doc_ids:
            chunk.document.access_count = (chunk.document.access_count or 0) + 1
            seen_doc_ids.add(chunk.document_id)
    return answer, sources, ",".join(str(doc_id) for doc_id in seen_doc_ids)


"""Legacy RAG implementation retained below during migration."""
def _legacy_ask_question(
    request: ChatRequest,
    db: Session,
    current_user: User,
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
            raise HTTPException(status_code=500, detail="Legacy handler cannot create sessions")

        # 2. Save the user's new message
        user_message = ChatMessage(session_id=session.id, role="user", content=request.question)
        db.add(user_message)
        db.commit()

        # 3. Preserve the previous ten turns. The current message is supplied separately.
        prior_messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id, ChatMessage.id != user_message.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(settings.RAG_HISTORY_TURNS)
            .all()
        )
        history = [
            {"role": message.role, "content": message.content[-1200:]}
            for message in reversed(prior_messages)
            if message.role in {"user", "assistant"}
        ]

        # 4. Search documents based on user role
        results = search_documents(db, request.question, api_key="", top_k=settings.RAG_TOP_K, user=current_user)

        source_doc_ids_str = None
        sources = []

        if not results:
            generated = get_grounded_response(api_key, request.question, "", history, user_role=current_user.role)
            answer = (
                generated.replace("<documents_used>true</documents_used>", "")
                .replace("<documents_used>false</documents_used>", "")
                .strip()
                if generated
                else REFUSAL_MESSAGE
            )
        else:
            context_text = "\n\n".join(
                f"[Source: {chunk.document.filename}, Page {chunk.page_number}]\n{chunk.text}"
                for chunk, _ in results
            )
            generated = get_grounded_response(api_key, request.question, context_text, history, user_role=current_user.role)

            if generated:
                uses_documents = "<documents_used>true</documents_used>" in generated.lower()
                generated = (
                    generated.replace("<documents_used>true</documents_used>", "")
                    .replace("<documents_used>false</documents_used>", "")
                    .strip()
                )
                if not uses_documents:
                    # Retrieval candidates are not citations unless the answer used them.
                    results = []

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
