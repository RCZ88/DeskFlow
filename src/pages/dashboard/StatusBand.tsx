import { motion } from 'framer-motion';
import { BlurFade } from '../../components/ui/blur-fade';
import { NumberTicker } from '../../components/ui/number-ticker';
import { Zap, Calendar } from 'lucide-react';

function formatTime(ms: number): string {
  if (!ms || !isFinite(ms)) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDate(): string {
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dayNames[now.getDay()]} ${monthNames[now.getMonth()]} ${now.getDate()}`;
}

interface StatusBandProps {
  displayTimeMs: number;
  isCurrentlyProductive: boolean;
  isDistracting: boolean;
  currentAppName: string;
  totalFocusedMs: number;
}

const STATE_COLORS = {
  productive: { text: '#34d399', dot: '#34d399', glow: 'rgba(52, 211, 153, 0.25)' },
  neutral: { text: '#22d3ee', dot: '#22d3ee', glow: 'rgba(34, 211, 238, 0.22)' },
  distracting: { text: '#f87171', dot: '#f87171', glow: 'rgba(248, 113, 113, 0.25)' },
};

export function StatusBand({
  displayTimeMs,
  isCurrentlyProductive,
  isDistracting,
  currentAppName,
  totalFocusedMs,
}: StatusBandProps) {
  const totalMinutes = Math.floor(totalFocusedMs / 1000 / 60);
  const stateKey = isDistracting ? 'distracting' : isCurrentlyProductive ? 'productive' : 'neutral';
  const colors = STATE_COLORS[stateKey];

  return (
    <BlurFade delay={0} duration={0.4}>
      <div className="relative w-full rounded-xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/60 p-5 min-h-[120px] overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <motion.div
            className="absolute"
            style={{
              width: '600px',
              height: '300px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
              filter: 'blur(40px)',
            }}
            animate={{ opacity: [0.6, 0.85, 0.6], scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Content Layer */}
        <div className="relative z-10 flex items-center justify-between gap-4 h-full">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: colors.dot }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span
                className="font-mono font-bold tabular-nums tracking-tight leading-none"
                style={{ fontSize: '48px', color: colors.text, textShadow: `0 0 24px ${colors.glow}` }}
              >
                {formatTime(displayTimeMs)}
              </span>
            </div>
            {currentAppName && (
              <span className="text-[13px] text-zinc-400 font-medium ml-[22px] truncate max-w-[200px]">
                {currentAppName}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              <span className="text-[13px] text-zinc-400">
                <span className="font-mono font-semibold text-zinc-100">
                  <NumberTicker value={totalMinutes} suffix="m" delay={300} duration={1200} />
                </span>
                {' '}focused
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono tabular-nums">
              <Calendar size={10} className="text-zinc-600" />
              {formatDate()}
            </div>
          </div>
        </div>
      </div>
    </BlurFade>
  );
}
