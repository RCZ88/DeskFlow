import { Line } from 'react-chartjs-2';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import { formatCurrency as fmtCurrency } from '../finance/currency-data';

interface NetWorthLineChartProps {
  data: { month: string; value: number }[];
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

export function NetWorthLineChart({ data, currency }: NetWorthLineChartProps) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();

  const formatValue = (val: number) => {
    const formatted = fmtCurrency(val, currency);
    return showNumbers ? formatted : maskNumber(formatted, maskMode, maskFixedValue);
  };

  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Net Worth',
        data: data.map(d => d.value),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#22c55e',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <div className="h-[200px]">
      <Line
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              ...chartTheme.tooltip,
              callbacks: {
                label: (ctx) => formatValue(ctx.parsed.y),
              },
            },
          },
          scales: {
            x: {
              ticks: chartTheme.ticks,
              grid: { display: false },
              border: chartTheme.border,
            },
            y: {
              ticks: { ...chartTheme.ticks, maxTicksLimit: 5, callback: (val) => formatValue(val as number) },
              grid: chartTheme.grid,
              border: { display: false },
            },
          },
          elements: {
            line: {
              tension: 0.3,
            },
          },
        }}
      />
    </div>
  );
}
