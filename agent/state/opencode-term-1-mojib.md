<!-- SESSION: opencode-term-1-mojib -->
<!-- AGENT: opencode | TERMINAL: term-1 | PROJECT: C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker -->

# Agent State — opencode-term-1-mojib

> **STATUS:** completed | **UPDATED:** 2026-08-07T03:10:00.000Z

---

## CURRENT CYCLE (4)
**ROLE:** Hands & Eyes — sleep exclusion everywhere except Sleep Patterns (user rule) + verify rebuild
**STATUS:** completed
**IN FLIGHT:**
- (none)
**COMPLETED:**
- User rule confirmed: sleep appears ONLY in Sleep Patterns card + Add/Edit Sleep flows on External page — never in charts, mosaic, session lists, stats/totals, gap views.
- Backend (main.ts): `get-external-sessions` + `get-external-stats` main query now `AND ea.type != 'sleep'`; sleep-deficit/average-sleep recomputed via NEW sleep-only query (`ea.type = 'sleep'`) so stats payload fields stay correct. `detect-usage-gaps` intentionally UNCHANGED — sleep stays as tracked coverage so nights never become gaps.
- Renderer (ExternalPage.tsx): `setOrderedActivities(activities.filter(a => a.type !== 'sleep'))` kills sleep in mosaic + timeline legends + selection overlay; TransferSessionModal gets filtered activities prop. GapFillDrawer picker now `name !== 'AFK' && a.type !== 'sleep'`.
- Preserved: Sleep Patterns card (getSleepTrends/getSleepForDate — separate IPC, untouched), active-sleep display (935), recovery card (2136), "+ Sleep" (916), past-sleep modal (1800).
- Verified: vite build OK (1m17s, index.CuQ4uFUs.js 13.4MB), preload 95KB, main.cjs 1241KB with both filters present. Read-only DB probe: 33 sleep sessions exist, filtered query returns 121 (0 sleep). dist/index.html gates pass.
- BUILD GOTCHA: stale dist\src.zip (from zip-src) locked by another process → vite EPERM on emptyDir. User closed app/Explorer → file gone → build clean.
**NEXT ACTION:** User relaunches RHEO → External page: sleep gone from mosaic/timelines/charts/gaps/lists; Sleep Patterns card + Add/Edit still show sleep.
**NOTES:** Runtime verify = NOT LAUNCHED (app closed; user relaunch needed). DB read-only only.

---

## HISTORY (previous cycles)

### Cycle 3 — 2026-08-07
**ROLE:** Hands & Eyes — mosaic mode size caps (subtle/balanced/dramatic hard ceiling on biggest card)
**STATUS:** completed
**COMPLETED:**
- src/lib/external/grid.ts: MAX_SHARE_MAP {subtle 0.18, balanced 0.30, dramatic 0.48} + applyMaxShare() water-filling clamp; harness-verified (TEMP/opencode/grid-cap-test.js); vite build OK, no main/preload change.
**NEXT ACTION:** User relaunch + toggle mosaic modes on External page.

### Cycle 2 — 2026-08-06
**ROLE:** Hands & Eyes — External gaps list: split multi-day gaps per calendar day (GapsListModal)
**STATUS:** completed
**COMPLETED:**
- splitGapByDay() in GapsListModal.tsx — per-local-midnight clipping at fetch-mapping; harness-verified (Aug 2 8.3h/3 24h/4 24h/5 17.4h, sum conserved).
**NEXT ACTION:** User relaunch + confirm rows Aug 2/3/4/5.
