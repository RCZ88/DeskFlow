# 📝 Build/Launch Pipeline Fix — High-Fidelity Design Prompt

## Raw Request

> "WHERES THE PROMTP U FUCKGIN IDIOTTT I SAID TO USE HT SKILL UFCKASS IDIOT"
>
> (Preceded by: "GEENRATE PROMPT SKILL IDIOT / GENERATE PROMPT SIKLL IDIOTTT")
>
> (Preceded by: "What did we do so far?")
>
> Context: User made extensive edits to 7+ AiPage source files (DailyDigestBoard, FocusBoard, ConnectorsPanel, AiProviderSelectModal, ReflectFeed, ChatPanel, AICityscape). Changes were verified to compile into `dist/assets/index.js` via `npx vite build`. But when the user runs the app via `./start-dev.ps1`, NONE of the changes appear. The user is extremely frustrated because code IS in the bundle but does NOT render.

## Problem Statement

The build/launch pipeline has a fundamental reliability bug: **source file changes do not reliably trigger a rebuild**. The script `start-dev.ps1` checks only whether dist files EXIST — not whether they're STALE. If `dist/assets/index.js` already exists from a previous build, no rebuild happens regardless of how many source files were changed. Additionally, Electron caches aggressively when filenames lack content hashes (`assets/[name].js` instead of `assets/[name].[hash].js`). The user edits code, runs `./start-dev.ps1`, sees zero changes, and gets rightfully furious.

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` (same directory) for verbatim source code of:
- `start-dev.ps1` — the startup script (152 lines)
- `vite.config.ts` — build configuration (40 lines)
- `scripts/build.mjs` — full build pipeline (183 lines)
- `main.ts` loading logic — `startProdServer`, `did-fail-load` handler (lines 3771-3832)
- `index.html` — entry HTML with fallback overlay (56 lines)
- Known failure modes from AGENTS.md §8

## Engineering Task

Design and specify a solution for the following bugs:

### Bug #1: Missing staleness detection in start-dev.ps1
**Current behavior**: `start-dev.ps1` lines 104-116 check only file EXISTENCE (`Test-Path -PathType Leaf`). If `dist/assets/index.js` exists from any previous build, no rebuild occurs.

**Required**: Design a staleness detection mechanism that compares source file timestamps (e.g., `src/pages/AiPage.tsx`, `src/**/*.tsx`, `src/**/*.ts`) against output file timestamps (`dist/assets/index.js`, `dist-electron/preload.cjs`, `dist-electron/main.cjs`). If ANY source file is newer than its corresponding output, a rebuild must be triggered. Include:
- Which files/directories to watch
- How to efficiently check timestamps (recursive directory scan? individual files? git diff?)
- Should this be in PowerShell or delegated to a Node.js script?
- Performance considerations for a 500+ file project

### Bug #2: No content-hash filenames → Electron cache staleness
**Current behavior**: `vite.config.ts` lines 23-24 use `assets/[name].js` with no content hash. Electron loads `index.js` by URL from the production HTTP server. If the server still runs (e.g., from a previous Electron instance that wasn't fully killed), it serves the OLD `index.js` even though the file on disk has been rebuilt.

**Required**: Specify whether to:
- (A) Switch to `[name].[hash].js` for cache-busting (requires updating `index.html` path references)
- (B) Kill any lingering HTTP servers on startup (port conflict resolution)
- (C) Add a query parameter (`?v=<timestamp>`) to the load URL
- (D) Force a renderer reload after window loads
- Include trade-offs, implementation complexity, and side effects for each option

### Bug #3: did-fail-load handler registered too late
**Current behavior**: `main.ts` lines 3806-3829 — the `did-fail-load` handler is attached AFTER `mainWindow.loadURL()`. The `loadAttempts` and `prodServerStarted` variables are initialized after the first load call. There's a race condition where:
- The initial load succeeds but serves stale content
- The stale content is never detected
- No retry/fresh-load mechanism fires

**Required**: Design a mechanism to ensure fresh content is always loaded. Options include:
- Register `did-fail-load` BEFORE `loadURL()`
- Add a `did-finish-load` check that verifies the loaded content hash matches the file on disk
- Force a reload after a short delay (post-mount refresh)
- Make the production HTTP server set `Cache-Control: no-cache` headers

### Bug #4: EPIPE kills the main process
**Current behavior**: `startProdServer` uses `console.log()` which writes to `process.stdout`. When the parent terminal closes (user closes PowerShell window), the stdout pipe breaks, throwing an `EPIPE` error. If uncaught, this kills the ENTIRE Electron main process → BrowserWindow disappears → user sees a black/frozen screen.

**Required**: Design a robust EPIPE handling strategy:
- `process.stdout.on('error', () => {})` to silently swallow EPIPE
- `process.on('uncaughtException', ...)` as a catch-all
- Should these be registered globally or scoped to the HTTP server handler?
- Should the HTTP server use a dedicated logger instead of `console.log`?

## Design Task — High-Fidelity Visual Specs

Design the **rebuild status indicator** for the shell. When `start-dev.ps1` runs:

1. Show a clear summary of what was checked and whether a rebuild was needed:
   ```
   [build] Checking staleness... 147 source files vs 4 output files
   [build] 🔴 STALE: src/pages/AiPage.tsx (12:34) > dist/assets/index.js (11:20)
   [build] Rebuilding renderer...
   ```
   OR
   ```
   [build] ✅ All 147 source files are older than outputs. Skipping rebuild.
   ```

2. Show clearly when `-Build` was passed (forced rebuild):
   ```
   [build] Force rebuild (-Build flag set)
   ```

3. If the HTTP server port is already in use from a previous run, show:
   ```
   [build] ⚠ Port XXXX in use — killing stale server
   ```

4. After Electron launches, a brief console line confirming the loaded bundle:
   ```
   [app] Loaded dist/assets/index.js (2.3 MB, built 12:34:56)
   ```

## UX Task — Interaction Flow

### For developers (you, the user):
1. Edit a source file (e.g., `src/pages/AiPage.tsx`)
2. Run `./start-dev.ps1` (or pass `-Build`)
3. See clear output about whether rebuild happened and why
4. App opens with NEW code, not stale

### For debugging cache issues:
1. App opens but shows old UI
2. User presses F12 to open DevTools → sees expected HTML from new code is missing
3. User can click a button or run an IPC command to force-refresh the renderer
4. Provide a keyboard shortcut (Ctrl+Shift+R) that reloads from a fresh HTTP request

## Constraints

1. Must work on Windows (PowerShell 5.1) — no bash-specific solutions
2. Must not significantly increase startup time (< 2 seconds overhead for staleness check)
3. Must not require installing new npm dependencies
4. The `dist/` directory is in `.gitignore` — don't change that
5. Preload (`preload.cjs`) and main (`main.cjs`) have their own build steps — staleness check should cover all three (renderer, preload, main)
6. `npx electron .` must always be the final step — never "build but don't launch"
7. Must handle the case where `node_modules` doesn't exist (fresh clone) — then always build

## Output Format

Return a `RESULT.md` with:
1. **Phase 1: Fix Spec** — Exact changes to `start-dev.ps1`, `vite.config.ts`, `scripts/build.mjs`, and/or `scripts/rebuild-main.mjs`. Include line numbers referencing CONTEXT_BUNDLE.md. Every fix must be a drop-in code change.
2. **Phase 2: Staleness Detection Algorithm** — Pseudocode or actual PowerShell/Node.js code for the timestamp comparison. Include what files to scan, how to group source→output mappings, and the comparison logic.
3. **Phase 3: Cache-Busting Strategy** — Chosen approach from options A-D in Bug #2, with full implementation.
4. **Phase 4: did-fail-load Handler Fix** — The corrected event registration order and any additional verification logic.
5. **Phase 5: EPIPE Handling** — The exact error handler code and where to place it.
6. **Phase 6: User-Facing Output Spec** — Exact text output for each scenario (up-to-date, stale, forced rebuild, stale server, errors).

## Rules for the Target AI

- You are the **Lead Engineer and Designer**. Own the solution from logic to UX.
- Do NOT present Options A/B/C. Design the single best solution.
- Read `CONTEXT_BUNDLE.md` in full before designing. It has the actual source code.
- Every code change must reference the exact file and line number it modifies.
- Cover error states: what happens when the staleness check fails, when ports are in use, when Electron crashes, when `npx electron` is not found.
- If your solution requires adding a new file, specify its exact path relative to project root.
