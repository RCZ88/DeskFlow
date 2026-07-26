# Terminal Workspace — UI Revamp Pass 2 (the surfaces you actually see)

## Why the last pass looked unchanged
The first revamp only touched the sub-tab CONTENT components. But the pages you
look at every day — Setup ▸ Presets, Work ▸ Sessions, all the toolbar buttons,
the session/preset cards, and the New Session dialog — are rendered directly
inside `TerminalPage.tsx` using a SECOND, local set of primitives
(`ToolbarButton`, `Toggle`, `WS_SELECT`, `Pill`, `SectionCard`, `GroupPanel`)
that HARD-CODED bright cyan/blue/green. So you got colored tabs on top of a raw
cyan UI — it never felt like one system.

## What this pass does
Rewires those local primitives + the visible inline surfaces onto the per-group
accent (`--page-accent`) with a glass treatment, so every button/toggle/select/
card adopts the current group's color (Setup=orange, Work=green, Insights=purple,
Studio=indigo, Context=amber) instead of cyan.

### Files changed (2)
1. `src/pages/TerminalPage.tsx`
2. `src/components/NewSessionDialog.tsx`

### TerminalPage.tsx
- Added `GROUP_ACCENT_HEX` map + `accentStyle()` helper.
- `GroupPanel` and `SectionCard` now SET `--page-accent` (as a real hex) on their
  root, so all descendants inherit the group accent. `SectionCard` upgraded to
  glass (`bg-zinc-900/50 backdrop-blur-sm ring-1 ring-inset ring-zinc-800/70`,
  rounded-xl).
- Also set a default `--page-accent` on the main terminal area and on the local
  `Modal` panel so primary buttons in the composer + Save/Save As/Preset dialogs
  are never left without an accent.
- `ToolbarButton` primary: bright solid cyan  ->  accent fill with inset ring +
  soft shadow (drives New Session, Import, Save, Load, Save As, Add Preset, etc.).
  Secondary  ->  glass zinc.
- `Toggle`: cyan  ->  accent (track + focus ring).
- `WS_SELECT`: cyan focus  ->  accent focus ring + border.
- Preset cards + session cards: flat `bg-zinc-800`  ->  glass
  (`bg-zinc-900/50 backdrop-blur-sm ring-1 ring-inset`) with an accent hairline on
  hover. Add-Preset inner Save button  ->  accent.

### NewSessionDialog.tsx
- Panel now carries a brand accent var (`--page-accent: #2dd4bf`).
- The four `<select>` dropdowns (AI Agent, Model Tier, terminal picker, custom
  init) lose their muted zinc focus ring and now focus with the accent.

### Kept intentionally (NOT reverted)
Semantic colors stay: status pills, error reds, init-success greens, read/write
file-direction dots, running-terminal emerald, per-group tab accents.

## How to apply
1. Copy the two files over the same paths in the repo
   (`App Tracker/src/pages/TerminalPage.tsx`,
    `App Tracker/src/components/NewSessionDialog.tsx`).
2. Rebuild the renderer bundle (the app shows the OLD UI until you rebuild).
3. Hard-reload the window.

## Verify
- Open Setup ▸ Presets: the **Add Preset** button + Save are ORANGE, cards are glass.
- Open Work ▸ Sessions: **New Session** is GREEN, session cards are glass with a
  green hover hairline; Import/Save/Load/Save As are glass zinc.
- Switch groups: buttons/toggles recolor to that group's accent.
- Open New Session dialog: selects focus with a teal ring.

## Notes
- No new deps. Windows/CRLF preserved.
- Pre-existing TS18046/18048 warnings in GeneralistDialog/ProblemsTab/SkillsTab
  are unrelated to this pass (isolation-check artifacts).
