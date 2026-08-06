# CONTEXT GAPS — IDE Analytics Overhaul + DeskFlow VS Code Activity Extension

> Gap analysis: what the Specialist has vs. what is missing. Updated after each round.
> **Rule:** every gap the Specialist needs is fetched via `REQUEST:` / `CONTEXT:` exchange.

## Context Gap Table

| Context Needed | Status | Location | How to Obtain |
|----------------|--------|----------|---------------|
| Project overview + stack + files map | ✅ Have | CONTEXT_BUNDLE.md §1 | Embedded |
| Feature spec + confirmed scope (3 answers) | ✅ Have | CONTEXT_BUNDLE.md §2 | Embedded |
| IPC pattern / DB access pattern / local server pattern | ✅ Have | CONTEXT_BUNDLE.md §3 | Embedded |
| commits / ai_attribution / dora_metrics schema | ✅ Have | CONTEXT_BUNDLE.md §4.1 | Embedded verbatim |
| get-ide-projects-overview handler | ✅ Have | CONTEXT_BUNDLE.md §4.2 | Embedded (model-breakdown portion truncated) |
| get-code-change-stats handler | ✅ Have | CONTEXT_BUNDLE.md §4.3 | Embedded verbatim |
| sync-commits handler | ✅ Have | CONTEXT_BUNDLE.md §4.4 | Embedded verbatim |
| Preload API surface (AI & Git Metrics, Dashboard Overview, sync, DORA) | ✅ Have | CONTEXT_BUNDLE.md §4.5 | Embedded verbatim |
| IDEProjectsPage state / loaders / Overview metric cards / Analytics tab JSX | ✅ Have | CONTEXT_BUNDLE.md §4.6 | Embedded verbatim |
| AnalyticsDashboard.tsx (StatCard, ChartCard, CodeChanges, project + workspace variants) | ✅ Have | CONTEXT_BUNDLE.md §4.7 | Embedded (810 lines; `full` variant summarized) |
| Design tokens (dark zinc, amber accent, chart palette, fonts) | ✅ Have | CONTEXT_BUNDLE.md §4.8 | Embedded |
| Browser-extension manifest + background.js head + README | ✅ Have | CONTEXT_BUNDLE.md §4.9 | Embedded verbatim |
| Local server bootstrap notes (port 54321, /health, /browser-data) | ✅ Have | CONTEXT_BUNDLE.md §4.10 | Embedded (handler detail → REQUEST) |
| Hard invariants (build, CRLF, read-only DB, Chart.js-only, UI rules) | ✅ Have | CONTEXT_BUNDLE.md §5 | Embedded |
| Full Overview tab JSX ("AI & Projects Row" stacked bar + projects list + Recent Activity) | ⚠️ Partial | IDEProjectsPage.tsx 1337-1520 | `REQUEST: src/pages/IDEProjectsPage.tsx (lines 1337-1520)` |
| AnalyticsDashboard `variant === 'full'` render (lines 602-810) | ⚠️ Partial (summarized) | AnalyticsDashboard.tsx | REQUEST by lines |
| `ai_usage` CREATE TABLE schema | ❌ Missing | src/main.ts (~2150+) | `REQUEST: src/main.ts — ai_usage CREATE TABLE` |
| `projects` / `ides` / `tools` table schemas | ❌ Missing | src/main.ts | REQUEST by name |
| `loadWorkspaceAnalytics` loader (sessions/problems/requests/promptHistory/codeStats fetch) | ❌ Missing | IDEProjectsPage.tsx | `REQUEST: src/pages/IDEProjectsPage.tsx — loadWorkspaceAnalytics function` |
| get-commit-history / get-contributor-stats / get-dora-metrics / get-commit-stats / get-ai-usage-summary handlers | ❌ Missing | src/main.ts | REQUEST by name (needed only if git/ai redesign touches them) |
| Local capture server full handler (CORS, POST /browser-data validation, route insertion point) | ❌ Missing | src/main.ts (~17949) | `REQUEST: src/main.ts — local capture server handler (~17949)` |
| App.tsx route registration for `/ide` | ✅ Have (implicit) | src/App.tsx | Enough for this scope; REQUEST if needed |

## Known Gaps by Design (NOT fetchable)

- **No per-file commit data exists anywhere.** The `commits` table is aggregate-only; `sync-commits` discards per-file rows. Per-file line/file activity MUST come from the new VS Code extension's live capture — this is a NEW table/endpoint the Specialist designs, not something to fetch.
- The tracker/finance/terminal engines — out of scope, not fetched.
- `useJson` legacy JSON-mode stubs — present in every handler; the Specialist must keep the same `useJson` guard pattern in any new handlers.

## Things the Specialist MUST NOT Assume

- Do NOT assume any per-file code data exists today — it does not. Every "top files" / "per-file lines" chart requires the new extension pipeline.
- Do NOT assume a toast/sonner library exists (it doesn't — the app uses hand-rolled fixed divs).
- Do NOT assume radix primitives are installed (base-ui is used for dialog/sheet/slider primitives).
- Do NOT add a new charting dependency — Chart.js + react-chartjs-2 is installed and is the only charting library. (If you genuinely need more, propose it explicitly in RESULT.md with justification.)
- Icons: `Loader2` / `Globe2` are runtime aliases but NOT in lucide-react's type declarations — new code should use `LoaderCircle` / `Globe` / `Earth` to type-check. Everything else used in the embedded components is safe.
- Do NOT assume helpers exist outside what's embedded — ask.
- The live DB is `%APPDATA%\RHEO\deskflow-data.db` (RHEO, not DeskFlow). Agent-side access is read-only; the APP does all writes.
