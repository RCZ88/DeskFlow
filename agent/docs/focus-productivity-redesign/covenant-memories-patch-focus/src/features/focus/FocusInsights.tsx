import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Sparkles, Clock } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { SectionHeader } from '../../components/SectionHeader';
import type { FocusHistoryRow } from './focusHelpers';
import { computeWeeklyTrend, computeBestHour, computeAvgSessionLength, fmtDuration } from './focusHelpers';

interface FocusInsightsProps {
  history: FocusHistoryRow[];
}

// Bonus section: only renders once there is at least one completed session
// to say something meaningful about -- otherwise it would just be an empty
// chart, which the anti-slop rules explicitly call out as a missing state.
export function FocusInsights({ history }: FocusInsightsProps) {
  const hasCompleted = history.some(h => h.outcome === 'completed');
  const trend = useMemo(() => computeWeeklyTrend(history), [history]);
  const bestHour = useMemo(() => computeBestHour(history), [history]);
  const avgLength = useMemo(() => computeAvgSessionLength(history), [history]);

  if (!hasCompleted) return null;

  const chartData = {
    labels: trend.map(d => d.label),
    datasets: [
      {
        label: 'Focus minutes',
        data: trend.map(d => Math.round(d.focusSec / 60)),
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236,72,153,0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#18181b', borderColor: '#3f3f46', borderWidth: 1, titleColor: '#e4e4e7', bodyColor: '#a1a1aa', padding: 10, cornerRadius: 8 } },
    scales: {
      x: { display: true, grid: { display: false }, ticks: { color: '#71717a', font: { size: 10 } } },
      y: { display: false },
    },
  };

  return (
    <GlassCard>
      <SectionHeader title="Focus insights" icon={<TrendingUp className="w-4 h-4" />} />
      <div className="h-28 mb-4">
        <Line data={chartData} options={chartOptions} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-zinc-800/40 flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Best focus time</p>
            <p className="text-sm font-semibold text-zinc-200">{bestHour ? bestHour.label : 'Not enough data'}</p>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-zinc-800/40 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-pink-400 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Avg session length</p>
            <p className="text-sm font-semibold text-zinc-200">{fmtDuration(avgLength)}</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
