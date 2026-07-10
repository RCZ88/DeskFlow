import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Loader2, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type KpiTrend = { direction: 'up' | 'down'; label: string };

export interface KpiCardProps {
  icon: LucideIcon;
  accent: 'violet' | 'emerald' | 'pink' | 'cyan';
  value: string;
  label: string;
  trend?: KpiTrend;
  loading?: boolean;
  empty?: boolean;
  error?: string;
  onRetry?: () => void;
  delay?: number;
}

const accentMap: Record<string, { stripe: string; iconBg: string; iconColor: string }> = {
  violet: { stripe: 'bg-violet-500/60', iconBg: 'bg-violet-500/12', iconColor: 'text-violet-400' },
  emerald: { stripe: 'bg-emerald-400/60', iconBg: 'bg-emerald-400/12', iconColor: 'text-emerald-400' },
  pink: { stripe: 'bg-pink-500/60', iconBg: 'bg-pink-500/12', iconColor: 'text-pink-400' },
  cyan: { stripe: 'bg-cyan-400/60', iconBg: 'bg-cyan-400/12', iconColor: 'text-cyan-400' },
};

export function KpiCard({ icon: Icon, accent, value, label, trend, loading, empty, error, onRetry, delay = 0 }: KpiCardProps) {
  const ac = accentMap[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="relative overflow-hidden rounded-xl p-4 bg-zinc-900/75 backdrop-blur-xl border border-zinc-800/50 hover:border-zinc-700/60 transition-colors duration-200 min-h-[96px]"
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${ac.stripe}`} />
      <div className="relative z-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className={`w-8 h-8 rounded-lg ${ac.iconBg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${ac.iconColor}`} />
          </div>
          {trend && !loading && !empty && !error && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800/60 text-zinc-400">
              {trend.direction === 'up' ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
              {trend.label}
            </span>
          )}
        </div>
        {loading ? (
          <div className="space-y-1.5">
            <div className="h-6 w-20 bg-zinc-800/60 rounded animate-pulse" />
            <div className="h-3 w-16 bg-zinc-800/40 rounded animate-pulse" />
          </div>
        ) : error ? (
          <button onClick={onRetry} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </button>
        ) : empty ? (
          <>
            <span className="text-2xl font-semibold font-mono text-zinc-600">—</span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 truncate">{label}</span>
          </>
        ) : (
          <>
            <span className="text-2xl font-semibold font-mono text-zinc-100">{value}</span>
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 truncate">{label}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
