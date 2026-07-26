# Prompt: Fix IDEProjectsPage AI Tab Time Period System

## Raw Request

> the time selection for the popup of each ai coding agent provider doesnt exist. Time selection on the visualisation and the ones for the charts... the same toggle switch. but it just doesnt work. WHERES THE ALL TIME LOCK?? it still in the scope of that one ai provider even tough the timeline has already changed to the all time. it still uses the scope of the 7 day or whatever the previous sleeciton timeline is. the whole page is a mess, please just handle the timeline a bit and improve ux for efficiency and loading behavior. its buggy and the most broken thing on the whole page

## Context

**System:** DeskFlow — Electron + React + better-sqlite3 desktop productivity tracker
**Two-AI relay:** You (Architect) write patches. opencode applies them, builds, and verifies.
**File:** `src/pages/IDEProjectsPage.tsx` (5636 lines) — the ONLY frontend file that needs changes.

**Read FIRST:** `agent/docs/ai-tab-time-period-fix/CONTEXT_BUNDLE.md` — contains all relevant source code, data flow, IPC endpoints, and design tokens. This prompt references line numbers in that bundle (not the real file).

## Problem Statement

The AI usage tab in IDEProjectsPage has a time period system that is broken and confusing:

1. **Provider detail modal has no period controls.** When the user clicks an AI agent card, a modal opens showing metrics and charts. It uses the global `effectiveAiPeriod` with NO way to change the time scope INSIDE the modal. The user wants to see 7-day, 30-day, and all-time data PER AGENT independently.

2. **The lock-to-all-time toggle is hard to find.** It's a small `Lock All` button buried among chart-mode toggles. Users don't see it.

3. **Two IIFE computations use `'all': 9999` (no cap).** Lines 4203 and 4657 in the CONTEXT_BUNDLE use `daysMap = { 'week': 7, 'month': 30, 'all': 9999 }` with NO `Math.min(180, ...)` cap. When data has 365+ days of daily records, the synchronous iteration in the render function freezes the UI for seconds.

4. **Data may not visibly refresh when period changes.** The `timeLock` toggle → `effectiveAiPeriod` change → re-fetch → re-render path works in theory, but the freeze from step 3 + the lack of loading/transition state makes it appear broken.

5. **All three other IIFE chart sections** (Daily Usage, Model Usage Timeline, Compare Chart) have the 180-cap pattern already implemented correctly, but the Top Metrics and Model Breakdown sections were missed.

## The Mandate

**Design a comprehensive solution** to fix all the problems above. Your design must cover data processing, visual/UX, and interaction flow. Do NOT propose options — design the single best solution.

### Engineering Task — Data Processing Pipeline

1. **Replace the two `9999` caps** (Top Metrics line 4203, Model Breakdown line 4657) with the same `Math.min(180, Math.max(span, 60))` pattern already used in the Daily Usage chart. The pattern scans all available dates for that specific agent, computes the actual date span, adds 30-day padding, and caps at 180.

2. **Extract the `numDays` / `cutoff` computation** into a shared helper or useMemo to avoid duplicated logic across 5 locations. The computation logic is:
   - If `period === 'week'` → numDays = 7
   - If `period === 'month'` → numDays = 30
   - If `period === 'all'` → scan all dates across the agent's daily records, compute span + 30, cap at 180, floor at 60
   - cutoff = `subDays(new Date(), numDays - 1)`

3. **Add a `detailPeriod` state** in the provider detail modal that lets it override `effectiveAiPeriod` locally. The state should accept `'week' | 'month' | 'all'` and default to the current `effectiveAiPeriod`. When `detailPeriod` is set, all modal computations use it instead of `effectiveAiPeriod`.

4. **Ensure `loadOverview` and `fetchAnalytics` re-fetch** when the detail modal's period changes (if it differs from the global period).

### Design Task — Visual Specs

1. **Period selector in the modal header:** Add a row of 3 pill buttons ("7 Days", "30 Days", "All Time") between the agent header and the metrics grid. Use the existing `SubTabBar` pattern (rounded-full chip pills) with:
   - Active: `bg-indigo-500/20 border border-indigo-500/40 text-indigo-300`
   - Inactive: `bg-zinc-800/50 text-zinc-400 hover:text-white`
   - Size: `px-3 py-1.5 text-xs font-medium`

2. **Lock button redesign:** Move the lock button OUT of the chart-mode toggle row. Place it at the top-right of the AI tab header section, next to the period label. Use a more prominent style:
   - When locked: `bg-indigo-500/20 border border-indigo-500/40 text-indigo-300` with `Lock` icon + "All Time"
   - When unlocked: `bg-zinc-800/50 text-zinc-400` with `Unlock` icon + "Lock All Time"
   - Give it a `tooltip` explaining: "Lock the entire AI tab to show All Time data, ignoring the navigation period selector"

3. **Loading overlay in the modal:** When data is being fetched (data is stale or loading state is active), show a subtle spinner/skeleton overlay over the metrics and charts rather than stale/empty data.

4. **Period label consistency:** The period label next to metrics should use `effectiveAiPeriod` (or `detailPeriod` in the modal) consistently. Currently the label logic is copy-pasted in 4 places with inline ternaries — extract it to a helper.

### UX Task — Interaction Flow

1. **Opening the modal:** When the user clicks an agent card, the modal should show the current global period by default. The user can then change the period inside the modal without affecting the global view.

2. **Changing period in the modal:** Clicking "7 Days" / "30 Days" / "All Time" in the modal immediately recalculates all metrics and charts for that agent within the new scope. A brief loading indicator should appear if data needs refetching.

3. **Closing the modal:** When the modal closes, the local `detailPeriod` resets to null so the next open uses the global period again.

4. **Lock toggle feedback:** Toggling the lock should immediately update the period label and trigger a data fetch. A brief loading shimmer in the chart area signals the transition.

5. **Empty state:** If an agent has zero data for the selected period, show a clear "No usage data for this period" message instead of zeroes or blank charts.

### Constraints

- All changes stay within `src/pages/IDEProjectsPage.tsx` — no new files, no IPC changes, no backend changes
- Use existing imports only (the file already imports `motion`, `AnimatePresence`, all lucide icons, `format`/`subDays`/`eachDayOfInterval` from date-fns, React hooks)
- The modal is rendered via `AnimatePresence` with `selectedAgentDetail` — do NOT change the modal's animation or overlay structure
- All charts use `react-chartjs-2` `Bar` component — do not change chart libraries
- The `FreeUsageStats` component at line 4289 receives `{ agent, dailyUsage, formatTokens }` — do not change its interface
- Preserve the 180-day hard cap on ALL numDays computations — never allow unbounded iteration
- localStorage key for the lock is `ide-projects-ai-lock` — maintain backward compatibility

---

**Output:** Write the patched `src/pages/IDEProjectsPage.tsx` file (or a diff) as a Fix Packet ZIP. Include a summary of changes in a RESULT.md.
