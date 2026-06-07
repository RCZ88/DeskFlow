import { RefreshCw } from 'lucide-react';
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
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Context Summary</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      {loading ? (
        <div className="py-3">
          <LoadingState variant="spinner" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Unfinished carry-over</span>
            <span className="text-sm font-semibold text-amber-400">{unfinishedCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Completed this week</span>
            <span className="text-sm font-semibold text-emerald-400">{completedThisWeek}</span>
          </div>
          {lastUpdated && (
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
              <span className="text-xs text-zinc-500">Last AI update</span>
              <span className="text-[10px] text-zinc-600">{lastUpdated}</span>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
