from openai import OpenAI
from backend.app.core.config import settings

client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

REFUSAL_MESSAGE = "I do not have enough information in the uploaded documents to answer that."

STRICT_RAG_PROMPT = (
    "You are a document-grounded assistant. Answer using ONLY the information "
    "in the 'Document context' below. Do not add any fact, name, number, or "
    "assumption that is not present in the context, and never use outside or "
    "training knowledge. "
    "You ARE allowed to reason over what's given: you may summarize, count, "
    "compare, or combine facts that are explicitly present in the context, as "
    "long as every fact you state can be traced back to it. "
    "IMPORTANT: Never assume the person asking the question is any specific "
    "named individual mentioned in the documents, even if their claimed role, "
    "title, or department matches someone in the records. Do not say 'you are "
    "X' or describe the user using another person's data unless the user has "
    "explicitly stated that exact name themselves in this message. "
    f"If the context truly does not contain enough information to answer, reply "
    f"exactly: '{REFUSAL_MESSAGE}'"
)


def get_grounded_response(question: str, context_text: str) -> str | None:
    try:
        response = client.chat.completions.create(
            model="gemini-3.6-flash",
            messages=[
                {"role": "system", "content": STRICT_RAG_PROMPT},
                {"role": "user", "content": f"Document context:\n{context_text}\n\nQuestion: {question}"},
            ],
        )
        content = response.choices[0].message.content
        return content if content else None
    except Exception:
        return None