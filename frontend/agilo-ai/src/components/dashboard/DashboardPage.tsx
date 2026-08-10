import React, { useEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatInterface } from './ChatInterface';
import { SourceDrawer } from './SourceDrawer';
import { AnalyticsPage } from './AnalyticsPage';
import {
  INITIAL_CONVERSATIONS,
  processUserQuery
} from '../../services/ragEngine';
import {
  createChatSession,
  getUsageStats,
  listDocuments,
  uploadDocument,
  listSessions,
  getSessionDetail,
  getCurrentUser,
  type ChatHistorySession,
  type DocumentUploadResponse,
  type UsageSummary,
  type UserResponse
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
  Star,
  Upload,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';

const STORAGE_KEY = 'agilo-dashboard-conversations';

const createConversationTitle = (query: string) => {
  const cleaned = query.trim().replace(/\s+/g, ' ');
  const preview = cleaned.length > 38 ? `${cleaned.slice(0, 35)}...` : cleaned;
  return preview || 'New Enterprise Conversation';
};

const loadStoredConversations = (): ConversationSession[] => {
  if (typeof window === 'undefined') return INITIAL_CONVERSATIONS;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return INITIAL_CONVERSATIONS;

    const parsed = JSON.parse(stored) as ConversationSession[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CONVERSATIONS;
  } catch {
    return INITIAL_CONVERSATIONS;
  }
};

export const DashboardPage: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [conversations, setConversations] = useState<ConversationSession[]>(loadStoredConversations);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => loadStoredConversations()[0]?.id ?? 'session-1');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isChatActive, setIsChatActive] = useState<boolean>(false);

  const [selectedSource, setSelectedSource] = useState<SourceCitation | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentToolStep, setCurrentToolStep] = useState<string>('');

  const [heroPrompt, setHeroPrompt] = useState<string>('');
  const [activeSessionIdNumber, setActiveSessionIdNumber] = useState<number | null>(null);
  const [historySessions, setHistorySessions] = useState<ChatHistorySession[]>([]);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<DocumentUploadResponse[]>([]);
  const [usageStats, setUsageStats] = useState<UsageSummary | null>(null);
  const [activityView, setActivityView] = useState<'home' | 'history' | 'documents' | 'analytics'>('home');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const activeSession = conversations.find(c => c.id === activeSessionId) || conversations[0];

  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || isGenerating) return;

    if (!isChatActive) {
      setIsChatActive(true);
    }

    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeSessionId) {
        const shouldRename = conv.messages.length === 0 && (conv.title === 'New Enterprise Conversation' || conv.title.startsWith('New Chat'));
        return {
          ...conv,
          title: shouldRename ? createConversationTitle(queryText) : conv.title,
          messages: [...conv.messages, userMsg],
          updatedAt: 'Just now'
        };
      }
      return conv;
    }));

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
        activeSessionIdNumber
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

      setConversations(prev => prev.map(conv => {
        if (conv.id === activeSessionId) {
          return {
            ...conv,
            messages: [...conv.messages, assistantMsg],
            updatedAt: 'Just now'
          };
        }
        return conv;
      }));
    } finally {
      setIsGenerating(false);
      setCurrentToolStep('');
    }
  };

  const handleNewChat = async () => {
    const token = localStorage.getItem('agilo-access-token') || undefined;
    const newId = `session-${Date.now()}`;
    const newSession: ConversationSession = {
      id: newId,
      title: 'New Enterprise Conversation',
      updatedAt: 'Just now',
      messages: []
    };

    try {
      const session = await createChatSession(token);
      setActiveSessionIdNumber(session.id);
    } catch (error) {
      console.error('Unable to create server session', error);
    }

    setConversations(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setIsChatActive(false);
  };

  // Fetches the lightweight session list for the sidebar
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

      const mapped: ConversationSession[] = sessions.map((session) => ({
        id: `server-session-${session.id}`,
        title: session.title || 'Untitled conversation',
        updatedAt: new Date(session.created_at).toLocaleDateString(),
        messages: []
      }));

      setConversations((prev) => {
        // Keep any purely-local conversations that haven't been synced to the server yet
        const localOnly = prev.filter(
          (item) => !item.id.startsWith('server-session-') && item.messages.length === 0
        );
        return [...mapped, ...localOnly];
      });
    } catch (error) {
      console.error('Unable to load sessions', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Lazy-loads full message history for one session, only when the user clicks into it
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  useEffect(() => {
    refreshHistory();
    refreshDocuments();
    refreshUsage();
    refreshCurrentUser();
  }, []);

  return (
    <div className="h-screen w-full bg-agilo-bg flex overflow-hidden relative font-sans selection:bg-agilo-bright/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(37,99,235,0.12),_transparent_38%)]" />
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:30px_30px]" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="absolute right-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-white/70 blur-3xl" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.1 }} className="absolute bottom-[-6rem] left-[-4rem] h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          setIsChatActive(true);

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
        onNewChat={handleNewChat}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isLoadingSessions={isLoadingSessions}
        currentUsername={currentUser?.username}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={handleUpload}
        />
        {/* Top Header Navbar */}
        <header className="h-16 px-6 border-b border-agilo-border/60 bg-white/60 backdrop-blur-md flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-agilo-navy tracking-tight">Agilo AI</span>
            <span className="w-2 h-2 rounded-full bg-agilo-success animate-pulse" />
            <span className="text-xs text-agilo-secondary font-medium">AI Assistant</span>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 rounded-xl border border-agilo-border hover:bg-agilo-bg text-xs font-semibold text-agilo-navy flex items-center gap-2 transition-colors">
              <HelpCircle className="w-3.5 h-3.5 text-agilo-secondary" /> Help
            </button>
            <button className="w-8 h-8 rounded-xl border border-agilo-border hover:bg-agilo-bg flex items-center justify-center text-agilo-secondary hover:text-agilo-navy transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-agilo-primary rounded-full" />
            </button>

            <button
              onClick={onLogout}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white font-bold text-xs flex items-center justify-center border border-white/40 shadow-sm"
              title="Sign Out"
            >
              {currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : 'HI'}
            </button>
          </div>
        </header>

        {/* Dynamic Hero vs Chat View */}
        {!isChatActive ? (
          /* HERO VIEW */
          <div className="flex-1 overflow-y-auto p-6 lg:p-12 flex flex-col justify-between relative">
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

              {/* Central Search / Prompt Box */}
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
                    <button className="p-2 rounded-xl hover:bg-agilo-bg text-agilo-secondary hover:text-agilo-primary transition-colors">
                      <Paperclip className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleSendMessage(heroPrompt || "What is our company's policy on annual PTO roll-over?")}
                    className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-agilo-deep to-agilo-primary text-white text-sm font-semibold shadow-lg shadow-agilo-primary/30 hover:shadow-xl hover:shadow-agilo-primary/40 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                  >
                    <span>Send Query</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>

              {/* Category preset chips */}
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
                    className="px-4 py-2 rounded-2xl bg-white/80 hover:bg-white border border-agilo-border hover:border-agilo-bright text-xs font-semibold text-agilo-navy transition-all shadow-sm hover:shadow hover:-translate-y-0.5 flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-agilo-primary" />
                    <span>{chip.label}</span>
                  </button>
                ))}
              </motion.div>
            </div>

            {/* FLOATING STATUS CARDS */}
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
                  <span className="text-[10px] text-agilo-success flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-agilo-success" /> AI Assistant is online
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
                  <span className="text-xs font-bold text-agilo-navy block">Knowledge Connected</span>
                  <span className="text-[10px] text-agilo-success flex items-center gap-1">
                    ✓ Documents indexed
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
                  <span className="text-[10px] text-agilo-success flex items-center gap-1">
                    ✓ Tool calling enabled
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Quick Access & Usage Overview Cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-8 max-w-5xl"
            >
              {/* Quick Access Grid */}
              <div className="glass-card rounded-3xl p-6 border border-agilo-border">
                <h3 className="text-xs font-bold text-agilo-navy uppercase tracking-wider mb-4">Quick Access</h3>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { label: uploading ? 'Uploading…' : 'Upload Document', icon: Upload, action: handleUploadClick },
                    { label: 'Knowledge Base', icon: BookOpen, action: () => setActivityView('documents') },
                    { label: 'Chat History', icon: History, action: () => { setActivityView('history'); setIsChatActive(true); } },
                    { label: 'Analytics', icon: BarChart3, action: () => { setActivityView('analytics'); setIsChatActive(true); } },
                    { label: 'Favorites', icon: Star, action: () => setActivityView('documents') }
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      className="p-3 rounded-2xl bg-white border border-agilo-border hover:border-agilo-bright flex flex-col items-center justify-center gap-2 hover:-translate-y-1 transition-all group shadow-sm"
                    >
                      <item.icon className="w-5 h-5 text-agilo-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-semibold text-agilo-navy text-center leading-tight">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Usage Overview Widget */}
              <div className="glass-card rounded-3xl p-6 border border-agilo-border flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-agilo-navy uppercase tracking-wider">Usage Overview</h3>
                  <span className="text-[10px] text-agilo-secondary border border-agilo-border px-2 py-0.5 rounded-lg bg-white">
                    This Week ▾
                  </span>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-3xl font-extrabold text-agilo-navy tracking-tight">
                      {usageStats?.automation_rate ?? 0}%
                    </div>
                    <span className="text-xs text-agilo-secondary font-medium">Tasks Automated</span>
                    <div className="text-[11px] font-semibold text-agilo-success flex items-center gap-1 mt-1">
                      Live from analytics
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
          /* ACTIVE CHAT VIEW */
          <div className="flex-1 flex flex-col overflow-hidden bg-agilo-bg">
            {activityView === 'history' && (
              <div className="m-6 rounded-3xl border border-agilo-border bg-white/80 p-6 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-agilo-navy">Conversation History</h3>
                  <button onClick={() => setActivityView('home')} className="text-sm text-agilo-primary">Close</button>
                </div>
                <div className="space-y-3 overflow-y-auto max-h-[70vh]">
                  {historySessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        const localId = `server-session-${session.id}`;
                        setActiveSessionId(localId);
                        setIsChatActive(true);
                        setActivityView('home');
                        loadSessionMessages(session.id, localId);
                      }}
                      className="w-full rounded-2xl border border-agilo-border bg-agilo-bg p-4 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-agilo-navy">{session.title}</span>
                        <span className="text-xs text-agilo-secondary">{new Date(session.created_at).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
                
              </div>
              
            )}

            {activityView === 'documents' && (
              <div className="m-6 rounded-3xl border border-agilo-border bg-white/80 p-6 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-agilo-navy">Knowledge Base</h3>
                  <button onClick={() => setActivityView('home')} className="text-sm text-agilo-primary">Close</button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {documents.map((document) => (
                    <div key={document.id} className="rounded-2xl border border-agilo-border bg-agilo-bg p-4">
                      <div className="font-semibold text-agilo-navy">{document.filename}</div>
                      <div className="mt-2 text-sm text-agilo-secondary">Uploaded {new Date(document.uploaded_at).toLocaleDateString()} • {document.chunk_count} chunks</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activityView === 'analytics' && (
  <AnalyticsPage onClose={() => setActivityView('home')} />
)}

            <ChatInterface
              messages={activeSession.messages}
              onSendMessage={handleSendMessage}
              onOpenSource={(source) => setSelectedSource(source)}
              isGenerating={isGenerating}
              currentToolStep={currentToolStep}
            />
          </div>
        )}

        <footer className="border-t border-agilo-border/60 bg-white/70 backdrop-blur-sm px-6 py-3 flex items-center justify-between text-[11px] font-semibold text-agilo-secondary shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-agilo-success" /> Live connection active</span>
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-agilo-primary" /> Documents synced</span>
          </div>
          <span className="text-agilo-navy">Secure enterprise workspace</span>
        </footer>
      </div>

      {/* Source Citation Modal Drawer */}
      <SourceDrawer
        source={selectedSource}
        onClose={() => setSelectedSource(null)}
      />
    </div>
  );
};