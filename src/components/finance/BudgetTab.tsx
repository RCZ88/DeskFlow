import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, AlertTriangle, X, Edit3, Trash2 } from 'lucide-react';
import { GlassSurface } from './_fx/GlassSurface';
import { pageContainer, riseItem } from './_fx/financeMotion';
import { formatCurrency } from './currency-data';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import { BudgetModal } from './BudgetModal';
import type { FinanceBudget, BudgetStatus, FinanceCategory } from './finance-types';

interface Props {
  budgets: FinanceBudget[];
  status: BudgetStatus | null;
  categories: FinanceCategory[];
  onRefresh: () => void;
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function getStatusColor(pct: number): string {
  if (pct >= 100) return '#ef4444';
  if (pct >= 80) return '#f97316';
  if (pct >= 60) return '#eab308';
  return '#10b981';
}

function getProgressGradient(status: string): string {
  if (status === 'over') return 'linear-gradient(90deg, #ef4444, #dc2626)';
  if (status === 'warning') return 'linear-gradient(90deg, #f59e0b, #f97316)';
  return 'linear-gradient(90deg, #10b981, #34d399)';
}

export function BudgetTab({ budgets, status, categories, onRefresh, onNotify }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<FinanceBudget | null>(null);
  const { showNumbers } = useNumberMask();

  const daysLeft = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
  }, []);

  const handleDelete = useCallback(async (budget: FinanceBudget) => {
    if (!confirm(`Delete budget "${budget.name}"?`)) return;
    const result = await (window as any).deskflowAPI?.budgetsDelete?.(budget.id);
    if (result?.success) { onNotify?.(`Deleted ${budget.name}`, 'info'); onRefresh(); }
  }, [onRefresh, onNotify]);

  const warnings = useMemo(() => {
    if (!status) return [];
    return status.budgets.filter(b => b.status === 'warning' || b.status === 'over');
  }, [status]);

  return (
    <motion.div {...pageContainer} className="space-y-4 p-5">
      {/* Overall Budget Card */}
      {status && status.totalBudget > 0 && (
        <GlassSurface className="p-6 rounded-xl">
          <div className="flex items-center gap-6">
            {/* Progress Ring */}
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(63,63,70,0.3)" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none"
                  stroke={getStatusColor(status.overallPercentage)}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${Math.min(status.overallPercentage, 100) * 2.64} 264`}
                  className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-zinc-100 tabular-nums">{Math.round(status.overallPercentage)}%</span>
                <span className="text-[9px] text-zinc-500">SPENT</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-zinc-400 text-xs mb-1">Overall Budget</p>
              <p className="text-zinc-50 text-xl font-bold tabular-nums">
                {showNumbers ? formatCurrency(status.totalSpent) : maskNumber(status.totalSpent)}
                <span className="text-zinc-600 text-sm font-normal"> of {showNumbers ? formatCurrency(status.totalBudget) : maskNumber(status.totalBudget)}</span>
              </p>
              <p className="text-zinc-500 text-xs mt-1">
                {showNumbers ? formatCurrency(status.totalRemaining) : maskNumber(status.totalRemaining)} remaining • {daysLeft} days left
              </p>
            </div>
          </div>
        </GlassSurface>
      )}

      {/* Warning Banner */}
      <AnimatePresence>
        {warnings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GlassSurface className="p-4 rounded-xl border-l-4 border-l-amber-500">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  {warnings.map(w => (
                    <p key={w.id} className="text-xs text-zinc-300">
                      {w.status === 'over' ? '🚨' : '⚠️'} <span className="font-medium">{w.name}</span> is at {w.percentage}%
                      {w.status === 'over' ? ` — over by ${formatCurrency(Math.abs(w.remaining))}` : ` — ${formatCurrency(w.remaining)} left`}
                    </p>
                  ))}
                </div>
              </div>
            </GlassSurface>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget Cards Grid */}
      {budgets.length === 0 ? (
        <GlassSurface className="p-10 rounded-xl text-center">
          <Target className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm mb-1">No budgets set</p>
          <p className="text-zinc-600 text-xs">Create your first budget to track spending limits</p>
        </GlassSurface>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {status?.budgets.map((b, i) => (
            <motion.div key={b.id} variants={riseItem} initial="hidden" animate="visible" transition={{ delay: i * 0.05 }}>
              <GlassSurface className="p-4 rounded-xl relative overflow-hidden group">
                {/* Left accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: b.category?.color || '#f59e0b' }} />
                <div className="pl-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-200 font-medium text-sm">{b.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        b.status === 'ok' ? 'bg-emerald-500/20 text-emerald-400' :
                        b.status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {b.status.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingBudget(budgets.find(bt => bt.id === b.id) || null); setShowModal(true); }}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => handleDelete(budgets.find(bt => bt.id === b.id)!)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-zinc-50 text-lg font-bold tabular-nums">{showNumbers ? formatCurrency(b.spent) : maskNumber(b.spent)}</span>
                    <span className="text-zinc-500 text-[11px]">of {showNumbers ? formatCurrency(b.limit) : maskNumber(b.limit)}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(b.percentage, 100)}%`, background: getProgressGradient(b.status) }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px]">
                    <span className="text-zinc-500">{b.percentage}% used</span>
                    <span className={b.status === 'over' ? 'text-red-400' : 'text-zinc-400'}>
                      {b.status === 'over' ? `${formatCurrency(Math.abs(b.remaining))} over` : `${formatCurrency(b.remaining)} left`}
                    </span>
                  </div>
                </div>
              </GlassSurface>
            </motion.div>
          ))}
        </div>
      )}

      {/* FAB */}
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => { setEditingBudget(null); setShowModal(true); }}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25 flex items-center justify-center z-50 hover:bg-amber-400 transition-colors">
        <Plus className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <BudgetModal budget={editingBudget} categories={categories}
            onClose={() => { setShowModal(false); setEditingBudget(null); }}
            onSave={async (data) => {
              const api = (window as any).deskflowAPI;
              const result = editingBudget?.id
                ? await api?.budgetsUpdate?.({ ...data, id: editingBudget.id })
                : await api?.budgetsCreate?.(data);
              if (result) { onRefresh(); setShowModal(false); setEditingBudget(null); onNotify?.(editingBudget?.id ? 'Updated' : 'Created', 'success'); }
            }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
