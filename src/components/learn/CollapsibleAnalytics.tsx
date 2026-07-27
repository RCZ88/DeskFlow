import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Flame } from 'lucide-react';

interface CollapsibleAnalyticsProps {
  streakDays: number;
  children: React.ReactNode;
}

export const CollapsibleAnalytics: React.FC<CollapsibleAnalyticsProps> = ({ streakDays, children }) => {
  const [isOpen, setIsOpen] = useState(streakDays > 0);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1c1917]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-zinc-400">Study Analytics</span>
          {streakDays > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
              <Flame className="h-3 w-3" />
              <span>{streakDays} day streak</span>
            </div>
          )}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="border-t border-white/5"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
