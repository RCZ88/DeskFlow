import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Tooltip, Legend,
} from 'chart.js';
import { KpiRow, type KpiData } from './KpiRow';
import { ChartsSection } from './ChartsSection';
import { deriveStats, type AnalyticsRawData, type DerivedStats } from './deriveStats';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(24, 24, 27, 0.95)',
      titleColor: '#e4e4e7',
      bodyColor: '#a1a1aa',
      borderColor: 'rgba(63, 63, 70, 0.5)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
    },
  },
  scales: {
    x: {
      ticks: { color: '#71717a', font: { size: 10 } },
      grid: { color: 'rgba(113,113,122,0.08)' },
      border: { color: 'rgba(113,113,122,0.15)' },
    },
    y: {
      beginAtZero: true,
      ticks: { color: '#71717a', font: { size: 10 } },
      grid: { color: 'rgba(113,113,122,0.08)' },
      border: { color: 'rgba(113,113,122,0.15)' },
    },
  },
};

const CHART_COLORS = [
  'rgba(168, 85, 247, 0.8)', 'rgba(34, 211, 238, 0.8)', 'rgba(52, 211, 153, 0.8)',
  'rgba(251, 113, 133, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(96, 165, 250, 0.8)',
  'rgba(129, 140, 248, 0.8)', 'rgba(251, 146, 60, 0.8)',
];

interface StatsDashboardProps {
  rawData?: AnalyticsRawData | null;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function StatsDashboard({ rawData, loading, error, onRetry }: StatsDashboardProps) {
  const stats = useMemo(() => {
    if (!rawData) return null;
    return deriveStats(rawData);
  }, [rawData]);

  const isEmpty = !loading && !error && stats && !stats.hasData;

  const kpiData: KpiData = {
    totalTokens: stats?.totalTokens || '—',
    totalCost: stats?.totalCost || '—',
    activeSessions: stats?.activeSessions || '—',
    toolsModels: stats?.toolsModels || '—',
    loading,
    empty: isEmpty,
    error,
    onRetry,
  };

  const tokenChartData = useMemo(() => {
    if (!stats || !stats.tokensByTool.labels.length) return null;
    return {
      labels: stats.tokensByTool.labels,
      datasets: [{
        data: stats.tokensByTool.values,
        backgroundColor: stats.tokensByTool.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderRadius: 4,
        barPercentage: 0.65,
      }],
    };
  }, [stats]);

  const sessionChartData = useMemo(() => {
    if (!stats || !stats.sessionsByAgent.labels.length) return null;
    return {
      labels: stats.sessionsByAgent.labels,
      datasets: [{
        data: stats.sessionsByAgent.values,
        backgroundColor: stats.sessionsByAgent.labels.map((_, i) => CHART_COLORS[(i + 1) % CHART_COLORS.length]),
        borderRadius: 4,
        barPercentage: 0.65,
      }],
    };
  }, [stats]);

  return (
    <div className="space-y-3">
      <KpiRow data={kpiData} />
      <ChartsSection>
        <BarChartCard title="Tokens by Tool" loading={loading} empty={isEmpty} error={error} onRetry={onRetry} chartData={tokenChartData} />
        <BarChartCard title="Sessions by Agent" loading={loading} empty={isEmpty} error={error} onRetry={onRetry} chartData={sessionChartData} />
      </ChartsSection>
    </div>
  );
}

function BarChartCard({ title, loading, empty, error, onRetry, chartData }: {
  title: string;
  loading?: boolean;
  empty?: boolean;
  error?: string;
  onRetry?: () => void;
  chartData: any;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl p-4 bg-zinc-900/75 backdrop-blur-xl border border-zinc-800/50 min-h-[260px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        <BarChart3 className="w-4 h-4 text-zinc-600" />
      </div>
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <button onClick={onRetry} className="text-xs text-red-400 hover:text-red-300">{error}</button>
          </div>
        ) : empty || !chartData ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-zinc-600">No data available</span>
          </div>
        ) : (
          <Bar data={chartData} options={barOptions as any} />
        )}
      </div>
    </div>
  );
}

import { Loader2, AlertCircle, BarChart3 } from 'lucide-react';

export { deriveStats };
export type { AnalyticsRawData, DerivedStats };
