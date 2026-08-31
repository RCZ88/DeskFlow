import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, Plus, CheckCircle, Clock, AlertTriangle, SkipForward, ChevronLeft, ChevronRight, Search, Undo2, Trash2, Edit3, Zap } from 'lucide-react';
import { GlassSurface } from './_fx/GlassSurface';
import { pageContainer, riseItem } from './_fx/financeMotion';
import { formatCurrency } from './currency-data';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import { FixedExpenseModal } from './FixedExpenseModal';
import type { FinanceFixedExpense, FinanceFixedExpensePayment, FixedExpenseSummary, FinanceWallet, FinanceCategory } from './finance-types';

interface Props {
  expenses: FinanceFixedExpense[];
  summary: FixedExpenseSummary | null;
  month: string;
  onMonthChange: (m: string) => void;
  wallets: FinanceWallet[];
  categories: FinanceCategory[];
  onRefresh: () => void;
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function getOrdinal(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th';
  }
}

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return d.toISOString().slice(0, 7);
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return d.toISOString().slice(0, 7);
}

function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function FixedExpensesTab({ expenses, summary, month, onMonthChange, wallets, categories, onRefresh, onNotify }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FinanceFixedExpense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const { showNumbers } = useNumberMask();

  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);
  const currentDay = today.getDate();
  const isCurrentMonth = month === currentMonth;

  const filtered = useMemo(() => {
    if (!searchQuery) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter(e => e.name.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q));
  }, [expenses, searchQuery]);

  const handleMarkPaid = useCallback(async (expense: FinanceFixedExpense) => {
    const result = await (window as any).deskflowAPI?.fixedExpensesMarkPaid?.({
      fixed_expense_id: expense.id, month, amount: expense.amount
    });
    if (result?.success) {
      onNotify?.(`Marked ${expense.name} as paid`, 'success');
      onRefresh();
    } else {
      onNotify?.(result?.error || 'Failed', 'error');
    }
  }, [month, onRefresh, onNotify]);

  const handleSkip = useCallback(async (expense: FinanceFixedExpense) => {
    const result = await (window as any).deskflowAPI?.fixedExpensesSkipMonth?.({
      fixed_expense_id: expense.id, month
    });
    if (result?.success) { onNotify?.(`Skipped ${expense.name} for ${formatMonth(month)}`, 'info'); onRefresh(); }
  }, [month, onRefresh, onNotify]);

  const handleUnmark = useCallback(async (expense: FinanceFixedExpense) => {
    const result = await (window as any).deskflowAPI?.fixedExpensesUnmarkPaid?.({
      fixed_expense_id: expense.id, month
    });
    if (result?.success) { onNotify?.(`Undid payment for ${expense.name}`, 'info'); onRefresh(); }
  }, [month, onRefresh, onNotify]);

  const handleDelete = useCallback(async (expense: FinanceFixedExpense) => {
    if (!confirm(`Delete "${expense.name}"? This cannot be undone.`)) return;
    const result = await (window as any).deskflowAPI?.fixedExpensesDelete?.(expense.id);
    if (result?.success) { onNotify?.(`Deleted ${expense.name}`, 'info'); onRefresh(); }
  }, [onRefresh, onNotify]);

  const handleDetect = useCallback(async () => {
    setDetecting(true);
    try {
      const res = await (window as any).deskflowAPI?.fixedExpensesDetectRecurring?.();
      setSuggestions(res || []);
    } catch { setSuggestions([]); }
    setDetecting(false);
  }, []);

  const handleCreateFromSuggestion = useCallback((s: any) => {
    setEditingExpense({ id: 0, wallet_id: wallets[0]?.id || 0, name: s.suggestedName, description: '',
      amount: s.avgAmount, currency: 'USD', category_id: s.categoryId, billing_day: 1,
      is_active: 1, auto_create_transaction: 0, metadata: null, created_at: '', updated_at: '' });
    setShowModal(true);
  }, [wallets]);

  return (
    <motion.div {...pageContainer} className="space-y-4 p-5">
      {/* Summary Bar */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Fixed', value: summary.totalMonthlyFixed, color: 'text-zinc-50' },
            { label: 'Paid', value: summary.totalPaid, color: 'text-emerald-400' },
            { label: 'Remaining', value: summary.totalRemaining, color: 'text-amber-400' },
            { label: '% Paid', value: null, color: 'text-zinc-50', display: `${Math.round(summary.percentagePaid)}%` },
          ].map((s, i) => (
            <GlassSurface key={i} className="p-4 rounded-xl text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-lg font-bold tabular-nums ${s.color}`}>
                {s.display ?? (showNumbers ? formatCurrency(s.value!) : maskNumber(s.value!))}
              </p>
            </GlassSurface>
          ))}
        </div>
      )}

      {/* Month Selector + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => onMonthChange(prevMonth(month))} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-zinc-200 min-w-[140px] text-center">{formatMonth(month)}</span>
          <button onClick={() => onMonthChange(nextMonth(month))} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          {month !== currentMonth && (
            <button onClick={() => onMonthChange(currentMonth)} className="text-[10px] px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
              Today
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-xs bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 w-32" />
          </div>
          <button onClick={handleDetect} disabled={detecting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 rounded-lg transition-colors font-medium disabled:opacity-50">
            <Zap className="w-3.5 h-3.5" /> {detecting ? 'Scanning...' : 'Detect Patterns'}
          </button>
        </div>
      </div>

      {/* Suggestions */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <GlassSurface className="p-4 rounded-xl border-l-4 border-l-indigo-500">
              <p className="text-xs text-zinc-400 mb-2">Found {suggestions.length} potential fixed expenses:</p>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-zinc-200">{s.suggestedName}</span>
                      <span className="text-[10px] text-zinc-500 ml-2">~{formatCurrency(s.avgAmount)} × {s.frequency}x</span>
                    </div>
                    <button onClick={() => handleCreateFromSuggestion(s)}
                      className="text-[10px] px-2 py-1 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg transition-colors">
                      Create
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => setSuggestions([])} className="text-[10px] text-zinc-600 mt-2 hover:text-zinc-400">Dismiss</button>
            </GlassSurface>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense Cards */}
      {filtered.length === 0 ? (
        <GlassSurface className="p-10 rounded-xl text-center">
          <Receipt className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm mb-1">No fixed expenses yet</p>
          <p className="text-zinc-600 text-xs">Add your first one to track monthly costs</p>
        </GlassSurface>
      ) : (
        <motion.div className="space-y-2" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
          initial="hidden" animate="visible">
          {filtered.map(exp => {
            const status = exp.current_month_status || 'pending';
            const billingDay = exp.billing_day;
            const daysUntilDue = (typeof billingDay === 'number' && !isNaN(billingDay)) ? billingDay - currentDay : NaN;
            const isOverdue = isCurrentMonth && status === 'pending' && daysUntilDue < 0;
            const isDueSoon = isCurrentMonth && status === 'pending' && daysUntilDue >= 0 && daysUntilDue <= 7;

            return (
              <motion.div key={exp.id} variants={riseItem}>
                <GlassSurface className="p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="text-zinc-100 font-medium text-sm">{exp.name}</h3>
                        <p className="text-zinc-500 text-[11px]">
                          {exp.category_name || 'Uncategorized'} • Due: {billingDay}{getOrdinal(billingDay)}
                          {exp.wallet_name ? ` • ${exp.wallet_name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <p className="text-zinc-50 font-bold text-base tabular-nums">
                        {showNumbers ? formatCurrency(exp.amount, exp.currency) : maskNumber(exp.amount)}
                      </p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingExpense(exp); setShowModal(true); }}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 transition-colors">
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDelete(exp)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {status === 'paid' && (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-400 text-[11px]">Paid {exp.current_month_paid_date || ''}</span>
                        </>
                      )}
                      {status === 'pending' && isOverdue && (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-red-400 text-[11px]">Overdue by {Math.abs(daysUntilDue)} days</span>
                        </>
                      )}
                      {status === 'pending' && isDueSoon && (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-amber-400 text-[11px]">Due {isNaN(daysUntilDue) ? 'date unset' : daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} days`}</span>
                        </>
                      )}
                      {status === 'pending' && !isOverdue && !isDueSoon && (
                        <>
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-zinc-500 text-[11px]">Due on {billingDay}{getOrdinal(billingDay)}</span>
                        </>
                      )}
                      {status === 'skipped' && (
                        <>
                          <SkipForward className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-zinc-400 text-[11px]">Skipped for {formatMonth(month)}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {status === 'pending' && (
                        <>
                          <button onClick={() => handleMarkPaid(exp)}
                            className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-[11px] font-medium rounded-lg transition-colors">
                            Mark Paid
                          </button>
                          <button onClick={() => handleSkip(exp)}
                            className="px-2.5 py-1 bg-zinc-800 text-zinc-500 hover:text-zinc-300 text-[11px] rounded-lg transition-colors">
                            Skip
                          </button>
                        </>
                      )}
                      {status === 'paid' && (
                        <button onClick={() => handleUnmark(exp)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 text-zinc-500 hover:text-zinc-300 text-[11px] rounded-lg transition-colors">
                          <Undo2 className="w-3 h-3" /> Undo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress indicator */}
                  <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${status === 'paid' ? 'bg-emerald-500 w-full' : isOverdue ? 'bg-red-500 w-1/4' : 'bg-amber-500/60 w-1/2'}`} />
                  </div>
                </GlassSurface>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* FAB */}
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => { setEditingExpense(null); setShowModal(true); }}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25 flex items-center justify-center z-50 hover:bg-amber-400 transition-colors">
        <Plus className="w-5 h-5" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <FixedExpenseModal
            expense={editingExpense} wallets={wallets} categories={categories}
            onClose={() => { setShowModal(false); setEditingExpense(null); }}
            onSave={async (data) => {
              const api = (window as any).deskflowAPI;
              const result = editingExpense?.id
                ? await api?.fixedExpensesUpdate?.({ ...data, id: editingExpense.id })
                : await api?.fixedExpensesCreate?.(data);
              if (result) { onRefresh(); setShowModal(false); setEditingExpense(null); onNotify?.(editingExpense?.id ? 'Updated' : 'Created', 'success'); }
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
