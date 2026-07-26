# Agent 2 Prompt: Settings & Persistence Fix

**Goal:** Fix Settings page errors and category persistence issues

**IMPORTANT:** Work continuously until ALL issues below are verified and fixed. Do not stop until guaranteed working.

---

## Issue 3: AlertTriangle Not Defined Error

**Error:** `Uncaught ReferenceError: AlertTriangle is not defined at SettingsPage.tsx:1186`

**Root Cause:** AlertTriangle icon is used but not imported from lucide-react

**Fix:**
1. Find the imports at top of SettingsPage.tsx
2. Add `AlertTriangle` to the import from 'lucide-react'
3. Ensure it's used correctly in JSX

**Example:**
```javascript
import { AlertTriangle, ... } from 'lucide-react';
```

**Files to Check:**
- `src/pages/SettingsPage.tsx` - imports section (first ~20 lines)
- `src/pages/SettingsPage.tsx` - line ~1186 (where error occurs)

**Verification:**
- Switch category assignments - no JavaScript errors in console

---

## Issue 4: Duplicate Category Assignment Section

**Problem:** Two category assignment sections in Settings - one at top, one at bottom

**Fix:**
1. Find BOTH rendering locations in SettingsPage.tsx
2. Identify which is the "duplicate" (usually the one at bottom)
3. Remove the duplicate section

**Files to Check:**
- `src/pages/SettingsPage.tsx` - look for two similar render sections

**Verification:**
- Only ONE category assignment section visible in Settings page

---

## Issue 5: Category Changes Don't Persist to Database

**Problem:** Changed category reverts to old value after app restart

**Root Cause:** 
- `setCategoryOverride()` may not write to database
- Or database write transaction not committing

**Files to Check:**
- `src/pages/SettingsPage.tsx` - setCategoryOverride function
- `src/main.ts` - IPC handler for setting category
- `src/preload.ts` - API bridge

**Database Structure to Check:**
- Check if there's a table for category overrides
- Verify INSERT/UPDATE is being called

**Fix Steps:**
1. Find where category override is saved
2. Add console.log to verify database write is called
3. Check SQLite transaction commits

**Example Debug:**
```javascript
// In main.ts IPC handler
ipcMain.handle('set-category-override', (event, app, category) => {
  console.log('[DB] Saving category override:', app, category);
  // ... database write code
  console.log('[DB] Category override saved');
});
```

**Verification:**
1. Change an app's category in Settings
2. Restart the app completely
3. Check if category changed persisted

---

## Issue 6: Category Changes Don't Update Instantly in UI

**Problem:** Must click Save button - no real-time update

**Expected:** When dropdown changes, table should immediately show new category

**Fix:**
1. Find the category dropdown onChange handler
2. Add state update to trigger re-render
3. Update both the displayed category AND trigger save

**Implementation:**
```javascript
// In category dropdown
<select 
  value={appCategory} 
  onChange={(e) => {
    const newCategory = e.target.value;
    // Update display immediately
    setAppCategory(newCategory);
    // Also save to database
    handleSaveCategory(app, newCategory);
  }}
>
```

**Files to Check:**
- `src/pages/SettingsPage.tsx` - category dropdown section
- Look for handleSaveCategory or similar function

**Verification:**
- Change dropdown - table updates WITHOUT clicking separate Save button

---

## Issue 7: Confusing Sync Button

**Problem:** Sync button exists but is confusing after auto-save works

**Fix:** 
1. Find the Sync button in SettingsPage.tsx
2. Remove it OR change to "Saved" indicator after auto-save works

**Files to Check:**
- `src/pages/SettingsPage.tsx` - look for Sync button

**Verification:**
- No confusing Sync button, OR shows confirmation after saving

---

## SUCCESS CRITERIA (ALL must pass):

1. ✅ No JavaScript errors when switching categories
2. ✅ Single category assignment section (no duplicates)
3. ✅ Category change persists after app restart
4. ✅ Table updates immediately when category changes (no separate Save click needed)
5. ✅ No unnecessary Sync button

**BUILD VERIFICATION:** Run `npm run build` after each fix to ensure no build errors.

---

## Database Functions to Check (in main.ts):

Look for these patterns:
- `setCategoryOverride`
- `saveCategoryOverride` 
- `category_overrides` table

If database write doesn't exist, you may need to:
1. Create a new IPC handler
2. Create the category_overrides table if it doesn't exist
3. Add INSERT/UPDATE logic

---

## If Stuck:

1. Check PROBLEMS.md (agent/PROBLEMS.md) for detailed issue descriptions
2. Test by making small category change
3. Restart app to verify persistence
4. Check SQLite database directly if needed

---

**IMPORTANT:** Continue working until ALL 5 issues are 100% verified working. Report to user with specific test results for each issue.