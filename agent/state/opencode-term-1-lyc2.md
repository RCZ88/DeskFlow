<!-- SESSION: opencode-term-1-lyc2 -->
<!-- AGENT: opencode | TERMINAL: term-1 | PROJECT: C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker -->

# Agent State — opencode-term-1-lyc2

> **STATUS:** completed | **UPDATED:** 2026-08-09T04:10:00.000Z

---

## CURRENT CYCLE (5)
**ROLE:** Hands & Eyes — round-02: root-caused + fixed 3 CZ-verified renderer failures (CSP unsafe-eval, finchart v5 API, sankey CSV grammar) + latent insertNode re-import crash; illustration = stale stored lesson (re-import path)
**STATUS:** completed (fixes on disk, all build gates green; runtime NOT LAUNCHED — RHEO runs without debug port)

**IN FLIGHT:**
- (none — code complete; awaiting CZ relaunch + re-import; commit follows)

**COMPLETED:**
- CZ runtime feedback (cycle-4 close): E1/E7/E8 WORKS; broken = chart CSP error (`'unsafe-eval' is not an allowed source of script`), finchart `addLineSeries is not a function`, sankey `Parse error on line 2 … Expecting 'COMMA', got 'NEWLINE'`, illustration still missing
- E3 CSP: ROOT CAUSE = CSP injected by Electron at main.ts:19414 onHeadersReceived (index.html has NO CSP tag); script-src `'self' 'unsafe-inline'` lacked `'unsafe-eval'` which vega-lite needs (compiles expressions via new Function) → FIXED: 'unsafe-eval' added. main.cjs rebuilt (1282 KB)
- E4 FinChart: lightweight-charts is v5.2.0 — addLineSeries/addAreaSeries/addHistogramSeries/addCandlestickSeries REMOVED → FIXED: `chart.addSeries(lwc.LineSeries/AreaSeries/HistogramSeries/CandlestickSeries, opts)` (named exports verified; ESM-only)
- E5 sankey: mermaid 11.16 sankey grammar is CSV (RFC 4180): header `sankey-beta`, one `source,target,value` row per link — `A --> B : 10` NEVER parses (empirically reproduced EVERY variant in node; upstream jison grammar confirms). FIXED: FlowBlock.edgesToMermaid emits CSV with RFC4180 quoting. ⚠ CORRECTS round-01 P5's wrong `A --> B : 10` claim
- E9 illustration: ROOT CAUSE = STALE STORED LESSON, not a code bug — byte-scanned %APPDATA%\RHEO\deskflow-data.db (122 MB, FileShare.ReadWrite open) → ZERO `"type":"illustration"` blocks anywhere (prose 274/leaf 145/quiz 103/code 95/mermaid 47…); current parser DOES emit 1 illustration block from lesson.txt (3 nodes/20 blocks/15 types). FIX PATH = user re-imports lesson.txt (Learn → Import → paste → Validate & Import; learnImportLdoc upserts changed nodes)
- LATENT: repo.insertNode was plain INSERT → re-importing a CHANGED lesson throws UNIQUE constraint + rolls back whole import → FIXED: `ON CONFLICT(id) DO UPDATE` (deliberately NOT INSERT OR REPLACE — learn_progress FK ON DELETE CASCADE would wipe progress). repo.js/index.js/validate.js recompiled per-file (NO --bundle)
- GATES: vite build OK (index.CxJVfkRs.js 13.5 MB), rebuild-main.mjs OK (4.44s), tsc clean (only pre-existing aiAgentService.test.ts errors), dist/index.html #root + df-fallback + hashed entry verified
- DOCS: conversation/round-02.md written; PROBLEMS.md new R1–R5 section + P5 superseded note (total 145); MEMORY.md CORRECTED the wrong 08-08 sankey rule + added CSP/lwc-v5/insertNode/DB-scan lessons

**NEXT ACTION:** CZ FULLY closes RHEO + relaunches (new bundle + main.cjs) → verify: chart block renders (no CSP error), finchart line chart renders, sankey diagram renders → re-import lesson.txt (Learn → Import → paste → Validate & Import) → illustration card appears in Meta & Testing node → report any remaining error verbatim

**NOTES:** NOT LAUNCHED per testing rule (running RHEO has no --remote-debugging-port; Probe cannot attach; never launch manually). electron.exe PIDs on this machine = unrelated YAP-A-TrON app, untouched. Git: my 4 source files + docs + other sessions' uncommitted work → single exhaustive accumulated commit + push after this spoke.

---

## HISTORY (previous 2 cycles, oldest first)

### Cycle 4 — 2026-08-08
**ROLE:** Hands & Eyes — ROOT-CAUSED the all-`learn:*` "No handler registered" runtime failure + fixed dist learn services
**STATUS:** completed (fix on disk; app must be relaunched by CZ)
**IN FLIGHT:**
- (none)
**COMPLETED:**
- ROOT CAUSE: manual recompile of dist-electron/services/learn/index.js used `esbuild --bundle` → inlined runMigration's `path.join(__dirname,'migrations')` resolved to bundle dir → ENOENT → registerLearnHandlers threw → ZERO handlers
- FIX: recompiled per-file WITHOUT --bundle (index.ts, validator/validate.ts, parseLessonMarkdown.ts) exactly like build.mjs Step 3; verified sibling requires, migrations (7 .sql), schema, main.cjs external-require intact
- PROBLEMS.md P10 section; MEMORY.md corrected the --bundle lesson
**NEXT ACTION:** CZ relaunch → `[DeskFlow] ✅ Lyceum Learn module registered` → verify 9 renderer fixes on testing-the-lyceum-parser
**NOTES:** Per-file esbuild for dist-electron/services/learn/* — NEVER --bundle.

### Cycle 2 — 2026-08-08
**ROLE:** Hands & Eyes — Lyceum Learn fix round: mermaid infinite loading, prereq validation, prompt/parser alignment, naming cleanup, hierarchy VISUALIZATION
**STATUS:** completed (all build gates green, runtime NOT LAUNCHED)
**IN FLIGHT:**
- (none)
**COMPLETED:**
- L4 mermaid: .catch + `mermaid.default || mermaid` + unique per-render ids + logLevel:'error' + error UI with source `<details>`
- L5 prereq: publishedIds passed to validateFull; checkVisual = exact 19-type VISUAL_TYPES; sample-valid-ID errors
- L6 prompt/parser contract v4.0 (author-guide.md + master-prompt.md); know: trailing punctuation, explain alias, question:/Q: strip
- L8 `?` shortcuts modal from any Learn view; L7 HierarchyGuide.tsx (tree + per-level colored cards + Observer Pattern example) wired into LearnHome + OnboardingPanel step 1
- Profile panel expand/collapse, per-block LDOC source toggle, Part→Topic + Chapter→Group renames, MASTERY_LABELS, /learn ErrorBoundary
- GATES: vite build OK (index.fsp3bC-2.js), preload.cjs 98,481B, main.cjs 1,300,224B, dist/index.html checks pass
**NEXT ACTION:** CZ relaunch → verify hierarchy tree, mermaid render (or error UI), prereq validation, prompt variety, shortcuts, profile expand, per-block source toggle
**NOTES:** Runtime NOT LAUNCHED (no debug port; never launch manually). HierarchyGuide existed but was never imported — now wired in both spots.
