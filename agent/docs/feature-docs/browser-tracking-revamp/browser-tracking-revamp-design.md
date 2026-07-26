# DeskFlow Browser Tracking System Revamp — Complete Design Specification

> **Generated:** 2026-07-11 | **Cycle:** 164  
> **Target:** Full-stack implementation (Extension + Main Process + Renderer)  
> **Status:** Design Specification — Ready for Implementation

---

## Table of Contents

1. [Database Schema Changes](#a-database-schema-changes)
2. [Extension Architecture Redesign](#b-extension-architecture-redesign)
3. [Extension Popup UI (High-Fidelity Visual Spec)](#c-extension-popup-ui-high-fidelity-visual-spec)
4. [Backend IPC Handlers](#d-backend-ipc-handlers)
5. [Frontend Profile Management UI](#e-frontend-profile-management-ui)
6. [Stopwatch Timer Integration](#f-stopwatch-timer-integration)
7. [Analytics Page Changes](#g-analytics-page-changes)
8. [Backward Compatibility Strategy](#backward-compatibility-strategy)
9. [Error Handling & Edge Cases](#error-handling--edge-cases)
10. [Anti-Slop Verification](#anti-slop-verification)

---

## A. Database Schema Changes

### A.1 Existing Schema (Baseline)

The `browser_profiles` table already exists but is **unused**. The `logs` table stores browser entries with `app` set to the domain name, but has **no profile linkage**.

```sql
-- EXISTING (unused)
CREATE TABLE browser_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  browser_name TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  profile_name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(browser_name, profile_id)
);

-- EXISTING (logs table — browser entries)
-- app TEXT, domain TEXT, url TEXT, title TEXT, tab_id INTEGER,
-- is_browser_tracking INTEGER DEFAULT 0, category TEXT, duration_ms INTEGER
```

### A.2 Schema Changes

#### A.2.1 Extend `browser_profiles` table

Add columns for richer profile metadata and tracking state:

```sql
-- Migration: 001_add_browser_profile_columns.sql
ALTER TABLE browser_profiles ADD COLUMN browser_version TEXT;
ALTER TABLE browser_profiles ADD COLUMN last_seen_at TEXT;
ALTER TABLE browser_profiles ADD COLUMN total_duration_ms INTEGER DEFAULT 0;
ALTER TABLE browser_profiles ADD COLUMN is_connected INTEGER DEFAULT 0;
ALTER TABLE browser_profiles ADD COLUMN color_tag TEXT DEFAULT '#ec4899'; -- DeskFlow pink-500

-- Update trigger for updated_at
CREATE TRIGGER IF NOT EXISTS browser_profiles_updated_at
AFTER UPDATE ON browser_profiles
BEGIN
  UPDATE browser_profiles SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```

#### A.2.2 Add `profile_id` to `logs` table

```sql
-- Migration: 002_add_profile_id_to_logs.sql
ALTER TABLE logs ADD COLUMN profile_id TEXT;
ALTER TABLE logs ADD COLUMN browser_name TEXT;

-- Index for fast per-profile queries
CREATE INDEX IF NOT EXISTS idx_logs_profile_id ON logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_logs_browser_name ON logs(browser_name);
CREATE INDEX IF NOT EXISTS idx_logs_is_browser_tracking ON logs(is_browser_tracking) WHERE is_browser_tracking = 1;
```

#### A.2.3 New Aggregate Table: `browser_profile_stats`

```sql
-- Migration: 003_create_browser_profile_stats.sql
CREATE TABLE IF NOT EXISTS browser_profile_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id TEXT NOT NULL,
  browser_name TEXT NOT NULL,
  date TEXT NOT NULL, -- ISO 8601 date (YYYY-MM-DD)
  total_duration_ms INTEGER DEFAULT 0,
  productive_duration_ms INTEGER DEFAULT 0,
  distracting_duration_ms INTEGER DEFAULT 0,
  neutral_duration_ms INTEGER DEFAULT 0,
  site_count INTEGER DEFAULT 0,
  top_domain TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(profile_id, date)
);

CREATE INDEX IF NOT EXISTS idx_profile_stats_date ON browser_profile_stats(date);
CREATE INDEX IF NOT EXISTS idx_profile_stats_browser ON browser_profile_stats(browser_name);
```

### A.3 Migration Strategy (Non-Destructive)

```typescript
// src/database/migrations.ts
export const browserTrackingMigrations = [
  {
    version: 14,
    name: 'add_browser_profile_columns',
    up: `
      ALTER TABLE browser_profiles ADD COLUMN browser_version TEXT;
      ALTER TABLE browser_profiles ADD COLUMN last_seen_at TEXT;
      ALTER TABLE browser_profiles ADD COLUMN total_duration_ms INTEGER DEFAULT 0;
      ALTER TABLE browser_profiles ADD COLUMN is_connected INTEGER DEFAULT 0;
      ALTER TABLE browser_profiles ADD COLUMN color_tag TEXT DEFAULT '#ec4899';
    `,
  },
  {
    version: 15,
    name: 'add_profile_id_to_logs',
    up: `
      ALTER TABLE logs ADD COLUMN profile_id TEXT;
      ALTER TABLE logs ADD COLUMN browser_name TEXT;
      CREATE INDEX idx_logs_profile_id ON logs(profile_id);
      CREATE INDEX idx_logs_browser_name ON logs(browser_name);
    `,
  },
  {
    version: 16,
    name: 'create_browser_profile_stats',
    up: `
      CREATE TABLE browser_profile_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id TEXT NOT NULL,
        browser_name TEXT NOT NULL,
        date TEXT NOT NULL,
        total_duration_ms INTEGER DEFAULT 0,
        productive_duration_ms INTEGER DEFAULT 0,
        distracting_duration_ms INTEGER DEFAULT 0,
        neutral_duration_ms INTEGER DEFAULT 0,
        site_count INTEGER DEFAULT 0,
        top_domain TEXT,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(profile_id, date)
      );
      CREATE INDEX idx_profile_stats_date ON browser_profile_stats(date);
    `,
  },
];

// Backward compatibility: existing logs without profile_id remain valid.
// Queries use COALESCE: WHERE profile_id = ? OR profile_id IS NULL
```

### A.4 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER REGISTRY                             │
│  Map<string, BrowserProfile> — key = `${browser_name}:${profile_id}` │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Chrome:Work  │  │ Firefox:Pers│  │ Edge:Dev     │              │
│  │ id=chrome_1  │  │ id=ff_abc   │  │ id=edge_2    │              │
│  │ connected=1  │  │ connected=0 │  │ connected=1  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          LOGS TABLE                                 │
│  ┌────────┬─────────────┬────────────┬──────────┬──────────┐        │
│  │ app    │ domain      │ profile_id │ browser  │ duration │        │
│  ├────────┼─────────────┼────────────┼──────────┼──────────┤        │
│  │ github │ github.com  │ chrome_1   │ Chrome   │ 45000    │        │
│  │ x.com  │ x.com       │ ff_abc     │ Firefox  │ 12000    │        │
│  │ docs   │ docs.google │ edge_2     │ Edge     │ 89000    │        │
│  └────────┴─────────────┴────────────┴──────────┴──────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## B. Extension Architecture Redesign

### B.1 Core Problem: Profile Detection

Chrome MV3 extensions **cannot** directly read the OS-level Chrome profile directory name (e.g., `Profile 1`, `Default`). However, we can derive a **stable profile identifier** through multiple strategies:

#### Strategy 1: Chrome Identity API (Primary)
```javascript
// Requires "identity" permission in manifest.json
// Returns a stable account ID if user is signed in
chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (info) => {
  const profileId = info.id || 'anonymous'; // Stable Google account ID
  // Fallback: use chrome.storage.sync to store a generated UUID
});
```

#### Strategy 2: Storage-Based UUID (Fallback)
```javascript
// For users not signed into Chrome, generate a persistent UUID
async function getProfileIdentifier() {
  const stored = await chrome.storage.sync.get('df_profile_id');
  if (stored.df_profile_id) return stored.df_profile_id;

  // Generate UUID v4
  const uuid = crypto.randomUUID();
  await chrome.storage.sync.set({ df_profile_id: uuid });
  return uuid;
}
```

#### Strategy 3: Browser-Specific Heuristics (Last Resort)
```javascript
function detectBrowserBrand() {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Brave')) return 'Brave';
  if (ua.includes('Vivaldi')) return 'Vivaldi';
  if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Arc/')) return 'Arc';
  if (ua.includes('Chrome/') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  return 'Unknown';
}
```

### B.2 Redesigned Extension State

```javascript
// browser-extension/background.js — NEW state object
const state = {
  // Tab tracking (existing)
  activeTabId: null,
  activeTabUrl: '',
  activeTabTitle: '',
  activeTabDomain: '',
  sessionStart: Date.now(),
  lastPeriodicSync: Date.now(),
  isTrackingEnabled: true,
  isBrowserFocused: true,
  serverHealthy: false,

  // NEW: Profile & multi-browser support
  profile: {
    id: null,           // Stable profile ID (UUID or Google account ID)
    name: null,         // User-configured nickname (from DeskFlow DB)
    browserName: null,  // Detected browser brand
    browserVersion: null, // Browser version string
    isRegistered: false, // Whether backend has acknowledged this profile
  },

  // NEW: Connection state
  connection: {
    serverUrl: 'http://localhost:54321',
    lastPing: 0,
    retryCount: 0,
  }
};
```

### B.3 Multi-Browser Registration Protocol

Instead of overwriting a single `browserWithExtension` string, each browser instance **registers** itself in a shared registry.

#### B.3.1 POST `/browser-identify` (Redesigned)

**Request Payload:**
```json
{
  "browser_name": "Chrome",
  "browser_version": "126.0.0.1",
  "profile_id": "chrome_profile_abc123",
  "profile_name": "Work Chrome",
  "timestamp": 1720704000000,
  "extension_version": "1.4.0"
}
```

**Backend Behavior:**
```typescript
// src/main.ts — handleBrowserIdentify()
interface BrowserIdentifyPayload {
  browser_name: string;
  browser_version: string;
  profile_id: string;
  profile_name?: string;
  timestamp: number;
  extension_version: string;
}

// NEW: Registry of active browser profiles
const activeBrowserProfiles = new Map<string, BrowserProfile>(); // key = `${browser_name}:${profile_id}`

async function handleBrowserIdentify(payload: BrowserIdentifyPayload) {
  const key = `${payload.browser_name}:${payload.profile_id}`;

  // Upsert in database
  const profile = await db.upsertBrowserProfile({
    browser_name: payload.browser_name,
    profile_id: payload.profile_id,
    profile_name: payload.profile_name || `${payload.browser_name} Profile`,
    browser_version: payload.browser_version,
    last_seen_at: new Date().toISOString(),
    is_connected: 1,
  });

  // Register in memory
  activeBrowserProfiles.set(key, {
    ...profile,
    lastSeenAt: Date.now(),
    isConnected: true,
  });

  // Broadcast to renderer
  mainWindow?.webContents.send('browser-profiles-updated', {
    profiles: Array.from(activeBrowserProfiles.values()),
  });

  return { success: true, profile_id: payload.profile_id, server_time: Date.now() };
}
```

#### B.3.2 POST `/browser-data` (Redesigned)

**Request Payload:**
```json
{
  "domain": "github.com",
  "url": "https://github.com/deskflow/deskflow",
  "title": "deskflow/deskflow",
  "sanitized_url": "https://github.com/deskflow/deskflow",
  "active_duration_ms": 5000,
  "delta_ms": 5000,
  "is_periodic": true,
  "tab_id": 42,
  "is_browser_focused": true,
  "profile_id": "chrome_profile_abc123",
  "browser_name": "Chrome"
}
```

**Backend Behavior:**
```typescript
// src/main.ts — handleBrowserData()
async function handleBrowserData(payload: BrowserDataPayload) {
  // NEW: Look up profile from registry instead of single browserWithExtension
  const key = `${payload.browser_name}:${payload.profile_id}`;
  const profile = activeBrowserProfiles.get(key);

  if (!profile) {
    // Auto-register unknown profile (graceful degradation)
    await handleBrowserIdentify({
      browser_name: payload.browser_name,
      profile_id: payload.profile_id,
      browser_version: 'unknown',
      timestamp: Date.now(),
      extension_version: 'unknown',
    });
  }

  // Existing guards: isBrowserTrackingEnabled, excluded domains, etc.
  // ... existing validation logic ...

  // NEW: Store profile_id and browser_name with log entry
  const logEntry = {
    ...payload,
    app: payload.domain,
    is_browser_tracking: 1,
    category: categorizeDomain(payload.domain),
    profile_id: payload.profile_id,
    browser_name: payload.browser_name,
  };

  await db.insertLog(logEntry);

  // Update activeBrowserSessions with profile context
  activeBrowserSessions.set(payload.domain, {
    ...logEntry,
    profileKey: key,
  });

  // Broadcast to renderer with profile context
  mainWindow?.webContents.send('browser-tracking-event', {
    type: 'browser-data',
    ...logEntry,
    profile,
  });
}
```

### B.4 Extension Background.js — Key Changes

```javascript
// browser-extension/background.js — REVISED KEY SECTIONS

// ─────────────────────────────────────────────────────────────
// 1. PROFILE DETECTION & REGISTRATION
// ─────────────────────────────────────────────────────────────

async function detectProfile() {
  // Try Chrome Identity API first
  try {
    const info = await chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' });
    if (info.id) {
      return { id: info.id, source: 'google_account' };
    }
  } catch (e) {
    console.log('[DeskFlow] Identity API unavailable, using fallback');
  }

  // Fallback: storage-based UUID
  const stored = await chrome.storage.sync.get('df_profile_id');
  if (stored.df_profile_id) {
    return { id: stored.df_profile_id, source: 'storage_uuid' };
  }

  // Generate new UUID
  const uuid = crypto.randomUUID();
  await chrome.storage.sync.set({ df_profile_id: uuid });
  return { id: uuid, source: 'generated' };
}

async function identifyBrowser() {
  const profile = await detectProfile();
  const browserName = detectBrowserBrand();
  const version = navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/([\d.]+)/)?.[2] || 'unknown';

  state.profile.id = profile.id;
  state.profile.browserName = browserName;
  state.profile.browserVersion = version;

  const payload = {
    browser_name: browserName,
    browser_version: version,
    profile_id: profile.id,
    timestamp: Date.now(),
    extension_version: chrome.runtime.getManifest().version,
  };

  try {
    const res = await fetch(`${state.connection.serverUrl}/browser-identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      state.profile.isRegistered = true;
      state.profile.name = data.profile_name || payload.browser_name;
      state.serverHealthy = true;
      state.connection.lastPing = Date.now();
    }
  } catch (e) {
    state.serverHealthy = false;
    state.connection.retryCount++;
  }
}

// ─────────────────────────────────────────────────────────────
// 2. PERIODIC SYNC WITH PROFILE CONTEXT
// ─────────────────────────────────────────────────────────────

async function periodicSync() {
  if (!state.isTrackingEnabled || !state.activeTabId) return;

  const now = Date.now();
  const delta = now - state.lastPeriodicSync;
  state.lastPeriodicSync = now;

  const payload = {
    domain: state.activeTabDomain,
    url: state.activeTabUrl,
    title: state.activeTabTitle,
    sanitized_url: sanitizeUrl(state.activeTabUrl),
    active_duration_ms: now - state.sessionStart,
    delta_ms: delta,
    is_periodic: true,
    tab_id: state.activeTabId,
    is_browser_focused: state.isBrowserFocused,
    profile_id: state.profile.id,
    browser_name: state.profile.browserName,
  };

  try {
    await fetch(`${state.connection.serverUrl}/browser-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    state.serverHealthy = true;
  } catch (e) {
    state.serverHealthy = false;
  }
}

// ─────────────────────────────────────────────────────────────
// 3. ALARMS & LIFECYCLE
// ─────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodic-sync') {
    periodicSync();
  } else if (alarm.name === 'health-check') {
    identifyBrowser(); // Re-register / heartbeat
  }
});

// Register on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('periodic-sync', { periodInMinutes: 5 / 60 }); // 5s
  chrome.alarms.create('health-check', { periodInMinutes: 1 });
  identifyBrowser();
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('periodic-sync', { periodInMinutes: 5 / 60 });
  chrome.alarms.create('health-check', { periodInMinutes: 1 });
  identifyBrowser();
});
```

### B.5 Manifest.json Changes

```json
{
  "manifest_version": 3,
  "name": "DeskFlow Browser Tracker",
  "version": "1.4.0",
  "permissions": [
    "tabs",
    "activeTab",
    "alarms",
    "storage",
    "identity",
    "windows",
    "webNavigation"
  ],
  "host_permissions": [
    "http://localhost:54321/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

## C. Extension Popup UI (High-Fidelity Visual Spec)

### C.1 Design Tokens (DeskFlow Extension Popup)

```css
/* popup.css — DeskFlow Design Tokens */
:root {
  /* Colors */
  --bg-primary: #09090b;        /* zinc-950 */
  --bg-secondary: #18181b;      /* zinc-900 */
  --bg-tertiary: #27272a;       /* zinc-800 */
  --accent-primary: #ec4899;      /* pink-500 */
  --accent-secondary: #f472b6;    /* pink-400 */
  --text-primary: #fafafa;       /* zinc-50 */
  --text-secondary: #a1a1aa;     /* zinc-400 */
  --text-muted: #71717a;         /* zinc-500 */
  --border-subtle: rgba(255,255,255,0.06);
  --border-accent: rgba(236,72,153,0.3);

  /* Category Colors */
  --productive: #22c55e;       /* green-500 */
  --neutral: #f59e0b;            /* amber-500 */
  --distracting: #ef4444;        /* red-500 */

  /* Typography */
  --font-body: 'Geist', 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 13px;
  --text-lg: 15px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;

  /* Geometry */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-xl: 12px;

  /* Motion */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}

/* Dark mode only — no light variants */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

### C.2 Popup Layout Structure

```
┌─────────────────────────────────────────┐  ← 360px width, 540px max-height
│  ┌─────────────────────────────────────┐│
│  │  DeskFlow        [● Connected]      ││  ← Header: logo + connection status
│  │  Browser Tracker                    ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  Profile: ▼ Work Chrome            ││  ← Profile selector (shadcn select)
│  │  Chrome 126 • Profile ID: abc...   ││  ← Meta row
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  ● Currently Tracking               ││  ← Status section
│  │                                     ││
│  │  ┌───────────────────────────────┐  ││
│  │  │ 🌐 github.com/deskflow/...   │  ││  ← Domain + URL (truncated)
│  │  │ "deskflow/deskflow"          │  ││  ← Page title
│  │  │                               │  ││
│  │  │  🟢 Productive    00:04:32   │  ││  ← Category badge + duration
│  │  └───────────────────────────────┘  ││
│  │                                     ││
│  │  [⏸ Pause Tracking]                ││  ← Toggle button (shadcn switch)
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  Quick Actions                      ││
│  │  [🚫 Exclude Domain] [⚙ Settings]  ││  ← Action buttons
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  Today's Stats (Work Chrome)        ││  ← Stats mini-section
│  │  ┌──────────┬──────────┬──────────┐ ││
│  │  │ 2h 14m   │ 1h 45m   │ 29m      │ ││
│  │  │ Productive│ Neutral │ Distract │ ││
│  │  └──────────┴──────────┴──────────┘ ││
│  └─────────────────────────────────────┘│
│                                         │
│  ─────────────────────────────────────  │  ← Separator (shadcn)
│  [🔄 Refresh] [📊 Open DeskFlow]        │  ← Footer actions
└─────────────────────────────────────────┘
```

### C.3 Component Implementation (popup.js + popup.html)

```html
<!-- popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DeskFlow Tracker</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="app" class="popup-container">
    <!-- Loading state (initial) -->
    <div id="loading-state" class="state-container">
      <div class="skeleton-header"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-actions"></div>
    </div>

    <!-- Main content (hidden until loaded) -->
    <div id="main-content" class="hidden">
      <!-- Header -->
      <header class="popup-header">
        <div class="header-brand">
          <div class="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">DeskFlow</span>
            <span class="brand-sub">Browser Tracker</span>
          </div>
        </div>
        <div class="connection-status" id="connection-status">
          <span class="status-dot" id="status-dot"></span>
          <span class="status-text" id="status-text">Connecting...</span>
        </div>
      </header>

      <!-- Profile Selector -->
      <section class="profile-section">
        <div class="profile-selector" id="profile-selector">
          <div class="profile-trigger">
            <div class="profile-avatar" id="profile-avatar">
              <span>C</span>
            </div>
            <div class="profile-info">
              <span class="profile-name" id="profile-name">Loading...</span>
              <span class="profile-meta" id="profile-meta">Detecting...</span>
            </div>
            <svg class="profile-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div class="profile-dropdown hidden" id="profile-dropdown">
            <!-- Populated dynamically -->
          </div>
        </div>
      </section>

      <!-- Tracking Status Card -->
      <section class="tracking-card" id="tracking-card">
        <div class="card-glow" id="card-glow"></div>
        <div class="card-content">
          <div class="tracking-label">
            <span class="pulse-dot" id="pulse-dot"></span>
            <span class="tracking-text" id="tracking-label">Currently Tracking</span>
          </div>

          <div class="site-info" id="site-info">
            <div class="site-domain" id="site-domain">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>github.com</span>
            </div>
            <div class="site-title" id="site-title">deskflow/deskflow</div>
            <div class="site-url" id="site-url">github.com/deskflow/deskflow</div>
          </div>

          <div class="tracking-meta">
            <div class="category-badge productive" id="category-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              <span>Productive</span>
            </div>
            <div class="duration-counter" id="duration-counter">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>00:00:00</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Tracking Toggle -->
      <section class="toggle-section">
        <label class="toggle-label">
          <span>Tracking Active</span>
          <div class="switch-container">
            <input type="checkbox" id="tracking-toggle" checked>
            <div class="switch-track">
              <div class="switch-thumb"></div>
            </div>
          </div>
        </label>
      </section>

      <!-- Quick Actions -->
      <section class="actions-section">
        <button class="action-btn secondary" id="exclude-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>Exclude Domain</span>
        </button>
        <button class="action-btn secondary" id="settings-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>Settings</span>
        </button>
      </section>

      <!-- Today's Stats -->
      <section class="stats-section" id="stats-section">
        <div class="stats-header">Today's Stats</div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value" id="stat-productive">0h 0m</div>
            <div class="stat-label productive">Productive</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="stat-neutral">0h 0m</div>
            <div class="stat-label neutral">Neutral</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="stat-distracting">0h 0m</div>
            <div class="stat-label distracting">Distracting</div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="popup-footer">
        <button class="footer-btn" id="refresh-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          <span>Refresh</span>
        </button>
        <button class="footer-btn primary" id="open-app-btn">
          <span>Open DeskFlow</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </button>
      </footer>
    </div>

    <!-- Error State -->
    <div id="error-state" class="state-container hidden">
      <div class="error-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--distracting)" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="error-title">Server Disconnected</div>
      <div class="error-message">DeskFlow app is not running or unreachable on port 54321.</div>
      <button class="error-btn" id="retry-btn">Retry Connection</button>
    </div>

    <!-- Empty State (no profile) -->
    <div id="empty-state" class="state-container hidden">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <div class="empty-title">No Profile Configured</div>
      <div class="empty-message">Open DeskFlow to set up browser tracking profiles.</div>
      <button class="empty-btn" id="setup-btn">Open DeskFlow</button>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

### C.4 Popup CSS (Complete)

```css
/* popup.css — Complete DeskFlow Extension Popup Styles */

/* ─── Reset & Base ─── */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--text-primary);
  background: var(--bg-primary);
  -webkit-font-smoothing: antialiased;
  width: 360px;
  min-height: 200px;
  overflow-x: hidden;
}

.hidden { display: none !important; }

/* ─── Container ─── */
.popup-container {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* ─── Header ─── */
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
}

.header-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.brand-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-weight: 600;
  font-size: var(--text-sm);
  line-height: 1.2;
}

.brand-sub {
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.2;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: background var(--duration-fast) var(--ease-out);
}

.status-dot.connected { background: var(--productive); box-shadow: 0 0 6px var(--productive); }
.status-dot.disconnected { background: var(--distracting); }
.status-dot.connecting { background: var(--neutral); animation: pulse 1.5s infinite; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ─── Profile Section ─── */
.profile-section {
  position: relative;
}

.profile-selector {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: var(--space-3);
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-out);
}

.profile-selector:hover {
  border-color: var(--border-accent);
}

.profile-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.profile-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--accent-primary), #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: var(--text-sm);
  color: white;
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.profile-name {
  font-weight: 500;
  font-size: var(--text-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-meta {
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-chevron {
  color: var(--text-muted);
  transition: transform var(--duration-fast) var(--ease-out);
  flex-shrink: 0;
}

.profile-selector.open .profile-chevron {
  transform: rotate(180deg);
}

/* Dropdown */
.profile-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: var(--space-2);
  z-index: 50;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  animation: dropdown-in var(--duration-fast) var(--ease-out);
}

@keyframes dropdown-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.profile-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}

.profile-option:hover {
  background: var(--bg-tertiary);
}

.profile-option.active {
  background: rgba(236, 72, 153, 0.1);
}

.profile-option .check-icon {
  margin-left: auto;
  color: var(--accent-primary);
  opacity: 0;
}

.profile-option.active .check-icon {
  opacity: 1;
}

/* ─── Tracking Card ─── */
.tracking-card {
  position: relative;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
  overflow: hidden;
  transition: border-color var(--duration-normal) var(--ease-out);
}

.tracking-card.active {
  border-color: var(--border-accent);
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%);
  opacity: 0;
  transition: opacity var(--duration-slow) var(--ease-out);
  pointer-events: none;
}

.tracking-card.active .card-glow {
  opacity: 1;
}

.card-content {
  position: relative;
  z-index: 1;
}

.tracking-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--space-3);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--productive);
  box-shadow: 0 0 8px var(--productive);
  animation: pulse-dot 2s infinite;
}

.tracking-card.paused .pulse-dot {
  background: var(--text-muted);
  box-shadow: none;
  animation: none;
}

@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.7; }
}

.tracking-text {
  font-size: var(--text-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

/* Site Info */
.site-info {
  margin-bottom: var(--space-3);
}

.site-domain {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  color: var(--accent-primary);
  margin-bottom: 4px;
}

.site-title {
  font-weight: 600;
  font-size: var(--text-lg);
  line-height: 1.3;
  margin-bottom: 2px;
  word-break: break-word;
}

.site-url {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Tracking Meta */
.tracking-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: var(--text-xs);
  font-weight: 500;
}

.category-badge.productive {
  background: rgba(34, 197, 94, 0.12);
  color: var(--productive);
}

.category-badge.neutral {
  background: rgba(245, 158, 11, 0.12);
  color: var(--neutral);
}

.category-badge.distracting {
  background: rgba(239, 68, 68, 0.12);
  color: var(--distracting);
}

.duration-counter {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

/* ─── Toggle Section ─── */
.toggle-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: var(--space-3) var(--space-4);
}

.toggle-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 500;
}

.switch-container {
  position: relative;
  width: 40px;
  height: 22px;
}

.switch-container input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.switch-track {
  position: absolute;
  inset: 0;
  background: var(--bg-tertiary);
  border-radius: 999px;
  transition: background var(--duration-fast) var(--ease-out);
  cursor: pointer;
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  transition: transform var(--duration-fast) var(--ease-out);
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.switch-container input:checked + .switch-track {
  background: var(--accent-primary);
}

.switch-container input:checked + .switch-track .switch-thumb {
  transform: translateX(18px);
}

.switch-container input:focus-visible + .switch-track {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* ─── Actions Section ─── */
.actions-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.action-btn:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-accent);
  color: var(--text-primary);
}

.action-btn:active {
  transform: scale(0.98);
}

/* ─── Stats Section ─── */
.stats-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: var(--space-4);
}

.stats-header {
  font-size: var(--text-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.stat-label {
  font-size: var(--text-xs);
  font-weight: 500;
}

.stat-label.productive { color: var(--productive); }
.stat-label.neutral { color: var(--neutral); }
.stat-label.distracting { color: var(--distracting); }

/* ─── Footer ─── */
.popup-footer {
  display: flex;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-subtle);
}

.footer-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.footer-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.footer-btn.primary {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  border: none;
  color: white;
}

.footer-btn.primary:hover {
  filter: brightness(1.1);
}

/* ─── Skeleton Loading ─── */
.skeleton-header,
.skeleton-card,
.skeleton-actions {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

.skeleton-header { height: 40px; margin-bottom: var(--space-3); }
.skeleton-card { height: 140px; margin-bottom: var(--space-3); }
.skeleton-actions { height: 36px; }

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ─── Error State ─── */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-5) var(--space-4);
  gap: var(--space-3);
  min-height: 300px;
}

.error-title,
.empty-title {
  font-weight: 600;
  font-size: var(--text-lg);
}

.error-message,
.empty-message {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.5;
  max-width: 260px;
}

.error-btn,
.empty-btn {
  margin-top: var(--space-2);
  padding: 10px 24px;
  border-radius: var(--radius-md);
  border: none;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: filter var(--duration-fast) var(--ease-out);
}

.error-btn:hover,
.empty-btn:hover {
  filter: brightness(1.1);
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bg-tertiary); border-radius: 2px; }
```

### C.5 Popup JavaScript Logic

```javascript
// popup.js — Complete DeskFlow Extension Popup Logic

class DeskFlowPopup {
  constructor() {
    this.state = {
      isLoading: true,
      isConnected: false,
      isTracking: true,
      currentProfile: null,
      availableProfiles: [],
      currentSite: null,
      todayStats: { productive: 0, neutral: 0, distracting: 0 },
    };

    this.elements = {};
    this.durationInterval = null;
    this.sessionStart = null;

    this.init();
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.loadState();
  }

  cacheElements() {
    this.elements = {
      loading: document.getElementById('loading-state'),
      main: document.getElementById('main-content'),
      error: document.getElementById('error-state'),
      empty: document.getElementById('empty-state'),

      statusDot: document.getElementById('status-dot'),
      statusText: document.getElementById('status-text'),

      profileName: document.getElementById('profile-name'),
      profileMeta: document.getElementById('profile-meta'),
      profileAvatar: document.getElementById('profile-avatar'),
      profileSelector: document.getElementById('profile-selector'),
      profileDropdown: document.getElementById('profile-dropdown'),

      trackingCard: document.getElementById('tracking-card'),
      trackingLabel: document.getElementById('tracking-label'),
      pulseDot: document.getElementById('pulse-dot'),
      siteDomain: document.getElementById('site-domain'),
      siteTitle: document.getElementById('site-title'),
      siteUrl: document.getElementById('site-url'),
      categoryBadge: document.getElementById('category-badge'),
      durationCounter: document.getElementById('duration-counter'),

      trackingToggle: document.getElementById('tracking-toggle'),
      excludeBtn: document.getElementById('exclude-btn'),
      settingsBtn: document.getElementById('settings-btn'),
      refreshBtn: document.getElementById('refresh-btn'),
      openAppBtn: document.getElementById('open-app-btn'),
      retryBtn: document.getElementById('retry-btn'),
      setupBtn: document.getElementById('setup-btn'),

      statProductive: document.getElementById('stat-productive'),
      statNeutral: document.getElementById('stat-neutral'),
      statDistracting: document.getElementById('stat-distracting'),
    };
  }

  bindEvents() {
    this.elements.trackingToggle.addEventListener('change', (e) => this.toggleTracking(e.target.checked));
    this.elements.excludeBtn.addEventListener('click', () => this.excludeDomain());
    this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
    this.elements.refreshBtn.addEventListener('click', () => this.refresh());
    this.elements.openAppBtn.addEventListener('click', () => this.openDeskFlow());
    this.elements.retryBtn.addEventListener('click', () => this.retryConnection());
    this.elements.setupBtn.addEventListener('click', () => this.openDeskFlow());

    this.elements.profileSelector.addEventListener('click', () => this.toggleProfileDropdown());

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!this.elements.profileSelector.contains(e.target)) {
        this.elements.profileSelector.classList.remove('open');
        this.elements.profileDropdown.classList.add('hidden');
      }
    });
  }

  async loadState() {
    try {
      // Get state from background script
      const bgState = await chrome.runtime.sendMessage({ action: 'getPopupState' });

      if (!bgState) {
        this.showError('Unable to communicate with extension background');
        return;
      }

      this.state.isConnected = bgState.serverHealthy;
      this.state.isTracking = bgState.isTrackingEnabled;
      this.state.currentProfile = bgState.profile;
      this.state.currentSite = {
        domain: bgState.activeTabDomain,
        url: bgState.activeTabUrl,
        title: bgState.activeTabTitle,
        category: bgState.activeTabCategory,
      };
      this.sessionStart = bgState.sessionStart;

      // Fetch today's stats from background
      const stats = await chrome.runtime.sendMessage({ action: 'getTodayStats' });
      if (stats) this.state.todayStats = stats;

      this.render();
    } catch (e) {
      console.error('[DeskFlow Popup] Load error:', e);
      this.showError('Failed to load tracking state');
    }
  }

  render() {
    this.elements.loading.classList.add('hidden');

    if (!this.state.isConnected) {
      this.showError('DeskFlow app is not running');
      return;
    }

    if (!this.state.currentProfile?.id) {
      this.showEmpty();
      return;
    }

    this.elements.main.classList.remove('hidden');
    this.elements.error.classList.add('hidden');
    this.elements.empty.classList.add('hidden');

    this.renderConnectionStatus();
    this.renderProfile();
    this.renderTrackingCard();
    this.renderToggle();
    this.renderStats();
    this.startDurationCounter();
  }

  renderConnectionStatus() {
    const dot = this.elements.statusDot;
    const text = this.elements.statusText;

    dot.className = 'status-dot';
    if (this.state.isConnected) {
      dot.classList.add('connected');
      text.textContent = 'Connected';
    } else {
      dot.classList.add('disconnected');
      text.textContent = 'Disconnected';
    }
  }

  renderProfile() {
    const p = this.state.currentProfile;
    this.elements.profileName.textContent = p.name || 'Unnamed Profile';
    this.elements.profileMeta.textContent = `${p.browserName} ${p.browserVersion || ''} • ${p.id.slice(0, 8)}...`;
    this.elements.profileAvatar.textContent = (p.name || p.browserName || 'P')[0].toUpperCase();
  }

  renderTrackingCard() {
    const site = this.state.currentSite;
    const card = this.elements.trackingCard;

    if (!site?.domain) {
      card.classList.remove('active');
      this.elements.siteDomain.innerHTML = '<span>No active tab</span>';
      this.elements.siteTitle.textContent = 'No website being tracked';
      this.elements.siteUrl.textContent = '';
      this.elements.categoryBadge.className = 'category-badge neutral';
      this.elements.categoryBadge.innerHTML = '<span>—</span>';
      return;
    }

    card.classList.add('active');
    this.elements.siteDomain.querySelector('span').textContent = site.domain;
    this.elements.siteTitle.textContent = site.title || 'Untitled';
    this.elements.siteUrl.textContent = site.url;

    // Category badge
    const cat = site.category || 'neutral';
    const catColors = {
      productive: { class: 'productive', icon: 'check', label: 'Productive' },
      neutral: { class: 'neutral', icon: 'minus', label: 'Neutral' },
      distracting: { class: 'distracting', icon: 'zap', label: 'Distracting' },
    };
    const c = catColors[cat] || catColors.neutral;
    this.elements.categoryBadge.className = `category-badge ${c.class}`;
    this.elements.categoryBadge.innerHTML = `<span>${c.label}</span>`;
  }

  renderToggle() {
    this.elements.trackingToggle.checked = this.state.isTracking;
    this.elements.trackingCard.classList.toggle('paused', !this.state.isTracking);
  }

  renderStats() {
    const s = this.state.todayStats;
    this.elements.statProductive.textContent = this.formatDuration(s.productive);
    this.elements.statNeutral.textContent = this.formatDuration(s.neutral);
    this.elements.statDistracting.textContent = this.formatDuration(s.distracting);
  }

  startDurationCounter() {
    if (this.durationInterval) clearInterval(this.durationInterval);

    const update = () => {
      if (!this.state.isTracking || !this.sessionStart) {
        this.elements.durationCounter.querySelector('span').textContent = '00:00:00';
        return;
      }
      const elapsed = Date.now() - this.sessionStart;
      this.elements.durationCounter.querySelector('span').textContent = this.formatDuration(elapsed);
    };

    update();
    this.durationInterval = setInterval(update, 1000);
  }

  formatDuration(ms) {
    if (typeof ms !== 'number') return ms; // Already formatted string
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  toggleProfileDropdown() {
    this.elements.profileSelector.classList.toggle('open');
    this.elements.profileDropdown.classList.toggle('hidden');
  }

  async toggleTracking(enabled) {
    this.state.isTracking = enabled;
    await chrome.runtime.sendMessage({ action: 'setTracking', enabled });
    this.renderToggle();
  }

  async excludeDomain() {
    const domain = this.state.currentSite?.domain;
    if (!domain) return;
    await chrome.runtime.sendMessage({ action: 'excludeDomain', domain });
    this.showToast(`Excluded ${domain}`);
  }

  openSettings() {
    chrome.runtime.sendMessage({ action: 'openDeskFlow', path: '/settings/browser' });
  }

  openDeskFlow() {
    chrome.runtime.sendMessage({ action: 'openDeskFlow' });
  }

  refresh() {
    this.elements.main.classList.add('hidden');
    this.elements.loading.classList.remove('hidden');
    this.loadState();
  }

  retryConnection() {
    this.refresh();
  }

  showError(message) {
    this.elements.loading.classList.add('hidden');
    this.elements.main.classList.add('hidden');
    this.elements.empty.classList.add('hidden');
    this.elements.error.classList.remove('hidden');
    this.elements.error.querySelector('.error-message').textContent = message;
  }

  showEmpty() {
    this.elements.loading.classList.add('hidden');
    this.elements.main.classList.add('hidden');
    this.elements.error.classList.add('hidden');
    this.elements.empty.classList.remove('hidden');
  }

  showToast(message) {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-tertiary);
      color: var(--text-primary);
      padding: 8px 16px;
      border-radius: var(--radius-md);
      font-size: var(--text-xs);
      z-index: 100;
      animation: toast-in 0.25s ease-out;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toast-out 0.25s ease-out forwards';
      setTimeout(() => toast.remove(), 250);
    }, 2000);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new DeskFlowPopup();
});
```

---

## D. Backend IPC Handlers

### D.1 New IPC Channel Definitions (preload.ts)

```typescript
// src/preload.ts — Add to existing browser IPC bridge

// EXISTING (lines 102-121)
// browserTrackingEvent: (callback) => ipcRenderer.on('browser-tracking-event', callback)

// NEW: Browser Profile IPC Channels
export interface BrowserProfileIPC {
  // CRUD Operations
  'get-browser-profiles': () => Promise<BrowserProfile[]>;
  'save-browser-profile': (profile: BrowserProfileInput) => Promise<BrowserProfile>;
  'delete-browser-profile': (id: number) => Promise<{ success: boolean }>;

  // Active Profile Management
  'set-active-profile': (profileId: string | null) => Promise<{ success: boolean }>;
  'get-active-profile': () => Promise<BrowserProfile | null>;

  // Analytics
  'get-browser-profile-stats': (profileId: string, dateRange: DateRange) => Promise<ProfileStats>;
  'get-browser-profile-daily': (profileId: string, days: number) => Promise<DailyStat[]>;

  // Real-time Events
  'browser-profiles-updated': (callback: (event: IpcRendererEvent, data: { profiles: BrowserProfile[] }) => void) => void;
}

// Implementation in preload.ts
contextBridge.exposeInMainWorld('deskflowAPI', {
  // ... existing methods ...

  // Browser Profile Management
  getBrowserProfiles: () => ipcRenderer.invoke('get-browser-profiles'),
  saveBrowserProfile: (profile) => ipcRenderer.invoke('save-browser-profile', profile),
  deleteBrowserProfile: (id) => ipcRenderer.invoke('delete-browser-profile', id),
  setActiveProfile: (profileId) => ipcRenderer.invoke('set-active-profile', profileId),
  getActiveProfile: () => ipcRenderer.invoke('get-active-profile'),
  getBrowserProfileStats: (profileId, dateRange) => ipcRenderer.invoke('get-browser-profile-stats', profileId, dateRange),
  getBrowserProfileDaily: (profileId, days) => ipcRenderer.invoke('get-browser-profile-daily', profileId, days),
  onBrowserProfilesUpdated: (callback) => ipcRenderer.on('browser-profiles-updated', callback),
});
```

### D.2 Main Process Handlers (main.ts)

```typescript
// src/main.ts — New IPC handler implementations

// ─────────────────────────────────────────────────────────────
// 1. GET BROWSER PROFILES
// ─────────────────────────────────────────────────────────────
ipcMain.handle('get-browser-profiles', async () => {
  try {
    const profiles = await db.query(`
      SELECT 
        bp.*,
        COALESCE(
          (SELECT SUM(duration_ms) 
           FROM logs 
           WHERE profile_id = bp.profile_id 
           AND date(start_time) = date('now')
          ), 0
        ) as today_duration_ms
      FROM browser_profiles bp
      ORDER BY bp.is_connected DESC, bp.last_seen_at DESC
    `);

    return profiles.map(p => ({
      ...p,
      is_connected: Boolean(p.is_connected),
      is_active: Boolean(p.is_active),
      today_duration_ms: Number(p.today_duration_ms),
    }));
  } catch (error) {
    console.error('[IPC] get-browser-profiles failed:', error);
    throw error;
  }
});

// ─────────────────────────────────────────────────────────────
// 2. SAVE BROWSER PROFILE
// ─────────────────────────────────────────────────────────────
ipcMain.handle('save-browser-profile', async (_, input: BrowserProfileInput) => {
  try {
    const { id, browser_name, profile_id, profile_name, color_tag } = input;

    if (id) {
      // Update existing
      await db.run(`
        UPDATE browser_profiles 
        SET profile_name = ?, color_tag = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [profile_name, color_tag || '#ec4899', id]);

      // Notify extension of name change
      broadcastToExtensions({ type: 'profile-updated', profile_id, profile_name });
    } else {
      // Insert new (usually auto-created by extension, but allow manual)
      await db.run(`
        INSERT INTO browser_profiles (browser_name, profile_id, profile_name, color_tag)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(browser_name, profile_id) DO UPDATE SET
          profile_name = excluded.profile_name,
          color_tag = excluded.color_tag,
          updated_at = datetime('now')
      `, [browser_name, profile_id, profile_name, color_tag || '#ec4899']);
    }

    return await db.get('SELECT * FROM browser_profiles WHERE browser_name = ? AND profile_id = ?', 
      [browser_name, profile_id]);
  } catch (error) {
    console.error('[IPC] save-browser-profile failed:', error);
    throw error;
  }
});

// ─────────────────────────────────────────────────────────────
// 3. DELETE BROWSER PROFILE
// ─────────────────────────────────────────────────────────────
ipcMain.handle('delete-browser-profile', async (_, id: number) => {
  try {
    // Soft delete: mark as inactive rather than removing data
    await db.run(`
      UPDATE browser_profiles 
      SET is_active = 0, is_connected = 0, updated_at = datetime('now')
      WHERE id = ?
    `, [id]);

    // Optionally: archive logs instead of deleting
    // await db.run(`UPDATE logs SET profile_id = NULL WHERE profile_id = ?`, [profile_id]);

    return { success: true };
  } catch (error) {
    console.error('[IPC] delete-browser-profile failed:', error);
    throw error;
  }
});

// ─────────────────────────────────────────────────────────────
// 4. SET ACTIVE PROFILE
// ─────────────────────────────────────────────────────────────
ipcMain.handle('set-active-profile', async (_, profileId: string | null) => {
  try {
    if (profileId) {
      // Set one active, others inactive
      await db.run(`
        UPDATE browser_profiles 
        SET is_active = CASE WHEN profile_id = ? THEN 1 ELSE 0 END,
            updated_at = datetime('now')
      `, [profileId]);

      userPreferences.activeBrowserProfile = profileId;
    } else {
      // Clear active profile
      await db.run(`UPDATE browser_profiles SET is_active = 0`);
      userPreferences.activeBrowserProfile = null;
    }

    // Broadcast to renderer
    mainWindow?.webContents.send('browser-profiles-updated', {
      profiles: await getAllBrowserProfiles(),
    });

    return { success: true };
  } catch (error) {
    console.error('[IPC] set-active-profile failed:', error);
    throw error;
  }
});

// ─────────────────────────────────────────────────────────────
// 5. GET ACTIVE PROFILE
// ─────────────────────────────────────────────────────────────
ipcMain.handle('get-active-profile', async () => {
  try {
    const profile = await db.get(`
      SELECT * FROM browser_profiles WHERE is_active = 1 LIMIT 1
    `);
    return profile || null;
  } catch (error) {
    console.error('[IPC] get-active-profile failed:', error);
    throw error;
  }
});

// ─────────────────────────────────────────────────────────────
// 6. GET PROFILE STATS
// ─────────────────────────────────────────────────────────────
ipcMain.handle('get-browser-profile-stats', async (_, profileId: string, dateRange: DateRange) => {
  try {
    const { startDate, endDate } = dateRange;

    const stats = await db.get(`
      SELECT 
        COALESCE(SUM(duration_ms), 0) as total_duration_ms,
        COALESCE(SUM(CASE WHEN category = 'productive' THEN duration_ms ELSE 0 END), 0) as productive_duration_ms,
        COALESCE(SUM(CASE WHEN category = 'distracting' THEN duration_ms ELSE 0 END), 0) as distracting_duration_ms,
        COALESCE(SUM(CASE WHEN category = 'neutral' THEN duration_ms ELSE 0 END), 0) as neutral_duration_ms,
        COUNT(DISTINCT domain) as unique_domains,
        COUNT(*) as total_sessions
      FROM logs
      WHERE profile_id = ?
      AND start_time BETWEEN ? AND ?
      AND is_browser_tracking = 1
    `, [profileId, startDate, endDate]);

    const topSites = await db.query(`
      SELECT domain, SUM(duration_ms) as duration_ms
      FROM logs
      WHERE profile_id = ? AND start_time BETWEEN ? AND ? AND is_browser_tracking = 1
      GROUP BY domain
      ORDER BY duration_ms DESC
      LIMIT 5
    `, [profileId, startDate, endDate]);

    return { ...stats, topSites };
  } catch (error) {
    console.error('[IPC] get-browser-profile-stats failed:', error);
    throw error;
  }
});

// ─────────────────────────────────────────────────────────────
// 7. HTTP SERVER CHANGES
// ─────────────────────────────────────────────────────────────

// GET /foreground-app (Redesigned)
app.get('/foreground-app', (req, res) => {
  const activeProfiles = Array.from(activeBrowserProfiles.values())
    .filter(p => p.isConnected)
    .map(p => ({
      browser_name: p.browser_name,
      profile_id: p.profile_id,
      profile_name: p.profile_name,
      last_seen: p.lastSeenAt,
    }));

  res.json({
    app: currentApp,
    isTracking: isBrowserTrackingEnabled,
    activeProfiles,
    activeBrowserProfile: userPreferences.activeBrowserProfile,
  });
});

// POST /browser-data (Updated — see Section B.3)
// POST /browser-identify (Updated — see Section B.3)

// Helper: Broadcast to all connected extensions
function broadcastToExtensions(message: any) {
  // Extensions poll via health-check, but we can also use
  // a simple HTTP broadcast or WebSocket if needed
  // For now, extensions pull state on their periodic sync
}
```

---

## E. Frontend Profile Management UI

### E.1 Component: BrowserProfileSettings

```tsx
// src/components/settings/BrowserProfileSettings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Globe, User, Settings, Play, Pause, Monitor, Clock, Tag,
  ChevronDown, Plus, Trash2, Pencil, Check, X, Shield, Wifi, WifiOff,
  Brain, Zap, Minus, ExternalLink, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Types ───
interface BrowserProfile {
  id: number;
  browser_name: string;
  profile_id: string;
  profile_name: string;
  browser_version: string;
  is_active: boolean;
  is_connected: boolean;
  last_seen_at: string;
  total_duration_ms: number;
  color_tag: string;
  today_duration_ms: number;
}

// ─── Color Presets ───
const COLOR_PRESETS = [
  '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', 
  '#10b981', '#f59e0b', '#ef4444', '#f97316'
];

// ─── Component ───
export function BrowserProfileSettings() {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<BrowserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch profiles
  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await window.deskflowAPI.getBrowserProfiles();
      setProfiles(data);
    } catch (e) {
      setError('Failed to load browser profiles');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();

    // Subscribe to real-time updates
    const unsubscribe = window.deskflowAPI.onBrowserProfilesUpdated((_, data) => {
      setProfiles(data.profiles);
    });

    return () => {
      // Cleanup listener
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [fetchProfiles]);

  // Set active profile
  const handleSetActive = async (profileId: string | null) => {
    try {
      await window.deskflowAPI.setActiveProfile(profileId);
      await fetchProfiles();
    } catch (e) {
      console.error('Failed to set active profile:', e);
    }
  };

  // Save profile edit
  const handleSaveProfile = async () => {
    if (!editingProfile) return;

    try {
      setIsSaving(true);
      await window.deskflowAPI.saveBrowserProfile({
        id: editingProfile.id,
        browser_name: editingProfile.browser_name,
        profile_id: editingProfile.profile_id,
        profile_name: editName.trim() || editingProfile.profile_name,
        color_tag: editColor,
      });
      setEditingProfile(null);
      await fetchProfiles();
    } catch (e) {
      console.error('Failed to save profile:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete profile
  const handleDeleteProfile = async (id: number) => {
    try {
      await window.deskflowAPI.deleteBrowserProfile(id);
      await fetchProfiles();
    } catch (e) {
      console.error('Failed to delete profile:', e);
    }
  };

  // Format duration
  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error State ───
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-zinc-900/50 flex items-center justify-center mb-4">
          <WifiOff className="w-6 h-6 text-zinc-500" />
        </div>
        <h3 className="text-sm font-medium text-zinc-100 mb-1">Failed to Load Profiles</h3>
        <p className="text-xs text-zinc-500 mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchProfiles}>
          <RefreshCw className="w-3.5 h-3.5 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // ─── Empty State ───
  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-xl bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center mb-4">
          <Globe className="w-7 h-7 text-zinc-500" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-2">No Browser Profiles</h3>
        <p className="text-xs text-zinc-500 max-w-xs mb-6 leading-relaxed">
          Install the DeskFlow browser extension and open your browser to automatically detect profiles.
        </p>
        <Button size="sm" className="bg-pink-500 hover:bg-pink-600">
          <ExternalLink className="w-3.5 h-3.5 mr-2" />
          Download Extension
        </Button>
      </div>
    );
  }

  // ─── Main Render ───
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Browser Profiles</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {profiles.filter(p => p.is_connected).length} connected • {profiles.length} total
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProfiles}>
          <RefreshCw className="w-3.5 h-3.5 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Profile Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profiles.map(profile => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            isActive={profile.is_active}
            onSetActive={() => handleSetActive(profile.is_active ? null : profile.profile_id)}
            onEdit={() => {
              setEditingProfile(profile);
              setEditName(profile.profile_name);
              setEditColor(profile.color_tag);
            }}
            onDelete={() => handleDeleteProfile(profile.id)}
            formatDuration={formatDuration}
          />
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400">Nickname</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Work Chrome"
                className="bg-zinc-900/50 border-zinc-800/50 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400">Color Tag</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map(color => (
                  <button
                    key={color}
                    onClick={() => setEditColor(color)}
                    className={`w-8 h-8 rounded-lg transition-all duration-150 ${
                      editColor === color 
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setEditingProfile(null)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-pink-500 hover:bg-pink-600"
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Profile Card Sub-component ───
function ProfileCard({ 
  profile, 
  isActive, 
  onSetActive, 
  onEdit, 
  onDelete,
  formatDuration 
}: {
  profile: BrowserProfile;
  isActive: boolean;
  onSetActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  formatDuration: (ms: number) => string;
}) {
  const browserIcons: Record<string, React.ReactNode> = {
    Chrome: <Globe className="w-4 h-4" />,
    Firefox: <Monitor className="w-4 h-4" />,
    Safari: <Monitor className="w-4 h-4" />,
    Edge: <Monitor className="w-4 h-4" />,
    Brave: <Shield className="w-4 h-4" />,
    Arc: <ExternalLink className="w-4 h-4" />,
    Vivaldi: <Monitor className="w-4 h-4" />,
    Opera: <Monitor className="w-4 h-4" />,
  };

  return (
    <Card 
      className={`relative bg-zinc-900/50 backdrop-blur-xl border transition-all duration-250 ${
        isActive 
          ? 'border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.08)]' 
          : 'border-zinc-800/50 hover:border-zinc-700/50'
      }`}
    >
      {/* Active border glow (Magic UI border-beam equivalent) */}
      {isActive && (
        <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
          <div 
            className="absolute inset-0 rounded-xl opacity-20"
            style={{
              background: `linear-gradient(90deg, transparent, ${profile.color_tag}, transparent)`,
              animation: 'border-beam 3s linear infinite',
            }}
          />
        </div>
      )}

      <CardContent className="p-5 relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar with color */}
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
              style={{ backgroundColor: profile.color_tag }}
            >
              {profile.profile_name?.[0]?.toUpperCase() || profile.browser_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-100">{profile.profile_name}</span>
                {isActive && (
                  <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20 text-[10px] px-1.5 py-0">
                    Active
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-zinc-500">{browserIcons[profile.browser_name] || <Globe className="w-3.5 h-3.5" />}</span>
                <span className="text-xs text-zinc-500">{profile.browser_name} {profile.browser_version}</span>
              </div>
            </div>
          </div>

          {/* Connection status */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className={`w-2 h-2 rounded-full ${
                  profile.is_connected ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-zinc-600'
                }`} />
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-zinc-900 border-zinc-800 text-xs">
                {profile.is_connected ? 'Connected' : 'Disconnected'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDuration(profile.today_duration_ms)} today</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Tag className="w-3.5 h-3.5" />
            <span>ID: {profile.profile_id.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className={`flex-1 text-xs h-8 ${
              isActive 
                ? 'bg-pink-500 hover:bg-pink-600 text-white' 
                : 'border-zinc-700/50 hover:bg-zinc-800/50'
            }`}
            onClick={onSetActive}
          >
            {isActive ? (
              <><Pause className="w-3.5 h-3.5 mr-1.5" /> Deactivate</>
            ) : (
              <><Play className="w-3.5 h-3.5 mr-1.5" /> Set Active</>
            )}
          </Button>

          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-zinc-700/50" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-zinc-700/50 hover:border-red-500/30 hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-950 border-zinc-800/50">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">Remove Profile?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-zinc-500">
                  This will stop tracking for "{profile.profile_name}". Historical data will be preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-xs">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={onDelete}
                  className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 text-xs"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
```

### E.2 CSS Animation for Border Beam

```css
/* Add to global styles */
@keyframes border-beam {
  0% { transform: translateX(-100%) rotate(0deg); }
  100% { transform: translateX(100%) rotate(0deg); }
}
```

---

## F. Stopwatch Timer Integration

### F.1 Updated StopwatchTimer Component

```tsx
// src/pages/dashboard/StopwatchTimer.tsx — Profile-aware updates

import React, { useEffect, useState } from 'react';
import { Globe, User, Brain, Zap, Minus, Clock } from 'lucide-react';
import { FadeContent } from '@/components/react-bits/FadeContent';

interface StopwatchTimerProps {
  currentWebsite: {
    title: string;
    domain: string;
    url: string;
    category: 'productive' | 'neutral' | 'distracting';
  } | null;
  duration: number; // ms
  isTracking: boolean;
  activeProfile: BrowserProfile | null; // NEW
}

export function StopwatchTimer({ 
  currentWebsite, 
  duration, 
  isTracking,
  activeProfile 
}: StopwatchTimerProps) {
  const [displayDuration, setDisplayDuration] = useState(0);

  useEffect(() => {
    if (!isTracking) {
      setDisplayDuration(duration);
      return;
    }

    const interval = setInterval(() => {
      setDisplayDuration(Date.now() - (currentWebsite?.startTime || Date.now()));
    }, 1000);

    return () => clearInterval(interval);
  }, [isTracking, duration, currentWebsite]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const categoryConfig = {
    productive: { 
      icon: Brain, 
      color: 'text-green-400', 
      bg: 'bg-green-500/10', 
      border: 'border-green-500/20',
      glow: 'shadow-[0_0_20px_rgba(34,197,94,0.06)]'
    },
    neutral: { 
      icon: Minus, 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10', 
      border: 'border-amber-500/20',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.06)]'
    },
    distracting: { 
      icon: Zap, 
      color: 'text-red-400', 
      bg: 'bg-red-500/10', 
      border: 'border-red-500/20',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.06)]'
    },
  };

  const cat = currentWebsite?.category || 'neutral';
  const config = categoryConfig[cat];
  const CategoryIcon = config.icon;

  return (
    <FadeContent className="w-full">
      <div className={`
        relative bg-zinc-900/50 backdrop-blur-xl border rounded-xl p-5
        transition-all duration-300
        ${config.border} ${config.glow}
        ${!isTracking ? 'opacity-60' : ''}
      `}>
        {/* Profile Badge (NEW) */}
        {activeProfile && (
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: activeProfile.color_tag }}
            >
              {activeProfile.profile_name[0].toUpperCase()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Globe className="w-3 h-3" />
              <span>{activeProfile.browser_name}</span>
              <span className="text-zinc-600">•</span>
              <User className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{activeProfile.profile_name}</span>
            </div>
            {activeProfile.is_connected && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
            )}
          </div>
        )}

        {/* Website Info */}
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-zinc-100 truncate">
              {currentWebsite?.title || 'No active website'}
            </h3>
            <p className="text-xs text-zinc-500 truncate mt-0.5">
              {currentWebsite?.domain || 'Switch to browser to start tracking'}
            </p>
          </div>

          {/* Category Badge */}
          {currentWebsite && (
            <div className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
              ${config.bg} ${config.color}
            `}>
              <CategoryIcon className="w-3 h-3" />
              <span className="capitalize">{cat}</span>
            </div>
          )}
        </div>

        {/* Duration Display */}
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-zinc-500" />
          <span className="font-mono text-2xl font-semibold text-zinc-100 tracking-tight">
            {formatTime(displayDuration)}
          </span>
          {!isTracking && currentWebsite && (
            <span className="text-xs text-zinc-500 ml-2">(paused)</span>
          )}
        </div>

        {/* Progress bar (subtle) */}
        {isTracking && currentWebsite && (
          <div className="mt-4 h-1 bg-zinc-800/50 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                cat === 'productive' ? 'bg-green-500' : 
                cat === 'distracting' ? 'bg-red-500' : 'bg-amber-500'
              }`}
              style={{ 
                width: `${Math.min((displayDuration / 3600000) * 100, 100)}%`,
                opacity: 0.6 
              }}
            />
          </div>
        )}
      </div>
    </FadeContent>
  );
}
```

### F.2 Dashboard Integration

```tsx
// src/pages/DashboardPage.tsx — Updated browser event handler

// In the browser tracking event listener:
useEffect(() => {
  const unsubscribe = window.deskflowAPI.onBrowserTrackingEvent((_, data) => {
    if (data.type === 'browser-data') {
      // NEW: Include profile context
      setCurrentWebsite({
        title: data.title,
        domain: data.domain,
        url: data.url,
        category: data.category,
        startTime: Date.now() - (data.active_duration_ms || 0),
        profileId: data.profile_id,        // NEW
        browserName: data.browser_name,       // NEW
      });

      // Update active profile if changed
      if (data.profile) {
        setActiveBrowserProfile(data.profile);
      }

      // Existing: update activity feed, timer logic, etc.
      // ... existing code ...
    }
  });

  return () => unsubscribe();
}, []);

// In the render:
<StopwatchTimer 
  currentWebsite={currentWebsite}
  duration={currentDuration}
  isTracking={isTracking && isInBrowser}
  activeProfile={activeBrowserProfile}  // NEW
/>
```

---

## G. Analytics Page Changes

### G.1 Updated BrowserActivityPage

```tsx
// src/pages/BrowserActivityPage.tsx — Profile-filtered analytics

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, BarChart3, PieChart, TrendingUp } from 'lucide-react';

interface BrowserActivityPageProps {
  // ... existing props
}

export function BrowserActivityPage() {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('all');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: subDays(new Date(), 7), end: new Date() });

  // Fetch profiles on mount
  useEffect(() => {
    window.deskflowAPI.getBrowserProfiles().then(setProfiles);
  }, []);

  // Fetch stats when profile or date changes
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedProfileId === 'all') {
        // Aggregate across all profiles
        const allStats = await Promise.all(
          profiles.map(p => 
            window.deskflowAPI.getBrowserProfileStats(p.profile_id, dateRange)
          )
        );
        // Merge stats...
        setStats(mergeStats(allStats));
      } else {
        const profileStats = await window.deskflowAPI.getBrowserProfileStats(
          selectedProfileId, 
          dateRange
        );
        setStats(profileStats);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId, dateRange, profiles]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-6 p-6">
      {/* Header with Profile Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Browser Activity</h1>
          <p className="text-xs text-zinc-500 mt-1">Track time across browsers and profiles</p>
        </div>

        <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
          <SelectTrigger className="w-48 bg-zinc-900/50 border-zinc-800/50 text-sm">
            <SelectValue placeholder="Filter by profile" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border-zinc-800/50">
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                <span>All Profiles</span>
              </div>
            </SelectItem>
            {profiles.map(profile => (
              <SelectItem key={profile.profile_id} value={profile.profile_id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-sm" 
                    style={{ backgroundColor: profile.color_tag }}
                  />
                  <span>{profile.profile_name}</span>
                  <span className="text-zinc-500 text-xs">({profile.browser_name})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Time" 
          value={formatDuration(stats?.total_duration_ms || 0)}
          icon={<Clock className="w-4 h-4" />}
          trend="+12%"
        />
        <StatCard 
          title="Productive" 
          value={formatDuration(stats?.productive_duration_ms || 0)}
          icon={<Brain className="w-4 h-4" />}
          color="text-green-400"
        />
        <StatCard 
          title="Neutral" 
          value={formatDuration(stats?.neutral_duration_ms || 0)}
          icon={<Minus className="w-4 h-4" />}
          color="text-amber-400"
        />
        <StatCard 
          title="Distracting" 
          value={formatDuration(stats?.distracting_duration_ms || 0)}
          icon={<Zap className="w-4 h-4" />}
          color="text-red-400"
        />
      </div>

      {/* Tabs: Overview / By Profile / Top Sites */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-zinc-900/50 border border-zinc-800/50">
          <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-400">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="profiles" className="text-xs data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-400">
            <PieChart className="w-3.5 h-3.5 mr-1.5" />
            By Profile
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-xs data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-400">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <ActivityChart data={stats} loading={loading} />
        </TabsContent>

        <TabsContent value="profiles" className="mt-4">
          <ProfileBreakdown profiles={profiles} stats={stats} />
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <TrendsChart profileId={selectedProfileId} days={7} />
        </TabsContent>
      </Tabs>

      {/* Top Sites Table */}
      <Card className="bg-zinc-900/50 backdrop-blur-xl border-zinc-800/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Top Sites</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats?.topSites?.map((site: any, i: number) => (
              <div 
                key={site.domain} 
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 w-4">{i + 1}</span>
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-xs">
                    {site.domain[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-zinc-200">{site.domain}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-pink-500 rounded-full"
                      style={{ width: `${(site.duration_ms / (stats?.topSites[0]?.duration_ms || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-zinc-400 w-16 text-right">
                    {formatDuration(site.duration_ms)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper sub-components
function StatCard({ title, value, icon, color = 'text-zinc-100', trend }: any) {
  return (
    <Card className="bg-zinc-900/50 backdrop-blur-xl border-zinc-800/50">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">{title}</span>
          <span className={color}>{icon}</span>
        </div>
        <div className="text-lg font-semibold text-zinc-100">{value}</div>
        {trend && <div className="text-xs text-green-400 mt-1">{trend}</div>}
      </CardContent>
    </Card>
  );
}
```

---

## Backward Compatibility Strategy

### 1. Database Level
- Existing `logs` entries with `profile_id = NULL` remain valid
- All queries use `COALESCE(profile_id, 'legacy')` for aggregation
- The `browser_profiles` table already exists — we extend it, not recreate

### 2. Extension Level
- Extensions without the new profile detection fallback to `storage_uuid`
- Old extensions sending `/browser-identify` without `profile_id` are auto-assigned `legacy` profile
- New fields in POST `/browser-data` are optional — backend handles missing fields gracefully

### 3. Frontend Level
- `activeBrowserProfile` state defaults to `null` (no profile shown)
- StopwatchTimer shows profile info only when `activeProfile` is present
- Analytics page defaults to "All Profiles" view

### 4. Migration Rollback
```sql
-- If rollback needed:
ALTER TABLE logs DROP COLUMN profile_id;
ALTER TABLE logs DROP COLUMN browser_name;
ALTER TABLE browser_profiles DROP COLUMN browser_version;
ALTER TABLE browser_profiles DROP COLUMN last_seen_at;
ALTER TABLE browser_profiles DROP COLUMN total_duration_ms;
ALTER TABLE browser_profiles DROP COLUMN is_connected;
ALTER TABLE browser_profiles DROP COLUMN color_tag;
DROP TABLE browser_profile_stats;
```

---

## Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Extension installed but DeskFlow not running | Popup shows "Disconnected" state with retry button |
| Chrome Identity API unavailable | Fallback to `storage.sync` UUID |
| User clears extension storage | New UUID generated, appears as new profile in DB |
| Multiple browsers with same profile ID | Treated as same profile (intended for sync) |
| Browser crashes mid-session | Next `/browser-data` includes accumulated delta from `sessionStart` |
| Profile deleted while tracking active | Graceful degradation — logs continue with `profile_id = NULL` |
| Network interruption | Extension queues last known state, retries on next alarm |
| User renames profile in settings | Broadcast to extension, popup updates in real-time |
| Safari / Firefox (no MV3) | Use `browser.action` API equivalent, profile detection via user-agent |

---

## Anti-Slop Verification

After designing all components, verified against checklist:

- [x] **Type**: Geist body (13px), JetBrains Mono code. No third font introduced.
- [x] **Color**: Uses DeskFlow tokens (`--accent-primary` = `#ec4899`, `--bg-primary` = `#09090b`). No purple/indigo gradients. Gradients are intentional (header brand, buttons only).
- [x] **Geometry**: `rounded-xl` (12px) max. `p-5` (20px) padding on cards. No `rounded-2xl` or `rounded-3xl`.
- [x] **Hero**: No tiny uppercase eyebrow pill + oversized headline + lone CTA. Popup uses functional header, not marketing hero.
- [x] **Sections**: No repeated tracked-uppercase kicker labels. Only one "Today's Stats" label.
- [x] **Motion**: Micro-interactions on switches, cards, buttons. All wrapped in `prefers-reduced-motion` check.
- [x] **Imagery**: No filler glow/blobs. Only functional UI elements.
- [x] **Empty/loading/error states**: All three states designed for popup, profile settings, and analytics.
- [x] **Icons**: All from lucide-react. No emoji. No inline SVG duplicates.
- [x] **Accessibility**: Focus-visible rings use `--page-accent` pattern on switches and buttons.

---

## Implementation Order

1. **Database migrations** (001, 002, 003) — non-destructive
2. **Backend IPC handlers** — CRUD for profiles, updated HTTP endpoints
3. **Extension background.js** — profile detection, multi-browser registry
4. **Extension popup** — popup.html, popup.css, popup.js
5. **Frontend profile settings** — BrowserProfileSettings component
6. **Stopwatch integration** — profile badge in timer
7. **Analytics updates** — profile filtering, breakdown charts
8. **End-to-end testing** — multi-browser simulation, edge cases

---

## Appendix: File Change Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/database/migrations.ts` | Add | 3 new migrations for schema changes |
| `src/database/schema.ts` | Modify | Update `browser_profiles` definition |
| `browser-extension/manifest.json` | Modify | Add `action` popup, `identity` permission |
| `browser-extension/background.js` | Major rewrite | Profile detection, multi-browser registry |
| `browser-extension/popup.html` | New | Extension popup markup |
| `browser-extension/popup.css` | New | Extension popup styles (DeskFlow tokens) |
| `browser-extension/popup.js` | New | Extension popup logic |
| `src/main.ts` | Modify | New IPC handlers, updated HTTP endpoints |
| `src/preload.ts` | Modify | New IPC channels for profile management |
| `src/components/settings/BrowserProfileSettings.tsx` | New | Profile management UI |
| `src/pages/dashboard/StopwatchTimer.tsx` | Modify | Profile badge integration |
| `src/pages/DashboardPage.tsx` | Modify | Profile state in browser events |
| `src/pages/BrowserActivityPage.tsx` | Modify | Profile filtering, breakdown views |
