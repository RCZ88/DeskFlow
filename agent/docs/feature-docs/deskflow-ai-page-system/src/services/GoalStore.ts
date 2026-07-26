export type GoalCategory = 'work' | 'personal' | 'health' | 'learning';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly';
export type GoalStatus = 'suggested' | 'pending' | 'in-progress' | 'completed' | 'overdue' | 'slipped' | 'dismissed';

export interface GoalTarget {
  type: 'time' | 'completion';
  targetSeconds?: number;
  matchCategory?: string;
  matchApps?: string[];
  done?: boolean;
}

export interface GoalLink {
  label: string;
  url: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  target: GoalTarget;
  period: GoalPeriod;
  status: GoalStatus;
  date: string;
  source: 'ai' | 'manual';
  links: GoalLink[];
  progressSeconds?: number;
  createdAt: string;
  completedAt?: string;
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
};
