from openai import OpenAI
from backend.app.core.config import settings

client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

def ask_llm(question: str) -> str:
    response = client.chat.completions.create(
        model="gemini-3.6-flash",
        messages=[
            {"role": "system", "content": "You are a helpful enterprise knowledge assistant."},
            {"role": "user", "content": question},
        ],
    )
    return response.choices[0].message.content