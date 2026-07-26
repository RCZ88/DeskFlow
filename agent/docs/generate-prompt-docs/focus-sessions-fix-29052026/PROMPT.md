# PROMPT: Fix Focus Sessions — Diagnose & Repair End-to-End

## Raw Request

> "FOCUS SESSION DOESNT WORK AT FUCKIGN ALL."
>
> (Subsequent conversation: "GNERATE PROMPT SKILL NOW")

---

## Context

Read `agent/docs/focus-sessions-fix-29052026/CONTEXT_BUNDLE.md` first — it contains every line of relevant code with exact line numbers, the complete data flow diagram, DB schema, IPC handlers, preload bridges, type declarations, and 5 identified potential problem areas.

**Files involved:**
- `src/main.ts` — `categorizeApp()`, foreground polling, `save-productivity-session` IPC handler
- `src/preload.ts` — bridges: `saveProductivitySession`, `getProductivitySessions`, `clearProductivitySessions`
- `src/pages/DashboardPage.tsx` — 4 effects (listener, timer, session saver, periodic flush) + Focus Sessions UI section with IIFE hooks anti-pattern
- `src/App.tsx` — `Window.deskflowAPI` type declaration (missing `getProductivitySessions`)

---

## The Mandate

Design a comprehensive, surgical fix to make Focus Sessions work end-to-end. Do NOT redesign the entire system — fix what's broken.

**Success criteria:** When a user switches to a productive app (VS Code, Obsidian, etc.), the Focus Sessions card on the Dashboard should:
1. Show the live timer accumulating
2. After switching away (1+ min of productive time), save the session to the database
3. The Focus Sessions UI should display the session in its list
4. Stats (Today Best, Week Best, All-Time PB) should update

---

## Requirements

### Engineering Task 1 — Trace the Data Flow
1. Start at `pollForeground()` in main.ts. What app name does active-win return on this system?
2. Does `categorizeApp()` return the correct category? (e.g. `code` → `'IDE'`)
3. Does the `foreground-changed` event actually reach the DashboardPage listener?
4. Is `setCurrentApp()` ever called with a valid `ForegroundData` object?
5. Does the Timer Effect's `getTierFromCategory()` return `'productive'` for the user's app?
6. Does the Session Saver Effect's `shouldCountSession` evaluate to `true`?
7. Is `productivitySessionStartRef.current` ever set?
8. Does the session-saving IPC call succeed? Check `save-productivity-session` handler.
9. Does the Focus Sessions UI's `getProductivitySessions` fetch return the saved session?

### Engineering Task 2 — Fix Every Broken Link
For each step above that fails:
- **Missing data?** Fix the sending side (main process or preload)
- **Incorrect type?** Fix the receiving side (DashboardPage state or type)
- **Effect not running?** Fix the dependency array
- **IIFE hooks issue?** Consider whether the IIFE `useState`/`useCallback`/`useEffect` inside JSX at line 2386 is causing hooks to be re-mounted on every render. Move them to the component body if so.
- **Type gap?** Add `getProductivitySessions` to `App.tsx:88` Window interface if needed
- **Browser mode?** When `isInBrowser` is true, `currentApp` is NOT set (the listener returns early). This means `currentApp?.category` is null → `lastNonBrowserApp?.category` is used instead. If `lastNonBrowserApp` is stale or null, tier computation fails.

### Engineering Task 3 — Add Logging for Diagnosis
Add `console.log` at every decision point in the chain so future debugging is faster:
- `categorizeApp()` result
- `onForegroundChange` received data
- Timer effect: tier, shouldAccumulate, shouldPause
- Session saver effect: shouldCountSession, start time, duration
- IPC call: save-productivity-session result

### Constraint — Minimal Changes
- Do NOT restructure the component
- Do NOT change the stopwatch accumulate pattern
- Do NOT touch the Main Process beyond the IPC handler if it's fine
- Fix only the broken links in the chain

---

## Output

Save the full fix implementation to `src/pages/DashboardPage.tsx` and optionally `src/App.tsx` (if type declaration fix needed). Save analysis notes (what was broken, what was fixed, how to verify) to `agent/docs/focus-sessions-fix-29052026/RESULT.md`.
