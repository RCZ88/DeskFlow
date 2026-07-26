import { useMemo, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { GlassSurface } from './_fx/GlassSurface';
import { CATEGORY_SPECTRUM } from './_fx/ChartTheme';
import { formatCurrency } from './currency-data';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import type { FinanceSpendingByCategory } from './finance-types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface SpendingCategoryChartProps {
  data: FinanceSpendingByCategory[];
  baseCurrency: string;
  displayCurrency: string;
  convertAmount: (amount: number, from: string, to: string) => number;
}

export function SpendingCategoryChart({ data, baseCurrency, displayCurrency, convertAmount }: SpendingCategoryChartProps) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = useMemo(() =>
    data.reduce((s, c) => s + convertAmount(c.amount, baseCurrency, displayCurrency), 0),
    [data, baseCurrency, displayCurrency, convertAmount]
  );

  const chartData = useMemo(() => {
    const items = data.slice(0, 8);
    return {
      labels: items.map(c => c.categoryName),
      datasets: [{
        data: items.map(c => convertAmount(c.amount, baseCurrency, displayCurrency)),
        backgroundColor: items.map((_, i) => CATEGORY_SPECTRUM[i % CATEGORY_SPECTRUM.length] + 'CC'),
        borderColor: items.map((_, i) => CATEGORY_SPECTRUM[i % CATEGORY_SPECTRUM.length]),
        borderWidth: 1,
        hoverOffset: 8,
      }],
    };
  }, [data, baseCurrency, displayCurrency, convertAmount]);

  const totalText = showNumbers
    ? formatCurrency(total, displayCurrency)
    : maskNumber(formatCurrency(total, displayCurrency), maskMode, maskFixedValue);

  return (
    <GlassSurface className="p-5">
      <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">
        Spending by Category
      </span>
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
