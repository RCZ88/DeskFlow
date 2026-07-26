## Raw Request

> "generate the prompt about the git clean -fdx mess to fix the build pipeline"

## Problem Statement

A `git clean -fdx` command deleted all untracked files including original `.ts` source files in an Electron + React + Vite project. The surviving `src/main.ts` is a pre-compiled CJS backup (18,292 lines) with mixed main-process and renderer-process code. This is compounded by `electron-vite build` v5.0.0 having a silent Windows bug (exits 0 but never writes output). A custom build script was created using Vite API + esbuild pre-compilation, which compiles successfully, but the runtime behavior (`electron .`) has not been verified. The core engineering challenge is that a main-process service (`AgentHostService.ts`) imports from the corrupted `main.ts` (`import { getAgentConfig } from '../main'`), creating a circular dependency that makes clean bundling impossible.

## Context Bundle Reference

Read `agent/docs/build-fix/CONTEXT_BUNDLE.md` first. It contains:
- Complete dependency graph of `require()` calls in main.ts
- The AgentHostService ↔ main circular dependency
- The build script (scripts/build.mjs) with all 4 steps
- Error messages from 6 previous build attempts
- Package.json config and type conflicts
- Known runtime risks and failure modes

## The Mandate

Design a comprehensive recovery plan and implementation specification for the build pipeline. You are the Lead Engineer — own the entire solution from dependency graph analysis to build system design to file-by-file changes.

### Engineering Task — Dependency Cleanup

1. **Analyze the contamination in main.ts** — Identify every renderer-only code section (lines referencing `window.deskflowAPI`, React, DOM) and determine if they can be safely removed or must be relocated to the renderer process.

2. **Break the circular dependency** — `AgentHostService.ts` imports `getAgentConfig` from `'../main'`. `main.ts` `require()`s `AgentHostService.js`. Options to consider:
   - Extract `getAgentConfig` (and related agent config functions) into a standalone shared module (e.g., `src/services/agentConfig.ts`) that both main.ts and AgentHostService can import without circularity.
   - Keep the function in place but use a lazy import pattern.
   - Move the function entirely into AgentHostService or a new config service.

3. **Design the ideal build pipeline** — Given the constraints:
   - `package.json` has `"type": "module"` (CJS output needs `.cjs` or sub-package)
   - `electron-vite build` is broken on Windows (v5.0.0, do not use)
   - Renderer, preload, and main process each have different module requirements
   - Native modules (`better-sqlite3`, `active-win`, `node-pty`) must be externalized
   - Services should remain as external `require()` calls (not bundled into main.cjs)
   - Windows + PowerShell 5.1 (no `&&` chaining)

4. **Identify orphan renderer code** — Lines 16198-16207 of main.ts contain `window.deskflowAPI?.getData?.()` calls. Determine if this is a leftover backup or actually needed. Design a plan to extract renderer-only code from main.ts.

### Build System Task — Specification

Design the build script (or propose changes to the existing `scripts/build.mjs`) that:

1. Compiles renderer (`vite build`) — unchanged, already works
2. Compiles preload (`vite build --ssr`) — unchanged, already works
3. Pre-compiles all service `.ts` files to individual `.js` (CJS) — currently uses esbuild per-file, propose if this is optimal or if alternatives exist
4. Builds main.ts via Vite library mode with services as external `require()` calls — currently works, but evaluate if the `external` list needs to include `'./services/*'` patterns to prevent Vite from resolving AgentHostService and triggering the circular import
5. Handles the `.cjs` shim files — currently 5 shims for files main.ts requires with `.cjs` extension. Determine if shims are the right approach or if main.ts's require paths should be changed to `.js`
6. Verify output integrity — check that `main.cjs` contains `require('./services/...')` and does NOT contain bundled renderer code

### Architecture Task — Future-Proofing

Propose a structural change plan that prevents this from recurring:

1. **Source recovery**: Can the real `.ts` source files be reconstructed from the compiled CJS backups? If so, design the recovery process.
2. **Clean separation**: Design a layout where main process code never imports renderer code and vice versa. What directory structure enforces this?
3. **git-clean guard**: What should be added to `.gitignore` or git hooks to prevent `git clean -fdx` from destroying essential source files again?
4. **Build verification**: What automated checks should be added to the build script to catch silent failures early?

## Constraints

- **Do NOT use `electron-vite`** — v5.0.0 has a confirmed Windows output bug. Use Vite API directly as the current script does.
- **Do NOT change `package.json` type** — Keep `"type": "module"` at root. CJS output must use `dist-electron/` sub-package with `"type": "commonjs"` or `.cjs` extension.
- **Do NOT suggest git checkout/restore/reset/clean** — The project has a strict rule against destructive git commands (Rule #4 in `problem.md`). Source recovery must be manual reconstruction, not git operations.
- **Windows compatibility** — The build must work on Windows (PowerShell 5.1, cmd.exe). No `&&` chaining, no Unix-only tools.
- **Services must remain unbundled** — Services should be separate files loaded via `require()` at runtime, not bundled into `main.cjs`.

## Output Format

Produce a single `RESULT.md` with these sections:

### Phase 1 — Dependency Analysis & Contamination Map
- Exact list of renderer-only code in main.ts
- Circular dependency chain diagram
- File-by-file dependency audit

### Phase 2 — Refactoring Plan
- Specific functions to extract, move, or delete
- New file paths and module names
- Import/export changes per file
- Step-by-step migration order (what to do first, second, etc.)

### Phase 3 — Build Pipeline Specification
- Complete build script (or diff against current build.mjs)
- `external` list changes
- Verification steps with expected output

### Phase 4 — Recovery Procedure
- How to recover real `.ts` sources from CJS backups
- Testing checklist
- Rollback plan if something goes wrong

### Phase 5 — Prevention
- `.gitignore` additions
- Build script guardrails
- Monitoring/alerting for silent failures

## Verification

After implementing the plan, these must be true:
1. `npm run build` exits 0
2. `npm start` launches the app without `window is not defined` errors
3. All main process features work (foreground tracking, IPC handlers, session management)
4. `dist-electron/main.cjs` does NOT contain `window.deskflowAPI` references
5. All service files are external `require()` calls, not bundled code
