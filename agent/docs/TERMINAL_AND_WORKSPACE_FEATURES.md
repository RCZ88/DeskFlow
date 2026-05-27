# Terminal & Workspace — Complete Feature Inventory

**Last Updated:** 2026-05-22
**Source files:** `src/pages/TerminalPage.tsx` (~4910 lines), `src/components/TerminalWindow.tsx`, `src/components/*`, `src/services/*`, `src/main.ts`, `src/preload.ts`

---

## 1. HEADER / TOP BAR

| Feature | Location (TerminalPage.tsx) | Description |
|---------|----------------------------|-------------|
| **Project Selector** | ~1086–1098 | `<select>` dropdown listing all projects from `deskflowAPI.getProjects()` |
| **Project Info Badge** | ~1074–1085 | Shows project name, green dot, path, language, VCS type |
| **Open Terminal Button** | ~1107–1126 | Creates new terminal tab + layout entry via `'create-terminal'` CustomEvent |
| **Setup Button** | ~1127–1141 | Opens `NewSessionDialog` in `'initialize'` mode — creates agent workspace files |
| **Terminal Binding Badge** | ~1142–1196 | Shows agent type, problem ID binding, green pulse dot, Bind Problem dropdown |
| **Compose Button** | ~1204–1220 | Opens full `InstructionPanel` component (problem/request/skill selectors) |
| **Quick Send Button** | ~1221–1234 | Opens inline text-only instruction input bar with @mention routing |
| **Save Checkpoint Button** | ~1235–1242 | Opens Save Checkpoint dialog for the active terminal's session |

### IPC Endpoints (header)
- `getProjects` → `'get-projects'`
- `saveTerminalBinding` → `'save-terminal-binding'`
- `updateTerminalBinding` → `'update-terminal-binding'`
- `getTerminalBindings` → `'get-terminal-bindings'`

---

## 2. TERMINAL TAB BAR

| Feature | Location | Description |
|---------|----------|-------------|
| **Terminal Tabs** | ~1412–1441 | Horizontal tab bar. Each tab: monitor icon, status dot, name, session category badge, agent type, session indicator "S", close button |
| **New Terminal Tab (+)** | ~1442–1459 | Creates new terminal, adds to layout, dispatches `'create-terminal'` CustomEvent |

---

## 3. TERMINAL LAYOUT / XTERM PANES

| Feature | Location | Description |
|---------|----------|-------------|
| **Terminal Error Notification Bar** | ~1463–1471 | Dismissible notification bar (red/yellow/green based on type) |
| **Empty State** | ~1472–1489 | "+ Open Terminal" button when no terminals exist |
| **TerminalLayout Component** | TerminalWindow.tsx:410–501 | Recursive pane tree rendering |
| **TerminalPane Component** | TerminalWindow.tsx:92–289 | Individual `@xterm/xterm` instance |
| **Custom Dark Theme** | TerminalWindow.tsx:101–128 | xterm theme configuration |
| **FitAddon** | TerminalWindow.tsx | Auto-sizing terminal to container |
| **WebLinksAddon** | TerminalWindow.tsx | Clickable links in terminal |
| **Hover Overlay Controls** | TerminalWindow.tsx | Split Vertical (⋮), Split Horizontal (⋯), Close (✕) buttons on hover |
| **Agent Status Overlay** | TerminalWindow.tsx:273–287 | "Initializing agent..." (cyan pulsing) or "Agent failed. Click to retry." (amber) |
| **Split Handle Dragging** | TerminalWindow.tsx:292–326 | Mouse drag to resize split ratio between panes |
| **Layout Tree Operations** | TerminalWindow.tsx:503–593 | `removePane`, `splitPane`, `findGroupIndex`, `removeFromLayouts`, `insertIntoLayout`, `toggleSplitDirection`, `adjustSplitRatio` |

### IPC Endpoints (pane level)
- `terminalWriteRaw` → `'terminal:write-raw'`
- `terminalResize` → `'terminal:resize-old-format'`
- `onTerminalData` → terminal data from PTY
- `onTerminalExit` → terminal process exit
- `onTerminalReady` → PTY ready signal
- `retryAgentInit` → `'retry-agent-init'`

---

## 4. SIDEBAR

| Feature | Location | Description |
|---------|----------|-------------|
| **Sidebar Resize Handle** | ~1527–1531, 593–613 | Left-edge drag to resize (200px min), persisted to localStorage |
| **Sidebar Collapse/Expand** | ~1536–1542, 2650–2658 | Toggle sidebar visibility |

### Sidebar Tabs (14 total)

| Tab | Icon | Color | Location | Description |
|-----|------|-------|----------|-------------|
| Presets | Zap | Green | ~1669–1747 | CRUD command presets |
| Sessions | Clock | Green | ~1750–1913 | Session management |
| Map | Monitor | Green | ~1915–2131 | Terminal visual layout (MiniMap) |
| Analytics | PieChart | Green | ~2133–2142, 4282–4523 | AI usage analytics |
| Problems | AlertCircle | Purple | ~2663–2883 | Problem/issue tracker |
| Requests | FileText | Blue | ~3283–3458 | Feature requests |
| Checklists | CheckSquare | Amber | ~4529–4682 | Checklist tracking |
| Files | Folder | Yellow (pulse) | ~3460–3860 | Agent file browser |
| Skills | BookOpen | Cyan | ~4688–4910 | Skill management |
| Configs | Layers | Cyan | ~2181–2256 | Workspace configs + project prompt |
| History | MessageSquare | Cyan | ~2258–2264 | Prompt history |

---

## 5. PRESETS TAB

| Feature | Location | Description |
|---------|----------|-------------|
| **Add Preset Button** | ~1671–1677 | Toggles inline add form |
| **Add Preset Form** | ~1679–1717 | Name, Command, Category inputs + Save/Cancel |
| **Preset List** | ~1718–1747 | Each shows name (editable), command (mono truncated). Hover: Run (▶) and Delete (🗑) |

### IPC Endpoints
- `getTerminalPresets` → `'get-terminal-presets'`
- `addTerminalPreset` → `'add-terminal-preset'`
- `removeTerminalPreset` → `'remove-terminal-preset'`
- `executeTerminalPreset` → `'execute-terminal-preset'`

---

## 6. SESSIONS TAB

| Feature | Location | Description |
|---------|----------|-------------|
| **New Session Button** | ~1752–1765 | Opens `NewSessionDialog` |
| **Category Filter Pills** | ~1768–1788 | All + 6 categories (Bug Fix, Feature, Refactor, Research, Review, Other) |
| **Session Cards** | ~1792–1909 | StatusDot, CategoryBadge, agent badge, topic, running indicator, description, date, product area, resume ID, auto-tags, cost. Hover: Resume, Focus, Edit, Messages, Delete |
| **Session Context Highlighting** | ~1800–1805 | Pulses cyan for 3s when navigated from elsewhere |
| **Session Edit Dialog** | ~2492–2562 | Edit topic, agent, category, product area, description |
| **Session Messages Viewer (Modal)** | ~2361–2414 | Full modal with search, role-colored bubbles (user=cyan, system=amber, assistant=green), ANSI stripping |
| **Delete Session (Confirm Dialog)** | ~1895–1904, 2465–2489 | Confirmation dialog (no `window.confirm`) |

### IPC Endpoints
- `getTerminalSessions` → `'get-terminal-sessions'`
- `saveTerminalSession` → `'save-terminal-session'`
- `getTerminalSessionResumeId` → `'get-terminal-session-resume-id'`
- `deleteTerminalSession` → `'delete-terminal-session'`
- `updateSessionCategory` → `'update-session-category'`
- `getSessionMessages` → `'get-session-messages'`
- `saveTerminalMessage` → `'save-terminal-message'`
- `saveSessionConfig` → `'save-session-config'`
- `loadSessionConfig` → `'load-session-config'`

---

## 7. MAP TAB / TERMINAL MINI-MAP

| Feature | Location | Description |
|---------|----------|-------------|
| **TerminalMiniMap Component** | TerminalMiniMap.tsx:298 lines | Visual terminal layout editor |
| **Group Switcher** | TerminalMiniMap.tsx:136–156 | ◀ / ▶ arrows to switch terminal groups |
| **Visual Tree Pane** | TerminalMiniMap.tsx:158–170 | Split-pane tree as nested divs, click handles to toggle direction |
| **DnD Drag & Drop** | TerminalMiniMap.tsx:80–119 | `@dnd-kit/core` — swap (center), split vertical (left/right), split horizontal (top/bottom) |
| **Auto-switch to active group** | TerminalMiniMap.tsx:62–71 | Follows active terminal |
| **Running Terminals List** | ~2064–2127 | Per-group with drag-to-reorder, Focus/New Session buttons |
| **Session List** | ~2065–2127 | All sessions with Open/Resume/Focus buttons |
| **Map Split Ratio Handle** | ~615–636, 1935–1940 | Drag to resize map vs. list, persisted to localStorage |

---

## 8. ANALYTICS TAB

| Feature | Location | Description |
|---------|----------|-------------|
| **Period Selector** | ~4405–4413 | Day / Week / Month / All |
| **Metric Cards** | ~4416–4421 | Sessions, Tokens, Cost ($), Active Checklists |
| **Token Usage by Agent (Bar Chart)** | ~4424–4440 | Horizontal bar chart (`chart.js`) |
| **Cost Distribution (Doughnut Chart)** | ~4443–4459 | Cost share by agent |
| **Sessions Over Time (Line Chart)** | ~4462–4484 | Filled line chart |
| **Checklist Progress** | ~4487–4502 | Top 5 checklists with progress bars |

### IPC Endpoints
- `getAIUsageSummary` → `'get-ai-usage-summary'`
- `getChecklists` → `'get-checklists'`

---

## 9. PROBLEMS TAB

| Feature | Location | Description |
|---------|----------|-------------|
| **Status Filter Dropdown** | ~2754–2763 | All Issues, Active, New, In Progress, Fixed |
| **New Problem Button** | ~2765–2771 | Opens `NewProblemDialog` |
| **Project Path Display** | ~2775–2799 | Shows path and "N issues parsed" count |
| **Problems List (grouped by status)** | ~2808–2858 | Priority color bar, problem ID, cancel, title, session indicator |
| **Problem Detail Modal** | ~3002–3124 | 7 status buttons, embedded checklist, "Open in Terminal", send instructions, user notes |
| **New Problem Dialog** | ~3126–3278 | Title, priority, category, session selector, skill grid |
| **ModalChecklist** | ~2885–3000 | Inline checklist for problem/request with status toggle, approval, notes |

### IPC Endpoints
- `getProblems` → `'get-problems'`
- `createProblem` → `'create-problem'`
- `updateProblemStatus` → `'update-problem-status'`
- `assignProblemToTerminal` → `'assign-problem-to-terminal'`
- `deleteProblem` → `'delete-problem'`
- `syncProblemsMd` → `'sync-problems-md'`

---

## 10. REQUESTS TAB

| Feature | Location | Description |
|---------|----------|-------------|
| **Status Filter Dropdown** | ~3348–3358 | All, Pending, In Progress, Completed |
| **New Request Button** | ~3359–3366 | Opens `NewRequestDialog` |
| **Requests List (grouped by status)** | ~3411–3444 | Priority color bar, linked problems |
| **Request Detail Modal** | ~4024–4128 | Status buttons, linked problems selector, checklist |
| **New Request Dialog** | ~4134–4242 | Title, description, priority, category |

### IPC Endpoints
- `getRequests` → `'get-requests'`
- `createRequest` → `'create-request'`
- `updateRequestStatus` → `'update-request-status'`
- `deleteRequest` → `'delete-request'`
- `linkProblemToRequest` → `'link-problem-to-request'`

---

## 11. CHECKLISTS TAB

| Feature | Location | Description |
|---------|----------|-------------|
| **Summary Bar** | ~4610–4622 | "X done / Y total" + progress bar |
| **Grouped Checklist View** | ~4625–4627 | Grouped by parent (Problem/Request), collapsible with status badge, progress bar, items |
| **ModalChecklist** | ~2885–3000 | Status toggle, human approval, notes editor (inline textarea) |

### IPC Endpoints
- `getChecklists` → `'get-checklists'`
- `createChecklistItem` → `'create-checklist-item'`
- `updateChecklistItem` → `'update-checklist-item'`
- `deleteChecklistItem` → `'delete-checklist-item'`

---

## 12. FILES TAB

| Feature | Location | Description |
|---------|----------|-------------|
| **Init Status Indicator** | ~3751–3754 | ⚪ Not initialized, ⏳ Checking..., ✅ Ready/Initialized, ❌ Error |
| **Project Path Display** | ~3757–3781 | Shows folder path, fallback project selector |
| **Live File Change Notification** | ~3784–3789 | Green pulse when agent file changes (`onAgentFileChanged`) |
| **File Search Bar** | ~3808–3812 | Search by file name/path |
| **Files List** | ~3813–3842 | Icons by type (state=📌, context=🧠, problems=🚨, etc.) |
| **File Content Preview** | ~3847–3857 | Smart rendering: state/context has version+badge, problems/requests has colored dots, JSON has tree view, debugging has pattern cards |
| **Auto-refresh** | ~3721–3725 | Polls every 10 seconds |

### IPC Endpoints
- `readAgentFiles` → `'read-agent-files'`
- `readAgentFile` → `'read-agent-file'`
- `readProjectFile` → `'read-project-file'`
- `listAgentDirFiles` → `'list-agent-dir-files'`
- `readAgentFileContent` → `'read-agent-file-content'`
- `trackerMindSetup` → `'tracker-mind-setup'`
- `onAgentFileChanged` → `'agent-file-changed'`

---

## 13. SKILLS TAB

| Feature | Location | Description |
|---------|----------|-------------|
| **Search Bar** | ~4751–4753 | Search by name, description, content |
| **+ New Skill Button** | ~4754–4757 | Opens `SkillFormModal` |
| **Category Filter Pills** | ~4761–4772 | "All" + dynamic categories |
| **Skill Cards (2-column grid)** | ~4775–4792 | Icon, name, description, category badge, char count, "Use" button |
| **Skill Detail Modal** | ~4803–4839 | Full markdown content, version/tags, Edit + Use |
| **Skill Create/Edit Form Modal** | ~4842–4910 | Name, Category, Description, Content (markdown textarea) |

### IPC Endpoints
- `getSkills` → `'get-skills'`
- `createSkill` → `'create-skill'`
- `updateSkill` → `'update-skill'`

---

## 14. CONFIGS TAB

| Feature | Location | Description |
|---------|----------|-------------|
| **Project Prompt Editor** | ~2184–2206 | Textarea for project-specific instructions, auto-saves on blur, collapsible merged prompt preview |
| **Saved Workspaces List** | ~2211–2254 | Name + date, Load/Delete buttons, "Save Current" opens SaveConfigDialog |

### IPC Endpoints
- `getPreferences` → `'get-preferences'`
- `setPreference` → `'set-preference'`
- `saveTerminalLayout` → `'save-terminal-layout'`
- `getTerminalLayouts` → `'get-terminal-layouts'`
- `deleteTerminalLayout` → `'delete-terminal-layout'`

---

## 15. PROMPT HISTORY TAB

| Feature | Location | Description |
|---------|----------|-------------|
| **PromptHistoryTab** | ~2258–2264 (imported) | External component: search/filter, agent filter, expandable cards, timestamps, linked problem/request |
| **Delete entry** | PromptHistoryTab | Per-entry Trash2 icon |
| **Show older toggle** | PromptHistoryTab | Configurable limit (default 5) |
| **Settings > Prompt History** | SettingsPage | Preset limits (3/5/10/20/50/100) + custom input |

### IPC Endpoints
- `getPromptHistory` → `'get-prompt-history'`
- `getPromptStatus` → `'get-prompt-status'`
- `deleteTerminalMessage` → `'delete-terminal-message'`

---

## 16. QUICK INSTRUCTION INPUT BAR

| Feature | Location | Description |
|---------|----------|-------------|
| **Session Target Selector** | ~1281–1293 | Dropdown to choose target terminal |
| **Instruction Textarea** | ~1295–1352 | Multi-line, auto-expand, char counter (500 limit). Enter=send, Shift+Enter=newline |
| **@Mention Routing** | ~1301–1377 | Type `@` for dropdown of terminals, arrow-key navigable |
| **Send Button** | ~1382–1393 | Sends to target terminal with spinner |
| **Save Checkpoint (quick bar)** | ~1394–1400 | Duplicate save checkpoint |
| **Close Button** | ~1401–1406 | Closes quick input bar |

### IPC Endpoints
- `terminalWrite` → `'terminal:write-old-format'`
- `terminalWriteRaw` → `'terminal:write-raw'`
- `resolveAtMention` → `'resolve-at-mention'`
- `aiTaskAdd` → `'ai-task:add'`

---

## 17. INSTRUCTION PANEL (Full Compose)

**Component:** `src/components/InstructionPanel.tsx` (~514 lines)

| Feature | Location | Description |
|---------|----------|-------------|
| **Problem Checkbox List** | InstructionPanel.tsx:290–319 | Active problems (non-Fixed, non-Irrelevant) |
| **Request Checkbox List** | InstructionPanel.tsx:322–352 | Active requests (non-Completed, non-Cancelled) |
| **Skill Selector** | InstructionPanel.tsx:356–368 | Dropdown of available skills |
| **Custom Instruction Textarea** | InstructionPanel.tsx:370–378 | Free-form text |
| **Agent File Picker** | InstructionPanel.tsx:382–429 | Expandable file list, content embedded in prompt |
| **Prompt Preview** | InstructionPanel.tsx:432–463 | Rendered markdown with copy button |
| **Auto-persist to localStorage** | InstructionPanel.tsx:116–126 | Saves/restores panel state |
| **Double-Escape Close** | InstructionPanel.tsx:128–148 | Escape twice within 500ms closes |
| **Send to Terminal** | TerminalPage.tsx:416–470 | Assembles prompt, queues or writes, saves session with bindings |

---

## 18. DIALOGS

| Dialog | Location | Description |
|--------|----------|-------------|
| **NewSessionDialog** | ~2274–2359 | Create/Initialize modes, terminal modes, 6 context system toggles, token budget, context map visualization |
| **PromptDesignDialog** | ~1268–1274 | For generate-prompt skill workflow |
| **Save Config Dialog** | ~2565–2593 | Name input for workspace save |
| **Save Checkpoint Dialog** | ~2420–2462 | Name input, pre-filled, Enter to submit |
| **Confirm Dialog** | ~2465–2489 | Custom confirm for destructive actions |
| **Terminal Picker Dialog** | ~2596–2647 | Lists running terminals for session resume |

---

## 19. TERMINAL SPAWNING & INITIALIZATION

### initializeTerminal (5-step process)

| Step | Location | Description | IPC |
|------|----------|-------------|-----|
| 1. Wait for PTY | ~253–265 | Wait for `onTerminalReady` or 8s timeout | `'terminal:ready'` |
| 2. Set status | ~268 | Set agent status to 'waiting' | — |
| 3. Write launch | ~271–273 | `claude\r\n` or `claude --resume <id>\r\n` | `'terminal:write-raw'` |
| 4. Wait for agent | ~276–286 | Wait for `onAgentReady` or 35s timeout | `'agent:ready'` |
| 5. Write prompts | ~288–318 | Merge DEFAULT + general + project + session prompts, flush queue | `'terminal:write-raw'`, `'get-preferences'`, `'read-project-file'` |

### Message Queue System
| Feature | Location | Description |
|---------|----------|-------------|
| **queueOrSend** | ~227–235 | Queues messages if agent not ready, sends directly if ready |
| **flushMessageQueue** | ~237–243 | Flushes all queued messages after agent is ready |

### Terminal Lifecycle
| Feature | Location | Description |
|---------|----------|-------------|
| **spawnTerminal** | ~740–748 | Calls `deskflowAPI.spawnTerminal(id, cwd, agentType)` |
| **closeTerminal** | ~750–791 | Saves session, kills PTY, removes from tabs/layouts, dispatches cleanup |
| **registerTerminal** | ~399–414 | Registers terminal with backend binding |
| **handleResumeSession** | ~880–937 | Loads session config, creates terminal, initializes agent with resume ID |

---

## 20. COMPONENT REFERENCE (External)

| Component | File | Purpose |
|-----------|------|---------|
| `TerminalLayout` | `src/components/TerminalWindow.tsx` | Recursive pane tree renderer |
| `TerminalMiniMap` | `src/components/TerminalMiniMap.tsx` | Visual layout editor with DnD |
| `InstructionPanel` | `src/components/InstructionPanel.tsx` | Full compose/instruction panel |
| `NewSessionDialog` | `src/components/NewSessionDialog.tsx` | Create/initialize sessions |
| `PromptDesignDialog` | `src/components/PromptDesignDialog.tsx` | Generate-prompt skill workflow |
| `PromptHistoryTab` | `src/components/PromptHistoryTab.tsx` | Prompt history viewer |
| `ContextService` | `src/services/ContextService.ts` | Assembles context from 6 knowledge systems |
| `useTerminalLayout` | `src/hooks/useTerminalLayout.ts` | Layout state hook (unused, preserved) |

---

## 21. DATA PERSISTENCE (localStorage)

| Key | Purpose |
|-----|---------|
| `terminal-sidebarWidth` | Sidebar width |
| `terminal-activeTab` | Active sidebar tab |
| `terminal-project` | Selected project |
| `terminal-mapSplitRatio` | Map/list split ratio |
| `terminal-defaultAgent` | Default agent type |
| `compose-instruction` / `compose-<id>` | InstructionPanel state persistence |

---

## 22. AGENT FILE SYSTEM (JSON + Markdown dual-write)

| Entity | JSON File | Markdown Mirror |
|--------|-----------|-----------------|
| Problems | `agent/problems.json` | `agent/PROBLEMS.md` |
| Requests | `agent/requests.json` | `agent/REQUESTS.md` |
| Checklists | `agent/checklists.json` | None (JSON only) |
| Skills | `agent/skills/*/SKILL.md` | Skills folder (read from files) |

### Data Flow
```
User/AI Action → IPC Handler → Service (JSON read/write) → Optional MD mirror
```

---

## 23. SESSION CATEGORIES

| Category | Color (pill) | Icon |
|----------|-------------|------|
| Bug Fix | red | Bug |
| Feature | blue | Lightbulb |
| Refactor | purple | GitBranch |
| Research | cyan | Search |
| Review | green | Eye |
| Other | gray | Ellipsis |
| (default) | — | — |

---

## 24. AGENT STATUS STATE MACHINE

```
[spawning] → (terminal:ready) → [waiting] → (agent:ready) → [ready]
                                  [waiting] → (30s timeout) → [timeout] → (click retry) → [waiting]
```

---

## 25. KNOWLEDGE SYSTEMS (Context Assembly)

| System | Source Path | Default Enabled | Max Tokens |
|--------|-------------|----------------|------------|
| LLM Wiki | `<projectPath>/agent/*.md` | ✅ Yes | 2000 |
| Obsidian Skills | `<projectPath>/agent/skills/*/SKILL.md` | ✅ Yes | 500 |
| Graphify | `<projectPath>/graphify-out/graph.json` | ✅ Yes | 500 |
| PARA | `<projectPath>/CZVault/` | ❌ No | 300 |
| QMD Templates | `<projectPath>/agent/templates/*.qmd` | ✅ Yes | 200 |
| Automations | `<projectPath>/agent/automations/automations.json` | ❌ No | 100 |
| Deep Memory | `<projectPath>/agent/context/` | ✅ Yes | (dynamic) |

---

## 26. IPC ENDPOINT FULL REFERENCE (Terminal/Workspace only)

### Terminal Lifecycle
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `terminal:create` | main→renderer | Create PTY (node-pty) |
| `spawn-terminal` | main→renderer | Spawn PTY (separate handler) |
| `terminal:write-raw` | renderer→main | Write data to PTY (no DB record) |
| `terminal:write-old-format` | renderer→main | Legacy write (creates DB record) |
| `terminal:resize-old-format` | renderer→main | Resize PTY |
| `terminal:destroy-old-format` | renderer→main | Destroy PTY |
| `kill-terminal` | renderer→main | Kill terminal process |
| `terminal:ready` | main→renderer | PTY ready signal |
| `agent:ready` | main→renderer | Agent prompt detected |
| `agent:timeout` | main→renderer | Agent init timeout |

### Sessions
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `get-terminal-sessions` | renderer→main | Fetch sessions |
| `save-terminal-session` | renderer→main | Save/update session |
| `delete-terminal-session` | renderer→main | Delete session |
| `update-session-category` | renderer→main | Update categorization |
| `get-terminal-session-resume-id` | renderer→main | Get resume ID |
| `get-session-messages` | renderer→main | Get session messages |
| `save-terminal-message` | renderer→main | Save message |
| `save-session-config` | renderer→main | Save config |
| `load-session-config` | renderer→main | Load config |

### Presets & Layouts
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `get-terminal-presets` | renderer→main | Fetch presets |
| `add-terminal-preset` | renderer→main | Add preset |
| `remove-terminal-preset` | renderer→main | Remove preset |
| `execute-terminal-preset` | renderer→main | Get preset command |
| `save-terminal-preset` | renderer→main | Save/update preset |
| `get-terminal-layouts` | renderer→main | Fetch saved layouts |
| `save-terminal-layout` | renderer→main | Save layout |
| `delete-terminal-layout` | renderer→main | Delete layout |

### Bindings & Registration
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `get-terminal-bindings` | renderer→main | Get all bindings |
| `save-terminal-binding` | renderer→main | Create/update binding |
| `get-terminal-binding` | renderer→main | Get single binding |
| `update-terminal-binding` | renderer→main | Update binding |
| `register-terminal` | renderer→main | Register terminal |

### Problems, Requests, Checklists, Skills
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `get-problems` | renderer→main | Load problems |
| `create-problem` | renderer→main | Create problem |
| `update-problem-status` | renderer→main | Update status |
| `delete-problem` | renderer→main | Delete problem |
| `assign-problem-to-terminal` | renderer→main | Assign problem |
| `sync-problems-md` | renderer→main | Regenerate PROBLEMS.md |
| `get-requests` | renderer→main | Load requests |
| `create-request` | renderer→main | Create request |
| `update-request-status` | renderer→main | Update status |
| `delete-request` | renderer→main | Delete request |
| `link-problem-to-request` | renderer→main | Link problem |
| `get-checklists` | renderer→main | Load checklists |
| `create-checklist-item` | renderer→main | Create item |
| `update-checklist-item` | renderer→main | Update item |
| `delete-checklist-item` | renderer→main | Delete item |
| `get-skills` | renderer→main | Load skills |
| `create-skill` | renderer→main | Create skill |
| `update-skill` | renderer→main | Update skill |

### Agent Files & Tracker Mind
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `read-agent-files` | renderer→main | List agent/ files |
| `read-agent-file` | renderer→main | Read agent file |
| `read-project-file` | renderer→main | Read project file |
| `write-project-file` | renderer→main | Write project file |
| `list-agent-dir-files` | renderer→main | List agent dir |
| `read-agent-file-content` | renderer→main | Read file content |
| `list-project-files` | renderer→main | List project subdirectory |
| `tracker-mind-setup` | renderer→main | Initialize workspace |
| `sync-problems-md` | renderer→main | Sync markdown |
| `update-state-from-agent` | renderer→main | Update from agent |
| `watch-agent-files` | renderer→main | Watch file changes |

### Prompt History
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `get-prompt-history` | renderer→main | Get history |
| `get-prompt-status` | renderer→main | Get all statuses |
| `delete-terminal-message` | renderer→main | Delete message |
| `ai-task:add` | renderer→main | Track AI task |

---

## 27. KNOWN BUGS (undefined functions)

| Function | Called at | Effect |
|----------|-----------|--------|
| `handleTerminalMoveToGroup` | TerminalPage.tsx:1978 | Breaks drag-drop in Map tab |
| `loadSavedConfigs` | TerminalPage.tsx:1628, 2243 | Breaks Configs tab |
| `handleSaveWorkspace` | TerminalPage.tsx:2578, 2584 | Breaks Save Config dialog |
| `handleLoadWorkspace` | TerminalPage.tsx:2234 | Breaks Load workspace button |

---

## 28. KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `src/pages/TerminalPage.tsx` | Main terminal workspace (4910 lines) |
| `src/components/TerminalWindow.tsx` | xterm pane + split layout |
| `src/components/TerminalMiniMap.tsx` | Visual layout editor |
| `src/components/InstructionPanel.tsx` | Compose/instruction panel |
| `src/components/NewSessionDialog.tsx` | Session creation/init |
| `src/components/PromptDesignDialog.tsx` | Generate-prompt workflow |
| `src/components/PromptHistoryTab.tsx` | Prompt history |
| `src/services/ProblemsService.ts` | Problems CRUD + MD migration |
| `src/services/RequestsService.ts` | Requests CRUD + linking |
| `src/services/ChecklistService.ts` | Checklist CRUD |
| `src/services/SkillsService.ts` | Skill discovery + parsing |
| `src/services/ContextService.ts` | Context assembly (6 systems) |
| `src/services/ContextConfig.ts` | Context types + defaults |
| `src/lib/defaults.ts` | DEFAULT_SYSTEM_PROMPT, constants |
| `src/main.ts` | All IPC handlers |
| `src/preload.ts` | IPC bridge |
| `agent/` | Workspace files (JSON + MD) |
| `agent/skills/` | Skill definitions |
| `graphify-out/` | Knowledge graph output |

---

## 29. DATA STRUCTURES

### Problem
```typescript
{ id, title, status, priority, category, terminal_id, skill_used, user_notes,
  session_id, session_name, description?, fix_description?, root_cause?,
  files: string[], created_at, updated_at }
```

### Request
```typescript
{ id, title, description, status, priority, category,
  linked_problems: string[], session_id?, session_name?,
  created_at, updated_at }
```

### ChecklistItem
```typescript
{ id, parentType: 'problem'|'request', parentId, step, description,
  status: 'pending'|'in_progress'|'completed',
  requiresHuman: boolean, humanApproved: boolean, notes,
  created_at, updated_at }
```

### Skill
```typescript
{ id: string, name: string, description: string,
  category: string, content: string, filePath: string }
```

### TerminalSession
```typescript
{ id, agent, topic, category, status, product_area,
  resume_id?, total_tokens?, total_cost?, started_at, ended_at }
```

### TerminalBinding
```typescript
{ terminal_id, project_id, agent_type,
  active_problem_id?, active_request_id?, status }
```

---

## 30. EVENTS (CustomEvent)

| Event | Dispatch | Purpose |
|-------|----------|---------|
| `create-terminal` | TerminalPage | Main.ts creates PTY |
| `create-terminal-for-problem` | Various | Problem tab opens terminal |
| `focus-terminal` | Various | Focus specific terminal |
| `terminal-created` | Various | Post-PTY-creation setup |
| `close-pane` | TerminalWindow | Close pane |
| `open-new-session-for-terminal` | TerminalWindow | Open session dialog |
| `terminal-cleanup` | TerminalPage | Clean up PTY references |
| `terminal:ready-custom` | TerminalPage | Internal ready signal |
