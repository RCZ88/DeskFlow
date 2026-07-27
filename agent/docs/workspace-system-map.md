# DeskFlow Workspace — Full System Connectivity Map

> Generated: 2026-07-27 | Purpose: Single source of truth for how every workspace feature connects.

## Sidebar Structure

| Group | Accent | Subtabs | Primary Component |
|-------|--------|---------|-------------------|
| Setup | orange | Presets, Configs, Fortress | `PresetsTab`, `ConfigsTab`, `FortressProtocolSetup` |
| Work | green | Sessions, Map, Files, Workspaces | Inline in TerminalPage, `TerminalMiniMap`, `FilesTab`, `WorkspacesPanel` |
| Insights | purple | Analytics, Prompts, Issues, Performance, Bugs | `AnalyticsDashboard`, `PromptHistoryTab`, `IssuesWorkspace`, `PerformanceMetricsPanel`, `BugReportPanel` |
| Studio | indigo | Skills, Design | `SkillsTab`, `DesignWorkspacePage` |
| Conductor | rose | Missions, Approvals, Trace, Budget, Providers, Templates, Settings | `ConductorWorkspaceTab` |
| Context | amber | Context, Maintenance, Context Map, Page Context | `ContextSidebar`, `ContextMaintenanceTab`, `WorkspaceMindMap`, `PageContextPanel` |

## Feature → IPC → DB Table Mapping

| Feature | IPC Channels | DB Tables |
|---------|-------------|-----------|
| Initialize/Provision | `tracker-mind-setup`, `watch-agent-files`, `agent-file-changed` | Files on disk (agent/) |
| New Agent Session | `spawn-terminal`, `agent:send`, `agent:verify`, `agent:ready`, `agent:timeout`, `agent:init-error`, `save-terminal-session`, `capture-opencode-session-id` | `terminal_sessions`, `terminal_messages`, `terminal_bindings`, `ai_tasks` |
| Fortress Protocol | `electron:execute-command` | Files on disk (C:\Scripts\) |
| Presets | `get/add/save/remove/execute-terminal-preset` | `terminal_presets` |
| Sessions | `get/save/delete/update-session-*`, `get-session-messages`, `summarize-session`, `analyze-session-category` | `terminal_sessions`, `terminal_messages` |
| Configs | `get/save-auto-assign-config`, `set-reinject-threshold`, `set-model-debug`, `set-cross-session-sync-config`, `get-routing-costs` | `auto_assign_config`, `cross_session_sync_config`, `routing_costs` |
| Files | `read-agent-files`, `read-agent-file`, `watch-agent-files` | Files on disk (agent/) |
| Workspaces | `workspace:save/load/list/delete/list-all` | `workspace_state` |
| Analytics | `get-ai-usage-summary`, `get-problems`, `get-requests`, `get-prompt-history`, `get-daily-aggregates` | `ai_usage`, `workspace_problems`, `workspace_requests`, `prompt_history` |
| Context | `get-context-systems`, `assemble-context`, `get-session-summaries`, `get-deep-memory`, `get-rag-stats` | Files on disk + DB queries |
| Terminal Layout | `save/get/delete/set-active-terminal-layout` | `terminal_layouts` |
| Auto-Assign Routing | `route-prompt`, `update-session-summary`, `get-routing-costs` | `routing_costs`, `terminal_sessions` |
| Cross-Session Sync | `lock-file`, `release-file-lock`, `get-file-locks`, `get-touched-files`, `compile-sync-summary`, `broadcast-context-delta` | `file_locks`, `touched_files` |
| System Prompt Assembly | `get-preferences`, `save-base-system-prompt`, `assemble-context` | `preferences` |

## System Prompt Assembly Pipeline

```
initializeTerminal() builds 8-layer prompt:
├── Layer 1: DEFAULT_SYSTEM_PROMPT (from src/lib/defaults.ts)
├── Layer 2: generalAdditions (preferences.systemPrompts.generalAdditions)
├── Layer 3: Agent-specific (preferences.systemPrompts[agent])
├── Layer 4: Project-specific (preferences.systemPrompts[projectId])
├── Layer 5: Init content (session-specific)
├── Layer 6: Thought process directive (if enabled)
├── Layer 7: Auto-assembled context (assemble-context IPC → problems, requests, sessions)
└── Layer 8: Workspace config directives (sync enabled, debug mode)
```

## Terminal Initialization Sequence

```
1. User clicks "New Session" or "Resume"
2. spawnTerminal(id, cwd, agent) → creates node-pty
3. initializeTerminal() fires:
   a. verifyAgent(agent) → checks PATH
   b. Wait for terminal:ready event
   c. Clear terminal screen
   d. Validate resumeId against opencode DB
   e. Write banner
   f. Write launch command: cd + agent + resumeFlag
   g. Wait for agent:ready event
   h. Build 8-layer system prompt
   i. Auto-inject context via assemble-context
   j. Send combined prompt via agent:send
4. agentSend queues if agent still launching, flushes when ready
5. Session saved via save-terminal-session
6. Terminal binding registered
7. Background: capture-opencode-session-id after 5s
```

## Cross-Session Sync Flow

```
File Locks:
  acquireLock(filePath, terminalId) → in-memory Map + 60s TTL
  detectEditsInOutput() → auto-acquires locks on file writes
  getFileLocks() → returns all active locks
  file:conflict event → sent to renderer on conflict

Context Broadcast:
  onContextChanged event → fired on problem/request create/update
  TerminalPage listener → refreshes lists, writes system message

/sync Command:
  compile-sync-summary → queries other terminals' bindings, problems, touched files
  Returns markdown summary → sent to terminal via agentSend
```

## Workspace Save/Load State

```
workspace:save serializes:
  - terminal tabs (name, agent, modelTier)
  - pane layout tree
  - scrollback data
  - active group/subtab
  - sidebar width
  - presets
  - configs (model settings, sync flags, thought process)
  - analytics period
  - session category filter
  - active subtabs (localStorage)
  - session details (last 50)
  - map-list ratio

workspace:load restores:
  - All of the above
  - Re-spawns terminals via create-terminal events
  - Re-imports scrollback after 3s delay
```

## Pending Items

| # | Item | Status | Priority |
|---|------|--------|----------|
| 1 | Wire ConfigsTab into TerminalPage | Created, needs wiring | High |
| 2 | Revamp Sessions tab | Not started | High |
| 3 | Revamp Files tab | Not started | Medium |
| 4 | Persist file locks to DB | Deferred | Low |
| 5 | Context toggles persistence | Deferred | Low |

## MCP Components Available

**shadcn (installed):** accordion, alert, badge, button, card, collapsible, dialog, input, select, separator, skeleton, switch, tabs, toggle, tooltip

**Magic UI (available):** animated-beam, border-beam, magic-card, number-ticker, particles, shimmer-button, terminal

**Lucide (installed):** 1500+ icons via lucide-react
