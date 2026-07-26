# Typical Day — Algorithm & Visualization Redesign

## Context

**Project:** DeskFlow — Electron/React/TypeScript desktop productivity tracker  
**Page:** `/insights` — InsightsPage.tsx  
**Component:** "Typical Day" section (horizontal 24-cell row)  
**Data Source:** `external_sessions` + `external_activities` tables (SQLite)  
**Current IPC:** `get-typical-day` handler at `src/main.ts:6394-6421`  
**Current Frontend:** `src/pages/InsightsPage.tsx:247-337`

### Current Implementation Summary

The backend queries all external sessions from the last 30 days, buckets them by hour (0–23), sums `duration_seconds` per activity per hour, then picks the **single dominant activity** per hour. The frontend displays a single horizontal row of 24 tiny boxes (30×30px) with 4 discrete opacity levels of emerald green.

### What's Broken

1. **Data masking** — Only the top activity per hour shows. If you Sleep 40min and Study 20min in the same hour across the month, secondary activities are invisible.
2. **No device data** — Only `external_sessions` is queried. All device-tracked app usage (VS Code, Chrome, Terminal) is excluded. If you code all day but don't log external sessions, every hour says "none".
3. **No per-day normalization** — Raw total seconds across 30 days means hours with more data points appear inflated vs hours with fewer.
4. **Crude color scale** — 4 discrete thresholds (`>0.75`, `>0.5`, `>0.25`, `>0`). A single outlier hour skews `typicalMaxSeconds` making most cells faint.
5. **Poor layout** — 24 cells in one row makes it impossible to spot day-of-week patterns (weekend sleep-in, Monday morning coding, etc.).

---

## The Mandate

You are the **Lead Designer and Engineer**. Design a comprehensive, single solution for the "Typical Day" feature that fixes the data processing pipeline AND the visual display. Do not present options. Deliver one complete, well-reasoned design.

---

## Requirements

### 1. Data Processing Pipeline (Engineering)

Design a **new algorithm** that replaces `get-typical-day` in `src/main.ts:6394-6421`. The pipeline must:

- **Merge both data sources:**
  - `external_sessions` (user-tracked activities: Sleep, Study, Exercise, etc.)
  - `allLogs` (device-tracked app usage: VS Code, Chrome, Terminal, etc.)
  - Combine them into a unified per-hour activity map

- **Handle the multi-activity problem:**
  - An hour bucket should show ALL activities that occurred, not just the dominant one
  - Use a threshold or weighted system (e.g., show any activity accounting for >15% of the hour)

- **Normalize by day count:**
  - Divide raw totals by number of days in range (e.g., 30 days → average seconds per day)
  - This makes hours comparable regardless of how many days had data

- **Consider smoothing:**
  - Rolling average across adjacent hours to reduce noise
  - Or cluster hours into meaningful blocks (e.g., "Morning: 6-12", "Afternoon: 12-18", "Evening: 18-24", "Night: 0-6")

- **Caching:**
  - The 30-day aggregation is expensive; design a cache keyed by `days` parameter
  - Invalidate when new sessions are added

### 2. Visual Specification (Design)

Design the **high-fidelity visual layout** for the Typical Day section. Specify:

- **Layout type:** Is it a 24×7 heatmap grid? A circular 24-hour clock? A stacked horizontal bar per hour? A timeline river? Pick ONE and justify.
- **Exact dimensions:** Cell sizes, gaps, spacing, padding, container width/height
- **Color system:**
  - Define exact hex codes for each intensity level
  - Multi-activity cells should use some form of stacked or blended coloring
  - Dark theme compatible (current background: `#0a0a0f`)
  - Accessibility: maintain 4.5:1 contrast ratio
- **Typography:** Font sizes for hour labels, activity names, duration text
- **Activity icons/colors:** How to visually distinguish Sleep vs Code vs Study vs Exercise
- **Legend:** Position and design of the color legend
- **Empty states:** What does "no data" look like? (Currently shows gray cells with "none")
- **Animation:** Entrance animation, hover transitions, click feedback

### 3. Interaction Flow (UX)

Design the **complete interaction model**:

- **Hover:**
  - What shows on hover? Per-activity breakdown? Aggregated stats?
  - Positioning of the tooltip/detail panel
- **Click:**
  - Click on an hour cell → what happens?
  - Click on a day label → should it navigate to day detail?
- **Period selector integration:**
  - Currently the page has a "This Week / This Month" selector at top. How should the Typical Day respond?
  - 30-day aggregation is currently hardcoded — should it follow the period selector?
- **Quick-jump / navigation:**
  - Currently there are top-8 active hour quick-jump buttons. Keep? Replace?
- **Scroll behavior:**
  - If using a 24×7 grid, how does it scroll on various screen sizes?

### 4. Constraints

- Must work with existing IPC endpoints (can add new ones, but don't remove existing)
- Must remain in `src/pages/InsightsPage.tsx` (no new page)
- Backend logic stays in `src/main.ts` (new IPC handler or replace `get-typical-day`)
- Dark theme only (current `#0a0a0f` background)
- Tailwind CSS v4 (`@import "tailwindcss"`)
- Must not break existing dashboard/heatmap features
- Use existing activity colors from `ACTIVITY_GRADIENTS` in `InsightsPage.tsx`
- Build must pass (`npm run build`)
- Performant: 24×7 grid rendering should not lag on re-render
- Reuse `formatHours()` and `hourLabels` utilities where possible

---

## Deliverable

Write your solution to:
- `src/pages/InsightsPage.tsx` — Frontend rewrite of the Typical Day section
- `src/main.ts` — New/updated IPC handler for the data pipeline
- Include the algorithm explanation as comments or inline docs

**Do not touch:**
- `src/preload.ts` (unless adding a new IPC endpoint)
- `src/App.tsx` (no routing/page changes)
- Any other pages or components
