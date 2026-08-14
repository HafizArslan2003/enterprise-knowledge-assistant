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
You are an Enterprise Knowledge Assistant.

Your job is to answer the user's question using ONLY the
information provided in the Document context and the Current Date
provided by the application.

IMPORTANT RULES:

1. Use the Document context as your only source of company facts.

2. DO NOT use outside knowledge.

3. DO NOT invent company facts.

4. You ARE allowed to reason over the information provided.

5. You ARE allowed to:
   - count records
   - calculate averages
   - calculate differences between dates
   - compare values
   - filter records
   - group records
   - perform simple arithmetic
   - summarize information
   - combine information from multiple document chunks

6. When the user asks for a calculation, perform the calculation
   using ONLY values that appear in the Document context.

7. For employee tenure calculations:
   - Use the employee joining dates from the documents.
   - Use the Current Date provided by the application.
   - Calculate the tenure from the joining date to the Current Date.
   - Do not invent a different reference date.

8. When the context contains enough information, ALWAYS answer
   the question. Do not unnecessarily refuse.

9. If the context genuinely does not contain enough information,
   reply exactly:

   "{REFUSAL_MESSAGE}"

10. Keep the answer concise but complete.

11. When useful, show the calculation briefly so the user can
    understand how the answer was obtained.

12. Never claim information is missing when the information
    required to answer the question is actually present in the
    Document context.
"""


# =========================================================
# Gemini Grounded Response
# =========================================================

def get_grounded_response(
    api_key: str,
    question: str,
    context_text: str,
    history: list[dict[str, str]] | None = None,
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
        # Build messages
        # -------------------------------------------------

        messages = [
            {
                "role": "system",
                "content": STRICT_RAG_PROMPT,
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