# PROMPT — Fix AI Page Sidebar Navigation Blocker

## Task
Fix a critical bug: when the user is on the AI Assistant page (`/ai`), clicking any sidebar navigation item does nothing. The sidebar is completely unresponsive to clicks while on this page.

## Root Cause
The `ExpandableCard` component in `src/components/ai/deck/AiPageDeck.tsx` returns a React Fragment (`<>`) containing both the card element AND a fullPageOpen overlay. The overlay uses `absolute inset-0 z-[200]` but because it's a Fragment child (sibling to the card, not inside it), its nearest positioned ancestor is `dk-wrap` (`position: relative` in `deck.css`). This means the overlay fills the ENTIRE `dk-wrap` area at z-index 200, which sits on top of the sidebar buttons at z-index implicit (effectively 0).

The sidebar is rendered as a sibling of the main content area in `App.tsx`:
```
<div className="flex h-screen overflow-hidden">
  <motion.div className="sidebar">  ← z-implicit
    <button onClick={navigate}>...</button>
  </motion.div>
  <div className="main-content">
    <div className="scroll-area">
      <Routes>
        <AiPage>          ← renders dk-root > dk-wrap
          <AiPageDeck>    ← renders ExpandableCards
            <ExpandableCard>  ← Fragment with card + overlay
              <div className="absolute inset-0 z-[200]">  ← BLOCKS SIDEBAR
            </ExpandableCard>
          </AiPageDeck>
        </AiPage>
      </Routes>
    </div>
  </div>
</div>
```

The overlay's `absolute inset-0` positions it relative to `dk-wrap`, making it cover the full AI page area at z-200. Since the sidebar has no explicit z-index, the overlay's z-200 wins and captures all pointer events.

## Fix Instructions

### Option A (Recommended): Add z-index to sidebar
In `src/App.tsx` line 2331, add `z-20` to the sidebar's className:
```tsx
// BEFORE:
className="border-r border-zinc-800 flex flex-col h-full glass overflow-hidden"

// AFTER:
className="border-r border-zinc-800 flex flex-col h-full glass overflow-hidden z-20"
```

### Option B (Alternative): Fix the overlay containment
In `src/components/ai/deck/AiPageDeck.tsx`, move the fullPageOpen overlay out of the Fragment and into a portal, or wrap the ExpandableCard grid in a container with `isolation: isolate` and `position: relative` so the overlay is contained.

### Verification
1. Build: `npx vite build`
2. Rebuild preload: `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`
3. Rebuild main: `node scripts/rebuild-main.mjs`
4. Launch app: `npx electron .`
5. Navigate to `/ai` page
6. Click every sidebar item (Dashboard, Activity, Learn, Resume, IDE, External, Finance, Insights, Database, Settings, Guide)
7. Verify ALL sidebar items navigate correctly from the AI page

## Files to Modify
- `src/App.tsx` (line 2331) — add z-20 to sidebar className

## Constraints
- Do NOT change the fullPageOpen overlay behavior (it's intentional for card expansion)
- Do NOT remove the Fragment from ExpandableCard (it's needed for layout)
- The sidebar must stay above ALL main content overlays but below modals/dialogs
