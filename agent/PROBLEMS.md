# PROBLEMS.md

> **Purpose:** Issue tracker for AI agents and humans ΓÇö all known bugs, feature requests, and their resolution status.
> **Last Updated:** 2026-06-19 (Orbit visual enhancements)
> **Total Issues:** 123
> **Parse Priority:** High

---

## Quick Reference

| Status | Count |
|--------|-------|
| NEW | 0 |
| Not Started | 0 |
| In Progress | 0 |
| AI Attempted Fix | 2 |
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

## ≡ƒÜ¿ 2026-05-22 ΓÇö Bundle A: Terminal Core Flows (Applied)

### Terminal Issues from 54-Item Overhaul (Steps 1-8)

| Old Ref | Issue | Status | Fix |
|---------|-------|--------|-----|
| Fix 1 | InstructionPanel `onSend` stub ignores config | Fixed | Wired to `handleInstructionPanelSend` |
| Fix 2 | BuildInitContent duplicates assembleContext | Fixed | Removed buildInitContent, uses assembleContext exclusively |
| Fix 5 | UI doesn't refresh on context changes | Fixed | Added onContextChanged refresh effect + fixed preload cleanup handlers |
| Fix 3 | terminal:write IPC handler missing | Fixed | Added handler delegating to terminalManager.write |
| Fix 4 | Problem prompt uses fragile 3000ms timeout | Fixed | Replaced with queueOrSend mechanism |
| Fix 1.5 | Skills pipeline verification | Verified | End-to-end working (generatePrompt ΓåÆ onSend ΓåÆ queueOrSend) |
| Fix 1.6 | FlowView audit | Noted | FlowView.tsx doesn't exist (stub) ΓÇö no-op |
| Fix 1.7 | Status change terminal format | Fixed | Changed to `[SYSTEM: #id action "status"]` with per-action formatting |

---

## ≡ƒÜ¿ 2026-05-12 SESSION ΓÇö Solar System 3-in-1 Fix (Applied)

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

## ≡ƒÜ¿ 2026-05-12 SESSION ΓÇö Terminal Phase 1 Implementation (Resolved)

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
- Fix: Changed `ipcRenderer.invoke('write-terminal', { terminalId, text })` ΓåÆ `ipcRenderer.invoke('write-terminal', terminalId, text)` to match handler signature.

### Issue #079: Sidebar Width Unlimited (Not Limited to 600px)
- Status: Fixed
- User said: "Sidebar should resize freely with no max-width limit"
- Files: src/pages/TerminalPage.tsx
- Fix: Removed `Math.min(600, ...)` constraint ΓÇö sidebar now limited only by min-width (200px)

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

## ≡ƒÜ¿ 2026-05-12 SESSION ΓÇö Terminal Architecture Fixes

### Issue #087: TerminalLayout Prop Chain Broken (Root Cause of "Can't Create Terminals")
- Status: Fixed
- Root cause: TerminalPage's `terminalLayout` state (from `onLayoutChange` callback) was NEVER passed as `initialLayout` prop to TerminalLayout. The + button called `setTerminalLayout()` on a state that had zero effect.
- Fix:
  1. Replaced broken prop-chain pattern with custom event system (`create-terminal`, `terminal-created`, `close-pane`)
  2. TerminalLayout now manages its own internal layout state ΓÇö TerminalPage no longer tries to set layout directly
  3. Events dispatched from + button, New Session dialog, and close button
- Files: src/pages/TerminalPage.tsx, src/components/TerminalWindow.tsx

### Issue #088: Double-Spawn Bug in Terminal Creation
- Status: Fixed
- Root cause: Both TerminalPage's `spawnTerminal()` call (from old + button code) AND `handleTerminalReady` in TerminalLayout tried to spawn the same terminal ID
- Fix: Removed redundant `spawnTerminal()` from event handler ΓÇö only TerminalLayout now spawns PTYs
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

## ≡ƒÜ¿ 2026-05-12 SESSION ΓÇö Terminal UI Fixes (Phase 2)

### Issue #092: Terminal + Button Doesn't Show Tab (Tab Bar Stays Empty)
- Status: Fixed
- Root cause: Two bugs:
  1. `useTerminalLayout(initialLayout)` in TerminalWindow.tsx:193 passed a `PaneNode` object as `projectId` (string param). Object stringified to `"[object Object]"`, DB query returned nothing, layout stayed `null` forever.
  2. `handleCreateTerminalEvent` had `setLayout(prev => prev ? insertIntoLayout(prev) : prev)` ΓÇö when `prev` was `null` (always, due to bug #1), returned `null`. Panes never rendered.
- Fix: Changed `useTerminalLayout(initialLayout)` ΓåÆ `useTerminalLayout(null, initialLayout || null)`. Added null-handling in `handleCreateTerminalEvent` to create root leaf when no layout exists.
- Also: + button now ALSO calls `setTerminalTabs()` directly before dispatching event. TerminalLayout's `handleCreateTerminalEvent` accepts `terminalId` from event detail.
- Files: src/pages/TerminalPage.tsx, src/components/TerminalWindow.tsx

### Issue #093: FilesTab Shows "Select a project" with No Way to Select
- Status: Fixed
- Root cause: FilesTab had no inline project picker. If auto-selection hadn't fired yet (race condition on first load), the tab showed a dead-end message with no action for the user.
- Fix: Replaced "Select a project above" message with a project dropdown select inside the tab. Also added `spawnTerminal`, `loadSessions` to useEffect deps to prevent stale closures.
- Files: src/pages/TerminalPage.tsx

### Issue #094: RequestsTab Doesn't Know Which Project ΓÇö Always Uses userDataPath
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

## ≡ƒÜ¿ 2026-05-12 SESSION ΓÇö Found and Fixed 5 Runtime Bugs

### Issue #097: useTerminalLayout Wrong Args (CRITICAL ΓÇö Everything Was Broken)
- Status: Fixed
- Root cause: TerminalWindow.tsx line 193 called `useTerminalLayout(initialLayout)` where `initialLayout` is a PaneNode. The hook expects `(projectId: string | null, initialLayout: PaneNode | null)`. The PaneNode was passed as projectId ΓåÆ stringified to `"[object Object]"` ΓåÆ DB query failed ΓåÆ layout always `null`.
- Fix: `useTerminalLayout(null, initialLayout || null)`
- Effect: TerminalLayout couldn't create any panes. + button created tabs but no terminal ever rendered.

### Issue #098: handleCreateTerminalEvent Null Layout (Same Root Cause)
- Status: Fixed
- Root cause: `setLayout(prev => prev ? insertIntoLayout(prev) : prev)` returned null when prev was null (always, due to #097).
- Fix: Added null-handling to create root leaf pane when layout doesn't exist.

### Issue #099: terminalWrite Preload Arg Mismatch (Send Button Broken)
- Status: Fixed
- Root cause: Preload `terminalWrite` called `ipcRenderer.invoke('write-terminal', { terminalId, text })` with ONE object arg. Handler `write-terminal` expected `(_event, terminalId: string, data: string)` ΓÇö TWO separate args. `data` was always `undefined`, never written to PTY.
- Fix: Changed to `ipcRenderer.invoke('write-terminal', terminalId, text)` to match handler signature.

### Issue #100: StuseEffect Missing Deps (Event Handlers Stale)
- Status: Fixed
- Root cause: Event handler effect in TerminalPage.tsx was missing `terminalLayout`, `setTerminalLayout`, `spawnTerminal`, `loadSessions` from deps. Handlers captured stale references.
- Fix: Added all missing deps.

### Issue #101: link-problem-to-request Always Uses userDataPath
- Status: Fixed
- Root cause: `link-problem-to-request` IPC handler always created RequestsService with `userDataPath`. No `projectId` support in preload API.
- Fix: Added `projectId` to IPC handler, preload, and RequestDetailModal. Handler now resolves via `getProjectPath()`.

## ≡ƒÜ¿ 2026-05-12 SESSION ΓÇö Terminal Workspace Critical UX Fixes

### Issue #102: FilesTab Shows Project Selector Despite Project Already Known from IDE Page
- Status: AI Attempted Fix
- User said: "WHY THE FUCK IS THERE A PROJECT SELECTION????? THE WORKSPACE IS ACCESSED FROM THE PROJECT IDE WHICH ALREADY HAVE THE PATH TO THE PROJECT DIRECTORY"
- Root cause: FilesTab received only `projectId`, then looked up the project in the `projects` array. When opened from IDE page, `propProjectPath` is available but never passed to FilesTab. If `projects` array hadn't loaded, `projectPath` was empty and the project selector appeared.
- Fix: Added `projectPath` prop to FilesTab. When opened from workspace modal, `propProjectPath` is passed directly. FilesTab uses it before falling back to projects array lookup.
- Files: `src/pages/TerminalPage.tsx` ΓÇö FilesTab component signature, projectPath derivation, and call site

### Issue #103: + Button Hidden When No Terminals Exist (Can't Create First Terminal)
- Status: AI Attempted Fix
- User said: "NEW TERMINAL IS NOT THERE"
- Root cause: The entire terminal tab bar (including the + button) was wrapped in `{Object.keys(terminalTabs).length > 0 && (` ΓÇö when no terminals existed, the entire bar (including the + button) was hidden. User couldn't create the first terminal.
- Fix: Removed the conditional wrapper. Tab bar now always renders with the + button visible. Terminal tab entries are only rendered when they exist.
- Files: `src/pages/TerminalPage.tsx` ΓÇö Terminal tab bar conditional gate removed

### Issue #104: Save Button Hidden Inside Instruction Input Bar
- Status: AI Attempted Fix
- User said: "THE SAVE IS NOT THERE"
- Root cause: The ≡ƒÆ╛ Save checkpoint button was only visible inside the instruction input bar, which appears only after clicking "Send". There was no visible save button in the default terminal header UI.
- Fix: Extracted `handleSaveCheckpoint` callback. Added a Save button in the terminal header next to the Send button, always visible when a terminal is active. Also kept the Save button in the instruction input bar.
- Files: `src/pages/TerminalPage.tsx` ΓÇö Added `handleSaveCheckpoint` callback, added Save button to header

---

## ≡ƒÜ¿ 2026-05-13 SESSION ΓÇö TERMINAL WORKSPACE COMPREHENSIVE FIX (All Issues Fixed)

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
- Fix: `handleTabSelect` no longer resets layout ΓÇö just focuses the terminal.

### Issue #113: Terminal Sidebar Not Useful
- Status: **FIXED**
- User said: "The terminal sidebar is not showing anything useful. There's no sessions there."
- Fix: Complete rewrite of TerminalsTab:
  1. Running Terminals section: shows each terminal, its session, session name, agent, date
  2. Free terminals show "No session ΓÇö ready to assign" with "New Session" button
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
  4. Clear visual hierarchy: Terminal ΓåÆ Session

### Database Fixes
- **FIXED:** Added missing `terminal_bindings` table creation in `initializeStorage()`
- **FIXED:** Added `terminal_id` column to `terminal_sessions` table
- **FIXED:** Updated `save-terminal-session` IPC handler to store `terminal_id`

### Architecture Changes Summary
1. **Terminal Γëá Session** - Creating a terminal does NOT auto-create a session
2. **Explicit session creation** - New Session dialog requires terminal selection
3. **TerminalΓåöSession mapping** - Sessions store `terminal_id`, visible in all UI
4. **Send routing** - Send instruction routed to correct session's terminal
5. **Layout preservation** - Tab select no longer destroys split layouts
6. **Session lifecycle** - Close terminal = close session (terminal_id = null)

---

**Last Updated:** 2026-05-12
**Next Step:** Restart DeskFlow to test all fixes

## ≡ƒÜ¿ 2026-05-12 SESSION ΓÇö Transient App Filter + Recent Sessions Fix

### Issue #095: Windows Explorer disrupts stopwatch during Alt+Tab

- Status: Fixed
- User said: "switching apps turns the tracker into windows explorer" and "should not be distrpted by the windows explorer"
- Root cause: `pollForeground()` unconditionally accepted foreground changes, including transient system windows like "Windows Explorer" that briefly appear during Alt+Tab. This triggered a `foreground-changed` event that disrupted the Dashboard stopwatch.
- Fix: Added `TRANSIENT_APPS` filter ΓÇö Windows Explorer, Task Switching, etc. are silently ignored in `pollForeground()`. No `currentApp` change, no `foreground-changed` event, no stopwatch disruption.
- Files: `src/main.ts`

### Issue #096: Recent Sessions flooded with "Website" entries

- Status: Fixed
- User said: "recent sessions always point towards the website"
- Root cause: Activity feed initialization took the 20 most recent log entries, which were mostly browser periodic sync data (coming every ~30s vs. app log on app change).
- Fix: Activity feed initialization now takes a balanced mix ΓÇö up to 10 app logs + up to 5 browser logs, then sorted by recency.
- Files: `src/pages/DashboardPage.tsx`

---

## ≡ƒÜ¿ 2026-05-13 SESSION ΓÇö Path Resolution Fix + Setup Button Gating Fix

### Issue #116: PROBLEMS.md Reads from userDataPath Instead of Workspace Root

- Status: Fixed
- User said: "still not parse" (PROBLEMS.md) and "the same" (Requests page)
- Root cause: `getProjectPath()` returned `userDataPath` (Electron app data dir) when project not found in DB. ProblemsService created/read PROBLEMS.md from `userDataPath/agent/PROBLEMS.md` instead of the workspace root, causing the UI to show an empty problem list. Same bug affected REQUESTS.md via `getRequestsService()`.
- Fix:
  1. `getProjectPath()` now returns `undefined` instead of `userDataPath` ΓÇö lets ProblemsService/RequestsService fall through to `process.cwd()` (workspace root)
  2. `tracker-mind-setup` IPC handler changed from `userDataPath` to `process.cwd()` for default base dir
  3. Setup/Init button moved outside `{projects.length > 0 && ...}` gate ΓÇö always visible even with no projects
  4. `handleInitSetup` no longer requires a selected project ΓÇö works without `projId`/`projPath`
- Files: `src/main.ts`, `src/pages/TerminalPage.tsx`

---

## ≡ƒÜ¿ 2026-05-17 SESSION ΓÇö AI Task Progress Tracking System

### Issue #122: terminalTabs ReferenceError in TerminalWindow.tsx handleSplit
- **Status:** Fixed
- **Root cause:** `handleSplit` in TerminalWindow.tsx referenced `terminalTabs` but this variable only exists in TerminalPage.tsx. TerminalWindow never had access to it.
- **Fix:** Changed to `localStorage.getItem('terminal-defaultAgent') || 'claude'` ΓÇö same pattern used by `handleTerminalReady` and the "+" button in empty state. All three terminal creation paths now use the same agent source.
- **Files:** `src/components/TerminalWindow.tsx`

### Issue #123: No Prompt Progress Tracking (pendingΓåÆin_progressΓåÆcompleted)
- **Status:** Fixed
- **What's built:** Complete AI Task Progress Tracking System:
  1. **PTY-based status detection** ΓÇö `pendingCompletions` Set tracks when user input is sent, agent signature detection marks completion
  2. **JSON file bridge** ΓÇö `fs.watch` on `agent/ai-tasks.json` with 500ms debounce, pushes changes to renderer
  3. **Status in DB** ΓÇö `status` column on `terminal_messages`, updated via `markTaskCompleted()`
  4. **Live UI** ΓÇö PromptHistoryTab shows color-coded badges (gray Pending, cyan spinning Processing, green Completed)
  5. **Send integration** ΓÇö `sendInstruction` creates AI task via `ai-task:add` IPC
- **New IPC:** `get-prompt-status`, `ai-task:watch`/`stop-watch`, `ai-task:add`, `ai-task:updated`/`file-changed` events
- **Files:** `src/main.ts`, `src/preload.ts`, `src/components/PromptHistoryTab.tsx`, `src/components/TerminalWindow.tsx`, `src/pages/TerminalPage.tsx`

---

## ≡ƒÜ¿ 2026-05-15 SESSION ΓÇö Browser Extension Background Tab Phantom Tracking

### Issue #121: Background tab events log websites when browser isn't focused

- Status: Fixed (2026-05-26)
- Priority: High
- User said: "theres a commonly happening problem where the app still tracks a website even if the browser is not focused. browser with the extension."
- Root cause (round 1): `logPreviousSession()` was called from tab events that fire even when the browser is backgrounded. Payload had no `is_browser_focused` field, so server guards never caught it.
- Root cause (round 2 ΓÇö final): `checkBrowserFocus()` checked if the foreground app matches ANY browser in a generic list (`['chrome', 'firefox', 'edge', 'safari', 'brave', 'opera', 'comet', 'vivaldi', 'arc']`). When user switched to a different browser (e.g., Firefox while extension is in Chrome/Comet), it still considered the browser "focused" and continued tracking.
- Fix (round 1):
  1. Added `force` parameter to `logPreviousSession(force = false)`
  2. Added early return guard if `!force && !state.isBrowserFocused`
  3. Added `is_browser_focused: state.isBrowserFocused` to the payload
- Fix (round 2 ΓÇö 2026-05-26):
  4. Changed `checkBrowserFocus()` to compare against `BROWSER_NAME` (the specific browser detected via user agent at extension load time) instead of a generic list. Now only counts website time when the SPECIFIC browser with the extension is in the foreground.
  5. On `/foreground-app` fetch failure, `state.isBrowserFocused` now defaults to `false` instead of returning the stale previous state.
- Files: `browser-extension/background.js`, `src/main.ts`
- Human Testing:
  1. Browse a site in Chrome/Comet, then Alt+Tab to another app ΓÇö the final session should still be logged (captures time spent before switching)
  2. Leave browser backgrounded for a while with sites auto-refreshing ΓÇö no new website entries should appear
  3. Switch to a DIFFERENT browser (e.g., Firefox) while extension is in Chrome/Comet ΓÇö no website tracking should occur during this time

---

## ≡ƒÜ¿ 2026-05-18 SESSION ΓÇö Context Management System (Research + Design)

### Issue #124: Context Management ΓÇö AI Agent Gets Stale Context Across Chats

- **Status:** Not Started
- **Priority:** High
- **User said:** "After a few chats in the same system, the AI agent would already predict what we're saying... We need to improve the context throughout the chat. And we need to somehow store those history of chats... Not too heavy, because inserting every single history with all its details is inefficient."
- **Root Cause:** No layered context summarization system. AI gets no persistent cross-session memory. Context is rebuilt fresh each chat.
- **Systems to integrate:** LLM Wiki, Obsidian Skills, Graphify, PARA, QMD, Automations
- **Current Setup UI only covers:** QMD (templates) + Graphify (graph report). Missing: LLM Wiki, Obsidian Skills, PARA, Automations toggles.
- **UI rename:** "Initialize" ΓåÆ "Setup" (button label + dialog title)

**Files to modify:**
- `src/components/NewSessionDialog.tsx` ΓÇö Rename InitializeΓåÆSetup, add system toggles
- `src/pages/TerminalPage.tsx` ΓÇö Rename button
- `agent/docs/research-impl/` ΓÇö Research prompt for context architecture

**Knowledge systems inventory (what exists vs what's missing):**

| System | Location | Status in Setup UI | Implementation |
|--------|----------|-------------------|----------------|
| LLM Wiki | `agent/*.md` (AI-optimized) | Γ¥î Not included | Full ΓÇö files exist |
| Obsidian Skills | `agent/skills/*/SKILL.md` | Γ¥î Not included | SkillsService reads them |
| Graphify | `graphify-out/` | Γ£à Included (toggle) | AST + LLM graph builder |
| PARA | `CZVault/` | Γ¥î Not included | graphify_maintain.py syncs |
| QMD | `agent/templates/*.qmd` | Γ£à Included (toggle) | Template system exists |
| Automations | `agent/automations/` | Γ¥î Not included | Not yet created |

**Research approach:** Use `agent/skills/generate-prompt/` skill to create research prompt covering:
1. How to summarize chat history (efficient, not everything)
2. How to inject LLM Wiki, Obsidian Skills, PARA, Graphify into agent context
3. How to visualize system connections in-app
4. How automations can trigger context updates

### Issue #125: Setup Dialog ΓÇö Missing System Toggles

- **Status:** Not Started
- **Priority:** High
- **User said:** "I don't think it's complete because there's only the QMD and the graphify, right? But there's much more than that."
- **Root Cause:** `NewSessionDialog` only has `includeQMD` and `includeGraphify` toggles. Missing: LLM Wiki, Obsidian Skills, PARA, Automations.
- **Fix:** Add toggles for each system in the Setup dialog. Make it comprehensive.

**What each system needs in the Setup UI:**
- `includeLLMWiki` ΓÇö Include agent markdown files (state.md, context.md, AGENTS.md, etc.) in context
- `includeObsidianSkills` ΓÇö Include skill files from agent/skills/ directory
- `includePARA` ΓÇö Sync graphify-out/ to CZVault/ and include PARA reference
- `includeAutomations` ΓÇö Include automation scripts (agent/automations/)

### Issue #126: Context History ΓÇö Efficient Summarization

- **Status:** Not Started
- **Priority:** High
- **User said:** "Not too heavy... if there's too much going on and if we insert everything in the system from the whole history that means it's very inefficient."
- **Root Cause:** No summarization pipeline. Every chat is treated as isolated.
- **Solution:** Design a layered context system:
  - **Short-term:** Last N messages (keep full detail)
  - **Medium-term:** Session summary (every 10 messages ΓåÆ 1-sentence summary)
  - **Long-term:** Project-level context (read from LLM Wiki files)
  - **Deep memory:** Cross-session patterns stored in agent memory files

### Issue #127: In-App Context Visualization

- **Status:** Not Started
- **Priority:** Medium
- **User said:** "you can create an internal in the app, in the app, what is it called, in the app visualization of the thing, right."
- **Root Cause:** No visual representation of how systems connect (Graphify ΓåÆ PARA ΓåÆ Obsidian, etc.)
- **Solution:** Create a "Context Map" panel in the Setup dialog showing:
  - Which systems are active/linked
  - Connection lines between systems (e.g., graphifyΓåÆPARA, skillsΓåÆLLM Wiki)
  - Last sync times, file counts
  - Quick enable/disable per system
  3. Switch back to Chrome ΓÇö tracking should resume correctly, no phantom deltas

---

## ≡ƒÜ¿ 2026-05-27 ΓÇö AFK Prompt External Page Refresh + Stats Page Period Fixes

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


### Issue #130: Sleep Chart Shows No Bars / Zero Sleep After Adding Sleep

- **Status:** Fixed
- **Priority:** High
- **User said:** "no bars even after adding sleep"
- **Root Cause:** `get-sleep-trends` handler in main.ts queried `started_at BETWEEN ? AND ?` window, started_at is bedtime which falls on the previous calendar day for late-night sleep. Weekly chart looked 7 days AHEAD of the actual sleep data.
- **Fix:** Changed date window to cover both `started_at` and `ended_at` using `OR` logic: `WHERE (date(started_at) BETWEEN ? AND ?) OR (date(ended_at) BETWEEN ? AND ?)`.
- **Files:** `src/main.ts`

### Issue #131: 3+ Terminal Grouping Broken (insertIntoLayout Nests Instead of Flattening)

- **Status:** Fixed
- **Priority:** High
- **User said:** "adding a third terminal groups it wrong — creates nested splits instead of equal thirds"
- **Root Cause:** `insertIntoLayout` function recursively nested new panes instead of flattening. With 3+ terminals, the layout became deeply nested instead of equal-sized grid.
- **Fix:** Rewrote `insertIntoLayout` to produce flat layouts for up to 4 terminals, with explicit 2x2 grid for 4 terminals.
- **Files:** `src/components/TerminalWindow.tsx`

### Issue #132: Dashboard Focus Sessions Always Show 0

- **Status:** Fixed
- **Priority:** Medium
- **User said:** "focus sessions always show 0 even when timer is running"
- **Root Cause:** Focus sessions data was derived from a separate heavy query that didn't account for in-progress sessions. Only completed (flushed) sessions appeared.
- **Fix:** Added in-memory session check to include current active session in focus session count.
- **Files:** `src/pages/DashboardPage.tsx`

### Issue #133: Dashboard Stats Show 0m While Timer Runs

- **Status:** Fixed
- **Priority:** High
- **User said:** "Productive: 0m, Total: 0m, % Productive: 0% — but timer shows 00:01:33"
- **Root Cause:** `stats` useMemo (`DashboardPage.tsx:1859`) only read `dashboardData?.overview` which comes from the backend DB (saved sessions). The live timer accumulates time in `currentProductiveMs` (in-memory) but stats never included it. Until a session is flushed to DB (every 60s), stats showed all zeros.
- **Fix:** Added `currentProductiveMs` to the `stats` computation. When a productive session is active, its live accumulated ms is added on top of DB data. Stats now reflect the ongoing session immediately. Added `currentProductiveMs`, `lastTier`, `isPaused` as dependencies.
- **Files:** `src/pages/DashboardPage.tsx`

### Issue #134: Dashboard Shows "Unknown" While Timer Is Actively Tracking

- **Status:** Fixed
- **Priority:** Medium
- **User said:** "WHY IS IT TRAKCING UNKNOWN ... IT KEPS ON SAYING UNKNOWN"
- **Root Cause:** The "Currently tracking" section checked `currentApp || currentWebsite || isInBrowser` to decide whether to show a live badge. When DeskFlow is open with `trackerAppMode='show-other'` and no prior app exists (`lnb = null`), the foreground handler returns early after `setCurrentApp(null)` but before `setLastTier(...)`. `lastTier` stays 'productive' (from previous session or a stale foreground event) while `currentApp` is null, causing the display to fall through to hardcoded "Unknown" — even though the timer IS actively accumulating productive time and shows "Productive: 00:01:33".
- **Fix:** Changed the display condition to also check `currentProductiveMs > 0`. When the timer is running but no app name is available, shows the tier name (e.g., "Productive: Productive Session") instead of "Unknown".
- **Files:** `src/pages/DashboardPage.tsx`

### Issue #135: ProductivityPage Donut/Bar/Score/Line Graph All Show Wrong Values

- **Status:** Fixed
- **Priority:** High
- **User said:** "productivity page shows wrong data"
- **Root Cause:** Multiple aggregation queries in main.ts for the ProductivityPage used inconsistent date ranges and filtering logic, causing donut chart, bar chart, score card, and line graph to each display different (wrong) totals.
- **Fix:** Standardized all four data sources to use the same `computePeriodRange()` function and consistent filtering. Removed ad-hoc date math from individual queries.
- **Files:** `src/main.ts`

### Issue #136: InitializeProgressModal Redesign Needs User Testing

- **Status:** AI Attempted Fix
- **Priority:** Medium
- **User said:** "Initialize progress modal needs UX improvements"
- **Root Cause:** The initial InitializeProgressModal had a flat list of files with no grouping, no expandable previews, and no error retry mechanism.
- **Fix:** Redesigned with directory grouping headers, per-group progress counters, expandable file content previews, a "Workspace Ready" summary card on completion, and error retry buttons.
- **Files:** `src/components/InitializeProgressModal.tsx`

### Issue #137: Productivity Trend Chart Breaks When Switching to Previous Periods

- **Status:** Fixed
- **Priority:** High
- **User said:** "trend chart breaks when you go back a week"
- **Root Cause:** The trend chart data query used `dateOffset` but the data transformation didn't account for shifted date ranges, causing empty or overlapping data series.
- **Fix:** Added `dateOffset` parameter propagation through the entire trend chart data pipeline. All date-range calculations now use `computePeriodRange()` consistently.
- **Files:** `src/main.ts`, `src/pages/ProductivityPage.tsx`

### Issue #138: ProductivityPage Freeze on "All Time"

- **Status:** Fixed
- **Priority:** High
- **User said:** "all time freezes the app"
- **Root Cause:** The all-time query had no row limit and no date bounds, loading ALL log entries into memory — causing the renderer to freeze from massive data.
- **Fix:** Added LIMIT 5000 and a 730-day date window to the all-time query (same fix as the dashboard freeze fix).
- **Files:** `src/main.ts`

### Issue #139: BrowserActivityPage "All Time" Shows Only 90 Days

- **Status:** Fixed
- **Priority:** Medium
- **User said:** "all time only shows 90 days"
- **Root Cause:** The BrowserActivityPage used a hardcoded 90-day default range instead of querying all available data. The backend queries had LIMIT clauses that truncated older data.
- **Fix:** Removed the hardcoded 90-day limit. All-time queries now use the full 730-day window (same as other pages).
- **Files:** `src/main.ts`

### Issue #140: Sleep Detection False Positives When User Is Actively Working

- **Status:** Fixed
- **Priority:** High
- **User said:** "sleep detection pops up while I'm working"
- **Root Cause:** The 45+ minute idle gap detection was too aggressive. Long-running tasks (compilation, rendering, large downloads, presentations) could trigger false sleep detection.
- **Fix:** Added an "active work" check: before triggering sleep detection, check if there was meaningful keyboard/mouse activity or active foreground app changes within the gap window. Only trigger sleep if the user was truly AFK for the entire duration.
- **Files:** `src/main.ts`, `src/App.tsx`

### Issue #141: Focus Sessions Show Wrong Sort and Redundant App Name

- **Status:** Fixed
- **Priority:** Low
- **User said:** "focus sessions are sorted wrong and show app name twice"
- **Root Cause:** Focus sessions were sorted by `id DESC` (most recent first) but the UI expected chronological order. The app name was duplicated in the card title and body.
- **Fix:** Changed sort to `start_time DESC` in backend query. Removed redundant app name display in the UI card.
- **Files:** `src/main.ts`, `src/pages/DashboardPage.tsx`

### Issue #142: Website Tracking Logs Browser as App When Not Focused

- **Status:** Fixed
- **Priority:** High
- **User said:** "still tracking websites when browser isn't focused"
- **Root Cause:** The `handleBrowserData()` function in main.ts checked `isBrowserWithExtension()` (whether the foreground app matches the extension host), but this only applies when the foreground is the browser itself. When the user switched to another app, the periodic sync from the browser extension continued creating log entries. The `isBrowserFocused` guard was missing from the periodic sync path.
- **Fix:** Added `isBrowserFocused` guard (from extension handshake state) to the periodic sync handler. If the browser extension reports itself as not focused, periodic sync entries are dropped.
- **Files:** `src/main.ts`

### Issue #143: Charts Don't Update When Navigating to Previous Periods

- **Status:** Fixed
- **Priority:** Medium
- **User said:** "charts stay the same when I go back a week"
- **Root Cause:** The dashboard chart data was fetched once on mount and never re-fetched when `weekOffset` changed. The `useEffect` dependency array was missing `weekOffset`.
- **Fix:** Added `weekOffset` to the data-fetch `useEffect` dependency array. Charts now re-fetch and update when navigating periods.
- **Files:** `src/pages/DashboardPage.tsx`

### Issue #144: All-Time View Freezes App

- **Status:** Fixed
- **Priority:** High
- **User said:** "all time freezes the whole thing"
- **Root Cause:** Several IPC endpoints (`get-dashboard-aggregates`, `getProductivityData`, `get-browser-activity`) had no LIMIT clause or date window for all-time queries, loading the entire log table into memory. Combined with ~50MB of JSON serialization/deserialization, this froze the renderer.
- **Fix:** Added LIMIT 5000 and 730-day window to all data queries that lacked them. Also added query-level performance logging.
- **Files:** `src/main.ts`

### Issue #146: Chart Sleep Trends Timezone Shift — toLocalDate Miscomputes Date

- **Status:** Fixed
- **Priority:** High
- **User said:** "sleep chart shows wrong dates / missing bars"
- **Root Cause:** `new Date(iso).getDate()` in main.ts — `Date(iso)` parses the ISO string as UTC 00:00:00, but `.getDate()` returns the LOCAL timezone's date component. For UTC+ timezones at midnight, the local date matches UTC; for UTC- timezones, the local date is 1 day earlier.
- **Fix:**
  - Changed `toLocalDate` to extract directly from ISO string: `iso.split('T')[0]`
  - Updated `get-sleep-for-date` SQL: `WHERE date(started_at) = ? OR date(ended_at) = ?`
- **Files:** `src/main.ts`

### Issue #145: Sleep Detection Race — AFK Entries Win Over Sleep Queue Clear

- **Status:** AI Attempted Fix
- **Priority:** High
- **User said:** "sleep detection and AFK prompt conflict — entries appear after sleeping"
- **Description:** When sleep detection fires simultaneously with idle return, the AFK prompt queue shows entries despite sleep having cleared it. Root cause: `onSleepDetection` calls `setAfkPromptQueue([])` but the idle return handler's `setAfkPromptQueue(prev => [...prev, entry])` uses a functional updater that React applies AFTER the sleep clear, effectively undoing it.
- **Root Cause:** `idleReturnFnRef.current` is async (contains `await` calls for `getActiveExternalSession`, `getTypicalActivityAtTime`). During the async gap, sleep detection fires and clears the queue. But the idle handler's functional updater (`prev => [...prev, entry]`) captures a snapshot of state from BEFORE the clear and wins over the sleep's `setAfkPromptQueue([])` due to React's batching.
- **Fix:**
  - Added `sleepActiveRef` (synchronous `useRef`) set to `true` immediately in `onSleepDetection` BEFORE any async operations
  - `idleReturnFnRef.current` checks `sleepActiveRef.current` at TWO points: (1) at function start (before async), (2) after all `await` calls (after async)
  - If `sleepActiveRef.current` is true at either point, calls `stopAfkSession()` and returns early without pushing to queue
  - Reset to `false` in `dismissSleepDetection` and `confirmSleepDetection`
- **Files:** `src/App.tsx`

### Issue #147: Dashboard Stat Cards All Zeros

- **Status:** AI Attempted Fix
- **Priority:** High
- **User said:** "Productive 0m, Total 0m, % Productive 100%, Longest Focus 0m, Resets Today 0, Productive 00:00:05"
- **Root Cause:** Two independent aggregation systems — trigger-updated `stats_daily`/`app_totals` and JS-updated `daily_aggregates`/`daily_stats`/`browser_sessions`. The `_backfill_complete` marker caused `stats_daily` to skip backfill if it ran when `logs` was empty. Dashboard reads `stats_daily` → returns empty → cards show 0. Live timer ticks independently via `currentProductiveMs`.
- **Fix:**
  1. **Backfill fix** (`backfillStatsTables` in main.ts): Replaced `_backfill_complete` marker with actual `SELECT COUNT(*)` checks on `stats_daily`/`stats_hourly`. Skips only if both tables have data. Drops legacy `_backfill_complete` table.
  2. **Live fallback** (`getDashboardAggregates` handler): If `stats_daily` returns zero totalSeconds or empty rows, aggregates weekly heatmap, website stats, app stats, and overview totals directly from `logs` via SQL aggregations — works regardless of backfill state.
- **Files:** `src/main.ts`

---

## 🚧 2026-06-05 — AiPage bug fixes (OpenRouter 402 + "e.match is not a function")

### Issue #150: OpenRouter 402 Credit Error on Topic Digest Generation
- **Status:** AI Attempted Fix
- **Priority:** High
- **User reported behavior:** Topic digest generation fails silently on AiPage. OpenRouter returns 402 Payment Required when credits are low.
- **Root Cause:** `AIService.ts:166` set `maxTokens: 400` for topic digest prompt. OpenRouter charges per-token; when account credits dip below the 400-token cost threshold, the API returns HTTP 402 instead of generating content. Topic digest (3-5 short research topic summaries) doesn't need 400 tokens — 200 is sufficient.
- **Fix (round 1):** Reduced `maxTokens` from 400 to 200 in the topic digest generation parameters at `src/services/AIService.ts:166`.
- **Fix (round 2 — REVERTED):** Added automatic fallback to free model `meta-llama/llama-3.2-3b-instruct` — **this was wrong.** Hardcoded model ignored user's configured model, caused 429 rate-limit errors on an unwanted model.
- **Fix (round 3 — CURRENT):** Topic digest now retries with reduced maxTokens (200→100→50) on the **same model** instead of switching to a hardcoded fallback. `generateTopicDigest` accepts optional `maxTokens` parameter for retry calls.
- **Files:** `src/services/AIService.ts`, `src/main.ts`
- **Lesson:** Never hardcode model names. Retry with reduced token budget on the same model instead.

### Issue #151: "e.match is not a function" Crash on AiPage Load
- **Status:** AI Attempted Fix
- **Priority:** High
- **User reported behavior:** AiBriefCard crashes with "e.match is not a function" TypeError when AiPage loads.
- **Root Cause:** Two bugs:
   1. `main.ts:generateDailyBriefAndCache` stored `result.content` (already a parsed JSON object) inside `{ summary: result.content }`, creating `content.summary = { signal, metrics, ... }` — an object, not a string.
   2. `AiBriefCard.tsx` called `content.summary.match(...)` assuming it's always a string, but after the storage bug, `content.summary` was the parsed object, which has no `.match()` method.
- **Fix (round 1):**
   1. `main.ts` — `generateDailyBriefAndCache` now stores `result.content` directly (the parsed object) instead of wrapping it in `{ summary: result.content }`.
   2. `AiBriefCard.tsx` — Added `typeof content.summary === 'string'` guard before calling `.match()` for defense-in-depth.
- **Fix (round 2):**
   3. `main.ts` — Added old cache format migration on read: when loading a cached brief, detects `{ summary: object }` format and unwraps it automatically.
   4. `AiPage.tsx` — `fallbackParseDailyBrief` now unwraps old `{ summary: object }` format for backward compatibility with stale cached data.
- **Files:** `src/main.ts`, `src/components/AiBriefCard.tsx`, `src/pages/AiPage.tsx`

---

## 🚦 Terminal Spawn + Agent Readiness — R2 Fixes (Applied)

### Issue #152: spawnTerminal() drops agentType argument
- **Status:** AI Attempted Fix
- **Priority:** High
- **Root Cause:** `spawnTerminal()` at TerminalPage.tsx:1435 accepted `(terminalId, cwd?)` and dropped the 3rd arg — agentType always defaulted to `'opencode'` in main process.
- **Fix:** Added `agentType?: string` param forwarded to `spawn-terminal` IPC call.
- **Files:** `src/pages/TerminalPage.tsx`

### Issue #153: Initial terminal spawn has no 30s timeout
- **Status:** AI Attempted Fix
- **Priority:** High
- **Root Cause:** `startAgentTimeout()` was only called in `agent:retry-launch` handler, not in initial `terminal:create` or `spawn-terminal` handlers.
- **Fix:** Added `startAgentTimeout(id, type)` after each `agentStates.set()` in both spawn handlers. Added `clearAgentTimeout(id)` before sets.
- **Files:** `src/main.ts`

### Issue #154: terminal-exit vs terminal:exit event name mismatch
- **Status:** AI Attempted Fix
- **Priority:** High
- **Root Cause:** preload.ts:276 listened for `'terminal-exit'` (hyphen), main process sent `'terminal:exit'` (colon). Exit events never reached renderer.
- **Fix:** Changed to `'terminal:exit'` in preload. Added `isDead` state + dead overlay with "Click to re-spawn" in TerminalWindow.tsx. Added `re-spawn-terminal` handler in TerminalPage.tsx.
- **Files:** `src/preload.ts`, `src/components/TerminalWindow.tsx`, `src/pages/TerminalPage.tsx`

### Issue #155: Retry dialog hardcodes agent types instead of using actual type
- **Status:** AI Attempted Fix
- **Priority:** Medium
- **Root Cause:** Error banner retry logic used `err.reason === 'not-recognized' ? 'opencode' : 'claude'` instead of the actual agentType from the error payload.
- **Fix:** Added `agentType` to `AgentInitErrorInfo` interface and `onAgentInitError` callback type. Retry button uses `err.agentType`.
- **Files:** `src/pages/TerminalPage.tsx`, `src/preload.ts`

### Issue #156: pendingWrites lost when terminal killed
- **Status:** AI Attempted Fix
- **Priority:** Medium
- **Root Cause:** No cleanup of queued `pendingWrites` when terminal was killed or destroyed — writes silently disappeared.
- **Fix:** Added `failPendingWrites()` helper that marks DB rows as `'failed'` and broadcasts `terminal:pending-failed`. Called from `kill-terminal`, `terminal:destroy-old-format`, and `terminal:destroy` handlers.
- **Files:** `src/main.ts`

### Issue #157: Handshake token has no bracketed paste awareness
- **Status:** AI Attempted Fix
- **Priority:** Low
- **Root Cause:** Handshake token written as raw text; some agents require bracketed paste wrapping (`\x1b[200~`/`\x1b[201~`) to preserve token integrity.
- **Fix:** `agent:arm-handshake` handler returns `bracketedPaste` boolean. Renderer conditionally wraps token in bracketed paste sequences.
- **Files:** `src/main.ts`, `src/components/TerminalWindow.tsx`

### Issue #158: Triple write path causes inconsistent behavior
- **Status:** AI Attempted Fix
- **Priority:** Medium
- **Root Cause:** Three write paths (`terminalWrite` → `terminal:write-old-format`, `writeTerminal` → `write-terminal`, `agentSend` → `agent:send`) with inconsistent queuing, DB persistence, and phase awareness.
- **Fix:** Made `terminal:write-old-format` phase-aware — checks `agentStates` and queues to `pendingWrites` during `launching`/`busy` phases. Routes all agent-directed content through queuing path.
- **Files:** `src/main.ts`

### Issue #159: Browser Activity Page Crashes With React Error #310
- **Status:** AI Attempted Fix
- **Priority:** High
- **User said:** "when accessing the browser activity page, theres this error: Uncaught Error: Minified React error #310"
- **Root Cause:** `BrowserActivityPage.tsx` returned early for `loading` and `error` before later `useMemo` hooks (`detailDomainLogs`, `detailDailyChart`, `PERIOD_OPTIONS`) were declared. That changed hook order between the initial loading render and the loaded render, which triggers React's production hook-order invariant.
- **Fix:** Moved the `loading` and `error` returns below the remaining hooks so the component calls the same hook sequence on every render.
- **Files:** `src/pages/BrowserActivityPage.tsx`

### Issue #160: TerminalPage useCallback TDZ — "Cannot access 'Dc' before initialization"
- **Status:** AI Attempted Fix
- **Priority:** High
- **User said:** "Cannot access 'Dc' before initialization" when workspace tries to open
- **Root Cause:** `handleMiniMapMoveToGroup` useCallback referenced `handleTerminalMoveToGroup` in its dependency array `[handleTerminalMoveToGroup]`, but `handleTerminalMoveToGroup` (a `const`) was declared 4 lines later. React evaluates dependency arrays in source order during render, triggering the Temporal Dead Zone.
- **Fix:** Swapped the two useCallback declarations so `handleTerminalMoveToGroup` is defined before `handleMiniMapMoveToGroup`.
- **Files:** `src/pages/TerminalPage.tsx`

## 🚧 2026-06-17 — Session & Workspace Critical Bug Fixes

### Issue #162: Workspace save/load broken at /terminal route
- **Status:** AI Attempted Fix
- **Priority:** High
- **User said:** "It doesn't save the session ID / the save doesn't work at /terminal"
- **Root Cause:** All workspace handlers guarded on `propProjectId` only. At `/terminal` route (no `projectId` query param), `propProjectId` is undefined — save/load silently no-ops.
- **Fix:** Added `wsProjectId = propProjectId || selectedProject` fallback to all workspace handlers and effects.
- **Files:** `src/pages/TerminalPage.tsx`

### Issue #163: Session ID collision on rapid creation
- **Status:** AI Attempted Fix
- **Priority:** High
- **User said:** "it doesn't even save the correct session ID"
- **Root Cause:** ID generated as `session-${Date.now()}` — same ms timestamp → same ID. `save-terminal-session` uses `INSERT OR REPLACE`, silently overwriting previous session.
- **Fix:** Added random suffix `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.
- **Files:** `src/components/NewSessionDialog.tsx`

### Issue #164: Session name always empty when dialog opens
- **Status:** AI Attempted Fix
- **Priority:** Medium
- **Root Cause:** `setName('')` called unconditionally in dialog open effect, overriding `defaultName` prop before user could see it.
- **Fix:** Changed to `setName(defaultName && defaultName !== 'New Agent' ? defaultName : '')`.
- **Files:** `src/components/NewSessionDialog.tsx`

### Issue #161: Stale DB connection shows empty data after AFK
- **Status:** AI Attempted Fix
- **Priority:** Medium
- **User said:** "Fix the bug where after being AFK for a while, the app data becomes unloaded/empty, appearing disconnected from the database"
- **Root Cause:** Single global `better-sqlite3` connection is never reopened. After system sleep/resume the file handle can become invalid, causing IPC handlers to silently return `[]` with no error indicator. The renderer had no periodic health check and no reconnection mechanism.
- **Fix:** (1) Added WAL mode + busy_timeout to DB initialization. (2) Added `ensureDb()` health-check function that closes stale connections and re-opens. (3) Added `withDb<T>()` wrapper for automatic reconnection on IPC queries. (4) Wrapped 5 critical IPC handlers with `ensureDb()`. (5) Added 30s periodic health-check + visibilitychange refresh in `App.tsx` with `dbConnected` state and yellow "Reconnecting..." indicator badge.
- **Files:** `src/App.tsx`, `src/main.ts`

---

## 🚧 2026-06-18 — Sleep date fix

### Issue #165: Sleep sessions starting after midnight show wrong wake-up date
- **Status:** AI Attempted Fix
- **Priority:** Medium
- **User said:** "🛏️ Jun 13 2:44 AM → 🌅 Jun 14 10:43 AM — same day, why different dates?"
- **Root Cause:** Sleep sessions starting in AM (after midnight, e.g., 2:44 AM) had `ended_at` stored on the next calendar day (Jun 14) when the wake time (10:43 AM) is on the same day. This happened because the save logic didn't properly handle AM-to-AM sleep (same calendar day).
- **Fix:** Added `fix-sleep-dates` IPC handler + button in ExternalPage. The fix checks every sleep session: if `started_at` is AM (0-11h) and `ended_at` is on the next calendar day ALSO in AM, it resets `ended_at` date to match `started_at` date and recalculates `duration_seconds`.
- **Files:** `src/main.ts`, `src/preload.ts`, `src/pages/ExternalPage.tsx`
- **Test:** Click "Fix Sleep Dates" button next to Sleep Debug on the External page. Verify alert shows count of fixed sessions.

---

## 🚧 2026-06-19 — Orbit System Visual Enhancements (RESULT.md Phase 1)

### Issue #166: Starfield background (B9) — Fibonacci sphere with parallax
- **Status:** AI Attempted Fix
- **Priority:** Low
- **Description:** OrbitSystem needs a starfield background with two-layer parallax and twinkle animation for visual depth.
- **Source:** RESULT.md §B9, Phase 1 Item 6
- **Fix:** Added 6000-star Fibonacci sphere with ecliptic bias, two-layer parallax, and twinkle animation in `OrbitSystem.tsx`. Single draw call (8000 points, instanced).
- **Files:** `src/components/OrbitSystem.tsx`

### Issue #167: Planet atmospheres (B8) — Translucent glow shell
- **Status:** AI Attempted Fix
- **Priority:** Low
- **Description:** Planets need an atmosphere glow effect — a translucent shell that adds depth and realism.
- **Source:** RESULT.md §B8, Phase 1 Item 7
- **Fix:** Added back-face translucent shell on `TexturedPlanet` (radius*1.08, 0.08 opacity).
- **Files:** `src/components/OrbitSystem.tsx`

### Issue #168: Portal ring on arrival (B5) — System entry animation
- **Status:** AI Attempted Fix
- **Priority:** Low
- **Description:** When entering a category/SolarSystem view, a portal ring should expand from the system center with light flash and particles.
- **Source:** RESULT.md §B5, Phase 1 Item 9
- **Fix:** Added `PortalRing` component with animated ring expansion, light flash, and particle burst triggered on `handleEnterSystem` and `handleCategorySelect`.
- **Files:** `src/components/OrbitSystem.tsx`

### Issue #169: Planet rings deterministic top-25% (C1)
- **Status:** AI Attempted Fix
- **Priority:** Low
- **Description:** Planet rings should appear on the top 25% of apps by total time, not random.
- **Source:** RESULT.md §C1, Phase 1 Item 13
- **Fix:** Changed from random 40% chance to deterministic top-25% apps by total time.
- **Files:** `src/components/OrbitSystem.tsx`

### Issue #170: Hover tooltip with time (D1) — Planet label shows duration
- **Status:** AI Attempted Fix
- **Priority:** Low
- **Description:** Hovering a planet label should show the formatted total time using `formatDurationSeconds`.
- **Source:** RESULT.md §D1, Phase 1 Item 10
- **Fix:** Added `formatDurationSeconds(data.time)` tooltip on planet label hover.
- **Files:** `src/components/OrbitSystem.tsx`
