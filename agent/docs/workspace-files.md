# Workspace File Reference

> Terminal Workspace (`/terminal`) — complete file inventory, functions, and purposes.
> Generated 2026-07-01.

---

## Pages

| File | Functions | Purpose |
|---|---|---|
| `src/pages/TerminalPage.tsx` | `TerminalPage` | Main entry for `/terminal`. Orchestrates 5-group sidebar (Setup/Work/Insights/Studio/Context), terminal pane layout with split/close/reorder, session CRUD, context delta listeners, workspace save/load, terminal spawn/init lifecycle, project selection, agent routing, and all workspace subtab renderers. |
| `src/pages/WorkspacesPage.tsx` | `WorkspacesPage` | Standalone route listing saved workspace snapshots from `workspace_state` DB via `workspace:list-all` IPC. Supports delete. |
| `src/pages/DesignWorkspacePage.tsx` | `DesignWorkspacePage` | Inside Studio group. Taste knobs, design library sources, style references, compose outlet, color picker, component browser, library config modals. |

## Core Terminal Components

| File | Functions | Purpose |
|---|---|---|
| `src/components/TerminalWindow.tsx` | `PaneNode`, `TerminalLayout`, `insertIntoLayout`, `getLeafIds`, `getGroupTrees`, `updateGroupTree`, `splitPane`, `removePane`, `TerminalPane`, `measureSpawnSize` | Core xterm.js terminal emulator. Per-terminal lifecycle (create, write, resize, fit, destroy). Hooks into `window.deskflowAPI` for spawn/data/exit/ready events. Manages the multi-group layout tree with split/close operations. |
| `src/components/TerminalTab.tsx` | `TerminalTab` | Per-terminal tab header with name, resize handle, close button. |
| `src/components/TerminalMiniMap.tsx` | `TerminalMiniMap` | Compact overview sidebar of all terminal panes with group index highlighting. |

## Workspace Sidebar & Navigation

| File | Functions | Purpose |
|---|---|---|
| `src/components/workspace/WorkspaceShell.tsx` | `WorkspaceShell` | Generic subtab shell. SubTabBar + usePersistentSubTab. Vertical accent-trunk layout for workspace group content. |
| `src/components/workspace/SubTabBar.tsx` | `SubTabBar` | Rounded-full chip pills with accent colors. Subtab navigation within each workspace group. |
| `src/components/TabBar.tsx` | `TabBar` | General-purpose tab bar with spring-based active pill indicator. Used for group switching. |
| `src/components/ContextSidebar.tsx` | `ContextSidebar` | Workspace context config. Toggles for LLM Wiki, Obsidian Skills, Graphify, PARA, QMD, Automations. Persists to localStorage. Exports `WORKSPACE_CONFIG_PREF_KEY`. |
| `src/components/WorkspaceSettingsDialog.tsx` | `WorkspaceSettingsDialog` | Settings dialog for workspace config. Context map SVG, config merge, system/behavior toggles. |
| `src/components/PageContextPanel.tsx` | `PageContextPanel` | Shows current page context info inside Context group. |
| `src/components/ContextMaintenanceTab.tsx` | `ContextMaintenanceTab` | Context maintenance utilities inside Context group. |

## Workspace Group Subtab Content

| File | Functions | Purpose |
|---|---|---|
| `src/components/IssuesWorkspace.tsx` | `IssuesWorkspace` | Issues CRUD with filtering inside Insights group. |
| `src/components/PromptsWorkspace.tsx` | `PromptsWorkspace` | Prompt template management inside Studio group. Status indicators, loading/empty states. |
| `src/components/ProblemsTab.tsx` | `ProblemsTab`, `ProblemDetailModal`, `NewProblemDialog` | Problem CRUD with `terminal_id` linking inside Work group. |
| `src/components/RequestsTab.tsx` | `RequestsTab`, `RequestDetailModal`, `NewRequestDialog` | Request CRUD with bidirectional problem linking inside Work group. |
| `src/components/SkillsTab.tsx` | `SkillsTab`, `DSLGenerationModal` | AI skill management (project/browse/saved views) inside Studio group. |
| `src/components/FilesTab.tsx` | `FilesTab` | Browse agent-created files. Loading/empty/error states, agent dir listing, file content display. |
| `src/components/PromptHistoryTab.tsx` | `PromptHistoryTab` | Prompt history with status pills and progress bars inside Studio group. |
| `src/components/MapEditor.tsx` | `MapEditor`, `swapLeavesInTree` | Visual leaf-swapping and tree manipulation of PaneNode layouts inside Work group. |
| `src/components/AnalyticsDashboard.tsx` | `AnalyticsDashboard` | Workspace analytics and metrics inside Insights group. |
| `src/components/BugReportPanel.tsx` | `BugReportPanel` | Bug reports with context delta hook inside Insights group. |

## Dialogs & Modals

| File | Functions | Purpose |
|---|---|---|
| `src/components/NewSessionDialog.tsx` | `NewSessionDialog` | Creates AI agent terminal sessions. Agent type selection, advanced config (context toggles), terminal target, init content. |
| `src/components/InstructionPanel.tsx` | `InstructionPanel` | Compose and send prompts to active terminal. Assembles from problems, requests, skills, files. |
| `src/components/InitializeProgressModal.tsx` | `InitializeProgressModal` | Agent initialization progress during terminal spawn. |
| `src/components/ImportSessionsDialog.tsx` | `ImportSessionsDialog` | Import terminal sessions from external sources. |
| `src/components/SessionEditDialog.tsx` | `SessionEditDialog` | Edit session metadata (name, category, description, tags). |
| `src/components/TransferSessionModal.tsx` | `TransferSessionModal` | Transfer session between projects/terminals. |
| `src/components/RoutingDisambiguationDialog.tsx` | `RoutingDisambiguationDialog` | Resolve ambiguous prompt routing between multiple terminals. |
| `src/components/RoutingToast.tsx` | `RoutingToast` | Toast notification for routing results/errors. |
| `src/components/GeneralistDialog.tsx` | `GeneralistDialog` | General-purpose agent instruction dialog. |
| `src/components/ConnectorSetupModal.tsx` | `ConnectorSetupModal` | Connect external services to workspace. |

## Workspace Design System (`workspace/_ds/`)

| File | Functions | Purpose |
|---|---|---|
| `src/components/workspace/_ds/motion.ts` | `listContainer`, `riseItem`, `expandPanel`, etc. | Motion/animation primitives for workspace components. |
| `src/components/workspace/_ds/primitives.tsx` | `Chip`, `Skeleton`, `StatusPill`, `ProgressBar`, `IconButton`, `EmptyState` | UI primitive components shared across workspace subtabs. |

## Workspace Design Tools (Studio group)

| File | Purpose |
|---|---|
| `src/components/workspace/TasteKnobs.tsx` | Design variance/motion intensity/visual density sliders. |
| `src/components/workspace/DesignLibrarySources.tsx` | Design library source browser. |
| `src/components/workspace/StyleReferences.tsx` | Style references panel. |
| `src/components/workspace/DesignComposeOutlet.tsx` | Design compose outlet. |
| `src/components/workspace/StyleDescription.tsx` | Style description editor. |
| `src/components/workspace/ComponentBrowserModal.tsx` | Component browser for design selection. |
| `src/components/workspace/LibraryConfigModal.tsx` | Library configuration. |
| `src/components/workspace/ColorPicker.tsx` | Color picker for design customization. |

## Hooks

| File | Functions | Purpose |
|---|---|---|
| `src/hooks/useTerminalLayout.ts` | `useTerminalLayout` | PaneNode tree state management: default layout creation, insertion, persistence. |
| `src/hooks/usePersistentSubTab.ts` | `usePersistentSubTab` | Persists subtab selection to localStorage + URL search params (`subtab:<key>`). |

## Main Process (`src/main.ts`)

| Section (approx lines) | Functions / Handlers | Purpose |
|---|---|---|
| 2098–2770 | DB table creation | `terminal_layouts`, `terminal_presets`, `terminal_sessions`, `terminal_messages`, `workspace_state` tables + migration ALTER TABLEs. |
| 8688–8796 | `get-terminal-layouts`, `save-terminal-layout`, `get-terminal-presets`, `add-terminal-preset`, `remove-terminal-preset`, `execute-terminal-preset`, `save-terminal-preset` | Layout/preset CRUD. |
| 8980 | terminalReadySent Set | Track which terminals have broadcast `terminal:ready`. |
| 9258–9313 | `terminalManager` object (spawn, write, resize, kill, getDataHandler, getExitHandler) | Inline node-pty PTY manager. Map of terminals, intentionalKills, spawnTimes. |
| 9426–9513 | IPC `terminal:create` | Create terminal with optional agent type, spawn PTY, wire data/exit handlers, broadcast events. |
| 9523–9612 | IPC `spawn-terminal` | Simpler spawn with cols/rows params. |
| 9673 | `maybeReinjectRules()` | Auto-reinject rules every N messages per terminal. |
| 9708–9716 | `terminal:write-raw`, `terminal:write-display` | Raw PTY write / display-only broadcast. |
| 9755–9800 | `write-terminal` | Write with auto-reinjection logic. |
| 10027–10108 | `kill-terminal`, resize/destroy handlers | Terminal lifecycle management. |
| 10112–10172 | `get-terminal-sessions`, `save-terminal-session` | Session CRUD against DB. |
| 10337–10347 | `delete-terminal-session` | Cascading delete (messages, parsed items, bindings). |
| 10564–10582 | `delete-terminal-layout`, `set-active-terminal-layout` | Layout management. |
| 10589–10729 | `workspace:save`, `workspace:load`, `workspace:list`, `workspace:delete`, `workspace:list-all` | Full workspace state persistence to `workspace_state` table. |
| 10890–11094 | Context-changed integration | Parse problem/request/check updates and auto-write to matching terminals. |
| 11135–11185 | `write-agent-actions`, `execute-actions-from-file` | Agent action execution. |
| 11355–11381 | `get-terminal-messages` | Read all messages for a terminal session. |
| 11648–11696 | `create-terminal-window` | Create detached BrowserWindow terminal. |
| 17158–17162 | Context-delta write | Write problem update instructions to terminals. |

## Preload (`src/preload.ts`)

| API Group | Methods | Purpose |
|---|---|---|
| Terminal lifecycle | `spawnTerminal`, `writeTerminal`, `resizeTerminal`, `killTerminal`, `terminalWrite`, `terminalWriteRaw`, `terminalResize`, `terminalDestroy` | Bridge renderer terminal operations to main process IPC. |
| Terminal events | `onTerminalData`, `onTerminalExit`, `onTerminalReady`, `onContextChanged` | Subscribe to terminal data/exit/ready/context events. |
| Terminal log | `terminalLog`, `terminalAPI.create/write/resize/destroy` | Terminal logging and old-format API bridge. |
| Presets | `getTerminalPresets`, `addTerminalPreset`, `executeTerminalPreset`, `saveTerminalPreset` | Terminal preset management. |
| Layouts | `saveTerminalLayout`, `getTerminalLayouts`, `deleteTerminalLayout`, `setActiveTerminalLayout` | Terminal layout CRUD. |
| Sessions | `saveTerminalSession`, `getTerminalSessions`, `getTerminalMessages`, `deleteTerminalSession` | Session CRUD. |
| Workspace | `workspace:save/load/list/listAll/delete` overrides, `workspaceAllowClose` | Workspace state persistence. |

## Services

| File | Functions | Purpose |
|---|---|---|
| `src/services/WorkspaceRegistry.ts` | Workspace plugin registry | Registers built-in workspace plugins (design workspace). Manages skill plugin descriptors and sidebar entries. |
| `src/services/AgentHostService.ts` | Registers `terminal:exit` IPC | Agent lifecycle in relation to terminals. |
| `src/services/SessionContextService.ts` | Context extraction | Extracts context from terminal output for session management. |
| `src/services/ContextAssemblyService.ts` | Context assembly | Assembles context for terminal sessions from multiple sources. |
| `src/services/ContextService.ts` | `assembleContext()` | Context service used by NewSessionDialog. |

## Types

| File | Types | Purpose |
|---|---|---|
| `src/node-pty.d.ts` | `IPty`, `spawn()` | TypeScript declarations for node-pty module. |
| `src/types/SkillPlugin.ts` | `SkillPlugin`, `SkillPluginDescriptor`, `SkillSidebarEntry`, `SkillCategory`, `WorkspaceRegistryListener` | Workspace plugin registry types. |

## Lib & Utilities

| File | Functions | Purpose |
|---|---|---|
| `src/lib/defaults.ts` | `DEFAULT_SYSTEM_PROMPT`, `getDefaultAgent()`, `setDefaultAgent()` | Default agent selection persisted to localStorage. Used by NewSessionDialog and TerminalPage. |
| `src/lib/promptAssembly.ts` | `renderSystemPrompt()`, `scopeBlockFromSelected()` | Prompt assembly with context scoping. Used by InstructionPanel. |
| `src/lib/sessionResolution.ts` | Session resolution utilities | Terminal session resolution. |

## Data / Config

| File | Content | Purpose |
|---|---|---|
| `src/data/feature-specs.ts` | `terminal` feature spec | Defines terminal feature (route, IPC methods, sub-features). |
| `src/data/tutorial-steps.ts` | Terminal workspace tutorial steps | Split panes, session management, workspace statistics tutorials. |

## App Wiring

| File | Functions | Purpose |
|---|---|---|
| `src/App.tsx` | Routes `/terminal` to TerminalPage. Manages `__workspaceHasUnsavedChanges` / `__workspaceSave` globals. Handles workspace close/leave checks on navigation. Detects `terminal-project-info` events. | Root wiring between router and workspace lifecycle. |
| `src/pages/IDEProjectsPage.tsx` | Imports TerminalPage. Has "Open Workspace" → navigates to `/terminal` with projectId/projectPath. Can write prompts to terminals via `terminalWrite`. | IDE project → workspace integration. |
