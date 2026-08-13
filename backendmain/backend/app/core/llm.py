from backend.app.core.config import settings
from openai import OpenAI

REFUSAL_MESSAGE = "I do not have enough information in the uploaded documents to answer that."

STRICT_RAG_PROMPT = (
    "Answer only from Document context. Do not use outside knowledge or invent "
    "facts. Give a concise, complete answer. If the context does not contain "
    f"enough information, reply exactly: '{REFUSAL_MESSAGE}'"
)


def get_grounded_response(
    api_key: str,
    question: str,
    context_text: str,
    history: list[dict[str, str]] | None = None,
) -> str | None:
    try:
        messages = [{"role": "system", "content": STRICT_RAG_PROMPT}]
        messages.append(
            {"role": "user", "content": f"Document context:\n{context_text}\n\nQuestion: {question}"}
        )
        response = OpenAI(
            api_key=api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        ).chat.completions.create(
            model="gemini-3.6-flash",
            messages=messages,
            temperature=0,
            max_tokens=settings.RAG_MAX_OUTPUT_TOKENS,
            reasoning_effort="minimal",
        )
        content = response.choices[0].message.content
        if not content:
            return None
        return content
    except Exception:
        return None
