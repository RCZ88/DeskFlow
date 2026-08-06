# Collaboration Request: IDE Analytics Overhaul + DeskFlow VS Code Activity Extension

## Your Role
You are the Specialist AI. I am the Project Owner AI. I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to refine this idea into an implementable specification.

## The Idea (user's verbatim requirement — preserve intent exactly)

> **User:** "The IDE Projects page (`/ide`) is ugly: the Overview tab is a useless wall of navigate-away cards, and the analytics charts need a full overhaul with one consistent style. Also, the code stats don't actually work — I want to see real line/file change data per project, not empty charts. I want a **DeskFlow VS Code extension** that captures code activity live (files opened, lines added/removed, time coding) and reports it to the app. And I want clear instructions on how to install/configure that extension."

**Confirmed scope (user answered 3 questions):**
1. Scope: YES — fix ugly IDE overview + analytics charts AND make code stats show line/file changes AND add the VS Code extension.
2. Data source: **Option B — VS Code extension ONLY.** Live activity reporting from the extension. Do NOT extend the git-sync pipeline for retroactive file-level history.
3. Redesign scope: **The WHOLE analytics experience** — Overview tab + full Analytics tab, all charts re-skinned, one consistent style.

**Deferred / OUT of scope:** changing `sync-commits` behavior; per-file history backfill from git; other IDE integrations (Cursor is treated as "AI tool" today, not the code-activity source).

## Current Context (What I Have)
The complete context bundle is attached in the same folder. Read `CONTEXT_BUNDLE.md` in full (1341 lines) — everything relevant is embedded VERBATIM, section by section:

- **§1 Project Overview** — stack (Electron + React 18 + Vite + Tailwind dark zinc + framer-motion + Chart.js + lucide-react + better-sqlite3), the files that matter, live DB location.
- **§2 The Feature** — the request + confirmed scope above.
- **§3 Architecture & Conventions** — the ONE canonical IPC flow, DB access pattern, the local capture server pattern (port 54321, `POST /browser-data`, `GET /health`) that the VS Code extension must mirror.
- **§4 Verbatim Source** — commits/ai_attribution/dora_metrics schema; `get-ide-projects-overview` (excerpt); `get-code-change-stats` (full); `sync-commits` (full); preload API surface; IDEProjectsPage state/loaders/Overview-tab metric-cards/Analytics-tab JSX; **AnalyticsDashboard.tsx FULL 810 lines** (the component to redesign, incl. `StatCard`/`ChartCard`/`CodeChanges`/`crosshairPlugin`/`CHART_COLORS` and the `project`/`workspace` variants — `full` variant summarized); design tokens; the browser-extension manifest + background.js head + README; local server bootstrap notes.
- **§5 Hard Invariants** — build pipeline, CRLF, READ-ONLY agent DB access, Chart.js-only, UI re-skin rules, mandatory empty/loading/error states.

Key facts you must respect:
- **Project:** App Tracker (DeskFlow) — Electron + React 18 + TypeScript + Vite. `src/main.ts` is ~29,800 lines, compiled to `dist-electron/main.cjs`. Preload bridge `window.deskflowAPI` (contextIsolation ON). DB: SQLite at `%APPDATA%\RHEO\deskflow-data.db` (LIVE data is under RHEO, not DeskFlow — agent DB access is STRICTLY READ-ONLY).
- **The IDE page has 6 tabs:** overview / environment / ai / git / analytics / backup. Overview currently = 4 clickable metric cards (Environment, AI Usage, Commits, Last Backup — the last is a FAKE "— / Not configured" placeholder) → "AI & Projects Row" (30-day stacked AI tokens bar + projects list) → Recent Activity. Analytics tab renders `<AnalyticsDashboard variant="workspace" />`.
- **⚠️ CRITICAL DATA FACT:** the `commits` table stores ONLY per-commit AGGREGATES (additions/deletions/files_changed). There is NO per-file table. `sync-commits` parses `git show --numstat` per file but DISCARDS per-file rows. "Top files changed", "per-file lines", "files opened" are IMPOSSIBLE with current data → they must come from the new VS Code extension's live capture (new table(s) you propose in RESULT.md, e.g. `code_activity` / `file_changes`).
- **The VS Code extension should mirror the browser-extension pattern** (MV3 service worker, `chrome.alarms` not setInterval, storage persistence, health check before send, silent retry, min-session threshold). If you choose new HTTP endpoints on port 54321, you must specify exact route names, payload shape, validation, and insertion point in the server handler.
- **AnalyticsDashboard props contract** (must stay): `aiUsage` (with `byTool`), `sessions`, `problems`, `requests`, `promptHistory`, `codeStats` (`CodeStats` shape), `dailyStats`, `appStats`, `projectLanguages`, `period`, `variant` ('project' | 'workspace' | 'full').

## Context Gaps (What I Don't Have Yet)
- If you need the full Overview tab JSX beyond the metric cards (the "AI & Projects Row" stacked bar chart + projects list + Recent Activity — currently summarized in §4.6), ask: `REQUEST: src/pages/IDEProjectsPage.tsx (lines 1337-1520)` and I will paste it.
- If you need the `ai_usage` table schema (the queries in §4.2 reference `input_tokens`, `output_tokens`, `cost_usd`, `message_count`, `model`, `project_path` — the CREATE TABLE is NOT embedded), ask: `REQUEST: src/main.ts — ai_usage CREATE TABLE`.
- If you need `projects` / `ides` / `tools` table schemas, ask (only referenced in §4.2, not embedded).
- If the git tab redesign needs the other handlers (`get-commit-history`, `get-contributor-stats`, `get-dora-metrics`, `get-commit-stats`, `get-ai-usage-summary`), REQUEST them by name.
- If you need the `workspaceAnalytics` loader in IDEProjectsPage (how sessions/problems/requests/promptHistory/codeStats get fetched), ask: `REQUEST: src/pages/IDEProjectsPage.tsx — loadWorkspaceAnalytics function`.
- If you need the full local-server `createServer` handler (CORS + `POST /browser-data` validation + exact insertion point for new routes), ask: `REQUEST: src/main.ts — local capture server handler (~17949)`.
- If you need the `variant === 'full'` render of AnalyticsDashboard (lines 602-810, currently summarized in §4.7), ask and I will paste it.

## Conversation Protocol
**How we communicate:**

1. **You ask specific questions.** Format: `REQUEST: [specific file, schema, or clarification]`
2. **I fetch and respond.** Format: `CONTEXT: [file path]` + actual source code.
3. **You refine your understanding.** Ask follow-ups or propose a design.
4. **When ready, you produce RESULT.md.** Format follows our standard specification (design spec + file-by-file implementation plan + backend audit).

**Rules:**
- Do NOT assume context you don't have. Ask for it.
- Do NOT design for features whose backend doesn't exist. Flag them. (Note: the code-activity backend does NOT exist yet — YOU are designing it: new HTTP endpoint(s), new table(s), new IPC + preload methods if the renderer needs them.)
- Do NOT produce a monolithic answer in round 1. Iterate with me.
- Start with 3-5 questions about the idea, not a full design.

## Scope
- IN: Redesign of the `/ide` Overview tab + full Analytics tab, one consistent style (keep the `variant` prop contract); real line/file code-change data per project via a NEW DeskFlow VS Code extension (MV3-style, capturing files opened / lines added-removed / coding time); new backend (endpoints, tables, IPC, preload) as you design it; install/configure instructions for the extension; all states (empty/loading/error/populated); motion; responsive behavior.
- OUT: Changes to `sync-commits` behavior. Out: retroactive per-file git backfill. Out: other IDE integrations (Cursor stays an "AI tool"). Out: other app pages (Dashboard, Finance, Terminal, etc.). Out: the tracking engine.
- OUT (hard constraint): You never touch the database directly — all writes happen through the app's own IPC/HTTP server when the user acts.

## Expected Output
After our conversation converges, produce:
1. **RESULT.md** — The complete design specification (every deliverable, every state, every component, exact copy, per the standard generate-prompt RESULT format).
2. **Implementation Plan** — File-by-file changes (main.ts server + schema + handlers, preload.ts, IDEProjectsPage.tsx, AnalyticsDashboard.tsx, new VS Code extension files, README instructions).
3. **Backend Audit** — Any missing IPC/services/DB schemas flagged, with exact proposed schema (CREATE TABLE) and endpoint specs.

## First Question
Start by asking me your first 3-5 clarifying questions about the idea, the current structure, or any context you need. Begin with `REQUEST:` lines where you need specific files.

IMPORTANT: Do not produce the design yet. Round 1 = your questions only.
