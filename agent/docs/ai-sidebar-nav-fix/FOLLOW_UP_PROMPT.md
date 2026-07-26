# FOLLOW-UP PROMPT — AI Page Sidebar Navigation Fix (Attempt 2)

## Status: Previous Fix Failed
- **Attempt 1**: Added `z-20` to sidebar in `App.tsx` — FAILED. Sidebar still unclickable on `/ai`.
- **Root cause hypothesis**: The `ExpandableCard` overlay's `absolute inset-0 z-[200]` escapes `dk-root` because `dk-root` has `position: relative` but NO `z-index`, so it does NOT create a stacking context. The overlay competes in the root stacking context and wins over the sidebar.
- **Attempt 2 (current)**: Added `isolation: isolate` to `.dk-root` in `deck.css` to create a proper stacking context that traps the overlay.

## What Changed

### `src/components/ai/deck/deck.css`
```css
// BEFORE (line 35-50):
.dk-root {
  position: relative;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
}

// AFTER:
.dk-root {
  position: relative;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
  isolation: isolate;  /* ← NEW: creates stacking context, traps z-[200] overlay */
}
```

## Why This Should Work

CSS stacking context rules:
- `position: relative` alone does NOT create a stacking context
- `isolation: isolate` DOES create a stacking context
- Once `dk-root` has a stacking context, the `ExpandableCard` overlay's `z-[200]` is contained within that context
- The sidebar (outside `dk-root`) is in a different stacking context and cannot be covered by elements inside `dk-root`

## Verification Needed

**Test plan:**
1. Navigate to `/ai` page
2. Without expanding any cards, click each sidebar item:
   - Dashboard (`/`), Activity (`/activity`), Learn (`/learn`), Resume (`/resume`), IDE (`/ide`), External (`/external`), Finance (`/finance`), Insights (`/reports`), Database (`/database`), Settings (`/settings`), Guide (`/guide`)
3. Return to `/ai`, expand a card (click maximize icon), then click a sidebar item while overlay is open
4. Verify modals still appear above sidebar (CommandPalette, ChatHistory, etc.)

## If This Still Fails

Please investigate these alternative theories:
1. Does `isolation: isolate` on `dk-root` actually create a stacking context in Chromium 132 (Electron)?
2. Is there another element (not the ExpandableCard overlay) covering the sidebar?
3. Could `pointer-events` or event bubbling be the issue instead of z-index?
4. Check if `dk-root * { box-sizing: border-box }` in deck.css has any side effects

## Files Modified
- `src/components/ai/deck/deck.css` — added `isolation: isolate` to `.dk-root`

## Context Bundle Available
Previous context bundle at: `agent/docs/ai-sidebar-nav-fix/CONTEXT_BUNDLE.md`
