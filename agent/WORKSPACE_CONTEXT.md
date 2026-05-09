# 🚀 Workspace Feature Context (For External AI Agents)

**Purpose:** Complete context about the DeskFlow workspace feature, IDE projects integration, terminal system, and AI agent coding setup.

**Last Updated:** 2026-05-06
**Maintainer:** AI Development Team

---

## 🎯 Overview

The **Workspace** feature is a comprehensive IDE projects management + terminal interface that allows users to:
1. **Manage IDE projects** - Detect installed IDEs, organize coding projects, track extensions
2. **Launch integrated terminals** - Multi-pane terminal with `@xterm/xterm`
3. **Run AI coding agents** - OpenCode, Claude Code, Codex, Aider, Cursor directly in terminals
4. **Workspace productivity tools** - Presets, TODOs, prompt templates, file browser, session history

### Key Pages:
- **`IDEProjectsPage.tsx`** - Project management, IDE detection, project browser
- **`TerminalPage.tsx`** - Terminal interface with sidebar tools (presets, sessions, todos, files, prompts)
- **Connection** - IDEProjectsPage opens TerminalPage with `projectId` + `projectPath` props

---

## 🏗️ Architecture

### Data Flow Diagram:
```
IDEProjectsPage.tsx
    ↓ (click "Open Workspace")
    <TerminalPage projectId={id} projectPath={path} />
    ↓
    TerminalWindow.tsx (xterm renderer)
    ↓
    main.ts IPC Handlers
    ↓
    SQLite DB (terminal_layouts, terminal_presets, terminal_sessions, workspace_todos, prompt_templates)
```

### Component Hierarchy:
```
IDEProjectsPage
├── Project Grid (detected IDEs, project cards)
├── Project Detail Modal
└── Workspace View (conditional)
    └── TerminalPage (with projectId + projectPath)
        ├── Header (project switcher, agent selector, New Terminal button)
        ├── Sidebar (7 tabs: Presets, Sessions, Todos, Files, Prompts, Map, Analytics)
        └── TerminalLayout (from useTerminalLayout hook)
            └── TerminalWindow (xterm instances)
                └── PaneNode (split panes, each with xterm instance)
```

---

## 📂 Key Files & Purpose

| File | Purpose | Lines |
|------|---------|-------|
| `src/pages/IDEProjectsPage.tsx` | IDE detection, project CRUD, workspace launcher | ~3271 |
| `src/pages/TerminalPage.tsx` | Terminal UI, sidebar tabs, AI agent integration | ~1256 |
| `src/components/TerminalWindow.tsx` | xterm rendering, pane management, spawn logic | ~??? |
| `src/hooks/useTerminalLayout.ts` | Layout persistence, pane tree management | ~??? |
| `src/main.ts` | IPC handlers for all workspace features | ~7000+ |
| `src/preload.ts` | Exposes terminal API to renderer | ~??? |

---

## 🤖 AI Agent Integration

### Supported Agents:
```typescript
const availableAgents = [
  { id: 'opencode', name: 'OpenCode', command: 'opencode' },
  { id: 'claude', name: 'Claude Code', command: 'claude' },
  { id: 'codex', name: 'Codex', command: 'codex' },
  { id: 'aider', name: 'Aider', command: 'aider' },
  { id: 'cursor', name: 'Cursor', command: 'cursor' },
];
```

### Agent Selection Flow:
1. User selects agent from dropdown in TerminalPage header
2. Selection saved to `localStorage('terminal-selected-agent')`
3. "Start Chat" button launches selected agent in active terminal
4. "Start New Chat" in Sessions tab uses selected agent
5. Presets execute in active terminal (respects agent context)

### Starting an AI Chat:
```typescript
// TerminalPage.tsx ~line 370-380
const startChat = useCallback(async (terminalId: string) => {
  const agent = availableAgents.find(a => a.id === selectedAgent);
  if (!agent) return;
  
  const result = await window.deskflowAPI?.terminalWrite(
    terminalId,
    `${agent.command}\n`
  );
  // ...
}, [selectedAgent]);
```

---

## 🖥️ Terminal System (hterminal)

### Technology:
- **Terminal Emulator:** `@xterm/xterm` (not `hterm` or `hterminal` - that was likely a misconception)
- **Multi-pane support:** Split panes via `TerminalLayout` component
- **Active terminal tracking:** `activeTerminalId` state, updated via `onActiveTerminalChange` callback

### Terminal Spawn Logic:
```typescript
// TerminalPage.tsx ~line 250-280
const spawnTerminal = useCallback(async (terminalId: string, cwd?: string) => {
  const targetCwd = cwd || propProjectPath || defaultCwd;
  
  // Try new API first (createTerminal)
  let result = await window.deskflowAPI?.createTerminal?.(terminalId, targetCwd);
  
  if (!result?.success) {
    // Fallback to legacy API
    result = await window.deskflowAPI?.spawnTerminal?.(terminalId, targetCwd);
  }
  
  if (result?.success) {
    setSpawnedTerminals(prev => new Set([...prev, terminalId]));
  }
}, [propProjectPath]);
```

### Key Terminal IPC Endpoints:
- `terminal:spawn` / `spawnTerminal` - Legacy spawn
- `terminal:create` / `createTerminal` - New create method
- `terminal:write` / `terminalWrite` - Write command to terminal
- `terminal:destroy` / `destroyTerminal` - Kill terminal process
- `terminal:resize` - Resize terminal
- `terminal:onData` - Listen for terminal output

---

## 🗂️ Workspace Sidebar Tabs

### Tab Types:
```typescript
type TabType = 'presets' | 'sessions' | 'todos' | 'files' | 'prompts' | 'map' | 'analytics';
```

### 1. Presets Tab:
- **Purpose:** Save/reuse common terminal commands
- **DB Table:** `terminal_presets`
- **Fields:** id, name, command, category
- **Execute:** Writes command to active terminal via `terminalWrite`

### 2. Sessions Tab:
- **Purpose:** View AI agent chat history
- **DB Table:** `terminal_sessions`
- **Fields:** id, agent, topic, resume_id, started_at, total_cost_usd
- **Chat View:** Click session → `getSessionMessages()` → render chat bubbles
- **Supports:** OpenCode (SQLite), Claude Code (JSONL), Codex (JSONL)

### 3. Todos Tab:
- **Purpose:** Project-specific task tracking
- **DB Table:** `workspace_todos`
- **Fields:** id, project_id, text, completed, priority, created_at
- **Operations:** Add, toggle, delete

### 4. Files Tab:
- **Purpose:** Browse `agent/` directory markdown files
- **IPC:** `read-agent-file`, `list-agent-files`
- **Features:** Navigate subdirectories, view markdown content
- **Scope:** Uses `propProjectPath + '/agent'` (not hardcoded)

### 5. Prompts Tab:
- **Purpose:** Save/format reusable prompts
- **DB Table:** `prompt_templates`
- **Fields:** id, project_id, name, content, category, is_formatting_template
- **Actions:** Copy to clipboard, insert into active terminal

### 6. Map Tab:
- **Purpose:** Visual project structure overview (placeholder)

### 7. Analytics Tab:
- **Purpose:** AI usage analytics (tokens, cost, by tool)
- **Data Source:** `getIDEProjectsOverview()` → `aiUsage` object

---

## 💾 Database Schema

### Workspace Tables:

#### `terminal_layouts`
```sql
CREATE TABLE terminal_layouts (
  id INTEGER PRIMARY KEY,
  project_id TEXT,
  layout_json TEXT,  -- PaneNode tree as JSON
  active_terminal_id TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

#### `terminal_presets`
```sql
CREATE TABLE terminal_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  category TEXT,
  created_at DATETIME
);
```

#### `terminal_sessions`
```sql
CREATE TABLE terminal_sessions (
  id TEXT PRIMARY KEY,
  agent TEXT NOT NULL,
  topic TEXT,
  resume_id TEXT,
  started_at DATETIME,
  total_cost_usd REAL
);
```

#### `workspace_todos`
```sql
CREATE TABLE workspace_todos (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT 0,
  priority TEXT DEFAULT 'medium',
  created_at DATETIME
);
```

#### `prompt_templates`
```sql
CREATE TABLE prompt_templates (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  is_formatting_template BOOLEAN DEFAULT 0,
  created_at DATETIME
);
```

---

## 🔌 IPC Endpoints (Workspace-Related)

### In `main.ts`:

#### Layout & Workspace:
- `workspace:save` - Save terminal layout + active terminal ID
- `workspace:load` - Load layout for project or global

#### Presets:
- `get-terminal-presets` - List all presets
- `add-terminal-preset` - Add new preset
- `remove-terminal-preset` - Delete preset

#### Sessions:
- `get-terminal-sessions` - List AI chat sessions
- `get-session-messages` - Get chat history for session

#### Todos:
- `get-workspace-todos` - List todos (filter by project_id)
- `add-workspace-todo` - Add new todo
- `toggle-workspace-todo` - Toggle completion
- `delete-workspace-todo` - Delete todo

#### Prompts:
- `get-prompt-templates` - List prompt templates
- `save-prompt-template` - Save new/update prompt
- `delete-prompt-template` - Delete prompt

#### Agent Files:
- `read-agent-file` - Read markdown file from agent directory
- `list-agent-files` - List files in agent directory

#### Terminal Spawn:
- `terminal:spawn` - Legacy terminal spawn
- `terminal:create` - New terminal create
- `terminal:write` - Write to terminal
- `terminal:destroy` - Kill terminal
- `terminal:resize` - Resize terminal

---

## 🔗 IDE Projects Integration

### IDE Detection (`main.ts` ~line 3300-3650):
Detects installed IDEs via:
1. **Command existence** - `where code`, `where idea64`, etc.
2. **JetBrains Toolbox** - Parse `.toolbox.xml` config
3. **Directories** - Check `%LOCALAPPDATA%/JetBrains` etc.
4. **Environment variables** - `IDE_INSTALL_LOCATION`

### Supported IDEs:
- VS Code / VSCode Insiders
- Cursor
- IntelliJ IDEA (Community + Ultimate)
- PyCharm (Community + Professional)
- WebStorm, PhpStorm, RubyMine, GoLand, CLion, Rider, DataGrip
- Android Studio
- Xcode (macOS)
- Google Antigravity

### Project Management:
- **DB Table:** `ide_projects` (id, name, path, default_ide, category, etc.)
- **Extensions:** `ide_extensions` (per IDE, tracks installed extensions)
- **Open Project:** `open-project` IPC → launches IDE with project path

### Opening Workspace:
```typescript
// IDEProjectsPage.tsx ~line 3220-3270
const openWorkspace = (project: any) => {
  setWorkspaceProject(project);
  setIsWorkspaceOpen(true);
};

// Render:
{isWorkspaceOpen && workspaceProject && (
  <TerminalPage 
    projectId={workspaceProject.id} 
    projectPath={workspaceProject.path} 
  />
)}
```

---

## 🚦 Key Data Flows

### 1. Project → Terminal → Agent Chat:
```
User clicks "Open Workspace" in IDEProjectsPage
  ↓
TerminalPage receives projectId + projectPath props
  ↓
TerminalPage spawns terminal with CWD = projectPath
  ↓
User selects agent (e.g., 'opencode') from dropdown
  ↓
Clicks "Start Chat" → writes "opencode\n" to terminal
  ↓
Agent launches in terminal, CWD = project directory
```

### 2. Preset Execution:
```
User saves preset (e.g., "npm install")
  ↓
Preset stored in terminal_presets table
  ↓
User clicks preset in sidebar
  ↓
Preset command written to ACTIVE terminal
  ↓
Command executes in terminal with project CWD
```

### 3. Session History View:
```
User clicks "Sessions" tab
  ↓
Load sessions from terminal_sessions table
  ↓
User clicks session → getSessionMessages(sessionId)
  ↓
Parse messages from agent storage:
  - OpenCode: SQLite DB
  - Claude/Codex: JSONL file
  ↓
Render as chat bubbles (role, content, timestamp, model)
```

---

## ⚠️ Critical Implementation Details

### 1. Active Terminal Tracking:
- **Problem:** Multiple terminals can exist (split panes)
- **Solution:** `activeTerminalId` state, updated via `onActiveTerminalChange` callback from TerminalLayout
- **Presets/Sessions execute in active terminal**

### 2. Spawned Terminal Tracking:
- **Problem:** Terminals shouldn't spawn twice
- **Solution:** `spawnedTerminals` Set (now `useRef` to avoid stale closures)
- **Clear on:** Project switch (CWD change), pane close

### 3. Project-Scoped Data:
- Todos, prompts can be project-specific (project_id field)
- Files tab reads from `projectPath + '/agent'`
- Terminal CWD = projectPath

### 4. Agent File Path Resolution:
- **Build:** `__dirname + '/..'` → project root
- **Dev:** Use `propProjectPath` directly
- **Wrong (fixed):** `__dirname + '/../..'` went outside project

---

## 🐛 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|------|-----|
| "spawn ENOENT" on terminal spawn | Shell not found, wrong CWD | Check CWD, use `createTerminal` not `spawn` |
| Presets write to wrong terminal | Hardcoded `'term-initial'` | Use `activeTerminalId` state |
| Two terminals on startup | Default layout created automatically | Return `null` from `useTerminalLayout` |
| Agent files empty | Path resolution wrong | Use `__dirname + '/..'` in built app |
| "No shell data after 5s" | Terminal not actually spawned | Check `spawnedTerminals` tracking |
| Session messages empty | Wrong agent storage path | Check agent's data directory per OS |

---

## 📖 For External AI Agents

### When asked to modify workspace/terminal features:

1. **Read these files FIRST:**
   - `src/pages/TerminalPage.tsx` - Main terminal UI + sidebar
   - `src/pages/IDEProjectsPage.tsx` - Project management
   - `src/components/TerminalWindow.tsx` - xterm rendering
   - `src/main.ts` (workspace IPC handlers ~line 3200-4000)

2. **Understand the prop flow:**
   - `IDEProjectsPage` → `TerminalPage` via `projectId` + `projectPath`
   - `TerminalPage` → `TerminalWindow` via layout + callbacks
   - All terminal operations go through `window.deskflowAPI` (preload)

3. **Database changes:**
   - Add migrations in `main.ts` `initializeDatabase()`
   - Use `getDb()` helper (not global `db`) for null safety
   - Wrap ALTER TABLE in try/catch (SQLite fails if column exists)

4. **IPC patterns:**
   - Handler: `ipcMain.handle('channel', async (event, ...args) => {...})`
   - Call: `window.deskflowAPI?.channelName?.(...args)`
   - Always return `{ success: boolean, data?: any, error?: string }`

5. **Terminal spawn pattern:**
   - Try `createTerminal` first (newer API)
   - Fallback to `spawnTerminal` (legacy)
   - Always track spawned terminals to avoid duplicates
   - Use `projectPath` as CWD (not hardcoded paths)

6. **State updates:**
   - Update `state.md` after EVERY change
   - Update `context.md` if architecture changes
   - Document new IPC endpoints in `data.md`

---

## 🎯 Quick Reference

### Key Imports for TerminalPage:
```typescript
import { TerminalLayout, PaneNode } from '../components/TerminalWindow';
import { useTerminalLayout } from '../hooks/useTerminalLayout';
import { Terminal as XTerminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
```

### Key State in TerminalPage:
```typescript
const [activeTerminalId, setActiveTerminalId] = useState('term-initial');
const [selectedAgent, setSelectedAgent] = useState('opencode');
const [terminalLayout, setTerminalLayout] = useTerminalLayout();
const [presets, setPresets] = useState<Preset[]>([]);
const [sessions, setSessions] = useState<Session[]>([]);
const [todos, setTodos] = useState<Todo[]>([]);
const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
```

### Key IPC Calls:
```typescript
// Spawn terminal
window.deskflowAPI?.createTerminal?.(terminalId, cwd);

// Write to terminal
window.deskflowAPI?.terminalWrite?.(terminalId, command);

// Save workspace
window.deskflowAPI?.saveWorkspace?.(projectId, layout, activeTerminalId);

// Load workspace
window.deskflowAPI?.loadWorkspace?.(projectId);
```

---

**End of WORKSPACE_CONTEXT.md**
