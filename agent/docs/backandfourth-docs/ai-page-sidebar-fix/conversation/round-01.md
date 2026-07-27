# Round 01 — Specialist Questions + Owner Responses

## Date: 2026-07-27
## Status: In Progress

---

## Specialist's Opening Questions

Based on the context bundle, here are the 3-5 most likely root causes and what I need to investigate:

### Hypothesis 1: CSS Stacking Context War
The `dk-root` with `position: relative` + `overflow: hidden` combined with `dk-wrap`'s `overflow-y: auto` may create a stacking context that traps pointer events within the main content area, preventing them from reaching the sidebar at `z-20`.

**REQUEST: src/components/ai/canvas/CanvasContainer.tsx** — I need to see if the canvas container adds any z-index or pointer-events styles that could compete with the sidebar.

### Hypothesis 2: Invisible Overlay from Canvas Viewport
The `.dk-canvas-viewport` with `position: absolute; inset: 0` fills the entire canvas area. If the canvas container or any parent creates a stacking context above the sidebar, this viewport could intercept clicks.

**REQUEST: src/components/ai/canvas/CanvasGrid.tsx** — I need to see if the viewport has any event handlers that call `stopPropagation()` or `preventDefault()`.

### Hypothesis 3: Framer Motion Transform Creating Stacking Context
The sidebar `motion.div` uses `animate={{ width: ... }}` which applies a CSS transform. Transforms create new stacking contexts. If the main content area also has transforms (from AnimatePresence or page transitions), there could be a stacking context conflict.

**REQUEST: src/App.tsx lines 2676-2754** — I need to see the exact Routes/AnimatePresence structure and whether any motion.div wraps the route components.

### Hypothesis 4: dk-root * Box-Sizing Rule
The CSS rule `.dk-root * { box-sizing: border-box; }` applies to ALL children of dk-root. While this shouldn't affect the sidebar (which is outside dk-root), I want to verify there's no CSS specificity issue.

**No additional request needed** — this is low probability, already covered by context bundle.

### Hypothesis 5: Toast Container z-50 Competition
The toast container has `fixed bottom-6 right-6 z-50`. While it's positioned in the bottom-right corner, if there are many toasts or if the container somehow extends, it could compete with the sidebar.

**No additional request needed** — already covered by context bundle. Low probability since it's corner-positioned.

---

## Owner's Responses

### Response to Hypothesis 1 (CanvasContainer):

**CONTEXT: src/components/ai/canvas/CanvasContainer.tsx (full source)**

```tsx
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { CanvasGrid } from './CanvasGrid'
import { CanvasInput } from './CanvasInput'
import { SaveIndicator } from './SaveIndicator'
import { CanvasMinimap } from './CanvasMinimap'
import { FindCardsArrow } from './FindCardsArrow'
import { autoArrange } from '../../../lib/autoArrange'
import type { CanvasCard } from '../../../types/canvas'

interface CanvasContainerProps {
  cards: CanvasCard[]
  onMoveCard: (id: string, pos: { x: number; y: number }) => void
  onDismissCard: (id: string) => void
  onArrangeCards: (positions: Record<string, { x: number; y: number }>) => void
  onPinCard?: (id: string) => void
  onResizeCard?: (id: string, size: { w: number; h: number }) => void
  onCardClick?: (id: string) => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onSend: (text: string) => void
  onStop: () => void
  streaming: boolean
  thinking?: boolean
}

export function CanvasContainer({
  cards, onMoveCard, onDismissCard, onArrangeCards, onPinCard, onResizeCard, onCardClick,
  saveStatus, onSend, onStop, streaming, thinking,
}: CanvasContainerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const hasAutoCentered = useRef(false)

  // ... ResizeObserver, auto-center, arrange, recenter, zoom handlers ...

  return (
    <div ref={containerRef} className={`dk-canvas-container ${isFullscreen ? 'fullscreen' : ''}`}>
      <SaveIndicator status={saveStatus} />
      <div className="dk-canvas-toolbar">...</div>
      <CanvasGrid ... />
      {!anyCardVisible && clusterCenter && viewportSize.w > 0 && (
        <FindCardsArrow ... />
      )}
    </div>
  )
}
```

**Key finding:** CanvasContainer has NO z-index on the non-fullscreen state. The `fullscreen` class adds `position: fixed; inset: 0; z-index: 9999` but `isFullscreen` defaults to `false`. No global event listeners. No pointer-events manipulation.

### Response to Hypothesis 2 (CanvasGrid):

**CONTEXT: src/components/ai/canvas/CanvasGrid.tsx (full source)**

```tsx
import { useRef, useCallback, useState, useEffect } from 'react'
import { CanvasCard } from './CanvasCard'
import type { CanvasCard as CanvasCardType } from '../../../types/canvas'
import './canvas.css'

interface CanvasGridProps {
  cards: CanvasCardType[]
  pan: { x: number; y: number }
  onPanChange: (pan: { x: number; y: number }) => void
  zoom: number
  onZoomChange: (zoom: number, pan: { x: number; y: number }) => void
  onMoveCard: (id: string, position: { x: number; y: number }) => void
  onDismissCard: (id: string) => void
  onPinCard?: (id: string) => void
  onResizeCard?: (id: string, size: { w: number; h: number }) => void
  onCardClick?: (id: string) => void
  isPanning: boolean
  setIsPanning: (v: boolean) => void
}

export function CanvasGrid({
  cards, pan, onPanChange, zoom, onZoomChange, onMoveCard, onDismissCard,
  onPinCard, onResizeCard, onCardClick, isPanning, setIsPanning,
}: CanvasGridProps) {
  const viewportRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.dk-canvas-card')) return
    if ((e.target as HTMLElement).closest('.dk-minimap')) return
    if ((e.target as HTMLElement).closest('.dk-find-arrow')) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }, [pan, setIsPanning])

  // Native wheel listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      // ... zoom logic ...
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [onZoomChange])

  return (
    <div
      ref={viewportRef}
      className={`dk-canvas-viewport ${isPanning ? 'panning' : ''}`}
      style={bgStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div ref={gridLayerRef} className="dk-canvas-grid-layer" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        {cards.sort(...).map(card => (
          <CanvasCard ... />
        ))}
      </div>
    </div>
  )
}
```

**Key finding:** CanvasGrid has `onPointerDown` on the viewport div. It checks if the target is inside `.dk-canvas-card`, `.dk-minimap`, or `.dk-find-arrow` before starting pan. The wheel handler calls `e.preventDefault()` but only on the viewport element (not document-level). No `stopPropagation()` calls. The viewport is contained within `.dk-canvas-container` which is within `.dk-wrap` — it should NOT reach the sidebar.

### Response to Hypothesis 3 (AnimatePresence + Routes):

**CONTEXT: src/App.tsx (Routes structure, lines 2676-2754)**

```tsx
{/* Main Scroll Area */}
<div className={`flex-1 min-h-0 ${location.pathname === '/terminal' ? 'flex flex-col overflow-hidden' : 'overflow-auto p-5'}`}>
  <ErrorBoundary>
  <AnimatePresence mode="sync">
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<DashboardPage ... />} />
      <Route path="/activity" element={<ActivityPage ... />} />
      <Route path="/stats" element={<Navigate to="/activity?tab=apps" replace />} />
      <Route path="/productivity" element={<Navigate to="/activity?tab=productivity" replace />} />
      <Route path="/browser" element={<Navigate to="/activity?tab=websites" replace />} />
      <Route path="/ide" element={<IDEProjectsPage ... />} />
      <Route path="/external" element={<ExternalPage ... />} />
      <Route path="/ai" element={<AiPage />} />
      <Route path="/finance" element={<FinancePage />} />
      <Route path="/resume" element={<ResumePage />} />
      <Route path="/terminal" element={<TerminalPage />} />
      <Route path="/reports" element={<InsightsPage ... />} />
      <Route path="/database" element={<DatabasePage />} />
      <Route path="/settings" element={<SettingsPage ... />} />
    </Routes>
  </AnimatePresence>
  </ErrorBoundary>
  ...modals (unsaved warning, workspace warning, sleep detection, export, database, AI summary)...
  ...AFK prompt...
  ...gap drawer...
  ...pair phone modal...
</div>
```

**Key finding:** Routes are NOT wrapped in `motion.div`. `AnimatePresence mode="sync"` wraps `Routes` directly. Since `Routes` is not a `motion` component, AnimatePresence may not function correctly here — but this shouldn't cause sidebar issues. The route components (like `AiPage`) are rendered directly without motion wrappers.

---

## Decisions Made
1. CanvasContainer and CanvasGrid have NO z-index or pointer-events issues in non-fullscreen mode
2. The wheel handler's `preventDefault()` is scoped to the viewport element, not document-level
3. AnimatePresence wraps Routes directly (not motion components) — may not animate but shouldn't break sidebar
4. All modals are properly gated behind state conditions

## Convergence Status
**Ongoing** — Need to check compiled CSS output and compare with working pages.
