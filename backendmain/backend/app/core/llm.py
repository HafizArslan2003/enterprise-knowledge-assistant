import time
from datetime import date

from backend.app.core.config import settings
from openai import OpenAI


# =========================================================
# Configuration
# =========================================================

REFUSAL_MESSAGE = (
    "I do not have enough information in the uploaded documents "
    "to answer that."
)


# =========================================================
# RAG System Prompt
# =========================================================

STRICT_RAG_PROMPT = f"""
You are an Enterprise Knowledge Assistant with access to uploaded company and employee documents.

Your job is to answer the user's question using ONLY the information provided in the Document context.

IMPORTANT RULES:

1. Use the Document context as your ONLY source of facts.

2. DO NOT use outside knowledge or invent facts.

3. When the user uses words like "me", "my", "I", "mine" — assume they are referring to
   the person or subject described in the provided Document context. Answer based on what
   the documents say, even if the document is about a named individual.

4. You ARE allowed to reason over the provided information:
   - Count records
   - Calculate averages and differences between dates
   - Compare, filter, group, and summarize values
   - Perform simple arithmetic
   - Combine information from multiple document chunks

5. For date/tenure calculations, use the Current Date provided by the application.

6. When the context contains enough information, ALWAYS answer the question.
   Do not unnecessarily refuse.

7. If the context GENUINELY does not contain enough information to answer the specific
   question asked, reply exactly:

   "{REFUSAL_MESSAGE}"

8. Keep the answer concise but complete. Show calculations briefly when useful.

9. Never claim information is missing when it IS present in the Document context.

10. Format your answer clearly. Use bullet points or sections when the answer has
    multiple parts.
"""


# =========================================================
# Gemini Grounded Response
# =========================================================

def get_grounded_response(
    api_key: str,
    question: str,
    context_text: str,
    history: list[dict[str, str]] | None = None,
    user_role: str = "admin",
) -> str | None:

    try:

        # -------------------------------------------------
        # Check document context
        # -------------------------------------------------

        if not context_text or not context_text.strip():

            print(
                "⚠️ LLM received empty document context."
            )

            return REFUSAL_MESSAGE

        # -------------------------------------------------
        # Get current application date
        # -------------------------------------------------

        current_date = date.today().isoformat()
        
        # -------------------------------------------------
        # Build System Prompt
        # -------------------------------------------------
        system_prompt = STRICT_RAG_PROMPT
        if user_role == "employee":
            system_prompt += "\n\n11. SECURITY RULE: You are talking to a normal employee. You MUST NOT reveal any personal client information such as client names, addresses, SSNs, financial data, phone numbers, or contact details found in the documents. If the user asks for client PII, politely refuse and state that employee accounts cannot access client personal data."

        # -------------------------------------------------
        # Build messages
        # -------------------------------------------------

        messages = [
            {
                "role": "system",
                "content": system_prompt,
            }
        ]

        # -------------------------------------------------
        # Add conversation history
        # -------------------------------------------------

        if history:

            # Only use the most recent 6 messages.
            recent_history = history[-6:]

            for message in recent_history:

                role = message.get("role")
                content = message.get("content")

                if role not in ("user", "assistant"):
                    continue

                if not content:
                    continue

                messages.append(
                    {
                        "role": role,
                        "content": content,
                    }
                )

        # -------------------------------------------------
        # Document context + current date + question
        # -------------------------------------------------

        user_prompt = f"""
DOCUMENT CONTEXT
================

{context_text}


CURRENT DATE
============

{current_date}


USER QUESTION
=============

{question}


INSTRUCTIONS
============

Answer the user's question using the Document context above.

The Current Date is provided by the application and may be used
for calculations involving dates, such as employee tenure.

You may perform:

- counting
- averages
- filtering
- comparisons
- grouping
- arithmetic
- date calculations
- summarization

Use ONLY company information contained in the Document context.

For employee tenure:

Joining Date → Current Date ({current_date})

Calculate the tenure using those dates.

Do not use outside company information.

If the required information genuinely does not exist in the
Document context, reply exactly:

{REFUSAL_MESSAGE}
"""

        messages.append(
            {
                "role": "user",
                "content": user_prompt,
            }
        )

        # -------------------------------------------------
        # Debug information
        # -------------------------------------------------

        print("\n" + "=" * 70)
        print("🤖 GEMINI RAG REQUEST")
        print("=" * 70)

        print(
            f"❓ Question: {question}"
        )

        print(
            f"📄 Context length: "
            f"{len(context_text)} characters"
        )

        print(
            f"📅 Current date: "
            f"{current_date}"
        )

        print(
            f"💬 History messages: "
            f"{len(history) if history else 0}"
        )

        # -------------------------------------------------
        # Create Gemini client
        # -------------------------------------------------

        start = time.time()

        client = OpenAI(
            api_key=api_key,
            base_url=(
                "https://generativelanguage.googleapis.com/"
                "v1beta/openai/"
            ),
            timeout=30.0,
            max_retries=0,
        )

        # -------------------------------------------------
        # Send request to Gemini
        # -------------------------------------------------

        response = client.chat.completions.create(
            model="gemini-3.6-flash",
            messages=messages,
            temperature=0,
            max_tokens=settings.RAG_MAX_OUTPUT_TOKENS,
            reasoning_effort="minimal",
        )

        elapsed = time.time() - start

        print(
            f"⏱️ Gemini time: "
            f"{elapsed:.2f} seconds"
        )

        # -------------------------------------------------
        # Validate response
        # -------------------------------------------------

        if not response.choices:

            print(
                "❌ Gemini returned no choices."
            )

            return None

        content = response.choices[0].message.content

        if not content:

            print(
                "❌ Gemini returned empty content."
            )

            return None

        content = content.strip()

        # -------------------------------------------------
        # Print final answer
        # -------------------------------------------------

        print(
            f"📝 Gemini answer length: "
            f"{len(content)} characters"
        )

        print(
            f"🤖 Gemini answer:\n{content}"
        )

        print("=" * 70)
        print("🤖 GEMINI RAG REQUEST FINISHED")
        print("=" * 70 + "\n")

        return content

    except Exception as e:

        print("\n" + "=" * 70)
        print("❌ GEMINI ERROR")
        print("=" * 70)

        print(
            f"❌ Error type: "
            f"{type(e).__name__}"
        )

        print(
            f"❌ Error: "
            f"{e}"
        )

        print("=" * 70 + "\n")

        return None