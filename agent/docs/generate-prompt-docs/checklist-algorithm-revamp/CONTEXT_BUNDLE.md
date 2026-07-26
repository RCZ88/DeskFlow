# CONTEXT_BUNDLE — Checklist Algorithm Revamp

## Project Overview

A desktop app (Electron + React + Vite + Tailwind v4) that tracks computer activity, manages AI agent sessions via opencode CLI, and provides a workspace for tracking problems, requests, and checklists. The app uses SQLite (better-sqlite3) for session/message storage and JSON files for problems/requests data in `agent/` directory.

---

## 1. Data Structures

### 1.1 Problem (src/services/ProblemsService.ts:4-21)
```typescript
interface Problem {
  id: string;           // e.g. "1.5" (N.N format)
  title: string;
  status: string;       // "NEW" | "Not Started" | "In Progress" | "AI Attempted Fix" | "User Testing" | "Fixed" | "Irrelevant"
  priority: string;     // "critical" | "high" | "medium" | "low"
  category: string;
  terminal_id: string | null;
  skill_used: string | null;
  user_notes: string | null;
  session_id: string | null;
  session_name: string | null;
  description?: string;
  fix_description?: string;
  root_cause?: string;
  files: string[];
  created_at: string;   // ISO date
  updated_at: string;   // ISO date
}
```
**NOTE:** ProblemsService currently does NOT have a `checks` field in its interface, BUT `main.ts` calls `ps.addCheck()` and `ps.completeCheck()` at runtime (typed as `any`). The Problem interface must be extended with `checks: CheckItem[]` for full checklist support.

### 1.2 CheckItem (src/services/RequestsService.ts)
```typescript
interface CheckItem {
  id: string;               // e.g. "problem-1.5-check-1" or "request-3-check-1"
  description: string;      // What needs to be done
  instruction: string;      // Verification instruction (how to verify it's done)
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}
```

### 1.3 Request (src/services/RequestsService.ts)
```typescript
interface Request {
  id: string;               // simple integer string e.g. "3"
  title: string;
  description: string;
  status: string;           // "Pending" | "In Progress" | "Completed" | "Cancelled"
  priority: string;
  category: string;
  linked_problems: string[];
  session_id: string | null;
  session_name: string | null;
  checks: CheckItem[];      // Already has checks support
  created_at: string;
  updated_at: string;
}
```

### 1.4 Terminal Session (DB table — src/main.ts:6711-6752)
```sql
terminal_sessions:
  id TEXT PRIMARY KEY        -- e.g. "session-1748308912345-abc123"
  project_id TEXT            -- project identifier or file path
  agent TEXT                 -- "claude" | "opencode" etc.
  resume_id TEXT
  topic TEXT                 -- session topic string
  working_directory TEXT
  terminal_id TEXT
  total_tokens INTEGER
  total_cost REAL
  category TEXT              -- "bug-fix" | "feature" | "refactor" | "research" | "review" | "other"
  status TEXT                -- "active" | "paused" | "completed" | "archived"
  product_area TEXT
  description TEXT
  auto_tags TEXT             -- JSON array
  category_confirmed INTEGER -- 0 or 1
  created_at TEXT
  updated_at TEXT

terminal_messages:
  id INTEGER PRIMARY KEY AUTOINCREMENT
  session_id TEXT REFERENCES terminal_sessions(id)
  role TEXT                  -- "user" | "assistant" | "system"
  content TEXT
  created_at TEXT

session_parsed_items:
  id INTEGER PRIMARY KEY AUTOINCREMENT
  session_id TEXT REFERENCES terminal_sessions(id)
  item_type TEXT
  content TEXT
  source_message_id INTEGER
  created_at TEXT
```

---

## 2. IPC Endpoints (src/preload.ts)

### Terminal Writing
```typescript
terminalWrite: (terminalId: string, data: string) => ipcRenderer.invoke('terminal:write-old-format', terminalId, data)
terminalWriteRaw: (terminalId: string, data: string) => ipcRenderer.invoke('terminal:write-raw', terminalId, data)
```
Handler lives in `src/main.ts`. Writes text to a running terminal process.

### Session Management
```typescript
saveTerminalSession: (session: {
  id?: string; projectId?: string; agent: string; resumeId?: string;
  topic?: string; workingDirectory?: string; totalTokens?: number; totalCost?: number;
  category?: string; status?: string; productArea?: string; description?: string;
  autoTags?: string[]; categoryConfirmed?: boolean;
}) => ipcRenderer.invoke('save-terminal-session', session)
// Returns { success: boolean, id: string, resumeId: string }

getTerminalSessions: (projectId?: string, limit?: number) => ipcRenderer.invoke('get-terminal-sessions', projectId, limit)
// Returns { success: boolean, data: TerminalSession[] }

deleteTerminalSession: (sessionId: string) => ipcRenderer.invoke('delete-terminal-session', sessionId)

getSessionMessages: (sessionId: string, agentType?: string) => ipcRenderer.invoke('get-session-messages', sessionId, agentType)
// Returns { success: boolean, data: { id, session_id, role, content, created_at }[] }

saveTerminalMessage: (data: { sessionId: string; role: 'user' | 'assistant' | 'system'; content: string }) =>
  ipcRenderer.invoke('save-terminal-message', data)
// Returns { success: boolean, id: number }

checkSessionExists: (sessionId: string) => ipcRenderer.invoke('check-session-exists', sessionId)
```

### Terminal Binding
```typescript
updateTerminalBinding: (data: { terminalId: string; updates: { status?: string; active_problem_id?: string; session_context?: string } }) =>
  ipcRenderer.invoke('save-terminal-binding', data)
```

### Problem & Request Services
```typescript
getProblems: (projectId?: string, projectPath?: string) => ipcRenderer.invoke('get-problems', { projectId, projectPath })
// Returns { success: boolean, data: Problem[] }

getRequests: (projectId?: string) => ipcRenderer.invoke('get-requests', { projectId, projectPath? })
// Returns { success: boolean, data: Request[] }

createProblem: (data: CreateProblemData) => ipcRenderer.invoke('create-problem', data)
createRequest: (data: CreateRequestData) => ipcRenderer.invoke('create-request', data)
updateProblemStatus: (data: { problemId: string; status: string; projectId?: string }) => ipcRenderer.invoke('update-problem-status', data)
updateRequestStatus: (data: { requestId: string; status: string }) => ipcRenderer.invoke('update-request-status', data)
linkProblemToRequest: (data: { requestId: string; problemId: string; projectId?: string }) => ipcRenderer.invoke('link-problem-to-request', data)
updateProblem: (data: { id: string; [key: string]: any }) => ipcRenderer.invoke('update-problem', data)
```

### Context Events
```typescript
window.deskflowAPI.onContextChanged(callback: (data: ContextChangedEvent) => void)
// ContextChangedEvent: { type: 'problems' | 'requests' | 'check' | ... , action: 'created' | 'updated' | 'completed', entity: any }
```

### Execute CLI Command
```typescript
executeCommand: (command: string, cwd?: string) => ipcRenderer.invoke('electron:execute-command', command, cwd)
// Returns { stdout: string, stderr: string, error?: string }
```

---

## 3. Service Classes

### 3.1 ProblemsService (src/services/ProblemsService.ts)
- **Storage:** Dual JSON + Markdown in `agent/problems.json` and `agent/PROBLEMS.md`
- **Location pattern:** `{baseDir}/agent/problems.json`
- **Key methods:** `getProblems()`, `getProblem(id)`, `createProblem(data)`, `updateStatus(id, status)`, `updateProblem(id, updates)`, `deleteProblem(id)`
- **NOTABLE:** Does NOT have `addCheck()`/`completeCheck()` in source, but `main.ts` calls them on `any`-typed reference. Must be added for full support.
- **ID scheme:** `N.N` where N increments (e.g. `1.5`, `2.1`)

### 3.2 RequestsService (src/services/RequestsService.ts)
- **Storage:** Dual JSON + Markdown in `agent/requests.json` and `agent/REQUESTS.md`
- **Key methods:** `getRequests()`, `getRequest(id)`, `createRequest(data)`, `updateStatus(id, status)`, `linkProblem()`, `unlinkProblem()`, `deleteRequest(id)`, **`addCheck()`**, **`updateCheck()`**, **`completeCheck()`**
- **Check ID format:** `{requestId}-check-{n}` (e.g. `3-check-1`)
- Already has full check support.

### 3.3 getProblemsService() (main.ts:11026)
```typescript
function getProblemsService(projectId?: string, projectPath?: string): any {
  return new ProblemsService(projectPath || projectId || process.cwd());
}
```

### 3.4 getRequestsService() (main.ts)
```typescript
function getRequestsService(baseDir?: string): any {
  return new RequestsService(baseDir);
}
```

---

## 4. Existing UI Components

### 4.1 IssuesWorkspace (src/components/IssuesWorkspace.tsx — 851 lines)
- **3 sub-tabs:** `problems` | `requests` | `checklists`
- **Sub-tab bar:** 3 buttons with icons (Bug, Lightbulb, ListChecks) and colors (purple, blue, emerald)
- **Filter bar:** Status filter dropdown + "New Problem/New Request" button
- **ProblemCard:** Left border by priority, status pill, priority badge, ID, title, relative time, terminal link, file count
- **RequestCard:** Status pill, priority badge, ID, title, description, linked problem count
- **ProblemDetailModal:** Status buttons, terminal actions (open/assign), send instructions input, notes textarea, meta info
- **RequestDetailModal:** Editable description, status buttons, linked problems list/selector, meta info
- **NewProblemDialog:** Title input, priority select, category select
- **NewRequestDialog:** Title input, description textarea, priority select
- **CombinedChecklist:** (lines 714-851) — flat list of all checks from all problems + requests

### 4.2 CombinedChecklist Component (IssuesWorkspace.tsx:714-851)
This is the CURRENT checklist view. Key details:
```typescript
interface FlatCheck {
  checkId: string; checkDescription: string; instruction: string;
  checkStatus: string; parentId: string; parentTitle: string;
  parentType: 'problem' | 'request'; parentStatus: string; parentPriority: string;
  updated_at: string;
}
```
- **Filter modes:** `all` | `active` | `completed`
- **Sort modes:** `updated` | `created`
- **Features:** Filter/sort bar, status circles (○=pending, ◉=in_progress, ✓=completed), parent type indicator (purple dot=problem, blue dot=request), parent title, parent status pill, parent priority badge, check ID (monospace), expandable instruction section, progress counter (`{doneCount}/{total} done`)
- **Empty state:** "No checks yet — AI can add them with \`[add-check]\` actions"

### 4.3 TerminalPage (src/pages/TerminalPage.tsx — ~5400 lines)
- **Issues tab:** Uses `IssuesWorkspace` component with project-scoped props
- **InstructionPanel:** Side panel for composing prompts with system prompt layers, problem/request/skill selection
- **handleInstructionPanelSend:** Saves session, writes to terminal, updates binding

### 4.4 Design System / UI Patterns
- **Backgrounds:** `bg-zinc-900/40`, `bg-zinc-950`, `bg-black/70` for overlays
- **Borders:** `border-zinc-700/50`, `border-zinc-800/50`
- **Text:** `text-zinc-200` (primary), `text-zinc-400` (secondary), `text-zinc-600` (tertiary)
- **Accent:** Pink/Rose gradients (pink-600/rose-600)
- **Cards:** Rounded-xl with `bg-zinc-900/40 backdrop-blur-sm`
- **Modals:** Fixed overlay with `bg-black/70 backdrop-blur-sm`, centered `bg-zinc-900/95 backdrop-blur-xl`
- **Pills:** `rounded-full` with colored dot + label
- **Badges:** Colored icons + text for priority
- **Icons:** Lucide React library
- **Font sizes:** 8px-12px for metadata, 14px for titles
- **Responsive:** Full-height flexbox layout

---

## 5. AI Action System

### 5.1 Terminal Output Parsing (main.ts:7267-7326)
The AI running in a terminal sends structured actions that get parsed:

**Format 1 — Inline markdown actions:**
```
[add-check] problem-1.5 - description: Find the click handler - instruction: Open the page, click the button
[complete-check] problem-1.5-check-1
```

**Format 2 — actions.json (structure, not a file):**
```json
{ "type": "add_check", "id": "parentId", "description": "Find the click handler", "instruction": "Verify by..." }
{ "type": "complete_check", "id": "problem-1.5-check-1" }
```

**Parse logic (main.ts:7268-7322):**
1. Match `[add-check] parentId - description: X - instruction: Y`
2. Try `ps.addCheck(parentId, ...)` first, fallback to `rs.addCheck(parentId, ...)`
3. Match `[complete-check] checkId`
4. Search all problems' `.checks` for matching `c.id === checkId`, call `ps.completeCheck(p.id, checkId)`
5. If not found in problems, search requests' `.checks`, call `rs.completeCheck(r.id, checkId)`

### 5.2 DEFAULT_SYSTEM_PROMPT Documentation (src/lib/defaults.ts:429-451)
The AI's system prompt documents:
```markdown
### Steps (Sub-task Tracking)
Steps are embedded directly in Problems and Requests as a `steps` array.
Each step: id, description, status ("pending"|"in_progress"|"completed"), notes

Add/complete steps via ## Actions:
- [add-step] problem-1.5 - description: Find the click handler
- [complete-step] problem-1.5-step-1
```
(Note: Documentation says `steps` but actual code handles `checks` — a documented discrepancy.)

---

## 6. Current Session Saving Flow

When a user sends an instruction from InstructionPanel (TerminalPage.tsx):

```
1. Build meaningful topic from instruction text (first 60 chars)
2. Resolve opencode session ID via `resolveOpencodeSessionId(cwd)` (parses `opencode session list` output)
3. Save session via `saveTerminalSession(sessionPayload)` — UPSERT into terminal_sessions table
4. Write prompt to terminal via `terminalWrite(terminalId, prompt + '\n')`
5. Update terminal binding with problem/request context via `updateTerminalBinding()`
6. Show success/error toast via `showError(msg, 'info')`
```

Each check (add/complete) action from the AI gets parsed from terminal output in `parseAndExecuteActions()` (main.ts), which:
1. Calls `ps.addCheck()` or `rs.addCheck()` to persist to JSON
2. Logs activity
3. Fires `context-changed` IPC event to notify renderer
4. Renderer's periodic polling (5s interval) picks up changes

---

## 7. Current Gaps / Problems

1. **ProblemsService missing `checks` field and `addCheck()`/`completeCheck()` methods** — main.ts calls them on `any` type so it "works" but there's no type safety
2. **No per-problem/request check view in detail modals** — checks are only visible in the flat CombinedChecklist tab
3. **No user feedback mechanism on checks** — no way for the user to provide "works" / "doesn't work" or text feedback
4. **Checks are not linked to sessions** — when a check is completed, there's no record of which session/terminal it was tested in
5. **No sorting algorithm beyond date** — checks are just sorted by `updated_at`, no grouping by priority/parent
6. **No session-aware feedback** — user can't send "I checked this and it works" back to the terminal session

---

## 8. Design Goals for New Feature

### Core Requirements (from user):
1. **Checklist Algorithm** — smarter sorting/filtering/grouping of checks by parent problem/request priority, status, category
2. **User Feedback on Checks** — simple (thumbs up/down) + text feedback options, sent to the terminal session
3. **Session-Aware** — each feedback/check event knows which opencode session it belongs to, session-chat saving logic
4. **Settings** — tunable options (how many checks shown, feedback modes, grouping preferences)
5. **Session Compaction** — lower priority, bonus feature to merge/consolidate old sessions

### Key Integration Points:
- IssuesWorkspace CombinedChecklist (src/components/IssuesWorkspace.tsx:714-851)
- TerminalPage session handling (src/pages/TerminalPage.tsx)
- main.ts action parsing (src/main.ts:7267-7326)
- ProblemsService (src/services/ProblemsService.ts)
- RequestsService (src/services/RequestsService.ts)
- Preload IPC bridge (src/preload.ts)
- DB schema for session-message linking

---

## 9. File Reference Map

| File | Lines | What's There |
|------|-------|-------------|
| `src/components/IssuesWorkspace.tsx` | 1-851 | Problems/Requests/Checklists UI — CombinedChecklist at 714-851 |
| `src/pages/TerminalPage.tsx` | ~5400 | Main terminal page with sessions, InstructionPanel, Issues tab |
| `src/services/ProblemsService.ts` | 1-309 | Problem CRUD — NO checks support yet |
| `src/services/RequestsService.ts` | 1-323 | Request CRUD — HAS checks support |
| `src/main.ts` | 12921 | All IPC handlers, action parsing, DB operations |
| `src/preload.ts` | 583 | IPC bridge API surface |
| `src/lib/defaults.ts` | 700+ | DEFAULT_SYSTEM_PROMPT constant |
| `agent/problems.json` | — | Problem data storage (JSON) |
| `agent/requests.json` | — | Request data storage (JSON) |
| `agent/PROBLEMS.md` | 685 | Problem data (Markdown mirror) |
| `agent/REQUESTS.md` | 702 | Request data (Markdown mirror) |
