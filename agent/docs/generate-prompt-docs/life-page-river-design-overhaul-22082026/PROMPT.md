# PROMPT.md — Life Page River Design Overhaul (22082026)

> **Generated:** 2026-08-22 | **Skill:** generate-prompt v2.0.0 | **Target AI:** Architect (Lead Designer AND Engineer)
> **Context bundle:** `CONTEXT_BUNDLE.md` (same folder — read it fully)
> **Hands & Eyes agent (opencode):** will apply your RESULT.md, build, and verify.
> **Deliverable: `RESULT.md` — complete implementation spec with exact code/diffs.**

---

## 1. PROBLEM STATEMENT

The Life page River view has functional features (sort toggle, RD morphogen growth, attachments, period context) but the VISUAL DESIGN is low quality — it looks like generic AI-generated UI. The user explicitly said: "the visualization is just ass, everything is lack of quality." Every component needs a design quality upgrade using real component patterns from MCP libraries (shadcn, Magic UI), not model-training-d平均 output.

## 2. MANDATE — Lead Designer AND Engineer → RESULT.md

You are BOTH the Lead Designer (taste, hierarchy, motion, copy, states) AND the Engineer (renderer components). Produce ONE `RESULT.md` with exact file paths, exact code, and design rules. Zero omissions.

## 3. TASKS

### Task A — PhaseCard Redesign
The phase card is the primary content unit. Redesign it with:
- **Typography hierarchy**: Phase title in DM Serif Display (already loaded), date range in 11px uppercase tracked, description in Geist 13px
- **Category accent**: each phase category (growth, challenge, transition, etc.) gets a unique accent color via the existing `categoryColor` field — use it as a left-border accent AND a subtle background tint
- **Milestone visualization**: instead of a plain list, show milestones as a horizontal mini-timeline with dots connected by a line, each dot hoverable for details
- **People chips**: show people as small avatar-like chips with initials + role
- **Connection strip integration**: the "What I was doing then" strip (ConnectionDataStrip) should visually connect to the card — same border radius, continuous border
- **Empty state**: when a phase has no content yet, show a prompt to "Add your story" with a pencil icon
- **Motion**: use framer-motion for card entrance (whileInView), milestone stagger, and hover lift
- **Source**: Pull a card pattern from shadcn registry (e.g., Aceternity's bento card or a glass card variant) and re-skin to DeskFlow tokens

### Task B — CoreSample Ring Quality Upgrade
The ring visualization is the hero element. Improve:
- **Ring thickness**: increase from current thin stroke to 3-4px for visibility
- **Ring animation**: animate ring appearance on mount (stroke-dashoffset reveal)
- **Label positioning**: use collision-aware label placement (avoid overlaps) — smart label positioning based on ring angle
- **Hover interaction**: hovering a ring segment highlights it + shows a tooltip with phase title + duration
- **Decade/year zoom**: the zoom controls (currently a basic slider) should be replaced with discrete zoom levels (Life / Decades / Years) as a segmented control, matching the lens indicator pattern
- **Active phase indicator**: the currently selected phase ring should glow with the page accent color
- **Source**: Check Magic UI for animated circular progress or number-ticker patterns; adapt for ring segments

### Task C — TimelineView Improvement
The vertical timeline connecting phases needs:
- **Visual richness**: replace plain dots with small ring segments or category-colored circles
- **Connection line**: gradient line that changes color based on the phase category it connects to
- **Hover expand**: hovering a timeline node shows a mini-preview of the phase (title + date + one-line description)
- **Click to scroll**: already works, but add a smooth scroll animation
- **Source**: shadcn has timeline patterns; check Aceternity registry

### Task D — RiverMap + Zoom Controls
The zoom/navigation panel needs:
- **Segmented zoom control**: replace the slider with 3 discrete buttons (Life / Decades / Years) — same design as the lens indicator
- **Phase list in map**: each phase should show as a colored dot/line segment in the map, clickable to scroll
- **Active phase highlight**: the selected phase should be visually distinct in the map
- **Source**: Use the segmented control pattern from the lens indicator (already in LifePage.tsx)

### Task E — River Controls Visual Polish
The lens indicator + sort toggle + quick-add toolbar needs:
- **Unified control bar**: merge the lens indicator and sort toggle into a single elegant bar
- **Sort toggle redesign**: use a proper toggle/switch pattern instead of a text button — two-state pill with "Oldest ↓" / "Newest ↑"
- **Quick-add buttons**: use icon-only buttons with tooltips instead of full-width text buttons
- **Source**: shadcn ToggleGroup for the sort toggle; Lucide icons for quick-add

### Task F — Overall Quality Pass
- **Spacing audit**: ensure consistent padding/margins across all River components (use `p-5` / `gap-3` / `space-y-4` consistently)
- **Color consistency**: all accent colors should derive from `--page-accent` (amber #f59e0b) with category variations
- **Motion consistency**: all animations use the same easing curve `[0.16, 1, 0.3, 1]` and duration (0.3-0.5s)
- **Empty states**: every data-driven section needs a styled empty state
- **Loading states**: use Skeleton components for initial load
- **Anti-slop check**: verify no purple gradients, no generic Inter-only typography, no default border-radius, no missing hover states

## 4. DESIGN RULES

- **Dark theme only** — no light mode variants
- **Tokens from index.css** — never hardcode colors
- **Max radius: rounded-xl (12px)** — never larger
- **Card padding: p-5 (20px)** — never p-6 or p-8
- **Fonts: Geist body, DM Serif Display headings, JetBrains Mono code**
- **Glass effect: bg-zinc-900/75 backdrop-blur-xl** for elevated surfaces
- **Motion: framer-motion with [0.16, 1, 0.3, 1] easing**
- **Icons: lucide-react only** — no emoji, no inline SVG
- **Every component needs: empty state, loading state, error state**

## 5. BUILD & VERIFICATION

```bash
npx vite build  # ~2-3 min, verify LifePage chunk
```

Markers to verify in built bundle:
- PhaseCard redesign: new class names, milestone timeline, category accent
- CoreSample: ring animation, hover states, segmented zoom
- TimelineView: gradient connection line, hover preview
- RiverMap: segmented zoom control
- Sort toggle: displayPhases, sortOrder, life-sort-order

## 6. CONSTRAINTS

- No new npm dependencies
- Preserve RD morphogen decoration (right 55%, LivingSubstrate)
- Preserve all existing IPC handlers and data flow
- Preserve phase CRUD (add/edit/delete/reflect)
- Preserve attachment system (ConnectionDataStrip pickers)
- Preserve sort toggle (already implemented)
- Preserve 40s growth animation (already implemented)
