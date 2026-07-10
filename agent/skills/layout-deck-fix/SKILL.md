---
id: layout-deck-fix
name: layout-deck-fix
description: "Fix the AI Command Deck layout so the chat panel extends to the bottom strip with no gap. The left column (chat) must flex to fill all vertical space between the top bar and the bottom strip (Focus/Plan/Reflect cards)."
version: 1.0.0
category: layout
tags: [layout, css, flexbox, grid, chat-panel, ai-page]
---

# Layout Fix: Chat Deck Extends to Bottom Strip

## Problem

The chat panel (`.dk-deck` / `ChatPanel`) in the AI Command Deck page is capped at a certain height, leaving a **large gap** between the bottom of the chat area (messages + input box) and the `.dk-strip` (which contains Focus/Plan/Reflect cards).

The user must scroll all the way down to see the chat input box. The "How can I help?" welcome message is at the top instead of near the input. Cards feel too small and lack visual weight.

## Current Layout Structure

```
.dk-root (min-height:100%, position:relative)
  .dk-wrap
    .dk-topbar (fixed height)
    .dk-grid (2 cols: 1fr 400px, gap 20px)
      .dk-col (left)
        .dk-microlabel
        .dk-card.dk-acc.dk-pink.dk-deck (ChatPanel - flex:1)
          .dk-deckhead
          .dk-stream (flex:1, overflow-y:auto)
          AgentProgressBar + ChatInput
      .dk-col (right)
        .dk-microlabel
        glance metrics card
        digestSlot
        connectorsSlot
        QuickCommands
    .dk-strip (3-col grid: Focus/Plan/Reflect)
    .dk-foot
```

## Root Cause

- `.dk-root` is not a flex container — it uses `position:relative; min-height:100%` but does NOT stretch children to fill height
- `.dk-wrap` is not a flex column — its height is determined by content only
- `.dk-grid` has no `flex: 1` — it takes only as much height as its content needs
- The right column's digest content may be short, making the grid short
- The left `.dk-col` cannot stretch because the grid itself isn't tall

## Required CSS Changes

1. **`.dk-root`** — add `display:flex; flex-direction:column` so children stretch vertically
2. **`.dk-wrap`** — add `flex:1; display:flex; flex-direction:column; min-height:0` so it fills `.dk-root` and acts as a flex column
3. **`.dk-topbar`** — add `flex:none` so it does not grow
4. **`.dk-grid`** — replace current static sizing with `flex:1; min-height:0` (keep `grid-template-columns: 1fr 400px; gap: 20px`)
5. **`.dk-strip`** — add `flex:none` so it does not grow
6. **`.dk-foot`** — add `flex:none` so it does not grow

## Additional UX Improvements

- Move the "How can I help?" welcome/empty state message to be positioned near the input rather than at the top of the message stream
- Make the chat input always visible (sticky at the bottom) without requiring scroll
- Increase card sizes and visual weight for all components in the deck
- Ensure both columns in `.dk-grid` have equal height (default `align-items:stretch` handles this)

## Files to Edit

- `src/components/ai/deck/deck.css` — flex layout restructure
- `src/components/ai/chat/ChatPanel.tsx` — input positioning, welcome message placement
- `src/components/ai/chat/ChatEmptyState.tsx` — welcome message styling

## Acceptance Criteria

1. Chat panel extends to the bottom strip with **zero gap**
2. Chat input is always visible at the bottom of the left column without scrolling
3. Both left and right columns have equal height
4. All cards have sufficient visual weight and size
5. No overflow or horizontal scroll issues
6. Responsive layout still works at <1024px (single column)
7. The "How can I help?" welcome is near the input, not at the top
