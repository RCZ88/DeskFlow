import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Shield } from 'lucide-react';

interface StreakCounterProps {
  current: number;
  longest: number;
  freezes: number;
}

export function StreakCounter({ current, longest, freezes }: StreakCounterProps) {
  const getMessage = () => {
    if (current === 0) return 'Start your streak today!';
    if (current < 3) return 'Keep going! Build that habit.';
    if (current < 7) return "Don't break the chain!";
    return `You're on fire! ${current} days strong.`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center py-6"
    >
      <div className="flex items-center gap-3">
        {current > 0 && (
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [-2, 2, -2] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Flame className="w-8 h-8 text-amber-400" />
          </motion.div>
        )}
        <span className="text-4xl font-serif font-bold text-zinc-100">{current}</span>
        {current > 0 && (
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [2, -2, 2] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          >
            <Flame className="w-8 h-8 text-amber-400" />
          </motion.div>
        )}
      </div>
      <p className="text-sm text-zinc-400 mt-1">day streak</p>
      <p className="text-xs text-zinc-500 mt-2">{getMessage()}</p>
      
      {freezes > 0 && (
        <div className="flex items-center gap-1 mt-3 text-[10px] text-zinc-600">
          <Shield className="w-3 h-3" />
          <span>{freezes} streak freeze{freezes > 1 ? 's' : ''} available</span>
        </div>
      )}
      
      {longest > 0 && longest !== current && (
        <p className="text-[10px] text-zinc-600 mt-1">Best: {longest} days</p>
      )}
    </motion.div>
  );
}
