# DeskFlow Workspace UI Revamp — Design Specification

## Role

You are the **Lead Product Designer and Frontend Engineer** for DeskFlow, a dark-themed developer productivity desktop app (Electron + React + TypeScript + Tailwind v4). You are responsible for producing an exhaustive, actionable specification for revamping the **terminal workspace UI only** — the sidebar, toolbar, terminal area, collapsed state — that a single engineer can implement over 3-5 sessions.

**This is NOT a menu of options. Produce ONE comprehensive solution with complete CSS values, component signatures, and migration paths for every part of the workspace.**

---

## Raw Request

**Scope is STRICTLY the workspace UI** — the right-side sidebar with 12 tabs, the collapsed sidebar strip, the sidebar header/resize handle, the toolbar bar (compose/quick/save), the terminal tab bar, and the terminal layout area. This is ALL contained in `src/pages/TerminalPage.tsx`.

**NOT in scope (DO NOT touch):**
- App.tsx, PageShell, or any app-level page (Dashboard, Settings, Database, Browser, etc.)
- Any page other than the workspace (TerminalPage)
- Business logic, state management, or IPC calls
- Adding or removing features from any tab's content
- Moving content between tabs

---

## Context

Read `agent/docs/workspace-ui-revamp/CONTEXT_BUNDLE.md` for the full specification including:
- 12 sidebar tab definitions with per-tab accent colors
- All tab panel content descriptions
- Architecture overview (TerminalPage.tsx layout)
- Collapsed sidebar, resize handle, header details
- Toolbar and terminal area structure
- Existing features to PRESERVE
- Important constraints

**ALSO read `agent/docs/TERMINAL_AND_WORKSPACE_FEATURES.md`** — the canonical feature inventory of ALL workspace features (31 sections). This file has the authoritative list of every tab, every dialog, every endpoint. The CONTEXT_BUNDLE is the condensed spec; the features file is the complete reference. Both must be read.

The source files are provided separately — see the provided codebase for `src/pages/TerminalPage.tsx` (primary target, ~5991 lines), sub-component files, and `src/index.css`.

### YOU MUST READ AND APPLY THESE DESIGN SKILLS:

1. **`agent/skills/frontend-design/SKILL.md`** (v3.0.0) — Core UI/UX principles, DeskFlow patterns, component conventions
2. **`agent/skills/impeccable/SKILL.md`** — 7 design domains, 23 commands, 27 anti-patterns (visual hierarchy, spacing, color, typography, motion, layout, consistency)
3. **`agent/skills/ui-ux-pro-max/SKILL.md`** — Dev tool industry-specific design rules, secondary actions styling, dark mode patterns
4. **`agent/skills/design-taste/SKILL.md`** (v1.1.0) — Master aggregator with tunable knobs: Variance=5 (moderate), Motion=5 (moderate), Density=7 (compact)
5. **`agent/skills/taste-skill/SKILL.md`** — Tunable knob definitions for the aesthetic matrix

---

## Requirements

### Requirement 1: Sidebar Container & Resize Handle

The sidebar currently has a gradient background (`from-zinc-900/95 via-zinc-900/90 to-black/95`) and a thin `border-l`.

**What to do:**
- Consolidate to a single solid background (`bg-zinc-950` is preferred)
- Make the resize handle more discoverable: wider hit area (`w-2` instead of `w-1`), visible by default as a subtle vertical line, brightens on hover/drag
- Add a subtle inner shadow or border treatment to create depth between main area and sidebar
- Provide exact CSS for the resize handle in: idle, hover, active (dragging) states

### Requirement 2: Sidebar Header

Current: cyan dot + "TERMINAL" label + Info/BookOpen/PanelLeftClose icons.

**What to do:**
- Remove the gradient overlay (`bg-gradient-to-r from-cyan-500/[0.04] to-transparent`)
- Keep the sidebar label and icons but refine spacing
- The header should feel compact and intentionally designed — currently it has `px-3 py-2.5` which is reasonable but the icon hover colors feel random (cyan for Info, violet for BookOpen)
- Propose a consistent icon accent color strategy for the header icons
- Provide exact Tailwind classes for all header elements

### Requirement 3: Tab Bar (12 Tabs)

**Current state (what exists):**
- 12 tabs in a `flex flex-wrap` container
- Per-tab accent color on active state (border-bottom-2 with tab's color)
- `text-xs font-medium` with `px-2 py-2`
- Container has `border-b border-zinc-800`

**What to do:**
- Refine the tab bar visual hierarchy — the current per-tab colors work but feel noisy with 12 tabs
- Propose one of two approaches:
  - **A) Keep per-tab color accents** but refine: subtler active indicator (maybe a small colored dot or underline instead of full `border-b-2`), muted inactive state
  - **B) Neutralize the tab bar** (all tabs same color, use icons alone for differentiation, let the content area header provide the accent color)
- Either way: smaller/wider tabs, better hit areas, clear active/inactive differentiation
- The `flex-wrap` is essential (not all 12 fit at ~350px) — design for it
- Provide the complete tab array with icon + label + hover/active states for each tab
- Consider grouping: the first 4 tabs (Presets/Sessions/Map/Analytics) all use "green" — should they be visually grouped?

### Requirement 4: Tab Content Panels

**Each of the 12 tabs has different content.** The container is:
```
<div className="flex-1 overflow-y-auto p-2">
  {activeTab === 'presets' && ( ... )}
  ...
</div>
```

**What to do per tab panel:**

For each of the 12 tabs, propose:
1. A consistent inner-container pattern (e.g., all tabs use `space-y-3` with consistent left/right padding)
2. A standardized accent treatment for each tab's content area (e.g., thin colored strip on the left side matching the tab accent)
3. Specific refinements for inline content:

| Tab | Key Refinement Areas |
|-----|---------------------|
| **Presets** | Inline add-form styling, card hover actions, edit dialog polish |
| **Sessions** | Session cards (most complex panel — cards, filters, detail view, messages), category filter pills |
| **Map** | TerminalMiniMap integration, running terminals list, resize handle between map and list |
| **Analytics** | Period selector pills, AnalyticsDashboard container sizing |
| **Issues** | Wraps IssuesWorkspace — consistent spacing around the sub-component |
| **Files** | Wraps FilesTab — consistent spacing |
| **Skills** | Wraps SkillsTab — consistent spacing |
| **Design** | Wraps DesignWorkspacePage — consistent spacing |
| **Configs** | Multiple config sections with accent-colored borders — propose standardized section card pattern |
| **History** | Placeholder state with "No records" — propose an actual future-proof layout |
| **Context** | Wraps ContextSidebar — consistent spacing |
| **Maintenance** | Wraps ContextMaintenanceTab — consistent spacing |

4. For every tab: propose standardized empty state patterns (currently inconsistent: some show "No presets yet", others show `<EmptyState>` component, others do `<p className="text-xs text-zinc-500">...`)
5. Standardize the Project Stats section at the top (currently `bg-zinc-800/50 rounded-lg p-2` — make it a proper card)

### Requirement 5: Custom Controls

The workspace uses fully hand-built controls (no Radix, no shadcn):

- **Toggles/switch buttons**: custom `<button>` elements with sliding circles — currently different sizes exist (`w-8 h-4` and `w-9 h-5` and `w-10 h-5`). Standardize to one size.
- **Sliders**: raw `<input type="range">` with inline Tailwind accent colors — standardize the appearance (thickness, thumb size, track color, accent color strategy)
- **Selects**: raw `<select>` elements with minimal styling — refine the dropdown appearance
- **Pills (filter/toggle buttons)**: currently custom in Sessions tab for categories and in Configs for model tier — standardize the pill pattern

Provide exact CSS/Tailwind for each control type in all interactive states.

### Requirement 6: Collapsed Sidebar Strip

Current: vertical icon strip with Info → BookOpen → divider → PanelLeft.

**What to do:**
- Refine the icon strip visual design — it should feel like a deliberate "tool rack" not an afterthought
- Add subtle tooltip display (or refine the `title` attribute usage)
- Propose hover animation for the expand-to-full transition (if feasible with CSS only)
- The strip currently has `bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-black/95` — match the sidebar container's new solid background

### Requirement 7: Toolbar & Terminal Area

The toolbar above the terminal tabs contains:
- Compose button (purple gradient), Quick button, Save button
- Terminal status indicator
- Instruction Panel (full mode) and Quick Instruction Input

The terminal tab bar below contains:
- Dynamic terminal tabs with drag-and-drop, group color indicators, session badges
- "+" new terminal button
- Group tabs (Group 1, Group 2...)

The terminal area below contains:
- The PaneNode layout tree (TerminalLayout)

**What to do:**
- Refine the toolbar button styling (consistent heights, font sizes, icon placements)
- The "Compose" purple gradient → standardize to a single accent color approach
- Refine the instruction panel/quick input UX — the textarea, session selector, and action buttons should feel cohesive
- Terminal tab bar: refine the tab appearance (currently `px-3 py-1.5` with group-based top border colors). Standardize the tab height, font, badges, close button
- Keep the `active:scale-95` on all interactive elements

### Requirement 8: Dialogs & Modals

All dialogs in the workspace (Save Checkpoint, Close Workspace, Confirm, SessionEdit, Features, Generalist, Messages Viewer) currently use various approaches:
- Some use `GlassCard`, some use plain `bg-zinc-800` or `bg-zinc-900` divs
- Overlay styles vary: some use `z-[var(--z-overlay)]`, some use `z-[100]`
- Some dialogs appear twice (the Confirm dialog appears in two different styles — likely a bug)

**What to do:**
- Standardize ALL workspace dialogs to use the same modal pattern:
  - Overlay: `fixed inset-0 bg-black/60 backdrop-blur-sm z-[var(--z-overlay)]`
  - Container: consistent max-width, rounded corners, padding
  - Entrance/exit: if Framer Motion is needed, use 250ms cubic-bezier
- Provide the standardized modal template

### Requirement 9: Visual Consistency Rules

Across the entire workspace, enforce these rules:

| Rule | Value |
|------|-------|
| Tab active indicator | 2px accent-colored bottom border |
| Card border radius | `rounded-lg` (preferred) or `rounded-xl` |
| Card padding | `p-3` standard, `p-4` for detail views |
| Button border radius | `rounded-lg` |
| Button padding | `px-3 py-1.5` standard, `px-2 py-1` compact |
| Font sizes | `text-[10px]` for metadata, `text-xs` for body, `text-sm` for headings |
| Section spacing | `space-y-3` within panels |
| Gap between elements | `gap-1.5` for icon+label, `gap-2` for button groups |
| Transition duration | `duration-150` for all hover/focus transitions |
| Press effect | `active:scale-95` on all interactive elements |
| Badges | `px-1.5 py-0.5 rounded-md text-[10px] font-medium` |
| Status dots | `w-1.5 h-1.5 rounded-full` |
| Scrollbar | `overflow-y-auto` with consistent scrollbar styling (consider `scrollbar-none` or thin scrollbar) |

---

## Design Skill Guidance Summary

Apply these principles from the frontend design skills:

1. **Visual hierarchy** (from `impeccable`): The 12 tabs need clear active/inactive states. The active tab should be unmistakable at a glance. Group tabs by visual proximity.
2. **Density** (from `design-taste` Density=7): Compact is good, but not at the cost of readability. 10-11px font is fine for metadata; body text should be 12-13px minimum.
3. **Motion** (from `design-taste` Motion=5): Subtle hover transitions (`duration-150`), no spring physics, no exaggerated transforms. Only CSS transitions — no Framer Motion `whileHover`.
4. **Semantic color** (from `ui-ux-pro-max`): The per-tab accent colors serve a purpose (wayfinding). Do NOT remove them entirely. Refine them if needed.
5. **Consistency** (from `impeccable`): Every similar element should look the same. Toggle switches, selects, sliders, pills, badges — pick one design and use it everywhere.
6. **Borders over shadows** (from `frontend-design`): Use subtle `border-zinc-800/50` instead of `box-shadow` for depth. The design is flatter + cleaner.
7. **Secondary actions** (from `ui-ux-pro-max`): Zinc-toned buttons for non-primary actions (Cancel, Close, Back). Colored buttons only for primary/affirmative actions.

---

## Deliverable

Produce a comprehensive spec document with:

1. **Before/After gallery**: For each major area (sidebar header, tab bar, collapsed strip, session cards, configs, controls) — describe the current issue and the proposed solution with exact Tailwind classes
2. **Component signatures**: Exact JSX structure for all modified elements
3. **CSS variable additions**: Any new CSS custom properties needed in `src/index.css`
4. **Migration order**: Recommended order of changes (which area first, what depends on what)
5. **Edge cases**: Wrapping tabs (flex-wrap behavior), narrow sidebar at minimum width, collapsed-to-expanded transition, empty states for every tab
6. **Non-goals**: Explicit "we are NOT changing" list to prevent scope creep

---

*End of PROMPT.md — generated 2026-06-05 via generate-prompt skill.*
