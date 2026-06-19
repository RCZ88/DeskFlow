import { useState, useMemo } from 'react';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Search, Trash2 } from 'lucide-react';
import { GlassCard } from '../GlassCard';
import { SectionHeader } from '../SectionHeader';
import { EmptyState } from '../EmptyState';
import { QuickAddModal } from './QuickAddModal';
import { convertAmount, formatCurrency as fmtCurrency } from './currency-data';
import type { FinanceTransaction, FinanceAccount, FinanceCategory, FinanceWallet } from './finance-types';

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
}

const groupByDate = (txns: FinanceTransaction[]) => {
  const groups: Record<string, FinanceTransaction[]> = {};
  for (const t of txns) {
    const key = t.date || 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }
  return groups;
};

const formatDateLabel = (dateStr: string) => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

export function TransactionsTab({ transactions, accounts, categories, wallets, loading, error, onRetry, displayCurrency, baseCurrency, onAddTransaction, onDeleteTransaction }: TransactionsTabProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const { showNumbers } = useNumberMask();

  const filtered = useMemo(() => {
    let list = transactions;
    if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t => (t.description?.toLowerCase() || '').includes(q));
    }
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, typeFilter, search]);

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
        {[1,2,3,4,5].map(i => (
          <div key={i} className="animate-pulse bg-zinc-800/60 rounded-xl h-14" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-3">
      <SectionHeader
        title="Transactions"
        icon={<ArrowUpRight className="w-4 h-4" />}
        action={
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-medium transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        }
      />

      <div className="sticky top-14 z-elevated bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800/60 py-3 -mx-5 px-5 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'income', 'expense', 'transfer'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors capitalize focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950 ${
                  typeFilter === t ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <EmptyState
          icon={<ArrowUpRight className="w-12 h-12" />}
          title={search || typeFilter !== 'all' ? 'No matches' : 'No transactions'}
          description={
            search || typeFilter !== 'all'
              ? 'Clear your filters and try again'
              : 'Add your first transaction to get started'
          }
          action={search || typeFilter !== 'all' ? undefined : { label: 'Add Transaction', onClick: () => setShowQuickAdd(true) }}
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dateStr, group]) => (
            <div key={dateStr}>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">
                  {formatDateLabel(dateStr)}
                </p>
                  <p className={`text-[10px] font-medium tabular-nums ${group.netTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {group.netTotal >= 0 ? '+' : ''}{showNumbers ? fc(group.netTotal) : maskNumber(fc(group.netTotal))}
                  </p>
              </div>
              <div className="space-y-1">
                {group.txns.map(txn => {
                  const cat = getCategory(txn.category_id);
                  const acct = getAccount(txn.account_id);
                  const isIncome = txn.type === 'income';
                  const isExpense = txn.type === 'expense';
                  const isTransfer = txn.type === 'transfer';
                  return (
                    <GlassCard
                      key={txn.id}
                      variant="default"
                      className={`!p-3 hover:bg-zinc-800/70 transition-all group border-l-2 ${
                        isIncome ? 'border-l-emerald-500/50' :
                        isExpense ? 'border-l-red-500/50' :
                        isTransfer ? 'border-l-amber-500/50' :
                        'border-l-zinc-700/50'
                      } hover:border-l-emerald-500/70`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isIncome ? 'bg-emerald-500/15' :
                          isExpense ? 'bg-red-500/15' :
                          'bg-amber-500/15'
                        }`}>
                          {isIncome ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> :
                           isTransfer ? <ArrowLeftRight className="w-4 h-4 text-amber-400" /> :
                           <ArrowDownRight className="w-4 h-4 text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-white truncate">
                              {txn.description || cat?.name || 'Transaction'}
                            </p>
                            {cat && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                              >
                                {cat.name}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500">
                            {acct?.name}
                            {txn.time && <span> · {txn.time}</span>}
                          </p>
                        </div>
                        <p className={`text-sm font-semibold tabular-nums shrink-0 ${
                          isIncome ? 'text-emerald-400' :
                          isExpense ? 'text-red-400' :
                          'text-amber-400'
                        }`}>
                           {isIncome ? '+' : isExpense ? '-' : ''}{showNumbers ? fc(Math.abs(txn.amount)) : maskNumber(fc(Math.abs(txn.amount)))}
                        </p>
                        {confirmingDeleteId === txn.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={async () => {
                                setDeleting(true);
                                await onDeleteTransaction(txn.id);
                                setConfirmingDeleteId(null);
                                setDeleting(false);
                              }}
                              disabled={deleting}
                              className="px-2 py-1 rounded text-[10px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40 focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                            >
                              {deleting ? '...' : 'Delete'}
                            </button>
                            <button
                              onClick={() => setConfirmingDeleteId(null)}
                              className="px-2 py-1 rounded text-[10px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingDeleteId(txn.id)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showQuickAdd && (
        <QuickAddModal
          open={showQuickAdd}
          onClose={() => setShowQuickAdd(false)}
          accounts={accounts}
          categories={categories}
          wallets={wallets}
          displayCurrency={displayCurrency}
          onSave={onAddTransaction}
        />
      )}
    </div>
  );
}
