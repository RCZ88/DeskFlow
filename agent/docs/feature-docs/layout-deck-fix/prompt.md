## Raw Request (user verbatim)

```
we need to make sothat the ai chatbot part actually extends until the bottom stuf.f because currently it is capped to a certain height that theres a HUGE gap heightwise to the nearest card. the alyout is also needs to be fixed because like why is it tha the how can i help on the top? it should be more towards the bottom, and the fact that i need to scroll all the way downwards to see the textbox wehre i can input. i need we need to imrpove the UX here. the ui is already looking quite well, but each car just looks to small. and the news digest should be the bigger tpart here. and each copmonent should be pretty major. even splitting it into its own subapge of teh ai assistnat page might be great idea if the components andfeatures of each card is sufficient.
```

## Problem Statement

The AI Command Deck page has a layout issue where the chat panel (left column) does not fill the available vertical space between the top bar and the bottom strip (Focus/Plan/Reflect cards). This leaves a large gap and forces the user to scroll down to reach the chat input. Additionally:
- The "How can I help?" welcome message is at the top of the message area instead of near the input
- Cards feel too small and lack visual weight
- The digest should be more prominent

## Context

Read `agent/docs/layout-deck-fix/CONTEXT_BUNDLE.md` for the complete architecture reference including all CSS, component structure, and design tokens.

## The Mandate

Design and implement a comprehensive layout fix for the AI Command Deck. You are the Lead Designer and Engineer — produce a single, complete solution.

### Engineering Task

**CSS Layout Restructure (deck.css):**

1. Restructure `.dk-root` as a flex column so children stretch vertically
2. Restructure `.dk-wrap` as a flex column with `flex:1; min-height:0` so it fills the viewport
3. Make `.dk-grid` use `flex:1; min-height:0` so it fills remaining space between topbar and strip
4. Make `.dk-topbar`, `.dk-strip`, `.dk-foot` use `flex:none` so they don't grow
5. Ensure both grid columns have equal height (default `align-items:stretch` handles this)

**ChatPanel.tsx Restructure:**

6. The `.dk-stream` (messages area) must take all available space with `overflow-y:auto`
7. The `ChatEmptyState` ("How can I help?") should render near the bottom of the stream area, positioned just above the input — not at the top
8. The input area must always be visible at the bottom without scrolling
9. `flex:1` on `.dk-stream` within the flex column layout

**Responsive:**

10. At <1024px the grid collapses to single column — ensure the fix doesn't break this

### Design Task

11. Increase card visual weight — larger padding, more prominent borders/shadow
12. Make the digest section in the right column bigger/more prominent
13. Ensure consistent sizing between left and right column cards

### UX Task

14. Welcome message at bottom of stream (near input) reduces eye travel — user sees input immediately
15. No gap between chat deck bottom and strip top
16. Both columns visually balanced

## Constraints

- All changes within the existing CSS variables and token system
- No new external dependencies
- Must preserve all interactive behavior (scrolling, input, streaming)
- The `.dk-card` class with `dk-acc` accent bars must be preserved

## Output Format

Provide:
1. Exact CSS changes (diff format)
2. Exact TSX/React changes (diff format) 
3. A screenshot/mockup description of the final layout
