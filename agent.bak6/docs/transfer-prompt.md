# Transfer Prompt for DeskFlow Bug Fix

## Summary
The App.tsx file has become corrupted during bug-fixing attempts. You need to restore it and apply specific fixes.

## How to Fix the File

### Step 1: Get a Clean App.tsx
- Restore from GitHub repo or backup
- OR download original from project source

### Step 2: Apply These 3 Fixes (in order)

**Fix 1 - Line ~388 (computedAppStats):**
```javascript
// BEFORE (excludes browsers):
const BROWSER_APPS = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'google chrome', 'microsoft edge', 'comet', 'browser'];
const appLogs = filtered.filter(log => 
  !log.is_browser_tracking && 
  !BROWSER_APPS.includes((log.app || '').toLowerCase())
);

// AFTER (includes browsers):
const appLogs = filtered.filter(log => !log.is_browser_tracking);
```

**Fix 2 - Line ~261 (initial data load):**
```javascript
// BEFORE:
setAllLogs(formattedLogs);
setLogs(formattedLogs);

// AFTER:
setAllLogs(formattedLogs);
// Don't setLogs - useEffect will handle filtering
```

**Fix 3 - Line ~315 (foreground change handler):**
```javascript
// BEFORE:
setAllLogs(formattedLogs);
setLogs(formattedLogs);

// AFTER:
setAllLogs(formattedLogs);
// Don't setLogs - useEffect will handle filtering
```

### Step 3: Fix OrbitSystem.tsx (same as Fix 1)

**Line ~329:**
```javascript
// BEFORE (excludes browsers):
const validLogs = (logs || []).filter((log: any) =>
  log && log.app && typeof log.app === 'string' && log.app.trim().length > 0 &&
  !log.is_browser_tracking &&
  !BROWSER_APPS.includes((log.app || '').toLowerCase())
);

// AFTER (includes browsers):
const validLogs = (logs || []).filter((log: any) =>
  log && log.app && typeof log.app === 'string' && log.app.trim().length > 0 &&
  !log.is_browser_tracking
);
```

## Why These Fixes

The original bug was: when switching timeline (daily→weekly), the planet showed wrong data (60+ hours became ~1 hour).

**Root cause**: `setLogs(formattedLogs)` was overwriting ALL data ignoring the selected period filter.

**The fix**: Only update `allLogs`, let the existing useEffect handle filtering `logs` based on selectedPeriod.

## Build After Fixes
Run: `npm run build`