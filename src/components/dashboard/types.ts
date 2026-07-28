// ============================================================
// DeskFlow Dashboard — Shared Types
// Frontend Skills Applied: Type Safety, Progressive Disclosure,
// Impeccable Design (Modular interfaces), Human-Centric UX
// ============================================================

export type GoalCategory = 'work' | 'personal' | 'health' | 'learning' | 'finance' | 'relationships';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly';
export type GoalStatus = 'active' | 'done' | 'archived';
export type GoalSource = 'manual' | 'ai';
export type TargetType = 'time' | 'completion';

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type DeadlineStatus = 'pending' | 'completed' | 'overdue';
export type DeadlineCategory = 'academic' | 'work' | 'personal' | 'health';

export type ScheduleCategory = 'class' | 'lab' | 'study' | 'exam' | 'meeting' | 'other';

export interface GoalLink {
  label: string;
  url: string;
}

export interface GoalTarget {
  type: TargetType;
  targetSeconds?: number;
  matchCategory?: string;
  done?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  target: GoalTarget;
  period: GoalPeriod;
  status: GoalStatus;
  date: string; // YYYY-MM-DD
  source: GoalSource;
  links: GoalLink[];
  progressSeconds?: number;
  completedAt?: string;
  parentId?: string;
  streak?: number;
  createdAt: string;
}

export interface LongTermGoal {
  id: string;
  title: string;
  category: GoalCategory;
  description?: string;
  deadline?: string;
  progress?: number;
}

export interface Deadline {
  id: string;
  title: string;
  due_date: string;
  status: DeadlineStatus;
  course?: string;
  priority: Priority;
  description?: string;
  category?: DeadlineCategory;
  recurrence?: string;
  createdAt: string;
}

export interface ScheduleEntry {
  id: string;
  title: string;
  location?: string;
  day_of_week: number; // 0-6
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  category?: ScheduleCategory;
  color?: string;
  createdAt: string;
}

export interface CategoryBalance {
  category: GoalCategory;
  count: number;
  percentage: number;
  color: string;
}

export interface DashboardInsights {
  streak: number;
  longestStreak: number;
  momentum: number; // 0-100
  categoryBalance: CategoryBalance[];
  completionRate: number;
  urgentDeadlines: number;
  focusTimeMinutes: number;
  aiSuggestionCount: number;
}

export interface DashboardState {
  goals: Goal[];
  deadlines: Deadline[];
  schedule: ScheduleEntry[];
  longTermGoals: LongTermGoal[];
  suggestions: Goal[];
  insights: DashboardInsights;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// IPC API shape (augmented in global scope)
declare global {
  interface Window {
    deskflowAPI?: {
      getGoals: (date: string) => Promise<{ goals: Goal[] }>;
      saveGoal: (date: string, goal: Goal) => Promise<{ success: boolean; id?: string }>;
      deleteGoal: (goalId: string) => Promise<{ success: boolean }>;
      getLongtermGoals: () => Promise<{ goals: LongTermGoal[] }>;
      suggestGoals: (date: string, ctx: unknown) => Promise<{ suggestions: Goal[] }>;
      getDeadlines: (params: { days?: number }) => Promise<{ deadlines: Deadline[] }>;
      addDeadline: (dl: Omit<Deadline, 'id'>) => Promise<{ success: boolean; id: string }>;
      updateDeadline: (id: string, patch: Partial<Deadline>) => Promise<{ success: boolean }>;
      deleteDeadline: (id: string) => Promise<{ success: boolean }>;
      getSchedule: () => Promise<{ entries: ScheduleEntry[] }>;
      addScheduleEntry: (entry: Omit<ScheduleEntry, 'id'>) => Promise<{ success: boolean; id: string }>;
      updateScheduleEntry: (id: string, patch: Partial<ScheduleEntry>) => Promise<{ success: boolean }>;
      deleteScheduleEntry: (id: string) => Promise<{ success: boolean }>;
    };
  }
}
