import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle2, Circle, X, Loader2, Clock, ChevronDown } from 'lucide-react';
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
    <GlassCard accent="pink" className="relative overflow-hidden">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-500/15">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Goal History</h3>
          <p className="text-[10px] text-zinc-500">Last 7 days</p>
        </div>
      </div>

      {loading && (
        <div className="py-4">
          <LoadingState variant="spinner" />
          <p className="text-xs text-zinc-500 text-center mt-2">Loading history...</p>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && Object.keys(history).length === 0 && (
        <EmptyState
          icon={<Calendar className="w-6 h-6 opacity-30" />}
          title="No goal history"
          description="Goals from the last 7 days will appear here."
        />
      )}

      {!loading && !error && Object.keys(history).length > 0 && (
        <div className="space-y-2">
          {Object.entries(history).map(([date, entry], idx) => {
            const isOpen = expanded === date;
            return (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.2 }}
              >
                <button
                  onClick={() => toggleExpand(date)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{formatDate(date)}</span>
                    <span className="text-[10px] text-zinc-600">{doneCount(entry.goals)}/{entry.goals.length}</span>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-zinc-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1 overflow-hidden"
                    >
                      <div className="space-y-1 px-1">
                        {entry.goals.map(g => {
                          const Icon = statusIcons[g.status] || Circle;
                          const colorClass = statusColors[g.status] || 'text-zinc-500';
                          return (
                            <div key={g.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-zinc-800/10">
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
                              <span className="text-xs text-zinc-300 flex-1 truncate">{g.title}</span>
                              <span className="text-[10px] uppercase tracking-wider text-zinc-600 shrink-0">{g.category}</span>
                            </div>
                          );
                        })}
                      </div>
                      {entry.reviewSummary && (
                        <div className="px-3 py-2 mx-1 rounded-lg bg-violet-500/6 border border-violet-500/15">
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
      )}
    </GlassCard>
  );
}
