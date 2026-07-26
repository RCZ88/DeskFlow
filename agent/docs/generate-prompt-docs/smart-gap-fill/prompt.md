# Smart Gap Fill — Design Prompt

## Raw Request

> "I would like you to generate from skill to be able to do it"
> "use the generate from skill to do so"
> "I want it to predict actual app names not just categories"
> "ask the user whether to combine or separate external vs internal tracking data"
> "the popup for the hover thing doesnt work where it just likes to far right and below"
> "it's still so far away from the box"
> "it's like three centimeters from the actual box"
> "all four design/UI skills applied (humancentred-UIUX, frontend-design, frontend-external-infra, impeccable)"
> "all available MCP servers (Magic UI, 21st.dev, shadcn) for UI polish"

## Problem Statement

The Gap Panel exists (GapPanel.tsx) but it's a dumb list — it shows time gaps with a manual "Fill" button that opens an unstructured time entry. It has NO prediction, NO suggestion system, and NO integration with the existing Typical Day heatmap. The backend already has fully implemented prediction infrastructure (predictGapFill, confirmGapFill, predictDayGaps IPC handlers) but there's zero frontend for it.

Additionally, the Typical Day tooltip positioning is broken — it always places to the right of the cell, and at the right edge of the viewport it clamps to `window.innerWidth - 180` which puts it far from the cell (user reports "3 centimeters away"). The duration display in each cell shows only tracked minutes, but the cells represent full hour slots — gaps within the hour make the visualization misleading.

## Context

Read `agent/docs/smart-gap-fill/CONTEXT_BUNDLE.md` for the complete codebase reference. The key points:

- **Backend is 100% ready** — `predictGapFill`, `confirmGapFill`, `predictDayGaps` IPC handlers all exist in `main.ts` with real SQL queries (stats_hourly + logs pattern matching), scoring algorithm, and log insertion. Preload bindings exist.
- **HourCell[][]** grid has 7 days × 24 hours with `totalSeconds`, `activities[]`, `hasExternal`, `hasDevice` flags.
- **Design tokens** — dark theme (`bg-zinc-900/95` panels, `bg-zinc-800/30` cards, `indigo-600` primary, Framer Motion spring animations).
- **Tooltip is `fixed` positioned** with `rect.right + 12` — this is broken for cells near viewport edges.
- **GapPanel.tsx** is the existing dumb panel (replace it with the smart version).

## The Mandate

Design a complete **Smart Gap Fill** system that integrates with the Typical Day heatmap. This is a single, comprehensive solution — not options to choose from. You are the Lead Designer and Engineer. Own the full solution from math to pixels.

---

## Engineering Task — Data Processing Pipeline

1. **Gap Detection Overlay:** Design how detected gaps are visually overlaid on the Typical Day grid. Each gap spans a time range that maps to specific cells in the grid. The overlay must indicate "this time is untracked" vs "this time has data."

2. **Prediction UI Flow:**
   - When user clicks a gap (or taps "Smart Fill" button), call `predictGapFill(start, end, mode)` for a single gap range.
   - Display the returned 15-minute slots with their top-3 predictions (app, category, confidence %, avgSeconds, daysUsed).
   - Let the user confirm/reject individual slot predictions.
   - On confirm, call `confirmGapFill(fills)` to write selected slots to logs.

3. **Mode Toggle:** Before prediction runs, ask the user: "Combine external and device tracking data?" with options `combined` / `separate`. Default: `combined`. This maps directly to the `mode` parameter in `predictGapFill`.

4. **Typical Day Hour Display Fix:** Each cell represents one hour (3600s). Currently shows `totalSeconds` which undercounts when there are gaps. Show `totalSeconds / 3600 * 100` as a percentage fill of the hour, and display the actual range (e.g., "10:00-11:00, 42 min tracked") rather than just raw seconds.

5. **Batch Day Prediction:** Provide a "Fill entire day" option that calls `predictDayGaps(date, mode)` to batch-predict all gaps for a full day at once, then presents them grouped by gap interval.

6. **Pattern Scoring Display:** Show the user WHY each prediction was made — show the context clues (what was used before/after, what's typical for this day/hour historically) as explanatory microcopy.

---

## Design Task — High-Fidelity Visual Specs (apply all 4 skills + MCP)

1. **Gap Fill Panel:** Design a panel that replaces the current `GapPanel.tsx`. It must:
   - Slide up or fade in from the bottom of the Typical Day section (not a centered modal).
   - Show detected gaps for the selected period.
   - Expand each gap to reveal predicted 15-min slots.
   - Each slot shows: top prediction (large, with confidence badge), 2nd/3rd alternatives (smaller, clickable to swap).
   - "Accept all" button for the gap and "Accept" per-slot.
   - Mode toggle (combined/separate) at the top.
   - Use the design system tokens from CONTEXT_BUNDLE §4.

2. **Tooltip Proximity Anchoring (CRITICAL BUG FIX):**
   - Position the tooltip using a 4-side test: calculate available space on right, left, above, below the cell.
   - Pick the side with the most room AND the closest to the cell.
   - Right: `rect.right + 8`, Left: `rect.left - 8 - tooltipWidth`, Above: `rect.top - 8 - tooltipHeight`, Below: `rect.bottom + 8`.
   - Apply `Math.min/max` clamping so the tooltip never overflows the viewport.
   - Add a small 6px arrow/pointer on the tooltip pointing toward the cell, colored `border-zinc-700`.
   - Transition: `opacity + scale` with 80ms Framer Motion spring.

3. **Grid Cell Enhancement:**
   - Each cell should visually show how full the hour is (background opacity proportional to `totalSeconds/3600`).
   - If a gap maps onto this cell, show a diagonal stripe overlay (e.g., `repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, transparent 6px)`) to indicate partial tracking.
   - On hover, show the tracked range (e.g., "42m / 60m") not just raw seconds.

4. **Confidence Visualization:**
   - Predictions with confidence >= 70%: green badge (`bg-emerald-500/20 text-emerald-300`)
   - 40-69%: yellow badge (`bg-amber-500/20 text-amber-300`)
   - <40%: gray badge (`bg-zinc-600/30 text-zinc-400`)
   - Confidence shown as a small horizontal bar (like a progress bar) next to each prediction.

5. **Animation & Polish (use Magic UI / Framer Motion):**
   - Panel entrance: slide up from bottom with spring animation.
   - Slot expand/collapse: height animation with `layout` prop.
   - Prediction items: stagger children with `staggerChildren: 0.03`.
   - Tooltip: `scale: 0.95 → 1` with `opacity: 0 → 1` in 80ms.

---

## UX Task — Interaction Flow

1. **Typical Day → Gap Detection → Fill Flow:**
   - User sees the heatmap. Gaps are subtly indicated as diagonal stripes on affected cells.
   - User hovers a gap-striped cell → tooltip shows "Gap: 10:30-11:15 (45m untracked)" plus typical predicted apps for that slot.
   - User clicks a gap-striped cell → Smart Gap Fill panel opens, scrolled to that gap.
   - User clicks "Smart Fill" button on the banner (existing GapBanner) → panel opens showing ALL gaps for the period.

2. **Prediction Review Flow:**
   - Panel shows a gap with its 15-min slots stacked vertically.
   - Each slot's primary prediction is pre-selected (green check).
   - User can click an alternative prediction to swap.
   - User can click the slot to deselect ("skip this slot").
   - At the bottom of each gap: "Accept All" button summarizes what will be logged.
   - After accept: brief success toast, panel updates to remove that gap from the list, grid cells update to show filled status.

3. **Mode Selection Flow:**
   - First time: prompt "How should I guess your gaps?" with two options: "Combine app + external data" or "Separate them".
   - Store preference in localStorage, but always show a small toggle to switch.
   - The toggle has a tooltip explaining: "Combined = predict from apps AND external sessions. Separate = only use app tracking data."

4. **Empty / Error States:**
   - No gaps: show "All time accounted for ✓" with a subtle checkmark.
   - No predictions found: show "No historical data for this time slot" with option to manually add.
   - Loading: skeleton shimmer for each gap slot card (matching the panel dimensions).
   - Error: "Could not load predictions" with retry button.

5. **Keyboard Navigation:**
   - Tab through slots, Space to accept/swap, Esc to close panel.

---

## Constraints

- All localStorage access must be wrapped in try/catch.
- Prefer renderer-side fixes — the full IPC handlers already exist and work.
- Don't create new app-level routes or sidebar items — this is a sub-feature of the Insights page's Typical Day section.
- The existing GapPanel.tsx should be replaced, not wrapped.
- The typical day grid layout (`overflow-x-auto`, flex-based cells) must not be broken.
- Tooltip must use `fixed` positioning (it's inside a scroll container).
- The panel must not block interaction with the grid when collapsed (it should be a slide-up drawer, not a modal overlay).
- File is CRLF — preserve line endings.
- After implementation, the build must pass: `node scripts/build.mjs` then `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`.

---

## Output Format

Return a `RESULT.md` with the following sections:

1. **Implementation Plan** — affected files, changes per file, exact code structure
2. **Phase 1: Core Gap Fill Drawer** — the main panel component with prediction display
3. **Phase 2: Grid Overlay + Tooltip Fix** — cell gap indicators and proximity tooltip
4. **Phase 3: Batch Day Prediction** — "fill entire day" flow
5. **Data Adaptations** — any changes needed to existing components (App.tsx wiring, GapPanel replacement, etc.)
6. **Verification Steps** — how to test each feature in the real Electron app

Be specific about file paths, component props, and data shapes. No generic "create a component" — specify the actual TypeScript interfaces, function signatures, and Tailwind classes.
