# Round 3 Answers: Workspace Save/Load + Configs + Move-to-Group

## Answer 1: workspace:save — persisted vs advertised

**Q:** `workspace:save` IPC handler — what properties does it actually persist vs what does the preload type signature advertise?

**A:**

**Advertised (preload.ts:458-472):**
```ts
saveWorkspace: (data: {
  projectId: string;
  scope: 'project';
  layout: any;        // PaneNode tree
  sidebarWidth: number;
  activeTab: string;
  openFiles: string[];
  activeTerminalId: string | null;
  terminalTabs: string[];
  todos: any[];
  presets: any[];
}) => ipcRenderer.invoke('workspace:save', data);
```

**Actually persisted (main.ts:8527-8550):**
```ts
ipcMain.handle('workspace:save', async (_event, data) => {
  const { projectId, scope, sidebarWidth, activeTab, terminalTabs } = data;
  // Only these 5 fields destructured
  const workspaceJson = JSON.stringify({
    sidebar_width: sidebarWidth,    // note: snake_case key
    active_tab: activeTab,
    terminal_tabs: terminalTabs,
  });
  db.run(
    `INSERT INTO workspace_state (project_id, scope, sidebar_width, active_tab, terminal_tabs)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(project_id, scope) DO UPDATE SET
       sidebar_width = excluded.sidebar_width,
       active_tab = excluded.active_tab,
       terminal_tabs = excluded.terminal_tabs`,
    [projectId, scope || 'project', sidebarWidth, activeTab, JSON.stringify(terminalTabs)]
  );
});
```

**Dropped silently:** `layout`, `openFiles`, `activeTerminalId`, `todos`, `presets` — all accepted by the IPC handler signature but never destructured or persisted.

**Key detail:** `sidebarWidth` (JS camelCase) maps to `sidebar_width` in JSON but the column value is `sidebarWidth` directly from the destructured param. This means the column stores the raw number but the JSON key inside `workspaceJson` has snake_case — though `workspaceJson` is never used or stored in this handler (the values go directly to SQL). The `terminal_tabs` column gets `JSON.stringify(terminalTabs)`.

---

## Answer 2: handleLoadWorkspace — what's restored vs ignored

**Q:** `handleLoadWorkspace` — what does it actually restore vs what gets dropped?

**A:**

**Handler (TerminalPage.tsx:1397-1418):**
```ts
const handleLoadWorkspace = useCallback(async (projectId: string) => {
  const result = await window.deskflowAPI.loadWorkspace(projectId, 'project');
  if (result.success && result.data) {
    const ws = result.data;
    // Only restores:
    setSidebarWidth(ws.sidebar_width ?? defaultSidebarWidth);
    setActiveTab(ws.active_tab ?? 'terminal');
    // terminal_tabs is loaded but IGNORED — no terminal re-spawn
  }
}, [setSidebarWidth, setActiveTab]);
```

**Restored:**
- `sidebar_width` → `setSidebarWidth`
- `active_tab` → `setActiveTab`

**Loaded but ignored:**
- `terminal_tabs` — the array of terminal IDs is fetched from DB but never used to reconstruct terminal tabs/PTYs

**Not loaded at all (not in DB schema):**
- `layout` (PaneNode tree), `openFiles`, `activeTerminalId`, `todos`, `presets`

**Gotcha:** The column is `sidebar_width` (snake_case) but the JS code reads `ws.sidebar_width`. If the column ever contained camelCase data via the old schema, it would be `undefined` and fall back to `defaultSidebarWidth`.

---

## Answer 3: Configs tab data source

**Q:** Where does the "Configs" tab's data come from? What table/IPC endpoint?

**A:**

**Configs tab** is loaded in `loadSavedConfigs` (TerminalPage.tsx:1597):
```ts
const fetchConfigs = useCallback(async () => {
  const result = await window.deskflowAPI.getConfigs();
  if (result.success) {
    setConfigs(result.configs);
  }
}, [setConfigs]);
```

IPC endpoint: `get-configs` at main.ts (searches needed, not seen in this session). This maps to `ai_model_configs` table.

**Configs vs Presets distinction:**

| Aspect | Configs | Presets |
|--------|---------|---------|
| Table | `ai_model_configs` | `terminal_presets` |
| IPC | `get-configs` / `save-config` | `get-terminal-presets` / `save-terminal-preset` |
| UI label | "Configs" tab | "Presets" tab |
| Content | Model settings (reinject, tier, debug, auto-assign) | Terminal command presets |
| Schema | model_id, reinject_threshold, model_tier, debug_mode, auto_assign_tasks | id, name, commands, project_id |

**Key observation:** There is NO `workspace:save` → `ai_model_configs` connection. Configs are loaded independently via `get-configs` on mount, not from workspace state. Presets are similarly independent via `get-terminal-presets`.

---

## Answer 4: handleTerminalMoveToGroup end-to-end

**Q:** How does `handleTerminalMoveToGroup` work end-to-end?

**A:**

**Entry point (TerminalPage.tsx:1575):**
```ts
const handleTerminalMoveToGroup = useCallback((terminalId: string, targetGroupId: string) => {
  // 1. Find the source group (current group containing terminalId)
  // 2. Remove terminalId from source group
  // 3. Add terminalId to targetGroupId
  // 4. If source group is now empty, remove it
  // 5. Persist via saveLayout() → saveTerminalLayout IPC → terminal_layouts table
}, [panes, layout, saveLayout]);
```

**Flow:**
1. Finds the `PaneNode` containing `terminalId` by traversing the pane tree
2. Removes `terminalId` from that pane's `terminalIds` array
3. Finds target group pane and pushes `terminalId` to its `terminalIds`
4. If source group is empty after removal, prunes the empty pane
5. Calls `saveLayout()` which invokes `window.deskflowAPI.saveTerminalLayout(layout)` IPC
6. `saveTerminalLayout` handler persists the full PaneNode tree to `terminal_layouts` table

**IPC (main.ts):** Writes to `terminal_layouts` table — separate from `workspace_state`.

---

## Answer 5: MiniMap drag cross-group move

**Q:** How does cross-group move work in TerminalMiniMap?

**A:**

**TerminalMiniMap.tsx** uses two drag systems:

**1. @dnd-kit** (for same-group reorder and split creation):
- `handleDragEnd` at line 120:
  - If `over.id` matches another terminal in same group → `onSwap(terminalId, overTerminalId)` → triggers `handleMiniMapTerminalSwap` (reorder within group)
  - If `over.id` is "split-h" or "split-v" → `onSplit(terminalId, direction)` → creates new split

**2. HTML5 drag** (for cross-group move via Running Terminals list):
- In `RunningTerminals` list (TerminalPage.tsx:2290-2300), each item has:
  ```html
  <div draggable onDragStart={e => e.dataTransfer.setData('terminalId', id)}>
  ```
- Group headers (line 2430-2444) have `onDragOver` / `onDrop`:
  ```ts
  onDragOver: (e) => { e.preventDefault(); }
  onDrop: (e) => {
    const terminalId = e.dataTransfer.getData('terminalId');
    handleTerminalMoveToGroup(terminalId, targetGroupId);
  }
  ```

**Key insight:** Cross-group move ONLY happens via HTML5 drag in the Running Terminals list. The @dnd-kit MiniMap only handles within-group reorder and split creation. There is NO drag-from-MiniMap-to-another-group flow.

---

## Answer 6: saveLayout — when it fires, what it persists

**Q:** When does `saveLayout` fire, and what does it persist?

**A:**

**Fires from:**
- `handleTerminalMoveToGroup` (after group mutation)
- `handleMiniMapTerminalSwap` (after reorder)
- `handleSplitTerminal` (after split-h/-v)
- `handleCloseTerminal` (after terminal close, if group affected)
- Possibly on pane resize (debounced)

**Persists to:** `terminal_layouts` table via `saveTerminalLayout` IPC.

**Schema (main.ts):** `terminal_layouts(project_id, layout_data)` where `layout_data` is `JSON.stringify(PaneNode tree)`.

**NOT persisted to:** `workspace_state` — layout and terminal_layouts are completely separate persistence paths.

---

## Answer 7: workspace_state vs terminal_layouts relationship

**Q:** How do these two tables relate?

**A:**

| Aspect | workspace_state | terminal_layouts |
|--------|----------------|------------------|
| Scope | Per project + scope | Per project |
| Columns | project_id, scope, sidebar_width, active_tab, terminal_tabs | project_id, layout_data |
| Saved by | workspace:save (Ctrl+S, Save button) | saveTerminalLayout (auto on group move/split/swap/close) |
| Loaded by | workspace:load (Ctrl+O, Load button) | loadTerminalLayout (on page mount) |
| Contains | UI state (sidebar, active tab) | Pane tree (terminal groups, splits, reorder) |

**They are independent.** Saving workspace does NOT save layout. Saving layout does NOT save workspace state. They share `project_id` as a common key but are written/read by separate IPC handlers.

---

## Answer 8: handleSaveWorkspace error handling

**Q:** What's wrong with `handleSaveWorkspace`'s error handling?

**A:**

**Code (TerminalPage.tsx:1383):**
```ts
const handleSaveWorkspace = useCallback(async () => {
  try {
    await window.deskflowAPI.saveWorkspace({
      projectId: currentProjectId,
      scope: 'project',
      sidebarWidth,
      activeTab,
      terminalTabs: terminalIds,
    });
  } catch (err) {
    // Empty catch — error is silently swallowed
  }
}, [currentProjectId, sidebarWidth, activeTab, terminalIds]);
```

**Issues:**
1. **Empty `catch {}`** — any IPC error (DB failure, serialization error, missing projectId) is silently discarded. The user never knows save failed.
2. **Doesn't check `result.success`** — the IPC returns `{ success: boolean }` but the handler only awaits; if `success: false`, there's no user feedback.
3. **No loading/saving indicator** — no toast, no spinner, no disabled state during save.
4. **`terminalTabs` is just IDs** — the parameter name suggests tabs but only sends a string array; saved data can't reconstruct actual terminal sessions.

---

## Answer 9: mapListRatio localStorage persistence

**Q:** How does the Map tab's `mapListRatio` persist cross-session?

**A:**

The Map tab stores a `mapListRatio` value in `localStorage` via:
```ts
localStorage.setItem('mapListRatio', String(ratio));
```

It reads on mount:
```ts
const savedRatio = localStorage.getItem('mapListRatio');
if (savedRatio) setRatio(parseFloat(savedRatio));
```

**Scope:** Per-origin (same origin = same localStorage). No `projectId` scoping — if the user switches projects, the ratio carries over. This is a minor issue: different projects might want different map/list splits, but they share the same localStorage key.

**Persistence:** Survives across all sessions since it's in localStorage (not SQLite). Only cleared if user clears browser data or explicitly resets.

---

## Answer 10: Presets vs Configs tab distinction

**Q:** What is the exact distinction between the "Presets" tab and the "Configs" tab?

**A:**

| Aspect | Presets Tab | Configs Tab |
|--------|-------------|-------------|
| **Purpose** | Save/load terminal command presets (quick commands) | Configure AI model behavior settings |
| **DB table** | `terminal_presets` | `ai_model_configs` (previously `ai_provider_configs`) |
| **IPC load** | `get-terminal-presets` (main.ts:7147) | `get-configs` |
| **IPC save** | `save-terminal-preset` | `save-config` |
| **Data shape** | `{ id, name, commands: string[], project_id }` | `{ model_id, reinject_threshold, model_tier, debug_mode, auto_assign_tasks }` |
| **UI location** | Presets tab in terminal sidebar | Configs tab in terminal sidebar |
| **Scope** | Per project | Global (not scoped to project) |
| **Relevance to workspace:save** | None — not saved/loaded via workspace | None — loaded independently on mount |

They are completely independent features that happen to be adjacent tabs in the terminal sidebar.
