# Full Frontend Revamp Plan

**Status:** Ready for implementation  
**Base spec:** `agent/docs/DESIGN_SYSTEM.md` (1048 lines, 17 sections)  
**Phases:** 10 (per DESIGN_SYSTEM.md §15.3) + 1 retro-fit phase for recent features  
**Total estimated changes:** ~90+ files touched, ~15,000+ lines changed  

---

## Phase 0: Inventory & Audit

Before touching anything, catalog every deviation from DESIGN_SYSTEM.md.

### What to scan for:

| Pattern | DESIGN_SYSTEM.md target | Current code |
|---------|------------------------|--------------|
| `rounded-3xl` | `rounded-xl` (12px max) | ~90+ instances across all pages |
| `p-6`, `p-8` | `p-5` (20px standard) | ~60+ instances |
| `shadow-lg`, `shadow-xl`, `shadow-2xl` | No shadow elevation (use border brightness) | ~30+ instances |
| `from-* to-*` gradient buttons | `bg-[var(--accent-primary)]` | ~20+ instances in Terminal, Dashboard |
| `text-3xl`, `text-4xl` headings | `text-lg font-semibold` (18px) | ~15+ instances |
| `transition: all` | Specific properties only | ~10+ instances |
| `type: 'spring'` / spring physics | No springs — cubic-bezier only | ~8 instances |
| `whileHover={{ x: 4 }}` | `transition-colors` only | Sidebar nav items |
| `z-[60]`, `z-[70]`, `z-[100]`, `z-[9999]` | Use `var(--z-*)` scale | ~5 instances |
| Cyan/emerald brand accent | Pink `#ec4899` (`--accent-primary`) | Everywhere |
| Inline `Chart.register()` | Shared `ChartContainer` | 6+ duplicates |

### Audit checklist:

- [ ] Scan all `.tsx` files for `rounded-3xl` → count instances per file
- [ ] Scan for `shadow-lg` / `shadow-xl` / `shadow-2xl`
- [ ] Scan for `text-3xl` / `text-4xl` (non-timer contexts)
- [ ] Scan for `p-6` / `p-8` padding
- [ ] Scan for spring motion (`type: 'spring'`, `bounce:`)
- [ ] Scan for gradient buttons (`from-`, `to-`)
- [ ] Scan for inline `Chart.register()` calls
- [ ] Scan for CSS variable `--page-accent` usage (currently 0 — needs to be set per page)
- [ ] Scan for `z-[` arbitrary values

---

## Phase 1: CSS Foundation (1 file)

**Effort:** Medium | **Impact:** High | **File:** `src/index.css`

### Tasks:
- [ ] Add all CSS custom properties from DESIGN_SYSTEM.md §15.2
- [ ] Set `body { font-family: "Geist"...; font-size: 13px; }`
- [ ] Add `.glass` utility class
- [ ] Add reduced motion media query
- [ ] Add `.hide-scrollbar` utility
- [ ] Verify `@import "tailwindcss"` (v4) is preserved — DO NOT change to v3 directives
- [ ] Verify no `@tailwind base/components/utilities` v3 syntax is introduced

### Deliverable:
```css
:root {
  --bg-primary: #09090b;
  --bg-secondary: #18181b;
  --bg-tertiary: #27272a;
  --bg-glass: rgba(24, 24, 27, 0.8);
  --text-primary: #f4f4f5;
  --text-secondary: #a1a1aa;
  --text-muted: #52525b;
  --accent-primary: #ec4899;
  --accent-hover: #db2777;
  --accent-secondary: #22d3ee;
  --success: #34d399;
  --warning: #fbbf24;
  --error: #f87171;
  --border-subtle: #27272a;
  --border-active: #3f3f46;
  --border-glass: rgba(63, 63, 70, 0.5);
  --z-base: 0; --z-elevated: 10; --z-dropdown: 20;
  --z-modal: 30; --z-toast: 40; --z-overlay: 50; --z-max: 100;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --fast: 150ms; --normal: 250ms; --slow: 400ms;
  --page-accent: var(--accent-primary);
}
```

---

## Phase 2: Create 16 Shared Components (16 new files)

**Effort:** Medium | **Impact:** High | **New components** in `src/components/`

| # | Component | File | Variants | Lines |
|---|-----------|------|----------|-------|
| 1 | `PageShell` | `PageShell.tsx` | default, sticky-header, dashboard | ~80 |
| 2 | `StickyHeader` | `StickyHeader.tsx` | — | ~50 |
| 3 | `GlassCard` | `GlassCard.tsx` | default, elevated, interactive | ~60 |
| 4 | `SectionHeader` | `SectionHeader.tsx` | — | ~40 |
| 5 | `TabBar` | `TabBar.tsx` | pills (default) | ~50 |
| 6 | `StatCard` | `StatCard.tsx` | — | ~40 |
| 7 | `ChartContainer` | `ChartContainer.tsx` | wraps Chart.js + register | ~30 |
| 8 | `CategoryColors` | `CategoryColors.tsx` | single source of truth | ~40 |
| 9 | `EmptyState` | `EmptyState.tsx` | icon + title + description | ~30 |
| 10 | `LoadingState` | `LoadingState.tsx` | skeleton lines pattern | ~40 |
| 11 | `ConfirmDialog` | `ConfirmDialog.tsx` | danger confirm | ~50 |
| 12 | `TerminalTab` | `TerminalTab.tsx` | colored tab for sidebar | ~40 |
| 13 | `SessionCard` | `SessionCard.tsx` | status dot + metadata | ~50 |
| 14 | `ModalOverlay` | `ModalOverlay.tsx` | standardized modal | ~60 |
| 15 | `SystemCard` | `SystemCard.tsx` | toggle + description | ~40 |
| 16 | `KnobSlider` | `KnobSlider.tsx` | range slider + label | ~40 |

### Design rules for all components:
- Must accept `className` prop for override
- Must use CSS variables (not hardcoded colors)
- Must use `rounded-xl` (never `rounded-2xl` or `rounded-3xl`)
- Must use `p-5` (never `p-6` or `p-8`)
- Must use `transition-colors duration-150` (never `transition: all`)
- No spring physics — only `cubic-bezier(0.16, 1, 0.3, 1)` easing

### GlassCard templates:
```tsx
// DEFAULT:
<div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5 hover:border-zinc-700/60 transition-colors duration-150">

// ELEVATED (modals, hero):
<div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-5 shadow-[0_0_30px_rgba(0,0,0,0.3)]">

// INTERACTIVE (clickable):
<div className="... hover:border-[var(--accent-primary)]/30 cursor-pointer transition-all duration-150">
```

---

## Phase 3: Apply Components to All Pages (10 pages)

**Effort:** Large | **Impact:** Highest | **Files:** 10 page components + their children

### Pages to convert (in order):

| Order | Page | Pattern | Special notes |
|-------|------|---------|---------------|
| 1 | `Tutorial` | A (inline header) | Easiest — simple card grid |
| 2 | `Database` | C (sticky header + scroll) | Table view + analytics view |
| 3 | `Browser Activity` | A (inline header) | Domain cards + category pie |
| 4 | `Productivity` | A (inline header) | Score badge + trend chart |
| 5 | `Stats` | A (inline header) | App list + category chart |
| 6 | `Settings` | B (sticky header + tabs) | 5 tab sections |
| 7 | `Insights` | B (sticky header + tabs) | 3 tabs + heatmap |
| 8 | `External` | C (sticky header + scroll) | Timer + activity grid + 7 modals |
| 9 | `IDE Projects` | B (sticky header + tabs) | 7 tabs + workspace overlay |
| 10 | `Dashboard` | D (special hero layout) | Timer + stats + heatmap + orbit |

### Per-page conversion checklist:
- [ ] Replace page wrapper with `<PageShell>`
- [ ] Replace page title with `<SectionHeader>`
- [ ] Replace all inline cards with `<GlassCard>`
- [ ] Replace all stat/metric displays with `<StatCard>`
- [ ] Replace all tab bars with `<TabBar>`
- [ ] Replace all empty states with `<EmptyState>`
- [ ] Replace all loading spinners with `<LoadingState>`
- [ ] Replace all inline modal overlays with `<ModalOverlay>`
- [ ] Replace all session list items with `<SessionCard>`
- [ ] Set `--page-accent` on page wrapper (see §8.2 color map)
- [ ] Set page entrance animation via PageShell

### Accent color map (per page):
| Page | `--page-accent` value |
|------|----------------------|
| Dashboard | `var(--accent-primary)` |
| Productivity | `var(--accent-primary)` |
| Stats | `#22d3ee` (cyan) |
| Browser | `#38bdf8` (sky) |
| IDE Projects | `#8b5cf6` (violet) |
| External | `#fbbf24` (amber) |
| Insights | `var(--accent-primary)` |
| Database | `#a78bfa` (violet) |
| Settings | `#22d3ee` (cyan) |
| Tutorial | `#34d399` (emerald) |

---

## Phase 4: App.tsx — Sidebar + Top Bar (1 file)

**Effort:** Large | **Impact:** High | **File:** `src/App.tsx`

### Tasks:
- [ ] **Sidebar logo**: Change gradient `from-indigo-500 to-emerald-500` → `from-[var(--accent-primary)] to-rose-500`
- [ ] **Nav items**: Change active state to use `--page-accent` at 10% background, `border-r-2 border-[var(--page-accent)]`
- [ ] **Nav items**: Remove `whileHover={{ x: 4 }}` — use `transition-colors duration-200` only
- [ ] **Nav items**: Add `hover:bg-zinc-800/50` state
- [ ] **Top bar**: Apply standard styling — `h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl`
- [ ] **Mode pills**: Replace gradient buttons with pill pattern (`bg-zinc-900 rounded-full p-1`)
- [ ] **Tracking toggle**: Active → `bg-[var(--page-accent)]/10 text-[var(--page-accent)]`, Paused → `bg-emerald-500/10 text-emerald-400`
- [ ] **Timeline arrows**: `p-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700`
- [ ] **Period selector**: `bg-zinc-900 rounded-full p-1 text-xs`
- [ ] **Open Terminal button**: Change `from-cyan-600 to-teal-600` → `bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)]`
- [ ] Add route transitions: `<AnimatePresence mode="sync">` with PageShell page entrance
- [ ] Set `page-accent` dynamic variable based on current route
- [ ] **Footer**: Update to "Local SQLite • Zero Cloud • Privacy-First" in `text-[10px] text-zinc-600 text-center`

---

## Phase 5: Terminal Workspace (2 files)

**Effort:** Medium | **Impact:** High | **Files:** `src/pages/TerminalPage.tsx`, `src/components/TerminalWindow.tsx`

### Tasks for TerminalPage.tsx:
- [ ] Sidebar container: `border-l border-zinc-800 bg-zinc-950/90`
- [ ] Tab bar: Remove `shadow-[0_0_6px_rgba(...)]` glow on active tabs — use `border-b-2 border-[var(--tab-accent)] text-[var(--tab-accent)]`
- [ ] Inactive tabs: `text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50`
- [ ] Header: Remove `bg-gradient-to-r from-zinc-900...` → `bg-zinc-950 border-b border-zinc-800/60`
- [ ] New Agent / Initialize buttons: `bg-[var(--accent-primary)]` instead of cyan gradient
- [ ] Session detail card: Left border gradient accent, pink buttons instead of cyan
- [ ] Cross-session sync cards: Already uses amber (correct per spec) — verify border/tokens match
- [ ] Live Context Viewer: Already uses amber — verify border/tokens match
- [ ] Lock badges on terminal tabs: Already uses amber-400 — verify

### Tasks for TerminalWindow.tsx:
- [ ] Split handle: `hover:bg-zinc-800` → `hover:bg-[var(--page-accent)]`
- [ ] Tab bar: Remove gradient, use `bg-zinc-900/80`
- [ ] Verify all terminal-related accent colors use pink `--accent-primary`

---

## Phase 6: Inline Styles → Tokens (2 files)

**Effort:** Medium | **Impact:** Medium | **Files:** `src/pages/DashboardPage.tsx`, `src/pages/ExternalPage.tsx`

### DashboardPage.tsx:
- [ ] Hero timer: Verify display font size (DESIGN_SYSTEM §2.2 — keeps large display)
- [ ] Stat cards: Replace with `<StatCard>` component
- [ ] Heatmap card: Wrap in `<GlassCard>`
- [ ] Weekly overview: Wrap in `<GlassCard>`
- [ ] Recent sessions: Wrap in `<GlassCard>`, use `<SessionCard>` for items
- [ ] All `rounded-3xl` → `rounded-xl`
- [ ] All `p-6`/`p-8` → `p-5`
- [ ] All inline card patterns → `<GlassCard>`

### ExternalPage.tsx:
- [ ] Activity grid: Wrap cards in `<GlassCard variant="interactive">`
- [ ] Timer display: Keep large display font, wrap in GlassCard
- [ ] Sleep chart: Wrap in GlassCard
- [ ] Stats section: Use StatCard grid
- [ ] 7 modals: Replace with `<ModalOverlay>`
- [ ] All `rounded-3xl` → `rounded-xl`
- [ ] All `p-6`/`p-8` → `p-5`

---

## Phase 7: Modal Standardization (15 modals)

**Effort:** Small | **Impact:** Medium | **Files:** All inline modal implementations

### Modals to standardize:

| Modal | Current file | Pattern |
|-------|-------------|---------|
| `AfkPromptModal` | `src/components/AfkPromptModal.tsx` | z-[100] → `var(--z-max)` |
| `PastSleepModal` | `src/pages/ExternalPage.tsx` | Inline → ModalOverlay |
| `ActivitySelectionModal` | `src/pages/ExternalPage.tsx` | Inline → ModalOverlay |
| `ColorPicker` | `src/components/workspace/ColorPicker.tsx` | z-[2147483647] → `var(--z-max)` |
| `ProblemDetailModal` | `src/components/IssuesWorkspace.tsx` | Inline → ModalOverlay |
| `RequestDetailModal` | `src/components/IssuesWorkspace.tsx` | Inline → ModalOverlay |
| `NewProblemModal` | `src/components/IssuesWorkspace.tsx` | Inline → ModalOverlay |
| `NewRequestModal` | `src/components/IssuesWorkspace.tsx` | Inline → ModalOverlay |
| `NewSessionDialog` | `src/components/NewSessionDialog.tsx` | Verify z-index |
| `SessionEditDialog` | `src/components/SessionEditDialog.tsx` | Verify z-index |
| `WorkspaceSettingsDialog` | `src/components/WorkspaceSettingsDialog.tsx` | Verify z-index |
| `InitializeProgressModal` | `src/components/InitializeProgressModal.tsx` | Verify z-index |
| `GeneralistDialog` | `src/components/GeneralistDialog.tsx` | Verify z-index |
| `ImportSessionsDialog` | `src/components/ImportSessionsDialog.tsx` | Verify z-index |
| `TutorialOverlay` | `src/components/TutorialOverlay.tsx` | z-[100] → `var(--z-max)` |

### Standardization per modal:
- [ ] Overlay: `fixed inset-0 bg-black/70 backdrop-blur-sm` with `var(--z-overlay)`
- [ ] Card: `var(--z-modal)` with GlassCard elevated variant
- [ ] Header: `SectionHeader` pattern (icon + title)
- [ ] Actions: Cancel + Confirm with `--accent-primary` colors
- [ ] Entrance animation: `opacity 0→1, scale 0.95→1` with `--ease-out` 250ms
- [ ] Exit animation: `opacity 1→0, scale 1→0.95` with `--ease-in` 200ms
- [ ] Remove all arbitrary z-index values

---

## Phase 8: Chart + Color Consolidation (10 files)

**Effort:** Small | **Impact:** Medium | **Files:** All pages with Chart.js

### Tasks:
- [ ] Create `ChartContainer.tsx` — single component that calls `Chart.register(...)` once
- [ ] Remove all inline `Chart.register()` calls from 6+ files (Dashboard, Stats, Productivity, Browser, External, Insights, Database)
- [ ] Create `CategoryColors.tsx` — single `CATEGORY_COLORS` / `CATEGORY_BG` mapping
- [ ] Remove all duplicate category→color maps (5+ instances across pages)
- [ ] Apply accent color to chart tooltips, legends, and gridlines per DESIGN_SYSTEM §8

### Files affected:
| File | Replace |
|------|---------|
| `src/pages/DashboardPage.tsx` | Chart.register() → ChartContainer |
| `src/pages/StatsPage.tsx` | Chart.register() → ChartContainer |
| `src/pages/ProductivityPage.tsx` | Chart.register() → ChartContainer |
| `src/pages/BrowserActivityPage.tsx` | Chart.register() → ChartContainer |
| `src/pages/ExternalPage.tsx` | Chart.register() → ChartContainer |
| `src/pages/InsightsPage.tsx` | Chart.register() → ChartContainer |
| `src/pages/DatabasePage.tsx` | Chart.register() → ChartContainer |
| All of above | Duplicate color maps → CategoryColors |

---

## Phase 9: Motion Standardization (1 file sweep)

**Effort:** Small | **Impact:** Low | **Files:** All `.tsx` files

### Tasks:
- [ ] Scan all files for `type: 'spring'` → replace with cubic-bezier
- [ ] Scan all files for `bounce:` parameter → remove
- [ ] Scan all files for `transition: { type: "spring" }` → remove
- [ ] Scan all files for `whileHover={{ x: 4 }}` or similar slide animations → change to `transition-colors`
- [ ] Scan all files for `transition: 'all'` (string) or `transition: { all: ... }` → specify exact properties
- [ ] Scan all files for `duration > 0.4` → clamp to 250ms max (exceptions: page entrance 250ms, toast 300ms, modal open 250ms)
- [ ] Scan all files for `animate={{ width: ... }}` or `animate={{ height: ... }}` → remove (layout animation anti-pattern)
- [ ] Add `prefers-reduced-motion: reduce` support (already in index.css Phase 1)

### Common patterns to fix:
```tsx
// BEFORE (spring — BAD):
initial={{ opacity: 0, y: 16 }}
animate={{ opacity: 1, y: 0 }}
transition={{ type: 'spring', bounce: 0.25 }}

// AFTER (eased — GOOD):
initial={{ opacity: 0, y: 16 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
```

---

## Phase 10: Logo + Brand Final Polish (2 files)

**Effort:** Tiny | **Impact:** Medium | **Files:** `src/App.tsx`, icon files

### Tasks:
- [ ] Sidebar logo gradient: `from-[var(--accent-primary)] to-rose-500` (pink-500 → rose-500)
- [ ] Favicon: Update to match pink brand color (if applicable)
- [ ] Electron window title: Verify "DeskFlow" branding
- [ ] Any remaining `from-indigo-500 to-emerald-500` → pink gradient
- [ ] Any remaining `text-emerald-400` brand usage → `text-[var(--accent-primary)]`
- [ ] Any remaining cyan primary buttons → pink

---

## Phase R: Retrofit Recent Features

**Effort:** Medium | **Impact:** Medium | **Files:** Added during recent sessions

Features added after DESIGN_SYSTEM.md was authored that need visual alignment:

### R1: Cross-Session Sync Controls (TerminalPage.tsx Configs tab)
- Currently: amber-500 theme (correct per Design System §8.3 — configs tab color)
- Verify: borders use `--border-subtle`, backgrounds use glass tokens
- The Live Context Viewer (just added) should also be verified against tokens

### R2: Skill DSL Components
- `GeneralistDialog`: Verify modal uses Phase 7 ModalOverlay pattern
- `SkillWidgetFactory`: Verify widgets use `--accent-primary` not hardcoded cyan
- `SkillsTab` (inline in TerminalPage): Verify cards use GlassCard

### R3: InitializeProgressModal
- Verify: Uses tokens from index.css, not hardcoded values
- Verify: `rounded-xl` not `rounded-3xl`, `p-5` not `p-6`
- Already mostly matches DESIGN_SYSTEM.md §16.3 spec

### R4: Live Context Viewer (just added)
- Currently: amber-500/5 bg, amber-500/20 border — correct for configs tab
- Verify: Uses CSS tokens after Phase 1 (may need `var(--warning)` instead of `amber-500`)
- Verify: `rounded-xl`, `p-5` padding

### R5: Conflict Toasts
- Currently: `fixed bottom-20 right-4 z-50` — verify z-index maps to `var(--z-toast)`
- Verify: Glass card pattern, no hardcoded shadows

### R6: Lock Badges on Terminal Tabs
- Currently: `text-amber-400 bg-amber-500/10` — verify against tokens
- Currently: `px-1 rounded` — should be `rounded` (default 4px? or should be `rounded-lg` 8px?)

---

## Implementation Order Recommendation

```
Phase 0  (Audit)         → 1 session, no code changes
Phase 1  (CSS foundation)→ 1 session, 1 file
Phase 2  (Components)    → 2-3 sessions, 16 new files
Phase 10 (Logo)          → 0.5 session (can parallelize with Phase 4)
Phase 4  (App.tsx)       → 1-2 sessions, 1 file
Phase 5  (Terminal)      → 1-2 sessions, 2 files
Phase 7  (Modals)        → 1 session, 15 files (mostly search-replace)
Phase 3  (Pages)         → 3-4 sessions, 10 pages (largest effort)
Phase 6  (Dashboard + External) → 1-2 sessions, 2 files
Phase 8  (Charts)        → 0.5 session, 10 files
Phase 9  (Motion)        → 0.5 session, search-replace sweep
Phase R  (Retrofit)      → 1 session, ~6 files
```

### Total estimate:
- **Sessions:** ~12-18 implementation sessions
- **Files touched:** ~90+ (16 new, 74+ modified)
- **Risk areas:** DashboardPage (~1200 lines), TerminalPage (~5600 lines), ExternalPage — most complex pages
- **Build verification:** After every phase
- **Critical rule:** NEVER touch `src/index.css` `@import "tailwindcss"` — keep v4 syntax

---

## Verifcation Protocol

After each phase:

```bash
# 1. Build check
npm run build

# 2. Visual check — open each affected page in dev server
# Look for:
#   - Broken layouts (missing padding, overflow)
#   - Missing accent colors (buttons, active states)
#   - Wrong border radius (rounded-3xl remnants)
#   - Wrong padding (p-6/p-8 remnants)

# 3. Check for regression in:
#   - Terminal functionality (tab switching, terminal creation)
#   - Modal open/close (all 15 modals)
#   - Chart rendering (all 8 chart types)
#   - Sidebar navigation (all 10 nav items)

# 4. After Phase R:
#   - Cross-session sync controls work
#   - Live Context Viewer shows data
#   - Conflict toasts appear correctly
```

---

## Compliance Checklist

Each changed file must pass these checks before the revamp is complete:

- [ ] `--page-accent` set on wrapper
- [ ] No `rounded-3xl` or `rounded-2xl` — only `rounded-xl` or `rounded-lg`
- [ ] No `p-6` or `p-8` — only `p-5`
- [ ] No `shadow-lg` / `shadow-xl` — use `shadow-[0_0_30px_rgba(0,0,0,0.3)]` only for elevated
- [ ] No `text-3xl` / `text-4xl` (except timer display)
- [ ] No gradient buttons (`from-`/`to-`) for primary actions
- [ ] No spring physics
- [ ] No `transition: all`
- [ ] No `whileHover={{ x: }}`
- [ ] No arbitrary z-index (`z-[*]`)
- [ ] Uses CSS variables (not hardcoded hex) for brand colors
- [ ] Entrance animation matches PageShell pattern
- [ ] Build: ✅
