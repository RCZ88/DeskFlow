# Prompt — Focus Session Relocation & Visual Redesign

## Raw Request (verbatim)

> i think the design on the producitvyt page for hte focus session is too disturbing and destoying the producitivy page. lets just seperate it and make it a seperate page on teh stats subpage or somewhere. idk generate prompt for that and like the ones on the dashbaord is very ugly. ui needy ou to generate prompt to ask where is the best palce whether its on a new page or a subpage of a page. you need to list all of the exisitng page and stuff like that

---

## Context

Read `agent/docs/focus-relocation-redesign/CONTEXT_BUNDLE.md` first — it contains the complete app page map, all 3 current focus implementations, their file paths and line numbers, the design system reference, and backend completeness verification.

**Key facts the context bundle covers:**
1. How focus currently renders on ProductivityPage (full FocusSection — timer + stats + history + insights) at lines 913-914 of `ProductivityPage.tsx`
2. How focus currently renders on DashboardPage (compact FocusSessionCard at lines 3134-3137 of `DashboardPage.tsx`)
3. How focus renders on AiPage (FocusBoard + GoalRow)
4. The shared `useFocusSession` hook and backend IPC (`deskflowAPI.focus`)
5. All 18 app routes and their purposes
6. Design tokens, component library, and visual conventions

---

## The Mandate

Act as Lead Designer and Engineer. Design a **single comprehensive solution** for relocating and redesigning the Deep Focus feature in DeskFlow.

### Decision: Where should Deep Focus live?

You are the architect — decide the best home for the full focus experience. Options include but are not limited to:

- A **new dedicated route** (e.g., `/focus`) with a full-page focus experience
- A **subpage/subtab of an existing page** (e.g., an "Activities" or "Insights" tab within DashboardPage, a subtab of ActivityPage, a section within StatsPage, or a subtab of the terminal workspace's Insights group)
- A **modal or slide-over** accessible from anywhere via a sidebar button or keyboard shortcut

For whatever location you choose, provide:
1. The exact route/navigation path
2. How the user discovers/accesses it (sidebar item? subtab? button?)
3. What happens to the existing focus sections on DashboardPage and ProductivityPage — do they get removed? replaced with a link/button? kept as a mini variant?

### Visual Redesign

Both the DashboardPage FocusSessionCard and the ProductivityPage FocusSection need a visual overhaul. The user described the Dashboard version as "very ugly." The Productivity version is "too disturbing" and "destroying" the page.

Design a polished, focused, and visually refined Deep Focus experience. Requirements:

1. **Data Processing Pipeline (Engineering Task)**
   - The `useFocusSession` hook and `focusHelpers.ts` utility functions should remain the shared data layer
   - If you create a new route/page, design how state persists across navigation (currently it's in-memory via the hook)
   - The backend (`focusManager.ts`, `deep_focus_sessions`/`deep_focus_events` tables, `deskflowAPI.focus` IPC) is fully complete — no new backend needed
   - Propose any data aggregation improvements (e.g., smoother trend calculations, caching strategies)

2. **High-Fidelity Visual Specs (Design Task)**
   - Exact component hierarchy and layout
   - Color palette (use existing pink/emerald/rose/amber focus palette, or propose improvements)
   - Typography scale, spacing, border radius
   - Chart types and styling (currently using Chart.js `react-chartjs-2` Line chart)
   - Animation curves and micro-interactions (currently using framer-motion with spring physics)
   - Empty, loading, and error states for every section
   - Responsive layout (desktop → tablet → mobile)
   - All states: idle/active/completed/aborted/failed for each session

3. **Interaction Flow (UX Task)**
   - Session lifecycle: select preset → start → countdown → soft-block overlay on distraction → complete/fail/abort
   - Celebration moment (confetti) — keep or replace?
   - How the user reviews past sessions (history list)
   - How insights (weekly trend, best hour, avg length) are surfaced
   - Keyboard shortcuts for common actions (start, stop)

### Constraints
- Must work within the existing Electron + React + Vite architecture
- Must use existing design system (GlassCard, Badge, SectionHeader, EmptyState, LoadingState, lucide-react icons)
- Must preserve the existing `useFocusSession` hook and IPC interface unless there is a strong reason to change it
- All 3 current focus locations must be addressed (what stays, what moves, what gets removed)
- If removing any existing UI elements, specify exactly what gets removed and what replaces it

---

## Output Requirements

1. **Decision Document**: Where focus lives, why, and the exact route/navigation
2. **Migration Plan**: What happens to the 3 existing focus locations
3. **Component Architecture**: New component tree, props interfaces, file structure
4. **Visual Specs**: Layout wireframes, color tokens, animation specs, all states (empty/loading/error/populated)
5. **Implementation Order**: Step-by-step build sequence, file by file
