# Context Bundle — Workspace Design Preset System

## Raw Request

"I would like the solution for using or not being able to describe something accurately actually just gives some samples of design taste and sort of style that is pre-made. And you can refer to that. And then the user can slightly adjust. So basically instead of relying on the user being able to generate a complete descriptive style and like in complete sense, we would have those bunch of benchmark of stuff, a bunch of default built-in styles, different styles like polymorphism, and other design aspects. The user is able to just adjust basically maybe adjusting the colors, maybe adjusting some components of the design theme. So it's not describing the specification from scratch, but rather, it's supposed to be something that is able to be selected and adjusted a little bit by a little bit. And as well as, I need the improvement on how the AI uses the MCP, because MCP using all the skills, I don't think it's the most effective. And I feel like with those knobs of skills, it's not effective on improving the user without a clear design preference."

## Problem Statement

The AI agent has the lack of ability to use the designing skills properly with lower models. Users cannot describe design accurately. The solution is pre-built design presets with adjustable knobs — select a style, tweak it, and the AI follows it consistently.

---

# WHAT IS THE DESKFLOW WORKSPACE

## Overview

DeskFlow is an **Electron desktop app** for productivity tracking. It has a **workspace** — a full-screen terminal environment with a sidebar containing 6 groups of tools. The workspace is the primary interface for AI-assisted development.

The workspace opens as a **full-screen overlay** (z-[200]) inside the IDE Projects page (`/ide`). When open, the app sidebar is hidden. The workspace has its own navigation (sidebar groups), its own command bar, and its own terminal area.

## Workspace Layout

```
┌─────────────────────────────────────────────────────┐
│ Workspace Command Bar                                │
│ [← Exit] [Project: App Tracker] │ [Terminal tabs] │ [Compose] [Quick] [Save] │
├────────────┬────────────────────────────────────────┤
│            │                                        │
│  Sidebar   │           Terminal Area                │
│  (groups)  │     (AI agent terminals)               │
│            │                                        │
│  ┌──────┐  │                                        │
│  │Setup │  │     ┌──────────────────────────┐       │
│  │Work  │  │     │ Terminal 1               │       │
│  │Insight│ │     │                          │       │
│  │Studio│  │     └──────────────────────────┘       │
│  │Conduc│  │     ┌──────────────────────────┐       │
│  │Context│ │     │ Terminal 2               │       │
│  └──────┘  │     └──────────────────────────┘       │
│            │                                        │
│ Sub-tabs   │                                        │
│ (content)  │                                        │
│            │                                        │
└────────────┴────────────────────────────────────────┘
```

## Workspace Sidebar Groups

| Group | Accent | Subtabs | What It Does |
|-------|--------|---------|--------------|
| **Setup** | orange | Presets, Configs, Fortress | Configure the workspace: command presets, model settings, auto-assign routing, cross-session sync, Fortress Protocol backup system |
| **Work** | green | Sessions, Map, Files, Workspaces | Manage AI sessions, view terminal layout map, browse agent files, save/load workspace snapshots |
| **Insights** | purple | Analytics, Prompts, Issues, Performance, Bugs | View AI usage analytics, prompt history, problem/request tracking, system performance, bug reports |
| **Studio** | indigo | Skills, Design | Manage AI skills, design workspace with library sources and component browser |
| **Conductor** | rose | Missions, Approvals, Trace, Budget, Providers, Templates, Settings | Multi-agent orchestration: create missions, manage agent providers, track budgets |
| **Context** | amber | Context, Maintenance, Context Map, Page Context | Manage context systems (LLM Wiki, Obsidian, Graphify, PARA, QMD), view context state |

## Each Sidebar Group Structure

Each group has:
1. **Group icon** in the vertical rail (44px wide, accent-colored indicator when active)
2. **Sub-tab bar** (horizontal pills at top of content area)
3. **Content area** (scrollable, renders the active subtab's component)

## Every Feature in the Workspace

### Setup Group

**Presets tab** (`PresetsTab.tsx`):
- List of terminal command presets (e.g., "Run Tests" → `npm test`)
- Add/Edit/Delete/Execute actions
- Each preset: name, command, category, built-in flag
- Uses: WorkspaceCard, WorkspaceSection, motion animations

**Configs tab** (`ConfigsTab.tsx`):
- **Model Configuration**: Rules re-injection threshold (slider), Default model tier (top/mid/low buttons), Debug mode toggle
- **Auto-Assign Routing**: Enable/disable, routing model select, summary frequency, auto-rename sessions, auto-create sessions
- **Cross-Session Sync**: Enable/disable, lock TTL slider, context broadcast toggle, conflict warnings select, /sync command toggle, thought process toggle
- **Routing Costs**: Today/Week/Month/All Time cost cards
- Uses: shadcn Switch, Input, Button, WorkspaceCard, WorkspaceSection

**Fortress tab** (`FortressProtocolSetup.tsx`):
- 3-layer safety system: Shadow Committer (auto-commit), Fortress Backup (physical copy), Git Trap (intercept dangerous git)
- Each layer: expand/collapse card with setup button, verify button, terminal output display
- Quick Setup All button
- Session Ritual checklist
- Recovery Runbook
- Uses: WorkspaceCard, WorkspaceSection, framer-motion animations

### Work Group

**Sessions tab** (inline in `TerminalPage.tsx`):
- List of AI agent sessions with status badges (active/paused/completed)
- Category filter pills (bug-fix, feature, refactor, research, review)
- Session detail panel with messages, metadata
- Resume/Edit/Delete actions
- Drag-to-terminal support
- Uses: raw Tailwind (NOT yet using design system)

**Map tab** (`TerminalMiniMap.tsx`):
- Visual representation of terminal pane layout
- Drag to rearrange panes
- Split direction toggle
- Uses: raw component

**Files tab** (`FilesTab.tsx`):
- File browser for agent/ directory
- Grouped by category (Root, Skills, Docs, Templates)
- File content preview panel
- Auto-refresh every 10 seconds
- Setup button to initialize workspace

**Workspaces tab** (`WorkspacesPanel.tsx`):
- Save/Load/Delete named workspace snapshots
- Each snapshot: name, active flag, last updated
- Workspace detail modal with full state inspection

### Insights Group

**Analytics tab** (`AnalyticsDashboard.tsx`):
- 5 stat cards: Total Tokens, Total Cost, Sessions, Problems, Requests
- Charts: AI Usage by Tool (bar), Cost by Model (pie), Problems by Status (doughnut)
- Period selector (7d/30d/all)

**Prompts tab** (`PromptHistoryTab.tsx`):
- List of all prompts sent to agents
- Filterable by session, date, token count

**Issues tab** (`IssuesWorkspace.tsx`):
- Problems list with status badges, priority, category
- Requests list with status badges
- Link/unlink problems to requests
- Checklist management

**Performance tab** (`PerformanceMetricsPanel.tsx`):
- System stats: CPU, Memory, GPU, Platform
- Per-terminal resource usage (CPU, memory, event loop lag)
- Uses: WorkspaceCard, WorkspaceSection, motion animations

**Bugs tab** (`BugReportPanel.tsx`):
- Bug report submission
- Auto-consult AI for bug analysis

### Studio Group

**Skills tab** (`SkillsTab.tsx`):
- Browse/manage AI skills
- Category filter, search
- Use skill in terminal

**Design tab** (`DesignWorkspacePage.tsx`):
- Design library sources (shadcn, Magic UI, Lucide, 21st.dev, React Bits, etc.)
- Taste knobs (design variance, motion intensity, visual density)
- Style references
- Color picker
- Component browser modal
- Motion explorer
- Registry browser
- Command palette

### Conductor Group

**Missions tab** (`ConductorWorkspaceTab.tsx`):
- Create/manage multi-agent missions
- Mission cards with progress bars, status, actions (pause/resume/kill/promote)
- Org tree graph visualization

**Approvals tab**: Pending escalation approvals
**Trace tab**: Execution trace timeline
**Budget tab**: Cost tracking per mission
**Providers tab**: Agent provider management
**Templates tab**: Mission template gallery
**Settings tab**: Conductor configuration

### Context Group

**Context tab** (`ContextSidebar.tsx`):
- 6 context system toggles (LLM Wiki, Obsidian Skills, Graphify, PARA, QMD, Automations)
- Model configuration
- File paths
- Terminal communication config

**Maintenance tab** (`ContextMaintenanceTab.tsx`):
- Memory status card
- Active contexts list
- Recent chat history
- Compactions panel
- Context search bar
- Settings panel

**Context Map tab** (`WorkspaceMindMap.tsx`):
- Visual graph of context system relationships

**Page Context tab** (`PageContextPanel.tsx`):
- Page-specific context information

---

# EXISTING DESIGN SYSTEM

## Design Tokens (from `_ds/` directory)

### Containers (`containers.tsx`)
- `WorkspaceCard` — variants: default, interactive, elevated, inset. Glass aesthetic with top-edge highlight.
- `WorkspaceSection` — section with title + icon + accent color + optional action
- `WorkspaceToolbar` — action bar with consistent spacing
- `WorkspaceGroupHeader` — group header with accent text

### Forms (`forms.tsx`)
- `WS_INPUT` — styled input field
- `WS_BTN_PRIMARY` — accent-colored action button
- `WS_BTN_SECONDARY` — ghost-style secondary button
- `WS_BTN_GHOST` — minimal ghost button
- `WS_BTN_DANGER` — red destructive button
- `WS_BTN_ICON` — icon-only button
- `WS_CHIP` — filter chip (accent-aware)

### Motion (`motion.ts`)
- `DUR` — duration tokens (fast: 150ms, normal: 250ms, slow: 400ms)
- `EASE_OUT` — standard easing (0.16, 1, 0.3, 1)
- `listContainer` — staggered list entrance
- `riseItem` — row rise animation
- `expandPanel` — expand/collapse
- `popItem` — chip/pop entrance
- `tabPanel` — tab content cross-fade

### Primitives (`primitives.tsx`)
- `StatusPill` — status badge with dot
- `Chip` — filter/tag chip (accent-aware)
- `ProgressBar` — segmented progress bar
- `Skeleton` — loading placeholder
- `IconButton` — accessible icon button
- `EmptyState` — empty state with icon + title + hint + action
- `WorkspaceError` — error state with retry

### Badges (`badges.tsx`)
- `WorkspaceStatusBadge` — status for problems/sessions/requests/bugs
- `WorkspaceCategoryBadge` — session categories
- `WorkspacePriorityBadge` — problem priorities

### Controls (`controls.tsx`)
- `ModalShell` — consistent modal overlay
- `filterChipCls` — accent-aware chip classes
- `Pill` — generic status pill

## Available shadcn/ui Components

| Component | File | Status |
|-----------|------|--------|
| accordion | `src/components/ui/accordion.tsx` | Installed |
| alert-dialog | `src/components/ui/alert-dialog.tsx` | Installed |
| badge | `src/components/ui/badge.tsx` | Installed |
| blur-fade | `src/components/ui/blur-fade.tsx` | Installed |
| border-beam | `src/components/ui/border-beam.tsx` | Installed |
| button | `src/components/ui/button.tsx` | Installed |
| collapsible | `src/components/ui/collapsible.tsx` | Installed |
| dialog | `src/components/ui/dialog.tsx` | Installed |
| dot-pattern | `src/components/ui/dot-pattern.tsx` | Installed |
| dropdown-menu | `src/components/ui/dropdown-menu.tsx` | Installed |
| input | `src/components/ui/input.tsx` | Installed |
| magic-card | `src/components/ui/magic-card.tsx` | Installed |
| marquee | `src/components/ui/marquee.tsx` | Installed |
| number-ticker | `src/components/ui/number-ticker.tsx` | Installed |
| particles | `src/components/ui/particles.tsx` | Installed |
| progress | `src/components/ui/progress.tsx` | Installed |
| scroll-area | `src/components/ui/scroll-area.tsx` | Installed |
| select | `src/components/ui/select.tsx` | Installed |
| separator | `src/components/ui/separator.tsx` | Installed |
| shiny-button | `src/components/ui/shiny-button.tsx` | Installed |
| skeleton | `src/components/ui/skeleton.tsx` | Installed |
| switch | `src/components/ui/switch.tsx` | Installed |
| tabs | `src/components/ui/tabs.tsx` | Installed |
| tooltip | `src/components/ui/tooltip.tsx` | Installed |
| animated-circular-progress-bar | `src/components/ui/animated-circular-progress-bar.tsx` | Installed |
| animated-gradient-text | `src/components/ui/animated-gradient-text.tsx` | Installed |
| animated-shiny-text | `src/components/ui/animated-shiny-text.tsx` | Installed |
| aurora-text | `src/components/ui/aurora-text.tsx` | Installed |
| toggle | `src/components/ui/toggle.tsx` | Installed |

## Available Magic UI Components (via MCP)

| Component | Description |
|-----------|-------------|
| animated-beam | Connecting line animation |
| border-beam | Animated border light effect |
| magic-card | Mouse-following glow card |
| number-ticker | Animated number counter |
| particles | Background particle effects |
| shimmer-button | Shimmering button |
| terminal | Terminal-style display |
| blur-fade | Blur transition effect |
| animated-gradient-text | Animated gradient text |
| meteors | Meteor shower effect |
| neon-gradient-card | Neon card effect |
| rainbow-button | Rainbow button effect |
| globe | Interactive 3D globe |
| bento-grid | Bento layout grid |
| dock | MacOS-style dock |

---

# EXISTING PRESET DEFINITIONS

`src/lib/designPresets.ts` defines 8 presets:

| Preset | Category | Accent | Border Radius | Glass | Glow | Animation | Density |
|--------|----------|--------|---------------|-------|------|-----------|---------|
| Cyberpunk Neon | vibrant | #00f0ff | 6px | ✓ | ✓ | moderate | comfortable |
| Minimal Clean | light | #171717 | 8px | ✗ | ✗ | subtle | airy |
| Glassmorphic | dark | #8b5cf6 | 12px | ✓ | ✗ | subtle | comfortable |
| Brutalist | dark | #ff4444 | 0px | ✗ | ✗ | none | compact |
| Warm Organic | dark | #c8a06a | 10px | ✗ | ✗ | subtle | comfortable |
| Terminal Hacker | dark | #00ff41 | 0px | ✗ | ✓ | none | dense |
| Ocean Depths | dark | #22d3ee | 10px | ✓ | ✗ | subtle | comfortable |
| Neon Synthwave | vibrant | #ff6ec7 | 8px | ✓ | ✓ | moderate | comfortable |

Each preset has: 14 color values, geometry (3), typography (5), motion (3), glass/effects (6), density, spacing scale, MCP component recommendations (4 categories), and design rules.

---

# WHAT'S MISSING

1. **No visual gallery** — Users can't browse/select presets visually
2. **No adjustment knobs** — Presets are static, no color/radius/density/motion adjustment
3. **No preset → prompt connection** — Selected preset doesn't affect agent prompts
4. **No preset → component connection** — Components don't adapt to selected preset
5. **MCP components not mapped** — Presets define recommendations but no routing logic
6. **Inconsistent styling** — Some components use design system, others use raw Tailwind
7. **Sessions tab** — Still 600+ lines of inline raw Tailwind in TerminalPage.tsx
8. **Files tab** — Uses raw divs, not the design system
9. **Context tabs** — Not using the design system

---

# SYSTEM CONNECTIVITY

The workspace is connected to the backend via 100+ IPC handlers in `src/main.ts` (28,000+ lines). Key connections:

- **Terminal spawn**: `spawn-terminal` → node-pty → agent state machine → `agent:send` → `save-terminal-session`
- **System prompt**: 8-layer assembly in `initializeTerminal()` → default → general → agent-specific → project-specific → init content → thought process → auto-context → config directives
- **Context auto-injection**: `assemble-context` IPC called during session creation with 2000 token budget
- **Cross-session sync**: file locks (in-memory), context broadcast, `/sync` command
- **Auto-assign routing**: LLM-backed routing via OpenRouter API, cost tracking
- **Workspace persistence**: `workspace:save/load` serializes/deserializes full state (layout, tabs, presets, configs, scrollback)
- **Analytics**: `get-ai-usage-summary`, `get-problems`, `get-requests`, `get-prompt-history`

Full connectivity map: `agent/docs/workspace-system-map.md`

---

# DESIGN SKILLS AVAILABLE

1. **Frontend Design** — DeskFlow-specific component patterns, tokens, spacing, typography, glass cards
2. **Human-Centric UX** — empty/loading/error states, progressive disclosure, visual hierarchy, feedback
3. **Impeccable** — 7 design dimensions (typography, color, spatial, motion, interaction, responsive, UX writing), 27 anti-patterns
4. **Design Taste System** — design variance knobs (variance=6, motion=4, density=7), anti-repetition rules
5. **frontend-external-infra** — source routing, re-skin rules, anti-slop checklist

---

# DESIGN TOKENS

```
Background:     zinc-950 (base), zinc-900 (elevated), zinc-900/50 (glass)
Primary:        pink-500 (accent), pink-400 (hover), pink-600 (active)
Secondary:      cyan-400 (info), emerald-400 (success), amber-400 (warning)
Text:           zinc-100 (primary), zinc-400 (secondary), zinc-600 (disabled)
Border:         zinc-800 (subtle), zinc-700 (active), zinc-600/50 (glass edge)
Font:           Geist (body), JetBrains Mono (code)
Font sizes:     Badge 11px, Meta 12px, Body 13px, Card title 13px/600, Section h2 15px/600, Page title 18px/600
Border radius:  max rounded-xl (12px)
Card padding:   p-5 (20px)
Spacing:        8px grid, xs=4px, sm=8px, md=12px, lg=16px, xl=24px
Motion:         fast=150ms, normal=250ms, slow=400ms, ease-out=cubic-bezier(0.16,1,0.3,1)
```
