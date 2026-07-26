"use client";

/**
 * Insights Page — Redesigned
 * /reports — Analytics & Goals
 *
 * Changes:
 * - REMOVED: Activity Breakdown (duplicated on External)
 * - REMOVED: Sleep Trends (duplicated on External)
 * - KEPT: Stats cards, Weekly Consistency, Typical Day
 * - ADDED: Goals & Targets section with progress bars, streaks, gauges
 */

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Flame,
  Target,
  TrendingUp,
  Trophy,
  Moon,
  Zap,
  Calendar,
  Clock,
  Activity,
  ChevronUp,
  ChevronDown,
  Settings2,
} from "lucide-react";
import { Goal, GoalStatus, ConsistencyData } from "./types";
import { GOALS, CONSISTENCY_DATA, TYPICAL_DAY_DATA } from "./demo-data";

/* ────────────────────────────────
   Helpers
   ──────────────────────────────── */

function formatHours(seconds: number): string {
  const hrs = seconds / 3600;
  return `${hrs.toFixed(1)}h`;
}

function statusColor(status: GoalStatus): { bg: string; text: string; bar: string; border: string } {
  switch (status) {
    case "on-track":
      return { bg: "bg-emerald-500/10", text: "text-emerald-400", bar: "#10b981", border: "border-emerald-500/30" };
    case "behind":
      return { bg: "bg-amber-500/10", text: "text-amber-400", bar: "#f59e0b", border: "border-amber-500/30" };
    case "critical":
      return { bg: "bg-rose-500/10", text: "text-rose-400", bar: "#f43f5e", border: "border-rose-500/30" };
  }
}

function statusLabel(status: GoalStatus): string {
  switch (status) {
    case "on-track": return "On Track";
    case "behind": return "Behind";
    case "critical": return "Critical";
  }
}

/* ────────────────────────────────
   Circular Gauge
   ──────────────────────────────── */

function CircularGauge({
  value,
  max,
  color,
  size = 120,
  strokeWidth = 10,
  label,
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const dashOffset = circumference - progress * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#3f3f46"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-zinc-100">{Math.round(progress * 100)}%</span>
        </div>
      </div>
      <span className="text-xs text-zinc-400 font-medium">{label}</span>
    </div>
  );
}

/* ────────────────────────────────
   Goal Streak Badge
   ──────────────────────────────── */

function GoalStreak({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full">
      <Flame className="w-4 h-4 text-orange-400" />
      <span className="text-sm font-bold text-orange-400">{count}</span>
      <span className="text-xs text-orange-400/80">day streak</span>
    </div>
  );
}

/* ────────────────────────────────
   Goal Card
   ──────────────────────────────── */

function GoalCard({
  goal,
  onEdit,
}: {
  goal: Goal;
  onEdit: (goal: Goal) => void;
}) {
  const status = statusColor(goal.status);
  const progress = Math.min((goal.current / goal.target) * 100, 100);

  return (
    <div className={`bg-zinc-800/50 rounded-xl p-5 border ${status.border} transition-all hover:bg-zinc-800`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status.bg}`}>
            <Target className={`w-5 h-5 ${status.text}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">{goal.label}</h3>
            <span className={`text-xs font-medium ${status.text}`}>{statusLabel(goal.status)}</span>
          </div>
        </div>
        <GoalStreak count={goal.streak} />
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">
            {goal.current}{goal.unit} / {goal.target}{goal.unit}
          </span>
          <span className="font-mono font-bold text-zinc-200">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-3 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%`, backgroundColor: status.bar }}
          />
        </div>
      </div>

      {/* Edit button */}
      <button
        onClick={() => onEdit(goal)}
        className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Adjust target
      </button>
    </div>
  );
}

/* ────────────────────────────────
   Stats Cards Row
   ──────────────────────────────── */

function StatsCards() {
  const stats = [
    { label: "Total Time", value: "142.5h", icon: <Clock className="w-5 h-5" />, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Consistency", value: "84%", icon: <Activity className="w-5 h-5" />, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Streak", value: "12 days", icon: <Flame className="w-5 h-5" />, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Best Day", value: "Tuesday", icon: <Trophy className="w-5 h-5" />, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Sleep Deficit", value: "-1.8h", icon: <Moon className="w-5 h-5" />, color: "text-rose-400", bg: "bg-rose-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
          <div className={`inline-flex p-2 rounded-lg ${stat.bg} ${stat.color} mb-3`}>
            {stat.icon}
          </div>
          <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">{stat.label}</p>
          <p className="text-2xl font-bold text-zinc-100">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────
   Weekly Consistency Chart
   ──────────────────────────────── */

function WeeklyConsistencyChart() {
  const data = CONSISTENCY_DATA;

  return (
    <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Weekly Consistency</h3>
          <p className="text-sm text-zinc-400 mt-1">Daily productivity score breakdown</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 font-medium">+5.2%</span>
          <span>vs last week</span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
            <XAxis dataKey="day" stroke="#a1a1aa" fontSize={12} />
            <YAxis stroke="#a1a1aa" fontSize={12} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#27272a",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#f4f4f5" }}
              itemStyle={{ color: "#f4f4f5" }}
              formatter={(value: number) => [`${value}%`, "Consistency"]}
            />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.score >= 80 ? "#10b981" : entry.score >= 60 ? "#f59e0b" : "#f43f5e"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ────────────────────────────────
   Typical Day Chart
   ──────────────────────────────── */

function TypicalDayChart() {
  // Aggregate by hour
  const hourlyData = useMemo(() => {
    const map = new Map<number, { hour: number; productive: number; neutral: number; rest: number }>();
    for (let h = 0; h < 24; h++) {
      map.set(h, { hour: h, productive: 0, neutral: 0, rest: 0 });
    }
    TYPICAL_DAY_DATA.forEach((d) => {
      const entry = map.get(d.hour);
      if (!entry) return;
      if (["Studying", "Gym", "Exercise", "Reading"].includes(d.activity)) {
        entry.productive += d.duration;
      } else if (["Short Break", "Commute"].includes(d.activity)) {
        entry.neutral += d.duration;
      } else {
        entry.rest += d.duration;
      }
    });
    return Array.from(map.values());
  }, []);

  return (
    <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-zinc-100">Typical Day</h3>
        <p className="text-sm text-zinc-400 mt-1">Average hourly activity distribution</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
            <XAxis
              dataKey="hour"
              stroke="#a1a1aa"
              fontSize={12}
              tickFormatter={(h: number) => `${h}:00`}
            />
            <YAxis stroke="#a1a1aa" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#27272a",
                border: "1px solid #3f3f46",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#f4f4f5" }}
              itemStyle={{ color: "#f4f4f5" }}
              formatter={(value: number, name: string) => [`${value} min`, name]}
              labelFormatter={(label: number) => `${label}:00`}
            />
            <Bar dataKey="productive" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
            <Bar dataKey="neutral" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
            <Bar dataKey="rest" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-zinc-400">Productive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-yellow-500" />
          <span className="text-zinc-400">Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span className="text-zinc-400">Rest/Sleep</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────
   Goals Section
   ──────────────────────────────── */

function GoalsSection({
  goals,
  onEditGoal,
}: {
  goals: Goal[];
  onEditGoal: (goal: Goal) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const dailyGoals = goals.filter((g) => g.id.includes("daily"));
  const weeklyGoals = goals.filter((g) => g.id.includes("weekly"));

  const dailyProgress = useMemo(() => {
    const total = dailyGoals.reduce((sum, g) => sum + g.current / g.target, 0);
    return total / dailyGoals.length;
  }, [dailyGoals]);

  return (
    <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Goals & Targets</h3>
            <p className="text-sm text-zinc-400">Track your daily and weekly objectives</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <CircularGauge
            value={dailyProgress}
            max={1}
            color="#10b981"
            size={80}
            strokeWidth={8}
            label="Daily"
          />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            {collapsed ? <ChevronDown className="w-5 h-5 text-zinc-400" /> : <ChevronUp className="w-5 h-5 text-zinc-400" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-6">
          {/* Daily Goals */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              Daily Targets
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dailyGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onEdit={onEditGoal} />
              ))}
            </div>
          </div>

          {/* Weekly Goals */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-zinc-500" />
              Weekly Targets
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weeklyGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onEdit={onEditGoal} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────
   Goal Edit Modal
   ──────────────────────────────── */

function GoalEditModal({
  goal,
  isOpen,
  onClose,
  onSave,
}: {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Goal) => void;
}) {
  const [target, setTarget] = useState(goal?.target || 0);

  if (!isOpen || !goal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700 w-full max-w-md mx-4 shadow-2xl">
        <h3 className="text-lg font-bold text-zinc-100 mb-1">Edit Goal</h3>
        <p className="text-sm text-zinc-400 mb-6">{goal.label}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Target ({goal.unit})</label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
              step={goal.unit === "h" ? 0.5 : 1}
              min={0.5}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({ ...goal, target });
              onClose();
            }}
            className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-900 rounded-lg font-semibold transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────
   Main Insights Page
   ──────────────────────────────── */

export default function InsightsPage() {
  const [goals, setGoals] = useState<Goal[]>(GOALS);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const handleEditGoal = useCallback((goal: Goal) => {
    setEditingGoal(goal);
  }, []);

  const handleSaveGoal = useCallback((updated: Goal) => {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Insights</h1>
          <p className="text-sm text-zinc-400 mt-1">Analytics, goals, and productivity patterns</p>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Goals & Targets */}
      <GoalsSection goals={goals} onEditGoal={handleEditGoal} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeeklyConsistencyChart />
        <TypicalDayChart />
      </div>

      {/* Edit Modal */}
      <GoalEditModal
        goal={editingGoal}
        isOpen={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        onSave={handleSaveGoal}
      />
    </div>
  );
}
