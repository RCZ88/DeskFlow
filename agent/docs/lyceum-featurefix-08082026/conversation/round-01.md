# Round 01 — Lyceum Learn: 9 renderer bugs from `errorsfound.md`

> **Date:** 2026-08-08
> **Stage:** All 9 fixes implemented + build verified → awaiting CZ runtime verification
> **Convergence status:** fixes shipped

## Errors Checked In (from errorsfound.md)

Test lesson: `testing-the-lyceum-parser` (`lesson.txt`). 9 distinct renderer bugs.

## Fixes Applied (all 9)

- **E1/E6 — Table blocks unstyled (`the-parser-s-anatomy-b2`, `data-flow-and-visualization-b6`)**: Tabulator v6 CSS was never imported → rows rendered as stacked text. `TableBlock.tsx` now imports `tabulator.min.css` + `tabulator_site_dark.min.css`; dropped the invalid v6 `theme: 'dark'` option (silently ignored); auto-heal on stale-chunk import failure; plain-HTML fallback table under `<details>` if Tabulator errors.
- **E2 — Mermaid infinite spinner (`the-parser-s-anatomy-b3`)**: per-render `mermaid.initialize()` hangs mermaid 11.16 (init-count tracking). New shared `blocks/mermaidLoader.ts`: initialize ONCE per session + 15s render timeout with human error message. Both MermaidBlock + FlowBlock use it.
- **E3 — Chart block stale chunk (`data-flow-and-visualization-b2`)**: ChartBlock now detects `isDynamicImportFailure` → `autoHealDynamicImport()` (the old `.catch` swallowed it so the global self-heal never fired); container cleared between renders; Retry button.
- **E4 — FinChart "No data series found" (`data-flow-and-visualization-b3`)**: parser produces full vega-lite specs — data lives at `spec.data.values`, old code expected a top-level array. New `extractData()` handles `data.values` / plain array / OHLC. Multi-series: every numeric field (minus the string x-field) renders as its own line/area/bar series with index-time axis + label tick formatter. Fixed cleanup bug (old `chart.remove()` never ran — returned from a `.then` callback). Auto-heal + Retry.
- **E5 — Sankey flow (`data-flow-and-visualization-b4`)**: old code emitted `sankey-beta\nA -->|v| B` with JSON.stringify quotes + pipe labels — that syntax hangs mermaid. Now emits mermaid sankey syntax `A --> B : 10`. Singleton init + timeout + auto-heal; error panel shows the REAL generated source.
- **E7 — Code block double-highlight corruption (`parser-internals-b3`)**: `highlightCode` re-scanned its own inserted `<span>` HTML (`class="text-emerald-400">400"</span>` corruption). Rewritten as ONE regex pass over escaped source only (strings → comments → numbers → keywords precedence). Verified: no span-inside-span.
- **E8 — Widget iframe empty (`parser-internals-b4`)**: stale-build artifact; hardened `WidgetHost` with per-block remount key + one-shot retry button + error reset on content change.
- **E9 — `:::illustration` without space parsed as prose (`meta-and-testing-b3`)**: directive regex now `^:{3,}(?:\s+)?(\w+)` — space after `:::` is optional (open + nested-depth detection), bare `:::` still closes. Verified by parsing `lesson.txt` end-to-end: 1 illustration block (was 3 prose blocks), all 9 block types present, finchart `data.values` = 3 rows.

## Also Changed

- **PendingIllustrationsPanel**: user requirement — EVERY illustration card (pending AND done) now shows prompt + Copy + Upload/Replace input; done items also show the image preview. (Old done-section was a bare navigate row with no prompt/copy/upload.)

## Verification Status

- `npx tsc -p tsconfig.app.json`: only pre-existing `aiAgentService.test.ts` errors — zero in changed files.
- `npx vite build`: OK (52s), tabulator CSS in `dist/assets/index.*.css` (3 rules), `#root`/`df-fallback`/module script intact.
- dist-electron/services/learn/{index,validator/validate}.js recompiled via esbuild (MEMORY invariant — rebuild-main.mjs doesn't rebuild service files).
- `node scripts/rebuild-main.mjs`: OK.
- Parser sandbox test: bundle → parse `lesson.txt` → block-type counts match expected (ill=1, chart=1, flow=1, finchart=1, table=2, mermaid=1, code=1, widget=1).
- **Runtime: NOT LAUNCHED** — needs CZ to relaunch the app and re-read the lesson.

## Next Action

CZ relaunches RHEO (fully close + relaunch — new bundle has new hashes) → re-open `testing-the-lyceum-parser` → confirm each of the 9 blocks renders (table styled, mermaid renders, charts render, code single-highlighted, illustration parses) → report back for round-02 if anything is still off.
