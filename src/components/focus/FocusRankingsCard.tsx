import { useState } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { SectionHeader } from '../../components/SectionHeader';
import { BarChart3, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface FocusRankingsCardProps {
  rankings: {
    todayBest: number;
    todayTotal: number;
    weekBest: number;
    weekTotal: number;
    allTimeBest: number;
  };
}

export function FocusRankingsCard({ rankings }: FocusRankingsCardProps) {
  const [period, setPeriod] = useState<'today' | 'week' | 'all'>('today');

  const fmtSec = (s: number) => Math.round(s / 60) + 'm';

  const current = period === 'today'
    ? { label: 'Today', best: rankings.todayBest, total: rankings.todayTotal }
    : period === 'week'
    ? { label: 'Week', best: rankings.weekBest, total: rankings.weekTotal }
    : { label: 'All Time', best: rankings.allTimeBest, total: rankings.allTimeBest };

  return (
    <GlassCard>
      <SectionHeader
        title="Focus Rankings"
        icon={<BarChart3 className="w-4 h-4" />}
        action={
          <div className="flex gap-1">
            {(['today', 'week', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  period === p
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-zinc-800/40 text-zinc-500 hover:bg-zinc-700'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'All'}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Best</div>
          <div className="text-xl font-bold text-emerald-500">{fmtSec(current.best)}</div>
          <div className="text-[10px] text-zinc-600 mt-1">of {fmtSec(current.total)} total</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Sessions</div>
          <div className="text-xl font-bold text-amber-500">--</div>
          <div className="text-[10px] text-zinc-600 mt-1">count</div>
        </div>
      </div>
    </GlassCard>
  );
}