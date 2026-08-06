import { Clock, CheckCircle2, TrendingUp, Flame } from 'lucide-react';
import { GlareHover } from '../../components/ui/glare-hover';
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
      <GlareHover color="#38bdf8" opacity={0.2} angle={-30} className="rounded-xl bg-zinc-900/95 border border-zinc-800/60 p-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
            <Clock className="w-3 h-3" />
          </span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Focus today</span>
        </div>
        <NumberTicker value={stats.focusSec} formatter={minutesFormatter} className="text-2xl font-bold tabular-nums font-mono text-white" />
      </GlareHover>

      <GlareHover color="#34d399" opacity={0.2} angle={-30} className="rounded-xl bg-zinc-900/95 border border-zinc-800/60 p-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
            <CheckCircle2 className="w-3 h-3" />
          </span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Sessions</span>
        </div>
        <NumberTicker value={stats.completedCount} className="text-2xl font-bold tabular-nums font-mono text-white" />
      </GlareHover>

      <GlareHover color="#f59e0b" opacity={0.2} angle={-30} className="rounded-xl bg-zinc-900/95 border border-zinc-800/60 p-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            <TrendingUp className="w-3 h-3" />
          </span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Completion</span>
        </div>
        <NumberTicker value={stats.completionRate} suffix="%" className={`text-2xl font-bold tabular-nums font-mono ${completionColor(stats.completionRate)}`} />
      </GlareHover>

      <GlareHover color="#ec4899" opacity={0.2} angle={-30} className="rounded-xl bg-zinc-900/95 border border-zinc-800/60 p-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899' }}>
            <Flame className="w-3 h-3" />
          </span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Streak</span>
        </div>
        <div className="flex items-center gap-1.5">
          <NumberTicker value={streak} className="text-2xl font-bold tabular-nums font-mono text-pink-400" />
          <span className="text-xs text-zinc-500">{streak === 1 ? 'day' : 'days'}</span>
        </div>
      </GlareHover>
    </div>
  );
}
