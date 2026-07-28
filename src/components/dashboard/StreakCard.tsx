import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, TrendingUp, Calendar, Zap, 
  ChevronRight, Target
} from 'lucide-react';
import { GlareHover } from '../ui/glare-hover';
import { AnimatedShinyText } from '../ui/animated-shiny-text';
import { NumberTicker } from '../ui/number-ticker';
import { BorderBeam } from '../ui/border-beam';

interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  completedDates: string[];
  categoryStreaks: Record<string, number>;
}

interface StreakCardProps {
  goals: any[];
  className?: string;
}

function calculateStreaks(goals: any[]): StreakData {
  const completedDates = new Set<string>();
  const categoryStreaks: Record<string, number> = {};

  goals.forEach(goal => {
    if (goal.status === 'done' && goal.completedAt) {
      const date = goal.completedAt.split('T')[0];
      completedDates.add(date);
      
      if (!categoryStreaks[goal.category]) {
        categoryStreaks[goal.category] = 0;
      }
      categoryStreaks[goal.category]++;
    }
  });

  const sortedDates = Array.from(completedDates).sort().reverse();
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate current streak
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    if (completedDates.has(dateStr)) {
      currentStreak++;
    } else if (i > 0) {
      break;
    }
  }

  // Calculate best streak
  sortedDates.reverse().forEach((date, index) => {
    if (index === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(sortedDates[index - 1]);
      const currDate = new Date(date);
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  });
  bestStreak = Math.max(bestStreak, tempStreak);

  return {
    currentStreak,
    bestStreak,
    lastCompletedDate: sortedDates[sortedDates.length - 1] || null,
    completedDates: Array.from(completedDates),
    categoryStreaks
  };
}

export function StreakCard({ goals, className = '' }: StreakCardProps) {
  const [streaks, setStreaks] = useState<StreakData>({
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    completedDates: [],
    categoryStreaks: {}
  });

  useEffect(() => {
    setStreaks(calculateStreaks(goals));
  }, [goals]);

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-amber-400';
    if (streak >= 14) return 'text-orange-400';
    if (streak >= 7) return 'text-rose-400';
    return 'text-zinc-400';
  };

  const getStreakGlow = (streak: number) => {
    if (streak >= 30) return 'rgba(251, 191, 36, 0.3)';
    if (streak >= 14) return 'rgba(249, 115, 22, 0.3)';
    if (streak >= 7) return 'rgba(244, 63, 94, 0.3)';
    return 'rgba(161, 163, 168, 0.2)';
  };

  return (
    <GlareHover
      width="100%"
      height="auto"
      background="rgba(24, 24, 27, 0.5)"
      color="#f97316"
      opacity={0.2}
      angle={-45}
      duration={600}
      className={`rounded-xl border border-zinc-800/50 ${className}`}
    >
      <div className="relative p-5 overflow-hidden">
        {/* Top edge highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-orange-500/30 via-orange-500/10 to-transparent" />
        
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
            style={{ 
              background: `radial-gradient(circle, ${getStreakGlow(streaks.currentStreak)} 0%, transparent 70%)`,
              filter: 'blur(20px)'
            }}
            animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Flame className="w-4.5 h-4.5 text-orange-400" />
            </div>
            <div>
              <AnimatedShinyText className="text-[15px] font-semibold" gradientFrom="#f97316" gradientTo="#fb923c">
                Streak
              </AnimatedShinyText>
              <p className="text-[11px] text-zinc-500">Keep it going</p>
            </div>
          </div>

          {/* Main streak number */}
          <div className="text-center mb-4">
            <motion.div 
              className={`text-5xl font-bold font-mono ${getStreakColor(streaks.currentStreak)}`}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <NumberTicker value={streaks.currentStreak} delay={200} duration={1000} />
            </motion.div>
            <p className="text-[13px] text-zinc-400 mt-1">day streak</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/30">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={12} className="text-emerald-400" />
                <span className="text-[11px] text-zinc-500">Best</span>
              </div>
              <div className="text-[18px] font-bold font-mono text-zinc-200">
                <NumberTicker value={streaks.bestStreak} delay={300} duration={1200} />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={12} className="text-violet-400" />
                <span className="text-[11px] text-zinc-500">Completed</span>
              </div>
              <div className="text-[18px] font-bold font-mono text-zinc-200">
                <NumberTicker value={streaks.completedDates.length} delay={400} duration={1400} />
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(streaks.categoryStreaks).length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-800/50">
              <p className="text-[11px] text-zinc-500 mb-2">By Category</p>
              <div className="space-y-1.5">
                {Object.entries(streaks.categoryStreaks)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-[12px] text-zinc-400 capitalize">{category}</span>
                      <span className="text-[12px] font-mono text-zinc-300">{count}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Milestone indicator */}
          {streaks.currentStreak >= 7 && (
            <motion.div 
              className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-[11px] text-amber-400 font-medium">
                {streaks.currentStreak >= 100 ? '🏆 Legendary!' :
                 streaks.currentStreak >= 30 ? '🔥 On Fire!' :
                 streaks.currentStreak >= 14 ? '⚡ Unstoppable!' :
                 '🎯 Great Start!'}
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </GlareHover>
  );
}
