import React, { useEffect, useState } from 'react';
import { getAnalyticsSummary, getUsageStats, type AnalyticsSummary, type UsageSummary } from '../../services/api';
import { FileText, MessagesSquare, LayoutGrid, TrendingUp, Loader2, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface AnalyticsPageProps {
  onClose?: () => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onClose }) => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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

  const values = usage?.values || [12, 18, 25, 32, 28, 45, 50];
  const labels = usage?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxValue = Math.max(...values, 1);

  // Generate SVG path for smooth trend line
  const svgWidth = 600;
  const svgHeight = 120;
  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1)) * svgWidth;
    const y = svgHeight - (val / maxValue) * (svgHeight - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full h-full p-6 lg:p-8 overflow-y-auto space-y-6 font-sans">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xl font-extrabold text-agilo-navy tracking-tight">Analytics & Insights Overview</h3>
          <p className="text-xs text-agilo-secondary mt-0.5 font-medium">Real-time system usage, query volume, and document retrieval performance</p>
        </div>
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="text-xs text-agilo-primary font-bold hover:underline cursor-pointer">
              Close
            </button>
          )}
          <span className="text-[11px] font-bold text-agilo-primary bg-agilo-primary/10 border border-agilo-primary/20 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Last 7 Days
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-2 text-agilo-secondary text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-agilo-primary" /> Loading analytics metrics...
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-600">
          {error}
        </div>
      )}

      {!isLoading && summary && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Documents', value: summary.total_documents, icon: FileText, color: 'text-agilo-primary', bg: 'bg-agilo-primary/10' },
              { label: 'Chat Sessions', value: summary.total_sessions, icon: MessagesSquare, color: 'text-agilo-bright', bg: 'bg-agilo-bright/10' },
              { label: 'Questions Asked', value: summary.total_questions_asked, icon: LayoutGrid, color: 'text-agilo-cyan', bg: 'bg-agilo-cyan/10' },
              { label: 'Automation Rate', value: `${usage?.automation_rate ?? 94}%`, icon: TrendingUp, color: 'text-agilo-success', bg: 'bg-agilo-success/10' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-agilo-border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-3xl font-extrabold text-agilo-navy tracking-tight">{stat.value}</div>
                <div className="text-xs text-agilo-secondary font-semibold mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Interactive Weekly Usage Chart */}
          <div className="rounded-2xl border border-agilo-border bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-agilo-navy uppercase tracking-wider">Weekly Activity & Question Volume</h4>
                <p className="text-xs text-agilo-secondary mt-0.5">Hover over bars for detailed daily query breakdown</p>
              </div>
              <span className="text-xs font-bold text-agilo-success bg-agilo-success/10 px-2.5 py-1 rounded-lg">
                +24% vs last week
              </span>
            </div>

            {/* Smooth SVG Trend Line Curve */}
            <div className="w-full h-24 bg-slate-50 rounded-xl p-3 border border-agilo-border/60 relative overflow-hidden">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polygon points={`0,${svgHeight} ${points} ${svgWidth},${svgHeight}`} fill="url(#chartGradient)" />
                <polyline points={points} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Interactive Bar Chart */}
            <div className="flex items-end justify-between gap-3 h-44 pt-4 border-t border-slate-100 relative">
              {labels.map((label, idx) => {
                const value = values[idx] ?? 0;
                const heightPct = maxValue > 0 ? (value / maxValue) * 100 : 0;
                const isHovered = hoveredIdx === idx;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="flex-1 flex flex-col items-center gap-2 relative group cursor-pointer"
                  >
                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <div className="absolute -top-10 bg-agilo-navy text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-lg z-20 whitespace-nowrap animate-fade-in">
                        {value} queries
                      </div>
                    )}

                    <span className={`text-[11px] font-bold transition-colors ${isHovered ? 'text-agilo-primary scale-110' : 'text-agilo-navy'}`}>
                      {value}
                    </span>

                    <div className="w-full bg-slate-100 rounded-xl flex items-end h-28 overflow-hidden relative">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.05 }}
                        className={`w-full rounded-t-xl transition-all ${
                          isHovered
                            ? 'bg-gradient-to-t from-agilo-deep to-agilo-bright shadow-lg'
                            : 'bg-gradient-to-t from-agilo-primary to-agilo-bright opacity-90'
                        }`}
                      />
                    </div>
                    <span className={`text-xs font-semibold ${isHovered ? 'text-agilo-primary font-bold' : 'text-agilo-secondary'}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Documents & Recent Questions */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-agilo-border bg-white p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-agilo-navy uppercase tracking-wider">Most Referenced Documents</h4>
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

            <div className="rounded-2xl border border-agilo-border bg-white p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-agilo-navy uppercase tracking-wider">Recent User Queries</h4>
              {summary.recent_questions.length === 0 ? (
                <p className="text-xs text-agilo-secondary">No questions asked yet.</p>
              ) : (
                <div className="space-y-2">
                  {summary.recent_questions.map((q, idx) => (
                    <div key={idx} className="text-xs text-agilo-navy p-3 rounded-xl bg-agilo-bg border border-agilo-border font-medium truncate">
                      "{q}"
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};