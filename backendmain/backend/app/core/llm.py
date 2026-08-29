import re
import time
from datetime import date

from backend.app.core.config import settings
from openai import OpenAI


# =========================================================
# Configuration
# =========================================================

REFUSAL_MESSAGE = (
    "I couldn't find enough information in the available company "
    "documents to answer that accurately."
)


# =========================================================
# RAG System Prompt (compact — principles, not a rulebook)
# =========================================================
#
# Why this is shorter than before:
# - The old prompt spelled out ~14 numbered rules with repeated
#   examples. LLMs generalize well from a few clear principles;
#   long enumerated rulebooks mostly burn tokens without adding
#   accuracy.
# - The old code also had a hardcoded dict of ~15 phrase->keyword
#   expansions ("company chemistry" -> "...culture..."). That's a
#   maintenance trap (only works for phrases someone thought to
#   add) and doesn't cost prompt tokens directly, but it signals
#   the same "hardcode everything" pattern this rewrite avoids.
#   Modern embedding search already handles semantic/synonym
#   matching reasonably well, and the smarter system prompt below
#   explicitly tells the model to interpret intent rather than
#   pattern-match wording — so the dict is removed entirely.

RAG_SYSTEM_PROMPT = """You are Agilo AI, an enterprise knowledge assistant.

Ground every factual claim in the DOCUMENT CONTEXT you're given. Never invent
facts, numbers, names, dates, policies, or figures that aren't supported by it.

Interpret the user's intent, not just their exact words. A vague or informal
question ("what's the vibe here?", "how does the company work?") still
deserves a real answer if the documents contain relevant material — synthesize
across chunks, summarize, compare, or calculate as needed. Don't refuse just
because the wording doesn't match the documents literally.

If only part of a question is supported, answer that part and say plainly
what isn't covered. If nothing relevant exists, say so — don't guess.

Respond naturally to greetings and small talk; skip the document-lookup tone
for those. Use "current date" (given below) for any date/tenure math, not
your own assumption of today.

Chunks tagged "YOUR OWN PRIVATE DOCUMENT" belong to the user who is asking —
discuss them freely and completely, even if the content looks sensitive
(payslips, performance reviews, emergency contacts, medical info). This is
their own data and they are always allowed to see it.

Chunks tagged "COMPANY DOCUMENT" follow normal role-based restrictions: a
standard employee must not see personal, financial, HR, or credential
information belonging to other employees or clients. Decline only that
specific restricted content — do not refuse the whole question, and never
refuse a chunk just because it looks confidential if it's tagged as the
user's own.

IMPORTANT GROUNDING RULE:
1. If you answer the user's question using the provided DOCUMENT CONTEXT, you MUST append the exact string <documents_used>true</documents_used> to the very end of your response.
2. If you answer using general knowledge (like a greeting), or if you refuse because the documents lack the information, you MUST append <documents_used>false</documents_used> to the very end of your response.
3. If <documents_used> is true, you MUST also output a <sources> tag containing a comma-separated list of the exact "Source" filenames you actually used to formulate your answer. For example: <sources>Employee_Handbook.pdf, Leave_Policy.pdf</sources>. ONLY list the files you genuinely used.

Output only the final answer for the user — no reasoning, no <think> tags,
no meta-commentary about documents, retrieval, tags, or how you found the
answer.
"""

EMPLOYEE_SECURITY_ADDENDUM = """
The current user is a standard employee, not an admin or HR.

They may see and discuss anything tagged "YOUR OWN PRIVATE DOCUMENT" without
any restriction — that data belongs to them.

They must NOT see personal, financial, HR, or credential details belonging
to other employees or clients found in chunks tagged "COMPANY DOCUMENT" —
decline politely only for that specific restricted content.
"""

ADMIN_ACCESS_ADDENDUM = """
The current user is an admin with full clearance over all company documents.

Chunks tagged "COMPANY DOCUMENT" may contain internal policy language such as
"restricted to Finance/Executive/Account Management" or similar role-based
notices. That language describes restrictions for regular employees — it does
NOT apply to this admin user. Do not withhold, redact, summarize-around, or
refuse client, financial, HR, or personal details found in "COMPANY DOCUMENT"
chunks on the basis of such internal restriction notices.

This admin has full visibility into all company documents for management
purposes. Answer completely and directly using everything in the DOCUMENT
CONTEXT, including client personal details, financial data, and any other
information marked as restricted for other roles.
"""


# =========================================================
# Reasoning Output Cleanup
# =========================================================

REASONING_BLOCK_PATTERN = re.compile(
    r"<\s*(?:think|thinking|analysis)\b[^>]*>.*?<\s*/\s*(?:think|thinking|analysis)\s*>",
    re.IGNORECASE | re.DOTALL,
)

UNFINISHED_REASONING_PATTERN = re.compile(
    r"^\s*<\s*(?:think|thinking|analysis)\b[^>]*>.*",
    re.IGNORECASE | re.DOTALL,
)


def strip_reasoning_output(content: str) -> str:
    """Remove any leaked model reasoning blocks before saving/displaying."""
    cleaned = REASONING_BLOCK_PATTERN.sub("", content).strip()
    if cleaned:
        return cleaned
    return UNFINISHED_REASONING_PATTERN.sub("", content).strip()


# =========================================================
# Groq Grounded Response
# =========================================================

def get_grounded_response(
    api_key: str,
    question: str,
    context_text: str,
    history: list[dict[str, str]] | None = None,
    user_role: str = "admin",
) -> str | None:
    try:
        if not context_text or not context_text.strip():
            print("⚠️ LLM received empty document context.")
            return REFUSAL_MESSAGE

        current_date = date.today().isoformat()

        system_prompt = RAG_SYSTEM_PROMPT
        if user_role == "employee":
            system_prompt += EMPLOYEE_SECURITY_ADDENDUM
        elif user_role == "admin":
            system_prompt += ADMIN_ACCESS_ADDENDUM

        messages = [{"role": "system", "content": system_prompt}]

        # Keep only the last 6 turns of history — enough for continuity
        # without letting the context balloon.
        if history:
            for message in history[-6:]:
                role = message.get("role")
                content = message.get("content")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})

        # Compact user turn: no repeated instructions here — the system
        # prompt already covers behavior, so we just hand over the facts.
        user_prompt = (
            f"DOCUMENT CONTEXT:\n{context_text}\n\n"
            f"CURRENT DATE: {current_date}\n\n"
            f"QUESTION: {question}"
        )
        messages.append({"role": "user", "content": user_prompt})

        print("\n" + "=" * 70)
        print("🤖 GROQ RAG REQUEST")
        print("=" * 70)
        print(f"❓ Question: {question}")
        print(f"📄 Context length: {len(context_text)} characters")
        print(f"📅 Current date: {current_date}")
        print(f"👤 User role: {user_role}")
        print(f"💬 History messages: {len(history) if history else 0}")

        start = time.time()

        client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
            timeout=30.0,
            max_retries=0,
        )

        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=messages,
            temperature=0.2,
            max_tokens=settings.RAG_MAX_OUTPUT_TOKENS,
        )

        elapsed = time.time() - start
        print(f"⏱️ Groq time: {elapsed:.2f} seconds")

        if not response.choices:
            print("❌ Groq returned no choices.")
            return None

        content = response.choices[0].message.content
        if not content:
            print("❌ Groq returned empty content.")
            return None

        content = strip_reasoning_output(content)
        if not content:
            print("❌ Groq returned only reasoning/no final answer.")
            return None

        print(f"📝 Groq answer length: {len(content)} characters")
        print(f"🤖 Groq answer:\n{content}")
        print("=" * 70)
        print("🤖 GROQ RAG REQUEST FINISHED")
        print("=" * 70 + "\n")

        return content

    except Exception as e:
        print("\n" + "=" * 70)
        print("❌ GROQ ERROR")
        print("=" * 70)
        print(f"❌ Error type: {type(e).__name__}")
        print(f"❌ Error: {e}")
        print("=" * 70 + "\n")
        return None