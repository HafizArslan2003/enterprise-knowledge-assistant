# Agilo AI — Frontend

React + Vite + TypeScript dashboard for the Agilo AI enterprise assistant: authenticated chat with document-grounded answers and source citations, document/knowledge-base management, chat history, and usage analytics.

## Tech Stack

| Layer        | Technology |
|--------------|------------|
| Build tool   | Vite |
| UI library   | React 19 + TypeScript |
| Styling      | Tailwind CSS v4 |
| Animation    | Framer Motion |
| Icons        | lucide-react |
| 3D           | three.js + @react-three/fiber + @react-three/drei (login page background) |
| HTTP         | native `fetch` wrapper in `src/services/api.ts` |

## Project Structure

```
frontend/agilo-ai/
├── src/
│   ├── components/
│   │   ├── auth/           # LoginPage (sign in / sign up)
│   │   ├── dashboard/      # DashboardPage, Sidebar, ChatInterface, SourceDrawer,
│   │   │                   # AnalyticsPage, FormattedMarkdown
│   │   └── 3d/             # Decorative three.js scenes (LoginOrb, AiEntity3D)
│   ├── services/
│   │   ├── api.ts          # All backend HTTP calls + response types
│   │   └── ragEngine.ts    # Message/session types, local demo data, query orchestration
│   ├── App.tsx              # Top-level auth gate (Login ↔ Dashboard)
│   ├── main.tsx              # React root
│   └── index.css             # Tailwind theme tokens + glassmorphism utilities
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## Setup

### 1. Install dependencies

```bash
cd frontend/agilo-ai
npm install
```

### 2. Configure the API base URL

The app reads `VITE_API_BASE_URL` (defaults to `http://127.0.0.1:8001` if unset — see `src/services/api.ts`). Point it at wherever the backend is running:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8001 npm run dev
```

Or create a `.env` file in `frontend/agilo-ai/`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8001
```

### 3. Run

```bash
npm run dev       # start dev server
npm run build      # type-check (tsc -b) + production build
npm run preview    # preview the production build locally
npm run lint        # oxlint
```

## Auth Flow

- `LoginPage.tsx` has Sign In / Sign Up tabs, both hitting the backend directly (`authenticateUser`, `registerUser` in `services/api.ts`).
- On success, `agilo-access-token` and `agilo-token-type` are stored in `localStorage`.
- `DashboardPage.tsx` reads that token from `localStorage` for every authenticated call rather than holding it in React state — keep this in mind if you refactor auth (e.g. moving to a context/provider).
- Logging out (`App.tsx`) only flips a local `isAuthenticated` boolean — it does not currently clear the stored token from `localStorage`. Worth fixing before treating this as production-ready auth.

## Chat / RAG Flow

- `handleSendMessage` in `DashboardPage.tsx` optimistically appends the user's message, then calls `processUserQuery` (`services/ragEngine.ts`).
- `processUserQuery` short-circuits simple greetings locally; everything else calls `askQuestion()` → `POST /api/v1/chat/ask` and maps the backend's `sources` into the richer `SourceCitation` shape the UI expects.
- Clicking a cited source opens `SourceDrawer.tsx` with the passage excerpt and match confidence.
- Conversations are cached to `localStorage` (`agilo-dashboard-conversations`) for instant reload, and separately synced with the backend's real sessions via `listSessions()` / `getSessionDetail()`.

## Views

`DashboardPage.tsx` drives a single `activityView` state (`home | documents | history | analytics | settings`) rendered inside a fixed-height CSS Grid shell (`4rem` header row + flexible content row), so the header and sidebar never move regardless of which panel is active:

- **home** — hero/prompt view when no chat is active, or the live `ChatInterface` once one is
- **documents** — Knowledge Base: upload + list indexed documents with chunk counts
- **history** — browse and reopen past sessions
- **analytics** — `AnalyticsPage.tsx`, pulling `/analytics/summary` and `/analytics/usage`
- **settings** — read-only display of retrieval config and backend connection info

## Known Gaps / Next Steps

- Message feedback (`ThumbsUp`/`ThumbsDown` in `ChatInterface.tsx`) parses a numeric id out of the client-generated message id string (`msg-ai-{timestamp}`), which won't match the backend's real integer message id unless the session was reloaded via `getSessionDetail()`. Needs either a backend schema change (`ChatResponse` returning the new message's id) or a refetch-after-send strategy before feedback submission is reliable for freshly-sent messages.
- Logout doesn't clear `localStorage` tokens.
- Upload input `accept` list (`.pdf,.docx,.txt,.md`) is broader than what the backend currently accepts (`.pdf,.docx,.xlsx`) — align these to avoid confusing upload errors.
