# Round 3 — Workspace Save/Load + Configs + Move-to-Group — Fix Spec
**Date:** 2026-06-13
**Feature Scope:** §28 Save/Load Workspace, saved Configs/Presets, Map drag-to-group
**Files:** TerminalPage.tsx, TerminalMiniMap.tsx, preload.ts, main.ts; tables workspace_state, terminal_layouts, ai_model_configs, terminal_presets

---

## ROOT CAUSE

Save/Load Workspace is a **facade that persists almost nothing** and Load restores even less. Move-to-group actually works — but only from a UI surface users don't expect.

### PRIMARY — workspace:save silently drops 5 of 10 advertised fields
- Preload advertises (preload.ts:458-472): `layout`, `sidebarWidth`, `activeTab`, `openFiles`, `activeTerminalId`, `terminalTabs`, `todos`, `presets`.
- The handler (main.ts:8527-8550) only destructures `{ projectId, scope, sidebarWidth, activeTab, terminalTabs }` and persists those 3 state fields.
- **Dropped silently:** `layout` (the pane/group tree), `openFiles`, `activeTerminalId`, `todos`, `presets`. They are accepted by the signature and discarded — the type lies about what's saved.

### SECONDARY — handleLoadWorkspace ignores most of what IS saved
- Loader (TerminalPage.tsx:1397-1418) restores only `sidebar_width` and `active_tab`.
- `terminal_tabs` is fetched from the DB but **never used** — no terminals/PTYs are reconstructed.
- Net effect: "Load Workspace" restores sidebar width + active tab and nothing else → users perceive it as doing nothing.

### TERTIARY — layout lives in a separate table the Save button never touches
- Pane tree (groups / splits / reorder) is persisted to `terminal_layouts(project_id, layout_data)` via `saveTerminalLayout`, auto-fired on move/split/swap/close.
- `workspace_state` holds only sidebar/tab. **Save Workspace does not capture layout** (dropped in PRIMARY) and **Load Workspace does not read terminal_layouts**.
- So the user's mental model ("save my whole workspace") is split across two stores, and the Save button writes to neither the layout one nor most of the other.

### QUATERNARY — handleSaveWorkspace swallows all errors
- TerminalPage.tsx:1383: `try { await saveWorkspace(...) } catch (err) {}` — empty catch.
- Never checks `result.success`; no toast, spinner, or disabled state. A failed save is indistinguishable from a successful one.

### QUINARY — Move-to-group works, but not from the MiniMap (where users drag)
- `handleTerminalMoveToGroup` (TerminalPage.tsx:1575) correctly mutates the pane tree and persists via `saveLayout` -> `terminal_layouts`.
- BUT cross-group move only happens via **HTML5 drag in the Running Terminals list** (drop handler at TerminalPage.tsx:2430-2444). The MiniMap's @dnd-kit (`handleDragEnd`, TerminalMiniMap.tsx:120) only handles **within-group reorder + split** — there is no drag-to-another-group flow in the map. Users dragging in the map see nothing happen.

### Minor
- `mapListRatio` localStorage key is not project-scoped → ratio bleeds across projects.
- Configs (`ai_model_configs`) and Presets (`terminal_presets`) load independently on mount and are NOT part of workspace save (`presets` is advertised but dropped). `ai_model_configs` is global, not project-scoped.

---

## CHANGES REQUIRED

### A. Persist the full payload in workspace:save (fixes PRIMARY)
- **main.ts:8527** — destructure and persist all advertised fields. Simplest: add a `state_json TEXT` column to `workspace_state` storing the entire payload (layout, openFiles, activeTerminalId, todos, presets, terminalTabs) as JSON; keep the scalar columns (sidebar_width, active_tab) for convenience.
- Schema migration: `ALTER TABLE workspace_state ADD COLUMN state_json TEXT`.

### B. Restore everything in handleLoadWorkspace (fixes SECONDARY)
- **TerminalPage.tsx:1397** — parse `state_json` and restore: `setSidebarWidth`, `setActiveTab`, reopen `openFiles`, set `activeTerminalId`, restore `todos`/`presets`.
- **Reconstruct terminals from `terminal_tabs`** — for each saved id, call `spawnTerminal` + `initializeTerminal` (or resume via `handleResumeSession`). This is the single biggest user-visible fix: today terminals never come back.

### C. Unify layout into workspace save/load (fixes TERTIARY)
- Either capture the pane tree in `workspace:save` (include `layout` in the JSON) and apply it on load via `setLayout`, OR have Save call both `saveWorkspace` + `saveTerminalLayout` and Load call both `loadWorkspace` + `loadTerminalLayout`.
- Recommended: Load reads `terminal_layouts` and applies `setLayout` so groups/splits restore together with the rest of the workspace.

### D. Surface save errors (fixes QUATERNARY)
- **TerminalPage.tsx:1383** — check `result.success`; on failure show a toast + `console.error`; replace the empty catch with real error handling. Add a transient saving indicator/disabled state. Guard against missing `currentProjectId` before calling.

### E. Enable cross-group move from the MiniMap (fixes QUINARY)
- **TerminalMiniMap.tsx:120 (handleDragEnd)** — add a case: when `over.id` is a different group container, call a new `onMoveToGroup(terminalId, targetGroupId)` prop → wired to `handleTerminalMoveToGroup`. Matches the user's expectation of dragging within the map.

### F. Scope mapListRatio per project (minor)
- Use `mapListRatio:${projectId}` as the localStorage key so each project keeps its own map/list split.

### G. Decide Configs/Presets scope (optional)
- If presets/configs should travel with a workspace, wire `presets` (already advertised) into save/load. Otherwise document they're independent, and consider project-scoping `ai_model_configs` (currently global).

---

## IPC CHANGES
- `workspace:save` handler must accept + persist the full payload (A).
- `workspace:load` (or load flow) should also return `terminal_layouts` so the loader can restore the pane tree (C).
- New renderer prop/callback `onMoveToGroup` from MiniMap (E) — no new IPC needed (reuses saveTerminalLayout).

## DB CHANGES
- `workspace_state`: add `state_json TEXT` (A). Migration required.
- Optional: project-scope `ai_model_configs` (G).

---

## VERIFICATION
1. Save workspace, restart the app / reopen the project: terminals re-spawn, open files reopen, active terminal + active tab + sidebar width + pane layout (groups/splits) all restored.
2. Force a DB failure on save: a visible error toast appears (no silent success).
3. Drag a terminal across groups in the MiniMap: it moves and persists (not only via the Running Terminals list).
4. Switch projects: the map/list ratio is independent per project.
5. Inspect `workspace_state.state_json`: contains layout/openFiles/activeTerminalId/todos/presets after save.

## STATUS
DIAGNOSED — backend: full-payload persist + schema migration (A), return layout in load (C). Renderer: restore-all + terminal reconstruction (B), error surfacing (D), MiniMap cross-group move (E), per-project ratio (F). Save/Load is currently a near-no-op; B is the highest-impact fix.
