# DeskFlow — Durable Memory

- [2026-07-05] Conductor is a WORKSPACE feature, not a standalone page. It lives in the workspace sidebar (Work group → Swarm subtab). Project selection comes first (from the terminal's project dropdown), then the swarm operates on that project's path. Never build a separate repoRoot picker for it.

## Workspace Infrastructure (2026-07-27)

- **System Prompt is 8-layer:** default → general → agent-specific → project-specific → init content → thought process → auto-context → config directives. All assembled in `initializeTerminal()` in TerminalPage.tsx.
- **Context auto-injection:** `assemble-context` IPC is called during session creation with 2000 token budget. Agents automatically receive problems, requests, and sessions.
- **Workspace overlay z-index:** Must be z-[200] to cover app sidebar (z-[100]). The workspace opens as a `fixed inset-0` overlay inside IDEProjectsPage, NOT as a separate route.
- **Compose/Quick buttons:** Tooltip wrapper from shadcn was swallowing click events. Use plain `<button>` elements for action buttons, not wrapped in Tooltip.
- **Fortress Protocol:** Uses `electron:execute-command` IPC (not spawn-terminal). Returns real stdout/stderr now (was faking with 2s wait).
- **`/sync` table name:** Must use `workspace_problems` not `problems`. The old table name caused runtime errors.
- **File locks are in-memory only:** Lost on app restart despite `file_locks` DB table existing. 60-second TTL.
- **Config toggles are localStorage-only:** Not persisted to backend. Reset on app restart unless saved via workspace state.
- **Full system map:** `agent/docs/workspace-system-map.md` — single source of truth for all feature connections.

## UI Revamp Components (2026-07-27)

- **WorkspaceCommandBar:** Clean command bar with exit, project, terminal tabs, compose/quick/save. Replaces hand-rolled header.
- **WorkspaceGroupRail:** Vertical icon rail (44px) with accent-colored indicators. Replaces 6 chunky text buttons.
- **PresetsTab:** Revamped with WorkspaceCard, WorkspaceSection, animated list, proper empty state.
- **ConfigsTab:** Full component with shadcn Switch, Input, Select. Wired into TerminalPage. Live context viewer and saved workspaces sections retained below.
- **Switch component:** Created `src/components/ui/switch.tsx` (was missing). Simple accessible toggle with emerald accent.
- **WorkspaceCard:** Updated glass aesthetic: `bg-[rgba(24,24,27,0.60)]`, top-edge gradient highlight.
- **SubTabBar:** Rewritten with group-aware accent pills.
- **WorkspaceShell:** Cleaner structure with accent trunk line.

## MCP Component Inventory (2026-07-27)

- **shadcn (installed):** accordion, alert, badge, button, card, collapsible, dialog, input, select, separator, skeleton, switch, tabs, toggle, tooltip
- **Magic UI (available):** animated-beam, border-beam, magic-card, number-ticker, particles, shimmer-button, terminal
- **Lucide (installed):** 1500+ icons via lucide-react
- **Source routing:** Standard UI → shadcn, Animated effects → Magic UI, Icons → Lucide, Specific component → 21st.dev

## Design Preset System (2026-07-27)

- **Preset definitions exist:** `src/lib/designPresets.ts` — 8 presets (Cyberpunk, Minimal, Glass, Brutalist, Warm, Terminal, Ocean, Neon) with full color/geometry/typography/motion/glass/MCP mappings
- **Prompt generated:** `agent/docs/generate-prompt-docs/workspace-design-preset-system-27072026/PROMPT.md` — tasks AI with building DesignPresetManager, presetAdapter, presetPromptInjector
- **Context bundle:** `agent/docs/generate-prompt-docs/workspace-design-preset-system-27072026/CONTEXT_BUNDLE.md` — full code context for target AI
- **Design system map:** `agent/docs/workspace-system-map.md` — complete feature→IPC→DB connectivity map
- **Gap:** Preset gallery UI, adjustment knobs, preset→prompt injection, preset→component adaptation not yet built
- **Goal:** Users select a preset → tweak knobs → AI follows it consistently in prompts and UI generation
