import type { Goal as CanonicalGoal, GoalCategory, GoalPeriod, GoalLink } from '../types/goals';

// Legacy GoalStatus values used only by GoalStore (localStorage)
export type LegacyGoalStatus = 'suggested' | 'pending' | 'in-progress' | 'completed' | 'overdue' | 'slipped' | 'dismissed';

// Re-export canonical types for backward compatibility
export type { GoalCategory, GoalPeriod, GoalLink };

export interface GoalTarget {
  type: 'time' | 'completion';
  targetSeconds?: number;
  matchCategory?: string;
  matchApps?: string[];
  done?: boolean;
}

// GoalStore-compatible Goal (uses legacy statuses internally)
export interface Goal extends Omit<CanonicalGoal, 'status' | 'trackingMode' | 'completionLogic' | 'cadenceConfig'> {
  status: LegacyGoalStatus;
  trackingMode?: 'system' | 'manual' | 'hybrid';
  completionLogic?: { lateAllowed: boolean; gracePeriodMinutes: number; partialCredit: boolean; streakOnMiss: 'reset' | 'continue' | 'pause' };
  cadenceConfig?: { type: 'fixed' | 'rolling' | 'flexible'; fixedDays: number[]; rollingTarget: number; flexibleWindowDays: number };
}

export interface GoalDayContext {
  lastUnfinishedCarriedOver: string[];
  completedToday: number;
}

export interface GoalDay {
  date: string;
  goals: Goal[];
  reviewSummary?: string;
  context?: GoalDayContext;
}

const KEY = 'deskflow_goals';

export const GoalStore = {
  loadAll(): Record<string, GoalDay> {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch {
      return {};
    }
  },

  getDay(date: string): GoalDay {
    return this.loadAll()[date] ?? { date, goals: [] };
  },

  saveDay(day: GoalDay) {
    const all = this.loadAll();
    all[day.date] = day;
    localStorage.setItem(KEY, JSON.stringify(all));
  },

  history(limit = 30): GoalDay[] {
    return (Object.values(this.loadAll()) as GoalDay[])
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
  },

  unfinishedFromYesterday(today: string): Goal[] {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    const day = this.getDay(yStr);
    return day.goals.filter(g => g.status !== 'completed' && g.status !== 'dismissed');
  },

  recentlyCompletedTitles(today: string, n = 10): string[] {
    const all = this.loadAll();
    const seen = new Set<string>();
    const titles: string[] = [];
    const sorted = Object.values(all).sort((a, b) => b.date.localeCompare(a.date));
    for (const day of sorted) {
      const completed = day.goals.filter(g => g.status === 'completed');
      for (const g of completed) {
        if (!seen.has(g.title)) {
          seen.add(g.title);
          titles.push(g.title);
          if (titles.length >= n) return titles;
        }
      }
    }
    return titles;
  },

  saveGoal(goal: Goal) {
    const day = this.getDay(goal.date);
    const idx = day.goals.findIndex(g => g.id === goal.id);
    if (idx >= 0) {
      day.goals[idx] = goal;
    } else {
      day.goals.push(goal);
    }
    this.saveDay(day);
  },

  // ── Progress accumulation (for real-time focus tracking) ──

  accumulateProgress(goalId: string, seconds: number): void {
    try {
      const key = `df_goal_accum_${goalId}`;
      const current = parseInt(localStorage.getItem(key) || '0', 10);
      localStorage.setItem(key, String(current + Math.floor(seconds)));
    } catch { /* localStorage unavailable */ }
  },

  getAccumulated(goalId: string): number {
    try {
      return parseInt(localStorage.getItem(`df_goal_accum_${goalId}`) || '0', 10);
    } catch { return 0; }
  },

  clearAccumulated(goalId: string): void {
    try { localStorage.removeItem(`df_goal_accum_${goalId}`); } catch { /* ignore */ }
  },

  applyAccumulated(goal: Goal): Goal {
    const extra = this.getAccumulated(goal.id);
    if (extra <= 0) return goal;
    const newProgress = (goal.progressSeconds || 0) + extra;
    const target = goal.target?.targetSeconds || 3600;
    return {
      ...goal,
      progressSeconds: Math.min(newProgress, target),
      status: newProgress >= target ? 'completed' : goal.status,
    };
  },

  applyAccumulatedToDay(date: string): Goal[] {
    const day = this.getDay(date);
    return day.goals.map(g => this.applyAccumulated(g));
  },

  clearAllAccumulated(): void {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('df_goal_accum_')) keys.push(k);
      }
      for (const k of keys) localStorage.removeItem(k);
    } catch { /* ignore */ }
  },

  // ── Focus session linkage ──

  setFocusLinkedGoal(goalId: string | null): void {
    try {
      if (goalId) localStorage.setItem('df_focus_linked_goal', goalId);
      else localStorage.removeItem('df_focus_linked_goal');
    } catch { /* ignore */ }
  },

  getFocusLinkedGoal(): string | null {
    try { return localStorage.getItem('df_focus_linked_goal'); } catch { return null; }
  },

  // ── Suggestion rate limiting ──

  canRequestSuggestion(): boolean {
    try {
      const key = 'df_goal_suggest_requests';
      const raw = localStorage.getItem(key);
      const requests: number[] = raw ? JSON.parse(raw) : [];
      const now = Date.now();
      const windowStart = now - 3600000;
      const recent = requests.filter(t => t > windowStart);
      if (recent.length >= 10) return false;
      recent.push(now);
      localStorage.setItem(key, JSON.stringify(recent));
      return true;
    } catch { return true; }
  },
};
