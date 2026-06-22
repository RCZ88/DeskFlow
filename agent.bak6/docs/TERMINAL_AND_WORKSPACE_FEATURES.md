# Terminal & Workspace — Complete Feature Inventory

**Last Updated:** 2026-06-05
**Source files:** `src/pages/TerminalPage.tsx` (~5991 lines), `src/components/TerminalWindow.tsx`, `src/components/IssuesWorkspace.tsx`, `src/components/ContextSidebar.tsx`, `src/components/ContextMaintenanceTab.tsx`, `src/pages/DesignWorkspacePage.tsx`, `src/components/*`, `src/services/*`, `src/main.ts`, `src/preload.ts`

---

## 1. HEADER / TOP BAR (Toolbar)

Rendered inline in TerminalPage.tsx, above the terminal tab bar.

| Feature | Description |
|---------|-------------|
| **Project Selector** | `<select>` dropdown listing all projects from `deskflowAPI.getProjects()` |
| **Project Info Badge** | Shows project name, green dot, path, language, VCS type |
| **Open Terminal Button** | Creates new terminal tab + layout entry |
| **Setup Button** | Opens `NewSessionDialog` in `'initialize'` mode |
| **Compose Button** | Purple gradient. Opens full `InstructionPanel` component (problem/request/skill selectors) |
| **Quick Send Button** | Zinc. Opens inline text-only instruction input bar with @mention routing |
| **Save Checkpoint Button** | Zinc with 💾 icon. Opens Save Checkpoint dialog |
| **Terminal Binding Badge** | Shows agent type, bound problem ID, green pulse dot, dropdown to bind problems |
| **Instruction Panel** | Full compose/instruction panel (`InstructionPanel`) with problem/request checkboxes, skill selector, custom instruction textarea, agent file picker, prompt preview, auto-persist |
| **Quick Instruction Input** | Inline textarea with session target selector, @mention routing, 500-char limit, Enter=send, Shift+Enter=newline |

### IPC Endpoints (header)
- `getProjects` → `'get-projects'`
- `saveTerminalBinding` → `'save-terminal-binding'`
- `updateTerminalBinding` → `'update-terminal-binding'`
- `getTerminalBindings` → `'get-terminal-bindings'`

---

## 2. TERMINAL TAB BAR

| Feature | Description |
|---------|-------------|
| **Terminal Tabs** | Horizontal tab bar. Each tab: Monitor icon, status dot, name, session category badge, model tier badge (top/mid/low), file lock count, session indicator "S", close (X) button |
| **Group Color Indicators** | Each tab has a colored top-border strip (8 rotating colors) from the layout group |
| **Drag-to-Reorder** | Drag-and-drop reorder within groups and between groups |
| **New Terminal Tab (+)** | Creates new terminal, adds to layout, dispatches `'create-terminal'` CustomEvent |
| **Group Tabs** | If multiple layout groups exist, shows "Group 1", "Group 2", etc. pill selectors |

---

## 3. TERMINAL LAYOUT / XTERM PANES

| Feature | Description |
|---------|-------------|
| **Terminal Error Notification Bar** | Dismissible notification bar (red/yellow/green based on type) |
| **Empty State** | "+ Open Terminal" button when no terminals exist |
| **TerminalLayout Component** (TerminalWindow.tsx) | Recursive pane tree rendering |
| **TerminalPane Component** (TerminalWindow.tsx) | Individual `@xterm/xterm` instance with custom dark theme |
| **FitAddon** | Auto-sizing terminal to container |
| **WebLinksAddon** | Clickable links in terminal |
| **Hover Overlay Controls** | Split Vertical (⋮), Split Horizontal (⋯), Close (✕) buttons on hover |
| **Agent Status Overlay** | "Initializing agent..." (cyan pulsing) or "Agent failed. Click to retry." (amber) |
| **Split Handle Dragging** | Mouse drag to resize split ratio between panes |
| **Layout Tree Operations** | `removePane`, `splitPane`, `findGroupIndex`, `removeFromLayouts`, `insertIntoLayout`, `toggleSplitDirection`, `adjustSplitRatio` |

---

## 4. SIDEBAR

| Feature | Description |
|---------|-------------|
| **Sidebar Container** | Right-side panel, `width` state-controlled (default ~350px, range 240-600px), with gradient background |
| **Resize Handle** | Left-edge 1px drag handle, turns cyan on hover/drag |
| **Sidebar Header** | Cyan dot + "TERMINAL" label + Info icon + BookOpen icon + collapse button |
| **Collapse/Expand** | Toggles sidebar visibility; collapsed shows vertical icon strip (Info → BookOpen → divider → PanelLeft) |

### Sidebar Tabs (12 total)

| # | Tab | Icon | Color | Type | Content Source |
|---|-----|------|-------|------|---------------|
| 1 | Presets | Zap | green | Inline | Inline JSX (~2407-2578) |
| 2 | Sessions | Clock | green | Inline | Inline JSX (~2580-2905) |
| 3 | Map | Monitor | green | Inline + Component | MiniMap + running terminals (~2907-3050) |
| 4 | Analytics | PieChart | green | Component | AnalyticsDashboard (~3052-3076) |
| 5 | Issues | ListChecks | emerald | Component | IssuesWorkspace (~3089-3091) |
| 6 | Files | Folder | yellow | Inline Component | FilesTab defined at line 5217 |
| 7 | Skills | Sparkles | indigo | Inline Component | SkillsTab defined at line 4595 |
| 8 | Design | Palette | pink | Component | DesignWorkspacePage (separate page file) |
| 9 | Configs | Settings | orange | Inline | Multiple config sections (~3116-3615) |
| 10 | History | RefreshCw | rose | Inline | Placeholder (~3617-3624) |
| 11 | Context | Settings2 | amber | Component | ContextSidebar (37KB) |
| 12 | Maintenance | Database | violet | Component | ContextMaintenanceTab (15KB) |

---

## 5. PRESETS TAB (green)

| Feature | Description |
|---------|-------------|
| **Add Preset Button** | Toggles inline add form |
| **Add Preset Form** | Name, Command, Category inputs + Save/Cancel |
| **Preset List** | Each preset: name, command (mono truncated). Hover: Run (Play green), Edit/Info, Delete. Built-in presets marked `[SYSTEM]` (blue). |
| **Edit Preset Dialog** | Modal overlay editing name/command/category |

### IPC Endpoints
- `getTerminalPresets` → `'get-terminal-presets'`
- `addTerminalPreset` → `'add-terminal-preset'`
- `removeTerminalPreset` → `'remove-terminal-preset'`
- `executeTerminalPreset` → `'execute-terminal-preset'`

---

## 6. SESSIONS TAB (green)

| Feature | Description |
|---------|-------------|
| **New Session Button** | Opens `NewSessionDialog` |
| **Import Button** | Opens `ImportSessionsDialog` to import from opencode CLI |
| **Save/Load Workspace Buttons** | Save/load workspace layout (sidebar, tab, terminals) |
| **Category Filter Pills** | All + 6 categories (Bug Fix, Feature, Refactor, Research, Review, Other) with dot colors |
| **Session Cards** | GlassCard with left border accent (emerald if running, zinc if closed). Shows: StatusDot, CategoryBadge, agent badge, topic, auto-named indicator, date, terminal name (or "Closed"), product area, description, auto-tags, cost, resume ID. Hover actions: Details, Focus/Open, Messages, Delete |
| **Session Detail View** | Detail card with metadata grid (status, category, date, terminal, cost, tokens, resume_id, description, product_area) + Focus Terminal/Open button |
| **Session Messages Viewer** | Inline messages list with Refresh, role-colored bubbles (user=blue, assistant=cyan, system=amber), Quote button, ANSI stripping |
| **Session Edit Dialog** | Edit topic, agent, category, product area, description |
| **Full Messages Viewer (Modal)** | Full modal with search, role-colored bubbles, ANSI stripping |
| **Context Menu** | Right-click session → "Open in Terminal" submenu listing running terminals |

### IPC Endpoints
- `getTerminalSessions` → `'get-terminal-sessions'`
- `saveTerminalSession` → `'save-terminal-session'`
- `deleteTerminalSession` → `'delete-terminal-session'`
- `updateSessionCategory` → `'update-session-category'`
- `getTerminalSessionResumeId` → `'get-terminal-session-resume-id'`
- `getSessionMessages` → `'get-session-messages'`
- `saveTerminalMessage` → `'save-terminal-message'`
- `saveSessionConfig` → `'save-session-config'`
- `loadSessionConfig` → `'load-session-config'`

---

## 7. MAP TAB (green)

| Feature | Description |
|---------|-------------|
| **TerminalMiniMap Component** (TerminalMiniMap.tsx) | Visual terminal layout editor |
| **Group Switcher** | ◀ / ▶ arrows to switch terminal groups |
| **Visual Tree Pane** | Split-pane tree as nested divs, click handles to toggle direction |
| **DnD Drag & Drop** | `@dnd-kit/core` — swap (center), split vertical (left/right), split horizontal (top/bottom) |
| **Auto-switch to active group** | Follows active terminal |
| **Running Terminals List** | Per-group with drag-to-reorder, Focus/New Session buttons. Shows: terminal name, agent, file lock count, active state, session info |
| **Map Split Ratio Handle** | Drag to resize map vs. list, persisted to localStorage |

---

## 8. ANALYTICS TAB (green)

| Feature | Description |
|---------|-------------|
| **Period Selector** | 7 Days / 30 Days / All Time pill toggle |
| **AnalyticsDashboard Component** | Full analytics dashboard with token usage, cost distribution, sessions over time, checklist progress |

### IPC Endpoints
- `getAIUsageSummary` → `'get-ai-usage-summary'`
- `getChecklists` → `'get-checklists'`

---

## 9. ISSUES TAB (emerald)

| Feature | Description |
|---------|-------------|
| **IssuesWorkspace Component** (49KB) | Complete issue tracker workspace |
| **Hide Finished Toggle** | Eye/EyeOff toggle to filter hidden problems/requests |

*(Full feature breakdown in IssuesWorkspace.tsx source)*

### IPC Endpoints (via IssuesWorkspace)
- `getProblems` → `'get-problems'`
- `createProblem` → `'create-problem'`
- `updateProblemStatus` → `'update-problem-status'`
- `assignProblemToTerminal` → `'assign-problem-to-terminal'`
- `deleteProblem` → `'delete-problem'`
- `syncProblemsMd` → `'sync-problems-md'`
- `getRequests` → `'get-requests'`
- `createRequest` → `'create-request'`
- `updateRequestStatus` → `'update-request-status'`
- `deleteRequest` → `'delete-request'`
- `linkProblemToRequest` → `'link-problem-to-request'`
- `getChecklists` → `'get-checklists'`
- `createChecklistItem` → `'create-checklist-item'`
- `updateChecklistItem` → `'update-checklist-item'`
- `deleteChecklistItem` → `'delete-checklist-item'`

---

## 10. FILES TAB (yellow)

| Feature | Description |
|---------|-------------|
| **FilesTab Component** (inline in TerminalPage.tsx:5217) | Agent file browser |
| **Init Status Indicator** | ⚪ Not initialized, ⏳ Checking..., ✅ Ready/Initialized, ❌ Error |
| **Project Path Display** | Shows folder path, fallback project selector |
| **Live File Change Notification** | Green ping dot on tab when agent file changes |
| **File Search Bar** | Search by file name/path |
| **Files List** | Icons by type (state=📌, context=🧠, problems=🚨, etc.) |
| **File Content Preview** | Smart rendering: state/context has version+badge, problems/requests has colored dots, JSON has tree view, debugging has pattern cards |
| **Auto-refresh** | Polls every 10 seconds |

### IPC Endpoints
- `readAgentFiles` → `'read-agent-files'`
- `readAgentFile` → `'read-agent-file'`
- `readProjectFile` → `'read-project-file'`
- `listAgentDirFiles` → `'list-agent-dir-files'`
- `readAgentFileContent` → `'read-agent-file-content'`
- `trackerMindSetup` → `'tracker-mind-setup'`
- `onAgentFileChanged` → `'agent-file-changed'`

---

## 11. SKILLS TAB (indigo)

| Feature | Description |
|---------|-------------|
| **SkillsTab Component** (inline in TerminalPage.tsx:4595) | Skill management |
| **Search Bar** | Search by name, description, content |
| **+ New Skill Button** | Opens `SkillFormModal` |
| **Category Filter Pills** | "All" + dynamic categories |
| **Skill Cards (2-column grid)** | Icon, name, description, category badge, char count, "Use" button |
| **Skill Detail Modal** | Full markdown content, version/tags, Edit + Use |
| **Skill Create/Edit Form** | Name, Category, Description, Content (markdown textarea) |
| **Skill Dynamic Form** | `SkillDynamicForm` component for parameterized skill execution |

### IPC Endpoints
- `getSkills` → `'get-skills'`
- `createSkill` → `'create-skill'`
- `updateSkill` → `'update-skill'`

---

## 12. DESIGN TAB (pink)

| Feature | Description |
|---------|-------------|
| **DesignWorkspacePage Component** (separate page file) | Workspace design tools |

---

## 13. CONFIGS TAB (orange)

| Feature | Description |
|---------|-------------|
| **Model Configuration** | Re-injection threshold slider (3-30), default model tier selector (top/mid/low), debug mode toggle |
| **Auto-Assign Routing** | Enable toggle, routing model select, summary frequency, auto-rename toggle + threshold |
| **Infrastructure Cost** | Cost cards (today, week, month, all time) with call type breakdown |
| **Cross-Session Sync** | Lock TTL slider (30s-10m), context broadcast toggle, conflict warning mode select, /sync command toggle, thought process toggle |
| **Live Context Viewer** | File locks per terminal, recent edits feed (timestamps), recent conflicts feed |

### IPC Endpoints
- `getPreferences` → `'get-preferences'`
- `setPreference` → `'set-preference'`
- `saveTerminalLayout` → `'save-terminal-layout'`
- `getTerminalLayouts` → `'get-terminal-layouts'`
- `deleteTerminalLayout` → `'delete-terminal-layout'`

---

## 14. HISTORY TAB (rose)

| Feature | Description |
|---------|-------------|
| **Placeholder** | "No history records yet. Activity will appear here." |
| *(To be implemented)* | Future: prompt history viewer |

---

## 15. CONTEXT TAB (amber)

| Feature | Description |
|---------|-------------|
| **ContextSidebar Component** (37KB) | Full context management sidebar |
| **Project Context** | Project ID and path configuration |
| **Knowledge Systems** | 6 knowledge system toggles (LLM Wiki, Skills, Graphify, PARA, QMD, Deep Memory) |

---

## 16. MAINTENANCE TAB (violet)

| Feature | Description |
|---------|-------------|
| **ContextMaintenanceTab Component** (15KB) | Context maintenance utilities |

---

## 17. DIALOGS

| Dialog | Description |
|--------|-------------|
| **NewSessionDialog** | Create/Initialize modes, terminal modes, 6 context system toggles, token budget, context map visualization |
| **SessionEditDialog** | Edit session topic, agent, category, product area, description |
| **FeaturesDialog** | Overview of all workspace features (renders at end of TerminalPage.tsx) |
| **GeneralistDialog** | Skill configuration (from agent/skills/) |
| **Save Checkpoint Dialog** | Name input for workspace checkpoint, pre-filled, Enter to submit |
| **Close Workspace Dialog** | Save & Close or Discard & Close options |
| **Confirm Dialog** | Custom confirm for destructive actions (using state, not window.confirm) |
| **ImportSessionsDialog** | Import sessions from opencode CLI |
| **InitializeProgressModal** | Workspace initialization progress with grouped directory display, expandable previews, error retry |
| **RoutingDisambiguationDialog** | AI routing disambiguation |
| **RoutingToast** | Routing notifications |
| **PromptDesignDialog** | Generate-prompt skill workflow |
| **DSLGenerationModal** | DSL generation |

---

## 18. COLLAPSED SIDEBAR STATE

| Feature | Description |
|---------|-------------|
| **Vertical Icon Strip** | Shown when sidebar is collapsed. Icons: Info (cyan hover) → BookOpen (violet hover) → divider → PanelLeft (cyan hover to re-open) |
| **Tooltips** | Each icon has `title` attribute for tooltip |

---

## 19. TERMINAL SPAWNING & INITIALIZATION

### initializeTerminal (5-step process)
1. Wait for PTY ready + 8s timeout
2. Set agent status to 'waiting'
3. Write launch command (`claude\r\n` or `${agent}\r\n`)
4. Wait for `agent:ready` event (35s timeout)
5. Write system prompt → init content → thought process

### Message Queue System
- `queueOrSend`: Queues messages if agent not ready, sends directly if ready
- `flushMessageQueue`: Flushes all queued messages after agent is ready

### Terminal Lifecycle
- `spawnTerminal`: Creates PTY via IPC
- `closeTerminal`: Saves session, kills PTY, removes from tabs/layouts
- `registerTerminal`: Registers with backend binding
- `handleResumeSession`: Loads config, creates terminal, initializes with resume ID

---

## 20. PROJECT STATS (above tab content)

| Feature | Description |
|---------|-------------|
| **Project Stats Card** | Shows when project is selected: Language, VCS, IDE in key-value layout |
| **Container** | `bg-zinc-800/50 rounded-lg p-2` |

---

## 21. COMPONENT REFERENCE (External to TerminalPage.tsx)

| Component | File | Purpose |
|-----------|------|---------|
| `TerminalLayout` | `src/components/TerminalWindow.tsx` | Recursive pane tree renderer |
| `TerminalMiniMap` | `src/components/TerminalMiniMap.tsx` | Visual layout editor with DnD |
| `InstructionPanel` | `src/components/InstructionPanel.tsx` | Full compose/instruction panel |
| `NewSessionDialog` | `src/components/NewSessionDialog.tsx` | Create/initialize sessions |
| `IssuesWorkspace` | `src/components/IssuesWorkspace.tsx` | Issues/Problems/Requests/Checklists workspace (49KB) |
| `ContextSidebar` | `src/components/ContextSidebar.tsx` | Context management (37KB) |
| `ContextMaintenanceTab` | `src/components/ContextMaintenanceTab.tsx` | Context maintenance (15KB) |
| `DesignWorkspacePage` | `src/pages/DesignWorkspacePage.tsx` | Design tools |
| `ImportSessionsDialog` | `src/components/ImportSessionsDialog.tsx` | CLI import |
| `GeneralistDialog` | `src/components/GeneralistDialog.tsx` | Skill configuration |
| `PromptDesignDialog` | `src/components/PromptDesignDialog.tsx` | Generate-prompt workflow |
| `InitializeProgressModal` | `src/components/InitializeProgressModal.tsx` | Workspace initialization |
| `AnalyticsDashboard` | `src/components/AnalyticsDashboard.tsx` | AI usage analytics |
| `RoutingDisambiguationDialog` | `src/components/RoutingDisambiguationDialog.tsx` | AI routing |
| `SessionEditDialog` | `src/components/SessionEditDialog.tsx` | Session editing |
| `SkillDynamicForm` | `src/components/SkillDynamicForm.tsx` | Skill execution forms |
| `DSLGenerationModal` | `src/components/DSLGenerationModal.tsx` | DSL generation |
| `GlassCard` | `src/components/GlassCard.tsx` | Glass card component |

**Inline sub-components (defined inside TerminalPage.tsx):**
| Component | Line | Purpose |
|-----------|------|---------|
| `SkillsTab` | ~4595 | Skill management UI |
| `FilesTab` | ~5217 | Agent file browser |

---

## 22. DATA PERSISTENCE (localStorage)

| Key | Purpose |
|-----|---------|
| `terminal-sidebarWidth` | Sidebar width |
| `terminal-activeTab` | Active sidebar tab |
| `terminal-project` | Selected project |
| `terminal-mapSplitRatio` | Map/list split ratio |
| `terminal-defaultAgent` | Default agent type |
| `compose-instruction` / `compose-<id>` | InstructionPanel state persistence |
| `model-reinject-threshold` | Re-injection threshold |
| `default-model-tier` | Default model tier |
| `model-debug-mode` | Debug mode state |
| `cross-session-sync-enabled` | Cross-session sync toggle |
| `file-lock-ttl` | File lock TTL |
| `context-broadcast-enabled` | Context broadcast toggle |
| `conflict-warning-mode` | Conflict warning mode |
| `sync-command-enabled` | /sync command toggle |
| `thought-process-enabled` | Thought process toggle |

---

## 23. AGENT FILE SYSTEM (JSON + Markdown dual-write)

| Entity | JSON File | Markdown Mirror |
|--------|-----------|-----------------|
| Problems | `agent/problems.json` | `agent/PROBLEMS.md` |
| Requests | `agent/requests.json` | `agent/REQUESTS.md` |
| Checklists | `agent/checklists.json` | None (JSON only) |
| Skills | `agent/skills/*/SKILL.md` | Skills folder (read from files) |

---

## 24. SESSION CATEGORIES

| Category | Color (pill) | Icon |
|----------|-------------|------|
| Bug Fix | red | Bug |
| Feature | blue | Lightbulb |
| Refactor | purple | GitBranch |
| Research | cyan | Search |
| Review | green | Eye |
| Other | gray | Ellipsis |

---

## 25. AGENT STATUS STATE MACHINE

```
[spawning] → (terminal:ready) → [waiting] → (agent:ready) → [ready]
                                  [waiting] → (35s timeout) → [timeout] → (click retry) → [waiting]
```

---

## 26. KNOWLEDGE SYSTEMS (Context Assembly)

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

## 27. IPC ENDPOINT FULL REFERENCE (Terminal/Workspace only)

### Terminal Lifecycle
- `terminal:create` — Create PTY (node-pty)
- `spawn-terminal` — Spawn PTY
- `terminal:write-raw` — Write data to PTY (no DB record)
- `terminal:write-old-format` — Legacy write (creates DB record)
- `terminal:resize-old-format` — Resize PTY
- `terminal:destroy-old-format` — Destroy PTY
- `kill-terminal` — Kill terminal process
- `terminal:ready` — PTY ready signal
- `agent:ready` — Agent prompt detected
- `agent:timeout` — Agent init timeout

### Sessions
- `get-terminal-sessions` / `save-terminal-session` / `delete-terminal-session`
- `update-session-category`
- `get-terminal-session-resume-id`
- `get-session-messages` / `save-terminal-message`
- `save-session-config` / `load-session-config`

### Presets & Layouts
- `get-terminal-presets` / `add-terminal-preset` / `remove-terminal-preset`
- `execute-terminal-preset` / `save-terminal-preset`
- `get-terminal-layouts` / `save-terminal-layout` / `delete-terminal-layout`

### Bindings & Registration
- `get-terminal-bindings` / `save-terminal-binding`
- `get-terminal-binding` / `update-terminal-binding`
- `register-terminal`

### Problems, Requests, Checklists, Skills
- `get-problems` / `create-problem` / `update-problem-status` / `delete-problem`
- `assign-problem-to-terminal` / `sync-problems-md`
- `get-requests` / `create-request` / `update-request-status` / `delete-request`
- `link-problem-to-request`
- `get-checklists` / `create-checklist-item` / `update-checklist-item` / `delete-checklist-item`
- `get-skills` / `create-skill` / `update-skill`

### Agent Files & Tracker Mind
- `read-agent-files` / `read-agent-file` / `read-project-file` / `write-project-file`
- `list-agent-dir-files` / `read-agent-file-content` / `list-project-files`
- `tracker-mind-setup` / `sync-problems-md` / `update-state-from-agent`
- `watch-agent-files` / `agent-file-changed`

### Prompt History
- `get-prompt-history` / `get-prompt-status` / `delete-terminal-message`
- `ai-task:add`

---

## 28. KNOWN ISSUES (undefined functions)

| Function | Effect |
|----------|--------|
| `handleTerminalMoveToGroup` | Breaks drag-drop in Map tab |
| `loadSavedConfigs` | Breaks Configs tab saved workspaces |
| `handleSaveWorkspace` | Breaks Save Config dialog |
| `handleLoadWorkspace` | Breaks Load workspace button |

---

## 29. KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `src/pages/TerminalPage.tsx` | Main terminal workspace (5991 lines) — sidebar + toolbar + terminal |
| `src/components/TerminalWindow.tsx` | xterm pane + split layout |
| `src/components/TerminalMiniMap.tsx` | Visual layout editor |
| `src/components/IssuesWorkspace.tsx` | Issues/Problems/Requests/Checklists (49KB) |
| `src/components/ContextSidebar.tsx` | Context management (37KB) |
| `src/components/ContextMaintenanceTab.tsx` | Context maintenance (15KB) |
| `src/pages/DesignWorkspacePage.tsx` | Design workspace tools |
| `src/components/InstructionPanel.tsx` | Compose/instruction panel |
| `src/components/NewSessionDialog.tsx` | Session creation/init |
| `src/components/AnalyticsDashboard.tsx` | Analytics dashboard |
| `src/services/ProblemsService.ts` | Problems CRUD + MD migration |
| `src/services/RequestsService.ts` | Requests CRUD + linking |
| `src/services/ChecklistService.ts` | Checklist CRUD |
| `src/services/SkillsService.ts` | Skill discovery + parsing |
| `src/services/ContextService.ts` | Context assembly (6 systems) |
| `src/services/ContextConfig.ts` | Context types + defaults |
| `src/lib/defaults.ts` | DEFAULT_SYSTEM_PROMPT, constants |
| `src/main.ts` | All IPC handlers |
| `src/preload.ts` | IPC bridge |

---

## 30. DATA STRUCTURES

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

## 31. EVENTS (CustomEvent)

| Event | Purpose |
|-------|---------|
| `create-terminal` | Main.ts creates PTY |
| `create-terminal-for-problem` | Problem tab opens terminal |
| `focus-terminal` | Focus specific terminal |
| `terminal-created` | Post-PTY-creation setup |
| `close-pane` | Close pane |
| `open-new-session-for-terminal` | Open session dialog |
| `terminal-cleanup` | Clean up PTY references |
| `switch-sidebar-tab` | Switch active sidebar tab (e.g., to 'context') |
| `trigger-provision` | Trigger workspace provisioning |
| `open-new-agent` | Open new agent dialog |
| `terminal:mark-spawned` | Mark terminal as spawned |
