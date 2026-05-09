# Design Prompt: Insights Page Complete Overhaul

## Context

You are the **Lead Designer and Engineer** for DeskFlow, an Electron desktop app that tracks app usage and productivity. 

The current Insights page (`/reports`) has a "Typical Day Hourly" chart that the user explicitly called "very ugly" and stated the page "isn't showing any cool or good interesting data in an interesting chart in any form."

## The Problem

**Current State (Broken):**
- "Typical Day (Hourly)" chart is a basic 12-column grid of 24 boxes showing just hour numbers and truncated 4-char activity names
- The visualization is static, non-interactive, and visually unappealing
- No meaningful data processing—just shows the primary activity per hour
- The Insights page fails to showcase the rich data available (sleep patterns, consistency scores, activity distributions, best/worst days)

**Why This Matters:**
- The Insights page is meant to be the "wow" moment where users understand their productivity patterns
- Current visualization doesn't encourage exploration or reveal actionable insights
- Users expect modern, interactive charts like they see in apps like RescueTime, Toggl, or GitHub

## Data Available (IPC Endpoints)

The following data can be fetched via existing IPC handlers in `src/preload.ts`:

| IPC Handler | Returns | Purpose |
|-------------|---------|---------|
| `getTypicalDay(days=30)` | `Array<{ hour: number; primaryActivity: string; totalSeconds: number }>` | Average hourly activity distribution |
| `getConsistencyScore(period)` | `{ score: number; weekly_comparison: Array<{ week: string; total_seconds: number }>; this_week: number; last_week: number; trend: string; streak: number }` | Productivity consistency metrics |
| `getBestDays()` | `{ bestDay: string; worstDay: string; averages: Record<string, number> }` | Best/worst performing days |
| `getSleepTrends(period)` | `{ daily: Array<{ date: string; sleep_seconds: number; deficit_seconds: number }>; average_bedtime: string; average_wake_time: string }` | Sleep pattern data |
| `getExternalStats(period)` | `{ byActivity: Record<string, { total_seconds: number; session_count: number }>; total_seconds: number; sleep_deficit_seconds: number; average_sleep_hours: number }` | Activity breakdown stats |

## The Mandate

**Design a comprehensive, high-fidelity solution for a complete Insights page overhaul that transforms raw productivity data into compelling, interactive visualizations.**

Your solution must include:

### 1. Data Processing Pipeline (Engineering)

Design the exact logic for processing raw data into visualization-ready formats:

- **Typical Day Hourly Redesign**: Current shows just primary activity per hour. Design a stacked bar chart or heatmap that shows:
  - Productivity distribution per hour (productive vs neutral vs rest time)
  - Activity intensity (total seconds mapped to color/height)
  - Smoothing logic: How to handle outliers in the 30-day average?
  - Time buckets: Should hours be grouped (e.g., 9-10am as one bar) or individual?

- **Sleep Pattern Integration**: Combine sleep deficit data with hourly activity:
  - Overlay sleep windows on the typical day chart
  - Show correlation between sleep deficit and productivity scores
  - Calculate "optimal sleep window" based on historical data

- **Best/Worst Day Analysis**: Transform `bestDays` data into:
  - Radar chart showing day-of-week productivity patterns
  - Heatmap showing which hours on which days are most productive
  - Anomaly detection: Flag unusual productivity spikes/drops

### 2. High-Fidelity Visual Specifications (Design)

Provide exact specifications for each chart component:

**Typical Day Hourly Chart (The Priority Fix):**
- **Chart Type**: Choose the BEST option (stacked bar / area chart / heatmap / circular clock / polar chart)
- **Color Palette**: Exact hex codes that fit DeskFlow's dark theme (`bg-zinc-900`, `bg-zinc-800/50`)
  - Productive time: `#
  - Neutral time: `#
  - Rest/Sleep time: `#
  - Accent for current hour: `#
- **Dimensions**: 
  - Chart container height: `___px`
  - Bar width / gap ratio: `___`
  - Font sizes: labels `___px`, tooltips `___px`
- **Animations**: 
  - Entry animation: `___` (e.g., bars rise from 0 over 800ms ease-out)
  - Hover animation: `___` (e.g., bar glow, tooltip fade)
  - Transition between periods: `___`

**Additional Charts to Design:**
- **Productivity Radar** (day-of-week pattern): Polar chart specifications
- **Sleep vs Productivity Scatter**: Correlation plot with trend line
- **Streak Calendar**: GitHub-style contribution graph for consistency streaks
- **Stats Cards Row**: Redesign with micro-trend sparks (tiny sparkline in each card)

### 3. Interaction Flow (UX)

Define exactly what happens on user interactions:

**Typical Day Chart Interactions:**
- **Hover on bar segment**: Show tooltip with:
  - Time range (e.g., "9:00 AM - 10:00 AM")
  - Activity breakdown (e.g., "Coding: 45m, Meetings: 15m")
  - Productivity score for that hour
  - Comparison to weekly average (e.g., "+12% vs avg")
- **Click on bar**: `___` (e.g., drill down to that hour's sessions, or filter other charts to that hour)
- **Brush/Select range**: `___` (e.g., select 9am-5pm to see work-day summary)

**Cross-Chart Filtering:**
- Clicking a day on the Radar chart → filters Typical Day to that day's pattern
- Selecting a date range on Streak Calendar → updates all charts to that period
- Clicking a sleep deficit bar → highlights corresponding hours in Typical Day chart

**Empty States & Loading:**
- Skeleton loading state: `___` (describe animation)
- No data state: `___` (illustration or message)

### 4. Component Architecture (Implementation)

Design the React component structure:

```
InsightsPage.tsx
├── Header with period selector (week/month)
├── StatsCardsRow (redesigned with sparklines)
├── TypicalDaySection (THE PRIORITY - full width or 2/3 width)
│   ├── Chart type toggle (if multiple visualizations designed)
│   ├── Main chart (stacked bar / heatmap / polar)
│   ├── Hour detail panel (slides in on click)
│   └── Legend with interactive toggle
├── SideCol (1/3 width or second column)
│   ├── SleepPatternCard (mini chart showing sleep vs productivity)
│   ├── BestWorstDayCard (radar or bar showing day patterns)
│   └── StreakCalendar (GitHub-style grid)
└── Modals/Overlays
    └── HourDetailModal (full session list for clicked hour)
```

## Constraints (Hard Limits)

1. **Must use existing tech stack**: Chart.js or Recharts (already in package.json), Tailwind CSS 4.x, Framer Motion for animations
2. **Must use existing IPC endpoints**: Do NOT create new database queries—work with `getTypicalDay`, `getBestDays`, `getConsistencyScore`, `getSleepTrends`, `getExternalStats`
3. **Dark theme only**: Must match `bg-zinc-900`, `text-zinc-100`, `border-zinc-800` design system
4. **Responsive**: Must work in both full-width and sidebar-collapsed layouts
5. **Performance**: Typical Day chart must render in <200ms with 30 days of hourly data (720 data points)

## Requirement Checklist

Your response MUST include:

- [ ] **Data Processing Logic**: Exact JavaScript/TypeScript functions for aggregating hourly data, calculating productivity scores, smoothing outliers
- [ ] **Chart Specifications**: Exact chart type, props, colors, dimensions for Typical Day (and optionally 1-2 supplementary charts)
- [ ] **Interaction Design**: What happens on hover/click/drag for each chart element
- [ ] **Animation Specs**: Framer Motion variants or CSS transitions with exact durations/easings
- [ ] **Component Code**: Working React component code for the new Typical Day chart (can be in same file or separate component)
- [ ] **Styling**: Tailwind classes for all elements, hover states, active states

## Output Format

Provide a complete, implementation-ready solution. Your response should be structured as:

1. **Executive Summary**: One paragraph describing your chosen approach
2. **Data Processing Pipeline**: Code snippets for data transformation
3. **Visual Design Specs**: Exact specifications for the Typical Day chart
4. **Component Implementation**: Full React component code
5. **Interaction & Animation**: Framer Motion variants or event handlers

**DO NOT provide multiple options (Option A / Option B / Option C). Provide ONE comprehensive, well-reasoned solution.**

---

**Current File to Replace:** `src/pages/InsightsPage.tsx` (240 lines, current Typical Day chart at lines 218-235)
