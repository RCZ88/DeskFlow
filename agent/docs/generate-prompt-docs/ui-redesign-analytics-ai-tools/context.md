# 📋 Project Context

**Purpose:** Comprehensive overview of the DeskFlow project architecture, tech stack, and conventions.
**Last Updated:** 2026-05-21

---

## 🎯 Project Overview

**DeskFlow** — Electron desktop app for tracking app usage, managing AI agent workspaces (Tracker Mind), and visualizing data via a 3D solar system.

**Core Systems:**
- **App Tracking** — Real-time window/process tracking via `active-win`, SQLite DB, sleep detection
- **3D Orbit Visualization** — Three.js (R3F) solar system with procedural textures, planet categories
- **Dashboard** — Activity heatmap, weekly overview, recent sessions, device stats
- **External Tracker** — Manual activity/sleep tracking with timer, sleep patterns chart (24h bar view)
- **Tracker Mind** — AI agent workspace: terminal sessions, problem/request/checklist management, context assembly, graphify knowledge graph, skills/QMD/PARA integration
- **Terminal System** — node-pty terminals with split panes, agent session management, system prompt assembly
- **Context Management** — 6-system context assembly (LLM Wiki, Skills, Graphify, PARA, QMD, Automations)
- **Settings** — App tracking categories, tracker settings, external page config

---

## 🛠️ Tech Stack

### Core Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Electron | ~34.3 | Desktop wrapper |
| React | ^19.2.0 | UI framework |
| TypeScript | ~5.9.3 | Type safety |
| Vite | ^7.3.1 | Build tool |
| node-pty | ^1.0.0 | Terminal PTY |

### 3D & Visualization
| Technology | Version | Purpose |
|------------|---------|---------|
| Three.js | ^0.183.2 | 3D rendering |
| @react-three/fiber | ^9.5.0 | React-Three bridge |
| @react-three/drei | ^10.7.7 | Three.js helpers |
| Chart.js | ^4.5.1 | Charts |

### UI & Styling
| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 4.2.1 | Styling (v4, NOT v3) |
| Framer Motion | ^12.35.0 | Animations |
| Lucide React | ^0.577.0 | Icons |
| @xterm/xterm | ^5.6.0 | Terminal emulator |

### Data & Tracking
| Technology | Version | Purpose |
|------------|---------|---------|
| better-sqlite3 | ^12.8.0 | Database |
| active-win | ^8.2.1 | Window tracking |
| date-fns | ^4.1.0 | Date handling |

---

## 📁 Project Structure

```
App Tracker/
├── src/
│   ├── main.ts              # Electron main process — ALL IPC handlers, terminal manager, DB
│   ├── preload.ts           # IPC bridge (contextBridge.exposeInMainWorld)
│   ├── main.tsx             # React entry point
│   ├── App.tsx              # Main app component with routing
│   ├── index.css            # Tailwind v4 imports (MUST stay v4 syntax)
│   ├── pages/
│   │   ├── TerminalPage.tsx      # ~5000 lines — terminal sessions, layout, context setup, problem/request UI
│   │   ├── ExternalPage.tsx      # ~2300 lines — external activity tracker, sleep tracking, charts
│   │   ├── DashboardPage.tsx     # Main dashboard — heatmap, weekly overview, planets
│   │   ├── SettingsPage.tsx      # Settings — categories, tracking, preferences
│   │   ├── InsightsPage.tsx      # Insights — sleep trends, consistency, stats
│   │   ├── DayDetailPage.tsx     # Day detail view
│   │   └── Idev2.tsx             # IDE tracker page
│   ├── components/
│   │   ├── TerminalWindow.tsx    # Terminal pane with split layout, xterm, drag-drop groups
│   │   ├── NewSessionDialog.tsx  # Setup/Initialize dialog with 6 context toggle cards
│   │   ├── InstructionPanel.tsx  # Full compose panel — problems, requests, skills, prompt assembly
│   │   ├── PromptDesignDialog.tsx # System prompt editor/preview
│   │   ├── ProblemDetailModal.tsx # Problem CRUD with assign-to-terminal
│   │   ├── FlowView.tsx          # Flow-based problem creation
│   │   ├── OrbitSystem.tsx       # 3D solar system visualization
│   │   └── [numerous other components]
│   └── services/
│       ├── ContextService.ts     # assembleContext() — browser-safe async context assembly
│       ├── ContextConfig.ts      # ContextConfig interface + DEFAULT_CONTEXT_CONFIG
│       ├── ProblemsService.ts    # Problem CRUD (main process only)
│       ├── RequestsService.ts    # Request CRUD (main process only)
│       ├── ChecklistService.ts   # Checklist CRUD (main process only)
│       └── SkillsService.ts      # Skills CRUD (main process only)
├── agent/                       # AI agent workspace files
│   ├── state.md                 # Current project state
│   ├── context.md               # This file
│   ├── PROBLEMS.md              # Known issues tracker
│   ├── REQUESTS.md              # Feature requests
│   ├── AGENTS.md                # Agent workspace instructions
│   ├── INITIALIZE.md            # Setup instructions
│   ├── constraints.md           # Hard rules
│   ├── patterns.md              # Reusable code patterns
│   ├── data.md                  # DB schemas, IPC reference
│   ├── glossary.md              # Term definitions
│   ├── FEATURE_TRACKER.md       # Complete feature inventory
│   ├── skills/                  # Skill definitions (SKILL.md files)
│   │   ├── maintain-context/
│   │   ├── agent-reflect/
│   │   ├── fix-problems/
│   │   ├── generate-prompt/
│   │   └── ...
│   ├── templates/               # QMD templates
│   └── context/                 # Context storage (session-summaries, deep-memory)
├── graphify-out/                # Graphify knowledge graph output
├── dist/                        # Built renderer
└── dist-electron/               # Built Electron
```

---

## 🔑 Key Architectural Decisions

### Electron Architecture
- **Main process** — `src/main.ts` → `dist-electron/main.cjs` — Handles all DB, IPC, terminal PTY, file system
- **Preload** — `src/preload.ts` → `dist-electron/preload.cjs` — contextBridge with typed `deskflowAPI`
- **Renderer** — Vite builds React to `dist/` — NO direct Node access, ONLY IPC via preload
- **Communication** — `ipcMain.handle` / `ipcRenderer.invoke` for request-response; `webContents.send` / `ipcRenderer.on` for events

### Terminal System
- **PTY** — node-pty spawns native shell processes
- **Agent launch** — writes `${agentName}\n` to PTY, waits for `>` prompt (agent:ready)
- **Session management** — `terminalManager` (Map<string, TerminalInfo>) manages all PTY instances
- **Split layout** — recursive tree structure (PaneNode[]) with vertical/horizontal splits
- **Drag-drop** — visual feedback works but actual layout mutation may be broken

### Context Management (6 Systems)
Assembly order and token budgets:
1. **LLM Wiki** — `agent/*.md` files (state.md, context.md, patterns.md, etc.)
2. **Obsidian Skills** — `agent/skills/*/SKILL.md` frontmatter
3. **Graphify** — `graphify-out/GRAPH_REPORT.md` (god nodes, communities)
4. **PARA** — `CZVault/00_Projects/`, `01_Areas/`, `02_Resources/`, `03_Archives/`
5. **QMD Templates** — `agent/templates/*.qmd`
6. **Automations** — `agent/automations/`

### Database
- **Primary** — SQLite via `better-sqlite3` (electron main process only)
- **Fallback** — JSON files if SQLite unavailable (`useJson` flag)
- **Location** — `%APPDATA%/deskflow/deskflow-data.db`
- **Tables** — `app_logs`, `categories`, `tier_overrides`, `terminal_sessions`, `terminal_messages`, `terminal_bindings`, `external_activities`, `external_sessions`, `project_health`

### AI Agent Integration (Tracker Mind)
- **Actions file bridge** — AI writes `agent/actions.json` → fs.watch triggers `executeActionsFromFile()` → creates/updates problems, requests, checklists
- **Metadata parsing** — AI output `## Session Metadata` and `## Actions` blocks parsed from terminal output
- **Context-changed events** — When problems/requests/checklists change, `context-changed` IPC event notifies renderer
- **Setup flow** — NewSessionDialog → buildInitContent() + assembleContext() → spawnTerminal() → initializeTerminal() → initializeSession()

---

## 🔧 Build System

### Commands
```bash
npm run dev              # Vite dev server (web only)
npm start                # Electron app
npm run build:renderer   # Build React to dist/
npm run build:electron   # Build Electron to dist-electron/
npm run build            # Both
```

### Key Configs
- **Vite** — `base: './'` for file:// protocol
- **TypeScript** — ES2020 for Electron, ESNext for React
- **Electron** — CommonJS output (.cjs extension)
- **Tailwind** — v4 syntax ONLY (`@import "tailwindcss"`). NEVER v3 (`@tailwind base`)

---

## 📊 Data Flow

### Session Creation (Setup Agent)
```
Setup button → NewSessionDialog → onCreate callback
  → buildInitContent() reads: AGENTS.md, INITIALIZE.md, graphify-out/GRAPH_REPORT.md, QMD templates, skills
  → assembleContext() reads: PARA, LLM Wiki, GRAPH_REPORT.md, skills, QMD based on toggle cards
  → Merge → initContent string
  → spawnTerminal() → creates PTY via node-pty
  → initializeTerminal() → writes launch command → waits for agent:ready → writes merged prompt + initContent
  → initializeSession() → sets up actions file watcher
```

### Terminal Tracking Data Flow
```
active-win → main.ts polling → IPC → App.tsx → logs state
                                            ↓
                                     computePlanets()
                                            ↓
                                     PlanetData[]
                                            ↓
                                     TexturedPlanet → Three.js
```

### AI Actions Flow
```
Agent writes actions.json → fs.watch triggers → executeActionsFromFile()
  → create_problem / update_problem / complete_checklist / update_request
  → Clears actions.json to { actions: [] }
  → Should dispatch UI refresh events (currently MISSING)
```

### Metadata Parsing Flow
```
Agent terminal output → onData callback → detectAgentPrompt()
  → parseTerminalOutput() → parseSessionMetadata() + parseAndExecuteActions()
  → Updates DB (terminal_sessions, problems, requests, checklists)
  → Should dispatch UI refresh events (currently MISSING)
```

---

## ⚠️ CRITICAL Constraints

### CRITICAL: Tailwind v4 ONLY
- `src/index.css` MUST use `@import "tailwindcss";` (v4 syntax)
- NEVER change to `@tailwind base; @tailwind components; @tailwind utilities;` (v3)
- v3 directives cause silent CSS build failure

### CRITICAL: NEVER use git commands
- NEVER run `git checkout`, `git restore`, `git reset --hard`, `git stash`
- These destroy user work permanently
- Fix code manually instead

### CRITICAL: No Node access in renderer
- Renderer uses ONLY IPC via `window.deskflowAPI`
- No `require()`, no `import fs/path`, no direct DB access
- All file/DB operations go through preload bridge

### Electron + Native Modules
- `better-sqlite3` requires build tools
- JSON fallback when SQLite unavailable

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.41 | 2026-05-21 | Terminal + context system overhaul prompt generated (54 bugs documented) |
| 3.40 | 2026-05-21 | Sleep logic fixed (timeline model, 3-segment bars, correct math) |
| 3.39 | 2026-05-21 | 3 terminal bugs fixed (sizing, chunked writes, resume executable) |
| 3.38 | 2026-05-21 | Terminal system overhaul (6 phases: height, resume, system prompt, setup/init split, events, metadata) |
| 3.0+ | 2026-04-18+ | Terminal system, Tracker Mind, Context Management, Graphify, Skills, External Page |
| 1.0-2.x | 2026-04 | Initial app tracking, 3D visualization, dashboard, settings |

---

**Maintained By:** AI Development Team
