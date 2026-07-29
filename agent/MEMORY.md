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

## Dashboard MCP Card Improvements (2026-07-30)

- **MagicCard for interactive cards:** Mouse-following gradient gives visual personality without "AI slop". Use on hero/stat cards (MomentumHero, QuickFocusCard) where hover interaction makes sense.
- **BorderBeam for conditional urgency:** Render BorderBeam only when state is active/urgent (e.g., `activeGoals.length > 0`). Creates visual hierarchy — glowing cards draw attention to what matters.
- **BorderBeam color mapping:** Goals=emerald (#10b981→#34d399), Deadlines=rose→amber (#f87171→#fbbf24), AI=violet (#8b5cf6→#a78bfa), Focus=violet (#8b5cf6→#6366f1), Momentum=pink (#ec4899→#f472b6).
- **Particles behind data charts:** Particles as absolute-positioned background behind Chart.js bars adds depth without interfering with data rendering. Use `pointer-events-none` and low quantity (30).
- **Marquee conflicts with interactivity:** Marquee auto-scroll breaks click targets and edit mode. Skip when card has interactive children (buttons, toggles, edit mode). Only use on purely display elements.
- **MagicCard adapted for Electron:** The installed magic-card.tsx already removed `next-themes` dependency and hardcoded dark mode colors (#18181b background). No additional adaptation needed.
- **NeonGradientCard available but heavy:** NeonGradientCard works but uses CSS pseudo-elements with complex calculations. Prefer MagicCard for mouse-following effects, BorderBeam for edge glow.

## StopwatchTimer Glow Fix (2026-07-30)

- **BorderBeam alone is too subtle:** A thin animated line on the border isn't enough for a "glow" effect. Combine with CSS box-shadow for visible radiance.
- **Box-shadow glow approach:** Use `box-shadow: 0 0 20px 2px rgba(R,G,B,alpha), inset 0 0 30px 1px rgba(R,G,B,alpha)` for always-visible glow. Outer shadow = card radiance, inner shadow = internal glow.
- **Always-on vs conditional:** The glow should ALWAYS be visible (idle state = subtle, active state = brighter). Conditional rendering makes the glow disappear when idle, which looks broken.
- **Tier color mapping for glow:** Convert hex to RGB for box-shadow: productive=#10b981→16,185,129; distracting=#ef4444→239,68,68; neutral=#3b82f6→59,130,246; external=#8b5cf6→139,92,246.
- **BorderBeam thickness:** borderWidth=2 is visible; borderWidth=1.5 is too thin. Duration: 6s when active (faster animation), 12s when idle (slower, calmer).

## MagicCard Component Fix (2026-07-30)

- **Original MagicCard hardcoded colors:** The installed magic-card.tsx had hardcoded pink (#ec4899) and purple (#a855f7) in the gradient template, ignoring any props passed.
- **Fix:** Add `gradientFrom` and `gradientTo` props to MagicCard interface and use them in the template literal.
- **Inner overlay:** Changed from `bg-zinc-900/95` to `bg-[rgba(24,24,27,0.80)] backdrop-blur-xl` to match the project's glass pattern.
- **Dashboard layout swap:** QuickFocusCard moved to center position (between GoalsCard and DeadlinesCard) per user request.
