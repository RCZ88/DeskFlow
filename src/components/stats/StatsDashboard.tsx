import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Tooltip, Legend,
} from 'chart.js';
import { motion, useReducedMotion } from 'framer-motion';
import { BarChart3, Loader2, AlertCircle } from 'lucide-react';
import { KpiRow, type KpiData } from './KpiRow';
import { deriveStats, type AnalyticsRawData, type DerivedStats } from './deriveStats';
import { cn } from '../../lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CHART_COLORS = [
  'rgba(168, 85, 247, 0.65)', 'rgba(34, 211, 238, 0.65)', 'rgba(52, 211, 153, 0.65)',
  'rgba(251, 113, 133, 0.65)', 'rgba(245, 158, 11, 0.65)', 'rgba(96, 165, 250, 0.65)',
  'rgba(129, 140, 248, 0.65)', 'rgba(251, 146, 60, 0.65)',
];

const CHART_BORDERS = [
  'rgba(168, 85, 247, 1)', 'rgba(34, 211, 238, 1)', 'rgba(52, 211, 153, 1)',
  'rgba(251, 113, 133, 1)', 'rgba(245, 158, 11, 1)', 'rgba(96, 165, 250, 1)',
  'rgba(129, 140, 248, 1)', 'rgba(251, 146, 60, 1)',
];

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  animation: { duration: 600, easing: 'easeOutQuart' as const },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(9, 9, 11, 0.95)',
      titleColor: '#f4f4f5',
      bodyColor: '#a1a1aa',
      borderColor: 'rgba(39, 39, 42, 0.8)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: { top: 10, bottom: 10, left: 14, right: 14 },
      titleFont: { weight: '600' as const, size: 13 },
      bodyFont: { size: 12 },
      displayColors: true,
      boxPadding: 4,
      callbacks: {
        label: (ctx: any) => {
          const val = ctx.parsed?.x ?? ctx.raw ?? 0;
          if (val >= 1e9) return ` ${(val / 1e9).toFixed(1)}B`;
          if (val >= 1e6) return ` ${(val / 1e6).toFixed(1)}M`;
          if (val >= 1e3) return ` ${(val / 1e3).toFixed(1)}K`;
          return ` ${val}`;
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        color: '#71717a',
        font: { size: 10 },
        padding: 8,
        callback: (v: any) => {
          if (v >= 1e9) return (v / 1e9).toFixed(0) + 'B';
          if (v >= 1e6) return (v / 1e6).toFixed(0) + 'M';
          if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
          return String(v);
        },
      },
      grid: { color: 'rgba(39,39,42,0.5)', drawTicks: false },
      border: { display: false },
    },
    y: {
      ticks: {
        color: '#a1a1aa',
        font: { size: 11, weight: '500' as const },
        padding: 8,
      },
      grid: { display: false },
      border: { display: false },
    },
  },
};

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
    totalTokensNum: stats?.totalTokensNum || 0,
    totalCostNum: stats?.totalCostNum || 0,
    activeSessionsNum: stats?.activeSessionsNum || 0,
    toolsModelsNum: stats?.toolsModelsNum || 0,
    loading,
    empty: isEmpty,
    error,
    onRetry,
  };

  const tokenChartData = useMemo(() => {
    if (!stats || !stats.tokensByTool.labels.length) return null;
    const labels = stats.tokensByTool.labels.map(l => {
      const map: Record<string, string> = {
        'claude-code': 'Claude Code',
        'opencode': 'OpenCode',
        'cursor': 'Cursor',
        'gemini': 'Gemini',
        'codex': 'Codex',
        'qwen': 'Qwen',
        'aider': 'Aider',
        'kilocode': 'KiloCode',
      };
      return map[l] || l;
    });
    return {
      labels,
      datasets: [{
        data: stats.tokensByTool.values,
        backgroundColor: stats.tokensByTool.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderColor: stats.tokensByTool.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]),
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.75,
        categoryPercentage: 0.8,
      }],
    };
  }, [stats]);

  const sessionChartData = useMemo(() => {
    if (!stats || !stats.sessionsByAgent.labels.length) return null;
    const labels = stats.sessionsByAgent.labels.map(l => {
      const map: Record<string, string> = {
        'claude-code': 'Claude Code',
        'opencode': 'OpenCode',
        'cursor': 'Cursor',
        'gemini': 'Gemini',
        'codex': 'Codex',
        'qwen': 'Qwen',
        'aider': 'Aider',
        'kilocode': 'KiloCode',
      };
      return map[l] || l;
    });
    return {
      labels,
      datasets: [{
        data: stats.sessionsByAgent.values,
        backgroundColor: stats.sessionsByAgent.labels.map((_, i) => CHART_COLORS[(i + 1) % CHART_COLORS.length]),
        borderColor: stats.sessionsByAgent.labels.map((_, i) => CHART_BORDERS[(i + 1) % CHART_BORDERS.length]),
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.75,
        categoryPercentage: 0.8,
      }],
    };
  }, [stats]);

  return (
    <div className="space-y-3">
      <KpiRow data={kpiData} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <BarChartCard
          title="Tokens by Tool"
          loading={loading}
          empty={isEmpty}
          error={error}
          onRetry={onRetry}
          chartData={tokenChartData}
          delay={0.2}
        />
        <BarChartCard
          title="Sessions by Agent"
          loading={loading}
          empty={isEmpty}
          error={error}
          onRetry={onRetry}
          chartData={sessionChartData}
          delay={0.25}
        />
      </div>
    </div>
  );
}

function BarChartCard({
  title,
  loading,
  empty,
  error,
  onRetry,
  chartData,
  delay = 0,
}: {
  title: string;
  loading?: boolean;
  empty?: boolean;
  error?: string;
  onRetry?: () => void;
  chartData: any;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative overflow-hidden rounded-xl p-5 bg-[rgba(24,24,27,0.60)] backdrop-blur-xl border border-[rgba(63,63,70,0.50)] min-h-[200px] flex flex-col hover:border-zinc-600/60 transition-colors duration-200"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative">
        <h3 className="text-[13px] font-semibold text-zinc-200">{title}</h3>
        <div className="w-8 h-8 rounded-lg bg-zinc-800/60 flex items-center justify-center ring-1 ring-zinc-700/40">
          <BarChart3 className="w-4 h-4 text-zinc-500" />
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
              <span className="text-[11px] text-zinc-600">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <AlertCircle className="w-5 h-5 text-red-400/70" />
            <button
              onClick={onRetry}
              className="text-xs text-red-400/80 hover:text-red-300 transition-colors"
            >
              {error}
            </button>
          </div>
        ) : empty || !chartData ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-zinc-600">No data available</span>
          </div>
        ) : (
          <Bar data={chartData} options={barOptions as any} />
        )}
      </div>
    </motion.div>
  );
}

export { deriveStats };
export type { AnalyticsRawData, DerivedStats };
