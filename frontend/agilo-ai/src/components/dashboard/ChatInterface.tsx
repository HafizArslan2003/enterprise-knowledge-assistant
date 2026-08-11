import React, { useState, useRef, useEffect } from 'react';
import type { Message, SourceCitation } from '../../services/ragEngine';
import { submitMessageFeedback } from '../../services/api';
import { FormattedMarkdown } from './FormattedMarkdown';
import {
  Send,
  Paperclip,
  Sparkles,
  FileText,
  Brain,
  Search,
  ArrowUpRight,
  ThumbsUp,
  ThumbsDown,
  Check
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (query: string) => void;
  onOpenSource: (source: SourceCitation) => void;
  onUploadClick: () => void;
  isGenerating: boolean;
  currentToolStep?: string;
  isUploading?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onOpenSource,
  onUploadClick,
  isGenerating,
  currentToolStep,
  isUploading,
}) => {
  const [inputText, setInputText] = useState('');
  const [feedbackMap, setFeedbackMap] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth',block:'nearest' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating, currentToolStep]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleFeedback = async (msgId: string, feedback: 1 | -1) => {
    setFeedbackMap(prev => ({ ...prev, [msgId]: feedback }));
    const match = msgId.match(/\d+/);
    if (match) {
      const numericId = parseInt(match[0], 10);
      const token = localStorage.getItem('agilo-access-token') || undefined;
      try {
        await submitMessageFeedback(numericId, feedback, token);
      } catch (err) {
        console.error('Feedback submission failed:', err);
      }
    }
  };

  return (
    <div className="absolute inset-0 min-h-0 flex flex-col z-20 overflow-hidden">
      {/* Messages Scroll Area — min-h-0 is essential so it scrolls inside bounds */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 lg:p-8 space-y-6">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex gap-3 max-w-4xl mx-auto ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <img src="/logo.png" alt="Agilo AI Avatar" className="w-9 h-9 rounded-2xl object-cover shrink-0 shadow-md border border-slate-200" />
            )}

            <div className={`space-y-2 max-w-2xl ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              {/* Tool Calling Status Tag Badge */}
              {msg.sender === 'assistant' && msg.usedDocumentSearch !== undefined && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agilo-bg border border-agilo-border text-xs font-semibold text-agilo-navy shadow-sm">
                  {msg.usedDocumentSearch ? (
                    <>
                      <Search className="w-3.5 h-3.5 text-agilo-primary" />
                      <span>🔎 Document Knowledge Search Used</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-3.5 h-3.5 text-agilo-deep" />
                      <span>🧠 Direct AI Knowledge Response</span>
                    </>
                  )}
                </div>
              )}

              {/* Message Content Card */}
              <div
                className={`p-5 rounded-3xl text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-agilo-primary text-white shadow-md rounded-tr-sm font-sans'
                    : 'glass-card text-agilo-navy rounded-tl-sm border border-agilo-border shadow-sm'
                }`}
              >
                {msg.sender === 'assistant' ? (
                  <FormattedMarkdown content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                )}

                {/* Sources List — Clickable Cited Document References */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-agilo-border/60">
                    <span className="text-[11px] font-bold text-agilo-navy uppercase tracking-wider block mb-2">
                      Cited Enterprise Documents ({msg.sources.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src) => (
                        <button
                          key={src.id}
                          onClick={() => onOpenSource(src)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-agilo-border hover:border-agilo-bright text-xs font-semibold text-agilo-navy hover:text-agilo-primary transition-all flex items-center gap-2 shadow-sm hover:shadow cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-agilo-primary" />
                          <span>{src.docTitle}</span>
                          <span className="text-[10px] text-agilo-secondary font-mono bg-agilo-bg px-1.5 py-0.5 rounded">
                            P. {src.pageNumber}
                          </span>
                          {src.confidence !== undefined && (
                            <span className="text-[9px] font-bold text-agilo-success bg-agilo-success/10 px-1.5 py-0.5 rounded">
                              {Math.round(src.confidence * 100)}% match
                            </span>
                          )}
                          <ArrowUpRight className="w-3 h-3 text-agilo-secondary" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp & Feedback Buttons */}
              <div className="flex items-center justify-between px-1 text-[10px] text-agilo-secondary w-full">
                <span>{msg.timestamp}</span>

                {msg.sender === 'assistant' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-400">Was this helpful?</span>
                    <button
                      onClick={() => handleFeedback(msg.id, 1)}
                      className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                        feedbackMap[msg.id] === 1
                          ? 'bg-agilo-primary text-white border-agilo-primary'
                          : 'border-agilo-border hover:bg-slate-100 text-agilo-secondary'
                      }`}
                      title="Helpful response"
                    >
                      {feedbackMap[msg.id] === 1 ? <Check className="w-3 h-3" /> : <ThumbsUp className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => handleFeedback(msg.id, -1)}
                      className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                        feedbackMap[msg.id] === -1
                          ? 'bg-red-500 text-white border-red-500'
                          : 'border-agilo-border hover:bg-slate-100 text-agilo-secondary'
                      }`}
                      title="Needs improvement"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-9 h-9 rounded-2xl bg-agilo-navy flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
                HI
              </div>
            )}
          </motion.div>
        ))}

        {/* AI Generating / Thinking Indicator */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 max-w-4xl mx-auto justify-start"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-agilo-primary to-agilo-bright flex items-center justify-center text-white shrink-0 shadow-md animate-pulse">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div className="p-4 rounded-2xl glass-card border border-agilo-bright/40 flex items-center gap-3 text-xs font-semibold text-agilo-navy">
              <div className="w-4 h-4 border-2 border-agilo-primary border-t-transparent rounded-full animate-spin" />
              <span>{currentToolStep || 'Agilo AI is processing request...'}</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Prompt Input Panel */}
      <div className="p-4 lg:p-5 max-w-4xl mx-auto w-full shrink-0">
        <form onSubmit={handleSend} className="relative">
          <div className="glass-panel rounded-3xl p-3 shadow-xl border border-agilo-border/80 focus-within:border-agilo-bright focus-within:ring-2 focus-within:ring-agilo-bright/20 transition-all">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Ask anything about your company knowledge..."
              rows={2}
              className="w-full bg-transparent text-sm text-agilo-text placeholder-slate-400 focus:outline-none resize-none px-3 pt-2 font-sans"
            />

            <div className="flex items-center justify-between pt-2 border-t border-agilo-border/40">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onUploadClick}
                  disabled={isUploading}
                  className="p-2 rounded-xl hover:bg-agilo-bg text-agilo-secondary hover:text-agilo-primary transition-colors cursor-pointer disabled:opacity-40"
                  title={isUploading ? 'Uploading...' : 'Attach File'}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || isGenerating}
                className="py-2 px-5 rounded-xl bg-gradient-to-r from-agilo-deep to-agilo-primary text-white text-xs font-semibold shadow-md hover:shadow-lg hover:shadow-agilo-primary/30 transition-all disabled:opacity-40 flex items-center gap-2 cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};