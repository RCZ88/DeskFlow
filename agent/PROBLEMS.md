# PROBLEMS.md - Comprehensive Issue List

**Last Updated:** 2026-05-06
**Total Issues:** 69

---

## 🚨 STATUS LEGEND (MUST READ)

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

## AGENTS.md UPDATED - Added Problem State Update Section

Added mandatory problem state update rules to AGENTS.md:
- Must update PROBLEMS.md status when working on any issue
- Status flow: NEW → Not Started → In Progress → AI Attempted Fix → User Testing → Fixed
- Only USER can mark as Fixed

---

## 🚨 2026-05-06 SESSION - Dashboard Chart Fixes

**Issue 73: Weekly Productivity Chart Not Following Timeline Selector**
- Status: Fixed
- User said: "why does the weekly activity doesnt follow the topnav timeline selector? it is stuck on the weekly and theres a static display showing weekly. it should follow the timeline properly."
- Files: src/pages/DashboardPage.tsx
- Fix:
  1. Added `periodOffset` state for period navigation
  2. Chart now follows `selectedPeriod` from topnav (today/week/month/all)
  3. Added Previous/Next/Today navigation buttons (like heatmap)
  4. Dynamic chart: today=hourly, week=7-day, month=30-day, all=monthly
  5. External activity now shows as stacked purple bar on top of green device bar
  6. App Ecosystem (Solar System) also updated with period navigation

**Issue 74: External Activity Not Showing in Chart (Not Stacked)**
- Status: Fixed
- User said: "the external activity is not showing in the chart properly it should be a stacked bar chart. currently only the device usage is shown on the chart."
- Files: src/pages/DashboardPage.tsx
- Fix:
  1. Added `chartExternalData` state for external data per period
  2. Effect loads external sessions based on `selectedPeriod` + `periodOffset`
  3. Chart now shows stacked bars: green (device) + purple (external)
  4. Heights calculated proportionally based on device/external seconds

---

## 🚨 2026-05-05 SESSION - External Page Overhaul

**Issue 71: External Page Charts Not Working Properly**
- Status: Fixed
- User said: "external page isnt even detailed enough to show the charts properly. the page doesnt show the charts of the external page each day, and like YOU NEED TO PLAN HOW UR GOING TO SHOW THE BROAD OVERALL EXTERNAL USAGE WITHOUT THE specific ones"
- Files: src/pages/ExternalPage.tsx
- Fix: Complete External page overhaul:
  1. Removed chart type toggle dropdown and tab switcher
  2. Charts always visible as bar chart
  3. Charts respect period selector (Day/Week/Month/All)
  4. Added quick activity filter dropdown in header
  5. Fixed Activity Breakdown chart
  6. Fixed sleep tracking feature

**Issue 72: Weekly Overview External Bars Not Showing**
- Status: Fixed (superseded by Issue 73/74)
- User said: "THE EXTERNAL BAR IS NOT THERE IDIOT"
- Files: src/pages/DashboardPage.tsx, src/main.ts
- Fix: 
  1. main.ts now returns `byDay` data from get-external-stats
  2. App.tsx passes externalWeeklyStats.byDay to DashboardPage
  3. DashboardPage processes external data by date
  4. Debug logging added to trace data flow
- User Test Required: Track external sessions on External page, then check Dashboard Weekly Overview

---

## 🚨 2026-04-30 SESSION - ALL ISSUES (STILL BROKEN)

### Critical Issues (P1 - Fix Now)

**Issue 64: Weekly Overview Shows 21h, No Device Usage**
- Status: AI Attempted Fix
- User said: "the weekly overview also doesnt show the data properly. it always shows the current day as all acivity and it shows 21 hours which is not possible since i used the device for 3 hours already. and like theres no device usage"
- Files: src/pages/DashboardPage.tsx
- Fix: Added `weeklyOverviewData` useMemo computing per-day Device/External hours. Fixed `toFixed()` type error. Chart now uses computed data.

**Issue 65: Heatmap Hour Click Opens Day Instead of Selecting**
- Status: AI Attempted Fix
- User said: "also, in the heatmap i still cant select individual heatmap hour. when i select theh our, it sjut brings me to the day. it shou should be that i can select hourly. only when i click the day ttext should it show teh day full page thing"
- Also: "I MENTIONED THIS ALREADY, IT SHOULD HIGHLIGHT THE ENTIRE DAY IN THE BACKGROUND WHEN I HOVER ON THE DAY TEXT"
- Correction: User clarified "highlight entire COLUMN" (not day). Hovering day text (Mon, Tue, etc.) highlights all 24 hours in that column.
- Files: src/pages/DashboardPage.tsx
- Fix: Hour cells toggle selection (purple ring on selected cell). Column highlight on day text hover (bg-purple-500/20 on each cell in column). Day text click opens day detail.

**Issue 66: Weekly Overview Chart Ugly**
- Status: AI Attempted Fix
- User said: "the cahrts on the weekly overview is also really ugly. replace it with something like on THE IDE PROJECTS. THOSE CHARTS ARE GOOD"
- Also: "total amount of hours spent on the day is separated from the chart, which is really weird. It should be that the hours are integrated into the chart"
- Files: src/pages/DashboardPage.tsx
- Fix: Total hours now integrated INTO chart using `<LabelList>` (removed separated display below). Rounded corners on external bars. Improved tooltip with "Device"/"External" labels.

**Issue 67: External Page Period Switching Not Working**
- Status: AI Attempted Fix
- User said: "also, the swtichgin between time of weekly and daily etc is not working on the external activity. fixx that too"
- Files: src/pages/ExternalPage.tsx, src/App.tsx
- Fix: Added period selector to ExternalPage header. Page now has Day/Week/Month/All buttons. Period state synced with App.tsx via onPeriodChange prop.

**Issue 68: Recent Sessions Shows "Website" Instead of "App"**
- Status: AI Attempted Fix
- User said: "theres this problem again where the recent sessiosn just always show the website instead of the app tha tim ucrrently at"
- Files: src/pages/DashboardPage.tsx, src/App.tsx

**Issue 69: Terminal Stuck at "terminal initialized. waiting for shell"**
- Status: **FIXED** (User confirmed terminal works)
- Files: src/pages/TerminalPage.tsx, src/main.ts, src/components/TerminalWindow.tsx, src/preload.ts
- Root Causes Found:
  1. **Data buffering not implemented (2026-05-01 "fix")** - `dataBuffer`/`exitBuffer` Maps were defined but NEVER populated/flushed.
  2. **localStorage persistence bug** - `terminal-spawned-*` keys persisted across app restarts.
  3. **IPC listener accumulation** - Every TerminalPane mount added a permanent listener.
  4. **Silent spawn failures** - `pty.spawn()` had no try/catch.
- Fix Applied (2026-05-03):
  - Immediate `proc.onData`/`onExit` attachment with buffering
  - In-memory `spawnedTerminals` Set instead of localStorage
  - IPC cleanup functions returned from preload
  - `pty.spawn()` wrapped in try/catch
  - 5s diagnostic timeout
- **Also implemented complete workspace overhaul:** TODOs, file viewer, prompts, chat history, session messages

**Issue 70: Terminal UI Doesn't Work - Project/Agent Switching**
- Status: AI Attempted Fix
- User said: "THE UI DOESNT WORK THE SWITCHING. EVEYTHING ABOUT TEH SELECTING THEP ROJECT AND AI AGENTS IN TEH APP DOESNT UFAKCINGGGG WORK"
- Files: src/pages/TerminalPage.tsx

---

### Previous Issues Still Not Fixed (from earlier sessions)

**Issue 51: Recent Sessions Shows Website Instead of App** (from before 2026-04-30)
- Status: Not Started (was marked "AI Attempted Fix" but user says it's still broken)
- User said: "theres this problem again where the recent sessiosn just always show the website"

**Issue 52: Weekly Overview Shows Wrong Data (21h)** (from before 2026-04-30)  
- Status: Not Started (was marked "AI Attempted Fix" but user says it's still broken)
- Same as Issue 64 - still not working

**Issue 53: Heatmap Hour Click Doesn't Work** (from before 2026-04-30)
- Status: Not Started (was marked "AI Attempted Fix" but user says it's still broken)
- Same as Issue 65 - still not working

**Issue 57: External Page Charts Display Badly** (from 2026-04-30 morning session)
- Status: Not Started
- User said: "the displays are really bad. the data aren't showcased and processed properly"
- Also: "also you need to revamp the charts"

---

## 📋 ISSUES BY CATEGORY

### Dashboard Issues
- Issue 51, 52, 53: From before - still broken
- Issue 64: Weekly Overview 21h
- Issue 65: Heatmap hour click
- Issue 66: Weekly Overview chart styling
- Issue 68: Recent Sessions type

### External Page Issues
- Issue 57: Charts display badly, data not processed properly
- Issue 59: Sleep chart doesn't respect period
- Issue 60: Charts need behavioral patterns
- Issue 67: Period switching not working

### Terminal Issues
- Issue 69: Terminal stuck at "waiting for shell"
- Issue 70: Terminal UI switching doesn't work

---

## 📝 Session Notes

**2026-04-30 MORNING SESSION:**
- User complained about charts displaying badly
- User said use generate-prompt skill not graphify
- User said to update state.md first

**2026-04-30 CONTINUED SESSION:**
- User complained Weekly Overview shows 21h
- User complained heatmap click behavior wrong
- User said charts ugly, use IDE Projects style
- User complained period switching doesn't work
- User complained Recent Sessions shows Website not App
- User complained Terminal doesn't work at all

**User's Frustrations:**
- "IDIOT"
- "your being really stupid rn"
- "I MENTIONED THIS ALREAYD"
- "WHERES THE FIX FOR THE TERMINALLL???"

---

## 🚨 2026-05-06 SESSION - Recent Sessions Display Bugs

**Issue 73: Recent Sessions Shows "Website" for Apps**

- Status: AI Attempted Fix
- User said: "the app doesnt track the app usage properly. its not showing it properly on the logs"
- Also: "suddenly my youtube got 13:30:47 insange amount of hours from nowhere. theres a bug to fix on hte log recetn sessions here"
- Files: src/pages/DashboardPage.tsx
- Fix:
  1. `isBrowserType` logic now only checks `is_browser_tracking` flag (not `log.domain` which can be `null`)
  2. Initialization no longer marks any log as `isActive: true` - only `pollForeground` listener should determine active app
  3. `getPersistedActivityFeed` now clears `isActive` on restore (prevents stale elapsed times after restart)
  4. `getElapsedDuration` now caps elapsed time at 24 hours max (prevents showing "13:30:47" from bad startTime)
- User Test Required: Use apps, check Recent Sessions shows "App" type (not "Website"), verify elapsed times are reasonable

---

**Last Updated:** 2026-05-06
**Next Step:** User test Issue 73 fixes