# Smart Gap Fill — CONTEXT_BUNDLE.md

> Self-contained codebase reference for the Smart Gap Fill feature.
> Target AI has NO access to the actual codebase — this file replaces it.

---

## 1. Data Structures

### HourCell (InsightsPage.tsx:54-61)
```typescript
interface HourCell {
  activities: ActivityBucket[];
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
```

### TypicalDayData (InsightsPage.tsx:62-73)
```typescript
interface TypicalDayData {
  grid: HourCell[][];         // [7 days][24 hours]
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
```

### Gap (GapPanel.tsx:5-9)
```typescript
interface Gap {
  start: string;          // ISO timestamp
  end: string;            // ISO timestamp
  durationSeconds: number;
}
```

---

## 2. IPC Endpoints (All EXIST — fully implemented)

### detectUsageGaps — returns raw gap list
- Channel: `detect-usage-gaps`
- Preload: `preload.ts:489` — `detectUsageGaps(options?: { period?: string; minGapMinutes?: number })`
- Handler: `main.ts` — queries logs/external_sessions, returns merged `Gap[]`

### predictGapFill — predict apps for a single gap range
- Channel: `predict-gap-fill`
- Preload: `preload.ts:876` — `predictGapFill(start: string, end: string, mode?: 'combined' | 'separate')`
- Handler: `main.ts:20180`
- Returns:
```typescript
{
  gaps: Array<{
    start: string;
    end: string;
    durationSeconds: number;
    slots: Array<{
      slotStart: string;       // ISO
      slotEnd: string;         // ISO
      predictions: Array<{
        app: string;
        category: string;
        confidence: number;     // 0-99
        avgSeconds: number;
        daysUsed: number;
      }>;
      durationSeconds: number;
    }>;
  }>;
}
```
- **Prediction algorithm:** Queries `stats_hourly` and `logs` for same day-of-week + hour, scores by frequency (daysUsed/30), recency (1/log2(daysSince+1)), and context adjacency (±1h before/after gap), then picks top 3. 15-minute slot resolution.

### confirmGapFill — write selected predictions to logs table
- Channel: `confirm-gap-fill`
- Preload: `preload.ts:878` — `confirmGapFill(fills: Array<{ slotStart: string; slotEnd: string; app: string; category: string }>)`
- Handler: `main.ts:20303`
- Inserts into `logs` table with title `"Gap fill: {app}"`.

### predictDayGaps — batch predict all gaps for a full day
- Channel: `predict-day-gaps`
- Preload: `preload.ts:880` — `predictDayGaps(date: string, mode?: 'combined' | 'separate')`
- Handler: `main.ts:20328`
- Returns:
```typescript
{
  date: string;
  slots: Array<{
    gapStart: string;
    gapEnd: string;
    durationSeconds: number;
    slots: Array<{ slotStart; slotEnd; predictions: [...]; durationSeconds }>;
    predicted: boolean;
  }>;
}
```

### getTypicalDay — returns the Typical Day grid data
- Preload: `preload.ts:487` — `getTypicalDay(days?: number, dateOffset?: number)`
- Returns `TypicalDayData` (see §1)

---

## 3. Existing UI Components

### GapPanel.tsx (src/components/GapPanel.tsx)
Simple modal panel. Fetches `detectUsageGaps`, shows a list of gap time ranges with "Fill" buttons. Each Fill button dispatches a `fill-time-gap` CustomEvent. No prediction, no suggestions. Currently used in `App.tsx` via `GapBanner.tsx`.

### GapBanner.tsx
A pill banner on the Insights page that says "X gaps found" and opens GapPanel on click.

### GapPredictorPanel.tsx (src/components/GapPredictorPanel.tsx)
An earlier rough draft that was discarded — do NOT reference or reuse. The Architect should design a clean replacement.

---

## 4. Design Tokens (DeskFlow)

- **Panel:** `bg-zinc-900/95 border border-zinc-700/50 rounded-xl`
- **Card inner:** `bg-zinc-800/30 border border-zinc-700/20`
- **Active state:** `bg-zinc-700 text-zinc-200 shadow-sm`
- **Primary action:** `bg-indigo-600 hover:bg-indigo-500 text-white`
- **Accent gradient bar:** `from-indigo-500/40 via-emerald-500/40 to-indigo-500/40`
- **Icon container:** `w-9 h-9 rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20`
- **Text hierarchy:** `text-zinc-100` (primary), `text-zinc-300` (secondary), `text-zinc-500` (tertiary), `text-zinc-600/700` (muted)
- **Font:** Inter (body), JetBrains Mono (timestamps/code)
- **Animation:** Framer Motion spring — `type: 'spring', duration: 0.4, bounce: 0.25`
- **Tooltip container:** `bg-zinc-900 border border-zinc-700 rounded-lg p-3 min-w-[160px] pointer-events-none fixed z-50`
- **Category colors:** IDE `#6366f1`, AI Tools `#8b5cf6`, Browser `#3b82f6`, Entertainment `#ec4899`, Communication `#14b8a6`, Design `#a855f7`, Productivity `#10b981`, Tools `#f59e0b`, Developer Tools `#10b981`

---

## 5. Tooltip Positioning KNOWN BUG

Current Typical Day tooltip code (InsightsPage.tsx:527-532):
```typescript
onMouseEnter={(e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const right = rect.right + 12;
  const clampedX = Math.min(right, window.innerWidth - 180);
  setTooltip({ day: dayIdx, hour: hourIdx, x: clampedX, y: rect.top + rect.height / 2 });
}}
```

The tooltip renders with `fixed` positioning and `translateY(-50%)` to center vertically.

**BUG:** The tooltip always appears to the right of the cell. When the cell is near the right edge, `window.innerWidth - 180` clamping pushes it to the far-right edge of the viewport — still far away from the cell. The user reports it's "like three centimeters from the actual box." The tooltip needs proximity-based anchoring that tests all 4 sides and picks the closest edge that keeps the tooltip fully in-viewport.

---

## 6. Layout Details

- Typical Day grid is inside a horizontal-scroll container: `overflow-x-auto`
- Grid columns: `flex-1` with `gap-[2px]` — each cell is `aspect-square`
- Hour labels above grid: only shows every 6th label (0, 6, 12, 18)
- Day labels on left: `w-[30px]` fixed width
- The grid displays 7 days × 24 hours of `HourCell` data

---

## 7. Data Flow

```
getTypicalDay IPC ─► TypicalDayData.grid (HourCell[][]) ─► renders heatmap grid
                                                                        │
                                                    onMouseEnter ─► setTooltip position
                                                                        │
                                                            tooltip overlay with activity
                                                            breakdown + external/device flags

detectUsageGaps IPC ─► Gap[] ─► GapPanel list
predictGapFill IPC   ─► slots with predictions ─► (to be designed)
confirmGapFill IPC   ─► writes to logs table
```

---

## 8. Logs Table Schema (relevant columns)
```sql
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,       -- ISO 8601
  app TEXT NOT NULL,
  category TEXT,
  duration_ms INTEGER DEFAULT 0,
  title TEXT
);
```

### stats_hourly (used for pattern matching)
```sql
CREATE TABLE stats_hourly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  app_name TEXT NOT NULL,
  category TEXT,
  total_seconds REAL DEFAULT 0
);
```

### external_sessions + external_activities (used in combined mode)
```sql
CREATE TABLE external_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER,
  started_at TEXT,
  ended_at TEXT,
  duration_seconds REAL
);
CREATE TABLE external_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT
);
```
