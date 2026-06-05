# Tracking System Overhaul — Engineering Prompt

> **Target AI:** Lead Designer and Engineer
> **Context Bundle:** `CONTEXT_BUNDLE.md` (read this first — it contains all code references, file paths, line numbers, data structures, and architecture details)
> **Role:** You are a senior full-stack engineer. Design comprehensive, production-ready fixes for the problems below. You have NO access to the codebase — the CONTEXT_BUNDLE.md is your sole reference.

---

## Raw Request

> "Okay, do you fix something or something that is related to the tracking system and like the switching between the stuff, switching between the previous dates, right?... switching to the previous one doesn't work. It freezes the app, it causes the app to turn dark, there's like zero error thing because it just freezes the app... it's super laggy in most of the pages... the website is currently, website tracking is currently the problem where no matter what application I am, as long as I have my browser open with a website and it will track the website, that is not the correct logic... sometimes it just doesn't extract the app accurately in certain applications in especially games, for example steam games or a ballerand or like other games..."

---

## Your Task

Design a **complete engineering solution** for each of the 4 problems below. For each problem, provide:

1. **Root Cause Analysis** — Confirm or refine the root causes described.
2. **Data Processing Pipeline** — Exact logic, flow, SQL queries, and state management changes.
3. **Code Changes** — Specify exact files, functions, and lines to modify/add/remove (from CONTEXT_BUNDLE.md references).
4. **Edge Cases** — What happens with empty data, errors, race conditions, and boundary conditions.
5. **Verification** — How to manually test each fix.

---

## Problem A: Period Navigation Freeze

### Symptoms
- Clicking left/right chevron arrows on top nav bar freezes the entire app
- Screen goes dark/black, no error console output
- Requires app restart to recover
- More severe on `7day` and `30day` periods

### Known Root Causes (confirmed from code analysis)
1. **`computePeriodRange` (main.ts:3800) MISSING `7day`/`30day` cases** — falls to `default` scanning from year 2000
2. **`computeDateRange` (main.ts:3670) same missing cases** — falls to epoch
3. **`computeWeekRange` (main.ts:3833) same missing cases**
4. **`filteredLogs` → `setLogs` double-render** (App.tsx:467-475) triggers cascading re-render
5. **Object references in useMemo deps** cause unnecessary recomputation on every IPC response
6. **`chartBars` useMemo (DashboardPage.tsx:586) MISSING `7day`/`30day` cases** — produces empty bars
7. **`get-logs-by-period` (main.ts:4370) ignores `dateOffset`** — only accepts `period`

### Design Requirements
- Fix all 4 backend date range functions to properly handle `7day` and `30day` periods
- Eliminate the double-render pattern (replace `filteredLogs`+`setLogs` with direct derived state or memo)
- Stabilize object references in useMemo dependency arrays (use primitives or stable refs)
- Add missing `7day`/`30day` cases to `chartBars`
- Pass `dateOffset` to `get-logs-by-period`

---

## Problem B: Website Tracking Accuracy

### Symptoms
- Websites are tracked even when browser is NOT the focused foreground app
- Browser app sometimes appears as a regular logged app session instead of websites being tracked

### Known Root Causes
1. **Sleep/gap detection paths** (main.ts:2680-2688, 2699-2706) — `addLog()` calls missing `!isBrowserWithExtension(currentApp)` check
2. **No safety net in `addLog()` itself** (main.ts:2180) — relies on every caller to check browser condition
3. **Duplicated `BROWSER_PROCESS_NAMES`** in 4 files — maintenance risk

### Design Requirements
- Add `!isBrowserWithExtension(currentApp)` guard to sleep/gap detection `addLog()` calls
- Add a safety net in `addLog()` that silently rejects any attempt to log the tracking browser as a regular app (unless `is_browser_tracking=true`)
- Consolidate the 4 copies of `BROWSER_PROCESS_NAMES` into a single source of truth shared between main process, preload, renderer, and extension
- Ensure the extension's focus checking (`checkBrowserFocus()` in background.js) and data sending properly gate on the specific browser being the focused app

---

## Problem C: App Detection Accuracy (Games)

### Symptoms
- Games (VALORANT, Steam games, Battle.net games) are not detected or show incorrect tracking
- Game sessions show very short durations (3s instead of actual play time)
- Games appear as "Uncategorized" (neutral tier) instead of a gaming category

### Known Root Causes
1. **active-win returns `null` for exclusive fullscreen games** — library limitation
2. **PowerShell Method 1 blocked by anti-cheat** (Vanguard blocks `GetForegroundWindow`)
3. **PowerShell Method 2 is a heuristic** — picks most recently started process, not actual foreground
4. **No Gaming category** in `DEFAULT_APP_CATEGORIES` or `DEFAULT_TIER_ASSIGNMENTS`
5. **No friendly name mapping** — raw process names displayed to user

### Design Requirements
- Improve PowerShell Method 2: instead of "most recently started", try a different heuristic (e.g., check which process has the most CPU usage, or check window Z-order via `[Runtime.InteropServices.Marshal]::GetActiveObject`)
- Add Gaming category entries to `DEFAULT_APP_CATEGORIES` (e.g., 'steam', 'valorant', 'league', 'battle', 'epic', 'origin', 'ubisoft')
- Add Gaming to `DEFAULT_TIER_ASSIGNMENTS` — productive or neutral? (Design decision needed)
- Create a friendly name mapping system so `"VALORANT.exe"` can display as "VALORANT"
- Handle the case where `active-win` AND PowerShell both fail — improve session state preservation so long game sessions aren't lost

---

## Problem D: General Performance

### Symptoms
- All pages are laggy
- Data loading/saving/processing is inefficient
- Multiple seconds of delay when navigating or switching periods

### Known Root Causes
1. **`appStats` re-filters allLogs on every period change** (App.tsx:1057) — O(n) iteration over entire dataset
2. **`appColors` reads/writes localStorage in useMemo** (App.tsx:751) — synchronous localStorage blocks UI thread
3. **DashboardPage useMemos with object dependencies** — `dashboardData?.weeklyHeatmap`, `dashboardData?.hourlyHeatmap`, etc. are new object refs every IPC response
4. **`chartExternalData` recomputes on every render** — expensive Map construction from `externalSessions`

### Design Requirements
- Memoize `appStats` more efficiently — avoid re-filtering `allLogs` when only `dateOffset` changes (the data is the same, just filtered differently)
- Move `appColors` localStorage reads out of useMemo — use a ref or load-once pattern
- Add fingerprint/key-based comparison for IPC response data to skip state updates when data hasn't actually changed
- Stabilize object references in all DashboardPage useMemo deps — derive keys from the data rather than passing objects directly

---

## Output Format

Provide your solution as a structured engineering document:

```markdown
## Problem A: [Title]

### Root Cause Confirmation
[Confirm/adjust the analysis]

### Solution Design
[High-level approach]

### Implementation
**File:** `path/to/file.ts` (function name, line range)
```typescript
// Changed code with comments explaining each change
```

[Repeat for each file changed]

### Edge Cases
[List what happens with: empty data, errors, race conditions, boundary conditions]

### Verification Steps
1. [Step-by-step manual test]
```

---

## Constraints

1. **No new npm packages** — use only existing dependencies
2. **IPC-only architecture** — renderer cannot access Node.js directly
3. **Tailwind v4** — `@import "tailwindcss"` syntax only
4. **No git commands** — do not suggest reverting/resetting files
5. **Refs for async state** — use refs (not state) for values in IPC callbacks
6. **Callback cleanup** — all IPC event listeners must return unsubscribe functions
7. **Backend verification** — trace every proposed IPC channel to verify it exists in both preload.ts AND main.ts with a real implementation
8. **Minimal diffs** — touch only lines that need to change, match existing code style
