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


def get_initial_response(question: str):
    """
    Sends the question to the LLM along with the search_documents tool definition.
    Returns the raw response object so the caller can check if a tool call was requested.
    """
    response = client.chat.completions.create(
        model="gemini-3.6-flash",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ],
        tools=TOOLS,
    )
    return response


def get_final_response(question: str, tool_result_text: str) -> str:
    """
    Sends the question plus the tool's search results back to the LLM to generate the final answer.
    """
    response = client.chat.completions.create(
        model="gemini-3.6-flash",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
            {"role": "user", "content": f"Search results:\n{tool_result_text}"},
        ],
    )
    return response.choices[0].message.content