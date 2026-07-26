# CONTEXT_BUNDLE.md — Tracking System Overhaul

> **Generated:** 2026-06-06
> **Purpose:** Self-contained reference for the target AI to design fixes for 4 interconnected problems: (1) period navigation freeze, (2) website tracking accuracy, (3) app detection accuracy (gaming), (4) general performance/lag.

---

## 1. RAW REQUEST (Verbatim)

> "Okay, do you fix something or something that is related to the tracking system and like the switching between the stuff, switching between the previous dates, right? For example, I'm going to explain to you that the list of stuff that needs to be fixed in terms of the details and stuff so that you can research or research on the code and understand what I'm saying...
>
> So in the application level feature where you're able to switch between the previous days or previous weeks or previous months or previous seven days or previous 30 days, depending on what is the timeline you selected. On the top navigation bar, there's a selection of time where you can select between today and so that's daily time frames, the weekly time frame, the seven day time frame, the monthly time frame and so on and so forth. And also on the top navigation bar, there's a way for you to see the previous timeline, the previous day or the previous week and so on and so forth, right? The phone with that is switching to previous ones while you're in the certain application or certain page of the application or anywhere I haven't tested it, switching to the previous one doesn't work. It freezes the app, it causes the app to turn dark, there's like zero error thing because it just freezes the app, it just breaks the app basically, it makes the app turn to the back to reach.
>
> So I'm assuming that it's because the loading is procedures too heavy, it's not too heavy because it's not the all time data, it's only the daily time frame data, so it must be some sort of mistake on how it loads the data, some sort of logic must have that needs to be fixed.
>
> And I would also like to, that's this first one, the next one is that it's just super laggy in most of the pages and the loading is maybe not the most efficient and the saving of the data and the loading of the data and processing of the data, it's not the most efficient at all of the pages, so I would like, and also the tracking of this stuff, there's still a bunch of inaccuracy going on...
>
> So the problem is that it's just, the website is currently, website tracking is currently the problem where no matter what application I am, as long as I have my browser open with a website and it will track the website, that is not the correct logic. The correct logic is to be that there's already an application selected for the extension, so the user can select which app does the extension is in, the extension is the Chrome extension and the website extension that is tracking the thing, so the application is already in the condition for the tracking to be having to track is when the browser is open, and the user is focused on the browser, so it means that the current open application is that browser and only then should it be tracking these websites on from the extension. The correct one is that it doesn't do that, doesn't try, doesn't check whether it's on the browser at all, or the browser activity at all, application at all...
>
> ...also the abstracting, sometimes it just doesn't extract the app accurately in certain applications in especially games, for example steam games or a ballerand or like other games, and I want this application to not just be for me and the issue be for other people with different games, different application, different types of applications and how they can not be tracked properly unless I would like you to be able to handle those cases and make sure the tracking is properly handled..."

---

## 2. PROBLEM STATEMENTS

### Problem A: Period Navigation Freeze
When the user clicks the left/right chevron arrows (or selects a different period via tabs) on the top navigation bar, the app **freezes completely** — screen goes dark, no error messages, requires app restart. This happens because of a compound effect of multiple inefficiencies:

1. Backend date range functions don't handle `7day`/`30day` periods, causing full-table scans
2. A double-render pattern (`filteredLogs` → `setLogs`) triggers cascading re-renders
3. Object references in useMemo dependency arrays cause unnecessary recomputation
4. Multiple IPC calls fire concurrently, each causing their own re-render wave

### Problem B: Website Tracking Accuracy
The Chrome extension tracks websites even when the browser is NOT the focused foreground application. The system should only process website tracking data when the browser that has the extension is actually the focused app the user is interacting with. While some guards exist, they are incomplete:

1. Sleep/gap detection paths miss `isBrowserWithExtension` checks
2. No safety net in `addLog()` itself — relies on every caller remembering to check
3. Multiple duplicated browser process name maps (prone to drift)

### Problem C: App Detection Accuracy (Games)
Games (especially those with anti-cheat like Vanguard for VALORANT) are not detected properly:
1. `active-win` returns `null` for exclusive fullscreen games
2. PowerShell fallback Method 1 (`GetForegroundWindow`) is blocked by anti-cheat
3. PowerShell fallback Method 2 (process enumeration) is a heuristic that picks the most recently started process, not the actual foreground
4. No Gaming category exists in the app categorization system — games fall through to "Uncategorized" (neutral tier)
5. Raw process names are stored without friendly name mapping (e.g., `"VALORANT.exe"` stays as-is)

### Problem D: General Performance
Multiple pages are laggy due to:
1. Inefficient data loading (backend queries scan too much data)
2. Redundant client-side computations that run on every render
3. Missing WHERE clauses on SQL queries (no date limits)
4. Unstable object references causing cascading useMemo recomputations

---

## 3. ARCHITECTURE OVERVIEW

### Tech Stack
- **Electron** (main process + renderer)
- **React 19** + **TypeScript** (renderer)
- **Vite** (build tool)
- **better-sqlite3** (SQLite database in main process)
- **active-win** (foreground window detection)
- **Tailwind CSS v4** (styling)
- **Framer Motion** (animations)

### Data Flow Architecture
```
active-win → main.ts pollForeground() (5s loop) → addLog() → SQLite
                                                  ↓
                                           IPC event 'foreground-changed'
                                                  ↓
                                           App.tsx (state management)
                                                  ↓
                                     filtered by period/offset → child pages

Chrome Extension → HTTP POST :54321 → main.ts handleBrowserData() → SQLite
                                                  ↓
                                           IPC event 'browser-tracking-event'
                                                  ↓
                                           DashboardPage.tsx
```

### Key Files
| File | Purpose | Size |
|------|---------|------|
| `src/main.ts` | Electron main process — ALL IPC handlers, DB, tracking loop | ~11000 lines |
| `src/preload.ts` | IPC bridge (contextBridge) | ~500 lines |
| `src/App.tsx` | Main app component — routing, state, period selector | ~3200 lines |
| `src/pages/DashboardPage.tsx` | Main dashboard — heatmap, charts, stopwatch | ~2100 lines |
| `src/pages/StatsPage.tsx` | Detailed app/website stats | ~800 lines |
| `src/lib/dateRange.ts` | `getDateRange()` function | 70 lines |
| `browser-extension/background.js` | Chrome extension service worker | 608 lines |

---

## 4. SOURCE CODE REFERENCES

### 4A. Period Navigation System

#### State Management (App.tsx)
```typescript
// Lines 456-470
const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | '7day' | 'month' | '30day' | 'all'>('today');
const [dateOffset, setDateOffset] = useState(0);

// Reset offset when period changes
useEffect(() => {
  setDateOffset(0);
}, [selectedPeriod]);

// filteredLogs → setLogs double-render pattern (THE PROBLEM)
const filteredLogs = useMemo(() => {
  const range = getDateRange(selectedPeriod, dateOffset);
  return allLogs.filter(log => log.timestamp >= range.start && log.timestamp < range.end);
}, [allLogs, selectedPeriod, dateOffset]);

useEffect(() => {
  setLogs(filteredLogs);
}, [filteredLogs]);
```

#### Period Selector UI (App.tsx)
```typescript
// Lines 2540-2606 — Period tabs
{['today', 'week', '7day', 'month', '30day', 'all'].map(period => (
  <button onClick={() => setSelectedPeriod(period as any)}>
    {periodLabels[period]}
  </button>
))}

// Lines 2610-2633 — Arrow buttons
<button onClick={() => setDateOffset(o => o + 1)}> ← </button>
<span>{getDateRange(selectedPeriod, dateOffset).label}</span>  {/* CALLED INLINE! */}
<button onClick={() => setDateOffset(o => Math.max(0, o - 1))}> → </button>
```

#### getDateRange (src/lib/dateRange.ts, lines 1-70)
```typescript
export function getDateRange(period: string, offset: number = 0): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  const dayOfWeek = now.getDay();

  switch (period) {
    case 'today':
      return {
        start: new Date(year, month, date + offset * -1, 0, 0, 0, 0),
        end: new Date(year, month, date + offset * -1, 23, 59, 59, 999),
        label: offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : formatDate(offset),
      };
    case 'week':
      return {
        start: new Date(year, month, date - dayOfWeek + 1 + offset * -7, 0, 0, 0, 0),
        end: new Date(year, month, date - dayOfWeek + 7 + offset * -7, 23, 59, 59, 999),
        label: offset === 0 ? 'This Week' : offset === -1 ? 'Last Week' : `Week ${...}`,
      };
    case '7day':
      // ... returns last 7 days from offset
    case 'month':
      // ... returns calendar month
    case '30day':
      // ... returns last 30 days
    case 'all':
      // ... returns from epoch
  }
}
```

### 4B. Backend Date Range (main.ts) — THE MAIN FREEZE ROOT CAUSE

#### computePeriodRange — Missing `7day`/`30day` Cases
```typescript
// Lines 3800-3831 — USED BY get-dashboard-aggregates
function computePeriodRange(period: string, dateOffset: number = 0) {
  const now = new Date();
  let start: Date, end: Date;
  switch (period) {
    case 'today':
      // 24-hour range with offset
      break;
    case 'week':
      // Full week range
      break;
    case 'month':
      // Full month range
      break;
    default:  // ← '7day', '30day', AND 'all' all fall here!
      start = new Date(2000, 0, 1);   // Scans from YEAR 2000!
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }
  return { start, end };
}
```

#### computeDateRange — Same missing cases
```typescript
// Lines 3670-3702 — USED BY get-dashboard-data (legacy)
function computeDateRange(period: string, dateOffset: number = 0) {
  // Same pattern — default falls to `startDate = new Date(0)` (epoch!)
}
```

#### computeWeekRange — Same missing cases
```typescript
// Lines 3833-3849 — USED BY get-dashboard-aggregates for per-week computation
function computeWeekRange(period: string, weekOffset: number = 0) {
  // Only handles 'week', 'month', 'all' — falls through to week for everything else
}
```

#### Only computeBrowserDateRange handles all periods correctly
```typescript
// Lines 10542-10579 — This one DOES handle 7day/30day
function computeBrowserDateRange(period: string, dateOffset: number = 0) {
  // Has explicit cases for 'today', 'week', '7day', 'month', '30day', 'all'
}
```

### 4C. The get-dashboard-aggregates IPC Handler
```typescript
// Lines 4005-4159
ipcMain.handle('get-dashboard-aggregates', async (event, { period, dateOffset, weekOffset }) => {
  const range = computePeriodRange(period, dateOffset);  // ← Full scan for 7day/30day!
  const weekRange = computeWeekRange(period, weekOffset);
  
  // Multiple heavy queries that all use the wrong range:
  const weeklyHeatmap = db.prepare(`SELECT date, app_type, total_seconds FROM stats_daily WHERE date >= ? AND date <= ?`).all(range.start, range.end);
  const topApps = db.prepare(`SELECT app_name, total_seconds FROM stats_daily WHERE date >= ? AND date <= ? ORDER BY total_seconds DESC LIMIT 15`).all(range.start, range.end);
  // ... more queries
});
```

### 4D. ChartBars — Missing 7day/30day Handling
```typescript
// DashboardPage.tsx lines 586-691
const chartBars = useMemo(() => {
  switch (selectedPeriod) {
    case 'today':
      // Hour-by-hour bars from hourlyHeatmap
    case 'week':
    case 'month':
    case 'all':
      // Day-by-day bars
    // NOTE: '7day' and '30day' have NO cases — fall through to empty bars!
  }
}, [dashboardData?.weeklyHeatmap, dashboardData?.hourlyHeatmap, ...]);
```

### 4E. Website Tracking

#### Extension Background Service Worker (browser-extension/background.js, 608 lines)
```javascript
// Lines 126-141 — Browser identification
fetch('http://localhost:54321/browser-identify', {
  method: 'POST', body: JSON.stringify({ browser: BROWSER_NAME, tabId: tab.id })
});

// Lines 184-210 — Data sending
fetch('http://localhost:54321/browser-data', {
  method: 'POST',
  body: JSON.stringify({
    domain, title, url, tab_id, delta_ms: active_duration_ms,
    is_browser_focused: true,  // ← Reports focus state
    active_duration_ms, is_periodic: true
  })
});

// Lines 233-267 — Focus checking (polls every ~2s)
async function checkBrowserFocus() {
  try {
    const resp = await fetch('http://localhost:54321/foreground-app');
    const data = await resp.json();
    const isFocused = data.app && isAppMatchingBrowser(data.app);
    // Updates isBrowserFocused state
  } catch { /* server might be down */ }
}
```

#### Main Process HTTP Server (main.ts lines 10182-10330)
```typescript
function startBrowserTrackingServer() {
  const server = http.createServer((req, res) => {
    // POST /browser-data — handles website tracking data
    //   - Parses JSON payload
    //   - Calls handleBrowserData(data)
    //   - Forwards to renderer via 'browser-tracking-event'
    
    // GET /foreground-app — returns currentApp for extension focus check
    //   - Returns { app: currentApp } (normalized, no .exe)
    
    // POST /browser-identify — sets browserWithExtension preference
    //   - Updates userPreferences.browserWithExtension
  });
  server.listen(54321);
}
```

#### handleBrowserData (main.ts lines 10334-10514)
```typescript
function handleBrowserData(data) {
  // Guard 1: Tracking enabled?
  if (!isBrowserTrackingEnabled) return;
  
  // Guard 2: On-view recording mode?
  if (browserRecordingMode === 'on-view' && !browserPageVisible) return;
  
  // Guard 3: Valid data?
  if (!data.domain || !data.url) return;
  
  // Guard 4: Extension reports browser NOT focused?
  if (data.is_browser_focused === false) return;
  
  // Guard 5: Server-side focus check — is current foreground app the browser?
  const browserAppMatch = !!currentApp && !!userPreferences?.browserWithExtension &&
    isAppMatchingBrowser(currentApp, userPreferences.browserWithExtension);
  if (!browserAppMatch) return;  // ← THIS is the critical guard
  
  // Guard 6: Excluded domain?
  // Guard 7: Minimum duration (>2 seconds)?
  // Guard 8: Only most recently active tab?
  
  // Then: Update existing session or create new log entry
}
```

#### pollForeground — Sleep/Gap Detection Missing Browser Check (main.ts lines 2678-2712)
```typescript
// Sleep detection (after 30 null polls) — lines 2680-2688
if (currentApp) {
  const duration = Math.min(knownDuration, MAX_SESSION_MS);
  if (duration > 5000 && currentApp !== 'DeskFlow' && currentApp !== 'Electron') {
    // BUG: Missing && !isBrowserWithExtension(currentApp)
    // This logs the browser as a regular app session when waking from sleep!
    addLog(..., currentApp, category, duration, ...);
  }
}

// Sleep gap detection — lines 2699-2706
if (currentApp && currentApp !== 'DeskFlow' && currentApp !== 'Electron') {
  // BUG: Missing && !isBrowserWithExtension(currentApp)
  addLog(..., currentApp, category, duration, ...);
}
```

#### isBrowserWithExtension (main.ts lines 2411-2414)
```typescript
function isBrowserWithExtension(appName: string): boolean {
  if (!isBrowserTrackingEnabled || !userPreferences?.browserWithExtension) return false;
  return isAppMatchingBrowser(appName, userPreferences.browserWithExtension);
}
```

#### isAppMatchingBrowser (main.ts lines 3384-3392)
```typescript
function isAppMatchingBrowser(appName: string, browserName: string): boolean {
  if (!appName || !browserName) return false;
  const appLower = appName.toLowerCase().replace(/\.exe$/i, '');
  const browserLower = browserName.toLowerCase();
  return appLower.includes(browserLower) ||
    browserLower.includes(appLower) ||
    getBrowserProcessNames(browserName).some(p => appLower.includes(p));
}
```

### 4F. App Detection

#### pollForeground — Main Tracking Loop (main.ts lines 2595-2795)
```typescript
async function pollForeground() {
  const result = await activeWin();  // ← Returns null for fullscreen games!
  
  if (!result) {
    consecutiveNullPolls++;
    if (consecutiveNullPolls >= 3) {
      const psResult = getForegroundViaPowerShell();  // ← Fallback
      if (psResult) { /* process PS result */ }
    }
    // Check for sleep (30 consecutive nulls)
    return;
  }
  
  // ... process app change, checkpoint, etc.
}
```

#### getForegroundViaPowerShell — Two Methods (main.ts lines 2533-2592)
```typescript
function getForegroundViaPowerShell() {
  // Method 1: Win32 API via loaded C# (DllImport user32.dll → GetForegroundWindow)
  // Blocked by anti-cheat software (Vanguard)
  
  // Method 2: Process enumeration (added v4.13 for games)
  // Queries ALL processes with visible windows
  // Picks most recently started as proxy for foreground
  // This is a HEURISTIC — not guaranteed to be the actual foreground
}

// Process enumeration PS command:
// powershell -NoProfile "Get-Process | Where-Object { $_.MainWindowTitle -ne '' -and $_.Responding } | Sort-Object StartTime -Descending | Select-Object -First 1 | ForEach-Object { $_.MainWindowTitle + '|' + $_.ProcessName + '|' + $_.Id }"
```

#### Categorize App (main.ts lines 2391-2407)
```typescript
function categorizeApp(appName: string): string {
  const lower = appName.toLowerCase();
  // 1. Check user override (categoryConfig.appCategoryMap[appName])
  // 2. Check detected apps cache
  // 3. Match against DEFAULT_APP_CATEGORIES keyword map
  for (const [keyword, category] of Object.entries(DEFAULT_APP_CATEGORIES)) {
    if (lower.includes(keyword)) { return category; }
  }
  // 4. No match — "Uncategorized" (neutral tier) ← GAMES END UP HERE
  return 'Uncategorized';
}
```

#### DEFAULT_APP_CATEGORIES (main.ts lines 190-263)
```typescript
const DEFAULT_APP_CATEGORIES: Record<string, string> = {
  'code': 'IDE', 'cursor': 'IDE', 'windsurf': 'IDE',
  'chrome': 'Browser', 'firefox': 'Browser', 'msedge': 'Browser',
  'discord': 'Communication', 'slack': 'Communication',
  'spotify': 'Entertainment', 'vlc': 'Entertainment',
  'figma': 'Design', 'photoshop': 'Design',
  'terminal': 'Developer Tools', 'cmd': 'Developer Tools',
  'outlook': 'Productivity', 'word': 'Productivity', 'excel': 'Productivity',
  // NOTE: NO game-related entries!
  // No 'steam', 'valorant', 'league', 'battle', 'game', etc.
};

const DEFAULT_TIER_ASSIGNMENTS = {
  productive: ['IDE', 'AI Tools', 'Developer Tools', 'Education', 'Productivity', 'Tools'],
  neutral: ['Communication', 'Design', 'Search Engine', 'News', 'Uncategorized', 'Other'],
  distracting: ['Entertainment', 'Social Media', 'Shopping']
  // NOTE: No 'Gaming' tier assignment either
};
```

### 4G. Performance Bottlenecks

#### DashboardPage useMemos with Object Dependencies (lines 527-2035)
```typescript
// chartExternalData — depends on Map (new reference every render)
const chartExternalData = useMemo(() => {
  const extMap = new Map<string, ExternalHourSegment[]>();
  // ... expensive iteration over externalSessions ...
  return extMap;
}, [externalSessions, selectedPeriod, dateOffset]);

// chartBars — depends on object refs from IPC response
const [chartBarsResult, setChartBarsResult] = useState(null);
const chartBars = useMemo(() => {
  // heavy computation
  return bars;
}, [dashboardData?.weeklyHeatmap, dashboardData?.hourlyHeatmap, chartExternalData, selectedPeriod, dateOffset]);
// NOTE: weeklyHeatmap and hourlyHeatmap are OBJECTS from IPC — new reference every response

// Multiple other useMemos with same pattern:
useMemo(() => {...}, [dashboardData?.hourlyHeatmap, ...])  // line 1471
useMemo(() => {...}, [dashboardData?.websiteStats])          // line 1884
useMemo(() => {...}, [dashboardData?.appStats])              // line 1892
```

#### App.tsx appColors — localStorage on Every Render (line 751)
```typescript
const appColors = useMemo(() => {
  const saved = localStorage.getItem('deskflow-app-colors');
  // ... read/write localStorage for every app in logs...
  return colors;
}, [logs]);  // ← Runs on every logs change (which happens on every period nav)
```

#### appStats — Re-filters allLogs on Every Period Change (App.tsx line 1057)
```typescript
const appStats = useMemo(() => {
  const range = getDateRange(selectedPeriod, dateOffset);
  const filtered = allLogs.filter(log => log.timestamp >= range.start && log.timestamp < range.end);
  const stats: Record<string, AppStat> = {};
  for (const log of filtered) {
    // ... compute per-app stats (O(n))
  }
  return stats;
}, [allLogs, categoryOverrides, selectedPeriod, dateOffset]);
```

#### get-logs-by-period — Ignores dateOffset (main.ts line 4370)
```typescript
ipcMain.handle('get-logs-by-period', (event, period) => {
  // Only takes `period` — NO dateOffset parameter!
  // Called on mount to populate allLogs
});
```

#### Duplicated BROWSER_PROCESS_NAMES (maintenance risk)
```typescript
// main.ts line 3367
const BROWSER_PROCESS_NAMES = {
  'comet': ['chrome', 'comet', 'chromium'],
  'chrome': ['chrome', 'chromium'],
  'brave': ['brave', 'chrome'],
  'edge': ['msedge', 'edge'],
  // ...
};

// App.tsx line 393 — DUPLICATED as BROWSER_PROCESS_NAMES_RENDERER
// DashboardPage.tsx line 175 — DUPLICATED as BROWSER_PROCESS_NAMES_DASHBOARD
// browser-extension/background.js line 108 — DUPLICATED (4th copy)
```

---

## 5. DATA STRUCTURES

### SQLite Tables (main.ts)
```typescript
// logs — Main tracking table
CREATE TABLE logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  app TEXT NOT NULL,
  category TEXT DEFAULT 'Other',
  duration_ms INTEGER NOT NULL,
  title TEXT,
  project TEXT,
  url TEXT,
  domain TEXT,
  tab_id INTEGER,
  is_browser_tracking INTEGER DEFAULT 0
);

// stats_daily — Pre-aggregated daily stats (updated by SQL triggers)
CREATE TABLE stats_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  app_name TEXT NOT NULL,
  app_type TEXT NOT NULL,
  total_seconds REAL NOT NULL,
  session_count INTEGER DEFAULT 1
);

// stats_hourly — Per-hour stats
CREATE TABLE stats_hourly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  app_name TEXT,
  app_type TEXT,
  total_seconds REAL NOT NULL,
  session_count INTEGER DEFAULT 1
);

// daily_aggregates — Daily rollup
CREATE TABLE daily_aggregates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  app_name TEXT,
  category TEXT,
  total_seconds REAL,
  session_count INTEGER
);

// external_sessions — Manual/sleep tracking
CREATE TABLE external_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER,
  started_at TEXT,
  ended_at TEXT,
  duration_seconds REAL,
  date TEXT,
  type TEXT,
  notes TEXT,
  device_off_to_sleep_seconds REAL,
  wake_up_to_app_seconds REAL
);

// external_activities — Activity definitions
CREATE TABLE external_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  type TEXT,
  icon TEXT,
  color TEXT
);

// terminal_sessions — Terminal session tracking
CREATE TABLE terminal_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  terminal_id TEXT,
  session_id TEXT,
  name TEXT,
  status TEXT,
  project_id TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

### Key Constants
```typescript
// Tracking loop
let MAX_SESSION_MS = 120 * 60 * 1000;       // 120 min session cap
const MAX_LOGGED_SESSION_MS = 3600000;        // 1 hour logged session cap
const CHECKPOINT_INTERVAL_MS = 2 * 60 * 1000; // 2 min checkpoint
const SLEEP_GAP_MS = 30000;                   // 30s gap for sleep detection
const SLEEP_DETECTION_MIN_GAP_MS = 45 * 60 * 1000; // 45 min sleep detection

// State variables
let currentApp: string | null = null;
let sessionStart: number = Date.now();
let trackingInterval: NodeJS.Timeout | null = null;
let isTracking: boolean = true;
let consecutiveNullPolls: number = 0;
let lastCheckpointTime: number = Date.now();

// Browser tracking state
let isBrowserTrackingEnabled: boolean = true;
let browserServer: http.Server | null = null;
let activeBrowserSessions: Map<string, any> = new Map();
let browserRecordingMode: 'always' | 'on-view' = 'always';
let browserPageVisible: boolean = false;
```

### Renderer State (App.tsx)
```typescript
const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | '7day' | 'month' | '30day' | 'all'>('today');
const [dateOffset, setDateOffset] = useState(0);
const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);
const [logs, setLogs] = useState<ActivityLog[]>([]);
const [currentApp, setCurrentApp] = useState<string | null>(null);
const [browserLogs, setBrowserLogs] = useState<WebsiteLog[]>([]);
```

### IPC Endpoints (preload.ts + main.ts)

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `get-dashboard-aggregates` | invoke | Get dashboard data (weeklyHeatmap, hourlyHeatmap, appStats, websiteStats, overview) |
| `get-logs` | invoke | Get all logs |
| `get-logs-by-period` | invoke | Get logs filtered by period |
| `get-browser-logs` | invoke | Get browser/website logs |
| `get-external-stats` | invoke | Get external activity stats |
| `foreground-changed` | event → renderer | Current foreground app changed |
| `browser-tracking-event` | event → renderer | Browser tracking data received |
| `get-external-sessions` | invoke | Get external sessions |
| `set-recording-mode` | invoke | Set browser/app recording mode |
| `get-recording-modes` | invoke | Get current recording modes |

---

## 6. SUMMARY OF ROOT CAUSES

### Freeze: Compound Effect
```
Click → dateOffset+1
  → Render 1: filteredLogs recomputes (new array ref)
  → useEffect: setLogs(newArray)
  → Render 2: all child components re-render
  → IPC calls: get-dashboard-aggregates (heavy SQL), get-browser-logs (heavy SQL)
    → Backend computePeriodRange has NO 7day/30day case → scans from year 2000
  → IPC resolves → setDashboardData (new object refs)
  → Render 3: all useMemos with object deps recompute unnecessarily
  → UI thread blocked by sync useMemo + localStorage
```

### Website Tracking: Incomplete Guards
```
Main gaps:
1. Sleep detection (30 null polls) → addLog() missing !isBrowserWithExtension check
2. Sleep gap detection (SLEEP_GAP_MS) → addLog() missing !isBrowserWithExtension check
3. addLog() itself has no browser safety net
4. 4 copies of BROWSER_PROCESS_NAMES — maintenance risk

What exists:
✓ handleBrowserData() has 8 guards
✓ onBrowserTrackingEvent has isInBrowser check
✓ pollForeground app-change path has !isBrowserWithExtension
✓ pollForeground checkpoint path has !isBrowserWithExtension
```

### Game Detection: Multi-Layer Failure
```
active-win returns null for fullscreen games
  → PS Method 1 blocked by anti-cheat (Vanguard)
    → PS Method 2 is a heuristic (picks newest process)
      → No Gaming category → defaults to "Uncategorized" (neutral tier)
        → Raw process names stored (no friendly name mapping)
```

---

## 7. DESIGN CONSTRAINTS

1. **Never add new npm packages** without explicit approval — everything must work with existing deps
2. **IPC-only architecture** — renderer has NO direct Node/DB access, everything via preload bridge
3. **Tailwind v4 ONLY** — `@import "tailwindcss"` syntax, never v3 `@tailwind` directives
4. **No git commands** — never use git to revert/reset/restore files
5. **Backend logic must be verified** — before designing frontend features, check IPCs exist in preload.ts AND main.ts with real handler implementations (not mocks/stubs)
6. **Callback cleanup** — all `onForegroundChange`/`onBrowserTrackingEvent` listeners must return unsubscribe functions
7. **`allLogs` is the unfiltered dataset** — it's fetched when period changes, `filteredLogs` derives from it on the client
8. **Refs for async state** — use refs (not state) for values accessed in IPC callbacks to avoid stale closures
