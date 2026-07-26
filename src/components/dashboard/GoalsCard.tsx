import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Check } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { EmptyState } from '../EmptyState';

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  priority?: string;
}

interface GoalsCardProps {
  goals?: Goal[];
  onToggle?: (id: string) => void;
}

export function GoalsCard({ goals = [], onToggle }: GoalsCardProps) {
  return (
    <div className="relative rounded-xl overflow-hidden
      bg-[rgba(24,24,27,0.80)] backdrop-blur-xl
      border border-[rgba(63,63,70,0.50)] p-5
      hover:border-[rgba(82,82,91,0.80)] transition-all duration-250 h-full">

      <div className="absolute top-0 left-4 right-4 h-px
        bg-gradient-to-r from-transparent via-pink-500/40 to-transparent opacity-60 pointer-events-none" />

      <SectionHeader title="Today's Goals" icon={<Target size={14} />} />

      <div className="space-y-1.5 mt-2">
        {goals.slice(0, 5).map((goal, i) => (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.24 + i * 0.04 }}
            className="flex items-center gap-3 p-2.5 rounded-lg
              bg-zinc-900/30 border border-zinc-800/30
              hover:bg-zinc-900/50 hover:border-zinc-700/40
              transition-all duration-200 cursor-pointer group"
            onClick={() => onToggle?.(goal.id)}>

            <motion.div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
                transition-colors duration-200 ${
                  goal.completed
                    ? 'bg-pink-500 border-pink-500'
                    : 'border-zinc-600 group-hover:border-pink-400/50'
                }`}
              whileTap={{ scale: 0.9 }}>
              {goal.completed && <Check size={12} className="text-white" strokeWidth={3} />}
            </motion.div>

            <span className={`text-[13px] flex-1 truncate transition-colors ${
              goal.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'
            }`}>
              {goal.title}
            </span>

            {goal.priority === 'high' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded
                bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                HIGH
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {goals.length === 0 && (
        <EmptyState
          icon={<Target size={20} className="text-zinc-600" />}
          title="All caught up"
          description="No pending goals for today"
        />
      )}
    </div>
  );
}
