# Agilo AI Frontend

This frontend powers the Agilo AI enterprise assistant experience with a polished dashboard, animated 3D hero experience, authenticated chat flow, document upload, and live usage analytics.

## What is connected now

- Login page authenticates against the FastAPI backend and stores the access token locally.
- Dashboard loads chat history, document uploads, and usage summary from the backend.
- Send Query starts a real chat session and streams the backend answer into the UI.
- Upload Document opens the browser file picker and sends the file to the backend document route.
- History and Knowledge Base views are available from the dashboard and chat experience.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the Vite frontend:
   ```bash
   npm run dev
   ```
3. Ensure the backend is running locally on the port expected by the frontend:
   ```bash
   VITE_API_BASE_URL=http://127.0.0.1:8001 npm run dev
   ```

## Backend expectations

The frontend expects these backend endpoints to be available:

- POST /api/v1/auth/login
- POST /api/v1/chat/ask
- POST /api/v1/sessions/
- GET /api/v1/chat/history
- POST /api/v1/documents/upload
- GET /api/v1/documents/
- GET /api/v1/analytics/usage

## Build verification

Run:

```bash
npm run build
```

The project is expected to compile successfully when the API base URL and backend routes are reachable.
