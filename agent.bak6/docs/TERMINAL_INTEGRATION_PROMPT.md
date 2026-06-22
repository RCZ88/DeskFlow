# Terminal Integration & Project Page Enhancement Prompt

## Context

You're working on an Electron + React + TypeScript app called "AI Session Commander" (also called DeskFlow). The app tracks AI coding agents and provides terminal-based workflows.

## What's Been Built So Far

### Core Components

**1. Terminal Engine** (`src/components/TerminalWindow.tsx`)
- Recursive split-pane layout system using a tree structure (`PaneNode` type: `'leaf' | 'split'`)
- Split horizontally/vertically via hover buttons on each pane
- Close panes, resize via drag handles
- Each pane can run an independent terminal session

**2. Layout Persistence** (`src/hooks/useTerminalLayout.ts`)
- Provides `saveLayout()` and `loadLayout()` functions
- Saves to SQLite `terminal_layouts` table
- **Currently NOT connected** to the TerminalPage - needs integration

**3. IDE Projects Page** (`src/pages/IDEProjectsPage.tsx`)
- Tabs: Overview, IDEs, Tools, Projects, AI Tools, Git
- Project cards with health scores, tools, sessions
- AI usage tracking with charts (tokens, messages, sessions, cost)
- Project detail modal (shows tools, health, sessions)

**4. Terminal Page** (`src/pages/TerminalPage.tsx`)
- Has sidebar with Presets, Sessions, Map, Analytics tabs
- Project dropdown selector
- Terminal spawning via `window.deskflowAPI.spawnTerminal()`
- **BROKEN: Layout resets on tab switch** - no persistence connected

**5. Database Schema**
```sql
-- Per-project terminal layouts
CREATE TABLE terminal_layouts (
  id TEXT PRIMARY KEY,
  name TEXT,
  layout_data TEXT,  -- JSON blob of PaneNode tree
  is_active INTEGER DEFAULT 0,
  updated_at DATETIME
);

-- Terminal sessions for resume
CREATE TABLE terminal_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  agent TEXT,
  resume_id TEXT,
  topic TEXT,
  working_directory TEXT,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0,
  started_at DATETIME
);

-- Command presets
CREATE TABLE terminal_presets (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  name TEXT,
  command TEXT,
  working_directory TEXT,
  category TEXT
);
```

## Current Problems to Solve

### 1. Terminal Not Persistent
The `TerminalPage` component has this:
```typescript
const [terminalLayout, setTerminalLayout] = useState<PaneNode | null>(null);
```
It's just React state — switching tabs resets it. The persistence functions exist in `useTerminalLayout` but aren't being used.

### 2. Terminal is Separate from IDE Projects
- There's a separate "Terminal" sidebar/page
- Should be accessed through IDE Projects instead
- Project cards don't have terminal access

### 3. Project Selection is Weak
- Just a dropdown on Terminal page
- Should feel like a "Project Workspace" when you click a project

## What We Want (Open for Your Ideas)

### Core Vision
When you click a project in IDE Projects page, it should feel like entering that project's workspace — with terminal as a primary feature, not an afterthought.

### Suggestions (You can improve upon these)

1. **Persistent Terminal Layouts**
   - Each project has its own saved terminal layout
   - Layout survives tab switches and app restarts
   - Layout stored in SQLite, keyed by project_id

2. **Better Project Access**
   - Add "Open Terminal" or "Workspace" button on project cards
   - Clicking opens the project in "workspace mode"
   - Show active terminals count on project card

3. **Integrated Workspace View**
   - When viewing a project, show terminal alongside project info
   - Could be split-view: project details + terminal panes
   - Or full-screen terminal with project context

4. **Project-Specific Data**
   - Presets filtered by project
   - Session history filtered by project
   - Each project remembers its own layout

### Feature Ideas You Could Add

Feel free to propose new features beyond these:

- **Visual Terminal Map**: Miniature view of terminal layout (like blueprint)
- **Drag & Drop**: Reorder terminal panes visually
- **Quick Presets**: Run commands without leaving project view
- **Terminal Sharing**: Save/load terminal layouts as templates
- **Multi-Project View**: See terminals from multiple projects at once

## What to Do

1. **First, fix persistence** — Connect the existing `useTerminalLayout` hook to the TerminalPage so layouts save/load from SQLite

2. **Then, integrate with IDE Projects** — Add terminal access to project cards, make it feel like a unified workspace

3. **Finally, enhance** — Add new features that make the project workspace feel powerful

## Files You'll Touch

| File | Purpose |
|------|---------|
| `src/pages/TerminalPage.tsx` | Add persistence, project integration |
| `src/pages/IDEProjectsPage.tsx` | Add terminal buttons to project cards, workspace view |
| `src/hooks/useTerminalLayout.ts` | May need per-project support |
| `src/components/TerminalWindow.tsx` | Layout engine (probably no changes needed) |
| `src/main.ts` | IPC handlers if you need new ones |

## Guidelines

- Don't break existing functionality
- Follow the existing code patterns and style
- Use TypeScript throughout
- Test incrementally
- Ask if you need clarification

Go ahead and plan out your approach. The prompt is a starting point — improve upon it as you see fit.