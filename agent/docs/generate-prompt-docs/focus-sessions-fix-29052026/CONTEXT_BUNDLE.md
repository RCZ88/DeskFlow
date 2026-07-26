# CONTEXT_BUNDLE.md — Focus Sessions System

## Overview

Focus Sessions track productive time by monitoring foreground app changes. The system has 4 layers:
1. **Main process**: polls active window, sends `foreground-changed` IPC events with app name + category
2. **DashboardPage listener**: receives events, updates `currentApp` state, populates activity feed
3. **Timer/stopwatch**: accumulates productive milliseconds via interval timer, respects tier-based behavior rules
4. **Session saver**: when app switches from productive → non-productive, saves the session to `productivity_sessions` DB table

---

## Layer 1: Main Process Tracking

### `categorizeApp()` at `src/main.ts:2301`
```typescript
function categorizeApp(appName) {
    const lower = appName.toLowerCase();
    if (categoryConfig.appCategoryMap[appName]) return categoryConfig.appCategoryMap[appName];    // user override
    if (categoryConfig.detectedApps[lower]) return categoryConfig.detectedApps[lower];            // cached
    for (const [keyword, category] of Object.entries(DEFAULT_APP_CATEGORIES)) {                   // keyword match
        if (lower.includes(keyword)) {
            categoryConfig.detectedApps[lower] = category;
            saveCategoryConfig();
            return category;
        }
    }
    return 'Uncategorized';  // fallback
}
```

### `DEFAULT_APP_CATEGORIES` at `src/main.ts:192`
Maps ~150+ app name keywords to categories: 'IDE', 'Browser', 'AI Tools', 'Entertainment', 'Communication', 'Design', 'Productivity', 'Developer Tools', 'Tools', 'News', 'Shopping', 'Social Media', 'Search Engine', 'Other'.
Example: `'code': 'IDE'`, `'chrome': 'Browser'`, `'slack': 'Communication'`

### Foreground changed event at `src/main.ts:2537`:
```typescript
mainWindow.webContents.send('foreground-changed', {
    app: appName,
    title: windowTitle,
    category: categorizeApp(appName),
    timestamp: new Date().toISOString(),
    isReal: true
});
```
**Note:** No `tier` field is sent — only `category`. The tier is computed by the renderer via `getTierFromCategory()`.

The main process also sends `tracking-heartbeat` every 5s at `main.ts:2808`:
```typescript
mainWindow.webContents.send('tracking-heartbeat', {
    isTracking, currentApp, uptime: Date.now(), systemIdleSeconds
});
```

---

## Layer 2: DashboardPage Listener

### `onForegroundChange` at `DashboardPage.tsx:667-761`
```typescript
useEffect(() => {
    window.deskflowAPI.onForegroundChange((data: ForegroundData) => {
        // Check if tracking browser
        const isTrackingBrowser = trackingBrowser && data.app && 
            data.app.toLowerCase().includes(trackingBrowser.toLowerCase());
        // Check if Tracker app itself
        const isTrackerApp = data.app && (
            data.app.toLowerCase().includes('deskflow') ||
            data.app.toLowerCase().includes('electron')
        );
        
        if (isTrackingBrowser) {
            setIsInBrowser(true);
            return;  // ⛔ Does NOT set currentApp!
        }
        
        setIsInBrowser(false);
        setCurrentWebsite(null);
        
        if (isTrackerApp) {
            if (trackerAppMode === 'show-other') {
                if (lastNonBrowserApp) setCurrentApp(lastNonBrowserApp);
                return;
            } else if (trackerAppMode === 'pause') {
                setCurrentApp(lastNonBrowserApp || null);
                setIsPaused(true);
                setPausedByTrackerApp(true);
                return;  // ⛔ Does NOT set currentApp to the actual app!
            }
            // 'track' mode falls through
        }
        
        setLastNonBrowserApp(data);
        setCurrentApp(data);
        
        // Track in activity feed...
    });
}, [trackingBrowser, trackerAppMode, lastNonBrowserApp]);
```

### `interface ForegroundData` at `DashboardPage.tsx:61`
```typescript
interface ForegroundData {
    app?: string;
    title?: string;
    category?: string;
    tier?: 'productive' | 'neutral' | 'distracting';
}
```
Note: `tier` is declared but NEVER sent by main process. It's computed client-side.

---

## Layer 3: Timer / Stopwatch

### State/Ref declarations at `DashboardPage.tsx:225-237`
```typescript
const stopwatchTimerRef = useRef<NodeJS.Timeout | null>(null);
const stopwatchAccumulatedRef = useRef(0);      // accumulated productive ms
const stopwatchLastTickRef = useRef(0);          // last tick time
const stopwatchActiveRef = useRef(false);        // is timer actively running
const stopwatchPausedRef = useRef(false);        // is timer paused
const productivitySessionStartRef = useRef<number | null>(null);
const productivitySessionAppRef = useRef<string | null>(null);
const lastInteractionRef = useRef<number>(Date.now());
```

### Timer effect at `DashboardPage.tsx:839-945`
**Dependencies:** `[currentApp, currentWebsite, isInBrowser, lastNonBrowserApp, isPaused, externalSessionRunning, externalSessionStart, timerBehavior, tierAssignments]`

Logic:
1. Determines `currentCategory` from `isInBrowser ? (currentWebsite?.category || lastNonBrowserApp?.category) : currentApp?.category`
2. Computes `tier = getTierFromCategory(currentCategory || '')`
3. Uses `timerBehavior` to decide: `shouldAccumulate`, `shouldPause`, `shouldReset`
4. If shouldReset → resets accumulated to 0, returns
5. If shouldPause && !isExternal → pauses, returns
6. Otherwise starts a 1s interval that accumulates delta: `stopwatchAccumulatedRef.current += delta; setCurrentProductiveMs(stopwatchAccumulatedRef.current);`
7. Idle guard: skips accumulation if `lastInteractionRef.current > 5 minutes ago`

### `tierAssignments` prop (default) at `DashboardPage.tsx:177`
```typescript
tierAssignments = {
    productive: ['IDE', 'AI Tools', 'Education', 'Productivity', 'Tools'],
    neutral: ['Browser', 'Communication', 'Design', 'News', 'Uncategorized', 'Other'],
    distracting: ['Entertainment', 'Social Media', 'Shopping']
}
```

### `getTierFromCategory` at `DashboardPage.tsx:658`
```typescript
const getTierFromCategory = (category?: string): 'productive' | 'neutral' | 'distracting' => {
    if (!category) return 'neutral';
    const tiers = tierAssignments || DEFAULT_TIER_ASSIGNMENTS;
    if (tiers.productive.includes(category)) return 'productive';
    if (tiers.distracting.includes(category)) return 'distracting';
    return 'neutral';
};
```

---

## Layer 4: Session Saving

### Session saver effect at `DashboardPage.tsx:948-1007`
**Dependencies:** `[currentApp, currentWebsite, isInBrowser, lastNonBrowserApp, isPaused, timerBehavior, tierAssignments]`

Logic:
1. Determines `currentCategory` and `tier` same as timer
2. `shouldCountSession`: if productive tier (or neutral with 'ignore') → counts as session
3. If `shouldCountSession` AND `productivitySessionStartRef` is null → starts new session (records `Date.now()` in ref)
4. If NOT `shouldCountSession` AND session was in progress → saves to DB
5. **Saving condition:** `durationSec >= 60` (1-minute minimum)
6. Saves via IPC: `window.deskflowAPI.saveProductivitySession(session)`
7. On success: dispatches `focus-session-saved` custom event
8. On fail: logs error, does NOT retry

### Periodic flush effect at `DashboardPage.tsx:1010-1033`
- Runs every 60s
- If a productive session is ongoing, saves current duration and restarts start time
- Same IPC call as above

### IPC Handler at `src/main.ts:10002-10037`
```typescript
ipcMain.handle('save-productivity-session', (event, session) => {
    // Computes day, weekNum, month from started_at
    // INSERT INTO productivity_sessions (...)
    // Returns { id: lastInsertRowid }
});
```

### DB Schema at `src/main.ts:1839-1852`
```sql
CREATE TABLE IF NOT EXISTS productivity_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds INTEGER DEFAULT 0,
    app_name TEXT,
    category TEXT,
    is_streak INTEGER DEFAULT 0,
    day INTEGER,
    week_number INTEGER,
    month INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);
```

### Preload bridges at `src/preload.ts:122-127`
```typescript
saveProductivitySession: (session) => ipcRenderer.invoke('save-productivity-session', session),
getProductivitySessions: (opts?) => ipcRenderer.invoke('get-productivity-sessions', opts || {}),
clearProductivitySessions: () => ipcRenderer.invoke('clear-productivity-sessions'),
```

**IMPORTANT:** `getProductivitySessions` is NOT in the `Window.deskflowAPI` type declaration at `App.tsx:88`. It's only in preload. This means the `Window` interface doesn't know about it — but it doesn't cause a TS error because `deskflowAPI` is typed as `any` effectively (the interface is incomplete).

---

## Data Flow Diagram

```
Main Process                             Renderer (DashboardPage)
────────────                             ────────────────────────
pollForeground() every 5s               
  → getActiveWindow()                   
  → categorizeApp(name)                 
  → send('foreground-changed') ──────→  onForegroundChange listener
                                         → setIsInBrowser(if browser)
                                         → setCurrentApp(data)  
                                         → setLastNonBrowserApp(data)
                                         → update activity feed
                                        
                                          Timer Effect (runs on currentApp change)
                                         → getTierFromCategory(category)
                                         → shouldAccumulate? → start interval
                                         → interval: +delta to accumulatedRef
                                         → setCurrentProductiveMs()
                                         
                                          Session Saver Effect (runs on currentApp change)
                                         → shouldCountSession?
                                           YES → startSession(ref timestamp)
                                           NO → endSession → saveToDB via IPC
                                         
                                         Focus Sessions UI (in JSX IIFE)
                                         → getProductivitySessions(period, minDuration)
                                         → displays stats cards (today best/week best/all-time PB)
                                         → lists session history
                                         → auto-refresh every 5s + on focus-session-saved event
```

---

## Known Issues / Potential Problems

1. **`currentApp` is null on first render** — foreground-change event hasn't fired yet. Timer and session effects run with null app.
2. **Browser apps never set `currentApp`** — when `isTrackingBrowser` is true, `setIsInBrowser(true)` is called but `currentApp` is NOT updated. The code uses `isInBrowser ? (currentWebsite?.category || lastNonBrowserApp?.category) : currentApp?.category`. If `currentWebsite` is also null → `lastNonBrowserApp` which may be stale.
3. **No `tier` field in foreground-changed IPC** — despite `ForegroundData.tier` being declared, the main process never sends it. Tier is computed client-side from category, which may not match.
4. **IIFE hooks anti-pattern** — `useState`, `useCallback`, `useEffect` inside `{(() => { ... })()}` in JSX violates React Rules of Hooks.
5. **Type gap** — `getProductivitySessions` is in preload but not in App.tsx's `Window.deskflowAPI` type.
