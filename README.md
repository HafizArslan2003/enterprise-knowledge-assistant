# Agilo AI

Agilo AI is an enterprise knowledge assistant built using **Retrieval-Augmented Generation (RAG)**. It allows employees to ask natural-language questions and receive answers grounded in company documents, with citations, persistent chat history, role-based access control, and usage analytics.

## Architecture

```text
User
  ↓
React Frontend
  ↓
FastAPI Backend
  ↓
RAG Pipeline
  ↓
pgvector Semantic Search
  ↓
Groq LLM
  ↓
Cited Answer
```

## Repository Structure

```text
.
├── backendmain/
│   ├── README.md
│   └── backend/
│       └── app/
│
└── frontend/
    └── agilo-ai/
        ├── README.md
        └── src/
```

## Tech Stack

| Area                  | Technology                                                               |
| --------------------- | ------------------------------------------------------------------------ |
| **Frontend**          | React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Lucide React |
| **Backend**           | FastAPI, SQLAlchemy, Pydantic                                            |
| **Database**          | PostgreSQL + pgvector                                                    |
| **Authentication**    | JWT with bcrypt-hashed passwords                                         |
| **LLM**               | Groq API (`openai/gpt-oss-20b`) via OpenAI Python client                 |
| **Embeddings**        | Local Hugging Face `all-MiniLM-L6-v2` via Sentence Transformers          |
| **Vector Dimensions** | 384                                                                      |
| **Document Parsing**  | pypdf, python-docx, openpyxl                                             |

## Core Features

### 🔐 Role-Based Authentication

* Secure JWT authentication
* Admin and Employee roles
* Passwords securely hashed using bcrypt
* Role-based access control for documents and application features

### 📄 Advanced Document Processing

Supported document formats:

* PDF
* DOCX
* XLSX

The document processing pipeline performs:

```text
Document Upload
      ↓
Text & Table Extraction
      ↓
Text Chunking
      ↓
Local Embedding Generation
      ↓
pgvector Storage
```

The system uses overlapping chunks of approximately **600 characters** to preserve context between chunks.

### 🧠 Secure RAG Pipeline

Agilo AI uses Retrieval-Augmented Generation to provide answers based on company documents.

```text
User Question
      ↓
Question Processing
      ↓
Semantic Vector Search
      ↓
Keyword Boosting
      ↓
Relevant Document Chunks
      ↓
Groq LLM
      ↓
Grounded Answer + Citations
```

The retrieval system combines semantic similarity with exact-keyword boosting to improve search relevance.

Document-level access control ensures that users can only retrieve information from documents they are authorized to access.

### 🛡️ Automated Data Redaction

Agilo AI can automatically mask sensitive information when employees query general company documents.

Examples include:

* Email addresses
* Phone numbers
* Currency values

This helps reduce accidental exposure of sensitive business information.

### 💬 Persistent Chat

Chat sessions and conversation history are stored securely in the backend database.

Users can:

* Create chat sessions
* Continue previous conversations
* View chat history
* Ask follow-up questions

### 📊 Analytics Dashboard

Administrators have access to an analytics dashboard containing information such as:

* Total documents
* Chat sessions
* Questions asked
* Usage activity
* Usage trends

## Quick Start

Agilo AI consists of two services that need to run simultaneously:

1. **FastAPI Backend**
2. **React Frontend**

Start the backend first because the frontend communicates directly with the backend API.

---

## 1. Backend Setup

Navigate to the backend directory:

```bash
cd backendmain
```

Create and activate a virtual environment:

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

Install the dependencies:

```bash
pip install -r requirements.txt
```

Alternatively, the main dependencies can be installed manually:

```bash
pip install fastapi "uvicorn[standard]" sqlalchemy pydantic pydantic-settings python-jose[cryptography] passlib[bcrypt] pgvector psycopg2-binary openai pypdf python-docx openpyxl sentence-transformers
```

### Environment Variables

Create a `.env` file inside:

```text
backendmain/.env
```

Add the required configuration:

```env
SECRET_KEY="your-secure-secret-key"

DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

> Keep your `.env` file private and never commit API keys, passwords, database credentials, or other secrets to GitHub.

### Start the Backend

```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8080
```

The backend will be available at:

```text
http://127.0.0.1:8080
```

FastAPI's interactive API documentation is available at:

```text
http://127.0.0.1:8080/docs
```

### PostgreSQL + pgvector

Agilo AI requires PostgreSQL with the `pgvector` extension enabled.

Run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 2. Frontend Setup

Open a new terminal and navigate to the frontend:

```bash
cd frontend/agilo-ai
```

Install the Node.js dependencies:

```bash
npm install
```

Configure the backend API URL.

Create or update the frontend environment file:

```text
frontend/agilo-ai/.env
```

Add:

```env
VITE_API_BASE_URL=http://127.0.0.1:8080
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite in your browser.

You should see the Agilo AI login/sign-up interface.

---

## Application Flow

### Authentication Flow

```text
User
 ↓
Login / Sign Up
 ↓
FastAPI Authentication API
 ↓
JWT Token
 ↓
Authenticated Application
```

### Document Upload Flow

```text
Upload PDF / DOCX / XLSX
 ↓
Document Parsing
 ↓
Text & Table Extraction
 ↓
Chunking
 ↓
Local Embeddings
 ↓
pgvector
 ↓
Stored Document Vectors
```

### Question Answering Flow

```text
User Question
 ↓
Authentication & Access Control
 ↓
Embedding Generation
 ↓
Vector Search
 ↓
Keyword Boosting
 ↓
Relevant Chunks
 ↓
Groq LLM
 ↓
Answer Generation
 ↓
Citations
 ↓
User
```

## Security

Agilo AI includes several security-focused mechanisms:

* JWT-based authentication
* bcrypt password hashing
* Role-based authorization
* Document-level access control
* Sensitive data redaction
* Server-side API communication
* Environment-based secret management
* Grounded responses based on retrieved company documents

## Performance & Architecture

The application uses **local embeddings** through Sentence Transformers rather than relying on a remote embedding API.

This provides:

* Reduced embedding latency
* Better privacy
* No external embedding API dependency
* More predictable embedding performance

The PostgreSQL database uses `pgvector` for vector similarity search.

The RAG pipeline also implements retry handling with **exponential backoff** to better handle Groq API rate limits.

## Full Documentation

More detailed documentation is available in the individual project directories:
<<<<<<< HEAD
=======

- **[backendmain/README.md](backendmain/README.md)** — Backend API reference, database model, RAG pipeline, environment variables, and known gaps.

- **[frontend/agilo-ai/README.md](frontend/agilo-ai/README.md)** — Frontend component structure, authentication flow, chat flow, views, and known gaps.
>>>>>>> 73841b9 (resolve secarchsaa)

- **[backendmain/README.md](backendmain/README.md)** — Backend API reference, database model, RAG pipeline, environment variables, and known gaps.

- **[frontend/agilo-ai/README.md](frontend/agilo-ai/README.md)** — Frontend component structure, authentication flow, chat flow, views, and known gaps.
## Project Status

Agilo AI is an actively evolving **enterprise RAG prototype**.

The project currently focuses on:

* Enterprise document question answering
* Secure document retrieval
* Role-based access control
* Persistent chat
* Citations
* Analytics
* Local embeddings
* Groq-powered LLM responses
* Sensitive data redaction

The architecture is designed to be extended with additional enterprise integrations, automation, and agent-based capabilities.

## License


This project is currently intended as an enterprise prototype and internal development project.
