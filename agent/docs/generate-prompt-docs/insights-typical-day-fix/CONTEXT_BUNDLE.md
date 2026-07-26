# CONTEXT_BUNDLE.md — Insights Page "Typical Day" Section

## 1. Problem Summary

The Insights page (`/insights`) has a "Typical Day" section with two toggle modes: **Original** and **Smooth**. They are **SWITCHED** — the content intended for Original is in Smooth and vice versa. Additionally:

- **Original mode** only renders 1 row ("Today") instead of the full 7-day week
- **Original mode** has minimal data rendering (only 1 square lit up) because it uses raw `logs`/`browserLogs` for a single day instead of the backend `getTypicalDay` data
- **Original mode** is supposed to have the multi-activity composition split cells (gradient fills) + rich hover tooltip — but those are currently on Smooth
- **Smooth mode** is supposed to be a simple single-color intensity heatmap — but currently has the complex split-view + tooltip
- **UI/design quality** across both modes is poor — needs full frontend design treatment

## 2. File Map

| File | Purpose |
|------|---------|
| `src/pages/InsightsPage.tsx` | Entire Insights page — the **only** file that needs changes |
| `src/main.ts` (lines 15577-15672) | Backend IPC handler `get-typical-day` — returns 7×24 grid with multi-activity cells |
| `src/preload.ts` (line 495) | IPC bridge `window.deskflowAPI.getTypicalDay()` |
| `src/components/GlassCard.tsx` | Glass card container component |
| `src/components/PageShell.tsx` | Page shell wrapper |
| `src/components/SectionHeader.tsx` | Section header component |
| `src/index.css` | Design tokens |

## 3. Current Render Structure (lines 515-977 of InsightsPage.tsx)

```tsx
{activeTab === 'typical' && (
  <GlassCard>
    <SectionHeader title="Typical Day" ... />
    <ViewModeToggle />  {/* Original | Smooth buttons */}

    {typicalMode === 'original' && (  // ← LINES 564-729: CURRENT "ORIGINAL"
      // Single-day simple heatmap — ONLY TODAY'S ROW
      // Uses `originalDayData` computed from raw logs (1 day)
      // No multi-activity split, no rich tooltip
      // Minimal single-color heat squares
    )}

    {typicalMode === 'smooth' && patchedTypicalDay ? (  // ← LINES 732-969: CURRENT "SMOOTH"
      // 7-day × 24-hour grid with multi-activity gradient fills
      // Has consistency score bars, rich hover tooltip, legend
      // Uses `patchedTypicalDay` from backend getTypicalDay
    )}
  </GlassCard>
)}
```

## 4. What Currently Goes Where

### Current "Original" (lines 564-729) — SHOULD BE "Smooth"
```tsx
{typicalMode === 'original' && (() => {
  const { slots, maxSeconds, legend, stats: dayStats } = originalDayData;
  // ...
  // Renders:
  // - 3 stat cards (Total Hours, Peak Hour, Activities) — single-day
  // - 1 row of 24 heatmap squares labeled "Today" (line 632)
  // - Detail panel on hover (lines 652-676) — shows activities for hovered hour
  // - Activity chips row (lines 680-703)
  // - Legend + intensity scale

  // Heat colors: single-color emerald intensity (lines 568-575)
  function getHeatColor(seconds: number, max: number): string {
    if (seconds === 0) return 'bg-zinc-800/30';
    const ratio = seconds / max;
    if (ratio > 0.75) return 'bg-emerald-500/90';
    if (ratio > 0.5) return 'bg-emerald-500/65';
    if (ratio > 0.25) return 'bg-emerald-500/40';
    return 'bg-emerald-500/20';
  }
  // ...
})()}
```

### Current "Smooth" (lines 732-969) — SHOULD BE "Original"
```tsx
{typicalMode === 'smooth' && patchedTypicalDay ? (() => {
  const data = patchedTypicalDay;
  // ...
  // Renders:
  // - 3 stat cards (Total Hours, Most Active, Peak Hour) — multi-day averages
  // - Schedule Consistency score + color legend (lines 799-825)
  // - 7-day × 24-hour grid (lines 838-898)
  //   - Each cell has multi-activity gradient fill via `cellBg()` (lines 741-755)
  //   - Activity name text overlay
  //   - Consistency bar at bottom
  // - Rich hover tooltip (lines 902-941) — shows activity breakdown, consistency %, external/device badges
  // - Legend + intensity scale

  // Multi-activity split fill:
  function cellBg(cell: HourCell) {
    if (cell.activities.length === 0) return 'rgba(39, 39, 42, 0.5)';
    if (cell.activities.length === 1) {
      const secs = cell.totalSeconds;
      if (secs >= 2700) return 'rgba(16, 185, 129, 0.9)';
      // ... single-color intensity
    }
    const segments = cell.activities.map((a, i) => {
      const start = cell.activities.slice(0, i).reduce((s, x) => s + x.percentage, 0);
      return `${a.color} ${start}% ${start + a.percentage}%`;
    });
    return `linear-gradient(90deg, ${segments.join(', ')})`;
  }
  // ...
})()}
```

## 5. Data Sources

### `originalDayData` (computed client-side, lines 281-333)
```typescript
const originalDayData = useMemo(() => {
  const hourly: Record<number, Record<string, number>> = {};
  for (let h = 0; h < 24; h++) hourly[h] = {};
  // Aggregates logs + browserLogs by hour → single day
  // Returns { slots: HourlySlot[], maxSeconds, legend, stats }
}, [logs, browserLogs]);

interface HourlySlot {
  hour: number;
  primaryActivity: string;
  totalSeconds: number;
  activities: Array<{ name: string; seconds: number; color: string }>;
}
```
- **Scope:** Only today's data from raw `logs`/`browserLogs` props
- **Problem:** Only has data for current day, not the week

### `patchedTypicalDay` (from backend, lines 255-271)
```typescript
const patchedTypicalDay = useMemo(() => {
  if (!typicalDayData) return null;
  // Fixes missing colors in the backend response
  return { ...typicalDayData, grid, legend };
}, [typicalDayData]);

// Fetched via:
useEffect(() => {
  const days = periodToDays(parentPeriod);  // 7, 30, or 365
  window.deskflowAPI?.getTypicalDay(days, dateOffset).then((result: any) => {
    if (result?.grid) setTypicalDayData(result as TypicalDayData);
  });
}, [parentPeriod, dateOffset]);
```

### Backend IPC: `get-typical-day` (main.ts lines 15577-15672)
```typescript
ipcMain.handle('get-typical-day', (event, days = 30, dateOffset = 0) => {
  // Returns TypicalDayData:
  interface TypicalDayData {
    grid: HourCell[][];  // 7 rows × 24 cols — averaged across days/7 weeks
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

  interface HourCell {
    activities: ActivityBucket[];  // multi-activity per cell
    totalSeconds: number;
    dominantActivity: string;
    hasExternal: boolean;
    hasDevice: boolean;
  }

  interface ActivityBucket {
    activity: string;
    seconds: number;
    percentage: number;
    color: string;
  }
});
```

**Backend logic:**
1. Queries `external_sessions` + `logs` tables for date range
2. Creates 7×24 grid (Sun-Sat × 0-23)
3. Distributes each session across relevant hour cells
4. **Averages** activity seconds by `weekCount = days / 7`
5. Filters cells: only activities with `percentage >= 10 || seconds >= 60`
6. Recalculates percentages after filtering
7. Returns 7-day grid — this is the data that should power "Original" mode

## 6. The SWAP — What Must Change

| Aspect | Current "Original" (WRONG) | Current "Smooth" (WRONG) | CORRECT Mapping |
|--------|--------------------------|--------------------------|-----------------|
| Data source | `originalDayData` (1 day from raw logs) | `patchedTypicalDay` (7 days from backend) | **Original** ← backend grid, **Smooth** ← raw logs |
| Grid dimensions | 1 row × 24 cols (Today only) | 7 rows × 24 cols (Sun-Sat) | **Original** shows 7×24, **Smooth** shows 1×24 |
| Cell content | Single-color heat | Multi-activity gradient fills | **Original** has gradient splits, **Smooth** has single-color |
| Tooltip | Simple detail panel on side | Rich popup with breakdown + consistency | **Original** gets the rich tooltip |
| Activity text | In detail panel | Overlaid on cells | **Original** has text on cells + tooltip, **Smooth** is cleaner |
| Consistency score | Not present | Per-cell bar + avg score | **Original** gets this, **Smooth** doesn't |

## 7. Design System Tokens (from index.css)

```css
/* Backgrounds */
--bg-primary:     #09090b;
--bg-secondary:   #18181b;
--bg-tertiary:    #27272a;
--bg-glass:       rgba(24, 24, 27, 0.80);

/* Text */
--text-primary:   #f4f4f5;
--text-secondary: #a1a1aa;
--text-muted:     #52525b;

/* Accent */
--accent-primary:   #ec4899;
--page-accent: var(--accent-primary);  /* insights page = pink/ec4899 */

/* Success/Error */
--success:         #34d399;
--error:           #f87171;

/* Borders */
--border-subtle:   #27272a;
--border-default:  #3f3f46;
--border-glass:    rgba(63, 63, 70, 0.50);

/* Motion */
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
--fast:        150ms;
--normal:      250ms;
--slow:        400ms;

/* Font */
font-family: "Geist", "Inter", system-ui, sans-serif;
font-size: 13px;
code: "JetBrains Mono", "Fira Code", monospace;
```

**Page-specific accent:** `[data-page="insights"] { --page-accent: #ec4899; }` (pink)

## 8. Key State Variables (lines 160-174)

```typescript
const [typicalDayData, setTypicalDayData] = useState<TypicalDayData | null>(null);
const [typicalMode, setTypicalMode] = useState<'smooth' | 'original'>('smooth');
const [hoveredHour, setHoveredHour] = useState<number | null>(null);
const [tooltip, setTooltip] = useState<{ day: number; hour: number; x: number; y: number; side: string } | null>(null);
```

## 9. Reusable Components Available

- **`GlassCard`**: `bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-4`
- **`PageShell`**: Wraps page with data-page attribute (sets `--page-accent`)
- **`SectionHeader`**: `{ title, icon?, action? }` — renders h2 + optional action
- **`motion.div`** from framer-motion — available for animations
- **Chart.js** via `react-chartjs-2` — registered globally (line 28)
- **Lucide icons** — many imported at line 6

## 10. CATEGORY_COLORS (lines 121-137)

```typescript
const CATEGORY_COLORS: Record<string, string> = {
  'IDE': '#6366f1', 'AI Tools': '#8b5cf6', 'Browser': '#3b82f6',
  'Entertainment': '#ec4899', 'Communication': '#14b8a6', 'Design': '#a855f7',
  'Productivity': '#10b981', 'Tools': '#f59e0b', 'Developer Tools': '#10b981',
  'Social Media': '#f97316', 'News': '#eab308', 'Shopping': '#ec4899',
  'Education': '#06b6d4', 'Uncategorized': '#78716c', 'Other': '#64748b',
};
```
