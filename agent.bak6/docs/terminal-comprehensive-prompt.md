# Terminal Workspace — Complete End-to-End Implementation

## Context

This is an Electron + React + TypeScript desktop app (DeskFlow) for productivity tracking. The **Terminal Workspace** is a full-featured integrated terminal panel (`/terminal` route) that aims to replace standalone terminal usage by embedding node-pty PTY instances with xterm.js, AI agent auto-launch (Claude Code, OpenCode), split panes, session persistence, and a rich sidebar.

**Current State:** ~2500 lines of partially-implemented code across 5 files. The architecture exists (IPC handlers, DB tables, React components) but **NO feature works end-to-end**. The shell spawns in ~50% of cases but:
- No AI agent auto-launches after shell
- Split panes create layout nodes but don't manage PTY lifecycle
- Session persistence saves to DB but doesn't restore terminal state
- Layout persistence saves pane positions but doesn't re-spawn PTYs
- Keyboard input has race conditions

**The Mandate:** Design and implement a complete, working terminal workspace where ALL of the following features work end-to-end, with no dead code, no race conditions, and no duplicate state.

---

## Architecture Overview

### Files to Modify
| File | Purpose | Lines |
|------|---------|-------|
| `src/main.ts` | IPC handlers, node-pty TerminalManager, DB persistence | ~8192 total |
| `src/preload.ts` | contextBridge API surface for renderer | 362 lines |
| `src/pages/TerminalPage.tsx` | Main terminal page — layout, tabs, sidebar, event wiring | 2521 lines |
| `src/components/TerminalWindow.tsx` | TerminalPane (xterm.js), TerminalLayout (split panes), PaneNode types | 519 lines |
| `src/hooks/useTerminalLayout.ts` | Layout persistence (save/load from DB) | 114 lines |

### IPC Contract (12 Channels)

| Channel | Direction | Payload | Purpose |
|---------|-----------|---------|---------|
| `terminal:create` | renderer → main | `(id, cwd, cols, rows)` | Spawn PTY via node-pty |
| `terminal:write` | renderer → main | `(id, data)` | Write to PTY stdin |
| `terminal:resize` | renderer → main | `(id, cols, rows)` | Resize PTY |
| `terminal:destroy` | renderer → main | `(id)` | Kill PTY process |
| `terminal:data` | main → renderer | `(id, data)` | PTY output → xterm.js |
| `terminal:exit` | main → renderer | `(id, exitCode, signal)` | PTY exit notification |
| `spawn-terminal` | renderer → main | `(id, cwd)` | Legacy — same as terminal:create but wraps onData in handler |
| `write-terminal` | renderer → main | `(id, data)` | Write + persist to terminal_messages |
| `resize-terminal` | renderer → main | `(id, cols, rows)` | Resize (duplicate) |
| `kill-terminal` | renderer → main | `(id)` | Kill (duplicate) |
| `terminal-exit` | main → renderer | `(id, exitCode, signal)` | Exit event (duplicate channel) |
| `get-session-messages` | renderer → main | `(sessionId, agentType?)` | Fetch session messages |

### DB Tables

**`terminal_sessions`**: `id TEXT PK, project_id TEXT, agent TEXT, resume_id TEXT, topic TEXT, working_directory TEXT, total_tokens INTEGER, total_cost REAL, created_at TEXT, updated_at TEXT`

**`terminal_messages`**: `id INTEGER PK AUTOINCREMENT, session_id TEXT, role TEXT, content TEXT, created_at TEXT`

**`terminal_layouts`**: `id TEXT PK, project_id TEXT, name TEXT, layout_data TEXT, is_active INTEGER, created_at TEXT, updated_at TEXT`

### Component Responsibilities (Current)

- **TerminalPage**: State management for — project selection, terminal tabs, sidebar (7 tabs), sessions list, presets list, problems list, terminal bindings, instruction input, messages viewer. Owns `spawnTerminal()` callback. Has its own `useTerminalLayout` instance.
- **TerminalLayout** (`<TerminalWindow.tsx>`): Split pane renderer. Has its OWN `useTerminalLayout` instance (SECOND independent one). Handles `create-terminal` and `close-pane` custom events. Calls `spawnTerminal` prop. Tracks spawned terminals via `spawnedTerminalsRef`.
- **TerminalPane** (same file): xterm.js instance. `onData` → `terminalAPI.write` IPC. `onTerminalData` listener → `terminal.write()` to render PTY output. `onTerminalReady` callback fires after mount → triggers `handleTerminalReady` → spawn if not already.
- **useTerminalLayout**: Loads/saves `PaneNode` JSON to `terminal_layouts` table. Debounced save (1s).

---

## CRITICAL BUGS — Must Fix

### Bug 1: Double Spawn on `create-terminal` Event

**Root Cause:** TerminalLayout's `create-terminal` event handler (TerminalWindow.tsx:329) calls `await spawnTerminal(newTerminalId, cwd)` but does NOT add `newTerminalId` to `spawnedTerminalsRef.current`. When the layout re-renders with the new pane, `TerminalPane` mounts, fires `onTerminalReady` → `handleTerminalReady` (line 302) → checks `spawnedTerminalsRef.current.has(terminalId)` — it's NOT there, so it calls `spawnTerminal` AGAIN. The second spawn finds the PTY in the Map, kills it, and re-spawns.

**Fix:** Add `spawnedTerminalsRef.current.add(newTerminalId)` BEFORE the `await spawnTerminal(...)` call in the create-terminal handler.

### Bug 2: Two Independent `useTerminalLayout` Instances

**Root Cause:** Both `TerminalPage.tsx` (line 99) and `TerminalWindow.tsx` (line 193) create their own `useTerminalLayout(...)` hook instances. Each has its own layout state. They try to sync via:
- `onLayoutChange` callback (TerminalPage → TerminalLayout) — only fires on layout change IN TerminalLayout
- `setTerminalLayout` in TerminalPage is called directly by Open Terminal button
- Custom events (`create-terminal`) modify TerminalLayout's layout but NOT TerminalPage's

**Fix:** Choose ONE source of truth. Either:
- A) Pass layout state down to TerminalLayout as a controlled component (remove its internal hook)
- B) Move all layout logic into TerminalLayout and remove TerminalPage's hook, using a ref-based callback pattern
- C) Use a shared context/provider

### Bug 3: No AI Agent Auto-Start

**Root Cause:** After `spawn-terminal` IPC handler creates the PTY (main.ts:5114), the shell starts but NO command is sent to launch the AI agent. The `handleTerminalCreated` event handler (TerminalPage.tsx:571) sends system prompt + INITIALIZE.md after 1500ms delay, but never sends the actual launch command (`claude` or `opencode`).

**Fix:** After shell spawn + system prompt + INITIALIZE.md, send the launch command: `claude` (for Claude Code) or `opencode` (for OpenCode). This should happen AFTER a small delay to let the shell start. Include `--resume` flag if a `resumeId` was associated.

### Bug 4: Open Terminal Button Skips `terminal-created` Event

**Root Cause:** The "Open Terminal" button handler (TerminalPage.tsx:655) modifies layout state and calls `spawnTerminal` directly, but does NOT dispatch `terminal-created` or `create-terminal` custom events. This means:
- No system prompt is sent
- No INITIALIZE.md is loaded
- No terminal tab is registered in TerminalLayout's tab bar
- TerminalPage's `handleTerminalCreated` never fires

**Fix:** Either dispatch `terminal-created` event after spawn, or extract the initialization logic (system prompt + INITIALIZE.md) into a shared function that both paths call.

### Bug 5: Layout Persistence Doesn't Re-Spawn PTY

**Root Cause:** When `useTerminalLayout` loads a layout from DB (JSON containing pane IDs), it restores the pane structure but does NOT call `spawnTerminal` for each pane. The PTY processes don't exist after layout load. The first time a pane renders, `handleTerminalReady` fires and spawns — but this is unreliable due to Bug 1 and the ref tracking.

**Fix:** After loading layout from DB, iterate all leaf nodes and call `spawnTerminal` for each. This may require delaying renders until spawns complete.

### Bug 6: Keyboard Input Race Condition

**Root Cause:** `TerminalPane.onData` (TerminalWindow.tsx:77) fires on ANY user keystroke and immediately calls `terminalAPI.write(terminalId, data)` → IPC `terminal:write` → `terminalManager.write(id, data)`. If the user types before the spawn completes (very likely with PowerShell which starts in ~50ms), the PTY doesn't exist in the Map yet. The write silently fails (`return false` at main.ts:5039).

**Fix:** Buffer writes before spawn completes, or gate keyboard handling behind a "terminal ready" flag.

---

## 20+ Features — Complete Spec

### Core Terminal (Features 1-9)

#### 1. + Button → Create Terminal
- **Entry:** `+` button in tab bar (TerminalPage.tsx:876)
- **Flow:** Sets tab → dispatches `create-terminal` event → TerminalLayout handles → spawns PTY via spawnTerminal prop → pane renders → TerminalPane connects → dispatches `terminal-created` → TerminalPage receives → registers terminal + saves session + sends system prompt + auto-launches AI agent
- **UX:** Tab appears immediately, xterm shows "Starting shell...", shell prompt appears within 2s, AI agent launches within 5s
- **Edge:** If spawn fails, show error via `showError()`, remove tab, close pane

#### 2. Open Terminal Button → Create Terminal
- **Entry:** "Open Terminal" button in header (TerminalPage.tsx:655)
- **Flow:** Directly modifies layout → calls spawnTerminal → sets tab → registers terminal → saves session → dispatches terminal-created for system prompt/INITIALIZE.md/AI launch
- **UX:** Same as + button
- **Requires fix for Bug 4 (missing terminal-created dispatch)**

#### 3. New Session Dialog → Create Terminal
- **Entry:** "New Session" button in Sessions sidebar tab (TerminalPage.tsx:1327)
- **Flow:** Same as + button but with agent selection and session name
- **Additional:** Saves agent preference to localStorage, session name appears in tab

#### 4. Terminal Tabs
- **Data:** `terminalTabs` Record<string, { name, agent }> in TerminalPage
- **Flow:** Tab bar shows all active terminal IDs. Click to switch active terminal. Active terminal has green border. Close (X) kills PTY + removes pane + removes tab.
- **Edge:** Last tab close should not break UI (null state for no terminals)

#### 5. Close Terminal Tab
- **Entry:** X button on tab
- **Flow:** `closeTerminal(terminalId)` → save session to DB → kill PTY via `killTerminal` + `terminalAPI.destroy` → remove from tabs → dispatch `close-pane` event → TerminalLayout removes pane
- **Edge:** If PTY already dead, clean up state anyway

#### 6. Split Panes (Horizontal/Vertical)
- **Entry:** Hover controls on any pane (⊣ ⊢ ⊤ ⊥ buttons, TerminalWindow.tsx:460-497)
- **Flow:** `splitPane(parentId, direction)` → creates new PaneNode with new terminalId → updaates layout → spawns terminal for new pane
- **UX:** Left/Right splits horizontal (side by side). Top/Bottom splits vertical (stacked). New pane gets its own PTY.
- **Edge:** Split of a split gets nested deeper

#### 7. Close Pane
- **Entry:** ✕ button on pane hover controls
- **Flow:** `closePane(paneId)` → kills PTY via `terminalAPI.destroy` → removes pane from layout tree → reparents children if needed
- **Edge:** Last pane close → create empty root leaf

#### 8. Resize Panes
- **Current:** `SplitHandle` component (TerminalWindow.tsx:505) — visual handle exists but drag NOT implemented
- **Required:** Mouse drag on splitter to resize adjacent panes. Use flex-basis percentages updated on drag.
- **UX:** Cursor changes on hover (col-resize/row-resize), drag updates pane sizes in real-time

#### 9. Keyboard Input → PTY
- **Flow:** User types → xterm `onData` → `terminalAPI.write(terminalId, data)` → IPC `terminal:write` → `terminalManager.write(id, data)` → PTY stdin
- **Required:** Buffer keystrokes if spawn not yet complete (Bug 6 fix)
- **Required:** Handle special keys (Enter, Backspace, Ctrl+C, etc.) — xterm handles these natively, just ensure raw bytes are forwarded

### AI Integration (Features 10-14)

#### 10. PTY Output → xterm.js Display
- **Flow:** PTY stdout → main thread `onData` → `terminal:data` IPC → renderer `onTerminalData` listener → `terminal.write(data)` to xterm.js
- **Current:** Works when spawn succeeds, but has diagnostic timeout (5s "no data" message at line 95) that fires too aggressively for some shells
- **Fix:** Increase diagnostic timeout to 15s, or remove it entirely (proper spawning should handle this)

#### 11. AI Agent Auto-Start After Shell
- **Flow:** Shell starts → wait 1-2s → send `claude\n` or `opencode\n` to PTY → AI agent launches inside terminal
- **UX:** User opens terminal, sees shell prompt briefly, then AI agent CLI appears
- **Settings:** Agent type per session (Claude Code, OpenCode). System prompts are sent BEFORE the launch command.
- **Edge:** If `claude`/`opencode` not installed, the shell will show "command not found" — this is acceptable (user sees it in output)

#### 12. System Prompt Auto-Send
- **Storage:** `userPreferences.systemPrompts` — object with keys per agent type (claude, opencode, custom)
- **Settings UI:** Already exists in SettingsPage.tsx "System Prompts" tab
- **Flow:** On session start → read preference for the session's agent type → send content + newline to terminal via `terminalWrite` → wait 1s → send INITIALIZE.md → wait 1s → send launch command
- **Edge:** If no system prompt configured, skip

#### 13. INITIALIZE.md Auto-Send
- **Flow:** Read `INITIALIZE.md` from project root via `readProjectFile` IPC → send content + newline to terminal
- **Edge:** File might not exist — skip silently

#### 14. Session Resume
- **Flow:** User clicks Resume button on a saved session → fetch `resume_id` from DB → if no active terminal, create one → send `claude resume <resume_id>` or `opencode resume <resume_id>` to terminal
- **UX:** New terminal opens, AI agent starts and resumes the conversation

### Persistence (Features 15-17)

#### 15. Session Save/Load
- **Data:** `terminal_sessions` DB table
- **Save:** On terminal creation + on terminal close, call `saveTerminalSession` with id, projectId, agent, topic, workingDirectory
- **Load:** `SessionsTab` in sidebar calls `getTerminalSessions(projectId)` → displays list with agent, topic, date, cost
- **Delete:** X button calls `deleteTerminalSession(sessionId)` → refreshes list

#### 16. Terminal Messages Persistence
- **Data:** `terminal_messages` DB table
- **Save:** PTY output is persisted as `role: 'assistant'`. User input is persisted as `role: 'user'`. System prompts as `role: 'system'`
- **Current:** Both `terminal:create` and `spawn-terminal` handlers persist output. `write-terminal` persists user input. BUT `terminal:write` (the newer API used by TerminalPane.onData) does NOT persist — only `write-terminal` does.
- **Fix:** `terminal:write` handler should also persist to terminal_messages, or make the preload's terminalAPI.write call consistent with terminalWrite.

#### 17. Messages Viewer
- **Entry:** "View Messages" button on session items in Sessions tab
- **Flow:** `getSessionMessages(sessionId)` → modal displays messages with search/filter by role
- **Current:** Modal exists (TerminalPage.tsx:1347-1379). Search input for `messagesSearchQuery`. Messages styled by role (user=cyan, assistant=green, system=amber).
- **Bug:** Modal viewer works but can be very slow for large sessions (500+ messages). Add pagination or virtual scrolling.

### Layout (Features 18-19)

#### 18. Layout Persistence
- **Data:** `terminal_layouts` DB table. JSON `layout_data` contains the PaneNode tree.
- **Current:** `useTerminalLayout` loads on mount, saves on change (1s debounce). Works for pane structure but NOT for terminal state.
- **Required:** On layout load, iterate panes and spawn PTY for each. OR save terminal session IDs in the layout JSON and re-spawn from saved state.

#### 19. Layout Reset
- **Entry:** Reset button somewhere in UI (currently has `resetLayout` function but no button)
- **Flow:** Set layout to default single pane → close all PTYs → spawn new initial terminal

### Sidebar (Features 20-26)

All sidebar tabs appear when sidebar is open (resizable, 200-800px width).

#### 20. Presets Tab
- **Data:** `terminal_presets` DB table
- **Features:** List presets with name, command, category. Execute (runs command in active terminal). Add (name + command + category). Delete.
- **IPC:** `getTerminalPresets`, `addTerminalPreset`, `removeTerminalPreset`, `executeTerminalPreset`

#### 21. Sessions Tab
- **Data:** `terminal_sessions` DB table
- **Features:** List sessions with agent icon, topic, date, cost (if available). Resume button (feature 14). View Messages (feature 17). Delete.
- **IPC:** `getTerminalSessions`, `deleteTerminalSession`
- **New Session button:** Opens dialog (feature 3)

#### 22. Problems Tab
- **Data:** From `getProblems()` — problems associated with the project
- **Features:** List all problems. Bind selected problem to active terminal (dropdown). Shows active binding status.
- **IPC:** `getProblems`, `updateProblemStatus`, `assignProblemToTerminal`, `getTerminalBinding`

#### 23. Files Tab
- **Data:** Project file system via `listProjectFiles` / `readProjectFile` IPC
- **Features:** Tree view of project files. Click to read file content. Search within files.
- **IPC:** `listProjectFiles`, `readProjectFile`

#### 24. Requests Tab
- **Data:** From `getRequests()` — feature requests for the project
- **Features:** List requests with status, priority. Create new request (title, description, priority, category). Link problem to request.
- **IPC:** `getRequests`, `createRequest`, `updateRequestStatus`, `linkProblemToRequest`

#### 25. Terminals Tab
- **Data:** From `getTerminalBindings()` — terminal ↔ problem associations
- **Features:** List all active terminals with their binding status, agent type, project. Shows which terminal has which problem.

#### 26. Analytics Tab
- **Data:** From `getAIUsageSummary(period)` — AI usage stats
- **Features:** Total tokens used, total cost, breakdown by tool. Period selector (day/week/month).
- **IPC:** `getAIUsageSummary`

### Utility Features (Features 27-28)

#### 27. Send Instructions to Terminal
- **Entry:** Instruction input bar below terminal. Textarea + Send button + Save button.
- **Flow:** Type instruction → click Send → `sendInstructionsToTerminal({ terminalId, instructions })` → writes instruction to PTY via `terminalWrite`
- **UX:** Send button disabled when no active terminal. Save button saves checkpoint (creates session save point).

#### 28. Save Checkpoint
- **Entry:** 💾 Save button next to Send
- **Flow:** Saves current terminal session state to DB (tokens, cost snapshot). Primarily for health tracking.

---

## Engineering Specs

### Data Flow: Terminal Lifecycle

```
User clicks + button
  → Tab created (TerminalPage: setTerminalTabs)
  → Create-terminal event dispatched
  → TerminalLayout event handler:
      → Creates PaneNode with new terminalId
      → Adds to layout (setLayout)
      → Adds terminalId to spawnedTerminalsRef  // PREVENTS DOUBLE SPAWN
      → Calls spawnTerminal(terminalId, cwd)     // ASYNC
  → Layout re-renders with new pane
  → TerminalPane mounts:
      → Creates xterm.js instance
      → Calls onTerminalReady
      → handleTerminalReady:
          → Checks spawnedTerminalsRef — FOUND → SKIP spawn
          → Calls terminal.write("Starting shell...\r\n")
  → Main thread: spawn-terminal IPC handler:
      → terminalManager.spawn(id, cwd, cols, rows)
      → PTY process created
      → getDataHandler: onData → terminal:data IPC
      → getExitHandler: onExit → terminal:exit IPC
  → TerminalLayout dispatches terminal-created event
  → TerminalPage event handler:
      → registerTerminal(terminalId)
      → saveTerminalSession(id, projectId, agent, topic, cwd)
      → setTimeout(1500ms):
          → Send system prompt (if configured)
          → Send INITIALIZE.md (if exists)
          → Send AI launch command (claude/opencode)
  → PTY output flows: PTY → onData → terminal:data IPC → renderer onTerminalData → xterm.write()
  → User keyboard: xterm onData → terminalAPI.write → terminal:write IPC → terminalManager.write → PTY stdin
```

### Data Flow: Layout Persistence

```
Load:
  1. useTerminalLayout.loadLayout()
  2. DB query: SELECT * FROM terminal_layouts WHERE project_id = ?
  3. Parse JSON layout_data → PaneNode tree
  4. Set layout state → triggers re-render
  5. Iterate all leaf nodes in PaneNode tree
  6. For each: call spawnTerminal(terminalId, projectCwd)
  7. Connect xterm.js instances to spawned PTYs

Save:
  1. User interaction changes layout
  2. setLayout(newLayout) called
  3. Debounced (1s) save:
      → JSON.stringify(layoutData)
      → UPSERT into terminal_layouts
```

### UX States Per Pane

Each `TerminalPane` goes through these states:
1. **Loading**: "Starting shell..." written to xterm.js
2. **Spawning**: PTY being created (async)
3. **Connected**: Shell prompt visible, keyboard active
4. **Launching**: AI agent command being sent (system prompt → INITIALIZE.md → launch command)
5. **Running**: AI agent CLI is active in the terminal
6. **Error**: Error message shown in xterm, retry button available
7. **Exited**: Shell process ended, "Process exited with code N" shown

### IPC Handler Consolidation

Current state has TWO overlapping sets of IPC handlers:
- **NEW API**: `terminal:create`, `terminal:write`, `terminal:resize`, `terminal:destroy`, `terminal:data`
- **LEGACY API**: `spawn-terminal`, `write-terminal`, `resize-terminal`, `kill-terminal`, `terminal-exit`

**Required:** Consolidate to ONE API set. The `terminal:create`/`terminal:write`/`terminal:resize`/`terminal:destroy`/`terminal:data`/`terminal:exit` naming is cleaner. Either:
- A) Remove legacy handlers and update preload + TerminalPage to use new API only
- B) Keep both but ensure they share the same terminalManager Map (currently they do)

---

## Implementation Order

### Phase 1 — Core Fixes (no new features)
1. Fix Bug 1 (double spawn) — 1 line change in TerminalWindow.tsx
2. Fix Bug 2 (two layout instances) — Refactor to single source of truth
3. Fix Bug 3 (AI auto-start) — Add launch command after system prompt
4. Fix Bug 4 (Open Terminal missing event) — Add dispatch
5. Fix Bug 5 (layout persistence re-spawn) — Iterate panes on load
6. Fix Bug 6 (keyboard race) — Buffer writes before spawn

### Phase 2 — AI Integration
7. System prompt + INITIALIZE.md + AI launch sequence
8. Session resume with terminal creation
9. Auto-start agent with correct resume flag

### Phase 3 — Persistence
10. Terminal messages viewer optimization
11. Layout persistence with PTY re-spawn
12. Session save/load with full state restoration

### Phase 4 — Polish
13. Split pane drag resize
14. Error states and recovery ("Retry" button on failed spawn)
15. Performance: virtual scroll for messages viewer
16. Terminal tab reordering (if feasible)

---

## Constraints

- Do NOT change package.json dependencies (no new npm packages)
- Do NOT change IPC channel names (must match preload.ts contract)
- Must work on Windows (PowerShell via `process.env.COMSPEC`)
- Must build cleanly: `npm run build` (Vite + electron tsc)
- Must NOT break existing dashboard/external page/settings features
- Keep changes surgical — prefer fixing existing code over rewriting entire files
- Match existing code style (TypeScript, React functional components, Tailwind v4 classes)
- Remove no-longer-used IPC handlers or functions when legacy code is consolidated

---

## Verification

After implementation, verify:
1. ✅ + button creates terminal → shell prompt visible → AI agent auto-launches
2. ✅ Open Terminal button creates terminal → same result
3. ✅ New Session dialog creates terminal with correct agent
4. ✅ Tab switching works (click tab → green border on active pane)
5. ✅ Close tab kills PTY and removes pane
6. ✅ Split pane creates new PTY instance (both halves work independently)
7. ✅ Keyboard input reaches PTY (type `echo hello` → output shows)
8. ✅ PTY output displays in xterm.js
9. ✅ Ctrl+C, Tab, arrow keys work (raw bytes forwarded)
10. ✅ System prompt sent before AI launch
11. ✅ INITIALIZE.md sent before AI launch  
12. ✅ AI agent appears inside terminal
13. ✅ Session saved to DB on creation
14. ✅ Session resume re-launches agent with resume flag
15. ✅ Layout with multiple panes survives page reload
16. ✅ Console has no errors (especially no "Terminal not found" on write)
17. ✅ Build passes
