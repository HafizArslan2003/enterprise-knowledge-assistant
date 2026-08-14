import React, { useEffect, useRef, useState } from 'react';
import { Sidebar, type ActivityView } from './Sidebar';
import { ChatInterface } from './ChatInterface';
import { SourceDrawer } from './SourceDrawer';
import { AnalyticsPage } from './AnalyticsPage';
import {
  processUserQuery
} from '../../services/ragEngine';
import {
  getUsageStats,
  listDocuments,
  uploadDocument,
  deleteDocument,
  listSessions,
  getSessionDetail,
  deleteChatSession,
  getCurrentUser,
  getGeminiApiKeyStatus,
  saveGeminiApiKey,
  type ChatHistorySession,
  type DocumentUploadResponse,
  type UsageSummary,
  type UserResponse,
  type GeminiApiKeyStatus
} from '../../services/api';
import type {
  ConversationSession,
  Message,
  SourceCitation
} from '../../services/ragEngine';
import {
  Sparkles,
  Send,
  Paperclip,
  Activity,
  Database,
  Bot,
  HelpCircle,
  Bell,
  BookOpen,
  History,
  Upload,
  BarChart3,
  Settings as SettingsIcon,
  Search,
  FileText,
  Clock,
  Sliders,
  CheckCircle2,
  Cpu,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';


const createConversationTitle = (query: string) => {
  const cleaned = query.trim().replace(/\s+/g, ' ');
  const preview = cleaned.length > 38 ? `${cleaned.slice(0, 35)}...` : cleaned;
  return preview || 'New Enterprise Conversation';
};


export const DashboardPage: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [conversations, setConversations] = useState<ConversationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  // isChatActive = user is in the chat view (either a real session or a pending new chat)
  const [isChatActive, setIsChatActive] = useState<boolean>(false);
  // pendingNewChat = user clicked "New Chat" but hasn't sent a message yet (no session created)
  const [pendingNewChat, setPendingNewChat] = useState<boolean>(false);
  // pendingMessages = messages typed in a pending new chat before the session is created
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);

  const [selectedSource, setSelectedSource] = useState<SourceCitation | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentToolStep, setCurrentToolStep] = useState<string>('');

  const [heroPrompt, setHeroPrompt] = useState<string>('');
  const [activeSessionIdNumber, setActiveSessionIdNumber] = useState<number | null>(null);
  const [historySessions, setHistorySessions] = useState<ChatHistorySession[]>([]);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<DocumentUploadResponse[]>([]);
  const [docSearch, setDocSearch] = useState<string>('');
  const [usageStats, setUsageStats] = useState<UsageSummary | null>(null);

  const [activityView, setActivityView] = useState<ActivityView>('home');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiKeyStatus, setGeminiKeyStatus] = useState<GeminiApiKeyStatus | null>(null);
  const [isSavingGeminiKey, setIsSavingGeminiKey] = useState(false);
  const [geminiKeyMessage, setGeminiKeyMessage] = useState('');

  // activeSession: if in pendingNewChat mode, use a virtual empty session; otherwise look up the real one
  const activeSession: ConversationSession = pendingNewChat
    ? { id: '__pending__', title: 'New Chat', updatedAt: 'Just now', messages: pendingMessages }
    : (conversations.find(c => c.id === activeSessionId) ?? { id: '', title: '', updatedAt: '', messages: [] });
const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || isGenerating) return;

    if (!isChatActive) {
      setIsChatActive(true);
    }
    setActivityView('home');

    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (pendingNewChat) {
      // In pending mode: optimistically show the user message
      setPendingMessages(prev => [...prev, userMsg]);
    } else {
      // Bubble the active session to the top with the new message
      setConversations(prev => {
        const updated = prev.map(conv =>
          conv.id === activeSessionId
            ? { ...conv, messages: [...conv.messages, userMsg], updatedAt: 'Just now' }
            : conv
        );
        const active = updated.find(c => c.id === activeSessionId);
        const rest = updated.filter(c => c.id !== activeSessionId);
        return active ? [active, ...rest] : updated;
      });
    }

    setIsGenerating(true);
    setCurrentToolStep('Analyzing request...');

    try {
      const token = localStorage.getItem('agilo-access-token') || undefined;
      const response = await processUserQuery(
        queryText,
        (step) => {
          setCurrentToolStep(step);
        },
        token,
        // Pass null when pending so the backend auto-creates a new session
        pendingNewChat ? null : activeSessionIdNumber
      );

      const assistantMsg: Message = {
        id: `msg-ai-${Date.now()}`,
        sender: 'assistant',
        content: response.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        usedDocumentSearch: response.usedDocumentSearch,
        toolSteps: response.toolSteps,
        sources: response.sources
      };

      if (pendingNewChat && response.sessionId !== null && response.sessionId !== undefined) {
        // Server created a real session — convert from pending to a real conversation
        const newServerId = `server-session-${response.sessionId}`;
        const newConv: ConversationSession = {
          id: newServerId,
          title: createConversationTitle(queryText),
          updatedAt: 'Just now',
          messages: [...pendingMessages, userMsg, assistantMsg],
        };
        setConversations(prev => [newConv, ...prev]);
        setActiveSessionId(newServerId);
        setActiveSessionIdNumber(response.sessionId);
        setPendingNewChat(false);
        setPendingMessages([]);
      } else if (pendingNewChat) {
        // Session id wasn't returned but still clear pending state gracefully
        setPendingMessages(prev => [...prev, assistantMsg]);
      } else {
        if (activeSessionIdNumber === null && response.sessionId !== null) {
          setActiveSessionIdNumber(response.sessionId);
        }
        // Bubble the session to the top and update its timestamp
        setConversations(prev => {
          const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const updated = prev.map(conv =>
            conv.id === activeSessionId
              ? { ...conv, messages: [...conv.messages, assistantMsg], updatedAt: now }
              : conv
          );
          const active = updated.find(c => c.id === activeSessionId);
          const rest = updated.filter(c => c.id !== activeSessionId);
          return active ? [active, ...rest] : updated;
        });
      }
    } finally {
      setIsGenerating(false);
      setCurrentToolStep('');
    }
  };
  const handleNewChat = () => {
    // Lazy creation: don't create a backend session or add anything to the list.
    // Simply mark that we are in "pending new chat" mode. A real session is
    // created automatically by /ask when the user sends their first message.
    setActiveSessionIdNumber(null);
    setPendingNewChat(true);
    setPendingMessages([]);
    setActiveSessionId('');
    setIsChatActive(true);
    setActivityView('home');
  };

  const handleNavigate = (view: ActivityView) => {
    if (view === 'home') {
      // The Dashboard link returns to the overview rather than reopening the
      // current (or unsent) chat. Existing server chats remain in the sidebar.
      setIsChatActive(false);
      setPendingNewChat(false);
      setPendingMessages([]);
      setActiveSessionId('');
      setActiveSessionIdNumber(null);
    }

    setActivityView(view);
  };

  const handleDeleteChat = async (localId: string) => {
    if (!localId.startsWith('server-session-')) return;
    if (!window.confirm('Permanently delete this chat and all of its messages? This cannot be undone.')) return;

    const sessionId = Number(localId.replace('server-session-', ''));
    const token = localStorage.getItem('agilo-access-token') || undefined;
    try {
      await deleteChatSession(sessionId, token);
      const remaining = conversations.filter((conversation) => conversation.id !== localId);
      setConversations(remaining);
      setHistorySessions((sessions) => sessions.filter((session) => session.id !== sessionId));

      if (activeSessionId === localId) {
        setActiveSessionIdNumber(null);
        setActiveSessionId('');
        setPendingNewChat(true);
        setPendingMessages([]);
        setIsChatActive(true);
        setActivityView('home');
      }
    } catch (error) {
      console.error('Unable to delete chat', error);
      window.alert('Unable to delete this chat. Please try again.');
    }
  };

  const refreshHistory = async () => {
    const token = localStorage.getItem('agilo-access-token') || undefined;
    setIsLoadingSessions(true);
    try {
      const sessions = await listSessions(token);

      setHistorySessions(
        sessions.map((s) => ({
          id: s.id,
          title: s.title || 'Untitled conversation',
          created_at: s.created_at,
          messages: []
        }))
      );

      // Only keep real server sessions — no local ghost sessions
      const mapped: ConversationSession[] = sessions.map((session) => ({
        id: `server-session-${session.id}`,
        title: session.title || 'Untitled conversation',
        updatedAt: new Date(session.created_at).toLocaleDateString(),
        messages: []
      }));

      setConversations(mapped);
    } catch (error) {
      console.error('Unable to load sessions', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadSessionMessages = async (serverSessionId: number, localId: string) => {
    const token = localStorage.getItem('agilo-access-token') || undefined;
    try {
      const detail = await getSessionDetail(serverSessionId, token);
      const messages: Message[] = detail.messages.map((m) => ({
        id: `msg-${m.id}`,
        sender: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.content,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));

      setConversations((prev) =>
        prev.map((conv) => (conv.id === localId ? { ...conv, messages } : conv))
      );
      setActiveSessionIdNumber(serverSessionId);
    } catch (error) {
      console.error('Unable to load session messages', error);
    }
  };

  const refreshDocuments = async () => {
    const token = localStorage.getItem('agilo-access-token') || undefined;
    try {
      const docs = await listDocuments(token);
      setDocuments(docs);
    } catch (error) {
      console.error('Unable to load documents', error);
    }
  };

  const refreshUsage = async () => {
    const token = localStorage.getItem('agilo-access-token') || undefined;
    try {
      const stats = await getUsageStats(token);
      setUsageStats(stats);
    } catch (error) {
      console.error('Unable to load usage stats', error);
    }
  };

  const refreshCurrentUser = async () => {
    const token = localStorage.getItem('agilo-access-token') || undefined;
    try {
      const user = await getCurrentUser(token);
      setCurrentUser(user);
    } catch (error) {
      console.error('Unable to load current user', error);
    }
  };

  const refreshGeminiKeyStatus = async () => {
    const token = localStorage.getItem('agilo-access-token') || undefined;
    try {
      setGeminiKeyStatus(await getGeminiApiKeyStatus(token));
    } catch (error) {
      console.error('Unable to load Gemini key status', error);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiApiKey.trim()) return;
    const token = localStorage.getItem('agilo-access-token') || undefined;
    setIsSavingGeminiKey(true);
    setGeminiKeyMessage('');
    try {
      const status = await saveGeminiApiKey(geminiApiKey.trim(), token);
      setGeminiKeyStatus(status);
      setGeminiApiKey('');
      setGeminiKeyMessage('Gemini API key saved securely.');
    } catch (error) {
      setGeminiKeyMessage(error instanceof Error ? error.message : 'Unable to save Gemini API key.');
    } finally {
      setIsSavingGeminiKey(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem('agilo-access-token') || undefined;
    setUploading(true);
    try {
      await uploadDocument(file, token);
      await refreshDocuments();
      setActivityView('documents');
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (document: DocumentUploadResponse) => {
    if (!window.confirm(`Permanently delete \"${document.filename}\" and all of its indexed data? This cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem('agilo-access-token') || undefined;
    setDeletingDocumentId(document.id);
    try {
      await deleteDocument(document.id, token);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
    } catch (error) {
      console.error('Unable to delete document', error);
      window.alert(error instanceof Error ? error.message : 'Unable to delete this document. Please try again.');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  // NOTE: localStorage persistence removed — sessions now live exclusively on the backend.
  // The sidebar is always populated from the server via refreshHistory().

  useEffect(() => {
    refreshHistory();
    refreshDocuments();
    refreshUsage();
    refreshCurrentUser();
    refreshGeminiKeyStatus();
  }, []);

  const filteredHistory = historySessions.filter(s =>
    s.title.toLowerCase().includes(historySearch.toLowerCase())
  );

  const filteredDocuments = documents.filter(d =>
    d.filename.toLowerCase().includes(docSearch.toLowerCase())
  );

  const viewTitleMap: Record<ActivityView, string> = {
    home: isChatActive ? 'Active Chat Session' : 'Overview Dashboard',
    documents: 'Knowledge Base & Documents',
    analytics: 'Analytics & Usage Metrics',
    history: 'Conversation History',
    settings: 'System & RAG Settings',
  };

  return (
    <div className="fixed inset-0 w-screen h-dvh overflow-hidden bg-agilo-bg flex flex-row relative font-sans selection:bg-agilo-bright/30">
      {/* Background Decorators */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.12),_transparent_38%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:30px_30px] pointer-events-none" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="absolute right-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-white/70 blur-3xl pointer-events-none" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.1 }} className="absolute bottom-[-6rem] left-[-4rem] h-80 w-80 rounded-full bg-sky-200/40 blur-3xl pointer-events-none" />

      {/* Persistent Sidebar */}
      <Sidebar
        conversations={conversations}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          // Dismiss any pending new chat when user selects a real session
          setPendingNewChat(false);
          setPendingMessages([]);
          setActiveSessionId(id);
          setIsChatActive(true);
          setActivityView('home');

          if (id.startsWith('server-session-')) {
            const serverIdNum = parseInt(id.replace('server-session-', ''), 10);
            const conv = conversations.find((c) => c.id === id);
            if (conv && conv.messages.length === 0) {
              loadSessionMessages(serverIdNum, id);
            } else {
              setActiveSessionIdNumber(serverIdNum);
            }
          }
        }}
        onDeleteSession={handleDeleteChat}
        onNewChat={handleNewChat}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isLoadingSessions={isLoadingSessions}
        currentUsername={currentUser?.username}
        activeView={activityView}
        onNavigate={handleNavigate}
      />

      {/* Right Main Shell Area — Header and Footer locked shrink-0 */}
      <div className="flex-1 min-w-0 min-h-0 grid grid-rows-[4rem_minmax(0,1fr)] overflow-hidden relative z-10">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={handleUpload}
        />

        {/* 1. PERSISTENT UNCLUTTERED TOP HEADER NAVBAR */}
        {/* 1. PERSISTENT UNCLUTTERED TOP HEADER NAVBAR */}
        <header className="h-16 px-6 border-b border-agilo-border/80 bg-white/90 backdrop-blur-md flex items-center justify-between z-30 shadow-xs">
          {/* Left: Current View Breadcrumb */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-agilo-secondary">
              <span className="text-slate-400">Workspace</span>
              <span className="text-slate-300">/</span>
              <span className="text-agilo-navy font-bold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                {viewTitleMap[activityView]}
              </span>
            </div>
          </div>

          {/* Right: Quick actions & User profile */}
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 rounded-xl border border-agilo-border hover:bg-agilo-bg text-xs font-semibold text-agilo-navy flex items-center gap-1.5 transition-colors cursor-pointer">
              <HelpCircle className="w-3.5 h-3.5 text-agilo-secondary" />
              <span className="hidden sm:inline">Help</span>
            </button>

            <button className="w-8.5 h-8.5 rounded-xl border border-agilo-border hover:bg-agilo-bg flex items-center justify-center text-agilo-secondary hover:text-agilo-navy transition-colors relative cursor-pointer">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-agilo-primary rounded-full" />
            </button>

            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white font-bold text-xs flex items-center justify-center border border-white/40 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* 2. MIDDLE WORKSPACE AREA — Seamless, full-bleed container with zero margin caps */}
        <main className="min-h-0 w-full overflow-hidden relative flex flex-col">
          {activityView === 'history' ? (
            /* HISTORY PAGE VIEW */
            <div className="w-full h-full p-6 lg:p-8 overflow-y-auto overscroll-contain space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-agilo-navy tracking-tight">Conversation History</h2>
                  <p className="text-xs text-agilo-secondary mt-0.5 font-medium">Browse and search your past AI chat sessions</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      name="history-search"
                      autoComplete="off"
                      value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search history..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-agilo-border rounded-xl text-xs text-agilo-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-agilo-primary"
                  />
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="rounded-2xl border border-agilo-border bg-white/80 p-12 text-center shadow-sm">
                  <Clock className="w-8 h-8 text-agilo-secondary mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-agilo-navy">No conversation history found</p>
                  <p className="text-xs text-agilo-secondary mt-1">Start a new query from the dashboard to create a session</p>
                  <button
                    onClick={handleNewChat}
                    className="mt-4 px-4 py-2 bg-agilo-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-agilo-deep transition-colors"
                  >
                    Start New Chat
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredHistory.map((session) => (
                    <motion.div
                      key={session.id}
                      whileHover={{ y: -2 }}
                      onClick={() => {
                        const localId = `server-session-${session.id}`;
                        setActiveSessionId(localId);
                        setIsChatActive(true);
                        setActivityView('home');
                        loadSessionMessages(session.id, localId);
                      }}
                      className="rounded-2xl border border-agilo-border bg-white p-5 shadow-sm hover:border-agilo-bright hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-agilo-navy">
                          <FileText className="w-4 h-4 text-agilo-primary shrink-0" />
                          <span className="truncate">{session.title}</span>
                        </div>
                        <p className="text-[11px] text-agilo-secondary line-clamp-2">
                          Enterprise AI session created on {new Date(session.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-agilo-secondary">
                        <span>{new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteChat(`server-session-${session.id}`);
                            }}
                            className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors"
                            title="Delete chat permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                          <span className="text-agilo-primary font-bold hover:underline">Open Session →</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : activityView === 'documents' ? (
            /* KNOWLEDGE BASE / DOCUMENTS VIEW */
            <div className="w-full h-full p-6 lg:p-8 overflow-y-auto overscroll-contain space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-agilo-navy tracking-tight">Enterprise Knowledge Base</h2>
                  <p className="text-xs text-agilo-secondary mt-0.5 font-medium">Uploaded documents indexed for vector RAG retrieval</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      name="document-search"
                      autoComplete="off"
                      value={docSearch}
                      onChange={(e) => setDocSearch(e.target.value)}
                      placeholder="Filter documents..."
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-agilo-border rounded-xl text-xs text-agilo-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-agilo-primary"
                    />
                  </div>

                  <button
                    onClick={handleUploadClick}
                    disabled={uploading}
                    className="px-4 py-2 bg-gradient-to-r from-agilo-deep to-agilo-primary text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 transition-opacity flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
                  </button>
                </div>
              </div>

              {/* Upload Drop Zone Banner */}
              <div
                onClick={handleUploadClick}
                className="rounded-2xl border-2 border-dashed border-agilo-primary/30 bg-agilo-primary/5 p-6 text-center hover:bg-agilo-primary/10 transition-colors cursor-pointer"
              >
                <Upload className="w-7 h-7 text-agilo-primary mx-auto mb-2" />
                <span className="text-xs font-bold text-agilo-navy block">Click to upload files to vector store</span>
                <span className="text-[11px] text-agilo-secondary block mt-0.5">Supports PDF, DOCX, TXT, and MD documents</span>
              </div>

              {filteredDocuments.length === 0 ? (
                <div className="rounded-2xl border border-agilo-border bg-white/80 p-12 text-center shadow-sm">
                  <BookOpen className="w-8 h-8 text-agilo-secondary mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-agilo-navy">No documents indexed yet</p>
                  <p className="text-xs text-agilo-secondary mt-1">Upload files above to populate your Enterprise Knowledge Base</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredDocuments.map((doc) => (
                    <div key={doc.id} className="rounded-2xl border border-agilo-border bg-white p-5 shadow-sm space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-agilo-primary/10 flex items-center justify-center text-agilo-primary shrink-0">
                            <FileText className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-agilo-navy truncate">{doc.filename}</h4>
                            <span className="text-[10px] text-agilo-secondary block">
                              Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc)}
                          disabled={deletingDocumentId === doc.id}
                          title={`Delete ${doc.filename}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only">Delete document</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-semibold text-agilo-secondary pt-2 border-t border-slate-100">
                        <span className="bg-slate-100 text-agilo-navy px-2 py-0.5 rounded-lg">
                          {doc.chunk_count} chunks indexed
                        </span>
                        <span className="text-agilo-success flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activityView === 'analytics' ? (
            /* ANALYTICS VIEW */
            <AnalyticsPage onClose={() => setActivityView('home')} />
          ) : activityView === 'settings' ? (
            /* SETTINGS PAGE VIEW */
            <div className="w-full h-full p-6 lg:p-8 overflow-y-auto overscroll-contain space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-agilo-navy tracking-tight">System Settings & RAG Config</h2>
                <p className="text-xs text-agilo-secondary mt-0.5 font-medium">Manage vector store parameters, model options, and workspace preferences</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-agilo-border bg-white p-6 shadow-sm space-y-4 md:col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-agilo-cyan/20 flex items-center justify-center text-agilo-navy">
                      <Cpu className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-agilo-navy">Personal Gemini API Key</h4>
                      <span className="text-xs text-agilo-secondary">Used only for your uploads and document chats</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="password"
                      name="gemini-api-key"
                      autoComplete="new-password"
                      value={geminiApiKey}
                      onChange={(event) => setGeminiApiKey(event.target.value)}
                      placeholder={geminiKeyStatus?.configured ? `Current key: ${geminiKeyStatus.masked_key}` : 'Paste your Gemini API key'}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-agilo-border rounded-xl text-xs text-agilo-navy placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-agilo-primary"
                    />
                    <button
                      onClick={handleSaveGeminiKey}
                      disabled={!geminiApiKey.trim() || isSavingGeminiKey}
                      className="px-4 py-2 rounded-xl bg-agilo-primary text-white text-xs font-bold disabled:opacity-40 hover:bg-agilo-deep transition-colors"
                    >
                      {isSavingGeminiKey ? 'Saving...' : 'Save Key'}
                    </button>
                  </div>
                  <p className={`text-[11px] ${geminiKeyMessage.includes('saved') ? 'text-agilo-success' : 'text-agilo-secondary'}`}>
                    {geminiKeyMessage || (geminiKeyStatus?.configured ? `Configured (${geminiKeyStatus.masked_key}). The full key is never shown again.` : 'No key configured. Add one before uploading documents or asking document questions.')}
                  </p>
                </div>

                <div className="rounded-2xl border border-agilo-border bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-agilo-primary/10 flex items-center justify-center text-agilo-primary">
                      <Sliders className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-agilo-navy">Retrieval Configuration</h4>
                      <span className="text-xs text-agilo-secondary">Vector embeddings & search options</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-agilo-navy block mb-1">Chunk Size (Tokens)</label>
                      <input type="text" readOnly value="512" className="w-full px-3 py-1.5 bg-slate-50 border border-agilo-border rounded-xl text-xs text-agilo-navy font-mono" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-agilo-navy block mb-1">Chunk Overlap</label>
                      <input type="text" readOnly value="50" className="w-full px-3 py-1.5 bg-slate-50 border border-agilo-border rounded-xl text-xs text-agilo-navy font-mono" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-agilo-navy block mb-1">Top-K Retrieval Count</label>
                      <input type="text" readOnly value="4" className="w-full px-3 py-1.5 bg-slate-50 border border-agilo-border rounded-xl text-xs text-agilo-navy font-mono" />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-agilo-border bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-agilo-cyan/20 flex items-center justify-center text-agilo-navy">
                      <Cpu className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-agilo-navy">Connected Backend API</h4>
                      <span className="text-xs text-agilo-secondary font-medium">FastAPI + SQLite Engine</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex justify-between p-2.5 rounded-xl bg-agilo-bg border border-agilo-border">
                      <span className="text-agilo-secondary font-semibold">Database File</span>
                      <span className="font-bold text-agilo-navy">backendmain/eka.db</span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-agilo-bg border border-agilo-border">
                      <span className="text-agilo-secondary font-semibold">Active User</span>
                      <span className="font-bold text-agilo-navy">{currentUser?.username || 'Authenticated'}</span>
                    </div>
                    <div className="flex justify-between p-2.5 rounded-xl bg-agilo-bg border border-agilo-border">
                      <span className="text-agilo-secondary font-semibold">Status</span>
                      <span className="font-bold text-agilo-success">● Connected & Synced</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : !isChatActive ? (
            /* MAIN DASHBOARD HERO VIEW */
            <div className="flex-1 overflow-y-auto overscroll-contain p-6 lg:p-12 flex flex-col justify-between relative">
              <div className="max-w-3xl space-y-6 pt-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="space-y-3"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-agilo-primary bg-agilo-primary/10 border border-agilo-primary/20 px-3 py-1 rounded-full inline-block">
                    Welcome to Agilo AI
                  </span>

                  <h1 className="text-5xl lg:text-7xl font-extrabold text-agilo-navy tracking-tight leading-tight">
                    Knowledge, <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-agilo-primary via-agilo-bright to-agilo-deep">
                      at your fingertips.
                    </span>
                  </h1>

                  <p className="text-agilo-secondary text-base lg:text-lg max-w-xl">
                    Ask questions, search company knowledge, and get grounded answers with verified document sources.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="glass-card rounded-3xl p-4 shadow-xl border border-agilo-border max-w-2xl"
                >
                  <textarea
                    value={heroPrompt}
                    onChange={(e) => setHeroPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(heroPrompt);
                      }
                    }}
                    placeholder="Ask anything about your company knowledge..."
                    rows={2}
                    className="w-full bg-transparent text-base text-agilo-text placeholder-slate-400 focus:outline-none resize-none px-2 font-sans"
                  />

                  <div className="flex items-center justify-between pt-3 border-t border-agilo-border/50">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleUploadClick}
                        className="p-2 rounded-xl hover:bg-agilo-bg text-agilo-secondary hover:text-agilo-primary transition-colors cursor-pointer"
                        title="Upload file"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleSendMessage(heroPrompt || "What is our company's policy on annual PTO roll-over?")}
                      className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-agilo-deep to-agilo-primary text-white text-sm font-semibold shadow-lg shadow-agilo-primary/30 hover:shadow-xl hover:shadow-agilo-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Send Query</span>
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="flex flex-wrap gap-2 pt-2"
                >
                  {[
                    { label: "Company Policies", query: "What is our annual leave policy?" },
                    { label: "HR Documents", query: "What parental leave benefits do we offer?" },
                    { label: "Project Docs", query: "How does Agilo AI process vector retrieval?" },
                    { label: "Client Info", query: "What uptime SLA do we guarantee to Enterprise customers?" }
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip.query)}
                      className="px-4 py-2 rounded-2xl bg-white/80 hover:bg-white border border-agilo-border hover:border-agilo-bright text-xs font-semibold text-agilo-navy transition-all shadow-sm hover:shadow hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-agilo-primary" />
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </motion.div>
              </div>

              <div className="absolute top-12 right-12 hidden xl:flex flex-col gap-4 z-20 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="glass-card rounded-2xl p-4 w-64 border border-agilo-border flex items-center gap-3 shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-agilo-bright/20 border border-agilo-bright/40 flex items-center justify-center text-agilo-primary shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-agilo-navy block">Online</span>
                    <span className="text-[10px] text-agilo-success flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-agilo-success" /> AI Assistant active
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="glass-card rounded-2xl p-4 w-64 border border-agilo-border flex items-center gap-3 shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-agilo-primary/20 border border-agilo-primary/40 flex items-center justify-center text-agilo-primary shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-agilo-navy block">Knowledge Base</span>
                    <span className="text-[10px] text-agilo-success flex items-center gap-1 font-medium">
                      ✓ {documents.length} docs connected
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="glass-card rounded-2xl p-4 w-64 border border-agilo-border flex items-center gap-3 shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-agilo-cyan/20 border border-agilo-cyan/40 flex items-center justify-center text-agilo-navy shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-agilo-navy block">Agent Ready</span>
                    <span className="text-[10px] text-agilo-success flex items-center gap-1 font-medium">
                      ✓ Tool calling enabled
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Quick Navigation Cards */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-8 max-w-5xl"
              >
                <div className="glass-card rounded-3xl p-6 border border-agilo-border">
                  <h3 className="text-xs font-bold text-agilo-navy uppercase tracking-wider mb-4">Quick Access</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { label: uploading ? 'Uploading…' : 'Upload Doc', icon: Upload, action: handleUploadClick },
                      { label: 'Knowledge Base', icon: BookOpen, action: () => setActivityView('documents') },
                      { label: 'Chat History', icon: History, action: () => setActivityView('history') },
                      { label: 'Analytics', icon: BarChart3, action: () => setActivityView('analytics') },
                      { label: 'Settings', icon: SettingsIcon, action: () => setActivityView('settings') }
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={item.action}
                        className="p-3 rounded-2xl bg-white border border-agilo-border hover:border-agilo-bright flex flex-col items-center justify-center gap-2 hover:-translate-y-1 transition-all group shadow-sm cursor-pointer"
                      >
                        <item.icon className="w-5 h-5 text-agilo-primary group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-semibold text-agilo-navy text-center leading-tight">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-6 border border-agilo-border flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-agilo-navy uppercase tracking-wider">Usage Overview</h3>
                    <button onClick={() => setActivityView('analytics')} className="text-[10px] text-agilo-primary font-bold hover:underline cursor-pointer">
                      View Analytics →
                    </button>
                  </div>

                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-3xl font-extrabold text-agilo-navy tracking-tight">
                        {usageStats ? `${usageStats.automation_rate}%` : '—'}
                      </div>
                      <span className="text-xs text-agilo-secondary font-medium">Tasks Automated</span>
                      <div className="text-[11px] font-semibold text-agilo-success flex items-center gap-1 mt-1">
                        Live from backend
                      </div>
                    </div>

                    <div className="w-48 h-16 rounded-2xl bg-slate-50 p-2 border border-agilo-border">
                      <svg viewBox="0 0 100 40" className="w-full h-full text-agilo-primary">
                        <path
                          d={usageStats ? usageStats.values.map((value, idx) => `${idx === 0 ? 'M' : 'L'} ${idx * 16 + 6} ${40 - value * 6}`).join(' ') : 'M 6 34 L 22 28 L 38 24 L 54 20 L 70 16 L 86 12 L 94 10'}
                          stroke="currentColor"
                          strokeWidth="2.5"
                          fill="none"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            /* ACTIVE CHAT INTERFACE VIEW */
            <ChatInterface
              messages={activeSession.messages}
              onSendMessage={handleSendMessage}
              onOpenSource={(source) => setSelectedSource(source)}
              isGenerating={isGenerating}
              currentToolStep={currentToolStep}
              onUploadClick={handleUploadClick}
              isUploading={uploading}
            />
          )}
        </main>

      </div>

      <SourceDrawer
        source={selectedSource}
        onClose={() => setSelectedSource(null)}
      />
    </div>
  );
};
