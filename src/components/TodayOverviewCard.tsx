import { Clock, Activity, BarChart3, Layers } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { LoadingState } from './LoadingState';

interface TodayOverviewCardProps {
  totalSeconds: number;
  sessionCount: number;
  topApp?: string;
  loading?: boolean;
  error?: string | null;
}

function fmtHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function TodayOverviewCard({ totalSeconds, sessionCount, topApp, loading, error }: TodayOverviewCardProps) {
  return (
    <GlassCard variant="compact" accent="pink">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Today's Overview</h3>
          <p className="text-[10px] text-zinc-500">Tracked activity</p>
        </div>
      </div>
      {loading ? (
        <LoadingState variant="skeleton" rows={2} />
      ) : error ? (
        <p className="text-xs text-zinc-500">Unable to load today's data</p>
      ) : totalSeconds === 0 && sessionCount === 0 ? (
        <p className="text-xs text-zinc-500">Start tracking to see today's overview</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/10 border border-zinc-700/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-3 h-3 text-amber-400" />
              </div>
              <span className="text-xs text-zinc-400">Tracked</span>
            </div>
            <span className="text-sm font-semibold text-amber-400">{fmtHours(totalSeconds)}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/10 border border-zinc-700/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <BarChart3 className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-xs text-zinc-400">Sessions</span>
            </div>
            <span className="text-sm font-semibold text-emerald-400">{sessionCount}</span>
          </div>
          {topApp && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/10 border border-zinc-700/30">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-sky-500/10 flex items-center justify-center">
                  <Layers className="w-3 h-3 text-sky-400" />
                </div>
                <span className="text-xs text-zinc-400">Top app</span>
              </div>
              <span className="text-sm font-semibold text-sky-400 truncate max-w-[140px]">{topApp}</span>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
