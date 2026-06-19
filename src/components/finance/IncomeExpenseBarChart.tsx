import { Bar } from 'react-chartjs-2';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import { formatCurrency as fmtCurrency } from '../finance/currency-data';

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface IncomeExpenseBarChartProps {
  data: MonthlyData[];
  currency: string;
}

const chartTheme = {
  tooltip: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    titleColor: '#e4e4e7',
    bodyColor: '#a1a1aa',
    borderColor: 'rgba(63, 63, 70, 0.5)',
    borderWidth: 1,
    cornerRadius: 8,
    padding: 10,
  },
  ticks: { color: '#71717a', font: { size: 10 } },
  grid: { color: 'rgba(113,113,122,0.08)' },
  border: { color: 'rgba(113,113,122,0.15)' },
};

export function IncomeExpenseBarChart({ data, currency }: IncomeExpenseBarChartProps) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();

  const formatValue = (val: number) => {
    const formatted = fmtCurrency(val, currency);
    return showNumbers ? formatted : maskNumber(formatted, maskMode, maskFixedValue);
  };

  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Income',
        data: data.map(d => d.income),
        backgroundColor: 'rgba(52, 211, 153, 0.7)',
        borderColor: 'rgba(52, 211, 153, 1)',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 20,
      },
      {
        label: 'Expense',
        data: data.map(d => d.expense),
        backgroundColor: 'rgba(248, 113, 113, 0.7)',
        borderColor: 'rgba(248, 113, 113, 1)',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 20,
      },
    ],
  };

  return (
    <div className="h-[200px]">
      <Bar
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...chartTheme.tooltip,
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${formatValue(ctx.parsed.y)}`,
              },
            },
          },
          scales: {
            x: {
              stacked: true,
              ticks: chartTheme.ticks,
              grid: { display: false },
              border: chartTheme.border,
            },
            y: {
              stacked: true,
              ticks: { ...chartTheme.ticks, maxTicksLimit: 5, callback: (val) => formatValue(val as number) },
              grid: chartTheme.grid,
              border: { display: false },
            },
          },
        }}
      />
    </div>
  );
}
