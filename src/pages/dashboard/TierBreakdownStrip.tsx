import { motion } from 'framer-motion';
import { CheckCircle2, MinusCircle, XCircle, Clock, TrendingUp, Activity } from 'lucide-react';
import { NumberTicker } from '../../components/ui/number-ticker';

interface TierStat {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  showBar?: boolean;
  isTicker?: boolean;
  isTrend?: boolean;
}

interface TierBreakdownStripProps {
  productiveHours: number;
  neutralHours: number;
  distractingHours: number;
  totalHours: number;
  score: number;
  trendValue: string;
  trendPositive: boolean;
}

export function TierBreakdownStrip({
  productiveHours,
  neutralHours,
  distractingHours,
  totalHours,
  score,
  trendValue,
  trendPositive,
}: TierBreakdownStripProps) {
  const stats: TierStat[] = [
    { label: 'Productive', value: productiveHours, color: '#34d399', icon: <CheckCircle2 size={14} />, showBar: true },
    { label: 'Neutral', value: neutralHours, color: '#fbbf24', icon: <MinusCircle size={14} />, showBar: true },
    { label: 'Distracting', value: distractingHours, color: '#f87171', icon: <XCircle size={14} />, showBar: true },
    { label: 'Total', value: totalHours, color: '#a1a1aa', icon: <Clock size={14} />, showBar: false },
    { label: 'Score', value: Math.round(score), color: '#ec4899', icon: <TrendingUp size={14} />, isTicker: true },
    { label: 'Trend', value: 0, color: trendPositive ? '#34d399' : '#f87171', icon: <Activity size={14} />, isTrend: true },
  ];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-xl p-3
            bg-[rgba(24,24,27,0.60)] backdrop-blur-xl
            border border-zinc-800/40
            hover:border-[rgba(255,255,255,0.08)]
            hover:-translate-y-0.5 transition-all duration-250">

          <div className="absolute top-0 left-3 right-3 h-px opacity-40 pointer-events-none"
            style={{ background: `linear-gradient(to right, transparent, ${stat.color}, transparent)` }} />

          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ color: stat.color }}>{stat.icon}</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
              {stat.label}
            </span>
          </div>

          <div className="flex items-baseline gap-1">
            {stat.isTicker ? (
              <NumberTicker value={stat.value} className="text-xl font-mono font-bold text-white" />
            ) : stat.isTrend ? (
              <span className="text-xl font-mono font-bold" style={{ color: stat.color }}>
                {trendValue}
              </span>
            ) : (
              <span className="text-xl font-mono font-bold text-white">
                {stat.value.toFixed(1)}
              </span>
            )}
            {!stat.isTicker && !stat.isTrend && (
              <span className="text-[11px] text-zinc-600">h</span>
            )}
          </div>

          {stat.showBar && (
            <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: stat.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(stat.value / Math.max(totalHours, 1)) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
              />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
