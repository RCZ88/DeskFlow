import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { FocusEmber } from './FocusEmber';
import { GlassCard } from '../GlassCard';
import { Target, Zap } from 'lucide-react';

interface GoalRingProps {
  current: number;
  goal: number;
  unit?: string;
  label?: string;
  boost?: boolean;
}

export function GoalRing({ current, goal, unit = 'min', label = 'Today\'s Focus', boost = false }: GoalRingProps) {
  const reduce = useReducedMotion();
  const safeCurrent = typeof current === 'number' && !Number.isNaN(current) ? current : 0;
  const safeGoal = typeof goal === 'number' && !Number.isNaN(goal) && goal > 0 ? goal : 1;
  const pct = Math.min(safeCurrent / safeGoal, 1);
  const circumference = 2 * Math.PI * 72;
  const offset = circumference * (1 - pct);

  const reached = pct >= 1;
  const wasReached = useRef(reached);
  const [flare, setFlare] = useState(false);
  useEffect(() => {
    if (reached && !wasReached.current) {
      wasReached.current = true;
      setFlare(true);
      const t = setTimeout(() => setFlare(false), 900);
      return () => clearTimeout(t);
    }
    if (!reached) wasReached.current = false;
  }, [reached]);

  const remaining = Math.max(0, safeGoal - safeCurrent);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <GlassCard className="h-full relative overflow-hidden">
        {/* Subtle gradient glow */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ background: 'linear-gradient(135deg, #ec4899, transparent 60%)' }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-pink-500/20 via-pink-500/5 to-transparent" />

        <div className="relative flex flex-col items-center gap-4 py-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-pink-400" />
            </div>
            <span className="text-sm font-semibold text-zinc-300 tracking-tight">{label}</span>
          </div>

          {/* Progress ring */}
          <div className="relative" style={{ width: 160, height: 160 }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <FocusEmber intensity={pct} boost={boost} size={160} />
            </div>

            {flare && !reduce && (
              <motion.div
                initial={{ opacity: 0.6, scale: 0.8 }}
                animate={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: '0 0 24px 6px rgba(236,72,153,0.4)' }}
              />
            )}

            <svg width="160" height="160" className="relative transform -rotate-90">
              <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <motion.circle
                cx="80" cy="80" r="72" fill="none"
                stroke="url(#goalGradient)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference}
                initial={reduce ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: reduce ? 0 : 1.1, ease: [0.16, 1, 0.3, 1] }}
              />
              <defs>
                <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="50%" stopColor="#f472b6" />
                  <stop offset="100%" stopColor="#f9a8d4" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-pink-400 tabular-nums">{Math.round(pct * 100)}%</span>
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">complete</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-lg font-semibold text-zinc-100 tabular-nums">{Math.round(safeCurrent)}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Done</div>
            </div>
            {pct < 1 && (
              <div className="text-center">
                <div className="text-lg font-semibold text-zinc-400 tabular-nums">{Math.round(remaining)}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Remaining</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-lg font-semibold text-zinc-400 tabular-nums">{Math.round(safeGoal)}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Goal</div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-600 font-mono tabular-nums">
            {unit} tracked
          </div>

          {boost && (
            <div className="flex items-center gap-1.5 text-[11px] text-pink-400/70">
              <Zap className="w-3 h-3" />
              <span>Deep Focus active</span>
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
