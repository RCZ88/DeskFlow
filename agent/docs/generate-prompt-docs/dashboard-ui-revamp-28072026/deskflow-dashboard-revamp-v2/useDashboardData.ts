// ============================================================
// DeskFlow Dashboard — Unified Data Hook
// Fixes the Logic Gap: Both Dashboard and AI System page use
// this SAME hook. No duplicate stores. Instant sync.
// Skills: Human-Centric UX (complete state coverage),
//         Impeccable Design (clean API surface)
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Goal, Deadline, ScheduleEntry, LongTermGoal,
  DashboardInsights, CategoryBalance, GoalCategory
} from './types';

const CATEGORY_COLORS: Record<GoalCategory, string> = {
  work: '#ec4899',
  personal: '#8b5cf6',
  health: '#10b981',
  learning: '#06b6d4',
  finance: '#f59e0b',
  relationships: '#ef4444',
};

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function calculateInsights(
  goals: Goal[],
  deadlines: Deadline[],
  suggestions: Goal[]
): DashboardInsights {
  const completed = goals.filter(g => g.status === 'done');
  const completionRate = goals.length > 0 ? Math.round((completed.length / goals.length) * 100) : 0;

  // Streak: count consecutive days with ≥1 completion
  const streak = goals.reduce((max, g) => Math.max(max, g.streak || 0), 0);
  const longestStreak = streak; // Simplified; real impl would scan history

  // Momentum: weighted score of recent completions + streak bonus
  const recentCompletions = completed.filter(g => {
    if (!g.completedAt) return false;
    const daysSince = (Date.now() - new Date(g.completedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  }).length;
  const momentum = Math.min(100, Math.round((recentCompletions * 10) + (streak * 5) + (completionRate * 0.3)));

  // Category balance
  const catCounts: Record<string, number> = {};
  goals.forEach(g => { catCounts[g.category] = (catCounts[g.category] || 0) + 1; });
  const total = goals.length || 1;
  const categoryBalance: CategoryBalance[] = (Object.keys(catCounts) as GoalCategory[]).map(cat => ({
    category: cat,
    count: catCounts[cat],
    percentage: Math.round((catCounts[cat] / total) * 100),
    color: CATEGORY_COLORS[cat] || '#6b7280',
  }));

  // Urgent deadlines (≤2 days)
  const now = new Date();
  const urgentDeadlines = deadlines.filter(d => {
    if (d.status === 'completed') return false;
    const due = new Date(d.due_date);
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 2;
  }).length;

  // Focus time from goal progress
  const focusTimeMinutes = Math.round(
    goals.reduce((sum, g) => sum + (g.progressSeconds || 0), 0) / 60
  );

  return {
    streak,
    longestStreak,
    momentum,
    categoryBalance,
    completionRate,
    urgentDeadlines,
    focusTimeMinutes,
    aiSuggestionCount: suggestions.length,
  };
}

export function useDashboardData() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>([]);
  const [suggestions, setSuggestions] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshLock = useRef(false);

  const api = (window as any).deskflowAPI;

  const refresh = useCallback(async () => {
    if (refreshLock.current) return;
    refreshLock.current = true;
    setLoading(true);
    setError(null);

    try {
      const date = todayStr();
      const [goalsRes, deadlinesRes, scheduleRes, ltgRes] = await Promise.all([
        api?.getGoals?.(date).catch(() => ({ goals: [] })),
        api?.getDeadlines?.({ days: 30 }).catch(() => ({ deadlines: [] })),
        api?.getSchedule?.().catch(() => ({ entries: [] })),
        api?.getLongtermGoals?.().catch(() => ({ goals: [] })),
      ]);

      setGoals(goalsRes?.goals || []);
      setDeadlines(deadlinesRes?.deadlines || []);
      setSchedule(scheduleRes?.entries || []);
      setLongTermGoals(ltgRes?.goals || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      refreshLock.current = false;
    }
  }, [api]);

  // Initial load
  useEffect(() => { refresh(); }, [refresh]);

  // ─── Goals ───
  const addGoal = useCallback(async (partial: Omit<Goal, 'id' | 'date' | 'createdAt' | 'status' | 'source'>) => {
    const goal: Goal = {
      ...partial,
      id: crypto.randomUUID(),
      date: todayStr(),
      createdAt: new Date().toISOString(),
      status: 'active',
      source: 'manual',
      links: partial.links || [],
      target: partial.target || { type: 'completion' },
    } as Goal;
    const res = await api?.saveGoal?.(todayStr(), goal);
    if (res?.success) {
      setGoals(prev => [goal, ...prev]);
      setLastUpdated(new Date());
    }
    return res;
  }, [api]);

  const updateGoal = useCallback(async (id: string, patch: Partial<Goal>) => {
    const existing = goals.find(g => g.id === id);
    if (!existing) return;
    const updated = { ...existing, ...patch };
    const res = await api?.saveGoal?.(todayStr(), updated);
    if (res?.success) {
      setGoals(prev => prev.map(g => g.id === id ? updated : g));
      setLastUpdated(new Date());
    }
    return res;
  }, [api, goals]);

  const deleteGoal = useCallback(async (id: string) => {
    const res = await api?.deleteGoal?.(id);
    if (res?.success) {
      setGoals(prev => prev.filter(g => g.id !== id));
      setLastUpdated(new Date());
    }
    return res;
  }, [api]);

  const toggleGoal = useCallback(async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const isCompleting = goal.status !== 'done';
    const patch: Partial<Goal> = {
      status: isCompleting ? 'done' : 'active',
      completedAt: isCompleting ? new Date().toISOString() : undefined,
      streak: isCompleting ? (goal.streak || 0) + 1 : goal.streak,
    };
    await updateGoal(id, patch);
  }, [goals, updateGoal]);

  // ─── Deadlines ───
  const addDeadline = useCallback(async (partial: Omit<Deadline, 'id' | 'createdAt' | 'status'>) => {
    const dl: Omit<Deadline, 'id'> = {
      ...partial,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    const res = await api?.addDeadline?.(dl);
    if (res?.success) {
      const full: Deadline = { ...dl, id: res.id };
      setDeadlines(prev => [...prev, full]);
      setLastUpdated(new Date());
    }
    return res;
  }, [api]);

  const updateDeadline = useCallback(async (id: string, patch: Partial<Deadline>) => {
    const res = await api?.updateDeadline?.(id, patch);
    if (res?.success) {
      setDeadlines(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
      setLastUpdated(new Date());
    }
    return res;
  }, [api]);

  const deleteDeadline = useCallback(async (id: string) => {
    const res = await api?.deleteDeadline?.(id);
    if (res?.success) {
      setDeadlines(prev => prev.filter(d => d.id !== id));
      setLastUpdated(new Date());
    }
    return res;
  }, [api]);

  const completeDeadline = useCallback(async (id: string) => {
    await updateDeadline(id, { status: 'completed' });
  }, [updateDeadline]);

  // ─── Schedule ───
  const addScheduleEntry = useCallback(async (partial: Omit<ScheduleEntry, 'id' | 'createdAt'>) => {
    const entry: Omit<ScheduleEntry, 'id'> = {
      ...partial,
      createdAt: new Date().toISOString(),
    };
    const res = await api?.addScheduleEntry?.(entry);
    if (res?.success) {
      const full: ScheduleEntry = { ...entry, id: res.id };
      setSchedule(prev => [...prev, full]);
      setLastUpdated(new Date());
    }
    return res;
  }, [api]);

  const updateScheduleEntry = useCallback(async (id: string, patch: Partial<ScheduleEntry>) => {
    const res = await api?.updateScheduleEntry?.(id, patch);
    if (res?.success) {
      setSchedule(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
      setLastUpdated(new Date());
    }
    return res;
  }, [api]);

  const deleteScheduleEntry = useCallback(async (id: string) => {
    const res = await api?.deleteScheduleEntry?.(id);
    if (res?.success) {
      setSchedule(prev => prev.filter(e => e.id !== id));
      setLastUpdated(new Date());
    }
    return res;
  }, [api]);

  // ─── AI Suggestions ───
  const generateSuggestions = useCallback(async () => {
    const date = todayStr();
    const ctx = { longTermGoals, existingGoals: goals };
    const res = await api?.suggestGoals?.(date, ctx);
    if (res?.suggestions) {
      setSuggestions(res.suggestions);
    }
  }, [api, longTermGoals, goals]);

  const acceptSuggestion = useCallback(async (suggestion: Goal) => {
    const goal: Goal = {
      ...suggestion,
      id: crypto.randomUUID(),
      date: todayStr(),
      createdAt: new Date().toISOString(),
      status: 'active',
      source: 'ai',
    };
    const res = await api?.saveGoal?.(todayStr(), goal);
    if (res?.success) {
      setGoals(prev => [goal, ...prev]);
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      setLastUpdated(new Date());
    }
    return res;
  }, [api]);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  }, []);

  const insights = calculateInsights(goals, deadlines, suggestions);

  return {
    // Data
    goals,
    deadlines,
    schedule,
    longTermGoals,
    suggestions,
    insights,
    loading,
    error,
    lastUpdated,
    // Actions
    refresh,
    // Goals
    addGoal,
    updateGoal,
    deleteGoal,
    toggleGoal,
    // Deadlines
    addDeadline,
    updateDeadline,
    deleteDeadline,
    completeDeadline,
    // Schedule
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    // AI
    generateSuggestions,
    acceptSuggestion,
    dismissSuggestion,
  };
}
