# Build Pipeline Recovery — Context Bundle

> Self-contained context for the target AI.
> Problem: `git clean -fdx` deleted original `.ts` source files + `electron-vite` v5 Windows bug.
> Current state: custom build.mjs compiles successfully but `electron .` has not yet been verified.

## 1. Root Cause: `git clean -fdx`

A user ran `git clean -fdx` before this session. This command deletes ALL untracked files (files not in git tracking). The following were lost:

- **All original `.ts` source files** for `src/services/*.ts` — these were recreated by hand from bundled CJS output fragments, but the real original `.ts` source is gone
- **`src/main.ts`** — the only surviving copy is a pre-compiled CJS backup (18,292 lines) that was previously written over the real source file. This file had uncommitted changes not recoverable from git.
- Various documentation files, backups, and build artifacts

The surviving `src/main.ts` is NOT real TypeScript — it's compiled CJS output (uses `"use strict"`, `require()`, `exports.`) but still ends with `export { ... }` (ESM syntax mixed in). It contains both main-process code AND renderer-process code (30+ references to `window`, some React-adjacent code).

## 2. Compounding Issue: electron-vite v5 Windows Bug

`electron-vite build` (v5.0.0) on Windows silently fails to write `main.js` to disk. The process:
- Exits with code 0 (success)
- Prints file size messages
- But never writes `main.js` or `preload.mjs` to `dist-electron/`

This forced replacement with a custom build script.

## 3. Package Type Conflict

`package.json` has `"type": "module"` (line 6). This means ALL `.js` files in the project are treated as ESM. The main process code is CJS (`require()`, `module.exports`), so:

- Main output must use `.cjs` extension (forces CJS regardless of parent package.json)
- OR live in a subdirectory with its own `package.json` containing `"type": "commoncis"`
- `dist-electron/package.json` currently has `{"type": "commonjs"}` to make all `.js` files there CJS

## 4. Entry Point: Surviving main.ts

**File:** `src/main.ts` (18,292 lines)
**Format:** Pre-compiled CJS (not real TypeScript source)
**Mixed content:** Contains both main-process and renderer-process code
**Line 18292:** `export { getAgentConfig, AgentConfig, detectAgentPrompt, AgentVerifyResult };`

### Require() Dependency Graph (main.ts → services)

```js
// Lines 16-24: Standard services (required at module level as .js)
const ProblemsServiceModule = require("./services/ProblemsService.js");
const RequestsServiceModule = require("./services/RequestsService.js");
const SkillsServiceModule = require("./services/SkillsService.js");
const AgentHostServiceModule = require("./services/AgentHostService.js");
const GameDetectionModule = require("./gameDetection.js");

// Line 3635: Inline require (game detection index size check)
require('./gameDetection.js').installedGameIndex.size

// Lines 11306-11309: AI services (required at module level as .cjs)
const AIServiceModule = require("./services/AIService.cjs");
const { buildChain, runWithFallback } = require("./services/providers/router.cjs");
const { PROVIDER_TEMPLATES } = require("./services/providers/templates.cjs");

// Line 11823: Inline require (call provider)
const { callProvider: call } = require('./services/providers/callProvider.cjs');
```

### Critical: Renderer-code contamination in main.ts

Line 10297: `const api = window.deskflowAPI;` — renderer-only API usage
Lines 16198-16207: `window.deskflowAPI?.getData?.()` and `window.deskflowAPI?.onDataUpdated?.(...)` — renderer code at end of file

Most `window` references (30+) are legitimate main-process uses (BrowserWindow, time windows, sliding windows). But lines 10297, 16198, 16207 are renderer-only code.

## 5. Circular Dependency: AgentHostService ↔ main

**File:** `src/services/AgentHostService.ts` (390 lines, line 9)
```ts
import { getAgentConfig, AgentConfig, detectAgentPrompt, AgentVerifyResult } from '../main';
```

**Used at** line 97:
```ts
const agentConfig = getAgentConfig(state.agentType);
```

`getAgentConfig` is defined in `main.ts` at line 7957 — legitimate main-process code. But the import path `'../main'` resolves to `src/main.ts` (the pre-compiled CJS file). This creates a circular dependency chain:

```
main.ts → require("./services/AgentHostService.js") → imports "../main" → main.ts (CJS)
```

When Vite bundles `main.ts`, it follows this import and tries to include `AgentHostService.ts`, which then references `../main` again. Vite's library mode handles this by treating unbundled `require()` calls as external, but the ESM `import` in AgentHostService.ts is a real bundler import that Vite resolves eagerly.

### Current resolution: main.js shim

The build script creates `dist-electron/main.js`:
```js
module.exports = require("./main.cjs");
```

This allows `require('../main')` from `AgentHostService.js` (which is in `dist-electron/services/`) to resolve to the `.cjs` file. At runtime, the resolution path is:
1. `AgentHostService.js` (in `dist-electron/services/`) does `require('../main')`
2. Node resolves `dist-electron/main.js` (the shim)
3. Which re-exports `dist-electron/main.cjs`

## 6. File Structure: Service Files

All `src/services/*.ts` files are real TypeScript source (recreated by hand). Each uses `import`/`export` syntax.

```typescript
// Example: src/services/ProblemsService.ts
import { ipcMain, IpcMainInvokeEvent } from 'electron';
export class ProblemsService { ... }
```

During build, each `.ts` file is compiled individually to `.js` (CJS) via esbuild:
```
npx esbuild "src/services/ProblemsService.ts" --outfile="dist-electron/services/ProblemsService.js" --format=cjs --platform=node --target=node22
```

### .cjs shim files

For files that `main.ts` requires with `.cjs` extension (AIService, SkillDSLParser, router, templates, callProvider), a `.cjs` shim is created:
```js
// dist-electron/services/AIService.cjs
module.exports = require('./AIService.js');
```

### GameDetection

`src/gameDetection.ts` is a standalone file (not in services/). It's compiled to `dist-electron/gameDetection.js`. main.ts requires it as `require("./gameDetection.js")`.

## 7. Build Script: scripts/build.mjs

**Path:** `scripts/build.mjs` (138 lines)
**Tool:** Vite API (not CLI) + esbuild + Node.js fs

### Build Steps

**Step 1 — Renderer:** `npx vite build` → `dist/index.html` + `dist/assets/*`
- Vite config from `vite.config.ts`
- The `@tailwindcss/vite` plugin and `@vitejs/plugin-react` are auto-detected from config file

**Step 2 — Preload:** `npx vite build --ssr src/preload.ts` → moved to `dist-electron/preload.mjs`
- SSR mode produces a Node-compatible module
- Output goes to temp dir, then `preload.mjs` is renamed and placed in `dist-electron/`

**Step 3 — Services pre-compilation:**
1. `findAllTs()` walks `src/services/` to find all `.ts` files (excludes `.d.ts`, `.test.ts`, `.spec.ts`)
2. Also includes `src/gameDetection.ts`
3. Each file is compiled individually via esbuild: `format=cjs, platform=node, target=node22`
4. Output goes to `dist-electron/` mirroring source tree (e.g., `src/services/providers/router.ts` → `dist-electron/services/providers/router.js`)
5. `.cjs` shim files created for 5 files required with `.cjs` extension

**Step 4 — Main process (Vite library mode):**
```js
await viteBuild({
  configFile: false,
  build: {
    lib: {
      entry: src/main.ts,
      formats: ['cjs'],
      fileName: () => 'main.cjs',
    },
    rollupOptions: {
      external: ['electron', 'better-sqlite3', 'active-win', 'node-pty', 'dotenv'],
    },
    ssr: undefined,  // Force Node target
    minify: false,
    sourcemap: false,
  },
});
```

- Services are NOT in the external list — Vite resolves them via `require()` in main.ts
- If Vite bundles a service (e.g., AgentHostService.ts), it will try to resolve its `import from '../main'` — which points back to the pre-compiled CJS file
- After build, `main.cjs` is verified to contain `require('./services/...')` strings (confirms services left as external)

**Post-build:**
- `main.js` shim created: `module.exports = require("./main.cjs");`
- `dist-electron/package.json` written: `{"type": "commonjs"}`

## 8. Output: dist-electron Directory Contents

```
dist-electron/
├── gameDetection.js        (esbuild compiled from src/gameDetection.ts)
├── main.cjs                (Vite library mode output, 643 KB)
├── main.js                 (Shim: re-exports main.cjs)
├── package.json            ({"type": "commonjs"})
├── preload.mjs             (Vite SSR build from src/preload.ts)
└── services/
    ├── AgentHostService.js
    ├── AIService.js
    ├── AIService.cjs        (Shim re-exporting AIService.js)
    ├── ProblemsService.js
    ├── RequestsService.js
    ├── SkillsService.js
    ├── SkillDSLParser.js
    ├── SkillDSLParser.cjs   (Shim re-exporting SkillDSLParser.js)
    ├── providers/
    │   ├── callProvider.js
    │   ├── callProvider.cjs (Shim re-exporting callProvider.js)
    │   ├── router.js
    │   ├── router.cjs       (Shim re-exporting router.js)
    │   ├── templates.js
    │   └── templates.cjs    (Shim re-exporting templates.js)
    └── ... (all other service .js files)
```

## 9. Package.json Configuration

```json
{
  "name": "deskflow",
  "type": "module",           // ← ESM project
  "main": "dist-electron/main.cjs",
  "scripts": {
    "build": "node scripts/build.mjs",
    "start": "electron .",
    "dev": "vite"
  }
}
```

## 10. Vite Config

**File:** `vite.config.ts` (auto-detected during Vite builds)
- Uses `@vitejs/plugin-react`
- Uses `@tailwindcss/vite`
- Renderer output: `dist/`
- Not used for preload (uses `--ssr`) or main process (uses library mode)

## 11. Error Messages from Previous Build Attempts

### Attempt 1: esbuild --bundle (all-in-one bundle)
```
Error: Build failed with 1 error:
dist-electron/main.cjs:94465:39: ERROR: Could not resolve "./services/providers/callProvider.cjs"
```
Resolution: File system has only `.ts` sources, `.cjs` → `.ts` not mapped. Added `.cjs` shim files.

### Attempt 2: esbuild --bundle (with alias)
```
window is not defined
```
esbuild bundled everything including renderer code. At startup, `window.deskflowAPI` reference crashed. 20 MB single file.

### Attempt 3: Vite library mode (services externalized)
```
Error [ERR_REQUIRE_ESM]: require() of ES Module /path/to/dist-electron/services/AgentHostService.js
```
Fix: Added `dist-electron/package.json` with `"type": "commonjs"`.

### Attempt 4-5: Extension resolution failures
```
Error: Cannot find module './services/AIService.cjs'
```
Fix: Created .cjs shim files for 5 modules.

### Attempt 6 (last run): ✅ SUCCESS
```
=== Step 1/4: Building renderer ===
vite v7.3.1 building for production...
✓ built in 2.58s

=== Step 2/4: Building preload ===
vite v7.3.1 building for production...
✓ built in 305ms

=== Step 3/4: Pre-compiling services ===
  gameDetection.js → gameDetection.js (13 KB)
  services/ProblemsService.js → services/ProblemsService.js (5 KB)
  ... (all services compiled)
  AIService.cjs → shim
  ... (5 shims created)

=== Step 4/4: Building main process entry (Vite library mode) ===
vite v7.3.1 building for production...
✓ 15 modules transformed.
  main: 643 KB

  ✅ Services left as external require() (expected)

✅ Build complete!
```

**Build was successful but `electron .` was never run to verify launch.**

## 12. Known Runtime Risks

Even though build compiles, runtime errors are possible:

1. **`window` is not defined** — If Vite resolves any source file that contains unconditional `window` references during main process bundling
2. **`require('../main')` resolution failure** — AgentHostService.js at runtime may try `require('../main')` which must resolve to `dist-electron/main.js` shim → `main.cjs`
3. **Native module resolution** — `better-sqlite3`, `active-win`, `node-pty` must load correctly from `node_modules/`
4. **Preload context bridge** — `preload.mjs` must expose `window.deskflowAPI` methods that main.ts handlers expect
5. **Render-to-main IPC** — If preload IPC channels don't match main.ts handlers, features silently fail
