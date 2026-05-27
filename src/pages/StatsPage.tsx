import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, TrendingUp, Zap, Calendar, BarChart3, X, Monitor,
  ChevronRight, ChevronLeft, Award, Activity, TrendingUp as TrendingUpIcon
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { getDateRange } from '../lib/dateRange';
import type { Period } from '../lib/dateRange';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

interface AppStat {
  app: string;
  category: string;
  total_ms: number;
  sessions: number;
  avg_session_ms: number;
  first_seen: string;
  last_seen: string;
}

interface StatsPageProps {
  appStats: AppStat[];
  logs: unknown[];
  dailyStats?: unknown[];
  selectedPeriod?: Period;
  dateOffset?: number;
  onDateOffsetChange?: (offset: number) => void;
  timeMode?: 'focus' | 'total';
  tierAssignments?: { productive: string[]; neutral: string[]; distracting: string[] };
}

// Category color map
const CATEGORY_COLORS: Record<string, string> = {
  'IDE': '#6366f1',
  'AI Tools': '#8b5cf6',
  'Browser': '#3b82f6',
  'Entertainment': '#ec4899',
  'Communication': '#14b8a6',
  'Design': '#a855f7',
  'Productivity': '#10b981',
  'Tools': '#f59e0b',
  'Other': '#64748b',
};

// Format duration in seconds to human-readable string
function formatDuration(seconds: number): string {
  const s = Math.round(seconds * 100) / 100;
  if (s < 60) return `${s}s`;
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const secs = Math.round(s % 60);
    return secs > 0 ? `${m}m ${secs}s` : `${m}m`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function StatsPage({ appStats, logs, selectedPeriod = 'week', dateOffset = 0, onDateOffsetChange, timeMode = 'total', tierAssignments }: StatsPageProps) {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [hourlyChartMode, setHourlyChartMode] = useState<'bar' | 'line'>('bar');
  const scrollPosRef = useRef(0);

  // Save scroll position continuously
  useEffect(() => {
    const handleScroll = () => {
      scrollPosRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Restore scroll position when selectedPeriod or dateOffset changes
  useLayoutEffect(() => {
    if (scrollPosRef.current > 0) {
      window.scrollTo(0, scrollPosRef.current);
    }
  }, [selectedPeriod, dateOffset]);
  const chartRefs = useRef<Record<string, ChartJS | null>>({});

  const getViewLabel = () => getDateRange(selectedPeriod, dateOffset).label;

  useEffect(() => {
    return () => {
      Object.values(chartRefs.current).forEach(chart => {
        if (chart) {
          chart.destroy();
        }
      });
      chartRefs.current = {};
    };
  }, []);

  // Filter logs based on period + dateOffset
  const filteredLogs = useMemo(() => {
    if (selectedPeriod === 'all') return logs;
    const range = getDateRange(selectedPeriod, dateOffset);
    return (logs as any[]).filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= range.start && logDate < range.end;
    });
  }, [logs, selectedPeriod, dateOffset]);

  // Filter and sort apps based on timeMode and filteredLogs
  const sortedApps = useMemo(() => {
    // Recompute app usage from filtered logs
    const appUsageMap: Record<string, { total_ms: number; sessions: number }> = {};
    (filteredLogs as any[]).forEach(log => {
      if (log.is_browser_tracking) return;
      const appName = log.app;
      if (!appUsageMap[appName]) {
        appUsageMap[appName] = { total_ms: 0, sessions: 0 };
      }
      appUsageMap[appName].total_ms += log.duration_ms || ((log.duration || 0) * 1000);
      appUsageMap[appName].sessions += 1;
    });

    // Transform into AppStat array format for compatibility
    const computedAppStats: AppStat[] = Object.entries(appUsageMap).map(([app, data]) => ({
      app,
      category: appStats.find(s => s.app === app)?.category || 'Other',
      total_ms: data.total_ms,
      sessions: data.sessions,
      avg_session_ms: data.sessions > 0 ? data.total_ms / data.sessions : 0,
      first_seen: '', // Not critical for sorting
      last_seen: ''   // Not critical for sorting
    }));

    const filtered = timeMode === 'focus' 
      ? computedAppStats.filter(app => tierAssignments?.productive.includes(app.category))
      : computedAppStats;
    return [...filtered].sort((a, b) => b.total_ms - a.total_ms);
  }, [filteredLogs, timeMode, tierAssignments, appStats]);

  // Aggregate stats - filtered by timeMode and filteredLogs
  const totals = useMemo(() => {
    const filteredApps = timeMode === 'focus'
      ? sortedApps.filter(app => tierAssignments?.productive.includes(app.category))
      : sortedApps;
    const totalTimeMs = filteredApps.reduce((sum, s) => sum + (s.total_ms || 0), 0);
    const totalSessions = filteredApps.reduce((sum, s) => sum + (s.sessions || 0), 0);
    const avgSession = totalSessions > 0 ? totalTimeMs / totalSessions : 0;
    const uniqueApps = filteredApps.length;
    return { totalTime: totalTimeMs, totalSessions, avgSession, uniqueApps };
  }, [sortedApps, timeMode, tierAssignments]);

  // Category breakdown - filtered by timeMode and filteredLogs
  const categoryBreakdown = useMemo(() => {
    const grouped: Record<string, number> = {};
    sortedApps.forEach(stat => {
      grouped[stat.category] = (grouped[stat.category] || 0) + stat.total_ms;
    });
    const filteredTotal = Object.values(grouped).reduce((sum, v) => sum + v, 0);
    return Object.entries(grouped)
      .map(([category, total_ms]) => ({ category, total_ms, pct: filteredTotal > 0 ? (total_ms / filteredTotal) * 100 : 0 }))
      .sort((a, b) => b.total_ms - a.total_ms);
  }, [sortedApps]);

  // Pie chart data for app distribution (from sortedApps)
  const pieData = useMemo(() => {
    return {
      labels: sortedApps.map(s => s.app),
      datasets: [{
        data: sortedApps.map(s => s.total_ms / 1000),
        backgroundColor: sortedApps.map((s, i) => {
          const catColor = CATEGORY_COLORS[s.category];
          if (catColor) return catColor + 'cc';
          const palette = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#f43f5e', '#84cc16', '#a855f7'];
          return palette[i % palette.length] + 'cc';
        }),
        borderColor: '#0a0a0a',
        borderWidth: 2,
      }]
    };
  }, [sortedApps]);

  // Daily/hourly usage data based on selected period + dateOffset
  const dailyUsage = useMemo(() => {
    const now = new Date();

    if (selectedPeriod === 'today') {
      const hourBuckets = Array.from({ length: 24 }, () => 0);

      for (const log of (filteredLogs as any[])) {
        const sessionStart = new Date(log.timestamp).getTime();
        const sessionEnd = sessionStart + ((log.duration || 0) * 1000);
        const logDate = new Date(sessionStart);

        let currentMs = sessionStart;
        while (currentMs < sessionEnd) {
          const currentHour = new Date(currentMs).getHours();
          const hourStart = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate(), currentHour).getTime();
          const hourEnd = hourStart + 3600000;
          const segmentStart = Math.max(currentMs, hourStart);
          const segmentEnd = Math.min(sessionEnd, hourEnd);
          const segmentSeconds = Math.max(0, (segmentEnd - segmentStart) / 1000);

          if (segmentSeconds > 0 && currentHour >= 0 && currentHour < 24) {
            hourBuckets[currentHour] += segmentSeconds;
          }

          currentMs = hourStart + 3600000;
        }
      }

      return hourBuckets.map((minutes, i) => ({
        hour: i,
        label: `${i.toString().padStart(2, '0')}:00`,
        minutes
      }));
    }

    if (selectedPeriod === 'week') {
      const now = new Date();
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);
      const targetWeekStart = new Date(currentWeekStart);
      targetWeekStart.setDate(targetWeekStart.getDate() - (dateOffset * 7));
      const daysInRange = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(targetWeekStart);
        d.setDate(d.getDate() + i);
        return d;
      });

      return daysInRange.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayLogs = (filteredLogs as any[]).filter(log => format(new Date(log.timestamp), 'yyyy-MM-dd') === dayStr);
        const totalMin = dayLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
        return { date: dayStr, label: format(day, 'EEE'), minutes: totalMin };
      });
    }

    if (selectedPeriod === 'month') {
      const range = getDateRange('month', dateOffset);
      const days: { date: string; label: string; minutes: number }[] = [];
      const cursor = new Date(range.start);
      while (cursor < range.end) {
        const dayStr = format(cursor, 'yyyy-MM-dd');
        const dayLogs = (filteredLogs as any[]).filter(log => format(new Date(log.timestamp), 'yyyy-MM-dd') === dayStr);
        const totalMin = dayLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
        days.push({ date: dayStr, label: `${cursor.getDate()}`, minutes: totalMin });
        cursor.setDate(cursor.getDate() + 1);
      }
      return days;
    }

    if (selectedPeriod === '7day') {
      const range = getDateRange('7day', dateOffset);
      const days: { date: string; label: string; minutes: number }[] = [];
      const cursor = new Date(range.start);
      while (cursor < range.end) {
        const dayStr = format(cursor, 'yyyy-MM-dd');
        const dayLogs = (filteredLogs as any[]).filter(log => format(new Date(log.timestamp), 'yyyy-MM-dd') === dayStr);
        const totalMin = dayLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
        days.push({ date: dayStr, label: format(cursor, 'EEE'), minutes: totalMin });
        cursor.setDate(cursor.getDate() + 1);
      }
      return days;
    }

    if (selectedPeriod === '30day') {
      const range = getDateRange('30day', dateOffset);
      const days: { date: string; label: string; minutes: number }[] = [];
      const cursor = new Date(range.start);
      while (cursor < range.end) {
        const dayStr = format(cursor, 'yyyy-MM-dd');
        const dayLogs = (filteredLogs as any[]).filter(log => format(new Date(log.timestamp), 'yyyy-MM-dd') === dayStr);
        const totalMin = dayLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
        days.push({ date: dayStr, label: format(cursor, 'MMM dd'), minutes: totalMin });
        cursor.setDate(cursor.getDate() + 1);
      }
      return days;
    }

    // 'all'
    const monthMap: Record<string, { total: number }> = {};
    (filteredLogs as any[]).forEach(log => {
      const key = format(new Date(log.timestamp), 'yyyy-MM');
      if (!monthMap[key]) monthMap[key] = { total: 0 };
      monthMap[key].total += log.duration || 0;
    });
    return Object.entries(monthMap).map(([key, val]) => ({
      date: key,
      label: format(new Date(key + '-01'), 'MMM yy'),
      minutes: val.total
    }));
  }, [filteredLogs, selectedPeriod, dateOffset]);

  // Hourly distribution (computed from filteredLogs)
  const hourlyDistribution = useMemo(() => {
    const hourBuckets = Array.from({ length: 24 }, () => 0);

    for (const log of (filteredLogs as any[])) {
      if (log.is_browser_tracking) continue;
      const sessionStart = new Date(log.timestamp).getTime();
      const sessionEnd = sessionStart + ((log.duration || 0) * 1000);

      let currentMs = sessionStart;
      while (currentMs < sessionEnd) {
        const currentHour = new Date(currentMs).getHours();
        const currentDate = new Date(currentMs);
        const hourStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), currentHour).getTime();
        const hourEnd = hourStart + 3600000;
        const segmentStart = Math.max(currentMs, hourStart);
        const segmentEnd = Math.min(sessionEnd, hourEnd);
        const segmentSeconds = Math.max(0, (segmentEnd - segmentStart) / 1000);

        if (segmentSeconds > 0 && currentHour >= 0 && currentHour < 24) {
          hourBuckets[currentHour] += segmentSeconds;
        }

        currentMs = hourStart + 3600000;
      }
    }

    return hourBuckets.map((minutes, hour) => ({ hour, minutes }));
  }, [filteredLogs]);

  // Selected app detailed data
  const selectedAppData = useMemo(() => {
    if (!selectedApp) return null;
    const stat = appStats.find(s => s.app === selectedApp);
    if (!stat) return null;

    // Session timeline - filter filteredLogs for this app
    const appLogs = (filteredLogs as any[]).filter(log => log.app === selectedApp).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Daily breakdown for this app - ALWAYS 7 days
    const now = new Date();
    const startDate = subDays(now, 6); // Always 7 days
    const daysInRange = eachDayOfInterval({ start: startDate, end: now });

    const dailyBreakdown = daysInRange.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayLogs = appLogs.filter(log => format(new Date(log.timestamp), 'yyyy-MM-dd') === dayStr);
      const totalSec = dayLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
      return { date: dayStr, label: format(day, 'MMM dd'), seconds: totalSec, sessions: dayLogs.length };
    });

    // Hourly distribution for this app — split duration across hours
    const hourlyDist = Array.from({ length: 24 }, () => ({ hour: 0, seconds: 0, sessions: 0 }));
    for (let i = 0; i < 24; i++) hourlyDist[i].hour = i;

    for (const log of (appLogs as any[])) {
      const sessionStart = new Date(log.timestamp).getTime();
      const sessionEnd = sessionStart + ((log.duration || 0) * 1000);

      let currentMs = sessionStart;
      while (currentMs < sessionEnd) {
        const currentHour = new Date(currentMs).getHours();
        const currentDate = new Date(currentMs);
        const hourStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), currentHour).getTime();
        const hourEnd = hourStart + 3600000;
        const segmentStart = Math.max(currentMs, hourStart);
        const segmentEnd = Math.min(sessionEnd, hourEnd);
        const segmentSeconds = Math.max(0, (segmentEnd - segmentStart) / 1000);

        if (segmentSeconds > 0 && currentHour >= 0 && currentHour < 24) {
          hourlyDist[currentHour].seconds += segmentSeconds;
        }

        currentMs = hourStart + 3600000;
      }
      hourlyDist[new Date(log.timestamp).getHours()].sessions += 1;
    }

    // Peak hours
    const peakHour = hourlyDist.reduce((max, h) => h.seconds > max.seconds ? h : max, hourlyDist[0]);

    // Longest session (in seconds)
    const longestSession = appLogs.length > 0
      ? Math.max(...appLogs.map(log => log.duration || 0))
      : 0;

    // Productivity estimate (based on category)
    const productiveCategories = ['IDE', 'AI Tools', 'Productivity', 'Tools'];
    // Deterministic score based on app name hash + category
    const baseScore = productiveCategories.includes(stat.category) ? 85 : 45;
    const hashVariation = (stat.app.charCodeAt(0) % 15);
    const productivityScore = baseScore + hashVariation;

    return {
      stat,
      appLogs,
      dailyBreakdown,
      hourlyDist,
      peakHour,
      longestSession,
      productivityScore,
      totalSessions: appLogs.length,
    };
  }, [selectedApp, appStats, filteredLogs]);

  // Chart data for daily usage (values in seconds)
  const dailyChartData = {
    labels: dailyUsage.map(d => d.label),
    datasets: [{
      label: 'Daily Usage',
      data: dailyUsage.map(d => d.minutes), // values are in seconds
      backgroundColor: 'rgba(99, 102, 241, 0.5)',
      borderColor: '#6366f1',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
    }]
  };

  const dailyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        titleColor: '#fff',
        bodyColor: '#a1a1aa',
        borderColor: '#3f3f46',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (ctx: any) => ` ${formatDuration(ctx.parsed.y)}`,
        }
      }
    },
    scales: {
      x: {
        grid: { color: '#27272a' },
        ticks: { color: '#71717a', maxTicksLimit: 10 }
      },
      y: {
        grid: { color: '#27272a' },
        ticks: {
          color: '#71717a',
          callback: (v: any) => formatDuration(v),
        },
        beginAtZero: true,
      }
    },
  };

  // Hourly chart data
  const hourlyChartData = {
    labels: hourlyDistribution.map(h => `${h.hour.toString().padStart(2, '0')}:00`),
    datasets: [{
      label: 'Minutes',
      data: hourlyDistribution.map(h => h.minutes),
      backgroundColor: hourlyDistribution.map((_, i) => {
        const currentHour = new Date().getHours();
        return i === currentHour ? '#10b981' : 'rgba(99, 102, 241, 0.6)';
      }),
      borderColor: hourlyDistribution.map((_, i) => {
        const currentHour = new Date().getHours();
        return i === currentHour ? '#059669' : '#6366f1';
      }),
      borderWidth: 1,
      borderRadius: 4,
    }]
  };

  const hourlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        titleColor: '#fff',
        bodyColor: '#a1a1aa',
        borderColor: '#3f3f46',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (ctx: any) => ` ${formatDuration(ctx.parsed.y)}`,
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#71717a', maxTicksLimit: 12 }
      },
      y: {
        grid: { color: '#27272a' },
        ticks: {
          color: '#71717a',
          callback: (v: any) => formatDuration(v),
        },
        beginAtZero: true,
      }
    },
  };

  // Line chart version of hourly data (connected dots)
  const hourlyLineChartData = {
    labels: hourlyDistribution.map(h => `${h.hour.toString().padStart(2, '0')}:00`),
    datasets: [{
      label: 'Minutes',
      data: hourlyDistribution.map(h => h.minutes),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      fill: true,
      tension: 0.3,
      pointBackgroundColor: hourlyDistribution.map((_, i) => {
        const currentHour = new Date().getHours();
        return i === currentHour ? '#10b981' : '#6366f1';
      }),
      pointBorderColor: hourlyDistribution.map((_, i) => {
        const currentHour = new Date().getHours();
        return i === currentHour ? '#059669' : '#6366f1';
      }),
      pointRadius: 4,
      pointHoverRadius: 6,
    }]
  };

  const hourlyLineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(24, 24, 27, 0.95)',
        titleColor: '#fff',
        bodyColor: '#a1a1aa',
        borderColor: '#3f3f46',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (ctx: any) => ` ${formatDuration(ctx.parsed.y)}`,
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#71717a', maxTicksLimit: 12 }
      },
      y: {
        grid: { color: '#27272a' },
        ticks: {
          color: '#71717a',
          callback: (v: any) => formatDuration(v),
        },
        beginAtZero: true,
      }
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
    {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-zinc-500 mt-1">Track your application usage</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium px-2 text-zinc-400">
            {getViewLabel()}
          </span>
        </div>
      </div>

      {/* App Time Distribution & Top Applications */}
      <div className="flex gap-8">
        <div className="flex-1 glass rounded-3xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="text-xl font-semibold">App Time Distribution</div>
              <div className="text-sm text-zinc-500">{getViewLabel()}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold tabular-nums">
                {Math.floor(totals.totalTime / 3600000)}h {Math.floor((totals.totalTime % 3600000) / 60000)}m
              </div>
              <div className="text-xs text-zinc-500">Total Time</div>
            </div>
          </div>
          {sortedApps.length > 0 ? (
            <div className="chart-container h-64">
              <Pie data={pieData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { color: '#a1a1aa', padding: 18, usePointStyle: true } },
                  tooltip: {
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#a1a1aa',
                    borderColor: '#3f3f46',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                      label: (ctx: any) => {
                        const total = (ctx.dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
                        const val = ctx.parsed as number;
                        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                        return ` ${ctx.label}: ${formatDuration(val)} (${pct}%)`;
                      }
                    }
                  }
                }
              }} />
            </div>
          ) : (
            <div className="text-center py-16 text-zinc-500">
              No data available yet
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div className="glass rounded-3xl p-8">
            <div className="text-xl font-semibold mb-6">Top Applications</div>
            {sortedApps.slice(0, 6).map((app) => {
              const catColor = CATEGORY_COLORS[app.category] || '#64748b';
              const pct = totals.totalTime > 0 ? Math.round((app.total_ms / totals.totalTime) * 100) : 0;
              return (
                <div key={app.app} className="flex items-center py-4 border-b border-zinc-800 last:border-none">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: catColor + '22' }}>
                    <Monitor className="w-4 h-4" style={{ color: catColor }} />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="font-medium">{app.app}</div>
                    <div className="text-xs" style={{ color: catColor }}>{app.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono tabular-nums">
                      {Math.floor(app.total_ms / 3600000)}h {Math.floor((app.total_ms % 3600000) / 60000)}m
                    </div>
                    <div className="text-xs text-emerald-400">{pct}%</div>
                  </div>
                </div>
              );
            })}
            {sortedApps.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                No applications tracked yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Time', value: `${Math.floor(totals.totalTime / 3600000)}h ${Math.floor((totals.totalTime % 3600000) / 60000)}m`, icon: Clock, color: 'text-emerald-400' },
          { label: 'Total Sessions', value: totals.totalSessions, icon: Activity, color: 'text-indigo-400' },
          { label: 'Avg Session', value: `${Math.floor(totals.avgSession / 60000)}m`, icon: TrendingUp, color: 'text-violet-400' },
          { label: 'Active Apps', value: totals.uniqueApps, icon: Monitor, color: 'text-amber-400' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            className="glass rounded-3xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div className="text-xs text-zinc-500">LIVE</div>
            </div>
            <div className={`text-3xl font-semibold tabular-nums tracking-tight ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-zinc-400 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

{/* Hourly Distribution */}
      <div className="glass rounded-3xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {hourlyChartMode === 'bar' ? (
              <BarChart3 className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingUpIcon className="w-5 h-5 text-indigo-400" />
            )}
            <div>
              <div className="text-xl font-semibold">
                {selectedPeriod === 'today' ? 'Hourly Activity' : 'Daily Usage Trend'}
              </div>
              <div className="text-sm text-zinc-500">
                {selectedPeriod === 'today' ? 'Activity by hour of day' : `${selectedPeriod === 'week' ? '7 days' : selectedPeriod === '7day' ? '7 days' : selectedPeriod === 'month' ? 'all days' : selectedPeriod === '30day' ? '30 days' : 'all time'} of activity`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-zinc-800/50 p-1 rounded-lg">
            <button
              onClick={() => setHourlyChartMode('bar')}
              className={`p-2 rounded-md transition-all ${
                hourlyChartMode === 'bar'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Bar Chart"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setHourlyChartMode('line')}
              className={`p-2 rounded-md transition-all ${
                hourlyChartMode === 'line'
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Line Chart"
            >
              <TrendingUpIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="h-56">
          {hourlyChartMode === 'bar' ? (
            selectedPeriod === 'today' ? (
              <Bar data={hourlyChartData} options={hourlyChartOptions} />
            ) : (
              <Bar data={dailyChartData} options={dailyChartOptions} />
            )
          ) : (
            selectedPeriod === 'today' ? (
              <Line data={hourlyLineChartData} options={hourlyLineChartOptions} />
            ) : (
              <Line data={dailyChartData} options={dailyChartOptions} />
            )
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="glass rounded-3xl p-8">
        <h2 className="text-xl font-semibold mb-6">Category Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categoryBreakdown.map(({ category, total_ms, pct }) => (
            <div key={category} className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[category] || '#64748b' }}
                />
                <span className="text-sm font-medium">{category}</span>
              </div>
              <div className="text-2xl font-semibold tabular-nums">
                {Math.floor(total_ms / 60000)}m
              </div>
              <div className="text-xs text-zinc-500 mt-1">{pct.toFixed(1)}% of total</div>
              <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[category] || '#64748b' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-App Cards */}
      <div className="glass rounded-3xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Application Statistics</h2>
            <p className="text-sm text-zinc-500 mt-1">Click an app to view detailed stats</p>
          </div>
          <div className="text-xs text-zinc-500">{sortedApps.length} apps</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedApps.map((stat) => {
            const catColor = CATEGORY_COLORS[stat.category] || '#64748b';
            const isSelected = selectedApp === stat.app;
            return (
              <motion.div
                key={stat.app}
                className={`rounded-2xl p-5 border cursor-pointer transition ${
                  isSelected
                    ? 'bg-zinc-800/80 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                    : 'bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-700'
                }`}
                onClick={() => setSelectedApp(isSelected ? null : stat.app)}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: catColor + '22' }}
                    >
                      <Monitor className="w-5 h-5" style={{ color: catColor }} />
                    </div>
                    <div>
                      <div className="font-medium text-sm truncate max-w-[140px]" title={stat.app}>{stat.app}</div>
                      <div className="text-xs" style={{ color: catColor }}>{stat.category}</div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total Time</span>
                    <span className="font-mono text-white">
                      {Math.floor(stat.total_ms / 3600000)}h {Math.floor((stat.total_ms % 3600000) / 60000)}m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Sessions</span>
                    <span className="font-mono text-emerald-400">{stat.sessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Avg Session</span>
                    <span className="font-mono text-zinc-300">{Math.floor(stat.avg_session_ms / 60000)}m</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {sortedApps.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
            <p>No statistics available yet. Start using your computer to collect data.</p>
          </div>
        )}
      </div>

      {/* Selected App Detail Modal */}
      <AnimatePresence>
        {selectedAppData && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-50 p-8"
            onClick={() => setSelectedApp(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass rounded-3xl p-8 w-full max-w-3xl max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: (CATEGORY_COLORS[selectedAppData.stat.category] || '#64748b') + '22' }}
                  >
                    <Monitor
                      className="w-7 h-7"
                      style={{ color: CATEGORY_COLORS[selectedAppData.stat.category] || '#64748b' }}
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">{selectedAppData.stat.app}</h2>
                    <div className="text-sm" style={{ color: CATEGORY_COLORS[selectedAppData.stat.category] || '#64748b' }}>
                      {selectedAppData.stat.category}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedApp(null)} className="text-zinc-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  {
                    label: 'Total Time',
                    value: `${Math.floor(selectedAppData.stat.total_ms / 3600000)}h ${Math.floor((selectedAppData.stat.total_ms % 3600000) / 60000)}m`,
                    icon: Clock,
                    color: 'text-emerald-400'
                  },
                  {
                    label: 'Sessions',
                    value: selectedAppData.totalSessions,
                    icon: Activity,
                    color: 'text-indigo-400'
                  },
                  {
                    label: 'Peak Hour',
                    value: `${selectedAppData.peakHour.hour.toString().padStart(2, '0')}:00`,
                    icon: Zap,
                    color: 'text-amber-400'
                  },
                  {
                    label: 'Longest Session',
                    value: formatDuration(selectedAppData.longestSession),
                    icon: Award,
                    color: 'text-violet-400'
                  },
                ].map((metric, idx) => (
                  <div key={idx} className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                    <metric.icon className={`w-5 h-5 ${metric.color} mb-2`} />
                    <div className={`text-xl font-semibold tabular-nums ${metric.color}`}>{metric.value}</div>
                    <div className="text-xs text-zinc-500 mt-1">{metric.label}</div>
                  </div>
                ))}
              </div>

              {/* Daily Trend for This App */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Daily Usage</h3>
                <div className="h-48">
                  <Bar
                    data={{
                      labels: selectedAppData.dailyBreakdown.map(d => d.label),
                      datasets: [{
                        label: 'Duration',
                        data: selectedAppData.dailyBreakdown.map(d => d.seconds),
                        backgroundColor: (CATEGORY_COLORS[selectedAppData.stat.category] || '#6366f1') + '88',
                        borderColor: CATEGORY_COLORS[selectedAppData.stat.category] || '#6366f1',
                        borderWidth: 1,
                        borderRadius: 4,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { 
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: '#18181b',
                          borderColor: '#3f3f46',
                          borderWidth: 1,
                          titleColor: '#e4e4e7',
                          bodyColor: '#a1a1aa',
                          padding: 10,
                          cornerRadius: 8,
                          callbacks: {
                            label: (ctx: any) => ` ${formatDuration(ctx.parsed.y)}`,
                          }
                        }
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: '#71717a', maxTicksLimit: 10 } },
                        y: { 
                          grid: { color: '#27272a' }, 
                          ticks: { 
                            color: '#71717a',
                            callback: (v: any) => formatDuration(v),
                          }, 
                          beginAtZero: true 
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Hourly Distribution for This App */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Hourly Activity</h3>
                <div className="h-40">
                  <Bar
                    data={{
                      labels: selectedAppData.hourlyDist.map(h => `${h.hour.toString().padStart(2, '0')}:00`),
                      datasets: [{
                        label: 'Duration',
                        data: selectedAppData.hourlyDist.map(h => h.seconds),
                        backgroundColor: selectedAppData.hourlyDist.map((h, i) => {
                          const currentHour = new Date().getHours();
                          return i === currentHour
                            ? (CATEGORY_COLORS[selectedAppData.stat.category] || '#10b981')
                            : (CATEGORY_COLORS[selectedAppData.stat.category] || '#6366f1') + '66';
                        }),
                        borderRadius: 4,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { 
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: '#18181b',
                          borderColor: '#3f3f46',
                          borderWidth: 1,
                          titleColor: '#e4e4e7',
                          bodyColor: '#a1a1aa',
                          padding: 10,
                          cornerRadius: 8,
                          callbacks: {
                            label: (ctx: any) => ` ${formatDuration(ctx.parsed.y)}`,
                          }
                        }
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: '#71717a', maxTicksLimit: 12 } },
                        y: { 
                          grid: { color: '#27272a' }, 
                          ticks: { 
                            color: '#71717a',
                            callback: (v: any) => formatDuration(v),
                          }, 
                          beginAtZero: true 
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                  <div className="text-sm text-zinc-500 mb-1">First Seen</div>
                  <div className="font-mono text-white">
                    {new Date(selectedAppData.stat.first_seen).toLocaleDateString('en-US', {
                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </div>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50">
                  <div className="text-sm text-zinc-500 mb-1">Last Seen</div>
                  <div className="font-mono text-white">
                    {new Date(selectedAppData.stat.last_seen).toLocaleDateString('en-US', {
                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              {/* Productivity Score */}
              <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-400" />
                    <span className="font-medium">Productivity Estimate</span>
                  </div>
                  <span className="text-2xl font-semibold text-emerald-400">
                    {Math.round(selectedAppData.productivityScore)}/100
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all"
                    style={{ width: `${selectedAppData.productivityScore}%` }}
                  />
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  Based on category classification. {selectedAppData.stat.category} is considered {selectedAppData.productivityScore > 70 ? 'highly' : 'moderately'} productive.
                </div>
              </div>

              {/* Recent Sessions */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedAppData.appLogs.slice(-10).reverse().map((log: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-2 px-3 bg-zinc-900/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-zinc-500 font-mono">
                          {format(new Date(log.timestamp), 'MMM dd, HH:mm')}
                        </div>
                        {log.title && (
                          <div className="text-xs text-zinc-400 truncate max-w-[200px]">{log.title}</div>
                        )}
                      </div>
                      <div className="text-sm font-mono text-white">{formatDuration(log.duration || 0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
