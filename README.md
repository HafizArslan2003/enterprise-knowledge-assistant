# Agilo AI

Agilo AI is an enterprise knowledge assistant: a RAG (Retrieval-Augmented Generation) chatbot that lets employees ask natural-language questions and get answers grounded in company documents, with page-level citations, chat history, and usage analytics.

```
User → React Frontend → FastAPI Backend → RAG Pipeline (pgvector search) → LLM → Cited Answer
```

## Repository Structure

```
.
├── backendmain/            # FastAPI backend — see backendmain/README.md
│   └── backend/app/
└── frontend/
    └── agilo-ai/            # React + Vite frontend — see frontend/agilo-ai/README.md
        └── src/
```

## Tech Stack

| Area           | Stack |
|----------------|-------|
| Frontend       | React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion |
| Backend        | FastAPI, SQLAlchemy, Pydantic |
| Database       | PostgreSQL + `pgvector` |
| Auth           | JWT (bcrypt-hashed passwords) |
| LLM / Embeddings | OpenAI-compatible client against Google's Gemini API (`gemini-3.6-flash` for chat, `gemini-embedding-001` for embeddings, 768 dimensions) |
| Document parsing | `pypdf`, `python-docx`, `openpyxl` |

## Core Features

- Email/username + password auth (register, login, JWT-protected routes)
- Document upload (PDF / DOCX / XLSX) → text extraction → chunking → embedding → pgvector storage
- Chat with tool-calling: the LLM decides per-question whether it needs to search documents at all
- Source citations with page numbers, match confidence, and a passage viewer
- Persistent chat sessions and history, synced between `localStorage` and the backend
- Thumbs up/down feedback on answers, which feeds back into re-ranking (documents with positive feedback surface higher in future searches)
- Analytics dashboard: total documents/sessions/questions, most-referenced documents, 7-day usage trend, automation rate

## Quick Start

You'll need both services running at once — the backend first, since the frontend calls it directly (no mocking layer).

### 1. Backend

```bash
cd backendmain
python -m venv venv && source venv/bin/activate
pip install fastapi uvicorn[standard] sqlalchemy pydantic pydantic-settings \
    python-jose[cryptography] "passlib[bcrypt]" pgvector psycopg2-binary \
    openai pypdf python-docx openpyxl
# create a .env with DATABASE_URL, OPENAI_API_KEY, SECRET_KEY — see backendmain/README.md
uvicorn backend.app.main:app --reload --port 8001
```

Requires a PostgreSQL database with the `pgvector` extension enabled:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Frontend

```bash
cd frontend/agilo-ai
npm install
VITE_API_BASE_URL=http://127.0.0.1:8001 npm run dev
```

Open the printed local URL — you'll land on the login/sign-up screen. Register a user, then start chatting or uploading documents.

## Full Documentation

- [`backendmain/README.md`](./backendmain/README.md) — API reference, data model, RAG pipeline details, environment variables, known gaps
- [`frontend/agilo-ai/README.md`](./frontend/agilo-ai/README.md) — component structure, auth/chat flow, view breakdown, known gaps

## Project Status

This is an actively evolving prototype, not a hardened production system. Notable open items tracked in the sub-READMEs include: no DB migrations (schema changes require manual intervention), logout not clearing stored tokens, and a message-feedback id-reconciliation issue between client-generated and backend-assigned message ids. Check each sub-README's "Known Gaps" section before treating a given area as complete.
