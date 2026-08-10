const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001';

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface BackendSource {
  document_name: string;
  page_number?: number | null;
}

export interface BackendChatResponse {
  answer: string;
  sources: BackendSource[];
  session_id?: number | null;
}

export interface ChatHistoryMessage {
  id: number;
  role: string;
  content: string;
  created_at: string;
  feedback?: number | null;
}

export interface ChatHistorySession {
  id: number;
  title: string;
  created_at: string;
  messages: ChatHistoryMessage[];
}

export interface DocumentUploadResponse {
  id: number;
  filename: string;
  uploaded_at: string;
  chunk_count: number;
}

export interface UsageSummary {
  labels: string[];
  values: number[];
  automation_rate: number;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
}

export interface SessionListItem {
  id: number;
  title: string | null;
  created_at: string;
}

export interface PopularDocument {
  filename: string;
  access_count: number;
}

export interface AnalyticsSummary {
  total_documents: number;
  total_sessions: number;
  total_questions_asked: number;
  top_documents: PopularDocument[];
  recent_questions: string[];
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const detail = typeof payload === 'object' && payload && 'detail' in payload
      ? String((payload as { detail?: unknown }).detail)
      : 'Request failed';
    throw new Error(detail);
  }

  return (payload ?? {}) as T;
}

function buildFormBody(username: string, password: string) {
  const params = new URLSearchParams();
  params.set('username', username);
  params.set('password', password);
  return params.toString();
}

export async function authenticateUser(emailOrUsername: string, password: string) {
  const normalizedUsername = emailOrUsername.includes('@')
    ? emailOrUsername.split('@')[0]
    : emailOrUsername;

  const data = await request<AuthResponse>(
    '/api/v1/auth/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: buildFormBody(normalizedUsername, password),
    }
  );

  return {
    accessToken: data.access_token,
    tokenType: data.token_type,
  };
}

// NEW: standalone registration, called explicitly from the Sign Up tab
export async function registerUser(username: string, email: string, password: string) {
  return request<UserResponse>(
    '/api/v1/auth/register',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    }
  );
}

// NEW: GET /api/v1/auth/me
export async function getCurrentUser(token?: string) {
  return request<UserResponse>('/api/v1/auth/me', { method: 'GET' }, token);
}

export async function askQuestion(question: string, token?: string, sessionId?: number | null) {
  return request<BackendChatResponse>(
    '/api/v1/chat/ask',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        session_id: sessionId ?? null,
      }),
    },
    token
  );
}

export async function createChatSession(token?: string) {
  return request<{ id: number; title: string | null; created_at: string }>(
    '/api/v1/sessions/',
    { method: 'POST' },
    token
  );
}

// NEW: GET /api/v1/sessions/ (list, lighter payload than /chat/history)
export async function listSessions(token?: string) {
  return request<SessionListItem[]>('/api/v1/sessions/', { method: 'GET' }, token);
}

// NEW: GET /api/v1/sessions/{id} (single session with full messages)
export async function getSessionDetail(sessionId: number, token?: string) {
  return request<ChatHistorySession>(`/api/v1/sessions/${sessionId}`, { method: 'GET' }, token);
}

export async function getChatHistory(token?: string) {
  return request<ChatHistorySession[]>('/api/v1/chat/history', { method: 'GET' }, token);
}

// NEW: POST /api/v1/sessions/messages/{message_id}/feedback
export async function submitMessageFeedback(messageId: number, feedback: 1 | -1, token?: string) {
  return request<{ status: string }>(
    `/api/v1/sessions/messages/${messageId}/feedback`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feedback }),
    },
    token
  );
}

export async function uploadDocument(file: File, token?: string) {
  const formData = new FormData();
  formData.append('file', file);

  return request<DocumentUploadResponse>(
    '/api/v1/documents/upload',
    {
      method: 'POST',
      body: formData,
    },
    token
  );
}

export async function listDocuments(token?: string) {
  return request<DocumentUploadResponse[]>('/api/v1/documents/', { method: 'GET' }, token);
}

// NEW: GET /api/v1/analytics/summary
export async function getAnalyticsSummary(token?: string) {
  return request<AnalyticsSummary>('/api/v1/analytics/summary', { method: 'GET' }, token);
}

export async function getUsageStats(token?: string) {
  return request<UsageSummary>('/api/v1/analytics/usage', { method: 'GET' }, token);
}