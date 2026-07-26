# CONTEXT_BUNDLE.md — Workspace Feature Diagnostic

**Last Updated:** 2026-06-13
**Purpose:** Self-contained reference for target AI to understand ALL workspace/IDE features, their file locations, IPC endpoints, data flows, and code logic. The target AI should use this to ask targeted diagnostic questions.

---

## Directory Structure

```
agent/docs/workspace-feature-diagnostic-13062026/
├── CONTEXT_BUNDLE.md         ← this file
├── PROMPT.md                 ← the task prompt for the target AI
└── Q&A/                      ← created iteratively during back-and-forth
    ├── 01-feature-name.md    ← questionnaire per feature
    └── ...
```

---

## 1. Architecture Overview

### Key Pages

| Page | File | Lines | Purpose |
|------|------|-------|---------|
| IDE Projects | `src/pages/IDEProjectsPage.tsx` | ~3989 | IDE detection, project CRUD, workspace launcher, AI/git/analytics tabs |
| Terminal/Workspace | `src/pages/TerminalPage.tsx` | ~6136 | Terminal UI, sidebar tabs (12), AI agent integration, session management |
| Terminal Component | `src/components/TerminalWindow.tsx` | ~607 | xterm rendering, pane management, split layout |
| Init Progress | `src/components/InitializeProgressModal.tsx` | ~400+ | 16-step grouped progress display |
| Workspace Settings | `src/components/WorkspaceSettingsDialog.tsx` | ~400+ | Workspace configuration dialog |
| Map Editor | `src/components/MapEditor.tsx` | — | Drag-to-rearrange + drag-to-split pane editor |
| Terminal Mini Map | `src/components/TerminalMiniMap.tsx` | — | Visual pane layout overview |
| New Session Dialog | `src/components/NewSessionDialog.tsx` | — | Setup/Initialize dialog with 6 context toggle cards |
| Instruction Panel | `src/components/InstructionPanel.tsx` | — | Full compose panel with problems/requests/skills |
| Context Sidebar | `src/components/ContextSidebar.tsx` | — | Context management sidebar |

### Main Process

| File | Relevant Lines | Purpose |
|------|---------------|---------|
| `src/main.ts` | ~7000+ total | ALL IPC handlers including workspace/terminal/project |
| `src/preload.ts` | ~200+ | IPC bridge via contextBridge |

---

## 2. Complete Feature Inventory

### 2.1 IDE Projects Page Features (FEATURE_TRACKER §5)

#### 5.1 IDE Detection
- **Files:** `src/main.ts` (~3300-3650), `src/pages/IDEProjectsPage.tsx`
- **Detection methods:**
  - Command existence (`where code`, `where idea64`)
  - JetBrains Toolbox config (`.toolbox.xml`)
  - Directory scanning (`%LOCALAPPDATA%/JetBrains`)
  - Environment variables (`IDE_INSTALL_LOCATION`)
- **Supported IDEs:** VS Code, VS Code Insiders, Cursor, IntelliJ IDEA (Community + Ultimate), PyCharm (Community + Professional), WebStorm, PhpStorm, RubyMine, GoLand, CLion, Rider, DataGrip, Android Studio, Xcode, Google Antigravity

#### 5.2 Project Management
- **Files:** `IDEProjectsPage.tsx:175-3989`
- **DB Table:** `ide_projects`
- **Add Project:** Manual add with name, path, default IDE
- **IPC:** `add-ide-project`, `update-ide-project`, `delete-ide-project`, `get-ide-projects-overview`
- **Quick Add:** Scans IDE default directories for projects
- **Custom Directory Scanning:** `scan-custom-directory` IPC, multi-dir persistence via `localStorage('customScanDirs')`

#### 5.3 Extension Tracking
- **Files:** `IDEProjectsPage.tsx` (per-IDE extension list)
- **DB Table:** `ide_extensions`
- **Tracks:** Name, version, enabled/disabled status per IDE

#### 5.4 Open Project in IDE
- **IPC:** `open-project` → launches IDE with project path
- **Preload:** `src/preload.ts:232`

#### 5.5 Workspace Launch
- Opens `TerminalPage` as a modal with `projectId` + `projectPath` props
- **Files:** `IDEProjectsPage.tsx:3904-3986` (Terminal Workspace Modal section)

#### 5.6 AI Usage Overview
- **IPC:** `getIDEProjectsOverview()` → returns `{ ides, tools, projects, aiUsage, commits }`
- **AI tracking:** Per-agent token/cost/session/message counts
- **Preload:** `src/preload.ts:242`

#### 5.7 Project Analytics
- **Charts:** Commits, additions, deletions (if git repo)
- **Health score:** Path-based matching fix
- **Consolidated:** Single IPC call `getProjectDetails`

#### 5.8 IDE Tools Detection
- Version Control: Git, SVN
- Runtimes: Node.js, Python, Java
- Package Managers: npm, yarn, pip
- Databases: MySQL, PostgreSQL, MongoDB
- Cloud: AWS, Azure, GCP CLIs

#### 5.9 Project Search & Filter
- Search by name or path
- Filter by IDE, category

#### 5.10 Project Categories
- Web Development, Mobile Development, Data Science, DevOps, Other

#### 5.11 Analytics Tab
- `AnalyticsDashboard` component with `variant="workspace"`
- Shows: Token usage, cost, problem counts, request stats

#### 5.12 Initialize Button
- **UI:** Green `FolderTree` button in project header
- **Opens:** `InitializeProgressModal` with 16-step grouped progress
- **Groups:** agent/, agent/skills/, graphify-out/
- **Features:** Per-group counters, expandable file previews, Workspace Ready card, error retry

#### 5.13 Setup Button
- **UI:** Amber `Settings2` button
- **Opens:** `WorkspaceSettingsDialog`
- **Settings:** System toggles, slider adjustments, save persistence

#### 5.14 New Agent Button
- Dispatches `open-new-agent` event
- Opens `NewSessionDialog` pre-populated from workspace settings

#### 5.15 Workspace Minimize
- Hides terminal layout + sidebar, keeps PTY alive
- Centered restore card to bring workspace back

#### 5.16 Close Workspace with Save Prompt
- Save & Close / Discard / Cancel dialog

#### 5.17 Health Score Fix
- Path-based matching for AI usage queries

#### 5.18 Consolidated getProjectDetails
- Single IPC call instead of 4 parallel calls

#### 5.19 Setup vs Initialize Separation
- Initialize: Creates agent directory structure + scaffold files
- Setup: Configures workspace settings (systems, toggles, sliders)

---

### 2.2 Terminal / Workspace Features (FEATURE_TRACKER §6)

#### 6.1 Multi-Pane Terminal
- **Technology:** `@xterm/xterm` terminal emulator with `node-pty` backend
- **Files:** `TerminalWindow.tsx`, `TerminalPage.tsx`
- **Layout:** N-ary tree (PaneNode.children refactored from binary tuple to array)
- **Layout helpers:** `extractGroups()`, `collectLeafIds()`, `togglePaneDirection()`, `findLeafInTree()`, `removeLeafFromTree()`, `addLeafToGroup()`
- **Agent integration:** OpenCode, Claude Code, Codex, Aider, Cursor
- **Agent readiness:** State machine (spawning → waiting → ready|timeout)
- **Key IPC:** `terminal:create`, `terminal:resize`, `terminal:destroy`, `terminal:write`, `terminal:write-raw`, `agent:send`

#### 6.2 Sidebar Tabs (12 tabs)

**Tab Group 1 — Management:**

1. **Presets Tab** — Save/reuse commands, DB: `terminal_presets`
2. **Sessions Tab** — Session history, DB: `terminal_sessions`, status tracking, message viewer
3. **Map Tab** — `TerminalMiniMap`, `MapEditor`, drag-to-rearrange/split via `@dnd-kit`
4. **Analytics Tab** — AI usage analytics, period selection, overview cards
5. **Problems Tab** — Problem/issue tracking, status filter, glass cards, ProblemDetailModal
6. **Requests Tab** — Feature request tracking, link/unlink problems
7. **Files Tab** — Browse `agent/` markdown files, IPC: `read-agent-file`, `list-agent-files`

**Tab Group 2 — Utilities:**

8. **Checklists Tab** — Placeholder (future implementation)
9. **Skills Tab** — Manage AI skills from `agent/skills/`, Skill DSL, 10 widget types
10. **Configs Tab** — Model config, cross-session sync config, thought-process toggle
11. **History Tab** — Prompt history with search/filter/delete
12. **Context Maintenance Tab** — Memory management, 6 sub-components
13. **Prompts Tab** — Project-specific prompt editing

#### 6.3 Layout & Group System
- N-ary tree layout with group extraction
- Layout persistence via `workspace:save` / `workspace:load` IPC
- Split handle drag resize
- Hover controls (split/close buttons)

#### 6.4 AI Agent Integration
- **Agents:** OpenCode, Claude Code, Codex, Aider, Cursor
- **Agent switching** via session edit dialog
- **Session management:** NewSessionDialog, resume via `resume_id`
- **Init content:** INITIALIZE.md, custom init files, problem/request context
- **Thought Process toggle** — injects instruction after system prompt
- **Skill DSL** — 10 widget types from YAML frontmatter

#### 6.5 Instruction Panel
- Full composer with problem/request checkboxes, skill dropdown, prompt preview
- Markdown preview, copy button, persistence via localStorage
- System prompt layers (collapsible include/exclude toggles)

#### 6.6 Session Categorization
- Categories: feature, bug-fix, research, code-review, refactor, devops, docs, other
- Auto-analysis with keyword scoring fallback
- CategoryBadge + StatusDot components
- @mention routing dropdown
- AI Metadata Contract (structured metadata from AI output)

#### 6.7 File Change Detection
- `onAgentFileChanged` IPC event
- Green ping animation on Files tab

#### 6.8 Project Integration
- Receives `projectId`, `projectPath` from IDEProjectsPage
- CWD = projectPath
- Scoped data per project

#### 6.9 Workspace Save/Load
- `workspace:save` IPC → saves layout + activeTab + terminalTabs
- `workspace:load` IPC → restores workspace state
- Auto-save debounced 2s

#### 6.10 Compose & Prompt Systems
- Short compose: Quick prompt for active terminal
- Long compose: Full InstructionPanel
- PromptDesignDialog: generate-prompt skill workflow
- System prompt layers: Default + general + project + session

#### 6.11 Terminal Management
- New/close/split/resize terminals
- Project switcher, sidebar toggle
- Input buffer (buffers keystrokes before PTY ready)
- Workspace close dialog
- Context-changed UI refresh

#### 6.12 Cross-Session Sync
- File lock manager (in-memory lock registry, 60s TTL)
- Conflict detection via `detectEditsInOutput()`
- 7 IPC handlers: `lock-file`, `release-file-lock`, `get-file-locks`, `get-locks-for-terminal`, `get-touched-files`, `compile-sync-summary`, `broadcast-context-delta`
- Context broadcast with batch events

---

## 3. Data Flows

### Project → Terminal → Agent Chat
```
IDEProjectsPage "Open Workspace" click
  → TerminalPage receives projectId + projectPath props
  → TerminalPage spawns terminal with CWD = projectPath
  → User selects agent from dropdown
  → Clicks "Start Chat" → writes agent command to terminal
  → Agent launches in terminal, CWD = project directory
```

### Workspace Init Flow
```
Initialize button → InitializeProgressModal
  → runInitAll() creates agent/ files + directories
  → Templates written to disk
  → "Workspace Ready" summary card shown
```

### Session Creation Flow
```
Setup button → NewSessionDialog → onCreate callback
  → buildInitContent() reads: AGENTS.md, INITIALIZE.md, GRAPH_REPORT.md, QMD, skills
  → assembleContext() reads: PARA, LLM Wiki, Graphify, skills, QMD
  → Merge → initContent string
  → spawnTerminal() → creates PTY via node-pty
  → initializeTerminal() → writes launch command → waits for agent:ready
  → initializeSession() → sets up actions file watcher
```

---

## 4. Database Schema

### `ide_projects`
```sql
CREATE TABLE ide_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  default_ide TEXT,
  category TEXT DEFAULT 'Other',
  primary_language TEXT,
  vcs_type TEXT,
  repository_url TEXT,
  trashed INTEGER DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME
);
```

### `ide_extensions`
```sql
CREATE TABLE ide_extensions (
  id TEXT PRIMARY KEY,
  ide_id TEXT,
  name TEXT NOT NULL,
  version TEXT,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME
);
```

### `terminal_presets`
```sql
CREATE TABLE terminal_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  category TEXT,
  created_at DATETIME
);
```

### `terminal_sessions`
```sql
CREATE TABLE terminal_sessions (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,
  topic TEXT,
  resume_id TEXT,
  started_at DATETIME,
  total_cost_usd REAL,
  total_tokens INTEGER,
  status TEXT DEFAULT 'active',
  category TEXT,
  product_area TEXT,
  description TEXT,
  auto_tags TEXT,
  category_confirmed INTEGER DEFAULT 0,
  terminal_id TEXT,
  project_id TEXT
);
```

### `terminal_messages`
```sql
CREATE TABLE terminal_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  role TEXT,
  content TEXT,
  model TEXT,
  created_at DATETIME
);
```

### `workspace_state`
```sql
CREATE TABLE workspace_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT,
  sidebar_width INTEGER DEFAULT 320,
  active_tab TEXT DEFAULT 'presets',
  terminal_tabs TEXT, -- JSON array of terminal states
  is_minimized INTEGER DEFAULT 0,
  layout_json TEXT, -- PaneNode tree
  updated_at DATETIME
);
```

### `project_health`
```sql
CREATE TABLE project_health (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  score REAL,
  issues INTEGER DEFAULT 0,
  last_analyzed DATETIME,
  metrics TEXT -- JSON
);
```

---

## 5. IPC Endpoints

### IDE / Project Management (preload.ts)
| IPC Channel | Preload Method | Line | Purpose |
|-------------|---------------|------|---------|
| `get-ide-projects-overview` | `getIDEProjectsOverview()` | 242 | Get all IDE/project/tool/AI data |
| `add-ide-project` | `addIDEProject()` | — | Add new project |
| `update-ide-project` | `updateIdeProject()` | — | Update project details |
| `delete-ide-project` | `deleteIdeProject()` | — | Soft-delete to trash |
| `restore-ide-project` | `restoreIdeProject()` | — | Restore from trash |
| `get-detected-ides` | `getDetectedIDEs()` | — | Scan for installed IDEs |
| `open-project` | `openProject()` | 232 | Launch IDE with project |
| `scan-custom-directory` | `scanCustomDirectory()` | 235 | Scan dir for code projects |
| `detect-language` | `detectLanguage()` | — | Auto-detect project language |
| `pick-folder` | `pickFolder()` | 184 | Native folder picker |
| `sync-commits` | `syncCommits()` | — | Git commit sync |
| `sync-github-commits` | `syncGitHubCommits()` | — | GitHub API commit sync |
| `get-commit-history` | `getCommitHistory()` | — | Get git commits |
| `get-contributor-stats` | `getContributorStats()` | — | Contributor statistics |
| `get-dora-metrics` | `getDORAMetrics()` | — | DORA metrics |

### Terminal / Workspace (preload.ts)
| IPC Channel | Preload Method | Line | Purpose |
|-------------|---------------|------|---------|
| `terminal:create` / `createTerminal` | `createTerminal()` | — | Spawn new terminal |
| `terminal:write` / `terminalWrite` | `terminalWrite()` | — | Write to terminal |
| `terminal:destroy` / `destroyTerminal` | `destroyTerminal()` | — | Kill terminal |
| `terminal:resize` | `terminalResize()` | — | Resize terminal |
| `terminal:write-raw` | `terminalWriteRaw()` | — | System write (no history) |
| `agent:send` | `agentSend()` | — | Send to agent (queued) |
| `workspace:save` | `saveWorkspace()` | 467 | Save layout + state |
| `workspace:load` | `loadWorkspace()` | 472 | Load workspace state |
| `get-terminal-presets` | `getTerminalPresets()` | 332 | List presets |
| `add-terminal-preset` | `addTerminalPreset()` | 334 | Add preset |
| `remove-terminal-preset` | `removeTerminalPreset()` | — | Delete preset |
| `get-terminal-sessions` | `getTerminalSessions()` | — | List sessions |
| `get-session-messages` | `getSessionMessages()` | — | Get chat history |
| `update-session-category` | `updateSessionCategory()` | — | Categorize session |
| `read-agent-file` | `readAgentFile()` | — | Read agent/ markdown |
| `list-agent-files` | `listAgentFiles()` | — | List agent/ files |
| `get-workspace-todos` | `getWorkspaceTodos()` | — | List todos |
| `add-workspace-todo` | `addWorkspaceTodo()` | — | Add todo |
| `toggle-workspace-todo` | `toggleWorkspaceTodo()` | — | Toggle complete |
| `delete-workspace-todo` | `deleteWorkspaceTodo()` | — | Delete todo |
| `lock-file` | — | — | Cross-session file lock |
| `release-file-lock` | — | — | Release file lock |
| `get-file-locks` | — | — | List file locks |
| `get-locks-for-terminal` | — | — | Locks per terminal |
| `get-touched-files` | — | — | Touched files per terminal |
| `compile-sync-summary` | — | — | Compile sync summary |
| `broadcast-context-delta` | — | — | Broadcast context changes |

---

## 6. State Management (IDEProjectsPage.tsx)

### Key State Variables (lines 176-270)

```typescript
const [overview, setOverview] = useState<Overview | null>(null);          // Full IDE overview
const [loading, setLoading] = useState(true);                              // Loading state
const [activeTab, setActiveTab] = useState<TabKey>('overview');           // 7 tabs
const [selectedProject, setSelectedProject] = useState<string | null>(null);
const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);            // Workspace modal
const [workspaceProject, setWorkspaceProject] = useState<any>(null);      // Current workspace
const [provisionStatus, setProvisionStatus] = useState<'idle' | 'provisioning' | 'provisioned'>('idle');
const [showInitModal, setShowInitModal] = useState(false);
const [showSetupModal, setShowSetupModal] = useState(false);
const [savedCustomDirs, setSavedCustomDirs] = useState<string[]>([]);     // Multi-dir support
const [projectDetailsCache, setProjectDetailsCache] = useState<Record<string, any>>({});
```

### Tab Keys (line 150-166)
```typescript
type TabKey = 'overview' | 'projects' | 'ai' | 'git' | 'environment' | 'analytics' | 'backup';
```

---

## 7. Component Hierarchy

### IDEProjectsPage
```
IDEProjectsPage
├── PageShell wrapper
├── Overview Tab: stat cards, AI agent grid, tool categories, project list
├── Projects Tab: project grid with IDE icons, expand/collapse, workspace launch
├── AI Tools Tab: per-agent breakdown, charts, project/model breakdown
├── Git Tab: commit history, contributor stats, DORA metrics
├── Environment Tab: tools by category (versionControl, runtimes, etc.)
├── Analytics Tab: AnalyticsDashboard with variant="workspace"
├── Backup Tab: trash bin, restore functionality
├── Add Project Modal: quick-add, saved directories, manual form
├── Edit Project Modal: name, path, language, VCS, IDE
├── Delete Confirm Modal
├── Features & Capabilities Modal (help)
├── Workspace Modal (conditional)
│   └── TerminalPage (with projectId + projectPath)
│       ├── Header (close, minimize, buttons: Initialize/Setup/New Agent/Bot)
│       ├── TerminalLayout (split panes)
│       ├── Sidebar (12 tabs)
│       └── InstructionPanel
└── InitializeProgressModal
```

---

## 8. Key Implementation Details

### The 3-Button Workspace Header Actions (IDEProjectsPage.tsx:3940-3965)
```tsx
// Initialize button (green) - creates agent directory structure
<button onClick={() => setShowInitModal(true)}>
  <FolderTree /> Initialize
</button>

// Setup button (amber) - workspace settings
<button onClick={() => window.dispatchEvent(new CustomEvent('open-workspace-settings'))}>
  <Settings2 /> Setup
</button>

// New Agent button (zinc) - start AI session
<button onClick={() => window.dispatchEvent(new CustomEvent('open-new-agent'))}>
  <Bot /> New Agent
</button>
```

### Terminal Layout Tree Structure (TerminalWindow.tsx)
```typescript
interface PaneNode {
  id: string;
  type: 'leaf' | 'split';
  terminalId?: string;
  direction?: 'horizontal' | 'vertical';
  children?: PaneNode[];
  size?: number; // percentage or flex value
}
```

### Agent Readiness State Machine (TerminalPage.tsx)
```typescript
type AgentPhase = 'launching' | 'waiting' | 'ready' | 'busy' | 'timeout' | 'error';
```
- `launching`: PTY created, waiting for shell
- `waiting`: Shell ready, waiting for agent signature
- `ready`: Agent detected and responsive
- `busy`: Agent processing a request
- `timeout`: Agent didn't respond within timeout
- `error`: Agent failed to start

---

## 9. Reporting Issues

When filing diagnostic reports for individual features, include:
1. **Feature ID** (e.g., 5.12 Initialize Button)
2. **Symptoms** — what exactly doesn't work
3. **Expected behavior** — what should happen
4. **Console errors** — any error messages from devtools
5. **IPC calls involved** — which channels are called
6. **UI state** — what components are involved
7. **Data dependencies** — what DB tables/files are read/written
