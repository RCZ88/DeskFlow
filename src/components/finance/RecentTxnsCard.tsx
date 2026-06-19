import { GlassSurface } from './_fx/GlassSurface';
import { formatCurrency } from './currency-data';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import type { FinanceTransaction } from '../finance/finance-types';

interface RecentTxnsCardProps {
  transactions: FinanceTransaction[];
  displayCurrency: string;
}

export function RecentTxnsCard({ transactions, displayCurrency }: RecentTxnsCardProps) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const recent = transactions.slice(0, 5);

  return (
    <GlassSurface className="p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">
          Recent
        </span>
        <span className="text-[11px] text-zinc-600 cursor-default">View all</span>
      </div>

      {recent.length === 0 ? (
        <p className="text-xs text-zinc-600 py-4 text-center">No activity yet</p>
      ) : (
        recent.map((tx, i) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] rounded-lg -mx-2 px-2 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-200 truncate">{tx.description || 'Transaction'}</p>
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
    </GlassSurface>
  );
}
