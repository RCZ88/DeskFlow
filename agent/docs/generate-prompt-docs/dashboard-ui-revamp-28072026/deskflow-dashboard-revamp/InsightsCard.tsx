// ============================================================
// DeskFlow Dashboard — InsightsCard
// Skills: Frontend Design (data visualization, hierarchy),
//         Human-Centric UX (progressive insight disclosure),
//         Motion (L2 — number tickers, bar animations),
//         MCP (NumberTicker, AnimatedShinyText, AnimatedGradientText)
// ============================================================

import { motion } from 'framer-motion';
import {
  Flame, TrendingUp, Target, Clock, AlertTriangle,
  Zap, Sparkles, BarChart3, PieChart
} from 'lucide-react';
import { NumberTicker } from '../ui/number-ticker';
import { AnimatedShinyText } from '../ui/animated-shiny-text';
import { AnimatedGradientText } from '../ui/animated-gradient-text';
import type { DashboardInsights } from './types';

interface InsightsCardProps {
  insights: DashboardInsights;
  loading?: boolean;
}

export function InsightsCard({ insights, loading = false }: InsightsCardProps) {
  if (loading) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-zinc-950/50 backdrop-blur-xl border border-zinc-800/40 p-5">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-amber-500/30 via-amber-500/10 to-transparent" />
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-zinc-800 rounded w-1/4" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-zinc-800/30 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { streak, longestStreak, momentum, categoryBalance, completionRate, urgentDeadlines, focusTimeMinutes, aiSuggestionCount } = insights;

  return (
    <div className="relative rounded-xl overflow-hidden bg-zinc-950/50 backdrop-blur-xl border border-zinc-800/40 p-5">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-amber-500/30 via-amber-500/10 to-transparent" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <BarChart3 size={15} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-100">Insights</h2>
            <p className="text-[11px] text-zinc-500">Your daily momentum at a glance</p>
          </div>
        </div>
        {aiSuggestionCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20"
          >
            <Sparkles size={12} />
            <span className="text-[11px] font-medium">{aiSuggestionCount} AI suggestions</span>
          </motion.div>
        )}
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Streak */}
        <motion.div
          whileHover={{ y: -2, scale: 1.01 }}
          className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/30"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Flame size={12} className="text-amber-400" />
            <span className="text-[11px] text-zinc-500 font-medium">Streak</span>
          </div>
          <div className="text-[22px] font-bold text-zinc-100 font-mono tabular-nums">
            <NumberTicker value={streak} suffix="d" delay={100} duration={1000} />
          </div>
          <p className="text-[10px] text-zinc-600 mt-0.5">Best: {longestStreak}d</p>
        </motion.div>

        {/* Momentum */}
        <motion.div
          whileHover={{ y: -2, scale: 1.01 }}
          className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/30"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp size={12} className="text-emerald-400" />
            <span className="text-[11px] text-zinc-500 font-medium">Momentum</span>
          </div>
          <div className="text-[22px] font-bold text-zinc-100 font-mono tabular-nums">
            <NumberTicker value={momentum} suffix="%" delay={200} duration={1200} />
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: momentum > 70 ? '#34d399' : momentum > 40 ? '#fbbf24' : '#f87171' }}
              initial={{ width: 0 }}
              animate={{ width: `${momentum}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Completion Rate */}
        <motion.div
          whileHover={{ y: -2, scale: 1.01 }}
          className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/30"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target size={12} className="text-violet-400" />
            <span className="text-[11px] text-zinc-500 font-medium">Completion</span>
          </div>
          <div className="text-[22px] font-bold text-zinc-100 font-mono tabular-nums">
            <NumberTicker value={completionRate} suffix="%" delay={300} duration={1000} />
          </div>
          <p className="text-[10px] text-zinc-600 mt-0.5">Daily goal rate</p>
        </motion.div>

        {/* Focus Time */}
        <motion.div
          whileHover={{ y: -2, scale: 1.01 }}
          className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/30"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock size={12} className="text-cyan-400" />
            <span className="text-[11px] text-zinc-500 font-medium">Focus Time</span>
          </div>
          <div className="text-[22px] font-bold text-zinc-100 font-mono tabular-nums">
            <NumberTicker value={focusTimeMinutes} suffix="m" delay={400} duration={1000} />
          </div>
          <p className="text-[10px] text-zinc-600 mt-0.5">Tracked today</p>
        </motion.div>
      </div>

      {/* Category Balance */}
      {categoryBalance.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <PieChart size={12} className="text-zinc-500" />
            <span className="text-[11px] text-zinc-500 font-medium">Category Balance</span>
          </div>
          <div className="space-y-1.5">
            {categoryBalance.map((cat, i) => (
              <div key={cat.category} className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 w-20 truncate capitalize">{cat.category}</span>
                <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.percentage}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 + i * 0.1 }}
                  />
                </div>
                <span className="text-[10px] text-zinc-600 w-8 text-right font-mono">{cat.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Urgent deadlines alert */}
      {urgentDeadlines > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-2.5 rounded-lg bg-rose-500/[0.06] border border-rose-500/20 flex items-center gap-2"
        >
          <AlertTriangle size={14} className="text-rose-400 shrink-0" />
          <span className="text-[12px] text-rose-300">
            {urgentDeadlines} urgent deadline{urgentDeadlines > 1 ? 's' : ''} need{urgentDeadlines === 1 ? 's' : ''} attention
          </span>
        </motion.div>
      )}
    </div>
  );
}
