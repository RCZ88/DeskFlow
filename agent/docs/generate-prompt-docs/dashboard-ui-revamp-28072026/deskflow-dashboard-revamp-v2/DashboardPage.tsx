// ============================================================
// DeskFlow Dashboard — Main Page (Revamped v2)
// Skills: Signature Design (MomentumOrb hero, BlurText title),
//         Human-Centric UX (unified surface, error states, empty states),
//         Impeccable Design (responsive grid, glass, 8px grid),
//         MCP (SpotlightCard, NumberTicker, AnimatedShinyText, BorderBeam)
// ============================================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw, Sparkles, LayoutDashboard, AlertCircle,
  ChevronRight, Zap, Bot, ArrowRight
} from 'lucide-react';
import { useDashboardData } from './useDashboardData';
import { GoalsCard } from './GoalsCard';
import { DeadlinesCard } from './DeadlinesCard';
import { ScheduleCard } from './ScheduleCard';
import { InsightsCard } from './InsightsCard';
import { BlurText } from './BlurText';
import { NumberTicker } from '../ui/number-ticker';

const pageVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

interface DashboardPageProps {
  statusBand?: React.ReactNode;
}

export function DashboardPage({ statusBand }: DashboardPageProps) {
  const {
    goals, deadlines, schedule, longTermGoals, suggestions, insights,
    loading, error, lastUpdated, refresh,
    addGoal, updateGoal, deleteGoal, toggleGoal,
    addDeadline, updateDeadline, deleteDeadline, completeDeadline,
    addScheduleEntry, updateScheduleEntry, deleteScheduleEntry,
    generateSuggestions, acceptSuggestion, dismissSuggestion,
  } = useDashboardData();

  const [showAIModule, setShowAIModule] = useState(false);

  const handleRefresh = useCallback(() => { refresh(); }, [refresh]);

  // Full-page error state
  if (error && !loading && goals.length === 0 && deadlines.length === 0 && schedule.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
      >
        <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-zinc-600" />
        </div>
        <h2 className="text-[18px] font-semibold text-zinc-300 mb-2">Failed to load dashboard</h2>
        <p className="text-[13px] text-zinc-500 max-w-[300px] mb-4">{error}</p>
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRefresh}
          className="px-4 py-2 rounded-lg bg-zinc-800/50 text-zinc-300 border border-zinc-700/30 hover:bg-zinc-700/50 transition-colors text-[13px] font-medium flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Try Again
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 p-4 md:p-6 max-w-[1600px] mx-auto"
    >
      {/* Page Header */}
      <motion.div variants={cardVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <LayoutDashboard size={16} className="text-zinc-400" />
          </div>
          <div>
            <BlurText
              text="Dashboard"
              as="h1"
              className="text-[18px] font-semibold text-zinc-100"
              delay={0.1}
              staggerDelay={0.04}
            />
            {lastUpdated && (
              <p className="text-[11px] text-zinc-600">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAIModule(!showAIModule)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
              showAIModule
                ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                : 'bg-zinc-900/50 text-zinc-400 border-zinc-800/30 hover:bg-zinc-800/50 hover:text-zinc-300'
            }`}
          >
            <Bot size={13} />
            AI Module
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            disabled={loading}
            className="w-9 h-9 rounded-lg bg-zinc-900/50 border border-zinc-800/30 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors disabled:opacity-50"
            aria-label="Refresh dashboard"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </motion.button>
        </div>
      </motion.div>

      {/* Status Band */}
      {statusBand && (
        <motion.div variants={cardVariants}>
          {statusBand}
        </motion.div>
      )}

      {/* Insights Strip — with MomentumOrb signature hero */}
      <motion.div variants={cardVariants}>
        <InsightsCard insights={insights} loading={loading} />
      </motion.div>

      {/* AI Module Bridge */}
      <AnimatePresence>
        {showAIModule && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="relative rounded-xl overflow-hidden bg-zinc-950/50 backdrop-blur-xl border border-violet-500/20 p-5">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-violet-500/40 via-violet-500/10 to-transparent" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bot size={16} className="text-violet-400" />
                    <h3 className="text-[14px] font-semibold text-zinc-100">AI Assistant Bridge</h3>
                  </div>
                  <span className="text-[11px] text-zinc-600">Logic Gap Fix</span>
                </div>

                <p className="text-[12px] text-zinc-500 mb-3 max-w-[600px]">
                  The AI System page and Dashboard now share the same data layer.
                  Changes here reflect immediately on the AI page, and vice versa.
                  No duplicate stores. No stale data.
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={generateSuggestions}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors text-[12px] font-medium disabled:opacity-50"
                  >
                    <Sparkles size={12} />
                    Generate Goal Suggestions
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {/* Navigate to AI page */}}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/50 text-zinc-400 border border-zinc-800/30 hover:bg-zinc-800/50 hover:text-white transition-colors text-[12px] font-medium"
                  >
                    Open AI System
                    <ArrowRight size={12} />
                  </motion.button>
                </div>

                <div className="mt-3 flex items-center gap-4 text-[11px] text-zinc-600">
                  {['Goals', 'Deadlines', 'Schedule', 'Long-term goals'].map(label => (
                    <span key={label} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {label} synced
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={cardVariants} className="min-h-0">
          <GoalsCard
            goals={goals}
            longTermGoals={longTermGoals}
            suggestions={suggestions}
            insights={{ streak: insights.streak, completionRate: insights.completionRate, momentum: insights.momentum }}
            loading={loading}
            error={error}
            onToggle={toggleGoal}
            onAdd={addGoal}
            onDelete={deleteGoal}
            onUpdate={updateGoal}
            onAcceptSuggestion={acceptSuggestion}
            onDismissSuggestion={dismissSuggestion}
            onGenerateSuggestions={generateSuggestions}
          />
        </motion.div>

        <motion.div variants={cardVariants} className="min-h-0">
          <DeadlinesCard
            deadlines={deadlines}
            loading={loading}
            error={error}
            onAdd={addDeadline}
            onDelete={deleteDeadline}
            onUpdate={updateDeadline}
            onComplete={completeDeadline}
          />
        </motion.div>

        <motion.div variants={cardVariants} className="min-h-0">
          <ScheduleCard
            entries={schedule}
            loading={loading}
            error={error}
            onAdd={addScheduleEntry}
            onUpdate={updateScheduleEntry}
            onDelete={deleteScheduleEntry}
          />
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div variants={cardVariants} className="flex items-center justify-between text-[11px] text-zinc-700 pt-2">
        <span>DeskFlow Dashboard</span>
        <span className="flex items-center gap-1">
          <Zap size={10} className="text-amber-500/50" />
          Momentum: <NumberTicker value={insights.momentum} suffix="%" delay={0} duration={800} />
        </span>
      </motion.div>
    </motion.div>
  );
}
