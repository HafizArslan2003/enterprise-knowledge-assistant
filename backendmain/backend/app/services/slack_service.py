"""
Slack Socket Mode integration for Agilo AI.

Listens for @Agilo Ai mentions in Slack, maps the Slack user to an existing
Agilo user, then calls the EXISTING answer_document_question() pipeline.
All document permissions, redaction, and role-based filtering are preserved
because we pass the real User object — zero RAG duplication.
"""

import re
import threading

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

from backend.app.core.config import settings
from backend.app.database.database import SessionLocal
from backend.app.models.user import User
from backend.app.core.api_key_crypto import decrypt_api_key
from backend.app.api.chat import answer_document_question

# ──────────────────────────────────────────────────────────
# Slack Bolt app — only initialised when tokens are present
# ──────────────────────────────────────────────────────────

_bolt_app: App | None = None
_socket_handler: SocketModeHandler | None = None


def _get_bolt_app() -> App:
    """Lazily create the Bolt app so import alone never crashes."""
    global _bolt_app
    if _bolt_app is None:
        _bolt_app = App(token=settings.SLACK_BOT_TOKEN)
        _register_handlers(_bolt_app)
    return _bolt_app


# Regex to strip the <@UXXXXX> mention prefix that Slack sends
_MENTION_RE = re.compile(r"<@[\w]+>\s*")


def _register_handlers(bolt: App) -> None:
    """Wire up event listeners on the Bolt app."""

    @bolt.event("app_mention")
    def handle_mention(event: dict, say) -> None:
        """
        Fired when a user types: @Agilo Ai <question>

        Flow:
        1. Extract Slack user ID
        2. Look up matching Agilo user
        3. Call existing RAG pipeline
        4. Reply in thread
        """
        slack_user_id: str = event.get("user", "")
        raw_text: str = event.get("text", "")
        thread_ts: str = event.get("thread_ts") or event.get("ts", "")

        # Strip the @mention to get the actual question
        question = _MENTION_RE.sub("", raw_text).strip()
        if not question:
            say(text="Please include a question after mentioning me.", thread_ts=thread_ts)
            return

        # ── DB session (we're in a background thread, not a FastAPI request) ──
        db = SessionLocal()
        try:
            # 1. Map Slack user → Agilo user
            user = (
                db.query(User)
                .filter(User.slack_user_id == slack_user_id)
                .first()
            )
            if user is None:
                print(f"⚠️ Slack user attempting to use Agilo AI but is unlinked: {slack_user_id}")
                say(
                    text=(
                        "❌ Your Slack account is not linked to an Agilo AI account.\n"
                        "Please contact your administrator to link your Slack ID."
                    ),
                    thread_ts=thread_ts,
                )
                return

            # 2. Decrypt the user's stored Groq API key
            api_key = decrypt_api_key(user.encrypted_gemini_api_key)
            if not api_key:
                say(
                    text=(
                        "⚠️ No Groq API key found for your account.\n"
                        "Please log into Agilo AI and add your API key in Settings first."
                    ),
                    thread_ts=thread_ts,
                )
                return

            # 3. Acknowledge immediately so Slack doesn't show a timeout
            say(text="🔍 Searching documents…", thread_ts=thread_ts)

            # 4. Call the EXISTING RAG pipeline — zero duplication
            #    answer_document_question() handles: search → redaction → LLM → citations
            answer, sources, _ = answer_document_question(
                db=db,
                question=question,
                user=user,
                api_key=api_key,
                history=[],        # Slack messages have no prior chat context
                doc_filter=None,   # Search all docs the user is allowed to see
            )

            # 5. Format the answer for Slack
            reply_parts = [answer]
            if sources:
                reply_parts.append("\n📎 *Sources:*")
                for src in sources:
                    reply_parts.append(
                        f"  • _{src['document_name']}_ — Page {src['page_number']} "
                        f"({src['accuracy']:.0f}% match)"
                    )

            say(text="\n".join(reply_parts), thread_ts=thread_ts)

        except Exception as e:
            print(f"❌ Slack handler error: {e}")
            say(
                text="⚠️ Something went wrong while processing your question. Please try again.",
                thread_ts=thread_ts,
            )
        finally:
            db.close()

    # ── DM support ─────────────────────────────────────────
    # Requires Slack OAuth scopes: im:history, chat:write
    # Requires Event Subscriptions: message.im
    # ───────────────────────────────────────────────────────
    @bolt.event("message")
    def handle_dm(event: dict, say) -> None:
        """
        Fired when a user sends a direct message to the bot.

        Identical flow to handle_mention — the only differences are:
        - No @mention prefix to strip (it's already a DM)
        - Bot's own messages are skipped (subtype == 'bot_message') to
          prevent infinite reply loops
        """
        # Ignore messages sent by the bot itself
        if event.get("subtype") == "bot_message" or event.get("bot_id"):
            return

        # DMs only — channel_type "im" confirms this is a direct message
        if event.get("channel_type") != "im":
            return

        slack_user_id: str = event.get("user", "")
        question: str = (event.get("text") or "").strip()
        if not question:
            return

        db = SessionLocal()
        try:
            # 1. Map Slack user → Agilo user (same as app_mention)
            user = (
                db.query(User)
                .filter(User.slack_user_id == slack_user_id)
                .first()
            )
            if user is None:
                print(f"⚠️ Slack user attempting to DM Agilo AI but is unlinked: {slack_user_id}")
                say(
                    text=(
                        "❌ Your Slack account is not linked to an Agilo AI account.\n"
                        "Please contact your administrator to link your Slack ID."
                    )
                )
                return

            # 2. Decrypt the user's stored Groq API key (same as app_mention)
            api_key = decrypt_api_key(user.encrypted_gemini_api_key)
            if not api_key:
                say(
                    text=(
                        "⚠️ No Groq API key found for your account.\n"
                        "Please log into Agilo AI and add your API key in Settings first."
                    )
                )
                return

            # 3. Acknowledge immediately
            say(text="🔍 Searching documents…")

            # 4. Call the EXISTING RAG pipeline — identical to app_mention, zero duplication
            answer, sources, _ = answer_document_question(
                db=db,
                question=question,
                user=user,
                api_key=api_key,
                history=[],
                doc_filter=None,
            )

            # 5. Format reply (same as app_mention)
            reply_parts = [answer]
            if sources:
                reply_parts.append("\n📎 *Sources:*")
                for src in sources:
                    reply_parts.append(
                        f"  • _{src['document_name']}_ — Page {src['page_number']} "
                        f"({src['accuracy']:.0f}% match)"
                    )

            say(text="\n".join(reply_parts))

        except Exception as e:
            print(f"❌ Slack DM handler error: {e}")
            say(text="⚠️ Something went wrong while processing your question. Please try again.")
        finally:
            db.close()


# ──────────────────────────────────────────────────────────
# Lifecycle: start / stop
# ──────────────────────────────────────────────────────────

def start_slack_socket_mode() -> None:
    """
    Start Slack Bolt Socket Mode in a daemon thread.

    Called from main.py's lifespan handler. The daemon flag ensures the
    thread dies automatically when the FastAPI process exits — no cleanup
    or explicit shutdown needed.
    """
    if not settings.SLACK_BOT_TOKEN or not settings.SLACK_APP_TOKEN:
        print("ℹ️  Slack tokens not configured — Slack integration disabled.")
        return

    global _socket_handler
    bolt = _get_bolt_app()
    _socket_handler = SocketModeHandler(bolt, settings.SLACK_APP_TOKEN)

    thread = threading.Thread(
        target=_socket_handler.start,
        name="slack-socket-mode",
        daemon=True,
    )
    thread.start()
    print("✅ Slack Socket Mode started in background thread.")
