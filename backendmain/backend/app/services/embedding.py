from openai import OpenAI
from backend.app.core.config import settings

client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

def get_embedding(text: str) -> list[float]:
    if not settings.OPENAI_API_KEY:
        return [0.0] * 768

    try:
        response = client.embeddings.create(
            model="gemini-embedding-001",
            input=text,
            dimensions=768,
        )
        return response.data[0].embedding
    except Exception:
        return [0.0] * 768