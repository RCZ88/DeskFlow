import { type LucideIcon, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { MOTION } from './tokens';
import { useCountUp } from '../../hooks/useCountUp';

type AccentKey = 'pink' | 'emerald' | 'amber' | 'violet' | 'red';

interface MetricCardProps {
  accent: AccentKey;
  icon: LucideIcon;
  label: string;
  value: number;
  valueUnit?: string;
  valueFormatter?: (n: number) => string;
  children?: React.ReactNode;
  loading: boolean;
  error?: string | null;
  updatedAt: number;
  onRefresh?: () => void;
  countUp?: boolean;
}

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m ago`;
}

export function MetricCard({
  accent, icon: Icon, label, value, valueUnit, valueFormatter,
  children, loading, error, updatedAt, onRefresh, countUp = true,
}: MetricCardProps) {
  const displayed = useCountUp(value, 400, countUp && !loading);
  const fmt = valueFormatter ?? ((n: number) => n.toLocaleString());
  const isStale = Date.now() - updatedAt > 120_000;

  return (
    <GlassCard accent={accent} className="group">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-6 h-6 rounded-lg grid place-items-center shrink-0"
          style={{
            background: accent === 'pink' ? 'rgba(244,114,182,0.1)' :
                        accent === 'violet' ? 'rgba(167,139,250,0.1)' :
                        accent === 'emerald' ? 'rgba(16,185,129,0.1)' :
                        'rgba(245,158,11,0.1)',
          }}
        >
          <Icon className="w-3.5 h-3.5"
            style={{
              color: accent === 'pink' ? '#f472b6' :
                     accent === 'violet' ? '#a78bfa' :
                     accent === 'emerald' ? '#10b981' :
                     '#f59e0b',
            }}
          />
        </div>
        <span className="text-[11px] uppercase tracking-wide text-zinc-500 font-medium">{label}</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-7 w-24 rounded bg-zinc-800/60" />
          <div className="h-3 w-32 rounded bg-zinc-800/40" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{error}</span>
          {onRefresh && (
            <button onClick={onRefresh} className="text-pink-400 hover:text-pink-300 underline ml-auto">Retry</button>
          )}
        </div>
      ) : value === 0 && !children ? (
        <p className="text-xs text-zinc-500">No data yet</p>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[28px] font-semibold tabular-nums text-zinc-100 leading-none">
              {fmt(displayed)}
            </span>
            {valueUnit && (
              <span className="text-xs text-zinc-500 font-medium">{valueUnit}</span>
            )}
          </div>
          {children && <div className="mt-1.5">{children}</div>}
        </>
      )}

      <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-zinc-800/40">
        {isStale ? (
          <span className="flex items-center gap-1 text-[10px] text-amber-500/80">
            <Clock className="w-2.5 h-2.5" />
            Updated {timeAgo(updatedAt)}
          </span>
        ) : (
          <span className="text-[10px] text-zinc-600">{timeAgo(updatedAt)}</span>
        )}
      </div>
    </GlassCard>
  );
}
