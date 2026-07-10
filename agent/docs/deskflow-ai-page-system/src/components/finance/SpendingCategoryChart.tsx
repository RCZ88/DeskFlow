import { useMemo, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Handshake } from 'lucide-react';
import { GlassSurface } from './_fx/GlassSurface';
import { CATEGORY_SPECTRUM } from './_fx/ChartTheme';
import { formatCurrency } from './currency-data';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import type { FinanceSpendingByCategory, FinanceTransaction } from './finance-types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface SpendingCategoryChartProps {
  data: FinanceSpendingByCategory[];
  baseCurrency: string;
  displayCurrency: string;
  convertAmount: (amount: number, from: string, to: string) => number;
  allTransactions?: FinanceTransaction[];
}

export function SpendingCategoryChart({ data, baseCurrency, displayCurrency, convertAmount, allTransactions = [] }: SpendingCategoryChartProps) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [includeFT, setIncludeFT] = useState(false);

  const total = useMemo(() =>
    data.reduce((s, c) => s + convertAmount(c.amount, baseCurrency, displayCurrency), 0),
    [data, baseCurrency, displayCurrency, convertAmount]
  );

  // Compute Follow Through spending by category
  const ftByCategory = useMemo(() => {
    if (!includeFT) return [];
    const ftTxns = allTransactions.filter(t => t.on_behalf_of === 1 && t.type === 'expense');
    const byCat = new Map<number, { name: string; amount: number }>();
    for (const t of ftTxns) {
      const existing = byCat.get(t.category_id);
      const amt = convertAmount(Math.abs(t.amount), baseCurrency, displayCurrency);
      if (existing) {
        existing.amount += amt;
      } else {
        // Try to find category name from the existing data or use generic
        const catData = data.find(d => d.categoryId === t.category_id);
        byCat.set(t.category_id, {
          name: catData?.categoryName ?? `Category ${t.category_id}`,
          amount: amt,
        });
      }
    }
    return Array.from(byCat.values()).sort((a, b) => b.amount - a.amount);
  }, [includeFT, allTransactions, data, baseCurrency, displayCurrency, convertAmount]);

  const chartData = useMemo(() => {
    const items = data.slice(0, 8);
    const datasets: any[] = [{
      data: items.map(c => convertAmount(c.amount, baseCurrency, displayCurrency)),
      backgroundColor: items.map((_, i) => CATEGORY_SPECTRUM[i % CATEGORY_SPECTRUM.length] + 'CC'),
      borderColor: items.map((_, i) => CATEGORY_SPECTRUM[i % CATEGORY_SPECTRUM.length]),
      borderWidth: 1,
      hoverOffset: 8,
    }];

    // Add FT series as separate amber dataset
    if (includeFT && ftByCategory.length > 0) {
      const ftTotal = ftByCategory.reduce((s, c) => s + c.amount, 0);
      datasets.push({
        data: [ftTotal],
        backgroundColor: ['#fbbf24CC'],
        borderColor: ['#fbbf24'],
        borderWidth: 1,
        hoverOffset: 8,
      });
    }

    const labels = items.map(c => c.categoryName);
    if (includeFT && ftByCategory.length > 0) {
      labels.push('Follow Through');
    }

    return { labels, datasets };
  }, [data, baseCurrency, displayCurrency, convertAmount, includeFT, ftByCategory]);

  const totalText = showNumbers
    ? formatCurrency(total, displayCurrency)
    : maskNumber(formatCurrency(total, displayCurrency), maskMode, maskFixedValue);

  return (
    <GlassSurface className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">
          Spending by Category
        </span>
        {allTransactions.some(t => t.on_behalf_of === 1 && t.type === 'expense') && (
          <button
            onClick={() => setIncludeFT(!includeFT)}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition-colors ${
              includeFT
                ? 'bg-amber-400/15 text-amber-400'
                : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <Handshake className="w-3 h-3" />
            {includeFT ? 'Hiding FT' : 'Include Follow Through'}
          </button>
        )}
      </div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-zinc-600 text-xs">
          No spending data this period
        </div>
      ) : (
        <div className="grid grid-cols-[1fr,auto] gap-4 items-center mt-3">
          <div className="relative h-[180px] flex items-center justify-center">
            <Doughnut
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                  legend: { display: false },
                  tooltip: { enabled: false },
                },
                onHover: (_, elements) => {
                  setActiveIndex(elements.length > 0 ? elements[0].index : null);
                },
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold tabular-nums text-white">{totalText}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Spent</span>
            </div>
          </div>

          {chartData && (
            <div className="space-y-1.5">
              {chartData.labels.map((label, i) => {
                const val = chartData.datasets[0].data[i];
                const pct = total > 0 ? (val / total) * 100 : 0;
                const isActive = activeIndex === null || activeIndex === i;
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-2 text-xs transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: CATEGORY_SPECTRUM[i % CATEGORY_SPECTRUM.length] }}
                    />
                    <span className="text-zinc-400 truncate max-w-[80px]">{label}</span>
                    <span className="text-zinc-500 tabular-nums">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </GlassSurface>
  );
}
