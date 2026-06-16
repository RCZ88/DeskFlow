import { RefreshCw, Target, TrendingUp, Clock, Brain } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { LoadingState } from './LoadingState';

interface ContextSummaryCardProps {
  unfinishedCount: number;
  completedThisWeek: number;
  lastUpdated?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export function ContextSummaryCard({ unfinishedCount, completedThisWeek, lastUpdated, loading = false, onRefresh }: ContextSummaryCardProps) {
  return (
    <GlassCard variant="compact" accent="pink">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/15 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-pink-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Context Summary</h3>
          <p className="text-[10px] text-zinc-500">Weekly overview</p>
        </div>
      </div>
      {loading ? (
        <div className="py-3">
          <LoadingState variant="spinner" />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/10 border border-zinc-700/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                <Target className="w-3 h-3 text-amber-400" />
              </div>
              <span className="text-xs text-zinc-400">Carry-over</span>
            </div>
            <span className="text-sm font-semibold text-amber-400">{unfinishedCount}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/10 border border-zinc-700/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-xs text-zinc-400">Done this week</span>
            </div>
            <span className="text-sm font-semibold text-emerald-400">{completedThisWeek}</span>
          </div>
          {lastUpdated && (
            <div className="flex items-center justify-between pt-1 mt-1 border-t border-zinc-800/60">
              <div className="flex items-center gap-1.5">
                <Clock className="w-2.5 h-2.5 text-zinc-600" />
                <span className="text-[10px] text-zinc-600">AI last updated</span>
              </div>
              <span className="text-[10px] text-zinc-600">{lastUpdated}</span>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
