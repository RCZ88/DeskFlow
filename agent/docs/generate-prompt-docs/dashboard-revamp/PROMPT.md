# Dashboard Premium Redesign — PROMPT

## Raw Request

The user said:
"WHAT IN THE FUCK IS THIS DESIGN. SO UFCKING BAD. REVERT TO THE PREVIOUS VERSION NOWWWWWW"
"REVERT UR CHANGESS"
"teh revamp is too minimal, you barely can see any difference. the green border o nthe todays focus is also really bad, and the main data diplsyaed is also bad because it doesnt include hte ones on the ai assistant like todays schedule and v erythning that is more releevant. make sure you look at all of the features and adatas available, and like choose to revamp and add or like adjut the stuff so like its better and overall better deign and layout and display, maybe even make the topwatch less of the main thing onthe dashboard. its sort of irelevant. still include it, but smaller, to leave room for the others to show up proeprly."
"the schedules and calendar stuff should be the main things to show"
"use all frontend skills and everything mcp"
"make sure the scheudles and calendar stuff should be the main things to show"

## Problem Statement

The DeskFlow dashboard page looks generic, bland, and "like AI slop." The timer is too dominant and irrelevant compared to the user's actual workflow data (schedule, focus, finance, learning). The design lacks visual personality, premium feel, and proper data hierarchy. The user wants the schedule/calendar to be the HERO of the dashboard, with the timer de-emphasized. Every card and section needs premium glass treatment, gradient glows, border beams, aurora text, staggered animations, and visual depth.

## Context Bundle

Read `agent/docs/dashboard-revamp/CONTEXT_BUNDLE.md` first. It contains:
- Complete component source code for every dashboard element
- All data structures, IPC endpoints, and hooks
- Design tokens (colors, typography, spacing, animation)
- Available MCP/UI components already installed
- Current layout structure
- Hard constraints

## Missing Components from Other Pages (MUST include on dashboard)

The following components exist in OTHER pages of the app but are NOT on the dashboard. They contain high-value data that the user explicitly wants visible:

### From ProductivityPage
1. **Productivity Score** — Weighted 0-100 score answering "how productive was I today?" (`src/pages/ProductivityPage.tsx:913-945`). Uses NumberTicker + comparison badge. **MUST be on dashboard.**
2. **Tier Breakdown Strip** — 4 stat cards: Productive hours, Neutral hours, Distracting hours, Total time with percentages (`src/pages/ProductivityPage.tsx:966-1031`). **MUST be on dashboard.**
3. **Productivity Trend Sparkline** — Mini line chart of daily productivity score over the week (`src/pages/ProductivityPage.tsx:1114-1132`). **Should be on dashboard.**
4. **Peak Hours Callout** — "Your best focus: 10 AM - 12 PM" single stat (`src/pages/ProductivityPage.tsx:653-730`). **Should be on dashboard.**

### From InsightsPage
5. **Insight Strip** — 2-3 compact AI-generated InsightCards: top app, new record, streak, anomaly (`src/pages/InsightsPage.tsx:611-646`, uses `InsightCard` component). Data from `insights:strip` IPC. **MUST be on dashboard.**
6. **Summary Stats Row** — Streak (weeks), Best Day, Sleep Deficit as single-line metrics (`src/pages/InsightsPage.tsx:577-608`). **Should be on dashboard.**

### From AI Canvas Cards
7. **Today's Goals + Deadline Countdown** — From `DailyPlannerCard` (`src/components/ai/canvas/cards/DailyPlannerCard.tsx`) and `DeadlineTrackerCard` (`src/components/ai/canvas/cards/DeadlineTrackerCard.tsx`). Shows goals with checkboxes and deadlines with countdown. Data from `getGoals`, `getDeadlines` IPC. **Should be on dashboard.**

### From ExternalPage
8. **Weekly Sleep Bar** — Mini bar chart of sleep hours per night this week (`src/pages/ExternalPage.tsx:729-786`). **Should be on dashboard.**

### From Finance
9. **Subscription Renewal Alert** — "Netflix renews in 3 days ($15.99)" banner (`src/components/finance/SubscriptionRenewalBanner.tsx`). **Should be on dashboard (conditional).**

### From Learn
10. **Mastery Progress Ring** — "12/45 nodes mastered" compact ring (`src/components/learn/MasteryStrip.tsx`). **Should be on dashboard.**

## Design Mandate

You are the **Lead Designer and Engineer**. Design a COMPLETE visual and layout overhaul for the DeskFlow dashboard page. Do NOT provide options — design THE solution.

### What to Design

1. **Layout Restructure** — The schedule/calendar MUST be the hero (largest, most prominent element). The timer should still be present but NOT dominate. Design the optimal grid/layout that shows:
   - Schedule as the primary content
   - Timer as a persistent but compact element
   - Summary stats visible
   - Focus tools accessible
   - Productivity data clear
   - Activity feed scannable

2. **Every Card Premium** — Every single card/section must have:
   - Glass treatment (bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50)
   - Gradient glow background (subtle, per-card accent color)
   - Top edge highlight (1px gradient line)
   - Hover states (lift, glow, border brighten)
   - Staggered entrance animations
   - Empty/loading/error states

3. **Typography Hierarchy** — Use weight and color temperature, not just size:
   - Hero numbers: text-3xl to text-5xl with AuroraText or gradient
   - KPI values: text-xl with NumberTicker
   - Section titles: text-[15px] font-semibold
   - Meta: text-[11px] text-zinc-500

4. **Animation Budget (L2 — Responsive)**:
   - Card entrances: 400ms fade up with stagger
   - Hover: 150ms lift + glow
   - Number count-ups: 500ms spring
   - Ambient: ONE breathing status dot, BorderBeam on active cards
   - NO particles, NO meteors, NO L3 ambient

5. **Color Discipline**:
   - Dashboard accent: pink-500 (#ec4899)
   - Per-card accent colors for gradient glows
   - NO multi-color chaos — single cohesive theme
   - Use opacity layers for depth, not new hex values

## Requirement Checklist

### Data Processing
- [ ] Schedule entries filtered by today's day_of_week, sorted by start_time
- [ ] Current schedule block detected (now between start_time and end_time)
- [ ] Upcoming blocks with "in Xm" countdown
- [ ] Productivity score computed: (productiveSeconds / totalSeconds) * 100
- [ ] Tier breakdown: productive/neutral/distracting hours formatted
- [ ] Insight strip: top 2-3 InsightAtoms from insights:strip IPC
- [ ] Streak: consecutive days with productive time > threshold
- [ ] Best day: day of week with highest productivity
- [ ] Sleep debt: target sleep - actual sleep for last 7 days
- [ ] Goals: fetched via get-goals, filtered for today/incomplete
- [ ] Deadlines: fetched via get-deadlines, sorted by due_date
- [ ] Summary stats properly formatted (hours, currency, counts)
- [ ] Activity feed with elapsed time calculation
- [ ] Productivity chart data properly aggregated

### Visual Specs
- [ ] Every card has glass treatment
- [ ] Every card has gradient glow background
- [ ] Every card has top edge highlight
- [ ] Section headers have accent icon containers
- [ ] Buttons have glass style with hover glow
- [ ] Modals have glass treatment
- [ ] Timer digits use AuroraText or gradient
- [ ] KPI values use NumberTicker
- [ ] Productivity score uses large AuroraText or gradient
- [ ] Tier breakdown uses color-coded stat cards
- [ ] Insight strip uses horizontal scrollable InsightCards
- [ ] Schedule current block highlighted with accent
- [ ] Schedule upcoming blocks with countdown
- [ ] Goals use checkbox list with completion animation
- [ ] Deadlines use countdown badges (urgent=red, soon=amber, normal=zinc)
- [ ] Sleep bar uses mini bar chart with deficit indicator
- [ ] Mastery ring uses SVG circle with gradient stroke

### UX Flow
- [ ] Empty states for all data-driven components
- [ ] Loading skeletons for async data
- [ ] Hover feedback on all interactive elements
- [ ] Staggered entrance animations
- [ ] Responsive layout (1 col mobile, 2-3 col desktop)
- [ ] Schedule prominently visible without scrolling
- [ ] Productivity score visible at top
- [ ] Goals/deadlines visible without scrolling

### Constraints
- [ ] Tailwind v4 syntax
- [ ] framer-motion v12
- [ ] lucide-react icons only
- [ ] No new dependencies
- [ ] No removal of existing features
- [ ] OrbitSystem 3D untouched
- [ ] Modals untouched
- [ ] Single pink-500 accent theme

## Output Format

Provide your solution as a complete specification with:
1. **Layout Diagram** — ASCII or description of the grid structure
2. **Component Specs** — For each component, specify exact classes, animations, and states
3. **Data Flow** — How each data source maps to the UI
4. **Animation Spec** — Exact framer-motion props for each element
5. **File Changes** — Which files to modify and what to change in each

Be specific. Use exact Tailwind classes, exact framer-motion props, exact hex values. This is a production implementation spec, not a mood board.
