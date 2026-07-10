# 🔬 QUICK DIAGNOSTIC CHECKLIST
## Run these commands ONE BY ONE and check results

### Step 1: Check Running Processes
```bash
pgrep -f "electron" | wc -l
```
**Expected:** 0 (if you just killed them) or 1 (if app is running)
**If >1:** You have stale instances. Run `pkill -9 -f electron`

### Step 2: Check Electron Cache
```bash
ls -la ~/.config/DeskFlow/Cache/ 2>/dev/null | head -5
ls -la ~/.config/DeskFlow/Code\ Cache/ 2>/dev/null | head -5
```
**Expected:** Empty or recently cleared
**If files exist:** Run `rm -rf ~/.config/DeskFlow/Cache/* ~/.config/DeskFlow/Code\ Cache/*`

### Step 3: Check Vite Cache
```bash
ls -la node_modules/.vite/ 2>/dev/null | head -5
```
**Expected:** Should not exist (deleted before rebuild)
**If exists:** Run `rm -rf node_modules/.vite/`

### Step 4: Check dist/ Freshness
```bash
ls -la dist/assets/index.js
ls -la dist-electron/main.cjs
ls -la dist-electron/preload.cjs
```
**Expected:** All timestamps should be from your LAST build
**If older than last build:** Build did not output to these paths

### Step 5: Verify Source Has Code
```bash
grep -n "PeopleTab" src/pages/FinancePage.tsx
grep -n "PaymentAllocationModal" src/pages/FinancePage.tsx
grep -n "subscriptions:list" src/main.ts
grep -n "finance:get-lock-state" src/preload.ts
```
**Expected:** All should return line numbers
**If empty:** Source files are missing the code (restore from backup)

### Step 6: Verify Bundle Has Code
```bash
grep -o "PeopleTab" dist/assets/index.js | wc -l
grep -o "PaymentAllocationModal" dist/assets/index.js | wc -l
grep -o "subscriptions:list" dist-electron/main.cjs | wc -l
```
**Expected:** >0 for all (usually multiple occurrences)
**If 0:** Build failed or tree-shaking removed them

### Step 7: Check Build Logs
```bash
npm run build 2>&1 | tail -20
```
**Look for:**
- "error" or "Error" → Build failed, old files still in dist/
- "warnings" about unused exports → Tree-shaking is removing your code
- Clean output → Build succeeded

### Step 8: Start Fresh and Check DevTools
```bash
# In terminal 1: Start app
npm run electron:dev

# In app: Press Ctrl+Shift+I (or Cmd+Option+I)
# In DevTools Console, run:
console.log("Build check:", !!window.electronAPI);
console.log("Subscriptions API:", window.electronAPI?.subscriptions);
```
**Expected:** `window.electronAPI` exists, `subscriptions` has methods
**If undefined:** Preload bridge not loaded (check preload.cjs)

### Step 9: Check Network Tab in DevTools
```
1. DevTools → Network tab
2. Press Ctrl+R to reload
3. Find "index.js" in list
4. Click it → Response tab
5. Search (Ctrl+F) for "PeopleTab"
```
**Expected:** Found multiple times
**If not found:** Server is serving old bundle (stale HTTP server)

### Step 10: The Ultimate Test
Add this to FinancePage.tsx (temporarily):
```typescript
useEffect(() => {
  alert("FINANCE PAGE LOADED — BUILD IS FRESH");
}, []);
```
Rebuild and restart. If you see the alert → code is fresh. If not → stale bundle.
