# Database Page — Analytics Dashboard Design

## Raw Request

> "the data page doesnt have any data at all. THERES NO CHARTS THERES NO NOTHING. ONLY SIMPLE LINE STUFF IDK. ITS SUPPOSED TO BE DETAIL IDIOT. SHOWING EACH MODE, AND OTHER THIGNS, AND LIKE THE E SESSIONS< the TIME GAP BETWEE NRESPONSE AND SENDING THE PROMPT AGAIN, THE AMOUNT OF REQUEST/ PROBLEMS COMPLETED ON THE TIME FRAME, AND MANY MORE. use the generate promtp skill to get more ideas on whta to put. maybe somthing related to cost, tokens per request for example, or anything else."

## Problem Statement

The Database page is currently a raw SQLite table browser — it shows 31 tables and lets users browse rows, but provides zero insights or visualizations. The data exists but is unprocessed and poorly showcased. The user wants a comprehensive analytics dashboard that surfaces meaningful metrics through charts and stat cards.

## Context

Read `agent/docs/database-analytics-revamp/CONTEXT_BUNDLE.md` for:
- The current DatabasePage.tsx implementation
- All available IPC data sources with response shapes
- Chart.js setup and patterns used across the app
- Design tokens and glass card patterns
- The user's exact raw request

## The Mandate

Design a comprehensive analytics dashboard for the Database page. You are the Lead Designer and Engineer — own the entire solution from data-processing logic to pixel-level visuals.

### Engineering Task

Design the data processing pipeline for each chart/metric:

1. **Session Timing** — Compute response gap between user prompt and assistant response from `terminal_messages`. For each session, find sequential user→assistant message pairs, compute the time difference in seconds. Show distribution or average per session.

2. **Problems & Requests Completion** — From `getProblems()` and `getRequests()`, count items completed (status = 'Fixed'/'Completed') within the selected time frame. Compare against total created.

3. **Token & Cost Analytics** — From `getAIUsageSummary()` and `getTerminalSessions()`, show tokens per tool, cost per tool, tokens per session, cost per request. Aggregate by time period.

4. **Mode Breakdown** — From `getAppStats()` or `getDailyStats()`, group tracked time by `category` column to show which tracking modes (IDE, browser, communication, etc.) are used most.

5. **Daily Trend** — From `getDailyStats()`, aggregate `total_sec` per day, convert to hours, show as a time-series bar chart.

6. **Agent Distribution** — From `getTerminalSessions()`, group by `agent` column to show which AI agents are used most.

7. **Category Distribution** — From `getAppStats()`, group `total_ms` by `category` for a breakdown of time by activity type.

8. **Stat Cards** — Compute summary numbers: total tokens, total cost, total sessions (active count), total problems (open count), total requests (open count).

### Design Task

Design the visual layout with exact specifications:

1. **View Toggle** — "Analytics" / "Tables" toggle at the top using existing tab button pattern (`bg-zinc-900 rounded-xl p-1 w-fit border border-zinc-800`). Analytics is the default view.

2. **Header** — Keep existing Database icon + title + table count. Add a period selector (7 Days / 30 Days / All Time) and Refresh button.

3. **Stat Cards Row** — 5 glass cards in a row showing: Total Tokens, Total Cost ($), Session Count (with active count), Problem Count (with open count), Request Count (with open count). Each card has a colored icon in a rounded container, the value in large semibold text, and the label in small text below.

4. **Charts Grid** — 2-column grid of glass cards, each containing:
   - A title with an icon
   - A subtitle/description
   - A chart (Pie, Doughnut, or Bar as appropriate)
   - Empty state when no data

5. **Chart Types:**
   - Token Distribution by Tool → Pie chart
   - Cost Distribution by Tool → Doughnut chart
   - Sessions by Agent → Pie chart (or Doughnut)
   - Session Status Distribution → Doughnut chart
   - Activity by Category → Doughnut chart
   - Problems by Status → Pie chart
   - Daily Activity Trend → Full-width Bar chart (spans 2 columns)

6. **AI Usage Summary Card** — A full-width card below the charts with 4 sub-cards showing: total tokens, total cost, tools used count, session count.

7. **Colors** — Use the app's dark zinc palette. Chart colors: purple (tokens/data), amber (cost), emerald (success/active), blue (info), rose (problems), cyan (sessions).

### UX Task

Design the interaction flow:

1. **Period Selector** — Clicking 7D / 30D / All Time triggers a data refetch for all charts. Active period is highlighted.

2. **Refresh Button** — Manual refresh with loading spinner. Disabled while loading.

3. **Loading State** — Show a centered spinner with "Loading analytics..." text while data fetches.

4. **Empty State** — Each chart card shows "No X data" centered in the chart area when the corresponding data source returns no results.

5. **Error Handling** — The fetch uses Promise.allSettled to handle individual endpoint failures gracefully. Failed endpoints show empty state for that card.

6. **Default View** — Analytics is the default view when the user navigates to the Database page.

### Constraints

- Do NOT modify `src/main.ts`, `src/preload.ts`, or any Electron backend code
- Use only existing IPC endpoints (listed in CONTEXT_BUNDLE.md)
- Use `chart.js` ^4.5.1 and `react-chartjs-2` ^5.3.1 (already installed)
- Use the `glass rounded-2xl p-4` card pattern
- Follow the existing import patterns from StatsPage.tsx
- Keep existing Tables view functionality unchanged behind the toggle
- Build must pass (`npm run build`)
- All data fetching and aggregation happens in the frontend via existing IPC
