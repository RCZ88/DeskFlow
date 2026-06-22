# Agent 3 Prompt: UI/UX Quality Fix

**Goal:** Fix visual quality and logging issues

**IMPORTANT:** Work continuously until ALL issues below are verified and fixed. Do not stop until guaranteed working.

---

## Issue 10: App Colors Not Working in Settings

**Problem:** All apps show same default color - not saving properly

**Root Cause:** 
- Color picker not saving to database
- Or color retrieval not reading from database correctly

**Files to Check:**
- `src/pages/SettingsPage.tsx` - color picker functions
- `src/main.ts` - getAppColor / setAppColor IPC handlers
- `src/preload.ts` - color API

**Current Behavior:** 
- All apps show same default color (e.g., #6366f1)
- Saving color doesn't persist

**Fix Steps:**
1. Check if there's a database table for app colors (e.g., `app_colors`)
2. Check getAppColor function returns correct value
3. Check setAppColor function saves to database
4. Debug: Add console.log to see what's saved/retrieved

**Database Functions to Create (if missing):**
```javascript
// In main.ts
ipcMain.handle('get-app-color', (event, appName) => {
  // Query app_colors table
  // Return color string
});

ipcMain.handle('set-app-color', (event, appName, color) => {
  // INSERT or UPDATE app_colors table
});
```

**Check Preload:**
```javascript
// In preload.ts
getAppColor: (appName) => ipcRenderer.invoke('get-app-color', appName),
setAppColor: (appName, color) => ipcRenderer.invoke('set-app-color', appName, color),
```

**Verification:**
1. Open Settings
2. Change an app's color
3. Save
4. Restart app
5. Check if same color persisted

---

## Issue 11: Console Log Spam

**Problem:** Console flooded with 100+ logs per second

**Root Cause:** 
- Multiple useEffect hooks with logging
- getLogs or event handlers logging in tight loops

**Files to Check:**
- `src/App.tsx` - useEffect hooks (look for console.log inside useEffect without [])
- `src/main.ts` - getLogs function logging on every call

**Common Bad Patterns:**
```javascript
// BAD - logs every render
useEffect(() => {
  console.log('State:', state);
});

// GOOD - logs only when state changes  
useEffect(() => {
  console.log('State:', state);
}, [state]);
```

**Fix Steps:**
1. Search all files for `console.log`
2. Identify which ones are in tight loops or firing continuously
3. Remove unnecessary console.log
4. Keep only essential debugging logs
5. Add dependency arrays to useEffect hooks

**Essential Logs To Keep:**
- Error logs (console.error)
- Important state changes
- API calls

**Remove These:**
- State updates during render
- Loop iterations
- Function entry points (unless debugging)

**Search Commands:**
```bash
# Find all console.log in src/
grep -rn "console.log" src/
```

**Verification:**
- Console should show reasonable amount of logs (not 100+ per second)
- Should still show important errors and state changes

---

## Issue 12: Pie Chart Visual Quality Inconsistency

**Problem:** Pie charts on Productivity page look worse than Dashboard

**Expected:** Consistent pie chart styling across all pages

**Files to Check:**
- `src/App.tsx` lines 1034-1047: Dashboard pie chart config
- `src/pages/ProductivityPage.tsx`: pie chart rendering

**Dashboard Pie Chart:**
```javascript
const pieData = {
  labels: appData.map(d => d.name),
  datasets: [{
    data: appData.map(d => d.duration),
    backgroundColor: appData.map((d, i) => {
      const hue = (i * 137.5) % 360;
      return `hsl(${hue}, 65%, 55%)`;
    }),
    borderColor: '#0a0a0a',
    borderWidth: 2,
  }]
};
```

**ProductivityPage Pie Chart Check:**
1. Find the pie chart rendering in ProductivityPage.tsx
2. Compare colors, labels, borderWidth
3. Match Dashboard styling

**Common Differences to Fix:**
- Border width (match: 2px)
- Border color (match: #0a0a0a)  
- Color generation (use golden angle like Dashboard: `(i * 137.5) % 360`)
- Legend position
- Chart size

**Fix Example:**
```javascript
// Make consistent
const chartOptions = {
  plugins: {
    legend: {
      position: 'right' as const,  // Match Dashboard
    }
  },
  cutout: '65%',  // If using doughnut chart
  colors: {
    saturation: 0.65,  // Match 65%
    brightness: 0.55,  // Match 55%
  }
};
```

**Verification:**
- Compare pie charts side by side
- Should look nearly identical in styling

---

## SUCCESS CRITERIA (ALL must pass):

1. ✅ Each app has unique saved color (persists after restart)
2. ✅ Console shows reasonable logs (not flooded)
3. ✅ Pie charts look consistent across Dashboard and Productivity page

**BUILD VERIFICATION:** Run `npm run build` after each fix to ensure no build errors.

---

## If Stuck:

1. Check PROBLEMS.md (agent/PROBLEMS.md) for detailed issue descriptions
2. Check if database table exists for app colors
3. Use React DevTools to trace re-renders (for log spam)
4. Compare code between Dashboard and ProductivityPage pie charts

---

## Quick Fix Commands:

**Find all console.log:**
```bash
grep -rn "console.log" src/ | head -20
```

**Find all useEffect:**
```bash
grep -rn "useEffect" src/ | head -20
```

---

**IMPORTANT:** Continue working until ALL 3 issues are 100% verified working. Report to user with specific test results for each issue.