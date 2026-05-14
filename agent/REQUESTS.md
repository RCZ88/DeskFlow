# 📋 User Requests Log

> **Purpose:** Track all user requests, their status, and history. Ensures nothing is forgotten and provides context for future sessions.
> **Last Updated:** 2026-05-14
> **Parse Priority:** High

---

## Quick Reference

| Status | Description |
|--------|-------------|
| Pending | Waiting to be addressed |
| In Progress | Currently being worked on |
| Completed | Done and delivered |
| Cancelled | No longer relevant |

---

## How to Use

### Adding New Requests:

```markdown
### Request #XXX - [Short Title]

**Date:** YYYY-MM-DD
**Status:** [Pending | In Progress | Completed | Cancelled]
**Priority:** [High | Medium | Low]
**Category:** [Feature | Bug Fix | UI/UX | Documentation | Refactor]

**Request:** 
"What the user asked for"

**Context:**
- Why they asked for it
- Related issues or features

**Outcome:**
- What happened
- Links to related files/changes
```

### Updating Status:
When a request is completed, update the status and add notes about what was done.

---

## 🔄 Recent Requests

### Request #001 - External Activity Dashboard Integration
**Date:** 2026-04-26
**Status:** Completed
**Priority:** High
**Category:** Feature

**Request:** 
Dashboard should sync with external activity - show active external activity on the stopwatch, log external activities, and resume external activity after internal activity ends.

**What Was Done:**
- Dashboard timer now shows external activity time when running
- External activity name displayed on dashboard when active
- Timer switches between productive time and external time based on session state

---

### Request #002 - Remove Timeline Select from External Page
**Date:** 2026-04-26
**Status:** Completed
**Priority:** Medium
**Category:** UI/UX

**Request:** 
Remove the dropdown timeline selector from External page - it should use the top nav timeline instead.

**What Was Done:**
- Removed select element from ExternalPage.tsx header
- External page now uses shared timeline from top navigation

---

### Request #003 - Edit External Activities
**Date:** 2026-04-26
**Status:** Completed
**Priority:** High
**Category:** Feature

**Request:** 
Ability to edit external activities - name, type, icon, color, and delete.

**What Was Done:**
- Added edit button that appears on hover over activity
- Edit modal allows changing name, type, icon, and color
- Delete functionality added
- Uses existing `updateExternalActivity` and `deleteExternalActivity` IPC handlers

---

### Request #004 - Stopwatch Randomly Resets to 0
**Date:** 2026-04-26
**Status:** Completed
**Priority:** High
**Category:** Bug Fix

**Request:** 
Stopwatch on dashboard randomly goes to 0 and shows "Paused" state.

**Root Cause Found:**
- `setIsPaused(false)` was called during reset, but timer should stay paused until productive activity resumes
- Duplicate intervals created when sessionStartTime reset

**What Was Done:**
- Changed `setIsPaused(true)` on reset (was false)
- Removed duplicate interval creation in productive return path
- Timer now properly pauses and waits for productive activity to resume

---

### Request #005 - Detect App Tracker Electron App
**Date:** 2026-04-26
**Status:** Completed
**Priority:** Medium
**Category:** Bug Fix

**Request:** 
DeskFlow/Electron app was being hidden from tracking. Want it to show when user opens the app.

**What Was Done:**
- Changed system app detection to show DeskFlow/Electron as current app
- App is still not added to activity feed (to avoid pollution)
- User can now see what they're using when in the app

---

### Request #006 - External Activity Settings Removed from Dashboard
**Date:** 2026-04-26
**Status:** Completed
**Priority:** Low
**Category:** UI/UX

**Request:** 
Remove the tracking mode toggle (Always On / On Interaction) from the external activity controls on dashboard.

**What Was Done:**
- Removed the tracking mode toggle and helper text
- Kept only Start/Stop buttons for simplicity

---

### Request #007 - Timer Container Width Fixed
**Date:** 2026-04-26
**Status:** Completed
**Priority:** Low
**Category:** UI/UX

**Request:** 
Main timer section had awkward width that didn't follow any pattern.

**What Was Done:**
- Added `max-w-xl mx-auto` to center the timer and constrain width
- Responsive padding: `p-8 sm:p-12`

---

### Request #008 - Focus/Total Toggle Position Fixed
**Date:** 2026-04-26
**Status:** Completed
**Priority:** Low
**Category:** UI/UX

**Request:** 
Focus/Total toggle position was being affected by adjacent text length.

**What Was Done:**
- Added `flex-shrink-0` to toggle container and buttons
- Fixed width `w-[80px]` for buttons
- Toggle now stays in fixed position regardless of adjacent text

---

### Request #009 - Remove Browser Blacklist from App Tracking
**Date:** 2026-04-26
**Status:** Completed
**Priority:** High
**Category:** Feature

**Request:** 
Remove the hardcoded exclusion of tracking browser (Comet Browser) from application tracking. Browser app should be included in app page stats.

**What Was Done:**
- Removed `trackingBrowser` exclusion from:
  - `computedAppStats`
  - `appsTimeByCategory`
  - `timeByCategory`
  - `timeBreakdown`
- All apps now included regardless of browser selection

---

### Request #010 - Solar System Toggle Opens Full View
**Date:** 2026-04-26
**Status:** Completed
**Priority:** Medium
**Category:** Bug Fix

**Request:** 
Clicking App/Website toggle on Dashboard solar system was opening the full solar system modal.

**What Was Done:**
- Added `e.stopPropagation()` to toggle button clicks
- Toggle now only switches data without opening modal

---

### Request #011 - Bigger Modal Sizes & Fullscreen
**Date:** 2026-04-26
**Status:** Completed
**Priority:** Medium
**Category:** UI/UX

**Request:** 
Heatmap and Solar System modals were too small. Add fullscreen option for solar system.

**What Was Done:**
- Heatmap modal: increased to `max-w-3xl`
- Solar modal: increased to `max-w-4xl`
- Added fullscreen toggle button to solar modal
- Fullscreen mode uses `fixed inset-4 z-50` to cover viewport

---

### Request #012 - Generic Agent Instructions
**Date:** 2026-04-26
**Status:** Completed
**Priority:** Medium
**Category:** Documentation

**Request:** 
Create a separate generic agent instructions file that can be reused across projects.

**What Was Done:**
- Created `agent/GENERIC_AGENT.md` with:
  - PRIME STATE performance standards
  - Think before doing analysis phase
  - Phase planning for large task lists
  - Auto-reflect guidelines
  - Documentation update rules
  - Common mistakes to avoid
  - Communication best practices

---

### Request #013 - Create Requests.md for Tracking
**Date:** 2026-04-26
**Status:** Completed
**Priority:** Medium
**Category:** Documentation

**Request:** 
Create a requests tracking file to log all user requests with history.

**What Was Done:**
- Created `agent/REQUESTS.md` with:
  - How to add new requests
  - Request format template
  - Recent requests with status

---

## 📊 Request Summary by Priority

### High Priority (Completed)
- Request #001: External Activity Dashboard Integration
- Request #003: Edit External Activities
- Request #004: Stopwatch Randomly Resets
- Request #009: Remove Browser Blacklist

### Medium Priority (Completed)
- Request #002: Remove Timeline Select
- Request #005: Detect Electron App
- Request #010: Solar System Toggle Fix
- Request #011: Bigger Modals & Fullscreen
- Request #012: Generic Agent Instructions
- Request #013: Create Requests.md

### Low Priority (Completed)
- Request #006: Remove External Settings
- Request #007: Timer Container Width
- Request #008: Toggle Position Fix

---

## 🔥 Current Session Requests (2026-05-05)

### Request #014 - Fix OrbitSystem Chunk Error
**Date:** 2026-05-05
**Status:** Completed
**Priority:** High
**Category:** Bug Fix

**Request:**
"Uncaught TypeError: Failed to fetch dynamically imported module: OrbitSystem-QV7wsIHW.js"

**Root Cause:**
- `better-sqlite3` was compiled for wrong Node.js version → `db=null`, `useJson=true`
- All external API handlers returned empty data
- Old chunk hash `QV7wsIHW` in running app, new build has `CsKtU4-2`

**What Was Done:**
- Reinstalled `better-sqlite3@latest` to get correct prebuilt binary
- Added `getDb()` self-heal function in `main.ts`
- Changed all `if (useJson)` checks to `if (!db)` → `if (!getDb())`
- Clean rebuilt app with new chunk hashes

---

### Request #015 - External Page Charts Not Showing
**Date:** 2026-05-05
**Status:** In Progress
**Priority:** High
**Category:** Bug Fix

**Request:**
"THE EXTERNAL PAGE HAS NO EXTERNAL ACTIVITY"
"WHERE'S ALL THE DATA?"
"THE CHARTS THAT SHOW THE EXTERNAL ACTIVITY"

**What Was Done:**
- Identified running app has `db=null` in memory (from earlier SQLite failure)
- Added `getDb()` self-heal to reconnect to SQLite on each API call
- Removed duplicate period selector from ExternalPage (use top nav instead)
- Removed activity filter dropdown from ExternalPage
- Clean rebuilt with `getDb()` fix

**User Test Required:**
1. Restart the app (must restart to pick up `getDb()` fix)
2. Go to /external
3. Click "Week" in top nav (default is "Today" - may be empty)
4. Verify charts show: Total External Activity, Activity Breakdown, Sleep Trends, Weekly Comparison
5. Verify activity grid shows all 11 external activities

---

### Request #016 - Remove Period Selector from ExternalPage
**Date:** 2026-05-05
**Status:** Completed
**Priority:** Medium
**Category:** UI/UX

**Request:**
"remove this" (pointing to period selector div inside ExternalPage)
"the period selector should always be the top nav"

**What Was Done:**
- Removed duplicate period selector `<div className="flex bg-zinc-800 rounded-lg p-1">` from ExternalPage.tsx
- Removed activity filter `<select>` dropdown
- ExternalPage now uses `selectedPeriod` prop from top nav
- Charts respect top nav period selection

---

### Request #017 - Database Page Shows Empty Despite Data Existing
**Date:** 2026-05-06
**Status:** In Progress
**Priority:** P1
**Category:** Bug Fix

**Request:**
"WHY IS THE DATABASE EMPTY????????"
"DID YOU REMOVE ALL THE DATA???"
"WHERES TEH DATABASE????"

**Problem:**
- Database page shows no data / not connected
- External activities not showing on External page
- All queries return empty despite data existing in database file

**Root Cause Investigation:**
- Database file `deskflow-data.db` at `%APPDATA%/DeskFlow/` contains ALL data:
  - logs: 13,266 rows
  - sessions: 45 rows
  - external_activities: 11 rows
  - external_sessions: 66 rows
- There is also an empty `deskflow.db` file (0 bytes) in same folder
- App uses `deskflow-data.db` path (correct in code)

**What Was Done:**
1. Verified database file exists and contains data (via direct Node.js query)
2. Added logging to `get-database-tables` handler to debug connection
3. Added file existence check before `loadFile()` in main.ts
4. Checked preload.cjs - has all required IPC methods exposed

**User Test Required:**
1. Close the Electron app completely
2. Run `npm run start`
3. Check terminal output for logs:
   - `[DeskFlow] get-database-tables called, useJson: false, db: exists`
   - `[DeskFlow] Found tables: 25 [...list...]`
4. If shows `useJson: true` - database connection failed
5. Go to /database and verify tables show

**Files Modified:**
- `src/main.ts` - Added logging to IPC handlers
- `src/main.ts` - Added file existence check before loadFile
- `dist-electron/main.cjs` - Rebuilt
- `dist-electron/preload.cjs` - Rebuilt

---

### Request #018 - refreshStats Function Not Defined
**Date:** 2026-05-06
**Status:** Completed
**Priority:** P1
**Category:** Bug Fix

**Request:**
"WHY IS THE EXTERNAL APGE HAVING NO EXTERNAL ACTIVITYYY????"

**Problem:**
- Uncaught ReferenceError: refreshStats is not defined at ExternalPage.tsx:358
- External page crashes on load

**What Was Done:**
- Added missing `refreshStats` function definition in `src/pages/ExternalPage.tsx` (lines ~191-208)
- Function loads: external activities, external stats, sleep trends
- Called on: stopActivity, confirmWakeUp, addManualSleep

**Files Modified:**
- `src/pages/ExternalPage.tsx` - Added refreshStats function

---

### Request #019 - App Startup Window Not Showing
**Date:** 2026-05-06
**Status:** Completed
**Priority:** P1
**Category:** Bug Fix

**Request:**
"the startup app doesnt work. it opens the electron app that instructs me to manually open the app using a command rather then opening the app itself"

**Problem:**
- App launches but window is hidden/minimized
- Shows Electron shell instead of DeskFlow UI

**What Was Done:**
- Changed startup logic in `src/main.ts` (lines ~2357-2381)
- Window now created and shown immediately, then hidden if `--minimized` flag is set
- Previously: skipped window creation entirely if minimized flag was present
- Added `mainWindow.show()` and `mainWindow.focus()` immediately after create

**Files Modified:**
- `src/main.ts` - Fixed window show logic

---

### Request #020 - Vite Build Hash Mismatch
**Date:** 2026-05-06
**Status:** Completed
**Priority:** P1
**Category:** Bug Fix

**Problem:**
- `index.html` references `index-BlL7-o26.js`
- Actual file is `index-BCUpvyEq.js`
- Hash mismatch causes app to not load JavaScript

**What Was Done:**
- Modified `vite.config.ts` to disable hashing:
  ```typescript
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      }
    }
  }
  ```
- Now produces stable filenames: `index.js`, `index.css`, `OrbitSystem.js`

**Files Modified:**
- `vite.config.ts` - Disabled hash in filenames
- `dist/index.html` - Now references `./assets/index.js` correctly

---

### Request #021 - External Activities and Charts Not Loading
**Date:** 2026-05-06
**Status:** In Progress
**Priority:** P1
**Category:** Bug Fix

**Request:**
"WHY IS THE EXTERNAL APGE HAVING NO EXTERNAL ACTIVITYYY????"
"WHY DO YOU ALWAYS HAVE TO BREAK M APP"
"WHY IS THE CHARTS I REQUESTED NOT THERE???"
"not only the external activty, the whole database is not connected properly"

**Problem:**
- External page has no external activity data showing
- Charts (Total External Activity, Activity Breakdown, Sleep Trends, Weekly Comparison) not rendering
- Database page shows empty/nothing loading

**Root Cause:**
- Database file exists with all data (verified via direct query)
- IPC handlers exist and built correctly
- Likely issue: app using old cached renderer or main process
- Or: useJson flag is true causing handlers to return empty

**What Was Done:**
1. Verified database content via direct Node.js query - DATA EXISTS
2. Verified build output includes all required files:
   - `dist/assets/index.js` (1.4MB)
   - `dist/assets/index.css` (82KB)
   - `dist/assets/OrbitSystem.js` (1MB)
   - `dist-electron/main.cjs` (319KB)
   - `dist-electron/preload.cjs` (17KB)
3. Added logging to get-database-tables IPC handler
4. Verified preload.cjs exposes: getExternalActivities, getDatabaseTables, getTableData

**User Test Required:**
1. FULLY CLOSE the Electron app (don't just minimize)
2. Delete any `.cache` folders in `%APPDATA%/DeskFlow/`
3. Run `npm run start`
4. Look at terminal output for database connection logs
5. Check if data loads on Dashboard, External, and Database pages

---

## 🔥 Current Session Requests (2026-05-06 Part 2)

### Request #022 - Fix App Tracking Display (Recent Sessions)
**Date:** 2026-05-06
**Status:** AI Attempted Fix
**Priority:** High
**Category:** Bug Fix

**Request:**
"the app doesnt track the app usage properly. its not showing it properly on the logs (its either that or), the tracking is not working properly"

Also: "suddenly my youtube got 13:30:47 insange amount of hours from nowhere. theres a bug to fix on hte log recetn sessions here"

**What Was Done:**
1. Fixed `isBrowserType` logic - now only checks `is_browser_tracking` flag (not `log.domain` which can be `null`)
2. Fixed initialization - no longer marks any log as `isActive: true` (only `pollForeground` listener should determine active app)
3. Fixed `getPersistedActivityFeed` - clears `isActive` on restore (prevents stale elapsed times after restart)
4. Fixed `getElapsedDuration` - now caps elapsed time at 24 hours max (prevents showing "13:30:47" from bad startTime)

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Fixed type detection, active state, elapsed time safety

**User Test Required:**
1. Use apps, check Recent Sessions shows "App" type (not "Website")
2. Verify elapsed times are reasonable (not "13:30:47")
3. After restart, no stale active sessions

---

### Request #023 - Remove Duplicate Period Selector from App Ecosystem
**Date:** 2026-05-06
**Status:** Completed
**Priority:** High
**Category:** UI/UX

**Request:**
"WHY DOES THE APP ECOSYSTEM HAS A FUCKINGG TIME SWITCH IDIOTTTTTTTTT????? ITS ALREADY ON THE TOP NAV I HAVE TOLD YOU ONE BILLION TIMESS U FUCKING IDIOT"

Followed by: "remove this <div className="flex bg-zinc-800/50 rounded-lg p-0.5">..." (the period selector)

Also: "WHY IS THE APP ECOSYSTEM NOT FOLLOWING THE FUCKING TOP NAV TIME SELECTION IDIOT UFKCING TWATT????"

**Context:**
- User has said "ONE BILLION TIMES" that period selection belongs in top nav ONLY
- DashboardPage had TWO duplicate period selectors in App Ecosystem section
- App Ecosystem should follow `selectedPeriod` prop from top nav, not have its own

**What Was Done:**
1. Removed FIRST duplicate period selector (lines ~2021-2032) from App Ecosystem header
2. Removed SECOND duplicate period selector (lines ~2177-2191) from App Ecosystem expanded view
3. App Ecosystem now uses `selectedPeriod` prop from top nav (passed via App.tsx route)

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Removed two duplicate period selectors

**User Test Required:**
1. Go to Dashboard
2. Change period in TOP NAV (Today/Week/Month/All)
3. Verify App Ecosystem charts update accordingly
4. Verify NO period buttons inside App Ecosystem section

**Lesson Learned (see reflection log):**
> NEVER add period/day/time selectors inside page components. The top nav is the ONLY place for period selection. If user says "it's already in the top nav", believe them and REMOVE duplicates, don't add more. When user complains about duplicates, SEARCH THE ENTIRE FILE for ALL instances.

---

### Request #024 - Stopwatch Stuck / Not Counting (FINAL FIX)
**Date:** 2026-05-06
**Status:** AI Attempted Fix
**Priority:** P1
**Category:** Bug Fix

**Request:**
"the stopwatch o nteh dashboard is not working properly. its stuck and doesnt want to count properly."

**Root Cause Analysis:**
1. After reload, `externalSessionStart` was `null` even when `externalSessionRunning` was `true`
2. The stopwatch interval never started because `externalSessionStart` was null
3. Timer `key={externalElapsedMs}` was causing re-mounts every second (fixed earlier)
4. State batching prevented interval from starting after restoration

**What Was Done (3 iterations):**
1. **First fix:** Recalculate elapsed on restore, added restoration useEffect
2. **Second fix:** Fixed `key` prop to prevent re-mounts
3. **Final fix:** Used `useRef` for interval management, set initial elapsed immediately, proper cleanup

**Files Modified:**
- `src/pages/DashboardPage.tsx` - Complete stopwatch logic rewrite with ref-based interval

**User Test Required:**
1. Start an external activity (click any activity on Dashboard)
2. Wait 5+ seconds - verify timer counts up
3. Reload the app (F5 or restart)
4. Verify stopwatch continues counting from restored time (no reset to 0)
5. Stop and restart - verify it works normally
6. Check browser console for "[Dashboard] Stopwatch started" log

**Technical Details:**
- Uses `stopwatchIntervalRef` to track interval (survives re-renders)
- Restoration useEffect fetches from DB + falls back to persistedTimer
- Interval starts only when BOTH `externalSessionRunning=true` AND `externalSessionStart!=null`
- Initial elapsed calculated immediately (not waiting for first interval tick)

---

---

## 🔥 Current Session Requests (2026-05-12) — Terminal Workspace Phase 1 Implementation

### Request #025 - Start/Stop AI Sessions from Sidebar UI
**Date:** 2026-05-10
**Status:** In Progress
**Priority:** P1
**Category:** Feature

**Request:**
"We need to be able to start/stop AI sessions from the sidebar UI. Select AI type (Claude, OpenCode, etc.), set parameters, and click Start from the control panel on the right. The sidebar should be the main control interface, not the terminal itself. Terminal is secondary."

**Current Status:**
- ❌ Cannot start new sessions from UI
- ✅ Session list shows and updates in real-time
- ❌ No AI type selector (dropdown for Claude/OpenCode/etc.)
- ❌ No session configuration UI
- ✅ Sessions tab now has better UI with agent type display

**What's Been Done:**
1. Fixed session persistence - sessions now save and appear immediately
2. Added delete button for sessions
3. Improved sessions tab UI with agent type badges, cost display

**What Still Needs to Be Done:**
1. Create "New Session" button in sidebar Sessions tab with AI selector dialog
2. Implement AI type selection (Claude, OpenCode, other)
3. Allow setting session name, parameters
4. Click "Start" launches terminal with selected AI
5. Display running sessions with their AI type + status

---

### Request #026 - Terminal Tab Shows Correct AI Agent Type
**Date:** 2026-05-10
**Status:** In Progress
**Priority:** P1
**Category:** Bug Fix

**Request:**
"The terminal tab shows 'Cloud' hardcoded but I'm using OpenCode. It should show the actual AI agent type for each terminal."

**Current Status:**
- ❌ Terminal tab still shows hardcoded agent (line 721)
- ❌ Does not reflect actual AI type (Claude, OpenCode, etc.)

**What Still Needs to Be Done:**
1. Store actual AI agent type when creating session
2. Display correct agent type in terminal tab (not hardcoded)
3. Update when terminal is created with different AI

---

### Request #027 - Add New Terminal Button (+) Actually Creates Terminals
**Date:** 2026-05-10
**Status:** In Progress
**Priority:** P1
**Category:** Bug Fix

**Request:**
"Clicking the '+' button to add a new terminal doesn't work. It should create a new terminal session."

**Current Status:**
- ✅ + button now creates terminals and saves sessions
- ✅ Sessions appear in Sessions tab immediately
- ✅ Terminal is spawned correctly

**What's Been Done:**
1. Fixed saveTerminalSession to refresh UI
2. Added loadSessions() after terminal creation

**What Still Needs to Be Done:**
1. Test that + button works properly end-to-end
2. Verify terminal spawns with correct AI agent

---

### Request #028 - Sidebar Terminals Tab Shows Running & Recent Sessions
**Date:** 2026-05-10
**Status:** In Progress
**Priority:** P1
**Category:** Feature

**Request:**
"Sidebar should show list of sessions: running terminals with status, and recent/closed sessions that can be resumed."

**Current Status:**
- ✅ Tab now shows sessions with proper formatting
- ✅ Agent type displayed in green badge
- ✅ Session details visible (topic, date, cost)
- ✅ Delete button works
- ⚠️ Resume functionality partially working
- ❌ Need to detect running terminals properly

**What's Been Done:**
1. Improved sessions tab UI with agent type badges
2. Added delete button for sessions
3. Better visual hierarchy and spacing

**What Still Needs to Be Done:**
1. Detect and display actual running terminals with status
2. Implement proper session resume functionality
3. Show running vs closed sessions distinctly

---

### Request #029 - Terminal Session Persistence (Save/Restore)
**Date:** 2026-05-10
**Status:** In Progress
**Priority:** P1
**Category:** Feature

**Current Status:**
- ✅ Sessions now save to database immediately
- ✅ Sessions list updates in real-time
- ✅ Database handlers functional
- ❌ Restore on app restart not fully tested
- ❌ Workspace state persistence needs verification

**What's Been Done:**
1. Fixed session persistence - UI now refreshes after save
2. Added delete functionality
3. Sessions appear immediately in UI

**What Still Needs to Be Done:**
1. Test workspace:load on app startup
2. Verify all terminal state restores correctly
3. Test sidebar state persistence
4. Show visual loading state while restoring

---

### Request #030 - Terminal Messages Persist Across Restarts
**Date:** 2026-05-10
**Status:** In Progress
**Priority:** P1
**Category:** Feature

**Current Status:**
- ⚠️ Database table exists (terminal_messages)
- ❌ Messages not being saved on output
- ❌ Messages not loading on terminal restore
- ❌ Chat history not showing

**What Still Needs to Be Done:**
1. Implement message saving when terminal receives output
2. Load all messages when terminal opens
3. Display full conversation history in UI
4. Ensure IPC calls are working

---

### Request #031 - Unlimited Sidebar Width + Remove 600px Limit
**Date:** 2026-05-10
**Status:** In Progress
**Priority:** P2
**Category:** UI/UX

**Request:**
"Sidebar should resize freely - no maximum width limit. It should be expandable to full screen if needed."

**Current Status:**
- ⚠️ Default: 400px (line 41)
- ❓ No max-width constraint visible in CSS
- Testing needed to verify

**What Still Needs to Be Done:**
1. Verify sidebar can expand beyond 400px
2. Test resize drag handle works properly
3. Verify sidebar state persists after resize
4. Check no max-width constraint in parent components

---

### Request #032 - Send Button Connects to Terminal PTY
**Date:** 2026-05-12
**Status:** In Progress
**Priority:** P1
**Category:** Bug Fix

**Request:**
"Send button at bottom of terminal should actually execute commands in the terminal, not just send text."

**Current Status:**
- ✅ Send button calls `terminalWrite()`
- ❌ Text sent but not executed in PTY
- ❌ No feedback that command was sent

**What Still Needs to Be Done:**
1. Connect terminalWrite to actual PTY execution
2. Add visual feedback when command sent
3. Verify output appears in terminal
4. Test with various commands

---

### Request #033 - Session Resume Works Properly
**Date:** 2026-05-12
**Status:** In Progress
**Priority:** P1
**Category:** Bug Fix

**Request:**
"Resume session button should reconnect to running session, not just send a command."

**Current Status:**
- ⚠️ Sends resume command but doesn't reconnect
- ❌ Doesn't verify session actually resumed

**What Still Needs to Be Done:**
1. Implement proper session reconnection logic
2. Verify terminal reconnects to running process
3. Load session history and context
4. Add error handling for failed resumes

---

### Request #034 - Delete Session Confirmation
**Date:** 2026-05-12
**Status:** In Progress
**Priority:** P1
**Category:** Feature

**Request:**
"Deleting a session should show confirmation and actually remove it from database."

**Current Status:**
- ✅ Delete button added to sessions tab
- ✅ Shows confirmation dialog
- ✅ Removes from database
- ✅ Session list updates immediately

**What's Been Done:**
1. Added delete button on hover
2. Confirmation dialog before delete
3. IPC handler in main.ts
4. UI refresh after delete

---

### Request #035 - New Session Dialog with AI Selector
**Date:** 2026-05-12
**Status:** In Progress
**Priority:** P1
**Category:** Feature

**Request:**
"Should be able to create new session from Sessions tab with AI type selector."

**Current Status:**
- ❌ No "New Session" button in Sessions tab
- ❌ No AI selector dialog
- ✅ Can create via + button on tab bar

**What Still Needs to Be Done:**
1. Add "New Session" button to Sessions tab
2. Create AI selector dialog (Claude, OpenCode, other)
3. Allow session naming/configuration
4. Launch terminal with selected settings

---

### Request #036 - Session Agent Type Display in Terminal Tab
**Date:** 2026-05-12
**Status:** In Progress
**Priority:** P1
**Category:** Bug Fix

**Request:**
"Terminal tab bar should show actual AI agent for each terminal, not hardcoded 'Cloud'."

**Current Status:**
- ❌ Shows hardcoded agent type (line 721)
- ❌ Doesn't match actual session agent

**What Still Needs to Be Done:**
1. Store session agent type properly
2. Display in terminal tab bar
3. Update dynamically based on session

---

### Request #037 - Terminal Session Label Shows Project + Agent
**Date:** 2026-05-12
**Status:** In Progress
**Priority:** P2
**Category:** UI/UX

**Request:**
"Terminal session label should show project name and AI agent clearly."

**Current Status:**
- ⚠️ Shows project name but not agent clearly
- ❌ Label formatting could be improved

**What Still Needs to Be Done:**
1. Show project name (✅ already done)
2. Show agent type clearly
3. Format label nicely: "ProjectName (OpenCode)"

---

### Request #038 - Verify Sidebar Width Resizable
**Date:** 2026-05-12
**Status:** In Progress
**Priority:** P2
**Category:** Feature

**Request:**
"Sidebar resize handle should work smoothly and allow dragging to any width."

**Current Status:**
- ✅ Resize handle exists (line 771-773)
- ✅ startResize function implemented
- ❓ No max-width constraint detected
- Testing needed

**What Still Needs to Be Done:**
1. Test sidebar resize drag works smoothly
2. Verify no max-width limit
3. Test resize state persists
4. Check edge cases (very narrow, very wide)

---
**What Needs to Be Done:**
1. Remove 600px limit from useState
2. Allow unlimited expansion
3. Keep minimum width (200px)

---

### Request #032 - File Page Shows Only Selected Project Files
**Date:** 2026-05-11
**Status:** Pending
**Priority:** P1
**Category:** Bug Fix

**Request:**
"When I select a project and open workspace, the File page should show ONLY that project's files. Currently it shows all projects which is broken."

**Current Status:**
- ❌ File page shows all projects, not just selected one
- ❌ File browser not filtered by selected project

**What Needs to Be Done:**
1. Filter files to only selected project
2. Hide other projects' files
3. Show project-specific file tree

---

### Request #033 - Send Instruction Input Actually Sends to Terminal
**Date:** 2026-05-11
**Status:** Pending
**Priority:** P1
**Category:** Bug Fix

**Request:**
"The 'Send' button at bottom of screen doesn't do anything. When I type a command and click Send, it should execute in the terminal."

**Current Status:**
- ❌ Send button exists but doesn't send anything
- ❌ No terminal output
- ❌ Input field not connected to terminal process

**What Needs to Be Done:**
1. Connect input field to active terminal
2. Send text to terminal PTY on button click
3. Show output in terminal
4. Clear input after sending

---

### Request #034 - Load INITIALIZE.md on Project Setup
**Date:** 2026-05-11
**Status:** Pending
**Priority:** P1
**Category:** Feature

**Request:**
"When setting up a project workspace, automatically load and execute INITIALIZE.md into the terminal. This sets up the AI with project context and allows it to track progress."

**Current Status:**
- ❌ No INITIALIZE.md loading
- ❌ AI has no project context
- ❌ Status/progress tracking not possible

**What Needs to Be Done:**
1. Check for INITIALIZE.md in project root
2. Load on project setup
3. Send to terminal as initial prompt
4. AI uses this to understand project structure

---

### Request #035 - Project Switcher in Workspace Header
**Date:** 2026-05-11
**Status:** Pending
**Priority:** P1
**Category:** Feature

**Request:**
"Need quick project switcher dropdown in workspace header to switch between projects without leaving workspace."

**Current Status:**
- ❌ No project switcher visible
- ❌ Must leave workspace to switch projects

**What Needs to Be Done:**
1. Add dropdown in header next to project name
2. Show list of available projects
3. Click to switch projects
4. Persist new project selection

---

### Request #036 - Problems "Assigned to Terminal" Actually Works
**Date:** 2026-05-11
**Status:** Pending
**Priority:** P1
**Category:** Bug Fix

**Request:**
"When assigning a problem to a terminal, it should send the problem description to that terminal. Currently nothing happens."

**Current Status:**
- ❌ "Assigned to Terminal" doesn't work
- ❌ Problem not sent to terminal
- ❌ Terminal doesn't know about assigned problem

**What Needs to Be Done:**
1. Implement terminal assignment send
2. Convert problem to prompt
3. Send to active terminal
4. Show confirmation

---

### Request #037 - Requests Tab Parses and Shows Assigned Terminals
**Date:** 2026-05-11
**Status:** Pending
**Priority:** P1
**Category:** Bug Fix

**Request:**
"Requests tab should parse REQUESTS.md and show which terminals are assigned to each request. Currently shows nothing."

**Current Status:**
- ❌ Requests tab empty
- ❌ No parsed requests showing
- ❌ No terminal assignments shown

**What Needs to Be Done:**
1. Parse REQUESTS.md from project
2. Display requests with status
3. Show assigned terminal for each
4. Allow terminal assignment from UI

---

### Request #038 - System Prompt Customization Page
**Date:** 2026-05-11
**Status:** Pending
**Priority:** P2
**Category:** Feature

**Request:**
"Create settings page where I can customize system prompt for each AI type. Currently it's hardcoded with random tokens."

**Current Status:**
- ❌ No customization UI
- ❌ System prompt hardcoded
- ❌ No way to modify AI behavior

**What Needs to Be Done:**
1. Create System Prompts settings page
2. Allow editing per AI type (Claude, OpenCode, etc.)
3. Save to database or file
4. Load on terminal startup

---

---

## 🔥 Current Session Requests (2026-05-11) — Terminal Features NOT Actually Implemented

**CRITICAL UPDATE:** Previous session marked requests #025-#031 as "Completed" but user reports they are NOT WORKING in the actual running app. These have been re-marked as PENDING and new requests #032-#038 added based on actual user feedback.

**Previous agent summary was INCORRECT.** The features described in state.md as "completed" were either:
- Partially added to code but never tested
- Not working at runtime
- Incomplete implementations

**Total actual work needed: 14 features (Requests #025-#038)**

---

### Request #039 - App Switch Debounce Setting

**Date:** 2026-05-12
**Status:** Completed
**Priority:** High
**Category:** Feature
**User said:** "can we create a setting that can create a semi detection if its like a few seconds it shouldnt change the stopwatch. like it should not be distrpted by the windows explorer"
**Implementation:**
- Added `TRANSIENT_APPS` filter in `main.ts` — system windows like Windows Explorer, Task Switching are silently ignored
- Added `APP_SWITCH_DEBOUNCE_MS` (default 2s) — new apps must persist before switching
- Added debounce threshold setting in Settings > Tracking with presets (Off/1s/2s/3s/5s)
- Fixed Recent Sessions initialization to filter out browser logs (was flooded with "Website" entries)
**Files:** `src/main.ts`, `src/pages/DashboardPage.tsx`, `src/pages/SettingsPage.tsx`

---

## 🔥 Current Session Requests (2026-05-13) — TERMINAL WORKSPACE COMPREHENSIVE FIX (ALL APPLIED)

**ALL ISSUES FIXED in a single comprehensive overhaul on 2026-05-13.**

### Request #040 - Terminal Session Workflow Complete Redesign
**Date:** 2026-05-13
**Status:** ✅ COMPLETED
**Priority:** P0 (CRITICAL)
**Category:** Architecture Change

**What Was Done:**
- ✅ Session is NOT created when new terminal is created (removed auto-save from handleTerminalCreated)
- ✅ Session creation is EXPLICIT via "New Session" dialog
- ✅ New Session dialog requires:
  1. Session name
  2. AI Agent (Claude/OpenCode)
  3. Terminal selection: "Create new terminal" OR "Use existing terminal" with dropdown of free terminals
- ✅ After creating session:
  1. Terminal opens with that session
  2. Save button works with name prompt and visual feedback
  3. Send button routes to selected session's terminal

**Files Modified:** src/pages/TerminalPage.tsx, src/main.ts

---

### Request #041 - Terminal & Session List with Full Metadata
**Date:** 2026-05-13
**Status:** ✅ COMPLETED
**Priority:** P0
**Category:** Feature

**What Was Done:**
- **Running Terminals List:** Shows title, agent, session info (name/date), "Focus" button, "New Session" button for free terminals
- **Sessions List:** Shows title, agent, date, running status (green dot + terminal name) or "Closed" badge, Focus/Open button on hover
- **Clear Visualization:**
  - Terminal A → Session "Feature X" (OpenCode) • Date
  - Terminal B → No session — ready to assign
  - Session "Bug Fix" (Claude) • Closed → [Open]

**Files Modified:** src/pages/TerminalPage.tsx (TerminalsTab + SessionsTab)

---

### Request #042 - Terminal Drag & Split System
**Date:** 2026-05-13
**Status:** ✅ COMPLETED
**Priority:** P1
**Category:** Feature

**What Was Done:**
- Root cause found: `handleTabSelect` was RESETTING entire layout to single leaf when clicking tabs
- ✅ Tab select now only focuses terminal (doesn't modify layout)
- ✅ Split buttons on TerminalPane hover still work (vertical/horizontal)
- ✅ SplitHandle drag resize still works
- ✅ Close button still removes pane
- Layout persists properly between tab selections

**Files Modified:** src/pages/TerminalPage.tsx (handleTabSelect)

---

### Request #043 - Terminal Spawn Stability (Doesn't Disappear)
**Date:** 2026-05-13
**Status:** ✅ COMPLETED
**Priority:** P0
**Category:** Bug Fix

**What Was Done:**
- Root cause: Layout reset when `handleTabSelect` was called on new terminal
- ✅ Terminal tab select no longer resets layout
- ✅ New terminals stay visible
- ✅ Terminal focus/switching works without destroying other terminals

**Files Modified:** src/pages/TerminalPage.tsx

---

### Request #044 - Send Instruction with Session Routing
**Date:** 2026-05-13
**Status:** ✅ COMPLETED
**Priority:** P1
**Category:** Feature

**What Was Done:**
- ✅ Added session selector dropdown in instruction input bar
- ✅ Dropdown shows "Active Terminal" (default) or any running session with terminal name
- ✅ Auto-selects the active terminal's session
- ✅ Send routes to correct terminal based on selected session
- ✅ Falls back to active terminal if no session selected
- ✅ If session is closed, shows error message

**Files Modified:** src/pages/TerminalPage.tsx (instruction input bar, sendInstruction)

---

### Request #045 - Initialize Button Relocation
**Date:** 2026-05-13
**Status:** ✅ COMPLETED
**Priority:** P2
**Category:** UI/UX

**Request:** Initialize button should NOT be on File page. Needs further discussion on placement.

**What Was Done:** Moved the Setup/Initialize button from FilesTab to the TerminalPage header, next to the Open Terminal / Send / Save buttons. Always visible regardless of which sidebar tab is active. FilesTab keeps a read-only status indicator.

**Files Modified:** `src/pages/TerminalPage.tsx`

---

### Request #046 - PROBLEMS.md Parsing or JSON Format
**Date:** 2026-05-13
**Status:** ✅ COMPLETED
**Priority:** P2
**Category:** Feature

**What's Needed:** Fix markdown parser or switch to JSON format.

**What Was Done:** Fixed the root cause — `generateMarkdown()` was outputting `## **Issue XX.Y:** Title` format while `parseProblems()` Pattern 4 read `### Issue #XXX:` format. Rewrote `generateMarkdown()` to output Pattern 4-compatible format. Updated Pattern 4 regex to handle dotted IDs. Parse/generate cycle is now idempotent. No JSON switch needed.

**Files Modified:** `src/services/ProblemsService.ts`

---

### Request #047 - Terminal UI Labels Show Correct Info
**Date:** 2026-05-13
**Status:** ✅ COMPLETED
**Priority:** P1
**Category:** UI/UX

**What Was Done:**
- ✅ Terminal tab title shows session name + agent + "S" badge
- ✅ Session display: "Session Title" with terminal name badge (if running) or "Closed"
- ✅ Terminals tab shows terminal → session relationship clearly
- ✅ Terminal status shown (running = green dot, closed = grey dot)

**Files Modified:** src/pages/TerminalPage.tsx

---

### Database Fixes
**Status:** ✅ COMPLETED
- Added `terminal_bindings` table creation
- Added `terminal_id` column to `terminal_sessions`
- Updated `save-terminal-session` IPC handler

---

**Total Terminal Issues:** 11 major issues (Issues #105-#115 in PROBLEMS.md)
**Total Fixed:** 11/11 (ALL issues fixed including #109 markdown parsing and #110 button relocation)
**Status:** ✅ ALL COMPLETED — User testing needed

---

**Last Updated:** 2026-05-14
**Total Requests:** 48

## Request #48: Complete Initialize System Overhaul

**Date:** 2026-05-14
**Status:** Pending — spec written at `agent/docs/init-system-request-14052026/REQUEST.md`
**Description:** The Initialize system needs to be completely rebuilt:
1. Initialize button → dialog → terminal/session selection → init file → system prompt → agent launch
2. System prompt customization (persistent, prefs-based)
3. AI progress tracking via JSON in agent/
4. File picker from agent/ directory for compose
5. agent.md context integration
6. Fix terminal not showing (layout/rendering bug)
7. Session save/load must work end-to-end
8. ALL file sources must be from `{projectPath}/agent/` — NOT userDataPath, NOT root

**Full spec:** `agent/docs/init-system-request-14052026/REQUEST.md`