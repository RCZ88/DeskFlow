# Exact Root Cause: 60+ hours becoming 1 hour

## The Bug

When switching from daily to weekly view:
- **App Page (StatsPage)**: Shows correct 60+ hours (from `computedAppStats`)
- **Planet (OrbitSystem)**: Shows ~1 hour (from `logs`)

## Root Cause Found

**The `logs` state is being RESET when a foreground change event fires.**

### Code Path in App.tsx:

1. **Initial load** (line 236-261): Sets BOTH `allLogs` and `logs` to all data
2. **Period change**: `filteredLogs` updates via useMemo → `logs` updated via useEffect (line 226-229) ✅
3. **Foreground change event** (line 292-318): Sets BOTH `allLogs` AND `logs` to fresh data from API
   - But the API call `getLogs()` returns ALL logs (no period filter!)
   - So `setLogs(formattedLogs)` sets ALL logs regardless of selected period ❌

### The Problem:
```javascript
// Line 301-315 in App.tsx
window.deskflowAPI?.getLogs().then(electronLogs => {
  // ...
  setAllLogs(formattedLogs);   // Sets ALL data
  setLogs(formattedLogs);      // BUG: Sets ALL data, ignoring selectedPeriod!
});
```

When foreground changes (app switch detected), it fetches ALL logs and overwrites `logs`, ignoring the current period filter.

## Why It's 60+ hours → 1 hour

- App Page: Uses `computedAppStats` which correctly filters from `allLogs` by period → shows 60+ hours
- Planet: Uses `logs` which gets overwritten with ALL data on every app switch → shows total of ALL data (which appears as ~1 hour because browser apps are filtered out internally)

The planet shows the CORRECT total for "all time" but it's displayed when "this week" is selected, causing confusion.

## Fix

In the foreground change handler, don't overwrite `logs` - only update `allLogs`. The filtering will happen automatically via the existing useEffect:

```javascript
// Change line 315 from:
setLogs(formattedLogs);
// To:
// (remove this line - logs will auto-filter via useEffect on line 228)
```

This way, foreground changes update the data source but the displayed data respects the period filter.