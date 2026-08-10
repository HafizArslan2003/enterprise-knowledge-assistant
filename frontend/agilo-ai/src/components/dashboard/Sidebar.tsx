import React, { useState } from 'react';
import type { ConversationSession } from '../../services/ragEngine';
import {
  Sparkles,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  conversations: ConversationSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeSessionId,
  onSelectSession,
  onNewChat,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{ backgroundColor: '#0B1F3A' }}
      className="h-screen text-white flex flex-col justify-between border-r border-[#1E293B] relative z-30 shadow-2xl shrink-0"
    >
      {/* Top Header & New Chat */}
      <div className="p-4 flex flex-col gap-4">
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#38BDF8] flex items-center justify-center shrink-0 shadow-lg shadow-[#2563EB]/40">
              <Sparkles className="w-5 h-5 text-white" />
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

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          style={{ background: 'linear-gradient(to right, #2563EB, #38BDF8)' }}
          className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-lg shadow-[#2563EB]/30 hover:shadow-xl hover:shadow-[#2563EB]/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isCollapsed ? 'px-0' : ''
          }`}
        >
          <Plus className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>New Chat</span>}
        </button>

        {/* Search input */}
        {!isCollapsed && (
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-8 py-2 bg-white/10 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#38BDF8] transition-all"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-white/15 px-1.5 py-0.5 rounded text-slate-300 font-mono">
              ⌘K
            </span>
          </div>
        )}
      </div>

      {/* Recent Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {!isCollapsed && (
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Recent Conversations
          </div>
        )}

        {filteredConversations.map((conv) => {
          const isActive = conv.id === activeSessionId;
          return (
            <button
              key={conv.id}
              onClick={() => onSelectSession(conv.id)}
              className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center gap-3 group relative cursor-pointer ${
                isActive
                  ? 'bg-[#2563EB]/30 border border-[#38BDF8]/40 text-white font-semibold'
                  : 'hover:bg-white/10 text-slate-200 hover:text-white border border-transparent'
              }`}
              title={conv.title}
            >
              <FileText className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#38BDF8]' : 'text-slate-400 group-hover:text-slate-200'}`} />
              
              {!isCollapsed && (
                <div className="flex-1 overflow-hidden min-w-0 flex items-center justify-between">
                  <span className="text-xs truncate">{conv.title}</span>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">{conv.updatedAt}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Profile Section */}
      <div className="p-3 border-t border-white/10 bg-black/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#38BDF8] to-[#2563EB] flex items-center justify-center font-extrabold text-white text-xs border border-white/30 shrink-0 shadow-md">
              HI
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">Hafiz Ibrahim</span>
                <span className="text-[10px] text-slate-300 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3 text-[#38BDF8] inline" /> Admin / CTO
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer">
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
};
