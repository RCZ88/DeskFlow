# AI Assistant Page — Fix Tracker

## Session: 2026-07-27

---

## COMPLETED FIXES

### 1. Voice Input Using VoiceInputWrapper
- **Fix:** Replaced old `useVoiceInput` hook with `VoiceInputWrapper` component wrapper
- **File:** `src/components/ai/canvas/CanvasInput.tsx`

### 2. Text Input Clickable Area
- **Fix:** Added `min-height: 36px` and `width: 100%` to `.dk-canvas-input`
- **File:** `src/components/ai/canvas/canvas.css`

### 3. Drag-to-Group Feature
- **Fix:** Implemented drag card onto another card → creates group
- **How it works:** Drag a card → hover over another card → drop target highlights (cyan glow + scale) → drop creates group with both cards
- **Files:** `CanvasCard.tsx` (drop target detection), `CanvasGrid.tsx` (group creation), `CanvasContainer.tsx` (onGroupCards prop), `AiPage.tsx` (group handler)

### 4. Sidebar Navigation Broken on AI Assistant Page
- **Root cause:** React Router v6 HashRouter's `hashchange` event suppressed by Chromium compositor layers from canvas `will-change: transform`
- **Fix:** Added hash polling fallback in App.tsx — polls `window.location.hash` every 100ms, forces re-render when hash changes
- **File:** `src/App.tsx`

### 2. Sidebar z-index
- **Fix:** Changed sidebar z-index from `z-20` to `z-[100]`
- **File:** `src/App.tsx:2339`

### 3. Workspace Guard Cleanup
- **Fix:** Added `__workspaceHasUnsavedChanges = false` cleanup on TerminalPage unmount
- **File:** `src/pages/TerminalPage.tsx:1935`

### 4. VoiceInputProvider Error
- **Fix:** Changed `useVoiceContext()` to return `null` instead of throwing when VoiceProvider not present
- **File:** `src/context/VoiceContext.tsx:48-51`

### 5. Hint Text Spacing
- **Fix:** Class name mismatch — CanvasInput used `dk-canvas-input-hint` (singular) but CSS defined `dk-canvas-input-hints` (plural)
- **File:** `src/components/ai/canvas/CanvasInput.tsx`

### 6. CommandPalette Missing CSS
- **Fix:** Added complete CSS for `dk-cmd-overlay`, `dk-cmd-palette-new`, `dk-cmd-input`, `dk-cmd-suggestions`, `dk-cmd-hints`
- **File:** `src/components/ai/canvas/canvas.css`

### 7. Ctrl+K and Slash Commands in Canvas Mode
- **Fix:** Added `onOpenPalette` prop to CanvasInput, keyboard handler for Ctrl+K, `/` detection that opens palette
- **Files:** `src/components/ai/canvas/CanvasInput.tsx`, `src/components/ai/canvas/CanvasContainer.tsx`

### 8. Streaming Response Not Showing Text in Real-Time
- **Fix:** Bridge effect only processed NEW messages, not content updates. Added `msgContentLengths` and `msgCardIds` refs to track streaming updates
- **File:** `src/pages/AiPage.tsx`

### 9. Response Card Appearing Only After AI Finishes
- **Fix:** Same as #8 — bridge skipped empty placeholder messages, then never re-processed when streaming filled content
- **File:** `src/pages/AiPage.tsx`

### 10. Error Page Shows at Bottom Without Proper Buttons
- **Fix:** Added `position: fixed; inset: 0; z-index: 99999` to fallback overlay, added "Go to Dashboard" button
- **File:** `index.html`

### 11. Auto-Arrange — Horizontal Layout
- **Fix:** Doubled `ROW_MAX_WIDTH` from 800→1600px so cards arrange horizontally
- **File:** `src/lib/autoArrange.ts`

### 12. Canvas Clear Function
- **Fix:** Added `clearCanvasLayout()` to persistence service and `clearAll()` to useCanvasState
- **Files:** `src/services/canvasPersistence.ts`, `src/hooks/useCanvasState.ts`

### 13. Card Merging — Responses Consolidate
- **Fix:** Bridge now merges consecutive AI responses into same card instead of creating new cards
- **File:** `src/pages/AiPage.tsx`

### 14. Card Design Revamp
- **Fix:** Glass morphism cards with gradient backgrounds, backdrop blur, top-edge highlights, better typography
- **Files:** `src/components/ai/canvas/canvas.css`, `src/components/ai/canvas/cards/cards.css`

### 15. Response Card Styles Added
- **Fix:** Added missing `dk-response-*` CSS classes (were completely undefined)
- **File:** `src/components/ai/canvas/canvas.css`

### 16. Auto-Focus on AI-Active Cards
- **Fix:** Added `focusedCardId` state, auto-pan to card when AI streams, pulsing cyan glow highlight, toggle button in toolbar
- **Files:** `src/pages/AiPage.tsx`, `src/components/ai/canvas/CanvasContainer.tsx`, `src/components/ai/canvas/CanvasGrid.tsx`, `src/components/ai/canvas/CanvasCard.tsx`

### 17. Fit-to-Screen Button
- **Fix:** Added "Focus" button that zooms/pans to fit all cards in viewport
- **File:** `src/components/ai/canvas/CanvasContainer.tsx`

### 18. Remove Useless Recenter Button
- **Fix:** Removed the old "Recenter on cards" button from toolbar
- **File:** `src/components/ai/canvas/CanvasContainer.tsx`

### 19. DECK/CANVAS Toggle Label Fix
- **Fix:** Button now shows current mode (`canvasMode ? 'CANVAS' : 'DECK'`) instead of target mode
- **File:** `src/pages/AiPage.tsx`

### 20. Pink Focus Ring Removed
- **Fix:** Added global CSS override to remove focus rings on all inputs
- **File:** `src/index.css`

---

## INCOMPLETE / NEEDS VERIFICATION

### Voice Input Using VoiceInputWrapper
- **Status:** CanvasInput currently uses `useVoiceInput` hook (old approach). Should use `VoiceInputWrapper` component like all other inputs in the app.
- **File:** `src/components/ai/canvas/CanvasInput.tsx`
- **Action needed:** Replace `useVoiceInput` hook with `VoiceInputWrapper` wrapper pattern

### Text Input Focusable Area Too Small
- **Status:** User reports clickable area doesn't match the visual input UI size
- **File:** `src/components/ai/canvas/canvas.css` — `.dk-canvas-input` styling
- **Action needed:** Make input fill the full `.dk-canvas-input-inner` container

### Grouping Feature (Drag-to-Group)
- **Status:** Types and reducer exist (`CanvasGroup`, `CREATE_GROUP`, `ADD_TO_GROUP`) but NO UI interaction implemented
- **Needed:** 
  - Drag card onto another card → creates group
  - Visual drop target highlight when hovering during drag
  - Group container that adjusts layout
  - Ungroup button on group cards
- **Files to modify:** `src/components/ai/canvas/CanvasCard.tsx`, `src/components/ai/canvas/CanvasGrid.tsx`, `src/components/ai/canvas/GroupCard.tsx`

### Top Bar Crowded UI
- **Status:** 8+ buttons crammed in the top bar — needs redesign
- **Needed:** Consolidate buttons, use dropdowns or icon-only for less important actions
- **File:** `src/pages/AiPage.tsx` (topbar section ~line 1188)

### Response Text Cutoff
- **Status:** User reported response text being cut off
- **Action needed:** Verify CSS doesn't have max-height or overflow constraints on card body

### Canvas Input Text Box Too Small
- **Status:** User reports input clickable area doesn't match the visual UI size
- **Action needed:** Make `dk-canvas-input` fill the full height of `dk-canvas-input-inner`

---

## PENDING: GROUPING FEATURE SPEC

### Drag-to-Group Interaction
1. User starts dragging a card
2. When dragging over another card, show drop target highlight (cyan border glow)
3. On drop over another card → create a `CanvasGroup` containing both cards
4. Cards reposition inside the group container
5. Group card shows "N responses" header with expand/collapse

### Group UI
- Group container with border, label, and card count
- Cards inside group are positioned relative to group origin
- Ungroup button to拆散 the group
- Group cards can be rearranged within the group

### Implementation Plan
1. Add `hoveredCardId` state to CanvasCard during drag
2. In `handlePointerMove`, detect if pointer is over another card
3. In `handlePointerUp`, if dropped on another card, call `canvas.createGroup()`
4. Add CSS for `.dk-canvas-card.drop-target` highlight
5. Render groups as containers in CanvasGrid
