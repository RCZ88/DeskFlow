# PROMPT: Fix DashboardPage Runtime Crashes (TDZ + Null Guard)

## Raw Request

> "Uncaught ReferenceError: Cannot access 'ht' before initialization
>     at eZ (DashboardPage.tsx:352:35) alright that s enough, use @agent\skills\generate-prompt/ to solve the problem now."
>
> "DashboardPage.tsx:547 Uncaught TypeError: Cannot read properties of null (reading 'weeklyHeatmap')
>     at DashboardPage.tsx:547:37"

---

## Context

Read `agent/docs/dashboard-tdz-fix/CONTEXT_BUNDLE.md` for full code structure, data flow, and IPC details.

**Component:** `DashboardPage.tsx` (~3000 lines) — the main dashboard with productivity charts, heatmap, solar system, and activity feed.

---

## The Mandate

Design a comprehensive fix for two distinct runtime crash patterns in the DashboardPage component:

### Bug 1 — Temporal Dead Zone (TDZ)
`const [weekOffset, setWeekOffset] = useState(0)` at line ~452 is referenced in a `useEffect` dependency array at line ~352. Since `const` is in the Temporal Dead Zone until its declaration line executes during render, accessing it before declaration throws `ReferenceError: Cannot access 'X' before initialization`.

### Bug 2 — Null Data Guard
`dashboardData` starts as `null` (initial state: `useState<any>(null)`). The async fetch populates it later. On first render, any code path that accesses `dashboardData.X` without optional chaining (`?.`) throws `TypeError: Cannot read properties of null (reading 'X')`.

---

## Requirements

### Data Processing Logic
1. Identify EVERY `const` variable (useState, useRef, useMemo, plain const) that is referenced in a hook's dependency array or useMemo callback before its declaration line
2. Move all such variables ABOVE the hooks that reference them
3. Group ALL `useState` declarations at the top of the function body, before any `useEffect` or `useMemo`
4. Identify EVERY unguarded `dashboardData.X` access (no `?.` or null check) across all code paths
5. Add `?.` to every `.weeklyHeatmap.find()`, `.hourlyHeatmap[...]`, `.recentSessions.slice()` access
6. Consider: the `chartBars` useMemo has 4 switch cases (today/week/month/all). Three of them access `dashboardData.weeklyHeatmap.find()` — fix all three

### Verification
1. Build must pass: `npm run build`
2. Dashboard must not crash on first render (before data loads) — test with all 4 period options
3. Dashboard must load and display data after fetch completes

---

## Edge Cases
- What if `dashboardData.weeklyHeatmap` is undefined even after data loads? (e.g., empty DB)
- What if `dashboardData` is still null when the component unmounts? (cleanup effect exists at line 351)
- What about other useMemos that access `dashboardData`? (heatmapData, computedWebsiteData, computedSolarData, stats — check if they ALL have guards)

---

## Output
Save the fix implementation to `src/pages/DashboardPage.tsx`. Save analysis notes to `agent/docs/dashboard-tdz-fix/RESULT.md`.
