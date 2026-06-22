# Debug Prompt: OrbitSystem Data Loading Issue

## Problem Summary
The OrbitSystem component shows **WRONG/LESS data** compared to the Dashboard for the same timeframe.

## Expected Behavior
- When user selects "Today" or "Week" timeframe, BOTH Dashboard and OrbitSystem should show the **SAME data** with the **SAME totals**.

## Current Behavior
- **Dashboard** shows correct data (e.g., 3243 logs, Comet: 56174s, Browser: 72765s)
- **OrbitSystem** shows wrong/less data (e.g., 20 planets, total 4652 seconds)

## Data Flow Analysis

### Dashboard Data Path
```
App.tsx line 875-889: getAppDistribution()
  └── Uses: logs state
  └── Shows: Correct data (Comet: 56174s, Browser: 72765s)
```

### OrbitSystem Data Path
```
App.tsx line 1607: <OrbitSystem logs={logs} />
  └── Receives: logs prop (changed from filteredLogs)
  └── Shows: Wrong data (much less than Dashboard)
```

## Key Files to Investigate

### 1. `src/App.tsx` - Data Loading
**Lines 210-245**: Initial load with `window.deskflowAPI.getLogs()`
**Lines 384-403**: Period change effect with `window.deskflowAPI.getLogsByPeriod(selectedPeriod)`

```typescript
// Initial load - gets ALL logs
const electronLogs = await window.deskflowAPI.getLogs();

// Period change - gets filtered logs
const electronLogs = await window.deskflowAPI.getLogsByPeriod(selectedPeriod);
```

### 2. `src/App.tsx` - OrbitSystem Usage
**Line 1607**:
```tsx
<OrbitSystem logs={logs} appColors={appColors} categoryOverrides={categoryOverrides} websiteLogs={browserLogs} />
```

### 3. `src/components/OrbitSystem.tsx` - computePlanets
**Lines 326-510**: `computePlanets()` function that converts logs to planets
**Lines 338-345**: Demo data fallback when no valid logs

```typescript
function computePlanets(logs: ActivityLog[], ...) {
  const validLogs = (logs || []).filter((log: any) =>
    log && log.app && typeof log.app === 'string' && log.app.trim().length > 0
  );
  
  // This logs what it receives:
  // [computePlanets] Input logs: X Valid logs: Y
  // [computePlanets] Planet: AppName Category: Cat Time: Z Sessions: N
  
  if (validLogs.length === 0) {
    return [...demo data...];
  }
  // ... computes planets
}
```

### 4. `src/components/OrbitSystem.tsx` - computeSolarSystems
**Lines 1750-1800**: Groups planets by category into solar systems

### 5. `src/main.ts` - API Query
**Lines 1306-1347**: `get-logs-by-period` IPC handler

```typescript
if (period === 'today') {
  const todayStr = now.toISOString().split('T')[0];
  const stmt = db.prepare(`SELECT * FROM logs WHERE timestamp >= ? ORDER BY id DESC`);
  return stmt.all(`${todayStr}T00:00:00`);
}
```

## Debugging Steps Required

### Step 1: Verify API Returns Correct Data
Add console.log in App.tsx when `getLogsByPeriod` completes:
```typescript
const electronLogs = await window.deskflowAPI.getLogsByPeriod(selectedPeriod);
console.log('[DEBUG] API returned for', selectedPeriod, ':', electronLogs.length, 'logs');
console.log('[DEBUG] Total duration_ms:', electronLogs.reduce((s, l) => s + (l.duration_ms || 0), 0));
```

### Step 2: Verify Logs State is Set Correctly
```typescript
setAllLogs(formattedLogs);
console.log('[DEBUG] Set allLogs:', formattedLogs.length, 'logs');
```

### Step 3: Verify OrbitSystem Receives Correct Data
In `computePlanets`, add:
```typescript
console.log('[DEBUG] computePlanets received:', logs?.length, 'logs');
console.log('[DEBUG] First log:', logs?.[0]);
```

### Step 4: Compare Data Sources
1. Check if `logs` state in App.tsx has correct data for Week
2. Check if OrbitSystem's `logs` prop matches App.tsx's `logs` state
3. Check if `computePlanets` receives the same data

## Known Console Outputs (From User Testing)

**Today timeframe:**
- `[computePlanets] Input logs: 100 Valid logs: 95`
- Shows correct data

**Week timeframe:**
- `[computePlanets] Input logs: 20 Valid logs: 18`
- Shows wrong data (much less than Dashboard)

## Questions to Answer

1. Does `getLogsByPeriod('week')` return the same data as `getLogs()` for the same period?
2. Is `allLogs` being set correctly when period changes?
3. Does `filteredLogs` have correct data?
4. Does OrbitSystem's `logs` prop match `allLogs` in App.tsx?

## Suggested Fix Approach

1. **DO NOT** use `filteredLogs` - use `logs` state directly (already done)
2. Ensure `getLogsByPeriod` returns ALL logs for the period, not just a subset
3. Verify the query in `main.ts` is correct
4. Add comprehensive logging to trace data at each step
5. Check if there's a 100-row LIMIT anywhere causing data loss

## Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| src/App.tsx | 205-245 | Initial data loading |
| src/App.tsx | 384-403 | Period change effect |
| src/App.tsx | 875-889 | getAppDistribution (correct data) |
| src/App.tsx | 1607 | OrbitSystem props |
| src/components/OrbitSystem.tsx | 326-510 | computePlanets function |
| src/components/OrbitSystem.tsx | 1750-1800 | computeSolarSystems function |
| src/main.ts | 1306-1347 | get-logs-by-period handler |
