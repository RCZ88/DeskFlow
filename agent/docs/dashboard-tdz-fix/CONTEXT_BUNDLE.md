# CONTEXT_BUNDLE.md — Dashboard TDZ + Null Guard Fixes

## Problem

The DashboardPage crashes at runtime with two errors:
1. `Cannot access 'ht' before initialization` (TDZ — const referenced before declaration)
2. `Cannot read properties of null (reading 'weeklyHeatmap')` (null guard missing)

## File Structure

### `src/pages/DashboardPage.tsx` (2979 lines)

**Component:** `export default function DashboardPage({...props...})`

**State order matters** — every `const`, `useState`, `useRef`, and `useMemo` executes top-to-bottom during render. If a hook references a `const` declared LATER in the function body, it throws TDZ.

### State Variables (in order they should appear)

```
const [weekOffset, setWeekOffset] = useState(0);   // MUST be before any useEffect that references it
const [dashboardData, setDashboardData] = useState<any>(null); // Starts null, filled async
```

### Key Hooks That Access `dashboardData`

| Hook | Location | Must Handle null? |
|------|----------|-------------------|
| `chartBars` useMemo | line 509 | ✅ Only 3/6 paths guarded |
| Activity feed useEffect | line 362 | ✅ Guarded by `dashboardData?.recentSessions?.length > 0` |
| `heatmapData` useMemo | line 1321 | ✅ `if (!dashboardData?.hourlyHeatmap) return []` |
| `computedWebsiteData` useMemo | line 1755 | ✅ `if (!dashboardData?.websiteStats) return []` |
| `computedSolarData` useMemo | line 1764 | ✅ `if (!dashboardData?.appStats) return []` |
| `stats` useMemo | line 1796 | ✅ `if (!ov) return { zero values }` |

### The Unfixed Paths in `chartBars` useMemo (line 509)

```typescript
// 'today' case — ALREADY SAFE (uses dashboardData?.hourlyHeatmap?.[todayStr])
case 'today': {
  const todayHours = dashboardData?.hourlyHeatmap?.[todayStr] || {};
  ...
}

// 'week' case — WAS UNSAFE, uses dashboardData.weeklyHeatmap.find() without ?.
case 'week': {
  const bar = dashboardData.weeklyHeatmap.find(...)  // CRASH when dashboardData is null
}

// 'month' case — WAS UNSAFE
case 'month': {
  const bar = dashboardData.weeklyHeatmap.find(...)  // CRASH
}

// 'all' case — WAS UNSAFE
case 'all': {
  const bar = dashboardData.weeklyHeatmap.find(...)  // CRASH
}
```

### The TDZ Issue

```typescript
// Line 335 — useEffect uses weekOffset in dep array
useEffect(() => {
  // fetch dashboard data...
}, [selectedPeriod, dateOffset, weekOffset]);  // ❌ weekOffset not declared yet!

// Line 452 (previously) — declared AFTER the useEffect
const [weekOffset, setWeekOffset] = useState(0);  // TDZ!
```

## Data Flow

1. Component mounts → `dashboardData = null` → first render happens
2. `useEffect` at line 335 fires → async fetch to `getDashboardAggregates` IPC
3. On first render, `chartBars` useMemo runs with `dashboardData = null` → CRASH on unguarded `.weeklyHeatmap`
4. After fetch resolves → `setDashboardData(data)` → re-render with data

## IPC Endpoint

```typescript
// preload.ts bridge
getDashboardAggregates: (params: { period, dateOffset, weekOffset }) => Promise<DashboardAggregateResponse>

// Response shape
{
  weeklyHeatmap: Array<{ date: string; productiveHours: number; ... }>,
  hourlyHeatmap: Record<string, Record<number, { appSeconds, domainSeconds, productive }>>,
  websiteStats: Array<{ domain, totalSeconds, category }>,
  appStats: Array<{ app, totalSeconds, category }>,
  overview: { totalSeconds, productiveSeconds, ... },
  recentSessions: Array<{ timestamp, app, title, domain, category, isBrowser, durationSeconds }>,
  error?: string
}
```
