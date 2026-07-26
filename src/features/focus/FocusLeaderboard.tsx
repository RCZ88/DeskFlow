import { useState, useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { SectionHeader } from '../../components/SectionHeader';
import { Trophy, Medal, Award, Clock, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FocusHistoryRow } from './focusHelpers';

type LeaderboardPeriod = 'today' | 'week' | 'all';

interface FocusLeaderboardProps {
  history: FocusHistoryRow[];
}

interface LeaderboardEntry {
  id: string;
  duration: number;
  mode: 'timer' | 'stopwatch';
  completedAt: Date;
  outcome: 'completed' | 'failed' | 'aborted';
}

const PERIOD_TABS = [
  { key: 'today' as const, label: 'Today' },
  { key: 'week' as const, label: 'Week' },
  { key: 'all' as const, label: 'All Time' },
];

const RANK_ICONS = [
  { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { icon: Medal, color: 'text-zinc-300', bg: 'bg-zinc-300/10' },
  { icon: Award, color: 'text-amber-600', bg: 'bg-amber-600/10' },
];

export function FocusLeaderboard({ history }: FocusLeaderboardProps) {
  const [period, setPeriod] = useState<LeaderboardPeriod>('today');

  const leaderboardData = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const filtered = history.filter(session => {
      const sessionDate = new Date(session.started_at);
      if (session.outcome !== 'completed') return false;
      
      switch (period) {
        case 'today':
          return sessionDate >= todayStart;
        case 'week':
          return sessionDate >= weekStart;
        case 'all':
          return true;
        default:
          return false;
      }
    });

    const sorted = [...filtered].sort((a, b) => (b.actual_sec || 0) - (a.actual_sec || 0));
    
    return sorted.slice(0, 5).map((session, index) => ({
      id: String(session.id),
      duration: session.actual_sec || session.planned_sec,
      mode: ((session as any).mode || 'timer') as 'timer' | 'stopwatch',
      completedAt: new Date(session.started_at),
      outcome: session.outcome,
    }));
  }, [history, period]);

  const fmtDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const fmtTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <GlassCard className="h-full">
      <SectionHeader
        title="Leaderboard"
        icon={<Trophy className="w-4 h-4 text-yellow-400" />}
        action={
          <div className="flex gap-1">
            {PERIOD_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setPeriod(tab.key)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  period === tab.key
                    ? 'bg-yellow-400/20 text-yellow-400'
                    : 'bg-zinc-800/40 text-zinc-500 hover:bg-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-3 space-y-2">
        <AnimatePresence mode="wait">
          {leaderboardData.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6"
            >
              <Trophy className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No completed sessions yet</p>
              <p className="text-[10px] text-zinc-600 mt-1">Start a focus session to appear here</p>
            </motion.div>
          ) : (
            <motion.div
              key={period}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {leaderboardData.map((entry, index) => {
                const rankStyle = RANK_ICONS[index] || RANK_ICONS[2];
                const RankIcon = rankStyle.icon;
                
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg ${rankStyle.bg} flex items-center justify-center`}>
                      <RankIcon className={`w-4 h-4 ${rankStyle.color}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-200">
                          {fmtDuration(entry.duration)}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          entry.mode === 'stopwatch' 
                            ? 'bg-amber-500/15 text-amber-300' 
                            : 'bg-pink-500/15 text-pink-300'
                        }`}>
                          {entry.mode === 'stopwatch' ? (
                            <span className="flex items-center gap-1">
                              <Timer className="w-2.5 h-2.5" />
                              Challenge
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              Timer
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {fmtTime(entry.completedAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}