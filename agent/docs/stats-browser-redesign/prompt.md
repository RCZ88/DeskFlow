# Design Prompt: StatsPage + BrowserActivityPage Redesign

## Raw Request

> i think the app usage and the website usage page is very much outdated. we need a new design. i want you to use all frontend skills and i want you to use all mcp to add as an aesthetic stuff to the prompt as a suggestion. make sure that all components stay and only make additions and improvements but all details like viewing the details of each app, and the charts and the live things, should still be there.

---

## Problem Statement

Both the "Applications" page (`/stats`) and "Browser Activity" page (`/browser`) are data-dense and feature-complete but visually outdated — they lack modern design polish, smooth micro-interactions, visual hierarchy, and aesthetic refinement. The data and functionality are solid, but the presentation feels flat and unrefined compared to other pages in the app (Dashboard, External Page, etc.). The goal is a **visual overhaul only**: every existing component, chart, card, modal, and live tracking element must remain, but each should be elevated with better spacing, typography hierarchy, motion design, glassmorphic depth, and subtle atmospheric effects.

---

## Context

Read `agent/docs/stats-browser-redesign/CONTEXT_BUNDLE.md` **first** before designing anything. This file contains:
- Full source code structure and line counts for both pages
- Every interface, type, and data structure
- All IPC endpoints and their payloads
- Complete design tokens (colors, typography, spacing, animation)
- Layout schematics (what goes where, top to bottom)
- Existing component library (GlassCard, SectionHeader, PageShell)
- Hard constraints (must not remove, must not break)

**IMPORTANT:** Include the CONTEXT_BUNDLE.md content in your message to the Architect AI — it does NOT have filesystem access. The bundle replaces direct codebase access.

The bundle is your codebase. The current implementation works correctly — do not change any data processing logic, IPC calls, state management patterns, or existing component props/APIs. All changes must be purely additive to the visual layer.

---

## The Mandate

**Design a single, comprehensive visual redesign** for both pages that makes them look polished, modern, and cohesive with the rest of DeskFlow's glassmorphic design language. Do NOT propose options — produce one definitive solution. Act as Lead Designer and Engineer, owning everything from the visual spec to the interaction flow.

---

## Requirements

### A. Engineering Task — Visual Architecture

1. For every section on both pages, define the **visual hierarchy** (what draws the eye first, second, third) using the existing color system — accent colors, opacity layers, and spacing
2. Define **consistent spacing improvements**: section padding, card gap, inner padding, label-value alignment
3. Propose **chart container upgrades**: better use of chart.js plugin system, gradient fills, glow effects, smoother tooltips, glass backgrounds behind chart canvases
4. Design a **typography refinement** pass: label sizing, value sizing, monospace vs sans-serif discipline, tracking/letter-spacing for data displays
5. Design **empty state, loading state, and error state** improvements for every data section (not just the page-level fallbacks that exist today)
6. If any section lacks a proper empty state (e.g., no data while loading), add one

### B. Design Task — Visual Specifications

For each section listed in the Layout Structure section of CONTEXT_BUNDLE.md, provide:
- **Before/after intent** — what visually changes
- **Exact hex colors** — any new color tokens introduced (must stay within DeskFlow's zinc+accent palette)
- **Spacing deltas** — what padding/margin/gap values change and to what
- **Motion recipe** — entrance animation, hover micro-interaction, data transition (count-up, stagger, fade)
- **Glass depth** — which sections get more/less backdrop blur, which get border glow on hover
- **Chart polish** — gradient fills, stroke widths, legend/tooltip restyling, animation curves

### C. UX Task — Interaction Flow

1. **Micro-interactions**: define hover states, active states, loading skeletons, transition animations for every interactive element (cards, buttons, chart hover, accordion expand, modal open/close)
2. **Modal improvements**: App Detail Modal and Domain Detail Modal — improve content density, readability, visual flow between metrics, charts, and session list
3. **Live Detection panel**: improve the terminal-log aesthetic — better log level coloring, filtering controls, search
4. **Period navigation**: improve the chevron + button pill navigation styling, make period changes feel smooth with chart transitions
5. **Time Lock toggle**: integrate more naturally into the header

---

## Skills You MUST Load and Follow

These are not optional. Load every SKILL.md and follow its instructions:

| Skill | File | What It Enforces |
|-------|------|------------------|
| **frontend-design** | `agent/skills/frontend-design/SKILL.md` | DeskFlow-specific UI patterns, glass tokens, anti-patterns, per-page accent colors, spacing scale |
| **humancentred-UIUX** | `agent/skills/humancentred-UIUX/SKILL.md` | 6 pillars of UX, complete state coverage (empty/loading/error/populated), 9 anti-patterns, 44px touch targets |
| **impeccable** | `agent/skills/impeccable/SKILL.md` | 7 domain references (type, color, space, motion, interaction, responsive, UX writing), 23 commands, 27 anti-patterns |
| **ui-ux-pro-max** | `agent/skills/ui-ux-pro-max/SKILL.md` | Industry rules (Developer Tools/Analytics), 10 style references, color pairing, pre-delivery checklist |
| **design-taste** | `agent/skills/design-taste/SKILL.md` | Master aggregator, design variance=5 (balanced), motion intensity=5 (moderate), visual density=7 (dense) |
| **taste-skill** | `agent/skills/taste-skill/SKILL.md` | 3 tunable knobs, anti-repetition rules (font rotation, color shift, shape variation) |
| **motion-alive** | `agent/skills/motion-alive/SKILL.md` | Liveliness Level 2 (Responsive), 4 motion families, 10 recipes, 14 anti-patterns, reduced-motion guard |
| **frontend-external-infra** | `agent/skills/frontend-external-infra/SKILL.md` | Source routing to MCP libraries, re-skin rules, anti-slop checklist (10 items) |

## MCP Tools Available to the Implementing Agent

The following MCP servers are available to the **implementing agent** (opencode) during the build phase. **Your RESULT.md should reference specific MCP tools as suggestions** for particular sections — which component to source, which icon to use, which effect to apply. You do NOT run MCP tools yourself; you specify which ones the implementer should call and what to build with them.

| MCP Server | Suggested Usage in This Redesign |
|------------|----------------------------------|
| **shadcn** | Standard blocks: period selector pills, tracking browser dropdown, modal dialogs, tooltips for stat cards — re-skin to DeskFlow tokens |
| **Magic UI** | Animated effects: particle background behind the page header, animated gradient borders on Live Detection panel, text animation on the page title |
| **Lucide** | Replace generic icons with more specific ones: find a better "monitor" icon for Top Apps, a better "globe" icon for Browser — use standard lucide names for reliability |
| **21st.dev Magic** | Unique polished variations for the App Detail / Domain Detail modal layouts — especially the session list and metrics grid |
| **React Bits** | Number counters (count-up animation for summary card values), animated tooltips, smooth accordion for Recent Activity, particle background effects |
| **Iconify** | Search 200K+ icons for perfect per-section icons — but only as suggestions; the implementer will use lucide-react equivalents |
| **Unsplash** | Dark atmospheric placeholder images for empty states (no-data illustrations) |

### Re-Skin Rules (implementer must apply these to every MCP-sourced component):
- Replace source colors with DeskFlow tokens: `bg-zinc-900/30`, `border-zinc-800/50`, text colors
- Max radius: `rounded-xl` (12px)
- Standard padding: `p-5` (20px)
- Fonts: Geist/Inter for UI, JetBrains Mono for data
- Glass layers: `bg-zinc-900/30 backdrop-blur-xl`
- Dark mode only — no light mode
- Respect `prefers-reduced-motion`

---

## Constraints (Hard)

1. **ZERO features removed** — every component, button, modal, chart, list, and live element must remain functional
2. **ZERO data processing changes** — do not touch any `useMemo`, `useEffect`, IPC calls, or chart data computation logic
3. **ZERO prop interface changes** — do not change `StatsPageProps`, `BrowserActivityPageProps`, `AppStat`, or any type
4. **ZERO import changes** — do not add new npm packages; use what's already in `package.json` plus the MCP tools listed above
5. **Max `rounded-xl`** (12px) on all corners — no `rounded-2xl` or `rounded-3xl`
6. **Standard padding `p-5`** (20px) for all cards
7. **No `box-shadow`** — use borders for depth
8. **Dark mode only** — no light mode
9. **No pure black** — use `#0a0a0a` (zinc-950) as darkest
10. **Only animate `transform` and `opacity`** — no layout-animating properties (height, width, margin, padding)
11. **Min 44px touch targets** for buttons, dropdowns, interactive elements
12. **Wrap all `localStorage` access in try/catch**
13. **All chart data/options must remain `useMemo`-wrapped**
14. **Scroll position preservation must continue working**
15. **CRLF line endings** — preserve them
16. **Run the anti-slop checklist** from `frontend-external-infra/SKILL.md` before finalizing

---

## Output Format

Produce a `RESULT.md` with this structure:

```markdown
# StatsPage + BrowserActivityPage Redesign — RESULT

## Overview
[One-paragraph summary of the redesign approach]

## Phase 1: StatsPage Improvements
### [Section Name]
- **Visual changes:** [before → after description]
- **Colors:** [exact hex values]
- **Spacing:** [exact pixel values]
- **Motion:** [framer-motion recipe]
- **MCP sources:** [which MCP components were used]
- **Code changes:** [specific lines/files affected, additive only]

[Repeat for every section]

## Phase 2: BrowserActivityPage Improvements
[Same structure as Phase 1, repeated for every section]

## Phase 3: Shared Improvements
### Typography Refinements
### Chart Polish
### Modal Enhancements
### Empty/Loading/Error States
### Micro-interactions

## Anti-Slop Checklist
[Pass/fail for each of the 10 items]
```

---

## Verification Checklist (for you, before returning RESULT.md)

- [ ] Every section from both pages' Layout Structure is covered
- [ ] No existing feature is listed as removed
- [ ] All color values are from (or derived from) DeskFlow's existing palette
- [ ] All motion uses framer-motion recipes from motion-alive skill
- [ ] Empty/loading/error states are defined for every data section
- [ ] At least 3 MCP tools were actually used (not just mentioned)
- [ ] Anti-slop checklist passes all 10 items
- [ ] Re-skin rules applied to every MCP-sourced component
- [ ] Touch targets >= 44px
- [ ] `prefers-reduced-motion` respected
