## Goal
Diagnose and implement fixes for terminal spawn, agent readiness, workspace save/load, configs, and move-to-group across the full IPC stack.

## Constraints & Preferences
- Use phase-aware queuing for all agent-directed writes (agent:send + terminal:write-old-format)
- Reserve terminal:write-raw only for literal user keystrokes
- Persist workspace_state via SQLite upsert by projectId (workspace:save / workspace:load IPC)
- Append \r\n only in agent:send; terminal:write-old-format and write-raw do NOT add \r\n
- handshake token conditionally wraps in bracketed paste (\x1b[200~ / \x1b[201~) when bracketedPaste flag is true
- All R2 items A–J are implemented, built, and context-files updated

## Progress
### Done
- **A–J implemented** (Terminal Spawn + Agent Readiness): agentType forwarding, 30s timeout, terminal:exit fix, terminal:ready IPC, retry agentType heuristic, agent:send queue during busy, failPendingWrites on kill, isAgentReady helper, bracketedPaste flag, phase-aware write-old-format
- **Graphify rebuilt:** 990 nodes, 1469 edges, 119 communities; vault synced
- **R3 Q&A completed:** All 10 diagnostic questions answered (see R3-workspace-save-load-configs-groups-answers.md)

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- workspace:save only persists sidebarWidth, activeTab, terminalTabs (array of IDs) — not pane tree, agent types, cwds, or session bindings. Layout, openFiles, activeTerminalId, todos, presets are all silently dropped from the advertised type signature.
- handleLoadWorkspace restores only sidebarWidth and activeTab; loaded terminalTabs array is ignored, no PTY re-spawn
- "Configs" tab (ai_model_configs table) is model-config settings panel; "Presets" tab (terminal_presets table) is terminal command presets — independent tables, independent IPC, independent tabs
- handleTerminalMoveToGroup mutates PaneNode tree and persists via saveLayout → saveTerminalLayout IPC (terminal_layouts table) — separate from workspace_state
- MiniMap drag (TerminalMiniMap.tsx) uses @dnd-kit for same-group reorder + split creation; cross-group move only via HTML5 drag in Running Terminals list
- workspace_state and terminal_layouts are completely independent — save workspace does NOT save layout, save layout does NOT save workspace state
- handleSaveWorkspace has empty catch {} that silently discards all IPC errors — no user feedback on failure
- mapListRatio stored in localStorage (per-origin, not per-project) — carries over when switching projects

## Next Steps
- Consider whether handleLoadWorkspace should reconstruct terminals from saved terminalTabs (currently ignored)
- Add error handling + user feedback to handleSaveWorkspace (toast on failure, loading state)
- Consider scoping mapListRatio by projectId in localStorage
- Verify no stale/phantom PROBLEMS.md entries exist for save/load/configs/groups (none currently documented)

## Critical Context
- workspace:save handler only destructures { projectId, scope, sidebarWidth, activeTab, terminalTabs } — the preload type signature advertises 9 fields but 4 are silently dropped
- The column is sidebar_width (snake_case) but JS reads ws.sidebar_width — if camelCase data ever existed, falls back to defaultSidebarWidth
- No PROBLEMS.md entries exist for save/load persistence failures, configs not appearing, groups resetting, or drag-to-group issues
- Configs and Presets are loaded independently on mount (get-configs / get-terminal-presets), NOT from workspace state
- saveLayout fires on every group mutation (move, swap, split, close) and persists full PaneNode tree to terminal_layouts

## Relevant Files
- **src/pages/TerminalPage.tsx:** handleSaveWorkspace (1383), handleLoadWorkspace (1397), loadSavedConfigs (1597), handleTerminalMoveToGroup (1575), handleMiniMapTerminalMove (1525), HTML5 drag handlers (2290-2300, 2430-2444), Save/Load buttons (2841-2846), Configs tab (3191), MiniMap render (2982)
- **src/main.ts:** workspace_state table schema (1790-1798), workspace:save handler (8527), workspace:load handler (8556), get-terminal-presets handler (7147), terminal_presets table (1717-1727), failPendingWrites (7995-8007), isAgentReady (7918-7929)
- **src/preload.ts:** saveWorkspace/loadWorkspace bridge (458-472), getTerminalPresets (332)
- **src/components/TerminalMiniMap.tsx:** DndContext handleDragEnd swap (120-133), onTerminalMove prop (18)
- **agent/PROBLEMS.md:** #152-#158 entries for R2 fixes; no entries for save/load/configs/groups
- **agent/state.md:** v4.43 entry documenting A-J changes
- **agent/data.md:** IPC endpoints/events updated with terminal:crashed, re-spawn-terminal, terminal:pending-failed
