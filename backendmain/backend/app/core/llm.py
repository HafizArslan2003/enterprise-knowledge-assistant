from openai import OpenAI
from backend.app.core.config import settings

client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

SYSTEM_PROMPT = (
    "You are a helpful enterprise knowledge assistant. "
    "You have access to a tool called search_documents that searches the company's uploaded documents. "
    "Use it ONLY when the question is likely about company-specific documents, projects, or internal information. "
    "For general knowledge questions, greetings, or anything unrelated to uploaded documents, answer directly without using the tool. "
    "When you do use search_documents and the results don't contain the answer, say 'I do not have enough information to answer that.'"
)

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_documents",
            "description": "Search the company's uploaded documents for relevant information to answer a question.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant document chunks."
                    }
                },
                "required": ["query"]
            }
        }
    }
]


class _FallbackMessage:
    def __init__(self, content: str, tool_calls=None):
        self.content = content
        self.tool_calls = tool_calls or []


class _FallbackChoice:
    def __init__(self, message):
        self.message = message


class _FallbackResponse:
    def __init__(self, content: str, tool_calls=None):
        self.choices = [_FallbackChoice(_FallbackMessage(content, tool_calls))]


def get_initial_response(question: str):
    """
    Sends the question to the LLM along with the search_documents tool definition.
    Returns the raw response object so the caller can check if a tool call was requested.
    """
    try:
        response = client.chat.completions.create(
            model="gemini-3.6-flash",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
            tools=TOOLS,
        )
        return response
    except Exception:
        return _FallbackResponse(
            content="I can help answer your question directly. If you upload documents, I can also ground the answer in those files.",
            tool_calls=[],
        )


def get_final_response(question: str, tool_result_text: str) -> str:
    """
    Sends the question plus the tool's search results back to the LLM to generate the final answer.
    """
    try:
        response = client.chat.completions.create(
            model="gemini-3.6-flash",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question},
                {"role": "user", "content": f"Search results:\n{tool_result_text}"},
            ],
        )
        return response.choices[0].message.content
    except Exception:
        return (
            "I could not reach the AI provider, but I can still answer from the available context. "
            f"Documents referenced in the current session are summarized below:\n{tool_result_text}"
        )