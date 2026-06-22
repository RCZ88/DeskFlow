# 🎨 Unified Design System

**Purpose:** Single source of truth for all visual design decisions across DeskFlow sidebar pages, terminal workspace, and shared components.
**Status:** Approved — implementation ready
**Knobs:** Variance=5 (Balanced), Motion=5 (Moderate), Density=7 (Dense)
**Design References:** Vercel (precision) + Raycast (premium dark) + Linear (minimalism)
**Industry:** Developer Tools (ui-ux-pro-max)

---

## Table of Contents

1. [Design Tokens](#1-design-tokens)
2. [Typography](#2-typography)
3. [Spacing & Grid](#3-spacing--grid)
4. [Border Radius](#4-border-radius)
5. [Component Architecture](#5-component-architecture)
6. [Page Layouts](#6-page-layouts)
7. [Motion Standards](#7-motion-standards)
8. [Accent Color Strategy](#8-accent-color-strategy)
9. [Z-Index Scale](#9-z-index-scale)
10. [Modal Standardization](#10-modal-standardization)
11. [Sidebar](#11-sidebar)
12. [Top Bar](#12-top-bar)
13. [Terminal Workspace](#13-terminal-workspace)
14. [Animation Anti-Patterns](#14-animation-anti-patterns)
15. [Full UI Surface Inventory](#15-full-ui-surface-inventory)
16. [Architecture Blueprints](#16-architecture-blueprints)
    - [16.1 Cross-Session Context Sync](#161-cross-session-context-sync)
    - [16.2 Skill DSL System](#162-skill-dsl-system)
    - [16.3 InitializeProgressModal](#163-initializeprogressmodal)
    - [16.4 Analytics Dashboard](#164-analytics-dashboard)
    - [16.5 Context Management System](#165-context-management-system)
    - [16.6 Session Categorization System](#166-session-categorization-system)
    - [16.7 Agent Readiness Protocol](#167-agent-readiness-protocol)

---

## 1. Design Tokens

### 1.1 Colors

```css
/* ── Base Layers ── */
--bg-primary:       #09090b;    /* zinc-950   — page backgrounds         */
--bg-secondary:     #18181b;    /* zinc-900   — elevated surfaces         */
--bg-tertiary:      #27272a;    /* zinc-800   — input backgrounds         */
--bg-glass:         rgba(24, 24, 27, 0.8);  /* glass card fill           */

/* ── Text ── */
--text-primary:     #f4f4f5;    /* zinc-100   — headings, body            */
--text-secondary:   #a1a1aa;    /* zinc-400   — labels, secondary info    */
--text-muted:       #52525b;    /* zinc-600   — disabled, placeholders    */

/* ── Brand Accents ── */
--accent-primary:       #ec4899; /* pink-500  — single brand accent       */
--accent-hover:         #db2777; /* pink-600  — hover state               */
--accent-primary-10:    rgba(236, 72, 153, 0.10);
--accent-primary-20:    rgba(236, 72, 153, 0.20);
--accent-primary-30:    rgba(236, 72, 153, 0.30);

--accent-secondary:       #22d3ee; /* cyan-400  — info, highlights       */
--accent-secondary-10:    rgba(34, 211, 238, 0.10);
--accent-secondary-20:    rgba(34, 211, 238, 0.20);
--accent-secondary-hover: #06b6d4; /* cyan-500  */

/* ── Semantic Colors ── */
--success:  #34d399;  /* emerald-400  */
--warning:  #fbbf24;  /* amber-400    */
--error:    #f87171;  /* red-400      */

/* ── Borders ── */
--border-subtle:  #27272a;       /* zinc-800   — default card borders     */
--border-active:  #3f3f46;       /* zinc-700   — hover, focus             */
--border-glass:   rgba(63, 63, 70, 0.5);  /* glass card edge             */

/* ── Per-Page Override (set on <body> or page wrapper) ── */
--page-accent: var(--accent-primary);
```

### 1.2 Why Pink, Not Emerald?

| Reason | Detail |
|--------|--------|
| Emerald is everywhere | Every page already uses emerald — it's become invisible (anti-repetition) |
| Semantic conflict | Emerald = success color → using it as brand accent conflates "good" with "brand" |
| Skill recommendation | `frontend-design` skill: pink-500 primary, emerald-400 is semantic only |
| Industry precedent | Raycast uses coral, Linear uses indigo — a strong accent identity matters |
| Visual contrast | Pink on dark zinc pops uniquely vs green which blends into emerald-tinged apps |

### 1.3 Accent Application Rules

| Element | Token | Example |
|---------|-------|---------|
| Active sidebar item | `--page-accent` at 10% opacity | `bg-[var(--page-accent)]/10 border-r-2` |
| Focus ring | `--page-accent` at 50% opacity | `ring-2 ring-[var(--page-accent)]/50` |
| Primary buttons | `--accent-primary` | `bg-[var(--accent-primary)] text-white` |
| Icon highlights | `--page-accent` at 40% text | `text-[var(--page-accent)]` |
| Selected states | `--page-accent` at 15% bg | `bg-[var(--page-accent)]/15` |
| Hover borders | `--border-active` | `hover:border-zinc-700` |
| Semantic states | `--success/warning/error` | badges, status dots |

---

## 2. Typography

### 2.1 Font Stack

```
UI / Headings:  "Geist", system-ui, -apple-system, sans-serif
Code / Data:    "JetBrains Mono", "Fira Code", monospace
```

- Geist is Vercel's font — designed for developer dashboards, clean at 13px
- JetBrains Mono for data: tabular-nums, ligatures, clear 0/O/1/l distinction
- **Never** use more than 2 font families per view (anti-pattern #1)

### 2.2 Type Scale

| Level | Size | Weight | Class | Used For |
|-------|------|--------|-------|----------|
| Badge | 11px | 500 | `text-[11px] font-medium` | status badges, category pills |
| Meta | 12px | 400 | `text-xs text-zinc-500` | timestamps, secondary info |
| **Body** | 13px | 400 | `text-sm text-zinc-100` | **default body text** |
| Body+ | 14px | 400 | `text-sm` | stat values, card content |
| Card title | 13px | 600 | `text-sm font-semibold` | section headings within cards |
| Section h2 | 15px | 600 | `text-base font-semibold` | section titles |
| **Page title** | 18px | 600 | `text-lg font-semibold` | **ALL page h1 titles** |
| Display | 24-32px | 700 | var | timer values, hero score badges |

**Critical change**: Standardize ALL page titles to `text-lg font-semibold` (18px). Remove `text-3xl` (30px) and `text-4xl` (36px) heading variants. Dashboard timer keeps large display.

### 2.3 Line Heights

| Context | Line Height |
|---------|-------------|
| Body text | 1.5 |
| Headings | 1.2 |
| Code / Terminal | 1.6 |
| Data / Tabular | 1.4 |

### 2.4 Measure

- Max line width: 65ch for readability (`max-w-prose` or `max-w-[65ch]`)
- Code blocks: no max-width restriction

---

## 3. Spacing & Grid

### 3.1 Base Grid

```
Base unit:     4px
Tight:         4px    (icon padding, inline)
Component:     8px    (button padding, badge spacing)
Card padding:  16px   (GlassCard internal padding)  [changed from 24px]
Section gap:   24px   (between cards/sections)
Page sections: 32px   (major divisions)
```

### 3.2 Card Padding Standard

| Before | After |
|--------|-------|
| `p-6` (24px) | `p-5` (20px) — tighter for data density |
| `p-8` (32px) | `p-5` (20px) — was wasteful |
| `p-4` (16px) | `p-5` (20px) — standardize |

All card padding → **`p-5`** (20px). Data density at Density=7 demands less wasted space.

### 3.3 Density Zones

| Zone | Gap | Used For |
|------|-----|----------|
| High density | 4-8px | Terminal logs, data tables, code |
| Medium density | 12-16px | Forms, lists, session items |
| Standard | 20-24px | Cards, sections, page layout |

---

## 4. Border Radius

### 4.1 Radius Scale

| Token | Value | Used For |
|-------|-------|----------|
| `rounded-lg` | 8px | Buttons, inputs, tab pills, small cards |
| **`rounded-xl`** | **12px** | **ALL cards, modals, tab containers — MAXIMUM** |
| `rounded-2xl` | 16px | **NEVER — exceeds 12px limit** |
| `rounded-3xl` | 24px | **NEVER — consumer-grade, violates dev tool rule** |
| `rounded-full` | 9999px | Status dots, score circles |

### 4.2 Why 12px Max?

Per `ui-ux-pro-max` anti-pattern: *"Using consumer-grade rounded corners (> 12px) on serious tools"* — 12px (`rounded-xl`) is the ceiling for developer tools.

**Breaking change**: All 90+ instances of `rounded-3xl` → `rounded-xl`, all `p-6`/`p-8` → `p-5`.

---

## 5. Component Architecture

### 5.1 Standard Components (16 total)

| # | Component | Purpose | Replaces |
|---|-----------|---------|----------|
| 1 | `PageShell` | Unified page wrapper + entrance animation | 4 different page layout patterns |
| 2 | `StickyHeader` | `h-14` backdrop blur bar with title + actions | 3 different header patterns |
| 3 | `GlassCard` | Single card with 3 variants | 3 competing card styles |
| 4 | `SectionHeader` | Standard heading + icon + optional action | Inline heading patterns |
| 5 | `TabBar` | Pills tab navigation | 3 tab bar styles |
| 6 | `StatCard` | KPI metric display | Inline metric cards |
| 7 | `ChartContainer` | Chart.js wrapper + registration | 6 duplicated Chart.register() |
| 8 | `CategoryColors` | Single category→color mapping | 5 duplicated maps |
| 9 | `EmptyState` | Consistent "no data" placeholder | Inline empty states |
| 10 | `LoadingState` | Skeleton pattern (not just spinner) | Inline spinners |
| 11 | `ConfirmDialog` | Shared danger confirm modal | Inline confirm dialogs |
| 12 | `TerminalTab` | Colored tab for Terminal sidebar | 12 inline tab implementations |
| 13 | `SessionCard` | Session list item with status dot | Inline session items |
| 14 | `ModalOverlay` | Standardized modal with z-index | 4 modal card styles |
| 15 | `SystemCard` | Toggle card for context systems | 7 cards in ContextSidebar + Settings |
| 16 | `KnobSlider` | Design taste slider | 3 inline sliders |

### 5.2 GlassCard Variants

```tsx
// DEFAULT — standard card
<GlassCard>
  // bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5
  // hover:border-zinc-700/60 transition-colors duration-150
</GlassCard>

// ELEVATED — more visual weight (modals, hero cards)
<GlassCard variant="elevated">
  // bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-5
  // shadow-[0_0_30px_rgba(0,0,0,0.3)]
</GlassCard>

// INTERACTIVE — clickable cards with hover lift
<GlassCard variant="interactive">
  // DEFAULT + hover:border-accent-primary/30 + cursor-pointer
  // transition-all duration-150
</GlassCard>
```

### 5.3 TabBar

```tsx
// Pills pattern — Universal
<TabBar
  tabs={[
    { key: 'overview', label: 'Overview' },
    { key: 'ides', label: 'IDEs' },
  ]}
  activeKey={activeTab}
  onChange={setActiveTab}
/>

// Renders:
// <div className="bg-zinc-900/50 p-1 rounded-xl inline-flex">
//   <button className="px-4 py-2 rounded-lg text-sm font-medium
//     data-[active=true]:bg-zinc-800 data-[active=true]:text-white data-[active=true]:shadow-sm
//     data-[active=false]:text-zinc-400 data-[active=false]:hover:text-zinc-200"
//   />
// </div>
```

### 5.4 SectionHeader

```tsx
<SectionHeader
  title="Applications"
  icon={PieChart}
  accent="--page-accent"
  action={<button>...</button>}
/>

// Renders:
// <div className="flex items-center justify-between">
//   <div className="flex items-center gap-2.5">
//     <div className="w-9 h-9 rounded-lg bg-[var(--page-accent)]/15
//         flex items-center justify-center">
//       <PieChart className="w-4.5 h-4.5 text-[var(--page-accent)]" />
//     </div>
//     <h1 className="text-lg font-semibold">Applications</h1>
//   </div>
//   {action}
// </div>
```

---

## 6. Page Layouts

### 6.1 Pattern A — Inline Header (Stats, Browser, Productivity)

```tsx
<PageShell>
  <SectionHeader title="..." icon={...} />
  <div className="space-y-4">
    <GlassCard>...</GlassCard>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard>...</StatCard>
    </div>
  </div>
</PageShell>
```

### 6.2 Pattern B — Sticky Header + Tabs (IDE, Settings, Insights)

```tsx
<PageShell variant="sticky-header">
  <StickyHeader title="..." />
  <TabBar tabs={[...]} />
  <div className="p-5 space-y-4">
    {activeTab === '...' && <GlassCard>...</GlassCard>}
  </div>
</PageShell>
```

### 6.3 Pattern C — Sticky Header + Scroll (External, Database, Tutorial)

```tsx
<PageShell variant="sticky-header">
  <StickyHeader title="..." action={...} />
  <div className="flex-1 overflow-auto p-5 space-y-4">
    <GlassCard>...</GlassCard>
  </div>
</PageShell>
```

### 6.4 Pattern D — Dashboard (Special — Hero Layout)

```tsx
<PageShell variant="dashboard">
  {/* Always-visible timer — full-width hero */}
  <div className="relative">...</div>
  {/* Stat cards grid */}
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
    <StatCard>...</StatCard>
  </div>
  {/* Two-column layout for content */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <div className="lg:col-span-2 space-y-4">
      <GlassCard>Heatmap</GlassCard>
      <GlassCard>Weekly Overview</GlassCard>
    </div>
    <div className="space-y-4">
      <GlassCard>Top Apps</GlassCard>
      <GlassCard>Recent Sessions</GlassCard>
    </div>
  </div>
</PageShell>
```

### 6.5 PageShell Implementation

```tsx
// Unified wrapper — NO extra padding (padding comes from App.tsx p-8)
// Manages: entrance animation, background, scroll, max-width

<PageShell>
  // Wraps content in:
  // <motion.div
  //   initial={{ opacity: 0, y: 16 }}
  //   animate={{ opacity: 1, y: 0 }}
  //   transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
  //   className="space-y-6"
  // >
```

---

## 7. Motion Standards

### 7.1 Duration & Easing Table

| Event | Duration | Easing | Properties | Spring? |
|-------|----------|--------|------------|---------|
| Page entrance | 250ms | `cubic-bezier(0.16, 1, 0.3, 1)` | opacity 0→1, y: 16→0 | ❌ |
| Section entrance | 200ms | `cubic-bezier(0.16, 1, 0.3, 1)` | opacity 0→1, y: 8→0 | ❌ |
| Card hover | 150ms | `ease-out` | border-color only | ❌ |
| Button press | 100ms | `ease-out` | scale: 1→0.98 | ❌ |
| Modal open | 250ms | `ease-out` | opacity 0→1, scale 0.95→1 | ❌ |
| Modal close | 200ms | `ease-in` | opacity 1→0, scale 1→0.95 | ❌ |
| Tab switch | 200ms | `ease-out` | opacity crossfade | ❌ |
| Toast | 300ms | `ease-out` | y: -20→0 | ❌ |
| Sidebar nav | 200ms | `ease-out` | bg-color only | ❌ |
| Stagger grid | — | — | each item: delay × 50ms | ❌ |

### 7.2 CSS Animation Tokens

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in:  cubic-bezier(0.4, 0, 1, 1);
--fast:     150ms;
--normal:   250ms;
--slow:     400ms;
```

### 7.3 Removed Animations

| Removed | Why |
|---------|-----|
| `whileHover={{ x: 4 }}` on sidebar items | Too playful for productivity tool |
| Spring physics anywhere | No bounces in serious tools (ui-ux-pro-max) |
| `transition: all` | Specify exact properties |
| Layout property animation | Never width/height/top/left |

---

## 8. Accent Color Strategy

### 8.1 Rules

1. **One primary accent across all pages**: `--accent-primary: #ec4899` (pink-500)
2. **One secondary accent**: `--accent-secondary: #22d3ee` (cyan-400)
3. **Semantic colors**: success (emerald), warning (amber), error (red) — kept for meaning
4. **Max 3 accent colors per view** (impeccable anti-pattern #7)

### 8.2 Per-Page Accent Tint

Each page sets `--page-accent` — a single CSS variable override on the page wrapper. Affects only: active tab, focus ring, header icon, selected state borders.

| Page | `--page-accent` | Rationale |
|------|----------------|-----------|
| Dashboard | `var(--accent-primary)` pink | Brand default |
| Productivity | `var(--accent-primary)` pink | Brand default |
| Stats | `#22d3ee` cyan | Data/metrics — cool precision |
| Browser | `#38bdf8` sky-400 | Web activity — blue sky |
| IDE Projects | `#8b5cf6` violet-500 | Code — IDE purple |
| External | `#fbbf24` amber-400 | Timer — warm activity |
| Insights | `var(--accent-primary)` pink | Brand default |
| Database | `#a78bfa` violet-400 | Data — neutral authority |
| Settings | `#22d3ee` cyan-400 | Config — cool clarity |
| Tutorial | `#34d399` emerald-400 | Learning — positive growth |

### 8.3 Exception — Terminal 12 Tabs

The Terminal sidebar has 12 tabs with distinct colors serving as navigation landmarks. These **keep** their colors but implement consistently:

```tsx
// Each tab sets --tab-accent
// Implementation: simple border-b-2 (NO glow shadows)
// Active: border-[var(--tab-accent)] + text-[var(--tab-accent)]
// Inactive: text-zinc-400 hover:text-zinc-200

colorMap: {
  presets:   #22c55e,   // green
  sessions:  #22c55e,   // green
  map:       #22c55e,   // green
  analytics: #22c55e,   // green
  issues:    #34d399,   // emerald
  files:     #eab308,   // yellow
  skills:    #6366f1,   // indigo
  design:    #ec4899,   // pink ← aligns with brand
  configs:   #f97316,   // orange
  history:   #f43f5e,   // rose
  context:   #f59e0b,   // amber
  maintenance: #a855f7, // violet
}
```

**Removed**: `shadow-[0_0_6px_rgba(...)]` glow effects — too noisy. Simple border + text color only.

### 8.4 Exception — Session Categories

Keep 6 category colors (they serve semantic function):

| Category | Color | bg/text |
|----------|-------|---------|
| Bug Fix | red | `bg-red-500/15 text-red-300` |
| Feature | blue | `bg-blue-500/15 text-blue-300` |
| Refactor | purple | `bg-purple-500/15 text-purple-300` |
| Research | teal | `bg-teal-500/15 text-teal-300` |
| Review | amber | `bg-amber-500/15 text-amber-300` |
| Other | zinc | `bg-zinc-500/15 text-zinc-400` |

---

## 9. Z-Index Scale

### 9.1 Standardized Levels

| Level | Value | Used For |
|-------|-------|----------|
| `--z-base` | 0 | Page content |
| `--z-elevated` | 10 | Elevated cards, sticky headers |
| `--z-dropdown` | 20 | Dropdowns, tooltips, popovers |
| `--z-modal` | 30 | Modals, dialogs |
| `--z-toast` | 40 | Toasts, notifications |
| `--z-overlay` | 50 | Backdrops, overlays |
| `--z-max` | 100 | AfkPromptModal (critical priority) |

**Changes from current**:
- All `z-50` for modals preserved (maps to `--z-modal`)
- All `z-[60]`, `z-[65]`, `z-[70]`, `z-[100]` → use scale values
- `z-[9999]` (AfkPromptModal) → `100`
- `z-[2147483647]` (ColorPicker portal) → `--z-max`
- Remove all arbitrary z-index values

---

## 10. Modal Standardization

### 10.1 Single Modal Pattern

```tsx
// OVERLAY (always the same)
<div className="fixed inset-0 bg-black/70 backdrop-blur-sm"
     style={{ zIndex: 'var(--z-overlay)' }}
     onClick={onClose}>
</div>

// CARD (always the same)
<div className="bg-zinc-900/95 backdrop-blur-xl
            border border-zinc-700/50
            rounded-xl p-5
            w-full max-w-[480px] max-h-[85vh] overflow-y-auto
            shadow-[0_0_30px_rgba(0,0,0,0.3)]"
     onClick={e => e.stopPropagation()}>

  {/* Header with icon */}
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 rounded-lg
                bg-[var(--page-accent)]/15
                flex items-center justify-center">
      <Icon className="w-4.5 h-4.5 text-[var(--page-accent)]" />
    </div>
    <h2 className="text-sm font-semibold">Title</h2>
  </div>

  {/* Content */}
  <div className="space-y-3">
    {children}
  </div>

  {/* Actions */}
  <div className="flex justify-end gap-2 mt-5">
    <button className="px-3 py-1.5 text-xs text-zinc-400
                       hover:text-white transition-colors"
            onClick={onCancel}>
      Cancel
    </button>
    <button className="px-3 py-1.5 text-xs rounded-lg font-medium
                       bg-[var(--page-accent)]/20 text-[var(--page-accent)]
                       hover:bg-[var(--page-accent)]/30 transition-colors"
            onClick={onConfirm}>
      Confirm
    </button>
  </div>
</div>
```

### 10.2 Motion for Modals

```tsx
// Entrance
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.95 }}
transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
```

---

## 11. Sidebar

### 11.1 Visual Spec

```
Width:             w-64 (256px)
Border:            border-r border-zinc-800
Background:        glass (bg-zinc-900/80 backdrop-blur-xl)
```

### 11.2 Logo

```
Container: w-9 h-9 rounded-xl
Gradient:  from-[var(--accent-primary)] to-rose-500  [WAS: from-indigo-500 to-emerald-500]
Icon:      Zap, white
Brand:     "DeskFlow" + "AI TRACKER" subtitle
```

### 11.3 Navigation Items

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Active | `bg-[var(--page-accent)]/10` | `text-[var(--page-accent)]` | `border-r-2 border-[var(--page-accent)]` |
| Hover | `bg-zinc-800/50` | `text-zinc-200` | none |
| Inactive | transparent | `text-zinc-400` | none |

```
Item layout: w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
Motion:      transition-colors duration-200 ease-out  [REMOVED: whileHover={{ x: 4 }}]
```

### 11.4 Footer

```
Text: "Local SQLite • Zero Cloud • Privacy-First"
Style: text-[10px] text-zinc-600 text-center
Padding: p-6 border-t border-zinc-800
```

---

## 12. Top Bar

### 12.1 Standard Mode (non-terminal routes)

```
Container: h-14 border-b border-zinc-800 flex items-center justify-between
           px-6 bg-zinc-950/80 backdrop-blur-xl
```

**Controls**:
| Control | Style |
|---------|-------|
| Mode pills | `bg-zinc-900 rounded-full p-1` — Focus (`var(--page-accent)`/10 bg, `var(--page-accent)` text), Total (cyan-500/10, cyan-400 text) |
| Period selector | `bg-zinc-900 rounded-full p-1 text-xs` |
| Timeline arrows | `p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700` |
| Clock | `text-sm font-mono tabular-nums` |
| Tracking toggle | Active: `bg-[var(--page-accent)]/10 text-[var(--page-accent)]`, Paused: `bg-emerald-500/10 text-emerald-400` |

### 12.2 Terminal Mode

Same container style as standard mode (no gradient background). Project selector + controls in same bar.

| Element | Style |
|---------|-------|
| Project select | `bg-zinc-800 border border-zinc-700 rounded text-xs` |
| Open Terminal | `bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-xs rounded` [WAS: `from-cyan-600 to-teal-600`] |
| Binding indicator | `bg-zinc-800/50 border border-zinc-700/30 rounded text-xs` |

---

## 13. Terminal Workspace

### 13.1 Terminal Sidebar (Right Panel, 12 Tabs)

```
Container: border-l border-zinc-800 bg-zinc-950/90
Width:     w-64 (when open)
Toggle:    PanelLeftClose / PanelLeft buttons
```

**Tab bar**:
```
Container: flex border-b border-zinc-800 flex-wrap
Tabs:      12 items with per-tab color (see 8.3)
Active:    border-b-2 border-[var(--tab-accent)] text-[var(--tab-accent)]
Inactive:  text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50
Style:     px-2 py-2 text-xs font-medium
```
REMOVED: `shadow-[0_0_6px_rgba(...)]` glow on active tabs.

### 13.2 Terminal Header (Main Area)

```
Container: bg-zinc-950 border-b border-zinc-800/60
           [WAS: bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-950]
Content:   Project selector, Open Terminal button, status indicator, binding controls
Action:    bg-[var(--accent-primary)] [WAS: from-cyan-600 to-teal-600]
```

### 13.3 TerminalWindow

```
Split handle: bg-zinc-800 hover:bg-[var(--page-accent)] transition-colors duration-150
              [WAS: hover:bg-green-600]
Tab bar:      flex items-center bg-zinc-900/80
```

### 13.4 Session Detail Card

```
Container: bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/60 rounded-xl p-4
Accent:    left border — 0.5px w-[var(--page-accent)] gradient
           [WAS: cyan gradient border, cyan buttons, cyan pulse dots]
Button:    bg-[var(--accent-primary)]/80 hover:bg-[var(--accent-primary)]
           [WAS: from-cyan-600 to-teal-600]
```

---

## 14. Animation Anti-Patterns

### 14.1 Never Do These

| Anti-pattern | Bad | Good |
|-------------|-----|------|
| Animate layout | `animate={{ width, height }}` | `animate={{ opacity, scale, y }}` |
| `transition: all` | `transition: all 0.3s` | `transition-colors duration-150` |
| Spring in tools | `type: 'spring', bounce: 0.25` | `ease: [0.16, 1, 0.3, 1]` |
| Duration >500ms | `duration: 0.6` | `duration: 0.25` (max: 0.4) |
| Sidebar slide | `whileHover={{ x: 4 }}` | `transition-colors` only |
| font-thin on dark | `font-thin` (100) | `font-normal` (400) minimum |
| opacity for hierarchy | `opacity-50` on text | `text-zinc-500` token |
| box-shadow elevation | `shadow-lg` on dark | `border` brightness |

### 14.2 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 15. Full UI Surface Inventory

### 15.1 Components Categorized

```
ROOT SHELL
├── App.tsx
│   ├── Sidebar (10 nav items + logo + footer)
│   ├── Top Bar (standard + terminal variants)
│   ├── Route transitions (AnimatePresence mode="sync")
│   └── 5 App-level modals (Unsaved, Sleep, Export, DB, Summary)
│
├── SIDEBAR PAGES (10)
│   ├── Dashboard        — hero timer + 5 stats + heatmap + weekly overview + orbit
│   ├── Productivity     — score badge + tier grid + breakdown + trends
│   ├── Stats            — app list + category chart + hourly chart + session edit
│   ├── Browser Activity — domain cards + category pie + hourly + log
│   ├── IDE Projects     — 7 tabs (Overview/IDEs/Tools/Projects/AI/Git/Trash)
│   ├── External         — timer + activity grid + sleep + stats + 7 modals
│   ├── Insights         — 3 tabs (Day/Weekly/Activities) + stat cards + heatmap
│   ├── Database         — table list + data view + search + schema + CSV export
│   ├── Settings         — 5 tabs (Category/Colors/General/Tracking/Prompts)
│   └── Tutorial         — feature card grid + category filters + progress
│
├── STANDALONE PAGES (3)
│   ├── TerminalPage     — 5235 lines, 12-tab sidebar + terminal split panes + header
│   ├── IDEHelpPage      — accordion help with indigo accent
│   └── DesignWorkspacePage — TasteKnobs + StyleReferences + ColorPicker (embedded)
│
└── SHARED COMPONENTS (42)
    ├── TerminalWindow    — split pane engine, TabBar
    ├── NewSessionDialog  — setup/init system toggles
    ├── SessionEditDialog — session metadata editor
    ├── ContextSidebar    — 7 system cards + 3 knobs + tab switcher
    ├── InstructionPanel  — problem/request instructions
    ├── IssuesWorkspace   — 4 inline modals (ProblemDetail, RequestDetail, NewProblem, NewRequest)
    ├── PromptDesignDialog+PromptHistoryTab
    ├── InitializeProgressModal — 16 steps with grouped directories + error retry
    ├── WorkspaceSettingsDialog — toggle systems + token budgets
    ├── TutorialOverlay   — z-[100] ring spotlight
    ├── AfkPromptModal    — z-[100] highest priority overlay
    ├── GeneralistDialog  — AI agent skill selector
    ├── RoutingDisambiguationDialog+RoutingToast
    ├── AnalyticsDashboard — charts + metrics (3 variants: project/workspace/full)
    ├── OrbitSystem       — 3D Three.js + controls overlay
    ├── DayDetailPopup+DayGanttChart — 3 AnimatePresence blocks
    ├── DurationPicker+BasicMarkdownViewer
    ├── MapEditor+TerminalMiniMap
    ├── CategoryBadge     — color-coded session category badge
    ├── StatusDot         — status indicator (active/idle/completed/error/cancelled)
    ├── SkillWidgetFactory — maps SKILL.md frontmatter → React components (10 widget types)
    ├── CrossSyncConfigCard — Configs tab controls for cross-session sync
    ├── ProblemsTab+RequestsTab — inline tab components with glass cards + inline edit
    ├── SkillsTab         — inline CRUD with expandable cards, category filter, Use Skill flow
    ├── FilesTab          — agent/ directory browser with pulse notification
    ├── PromptDesignDialog — generate-prompt skill workflow (read-only prompt.md + RESULT.md)
    ├── context-ui/* (6)  — ActiveContextsList, CompactionsPanel, ContextSearchBar,
    │                        MemoryStatusCard, RecentChatHistory, SettingsPanel
    ├── workspace/* (5)   — TasteKnobs, StyleReferences, DesignComposeOutlet,
    │                        StyleDescription, ColorPicker
    ├── Sleep tracking: PastSleepModal, Sleep Trends Chart (floating range bars)
    ├── Focus Sessions: min duration slider, idle detection, stopwatch pauses
    └── Live Detection Panel — 50-event ring buffer, terminal-style dark panel, global persistence
```

### 15.2 Total CSS Variables to Define (in `src/index.css`)

```css
@import "tailwindcss";

:root {
  /* Base layers */
  --bg-primary: #09090b;
  --bg-secondary: #18181b;
  --bg-tertiary: #27272a;
  --bg-glass: rgba(24, 24, 27, 0.8);

  /* Text */
  --text-primary: #f4f4f5;
  --text-secondary: #a1a1aa;
  --text-muted: #52525b;

  /* Accent */
  --accent-primary: #ec4899;
  --accent-hover: #db2777;
  --accent-primary-10: rgba(236, 72, 153, 0.10);
  --accent-primary-20: rgba(236, 72, 153, 0.20);
  --accent-primary-30: rgba(236, 72, 153, 0.30);
  --accent-secondary: #22d3ee;
  --accent-secondary-10: rgba(34, 211, 238, 0.10);
  --accent-secondary-20: rgba(34, 211, 238, 0.20);
  --accent-secondary-hover: #06b6d4;

  /* Semantic */
  --success: #34d399;
  --warning: #fbbf24;
  --error: #f87171;

  /* Borders */
  --border-subtle: #27272a;
  --border-active: #3f3f46;
  --border-glass: rgba(63, 63, 70, 0.5);

  /* Z-index */
  --z-base: 0;
  --z-elevated: 10;
  --z-dropdown: 20;
  --z-modal: 30;
  --z-toast: 40;
  --z-overlay: 50;
  --z-max: 100;

  /* Animation */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --fast: 150ms;
  --normal: 250ms;
  --slow: 400ms;

  /* Per-page accent (override per page) */
  --page-accent: var(--accent-primary);
}

body {
  font-family: "Geist", system-ui, -apple-system, sans-serif;
  font-size: 13px;
  background: var(--bg-primary);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Glass utility */
.glass {
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass);
}

/* Hide scrollbar */
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
```

### 15.3 Migration Order

| Phase | Effort | Impact | Files | Description |
|-------|--------|--------|-------|-------------|
| **1** | Medium | High | 1 | CSS variables + index.css (foundation) |
| **2** | Medium | High | 16 | Create all 16 shared components |
| **3** | Large | Highest | 10 | Apply GlassCard + PageShell + SectionHeader to all pages |
| **4** | Large | High | 1 | App.tsx (sidebar + top bar accents) |
| **5** | Medium | High | 2 | TerminalPage + TerminalWindow (sidebar tabs + header) |
| **6** | Medium | Medium | 2 | ExternalPage + DashboardPage (inline styles → tokens) |
| **7** | Small | Medium | 15 | Overlay/modals standardization |
| **8** | Small | Medium | 10 | ChartContainer + CategoryColors consolidation |
| **9** | Small | Low | 1 | Remove spring physics + standardize motion |
| **10** | Tiny | Medium | 2 | Logo gradient + brand colors in non-component files |

---

## 16. Architecture Blueprints

### 16.1 Cross-Session Context Sync

**Purpose:** Allow multiple AI agent terminals to coordinate file edits without overwriting each other.

**Components:**
- **File Lock Manager** — In-memory `Map<string, LockEntry>` (lock holder + timestamp + TTL)
- **Conflict Detection** — `detectEditsInOutput()` scans agent output for file write patterns
- **7 IPC Handlers:** `lock-file`, `release-file-lock`, `get-file-locks`, `get-locks-for-terminal`, `get-touched-files`, `compile-sync-summary`, `broadcast-context-delta`
- **UI:** Configs tab controls (master toggle, TTL slider, broadcast toggle, conflict mode dropdown, /sync toggle)
- **Resolution:** 12-step conflict resolution protocol with auto-merge on compatible changes

**Data Flow:**
1. Agent writes to file → output scanned for `edit_file` / `write` patterns
2. Lock acquired → touched_files table updated
3. Context broadcast event emitted to all terminals
4. Other terminals receive delta, refresh context
5. On lock conflict → toast notification + conflict mode resolution

### 16.2 Skill DSL System

**Purpose:** Dynamic UI generation from SKILL.md YAML frontmatter.

**Widget Types (10):**
| Widget | Input Type | Example Frontmatter |
|--------|-----------|-------------------|
| select | Dropdown | `- type: select; options: [a, b]` |
| radio | Radio group | `- type: radio; options: [x, y]` |
| switch | Toggle | `- type: switch; default: true` |
| slider | Range | `- type: slider; min: 0; max: 10` |
| text | Text input | `- type: text; placeholder: "..."` |
| textarea | Multi-line | `- type: textarea; rows: 5` |
| code | Code editor | `- type: code; language: python` |
| file | File picker | `- type: file; accept: .md` |
| checkbox | Checkbox group | `- type: checkbox; options: [a, b]` |
| tags | Tag input | `- type: tags; suggestion: [x, y]` |

**Architecture:**
- `SkillWidgetFactory` — Maps frontmatter `type` → React component
- `GeneralistDialog` — Filterable grid dialog with search + category filter
- `SkillsTab` — Inline CRUD with expandable cards, category filter pills, search
- **Groups:** Hierarchical widget grouping with layout directives (row/column/tabs)

### 16.3 InitializeProgressModal

**Purpose:** Scaffold agent directory structure with visual progress feedback.

**States:** pending → processing → done | error

**Layout:**
```
┌─────────────────────────────────────┐
│ ⚡ Initialize Workspace              │
│ ─────────────────────────────────── │
│ 📁 agent/ (13/13)          ████████ │
│   ├── AGENTS.md            ✅ agent │
│   ├── state.md             ✅ agent │
│   └── ...                  ✅ agent │
│ 📁 agent/skills/ (2/2)     ████████ │
│ 📁 graphify-out/ (1/1)     ████████ │
│ ─────────────────────────────────── │
│ ● Workspace Ready!                  │
│   16 files · 3 directories          │
└─────────────────────────────────────┘
```

**Key behaviors:**
- Grouped by directory with per-group counters
- Expandable file previews (click row to reveal content with AnimatePresence)
- Error retry: single Retry button restarts from scratch
- Re-init safety: full state reset on remount (no stale state)

### 16.4 Analytics Dashboard

**Purpose:** Unified AI usage analytics across Project, Workspace, and Full contexts.

**Variants:**
| Variant | Scope | Used In |
|---------|-------|---------|
| `project` | Current project only | Terminal Analytics tab |
| `workspace` | Workspace-wide AI usage | IDE Projects Analytics tab |
| `full` | All data | Database Analytics |

**Components:**
- 5 stat cards: Total tokens, Total cost, Session count, (per variant)
- 8 charts: Token distribution, Cost distribution, Session count by agent, Category distribution, Problem distribution, Request distribution, Response timing, Daily trend
- `Promise.allSettled` — Each data source fetched independently (no cascade failures)

### 16.5 Context Management System

**Purpose:** Persistent AI memory management across sessions.

**6 Knowledge Systems:**
| System | Toggle | Description |
|--------|--------|-------------|
| Graphify | switch | Code architecture graph |
| LLM Wiki | switch | AI-optimized markdown |
| Obsidian | switch | Vault frontmatter |
| PARA | switch | Directory structure |
| QMD | switch | Quarto templates |
| Skills | switch | SKILL.md directories |

**UI Components:**
- `MemoryStatusCard` — Token usage visualization
- `ActiveContextsList` — System cards with per-system toggles
- `RecentChatHistory` — Recent messages with management
- `CompactionsPanel` — Monthly summary management
- `ContextSearchBar` — Semantic + full-text search
- `SettingsPanel` — Auto-compaction, RAG mode, token budget
- **SVG Context Map** — Visual representation of active knowledge sources
- **Token Budget Bar** — Configurable token allocation per system

### 16.6 Session Categorization System

**Purpose:** Auto-categorize and manage AI agent sessions.

**Categories:** feature, bug-fix, research, code-review, refactor, devops, docs, other

**Statuses:** active, idle, completed, error, cancelled

**Components:**
- `CategoryBadge` — Color-coded badge per category
- `StatusDot` — Pulsing/green/yellow/red indicator per status
- `@mention routing` — Dropdown on `@` in Send bar, arrow key nav, Enter to send
- **AI Metadata Contract** — AGENTS.md template with Session Metadata Requirements section

**Auto-analysis:** Keyword scoring fallback when AI doesn't provide metadata.

### 16.7 Agent Readiness Protocol

**Purpose:** Lifecycle management for AI agent terminals.

**State Machine:**
```
spawning → waiting → ready | timeout
```

**Phases:**
| Phase | What Happens | UI Indicator |
|-------|-------------|-------------|
| Spawning | PTY process created, shell starts | Cyan overlay |
| Waiting | Detecting agent signature in output | Amber overlay |
| Ready | Agent signature matched, ready for input | Green status |
| Timeout | 30s elapsed, no agent detected | Red overlay + fallback |

**Agent Signatures (5):**
- OpenCode: `opencode` pattern match
- Claude Code: `claude` pattern match
- Codex: `codex` pattern match
- Aider: `aider` pattern match
- Cursor: `cursor` pattern match

**Supporting systems:**
- Message queue — Instructions sent before agent is ready buffered, flushed after system prompt
- Input buffer — Keystrokes before PTY is ready buffered, flushed on `terminal:ready`
- Startup delay guard — 3s before agent signature checking
- Auto-recovery — `retry-agent-init` handler for failed initialization
