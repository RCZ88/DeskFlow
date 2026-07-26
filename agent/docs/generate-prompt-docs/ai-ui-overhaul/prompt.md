# PROMPT: AI Page UI Overhaul — Fullscreen Canvas, Infinite Pan, Visibility Fix, Deck Revamp

## Raw Request

"the screen is too small for anything visible properly. Everything is so dark that it's invisible. The design UI of the entire canvas thing is like really bad. I would like you to use generic prompt that includes all the skills. I would like you to revamp the looks of that at least is looking visible and at least the canvas mode works because currently I can't even drag the canvas. I should be able to drag the canvas and the canvas should be infinite, right? It currently is still very limited. There's no way for me to save everything, right? There's no saving mechanism or is it auto-saving? There's nothing clear showing up on showing the auto-saving mode and it just looks like a bunch of mess. We need to have a system where it auto-arranges and we need to make sure that it's not only on the canvas mode, but it's also on the deck mode, which is more organized. So everything that is on the canvas should be on deck mode as well. And I would like you to revamp the looks of the deck mode. The chat input is very dark, you can't even see anything. The font and everything just looks really bad overall."

## Problem Statement

The AI page's Canvas and Deck modes are functionally broken due to severe UI issues:

**Canvas Mode — 7 critical issues:**
1. **Near-invisible contrast** — `#09090b` background, `rgba(9,9,11,0.6)` cards, `#a1a1aa` text = everything blends together
2. **No fullscreen** — canvas is cramped in a max-width container
3. **No canvas panning** — only individual cards can be dragged, no background panning
4. **Pixel limits** — cards at hardcoded positions can't go beyond bounds
5. **No save feedback** — auto-save happens silently via `saveCanvasLayout` with zero visual confirmation
6. **No auto-arrange** — cards overlap and leave gaps at different window sizes
7. **Confusing floating button** — transcript rail toggle (bottom-right chat bubble) serves no clear purpose

**Deck Mode — 4 critical issues:**
8. **Chat input too dark** — `#151518` bg, `rgba(255,255,255,.07)` border = barely visible
9. **Focus ring broken** — `var(--zm)` is undefined, focus state renders nothing
10. **Chat card magic height** — `calc(100vh - 200px)` breaks with any layout change
11. **Inconsistent fonts** — Canvas uses `'Geist'`, Deck uses `--sans`, Rail uses `inherit`

**Both Modes — systemic issues:**
- 5 different dark background values: `#09090b`, `#0d0d14`, `#111118`, `#151518`, `rgba(24,24,27,0.72)`
- 4 different border color systems that don't harmonize
- Accent color overload: cyan, pink, violet, emerald, amber, red all compete

## Context Bundle

Read `CONTEXT_BUNDLE.md` in this directory. It contains the complete source code for all CSS files, component files, and layout code that needs to change. The target AI must read this first.

## Design Skills Reference

### Frontend Design (DeskFlow tokens)
- Glass cards: `bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5`
- Max `rounded-xl` (12px), never `rounded-2xl`
- Dark mode only, Geist + JetBrains Mono fonts
- Spacing: 8px grid, `p-5` (20px) card padding
- Animation: 150ms fast, 250ms normal, ease-out cubic-bezier(0.16,1,0.3,1)

### Human-Centric UX
- Every data component must have empty/loading/error/populated states
- Primary action obvious within 1 second
- Progressive disclosure — hide complexity until needed
- All interactive elements have hover/focus/active/disabled states

### Anti-Slop Checklist
- NOT purple/indigo gradient-on-everything
- NOT default Inter-only — use Geist body + JetBrains Mono code
- Max `rounded-xl`, `p-5` padding
- Dark mode only
- Glass layer: `bg-zinc-900/80 backdrop-blur-xl`
- Icons from lucide-react only

## Requirements

### R1: Fullscreen Canvas Mode
- Add a fullscreen toggle button (maximize icon in top-right of canvas area)
- When toggled: canvas fills entire viewport, no header/sidebar, just grid + input
- Exit fullscreen: returns to normal layout with header
- Keyboard shortcut: F11 or double-click canvas background

### R2: Infinite Canvas with Pan
- Canvas should be pannable — drag the background to pan in all directions
- Canvas should be scrollable in all directions (not just vertical)
- No hard pixel limits — cards can be placed anywhere by dragging
- Implement via CSS `transform` on the grid container (translate for pan)
- Track pan offset in state, persist with canvas layout

### R3: Auto-Save with Visual Feedback
- Show "Saving..." indicator during save (top-right corner of canvas)
- Show checkmark + "Saved" for 2 seconds after save completes
- Show error state if save fails
- Position: top-right, fades in/out, small and unobtrusive

### R4: Auto-Arrange Cards
- Add "Auto-arrange" button in canvas toolbar
- Algorithm: sort cards by type, arrange in rows with 40px gaps
- No overlapping, consistent spacing
- Animate cards to new positions (250ms ease-out)

### R5: Remove Floating Transcript Rail Button
- Remove `dk-rail-toggle` button from canvas mode
- Keep chat functionality only in Deck mode
- Canvas mode should be clean — no floating buttons

### R6: Improve Contrast and Visibility
- **Canvas background**: `#09090b` → `#111118`
- **Card backgrounds**: `rgba(9,9,11,0.6)` → `rgba(20,20,25,0.85)`
- **Card borders**: `rgba(63,63,70,0.3)` → `rgba(63,63,70,0.5)`
- **Card body text**: `#a1a1aa` → `#d4d4d8`
- **Input placeholder**: `#27272a` → `#52525b`
- **Input hints**: `#18181b` → `#71717a`
- **Unified system**: Use Deck's CSS custom properties (`--tp`, `--ts`, `--tm`, `--line`, etc.) everywhere instead of hardcoded hex

### R7: Deck Mode Revamp
- **Chat input**: Brighter border (`--line-2` instead of `--line`), fix focus ring (replace `var(--zm)` with `var(--line-3)`)
- **Message bubbles**: Ensure AI responses are readable — brighter text, clearer contrast
- **Chat card**: Replace `height: calc(100vh - 200px)` with flex-based sizing
- **Consistent fonts**: Use `--sans` everywhere, `--mono` for code/monospace

### R8: Canvas ↔ Deck Sync
- Both modes share `useCanvasState` data
- Cards created in Canvas appear in Deck
- Cards created in Deck appear in Canvas
- No separate card systems

## Constraints

- Must preserve all existing card types and their data
- Must preserve the command palette (⌘K)
- Must preserve the AI chat functionality
- Must work on Windows (Electron desktop)
- Must use existing design tokens (CSS custom properties) unified across both modes
- Must not break existing card dragging/pinning system
- Must maintain auto-save functionality
- Canvas CSS currently has dead/duplicate rules (two `.dk-transcript-rail` defs, two `.dk-rail` defs) — clean these up

## Design Task

Design the complete UI overhaul:
1. Unify color system — one set of CSS custom properties for both Canvas and Deck
2. Implement fullscreen canvas toggle
3. Implement infinite canvas with pan/drag background
4. Add auto-save visual feedback (Saving... → Saved ✓)
5. Add auto-arrange button with animation
6. Remove floating transcript rail button
7. Improve contrast across ALL elements (see R6 specific values)
8. Revamp Deck mode chat input visibility
9. Fix broken focus ring (`var(--zm)` → actual value)
10. Replace magic height `calc(100vh - 200px)` with flex layout
11. Clean up dead CSS (duplicate rail definitions)
12. Ensure Canvas cards appear in Deck mode and vice versa

## UX Task

- Canvas fullscreen: one click (icon button), smooth transition
- Pan: drag background, feels natural, no jank
- Save indicator: subtle, top-right, fades in/out
- Auto-arrange: one click, instant, smooth animation to new positions
- Deck chat input: clearly visible, easy to type in
- All text: WCAG AA contrast ratio (4.5:1 minimum)
- No confusing floating buttons in Canvas mode
