# DeskFlow Page Redesign — Implementation Package

## Files Included

| File | Description |
|------|-------------|
| `PLANNING.md` | Full implementation plan with phase breakdown |
| `types.ts` | Shared TypeScript types for both pages |
| `demo-data.ts` | Mock data for demonstration and testing |
| `ExternalPage.tsx` | Redesigned External page (`/external`) |
| `InsightsPage.tsx` | Redesigned Insights page (`/reports`) |

---

## External Page (`/external`)

### New Features
1. **Always-Visible Timer Section**
   - Large monospace stopwatch display (5xl) visible at all times
   - Shows "Select activity to track" when idle
   - Quick-select activity buttons for one-click tracking
   - Play / Pause / Stop controls with color-coded states

2. **Activity Detail View**
   - Stats cards: Today / Week / Month per activity
   - Historical charts specific to selected activity:
     - **Bar Chart**: Last 7 days hours
     - **Line Chart**: 30-day trend
     - **Calendar Heatmap**: GitHub-style frequency map
     - **Stats Only**: No chart (for check-in activities)

3. **Per-Activity Chart Customization**
   - Dropdown in each activity detail panel
   - Options: Stats Only, Bar Chart, Line Chart, Calendar
   - Preference stored per-activity (simulated in state)
   - Persists when switching between activities

### Design Compliance
- `bg-zinc-900` background
- `bg-zinc-800/50` cards with `border-zinc-700/50`
- Activity colors mapped to hex for Recharts compatibility
- `font-mono text-5xl` timer display
- `rounded-xl` card corners

---

## Insights Page (`/reports`)

### Removed (Duplicated Content)
- ❌ Activity Breakdown horizontal bar chart → moved to External
- ❌ Sleep Trends line chart → moved to External

### Kept (Unique Content)
- ✅ Stats cards row (Total Time, Consistency, Streak, Best Day, Sleep Deficit)
- ✅ Weekly Consistency bar chart
- ✅ Typical Day stacked bar chart

### New Features
1. **Goals & Targets Section**
   - Daily targets with progress bars (e.g., 8h productive time)
   - Weekly targets with progress bars (e.g., 40h productive time)
   - Visual circular gauge showing overall daily completion %
   - Collapsible section with expand/collapse toggle

2. **Goal Streak Tracking**
   - Flame emoji badge with day count
   - Only shown when streak > 0
   - Orange accent styling

3. **Status Color Coding**
   - **Green** (`#10b981`): On track (≥80% progress)
   - **Amber** (`#f59e0b`): Behind (60-80% progress)
   - **Red** (`#f43f5e`): Critical (<60% progress)

4. **Goal Edit Modal**
   - Click "Adjust target" on any goal card
   - Modal with number input for target value
   - Save/Cancel actions

### Design Compliance
- Progress bars with percentage fill
- Large number displays for goals
- Streak counter with flame indicator
- Green/Amber/Red status colors
- Consistent card styling with External page

---

## Integration Guide

### 1. Install Dependencies
```bash
npm install recharts lucide-react
```

### 2. Copy Files
Place all files in your project:
```
/src
  /pages
    ExternalPage.tsx
    InsightsPage.tsx
  /types
    index.ts          ← copy types.ts here
  /data
    demoData.ts       ← copy demo-data.ts here
```

### 3. Update Routes
In your router configuration:
```tsx
import ExternalPage from "./pages/ExternalPage";
import InsightsPage from "./pages/InsightsPage";

// React Router example
<Route path="/external" element={<ExternalPage />} />
<Route path="/reports" element={<InsightsPage />} />
```

### 4. Replace Demo Data
Update `demo-data.ts` to fetch from your actual database:
```tsx
// Instead of mock data:
export const DEFAULT_ACTIVITIES = await db.activities.findAll();
export const GOALS = await db.goals.findAll();
```

### 5. Tailwind Config
Ensure your Tailwind config includes the zinc/emerald/amber color palette:
```js
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

---

## Component Architecture

### ExternalPage
```
ExternalPage
├── TimerSection
│   ├── Timer Display
│   ├── Controls (Play/Pause/Stop)
│   └── Quick Activity Selector
├── ActivityGrid
│   └── ActivityCard × 8
└── ActivityDetailPanel (conditional)
    ├── ChartCustomizer (dropdown)
    ├── StatCards × 3
    └── ActivityChart
        ├── CalendarHeatmap
        ├── BarChart
        └── LineChart
```

### InsightsPage
```
InsightsPage
├── StatsCards
│   └── StatCard × 5
├── GoalsSection
│   ├── CircularGauge
│   ├── GoalCard × N
│   │   ├── GoalStreak (flame badge)
│   │   └── ProgressBar
│   └── GoalEditModal
├── WeeklyConsistencyChart
└── TypicalDayChart
```

---

## Key Design Decisions

1. **Color Mapping**: Created `COLOR_MAP` to bridge Tailwind class names with Recharts hex colors.
2. **Chart Reusability**: `ActivityChart` component dynamically renders the correct chart type based on activity preference.
3. **State Management**: Used React `useState`/`useCallback` for simplicity. Can be replaced with Zustand/Redux for production.
4. **Responsive Layout**: Grid layouts use `grid-cols-2 md:grid-cols-4` for activity cards and `lg:grid-cols-2` for charts.
5. **Accessibility**: Buttons have clear labels, tooltips on heatmap cells, and focus states.

---

## Testing Checklist

### External Page
- [ ] Timer displays `00:00` when no activity selected
- [ ] Clicking activity starts timer and shows activity name
- [ ] Play/Pause/Stop buttons work correctly
- [ ] Quick-select buttons highlight active activity
- [ ] Activity grid shows today/week stats
- [ ] Selecting activity shows detail panel with chart
- [ ] Chart customizer dropdown changes chart type
- [ ] Calendar heatmap shows intensity levels
- [ ] Bar chart shows last 7 days
- [ ] Line chart shows 30-day trend

### Insights Page
- [ ] Stats cards display correctly
- [ ] Goals section shows daily + weekly targets
- [ ] Progress bars fill to correct percentage
- [ ] Status colors match progress (green/amber/red)
- [ ] Streak badge shows only when streak > 0
- [ ] Circular gauge shows daily completion %
- [ ] Collapse/expand toggle works
- [ ] Edit modal opens and saves target value
- [ ] Weekly consistency chart renders
- [ ] Typical day chart renders with stacked bars
- [ ] No Activity Breakdown or Sleep Trends charts present

---

**Generated:** 2026-04-26
**Framework:** React 18 + TypeScript + Tailwind CSS + Recharts
