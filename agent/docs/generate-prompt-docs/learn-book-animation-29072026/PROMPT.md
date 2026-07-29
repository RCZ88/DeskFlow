# Learn Book Opening Animation — Design Prompt

## Raw Request
"the book's texture is still not working properly. the animation should start when i enter the app. make a book opening animation showing the papers flowing/scrolling through pages and opening the book so both sides are open."

## Context
Read `CONTEXT_BUNDLE.md` for the current broken implementation, CSS, and design system tokens.

## The Mandate
Design a **complete, working book opening animation** for the Lyceum Learn home page. The animation must:

1. **Start immediately on page mount** — zero delay, triggers as soon as the component renders
2. **Show a realistic book opening sequence:**
   - Book starts closed (front cover visible)
   - Covers swing open left and right with spring physics
   - Inner pages are revealed with cream/parchment color
   - Pages flip through from right to left (like browsing through the book)
   - Animation settles with book fully open showing both page spreads
3. **Have proper book texture:**
   - Cloth/fabric texture on covers (subtle grain pattern)
   - Spine shadow/crease when open
   - Gilt/gold text on cover ("Volume I", "The Art of Understanding", "Lyceum Press")
   - Page edges visible at bottom
   - Realistic shadow underneath
4. **Use the warm wood design tokens:**
   - Cover: clay gradient (#c2553a → #8f3a25)
   - Gilt text: #f3d9a4
   - Pages: #faf6ee (cream)
   - Shadows: warm blacks, not cold grays
5. **Be smooth and polished:**
   - Use Framer Motion spring physics for organic movement
   - 3D perspective transforms for realistic depth
   - Proper z-indexing so pages layer correctly
   - No jank or stuttering

## Deliverables
Provide the COMPLETE rewritten `BookOpening.tsx` component with:
- All animation phases coded
- Proper Framer Motion variants and transitions
- CSS inline styles for textures (or class references)
- TypeScript types
- No placeholder comments — full working code

## Constraints
- Must use Framer Motion (already installed)
- Must use React 18 hooks
- Must be a single self-contained component
- Must fit in a 320x220px container
- Must work on both desktop and mobile
