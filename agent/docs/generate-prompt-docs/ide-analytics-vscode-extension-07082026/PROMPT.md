# PROMPT — IDE Analytics Overhaul + DeskFlow VS Code Activity Extension

## Raw Request (VERBATIM — do not paraphrase, do not drop any clause)

> **User:** "The IDE Projects page (`/ide`) is ugly: the Overview tab is a useless wall of navigate-away cards, and the analytics charts need a full overhaul with one consistent style. Also, the code stats don't actually work — I want to see real line/file change data per project, not empty charts. I want a **DeskFlow VS Code extension** that captures code activity live (files opened, lines added/removed, time coding) and reports it to the app. And I want clear instructions on how to install/configure that extension."

**Confirmed scope (user answered 3 questions — binding):**
1. Scope: YES — fix ugly IDE overview + analytics charts AND make code stats show line/file changes AND add the VS Code extension.
2. Data source: **Option B — VS Code extension ONLY.** Live activity reporting from the extension. Do NOT extend the git-sync pipeline for retroactive file-level history.
3. Redesign scope: **The WHOLE analytics experience** — Overview tab + full Analytics tab, all charts re-skinned, one consistent style.

**Deferred / OUT of scope (do not touch):** changing `sync-commits` behavior; per-file history backfill from git; other IDE integrations (Cursor is treated as "AI tool" today, not the code-activity source); all other app pages (Dashboard, Finance, Terminal, External, etc.); the tracking engine.

## Audience

You are the **Lead Designer and Engineer**. You are a senior frontend + Electron-backend engineer working in a DARK, glass-morphism Electron + React 18 + TypeScript + Vite + Tailwind + framer-motion + Chart.js + lucide-react + better-sqlite3 desktop app ("DeskFlow" / App Tracker).

**You do NOT have repository access. You do NOT have skill files.** The attached `CONTEXT_BUNDLE.md` (read it in FULL before designing — it is 1,341 lines of verbatim source) IS your codebase. Work only against the code embedded there. Do not invent APIs that are not listed. Preserve CRLF line endings. Do not reformat untouched code. Do not add comments to code unless the task asks.

## Your Task — ONE RESPONSE, NO QUESTIONS

Produce a single, complete, well-reasoned solution: **`RESULT.md`** — the full design specification, file-by-file implementation plan, and backend audit — in your FIRST and ONLY response.

**Do not ask clarifying questions. Do not request more context.** Everything you need is in this prompt + `CONTEXT_BUNDLE.md`. If you find a gap (see the Known Gaps list below), make a reasonable assumption, mark it clearly as `> ASSUMPTION:` in RESULT.md, and continue. Flag every assumption in the Backend Audit section.

## What to build (high level, in priority order)

1. **Redesign the `/ide` Overview tab** — replace the "useless wall of navigate-away cards" (4 clickable metric cards → AI & Projects Row → Recent Activity) with a real analytics-first Overview: data processed and showcased, not navigation tiles. The "Last Backup — / Not configured" placeholder card is fake — remove or repurpose it (flag what you do).
2. **Full overhaul of the Analytics tab** — redesign `AnalyticsDashboard.tsx` (the entire 810-line component is in §4.7): ONE consistent style across all charts/cards, keep the `variant` prop contract ('project' | 'workspace' | 'full') and the full props contract (see Key facts).
3. **Real code stats, live** — design the **DeskFlow VS Code extension** that captures code activity live (files opened, lines added/removed, coding time) and reports it to the app, PLUS the complete backend it needs: new HTTP endpoint(s) on the local capture server (port 54321, mirror the browser-extension pattern in §4.9), new DB table(s) (e.g. `code_activity` / `file_changes` — you design the schema), new IPC + preload methods if the renderer needs them.
4. **Install/configure instructions** — clear, numbered instructions for the user to install/configure the extension (part of RESULT.md).

**⚠️ CRITICAL DATA FACT:** the `commits` table stores ONLY per-commit AGGREGATES (additions/deletions/files_changed). There is NO per-file table anywhere. `sync-commits` parses `git show --numstat` per file but DISCARDS per-file rows. "Top files changed", "per-file lines", "files opened" are IMPOSSIBLE with current data → they MUST come from the new VS Code extension's live capture. Do not design any chart/stat that requires per-file data sourced from git history.

## Key facts you must respect (from the bundle)

- **Project:** App Tracker (DeskFlow). `src/main.ts` is ~29,800 lines, compiled to `dist-electron/main.cjs`. Preload bridge `window.deskflowAPI` (contextIsolation ON). DB: SQLite at `%APPDATA%\RHEO\deskflow-data.db` (LIVE data is under RHEO, not DeskFlow).
- **IDE page has 6 tabs:** overview / environment / ai / git / analytics / backup. Analytics tab renders `<AnalyticsDashboard variant="workspace" />`.
- **AnalyticsDashboard props contract (must stay):** `aiUsage` (with `byTool`), `sessions`, `problems`, `requests`, `promptHistory`, `codeStats` (`CodeStats` shape), `dailyStats`, `appStats`, `projectLanguages`, `period`, `variant` ('project' | 'workspace' | 'full').
- **The VS Code extension must mirror the browser-extension pattern** (MV3 service worker, `chrome.alarms` NOT setInterval, storage persistence, health check before send, silent retry, min-session threshold). Specify exact route names, payload shapes, validation, and insertion point in the server handler.
- **The code-activity backend does NOT exist yet — you are designing it** (endpoint, table, IPC/preload if needed). This is a required part of RESULT.md, not a flag.

---

# PART 0 — HARD INVARIANTS (never violate)

- **Glass aesthetic only.** Cards are `bg-zinc-900/60` + `backdrop-blur-xl` + `rounded-xl` + `border-white/10` (hover `border-white/20`, selected `border-white/25`). NEVER the opaque near-black `#18181b` card base. Max `rounded-xl`, `p-5` padding. Dark mode only. Fonts: Geist + JetBrains Mono.
- **Charts: Chart.js ONLY.** The app already uses Chart.js + chart.js/helpers. No new charting library without justification (and then only if it is already in package.json — it is not).
- **All 4 states mandatory:** every redesigned section must specify empty / loading / error / populated states.
- **All existing IPC / data flow stays.** Renderer-only changes must not break existing handlers. New backend work must follow the ONE canonical IPC flow in §3 of the bundle.
- **Agent DB access is READ-ONLY** — the extension's writes go through the app's own local HTTP server (port 54321) / IPC when the user acts. Design the server as the single write path.
- **Build pipeline (verify in your plan):** `npx vite build` → `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs` → `node scripts/rebuild-main.mjs`. Must exit 0. Verify `dist/index.html` has `<div id="root">` + module script + `#df-fallback` block, and hashed `assets/index.<hash>.js` exists and is > 10 KB (black screen is the #1 regression).
- **Icons:** use `LoaderCircle` / `Globe` / `Earth` (NOT `Loader2` / `Globe2` — those are runtime-only aliases missing from lucide-react.d.ts; `tsc` errors on them).
- **Never delete existing functionality silently.** If the design removes the metric cards / backup card / any existing UI, list it explicitly as "REMOVALS" in RESULT.md with justification.

---

# PART 1 — FRONTEND SKILLS + MCP INVENTORY (mandatory — USE THEM, don't just mention them)

Apply these design skills to every component you specify:

1. **Frontend Design** — DeskFlow-specific component patterns, tokens, spacing, typography, glass cards
2. **Human-Centric UX** — empty/loading/error states, progressive disclosure, visual hierarchy, feedback
3. **Impeccable** — 7 design dimensions (typography, color, spatial, motion, interaction, responsive, UX writing), 27 anti-patterns
4. **Motion — Bring the UI Alive** — Liveliness Levels (L1 Composed / L2 Responsive / L3 Expressive), motion taxonomy, recipes
5. **UI UX Pro Max** — industry-specific design rules (dev tools, AI/ML), style library
6. **Design Taste System** — master aggregator, design variance knobs, anti-repetition rules
7. **frontend-external-infra** — source routing, re-skin rules, anti-slop checklist

## MCP component inventory (verified real components — embed these, re-skinned)

| Component | Source | Use for |
|-----------|--------|---------|
| `border-beam` | Magic UI | Animated edge glow on active/highlighted cards (small containers only) |
| `number-ticker` | Magic UI | Animated stat numbers (lines changed, files, hours) |
| `shimmer-button` | Magic UI | Primary CTA on Overview (e.g. "Open Extension Setup") |
| `animated-beam` | Magic UI | Connecting line between project list → activity visual |
| `particles` | Magic UI | Subtle background texture on hero cards (pointer-events-none, low quantity) |
| `GlareHover` | React Bits | Diagonal glare on stat tiles |
| `FadeContent` | React Bits | Entrance animation for sections |
| `card / badge / dialog / tabs / tooltip / skeleton / switch` | shadcn | Standard UI primitives |
| `Code2 / FileCode2 / GitCommitHorizontal / Clock / Activity / BarChart3 / FolderCode` | Lucide | Code-activity icons |

### Anti-Slop Checklist (mandatory after any sourced component)
1. Re-skin to DeskFlow tokens (colors → `--bg-primary`, `--accent-primary`, etc.)
2. Max `rounded-xl`, `p-5` padding
3. Dark mode only
4. Geist + JetBrains Mono fonts
5. Glass layer (`bg-zinc-900/80 backdrop-blur-xl`)
6. Per-component accent = a small fixed palette, never a rainbow; charts share ONE `CHART_COLORS`-style palette (bundle §4.7)
7. No purple-gradient hero clichés, no default fonts, no uniform radius
8. Every icon must come from the list above (Lucide only — never invent names)

---

# PART 2 — REQUIREMENT CHECKLIST (RESULT.md must answer every item)

### A. Data processing pipeline (engineering)
- **A1** New DB schema: exact `CREATE TABLE` for code activity (e.g. `code_activity`, `file_changes`) — every column, type, default, index. One row per file-change event vs aggregated per-save — you decide, justify.
- **A2** New HTTP endpoint(s) on port 54321: exact routes (`POST /code-activity`?), payload shape (JSON example), validation rules (reject unknown files, clamp timestamps), dedupe/idempotency, response codes. Insertion point in the existing server handler (§4.10).
- **A3** New IPC + preload methods if the renderer needs live queries: channel names, request/response types, the canonical flow (§3).
- **A4** Aggregation math: per-project / per-file / per-day lines added/removed, files touched, coding seconds; how totals, averages, and trends are computed; timezone handling; what the extension must capture vs what the server computes.
- **A5** Extension internals: MV3 manifest keys, `chrome.alarms` schedule, batching (buffer file events → flush every N minutes), offline retry with storage persistence, health-check-before-send, min-coding-session threshold, workspace-root detection (multi-root?), file-watch scope (only tracked workspace dirs), privacy (no file contents — metadata only).

### B. Visual spec (high-fidelity)
- **B1** Overview tab redesign: full layout, every section, exact copy, spacing, what each card shows and where its data comes from (which IPC handler), the fake "Last Backup" card resolution.
- **B2** Analytics tab redesign: every chart/card in `AnalyticsDashboard.tsx` re-skinned to one style — chart type, colors (one shared palette), axes, tooltips, legends, empty/loading/error states, `variant` differences (project vs workspace vs full).
- **B3** New code-activity visual(s): how lines changed / files touched / coding time per project are displayed (you pick — chart(s), list, stat row), with data source mapped to the new backend.
- **B4** Motion: entrance, hover, tab-switch transitions (framer-motion), respecting Liveliness Levels.

### C. UX flow (interaction)
- **C1** What happens on click of each new card/chart element.
- **C2** Empty state when the extension hasn't reported anything yet (first install) — including a call-to-action pointing to the install instructions.
- **C3** Loading/error states for the new IPC calls.
- **C4** Extension lifecycle UX: first-run setup (health check passes → "Connected" indicator), what happens when the app is closed (buffer persists), when the extension is disabled.

### D. Deliverables in RESULT.md (final format — follow this structure)
1. **Design Spec** — every deliverable, every state, every component, exact copy, as above.
2. **File-by-file Implementation Plan** — `src/main.ts` (server + schema + handlers, with line anchors to §4 of the bundle), `src/preload.ts`, `src/preload.d.ts`-style type updates if applicable, `IDEProjectsPage.tsx`, `AnalyticsDashboard.tsx`, new extension files (full source for `manifest.json`, `background.js`, `package.json`), README install/configure instructions (numbered steps for the user).
3. **Backend Audit table** — every data source in the design: | Feature | IPC/HTTP channel | Exists? | Service | DB Schema | Status | — flag any row that is NOT real (bundle §5).
4. **ASSUMPTIONS section** — every assumption you made for the Known Gaps below.

---

# PART 3 — KNOWN GAPS (do NOT ask for these — assume + flag)

The following are NOT embedded in CONTEXT_BUNDLE.md. Make reasonable assumptions about them, mark each `> ASSUMPTION:` and list it in the ASSUMPTIONS section:

1. Full Overview-tab JSX beyond the metric cards — the "AI & Projects Row" stacked bar + projects list + Recent Activity (currently summarized in §4.6). Design against the summarized shape; assume standard DeskFlow list/bar components.
2. `ai_usage` / `projects` / `ides` / `tools` table schemas (queries in §4.2 reference `input_tokens`, `output_tokens`, `cost_usd`, `message_count`, `model`, `project_path` — assume these columns).
3. Git-tab handlers internals (`get-commit-history`, `get-contributor-stats`, `get-dora-metrics`, `get-commit-stats`, `get-ai-usage-summary`) — only design against them if the redesign touches the git tab, and keep the tab unchanged otherwise.
4. `loadWorkspaceAnalytics` in IDEProjectsPage — assume it aggregates the existing IPC calls (sessions/problems/requests/promptHistory/codeStats).
5. The full local-server `createServer` handler body — §4.10 shows its shape (CORS + `POST /browser-data` + `/health`); assume that pattern for new routes.
6. `AnalyticsDashboard` `variant === 'full'` render (lines 602-810 summarized in §4.7) — design the full variant consistently with project/workspace variants.

---

# FINAL INSTRUCTIONS

- Respond with ONLY your RESULT.md (single message, complete — no placeholders, no "we'll finalize later").
- Do not produce Options A/B/C. Produce THE solution — one coherent, justified design.
- Do not design for features whose backend doesn't exist without also designing the backend (Rule: frontend spec + backend implementation spec together).
- List every REMOVAL explicitly. Do not silently drop the metric cards or the backup card — justify.
- Every chart must map to a real data source named in the Backend Audit.
