# Weekly Productivity Chart Overhaul — Complete Specification

## 1. Root Cause Analysis

The bug has two interacting components:

**Bug A: External data key collision.** When the period is `'week'`, external sessions are aggregated into a `Map` keyed by `dayOfWeek` (0-6). This means every Wednesday in the entire dataset merges into bucket `"3"`. For `'month'`, every 15th-of-any-month merges into bucket `"15"`. Only `'all'` uses full date strings and works correctly.

**Bug B: Internal log key mismatch.** The bar computation loop creates buckets using the same broken keys, then tries to look up external data with those keys. Since both sides use the same wrong keys, they accidentally "match" — but the data is wrong because it's aggregated across multiple weeks/months.

The fix requires both sides to use the same correct, unique date-based keys.

---

## 2. Corrected Data Processing Pipeline

### 2.1 Date Range Computation

Every chart render needs a precise start/end date range based on the period and offset. This is the foundation everything else builds on.

```typescript
// Add to DashboardPage.tsx, above the chart useEffect

interface DateRange {
  start: Date;       // Inclusive start
  end: Date;         // Exclusive end (the moment after the last bucket)
  label: string;     // Human-readable range label
}

function computeDateRange(period: string, offset: number): DateRange {
  const now = new Date();
  let start: Date;
  let end: Date;
  let label: string;

  switch (period) {
    case 'today': {
      // Offset shifts by full days
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      label = start.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
      break;
    }
    case 'week': {
      // ISO week: start on Sunday, offset shifts by full weeks
      const dayOfWeek = now.getDay(); // 0=Sun
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek - (offset * 7));
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      label = `Week of ${start.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
      break;
    }
    case 'month': {
      // Start on 1st of month, offset shifts by months
      const targetMonth = now.getMonth() - offset;
      start = new Date(now.getFullYear(), targetMonth, 1);
      end = new Date(now.getFullYear(), targetMonth + 1, 1);
      label = start.toLocaleDateString([], { month: 'long', year: 'numeric' });
      break;
    }
    case 'all': {
      // All time, offset shifts by quarters (3-month chunks going back)
      if (offset === 0) {
        // From 90 days ago to now
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
        end = now;
      } else {
        // Previous quarters
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (offset - 1) * 90);
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset * 90);
      }
      label = `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${new Date(end.getTime() - 1).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
      break;
    }
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      label = 'Today';
    }
  }

  return { start, end, label };
}
```

### 2.2 Date Key Function

Every data point (internal log, external session) maps to a unique bucket key within the date range:

```typescript
function getDateKey(timestamp: Date | string, period: string): string {
  const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  switch (period) {
    case 'today':
      // Hour bucket: "14" for 2pm
      return `${d.getHours()}`;
    case 'week':
    case 'month':
      // Full date string: "2026-05-18"
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    case 'all':
      // Month bucket: "2026-05"
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    default:
      return `${d.getHours()}`;
  }
}
```

### 2.3 External Data Aggregation (Fixed)

Replace the current broken aggregation with date-range-scoped aggregation:

```typescript
// Replace the existing chartExternalData aggregation useEffect

const chartExternalData = useMemo(() => {
  const data = new Map<string, number>();
  if (!externalSessions || externalSessions.length === 0) return data;
  
  const range = computeDateRange(selectedPeriod, periodOffset);
  
  for (const session of externalSessions) {
    const sessionDate = new Date(session.started_at);
    
    // Skip sessions outside the date range
    if (sessionDate < range.start || sessionDate >= range.end) continue;
    
    const key = getDateKey(session.started_at, selectedPeriod);
    const durationSec = session.duration_seconds || 0;
    data.set(key, (data.get(key) || 0) + durationSec);
  }
  
  return data;
}, [externalSessions, selectedPeriod, periodOffset]);
```

### 2.4 Internal Log Aggregation (Fixed)

```typescript
const chartInternalData = useMemo(() => {
  const productive = new Map<string, number>();
  const nonProductive = new Map<string, number>();
  
  if (!allLogs || allLogs.length === 0) return { productive, nonProductive };
  
  const range = computeDateRange(selectedPeriod, periodOffset);
  
  for (const log of allLogs) {
    const logDate = new Date(log.timestamp || log.created_at);
    
    // Skip logs outside the date range
    if (logDate < range.start || logDate >= range.end) continue;
    
    const key = getDateKey(logDate, selectedPeriod);
    const durationSec = (log.duration_ms || 0) / 1000;
    
    // Classify as productive or non-productive
    const category = log.category || '';
    const isProductive = PRODUCTIVE_CATEGORIES.has(category);
    
    if (isProductive) {
      productive.set(key, (productive.get(key) || 0) + durationSec);
    } else {
      nonProductive.set(key, (nonProductive.get(key) || 0) + durationSec);
    }
  }
  
  return { productive, nonProductive };
}, [allLogs, selectedPeriod, periodOffset]);
```

### 2.5 Bucket Generation + Bar Assembly

```typescript
const chartBarsResult = useMemo((): ChartBar[] => {
  const range = computeDateRange(selectedPeriod, periodOffset);
  const bars: ChartBar[] = [];
  
  switch (selectedPeriod) {
    case 'today': {
      // 24 hourly buckets
      for (let h = 0; h < 24; h++) {
        const key = `${h}`;
        const productiveSec = Math.min(chartInternalData.productive.get(key) || 0, 3600);
        const nonProductiveSec = Math.min(chartInternalData.nonProductive.get(key) || 0, 3600);
        const externalSec = Math.min(chartExternalData.get(key) || 0, 3600);
        
        bars.push({
          label: formatHourLabel(h),
          key,
          productiveSeconds: productiveSec,
          nonProductiveSeconds: nonProductiveSec,
          externalSeconds: externalSec,
          isCurrent: isCurrentHour(h, range),
        });
      }
      break;
    }
    
    case 'week': {
      // 7 daily buckets: Sun through Sat
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(range.start);
        dayDate.setDate(dayDate.getDate() + i);
        const key = formatDateKey(dayDate);
        
        const productiveSec = chartInternalData.productive.get(key) || 0;
        const nonProductiveSec = chartInternalData.nonProductive.get(key) || 0;
        const externalSec = chartExternalData.get(key) || 0;
        
        bars.push({
          label: dayDate.toLocaleDateString([], { weekday: 'short' }),
          key,
          productiveSeconds: productiveSec,
          nonProductiveSeconds: nonProductiveSec,
          externalSeconds: externalSec,
          isCurrent: isToday(dayDate),
        });
      }
      break;
    }
    
    case 'month': {
      // Daily buckets for the month
      const current = new Date(range.start);
      while (current < range.end) {
        const key = formatDateKey(current);
        
        const productiveSec = chartInternalData.productive.get(key) || 0;
        const nonProductiveSec = chartInternalData.nonProductive.get(key) || 0;
        const externalSec = chartExternalData.get(key) || 0;
        
        bars.push({
          label: `${current.getDate()}`,
          key,
          productiveSeconds: productiveSec,
          nonProductiveSeconds: nonProductiveSec,
          externalSeconds: externalSec,
          isCurrent: isToday(current),
        });
        
        current.setDate(current.getDate() + 1);
      }
      break;
    }
    
    case 'all': {
      // Monthly buckets
      const current = new Date(range.start);
      while (current < range.end) {
        const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        
        // Avoid duplicate month buckets
        if (bars.length === 0 || bars[bars.length - 1].key !== key) {
          const productiveSec = chartInternalData.productive.get(key) || 0;
          const nonProductiveSec = chartInternalData.nonProductive.get(key) || 0;
          const externalSec = chartExternalData.get(key) || 0;
          
          bars.push({
            label: current.toLocaleDateString([], { month: 'short', year: '2-digit' }),
            key,
            productiveSeconds: productiveSec,
            nonProductiveSeconds: nonProductiveSec,
            externalSeconds: externalSec,
            isCurrent: isCurrentMonth(current),
          });
        }
        
        current.setMonth(current.getMonth() + 1);
      }
      break;
    }
  }
  
  return bars;
}, [chartInternalData, chartExternalData, selectedPeriod, periodOffset]);
```

### 2.6 Helper Functions

```typescript
const PRODUCTIVE_CATEGORIES = new Set([
  'IDE', 'Productivity', 'Design', 'AI Tools',
]);

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatHourLabel(h: number): string {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}

function isCurrentHour(h: number, range: DateRange): boolean {
  const now = new Date();
  return now >= range.start && now < range.end && now.getHours() === h;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && 
         d.getMonth() === now.getMonth() && 
         d.getDate() === now.getDate();
}

function isCurrentMonth(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

// Convert seconds to hours for chart display
function secondsToHours(seconds: number): number {
  return seconds / 3600;
}
```

### 2.7 ChartBar Type

```typescript
interface ChartBar {
  label: string;              // Display label on x-axis
  key: string;                // Unique bucket key
  productiveSeconds: number;
  nonProductiveSeconds: number;
  externalSeconds: number;
  isCurrent?: boolean;        // Highlight current hour/day/month
}
```

---

## 3. Y-Axis Scaling

The current 24h cap is correct for `'today'` and `'week'` (max 24h in a single day) but wrong for `'month'` and `'all'` where bars represent different durations.

**Y-axis strategy by period:**

| Period | Bar Represents | Max Possible | Y-Axis Behavior |
|--------|---------------|-------------|-----------------|
| `'today'` | 1 hour | 1h per bar | Cap at 1h, ticks at 15min intervals |
| `'week'` | 1 day | 24h per bar | Cap at 24h, ticks at 4h intervals |
| `'month'` | 1 day | 24h per bar | Cap at 24h, ticks at 4h intervals |
| `'all'` | 1 month | ~720h per bar | Auto-scale to max value, ticks at appropriate intervals |

**Implementation:**

```typescript
const yAxisConfig = useMemo(() => {
  const maxValues = chartBarsResult.map(b => 
    secondsToHours(b.productiveSeconds + b.nonProductiveSeconds + b.externalSeconds)
  );
  const rawMax = Math.max(...maxValues, 0.1);
  
  let niceMax: number;
  let tickCount: number;
  let tickFormatter: (v: number) => string;
  
  switch (selectedPeriod) {
    case 'today':
      niceMax = 1;
      tickCount = 5; // 0, 15m, 30m, 45m, 60m
      tickFormatter = (v: number) => {
        const mins = Math.round(v * 60);
        return mins % 60 === 0 ? `${mins / 60}h` : `${mins}m`;
      };
      break;
      
    case 'week':
    case 'month':
      niceMax = Math.min(Math.ceil(rawMax / 4) * 4, 24);
      tickCount = niceMax <= 8 ? niceMax : 5;
      tickFormatter = (v: number) => `${v}h`;
      break;
      
    case 'all':
      // Monthly totals can be large — auto-scale
      if (rawMax <= 24) {
        niceMax = Math.ceil(rawMax / 4) * 4;
      } else if (rawMax <= 100) {
        niceMax = Math.ceil(rawMax / 20) * 20;
      } else {
        niceMax = Math.ceil(rawMax / 50) * 50;
      }
      tickCount = 5;
      tickFormatter = (v: number) => v >= 24 ? `${(v / 24).toFixed(0)}d` : `${v}h`;
      break;
      
    default:
      niceMax = 24;
      tickCount = 5;
      tickFormatter = (v: number) => `${v}h`;
  }
  
  return { niceMax, tickCount, tickFormatter };
}, [chartBarsResult, selectedPeriod]);
```

---

## 4. Chart Component — Full JSX

```tsx
{/* Weekly Productivity Chart */}
<div className="glass p-4 rounded-xl">
  {/* Header with period selector + navigation */}
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <BarChart3 className="w-4 h-4 text-zinc-500" />
      <span className="text-[12px] text-zinc-400 font-medium font-syne">
        Productivity
      </span>
    </div>
    
    {/* Period pills */}
    <div className="flex gap-1">
      {(['today', 'week', 'month', 'all'] as const).map(p => (
        <button
          key={p}
          onClick={() => { setSelectedPeriod(p); setPeriodOffset(0); }}
          className={`text-[10px] px-2 py-0.5 rounded-full transition-colors
            ${selectedPeriod === p
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 border border-transparent'
            }`}
        >
          {p === 'today' ? 'Today' : p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>
  </div>
  
  {/* Date range label + navigation */}
  <div className="flex items-center justify-between mb-3">
    <button
      onClick={() => setPeriodOffset(prev => prev + 1)}
      className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
      title="Previous period"
    >
      <ChevronLeft className="w-3.5 h-3.5" />
    </button>
    
    <span className="text-[11px] text-zinc-500">
      {computeDateRange(selectedPeriod, periodOffset).label}
    </span>
    
    <div className="flex items-center gap-1">
      {periodOffset > 0 && (
        <button
          onClick={() => setPeriodOffset(prev => Math.max(0, prev - 1))}
          className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
          title="Next period"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
      {periodOffset > 0 && (
        <button
          onClick={() => setPeriodOffset(0)}
          className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 
                     rounded hover:text-zinc-300 transition-colors"
        >
          Today
        </button>
      )}
      {periodOffset === 0 && (
        <div className="w-3.5" /> /* Spacer for alignment */
      )}
    </div>
  </div>
  
  {/* Chart */}
  {chartBarsResult.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
      <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
      <span className="text-[11px]">No tracking data for this period</span>
      <span className="text-[9px] mt-1">Start using apps to see productivity data</span>
    </div>
  ) : (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartBarsResult.map(b => ({
          name: b.label,
          productive: secondsToHours(b.productiveSeconds),
          nonProductive: secondsToHours(b.nonProductiveSeconds),
          external: secondsToHours(b.externalSeconds),
          isCurrent: b.isCurrent,
        }))}
        margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
        barCategoryGap={selectedPeriod === 'today' ? '15%' : 
                        selectedPeriod === 'month' ? '8%' : '20%'}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="rgba(63,63,70,0.3)" 
          vertical={false}
        />
        <XAxis 
          dataKey="name"
          tick={{ fill: '#71717a', fontSize: 9 }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(63,63,70,0.5)' }}
          interval={selectedPeriod === 'today' ? 2 : 
                    selectedPeriod === 'month' ? 2 : 0}
        />
        <YAxis
          domain={[0, yAxisConfig.niceMax]}
          ticks={Array.from(
            { length: yAxisConfig.tickCount + 1 }, 
            (_, i) => (yAxisConfig.niceMax / yAxisConfig.tickCount) * i
          )}
          tickFormatter={yAxisConfig.tickFormatter}
          tick={{ fill: '#71717a', fontSize: 9 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomProductivityTooltip period={selectedPeriod} />} />
        <Bar 
          dataKey="productive" 
          stackId="a"
          fill="#10b981"
          radius={[0, 0, 0, 0]}
          isAnimationActive={true}
          animationDuration={400}
        />
        <Bar 
          dataKey="nonProductive" 
          stackId="a"
          fill="#f59e0b"
          radius={[0, 0, 0, 0]}
          isAnimationActive={true}
          animationDuration={400}
        />
        <Bar 
          dataKey="external" 
          stackId="a"
          fill="#6366f1"
          radius={[4, 4, 0, 0]}
          isAnimationActive={true}
          animationDuration={400}
        />
      </BarChart>
    </ResponsiveContainer>
  )}
  
  {/* Legend */}
  <div className="flex items-center justify-center gap-4 mt-3">
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="text-[9px] text-zinc-500">Productive</span>
    </div>
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-amber-500" />
      <span className="text-[9px] text-zinc-500">Non-Productive</span>
    </div>
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full bg-indigo-500" />
      <span className="text-[9px] text-zinc-500">External</span>
    </div>
  </div>
</div>
```

---

## 5. Custom Tooltip

```tsx
function CustomProductivityTooltip({ active, payload, period }: any) {
  if (!active || !payload || payload.length === 0) return null;
  
  const data = payload[0].payload;
  const productiveH = data.productive;
  const nonProductiveH = data.nonProductive;
  const externalH = data.external;
  const totalH = productiveH + nonProductiveH + externalH;
  
  return (
    <div className="bg-zinc-800/95 border border-zinc-700/50 rounded-lg px-3 py-2 
                    shadow-xl backdrop-blur-sm">
      <div className="text-[10px] text-zinc-400 font-medium mb-1.5">
        {data.name}
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[9px] text-zinc-500 w-20">Productive</span>
          <span className="text-[10px] text-emerald-400 font-medium tabular-nums">
            {formatHours(productiveH)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="text-[9px] text-zinc-500 w-20">Non-Productive</span>
          <span className="text-[10px] text-amber-400 font-medium tabular-nums">
            {formatHours(nonProductiveH)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span className="text-[9px] text-zinc-500 w-20">External</span>
          <span className="text-[10px] text-indigo-400 font-medium tabular-nums">
            {formatHours(externalH)}
          </span>
        </div>
        
        <div className="border-t border-zinc-700/50 pt-1 mt-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-500 w-20">Total</span>
            <span className="text-[10px] text-zinc-300 font-medium tabular-nums">
              {formatHours(totalH)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatHours(hours: number): string {
  if (hours === 0) return '0m';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
```

---

## 6. Today Highlight

For `'week'` period, today's bar gets a subtle visual indicator:

```tsx
{/* In the BarChart, add a custom shape for the current day's bar */}
<Bar 
  dataKey="productive" 
  stackId="a"
  fill="#10b981"
  shape={(props: any) => {
    const { x, y, width, height, payload } = props;
    return (
      <rect
        x={x} y={y} width={width} height={height}
        fill={payload.isCurrent ? '#10b981' : '#10b98199'}
        stroke={payload.isCurrent ? '#10b981' : 'none'}
        strokeWidth={payload.isCurrent ? 1 : 0}
        rx={1}
      />
    );
  }}
/>
```

**Alternative (simpler):** Use `fillOpacity` to differentiate:

```tsx
<Bar 
  dataKey="productive" 
  stackId="a"
  fill="#10b981"
  fillOpacity={(entry: any) => entry.isCurrent ? 1 : 0.7}
/>
```

This makes the current day's bar slightly more vivid while keeping past days slightly muted. Subtle but effective.

---

## 7. State Management

Replace the existing `periodOffset` and related state with a cleaner setup:

```typescript
// State declarations (add to DashboardPage component)
const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
const [periodOffset, setPeriodOffset] = useState(0);

// Derived: date range label for header
const rangeLabel = useMemo(
  () => computeDateRange(selectedPeriod, periodOffset).label,
  [selectedPeriod, periodOffset]
);

// Reset offset when period changes
const handlePeriodChange = useCallback((period: 'today' | 'week' | 'month' | 'all') => {
  setSelectedPeriod(period);
  setPeriodOffset(0);
}, []);
```

---

## 8. Performance: useMemo Chain

The data processing pipeline uses three `useMemo` layers. This is important because `allLogs` can contain thousands of entries and the aggregation runs on every period/offset change.

```
allLogs + externalSessions
         │
         ▼
  ┌──────────────────┐     ┌──────────────────┐
  │ chartInternalData │     │ chartExternalData │    ← Layer 1: Filter + aggregate by key
  │ (useMemo)         │     │ (useMemo)         │
  └────────┬──────────┘     └────────┬──────────┘
           │                         │
           └──────────┬──────────────┘
                      ▼
           ┌────────────────────┐
           │ chartBarsResult     │          ← Layer 2: Generate buckets + merge
           │ (useMemo)           │
           └────────┬────────────┘
                    │
                    ▼
           ┌────────────────────┐
           │ yAxisConfig         │          ← Layer 3: Compute axis scaling
           │ (useMemo)           │
           └────────────────────┘
```

Each layer only recomputes when its specific dependencies change. The `chartInternalData` and `chartExternalData` memos are independent, so they can compute in parallel. The `chartBarsResult` memo depends on both but is lightweight (just bucket generation + map lookups).

---

## 9. Complete Replacement Code

Here is the exact code block to replace in `DashboardPage.tsx`. It replaces the existing `useEffect` for `chartBarsResult` and the broken `chartExternalData` computation:

```typescript
// ═══════════════════════════════════════════════════════════
// PRODUCTIVITY CHART — Data Processing Pipeline
// ═══════════════════════════════════════════════════════════

const PRODUCTIVE_CATEGORIES = new Set(['IDE', 'Productivity', 'Design', 'AI Tools']);

interface ChartBar {
  label: string;
  key: string;
  productiveSeconds: number;
  nonProductiveSeconds: number;
  externalSeconds: number;
  isCurrent?: boolean;
}

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

function computeDateRange(period: string, offset: number): DateRange {
  const now = new Date();
  let start: Date, end: Date, label: string;

  switch (period) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
      end = new Date(start); end.setDate(end.getDate() + 1);
      label = offset === 0 ? 'Today' : start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      break;
    }
    case 'week': {
      const dow = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow - (offset * 7));
      end = new Date(start); end.setDate(end.getDate() + 7);
      label = offset === 0 ? 'This Week' : `Week of ${start.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
      break;
    }
    case 'month': {
      start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
      label = start.toLocaleDateString([], { month: 'long', year: 'numeric' });
      break;
    }
    case 'all': {
      if (offset === 0) {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
        end = now;
      } else {
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (offset - 1) * 90);
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset * 90);
      }
      label = offset === 0 ? 'Last 90 Days' : `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${new Date(end.getTime() - 1).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
      break;
    }
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start); end.setDate(end.getDate() + 1);
      label = 'Today';
    }
  }

  return { start, end, label };
}

function getDateKey(timestamp: string | Date, period: string): string {
  const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  switch (period) {
    case 'today': return `${d.getHours()}`;
    case 'week':
    case 'month': return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    case 'all': return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    default: return `${d.getHours()}`;
  }
}

function formatHourLabel(h: number): string {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

function formatHours(hours: number): string {
  if (hours === 0) return '0m';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function secondsToHours(seconds: number): number {
  return seconds / 3600;
}

// ── Layer 1: Aggregate internal logs ──
const chartInternalData = useMemo(() => {
  const productive = new Map<string, number>();
  const nonProductive = new Map<string, number>();
  if (!allLogs || allLogs.length === 0) return { productive, nonProductive };

  const range = computeDateRange(selectedPeriod, periodOffset);

  for (const log of allLogs) {
    const logDate = new Date(log.timestamp || log.created_at);
    if (logDate < range.start || logDate >= range.end) continue;

    const key = getDateKey(logDate, selectedPeriod);
    const durationSec = (log.duration_ms || 0) / 1000;

    if (PRODUCTIVE_CATEGORIES.has(log.category || '')) {
      productive.set(key, (productive.get(key) || 0) + durationSec);
    } else {
      nonProductive.set(key, (nonProductive.get(key) || 0) + durationSec);
    }
  }

  return { productive, nonProductive };
}, [allLogs, selectedPeriod, periodOffset]);

// ── Layer 1: Aggregate external sessions ──
const chartExternalData = useMemo(() => {
  const data = new Map<string, number>();
  if (!externalSessions || externalSessions.length === 0) return data;

  const range = computeDateRange(selectedPeriod, periodOffset);

  for (const session of externalSessions) {
    const sessionDate = new Date(session.started_at);
    if (sessionDate < range.start || sessionDate >= range.end) continue;

    const key = getDateKey(session.started_at, selectedPeriod);
    data.set(key, (data.get(key) || 0) + (session.duration_seconds || 0));
  }

  return data;
}, [externalSessions, selectedPeriod, periodOffset]);

// ── Layer 2: Generate buckets + merge ──
const chartBarsResult = useMemo((): ChartBar[] => {
  const range = computeDateRange(selectedPeriod, periodOffset);
  const bars: ChartBar[] = [];
  const now = new Date();

  switch (selectedPeriod) {
    case 'today': {
      for (let h = 0; h < 24; h++) {
        const key = `${h}`;
        bars.push({
          label: formatHourLabel(h),
          key,
          productiveSeconds: Math.min(chartInternalData.productive.get(key) || 0, 3600),
          nonProductiveSeconds: Math.min(chartInternalData.nonProductive.get(key) || 0, 3600),
          externalSeconds: Math.min(chartExternalData.get(key) || 0, 3600),
          isCurrent: now >= range.start && now < range.end && now.getHours() === h,
        });
      }
      break;
    }
    case 'week': {
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(range.start);
        dayDate.setDate(dayDate.getDate() + i);
        const key = getDateKey(dayDate, 'week');
        bars.push({
          label: dayDate.toLocaleDateString([], { weekday: 'short' }),
          key,
          productiveSeconds: chartInternalData.productive.get(key) || 0,
          nonProductiveSeconds: chartInternalData.nonProductive.get(key) || 0,
          externalSeconds: chartExternalData.get(key) || 0,
          isCurrent: dayDate.getFullYear() === now.getFullYear() && dayDate.getMonth() === now.getMonth() && dayDate.getDate() === now.getDate(),
        });
      }
      break;
    }
    case 'month': {
      const current = new Date(range.start);
      while (current < range.end) {
        const key = getDateKey(current, 'month');
        bars.push({
          label: `${current.getDate()}`,
          key,
          productiveSeconds: chartInternalData.productive.get(key) || 0,
          nonProductiveSeconds: chartInternalData.nonProductive.get(key) || 0,
          externalSeconds: chartExternalData.get(key) || 0,
          isCurrent: current.getFullYear() === now.getFullYear() && current.getMonth() === now.getMonth() && current.getDate() === now.getDate(),
        });
        current.setDate(current.getDate() + 1);
      }
      break;
    }
    case 'all': {
      const current = new Date(range.start);
      let lastKey = '';
      while (current < range.end) {
        const key = getDateKey(current, 'all');
        if (key !== lastKey) {
          bars.push({
            label: current.toLocaleDateString([], { month: 'short', year: '2-digit' }),
            key,
            productiveSeconds: chartInternalData.productive.get(key) || 0,
            nonProductiveSeconds: chartInternalData.nonProductive.get(key) || 0,
            externalSeconds: chartExternalData.get(key) || 0,
            isCurrent: current.getFullYear() === now.getFullYear() && current.getMonth() === now.getMonth(),
          });
          lastKey = key;
        }
        current.setMonth(current.getMonth() + 1);
      }
      break;
    }
  }

  return bars;
}, [chartInternalData, chartExternalData, selectedPeriod, periodOffset]);

// ── Layer 3: Y-axis configuration ──
const yAxisConfig = useMemo(() => {
  const maxValues = chartBarsResult.map(b =>
    secondsToHours(b.productiveSeconds + b.nonProductiveSeconds + b.externalSeconds)
  );
  const rawMax = Math.max(...maxValues, 0.1);

  let niceMax: number, tickCount: number;
  const tickFormatter = (v: number) => {
    if (selectedPeriod === 'today') {
      const mins = Math.round(v * 60);
      return mins % 60 === 0 ? `${mins / 60}h` : `${mins}m`;
    }
    if (selectedPeriod === 'all' && v >= 24) return `${(v / 24).toFixed(0)}d`;
    return `${v}h`;
  };

  switch (selectedPeriod) {
    case 'today':
      niceMax = 1;
      tickCount = 4;
      break;
    case 'week':
    case 'month':
      niceMax = Math.min(Math.ceil(rawMax / 4) * 4, 24);
      tickCount = niceMax <= 8 ? niceMax : 4;
      break;
    case 'all':
      if (rawMax <= 24) niceMax = Math.ceil(rawMax / 4) * 4;
      else if (rawMax <= 100) niceMax = Math.ceil(rawMax / 20) * 20;
      else niceMax = Math.ceil(rawMax / 50) * 50;
      tickCount = 4;
      break;
    default:
      niceMax = 24;
      tickCount = 4;
  }

  return { niceMax, tickCount, tickFormatter };
}, [chartBarsResult, selectedPeriod]);
```

---

## 10. Visual Summary — What Changes

```
BEFORE (broken):                    AFTER (fixed):
                                    
Week view:                          Week view:
┌──────────────────────────┐        ┌──────────────────────────┐
│ ████ ██████ ████ ██████  │        │ ██ █████ ████ ██ ████    │
│ ████ ██████ ████ ██████  │        │ ██ █████ ████ ██ ████    │
│ ████ ██████ ████ ██████  │        │ ██ █████ ████ ██ ████    │
│ All bars same height     │        │ Varied heights ✓          │
│ (all Wednesdays merged)  │        │ Correct per-day data ✓    │
└──────────────────────────┘        └──────────────────────────┘

Month view:                         Month view:
┌──────────────────────────┐        ┌──────────────────────────┐
│ ██ ██ ██ ██ ██ ██ ██ ██ │        │ █ ██ ████ ██ █ ██ ████   │
│ ██ ██ ██ ██ ██ ██ ██ ██ │        │ █ ██ ████ ██ █ ██ ████   │
│ All 15ths merged, etc.   │        │ Correct per-date data ✓   │
└──────────────────────────┘        └──────────────────────────┘
```

---

## 11. File Change Summary

| File | Change |
|------|--------|
| `src/pages/DashboardPage.tsx` | Replace entire chart data pipeline: remove old `useEffect` for `chartBarsResult` and broken `chartExternalData` Map, add 4 `useMemo` layers (`chartInternalData`, `chartExternalData`, `chartBarsResult`, `yAxisConfig`), add helper functions (`computeDateRange`, `getDateKey`, `formatHourLabel`, `formatHours`, `secondsToHours`), add `ChartBar`/`DateRange` interfaces, replace chart JSX with updated version including `CustomProductivityTooltip`, period navigation, empty state, and Y-axis auto-scaling |

One file, one change, complete fix.
