# Workspace UI Revamp — Context Bundle

> Living specification for the terminal workspace visual revamp. Covers sidebar, toolbar, terminal area, and collapsed state.
> Target: One capable AI with frontend engineering skills (React + TypeScript + Tailwind v4 + Framer Motion).
> Generate ONE comprehensive, opinionated spec. This is NOT a menu of options.
>
> ⚠️ **IMPORTANT:** The authoritative feature inventory is `agent/docs/TERMINAL_AND_WORKSPACE_FEATURES.md`.
> This CONTEXT_BUNDLE is a condensed spec for the revamp; the features file has the complete canonical list.
> **Read both files together before generating the prompt.**

---

## SESSION METADATA

- **Title:** Workspace UI Revamp — Intent & Context Bundle
- **Description:** Comprehensive context bundle for an external AI to revamp the terminal workspace UI. Covers the full sidebar (12 tabs), toolbar/terminal area, collapsed/expanded sidebar, and workspace shell — but NOT the app page shell or any other page. The goal is a cohesive, polished, dark-dev-tool aesthetic that matches what a capable Figma-to-code pipeline would produce.
- **Status:** active
- **Product Area:** Workspace (TerminalPage — sidebar + toolbar + terminal area)
- **Category:** feature

---

## 1. Architecture Overview

### Component Structure

The workspace is rendered entirely in `src/pages/TerminalPage.tsx` (~6000 lines). The high-level layout (inside `<PageShell>` wrapper):

```
┌──────────────────────────────────────────────────┐
│ TerminalPage.tsx layout (flex-row h-full w-full) │
│ ┌──────────────────────┬────────────────────────┐│
│ │   MAIN AREA (flex-1) │    SIDEBAR (fixed w)   ││
│ │                      │    (collapsible)       ││
│ │ ┌─ toolbar ────────┐│ ┌─ header ────────────┐││
│ │ │ Compose│Quick│Save││ │ (collapse btn,      │││
│ │ └──────────────────┘│ │  info, skills btn)   │││
│ │ ┌─ terminal tabs ──┐│ ├─ tab bar ───────────┤││
│ │ │ ↕ Tab1 │ Tab2 │+ ││ │ 12 tab buttons      │││
│ │ └──────────────────┘│ │ (flex-wrap)          │││
│ │ ┌─ terminals ──────┐│ ├─ content ───────────┤││
│ │ │ PaneNode layout  ││ │ (active tab panel)  │││
│ │ │ (split panes)    ││ │                      │││
│ │ └──────────────────┘│ └──────────────────────┘│
│ └──────────────────────┴────────────────────────┘│
└──────────────────────────────────────────────────┘

When sidebar is COLLAPSED: shows a vertical icon strip on the right side
```

### Key Relationships

- **TerminalPage.tsx** owns all state: `activeTab`, `sidebarOpen`, `sidebarWidth`, `isResizing`
- Each sidebar tab renders content inline via `{activeTab === 'presets' && (...)}` blocks
- Some tabs delegate to sub-components: `IssuesWorkspace`, `FilesTab`, `SkillsTab`, `ContextSidebar`, `DesignWorkspacePage`, `ContextMaintenanceTab`, `AnalyticsDashboard`
- All dialogs modals are rendered at the bottom of the component (e.g., session detail, save checkpoint, features dialog)
- The instruction panel (`InstructionPanel`) and quick input bar appear above the terminal area

---

## 2. Sidebar Structure (Right Side)

### 2.1 Container & Resize Handle

```
TerminalPage.tsx:2290-2333
```

- Container: `bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-black/95 backdrop-blur-sm border-l border-zinc-800/50`
- Width: dynamic via `sidebarWidth` state (default ~350px, range 240-600px)
- Resize handle: absolute `left-0 top-0 bottom-0 w-1 cursor-ew-resize`, turns cyan when dragging (`isResizing`)
- Dragging sets `isResizing` via `onMouseDown` → `mousemove`/`mouseup` listeners on `window.document`

### 2.2 Sidebar Header

- Gradient background: `bg-gradient-to-r from-cyan-500/[0.04] to-transparent`
- Left: cyan dot + "TERMINAL" label in uppercase tracking-wider
- Right: Info icon, BookOpen icon, PanelLeftClose icon — all `p-1.5` with hover effects
- Icons transition to accent colors on hover (cyan for Info, violet for BookOpen)

### 2.3 Tab Bar (12 Tabs)

```
TerminalPage.tsx:2335-2383
```

All 12 tabs rendered via `.map()` over a `const` array. Each tab has `{ key, icon, label, color }`.

| # | Key | Icon | Label | Color | Border Color |
|---|-----|------|-------|-------|-------------|
| 1 | presets | Zap | Presets | green | `text-green-400 border-green-500` |
| 2 | sessions | Clock | Sessions | green | same |
| 3 | map | Monitor | Map | green | same |
| 4 | analytics | PieChart | Analytics | green | same |
| 5 | issues | ListChecks | Issues | emerald | `text-emerald-400 border-emerald-500` |
| 6 | files | Folder | Files | yellow | `text-yellow-400 border-yellow-500` |
| 7 | skills | Sparkles | Skills | indigo | `text-indigo-400 border-indigo-500` |
| 8 | design | Palette | Design | pink | `text-pink-400 border-pink-500` |
| 9 | configs | Settings | Configs | orange | `text-orange-400 border-orange-500` |
| 10 | history | RefreshCw | History | rose | `text-rose-400 border-rose-500` |
| 11 | context | Settings2 | Context | amber | `text-amber-400 border-amber-500` |
| 12 | maintenance | Database | Maintenance | violet | `text-violet-400 border-violet-500` |

**Active tab styling:**
- Active: colored text + `border-b-2` with the tab's accent color
- Inactive: `text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50`
- All tabs: `px-2 py-2 text-xs font-medium`
- Container: `flex border-b border-zinc-800 flex-wrap`

### 2.4 Content Panels

#### 2.4.1 Project Stats (shown above all tabs when project is selected)
- Shows Language, VCS, IDE in a simple key-value layout
- Container: `bg-zinc-800/50 rounded-lg p-2`

#### 2.4.2 Presets Tab (`{activeTab === 'presets'}`)
- "Add Preset" button → inline form (name, command, category inputs)
- Preset list: each item is `p-2 bg-zinc-800 rounded group`
- Each preset has Run (Play, green), Edit/Info, Delete buttons (appear on hover via `opacity-0 group-hover:opacity-100`)
- Built-in presets marked with `[SYSTEM]` badge in blue
- Edit dialog: modal overlay with same inputs

#### 2.4.3 Sessions Tab (`{activeTab === 'sessions'}`)
- Two modes: **Session List** (default) and **Session Detail** (on selection)

**Session List:**
- "New Session" (green, pill), "Import" (zinc glass) buttons
- Save/Load workspace buttons
- Category filter pills (All, Debug, Feature, Bug Fix, etc.) with dot colors
- Session cards: `GlassCard group p-3`, draggable, with left accent border (emerald if terminal running, zinc if closed)
- Each card shows: StatusDot, CategoryBadge, agent badge, topic, date, terminal name (or "Closed"), cost, tags, action buttons (Details, Focus/Open, Messages, Delete)

**Session Detail:**
- Back button
- GlassCard header with session metadata grid (status, category, date, terminal, cost, tokens, resume_id, description, product_area)
- Messages section with Refresh button and message list
- Each message shown with role-colored dot and label, timestamp, Quote button

#### 2.4.4 Map Tab (`{activeTab === 'map'}`)
- TerminalMiniMap component (shows terminal layout tree)
- Resizable split via `mapListRatio` state (draggable divider)
- Bottom section: Running Terminals list grouped by layout group
- Each terminal shows: name, agent, file lock count, active state, session info (if any), Focus/New Session buttons

#### 2.4.5 Analytics Tab (`{activeTab === 'analytics'}`)
- Period selector: 7 Days / 30 Days / All Time pill toggle
- Delegates to `AnalyticsDashboard` component with `variant="full"`

#### 2.4.6 Issues Tab (`{activeTab === 'issues'}`)
- Delegates to `IssuesWorkspace` component with projectId, projectPath, activeTerminalId, sessions

#### 2.4.7 Files Tab (`{activeTab === 'files'}`)
- Delegates to `FilesTab` component with projectId, projectPath, projects, onSelectProject

#### 2.4.8 Skills Tab (`{activeTab === 'skills'}`)
- Delegates to `SkillsTab` component with projectPath, terminalTabs, activeTerminalId

#### 2.4.9 Design Tab (`{activeTab === 'design'}`)
- Delegates to `DesignWorkspacePage` component with projectPath, activeTerminalId

#### 2.4.10 Context Tab (`{activeTab === 'context'}`)
- Delegates to `ContextSidebar` component with projectId, projectPath

#### 2.4.11 Configs Tab (`{activeTab === 'configs'}`)
- Inline sections (each in colored accent borders):

| Section | Accent | Content |
|---------|--------|---------|
| Model Configuration | orange | Re-injection threshold slider, default model tier selector (top/mid/low), debug mode toggle |
| Auto-Assign Routing | orange | Auto-assign toggle, routing model select, summary frequency select, auto-rename toggle + threshold |
| Routing Infrastructure Cost | zinc-emerald | Cost cards (today, week, month, all time) + breakdown by call type |
| Cross-Session Sync | amber | Lock TTL slider, context broadcast toggle, conflict warning mode select, /sync command toggle, thought process toggle |
| Live Context Viewer | amber | File locks per terminal, recent edits feed, recent conflicts feed |

All sliders are raw `<input type="range">` with custom Tailwind accent colors.
Toggles are custom `<button>` elements (not shadcn or Radix).
Selects are raw `<select>` elements.

#### 2.4.12 History Tab (`{activeTab === 'history'}`)
- Placeholder: `bg-rose-500/5 border border-rose-500/20 rounded` with "No history records yet" message

#### 2.4.13 Context Maintenance Tab (`{activeTab === 'context-maintenance'}`)
- Delegates to `ContextMaintenanceTab` component

### 2.5 Dialogs Rendered Below Content
- `NewSessionDialog` — wrapped in `<div className="relative z-10">`
- `ImportSessionsDialog`
- `FeaturesDialog`
- `GeneralistDialog` (for skill configuration)
- `SessionEditDialog`
- Save Checkpoint dialog (modal overlay)
- Close Workspace dialog
- Confirm dialog (appears twice, once with GlassCard once with plain div — likely duplicate/legacy)
- Context menu for session items
- Messages viewer overlay

---

## 3. Toolbar / Terminal Area (Main Area)

### 3.1 Toolbar (above terminal tabs)
- **Instruction Panel** (full mode): `InstructionPanel` component with problem/request/skill selectors
- **Quick Instruction Input**: textarea with `@mention` dropdown for terminal routing, session selector, Send button, Save button, Close button
- **Compose button**: purple gradient `from-purple-600 to-indigo-600`
- **Quick button**: zinc
- **Save button**: zinc with 💾 icon
- **Terminal Status Indicator**: green dot, agent name, bound problem badge, dropdown to bind problems

### 3.2 Terminal Tab Bar
- Dynamic terminal tabs with drag-and-drop reordering
- Each tab shows: Monitor icon, StatusDot, terminal name, model tier badge (top/mid/low), CategoryBadge, file lock count, session topic, close button (X)
- Group color indicator: colored top-border strip (8 rotating colors)
- "+" button creates new terminal

### 3.3 Terminal Area
- Group tabs (if multiple groups): Group 1, Group 2, etc.
- Main pane: `TerminalLayout` component showing `PaneNode` tree with xterm.js terminals

---

## 4. Collapsed Sidebar State

```
TerminalPage.tsx:4074-4099
```

When `!sidebarOpen`:
- Vertical icon strip: `flex flex-col items-center gap-1.5 px-1.5 py-3`
- Shows: Info icon → BookOpen icon → divider → PanelLeft (open sidebar) icon
- Each icon: `p-1.5 hover:bg-zinc-800/80 rounded-md`
- Hover colors: Info → cyan, BookOpen → violet, PanelLeft → cyan

---

## 5. Design Tokens & Conventions

### Color Palette
- Background: `zinc-900` / `zinc-950` range, black for deepest layers
- Borders: `zinc-800/50` (subtle), `zinc-700/50` (active)
- Text: `zinc-200` primary, `zinc-400` secondary, `zinc-500`/`zinc-600` muted
- Accents per tab: green, emerald, yellow, indigo, pink, orange, rose, amber, violet
- Semantic: green (success/active), emerald (cost/terminals), amber (warnings/sync), red (errors/delete), cyan (primary action/info)

### Typography
- Labels: `text-xs` (11-12px), `text-[10px]`, `text-[9px]`, `text-[8px]`
- Headings: `text-sm` (13-14px) or `text-base` (15-16px)
- Font weights: `font-medium`, `font-semibold`, `font-bold`
- Font families: default system UI, `font-mono` for code paths
- Uppercase `tracking-wider` for section headers

### Spacing
- Sidebar padding: `p-2`
- Tab padding: `px-2 py-2`
- Card padding: `p-3` or `p-4`
- Gap: `gap-1`, `gap-1.5`, `gap-2`
- Section spacing: `space-y-2`, `space-y-3`, `space-y-4`

### GlassCard Component
Used extensively for session cards, detail views, dialogs. Not currently standardized — various inline variants exist.

### Visual Patterns
- Gradient backgrounds for container depth (`from-zinc-900/95 via-zinc-900/90 to-black/95`)
- Thin left border accents (session cards, detail views)
- Category badges and status dots as visual tags
- Fully inline-styled controls (no external UI library)
- Every interactive element has `active:scale-95` press effect

---

## 6. Frontend Design Skills (MANDATORY)

The external AI **must read** these skills and apply them:

1. **`agent/skills/frontend-design/SKILL.md`** (v3.0.0) — Core UI/UX principles, DeskFlow patterns, component conventions
2. **`agent/skills/impeccable/SKILL.md`** — 7 design domains, 23 commands, 27 anti-patterns (visual hierarchy, spacing, color, typography, motion, layout, consistency)
3. **`agent/skills/ui-ux-pro-max/SKILL.md`** — Dev tool industry-specific design rules, secondary actions styling, dark mode patterns
4. **`agent/skills/design-taste/SKILL.md`** (v1.1.0) — Master aggregator with tunable knobs: Variance=5 (moderate), Motion=5 (moderate), Density=7 (compact)
5. **`agent/skills/taste-skill/SKILL.md`** — Tunable knob definitions for the aesthetic matrix

---

## 7. Existing Features to PRESERVE

Do NOT remove or break these:

| Feature | Why |
|---------|-----|
| 12-tab sidebar with per-tab accent colors | Core navigation |
| Tab color-coded border-bottom on active tab | Visual hierarchy |
| Tab flex-wrap behavior | Responsive sidebar |
| Resize handle with cyan highlight on drag | UX affordance |
| Sidebar collapse/expand with icon strip | Space management |
| Project Stats section above tab content | Quick info access |
| Drag-and-drop sessions onto terminals | Productivity feature |
| Session cards with left accent border | Visual structure |
| Category filter pills in Sessions tab | Filtering UX |
| TerminalMiniMap with group display | Layout visualization |
| AnalyticsDashboard integration | Data display |
| External sub-components (IssuesWorkspace etc.) | Modular architecture |
| InstructionPanel + Quick Input toolbar | AI interaction flow |
| Terminal tab bar with group colors | Terminal management |
| Drag-to-reorder terminal tabs | User customization |
| All toggle/switch/slider controls (custom-built) | Existing interaction patterns |
| active:scale-95 on all interactive elements | Press feedback |
| Collapsed sidebar icon strip with hover colors | Space-saving mode |
| GlassCard usage for cards/dialogs | Cohesive visual style |

---

## 8. Files to Reference

### Primary Source
- `src/pages/TerminalPage.tsx` — The full workspace page (~6000 lines). The sidebar starts at line 2288. The collapsed strip ends at line 4099. Between them: all tabs, all dialogs, all inline components.

### Sub-Components (External)
- `src/components/IssuesWorkspace.tsx`
- `src/components/FilesTab.tsx`
- `src/components/SkillsTab.tsx`
- `src/components/DesignWorkspacePage.tsx`
- `src/components/ContextSidebar.tsx`
- `src/components/ContextMaintenanceTab.tsx`
- `src/components/AnalyticsDashboard.tsx`
- `src/components/TerminalMiniMap.tsx`
- `src/components/InstructionPanel.tsx`
- `src/components/SessionEditDialog.tsx`
- `src/components/FeaturesDialog.tsx`
- `src/components/GlassCard.tsx`
- `src/pages/PageShell.tsx`

### Styles
- `src/index.css` — MUST keep `@import "tailwindcss"` (v4 syntax). NEVER change to v3 directives.

### Configuration (for understanding scope)
- `src/App.tsx` — app shell, routing

---

## 9. Important Constraints

1. **No external UI libraries** — All controls (toggles, sliders, selects, pills) are hand-built with Tailwind. Keep it that way.
2. **Tailwind v4** — Use `@import "tailwindcss"` syntax. No v3 directives. No `autoprefixer` or `postcss`.
3. **No shadcn, Radix, or headless UI** — Everything is inline JSX + Tailwind.
4. **No framer-motion `whileHover`** — Animation is NOT part of this scope. Use CSS transitions only (`transition-colors duration-150`).
5. **No shadow-box replacements** — Use border brightness instead of box shadows.
6. **No spring physics** — Use `cubic-bezier` only for any timing functions if needed.
7. **Do NOT modify TerminalPage.tsx's logic or state management** — Only visual/styling changes to the JSX.
8. **Do NOT touch App.tsx, PageShell, or any app-level page** — This is workspace-only.
9. **Do NOT move content between tabs** — Each tab's content stays where it is.
10. **Do not change the collapsed sidebar functionality** — the icon strip is correct as an affordance; only its visual styling may be polished.

---

## 10. Generated Prompt File

The companion `PROMPT.md` contains the deliverable prompt. This `CONTEXT_BUNDLE.md` is the specification that backs it.

---

*End of CONTEXT_BUNDLE.md — generated 2026-06-05 via generate-prompt skill.*
