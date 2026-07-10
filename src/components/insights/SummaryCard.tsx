import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  onClick?: () => void;
  masked?: boolean;
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
  sparkline?: React.ReactNode;
}

export function SummaryCard({ title, value, subtitle, icon, accentColor, onClick, masked, trend, sparkline }: SummaryCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-4 text-left w-full overflow-hidden group"
    >
      <div className={`absolute inset-0 opacity-[0.03] bg-gradient-to-br ${accentColor}`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${accentColor.split(' ')[0].replace('from-', '').replace('/10', '')}/10`}>
              {icon}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </div>
        {masked ? (
          <div className="text-lg font-bold text-zinc-600 tracking-widest">••••</div>
        ) : (
          <div className="text-lg font-bold text-zinc-100 tabular-nums">{value}</div>
        )}
        {sparkline && (
          <div className="mt-1.5 flex items-center justify-start">{sparkline}</div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-zinc-500">{subtitle}</span>
          {trend && trend.direction !== 'flat' && (
            <span className={`text-[10px] font-medium ${trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {trend.label}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
