import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimelineItem {
  id: string;
  startHour: number;
  endHour: number;
  label: string;
  category: 'external' | 'app' | 'browser' | 'log';
  color: string;
  duration: number;
  details?: string;
}

interface DayDetailPopupProps {
  date: string;
  items: TimelineItem[];
  onClose: () => void;
  onDateChange?: (date: string) => void;
}

type Period = 'day' | 'week' | 'month';

const CATEGORY_COLORS = {
  external: '#8b5cf6',
  app: '#3b82f6',
  browser: '#10b981',
  log: '#f59e0b',
};

const TIME_BLOCKS = [
  { label: 'Night', start: 0, end: 6, icon: '🌙' },
  { label: 'Morning', start: 6, end: 12, icon: '☀️' },
  { label: 'Afternoon', start: 12, end: 18, icon: '🌤️' },
  { label: 'Evening', start: 18, end: 24, icon: '🌙' },
];

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDurationShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function DayDetailPopup({ date, items, onClose, onDateChange }: DayDetailPopupProps) {
  const [period, setPeriod] = useState<Period>('day');

  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const stats = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.duration, 0);
    const external = items.filter(i => i.category === 'external').reduce((sum, i) => sum + i.duration, 0);
    const app = items.filter(i => i.category === 'app').reduce((sum, i) => sum + i.duration, 0);
    const browser = items.filter(i => i.category === 'browser').reduce((sum, i) => sum + i.duration, 0);
    const log = items.filter(i => i.category === 'log').reduce((sum, i) => sum + i.duration, 0);
    const device = app + browser;
    const productive = external + app + browser;
    const focusPercent = total > 0 ? Math.round((productive / total) * 100) : 0;

    return { total, external, app, browser, log, device, focusPercent };
  }, [items]);

  const timeBlockData = useMemo(() => {
    return TIME_BLOCKS.map(block => {
      const blockItems = items.filter(item =>
        (item.startHour < block.end && item.endHour > block.start)
      );
      const total = blockItems.reduce((sum, i) => sum + i.duration, 0);
      const byCategory = {
        external: blockItems.filter(i => i.category === 'external').reduce((sum, i) => sum + i.duration, 0),
        app: blockItems.filter(i => i.category === 'app').reduce((sum, i) => sum + i.duration, 0),
        browser: blockItems.filter(i => i.category === 'browser').reduce((sum, i) => sum + i.duration, 0),
        log: blockItems.filter(i => i.category === 'log').reduce((sum, i) => sum + i.duration, 0),
      };

      const appMap = new Map<string, { duration: number; color: string }>();
      blockItems.filter(i => i.category === 'app' || i.category === 'browser' || i.category === 'log').forEach(item => {
        const existing = appMap.get(item.label);
        appMap.set(item.label, {
          duration: (existing?.duration || 0) + item.duration,
          color: item.color,
        });
      });
      const uniqueApps = Array.from(appMap.entries()).map(([label, data]) => ({ label, ...data }));

      const extMap = new Map<string, { duration: number; color: string }>();
      blockItems.filter(i => i.category === 'external').forEach(item => {
        const existing = extMap.get(item.label);
        extMap.set(item.label, {
          duration: (existing?.duration || 0) + item.duration,
          color: item.color,
        });
      });
      const uniqueExternal = Array.from(extMap.entries()).map(([label, data]) => ({ label, ...data }));

      return { ...block, total, byCategory, uniqueApps, uniqueExternal };
    });
  }, [items]);

  const hourlyData = useMemo(() => {
    const hours = [];
    for (let h = 0; h < 24; h++) {
      const hourItems = items.filter(item =>
        (item.startHour <= h && item.endHour > h) ||
        (item.startHour > h && item.startHour < h + 1)
      );
      hours.push({
        hour: h,
        total: hourItems.reduce((sum, i) => sum + i.duration, 0),
        external: hourItems.filter(i => i.category === 'external').reduce((sum, i) => sum + i.duration, 0),
        app: hourItems.filter(i => i.category === 'app').reduce((sum, i) => sum + i.duration, 0),
        browser: hourItems.filter(i => i.category === 'browser').reduce((sum, i) => sum + i.duration, 0),
        log: hourItems.filter(i => i.category === 'log').reduce((sum, i) => sum + i.duration, 0),
      });
    }
    return hours;
  }, [items]);

  const categoryData = useMemo(() => [
    { name: 'External', value: stats.external, color: CATEGORY_COLORS.external },
    { name: 'Device', value: stats.app + stats.browser, color: CATEGORY_COLORS.app },
  ].filter(d => d.value > 0), [stats]);

  const donutTotal = categoryData.reduce((sum, d) => sum + d.value, 0);
  const hourlyMax = Math.max(...hourlyData.map(h => h.total), 1);

  const handlePrevDay = () => {
    const prevDay = addDays(dateObj, -1);
    const prevDateStr = prevDay.toISOString().split('T')[0];
    onDateChange?.(prevDateStr);
  };

  const handleNextDay = () => {
    const nextDay = addDays(dateObj, 1);
    if (nextDay <= new Date()) {
      onDateChange?.(nextDay.toISOString().split('T')[0]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-2xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full h-full overflow-y-auto bg-zinc-950/95 backdrop-blur-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-5 py-4 border-b flex items-center justify-between bg-zinc-950/95 backdrop-blur-xl border-zinc-800/50">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevDay}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center min-w-[200px]">
                <h2 className="text-xl font-bold text-white">{dayName}</h2>
                <p className="text-sm text-zinc-400">{dateStr}</p>
              </div>
              <button
                onClick={handleNextDay}
                disabled={dateObj >= new Date()}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-zinc-800 rounded-lg p-1">
              {(['day', 'week', 'month'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs rounded-md transition capitalize ${
                    period === p ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-900/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="⏱" label="Total Time" value={formatDuration(stats.total)} color="#8b5cf6" />
            <StatCard icon="💻" label="Device" value={formatDuration(stats.device)} color="#3b82f6" />
            <StatCard icon="◆" label="External" value={formatDuration(stats.external)} color="#10b981" />
            <StatCard icon="🎯" label="Focus" value={`${stats.focusPercent}%`} color={stats.focusPercent >= 70 ? '#10b981' : stats.focusPercent >= 40 ? '#f59e0b' : '#ef4444'} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart */}
            <div className="rounded-xl border p-5 bg-zinc-950/95 backdrop-blur-xl border-zinc-800/50">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Category Breakdown</h3>
              <div className="flex items-center justify-center">
                <DonutChart data={categoryData} total={donutTotal} />
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {categoryData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-zinc-400">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly Bar Chart */}
            <div className="rounded-xl border p-5 bg-zinc-950/95 backdrop-blur-xl border-zinc-800/50">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Hourly Activity</h3>
              <HourlyBarChart data={hourlyData} maxValue={hourlyMax} />
            </div>
          </div>

          {/* Time Blocks + Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time of Day Blocks */}
            <div className="rounded-xl border p-5 bg-zinc-950/95 backdrop-blur-xl border-zinc-800/50">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Time of Day</h3>
              <div className="space-y-3">
                {timeBlockData.map(block => (
                  <TimeBlock key={block.label} block={block} />
                ))}
              </div>
            </div>

            {/* Daily Rhythm Radar */}
            <div className="rounded-xl border p-5 bg-zinc-950/95 backdrop-blur-xl border-zinc-800/50">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Daily Rhythm</h3>
              <RadarChart data={hourlyData} />
            </div>
          </div>

          {/* Timeline - Shows External, Device (App), Browser */}
          <div className="rounded-xl border p-5 bg-zinc-950/95 backdrop-blur-xl border-zinc-800/50">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4">Activity Timeline</h3>
            <CompressedTimeline items={items} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border p-5 bg-zinc-950/95 backdrop-blur-xl border-zinc-800/50 relative overflow-hidden"
    >
      <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, ${color}20, transparent)` }} />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: `${color}20` }}>
          {icon}
        </div>
        <div>
          <div className="text-xs text-zinc-400 uppercase tracking-wider">{label}</div>
          <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        </div>
      </div>
    </motion.div>
  );
}

function DonutChart({ data, total }: { data: { name: string; value: number; color: string }[]; total: number }) {
  const size = 140;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const segments = data.map((d, i) => {
    const percent = total > 0 ? d.value / total : 0;
    const dashLength = percent * circumference;
    const gapLength = circumference - dashLength;
    const segment = { ...d, offset, dashLength, gapLength };
    offset += dashLength;
    return segment;
  });

  return (
    <div className="relative">
      <svg width={size} height={size} className="transform -rotate-90">
        {segments.map((seg, i) => (
          <motion.circle
            key={seg.name}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${seg.dashLength} ${seg.gapLength}`}
            strokeDashoffset={-seg.offset}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${seg.dashLength} ${seg.gapLength}` }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{formatDurationShort(total)}</div>
          <div className="text-xs text-zinc-500">total</div>
        </div>
      </div>
    </div>
  );
}

function HourlyBarChart({ data, maxValue }: { data: { hour: number; total: number; external: number; app: number; browser: number; log: number }[]; maxValue: number }) {
  const displayHours = [0, 3, 6, 9, 12, 15, 18, 21, 23];

  return (
    <div className="flex items-end gap-1 h-32">
      {displayHours.map(h => {
        const hourData = data[h] || { total: 0, external: 0, app: 0, browser: 0, log: 0 };
        const heightPercent = maxValue > 0 ? (hourData.total / maxValue) * 100 : 0;
        return (
          <div key={h} className="flex-1 flex flex-col justify-end items-center gap-0.5">
            <div className="w-full flex flex-col justify-end rounded-t" style={{ height: `${heightPercent}%`, minHeight: heightPercent > 0 ? '4px' : '0' }}>
              {hourData.total > 0 && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: '100%' }}
                  transition={{ duration: 0.5, delay: h * 0.02 }}
                  className="w-full rounded-t relative group"
                  style={{ backgroundColor: 'rgba(139, 92, 246, 0.6)' }}
                >
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div className="font-medium text-white">{formatDuration(hourData.total)}</div>
                  </div>
                </motion.div>
              )}
            </div>
            <div className="text-xs text-zinc-500 font-mono">{formatHour(h)}</div>
          </div>
        );
      })}
    </div>
  );
}

interface TimeBlockComponentProps {
  block: {
    label: string;
    start: number;
    end: number;
    total: number;
    byCategory: { external: number; app: number; browser: number; log: number };
    uniqueApps: { label: string; duration: number; color: string }[];
    uniqueExternal: { label: string; duration: number; color: string }[];
  };
}

function TimeBlock({ block }: TimeBlockComponentProps) {
  const [expanded, setExpanded] = useState(false);
  const icons: Record<string, string> = { 'Night': '🌙', 'Morning': '☀️', 'Afternoon': '🌤️', 'Evening': '🌙' };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-xl border bg-zinc-950/95 backdrop-blur-xl border-zinc-800/50 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{icons[block.label]}</span>
          <div className="text-left">
            <div className="text-sm font-medium text-white">{block.label}</div>
            <div className="text-xs text-zinc-500">{formatHour(block.start)} - {formatHour(block.end)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {block.byCategory.external > 0 && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.external }} />}
            {block.byCategory.app > 0 && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.app }} />}
            {block.byCategory.browser > 0 && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.browser }} />}
          </div>
          <span className="text-sm font-mono text-zinc-300">{formatDuration(block.total)}</span>
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t overflow-hidden border-zinc-800/50"
            >
            <div className="p-3 space-y-3">
              {block.uniqueApps.length === 0 && block.uniqueExternal.length === 0 ? (
                <div className="text-xs text-zinc-500 text-center py-2">No activity</div>
              ) : (
                <>
                  {block.uniqueExternal.length > 0 && (
                    <div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">External Activities</div>
                      <div className="space-y-1">
                        {block.uniqueExternal.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-md" style={{ backgroundColor: `${CATEGORY_COLORS.external}10` }}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.external }} />
                              <span className="text-sm text-zinc-200">{item.label}</span>
                            </div>
                            <span className="text-xs text-zinc-400 font-mono">{formatDuration(item.duration)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {block.uniqueApps.length > 0 && (
                    <div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Device & Browser</div>
                      <div className="space-y-1">
                        {block.uniqueApps.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-md" style={{ backgroundColor: `${item.color}10` }}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm text-zinc-200">{item.label}</span>
                            </div>
                            <span className="text-xs text-zinc-400 font-mono">{formatDuration(item.duration)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RadarChart({ data }: { data: { hour: number; total: number }[] }) {
  const size = 200;
  const center = size / 2;
  const maxRadius = size / 2 - 20;

  const maxValue = Math.max(...data.map(d => d.total), 1);
  const points = data.map(d => {
    const angle = (d.hour / 24) * Math.PI * 2 - Math.PI / 2;
    const radius = (d.total / maxValue) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      hour: d.hour,
      total: d.total,
    };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  const gridCircles = [0.25, 0.5, 0.75, 1].map(r => {
    const radius = r * maxRadius;
    return (
      <circle
        key={r}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(139, 92, 246, 0.15)"
        strokeWidth={1}
      />
    );
  });

  const hourLabels = [0, 6, 12, 18].map(h => {
    const angle = (h / 24) * Math.PI * 2 - Math.PI / 2;
    const labelRadius = maxRadius + 15;
    return (
      <text
        key={h}
        x={center + labelRadius * Math.cos(angle)}
        y={center + labelRadius * Math.sin(angle)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(161, 161, 170, 0.6)"
        fontSize={10}
      >
        {formatHour(h)}
      </text>
    );
  });

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size}>
        {gridCircles}
        <path d={pathD} fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" strokeWidth={2} />
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#8b5cf6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.02 }}
          />
        ))}
        {hourLabels}
      </svg>
    </div>
  );
}

function CompressedTimeline({ items }: { items: TimelineItem[] }) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const groupedItems = useMemo(() => {
    const groups: Record<string, TimelineItem[]> = {
      external: [],
      app: [],
      browser: [],
      log: [],
    };
    items.forEach(item => {
      groups[item.category].push(item);
    });
    return groups;
  }, [items]);

  const categories = ['external', 'app', 'browser'] as const;
  const categoryLabels = { external: 'External', app: 'Device', browser: 'Browser' };
  const categoryIcons = { external: '◆', app: '●', browser: '■' };

  const startHour = 6;
  const endHour = 23;
  const totalHours = endHour - startHour;

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-zinc-500 font-mono px-2">
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>
      {categories.map(cat => {
        const catItems = groupedItems[cat];
        if (catItems.length === 0) return null;

        const totalDuration = catItems.reduce((sum, i) => sum + i.duration, 0);
        const isExpanded = expandedCategory === cat;

        return (
          <motion.div
            key={cat}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : cat)}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-800/30 transition-colors"
            >
              <span style={{ color: CATEGORY_COLORS[cat] }}>{categoryIcons[cat]}</span>
              <span className="text-sm text-zinc-200 flex-1 text-left">{categoryLabels[cat]}</span>
              <span className="text-xs text-zinc-400 font-mono">{formatDuration(totalDuration)}</span>
              <span className="text-xs text-zinc-500">({catItems.length})</span>
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            <div className="relative h-12 mt-1">
              {catItems.map((item, i) => {
                const left = Math.max(0, ((item.startHour - startHour) / totalHours) * 100);
                const width = Math.min(100 - left, ((item.endHour - item.startHour) / totalHours) * 100);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="absolute h-6 rounded-md cursor-pointer group"
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 2)}%`,
                      backgroundColor: CATEGORY_COLORS[cat] + '40',
                      borderLeft: `3px solid ${CATEGORY_COLORS[cat]}`,
                      top: isExpanded ? `${(i % 3) * 14}px` : '50%',
                      transform: isExpanded ? 'none' : 'translateY(-50%)',
                    }}
                  >
                    <div className="px-2 py-0.5 text-xs text-zinc-200 truncate">{item.label}</div>
                    <div className="absolute left-0 top-full mt-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <div className="font-medium text-white">{item.label}</div>
                      <div className="text-zinc-400">{formatHour(Math.floor(item.startHour))} - {formatHour(Math.floor(item.endHour))} ({formatDuration(item.duration)})</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 p-3 space-y-2 rounded-xl border bg-zinc-950/90 backdrop-blur-xl border-zinc-800/50"
              >
                {catItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: `${CATEGORY_COLORS[cat]}10` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                      <span className="text-sm text-zinc-200">{item.label}</span>
                      {item.details && <span className="text-xs text-zinc-500">({item.details})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-mono">{formatHour(Math.floor(item.startHour))} - {formatHour(Math.floor(item.endHour))}</span>
                      <span className="text-xs text-zinc-400 font-mono">{formatDuration(item.duration)}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export function sessionsToTimelineItems(
  externalSessions: any[],
  appSessions: any[],
  browserSessions: any[],
  logs: any[] = []
): TimelineItem[] {
  const items: TimelineItem[] = [];

  externalSessions.forEach((session: any) => {
    const start = new Date(session.started_at);
    const end = session.ended_at ? new Date(session.ended_at) : new Date();
    items.push({
      id: `ext-${session.id}`,
      startHour: start.getHours() + start.getMinutes() / 60,
      endHour: end.getHours() + end.getMinutes() / 60,
      label: session.activity_name || session.name,
      category: 'external',
      color: session.color || CATEGORY_COLORS.external,
      duration: session.duration_seconds || 0
    });
  });

  appSessions.forEach((session: any) => {
    const start = new Date(session.start_time);
    const end = session.end_time ? new Date(session.end_time) : new Date();
    const duration = session.duration_sec || Math.floor((end.getTime() - start.getTime()) / 1000);
    items.push({
      id: `app-${session.id || Math.random()}`,
      startHour: start.getHours() + start.getMinutes() / 60,
      endHour: end.getHours() + end.getMinutes() / 60,
      label: session.app,
      category: 'app',
      color: CATEGORY_COLORS.app,
      duration,
      details: session.domain || session.title
    });
  });

  browserSessions.forEach((session: any) => {
    const start = new Date(session.start_time || Date.now() - session.total_sec * 1000);
    const end = new Date(session.end_time || Date.now());
    items.push({
      id: `browser-${session.id || Math.random()}`,
      startHour: start.getHours() + start.getMinutes() / 60,
      endHour: end.getHours() + end.getMinutes() / 60,
      label: session.domain || session.app,
      category: 'browser',
      color: CATEGORY_COLORS.browser,
      duration: session.total_sec || 0
    });
  });

  logs.forEach((log: any) => {
    const start = new Date(log.timestamp);
    const durationSec = Math.floor((log.duration_ms || 0) / 1000);
    const end = new Date(start.getTime() + durationSec * 1000);
    items.push({
      id: `log-${log.id || Math.random()}`,
      startHour: start.getHours() + start.getMinutes() / 60,
      endHour: end.getHours() + end.getMinutes() / 60,
      label: log.app,
      category: 'log',
      color: CATEGORY_COLORS.log,
      duration: durationSec,
      details: log.title || log.domain || log.category
    });
  });

  return items.sort((a, b) => a.startHour - b.startHour);
}

export function logsToTimelineItems(logs: any[]): TimelineItem[] {
  return logs.map((log: any) => {
    const start = new Date(log.timestamp);
    const durationSec = Math.floor((log.duration_ms || 0) / 1000);
    const end = new Date(start.getTime() + durationSec * 1000);
    return {
      id: `log-${log.id}`,
      startHour: start.getHours() + start.getMinutes() / 60,
      endHour: end.getHours() + end.getMinutes() / 60,
      label: log.app,
      category: 'log' as const,
      color: CATEGORY_COLORS.log,
      duration: durationSec,
      details: log.title || log.domain || log.category
    };
  });
}
