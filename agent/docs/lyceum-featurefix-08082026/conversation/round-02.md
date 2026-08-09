# Round 02 — Lyceum Learn: runtime verification round (CZ-tested)

> **Date:** 2026-08-09
> **Stage:** 3 renderer root causes found + fixed + built; illustration stale-data root-caused (re-import required); latent re-import bug fixed
> **Convergence status:** fixes on disk, awaiting CZ relaunch + re-import

## CZ Runtime Verification Results (first pass, after round-01)

- **WORKS:** E1 first table (styled Tabulator), E7 python code block (single highlight), E8 HTML widget.
- **BROKEN (exact errors pasted):**
  1. Chart block: `Evaluating a string as JavaScript violates ... 'unsafe-eval' is not an allowed source of script: script-src 'self' 'unsafe-inline'` (vega-lite bar spec, data at `spec.data.values`).
  2. FinChart: `Chart error: chart.addLineSeries is not a function` (vega-lite line spec).
  3. Sankey/flow: `Parse error on line 2: ...ntmatter Parser : 10Input Text --> Node ... Expecting 'COMMA', got 'NEWLINE'`.
  4. Illustration still does not render.

## Fixes Applied (round-02)

### E3 — ChartBlock CSP violation (ROOT CAUSE + FIX)
- The renderer CSP is **not** in index.html — Electron injects it via `session.defaultSession.webRequest.onHeadersReceived` at `src/main.ts:19414`: `script-src 'self' 'unsafe-inline'` (no `'unsafe-eval'`). Vega compiles spec expressions with `new Function` → blocked.
- **FIX:** `'unsafe-eval'` added to `script-src` (local-only Electron app — acceptable). main.cjs rebuilt.

### E4 — FinChart `addLineSeries is not a function` (ROOT CAUSE + FIX)
- Installed `lightweight-charts` is **v5.2.0**; v5 **removed** `addLineSeries`/`addAreaSeries`/`addHistogramSeries`/`addCandlestickSeries`.
- **FIX:** series created via `chart.addSeries(lwc.LineSeries/AreaSeries/HistogramSeries/CandlestickSeries, {...})` (named exports, verified present). `extractData()` (handles `spec.data.values`) and multi-series logic unchanged.

### E5 — Sankey "Expecting 'COMMA', got 'NEWLINE'" (ROOT CAUSE + FIX)
- Empirically tested in node against the installed mermaid 11.16: **every** `A --> B : 10` variant fails (plain, single/double-quoted labels, underscore names) with `Expecting 'COMMA', got 'NEWLINE'`; comma-separated links fail too.
- **The mermaid 11 sankey grammar is CSV (RFC 4180):** header `sankey-beta`, then one row per link: `source,target,value` (`record: field COMMA field COMMA field`; rows separated by NEWLINE). Verified against the upstream grammar file (mermaid develop `packages/mermaid/src/diagrams/sankey/parser/sankey.jison`).
- **FIX:** `FlowBlock.edgesToMermaid` sankey branch emits `from,to,value` lines; fields containing `,` or `"` are double-quoted (`""` escape). Validated: CSV source passes grammar (headless node shows `DOMPurify.addHook is not a function` = parse OK, render setup needs DOM); `-->` sources all fail.
- ⚠️ This **corrects round-01's** E5 claim (`A --> B : 10` "proper sankey syntax" — that syntax never parsed).

### E9 — Illustration still not rendering (ROOT CAUSE: stale stored lesson, NOT a component bug)
- Byte-searched the real DB `%APPDATA%\RHEO\deskflow-data.db` (122 MB, read-only shared-open): lesson `testing-the-lyceum-parser` present, but **zero** `"type":"illustration"` blocks anywhere in the DB (all other block types exist: prose 274, leaf 145, quiz 103, code 95, mermaid 47, table 19, chart 4…).
- The current parser (dist-electron/services/learn, all newer than src) **does** emit 1 illustration block for `lesson.txt` (verified via esbuild bundle + node: 20 blocks, 15 types incl. illustration with full `meta.prompt`).
- **FIX PATH (user action):** re-import `lesson.txt` via Learn → Import → paste → Validate & Import. `importLdoc` recomputes `content_hash` from the new blocks → differs from stored → node overwrite.

### LATENT — Re-import of a changed lesson would crash (ROOT CAUSE + FIX)
- `ImportService.importLdoc` skips unchanged nodes by hash, then `repo.insertNode` — which was a **plain INSERT** (`src/services/learn/db/repo.ts:69`) → the changed illustration node would have thrown `UNIQUE constraint failed: learn_nodes.id` and rolled back the whole import transaction.
- **FIX:** `insertNode` now `ON CONFLICT(id) DO UPDATE SET …` (mirrors `upsertLesson`). Deliberately **not** `INSERT OR REPLACE` — that would cascade-delete `learn_progress` rows (FK `ON DELETE CASCADE`).
- `db/repo.js` recompiled per-file (no `--bundle`, per MEMORY invariant); `index.js` + `validator/validate.js` also recompiled fresh.

## Verification Status

- Node harness `TEMP/opencode/sankey-test*.mjs`: grammar behavior mapped (CSV accepted; `-->` variants fail with exact user-reported error).
- Parser bundle test: 3 nodes, 20 blocks, 15 types incl. 1 illustration (matches round-01 expectation).
- `npx tsc -p tsconfig.app.json`: only pre-existing `aiAgentService.test.ts` errors — zero in changed files.
- `npx vite build`: OK (1m1s, `dist/assets/index.CxJVfkRs.js` 13.5 MB); dist gates pass (`#root`, `df-fallback`, hashed entry exists).
- `node scripts/rebuild-main.mjs`: OK (4.44s, main.cjs 1282 KB — includes CSP fix).
- dist-electron/services/learn: `db/repo.js` (14592 B) + `index.js` (49966 B) + `validator/validate.js` (8552 B) recompiled per-file.
- **Runtime: NOT LAUNCHED** — RHEO is running without `--remote-debugging-port` (Probe cannot attach; per process rules it was not touched). NOTE: the `electron.exe` processes on this machine are an unrelated app (YAP-A-TrON), not RHEO — left alone.

## Next Action (CZ)

1. **Fully close RHEO** (close → confirm quit) and relaunch — new bundle hashes + new main.cjs are only picked up on restart.
2. Re-open `testing-the-lyceum-parser` → verify: chart block renders (no CSP error), finchart line chart renders, sankey renders.
3. **Re-import the lesson**: Learn → Import → paste the content of `agent/docs/lyceum-featurefix-08082026/lesson.txt` → Validate & Import → open `Meta & Testing` node → illustration card should appear (prompt + Copy + Upload; Pending Illustrations panel entry).
4. Report any remaining error verbatim (console line if possible).
