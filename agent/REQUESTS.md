# 📋 User Requests Log

**Purpose:** Track all user requests, their status, and history. This ensures nothing is forgotten and provides context for future sessions.

---

## 📝 How to Use This File

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

**Last Updated:** 2026-05-06
**Total Requests:** 24