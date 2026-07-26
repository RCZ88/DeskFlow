# Prompt — Design a Git Safety Layer for DeskFlow

> Read `agent/docs/git-safety-layer/CONTEXT_BUNDLE.md` first for workspace context.
> Then design and spec out a complete git safety layer feature below.

## Your task

Design a **Git Safety Layer** that protects DeskFlow users from accidentally destructive git operations during terminal workspace sessions. You own the full design — UX flow, UI components, backend IPC, database/persistence, integration points. Don't just describe it: produce actual React component sketches, IPC channel specs, type definitions, and a file-by-file implementation plan.

**Do NOT implement the code.** Produce a complete design document (RESULT.md) that another AI can pick up and implement directly.

## Context given

`CONTEXT_BUNDLE.md` covers:
- DeskFlow app stack (Electron + React + Vite + Tailwind + Framer Motion)
- Terminal Workspace sidebar (5 groups with accent colors, sub-tab navigation)
- Design System primitives (`_ds/primitives.tsx`, `_ds/controls.tsx`, `_ds/motion.ts`)
- IPC architecture (preload → main.ts handlers)
- Existing backup system (ProjectBackupService, BackupTabPanel)
- Existing git IPC handlers (sync-commits, get-git-diff)
- Key files inventory

## Constraint

The AI coding agent that will implement your design has these frontend skills available. Reference them in your spec so the implementer knows what to use:

### MANDATORY: Load skill-router first
The implementer MUST load `agent/skills/skill-router/SKILL.md` before any task to map it to the correct skill load order.

### Frontend design skills (load all that apply)
- **humancentred-UIUX** (`agent/skills/humancentred-UIUX/SKILL.md`): covers 6 pillars, all 4 states (empty/loading/error/populated), hover/focus/disabled/animation, humanized copy. 
- **frontend-external-infra** (`agent/skills/frontend-external-infra/SKILL.md`): connects MCP-served component libraries. Source routing table + anti-slop checklist + DeskFlow re-skin rules.
- **impeccable**, **motion-alive**, **ui-ux-pro-max**, **frontend-design**: additional polish skills.

### MCP servers available for UI implementation
- **shadcn MCP** — standard React/Tailwind components from shadcn/ui registry
- **Magic UI MCP** — 150+ animated components (beams, particles, bento grids, text animations)
- **Lucide MCP** — 1500+ SVG icon search
- **21st.dev Magic** — prompt→polished-React-component for unique variations
- **React Bits MCP** — 135+ animated React components (CSS + Tailwind variants)
- **shadcn-ui-mcp** — v4 components, blocks, themes
- **Iconify MCP** — 200K+ icons across 200+ icon sets

### DeskFlow re-skin rules
When pulling any external component, the implementer must:
- Replace colors with `--bg-primary`, `--accent-primary`, `--page-accent` CSS vars
- Use `rounded-xl` max for corners
- Use `p-5` padding
- Use Geist / JetBrains Mono fonts
- Use `_ds/primitives` and `_ds/controls` where possible instead of hand-rolling

## What to produce

Your design document (RESULT.md) should cover:

1. **UX Flow** — Walk through the user experience step by step: typing a dangerous command, seeing a warning, confirming or cancelling, what happens on confirm (snapshot + execution).

2. **Components** — Design the UI components:
   - `GitSafetyWarning` — inline warning banner in the terminal. Sketch its states (hidden, warning-shown, confirmed, cancelled, timeout). Use the workspace design system.
   - `GitSafetyConfigPanel` — settings panel for the Setup group. Show its layout, toggle controls, pattern checkboxes. Must match existing panel styling.

3. **Backend / IPC** — Design the IPC channels, type definitions, and handler logic:
   - `git-safety:check` — parse command, match patterns, return risk level
   - `git-safety:get-settings` / `git-safety:set-settings`
   - `git-safety:get-snapshots`
   - Where in main.ts the command interception should hook in
   - How auto-snapshot uses existing `projectBackup:create`

4. **Persistence** — How settings are stored (localStorage per projectId, using try/catch). What settings schema.

5. **Integration** — How it plugs into TerminalPage.tsx (new subtab in Setup group), IPC wiring in preload.ts, command interception in the PTY write path.

6. **Edge cases** — What happens when multiple terminals are open, rapid-fire commands, partial matches, non-git commands that look like git, CONFIRM in the terminal buffer vs a pending confirmation, what about pasted multi-line commands.

7. **Empty / Loading / Error states** — Every component must define what it looks like when there's no data, when loading, when an error occurred, and when populated. No blank screens.

8. **Verification checklist** — How the implementer should test each flow.

## Output format

Produce `agent/docs/git-safety-layer/RESULT.md` with the complete design. Use markdown headings, code blocks for types/sketches, and clear file-by-file implementation ordering.
