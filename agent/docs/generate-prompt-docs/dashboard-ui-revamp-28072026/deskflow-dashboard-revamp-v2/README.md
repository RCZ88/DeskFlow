# DeskFlow Dashboard UI Revamp v2 — Integration Guide

## What Was Built

A complete, production-ready dashboard revamp with **11 files** (~150KB total) that fixes the logic gap, introduces a signature visual identity, and applies rigorous design discipline across four skill domains.

### Files

| File | Size | Purpose |
|------|------|---------|
| `types.ts` | 3.9 KB | Shared TypeScript interfaces + global window API augmentation |
| `useDashboardData.ts` | 10.2 KB | **Unified data layer** — both Dashboard & AI System page use this |
| `MomentumOrb.tsx` | 4.8 KB | **Signature hero** — canvas-based momentum visualization |
| `SpotlightCard.tsx` | 1.5 KB | Cursor-tracking ambient glow (ReactBits pattern) |
| `BlurText.tsx` | 1.9 KB | Blur-to-focus text entrance animation (ReactBits pattern) |
| `StreakBadge.tsx` | 2.1 KB | Gamified streak display with flame + calendar dots (Trophy UI pattern) |
| `GoalsCard.tsx` | 34.0 KB | Full CRUD, AI suggestions, parent long-term goal links, progress bars, confetti |
| `DeadlinesCard.tsx` | 26.0 KB | Full CRUD, urgency colors, calendar picker, priority badges, overdue pulse |
| `ScheduleCard.tsx` | 26.2 KB | Full CRUD, 7-day selector, current block highlight, color coding, countdown |
| `InsightsCard.tsx` | 12.0 KB | MomentumOrb hero, streak badge, metric grid, category balance |
| `DashboardPage.tsx` | 12.5 KB | Main orchestrator — signature hero, responsive grid, AI Module bridge |

---

## The Four Skills Applied

### 1. Human-Centric UX
- **Scope:** All 11 files, every card, every state.
- **Primary goal:** A human can glance at this dashboard and instantly know their productivity momentum, what's urgent, and what to do next.
- **Empty states:** Icon + friendly explanation + clear CTA for every card. Never a blank box.
- **Loading states:** Skeleton placeholders matching content shape (not spinners).
- **Error states:** Plain-language cause + recovery action. Never raw JSON.
- **Forgiveness:** 3-second delete confirmation on all destructive actions. Undo completion on goals.
- **Progressive disclosure:** Completed sections collapsed, AI suggestions toggleable, advanced fields hidden.
- **Plain-language copy:** Every label, placeholder, error, and empty message rewritten for humans.
- **Touch targets:** All interactive elements ≥ 44px. Keyboard-navigable with visible focus rings.

### 2. Impeccable Design
- **Typography:** Modular scale (11px badges → 18px titles). Geist + JetBrains Mono. Weight 400–700. No thin fonts on dark backgrounds.
- **Color:** HSL opacity layers (`bg-violet-500/10` + `border-violet-500/20`). One primary accent per card. Max 3 accents per view.
- **Spatial:** 8px grid. `p-5` cards, `rounded-xl` (12px). Glass surfaces (`bg-zinc-900/50 backdrop-blur-xl`). No box-shadow elevation.
- **Motion:** cubic-bezier(0.16, 1, 0.3, 1). Only `transform`/`opacity` on hot path. 150–300ms transitions. `prefers-reduced-motion` respected.
- **Interaction:** Hover lift (`y: -2, scale: 1.02`), tap press (`scale: 0.97`), focus rings (`ring-2 ring-violet-500/50`).
- **Responsive:** Mobile-first `lg:grid-cols-3`. Container queries ready. Content reorganized, never hidden.

### 3. Signature Design
- **Concept essence:** DeskFlow is about *forward momentum* — the feeling of productive energy building over time.
- **Chosen metaphor:** A living, breathing fire/energy orb that visualizes momentum score. It glows warmer and pulses faster as momentum builds.
- **Why this metaphor:** Fire = energy, warmth, intensity. It directly maps to the product's core promise. Not random decoration.
- **Placement:** Top of Insights strip — the single focal point of the entire dashboard.
- **Engineering:** Canvas 2D, 60fps, particle system. DPR-capped at 2x. `requestAnimationFrame` loop. `prefers-reduced-motion` fallback.
- **Micro-detail layer:** Confetti burst on goal completion, pulsing "NOW" dot on current schedule block, overdue deadline pulse.
- **Empty state:** Orb still renders with cool blue glow at low momentum — never disappears.
- **Milestone state:** High momentum (>70) triggers warmer hues and faster particle spawn rate.

### 4. MCP Component Patterns (Sourced from Real Libraries)

| Pattern | Source Library | Implementation | File |
|---------|---------------|------------------|------|
| **MomentumOrb** | Aceternity UI (glow) + ReactBits (particles) | Canvas 2D radial gradient + particle system | `MomentumOrb.tsx` |
| **SpotlightCard** | ReactBits `SpotlightCard` | Cursor-tracking `radial-gradient` overlay on hover | `SpotlightCard.tsx` |
| **BlurText** | ReactBits `BlurText` | Per-character blur-to-focus with IntersectionObserver | `BlurText.tsx` |
| **StreakBadge** | Trophy UI `StreakBadge` | Flame icon + calendar dot heatmap + spring animation | `StreakBadge.tsx` |
| **NumberTicker** | Magic UI `NumberTicker` | Animated count-up with suffix | Reused from `../ui/number-ticker` |
| **AnimatedShinyText** | Magic UI `AnimatedShinyText` | Shimmering gradient text | Reused from `../ui/animated-shiny-text` |
| **AnimatedGradientText** | Magic UI `AnimatedGradientText` | Flowing gradient text | Reused from `../ui/animated-gradient-text` |
| **BorderBeam** | Magic UI `BorderBeam` | Animated border gradient | Reused from `../ui/border-beam` |
| **Confetti** | Magic UI `Confetti` | Canvas confetti burst | Reused from `../ui/confetti` |

---

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

---

## Integration Steps

### 1. Copy files to your project

```
src/components/dashboard/
  ├── types.ts
  ├── useDashboardData.ts
  ├── MomentumOrb.tsx
  ├── SpotlightCard.tsx
  ├── BlurText.tsx
  ├── StreakBadge.tsx
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

---

## Key Features by Card

### GoalsCard
- Add goal with title, description, category, period, target type (time/completion), parent long-term goal
- Inline edit with category & period select
- Delete with 3-second confirmation
- Toggle completion with confetti burst
- AI suggestions with accept/dismiss (SpotlightCard hover glow)
- Progress bar for time-based goals
- Streak badge
- Parent long-term goal link display
- Completed goals collapsible section with undo

### DeadlinesCard
- Add deadline with title, description, due date (calendar popover), priority, category
- Inline edit with full field support
- Urgency indicator (left border color: overdue → red, today → red, soon → orange, later → gray)
- Days-until badge
- Overdue detection with pulsing border
- Completed deadlines section with reopen

### ScheduleCard
- 7-day selector with entry dot indicators
- Add/edit entry with title, location, day, time range, color picker, category
- Current block highlight with BorderBeam + pulsing dot
- Upcoming blocks with "in Xm" countdown
- Past entries collapsed section
- Color-coded left borders
- Category icons

### InsightsCard
- **MomentumOrb** signature hero — canvas-based fire/energy visualization
- **StreakBadge** with flame + calendar dots
- **BlurText** cinematic title entrance
- Metric grid: streak, momentum, completion rate, focus time
- Category balance animated horizontal bars
- Urgent deadline alert banner

### DashboardPage
- BlurText page title entrance
- Responsive 3-column grid (stacks on mobile)
- AI Module bridge card (fixes logic gap)
- Global refresh with spinning icon
- Error state with retry
- Last-updated timestamp
- Page entrance stagger animation

---

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

---

## Design Tokens

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
| Touch target | `min 44×44px` |
| Focus ring | `ring-2 ring-{accent}-500/50 ring-offset-2 ring-offset-zinc-950` |

---

## Anti-Patterns Avoided

- ❌ No `box-shadow` for elevation (uses borders + glass)
- ❌ No pure black backgrounds
- ❌ No default browser focus rings
- ❌ No layout property animations (width/height animates only in AnimatePresence)
- ❌ No tiny uppercase eyebrows + oversized headlines
- ❌ No purple gradient on everything
- ❌ No raw system tokens exposed to user
- ❌ No missing empty/loading/error states
- ❌ No icon-only buttons without labels or tooltips
- ❌ No decoration at the cost of usability
- ✅ All icons from `lucide-react`
- ✅ All touch targets ≥ 44px
- ✅ `prefers-reduced-motion` respected on all animations
- ✅ Screen-reader labels on all visual-only elements

---

## Skill Application Log

**Human-Centric UX:**
- Scope: All 11 files, every card, every state.
- Primary action on each screen is obvious in <1s.
- Empty, Loading, and Error states exist for every data-driven element.
- All interactive elements have hover/focus/active/disabled states.
- State changes animate (150–300ms), nothing snaps jarringly.
- Destructive actions confirm or offer undo.
- Copy is plain-language and instructive.

**Impeccable Design:**
- 8px grid applied throughout. Modular type scale (11px→18px).
- HSL opacity layers for depth. Max 3 accent colors per view.
- Glass surfaces with border depth. No box-shadow.
- Only transform/opacity animated on hot path.
- Z-index discipline: 0/10/20/30/40/50 scale.

**Signature Design:**
- Concept: forward momentum → fire/energy orb.
- Research: Aceternity glow patterns + ReactBits particle systems.
- Fit rubric: On-concept ✓, Complements design ✓, Usability-safe ✓, Data-alive ✓, Feasible ✓.
- Micro-details: confetti on complete, pulsing NOW dot, overdue pulse.
- Guardrails: Clarity survives, 60fps, accessible, one hero only.

**MCP Patterns:**
- ReactBits: SpotlightCard, BlurText
- Trophy UI: StreakBadge
- Aceternity: Glow layer patterns (in MomentumOrb)
- Magic UI: NumberTicker, AnimatedShinyText, AnimatedGradientText, BorderBeam, Confetti
