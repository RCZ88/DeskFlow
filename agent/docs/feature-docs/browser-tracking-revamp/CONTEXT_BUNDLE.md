# CONTEXT BUNDLE — Browser Tracking System Revamp

> Generated: 2026-07-11 | Cycle 164
> Purpose: Complete context for revamping DeskFlow's browser tracking to support multi-profile, multi-browser, extension UI, and accurate website time tracking.

---

## 1. CURRENT ARCHITECTURE (Complete Data Flow)

### Extension → Backend → Frontend pipeline

```
Chrome MV3 Extension (background.js, 645 lines)
  │
  ├── chrome.alarms every 5s → periodicSync()
  │     ├── Sends POST /browser-data with: { domain, url, title, sanitized_url, active_duration_ms, delta_ms, is_periodic, tab_id, is_browser_focused }
  │     └── Sends POST /browser-log for live-log streaming
  │
  ├── chrome.tabs.onActivated → updateActiveTab()
  ├── chrome.tabs.onUpdated → logPreviousSession() + update
  ├── chrome.webNavigation.onCompleted → logPreviousSession() + update
  ├── chrome.windows.onFocusChanged → flush on loss, refresh on gain
  └── chrome.tabs.onRemoved → flush active tab
  │
  ▼
Electron Main Process (main.ts, 22345 lines)
  │
  ├── HTTP Server on port 54321 (startBrowserTrackingServer)
  │     ├── POST /browser-data → handleBrowserData()
  │     │     ├── Guards: isBrowserTrackingEnabled, is_browser_focused, isAppMatchingBrowser, excluded domains, min 2s, 30s dedup
  │     │     ├── Delta calculation: extension delta_ms or legacy duration subtraction
  │     │     ├── Writes to: logs table (is_browser_tracking=1) + activeBrowserSessions Map
  │     │     └── Sends IPC: mainWindow.webContents.send('browser-tracking-event', { type:'browser-data', ... })
  │     │
  │     ├── POST /browser-identify → sets userPreferences.browserWithExtension
  │     ├── GET /foreground-app → returns { app: currentApp, isTracking }
  │     ├── POST /browser-log → live-log streaming to renderer
  │     └── GET /health → health check
  │
  ├── isAppMatchingBrowser() — matches app name against BROWSER_PROCESS_NAMES mapping
  ├── BROWSER_PROCESS_NAMES — maps brand names to process names (e.g. 'comet'→['chrome','comet','chromium'])
  ├── categorizeDomain() — assigns website categories from rules
  └── activeBrowserSessions Map<domain, SessionEntry> — in-memory delta tracking
  │
  ▼
Renderer (DashboardPage.tsx, 2848 lines)
  │
  ├── useEffect → window.deskflowAPI.onBrowserTrackingEvent()
  │     ├── data.type === 'browser-data' | 'live-log'
  │     ├── Guards: isInBrowser (foreground check), is_browser_focused
  │     ├── Sets: currentWebsite { title, domain, url, category }
  │     ├── Updates: activityFeed with browser items
  │     └── Timer logic: accumulates based on productive/distracting tier
  │
  ├── StopwatchTimer component — shows current website, category, duration
  └── BrowserActivityPage.tsx — website analytics with charts
```

### Key State Variables in Extension

```javascript
state = {
  activeTabId: null,           // Chrome tab ID
  activeTabUrl: '',            // Full URL
  activeTabTitle: '',          // Page title
  activeTabDomain: '',         // Extracted domain
  sessionStart: Date.now(),    // When current tab became active
  lastPeriodicSync: Date.now(), // Last sync time for delta calculation
  isTrackingEnabled: true,
  serverHealthy: false,
  isBrowserFocused: true       // Whether browser window has focus
}
```

### Key Variables in Main Process

```typescript
userPreferences.browserWithExtension: string  // Single browser name (e.g. "Comet")
userPreferences.browserProcessNames: string[] // Process names for matching
currentApp: string                           // Current foreground app from active-win
isBrowserTrackingEnabled: boolean            // Global toggle
activeBrowserSessions: Map<string, LogEntry> // Domain → session for delta tracking
lastActiveBrowserDomain: string              // For 30s dedup
lastActiveBrowserTimestamp: number           // For 30s dedup
```

### Key Variables in Renderer

```typescript
isInBrowser: boolean           // Whether foreground app matches tracking browser
currentWebsite: { title, url, category, domain } | null
lastNonBrowserApp: foregroundChangeData | null  // Preserved when browser focused
trackingBrowser: string        // From preferences (e.g. "Comet")
```

---

## 2. CRITICAL LIMITATIONS (What's Broken / Missing)

### Limitation 1: Single Profile / Single Browser
- `browserWithExtension` stores ONE browser name
- Extension identifies itself as ONE browser via `identifyBrowser()` → POST `/browser-identify`
- No way to track multiple browsers simultaneously (e.g. Chrome for work + Firefox for personal)
- No way to distinguish Chrome profiles (work vs personal)

### Limitation 2: No Extension Popup UI
- Extension has no popup.html or popup.js
- No way for user to:
  - See current tracking status
  - Start/stop tracking
  - See what category the current page is
  - Configure settings
  - Switch profiles

### Limitation 3: No Profile Nickname System
- `browser_profiles` table EXISTS in DB schema but has NO IPC handlers and NO frontend UI
- No way to name profiles (e.g. "Work Chrome", "Personal Firefox")
- No way to associate tracking data with specific profiles
- No way to filter by profile in analytics

### Limitation 4: No Multi-Browser Simultaneous Tracking
- If user has Chrome AND Firefox open with extension, only the LAST one to identify wins
- `browserWithExtension` gets overwritten by each `browser-identify` call
- Data from the "other" browser gets rejected by `isAppMatchingBrowser` guard

### Limitation 5: Stopwatch Timer Doesn't Show Browser Context
- Stopwatch shows "Currently tracking: [category]" but not which browser/profile
- No visual distinction between work browser and personal browser activity

---

## 3. DATABASE SCHEMA (Existing)

### browser_profiles table (exists but unused)
```sql
-- Found in src/database/schema.ts but NO IPC handlers exist
CREATE TABLE IF NOT EXISTS browser_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  browser_name TEXT NOT NULL,           -- e.g. 'Chrome', 'Firefox'
  profile_id TEXT NOT NULL,             -- Chrome profile ID or similar
  profile_name TEXT,                    -- User-given name e.g. 'Work Chrome'
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(browser_name, profile_id)
);
```

### logs table (browser tracking columns)
```sql
-- Browser tracking entries use these columns:
app TEXT,              -- Set to domain name for browser entries
domain TEXT,           -- The website domain
url TEXT,              -- Full URL
title TEXT,            -- Page title
tab_id INTEGER,        -- Chrome tab ID
is_browser_tracking INTEGER DEFAULT 0,  -- Flag for browser entries
category TEXT,         -- From categorizeDomain()
duration_ms INTEGER    -- Time spent
```

---

## 4. FILES INVOLVED

### Extension
- `browser-extension/background.js` (645 lines) — MV3 service worker, all tracking logic
- `browser-extension/manifest.json` — MV3 manifest, permissions

### Backend (main.ts)
- `src/main.ts` lines 4340-4367 — BROWSER_PROCESS_NAMES, isAppMatchingBrowser
- `src/main.ts` lines 14372-14700 — startBrowserTrackingServer, handleBrowserData
- `src/main.ts` — userPreferences.browserWithExtension, browserServerPort

### Frontend
- `src/pages/DashboardPage.tsx` lines 1085-1164 — browser event listener, currentWebsite state
- `src/pages/dashboard/StopwatchTimer.tsx` — timer display with browser context
- `src/pages/BrowserActivityPage.tsx` — website analytics page

### Database
- `src/database/schema.ts` — browser_profiles table definition (unused)
- `src/preload.ts` lines 102-121 — browser IPC bridge methods

---

## 5. EXTERNAL REFERENCES

### Previous Overhaul Docs (for reference, NOT to copy)
- `agent/docs/tracking-system-overhaul-06062026/RESULT.md` — Fixed period navigation freeze, website accuracy, game detection
- `agent/docs/tracking-revamp-28052026/RESULT.md` — Earlier bugs with browser data, sleep chart

### User's Original Concerns
1. Browser tracking doesn't show on the stopwatch
2. Poor tracking accuracy
3. No browser extension UI
4. No multi-profile/multi-browser support
5. No profile nickname configuration

---

## 6. DESIGN REQUIREMENTS (What the Revamp Must Achieve)

### A. Multi-Profile Support
- Extension sends a profile identifier with each data payload
- Backend stores profile_id on each log entry
- Frontend can filter analytics by profile
- Profile switching UI in extension popup

### B. Multi-Browser Simultaneous Tracking
- Support multiple browsers running extension simultaneously
- Each browser+profile combination tracked independently
- No overwrite of `browserWithExtension` — use a registry of active browsers

### C. Extension Popup UI
- Current tracking status (what page, category, duration)
- Start/stop tracking toggle
- Profile selector / switcher
- Category indicator (productive/neutral/distracting)
- Quick settings (exclude domain, etc.)

### D. Profile Nickname Configuration
- Settings page UI for managing browser profiles
- Give friendly names to browser+profile combos
- Associate profiles with projects or categories
- Visual indicator in dashboard showing which profile is active

### E. Stopwatch Timer Integration
- Show which browser profile is currently tracked
- Visual distinction between work/personal browser activity
- Profile-aware productivity scoring

### F. Accurate Website Time Tracking
- Delta-based tracking (already partially implemented)
- Deduplication across tabs (already implemented)
- Focus guards (already implemented)
- Per-profile session isolation

---

## 7. ANTI-PATTERNS TO AVOID

- Do NOT overwrite `browserWithExtension` with each identify call — use a registry
- Do NOT assume single browser — design for N browsers × M profiles
- Do NOT skip the extension popup — it's a core UX requirement
- Do NOT forget profile_id on log entries — it's essential for multi-profile analytics
- Do NOT break existing single-browser tracking — must be backward compatible

---

## 8. BUILD & VERIFY COMMANDS

```bash
# Build renderer
npx vite build

# Build preload
npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs

# Build main process
node scripts/rebuild-main.mjs

# Launch app
npx electron .
```
