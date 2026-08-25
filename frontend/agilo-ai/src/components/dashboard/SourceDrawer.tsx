import React from 'react';
import type { SourceCitation } from '../../services/ragEngine';
import { X, FileText, ExternalLink, CheckCircle2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SourceDrawerProps {
  source: SourceCitation | null;
  onClose: () => void;
}

export const SourceDrawer: React.FC<SourceDrawerProps> = ({ source, onClose }) => {
  if (!source) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-agilo-navy/30 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-agilo-border"
        >
          {/* Drawer Header */}
          <div className="p-6 border-b border-agilo-border flex items-center justify-between bg-agilo-bg/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-agilo-primary/10 border border-agilo-primary/20 flex items-center justify-center text-agilo-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-agilo-primary tracking-wider">
                  Document Source
                </span>
                <h3 className="text-base font-bold text-agilo-navy truncate max-w-[220px]">
                  {source.docTitle}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-agilo-border/60 flex items-center justify-center text-agilo-secondary hover:text-agilo-navy transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-6">
            {/* Metadata badges */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-agilo-bg border border-agilo-border">
                <span className="text-[10px] text-agilo-secondary uppercase font-semibold">Page Number</span>
                <div className="text-base font-bold text-agilo-navy mt-0.5">Page {source.pageNumber}</div>
              </div>
              <div className="p-3 rounded-xl bg-agilo-bg border border-agilo-border">
                <span className="text-[10px] text-agilo-secondary uppercase font-semibold">Match Score</span>
                <div className="text-base font-bold text-agilo-success flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" /> {(source.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Document Passage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-agilo-navy uppercase tracking-wider">
                <span>Passage Excerpt</span>
                <span className="text-agilo-primary flex items-center gap-1 font-normal cursor-pointer hover:underline">
                  Open full document <ExternalLink className="w-3 h-3" />
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-agilo-border text-sm text-agilo-text leading-relaxed font-sans">
                "{source.snippet}"
              </div>
            </div>

            {/* Highlighted Match */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-agilo-navy uppercase tracking-wider">
                Grounding Vector Highlight
              </div>
              <div className="p-4 rounded-2xl bg-sky-50 border border-agilo-bright/40 text-sm text-agilo-navy font-medium leading-relaxed">
                <span className="bg-agilo-bright/30 px-1 py-0.5 rounded font-semibold text-agilo-deep">
                  {source.matchText}
                </span>
              </div>
            </div>

            {/* Verification Notice */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Verified Enterprise Knowledge</span>
                <p className="mt-0.5 text-emerald-700">
                  This document snippet has been validated against the internal knowledge graph for accuracy.
                </p>
              </div>
            </div>
          </div>

          {/* Footer action */}
          <div className="p-4 border-t border-agilo-border bg-agilo-bg/40">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-agilo-navy text-white text-xs font-semibold hover:bg-agilo-deep transition-colors"
            >
              Close Source View
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
