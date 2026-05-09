import { useState, useEffect, useMemo, useRef } from 'react';
import { subDays, format, eachDayOfInterval } from 'date-fns';
import { BarChart3, Clock, Target, Moon, TrendingUp, TrendingDown, Activity, Zap, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

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

interface TypicalSlot {
  hour: number;
  primaryActivity: string;
  totalSeconds: number;
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const ACTIVITY_GRADIENTS: Record<string, string> = {
  'code': 'from-emerald-500 to-emerald-600',
  'coding': 'from-emerald-500 to-emerald-600',
  'browser': 'from-sky-500 to-sky-600',
  'chrome': 'from-sky-500 to-sky-600',
  'terminal': 'from-violet-500 to-violet-600',
  'discord': 'from-indigo-500 to-indigo-600',
  'slack': 'from-purple-500 to-purple-600',
  'figma': 'from-pink-500 to-pink-600',
  'design': 'from-pink-500 to-pink-600',
  'meeting': 'from-amber-500 to-amber-600',
  'zoom': 'from-amber-500 to-amber-600',
  'music': 'from-rose-500 to-rose-600',
  'spotify': 'from-rose-500 to-rose-600',
  'idle': 'from-zinc-500 to-zinc-600',
  'none': 'from-zinc-600 to-zinc-700',
};

function getActivityColor(activity: string): string {
  const key = Object.keys(ACTIVITY_GRADIENTS).find(k => activity.toLowerCase().includes(k));
  return key ? ACTIVITY_GRADIENTS[key] : 'from-teal-500 to-teal-600';
}

function getActivityHex(activity: string): string {
  const map: Record<string, string> = {
    code: '#22c55e', coding: '#22c55e', browser: '#0ea5e9', chrome: '#0ea5e9',
    terminal: '#8b5cf6', discord: '#6366f1', slack: '#a855f7', figma: '#ec4899',
    design: '#ec4899', meeting: '#f59e0b', zoom: '#f59e0b', music: '#f43f5e',
    spotify: '#f43f5e', idle: '#71717a', none: '#52525b',
  };
  const key = Object.keys(map).find(k => activity.toLowerCase().includes(k));
  return key ? map[key] : '#14b8a6';
}

function getHeatColor(seconds: number, max: number): string {
  if (seconds === 0) return 'bg-zinc-800/30';
  const ratio = seconds / max;
  if (ratio > 0.75) return 'bg-emerald-500/90';
  if (ratio > 0.5) return 'bg-emerald-500/65';
  if (ratio > 0.25) return 'bg-emerald-500/40';
  return 'bg-emerald-500/20';
}

const hourLabels = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return '12a';
  if (i < 12) return `${i}a`;
  if (i === 12) return '12p';
  return `${i - 12}p`;
});

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function InsightsPage() {
  const [stats, setStats] = useState<ExternalStats>({ byActivity: {}, total_seconds: 0, sleep_deficit_seconds: 0, average_sleep_hours: 0 });
  const [consistency, setConsistency] = useState<ConsistencyData & { this_week: number; last_week: number; trend: string; streak: number }>({ score: 0, weekly_comparison: [], this_week: 0, last_week: 0, trend: 'stable', streak: 0 });
  const [sleepTrends, setSleepTrends] = useState<SleepTrend>({ daily: [], average_bedtime: '', average_wake_time: '' });
  const [bestDays, setBestDays] = useState<{ bestDay: string; worstDay: string; averages: Record<string, number> }>({ bestDay: 'Mon', worstDay: 'Sun', averages: {} });
  const [typicalDay, setTypicalDay] = useState<TypicalSlot[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'typical' | 'weekly' | 'activities'>('typical');

  useEffect(() => {
    const p = selectedPeriod === 'week' ? 'week' : 'month';
    window.deskflowAPI?.getExternalStats(p).then(setStats);
    window.deskflowAPI?.getConsistencyScore(selectedPeriod).then(setConsistency);
    window.deskflowAPI?.getSleepTrends(selectedPeriod).then(setSleepTrends);
    window.deskflowAPI?.getBestDays().then(setBestDays);
    window.deskflowAPI?.getTypicalDay(30).then(setTypicalDay);
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

  const typicalMaxSeconds = useMemo(() => Math.max(...typicalDay.map(s => s.totalSeconds), 1), [typicalDay]);

  const selectedHourData = hoveredHour !== null ? typicalDay.find(s => s.hour === hoveredHour) : null;

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
                <p className="text-xs text-zinc-500 mt-0.5">30-day average hourly breakdown</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-emerald-500/90" /> High
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-emerald-500/40" /> Med
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-emerald-500/20" /> Low
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-zinc-800/30" /> None
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-[3px] pt-1">
                {dayLabels.map(d => (
                  <div key={d} className="text-[10px] text-zinc-600 w-6 h-[22px] flex items-center justify-end pr-1">{d}</div>
                ))}
              </div>
              <div className="flex-1 overflow-x-auto">
                <div className="flex gap-[3px]" style={{ minWidth: 24 * 28 }}>
                  {hourLabels.map((h, i) => (
                    <div key={i} className="text-[10px] text-zinc-600 w-[22px] text-center flex-shrink-0">{h}</div>
                  ))}
                </div>
                <div className="flex gap-[3px] mt-1" style={{ minWidth: 24 * 28 }}>
                  {Array.from({ length: 7 }).map((_, dayIdx) => (
                    <div key={dayIdx} className="flex gap-[3px] flex-col" style={{ width: 7 * 22 + 6 * 3 }}>
                      {Array.from({ length: 24 }).map((_, hour) => {
                        const slot = typicalDay.find(s => s.hour === hour);
                        const secs = slot?.totalSeconds || 0;
                        return (
                          <div
                            key={hour}
                            onMouseEnter={() => setHoveredHour(hour)}
                            onMouseLeave={() => setHoveredHour(null)}
                            className={`w-[22px] h-[22px] rounded-sm cursor-pointer transition-all duration-150 ${
                              getHeatColor(secs, typicalMaxSeconds)
                            } ${
                              hoveredHour === hour ? 'ring-2 ring-emerald-400/60 scale-110 z-10 relative' : ''
                            }`}
                            title={`${hour}:00 - ${secs > 0 ? formatHours(secs) : 'No activity'}${slot?.primaryActivity && slot.primaryActivity !== 'none' ? ` - ${slot.primaryActivity}` : ''}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-6 mt-5 pt-4 border-t border-zinc-800/50">
              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {typicalDay.filter(s => s.primaryActivity !== 'none').slice(0, 12).map((slot, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                        hoveredHour === slot.hour
                          ? 'bg-zinc-700/60 ring-1 ring-emerald-400/30'
                          : 'bg-zinc-800/40'
                      }`}
                      onMouseEnter={() => setHoveredHour(slot.hour)}
                      onMouseLeave={() => setHoveredHour(null)}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${getActivityColor(slot.primaryActivity)}`} />
                      <span className="text-zinc-300 font-medium">{slot.hour}:00</span>
                      <span className="text-zinc-500">-</span>
                      <span className="text-zinc-400">{slot.primaryActivity.slice(0, 10)}</span>
                      <span className="text-zinc-600 ml-auto">{formatHours(slot.totalSeconds)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedHourData && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="w-48 flex-shrink-0 bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/40"
                >
                  <div className="text-xs text-zinc-400 mb-1">{selectedHourData.hour}:00 — {(selectedHourData.hour + 1) % 24 || 24}:00</div>
                  <div className="text-lg font-bold text-zinc-200">{formatHours(selectedHourData.totalSeconds)}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${getActivityColor(selectedHourData.primaryActivity)}`} />
                    <span className="text-xs text-zinc-400">{selectedHourData.primaryActivity === 'none' ? 'No activity' : selectedHourData.primaryActivity}</span>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'weekly' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-6"
          >
            <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Weekly Consistency</h3>
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
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Day of Week Performance</h3>
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

            <div className="col-span-2 bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5">
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
          </motion.div>
        )}

        {activeTab === 'activities' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5"
          >
            <h3 className="text-sm font-semibold text-zinc-200 mb-4">Activity Breakdown</h3>
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
          </motion.div>
        )}
      </div>
    </div>
  );
}
