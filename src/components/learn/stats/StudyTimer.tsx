import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Clock } from 'lucide-react';
import { useStudyTimer } from './useStudyTimer';

interface StudyTimerProps {
  lessonId?: number;
  compact?: boolean;
}

export function StudyTimer({ lessonId, compact }: StudyTimerProps) {
  const timer = useStudyTimer();

  if (timer.status === 'idle' && !compact) {
    return (
      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={() => timer.start(lessonId)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600/50 transition text-xs"
      >
        <Play className="w-3 h-3" />
        <span>Start Studying</span>
      </motion.button>
    );
  }

  if (timer.status === 'idle' && compact) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition text-xs ${
        timer.status === 'running'
          ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
          : 'bg-clay-500/15 border-clay-500/30 text-clay-300'
      }`}
    >
      {timer.status === 'running' && (
        <motion.div
          className="w-2 h-2 rounded-full bg-amber-400"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {timer.status === 'paused' && <Clock className="w-3 h-3" />}
      
      <button onClick={timer.toggle} className="font-mono tabular-nums">
        {timer.formattedTime}
      </button>
      
      <button
        onClick={() => timer.stop()}
        className="p-1 rounded hover:bg-white/10 transition"
        title="Stop timer"
      >
        {timer.status === 'running' ? (
          <Pause className="w-3 h-3" />
        ) : (
          <Play className="w-3 h-3" />
        )}
      </button>
    </motion.div>
  );
}
