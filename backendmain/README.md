# Agilo AI — Backend

FastAPI service powering the Agilo AI enterprise knowledge assistant. It handles authentication, document ingestion + chunking + embedding, vector similarity search (pgvector), chat with tool-calling, chat history/sessions, message feedback, and usage analytics.

## Tech Stack

| Layer          | Technology |
|----------------|------------|
| Framework      | FastAPI + Uvicorn |
| ORM / DB       | SQLAlchemy + PostgreSQL |
| Vector search  | `pgvector` (768-dim embeddings) |
| Auth           | JWT (`python-jose`) + `passlib` (bcrypt) |
| LLM / Embeddings | OpenAI-compatible client pointed at Google's Gemini OpenAI-compatible endpoint (`gemini-3.6-flash` for chat, `gemini-embedding-001` for embeddings) |
| File parsing   | `pypdf`, `python-docx`, `openpyxl` |
| Config         | `pydantic-settings` (`.env` file) |

## Project Structure

```
backendmain/
└── backend/
    └── app/
        ├── api/            # Route handlers (auth, chat, documents, sessions, analytics, health)
        ├── core/           # Config, security (JWT/hashing), LLM client, chunking
        ├── database/       # SQLAlchemy engine/session, declarative base, DB dependency
        ├── models/         # SQLAlchemy models (User, ChatSession, ChatMessage, Document, DocumentChunk)
        ├── schemas/        # Pydantic request/response schemas
        ├── services/       # Embedding, extraction, similarity search business logic
        └── main.py         # FastAPI app instance, CORS, router registration
```

## Setup

### 1. Prerequisites

- Python 3.11+
- PostgreSQL with the [`pgvector`](https://github.com/pgvector/pgvector) extension enabled on your target database:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

### 2. Install dependencies

```bash
cd backendmain
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install fastapi uvicorn[standard] sqlalchemy pydantic pydantic-settings \
    python-jose[cryptography] "passlib[bcrypt]" pgvector psycopg2-binary \
    openai pypdf python-docx openpyxl
```

> If you add a `requirements.txt`, generate it with `pip freeze > requirements.txt` after installing the above so future installs are reproducible.

### 3. Configure environment

Create a `.env` file in `backendmain/` (values below are the defaults defined in `backend/app/core/config.py` — override as needed):

```env
APP_NAME=Enterprise Knowledge Assistant
APP_VERSION=1.0.0

# Used as the API key for the OpenAI-compatible Gemini endpoint
OPENAI_API_KEY=your-gemini-api-key

# Must point at a Postgres instance with the pgvector extension enabled
DATABASE_URL=postgresql://postgres:password@localhost:5432/eka

SECRET_KEY=change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 4. Run the server

```bash
uvicorn backend.app.main:app --reload --port 8001
```

Tables are created automatically on startup via the `lifespan` handler (`create_tables()`). There is no separate migration step yet — this is a `create_all`-based setup, so schema changes require a manual `DROP`/recreate or a future migration tool (e.g. Alembic).

The frontend expects the API at `http://127.0.0.1:8001` by default (see frontend README), so `--port 8001` keeps the two in sync without extra config.

## API Reference

All routes are prefixed with `/api/v1` except `/` and `/health`.

### Auth (`/api/v1/auth`)

| Method | Path        | Auth required | Description |
|--------|-------------|:---:|-------------|
| POST   | `/register` | No  | Create a user account |
| POST   | `/login`    | No  | OAuth2 password grant (form-encoded `username`/`password`) → JWT access token |
| GET    | `/me`       | Yes | Return the authenticated user's profile |

### Chat (`/api/v1/chat`)

| Method | Path      | Auth required | Description |
|--------|-----------|:---:|-------------|
| POST   | `/ask`    | Yes | Ask a question. The LLM decides (via tool-calling) whether to search documents; returns the answer plus cited sources and the session id |
| GET    | `/history`| Yes | Full chat history for the current user, including all messages per session |

### Documents (`/api/v1/documents`)

| Method | Path      | Auth required | Description |
|--------|-----------|:---:|-------------|
| GET    | `/`       | Yes | List documents uploaded by the current user, with chunk counts |
| POST   | `/upload` | Yes | Upload a `.pdf`, `.docx`, or `.xlsx` file — extracted, chunked, embedded, and indexed |

### Sessions (`/api/v1/sessions`)

| Method | Path                         | Auth required | Description |
|--------|------------------------------|:---:|-------------|
| POST   | `/`                          | Yes | Create a new empty chat session |
| GET    | `/`                          | Yes | List sessions (lightweight — no messages) |
| GET    | `/{session_id}`              | Yes | Full session detail including all messages |
| POST   | `/messages/{message_id}/feedback` | Yes | Submit `{ "feedback": 1 \| -1 }` for a message; also adjusts the feedback score of any documents that message was grounded in |

### Analytics (`/api/v1/analytics`)

| Method | Path       | Auth required | Description |
|--------|------------|:---:|-------------|
| GET    | `/summary` | Yes | Total documents/sessions/questions, top referenced documents, recent questions |
| GET    | `/usage`   | Yes | Last 7 days of question volume + an automation rate percentage |

### Health / Root

| Method | Path      | Auth required | Description |
|--------|-----------|:---:|-------------|
| GET    | `/`       | No  | Basic service status |
| GET    | `/health` | No  | Health check |

## How Chat + RAG Works

1. `POST /chat/ask` saves the user's message, then asks the LLM (with a `search_documents` tool defined) whether it needs document context.
2. If the LLM requests the tool, `services/search.py` embeds the query, pulls the top candidate chunks by cosine distance from `pgvector`, and re-ranks them by combining similarity rank with each document's accumulated `feedback_score` (from thumbs up/down on past answers).
3. The top chunks are passed back to the LLM as context to produce a grounded final answer.
4. Sources are deduplicated by `(document_name, page_number)` and returned alongside the answer; each referenced document's `access_count` is incremented for analytics.
5. If the OpenAI-compatible call fails for any reason, both `get_initial_response` and `get_final_response` fall back to a safe default message rather than raising, so a provider outage degrades gracefully instead of crashing the endpoint.

## Data Model

- **User** — `username`, `email`, `hashed_password`
- **Document** — `filename`, `filepath`, `uploaded_by`, `access_count`, `feedback_score`
- **DocumentChunk** — `text`, `page_number`, `chunk_index`, `embedding` (768-dim vector), FK to `Document`
- **ChatSession** — `user_id`, `title`, `created_at`
- **ChatMessage** — `session_id`, `role` (`user`/`assistant`), `content`, `feedback`, `source_document_ids` (comma-separated), `created_at`

## Notes / Known Gaps

- No Alembic migrations yet — schema changes currently require manually adjusting the database.
- `documents.py` only accepts `.pdf`, `.docx`, `.xlsx` server-side; keep this in sync with whatever `accept` attribute the frontend upload input uses.
- Uploaded files are written to `storage/uploads/` relative to wherever the server process runs — consider making this path configurable via `.env` for deployment.
