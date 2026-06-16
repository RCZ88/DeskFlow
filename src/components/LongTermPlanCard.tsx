import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, X, Check, GripVertical, Loader2, Clock, ChevronDown, ChevronUp, Sparkles, Flag, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { LoadingState } from './LoadingState';

interface LongTermGoal {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  target_seconds?: number;
  priority: number;
}

const CATEGORIES = ['work', 'personal', 'health', 'learning', 'finance', 'relationships'];

const categoryConfig: Record<string, { color: string; dot: string; bg: string; border: string }> = {
  work: { color: 'text-violet-400', dot: 'bg-violet-500', bg: 'bg-violet-500/[0.04]', border: 'border-violet-500/20' },
  personal: { color: 'text-cyan-400', dot: 'bg-cyan-500', bg: 'bg-cyan-500/[0.04]', border: 'border-cyan-500/20' },
  health: { color: 'text-emerald-400', dot: 'bg-emerald-500', bg: 'bg-emerald-500/[0.04]', border: 'border-emerald-500/20' },
  learning: { color: 'text-amber-400', dot: 'bg-amber-500', bg: 'bg-amber-500/[0.04]', border: 'border-amber-500/20' },
  finance: { color: 'text-rose-400', dot: 'bg-rose-500', bg: 'bg-rose-500/[0.04]', border: 'border-rose-500/20' },
  relationships: { color: 'text-pink-400', dot: 'bg-pink-500', bg: 'bg-pink-500/[0.04]', border: 'border-pink-500/20' },
};

export function LongTermPlanCard() {
  const [goals, setGoals] = useState<LongTermGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('work');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);

  useEffect(() => { loadGoals(); }, []);

  async function loadGoals() {
    setLoading(true);
    setError(null);
    try {
      const r = await window.deskflowAPI!.getLongtermGoals();
      if (r?.success) setGoals(r.goals || []);
      else setError(r?.error || 'Failed to load');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const goal = {
        id: crypto.randomUUID(),
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory,
        target: { type: 'completion' },
        status: 'pending',
        period: 'longterm',
        source: 'manual',
        links: [],
        priority: goals.length,
      };
      await window.deskflowAPI!.saveGoal('', goal);
      setNewTitle('');
      setNewDescription('');
      setShowAdd(false);
      await loadGoals();
    } catch {}
    setSaving(false);
  }

  async function handleToggle(goal: LongTermGoal) {
    const newStatus = goal.status === 'completed' ? 'pending' : 'completed';
    try {
      await window.deskflowAPI!.saveGoal('', {
        ...goal,
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
      });
      await loadGoals();
    } catch {}
  }

  async function handleDelete(id: string) {
    try {
      await window.deskflowAPI!.deleteGoal(id);
      await loadGoals();
    } catch {}
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const reordered = [...goals];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    try {
      for (let i = 0; i < reordered.length; i++) {
        await window.deskflowAPI!.saveGoal('', { ...reordered[i], priority: i });
      }
      setGoals(reordered);
    } catch {}
  }

  async function handleMoveDown(index: number) {
    if (index === goals.length - 1) return;
    const reordered = [...goals];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    try {
      for (let i = 0; i < reordered.length; i++) {
        await window.deskflowAPI!.saveGoal('', { ...reordered[i], priority: i });
      }
      setGoals(reordered);
    } catch {}
  }

  const pending = goals.filter(g => g.status !== 'completed');
  const done = goals.filter(g => g.status === 'completed');

  return (
    <GlassCard variant="subtle" accent="emerald">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
            <Flag className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Long-term Plan</h3>
            {!loading && (
              <p className="text-[10px] text-zinc-500">{pending.length} active · {done.length} done</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all duration-200"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading && <LoadingState variant="skeleton" rows={3} />}
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/[0.04] to-orange-500/[0.04] border border-amber-500/20 space-y-2.5">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
                placeholder="What do you want to achieve?"
                className="w-full px-3 py-2 text-xs bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40 transition-colors"
                autoFocus
              />
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Optional description or notes..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40 transition-colors resize-none"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-xs bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-zinc-300 focus:outline-none focus:border-amber-500/40 transition-colors"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  onClick={handleAdd}
                  disabled={!newTitle.trim() || saving}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-medium hover:from-amber-500/30 hover:to-orange-500/30 transition-all duration-200 disabled:opacity-40"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add Goal'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!loading && goals.length === 0 && !showAdd && (
        <div className="flex flex-col items-center py-8 text-center">
          <Flag className="w-8 h-8 text-zinc-700 mb-2" />
          <p className="text-xs text-zinc-500">No long-term goals yet</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">Click + to add your first goal</p>
        </div>
      )}

      {/* Goals list with timeline connector */}
      {pending.length > 0 && (
        <div className="relative">
          <div className="absolute left-[17px] top-3 bottom-3 w-px bg-gradient-to-b from-amber-500/30 via-amber-500/10 to-transparent" />
          <div className="space-y-1.5">
            {pending.map((goal, i) => {
              const cat = categoryConfig[goal.category] || categoryConfig.work;
              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="relative flex items-start gap-3 p-2.5 rounded-lg hover:bg-zinc-800/30 transition-colors group"
                >
                  {/* Timeline dot */}
                  <button
                    onClick={() => handleToggle(goal)}
                    className="relative z-10 mt-0.5 w-[18px] h-[18px] rounded-full border-2 border-zinc-600 shrink-0 flex items-center justify-center hover:border-emerald-400 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/10"
                  >
                    <div className={`w-2 h-2 rounded-full transition-all duration-200 ${cat.dot}`} />
                  </button>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-200 font-medium truncate group-hover:text-white transition-colors">{goal.title}</span>
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium shrink-0 ${cat.color} ${cat.bg} ${cat.border}`}>
                        {goal.category}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{goal.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                    <button onClick={() => handleMoveUp(i)} disabled={i === 0} className="p-1 rounded text-zinc-500 hover:text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 transition-all">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleMoveDown(i)} disabled={i === pending.length - 1} className="p-1 rounded text-zinc-500 hover:text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 transition-all">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDelete(goal.id)} className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed section */}
      {done.length > 0 && (
        <div className="mt-4 pt-3 border-t border-zinc-800/60">
          <button
            onClick={() => setCompletedOpen(!completedOpen)}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors font-medium"
          >
            <Check className="w-3 h-3 text-emerald-500" />
            Completed ({done.length})
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${completedOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {completedOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-1 mt-2">
                  {done.map(goal => {
                    const cat = categoryConfig[goal.category] || categoryConfig.work;
                    return (
                      <motion.div
                        key={goal.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-500/[0.02] border border-emerald-500/10"
                      >
                        <div className="w-[18px] h-[18px] rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        </div>
                        <span className="text-xs text-zinc-500 line-through flex-1">{goal.title}</span>
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-medium ${cat.color} ${cat.bg}`}>
                          {goal.category}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </GlassCard>
  );
}
