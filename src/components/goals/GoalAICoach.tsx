import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, X, LoaderCircle, ArrowRight, Zap } from 'lucide-react';

interface Proposal {
  goalId: string;
  action: 'reschedule' | 'adjust_target' | 'split' | 'retire' | 'celebrate';
  reason: string;
  newConfig?: any;
}

interface GoalAICoachProps {
  onApply: (proposal: Proposal) => void;
  onDismiss: (proposal: Proposal) => void;
}

const ACTION_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  reschedule: { label: '📅 Reschedule', color: 'text-cyan-300', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  adjust_target: { label: '🎯 Adjust Target', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/20' },
  split: { label: '✂️ Split Goal', color: 'text-violet-300', bg: 'bg-violet-500/10 border-violet-500/20' },
  retire: { label: '🗑️ Retire', color: 'text-rose-300', bg: 'bg-rose-500/10 border-rose-500/20' },
  celebrate: { label: '🎉 Celebrate', color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/20' },
};

export function GoalAICoach({ onApply, onDismiss }: GoalAICoachProps) {
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<number>>(new Set());

  const runMonitor = async () => {
    setLoading(true);
    setError(null);
    setProposals(null);
    try {
      const api = (window as any).deskflowAPI;
      const result = await api?.goalAiMonitor?.();
      if (result?.success) {
        setProposals(result.proposals || []);
      } else {
        setError(result?.error || 'AI monitor failed');
      }
    } catch (err: any) {
      setError(err?.message || 'AI monitor failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (idx: number, proposal: Proposal) => {
    setApplied(prev => new Set(prev).add(idx));
    onApply(proposal);
  };

  return (
    <div className="space-y-3">
      {proposals === null && !loading && (
        <button
          type="button"
          onClick={runMonitor}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-violet-500/20 bg-violet-500/5 text-[12px] text-violet-300 hover:bg-violet-500/10 transition-colors"
        >
          <Sparkles size={14} /> AI Health Check
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 p-6 text-[11px] text-zinc-500">
          <LoaderCircle size={14} className="animate-spin" /> Analyzing your goals...
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-[11px] text-rose-300">
          <p>{error}</p>
          <button type="button" onClick={runMonitor} className="mt-2 text-rose-200 hover:text-white">Retry</button>
        </div>
      )}

      {proposals !== null && !loading && (
        <AnimatePresence>
          {proposals.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
              <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-400" />
              <p className="text-[12px] text-emerald-300">All goals look healthy!</p>
              <p className="text-[10px] text-zinc-500 mt-1">Check back in 24 hours.</p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {proposals.map((p, idx) => {
                const style = ACTION_STYLES[p.action] || ACTION_STYLES.reschedule;
                const isApplied = applied.has(idx);
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-3 rounded-xl border ${style.bg} ${isApplied ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-[11px] font-medium ${style.color} shrink-0`}>{style.label}</span>
                      <p className="text-[11px] text-zinc-300 flex-1">{p.reason}</p>
                    </div>
                    {!isApplied && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleApply(idx, p)}
                          className="px-3 py-1 rounded-lg text-[10px] font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 transition-colors"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => onDismiss(p)}
                          className="px-3 py-1 rounded-lg text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                    {isApplied && (
                      <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Applied
                      </p>
                    )}
                  </motion.div>
                );
              })}
              <button
                type="button"
                onClick={() => { setProposals(null); }}
                className="w-full text-center text-[10px] text-zinc-500 hover:text-zinc-300 py-1 transition-colors"
              >
                Run again
              </button>
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
