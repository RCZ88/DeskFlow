import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { BarChart3 } from 'lucide-react';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import { convertAmount } from './currency-data';
import type { FinanceTransaction } from './finance-types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function formatCompact(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toString();
}

function getMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

interface Props {
  transactions: FinanceTransaction[];
  walletId: number;
  displayCurrency: string;
  baseCurrency: string;
  walletColor?: string;
}

export default function WalletMonthlyChart({ transactions, walletId, displayCurrency, baseCurrency, walletColor = '#F97316' }: Props) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();

  const rp = (n: number) => {
    const s = `${getCurrencySymbol(displayCurrency)}${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return showNumbers ? s : maskNumber(s, maskMode, maskFixedValue);
  };

  const { labels, incomeData, expenseData } = useMemo(() => {
    const walletTxns = transactions.filter(
      t => (t.wallet_id === walletId || (t as any).to_wallet_id === walletId) && t.type !== 'transfer'
    );

    if (walletTxns.length === 0) return { labels: [], incomeData: [], expenseData: [] };

    const byMonth = new Map<string, { income: number; expense: number }>();
    for (const t of walletTxns) {
      const ym = t.date.slice(0, 7);
      if (!byMonth.has(ym)) byMonth.set(ym, { income: 0, expense: 0 });
      const entry = byMonth.get(ym)!;
      const converted = convertAmount(Math.abs(t.amount), t.currency || baseCurrency, displayCurrency);
      if (t.type === 'income') entry.income += converted;
      else if (t.type === 'expense') entry.expense += converted;
    }

    const sorted = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    return {
      labels: sorted.map(([ym]) => getMonthLabel(ym)),
      incomeData: sorted.map(([, v]) => v.income),
      expenseData: sorted.map(([, v]) => v.expense),
    };
  }, [transactions, walletId, displayCurrency, baseCurrency]);

  if (labels.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-zinc-500">Monthly Activity</span>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-zinc-600">
          <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
          <span className="text-[11px]">No transactions yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-zinc-500">Monthly Activity</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5 text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Income
          </span>
          <span className="flex items-center gap-1.5 text-zinc-500">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: walletColor }} /> Expense
          </span>
        </div>
      </div>
      <div className="relative w-full h-[160px]">
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: 'Income',
                data: incomeData,
                backgroundColor: 'rgba(16,185,129,0.7)',
                borderRadius: 3,
                borderSkipped: false,
              },
              {
                label: 'Expense',
                data: expenseData,
                backgroundColor: `${walletColor}b3`,
                borderRadius: 3,
                borderSkipped: false,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#71717a', font: { size: 9, family: 'JetBrains Mono' } },
              },
              y: {
                grid: { color: 'rgba(113,113,122,0.06)' },
                ticks: {
                  color: '#71717a',
                  font: { size: 9, family: 'JetBrains Mono' },
                  callback: (v) => formatCompact(Number(v)),
                },
              },
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(24,24,27,0.95)',
                titleColor: '#fff',
                bodyColor: '#a1a1aa',
                borderColor: 'rgba(113,113,122,0.3)',
                borderWidth: 1,
                padding: 8,
                titleFont: { size: 10 },
                bodyFont: { size: 10 },
                callbacks: {
                  label: (ctx) => `${ctx.dataset.label}: ${rp(ctx.parsed.y as number)}`,
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}

function getCurrencySymbol(currency: string): string {
  const map: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', IDR: 'Rp', AUD: 'A$', CAD: 'C$', SGD: 'S$',
  };
  return map[currency] || currency + ' ';
}
