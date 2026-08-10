import React, { useEffect, useState } from 'react';
import { getAnalyticsSummary, getUsageStats, type AnalyticsSummary, type UsageSummary } from '../../services/api';
import { FileText, MessagesSquare, LayoutGrid, TrendingUp, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AnalyticsPageProps {
  onClose: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onClose }) => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('agilo-access-token') || undefined;
      setIsLoading(true);
      setError(null);
      try {
        const [summaryData, usageData] = await Promise.all([
          getAnalyticsSummary(token),
          getUsageStats(token)
        ]);
        setSummary(summaryData);
        setUsage(usageData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load analytics');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const maxValue = usage ? Math.max(...usage.values, 1) : 1;

  return (
    <div className="m-6 rounded-3xl border border-agilo-border bg-white/80 p-6 shadow-xl backdrop-blur overflow-y-auto max-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-agilo-navy">Analytics Overview</h3>
          <p className="text-xs text-agilo-secondary mt-0.5">Live usage and knowledge-base statistics for your account</p>
        </div>
        <button onClick={onClose} className="text-sm text-agilo-primary font-semibold hover:underline cursor-pointer">
          Close
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-2 text-agilo-secondary text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics...
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600 mb-4">
          {error}
        </div>
      )}

      {!isLoading && !error && summary && usage && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Documents', value: summary.total_documents, icon: FileText, color: 'agilo-primary' },
              { label: 'Chat Sessions', value: summary.total_sessions, icon: MessagesSquare, color: 'agilo-bright' },
              { label: 'Questions Asked', value: summary.total_questions_asked, icon: LayoutGrid, color: 'agilo-cyan' },
              { label: 'Automation Rate', value: `${usage.automation_rate}%`, icon: TrendingUp, color: 'agilo-success' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-agilo-border bg-white p-4 shadow-sm"
              >
                <div className={`w-9 h-9 rounded-xl bg-${stat.color}/10 flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-4.5 h-4.5 text-${stat.color}`} />
                </div>
                <div className="text-2xl font-extrabold text-agilo-navy">{stat.value}</div>
                <div className="text-[11px] text-agilo-secondary font-semibold mt-0.5">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Weekly Usage Chart */}
          <div className="rounded-2xl border border-agilo-border bg-white p-5">
            <h4 className="text-xs font-bold text-agilo-navy uppercase tracking-wider mb-4">Questions Asked — Last 7 Days</h4>
            <div className="flex items-end justify-between gap-3 h-40">
              {usage.labels.map((label, idx) => {
                const value = usage.values[idx] ?? 0;
                const heightPct = maxValue > 0 ? (value / maxValue) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] font-bold text-agilo-navy">{value}</span>
                    <div className="w-full bg-slate-100 rounded-lg flex items-end h-28 overflow-hidden">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                        className="w-full bg-gradient-to-t from-agilo-primary to-agilo-bright rounded-t-lg"
                      />
                    </div>
                    <span className="text-[10px] text-agilo-secondary font-medium">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Documents */}
          <div className="rounded-2xl border border-agilo-border bg-white p-5">
            <h4 className="text-xs font-bold text-agilo-navy uppercase tracking-wider mb-4">Most Referenced Documents</h4>
            {summary.top_documents.length === 0 ? (
              <p className="text-xs text-agilo-secondary">No document activity yet.</p>
            ) : (
              <div className="space-y-2">
                {summary.top_documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-agilo-bg border border-agilo-border">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-agilo-primary shrink-0" />
                      <span className="text-xs font-semibold text-agilo-navy truncate">{doc.filename}</span>
                    </div>
                    <span className="text-[10px] font-bold text-agilo-primary bg-agilo-primary/10 px-2 py-1 rounded-lg shrink-0 ml-3">
                      {doc.access_count} {doc.access_count === 1 ? 'reference' : 'references'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Questions */}
          <div className="rounded-2xl border border-agilo-border bg-white p-5">
            <h4 className="text-xs font-bold text-agilo-navy uppercase tracking-wider mb-4">Recent Questions</h4>
            {summary.recent_questions.length === 0 ? (
              <p className="text-xs text-agilo-secondary">No questions asked yet.</p>
            ) : (
              <div className="space-y-2">
                {summary.recent_questions.map((q, idx) => (
                  <div key={idx} className="text-xs text-agilo-navy p-3 rounded-xl bg-agilo-bg border border-agilo-border">
                    {q}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};