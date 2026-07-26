import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { FocusEmber } from './FocusEmber';

interface GoalRingProps {
  current: number;
  goal: number;
  unit?: string;
  label?: string;
  /** Deep Focus session active -> the signature ember roars. */
  boost?: boolean;
}

export function GoalRing({ current, goal, unit = 'min', label = 'Focus', boost = false }: GoalRingProps) {
  const reduce = useReducedMotion();
  const pct = goal > 0 ? Math.min(current / goal, 1) : 0;
  const circumference = 2 * Math.PI * 44;
  const offset = circumference * (1 - pct);

  // One-shot milestone flare the first time the goal is reached.
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

  return (
    <motion.div
      initial= opacity: 0, scale: 0.94 
      animate= opacity: 1, scale: 1 
      transition= duration: 0.4, ease: [0.16, 1, 0.3, 1] 
      className="flex flex-col items-center gap-1"
    >
      <div className="relative" style= width: 100, height: 100 >
        {/* Signature element: living focus ember (concept: your focus fuels the fire) */}
        <div className="absolute inset-0 flex items-center justify-center">
          <FocusEmber intensity={pct} boost={boost} size={100} />
        </div>

        {/* Milestone flare - one-shot spring, skipped under reduced motion */}
        {flare && !reduce && (
          <motion.div
            initial= opacity: 0.6, scale: 0.8 
            animate= opacity: 0, scale: 1.5 
            transition= duration: 0.9, ease: [0.34, 1.56, 0.64, 1] 
            className="absolute inset-0 rounded-full"
            style= boxShadow: '0 0 24px 6px rgba(52,211,153,0.55)' 
          />
        )}

        <svg width="100" height="100" className="relative transform -rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <motion.circle
            cx="50" cy="50" r="44" fill="none"
            stroke="url(#goalGradient)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={reduce ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            animate= strokeDashoffset: offset 
            transition= duration: reduce ? 0 : 1.1, ease: [0.16, 1, 0.3, 1] 
          />
          <defs>
            <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-emerald-400 tabular-nums">{Math.round(pct * 100)}%</span>
          <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">{label}</span>
        </div>
      </div>
      <div className="text-[10px] text-zinc-500 font-mono tabular-nums">
        {Math.round(current)}/{Math.round(goal)}{unit}
      </div>
    </motion.div>
  );
}
