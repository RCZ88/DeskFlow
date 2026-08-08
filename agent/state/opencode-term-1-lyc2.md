<!-- SESSION: opencode-term-1-lyc2 -->
<!-- AGENT: opencode | TERMINAL: term-1 | PROJECT: C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker -->

# Agent State — opencode-term-1-lyc2

> **STATUS:** completed | **UPDATED:** 2026-08-08T14:30:00.000Z

---

## CURRENT CYCLE (3)
**ROLE:** Hands & Eyes — Lyceum Learn 9-renderer-bug fix round (errorsfound.md): mermaid/table/chart/finchart/flow/code/widget/parser/illustrations panel
**STATUS:** completed (all 9 fixes shipped; build gates green; runtime NOT LAUNCHED)

**IN FLIGHT:**
- (none)

**COMPLETED:**
- E1/E6 TableBlock rewrite: imports tabulator.min.css + tabulator_site_dark.min.css (v6 themes are CSS-only, `theme:'dark'` option silently ignored → was the unstyled-stack + no-pagination bug), auto-heal via isDynamicImportFailure→autoHealDynamicImport, plain-HTML fallback table inside error `<details>`
- E2 mermaid infinite spinner: NEW shared `blocks/mermaidLoader.ts` — initialize EXACTLY ONCE per session (v11.16 hangs later renders if re-initialized per-render) + 15s render timeout with readable error
- E3 ChartBlock rewrite: auto-heal on dynamic import catch (old .catch swallowed the error so the global self-heal never fired), container cleared between renders, Retry button + spec display
- E4 FinChartBlock rewrite: `extractData()` pulls from vega-lite `spec.data.values` (parser stores FULL spec — old code expected top-level array → "No data series found"), mark detection line/bar/area, multi-series, tick labels, cleanup fixed (chart.remove now runs), auto-heal + Retry
- E5 FlowBlock sankey: emits `A --> B : 10` (JSON.stringify quotes + |value| labels hang mermaid sankey-beta), error panel shows edgesToMermaid(block) — the REAL rendered source, not block.spec
- E7 CodeBlock single-pass highlight: one regex alternation over escaped source only (strings→comments→numbers→keywords) — spans can never be re-tokenized (`class="text-emerald-400">400"</span>` corruption gone)
- E8 WidgetHost: per-block remount `key={block.id}-{retry}`, error reset on content change, Retry button
- E9 parser directive regex `^:{3,}(?:\s+)?(\w+)` — `:::illustration` (no space) now parses as an open directive; bare `:::` closes; 4+ colons always close
- PendingIllustrationsPanel: EVERY illustration card (pending AND done) shows prompt + Copy + Upload/Replace input; done items get image preview (white bg for file:// images)
- VERIFY: node regex/parse/highlight harnesses all green (parse of real lesson.txt = 3 nodes, ill=1 chart=1 flow=1 finchart=1 table=2 mermaid=1 code=1 widget=1 prose=5; ILL prompt extracted; FIN data.values=3); tsc no new errors; vite build OK (tabulator CSS in bundle, tabulator chunk present); dist-electron/services/learn recompiled via esbuild; rebuild-main.mjs OK; dist/index.html root+fallback+module script intact
- round-01.md written (agent/docs/lyceum-featurefix-08082026/conversation/); PROBLEMS.md P1-P9 section added (AI Attempted Fix ×9); MEMORY.md block-runtime rules + directive syntax lessons appended

**NEXT ACTION:** CZ relaunches app (FULL close — new bundle hashes) → open testing-the-lyceum-parser → verify all 9 blocks render (styled table, mermaid renders once, charts with data, single-highlighted code, illustration block, done-illustration cards with prompt/copy) → report back for round-02 if anything is off. Then: commits (6 logical units), zip-src, author-guide/master-prompt sync.

**NOTES:** Runtime NOT LAUNCHED per testing rule (no debug port on running app; never launch manually). This cycle continues lyc2 (same terminal, same relay round); spoke kept per Hub protocol.

---

## HISTORY (previous 2 cycles, oldest first)

### Cycle 2 — 2026-08-08
**ROLE:** Hands & Eyes — Lyceum Learn fix round: mermaid infinite loading, prereq validation, prompt/parser alignment, naming cleanup, hierarchy VISUALIZATION
**STATUS:** completed (all build gates green, runtime NOT LAUNCHED)
**IN FLIGHT:**
- (none)

**COMPLETED:**
- L4 mermaid: MermaidBlock/FlowBlock `.catch` on `import('mermaid')`, `mermaid.default || mermaid` for 11.x, unique per-render ids (`-${Date.now()}`), `logLevel:'error'`, error UI with collapsible source `<details>`
- L5 prereq: learn:validate/generateLdoc/ImportService pass `publishedIds` (SELECT id FROM learn_nodes); checkPrereqIds sample-valid-ID errors; checkVisual = parser's exact 19-type VISUAL_TYPES; dist-electron/services/learn/* recompiled via esbuild (rebuild-main.mjs does NOT rebuild services — root cause of "still failing" after source fix)
- L6 prompt/parser contract v4.0: author-guide.md + master-prompt.md rewritten (# H1 nodes, `::: kind`/bare `:::`, know: ends `[source_id]`, ≥4 block variety, no-placeholder code rules); parser: know: regex tolerates trailing `[.!?,;:]`, explain|explanation alias, question:/Q: prefix strip
- L8 shortcut: `?` modal opens from any Learn view (gate removed)
- L7 hierarchy visualization (THE user demand): NEW HierarchyGuide.tsx (tree lines, per-level colored cards, real Observer Pattern example + node mastery badges) WIRED into LearnHome (replaces text strip) + OnboardingPanel step 1 (showHeader prop) — this cycle
- Profile panel expand/collapse toggle (w-80 → max-w-2xl), prior knowledge = user lesson titles w/ readable level labels; LearnerSetup Q8 user-lesson parts
- BlockRenderer per-block LDOC source toggle (FileCode2 hover); OnboardingPanel 4-step rewrite; LearnHome hierarchy strip; MASTERY_LABELS/MASTERY_SHORT in types.ts; Part→Topic + Chapter→Group label renames (LessonLibrary, LessonDetailModal, CreateLessonDialog, ChapterGroupsModal)
- /learn route wrapped in ErrorBoundary in App.tsx (error page parity)
- GATES: vite build OK (index.fsp3bC-2.js 13.5MB, 1m16s), preload.cjs 98,481B, main.cjs 1,300,224B, dist/index.html #root + module script + df-fallback + __DESKFLOW_LOADED all present, HierarchyGuide verified inside bundle
- PROBLEMS.md L4-L9 section added; MEMORY.md durable lessons appended; spoke created

**NEXT ACTION:** CZ relaunches app (FULL close — renderer+main+services all changed) → verify: hierarchy visual tree on Learn home + onboarding step 1, mermaid diagrams render (or error UI instead of infinite spinner), prereq cross-lesson validation passes, new lesson generation produces varied clean .lmd, shortcut toggle from any view, profile panel expand, per-block source toggle, error page on broken route

**NOTES:** Runtime NOT LAUNCHED per testing rule (no debug port on running app; never launch manually). HierarchyGuide was created earlier but never imported — that was the unfulfilled request; now wired in both spots.
