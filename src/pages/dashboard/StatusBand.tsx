import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'motion/react';
import { BlurFade } from '../../components/ui/blur-fade';
import { NumberTicker } from '../../components/ui/number-ticker';
import { AnimatedShinyText } from '../../components/ui/animated-shiny-text';
import { BorderBeam } from '../../components/ui/border-beam';
import { Zap, Calendar, Play, Pause, Globe, Monitor, Sparkles } from 'lucide-react';

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
  browserName?: string;
  isInBrowser?: boolean;
  onStartFocus?: () => void;
  isPaused?: boolean;
}

const STATE_COLORS = {
  productive: { 
    text: '#34d399', 
    dot: '#34d399', 
    glow: 'rgba(52, 211, 153, 0.08)',
    gradientFrom: '#34d399',
    gradientTo: '#10b981',
    borderFrom: 'rgba(52, 211, 153, 0.12)',
    borderTo: 'rgba(16, 185, 129, 0.03)',
  },
  neutral: { 
    text: '#22d3ee', 
    dot: '#22d3ee', 
    glow: 'rgba(34, 211, 238, 0.08)',
    gradientFrom: '#22d3ee',
    gradientTo: '#06b6d4',
    borderFrom: 'rgba(34, 211, 238, 0.12)',
    borderTo: 'rgba(6, 182, 212, 0.03)',
  },
  distracting: { 
    text: '#f87171', 
    dot: '#f87171', 
    glow: 'rgba(248, 113, 113, 0.08)',
    gradientFrom: '#f87171',
    gradientTo: '#ef4444',
    borderFrom: 'rgba(248, 113, 113, 0.12)',
    borderTo: 'rgba(239, 68, 68, 0.03)',
  },
};

export function StatusBand({
  displayTimeMs,
  isCurrentlyProductive,
  isDistracting,
  currentAppName,
  totalFocusedMs,
  browserName,
  isInBrowser,
  onStartFocus,
  isPaused,
}: StatusBandProps) {
  const totalMinutes = Math.floor(totalFocusedMs / 1000 / 60);
  const stateKey = isDistracting ? 'distracting' : isCurrentlyProductive ? 'productive' : 'neutral';
  const colors = STATE_COLORS[stateKey];

  // Mouse spotlight effect using motion values (from Magic UI's MagicCard)
  const gradientSize = 250;
  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);

  // Smooth spring for the orb effect
  const orbX = useSpring(mouseX, { stiffness: 250, damping: 30, mass: 0.6 });
  const orbY = useSpring(mouseY, { stiffness: 250, damping: 30, mass: 0.6 });
  const orbVisible = useSpring(0, { stiffness: 300, damping: 35 });

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY]
  );

  const handlePointerEnter = useCallback(() => {
    orbVisible.set(0.8);
  }, [orbVisible]);

  const handlePointerLeave = useCallback(() => {
    orbVisible.set(0);
    mouseX.set(-gradientSize);
    mouseY.set(-gradientSize);
  }, [mouseX, mouseY, orbVisible]);

  return (
    <BlurFade delay={0} duration={0.4}>
      <motion.div
        className="relative w-full rounded-xl bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/60 p-5 min-h-[120px] overflow-hidden cursor-pointer"
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{
          background: useMotionTemplate`
            linear-gradient(#18181b 0 0) padding-box,
            radial-gradient(${gradientSize}px circle at ${orbX}px ${orbY}px,
              ${colors.gradientFrom},
              ${colors.gradientTo},
              #27272a 100%
            ) border-box
          `,
        }}
      >
        {/* Mouse-following glow orb */}
        <motion.div
          className="pointer-events-none absolute z-30"
          style={{
            width: 300,
            height: 300,
            x: orbX,
            y: orbY,
            translateX: '-50%',
            translateY: '-50%',
            borderRadius: 9999,
            filter: 'blur(60px)',
            opacity: orbVisible,
            background: `linear-gradient(135deg, ${colors.gradientFrom}, ${colors.gradientTo})`,
            mixBlendMode: 'screen',
            willChange: 'transform, opacity',
          }}
        />

        {/* Background ambient glow */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
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

        {/* Border beam for active states */}
        {(isCurrentlyProductive || isDistracting) && (
          <BorderBeam 
            size={200} 
            duration={12} 
            colorFrom={colors.gradientFrom} 
            colorTo={colors.gradientTo} 
          />
        )}

        {/* Content Layer */}
        <div className="relative z-40 flex items-center justify-between gap-4 h-full">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {/* Animated dot */}
              <motion.div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: colors.dot }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              {/* Timer display with animated gradient text */}
              <div className="font-mono font-bold tabular-nums tracking-tight leading-none" style={{ fontSize: '48px' }}>
                <AnimatedShinyText 
                  className="inline-block"
                  style={{ color: colors.text, textShadow: `0 0 24px ${colors.glow}` }}
                >
                  {formatTime(displayTimeMs)}
                </AnimatedShinyText>
              </div>
            </div>
            
            {/* Current app/website display */}
            {currentAppName && (
              <div className="flex items-center gap-2 ml-[22px]">
                {isInBrowser ? (
                  <Globe size={12} className="text-zinc-500 shrink-0" />
                ) : (
                  <Monitor size={12} className="text-zinc-500 shrink-0" />
                )}
                <span className="text-[13px] text-zinc-400 font-medium truncate max-w-[200px]">
                  {currentAppName}
                </span>
                {isInBrowser && browserName && (
                  <span className="text-[10px] text-zinc-600 px-1.5 py-0.5 rounded bg-zinc-800/50 border border-zinc-700/30">
                    {browserName}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Focus time with number ticker */}
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              <span className="text-[13px] text-zinc-400">
                <span className="font-mono font-semibold text-zinc-100">
                  <NumberTicker value={totalMinutes} suffix="m" delay={300} duration={1200} />
                </span>
                {' '}focused
              </span>
            </div>
            
            {/* Date display */}
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono tabular-nums">
              <Calendar size={10} className="text-zinc-600" />
              {formatDate()}
            </div>

            {/* Focus session CTA */}
            {onStartFocus && !isPaused && (
              <motion.button
                onClick={onStartFocus}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-[11px] font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Play size={10} />
                Start Focus
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </BlurFade>
  );
}
