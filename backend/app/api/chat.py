from fastapi import APIRouter, Depends, HTTPException
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.schemas.chat import ChatRequest, ChatResponse
from backend.app.core.llm import ask_llm

router = APIRouter()

@router.post("/ask", response_model=ChatResponse)
def ask_question(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        answer = ask_llm(request.question)
        return ChatResponse(answer=answer)
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")