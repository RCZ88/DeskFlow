# CONTEXT_BUNDLE — DeskFlow Tracking System

## Overview

The DeskFlow Electron app has three tracking subsystems:
1. **App tracking** — polls Windows foreground window every 2s via `active-win`, logs to `logs` table
2. **Website tracking** — browser extension sends data via HTTP to local server (port 54321), extension has `checkBrowserFocus()` that checks if browser is the foreground app via `/foreground-app` endpoint
3. **External activity tracking** — manual/external activity sessions, sleep tracking, AFK detection

---

## 1. APP TRACKING

### File: `src/main.ts`

**Constants (lines 2211-2217):**
- `MAX_SESSION_MS = 30 * 60 * 1000` (30 min cap per log entry)
- `MAX_LOGGED_SESSION_MS = 3600000` (1 hour global cap)
- `SLEEP_GAP_MS = 30000` (30 sec gap threshold)
- `BROWSER_MAX_DELTA_MS = 10 * 60 * 1000` (10 min browser cap)
- `CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000` (5 min checkpoint logging)
- Polling interval: `setInterval(pollForeground, 2000)` (every 2 seconds)

**Transient apps filtered out (lines 2218-2223):**
```typescript
const TRANSIENT_APPS = [
    'explorer', 'task switching', 'taskbar', 'start menu',
    'system', 'shellexperiencehost', 'searchui', 'peopleexperiencehost',
    'application frame', 'console window host',
    'screen snip', 'snipping tool',
];
```

**State variables (lines 2205-2217):**
```typescript
let currentApp = null;
let sessionStart = Date.now();
let isTracking = true;
let lastPollTime = Date.now();
let consecutiveNullPolls = 0;
```

**`categorizeApp(appName)` (lines 2234-2250):**
```typescript
function categorizeApp(appName) {
    const lower = appName.toLowerCase();
    if (categoryConfig.appCategoryMap[appName]) return categoryConfig.appCategoryMap[appName];
    if (categoryConfig.detectedApps[lower]) return categoryConfig.detectedApps[lower];
    for (const [keyword, category] of Object.entries(DEFAULT_APP_CATEGORIES)) {
        if (lower.includes(keyword)) {
            categoryConfig.detectedApps[lower] = category;
            saveCategoryConfig();
            return category;
        }
    }
    return 'Uncategorized';
}
```

**`addLog(timestamp, app, category, duration_ms, title, project, url?, domain?, tab_id?, is_browser_tracking?)` (lines 2046-2091):**
- Caps duration to `MAX_LOGGED_SESSION_MS`
- Skips browser entries without domain
- If `useJson`: pushes to `jsonLogs` array, saves to file
- If SQLite: inserts into `logs` table
- Always calls `updateAggregates()`

**`updateAggregates(timestamp, app, category, duration_ms, domain, is_browser_tracking)` (lines 2092-2143):**
- Updates `daily_stats` (date, app, total_sec, sessions)
- Updates `sessions` table (active session tracking per app)
- Updates `daily_aggregates` (date, app, total_sec, session_count)
- Updates `browser_sessions` if is_browser_tracking (date, domain, total_sec, session_count)

**`getStats()` (lines 2168-2203):**
- Groups by app, sums `duration_ms`, counts sessions
- Filters out `is_browser_tracking = 1`
- Returns `[{ app, total_ms, sessions }]` sorted by total_ms desc

**`getLogs(limit?)` (lines 2145-2167):**
- Returns ALL logs from `logs` table (or from `jsonLogs`)
- No period filtering — frontend handles that

**`pollForeground()` (lines 2368-2495):**
- Calls `active-win` every 2 seconds
- If null: PowerShell fallback using Win32 API `GetForegroundWindow()` + `GetWindowThreadProcessId()`
- If null + 30 consecutive: assumes sleep, logs accumulated session
- Transient apps filtered out
- DeskFlow/Electron self excluded
- On app change: logs previous session's duration, starts new session
- Checkpoint every 5 minutes: logs running session, resets sessionStart
- Sends `foreground-changed` IPC event to renderer

**Before-quit logging (lines 9812-9816):**
```typescript
if (currentApp && Date.now() - sessionStart > 5000 && currentApp !== 'DeskFlow' && currentApp !== 'Electron') {
    const category = categorizeApp(currentApp);
    addLog(new Date(sessionStart).toISOString(), currentApp, category, duration, `${currentApp} Window`, null);
}
```

---

## 2. WEBSITE TRACKING

### File: `src/main.ts`

**Browser server (lines 8053-8187):**
- HTTP server on port 54321
- Endpoints: `POST /browser-data`, `GET /health`, `GET /foreground-app`, `POST /browser-identify`, `POST /browser-log`

**Browser state (lines 2225-2233):**
```typescript
let browserServer = null;
let browserServerPort = 54321;
let isBrowserTrackingEnabled = true;
let activeBrowserSessions = new Map(); // Map<domain, LogEntry>
let browserExcludedDomains = [];
let lastActiveBrowserDomain = null;
let lastActiveBrowserTimestamp = 0;
```

**`handleBrowserData(data)` (lines 8194-8363):**
- Receives: `{ domain, url, title, active_duration_ms, timestamp, is_browser_focused, is_periodic, delta_ms, sanitized_url, tab_id }`
- Filters:
  - Skips if `isBrowserTrackingEnabled` is false
  - Skips if no `domain` or `url`
  - **Skips if `is_browser_focused === false`** (line 8200-8203 — blocks phantom background tab data)
  - Skips if domain is excluded
  - Skips if `sessionDuration < 2000` (under 2 seconds)
  - Skips if different domain and last active was within 30 seconds (single-active-tab mode)
- If existing session for domain: updates with delta
- If new session:
  - Deduplication: checks for recent browser app entry within 5 seconds, updates it with domain info
  - Creates new entry in `logs` table with `is_browser_tracking = 1`
  - Uses domain name as `app` field

**Browser extension `checkBrowserFocus()` (in `browser-extension/background.js`):**
- Fetches `http://localhost:54321/foreground-app`
- Compares returned `app` with `BROWSER_NAME` (which browser it is)
- If app matches the specific browser → `isBrowserFocused = true`

---

## 3. FRONTEND DATA FLOW

### File: `src/App.tsx`

**`loadData()` (lines 407-464):**
```typescript
const electronLogs = await window.deskflowAPI.getLogs();
const formattedLogs = electronLogs.map((log: any) => ({
    id: log.id,
    timestamp: new Date(log.timestamp),
    app: log.app,
    category: log.category || 'Other',
    duration: Math.round(log.duration_ms / 1000),
    title: log.title,
    project: log.project,
    is_browser_tracking: log.is_browser_tracking === 1 || log.is_browser_tracking === true,
    domain: log.domain,
    url: log.url,
}));
setAllLogs(formattedLogs);
setLogs(formattedLogs);
```

**`filteredLogs` useMemo (lines 388-391):**
```typescript
const filteredLogs = useMemo(() => {
    const range = getDateRange(selectedPeriod, 0);
    return allLogs.filter(log => log.timestamp >= range.start && log.timestamp < range.end);
}, [allLogs, selectedPeriod]);
```

**`appStats` useMemo (lines 930-965):**
```typescript
const appStats = useMemo(() => {
    let filteredLogs = [...allLogs];
    // Filter by selectedPeriod (today/week/month/all)
    // Skips browser tracking (line 955: if (log.is_browser_tracking) continue;)
    // Groups by app name, sums duration_ms, counts sessions
    // Returns [{ app, total_ms, sessions, first_seen, last_seen, category }]
}, [allLogs, selectedPeriod, categoryOverrides]);
```

**Type definition (lines 92-93):**
```typescript
interface DeskflowAPI {
    getLogs: () => Promise<any[]>;
    getLogsByPeriod: (period: 'today' | 'week' | 'month' | 'all') => Promise<any[]>;
}
```

### File: `src/pages/StatsPage.tsx`
- Receives `{ logs, appStats, selectedPeriod, ... }` as props
- Displays app usage data from `appStats`

### File: `src/pages/DashboardPage.tsx`
- Shows recent sessions, heatmap, productivty breakdown
- Uses `logs` filterered by `selectedPeriod`

---

## 4. SLEEP TRACKING

### File: `src/main.ts`

**`addManualSleep(sleepData)` (lines 8836-8872):**
- Sleep activity must exist in `external_activities` table with `type = 'sleep'`
- Creates `external_sessions` entry with `activity_id` pointing to sleep activity
- Fields inserted: `activity_id, started_at, ended_at, duration_seconds, device_off_to_sleep_seconds, wake_up_to_app_seconds`
- Returns `{ success: true, sessionId }` or error

**`confirmSleep(sleepData)` (lines 9008-9057):**
- Same as `addManualSleep` but also:
  - Saves sleep pattern to `sleepPatterns` file
  - Cleans up sleep detection file
  - Designed for auto-detected sleep confirmation

**`getSleepTrends(period)` (lines 9552-9657):**
- Queries `external_sessions` joined with `external_activities` where `ea.type = 'sleep'`
- Filters by `date(started_at) >= startDate` (7 or 30 days ago)
- Groups by `date(started_at)`
- Computes per day: `bedtime_minutes`, `waketime_minutes`, `pre_sleep_seconds`, `post_wake_seconds`
- `actualSleepSeconds = MAX(0, total_sleep_seconds - avgPreSleepSec)`
- Handles midnight crossing: if wake time < 12h and sleep start > 12h → normal night sleep
- Returns `{ daily: [{ date, sleep_seconds, deficit_seconds, pre_sleep_seconds, post_wake_seconds, bedtime_minutes, waketime_minutes }], average_bedtime, average_wake_time, average_sleep_duration, average_latency, average_wake_latency }`

**`getSleepForDate(dateStr)` (lines 8874-8895):**
- Returns single sleep session for a given date

---

## 5. EXTERNAL ACTIVITY TRACKING

### File: `src/main.ts`

**`startAfkSession()` (lines 8667-8693):**
- Finds AFK activity in `external_activities`
- Creates `external_sessions` entry with AFK activity_id

**`stopAfkSession(newActivityId?)` (lines 8697-8726):**
- Finds running AFK session
- If `newActivityId` provided: changes `activity_id` to chosen activity
- Sets `ended_at` and `duration_seconds`
- Returns `{ success: true, duration }`

### File: `src/preload.ts` (lines 331-359):
```typescript
getExternalActivities: () => ipcRenderer.invoke('get-external-activities'),
addExternalActivity: (activity) => ipcRenderer.invoke('add-external-activity', activity),
startExternalSession: (activityId) => ipcRenderer.invoke('start-external-session', activityId),
startAfkSession: () => ipcRenderer.invoke('start-afk-session'),
stopAfkSession: (newActivityId?) => ipcRenderer.invoke('stop-afk-session', newActivityId),
stopExternalSession: (sessionId, endTime?, deviceOffToSleepSeconds?, wakeUpToAppSeconds?) => ipcRenderer.invoke('stop-external-session', ...),
updateExternalSession: (sessionId, updates) => ipcRenderer.invoke('update-external-session', ...),
deleteExternalSession: (sessionId) => ipcRenderer.invoke('delete-external-session', sessionId),
getExternalSessions: (period) => ipcRenderer.invoke('get-external-sessions', period),
getActivityStats: (activityId) => ipcRenderer.invoke('get-activity-stats', activityId),
getActiveExternalSession: () => ipcRenderer.invoke('get-active-external-session'),
addManualSleep: (sleepData) => ipcRenderer.invoke('add-manual-sleep', sleepData),
getSleepForDate: (dateStr) => ipcRenderer.invoke('get-sleep-for-date', dateStr),
updateManualSleep: (sessionId, sleepData) => ipcRenderer.invoke('update-manual-sleep', ...),
checkSleepDetection: () => ipcRenderer.invoke('check-sleep-detection'),
confirmSleep: (sleepData) => ipcRenderer.invoke('confirm-sleep', sleepData),
dismissSleepDetection: () => ipcRenderer.invoke('dismiss-sleep-detection'),
addExternalTime: (activityId, durationMinutes) => ipcRenderer.invoke('add-external-time', { activityId, durationMinutes }),
getExternalStats: (period) => ipcRenderer.invoke('get-external-stats', period),
getSleepTrends: (period) => ipcRenderer.invoke('get-sleep-trends', period),
getConsistencyScore: (period) => ipcRenderer.invoke('get-consistency-score', period),
getSleepDebug: (period) => ipcRenderer.invoke('get-sleep-debug', period),
```

---

## 6. DB SCHEMA

### `logs` table:
```sql
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    app TEXT NOT NULL,
    category TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    title TEXT,
    project TEXT,
    keystrokes INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    window_switches INTEGER DEFAULT 0,
    url TEXT,
    domain TEXT,
    tab_id INTEGER,
    is_browser_tracking INTEGER DEFAULT 0
)
```

### `external_activities` table:
```sql
CREATE TABLE IF NOT EXISTS external_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('stopwatch', 'sleep', 'checkin')),
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'Clock',
    default_duration INTEGER DEFAULT 30,
    is_default INTEGER DEFAULT 0,
    is_visible INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### `external_sessions` table:
```sql
CREATE TABLE IF NOT EXISTS external_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER DEFAULT 0,
    notes TEXT,
    device_off_to_sleep_seconds INTEGER DEFAULT 0,
    wake_up_to_app_seconds INTEGER DEFAULT 0,
    FOREIGN KEY (activity_id) REFERENCES external_activities(id)
)
```

---

## 7. KNOWN ISSUES & BUGS

### Bug 1: App tracking misses games in exclusive fullscreen
- `active-win` returns null for games like Forza Horizon (fullscreen exclusive mode)
- Previously: 30 consecutive null polls (60 seconds) before assuming sleep
- **Current fix**: PowerShell fallback using Win32 API `GetForegroundWindow()` + `GetWindowThreadProcessId()`
- Still: Some games may use anti-cheat hooks that prevent window detection

### Bug 2: Website tracking doesn't display properly
- Browser extension sends data via HTTP to port 54321
- Must have `is_browser_focused = true` to log (line 8200-8203) — blocks phantom tabs
- Extension checks `/foreground-app` endpoint — compares returned `app` with `BROWSER_NAME`
- If the check fails (app doesn't match browser), ALL website data is dropped

### Bug 3: Sleep data not appearing in charts
- `getSleepTrends` computes `actualSleepSeconds = MAX(0, duration_seconds - device_off_to_sleep_seconds)`
- If `device_off_to_sleep_seconds` is inflated (24h+), `actualSleepSeconds` becomes 0
- Chart renders only if `sleepTrends.daily.length > 0`

### Bug 4: AFK-to-activity data not showing
- AFK prompt reclassifies AFK sessions to chosen activity
- Must dispatch `external-data-changed` event for ExternalPage to refresh
- Period filter on ExternalPage may exclude recent data

### Bug 5: `useJson` fallback mode
- If SQLite fails to init, `useJson = true` and ALL IPC handlers return empty/failure
- `storageError` set with reason — check `get-storage-status` IPC

---

## 8. DATA FLOW DIAGRAM (Text)

```
Browser Extension → HTTP POST /browser-data → handleBrowserData() → addLog() → logs table
                                                                    → updateAggregates() → daily_stats, browser_sessions

active-win (every 2s) → pollForeground() → on app change → addLog() → logs table
                    → PowerShell fallback on null                     → updateAggregates() → daily_stats, sessions, daily_aggregates
                    → Checkpoint every 5min → addLog()
                    → foreground-changed IPC event → renderer

Frontend (renderer) ← IPC getLogs() → allLogs state → filteredLogs (by period)
                                                    → appStats (grouped by app, no browser)
                                                    → Dashboard "Recent Sessions"
                                                    → StatsPage table
                                                    → ProductivityPage

External Activity (UI) → IPC startExternalSession / stopExternalSession → external_sessions
                      → IPC addManualSleep / confirmSleep → external_sessions
                      → IPC startAfkSession / stopAfkSession → external_sessions
                      → IPC getSleepTrends → computed daily sleep data
```
