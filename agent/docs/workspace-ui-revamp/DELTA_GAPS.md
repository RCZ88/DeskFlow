# DELTA: Gaps to fill in RESULT.md

> **Purpose:** This document lists features from the canonical inventory (`TERMINAL_AND_WORKSPACE_FEATURES.md`) that are **absent or under-specified** in RESULT.md. Use it alongside RESULT.md to produce a complete specification. Every design choice here **must** follow RESULT.md's existing tokens, components, and rules — no new tokens, no new design language.

---

## Gap A — Toolbar: missing elements (insert after Req 7.1)

RESULT.md covers Compose, Quick, Save, and terminal binding. The toolbar also needs:

### A.1 Project Selector

Current state: raw `<select>` dropdown listing projects from `deskflowAPI.getProjects()`.

**Design:** A compact `<select>` using the `ws-select` class (from RESULT.md Req 5.3). Positioned at the left of the toolbar, before the other buttons. Width `max-w-[180px]`. Same `h-7` as `ToolbarButton`.

```
[Project Selector (ws-select, h-7)] [Project Info Badge] [Open Terminal] [Setup] ...rest of toolbar
```

### A.2 Project Info Badge

Current state: inline element showing project name, green dot, path, language, VCS type.

**Design:** Use the same pattern as RESULT.md's terminal status indicator (Req 7.1):
- `inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-zinc-800/60`
- `w-1.5 h-1.5 rounded-full bg-green-400` dot + project name (`text-[11px] text-zinc-300`)
- On hover: show path + language + VCS as a tooltip using `ws-tip` (or a `title` attribute)

### A.3 Open Terminal Button

Current state: creates new terminal tab + layout entry, distinct from the tab-bar "+".

**Design:** `ToolbarButton variant="secondary"` with a `Plus` icon. Label = "Terminal". Positioned between Project Info Badge and Setup.

### A.4 Setup Button

Current state: opens `NewSessionDialog` in `'initialize'` mode.

**Design:** `ToolbarButton variant="secondary"` with a `Settings` or `Wrench` icon. Label = "Setup". Positioned after Open Terminal. Color = amber tone if it needs distinction (use `bg-zinc-800 hover:bg-zinc-700 text-zinc-200` as the standard secondary, no special color).

### A.5 Toolbar layout (combining RESULT.md 7.1 + A.1–A.4 above)

```
flex items-center gap-2 px-3 h-9 border-b border-zinc-800/60 bg-zinc-950
```

Left group: Project Selector (ws-select) | Project Info Badge | Open Terminal | Setup

Right group (existing from Req 7.1): Terminal Binding Badge | Compose | Quick | Save

Separator between groups: `w-px h-5 bg-zinc-800` (same hairline used between tab groups in Req 3).

---

## Gap B — Full InstructionPanel (insert after Req 7.2)

RESULT.md Req 7.2 covers the **quick** inline input. The workspace also has a **full** `InstructionPanel` component (`src/components/InstructionPanel.tsx`) with rich compose controls. This is the panel that opens when the user clicks the Compose button.

### B.1 Full InstructionPanel layout

The InstructionPanel is a larger compose surface with multiple sections. Wrap the entire component in the canonical card:

```
rounded-lg border border-zinc-800/60 bg-zinc-900 p-3 space-y-3
```

**Sections (top to bottom):**

| Section | Design |
|---------|--------|
| **Mode selector** | Row of `Pill` components: "Compose" / "Quick". Active = high-contrast `bg-zinc-200 text-zinc-900`. Quick compacts the panel to just the textarea (hides problem/request/skill selectors). |
| **Problem/Request checkboxes** | Two `Toggle` components (from Req 5.1) labeled "Link problem" and "Link request". Each toggle reveals a `<select className="ws-select">` dropdown below it when enabled, listing available problems/requests. |
| **Skill selector** | `<select className="ws-select max-w-[200px]">` listing available skills from `getSkills()`. Labeled with a `text-[10px] font-semibold uppercase tracking-wider text-zinc-500` header above it. |
| **Custom instruction textarea** | Same textarea as Req 7.2's quick input: `w-full min-h-[80px] rounded-md bg-zinc-950 border border-zinc-800/60 px-2.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 resize-y ws-scroll focus:border-cyan-500/60 focus:outline-none transition-colors duration-150`. |
| **Agent file picker** | `<select className="ws-select max-w-[200px]">` listing available agent files. Labeled with `text-[10px]` header. |
| **Prompt preview** | `rounded-md bg-zinc-950 border border-zinc-800/60 p-2 text-[11px] text-zinc-400 font-mono max-h-[200px] overflow-y-auto ws-scroll`. Shows read-only assembled prompt. |
| **Action buttons** | Footer row: `flex items-center justify-between gap-2`. Left: select `<select className="ws-select max-w-[160px]">` for session target. Right: `ToolbarButton variant="secondary"` (Save) + `ToolbarButton variant="primary" icon={Send}` (Send). |

### B.2 Auto-persist

The textarea content auto-saves to `localStorage` key `compose-instruction` on every keystroke (debounced). On open, restore from localStorage. This logic already exists — the visual design doesn't change the behavior.

---

## Gap C — Terminal tab bar: missing indicators (insert after Req 7.3)

RESULT.md Req 7.3 defines the terminal tab chrome. Three elements are missing:

### C.1 File lock count

Current state: a small number badge on the tab showing how many files the terminal has locked.

**Design:** After the model tier badge, add a lock count indicator:
```tsx
{fileLockCount > 0 && (
  <span className="px-1 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400">
    {fileLockCount}
  </span>
)}
```
Use the standard badge dimensions (`px-1.5 py-0.5 rounded-md text-[10px] font-medium`) with `bg-amber-500/15 text-amber-400` tone.

### C.2 Session indicator "S"

Current state: a small "S" badge on the tab when the terminal has an active session bound.

**Design:** After the file lock count (or after tier badge if no locks), add:
```tsx
<span className="px-1 py-0.5 rounded text-[10px] font-medium bg-cyan-500/15 text-cyan-400">
  S
</span>
```

### C.3 Drag-to-reorder

Current state: DnD drag-and-drop within/between terminal groups. Not a visual redesign request — just **acknowledge** in the spec that existing drag behavior is preserved, and note that the tab's padding accounts for the drag handle (no special handle needed, the whole tab is draggable). Add a note to the terminal tab spec:
> *Drag-and-drop reorder (existing @dnd-kit behavior) is unchanged. The `h-8` tab height leaves sufficient hit area for drag initiation. No visual drag handle is added — the entire tab is the handle.*

---

## Gap D — Terminal layout area (insert after Req 7.3)

RESULT.md's Req 7 says "TerminalLayout unchanged." Three visible elements in the terminal area ARE in scope:

### D.1 Terminal Error Notification Bar

Current state: dismissible notification bar (red/yellow/green based on type) that appears in the terminal area.

**Design:** A horizontal bar above the terminal panes:
```tsx
<div className={[
  'flex items-center justify-between gap-2 px-3 h-8 text-[11px] font-medium',
  type === 'error' ? 'bg-red-500/10 text-red-400 border-b border-red-500/20' :
  type === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border-b border-yellow-500/20' :
  'bg-green-500/10 text-green-400 border-b border-green-500/20',
].join(' ')}>
  <span>{message}</span>
  <button onClick={onDismiss} className="ws-icon-btn"><X className="w-3 h-3" /></button>
</div>
```
- Fixed `h-8` height to align with the toolbar grid.
- Dismiss button uses the `ws-icon-btn` class from Req 2.
- Uses `bg-*-500/10` backgrounds and `border-*-500/20` bottom borders for subtle color without competing with the tab accents.

### D.2 Terminal Empty State

Current state: "+ Open Terminal" button shown when no terminals exist.

**Design:** Use the `EmptyState` component from RESULT.md Req 4.3:
```
icon: Monitor (or Terminal)
title: "No terminals open"
hint: "Create a terminal to start working"
action: <ToolbarButton variant="primary" icon={Plus}>Open Terminal</ToolbarButton>
```

### D.3 Agent Status Overlay

Current state: "Initializing agent..." (cyan pulsing) or "Agent failed. Click to retry." (amber) overlaid on the terminal pane.

**Design:** A centered overlay div positioned over the terminal pane:
```tsx
<div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm z-10">
  <div className="flex flex-col items-center gap-2 p-4">
    {status === 'initializing' && (
      <>
        <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-xs text-zinc-300">Initializing agent...</span>
      </>
    )}
    {status === 'failed' && (
      <>
        <span className="w-3 h-3 rounded-full bg-amber-400" />
        <span className="text-xs text-zinc-300">Agent failed.</span>
        <ToolbarButton variant="secondary">Retry</ToolbarButton>
      </>
    )}
  </div>
</div>
```
- Uses `bg-zinc-950/60 backdrop-blur-sm` for the overlay (same overlay style as REQ 8 `Modal`'s backdrop).
- The pulsing cyan dot uses Tailwind's `animate-pulse` — no Framer Motion needed.
- Move this from the "non-goals" list — it IS visible UI, not terminal internals.

---

## Gap E — Sessions tab header (insert after Req 4.4 Sessions row)

RESULT.md's Sessions tab refinement covers cards, pills, detail view, and messages. Missing header buttons.

### E.1 New Session Button

**Design:** `ToolbarButton variant="primary"` with `Plus` icon. Label = "New Agent". Positioned in the Sessions tab panel header (top of the panel, before the filter pills row). Opens `NewSessionDialog`.

### E.2 Import Button

**Design:** `ToolbarButton variant="secondary"` with `Upload` or `Download` icon. Label = "Import". Positioned next to New Session. Opens `ImportSessionsDialog`.

### E.3 Save/Load Workspace Buttons

**Design:** Two `ToolbarButton variant="secondary"` buttons. Save = `Save` icon + "Save". Load = `FolderOpen` (or `FolderUp`) icon + "Load". Positioned inline after Import. These persist/restore the full workspace layout (sidebar config, tab state, terminal layout).

### E.4 Sessions header layout

```
flex items-center justify-between mb-3
Left: <h2> header label (or empty)
Right: [New Agent (primary)] [Import (secondary)] [Save (secondary)] [Load (secondary)]
```

Then below: the category filter pills row (existing from RESULT.md).

### E.5 Context Menu (right-click on session cards)

Current state: right-click on a session card shows "Open in Terminal" submenu listing running terminals.

**Design:** Use the same modal approach as RESULT.md's Req 8 — a small context menu dialog positioned at the click point. Styling:
```
rounded-lg border border-zinc-800/60 bg-zinc-900 p-1 shadow-lg
```
Each item:
```
px-2.5 h-7 text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-md
```
Use `onContextMenu` to preventDefault and position a small `<div className="fixed z-[var(--z-overlay)]">` at the cursor.

---

## Gap F — Additional dialogs (insert into Req 8 applies-to list)

RESULT.md Req 8 defines the `Modal` shell and lists: Save Checkpoint, Close Workspace, Confirm, SessionEdit, Features, Generalist, Messages Viewer, Edit Preset.

Add these dialogs — each uses the same `Modal` template with zero custom styling:

### F.1 NewSessionDialog

**Source:** `src/components/NewSessionDialog.tsx`

**Design:** Same `Modal` template from Req 8. Width: `max-w-lg`.
- Header: "New Agent" / "Setup"
- Body contains: two `Pill` toggle modes (Create / Initialize), terminal mode `<select className="ws-select">`, 6 context system toggles (each = `flex items-center justify-between py-1` with `Toggle` + label), token budget slider (`.ws-range`), context map visualization (small bordered card, `p-2 text-[11px]`, shows which systems enabled).
- Footer: Cancel (secondary) + Create/Initialize (primary cyan)

### F.2 InitializeProgressModal

**Source:** `src/components/InitializeProgressModal.tsx`

**Design:** Same `Modal` template. Width: `max-w-xl` (wider for progress content).
- Header: "Initializing workspace"
- Body: grouped progress list. Each directory group: `SectionCard` (from Req 4.5) with group name + progress counter. Each file row: `flex items-center gap-2 h-7 text-[11px]`. Expandable file preview: click row to reveal `p-2 text-[10px] font-mono bg-zinc-950 rounded-md` content block (uses `ws-scroll`). Error rows: red dot + retry button.
- Footer: Close (secondary). Auto-closes on success → shows "Workspace Ready" green summary card instead.

### F.3 ImportSessionsDialog

**Source:** `src/components/ImportSessionsDialog.tsx`

**Design:** Same `Modal` template. Width: `max-w-md`.
- Header: "Import Sessions"
- Body: instructions in `<p className="text-xs text-zinc-400">`, a `rounded-md bg-zinc-950 border border-zinc-800/60 p-2 text-[11px] font-mono text-zinc-300` code block showing the CLI command, and a "Run Import" button.
- Footer: Cancel (secondary) + Import (primary)

### F.4 RoutingDisambiguationDialog

**Source:** `src/components/RoutingDisambiguationDialog.tsx`

**Design:** Same `Modal` template. Width: `max-w-md`.
- Header: "Route instruction"
- Body: list of running terminals as radio-style rows. Each row: `flex items-center gap-2 h-9 px-2 rounded-md hover:bg-zinc-800/50 cursor-pointer`. Selected row = `bg-zinc-800 border border-zinc-700`. Shows terminal name + dot + agent type.
- Footer: Cancel (secondary) + Route (primary)

### F.5 RoutingToast

**Source:** not a modal — it's a transient toast notification. Position: `fixed bottom-4 right-4 z-[var(--z-overlay)]`.

**Design:**
```
rounded-lg border border-zinc-800/60 bg-zinc-900 p-3 shadow-lg
flex items-center gap-2 min-w-[200px] max-w-[320px]
```
With icon (`w-4 h-4` cyan or amber), message (`text-xs text-zinc-300`), and dismiss button (`ws-icon-btn` size `w-5 h-5`). Entrance: `animate-[ws-modal-in_250ms_ease]` (reuse the modal animation keyframe). Exit: no animation needed (unmount).

### F.6 PromptDesignDialog

**Source:** `src/components/PromptDesignDialog.tsx`

**Design:** Same `Modal` template. Width: `max-w-lg`.
- Header: "Design Prompt"
- Body: split into sections. Each section = a card (`rounded-lg border border-zinc-800/60 bg-zinc-900 p-3`). Contains: instruction textarea, skill selector (`ws-select`), generate button.
- Footer: Cancel (secondary) + Generate (primary)

### F.7 DSLGenerationModal

**Source:** `src/components/DSLGenerationModal.tsx`

**Design:** Same `Modal` template. Width: `max-w-md`.
- Header: "Generate DSL"
- Body: config inputs (text field using `ws-input` from Req 4.5 placeholder), preview area (`rounded-md bg-zinc-950 border border-zinc-800/60 p-2 text-[11px] font-mono ws-scroll`).
- Footer: Cancel (secondary) + Generate (primary)

### F.8 Modal width reference (update Req 8 width table)

| Dialog | Width |
|--------|-------|
| Save Checkpoint | `max-w-md` |
| Close Workspace | `max-w-sm` |
| Confirm | `max-w-sm` |
| SessionEdit | `max-w-md` |
| Features | `max-w-xl` |
| Generalist | `max-w-lg` |
| Messages Viewer | `max-w-lg` |
| Edit Preset | `max-w-sm` |
| **NewSessionDialog** | `max-w-lg` |
| **InitializeProgressModal** | `max-w-xl` |
| **ImportSessionsDialog** | `max-w-md` |
| **RoutingDisambiguation** | `max-w-md` |
| **PromptDesignDialog** | `max-w-lg` |
| **DSLGenerationModal** | `max-w-md` |

---

## Gap G — Non-goals update (amend Req 7 / Deliverable 6)

Two items were incorrectly listed as non-goals. Move them INTO scope:

1. **Terminal error notification bar** (Gap D.1) — visible UI bar in the terminal area. IS in scope.
2. **Agent status overlay** (Gap D.3) — visible UI overlay on terminal pane. IS in scope.

True non-goals remain:
- `TerminalLayout`/PaneNode/xterm internals unchanged
- Hover overlay controls (split/close) unchanged
- Split handle dragging unchanged
- All logic, state, IPC, DnD handlers unchanged

---

## Gap H — Before/After gallery additions (append to RESULT.md Deliverable 1)

| Area | Before | After |
|------|--------|-------|
| Project Selector | raw native `<select>` | `ws-select h-7 max-w-[180px]` |
| Project Info Badge | inline text | `h-7 px-2.5 rounded-lg border` with dot + tooltip |
| Open Terminal button | (not consistently styled) | `ToolbarButton` secondary with Plus |
| Setup button | (not consistently styled) | `ToolbarButton` secondary |
| InstructionPanel | separate component, no card | `rounded-lg border ... bg-zinc-900 p-3 space-y-3` card |
| File lock count on tab | ad-hoc badge | `px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400` |
| Session "S" indicator | ad-hoc badge | `px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400` |
| Error notification bar | various ad-hoc colors | `h-8 px-3` bar with `bg-*-500/10 border-*-500/20` |
| Empty terminal state | raw button | `EmptyState` component (icon + title + hint + primary button) |
| Agent status overlay | raw centered div | `bg-zinc-950/60 backdrop-blur-sm` with pulse dot |
| Sessions header | (no consistent pattern) | `flex justify-between` with New/Import/Save/Load buttons |
| NewSessionDialog | `GlassCard` or plain | `Modal` template `max-w-lg` |
| InitializeProgressModal | `GlassCard` or plain | `Modal` template `max-w-xl` with `SectionCard` groups |
| Other dialogs (Import, Routing, etc.) | various | `Modal` template |
| RoutingToast | plain div | `rounded-lg border shadow-lg` with entrance animation |
