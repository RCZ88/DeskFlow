# Lyceum Block Renderers — Design Revamp Prompt

## Raw Request
"make sure that the display of these features are the best looking and has the best design when showcasing everything. EVERY SINGLE FEATURE PROPERLY."

## Context
Read `CONTEXT_BUNDLE.md` for the full audit of all 29 block types, their current design quality, and the Lyceum warm wood design system.

## The Mandate
Design a comprehensive visual overhaul for ALL Lyceum Learn block renderers. Every block must:
1. Use the warm wood design system consistently
2. Handle all 4 states: empty, loading, error, populated
3. Be responsive (no fixed heights that break on mobile)
4. Have proper accessibility (ARIA labels, keyboard nav)
5. Match the tactile, scholarly aesthetic of the library page

## Requirements

### A. Create Missing Files:
1. `src/components/learn/blocks/WidgetHost.tsx` — HTML widget renderer with iframe sandboxing

### B. Fix Systemic Issues:
1. Centralize `LEVEL_COLORS` into a shared constant (import from types or a new colors.ts)
2. Replace all `border-t-clay-400` spinners with a consistent spinner component
3. Add empty states to every block that displays data
4. Fix MathBlock caption alignment (center, not left)
5. Add responsive heights via Tailwind (`h-auto max-h-[400px]` instead of fixed `h-[400px]`)

### C. Per-Block Design Specs:

#### ProseBlock — KEEP (already good)
- No changes needed. Clean reading experience.

#### CalloutBlock — ENHANCE
- Add a header row with icon + tone label (e.g., "Warning", "Tip")
- Support multi-paragraph content (currently only inline formatting)
- Add subtle left-border animation on mount

#### QuizBlock — ENHANCE
- Add loading state during submission (spinner on button)
- Add card number indicator ("Question 2 of 5")
- Add keyboard shortcut hints (1-4 for MCQ, Enter to submit)

#### CodeBlock — ENHANCE
- Add line numbers (toggleable)
- Add "Copy" button in header (already exists, verify)
- Add language badge that's more visible

#### MermaidBlock — KEEP (good)
- No major changes. Maybe add a "Download SVG" button.

#### ChartBlock — KEEP (good)
- No major changes.

#### TableBlock — FIX
- Add empty state ("No data to display")
- Add loading skeleton
- Verify dark theme CSS is loaded
- Add row count in header ("12 rows")

#### FlowBlock — KEEP (good)
- No major changes.

#### ImageBlock — ENHANCE
- Add `loading="lazy"` attribute
- Add zoom-on-click (lightbox)
- Improve attribution text size

#### FlashcardBlock — ENHANCE
- Add card counter ("Card 3 of 12")
- Make height responsive (min 200px, max 350px)
- Add keyboard shortcut overlay on first use

#### ConceptMapBlock — ENHANCE
- Add search/filter input in header
- Fix zoom to also adjust scroll area
- Make misconception warnings more visible (increase opacity)

#### LayerRevealBlock — ENHANCE
- Add confirmation to "Reveal all" button
- Improve locked state UX (show what to study)
- Replace inline `<style>` with Tailwind animation classes

#### MasteryTimelineBlock — ENHANCE
- Fix Brush labels (currently empty)
- Add tooltip formatting

#### HeatmapBlock — ENHANCE
- Add month/day labels on grid
- Fix tooltip overflow (reposition when near edges)

#### KnowledgeGraphBlock — ENHANCE
- Add node tooltip on hover
- Clear search when input emptied
- Add "Reset view" button

#### WhiteboardBlock — REDESIGN
- Remove iframe embed (unreliable)
- Replace with a simple canvas-based drawing tool OR
- Show as a static image with "Open in Excalidraw" link

#### IllustrationBlock — ENHANCE
- Add debounce to Generate button
- Add estimated time indicator
- Improve empty state explanation

#### MathBlock — FIX
- Center the caption (currently left-aligned)
- Add "Copy LaTeX" button

#### SvgBlock — KEEP (good)
- No major changes.

#### LayerBlock — ENHANCE
- Use colored badge for reveal level instead of plain text
- Add transition animation for height change

#### FinChartBlock — KEEP (good)
- No major changes.

### D. Shared Components to Create:
1. `BlockSpinner.tsx` — Consistent loading spinner for all blocks
2. `BlockEmptyState.tsx` — Consistent empty state with icon + message
3. `BlockCaption.tsx` — Consistent caption styling

### E. Design Tokens to Verify:
- All blocks must use `bg-zinc-800/30` for outer container
- All blocks must use `border-zinc-700/40` for borders
- All blocks must use `rounded-xl` for corners
- All blocks must use `my-6` for vertical spacing
- Captions must use `text-sm text-zinc-500 italic text-center`
- Headers must use `font-serif text-sm font-semibold text-zinc-100`
