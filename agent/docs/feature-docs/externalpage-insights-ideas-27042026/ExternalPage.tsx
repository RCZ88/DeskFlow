"use client";

/**
 * External Page — Redesigned
 * /external — Stopwatch + Life Activities
 *
 * Features:
 * - Always-visible timer section
 * - Activity grid with color-coded cards
 * - Activity detail view with historical charts
 * - Per-activity chart customization
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Play,
  Pause,
  Square,
  Clock,
  TrendingUp,
  Calendar,
  BarChart3,
  Activity,
  ChevronDown,
  Settings2,
  Timer,
  Flame,
} from "lucide-react";
import {
  Activity as ActivityType,
  ChartType,
  DailyActivityData,
} from "./types";
import {
  DEFAULT_ACTIVITIES,
  ACTIVITY_DAILY_DATA,
  getActivityStats,
} from "./demo-data";

/* ────────────────────────────────
   Color Map (hex values for charts)
   ──────────────────────────────── */

const COLOR_MAP: Record<string, { tailwind: string; hex: string }> = {
  emerald: { tailwind: "bg-emerald-500", hex: "#10b981" },
  amber:   { tailwind: "bg-amber-500",   hex: "#f59e0b" },
  orange:  { tailwind: "bg-orange-500",  hex: "#f97316" },
  blue:    { tailwind: "bg-blue-500",    hex: "#3b82f6" },
  violet:  { tailwind: "bg-violet-500",  hex: "#8b5cf6" },
  indigo:  { tailwind: "bg-indigo-500",  hex: "#6366f1" },
  rose:    { tailwind: "bg-rose-500",    hex: "#f43f5e" },
  cyan:    { tailwind: "bg-cyan-500",    hex: "#06b6d4" },
};

function getHex(color: string): string {
  return COLOR_MAP[color]?.hex || "#10b981";
}

function getTailwind(color: string, type: "bg" | "border" | "text" | "ring"): string {
  const base = COLOR_MAP[color]?.tailwind.replace("bg-", "") || "emerald-500";
  return `${type}-${base}`;
}

/* ────────────────────────────────
   Helpers
   ──────────────────────────────── */

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatHours(seconds: number): string {
  const hrs = seconds / 3600;
  return `${hrs.toFixed(1)}h`;
}

/* ────────────────────────────────
   Calendar Heatmap Component
   ──────────────────────────────── */

function CalendarHeatmap({ data, color }: { data: DailyActivityData[]; color: string }) {
  const weeks = useMemo(() => {
    const days = [...data].reverse();
    const result: (DailyActivityData | null)[][] = [];
    let currentWeek: (DailyActivityData | null)[] = [];
    const firstDay = new Date(days[0]?.date || Date.now()).getDay();
    for (let i = 0; i < firstDay; i++) currentWeek.push(null);
    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) result.push(currentWeek);
    return result;
  }, [data]);

  const maxDuration = useMemo(() => Math.max(...data.map((d) => d.duration), 1), [data]);
  const hex = getHex(color);

  return (
    <div className="flex gap-1 overflow-x-auto pb-2">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day, di) => {
            if (!day) return <div key={di} className="w-3 h-3 rounded-sm" />;
            const intensity = Math.min(4, Math.ceil((day.duration / maxDuration) * 4));
            const opacity = [0.1, 0.3, 0.5, 0.7, 0.9][intensity];
            return (
              <div
                key={di}
                title={`${day.date}: ${formatHours(day.duration)}`}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: hex, opacity }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────
   Chart Customizer
   ──────────────────────────────── */

function ChartCustomizer({
  value,
  onChange,
}: {
  value: ChartType;
  onChange: (type: ChartType) => void;
}) {
  const [open, setOpen] = useState(false);
  const options: { value: ChartType; label: string; icon: React.ReactNode }[] = [
    { value: "none", label: "Stats Only", icon: <Activity className="w-4 h-4" /> },
    { value: "bar", label: "Bar Chart", icon: <BarChart3 className="w-4 h-4" /> },
    { value: "line", label: "Line Chart", icon: <TrendingUp className="w-4 h-4" /> },
    { value: "calendar", label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
      >
        <Settings2 className="w-4 h-4" />
        {options.find((o) => o.value === value)?.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 overflow-hidden">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  value === opt.value
                    ? "bg-zinc-700 text-emerald-400"
                    : "text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ────────────────────────────────
   Activity Chart
   ──────────────────────────────── */

function ActivityChart({
  activity,
  chartType,
}: {
  activity: ActivityType;
  chartType: ChartType;
}) {
  const data = ACTIVITY_DAILY_DATA[activity.id] || [];
  const hex = getHex(activity.color);

  if (chartType === "none" || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
        <Activity className="w-5 h-5 mr-2" />
        Stats view only — no chart configured
      </div>
    );
  }

  if (chartType === "calendar") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Activity Frequency (last 30 days)</span>
        </div>
        <CalendarHeatmap data={data.slice(-30)} color={activity.color} />
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>Less</span>
          <div className="flex gap-1">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((op, i) => (
              <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: hex, opacity: op }} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    );
  }

  const chartData = data.slice(-7).map((d) => ({
    label: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
    hours: Number((d.duration / 3600).toFixed(1)),
  }));

  const lineData = data.slice(-30).map((d, i) => ({
    label: i % 5 === 0 ? new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "",
    hours: Number((d.duration / 3600).toFixed(1)),
  }));

  const tooltipStyle = {
    backgroundColor: "#27272a",
    border: "1px solid #3f3f46",
    borderRadius: "8px",
  };

  if (chartType === "bar") {
    return (
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
            <XAxis dataKey="label" stroke="#a1a1aa" fontSize={12} />
            <YAxis stroke="#a1a1aa" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#f4f4f5" }} itemStyle={{ color: "#f4f4f5" }} />
            <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={hex} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // line chart
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={lineData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="label" stroke="#a1a1aa" fontSize={12} />
          <YAxis stroke="#a1a1aa" fontSize={12} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#f4f4f5" }} itemStyle={{ color: "#f4f4f5" }} />
          <Line
            type="monotone"
            dataKey="hours"
            stroke={hex}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ────────────────────────────────
   Stat Card
   ──────────────────────────────── */

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
      <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: getHex(color) }}>{value}</p>
    </div>
  );
}

/* ────────────────────────────────
   Timer Section
   ──────────────────────────────── */

function TimerSection({
  activeActivity,
  isRunning,
  elapsed,
  onStart,
  onPause,
  onStop,
  onSelectActivity,
  activities,
}: {
  activeActivity: ActivityType | null;
  isRunning: boolean;
  elapsed: number;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onSelectActivity: (id: string) => void;
  activities: ActivityType[];
}) {
  return (
    <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Timer Display */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Timer className="w-5 h-5 text-zinc-400" />
            <span className="text-sm text-zinc-400">
              {activeActivity ? `Tracking: ${activeActivity.name}` : "No activity selected"}
            </span>
          </div>
          <div className="font-mono text-5xl md:text-6xl font-bold text-zinc-100 tracking-tight">
            {formatDuration(elapsed)}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {activeActivity ? (
            <>
              {isRunning ? (
                <button
                  onClick={onPause}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-zinc-900 rounded-lg font-semibold transition-colors"
                >
                  <Pause className="w-5 h-5" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={onStart}
                  className="flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-zinc-900 rounded-lg font-semibold transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Resume
                </button>
              )}
              <button
                onClick={onStop}
                className="flex items-center gap-2 px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-semibold transition-colors"
              >
                <Square className="w-5 h-5" />
                Stop
              </button>
            </>
          ) : (
            <div className="text-zinc-500 text-sm">Select an activity below to start tracking</div>
          )}
        </div>
      </div>

      {/* Quick Activity Selector */}
      <div className="mt-6 pt-4 border-t border-zinc-700/50">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Quick Select</p>
        <div className="flex flex-wrap gap-2">
          {activities.map((act) => {
            const isActive = activeActivity?.id === act.id;
            return (
              <button
                key={act.id}
                onClick={() => onSelectActivity(act.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                  isActive
                    ? `text-zinc-900`
                    : `bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700`
                }`}
                style={isActive ? { backgroundColor: getHex(act.color), borderColor: getHex(act.color) } : {}}
              >
                {act.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────
   Activity Grid
   ──────────────────────────────── */

function ActivityGrid({
  activities,
  selectedId,
  onSelect,
}: {
  activities: ActivityType[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {activities.map((act) => {
        const isSelected = selectedId === act.id;
        const stats = getActivityStats(act.id);
        const hex = getHex(act.color);
        return (
          <button
            key={act.id}
            onClick={() => onSelect(act.id)}
            className="relative bg-zinc-800/50 rounded-xl p-4 border-2 text-left transition-all hover:bg-zinc-800"
            style={{
              borderColor: isSelected ? hex : "rgba(63, 63, 70, 0.5)",
              boxShadow: isSelected ? `0 0 0 2px ${hex}40` : "none",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: hex }}>{act.name}</span>
              <span className="text-xs text-zinc-500 capitalize">{act.type}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Today</span>
                <span className="text-zinc-300 font-mono">{formatHours(stats.today)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Week</span>
                <span className="text-zinc-300 font-mono">{formatHours(stats.week)}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────
   Activity Detail Panel
   ──────────────────────────────── */

function ActivityDetailPanel({
  activity,
  chartType,
  onChartTypeChange,
}: {
  activity: ActivityType;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
}) {
  const stats = getActivityStats(activity.id);
  const hex = getHex(activity.color);

  const chartTitles: Record<ChartType, string> = {
    none: "Chart Disabled",
    bar: "Last 7 Days",
    line: "30-Day Trend",
    calendar: "Activity Calendar",
  };

  return (
    <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700/50 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hex }} />
          <h2 className="text-xl font-bold text-zinc-100">{activity.name}</h2>
          <span className="text-xs px-2 py-0.5 bg-zinc-700 rounded-full text-zinc-400 capitalize">
            {activity.type}
          </span>
        </div>
        <ChartCustomizer value={chartType} onChange={onChartTypeChange} />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Today" value={formatHours(stats.today)} color={activity.color} />
        <StatCard label="This Week" value={formatHours(stats.week)} color={activity.color} />
        <StatCard label="This Month" value={formatHours(stats.month)} color={activity.color} />
      </div>

      {/* Chart */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-300">{chartTitles[chartType]}</h3>
        </div>
        <ActivityChart activity={activity} chartType={chartType} />
      </div>
    </div>
  );
}

/* ────────────────────────────────
   Main External Page
   ──────────────────────────────── */

export default function ExternalPage() {
  const [activities, setActivities] = useState<ActivityType[]>(DEFAULT_ACTIVITIES);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  const activeActivity = activities.find((a) => a.id === activeActivityId) || null;
  const selectedActivity = activities.find((a) => a.id === selectedActivityId) || null;

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleSelectActivity = useCallback((id: string) => {
    setSelectedActivityId(id);
    if (!activeActivityId) {
      setActiveActivityId(id);
      setIsRunning(true);
      setElapsed(0);
    }
  }, [activeActivityId]);

  const handleStart = useCallback(() => setIsRunning(true), []);
  const handlePause = useCallback(() => setIsRunning(false), []);
  const handleStop = useCallback(() => {
    setIsRunning(false);
    setActiveActivityId(null);
    setElapsed(0);
  }, []);

  const handleChartTypeChange = useCallback((type: ChartType) => {
    if (!selectedActivityId) return;
    setActivities((prev) =>
      prev.map((a) => (a.id === selectedActivityId ? { ...a, chartPreference: type } : a))
    );
  }, [selectedActivityId]);

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">External Activities</h1>
          <p className="text-sm text-zinc-400 mt-1">Track life activities with stopwatch and timers</p>
        </div>
      </div>

      {/* Always-visible Timer */}
      <TimerSection
        activeActivity={activeActivity}
        isRunning={isRunning}
        elapsed={elapsed}
        onStart={handleStart}
        onPause={handlePause}
        onStop={handleStop}
        onSelectActivity={handleSelectActivity}
        activities={activities}
      />

      {/* Activity Grid */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">Activities</h2>
        <ActivityGrid
          activities={activities}
          selectedId={selectedActivityId}
          onSelect={handleSelectActivity}
        />
      </div>

      {/* Activity Detail */}
      {selectedActivity && (
        <ActivityDetailPanel
          activity={selectedActivity}
          chartType={selectedActivity.chartPreference}
          onChartTypeChange={handleChartTypeChange}
        />
      )}
    </div>
  );
}
