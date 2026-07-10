# Dashboard Redesign — Architect Prompt

## Raw Request (verbatim user words)

> "what happened to the stopwatch?? why is the width like that? is there supposed to be something on the right of the stopwatch? why is the total focus beneath it? it looks super weird"
>
> "the deep focus on the dashboard also looks really bad. i need you to use the generate prompt skill to redesign everything now that we got the deep focus session thing too. we need to severely improve the dashboard."
>
> "make sure to tell it to use all the frontend skills. and i need you to use all the mcp that is related to design."

## Problem Statement

The DeskFlow dashboard is a 3375-line god component with 43 `useState`, 34 `useEffect`, and 7 `setInterval`s. It has no visual hierarchy — sections are stacked vertically with equal weight, making it impossible to glance and understand what matters. Deep Focus (a timer+overlay productivity system with 100% real backend) is tacked on alone in a grid at the bottom. The hero stopwatch spans 2/3 of the page for no reason. The summary strip ("At a Glance") has no sparklines, no trends, and no real module data story.

The user wants a complete, professional-grade redesign that gives every section purpose, integrates Deep Focus as a first-class citizen, and makes the dashboard answer "what should I know and do right now?" in one glance.

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` in this same directory. It contains:
- Full source code of every affected component (DashboardPage hero, FocusSessionCard, SummaryCard, FunFactHero, GoalRing, GlassCard)
- All IPC endpoint shapes and return types
- Deep Focus DB schema + FocusManager source + preload bindings
- getHomeSummary handler (single round-trip for summary strip data)
- Complete design token specification (colors, spacing, typography, animation)
- Doc 08 existing design spec (what's implemented vs pending)
- ALL mandatory design skills + ALL MCP servers with specific component lists

**You must read CONTEXT_BUNDLE.md before designing.** It is your only codebase reference.

---

## Architecture Context & Constraints

### Critical constraint — NO full rewrite
The Architect MUST NOT propose a full rewrite of DashboardPage.tsx. It is 3375 lines with complex state management, timer logic, and integration with App.tsx (timerState props, activityFeed, externalActivities, etc.). The approach MUST be:
1. **Keep the component as-is** but refactor it into a **layout orchestrator** that imports smaller, focused sub-components
2. **Extract sections into separate components** where the redesign calls for new behavior
3. **Preserve all existing props, state, and event handlers** — the parent contract with App.tsx cannot change

### No backend changes
All backend (IPC, DB, services, main.ts, preload.ts) is already complete for the features in scope. The Architect MUST NOT propose new IPC channels, DB migrations, or backend endpoints. The only exception is if the existing `getHomeSummary` return type needs extension (adding one or two computed fields from `daily_rollup` that already exist in the table).

### Technical stack (no changes allowed)
- React 18 + TypeScript + Vite
- Tailwind CSS (utility classes only, no CSS modules)
- framer-motion for all animations
- lucide-react for all icons
- All imports from `../../components/` paths

---

## Mandate: Design the Complete Dashboard Redesign

You are the **Lead Designer and Engineer**. Design a single, comprehensive, well-reasoned solution for the DeskFlow dashboard. Do not present options. Produce one definitive spec.

### Engineering Tasks

**A. Layout Architecture — 3-Band Design per Doc 08**
Design the dashboard as three distinct visual bands with clear hierarchy:

**Band 1 — Hero ("Today, so far"):**
- Left: Stopwatch timer (keep the existing giant timer with status indicator and current activity name)
- Center: FunFactHero (the daily AI insight — the "one thing that's always changing")
- Right: GoalRing (focus time vs 120min goal)
- The three must feel balanced. No single element should dominate visually. The stopwatch must NOT take 2/3 width.
- The GoalRing must be at the same visual level as the other two — not beneath the FunFactHero
- Consider: proportional sizing where stopwatch gets slightly more visual weight (maybe 1/2 center column?) while FunFactHero and GoalRing share the other half side-by-side? Or 1/3 equal columns with responsive font sizing for the timer?

**Band 2 — Cross-Module Summary ("What you need to know"):**
- 4 summary cards: Activity, Finance, Learn, External
- Each card shows: icon + title + primary metric + trend indicator (direction + label)
- Cards must INCLUDE sparklines or mini-charts showing the last 7-14 day trend (not just a static number)
- The current SummaryCard component has a `trend` prop but no sparkline — design and spec a compact sparkline component
- Finance respects the lock state (masked when locked)
- Clickthrough to respective module pages
- Must feel like a unified strip, not 4 independent buttons

**Band 3 — Integrated Deep Focus + Recent Context:**
- Deep Focus must be a **prominent, visually weighty section** — not a narrow sidebar card alone in a grid
- It should sit alongside recent sessions and the Focus Session rankings as one coherent "Productivity & Focus" zone
- Options for placement: right rail alongside recent sessions, expanded card that spans the full width, or a dedicated zone below the summary strip
- The Focus Session rankings (best today/week/all-time) should be collapsible into a single card with period toggle
- Pinned external activities (keep as collapsible quick-access)
- Recent sessions (keep, condensed format)
- Heatmap + OrbitSystem → demote to click-through drill-downs (card with "View Heatmap" / "View Ecosystem" buttons, not full renderings)

**B. State Management Refactor (Architect MUST specify this precisely):**
- Extract `useHomeSummary()` hook that:
  - Fetches `dashboard:home-summary` on mount
  - Returns typed data matching the getHomeSummary response
  - Has loading/error states
  - Auto-refreshes on a configurable interval (or event-driven from `onTrackingUpdate`)
- Create a `useDeepFocus()` wrapper around `useFocusSession` that returns typed data for the Band 3 section
- DashboardPage.tsx becomes a layout orchestrator that calls these hooks and passes data to sub-components

**C. Performance Fix:**
- The dashboard has 7 setIntervals. The redesign MUST consolidate to:
  - 1 interval (1s tick) ONLY for the live stopwatch countdown
  - Everything else driven by events or on-demand fetch
  - Specifically: remove the interval that polls data every 5s — replace with event-driven push or a less frequent refresh

**D. Data Flow & Temperature Check** (Architect MUST answer these):
1. How does the stopwatch timer state persist across page navigations? (Currently: localStorage + parent props from App.tsx)
2. How does Deep Focus state sync with the dashboard when a session starts from the DashboardPage vs from overlay?
3. How does the FunFactHero refresh daily without an interval? (Currently: fetch on mount, never refreshes)
4. How does the summary strip data stay fresh without polling?

**E. Component Extraction Plan:**
Spec exactly which new files to create (e.g., `HeroBand.tsx`, `SummaryStrip.tsx`, `FocusZone.tsx`, `useHomeSummary.ts`) and what each one contains. Specify which parts stay in DashboardPage.tsx.

### Data-Processing Pipeline (for every data display, specify the math)

For each data point in the redesign, specify:
1. **Source**: Which IPC endpoint or state variable provides the raw data
2. **Transform**: What aggregation, smoothing, or formatting is applied (e.g., "focusMinutes from getHomeSummary → divide by 60 → append 'hr' if > 60")
3. **Caching**: How often does it refresh? Eager (on mount) vs lazy (on visibility) vs event-driven?
4. **Edge cases**: What happens when data is 0, null, or stale? What does the card look like at midnight when daily_rollup hasn't been computed yet?

### Visual Design Specifications

**The Hero Band:**
- Exact layout grid spec (columns, breakpoints, responsive behavior)
- Font size for the stopwatch at each breakpoint (120px is too large for 1/3 column on 1280px screens)
- FunFactHero visual relationship to stopwatch — should it be equally prominent or more compact?
- GoalRing sizing relative to the other two elements

**The Summary Strip (Band 2):**
- Exact sparkline component spec: dimensions, data format, color, animation
- Card hover animation spec (current: scale 1.02 + y -2)
- How the 4 cards respond on mobile (stack vs 2×2 grid vs horizontal scroll)
- Empty state for each card when its module has no data

**Deep Focus Zone (Band 3):**
- Exact integration point: Where in the dashboard layout does Deep Focus live?
- Visual weight: should it match the hero in prominence or be a compact card?
- States: idle (presets), active (countdown + time remaining), completed (celebration/minimal), and how the session history displays
- Relationship between Deep Focus timer (countdown) and the main stopwatch (count-up) — are they synced? Do they conflict?

**Unified "Productivity & Focus" Zone:**
- How do Deep Focus sessions, the Focus Sessions rankings (best today/week/all-time), and the main stopwatch relate visually and functionally?
- Should the Deep Focus card sit BESIDE the Focus Sessions card, or be merged?
- Should the main stopwatch change appearance when a Deep Focus session is active?

### User Experience Flow

1. **First visit / empty state**: User opens DeskFlow for the first time. No data. What does each band show?
2. **Typical day**: User has been working for 3 hours. Deep Focus is running. What's the layout?
3. **Deep Focus break**: User opened YouTube during a strict session. The overlay appears. What happens on the dashboard behind it?
4. **Midnight rollover**: The daily_rollup hasn't been computed for today. What does the summary strip show?
5. **Mobile / narrow viewport**: How does each band collapse? Band 2 cards switch to 2×2? Band 1 stacks vertically?
6. **After a completed Deep Focus session**: What changes on the dashboard? Celebration animation? History updated?
7. **Finance locked**: How does the Finance card in Band 2 render? (Currently: masked with "••••")

---

## Required Deliverables

The output must be a single `RESULT.md` file containing:

### 1. Complete Implementation Plan
File-by-file, function-by-function spec of every change. For each file list:
- Exact changes needed (what to extract, add, modify, remove)
- New component interfaces (Props types, state shapes)
- IPC calls used (channel, payload, return type)
- Dependencies (which components it imports)

### 2. Component Tree
Text diagram showing the new component hierarchy. Example:
```
DashboardPage (layout orchestrator)
├── useHomeSummary() hook
├── useDeepFocus() hook
├── HeroBand
│   ├── StopwatchTimer ← extracted from current inline
│   ├── FunFactHero
│   └── GoalRing
├── SummaryStrip
│   ├── SummaryCard (Activity)
│   ├── SummaryCard (Finance) [masked if locked]
│   ├── SummaryCard (Learn)
│   └── SummaryCard (External)
├── FocusZone
│   ├── DeepFocusCard ← extracted from FocusSessionCard
│   ├── FocusRankingsCard
│   └── PinnedActivities (collapsible)
├── RecentSessions (condensed)
└── ModalPortal
    ├── ExpandedHeatmap
    ├── ExpandedSolarSystem
    └── DayDetailPopup
```

### 3. Mock Data Examples
For every visual state (empty, loading, populated with real data, error), provide an example of what the data object looks like.

### 4. Coverage Table
Map every requirement from this PROMPT.md to its solution location in RESULT.md. Every item must be covered. This is not optional.

---

## ⚠️ Critical Rules

1. **NO full rewrite of DashboardPage.tsx.** Extract sub-components. Do not suggest replacing the entire component.
2. **NO new IPC channels or DB schemas.** Everything needed already exists. Only exception: adding 1-2 computed fields to the existing `getHomeSummary` return type.
3. **NO third-party component libraries.** Use shadcn/Magic UI/21st.dev components via MCP as design references, but re-skin them to DeskFlow tokens (see CONTEXT_BUNDLE.md §8 re-skin rules). Do NOT add npm dependencies.
4. **ALL icons from lucide-react.** Never emoji as UI icons. Never inline SVG that duplicates lucide.
5. **Deep Focus must be prominent.** Tack-on placement at the bottom in a 1/3 width column is unacceptable. Design it as a first-class feature with visual weight matching its importance.
6. **Every data-driven component needs all 4 states**: empty, loading, error, populated. Design all four.
7. **Remove the 7-interval polling storm.** One 1s interval for the stopwatch only. Everything else event-driven or on-demand.
