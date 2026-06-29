import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, CheckCircle2, Send, ChevronDown, Clock, Brain, ListChecks, TrendingUp, X, Circle, Cpu } from 'lucide-react';
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
  onConfigure?: () => void;
  providerBadge?: { label: string; color: string } | null;
}

const modeConfig: Record<Mode, { label: string; pill: string; icon: any; bannerGrad: string; accent: string }> = {
  morning:      { label: 'Morning', pill: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', icon: Sparkles,    bannerGrad: 'from-amber-500/10 via-amber-500/5 to-transparent', accent: 'amber' },
  'in-progress':{ label: 'Active',  pill: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', icon: Circle, bannerGrad: 'from-emerald-500/10 via-emerald-500/5 to-transparent', accent: 'emerald' },
  review:       { label: 'Review',  pill: 'bg-pink-500/10 text-pink-400 border border-pink-500/20', icon: TrendingUp,  bannerGrad: 'from-pink-500/10 via-pink-500/5 to-transparent', accent: 'pink' },
};

const catAccent: Record<string, { dot: string; badge: string }> = {
  work:     { dot: 'bg-violet-500',  badge: 'bg-violet-500/12 text-violet-400 border-violet-500/20' },
  personal: { dot: 'bg-cyan-500',    badge: 'bg-cyan-500/12 text-cyan-400 border-cyan-500/20' },
  health:   { dot: 'bg-emerald-500', badge: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/20' },
  learning: { dot: 'bg-amber-500',   badge: 'bg-amber-500/12 text-amber-400 border-amber-500/20' },
};

export function DailyPlanCard({
  goals, mode, suggestions = [], planGoals = [], review,
  loading = false, suggesting = false, saving = false, error = null,
  onToggle, onSuggest, onAccept, onDismiss, onFeedback, onConfigure, providerBadge,
}: DailyPlanCardProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const mc = modeConfig[mode];

  const pending = useMemo(() => goals.filter(g => g.status !== 'completed' && g.status !== 'dismissed'), [goals]);
  const done = useMemo(() => goals.filter(g => g.status === 'completed'), [goals]);
  const progress = goals.length > 0 ? Math.round((done.length / goals.length) * 100) : 0;
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  function handleSendFeedback() {
    if (!feedbackText.trim()) return;
    onFeedback(feedbackText.trim());
    setFeedbackText('');
  }

  return (
    <GlassCard accent={mc.accent as any} className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${mc.bannerGrad} pointer-events-none`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mc.accent === 'pink' ? 'from-pink-500/20 to-fuchsia-500/20 border-pink-500/20' : mc.accent === 'amber' ? 'from-amber-500/20 to-orange-500/20 border-amber-500/20' : 'from-emerald-500/20 to-teal-500/20 border-emerald-500/20'} border flex items-center justify-center shadow-lg`}>
              <Brain className={`w-5 h-5 ${mc.accent === 'pink' ? 'text-pink-400' : mc.accent === 'amber' ? 'text-amber-400' : 'text-emerald-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-[15px] font-semibold text-white tracking-tight">Daily Plan</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${mc.pill}`}>{mc.label}</span>
                {providerBadge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${providerBadge.color}`}>
                    {providerBadge.label}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {mode === 'morning' ? dateStr : `${done.length} of ${goals.length} · ${progress}%`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {goals.length > 0 && (
              <svg width="40" height="40" className="shrink-0">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgb(39 39 42)" strokeWidth="3" />
                <circle cx="20" cy="20" r="16" fill="none"
                  stroke={progress === 100 ? '#34d399' : mc.accent === 'pink' ? '#ec4899' : mc.accent === 'amber' ? '#f59e0b' : '#34d399'}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={100.53}
                  strokeDashoffset={100.53 - (progress / 100) * 100.53}
                  transform="rotate(-90 20 20)"
                  className="transition-all duration-700 ease-out"
                />
                <text x="20" y="20" textAnchor="middle" dominantBaseline="central"
                  className="text-[10px] font-semibold" fill="currentColor">
                  {Math.round(progress)}%
                </text>
              </svg>
            )}
            {onConfigure && (
              <button
                onClick={onConfigure}
                className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-500 border border-zinc-700/30 hover:text-zinc-300 hover:border-zinc-600/50 transition-all duration-150"
                title="Configure provider"
              >
                <Cpu className="w-3 h-3" />
              </button>
            )}
            {mode !== 'review' && (
              <button
                onClick={onSuggest}
                disabled={suggesting || saving}
                className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg bg-gradient-to-r ${mc.accent === 'pink' ? 'from-pink-500/15 to-fuchsia-500/15 text-pink-400 border-pink-500/25 hover:from-pink-500/25 hover:to-fuchsia-500/25 hover:border-pink-500/40' : mc.accent === 'amber' ? 'from-amber-500/15 to-orange-500/15 text-amber-400 border-amber-500/25 hover:from-amber-500/25 hover:to-orange-500/25 hover:border-amber-500/40' : 'from-emerald-500/15 to-teal-500/15 text-emerald-400 border-emerald-500/25 hover:from-emerald-500/25 hover:to-teal-500/25 hover:border-emerald-500/40'} transition-all duration-200 disabled:opacity-40 shadow-lg`}
              >
                {suggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {suggesting ? 'Generating...' : 'Suggest'}
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="py-6">
          <LoadingState variant="skeleton" rows={3} />
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/8 border border-red-500/15 mb-4 backdrop-blur-sm">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && mode === 'morning' && goals.length === 0 && suggestions.length === 0 && planGoals.length === 0 && (
        <EmptyState
          icon={<Brain className="w-8 h-8 text-zinc-600" />}
          title="Plan your day"
          description="Tap Suggest to let AI propose goals based on your context."
          action={onSuggest ? { label: 'Suggest Goals', onClick: onSuggest } : undefined}
        />
      )}

      {/* From your plan section */}
      {!loading && !error && planGoals.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <ListChecks className="w-3 h-3 text-zinc-500" />
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">From your plan</p>
          </div>
          <div className="space-y-1.5">
            {planGoals.map((pg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="w-4 h-4 rounded border border-zinc-600 shrink-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                </div>
                <span className="text-xs text-zinc-200 flex-1 leading-relaxed">{pg.title}</span>
                {pg.targetSeconds && (
                  <span className="text-[10px] text-zinc-500 font-mono">{(pg.targetSeconds / 60).toFixed(0)}m</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions — always-visible actions */}
      {!loading && !error && suggestions.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3 h-3 text-pink-500" />
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">AI Suggestions</p>
          </div>
          <div className="space-y-1.5">
            {suggestions.map((s, i) => {
              const ac = catAccent[s.category];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-pink-500/[0.03] border border-pink-500/20"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${ac ? ac.dot : 'bg-zinc-500'}`} />
                  <span className="text-xs text-zinc-200 flex-1 leading-relaxed">{s.title}</span>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${ac ? ac.badge : 'bg-zinc-700/50 text-zinc-400'}`}>
                    {s.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onAccept(s)}
                      className="text-[10px] px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors">
                      Accept
                    </button>
                    <button onClick={() => onDismiss(s)}
                      className="text-[10px] px-2 py-1 rounded bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700/80 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily goals */}
      {!loading && !error && goals.length > 0 && (
        <div>
          {pending.length > 0 && (
            <div className="space-y-1">
              {pending.map((g, i) => {
                const ac = catAccent[g.category];
                return (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 p-3 rounded-lg border border-zinc-700/30 bg-zinc-800/10 hover:bg-zinc-800/25 transition-all duration-150 group"
                  >
                    <button onClick={() => onToggle(g)} className="mt-0.5 shrink-0">
                      <Circle className="w-4.5 h-4.5 text-zinc-500 hover:text-zinc-300 transition-colors" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {ac && <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ac.dot}`} />}
                        <span className="text-sm text-zinc-200 leading-relaxed group-hover:text-white transition-colors">{g.title}</span>
                      </div>
                      {g.description && (
                        <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{g.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded ${ac ? ac.badge : 'bg-zinc-700/50 text-zinc-400'}`}>
                        {g.category}
                      </span>
                      {g.target?.targetSeconds && (
                        <span className="text-[10px] text-zinc-500 font-mono">{(g.target.targetSeconds / 60).toFixed(0)}m</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {done.length > 0 && (
            <>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-1.5 pt-3 pb-1.5 text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors font-medium"
              >
                <CheckCircle2 className="w-3 h-3" />
                Completed ({done.length})
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showCompleted ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showCompleted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    {done.map(g => {
                      const ac = catAccent[g.category];
                      return (
                        <div key={g.id} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/[0.03] border border-emerald-500/10">
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          </div>
                          <span className="text-sm text-zinc-500 line-through flex-1">{g.title}</span>
                          <span className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded ${ac ? ac.badge : 'bg-zinc-700/50 text-zinc-400'}`}>
                            {g.category}
                          </span>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      )}

      {/* Review mode metrics */}
      {!loading && !error && mode === 'review' && pending.length === 0 && done.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 mt-4"
        >
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/[0.08] to-emerald-500/[0.02] border border-emerald-500/15">
            <TrendingUp className="w-4 h-4 text-emerald-400 mb-1.5" />
            <p className="text-lg font-bold text-emerald-300">{done.length}</p>
            <p className="text-[10px] text-zinc-500">goals completed</p>
          </div>
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-zinc-800/50 to-zinc-800/20 border border-zinc-700/40">
            <Clock className="w-4 h-4 text-zinc-400 mb-1.5" />
            <p className="text-lg font-bold text-zinc-300">{goals.filter(g => g.status === 'slipped').length}</p>
            <p className="text-[10px] text-zinc-500">carry over</p>
          </div>
        </motion.div>
      )}

      {/* Review summary */}
      {review && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-pink-500/[0.06] to-fuchsia-500/[0.06] border border-pink-500/15"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Brain className="w-3 h-3 text-pink-400" />
            <span className="text-[10px] uppercase tracking-wider text-pink-400 font-medium">Review</span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{review}</p>
        </motion.div>
      )}

      {/* Feedback input */}
      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendFeedback(); } }}
            placeholder="How was your day?"
            className="w-full bg-zinc-800/40 border border-zinc-700/40 rounded-lg pl-3 pr-8 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500/40 transition-colors"
          />
        </div>
        <button
          onClick={handleSendFeedback}
          disabled={!feedbackText.trim() || saving}
          className="p-2 rounded-lg bg-gradient-to-r from-pink-500/15 to-fuchsia-500/15 text-pink-400 border border-pink-500/25 hover:from-pink-500/25 hover:to-fuchsia-500/25 transition-all duration-200 disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </GlassCard>
  );
}
