import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Check, Plus, X } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { Input } from '../ui/input';
import { confetti } from '../ui/confetti';

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  priority?: string;
}

interface GoalsCardProps {
  goals?: Goal[];
  onToggle?: (id: string) => void;
  onAdd?: (title: string) => void;
}

export function GoalsCard({ goals = [], onToggle, onAdd }: GoalsCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');

  const handleAdd = () => {
    if (newGoalTitle.trim()) {
      onAdd?.(newGoalTitle.trim());
      setNewGoalTitle('');
      setIsAdding(false);
    }
  };

  const handleToggle = (id: string, isCompleted: boolean) => {
    if (!isCompleted) {
      confetti({ particleCount: 30, spread: 60, startVelocity: 30, colors: ['#8b5cf6', '#a78bfa', '#c4b5fd'] });
    }
    onToggle?.(id);
  };

  return (
    <div className="relative rounded-xl overflow-hidden
      bg-zinc-950/50 backdrop-blur-xl border border-zinc-800/40 p-5
      hover:border-zinc-700/50 transition-all duration-200 h-full flex flex-col">

      <div className="flex items-center justify-between mb-2">
        <SectionHeader title="Today's Goals" icon={<Target size={14} />} />
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="w-6 h-6 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          {isAdding ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      <div className="flex-1 space-y-1.5 mt-1">
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center gap-2 mb-2 overflow-hidden"
            >
              <Input
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Enter new goal..."
                autoFocus
                className="flex-1 bg-zinc-900/80 border-zinc-700/50 focus-visible:ring-violet-500/50"
              />
              <button onClick={handleAdd} className="h-8 px-3 text-xs rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 transition-colors">Add</button>
            </motion.div>
          )}
        </AnimatePresence>

        {goals.slice(0, 5).map((goal, i) => (
          <motion.div key={goal.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.04 }}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900/30 border border-zinc-800/30 hover:bg-zinc-900/50 hover:border-zinc-700/40 transition-all duration-200 cursor-pointer group"
            onClick={() => handleToggle(goal.id, goal.completed)}>
            <motion.div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors duration-200 ${goal.completed ? 'bg-violet-500 border-violet-500' : 'border-zinc-600 group-hover:border-violet-400/50'}`} whileTap={{ scale: 0.9 }}>
              {goal.completed && <Check size={12} className="text-white" strokeWidth={3} />}
            </motion.div>
            <span className={`text-[13px] flex-1 truncate transition-colors ${goal.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
              {goal.title}
            </span>
            {goal.priority === 'high' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">HIGH</span>
            )}
          </motion.div>
        ))}
      </div>

      {goals.length === 0 && !isAdding && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <Target size={20} className="text-zinc-700 mb-2" />
          <button onClick={() => setIsAdding(true)} className="text-[13px] font-medium text-zinc-400 hover:text-violet-400 transition-colors">
            Add your first goal
          </button>
        </div>
      )}
    </div>
  );
}
