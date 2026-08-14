import React, { useState } from 'react';
import type { ConversationSession } from '../../services/ragEngine';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  ShieldCheck,
  FileText,
  Loader2,
  LayoutDashboard,
  BookOpen,
  BarChart3,
  History,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';

export type ActivityView = 'home' | 'history' | 'documents' | 'analytics' | 'settings';

interface SidebarProps {
  conversations: ConversationSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewChat: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isLoadingSessions?: boolean;
  currentUsername?: string;
  activeView: ActivityView;
  onNavigate: (view: ActivityView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  isCollapsed,
  onToggleCollapse,
  isLoadingSessions,
  currentUsername,
  activeView,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const initials = currentUsername
    ? currentUsername.slice(0, 2).toUpperCase()
    : 'HI';

  const navItems = [
    { id: 'home' as ActivityView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents' as ActivityView, label: 'Knowledge Base', icon: BookOpen },
    { id: 'analytics' as ActivityView, label: 'Analytics', icon: BarChart3 },
    { id: 'history' as ActivityView, label: 'Chat History', icon: History },
    { id: 'settings' as ActivityView, label: 'Settings', icon: Settings },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{ backgroundColor: '#0B1F3A' }}
      className="h-dvh text-white flex flex-col justify-between border-r border-[#1E293B] relative z-30 shadow-2xl shrink-0"
    >
      {/* Top Header & New Chat */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md border border-white/20">
              <img src="/logo.png" alt="Agilo AI Logo" className="w-full h-full object-cover rounded-lg" />
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col whitespace-nowrap"
              >
                <span className="font-bold text-base tracking-tight leading-none text-white">
                  Agilo AI
                </span>
                <span className="text-[10px] text-[#38BDF8] uppercase font-bold tracking-wider mt-1">
                  Enterprise Assistant
                </span>
              </motion.div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={onNewChat}
          style={{ background: 'linear-gradient(to right, #2563EB, #38BDF8)' }}
          className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-sm shadow-lg shadow-[#2563EB]/30 hover:shadow-xl hover:shadow-[#2563EB]/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isCollapsed ? 'px-0' : ''
          }`}
        >
          <Plus className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>New Chat</span>}
        </button>

        {/* Navigation Menu */}
        <div className="space-y-1 pt-2 border-t border-white/10">
          {!isCollapsed && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
              Navigation
            </span>
          )}
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center gap-3 cursor-pointer ${
                  isActive
                    ? 'bg-[#2563EB] text-white font-bold shadow-md shadow-[#2563EB]/40'
                    : 'hover:bg-white/10 text-slate-300 hover:text-white'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={item.label}
              >
                <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!isCollapsed && <span className="text-xs">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Conversations List */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2 space-y-1 border-t border-white/10">
        {!isCollapsed && (
          <div className="px-2 py-1 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Recent Chats
            </span>
            {isLoadingSessions && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
          </div>
        )}

        {!isCollapsed && (
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              name="chat-search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-3 py-1.5 bg-white/10 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#38BDF8] transition-all"
            />
          </div>
        )}

        {filteredConversations.length === 0 && !isLoadingSessions && !isCollapsed && (
          <div className="px-3 py-4 text-center">
            <span className="text-[11px] text-slate-500">No conversations yet</span>
          </div>
        )}

        {filteredConversations.map((conv) => {
          const isActive = conv.id === activeSessionId && activeView === 'home';
          return (
            <div
              key={conv.id}
              className="relative group"
            >
              <button
                onClick={() => onSelectSession(conv.id)}
              className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center gap-3 group relative cursor-pointer ${
                isActive
                  ? 'bg-[#2563EB]/30 border border-[#38BDF8]/40 text-white font-semibold'
                  : 'hover:bg-white/10 text-slate-200 hover:text-white border border-transparent'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={conv.title}
                >
                  <FileText className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#38BDF8]' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  {!isCollapsed && (
                    <div className="flex-1 overflow-hidden min-w-0 flex items-center justify-between pr-5">
                      <span className="text-xs truncate">{conv.title}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">{conv.updatedAt}</span>
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteSession(conv.id);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-300 transition-opacity ${
                    isCollapsed ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                  }`}
                  title="Delete chat permanently"
                  aria-label={`Delete ${conv.title} permanently`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
          );
        })}
      </div>

      {/* Footer Profile Section */}
      <div className="p-3 border-t border-white/10 bg-black/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#38BDF8] to-[#2563EB] flex items-center justify-center font-extrabold text-white text-xs border border-white/30 shrink-0 shadow-md">
              {initials}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">
                  {currentUsername || 'User'}
                </span>
                <span className="text-[10px] text-slate-300 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3 text-[#38BDF8] inline" /> Member
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={() => onNavigate('settings')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                activeView === 'settings' ? 'bg-[#2563EB] text-white' : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};
