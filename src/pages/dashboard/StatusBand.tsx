import { motion } from 'framer-motion';
import { AuroraText } from '../../components/ui/aurora-text';
import { NumberTicker } from '../../components/ui/number-ticker';
import { Flame, Trophy, Moon, Zap } from 'lucide-react';

function formatTime(ms: number): string {
  if (!ms || !isFinite(ms)) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface StatusBadgeProps {
  icon: React.ReactNode;
  label: string;
  color: 'pink' | 'amber' | 'rose' | 'zinc';
}

function StatusBadge({ icon, label, color }: StatusBadgeProps) {
  const colorMap: Record<string, string> = {
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    zinc: 'bg-zinc-800/50 text-zinc-400 border-zinc-700/30',
  };
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${colorMap[color]}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

interface StatusBandProps {
  displayTimeMs: number;
  isCurrentlyProductive: boolean;
  isDistracting: boolean;
  currentAppName: string;
  productivityScore: number;
  streak: number;
  bestDay: string;
  sleepDebt: number;
}

export function StatusBand({
  displayTimeMs,
  isCurrentlyProductive,
  isDistracting,
  currentAppName,
  productivityScore,
  streak,
  bestDay,
  sleepDebt,
}: StatusBandProps) {
  const isActive = isCurrentlyProductive || isDistracting;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-xl overflow-hidden mb-4
        bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
        border border-[rgba(63,63,70,0.50)]
        hover:border-[rgba(82,82,91,0.80)]
        transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]"
    >
      {/* Subtle pink glow */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-20
        bg-pink-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      {/* Top edge highlight */}
      <div className="absolute top-0 left-4 right-4 h-px
        bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />

      <div className="relative p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* LEFT: Mini Timer */}
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            isCurrentlyProductive ? 'bg-emerald-400' :
            isDistracting ? 'bg-rose-400' :
            'bg-zinc-500'
          } ${isActive ? 'animate-pulse' : ''}`} />
          <div className="flex items-baseline gap-2">
            <AuroraText
              colors={
                isDistracting
                  ? ['#ef4444', '#f87171', '#dc2626', '#ef4444']
                  : isCurrentlyProductive
                    ? ['#10b981', '#34d399', '#059669', '#10b981']
                    : ['#3b82f6', '#60a5fa', '#2563eb', '#3b82f6']
              }
              speed={0.5}
            >
              <span className="text-xl font-mono font-semibold tracking-tight">
                {formatTime(displayTimeMs)}
              </span>
            </AuroraText>
            {currentAppName && (
              <span className="text-[11px] text-zinc-500 hidden sm:inline truncate max-w-[120px]">
                {currentAppName}
              </span>
            )}
          </div>
        </div>

        {/* CENTER: Productivity Score */}
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-1.5">
            <NumberTicker
              value={Math.round(productivityScore)}
              className="text-3xl font-mono font-bold text-[#f4f4f5]"
            />
            <span className="text-sm text-zinc-500">/100</span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-0.5">
            {productivityScore >= 80 ? 'On fire' :
             productivityScore >= 60 ? 'Good pace' :
             productivityScore >= 40 ? 'Keep going' : 'Focus up'}
          </span>
        </div>

        {/* RIGHT: Summary Badges */}
        <div className="flex items-center gap-2">
          <StatusBadge icon={<Flame size={11} />} label={`${streak}d streak`} color="pink" />
          <StatusBadge icon={<Trophy size={11} />} label={bestDay} color="amber" />
          <StatusBadge
            icon={<Moon size={11} />}
            label={`${sleepDebt}h debt`}
            color={sleepDebt > 2 ? 'rose' : 'zinc'}
          />
        </div>
      </div>
    </motion.div>
  );
}
