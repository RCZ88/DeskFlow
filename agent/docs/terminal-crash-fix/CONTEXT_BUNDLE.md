# ENGINEERING CONTEXT: Terminal Workspace — Full Feature Inventory

## SYSTEM BOUNDARY

```
[TerminalPage.tsx ~4900 lines] ←→ [TerminalWindow.tsx 607 lines] ←→ [useTerminalLayout.ts]
       ↕ IPC (preload.ts bridges)                          ↕ window events (custom events)
[main.ts: terminalManager + node-pty]                 [Pane tree layout state]
```

The Terminal Workspace is a SPA within the app at `/terminal`. It receives `projectId`/`projectPath` props from IDEProjectsPage. The workspace manages:
- PTY terminal panes (node-pty backend, xterm.js frontend)
- 5 sidebar groups with 12 sub-tabs (Setup / Work / Insights / Studio / Context)
- AI agent lifecycle (opencode, claude, codex, aider, cursor)
- Instruction composer (markdown preview, skill DSL, session routing)
- Session categorization and cross-session sync

## 1. SIDEBAR ARCHITECTURE

### Navigation Model
```
[Group buttons] ← browser-tab style, accent strip (2px)
    ↓ click
[WorkspaceShell] ← renders sub-tab bar (chip-style pills)
    ↓ click pill
[Sub-tab content] ← rendered inline, no page navigation
```

**Sub-tab persistence:** `usePersistentSubTab` saves to URL query + localStorage.
**Accent colors:** setup=orange, work=green, insights=purple, studio=indigo, context=amber.

### Complete Sub-Tab Inventory

#### Group 1: Setup (orange, Settings icon)
| Sub-tab | Icon | Component | Key Props/State | IPC |
|---------|------|-----------|-----------------|-----|
| Presets | Zap (green) | inline | presetList, category filter | terminal_presets CRUD |
| Configs | Settings (orange) | inline | threshold, tier, debug, sync config, thoughtProcess | localStorage |

**Presets CRUD ops:** addPreset(), executePreset(), deletePreset(). DB: terminal_presets (id, name, command, category).
**Configs state shape:** { threshold: 3-30, tier: string, debug: boolean, syncEnabled: boolean, syncTTL: 30-600, broadcastContext: boolean, conflictMode: string, syncCommand: boolean, thoughtProcess: boolean }

#### Group 2: Work (green, Monitor icon)
| Sub-tab | Icon | Component | Key Props/State | IPC |
|---------|------|-----------|-----------------|-----|
| Sessions | Clock (green) | inline (large) | sessions[], filter, search, subpageGroups | terminal_sessions CRUD |
| Map | Monitor (green) | TerminalMiniMap | layout, terminals, groups | dnd-kit drag/drop |
| Files | Folder (yellow) | FilesTab (imported) | projectPath | read-agent-file, list-agent-files |

**Sessions tab features:**
- Subpage grouping: Top Pinned / Recent / This Month / Older (collapsible)
- Filter pills: SESSION_CATEGORIES (feature, bug-fix, research, code-review, refactor, devops, docs, other)
- StatusDot: active(cyan)/idle(amber)/completed(green)/error(red)/cancelled(gray)
- Session cards: status dot + CategoryBadge + agent badge + topic + terminal status
- Edit dialog: two-column form (agent, topic, category, product_area, description, status, auto_tags)
- Import opencode sessions dialog
- Detail view: metadata grid + Focus/Open buttons + Message viewer (role coloring)
- Search: text, status, category, agent filters

**Map tab features:**
- TerminalMiniMap with @dnd-kit draggable rectangles
- Click to focus, drag to rearrange
- Quadrant detection for split direction
- Running Terminals grouped below map

**Files tab features:**
- Browse agent/ directory markdown files
- Read-only view with syntax highlighting
- Pulse notification (green ping dot on Work group) when agent files change
- Read: handleFileSelect reads file via IPC

#### Group 3: Insights (purple, PieChart icon)
| Sub-tab | Component | Key Features |
|---------|-----------|--------------|
| Analytics | AnalyticsDashboard (shared, variant="full") | Period pill toggle (7d/30d/all), overview cards (tokens, cost, sessions), agent breakdown bar chart, top sessions by cost |
| Issues | IssuesWorkspace (imported) | Problems + Requests combined, status filter with color-coded headers, priority glow dots, problem/request detail modals, link/unlink, 5s auto-refresh |

**IssuesWorkspace sub-components:**
- Problem tracking: status filter (NEW/Not Started/In Progress/AI Attempted Fix/User Testing/Fixed/Irrelevant), group by status
- Request tracking: status filter (All/Pending/In Progress/Completed/Cancelled)
- ProblemDetailModal: StatusDot, priority badges, tabs (details, comments, linked requests), inline edit
- RequestDetailModal: edit status/category, link/unlink problems

#### Group 4: Studio (indigo, Sparkles icon)
| Sub-tab | Component | Key Features |
|---------|-----------|--------------|
| Skills | SkillsTab (~400 lines) | SKILL.md parse from agent/skills/, 10 widget types, inline CRUD, useSkill modal, 10s auto-refresh |
| Design | inline | Taste config knobs, style reference viewer |

**Skills tab depth:**
- Source: agent/skills/ (subdirs with SKILL.md + standalone .md) + legacy agent/skills.md
- DSL widgets (10): select, radio, switch, slider, text, textarea, code, file, checkbox, tags
- GeneralistDialog: search + category filter
- Use Skill modal: skill content + target terminal selector + prompt input + send

#### Group 5: Context (amber, Settings2 icon)
| Sub-tab | Component | Key Features |
|---------|-----------|--------------|
| Context | ContextSidebar (imported) | Toggle 6 context sources, SVG map, token budget, context assembly |
| Maintenance | ContextMaintenanceTab (382 lines) | 6 sub-components (MemoryStatusCard, ActiveContextsList, RecentChatHistory, CompactionsPanel, ContextSearchBar, SettingsPanel), 4 IPC endpoints |
| Page Context | PageContextPanel (imported) | Page identity, component tree, IPC endpoints, data flow diagram |

## 2. PTY & AGENT LIFECYCLE DEEP DIVE

### PTY Spawn (main.ts:8587-8670)
```
terminal:create IPC received
→ terminalManager.spawn(id, cwd, cols, rows)
  → ptyProcess = node-pty.spawn(shell, [], { cwd, cols, rows, name: 'xterm-color' })
  → ptyProcess.onData(data) → webContents.send('terminal:data', { id, data })
  → ptyProcess.onExit(({ exitCode, signal }) → webContents.send('terminal:exit', { id, exitCode, signal }))
  → agentDetector.onData(data) → state machine transition
```

### Agent Readiness State Machine
```
spawning ──(data received)──→ waiting ──(prompt matched)──→ ready
  │                                                             │
  └──(12s timeout)──→ timeout [dead]     (agent output) → busy ──(prompt matched)──→ ready
```

**Agent signatures (pattern match on PTY output):**
- opencode: `opencode prompt`, `opencode`
- claude: `Claude Code`, `claude`
- aider: `aider`
- codex: `codex`
- generic: fallback after 3s startup delay

### Input Buffer & Message Queue
- **Before ready:** keystrokes buffer in `inputBuffer` (flushed on `terminal:ready`)
- **Before ready:** instructions queue in `messageQueue` (flushed after system prompt)
- **System writes:** use `terminal:write-raw` channel (not `write-terminal`) to avoid prompt history pollution
- **Startup delay:** 3s before checking agent signatures (avoids shell prompt false positive)

## 3. CROSS-SESSION SYNC

### Architecture
```
touched_files DB table ← detectEditsInOutput() scans agent output
File Lock Manager ← in-memory Map<filePath, {terminalId, acquired, ttl}>
    7 IPC handlers ← lock, release, get-locks, get-touched, compile-sync, broadcast, locks-for-terminal
```

### 7 IPC Handlers
| Channel | Args | Function |
|---------|------|----------|
| lock-file | path, terminalId | Acquire lock, set 60s TTL |
| release-file-lock | path, terminalId | Release lock, remove from registry |
| get-file-locks | path | List all locks for a file |
| get-locks-for-terminal | terminalId | List all locks held by terminal |
| get-touched-files | terminalId | List files touched by terminal + conflict status |
| compile-sync-summary | terminalIds[] | Build sync summary for set of terminals |
| broadcast-context-delta | contextDelta | Broadcast context changes to other terminals |

### Conflict Detection
`detectEditsInOutput(output)` scans rendered output for patterns:
- `edit file:` / `write file:` / `create file:` / `update file:`
- **Lock cleanup:** Auto-released on terminal kill (process destroyed event)
- **UI:** Conflict toast + `/sync` command interception + lock indicators in tab bar

## 4. INSTRUCTION PANEL (Full Composer)

**State per sessionId (localStorage):** `terminalPage_instructionPanelContent_{sessionId}`
**Props:** `problemIds`, `requestIds`, `skillName`, `content`, `targetTerminalId`

### UI Layers (collapsible):
1. **Problems section:** Checkboxes for each problem (fetch via getProblems IPC)
2. **Requests section:** Checkboxes for each request
3. **Skill dropdown:** Loads skills via getSkills IPC
4. **Prompt preview:** Markdown rendering of assembled content:
   - Amber headers, green checkboxes, cyan code blocks
5. **System prompt layers:** Collapsible include/exclude per layer (default/general/project/session)
6. **Target terminal indicator:** Agent readiness state for selected terminal

### Send Flow:
```
user clicks Send
→ handleInstructionPanelSend(config, content)
→ queueOrSend(targetTerminal, assembledContent)
→ onSent(instructionText) callback
→ clear localStorage + reset form
```

## 5. CODE FIX: DOUBLE-SPAWN RACE

**Location:** `TerminalPage.tsx:1708-1718` — `handleCreateTerminal` useEffect

**Root cause:** `terminal:mark-spawned` was dispatched AFTER `await spawnTerminal()`. During async gap, TerminalPane mounted → fired `onTerminalReady(terminalId)` → `handleTerminalReady` checked `spawnedTerminalsRef` (NOT YET SET) → spawned SECOND PTY → killed first → exit handler → "Process crashed" overlay.

**Fix applied:**
```
Before: await spawnTerminal() → dispatch mark-spawned → (MISSING) initializeTerminal()
After:  dispatch mark-spawned → await spawnTerminal() → dispatch terminal-created → await initializeTerminal()
```

**Verification criteria:**
1. `handleReSpawn` (L1731) has same pattern: mark-spawned BEFORE spawn
2. `TerminalWindow.tsx:handleTerminalReady` has `spawnedTerminalsRef.current.has(terminalId)` guard
3. Exit handler distinguishes clean exit vs crash (exitCode === 0 || isManualKill)
4. `main.ts:spawn-terminal` kills existing PTY before re-spawn
5. `initializeTerminal` is in useEffect deps array

## 6. REMAINING OPEN BUGS (from PROBLEMS.md)

| Ref | Issue | Status | Target |
|-----|-------|--------|--------|
| #102 | FilesTab shows project selector when project already known from IDE page | AI Attempted Fix | FilesTab needs `projectPath` prop passed from IDE page context |
| #103 | + button hidden when no terminals exist | AI Attempted Fix | Conditional gate `{Object.keys(terminalTabs).length > 0 && (` hides the + button |
| #104 | Save button hidden in instruction input bar | AI Attempted Fix | Save checkpoint only visible in instruction input bar, not in terminal header |

## 7. IPC ENDPOINTS (Terminal-Specific)

| Channel | Dir | Args | Returns |
|---------|-----|------|---------|
| `terminal:create` | R→M | terminalId, cwd, agentType | void |
| `terminal:write-raw` | R→M | id, data | void |
| `terminal:resize` | R→M | id, cols, rows | void |
| `terminal:destroy` | R→M | id | void |
| `spawn-terminal` | R→M | id, cwd, agentType | void |
| `getAIUsageSummary` | R→M | projectId, period | { tokens, cost, sessions } |
| `workspace:save` | R→M | projectId, state | void |
| `workspace:load` | R→M | projectId | WorkspaceState |
| `read-agent-file` | R→M | path | string |
| `list-agent-files` | R→M | path | string[] |
| `lock-file` | R→M | path, terminalId | boolean |
| `release-file-lock` | R→M | path, terminalId | void |
| `get-file-locks` | R→M | path | Lock[] |
| `get-touched-files` | R→M | terminalId | TouchedFile[] |
| `compile-sync-summary` | R→M | terminalIds | SyncSummary |
| `broadcast-context-delta` | R→M | delta | void |
| `updateSessionCategory` | R→M | sessionId, category | void |
| `getParsedSessionItems` | R→M | sessionId | SessionItem[] |
| `analyzeSessionCategory` | R→M | sessionId | { category, confidence } |
| `getSkills` | R→M | projectPath | Skill[] |
| `createSkill` | R→M | skill | Skill |
| `updateSkill` | R→M | id, skill | Skill |

**Events (main→renderer):**
| Channel | Payload | Fire Condition |
|---------|---------|----------------|
| `terminal:data` | {id, data} | PTY outputs data |
| `terminal:exit` | {id, exitCode, signal} | PTY process dies |
| `terminal:ready` | {id} | PTY spawns successfully |
| `agent:ready` | {id, agent} | Agent prompt matched |
| `onAgentFileChanged` | {path} | File in agent/ dir changes |

**Window events (within renderer):**
| Event | Payload | Dispatch Location |
|-------|---------|-------------------|
| `create-terminal` | {terminalId, cwd, agent, sessionName} | + button, New Session dialog |
| `terminal-created` | {terminalId, agent} | handleCreateTerminal |
| `terminal:mark-spawned` | {terminalId} | handleCreateTerminal |
| `close-pane` | {id} | Close button in terminal tab |
| `open-new-agent` | {} | IDE New Agent button |
