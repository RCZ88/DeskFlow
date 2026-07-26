# Agent 1 Prompt: Data & Visualization Fix

**Goal:** Fix all data consistency and visualization issues between Dashboard, Stats, and Productivity pages

**IMPORTANT:** Work continuously until ALL issues below are verified and fixed. Do not stop until guaranteed working.

---

## Issue 1: Period Switching Not Working (Week/Month Show Same Data)

**Problem:** When switching between Week and Month time filters, data is identical - both show 4401 logs.

**Debug Info:** 
- User has 8 days of data
- Week filter: shows 4401 logs
- Month filter: shows 4401 logs (should show more)

**Expected Behavior:**
- Week should show ~7 days of data
- Month should show all available data (~8 days since user has 8 days)

**Root Cause to Verify:**
1. Check App.tsx `getTotalTime()` function - is it filtering correctly?
2. Check App.tsx `filteredLogs` useMemo - is date comparison working?
3. Check if `allLogs` contains ALL data from database

**Files to Check/Modify:**
- `src/App.tsx` lines 900-940: getTotalTime function
- `src/App.tsx` lines 216-244: filteredLogs useMemo
- `src/main.ts` getLogs function - verify no LIMIT clause

**Verification Steps:**
1. Add console.log to getLogs() to see actual logs returned
2. Verify database has more than 7 days of data
3. Check date filtering math in filteredLogs useMemo

**Fix:** Ensure filtering uses correct date comparison. Week should use `timestamp >= 7 days ago`, Month should use `timestamp >= 30 days ago`

---

## Issue 2: Activity Visualization Data Mismatch

**Problem:** Activity Visualization shows only 20 apps but Stats page shows 33 apps

**Expected:** Both should show SAME data - 33 apps

**Root Cause:**
- `getAppDistribution()` in App.tsx line 1021 uses `logs` state
- Should use `filteredLogs` to match selected period
- Or should use `computedAppStats` for consistency with StatsPage

**Files to Check/Modify:**
- `src/App.tsx` lines 1019-1032: getAppDistribution function
- `src/App.tsx` line 241: setLogs(filteredLogs) - verify this line exists

**Fix:** Change `getAppDistribution()` to use `filteredLogs` instead of `logs`:
```javascript
const getAppDistribution = () => {
  const grouped: Record<string, number> = {};
  filteredLogs.forEach(log => {  // Changed from 'logs' to 'filteredLogs'
    // ... rest of function
  });
};
```

**Verification:**
- After fix, Activity Viz should show same app count as Stats page

---

## Issue 8: Productivity Score Mismatch

**Problem:** Dashboard productivity % does NOT match Productivity page

**Expected:** Both should show identical productivity percentage

**Root Cause:**
- Dashboard uses `productivityScore` useMemo (lines ~958-978 in App.tsx)
- ProductivityPage uses different calculation
- Different data sources (logs vs computedAppStats)

**Files to Check/Modify:**
- `src/App.tsx` lines 958-978: productivityScore useMemo
- `src/pages/ProductivityPage.tsx`: productivity calculation

**Fix:** 
1. Check how ProductivityPage calculates productivity
2. Make Dashboard use SAME calculation logic
3. Both should use same categories (productive/neutral/distracting from tierAssignments)

**Verification:**
- Toggle "Focus" mode on Dashboard: shows X%
- Go to Productivity page: should show X% (same value)

---

## Issue 9: Activity Visualization Should Be Heatmap with Week Navigation

**Problem:** Want heatmap with LEFT/RIGHT arrows to navigate weeks

**Current State:** Activity Visualization is a pie chart, no navigation

**Files to Check/Modify:**
- `src/App.tsx` lines 1686-1720
- `src/App.tsx` vizMode state

**Implementation:**
1. Add `weekOffset` state (number, default 0)
2. Add LEFT/RIGHT arrow buttons
3. On arrow click: increment/decrement weekOffset
4. Filter heatmap data by `weekOffset` (current week = 0, previous week = -1, next week = +1)
5. Show week date range in header

**Example Implementation:**
```javascript
// Add state
const [weekOffset, setWeekOffset] = useState(0);

// Navigation buttons
<button onClick={() => setWeekOffset(w => w - 1)}>← Previous Week</button>
<button onClick={() => setWeekOffset(w => w + 1)}>Next Week →</button>

// Filter by week offset
const getWeekLogs = () => {
  const now = new Date();
  const weekStart = new Date(now.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  return allLogs.filter(l => l.timestamp >= weekStart && l.timestamp < weekEnd);
};
```

**Verification:**
- Click LEFT arrow: shows previous week's heatmap
- Click RIGHT arrow: shows next week's heatmap (if data exists)

---

## SUCCESS CRITERIA (ALL must pass):

1. ✅ Week shows ~7 days of data, Month shows all data (~8 days)
2. ✅ Activity Viz shows same apps as Stats page (33 apps)
3. ✅ Dashboard and Productivity page show same productivity %
4. ✅ Heatmap has working LEFT/RIGHT navigation
5. ✅ All data changes correctly when period (Today/Week/Month/All) changes

**BUILD VERIFICATION:** Run `npm run build` after each fix to ensure no build errors.

---

## If Stuck:

1. Check PROBLEMS.md (agent/PROBLEMS.md) for detailed issue descriptions
2. Check state.md (agent/state.md) for recent changes
3. Add console.log statements to trace data flow
4. Verify database data first: check SQLite directly if needed

---

**IMPORTANT:** Continue working until ALL 4 issues are 100% verified working. Report to user with specific test results for each issue.