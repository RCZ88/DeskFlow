# Implementation Plan — Phase 1: SkillPlugin + WorkspaceRegistry

Traced RESULT.md against actual codebase. Each change mapped to real file paths and verified.

## Coverage: Phase 1 Only

RESULT.md covers ~15% of PROMPT.md (only Phase 1: types + registry + IPC). Phases 2-9 will need follow-up prompts after Phase 1 is done.

---

## File 1: `src/types/SkillPlugin.ts` — NEW

**Status:** No existing file at this path. Clean creation.

**RESULT.md proposed path:** `src/types/SkillPlugin.ts`
**Actual project `src/types/`:** Only has `context.ts`. No conflict.

**Adaptation needed from RESULT.md code:**
- None — fresh file, no adaptation required
- Place after `context.ts` in the types directory

**Ripple check:** Zero — nothing imports from this path yet.

---

## File 2: `src/services/WorkspaceRegistry.ts` — NEW

**Status:** No existing file at this path. Clean creation.

**RESULT.md proposed path:** `src/services/WorkspaceRegistry.ts`
**Actual `src/services/`:** Has 13 services. No name collision.

**Adaptation needed from RESULT.md code:**
- RESULT.md imports `BUILTIN_PLUGIN_IDS` as a named import from `../types/SkillPlugin` — but `BUILTIN_PLUGIN_IDS` is exported as a `const` object, not a type. In RESULT.md's code (line 191):
  ```typescript
  import type { ..., BUILTIN_PLUGIN_IDS } from '../types/SkillPlugin';
  ```
  `BUILTIN_PLUGIN_IDS` is a `const as const` value, not a type. Using `import type` for a runtime value will fail TypeScript. **Need to change to runtime import:**
  ```typescript
  import { BUILTIN_PLUGIN_IDS } from '../types/SkillPlugin';
  ```
  Or split: import types separately, values separately.

- `WorkspaceRegistry` class doesn't use `BUILTIN_PLUGIN_IDS` in its implementation — the import on line 191 is unused. Remove it.

**Ripple check:** Zero — nothing imports from this path yet.

---

## File 3: `src/main.ts` — IPC HANDLER

**Status:** Existing file (10782 lines). `get-skills` handler at line 9675.

**RESULT.md proposes:** Add `get-workspace-skills` IPC handler after the `get-skills` block.

**Actual codebase reality (CRITICAL ADAPTATION):**
- `main.ts` is **compiled JavaScript** — imports use `__importDefault` wrappers:
  ```javascript
  const path_1 = __importDefault(require("path"));    // line 9
  const fs_1 = __importDefault(require("fs"));        // line 10
  ```
  **NOT** `import path from 'path'` or `import fs from 'fs'`.

- `electron_1.ipcMain.handle(...)` not `ipcMain.handle(...)`

- RESULT.md's code uses `path.join(...)` and `fs.existsSync(...)` — **must use `path_1.default.join(...)` and `fs_1.default.existsSync(...)`**

- RESULT.md proposes `parseSimpleFrontmatter()` function at module level — this needs to be placed OUTSIDE the ipcMain.handle callback, either before it or at the end of the file.

- `SkillsService` is already used at line 9678: `const ss = new SkillsService(baseDir)` — I need to find its import to check if the import pattern matches.

**Location to insert:** After line 9710 (end of `get-skills` handler `})`), before line 9712 (`create-skill` handler).

**Ripple check:**
- `path_1` and `fs_1` already imported at top of file — no new imports needed
- `SkillsService` is available — but need to check import pattern
- No other handlers reference `get-workspace-skills`

---

## File 4: `src/preload.ts` — PRELOAD BRIDGE

**Status:** Existing file (500 lines). Bridge at line 397.

**RESULT.md proposes:** Add after existing `getSkills` bridge (line 397):
```typescript
getWorkspaceSkills: (projectPath?: string) =>
  ipcRenderer.invoke('get-workspace-skills', { projectPath }),
```

**Actual location:** Line 397:
```typescript
getSkills: (projectPath?: string) => ipcRenderer.invoke('get-skills', { projectPath }),
```

**Adaptation needed:** None — RESULT.md matches actual pattern exactly. Insert after line 397.

**Ripple check:** Zero — single new method added to the API object.

---

## Insertion Points Summary

| Change | File | Location | Adaptation |
|--------|------|----------|------------|
| New file | `src/types/SkillPlugin.ts` | Fresh | Fix BUILTIN_PLUGIN_IDS import type → value |
| New file | `src/services/WorkspaceRegistry.ts` | Fresh | Remove unused BUILTIN_PLUGIN_IDS import |
| IPC handler | `src/main.ts` | After line 9710 | Use `path_1.default`/`fs_1.default`, `electron_1.ipcMain` |
| Preload bridge | `src/preload.ts` | After line 397 | None |

---

## After Phase 1 Implementation

Verify with:
```bash
npm run build
```

Then add temporary verification in dev tools:
```typescript
import { WorkspaceRegistry } from './services/WorkspaceRegistry';
// In a useEffect in App.tsx:
WorkspaceRegistry.initialize().then(() => {
  console.log('Registered plugins:', WorkspaceRegistry.getAllPlugins());
});
```

Expected: `[{ id: 'design-workspace', name: 'Design Workspace', ... }]`

---

## Phases 2-9 (Future)

After Phase 1 is implemented and builds, the follow-up prompt (UNCOVERED_GAPS.md) covers:
- Phase 2: DesignWorkspacePage.tsx + Sidebar integration + routing
- Phase 3: TasteKnobs.tsx (3 sliders)
- Phase 4: StyleReferences.tsx (DESIGN.md browser)
- Phase 5: DesignComposeOutlet.tsx
- Phase 6: ComposeHubPage.tsx
- Phase 7-9: Migration and cleanup
