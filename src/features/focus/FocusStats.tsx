import { Clock, CheckCircle2, TrendingUp, Flame } from 'lucide-react';
import { GlassCard } from '../../components/GlassCard';
import { NumberTicker } from '../../components/ui/number-ticker';
import type { TodayStats } from './focusHelpers';

interface FocusStatsProps {
  stats: TodayStats;
  streak: number;
}

function completionColor(rate: number): string {
  if (rate >= 75) return 'text-emerald-400';
  if (rate >= 40) return 'text-amber-400';
  return 'text-zinc-400';
}

const minutesFormatter = (v: number) => {
  const m = Math.floor(v / 60);
  const s = Math.round(v % 60);
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

export function FocusStats({ stats, streak }: FocusStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <GlassCard className="p-4">
        <div className="flex items-center gap-1.5 mb-1.5 text-zinc-500">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Focus today</span>
        </div>
        <NumberTicker value={stats.focusSec} formatter={minutesFormatter} className="text-2xl font-bold tabular-nums font-mono text-white" />
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-1.5 mb-1.5 text-zinc-500">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Sessions</span>
        </div>
        <NumberTicker value={stats.completedCount} className="text-2xl font-bold tabular-nums font-mono text-white" />
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-1.5 mb-1.5 text-zinc-500">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Completion</span>
        </div>
        <NumberTicker value={stats.completionRate} suffix="%" className={`text-2xl font-bold tabular-nums font-mono ${completionColor(stats.completionRate)}`} />
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center gap-1.5 mb-1.5 text-zinc-500">
          <Flame className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Streak</span>
        </div>
        <div className="flex items-center gap-1.5">
          <NumberTicker value={streak} className="text-2xl font-bold tabular-nums font-mono text-pink-400" />
          <span className="text-xs text-zinc-500">{streak === 1 ? 'day' : 'days'}</span>
        </div>
      </GlassCard>
    </div>
  );
}
