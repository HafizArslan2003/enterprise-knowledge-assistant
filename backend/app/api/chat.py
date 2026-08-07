from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.dependencies import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.chat import ChatSession, ChatMessage
from backend.app.schemas.chat import ChatRequest, ChatResponse, Source
from backend.app.services.search import search_documents
from backend.app.core.llm import get_initial_response, get_final_response

router = APIRouter()


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
            # Auto-generate a short title from the first question
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

        # 3. Build recent conversation history (last 6 messages) for context
        recent_messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(6)
            .all()
        )
        recent_messages.reverse()
        history_text = "\n".join([f"{m.role}: {m.content}" for m in recent_messages])

        # 4. Ask the LLM whether it needs to search documents
        initial = get_initial_response(request.question)
        message = initial.choices[0].message

        source_doc_ids_str = None

        if not message.tool_calls:
            answer = message.content
            sources = []
        
        else:
            similar_chunks = search_documents(db, request.question)
            if not similar_chunks:
                answer = "No relevant documents were found to answer that."
                sources = []
            else:
                context_text = "\n\n---\n\n".join([c.text for c in similar_chunks])
                full_context = f"Conversation so far:\n{history_text}\n\nDocument context:\n{context_text}"
                answer = get_final_response(request.question, full_context)

                raw_sources = [
                    Source(document_name=chunk.document.filename, page_number=chunk.page_number)
                    for chunk in similar_chunks
                ]
                seen = set()
                sources = []
                for s in raw_sources:
                    key = (s.document_name, s.page_number)
                    if key not in seen:
                        seen.add(key)
                        sources.append(s)

                # Track usage analytics: increment access_count for each unique document used
                seen_doc_ids = set()
                for chunk in similar_chunks:
                    if chunk.document_id not in seen_doc_ids:
                        chunk.document.access_count = (chunk.document.access_count or 0) + 1
                        seen_doc_ids.add(chunk.document_id)

                source_doc_ids_str = ",".join(str(doc_id) for doc_id in seen_doc_ids)       
                        

       
        
        # 5. Save the assistant's answer, including which documents it was grounded in
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