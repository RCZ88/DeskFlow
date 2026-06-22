# Finance Page — Complete Visual Overhaul

## Raw Request (Verbatim)

> "i owe you an apology for being inderect before. my task was clear: redesign the finance page. i can't code it myself. i need complete code. you provided reasonable fixes but not what i asked for. i'm giving you one more chance.
>
> every design the code works. the backend is stable. nobody is asking to rebuild the backend.
>
> make the green page look BRAND NEW but keep the backend untouched.
>
> test: go to /finance. ask yourself: does this look like a world class finance dashboard? then redesign it so the answer is YES.
>
> make the green page look BRAND NEW but leave the backend alone.
>
> design the "green page" visually overhaul it.
>
> you are an expert in frontend design. the ui/ux is a dark themed glassmorphism style built with tailwind css and framer motion.
>
> make it gorgeous. no backend changes. this is a pure visual and interaction overhaul of the Finance page."

## Context

Read `CONTEXT_BUNDLE.md` (same directory). It is your **sole source of truth**. It contains:
- Exact file paths, component props, state, data shapes, IPC endpoints
- Current layout diagram showing exactly what exists today
- Design tokens (colors, spacing, glassmorphism patterns)
- Complete frontend architecture

## ⚠️ CRITICAL: This Must Be DIFFERENT From Current Design

**The current design is PLAIN, GENERIC, and BORING.** You must NOT repeat the current approach. The user has explicitly rejected incremental improvements. You need a **radical departure**.

### What the Finance page looks like NOW (what to AVOID):

| Current Problem | How It Looks |
|----------------|-------------|
| **Boring cards** | Identical dark rectangles with flat text. No visual hierarchy, no depth, no personality |
| **Dead charts** | Default Recharts styling. No custom colors, no animations, no integration with surrounding content |
| **Static header** | Net worth is just a number with an eye icon. No animated counter, no sparkline, no trend context |
| **Plain tabs** | Text-only buttons with an underline. No icons, no animation, no visual feedback |
| **Cramped account list** | Wallets are 1-line rows with tiny edit/archive icons. Hard to tap, no visual separation |
| **Dense transaction list** | Flat rows with description + amount. No category badges, no visual scanning hierarchy |
| **Generic modal forms** | Standard form fields in a standard modal. Zero delight |
| **Lock screen** | Minimal overlay — password input + button. No atmosphere, no branding |

**Your job: Make every single one of these unrecognizable.**

## Available Design Assets (from 21st.dev)

Use these for inspiration. These are existing components that demonstrate the visual direction:

1. **Liquid Glass** — SVG filter-based glass distortion (`feTurbulence` + `feDisplacementMap`). Layered glass with inner highlights and shadows. This is an advanced glassmorphism technique you can apply to cards.
2. **Financial Score Cards** — Score display cards with animated values, badge overlays, strength indicators. Great model for net worth/income stat cards.
3. **Financial Dashboard** — Full dashboard with staggered animations, quick action grid, colored transaction amounts with background pills. Strong pattern for the overview layout.
4. **Transaction List** — Animated expandable rows with Framer Motion `layoutId` shared transitions. Click a row → it smoothly expands into a detail view.
5. **Dialog** — Spring-physics animated dialog with backdrop blur. Clean, modern modal pattern.
6. **Liquid Weather Glass** — Configurable glass card component with blur/shadow/glow intensity sliders. Good reference for reusable glass card primitives.

**Do not just copy these. Use them as inspiration for the visual LANGUAGE and interaction PATTERNS, then create something that fits the emerald-green finance theme.**

## Your Role

You are the **Lead Designer and Engineer**. Produce a single, comprehensive solution — not options. Own everything from math to pixels.

## The Mandate

Design a **complete visual and interaction overhaul** of the Finance page. The backend (IPC, preload, main process, DB) is frozen. All work is frontend-only: React components, Tailwind CSS, Framer Motion, Recharts, Lucide.

DESIGN_VARIANCE = 7 (willing to diverge significantly)
MOTION_INTENSITY = 5 (moderate animation)
VISUAL_DENSITY = 6 (information-rich but breathing room)

## Requirements

### Engineering / Data Processing
- Net worth is the **hero metric** — design a prominent display with animated counter, trend direction, and context (daily change, percentage)
- Charts must feel **integrated** into the page, not tacked-on. Consider: cards that contain charts, animated chart transitions, chart/legend relationships
- Transaction list needs rapid visual scanning: color-coded amounts, category badges, icon per transaction type
- Delete-with-password flow — make it feel natural (compact confirmation, not bolted-on input)
- Empty states — first-time user sees no data. Design welcoming, beautiful empty states for every tab

### Visual Design (High-Fidelity Specs)
Propose **exact values** for everything:

- **Color palette beyond current:** Base dark (zinc-950), card surfaces, accent hierarchy using emerald green (`#10b981`). Propose: secondary accent greens, green-tinged neutral tones, gradient overlays, glow effects
- **Typography:** Exact font sizes, weights, line heights for each text level. Tabular-nums for all monetary values
- **Glassmorphism refinements:** Current is `backdrop-blur-xl bg-zinc-900/70 border border-zinc-700/30`. Propose layered glass with inner highlights, backdrop distortion, glow on accent elements
- **Animation specs:** Framer Motion variants for: page entrance, card stagger, tab switch, counter animation (net worth), chart reveal, list item hover, modal entrance
- **Spacing:** Exact padding/margin values for every component group
- **Chart restyling:** Custom Recharts colors, gradients, tooltip designs, animation, legend positioning

### Interaction / UX Flow
For each component, describe: default state, hover, active, focus, transition between states:

| Component | What to Design |
|-----------|---------------|
| **StickyHeader** | Net worth hero display with animated counter, trend indicator. Mask toggle placement. Sparkline or mini chart |
| **Tab Bar** | Icon + label per tab. Animated active indicator. Tab switch transition |
| **Overview stat cards** | Hover scale/glow. Click behavior. Empty state design |
| **Spending chart** | Doughnut with center total. Hover segment highlight. Click-to-filter |
| **Monthly bar chart** | Hover tooltip with full details. Click bar → filter transactions |
| **Net worth line chart** | Area fill gradient. Range selector |
| **Account cards** | Expand/collapse animation. Wallet row: large hit targets, swipe-to-archive? |
| **Transaction rows** | Hover background. Click → expand detail? Delete with password confirmation |
| **QuickAdd FAB** | Entrance animation. Floating action button placement |
| **QuickAdd modal** | Field focus progression. Currency indicator. Submit loading state |
| **Lock screen** | First impression. Background effect, password field styling, biometric button prominence, error shake animation |

### Component File List (from CONTEXT_BUNDLE.md)

These are the EXACT files to redesign. Propose specific structural/CSS/anim changes for each:

| File | Current Flaw |
|------|-------------|
| `OverviewTab.tsx` | Just stacked cards + charts. No visual storytelling |
| `AccountsTab.tsx` | Cramped rows, tiny hit targets |
| `TransactionsTab.tsx` | Dense list, no visual hierarchy |
| `QuickAddModal.tsx` | Generic form modal, zero delight |
| `FinanceStickyHeader.tsx` | Plain number, no impact |
| `FinanceLockScreen.tsx` | Minimal, no atmosphere |
| `IncomeExpenseCard.tsx` | Plain stat card |
| `NetWorthCard.tsx` | Plain stat card |
| `RecentTxnsCard.tsx` | Mini list, no character |
| `IncomeExpenseBarChart.tsx` | Default Recharts |
| `NetWorthLineChart.tsx` | Default Recharts |
| `SpendingCategoryChart.tsx` | Default Recharts |

## Constraints (Hard Limits)
- **NO backend changes.** No IPC, no preload, no main process, no DB queries, no SQL
- **NO routing changes.** `/finance` stays as a tab within existing page
- **NO framework migration.** React + TypeScript + Vite + Tailwind CSS v4 + Framer Motion + Recharts + Lucide
- **NO renaming** existing component props or removing props. You can add new local-only state but cannot change parent-child prop contracts
- Keep `--page-accent: #10b981` CSS variable — do not remove or rename it
- Must work within existing `PageShell` wrapper
- All number masking flows through `NumberMaskContext` — do not change this

## Output Format

Respond in **markdown** with these sections:

### 1. Design System Spec
Complete design tokens: color palette (hex for every shade), typography scale, spacing system, glassmorphism technique, animation curves and durations, chart color palette.

### 2. Component-by-Component Breakdown
For each file in the component list:
- **Structural changes** — HTML layout changes, new wrapper elements, grid reconfiguration
- **CSS/Tailwind changes** — exact utility classes, new CSS patterns
- **Animation spec** — Framer Motion variants, entrance order, transition parameters
- **State/additions** — any new local state needed (e.g., `isHovered`, `expandedId`)

### 3. Implementation Plan
Ordered steps with file dependencies:
```
Step 1: File A (because B and C depend on it)
Step 2: File B
Step 3: File C
...
```

**Do NOT generate React code. Generate the spec.** Code comes after.

---

## Remember

> "does this look like a world class finance dashboard?"
>
> If the answer after reading your spec is anything less than "YES", it's not done.

Be bold. Be creative. Make it gorgeous.
