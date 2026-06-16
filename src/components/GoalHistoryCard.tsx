import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle2, Circle, X, Loader2, Clock, ChevronDown, History, Brain, TrendingUp } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';
import type { Goal } from '../services/GoalStore';

const statusIcons: Record<string, any> = {
  completed: CheckCircle2,
  dismissed: X,
  pending: Circle,
  'in-progress': Clock,
};

const statusColors: Record<string, string> = {
  completed: 'text-emerald-400',
  dismissed: 'text-zinc-600',
  pending: 'text-zinc-500',
  'in-progress': 'text-amber-400',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === today.toISOString().slice(0, 10)) return 'Today';
  if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function GoalHistoryCard() {
  const [history, setHistory] = useState<Record<string, { goals: Goal[]; reviewSummary?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const days: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }
      const results: Record<string, { goals: Goal[]; reviewSummary?: string }> = {};
      for (const date of days) {
        const day = await window.deskflowAPI!.getGoals(date);
        if (day.goals?.length > 0) results[date] = { goals: day.goals, reviewSummary: day.reviewSummary };
      }
      setHistory(results);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    }
    setLoading(false);
  }

  function toggleExpand(date: string) {
    setExpanded(expanded === date ? null : date);
  }

  const doneCount = (goals: Goal[]) => goals.filter(g => g.status === 'completed').length;

  return (
    <GlassCard variant="interactive" accent="amber" className="relative overflow-hidden">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-500/5">
          <History className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Goal History</h3>
          <p className="text-[10px] text-zinc-500">Last 7 days</p>
        </div>
      </div>

      {loading && (
        <div className="py-4">
          <LoadingState variant="skeleton" rows={4} />
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/8 border border-red-500/15 mb-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && Object.keys(history).length === 0 && (
        <EmptyState
          icon={<Calendar className="w-8 h-8 text-zinc-600" />}
          title="No goal history"
          description="Goals from the last 7 days will appear here."
        />
      )}

      {!loading && !error && Object.keys(history).length > 0 && (
        <div className="relative">
          <div className="absolute left-[17px] top-3 bottom-3 w-px bg-gradient-to-b from-indigo-500/30 via-indigo-500/10 to-transparent" />
          <div className="space-y-2">
            {Object.entries(history).map(([date, entry], idx) => {
              const isOpen = expanded === date;
              const dc = doneCount(entry.goals);
              const total = entry.goals.length;
              return (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative"
                >
                  <button
                    onClick={() => toggleExpand(date)}
                    className="relative z-10 w-full flex items-center justify-between pl-8 pr-3 py-2 rounded-lg hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`absolute left-0 w-[18px] h-[18px] rounded-full flex items-center justify-center border ${
                        dc === total ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-zinc-800/80 border-zinc-700/50'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${dc === total ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-zinc-300">{formatDate(date)}</span>
                        <span className="text-[10px] text-zinc-600 ml-2">{dc}/{total}</span>
                      </div>
                    </div>
                    <ChevronDown className={`w-3 h-3 text-zinc-600 transition-all duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden pl-8"
                      >
                        <div className="space-y-1 pb-2">
                          {entry.goals.map(g => {
                            const Icon = statusIcons[g.status] || Circle;
                            const colorClass = statusColors[g.status] || 'text-zinc-500';
                            return (
                              <div key={g.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-800/10 border border-zinc-700/30">
                                <Icon className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
                                <span className="text-xs text-zinc-300 flex-1 truncate">{g.title}</span>
                                <span className="text-[10px] uppercase tracking-wider text-zinc-600 shrink-0">{g.category}</span>
                              </div>
                            );
                          })}
                        </div>
                        {entry.reviewSummary && (
                          <div className="px-3 py-2 mb-2 rounded-lg bg-gradient-to-r from-violet-500/[0.04] to-fuchsia-500/[0.04] border border-violet-500/15">
                            <div className="flex items-center gap-1 mb-1">
                              <Brain className="w-2.5 h-2.5 text-violet-400" />
                              <span className="text-[9px] uppercase tracking-wider text-violet-400 font-medium">Review</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed">{entry.reviewSummary}</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
