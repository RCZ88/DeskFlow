# System Prompt Design Brief — DeskFlow

## Role
You are the Lead Architect and Technical Writer for the DeskFlow desktop productivity tracker. Your task is to design a comprehensive `DEFAULT_SYSTEM_PROMPT` that tells an AI agent exactly how to operate inside this application.

## Problem
The current default system prompt is a generic "you are an AI coding assistant" that gives the agent zero knowledge about DeskFlow's features, data flow, IPC methods, UI structure, session system, task management, or knowledge infrastructure. The agent doesn't know what it can do or how to do it.

## Context: How the Prompt is Delivered
The prompt is sent to the agent's terminal at session start. It is assembled from 4 levels (in `src/pages/TerminalPage.tsx:242-252`):

1. `DEFAULT_SYSTEM_PROMPT` — hardcoded constant in `src/lib/defaults.ts` (what you're designing)
2. "General Additions" — per-agent additions from Settings page (`prefs.systemPrompts[agent]`)
3. "Project Additions" — project-specific additions from Workspace Configs (`prefs.projectPrompts[projectId]`)
4. "Session Additions" — one-off text typed in NewSessionDialog

Your design is Level 1 — the base that everything else builds on. Make it thorough so that Levels 2-4 can be concise overrides.

---

## Feature Inventory (ALL domains the prompt could cover)

You MUST consider EVERYTHING below. For each item, decide:
- Should the AI be explicitly told about this?
- How much detail? (method signature, concept mention, or skip)
- What should the AI do/not do with this feature?

---

### 1. TERMINAL WORKSPACE (the core UI the AI operates in)

The Terminal page (`/terminal`) is where the AI agent runs. It has:
- **Multi-pane terminal** built on `@xterm/xterm` with node-pty backend. Multiple terminals can run simultaneously in a split layout.
- **Sidebar** (left side, resizable, ~400px default width) with tabs:
  - **Presets tab** — saved terminal command presets. Each has: name, command, category, working_directory. Click to execute in active terminal via IPC.
  - **Sessions tab** — list of AI agent sessions. Each session card shows: agent icon, topic, category badge, status, date. Buttons: Resume (green, if resume_id exists), Edit (pencil → opens edit dialog with topic/agent/category/description/product_area fields), Delete. "New Session" button at top opens NewSessionDialog.
  - **Map tab** — shows a terminal mini-map. Split into two panels: MiniMap (top, draggable view of terminal layout tree) and Running Terminals + Sessions (bottom, list of active terminals and their sessions).
  - **Analytics tab** — shows AI usage statistics (token counts, cost, tool usage) and session analytics.
  - **Problems tab** — list of problems from `agent/problems.json`. Each problem shows: id, title, priority badge, status, created date. Click opens detail view with: description, root_cause, fix_description, checklist items, linked requests, and action buttons (Assign to Terminal, Edit Status).
  - **Requests tab** — list of requests from `agent/requests.json`. Each shows: id, title, category, status, priority. Detail view shows: description, linked problems, checklist items.
  - **Checklists tab** — shows checklist items grouped by parent (problem/request). Each item has: checkbox, description, status, notes.
  - **Files tab** — browse project files from `agent/` directory. Lists markdown files with preview on click.
  - **Skills tab** — lists skills from `agent/skills/*.md`. Each skill shows: name, description, category tags. "Use" button opens InstructionPanel with that skill pre-selected.
  - **Configs tab** — two sections: (1) Project Prompt textarea for project-specific system prompt additions, (2) Workspace Configs — saved terminal layouts (save current layout with name, load saved layout to restore terminals).
- **Header bar** — project selector dropdown, tab navigation, buttons for New Session, Open Terminal, Initialize Agent.
- **InstructionPanel** — full instruction composer (opened via Compose button). Contains: problem/request checkboxes, skill selector, agent file picker, prompt preview, send button. Composed prompt gets sent to the active terminal and then the agent CLI is invoked.
- **Quick instruction input** — compact single-line input bar (toggleable) for quick instructions.

---

### 2. SESSION SYSTEM

Sessions track AI agent conversations. Each session is stored in the `terminal_sessions` DB table with columns:
- `id` (TEXT PK, format: "session-{timestamp}")
- `agent` (TEXT — "opencode", "claude", "codex", "aider", "custom")
- `topic` (TEXT — session title/description)
- `category` (TEXT — "bug-fix", "feature", "refactor", "research", "review", "other")
- `status` (TEXT — "active", "paused", "completed", "archived")
- `terminal_id` (TEXT — linked terminal)
- `resume_id` (TEXT — if set, session is resumable)
- `product_area` (TEXT — which part of the app: "Dashboard", "Settings", "Terminal", "Database", "External Page", "IDE Page", etc.)
- `description` (TEXT — freeform description)
- `auto_tags` (JSON array — auto-generated tags)
- `category_confirmed` (INTEGER 0/1)
- `total_tokens`, `total_cost` (usage tracking)
- `project_id`, `working_directory`
- `created_at`, `updated_at`

**Session lifecycle:**
- **Create:** NewSessionDialog → user picks agent, init file, system prompt additions → terminal spawns → `initializeTerminal` writes prompt + init content + launches agent CLI → session saved via `saveTerminalSession`
- **Edit:** Pencil icon → dialog with topic, agent selector (from presets), category, description, product_area fields → saved via `updateSessionCategory`
- **Resume:** If `resume_id` exists → green "Resume" button → calls `handleResumeSession` → loads saved session config → spawns terminal with `{agent} --resume {resume_id}`
- **Messages:** `terminal_messages` table (session_id, role: user/assistant/system, content, created_at). Viewer at bottom of session list shows all messages.
- **Session configs:** Saved as JSON in `agent/session-configs/{sessionId}.json` — stores initContent and customSystemPrompt for resume.

---

### 3. PRESETS SYSTEM

Terminal presets stored in `terminal_presets` DB table:
- `id`, `name`, `command`, `project_id`, `working_directory`, `category`, `created_at`, `updated_at`
- Methods: `getTerminalPresets(projectId?)`, `addTerminalPreset(preset)`, `removeTerminalPreset(presetId)`, `executeTerminalPreset(presetId, terminalId?)`
- Presets appear in the Presets tab sidebar. Click executes the command in the active terminal.

---

### 4. WORKSPACE SAVE/LOAD (Configs)

Terminal layouts saved in `terminal_layouts` DB table:
- `id`, `name`, `project_id`, `layout_data` (JSON — full terminal arrangement), `is_active`, `type` ("workspace" | "default"), `created_at`, `updated_at`
- Save: saves current terminal arrangement (all terminals, their splits, sizes) with a name
- Load: restores all terminals, spawns them, resumes associated sessions
- Methods: `saveTerminalLayout`, `getTerminalLayouts(projectId?)`, `deleteTerminalLayout(layoutId)`, `setActiveTerminalLayout(layoutId)`
- Stale "Default Layout" entries have been cleaned from DB.

---

### 5. PROBLEMS (JSON-backed task tracking)

Problems live in `agent/problems.json`. The ProblemsService (`src/services/ProblemsService.ts`) handles CRUD. Problems are synced to `agent/PROBLEMS.md` for human reading.

**Problem interface:**
```
{ id, title, status, priority, category, description, root_cause, fix_description, files[], terminal_id, skill_used, user_notes, created_at, updated_at }
```

**ID format:** `"X.Y"` where X = project major version, Y = auto-incrementing minor. Example: "1.1", "1.2", "2.1"

**Status workflow:** NEW → IN_PROGRESS → TESTING → FIXED → CLOSED

**IPC methods:**
- `getProblems(projectId?, projectPath?)` — loads from JSON
- `createProblem({ title, priority?, category?, description?, rootCause?, projectId })` — auto-assigns ID, status=NEW
- `updateProblemStatus({ id, status })` — updates and writes JSON + PROBLEMS.md
- `deleteProblem(problemId, projectId?)` — removes from array
- `assignProblemToTerminal({ problemId, terminalId?, skillId?, systemPrompt?, projectId, projectPath })` — builds instructions and sends to terminal
- `syncProblemsMd()` — regenerates PROBLEMS.md from JSON source

**When a problem is resolved:** A "Fix" tab appears showing `fix_description` and `root_cause`. These are editable fields.

---

### 6. REQUESTS (JSON-backed feature tracking)

Requests live in `agent/requests.json`. The RequestsService (`src/services/RequestsService.ts`) handles CRUD. Synced to `agent/REQUESTS.md`.

**Request interface:**
```
{ id, title, description, status, priority, category, linked_problems[], created_at, updated_at }
```

**ID format:** Auto-incrementing numeric (1, 2, 3...)

**Status workflow:** Pending → In Progress → Implemented → Declined

**IPC methods:**
- `getRequests(projectId?)` — loads from JSON
- `createRequest({ title, description?, priority?, category?, projectId })` — auto-increment ID
- `updateRequestStatus({ id, status })` — updates and writes JSON + REQUESTS.md
- `deleteRequest(requestId, projectId?)` — removes from array
- `linkProblemToRequest({ requestId, problemId })` — adds to `linked_problems[]`

---

### 7. CHECKLISTS (JSON-backed step tracking)

Checklists live in `agent/checklists.json`. The ChecklistService (`src/services/ChecklistService.ts`) handles CRUD.

**ChecklistItem interface:**
```
{ id, parentType, parentId, description, status, humanApproved, notes, assignedTo, created_at, updated_at }
```

**ID format:** `"{parentType}-{parentId}-step-{n}"` e.g. "problem-1.1-step-1"

**Status workflow:** pending → in_progress → completed

**Scoping:** Every checklist item belongs to a parent — either a problem or a request (via `parentType`/`parentId`).

**IPC methods:**
- `getChecklists(projectId?, projectPath?)` — loads all
- `getChecklistForParent(parentType, parentId)` — filtered
- `createChecklistItem({ parentType, parentId, description, projectId, projectPath })`
- `updateChecklistItem({ id, status?, humanApproved?, notes?, description? })`
- `deleteChecklistItem({ id, projectId, projectPath })`
- `deleteChecklistForParent(parentType, parentId)` — cascading delete

---

### 8. SKILLS SYSTEM (`agent/skills/*.md`)

Skills are modular instruction sets for AI agents. Each is a markdown file with YAML frontmatter:

```yaml
---
id: skill-name
name: Skill Display Name
category: design | engineering | research
applicable_to: [prompts, code, etc.]
version: 1.0.0
created: YYYY-MM-DD
tags: [tag1, tag2]
---
```

Skills live in `agent/skills/*/SKILL.md` or `agent/skills/*.md`.

**Key skills include:**
- `generate-prompt` — for designing high-fidelity prompt documents (the skill you're following now)
- `maintain-context` — for post-task knowledge graph sync and markdown updates
- `agent-reflect` — for logging and learning from mistakes
- `commit` — for git commit workflow
- `deep-research` — for thorough codebase investigation
- `fix-problems` — for diagnosing and fixing issues
- `frontend-design` — for UI design work
- `readme-generator` — for README generation
- `recursive-playwright` — for testing
- `google-stitch` — for Google Stitch integration

**Usage:** Clicking "Use" in SkillsTab opens the InstructionPanel with that skill pre-loaded. The skill's content is included in the composed prompt sent to the terminal.

**IPC methods:**
- `getSkills(projectPath?)` — scans for SKILL.md files
- `createSkill({ name, description?, category?, projectPath })` — writes a new SKILL.md
- `updateSkill({ name, description?, category?, projectPath })` — overwrites existing

---

### 9. GRAPHIFY (Knowledge Graph System)

Graphify scans the codebase AST and builds a knowledge graph of nodes (files, classes, functions) and edges (imports, references, inheritance).

**Output files:**
- `graphify-out/graph.json` — full graph data (428 nodes, 630 edges, 44 communities as of last build)
- `graphify-out/GRAPH_REPORT.md` — human-readable summary with community structure and god nodes
- `graphify-out/` HTML visualization files

**Key concepts:**
- **God nodes** — the most connected nodes in the graph (hubs representing core modules)
- **Communities** — clusters of related nodes (e.g., "Dashboard UI", "Tracking Engine", "Database Layer")
- **Edges** — import relationships, function calls, class inheritance, file references

**Commands:**
- AST-only rebuild (fast, no LLM): `python agent/skills/maintain-context/graphify_maintain.py rebuild`
- Full pipeline (AST + LLM analysis): `python agent/skills/maintain-context/graphify_maintain.py full`

**Obsidian vault copy:** `C:\Users\cleme\Documents\CZVault\00_Projects\AppTracker\Graph\`

**When to use:** For architecture questions, codebase structure analysis, complex data flow tracing. Do NOT use for routine bug fixes or trivial tasks.

**Canonical location:** The Obsidian vault is canonical. `graphify-out/` is a local copy.

---

### 10. QMD TEMPLATES (Quarto Documentation)

QMD (Quarto Markdown) templates live in `agent/templates/`. These are executable Quarto documents that can render to HTML, PDF, or DOCX.

**Purpose:** Generate formatted reports, design specifications, documentation, and research papers from code.

**Usage:** Templates are listed/detected via `listAgentDirFiles`. They can be included in init content for sessions.

---

### 11. LLM WIKI (Agent Markdown Files)

The `agent/` directory contains AI-optimized markdown files that serve as the project's documentation system. Each has a specific purpose:

| File | Purpose | Update Trigger |
|------|---------|---------------|
| `state.md` | Current version, recent changes, known issues, IPC endpoints | After EVERY code change |
| `context.md` | Architecture, tech stack, data flow | When architecture changes |
| `AGENTS.md` | Project instructions for AI agents | When project rules change |
| `agents.md` | General instructions for AI agents | When project rules change |
| `constraints.md` | Hard rules and limitations | When new constraints discovered |
| `patterns.md` | Reusable code patterns | When new patterns introduced |
| `glossary.md` | Term definitions | When new terms introduced |
| `PROBLEMS.md` | Issue tracker (human-readable, synced from problems.json) | When bugs found or fixes attempted |
| `REQUESTS.md` | Feature request tracker (human-readable) | When user makes requests |
| `debugging.md` | Error patterns and solutions | When new debugging pattern found |
| `HUMAN_TEST_CHECKLIST.md` | Human testing checklist | When new features need testing |
| `FEATURE_TRACKER.md` | Complete inventory of all pages and features | When new features added |
| `data.md` | DB schemas, IPC endpoint reference | When IPC/DB changes |
| `WORKSPACE_CONTEXT.md` | Workspace/IDE projects/terminal system context | When workspace features change |
| `Initialize.md` | Step-by-step initialization checklist | Rarely — template |

---

### 12. OBSIDIAN SKILLS (Frontmatter-Tagged Skill Files)

Skills defined in `agent/skills/*/SKILL.md` use YAML frontmatter with this schema:

```yaml
---
id: kebab-case-id
name: Human Readable Name
category: general | design | engineering | research | maintenance
applicable_to: [graphify, markdown, obsidian, prompts, design-specs, etc.]
version: 1.0.0
created: YYYY-MM-DD
tags: [tag1, tag2, tag3]
---
```

These are loaded by `getSkills()` which parses frontmatter and returns structured skill objects.

---

### 13. PARA VAULT (Obsidian Organization)

The Obsidian vault at `C:\Users\cleme\Documents\CZVault\` follows the PARA method:

- **00_Projects** — Active projects (including AppTracker)
- **01_Areas** — Ongoing areas of responsibility
- **02_Resources** — Reference material and topics
- **03_Archives** — Completed/inactive items

The AppTracker project lives in `00_Projects/AppTracker/`. The graphify copy syncs to `00_Projects/AppTracker/Graph/`.

---

### 14. KNOWLEDGE SYSTEMS — INTEGRATED PIPELINE

All systems connect into a unified knowledge pipeline:

```
Graphify (AST scan) → graph.json + GRAPH_REPORT.md
     ↓
LLM Wiki (agent/*.md) → state, context, patterns, data
     ↓
Obsidian Skills (SKILL.md frontmatter) → reusable instructions
     ↓
QMD Templates (Quarto) → formatted outputs
     ↓
PARA Vault (Obsidian structure) → long-term knowledge storage
```

**Full sync command:** `python agent/skills/maintain-context/graphify_maintain.py full`

---

### 15. ACTIVITY LOG

Every action should be logged. Table `activity_log` with columns:
- `entity_type` — "problem" | "request" | "session" | "checklist" | "skill"
- `entity_id`, `entity_title` — what was acted on
- `action` — "created" | "updated" | "deleted" | "assigned" | "resumed" | etc.
- `actor` — "opencode" | "claude" | "user"
- `summary` — one-line human-readable description
- `details` — optional JSON blob

**IPC methods:**
- `logActivity({ entity_type, entity_id, entity_title?, action, actor, summary, details? })`
- `getActivityLog({ entity_type?, entity_id?, actor?, limit? })` — returns recent log entries
- `getAiContext({ projectId })` — returns recent activity as a formatted string for AI consumption

**Auto-logging:** Problem/request create/update/delete handlers automatically log activity.

---

### 16. INSTRUCTIONPANEL (Composer)

The InstructionPanel (`src/components/InstructionPanel.tsx`) is a full instruction composer with:
- **Problem checkboxes** — selects problems to include context about
- **Request checkboxes** — selects requests to include context about
- **Checklist items** — auto-included from selected problems/requests
- **Skill selector** — dropdown of available skills. "Use" button from SkillsTab pre-selects a skill here.
- **Agent file picker** — checkboxes for files in `agent/` directory to include in prompt
- **Prompt preview** — shows the composed prompt before sending
- **Send button** — sends to active terminal

---

### 17. DATA STORAGE ARCHITECTURE

**Three storage systems with clear separation:**

1. **JSON files** (`agent/`) — Source of truth for Problems, Requests, Checklists. IPC methods read/write these. NEVER write directly.
2. **SQLite DB** (`<userData>/deskflow-data.db`) — Tracking data (logs, sessions, aggregations), terminal state, projects, IDE info, AI usage, git commits, DORA metrics, external tracker data, activity log. Managed via `better-sqlite3`.
3. **Preferences JSON** (`<userData>/deskflow-prefs.json`) — User settings, system prompts, category configs, tier assignments, overrides. Loaded/saved via `getPreferences()`/`setPreference(key, value)`.

**IPC bridge:** All renderer ↔ main communication goes through `window.deskflowAPI.*` methods defined in `src/preload.ts` and handled in `src/main.ts`.

**Services layer:** `src/services/ProblemsService.ts`, `RequestsService.ts`, `ChecklistService.ts`, `SkillsService.ts` — these encapsulate JSON file I/O and should be used by all IPC handlers.

---

### 18. PROJECT-SPECIFIC SYSTEM PROMPT

The Settings page has "General Additions" per agent type (stored in `prefs.systemPrompts`). The Workspace Configs tab has per-project "Project Additions" (stored in `prefs.projectPrompts[projectId]`). The NewSessionDialog has a "Session Additions" textarea.

The final prompt sent is: `DEFAULT + GeneralAdditions[agent] + ProjectAdditions[projectId] + SessionAdditions`

---

### 19. UI RENDERING CONVENTIONS

- **Pages:** React Router with 12 pages (Dashboard, Stats, Productivity, Browser, IDE, Terminal, External, Reports, Database, Settings, IDE Help, Pricing)
- **Dark theme:** zinc-800/900 backgrounds, zinc-700 borders, cyan-500/teal-500 accent gradients
- **Glassmorphism cards:** `glass rounded-3xl p-5` with backdrop blur
- **Sidebar tabs:** bottom tab bar with icon + label, active tab gets colored underline + glow
- **Dialogs:** `fixed inset-0 bg-black/60 backdrop-blur-sm` — close on backdrop click or X button
- **Data lists:** scrollable containers, each item in `p-2 bg-zinc-800/50 rounded border border-zinc-700/30` card
- **Toasts:** `showError(message, 'error' | 'info')` — auto-dismissing
- **Keyboard:** Enter = send message, Shift+Enter = newline (in instruction inputs)
- **Period selector:** Today/Week/Month/All — shared across pages
- **Time mode toggle:** Hours/Seconds display format
- **Activity type toggle:** Apps/Websites/Combined

---

### 20. BUILD & VERIFICATION RULES

- Always run `npm run build` after code changes (runs Vite for renderer + tsc for Electron)
- `npm run build:renderer` for Vite-only build
- `npm run build:electron` for tsc-only build
- **NEVER** use `git checkout`, `git restore`, `git reset`, or `git stash` — these destroy work. Manually fix broken code.
- **NEVER** change `@import "tailwindcss"` in `src/index.css` — Tailwind v4 uses `@import`, not `@tailwind` directives
- **NEVER** run `npm install tailwindcss@latest` — will break v4 setup
- Read files before editing them
- Follow existing patterns — don't refactor unrelated code
- Make surgical, minimal changes

---

### 21. CROSS-SESSION SYNC (File Locking & Context Broadcast)

Multiple AI agent terminals can now operate simultaneously. The cross-session sync system prevents them from conflicting and allows them to share context.

**File Lock Manager** (in-memory, `src/main.ts`):
- Acquires locks on file paths detected in agent output
- Locks auto-expire after 60 seconds
- When a lock is denied, a `file:conflict` event is broadcast to all renderers
- Locks are released when the terminal is killed

**Edit Detection (`detectEditsInOutput` in `src/main.ts`)**:
- Runs in both `terminal:create` and `spawn-terminal` data handlers
- Scans agent output for file write patterns (`wrote`, `saved`, `modified`, etc.)
- Acquires locks for detected file paths
- Logs to `touched_files` DB table
- Broadcasts `file:conflict` events when another terminal holds the lock

**`/sync` Command:**
- Typing `/sync` in the instruction panel compiles a summary of other active sessions
- Returns: other active terminals, their active problems, recent file changes, currently locked files
- IPC: `compileSyncSummary(terminalId)`

**`broadcastContextDelta`:**
- When one terminal's context changes (problems, requests), it can broadcast to all other terminals
- Other terminals receive `context-changed` events with `source: terminalId`
- The renderer uses `onContextChanged()` to listen and auto-refresh problems/requests

**IPC Methods to include in system prompt:**
- `lockFile(filePath, terminalId, sessionId, action?)` — Acquire a file lock
- `releaseFileLock(filePath, terminalId)` — Release a lock
- `getFileLocks()` — Get all current locks
- `getTouchedFiles(opts?)` — Query file edit history
- `compileSyncSummary(terminalId)` — Get cross-session context summary
- `broadcastContextDelta({ terminalId, type, payload })` — Broadcast context to other terminals

**What the AI should know:**
- Other agent terminals may be editing the same files — check `/sync` before making conflicting changes
- File locks are automatic (detected from agent output) but you can also manually call `lockFile`
- Use `compileSyncSummary('/sync')` at the start of any session to see what other agents are working on
- If you see a file conflict warning, coordinate with the other agent or wait for their lock to expire (60s)

### Config Toggle — Thought Process Instruction

The Configs tab has a **Thought Process** toggle (amber-500, alongside cross-session sync controls). When ON, the `initializeTerminal` function appends a `## Thought Process` instruction to the system prompt before writing to the terminal:

```typescript
// In initializeTerminal, after writing base system prompt:
if (thoughtProcessEnabled && window.deskflowAPI?.terminalWrite) {
  const thoughtInstruction = `## Thought Process

Before providing your final answer, you MUST show your thought process in a <thought_process> block. This should include:
- How you interpret the request and what you need to do
- Which files or code areas you're considering
- Tradeoffs you're weighing between different approaches
- Why you chose the approach you did
- Any potential pitfalls or edge cases to watch for

Keep the thought process concise and focused — 3-10 sentences is usually sufficient.
`;
  await window.deskflowAPI.terminalWrite(terminalId, thoughtInstruction + '\n');
}
```

**State:** `thoughtProcessEnabled` — initialized from `localStorage.getItem('thought-process-enabled') !== 'false'` (default ON). Saves to localStorage on change. No IPC needed (renderer-only setting).

**When OFF:** No thought process instruction is written — the AI responds directly without a `<thought_process>` block.

**Edge cases:**
- Toggled OFF mid-session: existing terminals keep their system prompt (no re-send). New terminals pick up the current state.
- Agent that doesn't support thought process tags: the instruction is still written — the AI may or may not comply based on its capabilities. The toggle is a best-effort instruction, not a hard enforcement.
- Multiple agents in same session: Each terminal gets its own thought process instruction independently based on the toggle state at the time of initialization.

**What the AI should know:** When the thought process instruction is present, include a `<thought_process>` block before your final answer. This is your scratchpad — the user doesn't see it directly, but it helps you reason step by step.

---

## Design Requirements

Your output (`RESULT.md`) must contain:

1. **The full `DEFAULT_SYSTEM_PROMPT` string** ready to paste into `src/lib/defaults.ts`
2. **Section annotations** explaining what each part covers and why it matters
3. **Any recommendations** for agent-specific overrides (e.g., OpenCode vs Claude might need different emphases)

## Constraints

- The prompt will be written into the xterm terminal at session start as raw text
- Keep it readable and scannable — use sections, bullet points, and whitespace
- The total length should be balanced — comprehensive but not overwhelming (200-400 lines is the sweet spot)
- Assume the AI agent has no prior knowledge of DeskFlow — explain everything
- Use backtick-wrapped code for IPC method names: `` `createProblem` ``
