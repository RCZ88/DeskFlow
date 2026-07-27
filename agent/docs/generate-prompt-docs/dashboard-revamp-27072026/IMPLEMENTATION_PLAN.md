# Implementation Plan — Dashboard Revamp

> **Source:** RESULT.md from Architect
> **Date:** 2026-07-27
> **Status:** Ready for implementation

---

## Phase 1: Information Architecture (NO CODE YET — needs user confirmation)

### 1.1 — Relocate Goals/Deadlines/Schedules from AI System
- **Decision needed:** Where do Goals, Deadlines, Schedules live?
  - Option A: Stay on Dashboard only (quick view) + AI System (full management)
  - Option B: Move to dedicated "Planner" page + Dashboard (quick view)
- **User must confirm before proceeding**

### 1.2 — Redefine AI System Page
- Strip static feature management
- Make it dynamic canvas with AI chat + contextual cards
- **User must confirm scope before proceeding**

---

## Phase 2: Visual Revamp (CAN START NOW)

### 2.1 — Hero Timer Overhaul
**Files:** `src/pages/dashboard/StatusBand.tsx`
**Changes:**
- Scale timer from 24px to 48px+ font
- Add neutral color state (blue-400 when on neutral apps)
- Add ambient radial glow behind timer (category-colored)
- Keep breathing animation on status dot
- Keep NumberTicker for "focused today"

**Verification:** Timer always shows a color, never gray. Glow matches state.

### 2.2 — Deep Focus Card Redesign
**Files:** `src/components/focus/QuickFocusCard.tsx`
**Changes:**
- Replace pink/magenta theme with dark matte + violet/aurora effects
- Keep existing functionality (timer/stopwatch modes, presets, particles)
- Update color scheme: violet-500 primary, slate-900 background

**Verification:** Card looks premium, not flat pink.

### 2.3 — Fix UI Clipping (PinnedActivities + lists)
**Files:** `src/pages/dashboard/PinnedActivities.tsx`
**Changes:**
- Increase container padding
- Fix z-index stacking for edit/delete buttons
- Ensure overflow-visible on parent containers

**Verification:** Edit/delete buttons visible, not clipped.

### 2.4 — Tier Breakdown + Chart Elevation
**Files:** `src/pages/dashboard/TierBreakdownStrip.tsx`, `src/pages/DashboardPage.tsx`
**Changes:**
- Move TierBreakdownStrip to Row 3 (after StatusBand)
- Redesign bar chart: rounded segments, gradient fills, proper stacking
- Move chart to Row 4

**Verification:** Stats visible without scrolling. Chart looks polished.

---

## Phase 3: Backend Wiring (NEEDS NEW IPCs)

### 3.1 — Implement Missing IPCs
**Files:** `src/preload.ts`, `src/main.ts`, `src/services/`
**New IPCs needed:**
- `addGoal(title, priority)` → create goal in DB
- `addScheduleEntry(title, startTime, endTime, location, dayOfWeek)` → create schedule
- `addDeadline(title, dueDate, course)` → create deadline
- `toggleGoal(id)` → toggle goal completion

**Backend gap:** These IPCs don't exist yet. Need to create service methods + handlers.

### 3.2 — Inline Creation UI
**Files:** `src/components/dashboard/GoalsCard.tsx`, `src/components/dashboard/DeadlinesCard.tsx`, `src/pages/dashboard/ScheduleCard.tsx`
**Changes:**
- Add "+ Add" button to each card
- Inline input field appears on click
- Submit creates item via IPC
- Replace empty states with actionable CTAs

**Verification:** Can add goal/deadline/schedule from dashboard.

### 3.3 — Wire Existing Features + Sleep Fix
**Files:** `src/pages/DashboardPage.tsx`, `src/components/dashboard/GoalsCard.tsx`
**Changes:**
- Wire `onToggle` prop to GoalsCard
- Add "Log Sleep" button to SleepBarMini
- Create minimal sleep logging modal

**Verification:** Goals toggleable. Sleep can be logged from dashboard.

---

## Phase 4: Modularity (FUTURE)

### 4.1 — Widget Registry
- Define card interface: `{ id, name, icon, component, defaultPosition, visible }`
- Create registry of available cards

### 4.2 — Edit Dashboard Mode
- "Edit Dashboard" button
- Card picker overlay
- Toggle visibility per card

### 4.3 — Drag-and-Drop + Persistence
- Use dnd-kit for reorder
- Save layout to localStorage

---

## Implementation Order

1. **Phase 2.1** — Hero Timer (biggest visual impact)
2. **Phase 2.3** — Fix UI clipping (quick fix)
3. **Phase 2.4** — Tier Breakdown + Chart elevation
4. **Phase 2.2** — Deep Focus redesign
5. **Phase 3.1** — New IPCs (backend)
6. **Phase 3.2** — Inline creation UI
7. **Phase 3.3** — Wire existing + sleep fix
8. **Phase 1** — AI System restructure (needs user decision)
9. **Phase 4** — Modularity (future)

---

## Backend Audit Table

| Feature | IPC Channel | Handler Exists? | Service Class | DB Schema | Status |
|---------|-------------|-----------------|---------------|-----------|--------|
| Add Goal | ❌ None | ❌ No | ❌ No | ⚠️ goals table exists | ⚠️ NEEDS WORK |
| Toggle Goal | ❌ None | ❌ No | ❌ No | ⚠️ goals table exists | ⚠️ NEEDS WORK |
| Add Schedule | ❌ None | ❌ No | ❌ No | ⚠️ schedule table exists | ⚠️ NEEDS WORK |
| Add Deadline | ❌ None | ❌ No | ❌ No | ⚠️ deadlines table exists | ⚠️ NEEDS WORK |
| Log Sleep | ❌ None | ❌ No | ❌ No | ⚠️ external_sessions | ⚠️ NEEDS WORK |
| Get Goals | getGoals | ✅ main.ts | ✅ | ✅ | ✅ REAL |
| Get Schedule | getSchedule | ✅ main.ts | ✅ | ✅ | ✅ REAL |
| Get Deadlines | getDeadlines | ✅ main.ts | ✅ | ✅ | ✅ REAL |

---

*End of Implementation Plan*
