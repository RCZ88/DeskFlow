import { useState, useEffect, useMemo, useRef } from 'react';
import { subDays, format } from 'date-fns';
import type { Period } from '../lib/dateRange';
import { BarChart3, Clock, Target, Moon, TrendingUp, TrendingDown, Activity, Zap, Sun, Globe, Monitor, PieChart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface ExternalStats {
  byActivity: Record<string, { total_seconds: number; session_count: number }>;
  total_seconds: number;
  sleep_deficit_seconds: number;
  average_sleep_hours: number;
}

interface ConsistencyData {
  score: number;
  weekly_comparison: Array<{ week: string; total_seconds: number }>;
}

interface SleepTrend {
  daily: Array<{ date: string; sleep_seconds: number; deficit_seconds: number }>;
  average_bedtime: string;
  average_wake_time: string;
}

interface ActivityBucket {
  activity: string;
  seconds: number;
  percentage: number;
  color: string;
}

interface HourCell {
  activities: ActivityBucket[];
  totalSeconds: number;
  dominantActivity: string;
  hasExternal: boolean;
  hasDevice: boolean;
}

interface TypicalDayData {
  grid: HourCell[][];
  legend: Array<{ activity: string; color: string; totalSeconds: number }>;
  stats: {
    totalHours: number;
    mostActiveHour: { hour: number; day: number };
    mostActiveDay: number;
    activityBreakdown: Record<string, number>;
  };
  generatedAt: string;
  daysCovered: number;
}

interface AppStat {
  app: string;
  category: string;
  total_ms: number;
  sessions: number;
}

interface InsightsPageProps {
  logs?: any[];
  browserLogs?: any[];
  appStats?: AppStat[];
  selectedPeriod?: Period;
  tierAssignments?: { productive: string[]; neutral: string[]; distracting: string[] };
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CATEGORY_COLORS: Record<string, string> = {
  'IDE': '#6366f1',
  'AI Tools': '#8b5cf6',
  'Browser': '#3b82f6',
  'Entertainment': '#ec4899',
  'Communication': '#14b8a6',
  'Design': '#a855f7',
  'Productivity': '#10b981',
  'Tools': '#f59e0b',
  'Developer Tools': '#10b981',
  'Social Media': '#f97316',
  'News': '#eab308',
  'Shopping': '#ec4899',
  'Education': '#06b6d4',
  'Uncategorized': '#78716c',
  'Other': '#64748b',
};

function resolveActivityColor(name: string): string {
  const saved = localStorage.getItem(`deskflow-category-color-${name}`);
  if (saved) return saved;
  return CATEGORY_COLORS[name] || '#6b7280';
}

const hourLabels = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return '12a';
  if (i < 12) return `${i}a`;
  if (i === 12) return '12p';
  return `${i - 12}p`;
});

export default function InsightsPage({
  logs = [],
  browserLogs = [],
  appStats = [],
  selectedPeriod: parentPeriod = 'week',
  tierAssignments = { productive: ['IDE', 'AI Tools', 'Developer Tools', 'Education', 'Productivity', 'Tools'], neutral: ['Communication', 'Design', 'Search Engine', 'News', 'Uncategorized', 'Other', 'Browser'], distracting: ['Entertainment', 'Social Media', 'Shopping'] },
}: InsightsPageProps) {
  const [stats, setStats] = useState<ExternalStats>({ byActivity: {}, total_seconds: 0, sleep_deficit_seconds: 0, average_sleep_hours: 0 });
  const [consistency, setConsistency] = useState<ConsistencyData & { this_week: number; last_week: number; trend: string; streak: number }>({ score: 0, weekly_comparison: [], this_week: 0, last_week: 0, trend: 'stable', streak: 0 });
  const [sleepTrends, setSleepTrends] = useState<SleepTrend>({ daily: [], average_bedtime: '', average_wake_time: '' });
  const [bestDays, setBestDays] = useState<{ bestDay: string; worstDay: string; averages: Record<string, number> }>({ bestDay: 'Mon', worstDay: 'Sun', averages: {} });
  const [typicalDayData, setTypicalDayData] = useState<TypicalDayData | null>(null);
  const [tooltip, setTooltip] = useState<{ day: number; hour: number; x: number; y: number } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [activeTab, setActiveTab] = useState<'typical' | 'weekly' | 'activities'>('typical');

  useEffect(() => {
    const p = selectedPeriod === 'week' ? 'week' : 'month';
    window.deskflowAPI?.getExternalStats(p).then(setStats);
    window.deskflowAPI?.getConsistencyScore(selectedPeriod).then(setConsistency);
    window.deskflowAPI?.getSleepTrends(selectedPeriod).then(setSleepTrends);
    window.deskflowAPI?.getBestDays().then(setBestDays);
    window.deskflowAPI?.getTypicalDay(30).then((result: any) => {
      if (result?.grid) setTypicalDayData(result as TypicalDayData);
    });
  }, [selectedPeriod]);

  const sleepTrendData = useMemo(() => {
    const days = selectedPeriod === 'week' ? 7 : 30;
    const labels: string[] = [];
    const sleepData: number[] = [];
    const deficitData: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      labels.push(format(date, 'MMM d'));
      const dayStr = format(date, 'yyyy-MM-dd');
      const dayData = sleepTrends.daily.find(d => d.date === dayStr);
      sleepData.push((dayData?.sleep_seconds || 0) / 3600);
      deficitData.push((dayData?.deficit_seconds || 0) / 3600);
    }
    return { labels, sleepData, deficitData };
  }, [sleepTrends, selectedPeriod]);

  const weeklyData = useMemo(() => {
    const labels = consistency.weekly_comparison.map(w => w.week.slice(5));
    const data = consistency.weekly_comparison.map(w => w.total_seconds / 3600);
    return { labels, data };
  }, [consistency]);

  const dayOfWeekData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = days.map(d => bestDays.averages[d] || 0);
    const max = Math.max(...data, 1);
    return { labels: days, data, max };
  }, [bestDays]);

  const breakdownColors = useMemo(() => {
    const labels = Object.keys(stats.byActivity);
    return labels.map((_, i) => {
      const colors = ['#22c55e', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16', '#a855f7'];
      return colors[i % colors.length];
    });
  }, [stats]);

  const trend = useMemo(() => {
    if (!consistency.trend) return { icon: Activity, color: 'text-zinc-400', text: 'Stable' };
    if (consistency.trend === 'up') return { icon: TrendingUp, color: 'text-emerald-400', text: 'Improving' };
    if (consistency.trend === 'down') return { icon: TrendingDown, color: 'text-red-400', text: 'Declining' };
    return { icon: Activity, color: 'text-zinc-400', text: 'Stable' };
  }, [consistency]);

  const patchedTypicalDay = useMemo(() => {
    if (!typicalDayData) return null;
    const grid = typicalDayData.grid.map(dayRow =>
      dayRow.map(cell => ({
        ...cell,
        activities: cell.activities.map(a => ({
          ...a,
          color: a.color || resolveActivityColor(a.activity)
        }))
      }))
    );
    const legend = typicalDayData.legend.map(item => ({
      ...item,
      color: item.color || resolveActivityColor(item.activity)
    }));
    return { ...typicalDayData, grid, legend };
  }, [typicalDayData]);

  // --- Core tracking data computations (from new props) ---

  const appUsageBreakdown = useMemo(() => {
    const usage: Record<string, number> = {};
    for (const log of logs) {
      if (log.is_browser_tracking) continue;
      const app = log.app || 'Unknown';
      usage[app] = (usage[app] || 0) + (log.duration || 0);
    }
    for (const log of browserLogs) {
      const domain = log.domain || log.app || 'Unknown';
      usage[domain] = (usage[domain] || 0) + (log.duration || 0);
    }
    return Object.entries(usage)
      .map(([name, seconds]) => ({ name, seconds }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [logs, browserLogs]);

  const topApps = useMemo(() => {
    return appUsageBreakdown.slice(0, 5);
  }, [appUsageBreakdown]);

  const leastUsedApps = useMemo(() => {
    return appUsageBreakdown.filter(a => a.seconds > 60).slice(-5).reverse();
  }, [appUsageBreakdown]);

  const browserCategoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    for (const log of browserLogs) {
      const cat = log.category || 'Other';
      categories[cat] = (categories[cat] || 0) + ((log.duration || 0) * 1000);
    }
    const sorted = Object.entries(categories)
      .map(([category, total_ms]) => ({ category, total_ms }))
      .sort((a, b) => b.total_ms - a.total_ms);
    const totalBrowserTime = sorted.reduce((s, c) => s + c.total_ms, 0);
    return { data: sorted, totalBrowserTime };
  }, [browserLogs]);

  const tierDistribution = useMemo(() => {
    const tiers = { productive: 0, neutral: 0, distracting: 0 };
    for (const stat of appStats) {
      const cat = stat.category;
      if (tierAssignments.productive.includes(cat)) tiers.productive += stat.total_ms;
      else if (tierAssignments.distracting.includes(cat)) tiers.distracting += stat.total_ms;
      else tiers.neutral += stat.total_ms;
    }
    for (const log of browserLogs) {
      const cat = log.category || 'Other';
      const ms = (log.duration || 0) * 1000;
      if (tierAssignments.productive.includes(cat)) tiers.productive += ms;
      else if (tierAssignments.distracting.includes(cat)) tiers.distracting += ms;
      else tiers.neutral += ms;
    }
    const total = tiers.productive + tiers.neutral + tiers.distracting;
    const weighted = tiers.productive + (tiers.neutral * 0.5);
    const score = total > 0 ? (weighted / total) * 100 : 0;
    return { ...tiers, total, score };
  }, [appStats, browserLogs, tierAssignments]);

  const timeSplit = useMemo(() => {
    const deviceSec = logs.reduce((s, l) => s + (l.duration || 0), 0) +
      browserLogs.reduce((s, l) => s + (l.duration || 0), 0);
    const externalSec = stats.total_seconds;
    return { deviceSec, externalSec, total: deviceSec + externalSec };
  }, [logs, browserLogs, stats.total_seconds]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Insights</h1>
            <p className="text-xs text-zinc-500">Deep dive into your productivity patterns</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-800/50 rounded-lg p-0.5 border border-zinc-700/50">
            {(['typical', 'weekly', 'activities'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === tab
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                {tab === 'typical' ? 'Day' : tab === 'weekly' ? 'Weekly' : 'Activity'}
              </button>
            ))}
          </div>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300 cursor-pointer hover:border-zinc-600 transition-colors"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-5 gap-4"
        >
          {[
            { icon: Clock, label: 'Total Time', value: formatHours(stats.total_seconds), color: 'text-emerald-400', bg: 'bg-emerald-500/10', sub: `${Object.keys(stats.byActivity).length} activities` },
            { icon: Target, label: 'Consistency', value: `${consistency.score}%`, color: consistency.score >= 70 ? 'text-emerald-400' : consistency.score >= 40 ? 'text-amber-400' : 'text-red-400', bg: 'bg-zinc-800/60', sub: trend.text, subIcon: trend.icon },
            { icon: Zap, label: 'Streak', value: `🔥 ${consistency.streak}w`, color: 'text-amber-400', bg: 'bg-zinc-800/60', sub: `${formatHours(consistency.this_week || 0)} this week` },
            { icon: Sun, label: 'Best Day', value: bestDays.bestDay, color: 'text-emerald-400', bg: 'bg-zinc-800/60', sub: `Worst: ${bestDays.worstDay}` },
            { icon: Moon, label: 'Sleep Deficit', value: stats.sleep_deficit_seconds < 0 ? '-' + formatHours(Math.abs(stats.sleep_deficit_seconds)) : formatHours(stats.sleep_deficit_seconds), color: stats.sleep_deficit_seconds < 0 ? 'text-red-400' : stats.sleep_deficit_seconds > 0 ? 'text-emerald-400' : 'text-zinc-400', bg: 'bg-zinc-800/60', sub: `${stats.average_sleep_hours?.toFixed(1) || '?'}h avg` },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/0 to-zinc-800/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-4 overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/3 to-transparent rounded-bl-full" />
                <div className="flex items-center gap-2 text-zinc-500 mb-1.5">
                  <card.icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium tracking-wide uppercase">{card.label}</span>
                </div>
                <div className={`text-xl font-bold ${card.color} tracking-tight`}>{card.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {'subIcon' in card && card.subIcon ? <card.subIcon className="w-3 h-3 text-zinc-500" /> : null}
                  <span className="text-[11px] text-zinc-600">{card.sub}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {activeTab === 'typical' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Typical Day</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {typicalDayData ? `Activity patterns across ${typicalDayData.daysCovered} days` : 'Loading...'}
                </p>
              </div>
              {typicalDayData && (
                <div className="text-xs text-zinc-600">
                  Updated {new Date(typicalDayData.generatedAt).toLocaleTimeString()}
                </div>
              )}
            </div>

            {patchedTypicalDay ? (() => {
              const data = patchedTypicalDay;

              const fmt = (s: number) => {
                if (s < 60) return `${s}s`;
                if (s < 3600) return `${Math.round(s / 60)}m`;
                return `${(s / 3600).toFixed(1)}h`;
              };

              const cellBg = (cell: HourCell) => {
                if (cell.activities.length === 0) return 'rgba(39, 39, 42, 0.5)';
                if (cell.activities.length === 1) {
                  const secs = cell.totalSeconds;
                  if (secs >= 2700) return 'rgba(16, 185, 129, 0.9)';
                  if (secs >= 1200) return 'rgba(16, 185, 129, 0.6)';
                  if (secs >= 300) return 'rgba(16, 185, 129, 0.35)';
                  return 'rgba(16, 185, 129, 0.15)';
                }
                const segments = cell.activities.map((a, i) => {
                  const start = cell.activities.slice(0, i).reduce((s, x) => s + x.percentage, 0);
                  return `${a.color} ${start}% ${start + a.percentage}%`;
                });
                return `linear-gradient(90deg, ${segments.join(', ')})`;
              };

              return (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-zinc-900/50 rounded-lg p-3">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Total Hours</div>
                      <div className="text-xl font-bold text-zinc-100 mt-0.5">{data.stats.totalHours}h</div>
                      <div className="text-[10px] text-zinc-600">avg per day</div>
                    </div>
                    <div className="bg-zinc-900/50 rounded-lg p-3">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Most Active</div>
                      <div className="text-xl font-bold text-zinc-100 mt-0.5">{DAY_LABELS[data.stats.mostActiveDay]}</div>
                      <div className="text-[10px] text-zinc-600">day of week</div>
                    </div>
                    <div className="bg-zinc-900/50 rounded-lg p-3">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Peak Hour</div>
                      <div className="text-xl font-bold text-zinc-100 mt-0.5">{hourLabels[data.stats.mostActiveHour.hour]}</div>
                      <div className="text-[10px] text-zinc-600">{DAY_LABELS[data.stats.mostActiveHour.day]}</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="flex ml-[34px] mb-1 gap-[2px]">
                      {hourLabels.map((l, i) => (
                        <div key={i} className="flex-1 text-[9px] text-zinc-600 text-center leading-none" style={{ visibility: i % 3 === 0 ? 'visible' : 'hidden' }}>
                          {l}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-[3px]">
                      {data.grid.map((dayData, dayIdx) => (
                        <div key={dayIdx} className="flex items-center">
                          <div className="w-[30px] text-[10px] text-zinc-500 text-right pr-2 flex-shrink-0">{DAY_LABELS[dayIdx]}</div>
                          <div className="flex flex-1 gap-[2px]">
                            {dayData.map((cell, hourIdx) => (
                              <div
                                key={hourIdx}
                                onMouseEnter={(e) => setTooltip({ day: dayIdx, hour: hourIdx, x: e.clientX, y: e.clientY })}
                                onMouseMove={(e) => setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                                onMouseLeave={() => setTooltip(null)}
                                onClick={() => console.log('Clicked:', DAY_LABELS[dayIdx], hourLabels[hourIdx])}
                                className="flex-1 aspect-square cursor-pointer transition-transform hover:scale-110 hover:z-10 relative rounded-sm"
                                style={{
                                  background: cellBg(cell),
                                  border: tooltip?.day === dayIdx && tooltip?.hour === hourIdx ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent'
                                }}
                              >
                                {cell.activities.length > 1 && (
                                  <div className="absolute bottom-[1px] left-[1px] flex gap-[1px]">
                                    {cell.activities.slice(0, 3).map((_, i) => (
                                      <div key={i} className="w-[3px] h-[3px] rounded-full" style={{ backgroundColor: cell.activities[i].color }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {tooltip && data.grid[tooltip.day]?.[tooltip.hour] && (
                    <div
                      className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl min-w-[160px]"
                      style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-zinc-200">{DAY_LABELS[tooltip.day]} {hourLabels[tooltip.hour]}</span>
                        <span className="text-[10px] text-zinc-500">avg/day</span>
                      </div>
                      <div className="space-y-1">
                        {data.grid[tooltip.day][tooltip.hour].activities.map((a, i) => (
                          <div key={i} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: a.color }} />
                              <span className="text-[11px] text-zinc-300">{a.activity}</span>
                            </div>
                            <span className="text-[11px] text-zinc-400">{fmt(a.seconds)} ({a.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-1.5 pt-1.5 border-t border-zinc-800 flex justify-between">
                        <span className="text-[10px] text-zinc-500">Total</span>
                        <span className="text-[10px] text-zinc-400">{fmt(data.grid[tooltip.day][tooltip.hour].totalSeconds)}</span>
                      </div>
                      <div className="mt-1.5 flex gap-1.5">
                        {data.grid[tooltip.day][tooltip.hour].hasExternal && (
                          <span className="text-[9px] px-1 py-0.5 bg-purple-500/20 text-purple-300 rounded">External</span>
                        )}
                        {data.grid[tooltip.day][tooltip.hour].hasDevice && (
                          <span className="text-[9px] px-1 py-0.5 bg-cyan-500/20 text-cyan-300 rounded">Device</span>
                        )}
                      </div>
                    </div>
                  )}

                  {data.legend.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-4">
                      {data.legend.map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                          <span className="text-[11px] text-zinc-400">{item.activity}</span>
                          <span className="text-[10px] text-zinc-600">{fmt(item.totalSeconds)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600">Less</span>
                    {['rgba(16,185,129,0.15)', 'rgba(16,185,129,0.35)', 'rgba(16,185,129,0.6)', 'rgba(16,185,129,0.9)'].map((c, i) => (
                      <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: c }} />
                    ))}
                    <span className="text-[10px] text-zinc-600">More</span>
                  </div>
                </>
              );
            })() : (
              <div className="h-32 flex items-center justify-center">
                <div className="animate-pulse">
                  <div className="h-4 bg-zinc-800 rounded w-40 mb-3" />
                  <div className="h-24 bg-zinc-800 rounded" />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'weekly' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Weekly hours + Day score row */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">Hours Per Week</h3>
                <p className="text-xs text-zinc-500 mb-4">Total active hours tracked per week. The dashed line shows your 30h target.</p>
                <div className="h-56">
                  {weeklyData.labels.length > 0 ? (
                    <Line
                      data={{
                        labels: weeklyData.labels,
                        datasets: [{
                          label: 'Hours',
                          data: weeklyData.data,
                          borderColor: '#22c55e',
                          backgroundColor: (ctx) => {
                            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
                            g.addColorStop(0, '#22c55e40');
                            g.addColorStop(1, '#22c55e00');
                            return g;
                          },
                          fill: true,
                          tension: 0.4,
                          pointRadius: 3,
                          pointHoverRadius: 5,
                          pointBackgroundColor: '#22c55e',
                          pointHoverBackgroundColor: '#34d399',
                        }, {
                          label: 'Target (30h)',
                          data: weeklyData.data.map(() => 30),
                          borderColor: '#6366f1',
                          borderDash: [6, 4],
                          pointRadius: 0,
                          fill: false,
                          borderWidth: 1.5,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { intersect: false, mode: 'index' },
                        plugins: {
                          legend: { display: true, labels: { color: '#a1a1aa', usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 11 } } },
                          tooltip: {
                            backgroundColor: '#18181b',
                            borderColor: '#3f3f46',
                            borderWidth: 1,
                            titleColor: '#e4e4e7',
                            bodyColor: '#a1a1aa',
                            padding: 10,
                            cornerRadius: 8,
                          }
                        },
                        scales: {
                          x: { grid: { color: '#27272a' }, ticks: { color: '#71717a', font: { size: 10 } } },
                          y: { grid: { color: '#27272a' }, ticks: { color: '#71717a', font: { size: 10 } }, suggestedMax: 40 },
                        }
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-600 text-sm">No data yet</div>
                  )}
                </div>
              </div>

              <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">Day of Week Performance</h3>
                <p className="text-xs text-zinc-500 mb-4">Average active hours per day of the week. Higher bars show your most productive days.</p>
                <div className="h-56">
                  <Bar
                    data={{
                      labels: dayOfWeekData.labels,
                      datasets: [{
                        label: 'Hours',
                        data: dayOfWeekData.data,
                        backgroundColor: dayOfWeekData.labels.map((_, i) => {
                          const colors = ['#22c55e60', '#0ea5e960', '#8b5cf660', '#f59e0b60', '#ec489960', '#6366f160', '#14b8a660'];
                          return colors[i % colors.length];
                        }),
                        borderColor: dayOfWeekData.labels.map((_, i) => {
                          const colors = ['#22c55e', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6'];
                          return colors[i % colors.length];
                        }),
                        borderWidth: 1.5,
                        borderRadius: 4,
                        borderSkipped: false,
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
                            label: (ctx) => `${parseFloat(ctx.raw as string).toFixed(1)}h`,
                          }
                        }
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: '#71717a', font: { size: 11 } } },
                        y: { grid: { color: '#27272a' }, ticks: { color: '#71717a', font: { size: 10 } } },
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Core tracking data row: Top apps + Browser categories */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-zinc-200">Most Used</h3>
                </div>
                <p className="text-xs text-zinc-500 mb-3">Top apps and websites by time spent</p>
                {topApps.length > 0 ? (
                  <div className="space-y-2">
                    {topApps.map((app, i) => {
                      const maxSec = topApps[0]?.seconds || 1;
                      const pct = (app.seconds / maxSec) * 100;
                      const catColor = CATEGORY_COLORS[app.name] || '#6366f1';
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-500 w-5 text-right">{i + 1}</span>
                          <div className="flex-1 h-5 bg-zinc-800/60 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.5, delay: i * 0.05 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: catColor + '88' }}
                            />
                          </div>
                          <span className="text-xs text-zinc-300 w-24 truncate text-right">{app.name}</span>
                          <span className="text-[11px] text-zinc-500 w-14 text-right">{formatDuration(app.seconds)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-600 py-4 text-center">No app data available</div>
                )}
              </div>

              <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-zinc-200">Browser Activity</h3>
                </div>
                <p className="text-xs text-zinc-500 mb-3">Website categories by time spent</p>
                {browserCategoryData.data.length > 0 ? (
                  <div className="space-y-2">
                    {browserCategoryData.data.slice(0, 6).map((cat, i) => {
                      const maxMs = browserCategoryData.data[0]?.total_ms || 1;
                      const widthPct = (cat.total_ms / maxMs) * 100;
                      const catColor = CATEGORY_COLORS[cat.category] || '#64748b';
                      const hours = cat.total_ms / 3600000;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
                          <span className="text-xs text-zinc-300 w-24 truncate">{cat.category}</span>
                          <div className="flex-1 h-4 bg-zinc-800/60 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${widthPct}%` }}
                              transition={{ duration: 0.5, delay: i * 0.05 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: catColor + '88' }}
                            />
                          </div>
                          <span className="text-[11px] text-zinc-500 w-12 text-right">{hours.toFixed(1)}h</span>
                        </div>
                      );
                    })}
                    <div className="text-[10px] text-zinc-600 pt-1 text-right">
                      {browserCategoryData.totalBrowserTime > 0
                        ? `${browserCategoryData.data.length} categories`
                        : 'No browser data'}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-600 py-4 text-center">No browser data available</div>
                )}
              </div>
            </div>

            {/* Sleep + Time Split row */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-200 mb-4">Sleep & Recovery</h3>
                <div className="h-48">
                  {sleepTrendData.labels.length > 0 ? (
                    <Bar
                      data={{
                        labels: sleepTrendData.labels,
                        datasets: [
                          {
                            label: 'Sleep (h)',
                            data: sleepTrendData.sleepData,
                            backgroundColor: '#6366f160',
                            borderColor: '#6366f1',
                            borderWidth: 1,
                            borderRadius: 3,
                            borderSkipped: false,
                            order: 2,
                          },
                          {
                            label: 'Deficit (h)',
                            data: sleepTrendData.deficitData,
                            backgroundColor: '#f43f5e40',
                            borderColor: '#f43f5e',
                            borderWidth: 1,
                            borderRadius: 3,
                            borderSkipped: false,
                            order: 1,
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: true, labels: { color: '#a1a1aa', usePointStyle: true, pointStyle: 'rectRounded', padding: 12, font: { size: 11 } } },
                          tooltip: {
                            backgroundColor: '#18181b',
                            borderColor: '#3f3f46',
                            borderWidth: 1,
                            titleColor: '#e4e4e7',
                            bodyColor: '#a1a1aa',
                            padding: 10,
                            cornerRadius: 8,
                          }
                        },
                        scales: {
                          x: { grid: { display: false }, ticks: { color: '#71717a', font: { size: 10 } } },
                          y: { grid: { color: '#27272a' }, ticks: { color: '#71717a', font: { size: 10 } }, beginAtZero: true },
                        }
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-600 text-sm">No sleep data yet</div>
                  )}
                </div>
                {(sleepTrends.average_bedtime || sleepTrends.average_wake_time) && (
                  <div className="flex gap-6 mt-4 pt-3 border-t border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Avg Bedtime</span>
                      <span className="text-sm font-medium text-zinc-300">{sleepTrends.average_bedtime || '--'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Avg Wake</span>
                      <span className="text-sm font-medium text-zinc-300">{sleepTrends.average_wake_time || '--'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Avg Sleep</span>
                      <span className="text-sm font-medium text-zinc-300">{stats.average_sleep_hours?.toFixed(1) || '--'}h</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">Time Distribution</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Device vs external activity split</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm bg-cyan-400" />
                      <span className="text-zinc-500">Device</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm bg-purple-400" />
                      <span className="text-zinc-500">External</span>
                    </div>
                  </div>
                </div>

                {timeSplit.total > 0 ? (
                  <>
                    {/* Split bar visualization */}
                    <div className="relative mb-5">
                      <div className="flex h-10 rounded-lg overflow-hidden bg-zinc-900/50">
                        <div 
                          className="flex items-center justify-center bg-gradient-to-r from-cyan-600/80 to-cyan-500/60 transition-all duration-500"
                          style={{ width: `${timeSplit.total > 0 ? (timeSplit.deviceSec / timeSplit.total) * 100 : 0}%` }}
                        >
                          {timeSplit.deviceSec / timeSplit.total > 0.15 && (
                            <span className="text-xs font-semibold text-white px-2 truncate">
                              {Math.round((timeSplit.deviceSec / timeSplit.total) * 100)}%
                            </span>
                          )}
                        </div>
                        <div 
                          className="flex items-center justify-center bg-gradient-to-r from-purple-600/80 to-purple-500/60 transition-all duration-500"
                          style={{ width: `${timeSplit.total > 0 ? (timeSplit.externalSec / timeSplit.total) * 100 : 0}%` }}
                        >
                          {timeSplit.externalSec / timeSplit.total > 0.15 && (
                            <span className="text-xs font-semibold text-white px-2 truncate">
                              {Math.round((timeSplit.externalSec / timeSplit.total) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                          <span className="text-xs text-zinc-500 font-medium">Device Time</span>
                        </div>
                        <div className="text-2xl font-bold text-cyan-300 tabular-nums">
                          {formatHours(timeSplit.deviceSec)}
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-1">
                          {timeSplit.total > 0 ? Math.round((timeSplit.deviceSec / timeSplit.total) * 100) : 0}% of total
                        </div>
                      </div>
                      <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800/50">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <Globe className="w-3.5 h-3.5 text-purple-400" />
                          </div>
                          <span className="text-xs text-zinc-500 font-medium">External Time</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-300 tabular-nums">
                          {formatHours(timeSplit.externalSec)}
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-1">
                          {timeSplit.total > 0 ? Math.round((timeSplit.externalSec / timeSplit.total) * 100) : 0}% of total
                        </div>
                      </div>
                    </div>

                    {/* Productivity tier breakdown */}
                    <div className="border-t border-zinc-700/50 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-zinc-500 font-medium">Productivity Breakdown</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${tierDistribution.score >= 70 ? 'text-emerald-400' : tierDistribution.score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                            {Math.round(tierDistribution.score)}%
                          </span>
                          <span className="text-[10px] text-zinc-600">score</span>
                        </div>
                      </div>
                      
                      {/* Score bar */}
                      <div className="h-2 bg-zinc-900/60 rounded-full overflow-hidden mb-4">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${tierDistribution.score}%` }}
                        />
                      </div>

                      {/* Tier bars */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-xs text-zinc-400">Productive</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-1.5 bg-zinc-900/60 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${tierDistribution.total > 0 ? (tierDistribution.productive / tierDistribution.total) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-emerald-400 tabular-nums w-16 text-right">
                              {formatDuration(tierDistribution.productive / 1000)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                            <span className="text-xs text-zinc-400">Neutral</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-1.5 bg-zinc-900/60 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                                style={{ width: `${tierDistribution.total > 0 ? (tierDistribution.neutral / tierDistribution.total) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-blue-400 tabular-nums w-16 text-right">
                              {formatDuration(tierDistribution.neutral / 1000)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            <span className="text-xs text-zinc-400">Distracting</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-1.5 bg-zinc-900/60 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-red-500 transition-all duration-500"
                                style={{ width: `${tierDistribution.total > 0 ? (tierDistribution.distracting / tierDistribution.total) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-red-400 tabular-nums w-16 text-right">
                              {formatDuration(tierDistribution.distracting / 1000)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-40 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800/50 flex items-center justify-center">
                        <PieChart className="w-5 h-5 text-zinc-600" />
                      </div>
                      <div className="text-xs text-zinc-600">No tracking data yet</div>
                      <div className="text-[10px] text-zinc-700 mt-1">Start tracking to see your time split</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'activities' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* External Activities */}
            <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">External Activity Breakdown</h3>
              {Object.keys(stats.byActivity).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(stats.byActivity)
                    .sort(([, a], [, b]) => b.total_seconds - a.total_seconds)
                    .map(([name, data], i) => {
                      const maxSeconds = Math.max(...Object.values(stats.byActivity).map(v => v.total_seconds), 1);
                      const pct = (data.total_seconds / stats.total_seconds) * 100;
                      const widthPct = (data.total_seconds / maxSeconds) * 100;
                      return (
                        <motion.div
                          key={name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="group"
                        >
                          <div className="flex items-center gap-3 py-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: breakdownColors[i % breakdownColors.length] }} />
                            <span className="text-sm text-zinc-300 w-32 truncate flex-shrink-0">{name}</span>
                            <div className="flex-1 h-5 bg-zinc-800/60 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${widthPct}%` }}
                                transition={{ duration: 0.6, delay: i * 0.03, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: breakdownColors[i % breakdownColors.length] }}
                              />
                            </div>
                            <span className="text-sm font-medium text-zinc-300 w-16 text-right">{formatHours(data.total_seconds)}</span>
                            <span className="text-xs text-zinc-500 w-10 text-right">{pct.toFixed(0)}%</span>
                            <span className="text-xs text-zinc-600 w-12 text-right">{data.session_count} ses</span>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-zinc-600 text-sm">No activity data yet</div>
              )}
            </div>

            {/* Device App Breakdown */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-200 mb-3">App Usage (Device Tracking)</h3>
                <p className="text-xs text-zinc-500 mb-3">All apps and websites tracked by the system</p>
                {appUsageBreakdown.length > 0 ? (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {appUsageBreakdown.map((item, i) => {
                      const maxSec = appUsageBreakdown[0]?.seconds || 1;
                      const widthPct = (item.seconds / maxSec) * 100;
                      return (
                        <div key={i} className="flex items-center gap-2 py-1">
                          <span className="text-[10px] text-zinc-600 w-4 text-right">{i + 1}</span>
                          <div className="flex-1 h-4 bg-zinc-800/60 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${widthPct}%` }}
                              transition={{ duration: 0.5, delay: i * 0.02 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: '#6366f188' }}
                            />
                          </div>
                          <span className="text-[11px] text-zinc-300 w-28 truncate text-right">{item.name}</span>
                          <span className="text-[10px] text-zinc-500 w-14 text-right">{formatDuration(item.seconds)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-600 py-8 text-center">No device data available</div>
                )}
              </div>

              {/* Least used apps */}
              <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-200 mb-3">Least Used</h3>
                <p className="text-xs text-zinc-500 mb-3">Apps and sites with the least tracked time</p>
                {leastUsedApps.length > 0 ? (
                  <div className="space-y-1.5">
                    {leastUsedApps.map((item, i) => {
                      const maxSec = leastUsedApps[leastUsedApps.length - 1]?.seconds || 1;
                      const widthPct = (item.seconds / maxSec) * 100;
                      return (
                        <div key={i} className="flex items-center gap-2 py-1">
                          <div className="flex-1 h-4 bg-zinc-800/60 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${widthPct}%` }}
                              transition={{ duration: 0.5, delay: i * 0.02 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: '#f43f5e66' }}
                            />
                          </div>
                          <span className="text-[11px] text-zinc-300 w-28 truncate text-left">{item.name}</span>
                          <span className="text-[10px] text-zinc-500 w-14 text-right">{formatDuration(item.seconds)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-600 py-8 text-center">No data available</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
