# IDE Projects Fixes - Implementation Plan

## Phase 1: Quick UI Fixes (Low Risk)

### Fix #24: Remove Duplicate Add Project Button
- **File:** `src/pages/IDEProjectsPage.tsx`
- **Action:** Remove the "Add Project" button from the header (lines ~460-500)
- Keep only the one inside the Projects tab

### Fix #27: Remove "How Counts Are Calculated" from Tools Page
- **File:** `src/pages/IDEProjectsPage.tsx`
- **Action:** Remove the section around line 832-844
- Can add to AI agent expanded view later (Fix #23)

## Phase 2: Data/Logic Fixes (Higher Risk)

### Fix #25: Duplicate Tools on Sync
- **File:** `src/main.ts`
- **Function:** `handleScan` and tool detection logic
- **Issue:** `db.prepare('INSERT INTO tools...')` adds without checking for duplicates
- **Fix:** Change to `INSERT OR REPLACE` or check if exists first:
```sql
INSERT OR REPLACE INTO tools (id, name, category, version, install_path, detected_at, detection_method)
VALUES (?, ?, ?, ?, ?, ?, ?)
```
Or use `DELETE FROM tools` before insert in scan, then re-insert.

### Fix #26: Add Reset Tools Function
- **File:** `src/main.ts`
- **Action:** Add new IPC handler:
```typescript
ipcMain.handle('reset-tools', () => {
  db.prepare('DELETE FROM tools').run();
  db.prepare('DELETE FROM project_tools').run();
  return { success: true };
});
```
- **File:** `src/preload.ts` - Add `resetTools` to API
- **File:** `src/pages/IDEProjectsPage.tsx` - Add "Reset" button in Tools tab

### Fix #28: Add Project Modal Button Not Working
- **File:** `src/pages/IDEProjectsPage.tsx`
- **Issue:** The modal's Add Project button calls `handleAddProject` but state might not be updating correctly
- **Debug:** Check if `newProject` state is being set correctly
- **Check:** Is `overview?.ides` being passed to the select dropdown?
- **Possible Issue:** The modal was added at end of file but might have scope issues with `newProject` state

### Fix #29: AI Usage Chart Not Updating
- **File:** `src/pages/IDEProjectsPage.tsx`
- **Issue:** After sync, `loadOverview()` is called but `aiAgents` useMemo might not re-compute
- **Check:** The `aiAgents` useMemo depends on `overview?.aiUsage?.byTool`
- **Check:** The `aiChartData` useMemo depends on `aiAgents` and `overview?.aiUsage?.byTool`
- **Possible Issue:** The overview data might not have `byTool` populated correctly after sync
- **Debug:** Console.log the result of `syncAIUsage` and `loadOverview` to see if data is populated

## Phase 3: AI Tool Detail View (Fix #23)

### Move "How Counts" to AI Agent Expanded View
- **File:** `src/pages/IDEProjectsPage.tsx`
- **Location:** Inside the `selectedAgentDetail` modal (around line 1873)
- **Action:** Add the info box to the expanded agent view, showing agent-specific info

## Phase 4: Terminal (Defer to Later)

### Fix #30: Terminal Spec Compliance
- **Reference:** `agent/docs/terminalFeature.md`
- **Status:** Defer - user said "lets just work on that later"

---

## Recommended Order of Execution

1. Fix #24 - Remove duplicate button (5 min)
2. Fix #27 - Remove "How Counts" from Tools (5 min)  
3. Fix #25 - Fix duplicate tools on sync (15 min)
4. Fix #26 - Add Reset Tools button (10 min)
5. Fix #28 - Debug Add Project modal (15 min)
6. Fix #29 - Debug AI chart update (15 min)
7. Fix #23 - Move info to AI agent view (10 min)
8. Fix #30 - Terminal - DEFER

**Total estimated time:** ~75 minutes for fixes 1-7
