import { Brain, DollarSign, Cpu, Wrench } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { LoadingState } from './LoadingState';

interface AiUsageCardProps {
  totalTokens: number;
  totalCost: number;
  toolCount: number;
  topTool?: string;
  loading?: boolean;
  error?: string | null;
}

const fmtNum = (n: number) => { if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'; if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'; if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'; return n.toLocaleString(); };

export function AiUsageCard({ totalTokens, totalCost, toolCount, topTool, loading, error }: AiUsageCardProps) {
  return (
    <GlassCard variant="compact" accent="pink">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
          <Brain className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">AI Usage</h3>
          <p className="text-[10px] text-zinc-500">Today's activity</p>
        </div>
      </div>
      {loading ? (
        <LoadingState variant="skeleton" rows={2} />
      ) : error ? (
        <p className="text-xs text-zinc-500">Unable to load AI usage data</p>
      ) : totalTokens === 0 && totalCost === 0 ? (
        <p className="text-xs text-zinc-500">No AI activity today</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/10 border border-zinc-700/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                <Cpu className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-xs text-zinc-400">Tokens</span>
            </div>
            <span className="text-sm font-semibold text-emerald-400">{fmtNum(totalTokens)}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/10 border border-zinc-700/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                <DollarSign className="w-3 h-3 text-amber-400" />
              </div>
              <span className="text-xs text-zinc-400">Cost</span>
            </div>
            <span className="text-sm font-semibold text-amber-400">${totalCost.toFixed(4)}</span>
          </div>
          {topTool && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-800/10 border border-zinc-700/30">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-pink-500/10 flex items-center justify-center">
                  <Wrench className="w-3 h-3 text-pink-400" />
                </div>
                <span className="text-xs text-zinc-400">Tools ({toolCount})</span>
              </div>
              <span className="text-sm font-semibold text-pink-400 truncate max-w-[140px]">{topTool}</span>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
