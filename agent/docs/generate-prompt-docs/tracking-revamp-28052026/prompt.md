# Prompt: DeskFlow Tracking System Overhaul

## Task

Overhaul the DeskFlow app tracking system to reliably detect all desktop apps including games in exclusive fullscreen (Forza, Horus), ensure website tracking only fires when the browser is the focused foreground window, and fix sleep/activity data display issues.

## Context

Full system context is in: `agent/docs/tracking-revamp-28052026/CONTEXT_BUNDLE.md`
State: `agent/state.md`

## What Has Been Done So Far

1. **PowerShell fallback** (`main.ts:2370+`): When `active-win` returns null, falls back to Win32 API via PowerShell `GetForegroundWindow()` + `GetWindowThreadProcessId()` + `GetModuleBaseName()`. Covers games in exclusive fullscreen.

2. **Browser focus fix** (`browser-extension/background.js`): `checkBrowserFocus()` now uses `BROWSER_NAME` constant instead of generic browser patterns.

3. **Sleep fellAsleep date fix** (`ExternalPage.tsx:2462`, `App.tsx:791`): 10-hour heuristic to distinguish same-day vs next-day fell-asleep times.

4. **add-external-time handler** (`main.ts`): Fully implemented (was a stub).

5. **Add Session button** (`ExternalPage.tsx`): DurationPicker modal for manually logging past session durations.

6. **Sleep Debug toggle** (`ExternalPage.tsx`): Shows raw sleep sessions and trends input.

## Remaining Problems to Solve

### A. Website Tracking — Data Not Displaying
- `handleBrowserData()` filters out data where `is_browser_focused === false` (line 8200-8203)
- Extension sends `is_browser_focused` based on `/foreground-app` endpoint check
- The check compares returned `app` with `BROWSER_NAME` (e.g. "Brave" vs "brave.exe")
- **Root cause suspicion**: mismatch between the app name detected by `active-win`/PowerShell and the browser's `BROWSER_NAME` used in the extension
- Need to verify: what `app` value does `/foreground-app` return for Brave/Chrome/Edge? Does it include .exe? Which case?

### B. Sleep Chart Not Showing
- `getSleepTrends()` computes `actualSleepSeconds = MAX(0, duration_seconds - device_off_to_sleep_seconds)`
- If manual sleep doesn't set `device_off_to_sleep_seconds` (leaves it 0), the formula works fine
- If `device_off_to_sleep_seconds` is somehow inflated to 24h+, `actualSleepSeconds` becomes 0
- Chart only renders when `sleepTrends.daily.length > 0`
- **Check**: Does manual sleep really store `device_off_to_sleep_seconds`? Do sleep debug logs show correct values?

### C. Long Session Duration Capping
- Checkpoint interval is 5 min — every 5 min the running session is logged with the current duration, then `sessionStart` resets
- This means a 3-hour session creates ~36 log entries (every 5 min), but they all show < 5 min
- Frontend `appStats` groups by app and sums durations, so it should still total correctly
- But: frontend `statsByApp` in ProductivityPage may aggregate differently
- **Verify**: Are long sessions (games, work) displaying correct total hours on StatsPage?

### D. AFK-to-Activity Data Flow
- When user stops AFK and selects an activity, `stopAfkSession(newActivityId)` changes the activity_id in the existing session
- Frontend must receive `external-data-changed` event to refresh
- **Check**: Does the ExternalPage refresh correctly after AFK→activity conversion?

### E. Efficiency
- Poll every 2 seconds: `setInterval(pollForeground, 2000)` — may be too frequent for battery/concentration
- PowerShell fallback uses `execSync` — blocking call on main thread
- **Suggestion**: Reduce poll interval to 5s, only run PowerShell fallback after 5+ consecutive null polls

## Requirements

### App Detection
1. Must detect ALL foreground windows including games in exclusive fullscreen
2. Must not log transient/system windows (explorer, taskbar, etc.)
3. Must not log DeskFlow/Electron itself
4. Must checkpoint every 5 min for long sessions
5. Must handle PC going to sleep (30 consecutive null polls → log accumulated session)

### Website Tracking
1. Must only log browser tab data when the browser itself is the foreground window
2. Must handle multiple browser profiles/tabs correctly (single-active-tab mode)
3. Must not log excluded domains
4. Must send periodic updates (every 10-30 seconds) even if same tab
5. Fallback: if browser extension fails to send data, website tracking should degrade gracefully

### External Activity Tracking
1. Manual sleep must properly set `device_off_to_sleep_seconds` (time between PC off and actual sleep start)
2. Sleep chart must display actual sleep hours correctly for ALL sleep entries (manual + auto-detected)
3. AFK→activity conversion must refresh ExternalPage without manual reload
4. "Add Session" must create visible entries in ExternalPage activity stats

### Data Display
1. StatsPage must show correct total hours per app (summing all checkpoint entries)
2. Dashboard "Recent Sessions" must show app tracking entries correctly (not as "Website")
3. Sleep Trends chart must have positive `actualSleepSeconds` for normal night sleep
4. Period filtering (today/week/month) must be consistent across all pages

## Implementation Plan

### Phase 1: Diagnose (Read Only)
1. Read the full `/foreground-app` handler in `main.ts` — what does it return?
2. Read the full browser extension `background.js` — what does `checkBrowserFocus()` compare against?
3. Read `updateAggregates()` — does it handle checkpoint log entries correctly for totals?
4. Read `appStats` computation in `App.tsx` — how does it aggregate checkpointed sessions?
5. Check `external_sessions` table entries via Sleep Debug — are sleep durations correct?

### Phase 2: Fix
1. **Foreground-app mismatch**: Normalize app name in `/foreground-app` response or in extension's comparison
2. **Sleep device_off_to_sleep**: Ensure manual sleep modal stores the gap correctly; fix `getSleepTrends` to handle missing `device_off_to_sleep_seconds`
3. **Checkpoint aggregation**: Verify `appStats` groups by app correctly across checkpoint entries; fix if `statsByApp` in ProductivityPage uses a different method
4. **AFK→activity refresh**: Ensure `stopAfkSession` dispatches `external-data-changed` event; confirm ExternalPage listens for it
5. **Poll interval**: Reduce to 5s; add null-poll counter threshold for PowerShell fallback

### Phase 3: Verify
1. Launch dev build: `npm run dev`
2. Open DevTools → Console, filter for `[DeskFlow]` — check polling logs
3. Open DevTools → Network, look for `/foreground-app` responses
4. Run `browser-extension` in Brave — check console for `checkBrowserFocus` result
5. Check ExternalPage Sleep Debug panel for sleep trends
6. Check StatsPage for app duration accuracy
7. Check Dashboard "Recent Sessions" for correct app names

## Files to Modify

- `src/main.ts` — Polling, foreground detection, aggregations, sleep trends
- `browser-extension/background.js` — Browser focus check, data sending
- `src/App.tsx` — `appStats` computation, period filtering
- `src/pages/ExternalPage.tsx` — Sleep modals, AFK handling, refresh
- `src/pages/StatsPage.tsx` — App stats display
- `src/pages/DashboardPage.tsx` — Recent sessions display
- `src/preload.ts` — Any new bridges needed

## Success Criteria

- ✅ Forza/Horus detected and logged (check `[DeskFlow]` console messages)
- ✅ Website tracking shows in Dashboard when browser is active
- ✅ Sleep chart shows bars for every sleep session
- ✅ Long gaming sessions show correct total hours on StatsPage
- ✅ AFK→activity conversion shows immediately on ExternalPage
- ✅ No 100% CPU from 2-second polling
