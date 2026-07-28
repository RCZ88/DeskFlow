# DeskFlow Dashboard UI Revamp — Integration Guide

## What Was Built

A complete, production-ready dashboard revamp with **7 files** that fixes the logic gap and makes goals, deadlines, and schedules first-class citizens.

### Files

| File | Purpose |
|------|---------|
| `types.ts` | Shared TypeScript interfaces + global window API augmentation |
| `useDashboardData.ts` | **Unified data layer** — both Dashboard & AI System page use this |
| `GoalsCard.tsx` | Full CRUD, AI suggestions, parent long-term goal links, progress bars, confetti |
| `DeadlinesCard.tsx` | Full CRUD, urgency colors, calendar picker, priority badges, overdue detection |
| `ScheduleCard.tsx` | Full CRUD, 7-day selector, current block highlight, color coding, countdown |
| `InsightsCard.tsx` | Momentum score, streak, completion rate, focus time, category balance |
| `DashboardPage.tsx` | Main orchestrator — responsive grid, AI Module bridge, error states |

## The Logic Gap Fix

**Problem:** AI System page and Dashboard had separate data stores. Changes on one didn't reflect on the other.

**Solution:** `useDashboardData.ts` is the single source of truth. Both pages import and use it.

```tsx
// Dashboard page
const data = useDashboardData();

// AI System page (same hook, same data)
const data = useDashboardData();
```

All CRUD operations in the hook update local state immediately and sync to IPC. No stale data. No duplicate stores.

## Frontend Skills Applied

1. **Frontend Design** — zinc-950 base, glass surfaces, 8px grid, 12px radius, `p-5` cards
2. **Human-Centric UX** — Empty/loading/error states for every card, confirmation on delete, plain-language copy
3. **Impeccable Design** — Modular type scale, HSL colors, 44px touch targets, responsive grid
4. **Motion (L2 Responsive)** — Staggered list entrances, hover lift (`y: -2, scale: 1.02`), tap press (`scale: 0.97`), layout animations
5. **MCP Components** — GlareHover, BorderBeam, NumberTicker, AnimatedShinyText, AnimatedGradientText, Confetti

## Integration Steps

### 1. Copy files to your project

```
src/components/dashboard/
  ├── types.ts
  ├── useDashboardData.ts
  ├── GoalsCard.tsx
  ├── DeadlinesCard.tsx
  ├── ScheduleCard.tsx
  ├── InsightsCard.tsx
  └── DashboardPage.tsx
```

### 2. Ensure dependencies

```bash
npm install framer-motion date-fns lucide-react
```

### 3. Update your dashboard route

```tsx
// src/pages/dashboard/index.tsx
import { DashboardPage } from '../../components/dashboard/DashboardPage';
import { StatusBand } from './StatusBand'; // your existing StatusBand

export default function Dashboard() {
  return (
    <DashboardPage
      statusBand={<StatusBand /* ...your props */ />}
    />
  );
}
```

### 4. Update AI System page to use the same hook

```tsx
// src/pages/ai/index.tsx
import { useDashboardData } from '../../components/dashboard/useDashboardData';

export default function AISystem() {
  const { goals, deadlines, schedule, longTermGoals, generateSuggestions } = useDashboardData();
  // Now you have the SAME data as the dashboard
  // Changes here reflect on dashboard instantly
}
```

## Key Features

### GoalsCard
- ✅ Add goal with title, description, category, period, target type (time/completion), parent long-term goal
- ✅ Inline edit with category & period select
- ✅ Delete with 3-second confirmation
- ✅ Toggle completion with confetti burst
- ✅ AI suggestions with accept/dismiss (GlareHover cards)
- ✅ Progress bar for time-based goals
- ✅ Streak badge
- ✅ Parent long-term goal link display
- ✅ Completed goals collapsible section

### DeadlinesCard
- ✅ Add deadline with title, description, due date (calendar popover), priority, category
- ✅ Inline edit with full field support
- ✅ Urgency indicator (left border color: overdue → red, today → red, soon → orange, later → gray)
- ✅ Days-until badge
- ✅ Overdue detection and label
- ✅ Completed deadlines section with reopen

### ScheduleCard
- ✅ 7-day selector with entry dot indicators
- ✅ Add/edit entry with title, location, day, time range, color picker, category
- ✅ Current block highlight with BorderBeam + pulsing dot
- ✅ Upcoming blocks with "in Xm" countdown
- ✅ Past entries collapsed section
- ✅ Color-coded left borders
- ✅ Category icons

### InsightsCard
- ✅ Streak counter with NumberTicker
- ✅ Momentum score (0-100) with animated bar
- ✅ Completion rate
- ✅ Focus time (minutes)
- ✅ Category balance horizontal bars
- ✅ Urgent deadline alert banner

### DashboardPage
- ✅ Responsive 3-column grid (stacks on mobile)
- ✅ AI Module bridge card (fixes logic gap)
- ✅ Global refresh with spinning icon
- ✅ Error state with retry
- ✅ Last-updated timestamp
- ✅ Page entrance stagger animation

## Data Flow Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  DashboardPage  │     │   AI System     │
│                 │     │     Page        │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
            ┌────────▼────────┐
            │ useDashboardData│  ← Single source of truth
            │    (hook)       │
            └────────┬────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
   │  Goals  │ │Deadlines│ │Schedule │
   │  IPC    │ │  IPC    │ │  IPC    │
   └─────────┘ └─────────┘ └─────────┘
```

## Design Tokens Used

| Token | Value |
|-------|-------|
| Background | `zinc-950` (`#09090b`) |
| Surface | `zinc-900` (`#18181b`) |
| Glass | `bg-zinc-900/50 backdrop-blur-xl` |
| Card radius | `rounded-xl` (12px) |
| Card padding | `p-5` (20px) |
| Primary accent | `violet-500` (goals), `rose-500` (deadlines), `pink-500` (schedule), `amber-500` (insights) |
| Motion ease | `cubic-bezier(0.16, 1, 0.3, 1)` |
| List stagger | `0.05s` per item |
| Hover lift | `y: -2, scale: 1.02` |
| Tap press | `scale: 0.97` |

## Anti-Patterns Avoided

- ❌ No `box-shadow` for elevation (uses borders + glass)
- ❌ No pure black backgrounds
- ❌ No default browser focus rings
- ❌ No layout property animations (width/height animates only in AnimatePresence)
- ❌ No tiny uppercase eyebrows + oversized headlines
- ❌ No purple gradient on everything
- ✅ All icons from `lucide-react`
- ✅ All touch targets ≥ 44px
