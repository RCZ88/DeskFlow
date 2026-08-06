<!-- SESSION: opencode-term-1-mojib -->
<!-- AGENT: opencode | TERMINAL: term-1 | PROJECT: C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker -->

# Agent State — opencode-term-1-mojib

> **STATUS:** completed | **UPDATED:** 2026-08-07T02:30:00.000Z

---

## CURRENT CYCLE (3)
**ROLE:** Hands & Eyes — mosaic mode size caps (subtle/balanced/dramatic hard ceiling on biggest card)
**STATUS:** completed
**IN FLIGHT:**
- (none)
**COMPLETED:**
- User req (confirmed): Activity Mosaic modes (External page top-right pills subtle/balanced/dramatic) must HARD-CAP the biggest card's share — subtle tiny, balanced moderate, dramatic flexible-but-bounded. Gamma flattening alone wasn't enough (dominant could still eat 1/3+ of grid).
- Implemented in src/lib/external/grid.ts: `MAX_SHARE_MAP` {subtle: 0.18, balanced: 0.30, dramatic: 0.48} + `applyMaxShare()` water-filling clamp: clamp over-cap cards, redistribute freed mass proportionally to under-cap cards, repeat; degenerate infeasible data (n·cap < 1) falls back to renormalized equal-ish split (still far smaller than uncapped). Single consumer: computeActivityGridLayout.
- Verified via esbuild bundle + node harness (TEMP/opencode/grid-cap-test.js): hard cap holds exactly when feasible (18.0/30.0/48.0%), ordering preserved, sums = 1.0; 2-item 95/5 → 50/50 (mathematically best under cap); 5-item subtle (infeasible) → 20% each.
- npx vite build OK (1m08s, index.C08rzv3w.js 13.4MB). dist/index.html gates pass (#root, #df-fallback, module script). No main/preload change.
**NEXT ACTION:** User fully closes + relaunches RHEO; External page → mosaic → toggle Subtle/Balanced/Dramatic → dominant card must cap at ~1/5, ~1/3, ~1/2 respectively.
**NOTES:** Runtime verify = NOT LAUNCHED (no CDP debug port). No DB access this cycle.

---

## HISTORY (previous cycles)

### Cycle 2 — 2026-08-06
**ROLE:** Hands & Eyes — External gaps list: split multi-day gaps per calendar day (GapsListModal)
**STATUS:** completed
**IN FLIGHT:**
- (none)
**COMPLETED:**
- Root-caused (read-only DB probe): detect-usage-gaps merges untracked spans across day boundaries into ONE gap object (Aug 2 08:42Z→Aug 5 10:22Z = 73.7h); GapsListModal grouped by gap.start.toDateString() → whole chunk showed as 1 row under Aug 2; Aug 3/4 empty.
- Explained "sleep 3-5 days" on heatmap: ONE sleep session id 64 (Jul 25 18:30Z→27 09:36Z, 39h, ~24h device_off) spans 3 calendar days; Dashboard heatmap buckets sessions hour-by-hour (DashboardPage.tsx:1576) → solid multi-day block. No data near Aug 2-5 at all.
- Fix: `splitGapByDay()` in GapsListModal.tsx — per-local-midnight clipping at fetch-mapping (flatMap); each day own row/duration/Fill. Harness-verified (Aug 2 8.3h/3 24h/4 24h/5 17.4h, sum conserved). fillGapWithSegments uses only start/end → safe.
**NEXT ACTION:** User relaunch + confirm rows Aug 2/3/4/5.

### Cycle 1 — 2026-08-06
**ROLE:** Hands & Eyes — fix runtime crash "Cannot find module '../lib/mojibake'"
**STATUS:** completed
**IN FLIGHT:**
- (none)
**COMPLETED:**
- Root cause: scripts/build.mjs never compiled src/lib → dist-electron/lib/ missing → runtime crash. Fix: add libFiles to allTsFiles in build.mjs. Rebuilt OK.
**NEXT ACTION:** User relaunch RHEO.
