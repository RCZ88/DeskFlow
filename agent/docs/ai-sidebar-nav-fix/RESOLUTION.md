# RESOLVED — AI Page Sidebar Navigation Fix

## Status: FIXED

## Root Cause
The `ExpandableCard` overlay uses `absolute inset-0 z-[200]`. Since `dk-root` had `position: relative` but no `z-index`, it did NOT create a stacking context. The overlay escaped into the root viewport stacking context and painted above the sidebar, intercepting all clicks.

## Why Previous Attempts Failed
- **Attempt 1 (z-20 sidebar)**: z-20 < z-[200], so the overlay still won.
- **Attempt 2 (isolation: isolate on dk-root)**: Works for DOM descendants, but some modals are siblings of `dk-root` in AiPage.tsx, so they still escape.

## The Fix (Two Parts)

### Part 1: Sidebar z-[300] — `src/App.tsx:2331`
```tsx
// BEFORE:
className="border-r border-zinc-800 flex flex-col h-full glass overflow-hidden"

// AFTER:
className="border-r border-zinc-800 flex flex-col h-full glass overflow-hidden z-[300]"
```
This puts the sidebar (z-300) above the ExpandableCard overlay (z-200) and any other main content overlays (z-100 drawers).

### Part 2: dk-root isolation — `src/components/ai/deck/deck.css:50`
```css
.dk-root {
  position: relative;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
  isolation: isolate; /* Traps descendant z-index layers inside dk-root */
}
```

## Z-Index Hierarchy
| Element | z-index | Stacking Context |
|---|---|---|
| Modals (portals to body) | z-[9999] | Root viewport |
| Sidebar | z-[300] | Root viewport (explicit) |
| ExpandableCard overlay | z-[200] | Trapped inside dk-root by isolation |
| History drawer (closed) | z-100 | Trapped inside dk-root by isolation |
| Main content | z-auto | Normal flow |

## Files Modified
- `src/App.tsx` — added `z-[300]` to sidebar className
- `src/components/ai/deck/deck.css` — added `isolation: isolate` to `.dk-root`

## Verification
1. Launch: `npx electron .`
2. Navigate to `/ai`
3. Click every sidebar item — all should work
4. Expand a card (fullPageOpen), then click sidebar — should still navigate
5. Open modal (Cmd+K) — modal (z-9999) should still appear above sidebar (z-300)
