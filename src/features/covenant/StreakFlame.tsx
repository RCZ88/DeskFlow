import { motion, useReducedMotion } from 'framer-motion';
import { Flame } from 'lucide-react';
import type { WarmColorKey } from './types';
import { WARM_COLORS } from './covenantColors';

interface StreakFlameProps {
  streak: number;
  color: WarmColorKey;
  size?: number;
}

const pulseTransition = { duration: 2.4, repeat: Infinity, ease: 'easeInOut' as const };

export function StreakFlame({ streak, color, size = 56 }: StreakFlameProps) {
  const reduce = useReducedMotion();
  const c = WARM_COLORS[color];
  const intensity = Math.min(1, streak / 30);
  const scale = 0.92 + intensity * 0.18;

  const wrapStyle = { width: size, height: size };
  const glowStyle = { background: c.hex, filter: 'blur(10px)' };
  const glowAnimate = {
    opacity: [0.18 + intensity * 0.2, 0.35 + intensity * 0.25, 0.18 + intensity * 0.2],
    scale: [1, 1.12, 1],
  };
  const coreStyle = { width: size * 0.72, height: size * 0.72, background: `${c.hex}22`, border: `1.5px solid ${c.hex}55` };
  const coreAnimate = reduce ? undefined : { scale: [scale, scale * 1.03, scale] };
  const iconStyle = { width: size * 0.36, height: size * 0.36 };

  return (
    <div className="relative flex items-center justify-center" style={wrapStyle}>
      {!reduce && streak > 0 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={glowStyle}
          animate={glowAnimate}
          transition={pulseTransition}
        />
      )}
      <motion.div
        className="relative flex items-center justify-center rounded-full"
        style={coreStyle}
        animate={coreAnimate}
        transition={pulseTransition}
      >
        <Flame
          className={streak > 0 ? c.text : 'text-[var(--text-muted)]'}
          style={iconStyle}
          fill={streak > 0 ? c.hex : 'none'}
          fillOpacity={streak > 0 ? 0.25 : 0}
        />
      </motion.div>
    </div>
  );
}
