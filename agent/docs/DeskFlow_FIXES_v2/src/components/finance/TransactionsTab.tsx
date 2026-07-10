import { useState, useMemo, useEffect, useRef } from 'react';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Search, Trash2, Lock as LockIcon, Calendar, X } from 'lucide-react';
import { GlassSurface } from './_fx/GlassSurface';
import { TabHeader } from './_fx/TabHeader';
import { EmptyState } from './EmptyState';
import { TransactionDetailModal } from './TransactionDetailModal';
import { convertAmount, formatCurrency as fmtCurrency } from './currency-data';
import type { FinanceTransaction, FinanceAccount, FinanceCategory, FinanceWallet } from './finance-types';
import { useTransactionSelection } from './_fx/useTransactionSelection';
import { useSelectionAggregate } from './_fx/useSelectionAggregate';
import { TransactionCheckbox } from './_fx/TransactionCheckbox';
import { useDragSelect } from './_fx/useDragSelect';
import { SelectionAggregatePanel } from './SelectionAggregatePanel';
import { BatchRecategorizeModal } from './modals/BatchRecategorizeModal';
import { exportTransactionsCsv } from './csvExport';

interface TransactionsTabProps {
  transactions: FinanceTransaction[];
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  wallets: FinanceWallet[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  displayCurrency: string;
  baseCurrency: string;
  onAddTransaction: (data: {
    account_id: number; wallet_id: number | null; category_id: number;
    type: 'income' | 'expense' | 'transfer'; amount: number;
    description: string; note: string; date: string;
  }) => Promise<boolean>;
  onDeleteTransaction: (id: number) => Promise<boolean>;
  onVerifyPassword?: (password: string) => Promise<boolean>;
}

const formatDateLabel = (dateStr: string) => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const typeFilters = [
  { key: 'all' as const, label: 'All' },
  { key: 'income' as const, label: 'Income', color: 'emerald' },
  { key: 'expense' as const, label: 'Expense', color: 'red' },
  { key: 'transfer' as const, label: 'Transfer', color: 'amber' },
];

const typeColors: Record<string, { icon: string; bg: string; border: string; text: string }> = {
  income: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-l-emerald-500/40', text: 'text-emerald-400' },
  expense: { icon: 'text-red-400', bg: 'bg-red-500/10', border: 'border-l-red-500/40', text: 'text-red-400' },
  transfer: { icon: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-l-amber-500/40', text: 'text-amber-400' },
};

const WALLET_TYPE_LABEL: Record<string, string> = {
  bank: 'Bank', debit_card: 'Debit', credit_card: 'Credit', crypto: 'Crypto',
  cash: 'Cash', physical: 'Physical', ewallet: 'E-Wallet', other: 'Other',
};
const WALLET_TYPE_COLOR: Record<string, string> = {
  bank: '#3B82F6', debit_card: '#10B981', credit_card: '#F59E0B', crypto: '#8B5CF6',
  cash: '#EC4899', physical: '#F97316', ewallet: '#06B6D4', other: '#6B7280',
};

export function TransactionsTab({ transactions, accounts, categories, wallets, loading, error, onRetry, displayCurrency, baseCurrency, onAddTransaction, onDeleteTransaction, onVerifyPassword }: TransactionsTabProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchRef = useRef<ReturnType<typeof setTimeout>>();
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [deletePasswordTarget, setDeletePasswordTarget] = useState<number | null>(null);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [detailTxn, setDetailTxn] = useState<FinanceTransaction | null>(null);
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setDebouncedSearch(search), 200);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search]);

  const filtered = useMemo(() => {
    let list = transactions;
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(t => (t.description?.toLowerCase() || '').includes(q));
    }
    if (dateStart) list = list.filter(t => (t.date || '') >= dateStart);
    if (dateEnd) list = list.filter(t => (t.date || '') <= dateEnd);
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, typeFilter, debouncedSearch, dateStart, dateEnd]);

  const grouped = useMemo(() => {
    const groups: Record<string, { dateStr: string; txns: FinanceTransaction[]; netTotal: number }> = {};
    for (const t of filtered) {
      const key = t.date || 'Unknown';
      if (!groups[key]) {
        groups[key] = { dateStr: key, txns: [], netTotal: 0 };
      }
      groups[key].txns.push(t);
      groups[key].netTotal += t.type === 'income' ? t.amount : t.type === 'transfer' ? t.amount : -t.amount;
    }
    return groups;
  }, [filtered]);

  const fc = (amount: number) => fmtCurrency(convertAmount(amount, baseCurrency, displayCurrency), displayCurrency);

  const getCategory = (id: number) => categories.find(c => c.id === id);
  const getAccount = (id: number) => accounts.find(a => a.id === id);
  const getWallet = (id: number | null) => id ? wallets.find(w => w.id === id) : null;

  // ── Selection state (multi-select + aggregate) ──
  const filteredIds = useMemo(() => filtered.map((t) => t.id), [filtered])
  const visibleOrder = filteredIds
  const { derived, derivedSelectedIds, api } = useTransactionSelection(filteredIds)

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const walletMap = useMemo(() => new Map(wallets.map((w) => [w.id, w])), [wallets])
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])

  const aggMeta = useMemo(
    () => ({
      categoryName: (id: number) => categoryMap.get(id)?.name ?? 'Uncategorized',
      categoryColor: (id: number) => categoryMap.get(id)?.color ?? '#6B7280',
      categoryIcon: (id: number) => categoryMap.get(id)?.icon ?? 'circle',
      walletName: (id: number | null) => id == null ? 'Unassigned' : walletMap.get(id)?.name ?? 'Unknown',
    }),
    [categoryMap, walletMap],
  )

  const aggregate = useSelectionAggregate(transactions, derivedSelectedIds, aggMeta, filteredIds.length, derived.isMixed)
  const selectionActive = derived.count > 0

  const drag = useDragSelect((id) => api.selectOne(id))
  const panelOpen = selectionActive && !drag.dragging

  const [recatOpen, setRecatOpen] = useState(false)
  const [batchBusy, setBatchBusy] = useState(false)

  const requestBatchDelete = async () => {
    const ids = [...derivedSelectedIds]
    if (ids.length === 0) return
    if (!window.confirm(`Delete ${ids.length} transaction${ids.length === 1 ? '' : 's'}?`)) return
    setBatchBusy(true)
    const failed: number[] = []
    for (const id of ids) {
      const ok = await onDeleteTransaction(id)
      if (!ok) failed.push(id)
    }
    setBatchBusy(false)
    if (failed.length) {
      alert(`${failed.length} couldn't be deleted — try again`)
    } else {
      api.clear()
    }
  }

  const applyRecategorize = async (categoryId: number) => {
    const ids = [...derivedSelectedIds]
    setBatchBusy(true)
    const res = await window.deskflowAPI.financeBatchUpdateCategory(ids, categoryId)
    setBatchBusy(false)
    setRecatOpen(false)
    if (res?.success) {
      api.clear()
    } else {
      alert('Recategorize failed — try again')
    }
  }

  const handleExport = () => {
    const rows = transactions.filter((t) => derivedSelectedIds.has(t.id))
    exportTransactionsCsv(rows, {
      categoryName: (id) => categoryMap.get(id)?.name ?? 'Uncategorized',
      walletName: (id) => (id == null ? 'Unassigned' : walletMap.get(id)?.name ?? 'Unknown'),
      accountName: (id) => accountMap.get(id)?.name ?? 'Account',
    })
  }

  // keyboard shortcuts — scoped to the tab, ignored while typing in an input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      const meta = e.ctrlKey || e.metaKey
      if (meta && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        api.selectAllFiltered()
      } else if (e.key === 'Escape' && selectionActive) {
        api.clear()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectionActive) {
        e.preventDefault()
        requestBatchDelete()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [api, selectionActive])

  const handleDelete = async (id: number) => {
    setDeleting(true);
    await onDeleteTransaction(id);
    setConfirmingDeleteId(null);
    setDeleting(false);
  };

  const handlePasswordDelete = async (id: number) => {
    if (!onVerifyPassword || !deletePassword) return;
    setDeletePasswordError('');
    const valid = await onVerifyPassword(deletePassword);
    if (!valid) {
      setDeletePasswordError('Incorrect password');
      return;
    }
    setDeletePassword('');
    setDeletePasswordTarget(null);
    await handleDelete(id);
  };

  const hasActiveFilters = debouncedSearch || typeFilter !== 'all' || dateStart || dateEnd;

  if (error) {
    return (
      <div className="p-5 space-y-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
          <p className="text-sm text-red-400 mb-2">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-medium transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 p-5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse bg-zinc-800/60 rounded-xl h-14" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <TabHeader
        title="Transactions"
        icon={<ArrowUpRight className="w-4 h-4" />}
      />

      {/* Filter bar — glass card, not full-bleed */}
      <GlassSurface className="p-3 space-y-3">
        {/* Search + type pills */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-zinc-600 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex bg-zinc-800/40 rounded-lg p-0.5 border border-zinc-700/30">
            {typeFilters.map(tf => (
              <button
                key={tf.key}
                onClick={() => setTypeFilter(tf.key)}
                className={`relative px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-150 ${
                  typeFilter === tf.key
                    ? 'bg-zinc-700/60 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          {selectionActive && (
            <button
              type="button"
              onClick={() => api.selectAllFiltered()}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors shrink-0"
            >
              {derived.headerState === 'all' ? 'Deselect all' : `Select all ${filtered.length}`}
            </button>
          )}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-zinc-600 shrink-0" />
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="flex-1 bg-zinc-800/40 border border-zinc-700/30 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-colors"
          />
          <span className="text-[10px] text-zinc-600">to</span>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="flex-1 bg-zinc-800/40 border border-zinc-700/30 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-colors"
          />
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setTypeFilter('all'); setDateStart(''); setDateEnd(''); }}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </GlassSurface>

      {/* Transaction groups */}
      {Object.keys(grouped).length === 0 ? (
        <EmptyState
          icon={<ArrowUpRight className="w-12 h-12" />}
          title={hasActiveFilters ? 'No matches' : 'No transactions yet'}
          description={
            hasActiveFilters
              ? 'Try adjusting your filters'
              : 'Add your first transaction to start tracking'
          }
          action={undefined}
        />
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([dateStr, group]) => (
              <div key={dateStr}>
              {/* Date header — clean separator */}
              <div className="flex items-center justify-between mb-3 px-1 group">
                <div className="flex items-center gap-1.5">
                  <TransactionCheckbox
                    checked={
                      group.txns.every((t) => api.isSelected(t.id)) ? true
                        : group.txns.some((t) => api.isSelected(t.id)) ? 'indeterminate'
                          : false
                    }
                    ariaLabel="Select all in this date group"
                    onToggle={() => api.toggleGroup(group.txns.map((t) => t.id))}
                  />
                  <div className="w-1 h-3 rounded-full bg-zinc-700" />
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    {formatDateLabel(dateStr)}
                  </p>
                </div>
                <p className={`text-[11px] font-semibold tabular-nums ${group.netTotal >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                  {group.netTotal >= 0 ? '+' : ''}{showNumbers ? fc(group.netTotal) : maskNumber(fc(group.netTotal), maskMode, maskFixedValue)}
                </p>
              </div>

              {/* Transaction rows — proper spacing */}
              <div className="flex flex-col gap-3">
                  {group.txns.map(txn => {
                    const cat = getCategory(txn.category_id);
                    const acct = getAccount(txn.account_id);
                    const wallet = getWallet(txn.wallet_id);
                    const tc = typeColors[txn.type] || typeColors.expense;
                    const { onPointerDown, onPointerEnter } = drag.getRowHandlers(txn.id)
                  return (
                    <GlassSurface
                      key={txn.id}
                      interactive
                      onPointerDown={onPointerDown}
                      onPointerEnter={onPointerEnter}
                      onClick={() => {
                        if (drag.wasDragging()) return
                        setDetailTxn(txn)
                      }}
                      className={`!p-3.5 border-l-2 ${tc.border} mx-0.5 transition-all duration-150 group relative`}
                    >
                      {/* Checkbox — absolutely positioned so it NEVER pushes content */}
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10">
                        <TransactionCheckbox
                          checked={api.isSelected(txn.id)}
                          ariaLabel={`Select ${txn.description || txn.type}`}
                          onToggle={(e) => {
                            if (e.shiftKey) api.selectRangeTo(txn.id, visibleOrder)
                            else if (e.ctrlKey || e.metaKey) api.toggleWithCtrl(txn.id)
                            else api.toggleOne(txn.id)
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-3 pl-7">
                        {/* Type icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tc.bg}`}>
                          {txn.type === 'income' && <ArrowUpRight className="w-4 h-4 text-emerald-400" />}
                          {txn.type === 'expense' && <ArrowDownRight className="w-4 h-4 text-red-400" />}
                          {txn.type === 'transfer' && <ArrowLeftRight className="w-4 h-4 text-amber-400" />}
                        </div>

                        {/* Wallet title + description + meta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 truncate">
                            <p className="text-[13px] font-semibold text-zinc-100 truncate">
                              {wallet ? wallet.name : (txn.description || cat?.name || 'Transaction')}
                            </p>
                            {wallet && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                                style={{ backgroundColor: `${WALLET_TYPE_COLOR[wallet.type] || '#6B7280'}18`, color: WALLET_TYPE_COLOR[wallet.type] || '#6B7280' }}>
                                {WALLET_TYPE_LABEL[wallet.type] || wallet.type}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {wallet && txn.description && (
                              <span className="text-[10px] text-zinc-300 truncate max-w-[120px]">
                                {txn.description}
                              </span>
                            )}
                            {cat && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                                {cat.name}
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-600">
                              {acct?.name}
                            </span>
                            {txn.time && (
                              <span className="text-[10px] text-zinc-600">
                                {txn.time}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <p className={`text-[13px] font-semibold tabular-nums shrink-0 ${tc.text}`}>
                          {txn.type === 'income' ? '+' : txn.type === 'expense' ? '-' : ''}
                          {showNumbers ? fc(Math.abs(txn.amount)) : maskNumber(fc(Math.abs(txn.amount)), maskMode, maskFixedValue)}
                        </p>

                        {/* Delete */}
                        <AnimatePresence mode="popLayout">
                          {confirmingDeleteId === txn.id ? (
                            <motion.div
                              key="confirm"
                              initial={{ opacity: 0, x: 4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 4 }}
                              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                              className="flex items-center gap-1.5 shrink-0"
                            >
                              {deletePasswordTarget === txn.id ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="relative">
                                    <input
                                      type="password"
                                      value={deletePassword}
                                      onChange={(e) => { setDeletePassword(e.target.value); setDeletePasswordError(''); }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && deletePassword) handlePasswordDelete(txn.id);
                                        if (e.key === 'Escape') { setDeletePasswordTarget(null); setDeletePassword(''); setDeletePasswordError(''); }
                                      }}
                                      placeholder="Password"
                                      autoFocus
                                      className="w-24 bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-2 py-1 text-[10px] text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                                    />
                                    {deletePasswordError && (
                                      <p className="absolute top-full left-0 text-[9px] text-red-400 mt-0.5 whitespace-nowrap">{deletePasswordError}</p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handlePasswordDelete(txn.id)}
                                    disabled={deleting || !deletePassword}
                                    className="px-2 py-1 rounded-lg text-[10px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40 focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                                  >
                                    {deleting ? '...' : 'Confirm'}
                                  </button>
                                  <button
                                    onClick={() => { setDeletePasswordTarget(null); setDeletePassword(''); setDeletePasswordError(''); }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      if (onVerifyPassword) {
                                        setDeletePasswordTarget(txn.id);
                                        setDeletePassword('');
                                        setDeletePasswordError('');
                                      } else {
                                        handleDelete(txn.id);
                                      }
                                    }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                                  >
                                    <LockIcon className="w-2.5 h-2.5 inline mr-0.5" />
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setConfirmingDeleteId(null)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </motion.div>
                          ) : (
                            <motion.button
                              key="trash"
                              layout
                              onClick={() => setConfirmingDeleteId(txn.id)}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-150 focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </GlassSurface>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <SelectionAggregatePanel
        open={panelOpen}
        data={aggregate}
        currency={displayCurrency}
        busy={batchBusy}
        onClear={api.clear}
        onDelete={requestBatchDelete}
        onRecategorize={() => setRecatOpen(true)}
        onExport={handleExport}
      />

      <BatchRecategorizeModal
        open={recatOpen}
        count={derived.count}
        categories={categories}
        busy={batchBusy}
        onCancel={() => setRecatOpen(false)}
        onConfirm={applyRecategorize}
      />

      <TransactionDetailModal
        transaction={detailTxn}
        accounts={accounts}
        categories={categories}
        wallets={wallets}
        displayCurrency={displayCurrency}
        baseCurrency={baseCurrency}
        onClose={() => setDetailTxn(null)}
        onDelete={onDeleteTransaction}
        onVerifyPassword={onVerifyPassword}
      />
    </div>
  );
}
