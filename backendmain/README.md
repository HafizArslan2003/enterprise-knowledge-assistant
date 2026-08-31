# Agilo AI — Backend

FastAPI backend service powering the **Agilo AI enterprise knowledge assistant**.

The backend handles authentication, role-based access control, document ingestion, local embedding generation, vector similarity search, RAG-based question answering, automated data redaction, persistent chat history, and usage analytics.

## Tech Stack

| Layer              | Technology                                                        |
| ------------------ | ----------------------------------------------------------------- |
| **Framework**      | FastAPI + Uvicorn                                                 |
| **ORM / Database** | SQLAlchemy + PostgreSQL                                           |
| **Vector Search**  | pgvector with 384-dimensional embeddings                          |
| **Authentication** | JWT (`python-jose`) + `passlib` (bcrypt)                          |
| **LLM**            | Groq API (`openai/gpt-oss-20b`) via OpenAI Python client          |
| **Embeddings**     | Local Hugging Face `all-MiniLM-L6-v2` via `sentence-transformers` |
| **File Parsing**   | `pypdf`, `python-docx`, `openpyxl`                                |
| **Configuration**  | `pydantic-settings` + `.env`                                      |

## Project Structure

```text
backendmain/
└── backend/
    └── app/
        ├── api/            # API route handlers
        │   ├── auth.py
        │   ├── chat.py
        │   ├── documents.py
        │   ├── sessions.py
        │   └── analytics.py
        │
        ├── core/           # Application configuration and core utilities
        │   ├── config.py
        │   ├── security.py
        │   ├── llm.py
        │   └── chunking.py
        │
        ├── database/       # SQLAlchemy engine and database sessions
        │
        ├── models/         # SQLAlchemy database models
        │   ├── user.py
        │   ├── chat_session.py
        │   ├── chat_message.py
        │   ├── document.py
        │   └── chunk.py
        │
        ├── schemas/        # Pydantic request/response schemas
        │
        ├── services/       # Business logic and RAG services
        │   ├── embedding.py
        │   ├── extraction.py
        │   └── search.py
        │
        └── main.py         # FastAPI application, CORS and router registration
```

## Setup

### 1. Prerequisites

Make sure the following are installed:

* Python 3.11+
* PostgreSQL
* PostgreSQL `pgvector` extension
* pip
* Git

The target PostgreSQL database must have the `pgvector` extension enabled.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 2. Install Dependencies

Navigate to the backend directory:

```bash
cd backendmain
```

Create a virtual environment:

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### Linux / macOS

```bash
python -m venv venv
source venv/bin/activate
```

Install the project dependencies:

```bash
pip install -r requirements.txt
```

Or install the dependencies manually:

```bash
pip install fastapi "uvicorn[standard]" sqlalchemy pydantic pydantic-settings python-jose[cryptography] "passlib[bcrypt]" pgvector psycopg2-binary openai pypdf python-docx openpyxl sentence-transformers cryptography
```

## 3. Configure Environment Variables

Create a `.env` file inside:

```text
backendmain/.env
```

Example configuration:

```env
# PostgreSQL database with pgvector enabled
DATABASE_URL=postgresql://user:password@localhost:5432/eka?sslmode=require

# JWT secret
SECRET_KEY=your-secure-secret-key-change-in-production

# JWT configuration
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### API Key Management

The Groq API key is **not required in the `.env` file**.

Users provide their own Groq API key through the application UI.

The key is:

1. Submitted securely to the backend.
2. Symmetrically encrypted.
3. Stored in the database.
4. Decrypted only when required for an LLM request.

> **Security:** Never commit `.env` files, API keys, database passwords, JWT secrets, or other credentials to GitHub.

## 4. Run the Server

Start the FastAPI development server:

```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8080
```

The API will be available at:

```text
http://127.0.0.1:8080
```

Interactive Swagger documentation:

```text
http://127.0.0.1:8080/docs
```

Alternative ReDoc documentation:

```text
http://127.0.0.1:8080/redoc
```

### Database Initialization

Database tables are automatically created during application startup through the FastAPI `lifespan` handler.

The project currently uses SQLAlchemy's `create_all()` approach.

There is **no Alembic migration system yet**.

Therefore, major schema changes may require manually recreating or modifying the database until a proper migration system is introduced.

## API Reference

All API endpoints are prefixed with:

```text
/api/v1
```

### Authentication

Base path:

```text
/api/v1/auth
```

| Method | Endpoint      | Auth | Description                                                            |
| ------ | ------------- | ---- | ---------------------------------------------------------------------- |
| `POST` | `/register`   | No   | Create a new user account                                              |
| `POST` | `/login`      | No   | Authenticate using OAuth2 password flow and receive a JWT access token |
| `GET`  | `/me`         | Yes  | Return the authenticated user's profile                                |
| `POST` | `/gemini-key` | Yes  | Securely encrypt and store the user's LLM API key                      |

### Chat

Base path:

```text
/api/v1/chat
```

| Method | Endpoint | Auth | Description                                                                        |
| ------ | -------- | ---- | ---------------------------------------------------------------------------------- |
| `POST` | `/ask`   | Yes  | Ask a question using the RAG pipeline and receive a grounded answer with citations |

### Documents

Base path:

```text
/api/v1/documents
```

| Method   | Endpoint    | Auth | Description                                                      |
| -------- | ----------- | ---- | ---------------------------------------------------------------- |
| `GET`    | `/`         | Yes  | List documents visible to the current user                       |
| `POST`   | `/upload`   | Yes  | Upload, extract, chunk, embed and index a PDF, DOCX or XLSX file |
| `DELETE` | `/{doc_id}` | Yes  | Permanently delete a document and its vector chunks              |

### Sessions

Base path:

```text
/api/v1/sessions
```

| Method | Endpoint        | Auth | Description                          |
| ------ | --------------- | ---- | ------------------------------------ |
| `POST` | `/`             | Yes  | Create a new empty chat session      |
| `GET`  | `/`             | Yes  | List the user's chat sessions        |
| `GET`  | `/{session_id}` | Yes  | Retrieve a session with its messages |

### Analytics

Base path:

```text
/api/v1/analytics
```

| Method | Endpoint   | Auth  | Description                                                                         |
| ------ | ---------- | ----- | ----------------------------------------------------------------------------------- |
| `GET`  | `/summary` | Admin | Total documents, sessions, questions, top referenced documents and recent questions |
| `GET`  | `/usage`   | Admin | Last 7 days of question volume and automation rate                                  |

## RAG Pipeline

The `/api/v1/chat/ask` endpoint performs the following pipeline:

```text
User Question
      ↓
Authentication & Access Control
      ↓
Local Query Embedding
      ↓
pgvector Semantic Search
      ↓
Hybrid Keyword Boosting
      ↓
Top Relevant Chunks
      ↓
Sensitive Data Redaction
      ↓
Chat History Context
      ↓
Groq LLM
      ↓
Grounded Answer
      ↓
Document Citations
```

### 1. Query Vectorization

The user's question is converted into a vector using:

```text
all-MiniLM-L6-v2
```

The model is provided locally through:

```text
sentence-transformers
```

Each embedding contains **384 dimensions**.

Query embeddings are cached in memory to reduce repeated embedding computation.

### 2. Semantic Retrieval

The search service performs a cosine-distance similarity query against PostgreSQL using `pgvector`.

The retrieval process also enforces role-based document access.

**Admins** can search:

* Company documents
* Restricted documents

**Employees** can search:

* General company documents
* Their own private documents

This prevents unauthorized documents from entering the RAG context.

### 3. Hybrid Keyword Boosting

In addition to semantic similarity, the search system performs exact-word matching against the retrieved chunks.

Matching keywords receive an additional relevance boost ranging approximately from:

```text
+5% to +25%
```

The final top:

```text
RAG_TOP_K = 6
```

chunks are selected for the LLM context.

This hybrid approach improves retrieval when the user's query contains specific names, terms, IDs, or other exact keywords.

### 4. Automated Data Redaction

When an **Employee** queries a general `company` document, the backend applies sensitive-data redaction before sending retrieved context to the LLM.

Examples of information that can be redacted include:

* Email addresses
* Phone numbers
* Currency amounts

Redacted values are replaced with:

```text
[REDACTED]
```

This provides an additional privacy layer for general company knowledge.

### 5. LLM Generation

The selected document context and recent conversation history are sent to the Groq API.

The configured model is:

```text
openai/gpt-oss-20b
```

The backend includes the latest **4 chat history turns** as conversational context.

LLM requests are wrapped in an exponential-backoff retry mechanism to handle temporary Groq API rate-limit responses such as:

```text
429 RateLimitError
```

### 6. Response & Citations

The LLM generates a Markdown-formatted response grounded in the retrieved document context.

The final response includes document citations so users can identify the source material used to generate the answer.

## Document Processing Pipeline

Uploaded documents follow this pipeline:

```text
PDF / DOCX / XLSX
        ↓
File Validation
        ↓
Text & Table Extraction
        ↓
Text Chunking
        ↓
Local Embedding Generation
        ↓
PostgreSQL + pgvector
```

### Supported Formats

| Format  | Parser        | Supported Content          |
| ------- | ------------- | -------------------------- |
| `.pdf`  | `pypdf`       | PDF text                   |
| `.docx` | `python-docx` | Paragraphs + nested tables |
| `.xlsx` | `openpyxl`    | Spreadsheet data           |

For DOCX files, the extraction logic explicitly processes both **paragraphs and nested Word tables** to avoid losing information from register, matrix, and table-based documents.

## Data Model

### User

Stores authentication and account information.

```text
username
email
hashed_password
role
encrypted_gemini_api_key
```

Supported roles:

```text
admin
employee
```

### Document

Represents an uploaded document.

```text
filename
filepath
uploaded_by
type
access_count
```

Document types:

```text
company
restricted
private
```

### Chunk

Stores individual document chunks and their vector embeddings.

```text
document_id
text
page_number
embedding
```

The embedding is a **384-dimensional pgvector vector**.

### ChatSession

Represents a user's conversation session.

```text
user_id
title
created_at
```

### ChatMessage

Stores individual messages inside a chat session.

```text
session_id
role
content
source_document_ids
created_at
```

Supported message roles:

```text
user
assistant
```

## Database Connection Handling

The SQLAlchemy database configuration includes connection-management settings designed to reduce idle connection failures on cloud hosting platforms.

Important settings include:

```text
pool_pre_ping=True
pool_recycle=1800
```

These settings help mitigate stale or dropped database connections, particularly on cloud-hosted PostgreSQL services.

## Security

The backend implements several security mechanisms:

* JWT-based authentication
* bcrypt password hashing
* Role-based access control
* Document-level access control
* Encrypted user API key storage
* Sensitive-data redaction
* Environment-based secret configuration
* Server-side document retrieval
* Grounded RAG responses

## Frontend Integration

The frontend expects the backend API to be available at:

```text
http://127.0.0.1:8080
```

This can be configured through the frontend environment variable:

```env
VITE_API_BASE_URL=http://127.0.0.1:8080
```

For production deployments, the frontend should point this variable to the deployed backend URL instead of the local development address.

## Known Gaps

### Database Migrations

The project does not currently use Alembic.

Database tables are created using SQLAlchemy's `create_all()` mechanism.

Future schema changes should eventually be managed through a proper migration system such as Alembic.

### Development vs Production

The documented Uvicorn command is intended for local development.

For production deployments, configure the application according to the requirements of the selected hosting platform and production environment.

### API Key Naming

Some internal naming still references `gemini` from an earlier implementation, while the current LLM provider is Groq.

For example, the authentication endpoint remains:

```text
POST /api/v1/auth/gemini-key
```

even though it stores the user's Groq API key.

This naming can be refactored in a future cleanup to better reflect the current architecture.

## Future Improvements

Potential future improvements include:

* Alembic database migrations
* More advanced hybrid retrieval
* Reranking models
* Additional document formats
* Improved citation metadata
* Background document processing
* Streaming LLM responses
* Additional enterprise integrations
* Agent/tool-calling capabilities
* More advanced analytics

## License

This project is currently intended as an **enterprise prototype and internal development project**.
