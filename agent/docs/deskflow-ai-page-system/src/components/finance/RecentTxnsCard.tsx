import { useState, useMemo } from 'react';
import { GlassSurface } from './_fx/GlassSurface';
import { formatCurrency } from './currency-data';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import { TransactionDetailModal } from './TransactionDetailModal';
import { Handshake } from 'lucide-react';
import type { FinanceTransaction, FinanceAccount, FinanceCategory, FinanceWallet } from '../finance/finance-types';

type TxFilter = 'personal' | 'follow-through' | 'all';

interface RecentTxnsCardProps {
  transactions: FinanceTransaction[];
  displayCurrency: string;
  baseCurrency?: string;
  accounts?: FinanceAccount[];
  categories?: FinanceCategory[];
  wallets?: FinanceWallet[];
  onDeleteTransaction?: (id: number) => Promise<boolean>;
  onVerifyPassword?: (password: string) => Promise<boolean>;
}

export function RecentTxnsCard({
  transactions, displayCurrency, baseCurrency = displayCurrency,
  accounts = [], categories = [], wallets = [],
  onDeleteTransaction, onVerifyPassword,
}: RecentTxnsCardProps) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();
  const [detailTxn, setDetailTxn] = useState<FinanceTransaction | null>(null);
  const [txFilter, setTxFilter] = useState<TxFilter>('personal');

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const filteredTxns = useMemo(() => {
    if (txFilter === 'personal') return transactions.filter(tx => !tx.on_behalf_of);
    if (txFilter === 'follow-through') return transactions.filter(tx => tx.on_behalf_of);
    return transactions;
  }, [transactions, txFilter]);

  const recent = filteredTxns.slice(0, 5);

  const followThroughCount = useMemo(() => transactions.filter(tx => tx.on_behalf_of).length, [transactions]);

  return (
    <GlassSurface className="p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">
          Recent
        </span>
        <span className="text-[11px] text-zinc-600 cursor-default">View all</span>
      </div>

      {/* Follow Through filter toggle */}
      {followThroughCount > 0 && (
        <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl mb-1">
          {([
            { key: 'personal' as TxFilter, label: 'Personal' },
            { key: 'follow-through' as TxFilter, label: 'Follow Through' },
            { key: 'all' as TxFilter, label: 'All' },
          ]).map(opt => (
            <button
              key={opt.key}
              onClick={() => setTxFilter(opt.key)}
              className={`text-[10px] px-2.5 py-1 rounded-full transition-colors whitespace-nowrap ${
                txFilter === opt.key
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {opt.key === 'follow-through' && <Handshake className="w-3 h-3 inline mr-0.5 -mt-0.5" />}
              {opt.label}
              {opt.key === 'follow-through' && followThroughCount > 0 && (
                <span className="ml-1 text-amber-400">({followThroughCount})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {recent.length === 0 ? (
        <p className="text-xs text-zinc-600 py-4 text-center">
          {txFilter === 'personal' ? 'No personal activity yet' : txFilter === 'follow-through' ? 'No follow through activity' : 'No activity yet'}
        </p>
      ) : (
        recent.map((tx, i) => (
          <div
            key={tx.id}
            onClick={() => setDetailTxn(tx)}
            className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] rounded-lg -mx-2 px-2 transition-colors cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-zinc-200 truncate">{tx.description || 'Transaction'}</p>
                {tx.on_behalf_of ? (
                  <Handshake className="w-3 h-3 text-amber-400 shrink-0" title="Follow Through" />
                ) : null}
              </div>
              <p className="text-[11px] text-zinc-500">{getTimeAgo(tx.date)}</p>
            </div>
            <span className={`text-money text-sm font-semibold shrink-0 ${
              (tx.amount ?? 0) >= 0 ? 'text-emerald-400' : 'text-[#fb7185]'
            }`}>
              {(tx.amount ?? 0) >= 0 ? '+' : '−'}
              {showNumbers
                ? formatCurrency(Math.abs(tx.amount ?? 0), displayCurrency)
                : maskNumber(formatCurrency(Math.abs(tx.amount ?? 0), displayCurrency), maskMode, maskFixedValue)}
            </span>
          </div>
        ))
      )}

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
    </GlassSurface>
  );
}
