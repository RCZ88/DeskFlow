---
id: frontend-design
name: Frontend Design
version: 3.0.0
category: design
tags: [ui, ux, frontend, css, react, tailwind, deskflow]
---

# Frontend Design Skill

## Philosophy

Design is not decoration — it is communication. Every pixel, transition, and whitespace decision should serve the user's cognitive load reduction. The DeskFlow agent workspace demands dark, data-dense, glassmorphic interfaces that feel native to the desktop while maintaining web-grade flexibility.

## Core Principles

1. **Progressive Disclosure** — Show what matters, hide what doesn't. Use opacity, scale, and height transitions to reveal complexity gradually.
2. **Density Without Clutter** — Data-heavy UIs (terminal logs, heatmaps, orbit systems) need tight spacing (8px grid) with clear visual hierarchy through color weight, not just size.
3. **Glass as Structure** — Use `backdrop-filter: blur()` not as decoration but as spatial depth cues. Dark glass cards (`bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50`) create layers without adding visual weight.
4. **Motion as Feedback** — Every state change should have a micro-interaction (150-300ms). Never animate layout properties (width/height) — use transform and opacity only.
5. **Type as UI** — In dark dashboards, typography carries 60% of the visual hierarchy. Use weight and color temperature, not just size.

## Anti-Patterns (NEVER)

- **NEVER** use `box-shadow` for elevation in dark themes — use border brightness and glass layers instead.
- **NEVER** use pure black (`#000`) backgrounds — always `zinc-950` or `slate-950` with subtle texture.
- **NEVER** use more than 2 font families in a single view.
- **NEVER** animate `width`, `height`, `top`, `left` — these trigger layout recalculation and jank in Electron.
- **NEVER** use default browser focus rings — replace with `ring-2 ring-pink-500/50` or brand accent.
- **NEVER** place interactive elements closer than 44px touch targets (even on desktop — mouse precision varies).
- **NEVER** use `rounded-2xl` (16px) or `rounded-3xl` (24px) — max is `rounded-xl` (12px) for developer tools.
- **NEVER** use spring physics (`type: 'spring'`) in serious developer tools — use cubic-bezier easing.

---

## DeskFlow-Specific Conventions

### Color System
```
Background:     zinc-950 (base), zinc-900 (elevated), zinc-900/50 (glass)
Primary:        pink-500 (accent), pink-400 (hover), pink-600 (active)
Secondary:      cyan-400 (info), emerald-400 (success), amber-400 (warning)
Text:           zinc-100 (primary), zinc-400 (secondary), zinc-600 (disabled)
Border:         zinc-800 (subtle), zinc-700 (active), zinc-600/50 (glass edge)
```

### Per-Page Accent Colors
Each page sets `--page-accent` on its wrapper:
| Page | Accent | Rationale |
|------|--------|-----------|
| Dashboard | pink-500 | Brand default |
| Productivity | pink-500 | Brand default |
| Stats | cyan-400 | Data/metrics — cool precision |
| Browser | sky-400 | Web activity — blue sky |
| IDE Projects | violet-500 | Code — IDE purple |
| External | amber-400 | Timer — warm activity |
| Insights | pink-500 | Brand default |
| Database | violet-400 | Data — neutral authority |
| Settings | cyan-400 | Config — cool clarity |
| IDE Help | indigo-500 | Documentation |

### Spacing Scale
```
xs: 4px   (icon padding, tight inline)
sm: 8px   (component internal padding)
md: 12px  (card padding, list items)
lg: 16px  (section gaps)
xl: 24px  (page sections)
2xl: 32px (major divisions)
```

### Animation Tokens
```
fast:    150ms (hover states, toggles)
normal:  250ms (modals, dropdowns)
slow:    400ms (page transitions)
ease-out: cubic-bezier(0.16, 1, 0.3, 1) (standard motion)
```

### Typography Scale
```
Badge:      11px/500     — status badges, category pills
Meta:       12px/400     — timestamps, secondary info
Body:       13px/400     — default body text
Body+:      14px/400     — stat values, card content
Card title: 13px/600     — section headings within cards
Section h2: 15px/600     — section titles
Page title: 18px/600     — ALL page h1 titles
Display:    24-32px/700  — timer values, hero score badges
```

### Card Padding Standard
ALL card padding → `p-5` (20px). Never `p-6` or `p-8`.

### Border Radius Maximum
ALL cards, modals, containers → `rounded-xl` (12px). Never `rounded-2xl` or `rounded-3xl`.

---

## Page Layout Patterns

### Pattern A — Inline Header (Stats, Browser, Productivity)
```
<PageShell>
  <SectionHeader />         // title + icon + optional action
  <GlassCard />             // main content
  <grid> <StatCard /> </grid>  // stat grid
</PageShell>
```

### Pattern B — Sticky Header + Tabs (IDE, Settings, Insights)
```
<PageShell variant="sticky-header">
  <StickyHeader />          // h-14 backdrop blur bar
  <TabBar />               // pills pattern
  <content />              // tab-switched content
</PageShell>
```

### Pattern C — Sticky Header + Scroll (External, Database, Tutorial)
```
<PageShell variant="sticky-header">
  <StickyHeader />          // with action buttons
  <scrollable-content />   // p-5 space-y-4
</PageShell>
```

### Pattern D — Dashboard (Hero Layout)
```
<PageShell variant="dashboard">
  // Always-visible timer — full-width hero
  // Stat cards grid (5 cols)
  // Two-column: heatmap + weekly overview | top apps + recent sessions
</PageShell>
```

---

## Component Patterns by Feature

### GlassCard (3 variants)

**Default:**
```tsx
<GlassCard>
  // bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5
  // hover:border-zinc-700/60 transition-colors duration-150
</GlassCard>
```

**Elevated (modals, hero cards):**
```tsx
<GlassCard variant="elevated">
  // bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-5
  // shadow-[0_0_30px_rgba(0,0,0,0.3)]
</GlassCard>
```

**Interactive (clickable):**
```tsx
<GlassCard variant="interactive">
  // DEFAULT + hover:border-accent-primary/30 + cursor-pointer
</GlassCard>
```

### TabBar (Pills Pattern)
```tsx
<TabBar tabs={[
  { key: 'overview', label: 'Overview' },
  { key: 'details', label: 'Details' },
]} activeKey={activeTab} onChange={setActiveTab} />
// Renders: bg-zinc-900/50 p-1 rounded-xl inline-flex
// Active: bg-zinc-800 text-white shadow-sm
// Inactive: text-zinc-400 hover:text-zinc-200
```

### SectionHeader
```tsx
<SectionHeader title="Title" icon={Icon} accent="--page-accent" action={<button />} />
// Icon container: w-9 h-9 rounded-lg bg-[var(--page-accent)]/15
// Icon: w-4.5 h-4.5 text-[var(--page-accent)]
// Title: text-lg font-semibold
```

### StatCard (KPI Metric)
```tsx
<StatCard label="Metric" value="42" trend="+12%" icon={Icon} />
// Glass card with gradient bg, hover animation, trend arrow
```

### ChartContainer
```tsx
// Wraps Chart.js with dark theme registration
// Handles Chart.register() for all needed components
// Dark tooltip styling
```

### Modal Pattern
```tsx
// Overlay: fixed inset-0 bg-black/70 backdrop-blur-sm z-[var(--z-overlay)]
// Card: bg-zinc-900/95 backdrop-blur-xl border-zinc-700/50 rounded-xl p-5
//        max-w-[480px] max-h-[85vh] overflow-y-auto
// Icon header: w-10 h-10 rounded-lg bg-[var(--page-accent)]/15
// Motion: 250ms ease-out, opacity + scale
```

### Status Badge / StatusDot
```tsx
// Badge: px-2 py-0.5 rounded-full text-xs font-medium bg-{color}/10 text-{color} border-{color}/20
// Dot: w-1.5 h-1.5 rounded-full bg-{color} animate-pulse
// Status colors: active=emerald, idle=amber, completed=green, error=red, cancelled=zinc
```

### CategoryBadge
```tsx
// Per session category: bug-fix=red, feature=blue, refactor=purple, research=teal, review=amber, other=zinc
// bg-{color}-500/15 text-{color}-300 px-2 py-0.5 rounded-full text-xs
```

### EmptyState
```tsx
// Centered flex-col with icon, title, description, optional CTA button
// text-zinc-500, icon at opacity-30
```

### LoadingState
```tsx
// Skeleton pattern: animate-pulse bg-zinc-800 rounded
// NOT just a spinner — pulse containers matching content shape
```

---

## Page-Specific Patterns

### Dashboard Page
- **OrbitSystem:** React Three Fiber 3D solar system, planets=apps with size=usage, category-based colors, click to track, hover tooltips, period selector inside UI
- **Heatmap:** 7×24 grid, 3 modes (external/device/combined), hover tooltip, hour click → detail panel, day label click → DayDetailPopup, 12h format labels
- **Weekly Overview:** Stacked bar chart, rounded corners, total hours below, device segments + external purple stack, period nav, dynamic labels, "View Heatmap" button
- **Focus Sessions:** Minimum duration slider (default 60s), idle detection via `lastInteractionRef` + 5min clamp, stopwatch pauses during idle, 5s auto-refresh
- **Stopwatch:** Always-visible accumulated delta timer, live `currentProductiveMs` on top of DB, tier fallback text

### IDE Projects Page
- 7 tabs: Overview / IDEs / Tools / Projects / AI / Git / Trash
- Initialize button (green FolderTree) → InitializeProgressModal with grouped directories
- Setup button (amber Settings2) → WorkspaceSettingsDialog
- New Agent button (Bot icon) → NewSessionDialog
- Workspace minimize: hides terminal layout, keeps PTY alive, centered restore card
- Close workspace: Save & Close / Discard / Cancel dialog
- Analytics tab: AnalyticsDashboard variant="workspace"

### Terminal Workspace
- 12 sidebar tabs with per-tab accent colors (green ×4, emerald, yellow, indigo, pink, orange, rose, amber, violet)
- 6.2.1-6.2.13: Presets, Sessions, Map, Analytics, Problems, Requests, Files, Checklists, Skills, Configs, History, Context Maintenance, Prompts
- Multi-pane: N-ary tree (PaneNode.children array), 3-terminal grouping, drag resize
- Agent readiness state machine: spawning(cyan) → waiting(amber) → ready(green) | timeout(red)
- Instruction panel: amber headers, green checkboxes, cyan code blocks, localStorage persistence
- @mention routing: dropdown on @, arrow key nav, Enter to send
- Skill DSL: 10 widget types from YAML frontmatter

### External Page
- Always-visible timer: pulsing status dot, 6xl monospace gradient timer, pill-shaped buttons, pause/stop
- Activity grid: uniform h-[140px] buttons with always-visible duration
- Sleep tracking: PastSleepModal with date picker, floating range chart (amber/indigo/rose segments crossing midnight)
- Time Audit Comparison: amber (external) vs emerald (internal) hero numbers, gradient orbs
- Consistency Score: score with emoji indicator
- 3 glass-styled charts: Daily Usage Trend, Activity Distribution (doughnut), Weekly Trend
- Period selector from top nav (no duplicate on page)

### Database Page
- Analytics Dashboard default: 5 stat cards + 8 charts, variant="full"
- Tables view: filterable list → schema + paginated data + CSV export
- JSON fallback: virtual "logs" table when SQLite fails, self-heal reconnection
- Promise.allSettled: each data source independent

### Settings Page
- 5 tabs: Category Management (carousel, drag-drop, custom categories), Colors (per-app picker), Tracking (debounce/sleep/max/filter), Browser Rules (domain/keyword), General (startup/tray/theme/history), System Prompts (4-level merge)
- Custom Categories UI: input + Add button, pills with delete, auto-assigned Neutral
- Unsaved Changes Warning: modal on navigate away

### Insights Page
- 3 tabs: Day / Weekly / Activities
- Typical Day Heatmap: 7×24 grid with intensity coloring
- 5 stats row with trend indicators, gradient backgrounds
- Day of Week bar chart, Sleep & Recovery grouped bar
- Activity Breakdown: animated horizontal bar with % labels
- All charts respect period selector

### Stats Page
- App Statistics Table: sortable columns, search filter, optimized via useMemo
- 3 time distribution charts: pie (category), bar (top apps), line (over time)
- Full sessions list with edit/delete (datetime-local inputs, confirm dialog)
- Live Tracking Indicator: pulsing green dot, current app name + category badge
- Live Detection Panel: terminal-style dark panel, 50-event ring buffer, global persistence

---

## Terminal Sidebar Tab Colors

| Tab | Icon | Accent Color |
|-----|------|-------------|
| Presets | Zap | green-500 (#22c55e) |
| Sessions | Clock | green-500 |
| Map | Monitor | green-500 |
| Analytics | PieChart | green-500 |
| Problems | AlertCircle | emerald-400 (#34d399) |
| Files | Folder | yellow-500 (#eab308) |
| Skills | Sparkles | indigo-500 (#6366f1) |
| Design | Palette | pink-500 (#ec4899) |
| Configs | Settings | orange-500 (#f97316) |
| History | Clock | rose-500 (#f43f5e) |
| Context Maint. | Database | amber-500 (#f59e0b) |
| Prompts | ScrollText | violet-500 (#a855f7) |

Implementation: simple `border-b-2` (NO glow shadows). Active: `border-[var(--tab-accent)] text-[var(--tab-accent)]`. Inactive: `text-zinc-400 hover:text-zinc-200`.

---

## Live Detection Panel (Terminal-Style Dark Panel)
```tsx
// bg-zinc-950/90 border border-zinc-800 rounded-lg font-mono text-xs
// Lines: timestamp (zinc-500) + INFO badge (emerald-500/10 bg) + app name (zinc-200) + category (zinc-400)
// 50-event ring buffer, scrollable, auto-scroll to bottom
// Global persistence via App.tsx prop (survives page nav)
```

---

## Z-Index Scale
| Level | Value | Used For |
|-------|-------|----------|
| `--z-base` | 0 | Page content |
| `--z-elevated` | 10 | Elevated cards, sticky headers |
| `--z-dropdown` | 20 | Dropdowns, tooltips, popovers |
| `--z-modal` | 30 | Modals, dialogs |
| `--z-toast` | 40 | Toasts, notifications |
| `--z-overlay` | 50 | Backdrops, overlays |
| `--z-max` | 100 | AfkPromptModal (highest priority) |

---

## Architecture Patterns

### Cross-Session Sync UI
- Configs tab card: master toggle, TTL slider (30-600s), broadcast toggle, conflict mode dropdown, /sync toggle
- Toast notification on lock conflict
- Lock indicators in tab bar
- Periodic lock refresh

### Skill DSL UI
- SkillWidgetFactory maps YAML frontmatter → 10 React widgets
- GeneralistDialog: filterable grid with search + category filter
- SkillsTab: inline CRUD, expandable cards, category filter pills, search
- Use Skill modal: view content, select terminal, enter prompt, send

### InitializeProgressModal
- Grouped by directory with per-group counters (agent/ 13/13, agent/skills/ 2/2, graphify-out/ 1/1)
- Expandable file previews via AnimatePresence
- Workspace Ready summary card (file count + directory count)
- Error retry restarts from scratch
- Full state reset on remount (re-init safety)

### AnalyticsDashboard (3 variants)
- project: Terminal Analytics tab (project sessions)
- workspace: IDE Projects Analytics tab (workspace AI usage)
- full: Database default view (all data)
- 5 stat cards + 8 charts, Promise.allSettled for independent data fetching

### Context Management System
- 6 knowledge system toggles (Graphify, LLM Wiki, Obsidian, PARA, QMD, Skills)
- SVG context map visual
- Token budget bar per system
- 6 sub-components: MemoryStatusCard, ActiveContextsList, RecentChatHistory, CompactionsPanel, ContextSearchBar, SettingsPanel

---

## When to Activate

Activate this skill when:
- The user asks for UI improvements, design reviews, or frontend polish
- Generating React components for the DeskFlow renderer process
- Working with Tailwind CSS v4 syntax (NO v3 `@tailwind` directives)
- Creating dark-themed, data-dense dashboard components
- Designing glassmorphic overlays, modals, or terminal chrome
- Implementing any new page, component, or feature — this file covers EVERY page's visual patterns
- Reviewing code for design system compliance (border radius, spacing, colors, animation tokens)
