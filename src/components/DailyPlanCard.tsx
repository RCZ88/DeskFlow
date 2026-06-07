import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Sparkles, Loader2, CheckCircle2, Circle, Send, RefreshCw, ChevronDown, Clock, CalendarDays } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';
import type { Goal, GoalCategory } from '../services/GoalStore';

type Mode = 'morning' | 'in-progress' | 'review';

interface DailyPlanCardProps {
  goals: Goal[];
  mode: Mode;
  suggestions?: Array<{ title: string; category: GoalCategory }>;
  planGoals?: Array<{ title: string; targetSeconds?: number }>;
  review?: string | null;
  loading?: boolean;
  suggesting?: boolean;
  saving?: boolean;
  error?: string | null;
  onToggle: (goal: Goal) => void;
  onSuggest: () => void;
  onAccept: (suggestion: { title: string; category: GoalCategory }) => void;
  onDismiss: (suggestion: { title: string; category: GoalCategory }) => void;
  onFeedback: (message: string) => void;
  onRefreshPlan?: () => void;
}

const modeConfig: Record<Mode, { label: string; pill: string }> = {
  morning:    { label: 'Morning Planning', pill: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
  'in-progress': { label: 'In Progress',    pill: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
  review:     { label: 'Review',           pill: 'bg-pink-500/15 text-pink-400 border border-pink-500/30' },
};

export function DailyPlanCard({
  goals, mode, suggestions = [], planGoals = [], review,
  loading = false, suggesting = false, saving = false, error = null,
  onToggle, onSuggest, onAccept, onDismiss, onFeedback,
}: DailyPlanCardProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const mc = modeConfig[mode];

  const pending = goals.filter(g => g.status !== 'completed' && g.status !== 'dismissed');
  const done = goals.filter(g => g.status === 'completed');
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  function handleSendFeedback() {
    if (!feedbackText.trim()) return;
    onFeedback(feedbackText.trim());
    setFeedbackText('');
  }

  return (
    <GlassCard accent="pink" className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-400/15">
            <Target className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Daily Plan</h3>
            <p className="text-[10px] text-zinc-500">{
              mode === 'morning' ? dateStr :
              `${done.length}/${goals.length} · ${goals.length > 0 ? `${Math.round((done.length / goals.length) * 100)}%` : 'No goals'}`
            }</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${mc.pill}`}>{mc.label}</span>
          {mode !== 'review' && (
            <button
              onClick={onSuggest}
              disabled={suggesting || saving}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-400/10 text-violet-400 border border-violet-400/30 hover:bg-violet-400/20 transition-colors disabled:opacity-40"
            >
              {suggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {suggesting ? 'Generating...' : 'Suggest'}
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="py-4">
          <LoadingState variant="spinner" />
          <p className="text-xs text-zinc-500 text-center mt-2">Loading goals...</p>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && mode === 'morning' && goals.length === 0 && suggestions.length === 0 && planGoals && planGoals.length === 0 && (
        <EmptyState
          icon={<Target className="w-6 h-6 opacity-30" />}
          title="No goals for today"
          description="Tap Suggest to let AI propose goals."
        />
      )}

      {!loading && !error && planGoals && planGoals.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium mb-2">From your plan</p>
          <div className="space-y-1.5">
            {planGoals.map((pg, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
                <span className="w-3.5 h-3.5 rounded border border-zinc-600 shrink-0" />
                <span className="text-xs text-zinc-200 flex-1">{pg.title}</span>
                {pg.targetSeconds && (
                  <span className="text-[10px] text-zinc-500">{(pg.targetSeconds / 60).toFixed(0)}m</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && suggestions.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium mb-2">Suggested Goals</p>
          <div className="space-y-1.5">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
                <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
                <span className="text-xs text-zinc-200 flex-1">{s.title}</span>
                <span className="text-[10px] text-zinc-500 uppercase px-1.5">{s.category}</span>
                <button onClick={() => onAccept(s)} className="text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors">Accept</button>
                <button onClick={() => onDismiss(s)} className="text-[10px] px-2 py-1 rounded bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700/80 transition-colors">Dismiss</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && goals.length > 0 && (
        <div className="space-y-1.5">
          {pending.map(g => (
            <motion.button
              key={g.id}
              onClick={() => onToggle(g)}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-zinc-800/30 transition-colors bg-zinc-800/20 border border-zinc-700/30"
              whileTap={{ scale: 0.99 }}
            >
              <Circle className="w-4 h-4 shrink-0 text-zinc-500" />
              <span className="text-xs text-zinc-200 flex-1 leading-relaxed">{g.title}</span>
              <span className="text-[10px] uppercase font-medium px-2 py-0.5 rounded bg-zinc-700/50 text-zinc-400">
                {g.category}
              </span>
            </motion.button>
          ))}
          {done.length > 0 && (
            <>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-1.5 pt-2 pb-1 text-[10px] uppercase tracking-wider text-zinc-600 font-medium"
              >
                Completed ({done.length})
                <ChevronDown className={`w-3 h-3 transition-transform ${showCompleted ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showCompleted && done.map(g => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/10"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span className="text-xs text-zinc-500 line-through flex-1">{g.title}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}
        </div>
      )}

      {!loading && !error && mode === 'review' && pending.length === 0 && done.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-[10px] uppercase text-emerald-400 font-medium mb-1">Accomplished</p>
            <p className="text-lg font-semibold text-emerald-300">{done.length}</p>
            <p className="text-[10px] text-zinc-500">goals completed today</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
            <p className="text-[10px] uppercase text-zinc-400 font-medium mb-1">Slipped</p>
            <p className="text-lg font-semibold text-zinc-300">{goals.filter(g => g.status === 'slipped').length}</p>
            <p className="text-[10px] text-zinc-500">carry over to tomorrow</p>
          </div>
        </div>
      )}

      {review && (
        <div className="mt-4 p-3 rounded-lg bg-violet-500/6 border border-violet-500/15">
          <p className="text-[11px] text-zinc-400 leading-relaxed">{review}</p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <input
          value={feedbackText}
          onChange={e => setFeedbackText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendFeedback(); } }}
          placeholder="How was your day? Type feedback..."
          className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500/40 transition-colors"
        />
        <button
          onClick={handleSendFeedback}
          disabled={!feedbackText.trim() || saving}
          className="p-2 rounded-lg bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-colors disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </GlassCard>
  );
}
