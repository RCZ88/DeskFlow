# CONTEXT_BUNDLE.md — Canvas Navigation Features

## Task
Add three features to the DeskFlow AI Canvas mode:
1. **Auto-center on load**: Pan viewport to center on populated card area on mount
2. **Smart "Find Cards" / directional arrow**: Detect card cluster, show animated arrow pointing toward it + recenter button
3. **Minimap**: Thumbnail overview of entire canvas, click/drag to navigate

---

## 1. Current Architecture

### CanvasGrid.tsx (src/components/ai/canvas/CanvasGrid.tsx)
```tsx
// lines 1-80 (entire file)
import { useRef, useState, useCallback, useEffect } from 'react'
import { CanvasCard } from './CanvasCard'
import type { CanvasCard as CanvasCardType } from '../../../types/canvas'
import './canvas.css'

interface CanvasGridProps {
  cards: CanvasCardType[]
  onMoveCard: (id: string, position: { x: number; y: number }) => void
  onDismissCard: (id: string) => void
  onPanChange?: (pan: { x: number; y: number }) => void
  initialPan?: { x: number; y: number }
}

export function CanvasGrid({ cards, onMoveCard, onDismissCard, onPanChange, initialPan }: CanvasGridProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState(initialPan || { x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.dk-canvas-card')) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [pan])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    const newPan = { x: panStart.current.panX + dx, y: panStart.current.panY + dy }
    setPan(newPan)
    onPanChange?.(newPan)
  }, [isPanning, onPanChange])

  const handlePointerUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  useEffect(() => {
    if (!viewportRef.current || initialPan) return
    const rect = viewportRef.current.getBoundingClientRect()
    setPan({ x: rect.width / 2 - 2000, y: rect.height / 2 - 2000 })
  }, [initialPan])

  return (
    <div
      ref={viewportRef}
      className={`dk-canvas-viewport ${isPanning ? 'panning' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="dk-canvas-grid-layer"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
      >
        {cards.length === 0 && (
          <div className="dk-canvas-empty" style={{ left: 2000, top: 2000 }}>
            <span>Cards will appear here as you interact with the AI</span>
          </div>
        )}
        {cards
          .sort((a, b) => a.zIndex - b.zIndex)
          .map(card => (
            <CanvasCard
              key={card.id}
              card={card}
              onDragEnd={(id, pos) => {
                onMoveCard(id, { x: pos.x - pan.x, y: pos.y - pan.y })
              }}
              onDismiss={onDismissCard}
              panOffset={pan}
            />
          ))}
      </div>
    </div>
  )
}
```

### CanvasContainer.tsx (src/components/ai/canvas/CanvasContainer.tsx)
```tsx
// lines 1-76 (entire file)
import { useState, useCallback } from 'react'
import { CanvasGrid } from './CanvasGrid'
import { CanvasInput } from './CanvasInput'
import { SaveIndicator } from './SaveIndicator'
import { autoArrange } from '../../../lib/autoArrange'
import type { CanvasCard } from '../../../types/canvas'

interface CanvasContainerProps {
  cards: CanvasCard[]
  onMoveCard: (id: string, pos: { x: number; y: number }) => void
  onDismissCard: (id: string) => void
  onArrangeCards: (positions: Record<string, { x: number; y: number }>) => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onSend: (text: string) => void
  onStop: () => void
  streaming: boolean
  thinking?: boolean
}

export function CanvasContainer({
  cards, onMoveCard, onDismissCard, onArrangeCards,
  saveStatus, onSend, onStop, streaming, thinking,
}: CanvasContainerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleArrange = useCallback(() => {
    const positions = autoArrange(cards)
    onArrangeCards(positions)
  }, [cards, onArrangeCards])

  return (
    <div className={`dk-canvas-container ${isFullscreen ? 'fullscreen' : ''}`}>
      <SaveIndicator status={saveStatus} />
      <div className="dk-canvas-toolbar">
        <button onClick={handleArrange} title="Auto-arrange cards">...</button>
        <button onClick={() => setIsFullscreen(v => !v)} title="Fullscreen">...</button>
      </div>
      <CanvasGrid cards={cards} onMoveCard={onMoveCard} onDismissCard={onDismissCard} />
      <CanvasInput onSend={onSend} onStop={onStop} streaming={streaming} thinking={thinking} />
    </div>
  )
}
```

### useCanvasState.ts (src/hooks/useCanvasState.ts)
```tsx
// lines 1-139 (entire file)
import { useReducer, useState, useCallback, useEffect, useRef } from 'react'
import { canvasReducer, DEFAULT_STATE } from '../types/canvas'
import { loadCanvasLayout, saveCanvasLayout } from '../services/canvasPersistence'
import { generateUUID } from '../lib/uuid'
import type { CanvasCard, CanvasState, CardStatus, CardType } from '../types/canvas'

const DISMISS_TIMEOUT_MS = 30_000
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useCanvasState() {
  const [state, dispatch] = useReducer(canvasReducer, null, () => {
    return loadCanvasLayout() || DEFAULT_STATE
  })
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  // ... (debounced persist, dismiss timers, addCard, updateCard, removeCard, moveCard, pinCard, dismissCard, setStatus, resetLayout, arrangeCards)

  const cards = Object.values(state.cards).filter(c => !c.dismissedAt)

  const arrangeCards = useCallback((positions: Record<string, { x: number; y: number }>) => {
    for (const [id, pos] of Object.entries(positions)) {
      dispatch({ type: 'MOVE_CARD', id, position: pos })
    }
  }, [])

  return { cards, allCards: state.cards, nextZIndex: state.nextZIndex, saveStatus, addCard, updateCard, removeCard, moveCard, pinCard, dismissCard, setStatus, resetLayout, arrangeCards }
}
```

### types/canvas.ts (src/types/canvas.ts)
```tsx
// lines 1-111 (entire file)
export type CardType =
  | 'focus' | 'plan' | 'reflect' | 'finance'
  | 'digest' | 'approval' | 'transient' | 'annotation'
  | 'response' | 'group' | 'connectors'
  | 'schedule' | 'deadlines' | 'planner'

export type CardStatus = 'live' | 'stale' | 'error' | 'loading'

export interface CanvasCard {
  id: string
  type: CardType
  position: { x: number; y: number }
  size: { w: number; h: number }
  zIndex: number
  pinned: boolean
  data: Record<string, any>
  source: 'ai' | 'user' | 'system'
  status: CardStatus
  createdAt: number
  dismissedAt?: number
}

export interface CanvasState {
  cards: Record<string, CanvasCard>
  nextZIndex: number
}

export const DEFAULT_STATE: CanvasState = { cards: {}, nextZIndex: 1 }

export function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'ADD_CARD': return { ...state, cards: { ...state.cards, [action.card.id]: { ...action.card, zIndex: state.nextZIndex } }, nextZIndex: state.nextZIndex + 1 }
    case 'UPDATE_CARD': if (!state.cards[action.id]) return state; return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], ...action.patch } } }
    case 'REMOVE_CARD': { const { [action.id]: _, ...rest } = state.cards; return { ...state, cards: rest } }
    case 'MOVE_CARD': if (!state.cards[action.id]) return state; return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], position: action.position } } }
    case 'PIN_CARD': if (!state.cards[action.id]) return state; return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], pinned: true } } }
    case 'DISMISS_CARD': if (!state.cards[action.id]) return state; return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], dismissedAt: Date.now() } } }
    case 'SET_STATUS': if (!state.cards[action.id]) return state; return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], status: action.status } } }
    case 'RESET_LAYOUT': return DEFAULT_STATE
    case 'HYDRATE': return action.state
    default: return state
  }
}
```

### canvasPersistence.ts (src/services/canvasPersistence.ts)
```tsx
// lines 1-41 (entire file)
import type { CanvasState } from '../types/canvas'
const STORAGE_KEY = 'deskflow-canvas-layout'

export function loadCanvasLayout(): CanvasState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.cards && typeof parsed.cards === 'object') {
      return parsed as CanvasState
    }
    return null
  } catch { return null }
}

export function saveCanvasLayout(state: CanvasState): void {
  try {
    const slim: CanvasState = {
      nextZIndex: state.nextZIndex,
      cards: Object.fromEntries(
        Object.entries(state.cards).map(([id, card]) => [
          id,
          { id: card.id, type: card.type, position: card.position, size: card.size, zIndex: card.zIndex, pinned: card.pinned, source: card.source, createdAt: card.createdAt },
        ])
      ),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
  } catch {}
}
```

### autoArrange.ts (src/lib/autoArrange.ts)
```tsx
// lines 1-37 (entire file)
import type { CanvasCard } from '../types/canvas'
const GAP = 40
const START_X = 2000
const START_Y = 2000

export function autoArrange(cards: CanvasCard[]): Record<string, { x: number; y: number }> {
  const sorted = [...cards].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type)
    return (a.createdAt || 0) - (b.createdAt || 0)
  })
  const positions: Record<string, { x: number; y: number }> = {}
  let currentX = START_X
  let currentY = START_Y
  let rowHeight = 0
  let rowCardCount = 0
  for (const card of sorted) {
    const cardWidth = card.size.w * 40 + GAP
    const cardHeight = card.size.h * 40 + GAP
    if (rowCardCount > 0 && currentX + cardWidth > START_X + 800) {
      currentX = START_X
      currentY += rowHeight + GAP
      rowHeight = 0
      rowCardCount = 0
    }
    positions[card.id] = { x: currentX, y: currentY }
    currentX += cardWidth
    rowHeight = Math.max(rowHeight, cardHeight)
    rowCardCount++
  }
  return positions
}
```

### design-tokens.css (src/components/ai/design-tokens.css)
```css
:root {
  --dk-bg-deep: #09090b;
  --dk-bg-base: #111118;
  --dk-bg-surface: rgba(20, 20, 25, 0.92);
  --dk-bg-raised: rgba(30, 30, 35, 0.95);
  --dk-bg-input: rgba(24, 24, 27, 0.9);
  --dk-text-primary: #f4f4f5;
  --dk-text-secondary: #d4d4d8;
  --dk-text-muted: #a1a1aa;
  --dk-text-faint: #71717a;
  --dk-text-placeholder: #52525b;
  --dk-border-subtle: rgba(63, 63, 70, 0.25);
  --dk-border-default: rgba(63, 63, 70, 0.5);
  --dk-border-strong: rgba(63, 63, 70, 0.7);
  --dk-border-focus: rgba(161, 161, 170, 0.4);
  --dk-accent: #22d3ee;
  --dk-accent-dim: rgba(34, 211, 238, 0.15);
  --dk-success: #4ade80;
  --dk-warning: #fbbf24;
  --dk-danger: #f87171;
  --dk-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --dk-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --dk-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
  --dk-shadow-glow: 0 0 30px rgba(34, 211, 238, 0.06);
  --dk-space-1: 4px;
  --dk-space-2: 8px;
  --dk-space-3: 12px;
  --dk-space-4: 16px;
  --dk-space-5: 20px;
  --dk-space-6: 24px;
  --dk-radius-sm: 6px;
  --dk-radius-md: 10px;
  --dk-radius-lg: 12px;
  --dk-cell: 40px;
  --dk-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --dk-fast: 150ms;
  --dk-normal: 250ms;
  --dk-slow: 400ms;
  --dk-sans: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --dk-mono: 'JetBrains Mono', 'SF Mono', Monaco, monospace;
}
```

---

## 2. Key Invariants

1. **Grid layer is 4000×4000px** with center at (2000, 2000). Cards are positioned relative to this grid origin.
2. **Pan is CSS `translate()` on `.dk-canvas-grid-layer`** — not scroll-based. Pan = viewport offset from grid origin.
3. **Initial pan** centers viewport on grid center: `{ x: rect.width/2 - 2000, y: rect.height/2 - 2000 }`
4. **Card positions** are stored in grid coordinates (0-4000 range, typically centered around 2000,2000)
5. **CanvasGrid exposes** `pan` state via `onPanChange` callback. Parent does NOT control pan directly.
6. **Cards are `position: absolute`** inside `.dk-canvas-grid-layer`
7. **Design tokens** in `design-tokens.css` — all new CSS must use `--dk-*` variables
8. **Dark mode only** — no light mode support
9. **No external dependencies** — pure React + CSS, no libraries

---

## 3. What Needs to Be Built

### Feature 1: Auto-center on populated area (on mount)
**Current behavior**: On mount, CanvasGrid centers on grid center (2000, 2000). If cards are clustered elsewhere, user must pan to find them.
**Desired behavior**: On mount, compute bounding box of all non-dismissed cards, then pan viewport so the center of that bounding box is in the center of the viewport.

### Feature 2: Smart "Find Cards" / directional arrow
**Problem**: User pans away from cards and gets lost. No way to know where cards are.
**Desired behavior**:
- When no cards are visible in the viewport, show a floating pill/button at the viewport edge (top/bottom/left/right) with an animated arrow pointing toward the nearest card cluster
- Also show a "Recenter" button that smoothly animates pan to center on the card cluster
- The arrow direction = angle from viewport center to card cluster center
- The pill should appear/disappear based on whether cards are currently visible

### Feature 3: Minimap
**Desired behavior**:
- Small overlay (e.g., 160×120px) in bottom-right corner
- Shows a bird's-eye view of the entire 4000×4000 grid
- Each card shown as a small colored dot/rectangle (color = card type)
- Current viewport shown as a translucent rectangle outline
- Click anywhere on minimap → pan viewport to that location
- Drag on minimap → continuous viewport pan (like Google Maps minimap)

---

## 4. Affected Files

| File | Change |
|------|--------|
| `src/components/ai/canvas/CanvasGrid.tsx` | Expose pan setter via `ref` or controlled prop. Add auto-center on mount logic. Add card visibility detection. |
| `src/components/ai/canvas/CanvasContainer.tsx` | Import + render new components: FindCardsArrow, Minimap. Pass cards + pan to them. |
| `src/components/ai/canvas/CanvasMinimap.tsx` | NEW — minimap overlay component |
| `src/components/ai/canvas/FindCardsArrow.tsx` | NEW — directional arrow + recenter button |
| `src/components/ai/canvas/canvas.css` | Add styles for minimap, arrow, recenter button |
| `src/hooks/useCanvasState.ts` | Expose `pan` setter (or expose `setPan` from CanvasGrid via callback) |
