# DeskFlow Page Redesign — Implementation Plan

## Overview
Redesign of the **External** (`/external`) and **Insights** (`/reports`) pages for DeskFlow, a desktop activity tracking application.

---

## Phase 1: External Page (`/external`)

### 1.1 Always-Visible Timer Section
**Problem:** Currently no timer is visible until an activity is selected.  
**Solution:** Add a persistent timer panel at the top of the page that:
- Displays a large stopwatch (monospace, 5xl) even when idle
- Shows "Select activity to track" prompt when no activity is active
- Allows activity selection directly from the timer view via a dropdown/quick-select
- Displays the currently running activity name and elapsed time

### 1.2 Activity Detail View
**Problem:** Clicking an activity only shows basic stats (Today/Week/Month) with no charts.  
**Solution:** Expand the detail panel to include:
- Historical data visualization for the selected activity
- Trend line (line chart) showing activity duration over the last 30 days
- Bar chart showing hours per day for the last 7 days
- Calendar heatmap showing activity frequency (GitHub-style)
- All charts are activity-specific and update when a different activity is selected

### 1.3 Per-Activity Chart Customization
**Problem:** All activities show the same stat cards regardless of data type.  
**Solution:** Allow each activity to have a preferred chart type:
- `none` — Stats only (default for check-in activities)
- `bar` — Hours per day (last 7 days)
- `line` — Trend over time (last 30 days)
- `calendar` — Activity frequency heatmap
- Preference stored per-activity in the database
- UI toggle in the activity detail view to switch chart types

### 1.4 Component Breakdown
| Component | Purpose |
|-----------|---------|
| `TimerSection` | Persistent stopwatch display + activity selector |
| `ActivityGrid` | 8 activity cards with color-coded borders |
| `ActivityDetailPanel` | Split view: timer + stats + chart |
| `ActivityChart` | Renders the correct chart based on activity preference |
| `ChartCustomizer` | Dropdown to set chart type per activity |
| `ActivityStatCards` | Today / Week / Month duration cards |

---

## Phase 2: Insights Page (`/reports`)

### 2.1 Remove Duplicated Charts
**Action:** Delete the following from Insights:
- Activity Breakdown horizontal bar chart (moved to External)
- Sleep Trends line chart (moved to External)

### 2.2 Add Goals & Targets Section (Option A)
**New Features:**
- **Daily Target:** Configurable hours (default 8h) with progress bar
- **Weekly Target:** Configurable hours (default 40h) with progress bar
- **Goal Streak:** Consecutive days meeting daily target with flame indicator
- **Visual Gauge:** Circular progress meter for daily completion
- **Status Colors:** Green (on track), Amber (behind), Red (significantly behind)

### 2.3 Keep Existing Unique Charts
- Weekly Consistency chart
- Typical Day chart
- Stats cards (Total Time, Consistency %, Streak, Best Day, Sleep Deficit)

### 2.4 Component Breakdown
| Component | Purpose |
|-----------|---------|
| `StatsCards` | Retained existing stat cards row |
| `GoalsSection` | Daily/weekly targets with progress bars |
| `GoalStreak` | Streak counter with flame emoji |
| `CircularGauge` | Visual daily completion meter |
| `WeeklyConsistencyChart` | Retained existing chart |
| `TypicalDayChart` | Retained existing chart |

---

## Phase 3: Design System Compliance

### Colors
- Background: `bg-zinc-900` (#18181b)
- Cards: `bg-zinc-800/50` (#27272a with opacity)
- Primary: `emerald-500` (#10b981)
- Secondary: `amber-500` (#f59e0b)
- Accent: `violet-500` (#8b5cf6)
- Text: `zinc-100` (#f4f4f5)
- Muted: `zinc-400` (#a1a1aa)

### Typography
- Timer: `font-mono text-5xl`
- Stats: `text-2xl font-bold`
- Card titles: `text-lg font-semibold`

### Spacing
- Cards: `rounded-xl p-4`
- Buttons: `rounded-lg px-4 py-2`
- Grid gap: `gap-4`

---

## Phase 4: Data Flow & State Management

### External Page State
```
activeActivityId: string | null
isRunning: boolean
elapsedTime: number
activityChartPrefs: Record<activityId, ChartType>
```

### Insights Page State
```
dailyTarget: number (hours)
weeklyTarget: number (hours)
currentDayHours: number
currentWeekHours: number
streakCount: number
```

---

## Phase 5: File Structure
```
/src
  /pages
    ExternalPage.tsx
    InsightsPage.tsx
  /components
    /external
      TimerSection.tsx
      ActivityGrid.tsx
      ActivityDetailPanel.tsx
      ActivityChart.tsx
      ChartCustomizer.tsx
    /insights
      GoalsSection.tsx
      GoalStreak.tsx
      CircularGauge.tsx
  /types
    index.ts
  /data
    demoData.ts
```

---

## Deliverables Checklist

### External Page
- [x] Always-visible timer section
- [x] Activity detail view with historical chart
- [x] Per-activity chart customization UI
- [x] Dark theme compliance
- [x] Activity color consistency

### Insights Page
- [x] Duplicated charts removed
- [x] Goals & Targets section added
- [x] Progress bars for daily/weekly targets
- [x] Streak counter with visual indicator
- [x] Circular gauge for daily completion
- [x] Status color coding (green/amber/red)

---

**Planned:** 2026-04-26  
**Status:** Ready for implementation
