# Insights & Charts Overhaul Plan

## Summary of Changes Needed

Changes span 5 files across the app. Here's the complete plan:

---

## 1. `src/pages/InsightsPage.tsx` — Rethink/Rebuild

### What's wrong:
- "Weekly Consistency" chart = hours/week line chart. User's mental model: consistency = **schedule regularity**, not total hours.
- "Day of Week Performance" = day-of-week bar chart. Shows hours but unclear what it means.
- No **core tracking data** at all: no most-used apps, no projects, no browser usage, no activity type breakdown. Everything is external-only.

### Plan:
| Section | What | How |
|---------|------|-----|
| **Consistency (KPI)** | Replace weekly comparison line chart with: **"Schedule Consistency"** = % of days in current week that match the typical day pattern (same hours active, same activities). A scatter of each day's activity profile distance from the 30-day rolling average. Lower distance = more consistent. | Compute from `typicalDay` data: cosine similarity between each day's hourly vector and the 30-day average. Display as a % score per day with a 7-day rolling avg line. |
| **Day Performance** | Replace with **"Day Score Radar"**: 7-spoke radar showing a *composite* per day (not just hours). Composite = productivity ratio × active hours × consistency weight. So Mon might be "85%", Tue "72%", etc. | Use `bestDays.averages` + compute productivity ratio from app category data. |
| **New: Top Projects** | List of most-used IDE projects (from IDE page data) | Fetch via `window.deskflowAPI.getIDEProjectStats()` if available. |
| **New: Most/Least Used Apps** | Top 5 apps by time + bottom 5 (with usage > 0). Bar chart like the "Activity Breakdown" but for tracked apps. | Use `appStats` prop passed from parent (already available). |
| **New: Browser Profile** | Pie chart showing browser category distribution + top 5 domains. | Use `browserStats` prop (already passed in parent). |
| **New: Activity Type Distribution** | Tiers pie (productivity/neutral/distracting) like Productivity page but styled in insight theme. | Use existing tier computation from app/browser data. |
| **New: Time Type Split** | Bar chart showing "Device Time" vs "External Time" per day/week. | Combine tracked logs + external sessions. |

### Changes needed:
The `InsightsPage` currently only loads external data. It needs to accept `appStats`, `browserStats`, `logs`, `browserLogs`, `tierAssignments` props (these are already available in `App.tsx` routing). Route `/reports` in `App.tsx` already passes these. Need to check and wire up.

---

## 2. `src/pages/ExternalPage.tsx` — Sleep & Charts

### A. Past Sleep Modal — Match Auto-Popup Style
The "Add Past Sleep" modal (line 1965) must visually and behaviorally match the auto "Sleep Detection" popup in `App.tsx` (line 2400):

| Element | Auto Popup (`App.tsx`) | Past Sleep (`ExternalPage.tsx`) | Fix |
|---------|----------------------|-------------------------------|-----|
| Layout | Grid: bedtime + waketime side-by-side | Stacked: bedtime then waketime | Change to grid layout |
| Background | `bg-zinc-900 border border-zinc-700/50 rounded-2xl p-8` | `bg-zinc-900 rounded-2xl p-8` | Add border + backdrop-blur |
| Labels | "Bedtime" / "Wake time" (text-xs) | "Bedtime (last night)" / "Wake time (this morning)" (text-sm text-center) | Match auto-popup label style |
| DurationPicker labels | Hr/Min | Hour/Min | Match auto-popup |
| Latency | Only "Fell asleep after" LatencyPicker + "Woke up before app" static display | Two LatencyPickers (fell asleep + woke up) | Keep both LatencyPickers (more complete) but style them with the static display styling from auto-popup |
| Confirm button | Gradient green "Confirm Sleep" | Amber "Add Sleep" | Use gradient emerald style |
| Cancel button | "Skip" | "Cancel" | Match styling |

### B. Add Sleep Detail View
Currently there's nowhere to see each sleep session individually.

**Option**: Add a "Sleep History" section to ExternalPage (or a new tab section) that shows:
- Daily sleep table with: date, bedtime, waketime, duration, deficit, latency
- Filterable by period (using the same period selector)
- Expandable rows showing more detail

Or add it as a section under the "Sleep & Recovery" chart on Insights Page.

### C. Timeline Navigation on Charts
The ExternalPage trend chart (the `trendChartData` bar chart around line 650) currently shows the CURRENT period only. Need to add `dateOffset`-style navigation:
- Chevron left/right buttons near the period selector
- Recompute `trendChartData` based on offset
- Already have `periodOffset` state for the activity detail view — reuse same mechanism

---

## 3. `src/pages/ProductivityPage.tsx` — Add Timeline Navigation

### What's wrong:
- No way to see previous days/weeks data. The `dailyTrend` always shows current period only.
- Props don't include `dateOffset`.

### Plan:
- Accept `dateOffset` prop or manage internal state (like `StatsPage` does)
- Add chevron navigation in the header
- Pass `dateOffset` to `dailyTrend` computation (filter logs accordingly)
- The data is computed from `logs` and `browserLogs` props — just need to filter by adjusted date range

Actually, looking more carefully: `ProductivityPage` receives `logs` and `browserLogs` as props. The filtering is done client-side in `dailyTrend` useMemo. We just need to:
1. Add a `dateOffset` state
2. Adjust the date range in `dailyTrend` computation
3. Add chevron navigation UI

---

## 4. Pie Chart Colors — Unify

### Current problems:
| Page | Pie location | Color scheme |
|------|-------------|-------------|
| StatsPage (Applications) | `pieData` line 220 | `hsl((i*137.5)%360, 65%, 55%)` — rainbow |
| BrowserActivityPage | `categoryChartData` line 341 | `CATEGORY_COLORS` — category-specific colors (good) |
| ProductivityPage | `distributionData` line 601 | Hardcoded rgba green/blue/red (OK for 3 items) |

### Plan:
- **StatsPage pie**: Use categorical colors from `CATEGORY_COLORS` (mapped via `app.category`), fallback to a stable palette matching insight page style (emerald-500, indigo-500, amber-500, etc. with 60% opacity)
- **BrowserActivityPage**: Already good with `CATEGORY_COLORS` — adjust saturation to match insight page style (use `'88` opacity suffix)
- **ProductivityPage**: Already fine for 3 items

All tooltips/legends should match the InsightPage pattern:
- Tooltip: `bg-zinc-900 border border-zinc-700 rounded-lg p-3`
- Legend: `text-zinc-400` with `usePointStyle: true`

---

## 5. Chart Styling Unification

### Insight page chart style (the "good" look):
- Background: `bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-5`
- Title: `text-sm font-semibold text-zinc-200`
- Tooltip: `backgroundColor: '#18181b', borderColor: '#3f3f46', borderWidth: 1, padding: 10, cornerRadius: 8`
- X-axis grid: `{ color: '#27272a' }`
- Y-axis grid: `{ color: '#27272a' }`
- Ticks: `color: '#71717a', font: { size: 10 }`

### Pages to update:
- **ExternalPage**: The bar chart `trendChartData` uses basic options. Apply Insight-style tooltip, grid, and tick styling.
- **StatsPage**: Charts already well-styled. Just fix pie colors.
- **BrowserActivityPage**: Charts already well-styled. Just fix pie colors if needed.
- **ProductivityPage**: Charts well-styled. Just add timeline nav.

---

## 6. `src/App.tsx` — Wire Props

InsightsPage currently doesn't receive app/browser data. Need to:
- Pass `appStats`, `browserStats`, `logs`, `browserLogs`, `tierAssignments` to the InsightsPage route
- These are all available in App.tsx state

---

## Implementation Priority Order

| Priority | Task | Files | Complexity |
|----------|------|-------|-----------|
| P1 | Past sleep modal UI match | `ExternalPage.tsx` | Low |
| P1 | Wire app/browser data to InsightsPage | `App.tsx`, `InsightsPage.tsx` | Medium |
| P1 | Add core tracking data sections to Insights | `InsightsPage.tsx` | High |
| P2 | Redesign Consistency chart (schedule matching) | `InsightsPage.tsx` | High |
| P2 | Redesign Day Performance chart (composite score) | `InsightsPage.tsx` | Medium |
| P2 | Add timeline nav to Productivity page | `ProductivityPage.tsx` | Low |
| P2 | Add timeline nav to External page charts | `ExternalPage.tsx` | Medium |
| P3 | Sleep detail view | `ExternalPage.tsx` or `InsightsPage.tsx` | Medium |
| P3 | Fix pie chart colors across pages | `StatsPage.tsx`, `BrowserActivityPage.tsx` | Low |
| P3 | Unify chart styling across all pages | Multiple | Medium |

---

## Dependencies & Risks

- **IPC endpoints**: Need `window.deskflowAPI.getIDEProjectStats()` for projects section. If not available, skip that section.
- **Props flow**: `InsightsPage` currently has no props. Need to check `App.tsx` routing to confirm props pass-through.
- **Data availability**: Apps/browser stats filter by `selectedPeriod` — this period may differ from Insight's internal `selectedPeriod` ('week' | 'month'). Need to align periods.

---

*Discuss sections before I implement — tell me what you agree/disagree with and I'll refine.*
