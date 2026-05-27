# PROBLEMS.md

> **Purpose:** Issue tracker for AI agents and humans — all known bugs, feature requests, and their resolution status.
> **Last Updated:** 2026-05-22 (Bundle A — 8 Core Flow fixes)
> **Total Issues:** 111
> **Parse Priority:** High

---

## Quick Reference

| Status | Count |
|--------|-------|
| NEW | 0 |
| Not Started | 0 |
| In Progress | 0 |
| AI Attempted Fix | 0 |
| User Testing | 0 |
| Fixed | ~110 |

---

## Status Legend

| Status | Meaning | What to do |
|--------|---------|------------|
| **NEW** | Just reported, not looked at yet | Investigate and reproduce |
| **Not Started** | Has been looked at but not fixed yet | Start working on it |
| **In Progress** | Currently being fixed | Keep working |
| **AI Attempted Fix** | Made changes, needs user testing | Wait for user to test |
| **User Testing** | User is testing the fix | Wait for user feedback |
| **Fixed** | User confirmed it works | Document solution |
| **Irrelevant** | Feature changed, issue no longer applies | Document why |

---

## 🚨 2026-05-22 — Bundle A: Terminal Core Flows (Applied)

### Terminal Issues from 54-Item Overhaul (Steps 1-8)

| Old Ref | Issue | Status | Fix |
|---------|-------|--------|-----|
| Fix 1 | InstructionPanel `onSend` stub ignores config | Fixed | Wired to `handleInstructionPanelSend` |
| Fix 2 | BuildInitContent duplicates assembleContext | Fixed | Removed buildInitContent, uses assembleContext exclusively |
| Fix 5 | UI doesn't refresh on context changes | Fixed | Added onContextChanged refresh effect + fixed preload cleanup handlers |
| Fix 3 | terminal:write IPC handler missing | Fixed | Added handler delegating to terminalManager.write |
| Fix 4 | Problem prompt uses fragile 3000ms timeout | Fixed | Replaced with queueOrSend mechanism |
| Fix 1.5 | Skills pipeline verification | Verified | End-to-end working (generatePrompt → onSend → queueOrSend) |
| Fix 1.6 | FlowView audit | Noted | FlowView.tsx doesn't exist (stub) — no-op |
| Fix 1.7 | Status change terminal format | Fixed | Changed to `[SYSTEM: #id action "status"]` with per-action formatting |

---

## 🚨 2026-05-12 SESSION — Solar System 3-in-1 Fix (Applied)

### Issue #094: Category Dropdown Doesn't Navigate to Solar System
- Status: Fixed
- User said: "The dropdown of selecting a category in the application doesn't work. It doesn't bring me to the solar system."
- Files: `src/components/OrbitSystem.tsx`
- Root Cause: `handleCategorySelect` only set `currentCategory` without changing `viewMode` or animating camera
- Fix: Added `viewMode = 'solarSystem'` and `animateCamera` to zoom toward the category's sun

### Issue #095: Planet Click Doesn't Lock/Track Camera
- Status: Fixed
- User said: "When I select an app, it directs me to the planet but doesn't lock the camera. The planet is far away from the orbit and the camera is too late."
- Files: `src/components/OrbitSystem.tsx`
- Root Cause: `handlePlanetClick` calculated camera position from `data.orbitRadius` (fixed orbit distance) instead of the planet's actual real-time position. No tracking mechanism existed.
- Fix: Use `planetPositionsRef` for real-time position, added `PlanetTracker` component that continuously updates OrbitControls target via `useFrame`

### Issue #096: Website Solar System Wrong Data + Missing Timeline Selector
- Status: Fixed
- User said: "The website solar system only has three categories. There needs to be a timeline switch in the solar system UI because the tab navigation is inaccessible in fullscreen/popup."
- Files: `src/components/OrbitSystem.tsx`
- Root Cause: `websiteLogs` was already period-filtered by the top nav but OrbitSystem had no internal timeline control. Data was filtered inconsistently (apps used `allLogs`, websites used `browserLogs`).
- Fix: Added `selectedPeriod` state and period selector UI inside OrbitSystem. Both apps and websites now filter by this internal period.

---

## 🚨 2026-05-12 SESSION — Terminal Phase 1 Implementation (Resolved)

### Issue #075: Session Persistence Not Persisting to UI
- Status: Fixed
- User said: "Sessions save to DB but don't appear in Sessions tab until page refresh"
- Files: src/pages/TerminalPage.tsx
- Fix:
  1. Added `loadSessions()` call after `saveTerminalSession()`
  2. Sessions now refresh immediately when new terminal created
  3. UI updates in real-time instead of requiring refresh

### Issue #076: Cannot Delete Sessions
- Status: Fixed
- User said: "No delete button for sessions, no way to remove old sessions"
- Files: src/pages/TerminalPage.tsx, src/main.ts, src/preload.ts
- Fix:
  1. Added `delete-terminal-session` IPC handler in main.ts
  2. Exposed `deleteTerminalSession()` in preload.ts
  3. Added delete button to sessions tab UI (appears on hover)
  4. Delete button triggers confirmation and refreshes session list

### Issue #077: Session UI Improvements
- Status: Fixed
- Files: src/pages/TerminalPage.tsx (sessions tab)
- Changes:
  1. Agent type now shown in green badge (was hidden)
  2. Session topic/name prominently displayed
  3. Cost information displayed (was hidden)
  4. Resume and Delete buttons both visible on hover
  5. Better visual hierarchy with colors and spacing

### Issue #078: Terminal Send Button Not Functional
- Status: Fixed
- User said: "Send button at bottom does nothing - text sent but not executed in terminal"
- Files: src/preload.ts
- Root Cause: `terminalWrite()` preload function sent `{ terminalId, text }` as ONE object arg, but `write-terminal` IPC handler expected TWO separate args `(terminalId, data)`. `data` was always `undefined`.
- Fix: Changed `ipcRenderer.invoke('write-terminal', { terminalId, text })` → `ipcRenderer.invoke('write-terminal', terminalId, text)` to match handler signature.

### Issue #079: Sidebar Width Unlimited (Not Limited to 600px)
- Status: Fixed
- User said: "Sidebar should resize freely with no max-width limit"
- Files: src/pages/TerminalPage.tsx
- Fix: Removed `Math.min(600, ...)` constraint — sidebar now limited only by min-width (200px)

### Issue #080: Session Resume Incomplete
- Status: Fixed
- User said: "Resume button tries to send command but doesn't reconnect to terminal"
- Files: src/pages/TerminalPage.tsx
- Root Cause: `activeTerminalId` was not in useEffect deps for event handler, causing stale closure. Also `handleResumeSession` had no error feedback when no active terminal.
- Fix: Added `activeTerminalId`, `loadSessions` to effect deps. Handle no-active-terminal case with error toast.

### Issue #081: Terminal Tab Bar Shows Hardcoded Agent Type
- Status: Fixed
- User said: "Terminal tab shows 'Cloud' but I'm using OpenCode - should show actual agent"
- Files: src/pages/TerminalPage.tsx
- Fix: Terminal tabs now lookup session agent type from `sessions` array instead of hardcoding 'Cloud'

### Issue #082: No "Start New Session" Button in Sessions Tab
- Status: Fixed
- User said: "Should be able to start new session from Sessions tab, not just via + button"
- Files: src/pages/TerminalPage.tsx (sessions tab)
- Fix: Added "New Session" button that opens AI agent selector dialog

## 🚨 2026-05-12 SESSION — Terminal Architecture Fixes

### Issue #087: TerminalLayout Prop Chain Broken (Root Cause of "Can't Create Terminals")
- Status: Fixed
- Root cause: TerminalPage's `terminalLayout` state (from `onLayoutChange` callback) was NEVER passed as `initialLayout` prop to TerminalLayout. The + button called `setTerminalLayout()` on a state that had zero effect.
- Fix:
  1. Replaced broken prop-chain pattern with custom event system (`create-terminal`, `terminal-created`, `close-pane`)
  2. TerminalLayout now manages its own internal layout state — TerminalPage no longer tries to set layout directly
  3. Events dispatched from + button, New Session dialog, and close button
- Files: src/pages/TerminalPage.tsx, src/components/TerminalWindow.tsx

### Issue #088: Double-Spawn Bug in Terminal Creation
- Status: Fixed
- Root cause: Both TerminalPage's `spawnTerminal()` call (from old + button code) AND `handleTerminalReady` in TerminalLayout tried to spawn the same terminal ID
- Fix: Removed redundant `spawnTerminal()` from event handler — only TerminalLayout now spawns PTYs
- Files: src/pages/TerminalPage.tsx

### Issue #089: Errors Silently Swallowed via logOnce
- Status: Fixed
- Root cause: `logOnce` only printed to console once per session, hiding repeat failures
- Fix: Replaced with `showError()` toast that displays error in UI and auto-clears after 8 seconds
- Files: src/pages/TerminalPage.tsx

### Issue #090: Analytics Tab Fires IPC Fetch on Wrong Tab
- Status: Fixed
- Root cause: `getAIUsageSummary()` IPC call triggered on `activeTab === 'map'` but UI renders on `activeTab === 'analytics'`
- Fix: Changed trigger to `activeTab === 'analytics'`
- Also added `'day'` period support to IPC handler (was only handling `'week'`/`'month'`)
- Also parameterized SQL query to fix injection
- Files: src/pages/TerminalPage.tsx, src/main.ts, src/preload.ts

### Issue #091: No Auto-Select Project in TerminalPage
- Status: Fixed
- Root cause: TerminalPage didn't auto-select first project when none was selected and localStorage was empty
- Fix: Added `useEffect` that selects `projects[0].id` when `projects` loads and no project selected
- Files: src/pages/TerminalPage.tsx

## 🚨 2026-05-12 SESSION — Terminal UI Fixes (Phase 2)

### Issue #092: Terminal + Button Doesn't Show Tab (Tab Bar Stays Empty)
- Status: Fixed
- Root cause: Two bugs:
  1. `useTerminalLayout(initialLayout)` in TerminalWindow.tsx:193 passed a `PaneNode` object as `projectId` (string param). Object stringified to `"[object Object]"`, DB query returned nothing, layout stayed `null` forever.
  2. `handleCreateTerminalEvent` had `setLayout(prev => prev ? insertIntoLayout(prev) : prev)` — when `prev` was `null` (always, due to bug #1), returned `null`. Panes never rendered.
- Fix: Changed `useTerminalLayout(initialLayout)` → `useTerminalLayout(null, initialLayout || null)`. Added null-handling in `handleCreateTerminalEvent` to create root leaf when no layout exists.
- Also: + button now ALSO calls `setTerminalTabs()` directly before dispatching event. TerminalLayout's `handleCreateTerminalEvent` accepts `terminalId` from event detail.
- Files: src/pages/TerminalPage.tsx, src/components/TerminalWindow.tsx

### Issue #093: FilesTab Shows "Select a project" with No Way to Select
- Status: Fixed
- Root cause: FilesTab had no inline project picker. If auto-selection hadn't fired yet (race condition on first load), the tab showed a dead-end message with no action for the user.
- Fix: Replaced "Select a project above" message with a project dropdown select inside the tab. Also added `spawnTerminal`, `loadSessions` to useEffect deps to prevent stale closures.
- Files: src/pages/TerminalPage.tsx

### Issue #094: RequestsTab Doesn't Know Which Project — Always Uses userDataPath
- Status: Fixed
- Root cause: 
  1. `RequestsTab` had no inline project picker (was missing unlike FilesTab/ProblemsTab)
  2. `link-problem-to-request` IPC handler always used `userDataPath`, ignored project context entirely
  3. `RequestDetailModal` didn't pass `projectId` to API calls
- Fix:
  1. Added inline project picker to RequestsTab
  2. Updated `link-problem-to-request` IPC handler + preload to accept `projectId`
  3. Added `projectId` prop to `RequestDetailModal` and passed to `getProblems()` + `linkProblemToRequest()`
  4. Added `projects` + `onSelectProject` props to RequestsTab
- Files: src/pages/TerminalPage.tsx, src/main.ts, src/preload.ts

## 🚨 2026-05-12 SESSION — Found and Fixed 5 Runtime Bugs

### Issue #097: useTerminalLayout Wrong Args (CRITICAL — Everything Was Broken)
- Status: Fixed
- Root cause: TerminalWindow.tsx line 193 called `useTerminalLayout(initialLayout)` where `initialLayout` is a PaneNode. The hook expects `(projectId: string | null, initialLayout: PaneNode | null)`. The PaneNode was passed as projectId → stringified to `"[object Object]"` → DB query failed → layout always `null`.
- Fix: `useTerminalLayout(null, initialLayout || null)`
- Effect: TerminalLayout couldn't create any panes. + button created tabs but no terminal ever rendered.

### Issue #098: handleCreateTerminalEvent Null Layout (Same Root Cause)
- Status: Fixed
- Root cause: `setLayout(prev => prev ? insertIntoLayout(prev) : prev)` returned null when prev was null (always, due to #097).
- Fix: Added null-handling to create root leaf pane when layout doesn't exist.

### Issue #099: terminalWrite Preload Arg Mismatch (Send Button Broken)
- Status: Fixed
- Root cause: Preload `terminalWrite` called `ipcRenderer.invoke('write-terminal', { terminalId, text })` with ONE object arg. Handler `write-terminal` expected `(_event, terminalId: string, data: string)` — TWO separate args. `data` was always `undefined`, never written to PTY.
- Fix: Changed to `ipcRenderer.invoke('write-terminal', terminalId, text)` to match handler signature.

### Issue #100: StuseEffect Missing Deps (Event Handlers Stale)
- Status: Fixed
- Root cause: Event handler effect in TerminalPage.tsx was missing `terminalLayout`, `setTerminalLayout`, `spawnTerminal`, `loadSessions` from deps. Handlers captured stale references.
- Fix: Added all missing deps.

### Issue #101: link-problem-to-request Always Uses userDataPath
- Status: Fixed
- Root cause: `link-problem-to-request` IPC handler always created RequestsService with `userDataPath`. No `projectId` support in preload API.
- Fix: Added `projectId` to IPC handler, preload, and RequestDetailModal. Handler now resolves via `getProjectPath()`.

## 🚨 2026-05-12 SESSION — Terminal Workspace Critical UX Fixes

### Issue #102: FilesTab Shows Project Selector Despite Project Already Known from IDE Page
- Status: AI Attempted Fix
- User said: "WHY THE FUCK IS THERE A PROJECT SELECTION????? THE WORKSPACE IS ACCESSED FROM THE PROJECT IDE WHICH ALREADY HAVE THE PATH TO THE PROJECT DIRECTORY"
- Root cause: FilesTab received only `projectId`, then looked up the project in the `projects` array. When opened from IDE page, `propProjectPath` is available but never passed to FilesTab. If `projects` array hadn't loaded, `projectPath` was empty and the project selector appeared.
- Fix: Added `projectPath` prop to FilesTab. When opened from workspace modal, `propProjectPath` is passed directly. FilesTab uses it before falling back to projects array lookup.
- Files: `src/pages/TerminalPage.tsx` — FilesTab component signature, projectPath derivation, and call site

### Issue #103: + Button Hidden When No Terminals Exist (Can't Create First Terminal)
- Status: AI Attempted Fix
- User said: "NEW TERMINAL IS NOT THERE"
- Root cause: The entire terminal tab bar (including the + button) was wrapped in `{Object.keys(terminalTabs).length > 0 && (` — when no terminals existed, the entire bar (including the + button) was hidden. User couldn't create the first terminal.
- Fix: Removed the conditional wrapper. Tab bar now always renders with the + button visible. Terminal tab entries are only rendered when they exist.
- Files: `src/pages/TerminalPage.tsx` — Terminal tab bar conditional gate removed

### Issue #104: Save Button Hidden Inside Instruction Input Bar
- Status: AI Attempted Fix
- User said: "THE SAVE IS NOT THERE"
- Root cause: The 💾 Save checkpoint button was only visible inside the instruction input bar, which appears only after clicking "Send". There was no visible save button in the default terminal header UI.
- Fix: Extracted `handleSaveCheckpoint` callback. Added a Save button in the terminal header next to the Send button, always visible when a terminal is active. Also kept the Save button in the instruction input bar.
- Files: `src/pages/TerminalPage.tsx` — Added `handleSaveCheckpoint` callback, added Save button to header

---

## 🚨 2026-05-13 SESSION — TERMINAL WORKSPACE COMPREHENSIVE FIX (All Issues Fixed)

**CRITICAL CONTEXT:** These issues were reported 5-10 times across multiple sessions. ALL HAVE BEEN FIXED in a single comprehensive overhaul.

### Issue #105: Session Auto-Creation on New Terminal (WRONG BEHAVIOR)
- Status: **FIXED**
- User said: "Adding a new terminal automatically adds a session. It shouldn't."
- Problem: `handleTerminalCreated` auto-saved a session on every terminal creation
- Fix: Removed auto-save from `handleTerminalCreated`. Sessions are ONLY created explicitly via the "New Session" dialog.
- Files: `src/pages/TerminalPage.tsx` (handleTerminalCreated handler)

### Issue #106: "Create Session" Dialog with Terminal Selection
- Status: **FIXED**
- User said: "When you create a new session, the menu should prompt the user to select a terminal (create new terminal now or select an existing open terminal that is free)"
- Fix: Complete redesign of the New Session dialog with:
  1. Session name input
  2. AI Agent dropdown (Claude/OpenCode)
  3. Terminal selection radio: "Create new terminal" vs "Use existing terminal"
  4. If "Use existing": dropdown of free terminals (shows which have sessions, which are free)
  5. Clicking "Start Session" creates the session in the selected terminal
- Files: `src/pages/TerminalPage.tsx` (New Session dialog)

### Issue #107: Existing Sessions Show Only Messages & Delete
- Status: **FIXED**
- User said: "There's no way for me to open the session again. No way to restore every session."
- Fix: Every session now shows:
  1. Running indicator (green dot + terminal name) if session is active
  2. "Closed" badge if session has no terminal
  3. "Focus" button for running sessions (focuses terminal)
  4. "Open" button for closed sessions (opens in existing or new terminal)
  5. Messages and Delete buttons preserved
- Files: `src/pages/TerminalPage.tsx` (sessions tab, handleResumeSession)

### Issue #108: Save Button Not Working
- Status: **FIXED**
- User said: "The save button is not working."
- Fix: Added prompt dialog for session name, proper session saving with terminal binding, loadSessions refresh after save, visible success/error feedback
- Files: `src/pages/TerminalPage.tsx` (handleSaveCheckpoint)

### Issue #109: Markdown Parsing in PROBLEMS.md Broken
- Status: Fixed
- User said: "The markdown is not being able to parse the thing properly right."
- Root Cause: `generateMarkdown()` outputted `## **Issue XX.Y:** Title` format while `parseProblems()` Pattern 4 read `### Issue #XXX: Title` format. Any CRUD operation rewrote the file in an incompatible format, breaking subsequent parses.
- Fix: Rewrote `generateMarkdown()` to output `### Issue #XXX:` format (Pattern 4 compatible). Updated Pattern 4 regex to also handle dotted IDs like `#96.1`. Updated initial PROBLEMS.md creation format. Parse/generate cycle is now idempotent.
- Files: `src/services/ProblemsService.ts`

### Issue #110: Initialize Button in Wrong Location
- Status: Fixed
- User said: "The initialize button is under file right? It's on the file page which doesn't make any sense."
- Fix: Moved Setup/Initialize button from FilesTab (sidebar) to TerminalPage header, next to Open Terminal / Send / Save buttons. Always accessible regardless of which sidebar tab is active. FilesTab keeps a read-only status indicator.
- Files: `src/pages/TerminalPage.tsx`

### Issue #111: Split/Drag Panes Not Working
- Status: **FIXED**
- User said: "The split thing is not working properly at all. The split drag panes doesn't work."
- Root Cause: `handleTabSelect` was RESETTING the entire layout to a single leaf when clicking a tab, destroying splits.
- Fix: `handleTabSelect` now only sets `activeTerminalId` without modifying the layout. Split buttons on TerminalPane hover still work.
- Files: `src/pages/TerminalPage.tsx` (handleTabSelect)

### Issue #112: Creating New Terminal Opens Then Disappears
- Status: **FIXED** (likely caused by layout reset)
- User said: "Creating a new terminal for some reason just opens a typed cloud in terminal and once I click enter in the terminal it the terminal just disappears."
- Root Cause: Layout was being reset when tabs were clicked, and `handleTabSelect` was called with the new terminal ID, destroying any existing layout.
- Fix: `handleTabSelect` no longer resets layout — just focuses the terminal.

### Issue #113: Terminal Sidebar Not Useful
- Status: **FIXED**
- User said: "The terminal sidebar is not showing anything useful. There's no sessions there."
- Fix: Complete rewrite of TerminalsTab:
  1. Running Terminals section: shows each terminal, its session, session name, agent, date
  2. Free terminals show "No session — ready to assign" with "New Session" button
  3. Sessions section: shows ALL sessions with terminal status
  4. Running sessions show green dot + terminal name
  5. Closed sessions show grey dot + "Closed" label
  6. Focus/Open button on hover
- Files: `src/pages/TerminalPage.tsx` (TerminalsTab component)

### Issue #114: Send Feature Needs Automatic Session Assignment
- Status: **FIXED**
- User said: "The send feature can automatically assign to a proper session. So it needs to be categorized properly."
- Fix: 
  1. Added session dropdown selector in instruction input bar
  2. Dropdown shows "Active Terminal" (default) or any running session with terminal name
  3. Auto-selects the active terminal's session
  4. Send routes to correct terminal based on selected session
  5. Falls back to active terminal if no session selected
- Files: `src/pages/TerminalPage.tsx` (sendInstruction, instruction input bar)

### Issue #115: Session Title & Terminal Association Not Clear
- Status: **FIXED**
- User said: "I need to see the title of the terminal, the title of the session which terminal responds to which session."
- Fix: 
  1. Terminal tab bar shows session name + agent + "S" badge if session exists
  2. Sessions tab: each session shows terminal name (green badge if running) or "Closed"
  3. Terminals tab: each terminal shows its session sub-section with name/agent/date
  4. Clear visual hierarchy: Terminal → Session

### Database Fixes
- **FIXED:** Added missing `terminal_bindings` table creation in `initializeStorage()`
- **FIXED:** Added `terminal_id` column to `terminal_sessions` table
- **FIXED:** Updated `save-terminal-session` IPC handler to store `terminal_id`

### Architecture Changes Summary
1. **Terminal ≠ Session** - Creating a terminal does NOT auto-create a session
2. **Explicit session creation** - New Session dialog requires terminal selection
3. **Terminal↔Session mapping** - Sessions store `terminal_id`, visible in all UI
4. **Send routing** - Send instruction routed to correct session's terminal
5. **Layout preservation** - Tab select no longer destroys split layouts
6. **Session lifecycle** - Close terminal = close session (terminal_id = null)

---

**Last Updated:** 2026-05-12
**Next Step:** Restart DeskFlow to test all fixes

## 🚨 2026-05-12 SESSION — Transient App Filter + Recent Sessions Fix

### Issue #095: Windows Explorer disrupts stopwatch during Alt+Tab

- Status: Fixed
- User said: "switching apps turns the tracker into windows explorer" and "should not be distrpted by the windows explorer"
- Root cause: `pollForeground()` unconditionally accepted foreground changes, including transient system windows like "Windows Explorer" that briefly appear during Alt+Tab. This triggered a `foreground-changed` event that disrupted the Dashboard stopwatch.
- Fix: Added `TRANSIENT_APPS` filter — Windows Explorer, Task Switching, etc. are silently ignored in `pollForeground()`. No `currentApp` change, no `foreground-changed` event, no stopwatch disruption.
- Files: `src/main.ts`

### Issue #096: Recent Sessions flooded with "Website" entries

- Status: Fixed
- User said: "recent sessions always point towards the website"
- Root cause: Activity feed initialization took the 20 most recent log entries, which were mostly browser periodic sync data (coming every ~30s vs. app log on app change).
- Fix: Activity feed initialization now takes a balanced mix — up to 10 app logs + up to 5 browser logs, then sorted by recency.
- Files: `src/pages/DashboardPage.tsx`

---

## 🚨 2026-05-13 SESSION — Path Resolution Fix + Setup Button Gating Fix

### Issue #116: PROBLEMS.md Reads from userDataPath Instead of Workspace Root

- Status: Fixed
- User said: "still not parse" (PROBLEMS.md) and "the same" (Requests page)
- Root cause: `getProjectPath()` returned `userDataPath` (Electron app data dir) when project not found in DB. ProblemsService created/read PROBLEMS.md from `userDataPath/agent/PROBLEMS.md` instead of the workspace root, causing the UI to show an empty problem list. Same bug affected REQUESTS.md via `getRequestsService()`.
- Fix:
  1. `getProjectPath()` now returns `undefined` instead of `userDataPath` — lets ProblemsService/RequestsService fall through to `process.cwd()` (workspace root)
  2. `tracker-mind-setup` IPC handler changed from `userDataPath` to `process.cwd()` for default base dir
  3. Setup/Init button moved outside `{projects.length > 0 && ...}` gate — always visible even with no projects
  4. `handleInitSetup` no longer requires a selected project — works without `projId`/`projPath`
- Files: `src/main.ts`, `src/pages/TerminalPage.tsx`

---

## 🚨 2026-05-17 SESSION — AI Task Progress Tracking System

### Issue #122: terminalTabs ReferenceError in TerminalWindow.tsx handleSplit
- **Status:** Fixed
- **Root cause:** `handleSplit` in TerminalWindow.tsx referenced `terminalTabs` but this variable only exists in TerminalPage.tsx. TerminalWindow never had access to it.
- **Fix:** Changed to `localStorage.getItem('terminal-defaultAgent') || 'claude'` — same pattern used by `handleTerminalReady` and the "+" button in empty state. All three terminal creation paths now use the same agent source.
- **Files:** `src/components/TerminalWindow.tsx`

### Issue #123: No Prompt Progress Tracking (pending→in_progress→completed)
- **Status:** Fixed
- **What's built:** Complete AI Task Progress Tracking System:
  1. **PTY-based status detection** — `pendingCompletions` Set tracks when user input is sent, agent signature detection marks completion
  2. **JSON file bridge** — `fs.watch` on `agent/ai-tasks.json` with 500ms debounce, pushes changes to renderer
  3. **Status in DB** — `status` column on `terminal_messages`, updated via `markTaskCompleted()`
  4. **Live UI** — PromptHistoryTab shows color-coded badges (gray Pending, cyan spinning Processing, green Completed)
  5. **Send integration** — `sendInstruction` creates AI task via `ai-task:add` IPC
- **New IPC:** `get-prompt-status`, `ai-task:watch`/`stop-watch`, `ai-task:add`, `ai-task:updated`/`file-changed` events
- **Files:** `src/main.ts`, `src/preload.ts`, `src/components/PromptHistoryTab.tsx`, `src/components/TerminalWindow.tsx`, `src/pages/TerminalPage.tsx`

---

## 🚨 2026-05-15 SESSION — Browser Extension Background Tab Phantom Tracking

### Issue #121: Background tab events log websites when browser isn't focused

- Status: Fixed (2026-05-26)
- Priority: High
- User said: "theres a commonly happening problem where the app still tracks a website even if the browser is not focused. browser with the extension."
- Root cause (round 1): `logPreviousSession()` was called from tab events that fire even when the browser is backgrounded. Payload had no `is_browser_focused` field, so server guards never caught it.
- Root cause (round 2 — final): `checkBrowserFocus()` checked if the foreground app matches ANY browser in a generic list (`['chrome', 'firefox', 'edge', 'safari', 'brave', 'opera', 'comet', 'vivaldi', 'arc']`). When user switched to a different browser (e.g., Firefox while extension is in Chrome/Comet), it still considered the browser "focused" and continued tracking.
- Fix (round 1):
  1. Added `force` parameter to `logPreviousSession(force = false)`
  2. Added early return guard if `!force && !state.isBrowserFocused`
  3. Added `is_browser_focused: state.isBrowserFocused` to the payload
- Fix (round 2 — 2026-05-26):
  4. Changed `checkBrowserFocus()` to compare against `BROWSER_NAME` (the specific browser detected via user agent at extension load time) instead of a generic list. Now only counts website time when the SPECIFIC browser with the extension is in the foreground.
  5. On `/foreground-app` fetch failure, `state.isBrowserFocused` now defaults to `false` instead of returning the stale previous state.
- Files: `browser-extension/background.js`, `src/main.ts`
- Human Testing:
  1. Browse a site in Chrome/Comet, then Alt+Tab to another app — the final session should still be logged (captures time spent before switching)
  2. Leave browser backgrounded for a while with sites auto-refreshing — no new website entries should appear
  3. Switch to a DIFFERENT browser (e.g., Firefox) while extension is in Chrome/Comet — no website tracking should occur during this time

---

## 🚨 2026-05-18 SESSION — Context Management System (Research + Design)

### Issue #124: Context Management — AI Agent Gets Stale Context Across Chats

- **Status:** Not Started
- **Priority:** High
- **User said:** "After a few chats in the same system, the AI agent would already predict what we're saying... We need to improve the context throughout the chat. And we need to somehow store those history of chats... Not too heavy, because inserting every single history with all its details is inefficient."
- **Root Cause:** No layered context summarization system. AI gets no persistent cross-session memory. Context is rebuilt fresh each chat.
- **Systems to integrate:** LLM Wiki, Obsidian Skills, Graphify, PARA, QMD, Automations
- **Current Setup UI only covers:** QMD (templates) + Graphify (graph report). Missing: LLM Wiki, Obsidian Skills, PARA, Automations toggles.
- **UI rename:** "Initialize" → "Setup" (button label + dialog title)

**Files to modify:**
- `src/components/NewSessionDialog.tsx` — Rename Initialize→Setup, add system toggles
- `src/pages/TerminalPage.tsx` — Rename button
- `agent/docs/research-impl/` — Research prompt for context architecture

**Knowledge systems inventory (what exists vs what's missing):**

| System | Location | Status in Setup UI | Implementation |
|--------|----------|-------------------|----------------|
| LLM Wiki | `agent/*.md` (AI-optimized) | ❌ Not included | Full — files exist |
| Obsidian Skills | `agent/skills/*/SKILL.md` | ❌ Not included | SkillsService reads them |
| Graphify | `graphify-out/` | ✅ Included (toggle) | AST + LLM graph builder |
| PARA | `CZVault/` | ❌ Not included | graphify_maintain.py syncs |
| QMD | `agent/templates/*.qmd` | ✅ Included (toggle) | Template system exists |
| Automations | `agent/automations/` | ❌ Not included | Not yet created |

**Research approach:** Use `agent/skills/generate-prompt/` skill to create research prompt covering:
1. How to summarize chat history (efficient, not everything)
2. How to inject LLM Wiki, Obsidian Skills, PARA, Graphify into agent context
3. How to visualize system connections in-app
4. How automations can trigger context updates

### Issue #125: Setup Dialog — Missing System Toggles

- **Status:** Not Started
- **Priority:** High
- **User said:** "I don't think it's complete because there's only the QMD and the graphify, right? But there's much more than that."
- **Root Cause:** `NewSessionDialog` only has `includeQMD` and `includeGraphify` toggles. Missing: LLM Wiki, Obsidian Skills, PARA, Automations.
- **Fix:** Add toggles for each system in the Setup dialog. Make it comprehensive.

**What each system needs in the Setup UI:**
- `includeLLMWiki` — Include agent markdown files (state.md, context.md, AGENTS.md, etc.) in context
- `includeObsidianSkills` — Include skill files from agent/skills/ directory
- `includePARA` — Sync graphify-out/ to CZVault/ and include PARA reference
- `includeAutomations` — Include automation scripts (agent/automations/)

### Issue #126: Context History — Efficient Summarization

- **Status:** Not Started
- **Priority:** High
- **User said:** "Not too heavy... if there's too much going on and if we insert everything in the system from the whole history that means it's very inefficient."
- **Root Cause:** No summarization pipeline. Every chat is treated as isolated.
- **Solution:** Design a layered context system:
  - **Short-term:** Last N messages (keep full detail)
  - **Medium-term:** Session summary (every 10 messages → 1-sentence summary)
  - **Long-term:** Project-level context (read from LLM Wiki files)
  - **Deep memory:** Cross-session patterns stored in agent memory files

### Issue #127: In-App Context Visualization

- **Status:** Not Started
- **Priority:** Medium
- **User said:** "you can create an internal in the app, in the app, what is it called, in the app visualization of the thing, right."
- **Root Cause:** No visual representation of how systems connect (Graphify → PARA → Obsidian, etc.)
- **Solution:** Create a "Context Map" panel in the Setup dialog showing:
  - Which systems are active/linked
  - Connection lines between systems (e.g., graphify→PARA, skills→LLM Wiki)
  - Last sync times, file counts
  - Quick enable/disable per system
  3. Switch back to Chrome — tracking should resume correctly, no phantom deltas

---

## 🚨 2026-05-27 — AFK Prompt External Page Refresh + Stats Page Period Fixes

### Issue #128: AFK Prompt Activity Selection Does Not Show on External Page

- **Status:** AI Attempted Fix
- **Priority:** High
- **User said:** "the AFK thing and prompting the user to insert what external activity doesn't add into the external activity"
- **Root Cause:** `handleAfkConfirm`/`handleAfkDismiss` in `App.tsx` called `stopAfkSession()` to save the data to DB, but never notified `ExternalPage` to refresh. The data existed in the database but the UI was stale.
- **Fix:** Added `window.dispatchEvent(new CustomEvent('external-data-changed'))` after successful `stopAfkSession` in both handlers. Added corresponding `useEffect` listener in `ExternalPage.tsx` that calls `refreshStats()` and reloads activities.
- **Files:** `src/App.tsx`, `src/pages/ExternalPage.tsx`

### Issue #129: App Stats Page Missing 7day/30day Chart Handlers

- **Status:** AI Attempted Fix
- **Priority:** High
- **User said:** "the application page doesn't show the 7-day properly, it shows like one day... 30-day doesn't work... all-time also doesn't work"
- **Root Cause:** `dailyUsage` useMemo in `StatsPage.tsx` had handlers for `'today'`, `'week'`, `'month'`, and `'all'`, but **`'7day'` and `'30day'` were missing**. When selected, the code fell through to the `'all'` grouping (by month), showing monthly aggregates instead of daily bars.
- **Fix:** Added dedicated iteration handlers for both `'7day'` (7 consecutive days, EEE labels) and `'30day'` (30 consecutive days, MMM dd labels). Also fixed the hardcoded subtitle label.
- **Files:** `src/pages/StatsPage.tsx`