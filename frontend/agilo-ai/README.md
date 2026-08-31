# Agilo AI — Frontend

React + Vite + TypeScript frontend for the **Agilo AI enterprise knowledge assistant**.

The frontend provides authenticated chat, document-grounded answers with source citations, knowledge-base management, chat history, analytics, and user settings.

## Tech Stack

| Layer           | Technology                                      |
| --------------- | ----------------------------------------------- |
| **Build Tool**  | Vite                                            |
| **UI Library**  | React 19 + TypeScript                           |
| **Styling**     | Tailwind CSS v4                                 |
| **Animation**   | Framer Motion                                   |
| **Icons**       | `lucide-react`                                  |
| **HTTP Client** | Native `fetch` wrapper in `src/services/api.ts` |

## Project Structure

```text id="g0mb12"
frontend/agilo-ai/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   │
│   │   └── dashboard/
│   │       ├── DashboardPage.tsx
│   │       ├── Sidebar.tsx
│   │       ├── ChatInterface.tsx
│   │       ├── SourceDrawer.tsx
│   │       ├── AnalyticsPage.tsx
│   │       └── FormattedMarkdown.tsx
│   │
│   ├── services/
│   │   ├── api.ts
│   │   └── ragEngine.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

### Main Files

| File                    | Purpose                                                  |
| ----------------------- | -------------------------------------------------------- |
| `LoginPage.tsx`         | Animated sign-in and sign-up interface                   |
| `DashboardPage.tsx`     | Main dashboard and application state                     |
| `Sidebar.tsx`           | Navigation between application views                     |
| `ChatInterface.tsx`     | Main chat interface                                      |
| `SourceDrawer.tsx`      | Displays source passages and citation details            |
| `AnalyticsPage.tsx`     | Admin analytics dashboard                                |
| `FormattedMarkdown.tsx` | Renders Markdown-formatted assistant responses           |
| `api.ts`                | Backend API requests and response types                  |
| `ragEngine.ts`          | Chat/query orchestration and local conversation handling |
| `App.tsx`               | Top-level authentication gate                            |
| `main.tsx`              | React application entry point                            |
| `index.css`             | Tailwind theme tokens and global utility styles          |

## Setup

### 1. Prerequisites

Make sure the following are installed:

* Node.js
* npm
* Agilo AI backend running locally or remotely

## 2. Install Dependencies

Navigate to the frontend directory:

```bash id="y2qvpu"
cd frontend/agilo-ai
```

Install dependencies:

```bash id="vbkr4n"
npm install
```

## 3. Configure the Backend API URL

The application reads the backend URL from:

```text id="pxvn60"
VITE_API_BASE_URL
```

If this variable is not configured, the application defaults to:

```text id="rmg9ri"
http://127.0.0.1:8080
```

The default behavior is defined in:

```text id="7j45np"
src/services/api.ts
```

### Recommended Setup

Create a `.env` file inside:

```text id="bhyvue"
frontend/agilo-ai/.env
```

Add:

```env id="kkjgtk"
VITE_API_BASE_URL=http://127.0.0.1:8080
```

For production deployments, replace the local URL with the deployed backend URL.

Example:

```env id="fd1qrb"
VITE_API_BASE_URL=https://your-backend-domain.com
```

> Vite environment variables exposed to frontend code must begin with `VITE_`.

## 4. Run the Application

Start the development server:

```bash id="h6mnt8"
npm run dev
```

Vite will print a local development URL in the terminal.

Usually:

```text id="zofmd8"
http://localhost:5173
```

Open that URL in your browser.

## Available Scripts

### Development Server

```bash id="djkyuq"
npm run dev
```

Starts the Vite development server with hot module replacement.

### Production Build

```bash id="iqv8jl"
npm run build
```

Runs the TypeScript build/type-check process and generates the production bundle.

### Production Preview

```bash id="4otdaz"
npm run preview
```

Runs the production build locally for testing.

### Lint

```bash id="h6sf4q"
npm run lint
```

Runs the configured Oxlint checks.

## Application Architecture

```text id="xmldrc"
User
 ↓
React UI
 ↓
services/api.ts
 ↓
FastAPI Backend
 ↓
RAG Pipeline
 ↓
Grounded Answer + Sources
 ↓
React Chat Interface
```

The frontend does not perform document retrieval or LLM generation itself.

Those operations are handled by the backend.

The frontend is responsible for:

* Authentication UI
* API communication
* Chat interaction
* Source citation display
* Document management
* Conversation history
* Analytics visualization
* User settings

## Authentication Flow

The authentication flow is handled primarily by:

```text id="831zfn"
LoginPage.tsx
App.tsx
services/api.ts
DashboardPage.tsx
```

The basic flow is:

```text id="gfur1q"
User
 ↓
Sign In / Sign Up
 ↓
LoginPage.tsx
 ↓
services/api.ts
 ↓
FastAPI Authentication Endpoint
 ↓
JWT Access Token
 ↓
localStorage
 ↓
Dashboard
```

## Login & Theme Modes

`LoginPage.tsx` provides two visually distinct authentication experiences.

### Employee Mode

Uses:

* Deep navy styling
* Glassmorphism elements
* Animated UI components
* Enterprise-focused interface

### Admin Mode

Uses:

* Dark navy theme
* Cobalt blue accents
* Premium dashboard styling

Both modes communicate with the same backend authentication system.

Authentication requests are made through functions such as:

```text id="egm7bg"
authenticateUser()
registerUser()
```

defined inside:

```text id="qhjfsr"
src/services/api.ts
```

## JWT Storage

After successful authentication, the frontend stores:

```text id="agn1i7"
agilo-access-token
agilo-token-type
```

inside browser `localStorage`.

Authenticated API requests retrieve the access token from `localStorage` before communicating with protected backend endpoints.

This avoids relying only on temporary React component state for authentication.

## Chat / RAG Flow

The main chat flow begins inside:

```text id="xdopuk"
DashboardPage.tsx
```

When the user sends a message:

```text id="hqjm7p"
handleSendMessage()
```

is executed.

The flow is:

```text id="ir5rhx"
User Message
 ↓
handleSendMessage()
 ↓
Optimistic UI Update
 ↓
processUserQuery()
 ↓
askQuestion()
 ↓
POST /api/v1/chat/ask
 ↓
FastAPI RAG Pipeline
 ↓
Answer + Sources
 ↓
Frontend Source Mapping
 ↓
ChatInterface
```

## Query Processing

`processUserQuery()` is located in:

```text id="hl7i8t"
src/services/ragEngine.ts
```

It coordinates frontend-side query handling.

The actual API request is performed through:

```text id="seg97p"
askQuestion()
```

which sends the question to:

```text id="g0aem8"
POST /api/v1/chat/ask
```

The backend response contains the assistant answer and source information.

The frontend then converts backend sources into the richer citation structure expected by the UI.

## Source Citations

Responses generated through the RAG pipeline can contain document citations.

When a user clicks a citation, the frontend opens:

```text id="4io3as"
SourceDrawer.tsx
```

The drawer can display information such as:

* Source document
* Relevant passage
* Citation details
* Match confidence

This allows users to inspect the source material behind an AI-generated response.

## Conversation Storage

Conversations are stored in two places.

### Local Cache

The frontend caches conversations in browser `localStorage` using:

```text id="3ui8w4"
agilo-dashboard-conversations
```

This allows the interface to restore conversations quickly after page reloads.

### Backend Sessions

Conversations are also synchronized with the backend session system.

Frontend API functions include:

```text id="t2yqci"
listSessions()
getSessionDetail()
```

The backend remains the persistent source for stored chat sessions and messages.

## Dashboard Views

`DashboardPage.tsx` manages the main application area using an `activityView` state.

Supported values include:

```text id="enusrp"
home
documents
history
analytics
settings
```

The dashboard uses a fixed-height CSS Grid layout so the header and sidebar remain stable while the main content changes.

The general layout is:

```text id="1lzhgl"
Dashboard
├── Header
├── Sidebar
└── Main Content
    ├── Home / Chat
    ├── Documents
    ├── History
    ├── Analytics
    └── Settings
```

## Home / Chat View

The `home` view displays either:

* Initial hero/prompt interface when no chat is active
* Live `ChatInterface` after a conversation begins

This is the primary workspace for interacting with Agilo AI.

## Documents View

The `documents` view acts as the **Knowledge Base** interface.

Users can:

* Upload documents
* View indexed documents
* Inspect available document information
* Manage accessible knowledge

Supported backend formats are:

```text id="0tuop0"
.pdf
.docx
.xlsx
```

Visible documents depend on the user's role and backend access-control rules.

## History View

The `history` view lets users browse previous conversations.

Users can:

* View existing sessions
* Select previous conversations
* Reload previous messages
* Continue earlier conversations

Session data is retrieved from the backend using the Sessions API.

## Analytics View

The `analytics` view renders:

```text id="tn2r1p"
AnalyticsPage.tsx
```

This view is intended for **Admin users**.

It communicates with backend endpoints including:

```text id="ejn0tc"
GET /api/v1/analytics/summary
GET /api/v1/analytics/usage
```

The analytics interface can display information such as:

* Total documents
* Total sessions
* Questions asked
* Usage trends
* Recent activity
* Document usage

## Settings View

The `settings` view provides configuration-related information.

It can include:

* Retrieval configuration
* Application settings
* Groq API key input

Users can securely provide their Groq API key through this interface.

The key is sent to the backend for encrypted storage rather than being used directly for LLM requests from the browser.

## API Layer

All backend communication is centralized inside:

```text id="t95cfl"
src/services/api.ts
```

This keeps HTTP logic separate from UI components.

The API layer is responsible for operations such as:

```text id="lrk8rq"
Authentication
User Registration
Current User Retrieval
Chat Questions
Document Listing
Document Upload
Document Deletion
Session Listing
Session Details
Analytics
API Key Storage
```

Centralizing API requests makes it easier to update the backend URL, authentication behavior, error handling, and response types.

## RAG Engine

Frontend RAG coordination logic is located inside:

```text id="ihwva4"
src/services/ragEngine.ts
```

Despite its name, the actual vector retrieval and LLM generation happen on the backend.

The frontend RAG engine primarily handles:

* Query orchestration
* Message formatting
* Session structures
* Source mapping
* Local conversation caching

The architecture is therefore:

```text id="47kjrl"
Frontend RAG Orchestration
          ↓
Backend RAG Execution
          ↓
PostgreSQL + pgvector
          ↓
Groq LLM
```

## Styling

The application uses:

```text id="ftw46m"
Tailwind CSS v4
```

Global styling and design tokens are primarily defined inside:

```text id="p6sow9"
src/index.css
```

The interface uses an enterprise visual language with:

* Deep navy backgrounds
* Blue accents
* Glassmorphism
* Soft shadows
* Animated transitions
* Responsive dashboard layouts

## Animations

Animations are implemented using:

```text id="79gezp"
Framer Motion
```

Animation is used throughout areas such as:

* Authentication screens
* Dashboard transitions
* Interactive elements
* Panels
* Chat UI
* Navigation

## Icons

The project uses:

```text id="jxja5c"
lucide-react
```

for interface icons.

This provides a consistent icon system across authentication, navigation, chat, documents, analytics, and settings.

## Backend Integration

For local development, the frontend expects:

```text id="lzno26"
http://127.0.0.1:8080
```

The frontend environment configuration should therefore contain:

```env id="j0eu5x"
VITE_API_BASE_URL=http://127.0.0.1:8080
```

For production deployment, this should be replaced with the deployed FastAPI backend URL.

Example:

```env id="3p1d3g"
VITE_API_BASE_URL=https://api.example.com
```

## Production Build

Create a production build using:

```bash id="6hu0vy"
npm run build
```

The generated build can then be deployed to a static hosting platform such as Vercel.

When deploying, make sure the production environment includes the correct:

```text id="3i2lnp"
VITE_API_BASE_URL
```

Otherwise, the frontend may continue attempting to communicate with:

```text id="gz602k"
http://127.0.0.1:8080
```

which only works on the developer's local machine.

## Security Considerations

The frontend follows several security-oriented design choices:

* JWT authentication
* Protected backend API requests
* Role-aware UI
* Backend-controlled document authorization
* Backend-controlled RAG retrieval
* Server-side LLM requests
* API keys sent to the backend for encrypted storage

Sensitive application logic such as document authorization and vector retrieval is intentionally handled by the backend rather than trusted to the browser.

## Known Gaps / Next Steps

### Logout Token Cleanup

Logout currently changes the local authentication state.

Production-ready logout should also ensure that stored authentication information is removed from `localStorage`.

This includes:

```text id="tex4zy"
agilo-access-token
agilo-token-type
```

### Upload Format Alignment

The frontend file input should only allow formats currently supported by the backend:

```text id="7zej2l"
.pdf
.docx
.xlsx
```

Keeping the frontend `accept` configuration synchronized with backend validation prevents confusing upload failures.

### Message Feedback

The thumbs-up / thumbs-down feedback interface was intentionally removed from the current chat UI.

No feedback synchronization or reconciliation system is currently required.

### Authentication Improvements

Future production improvements may include:

* Stronger logout cleanup
* Better token-expiration handling
* Automatic redirect after expired authentication
* Centralized handling of `401 Unauthorized` responses

### Error Handling

Future improvements may include:

* Standardized API error components
* Better network-failure messages
* Retry UI for failed chat messages
* Upload progress indicators
* More descriptive backend error rendering

## Future Improvements

Potential future frontend improvements include:

* Streaming AI responses
* Improved mobile responsiveness
* Better citation previews
* Drag-and-drop document uploads
* Upload progress tracking
* Advanced document filters
* Better session search
* Real-time analytics
* Dark/light theme switching
* Enhanced notification system
* Agent/tool-calling interfaces
* Additional enterprise integrations

## Related Documentation

For backend setup, API endpoints, database architecture, and the full RAG pipeline, see:

```text id="z5yzbp"
backendmain/README.md
```

For the overall project architecture, see the root:

```text id="yr03ea"
README.md
```

## License

This project is currently intended as an **enterprise prototype and internal development project**.
