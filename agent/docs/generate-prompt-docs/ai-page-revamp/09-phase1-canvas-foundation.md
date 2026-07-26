# Phase 1: Canvas Foundation

> Depends on: Phase 0 complete
> Deliverable: Draggable, persistent cards on a grid canvas

---

## Scope

Build the canvas infrastructure that all cards will live on.

## New Files

| File | Purpose |
|------|---------|
| `src/components/canvas/CanvasGrid.tsx` | Main canvas container with grid background, drag layer |
| `src/components/canvas/CanvasCard.tsx` | Wrapper for positioned cards (drag, resize, error boundary) |
| `src/hooks/useCanvasState.ts` | useReducer for canvas state (cards, layout, viewport) |
| `src/types/canvas.ts` | CanvasCard, CanvasState, CanvasAction, CardType types |
| `src/services/canvasPersistence.ts` | localStorage read/write for canvas layout |
| `src/components/canvas/canvas.css` | Grid background, card shadows, drag states |

## Canvas State Model

```ts
// src/types/canvas.ts

export type CardType =
  | 'focus' | 'plan' | 'reflect' | 'finance'
  | 'digest' | 'approval' | 'transient' | 'annotation'

export type CardStatus = 'live' | 'stale' | 'error' | 'loading'

export interface CanvasCard {
  id: string
  type: CardType
  position: { x: number; y: number }  // grid-snapped
  size: { w: number; h: number }      // grid units
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
  layout: { columns: number; gap: number }
  viewport: { x: number; y: number; zoom: number }
}

export type CanvasAction =
  | { type: 'ADD_CARD'; card: CanvasCard }
  | { type: 'UPDATE_CARD'; id: string; patch: Partial<CanvasCard> }
  | { type: 'REMOVE_CARD'; id: string }
  | { type: 'MOVE_CARD'; id: string; position: { x: number; y: number } }
  | { type: 'RESIZE_CARD'; id: string; size: { w: number; h: number } }
  | { type: 'PIN_CARD'; id: string }
  | { type: 'DISMISS_CARD'; id: string }
  | { type: 'SET_STATUS'; id: string; status: CardStatus }
  | { type: 'RESET_LAYOUT' }
  | { type: 'HYDRATE'; state: CanvasState }  // from localStorage
```

## useCanvasState Hook

```ts
// src/hooks/useCanvasState.ts

import { useReducer, useCallback, useEffect } from 'react'
import { canvasReducer, DEFAULT_STATE } from '../types/canvas'
import { loadCanvas, saveCanvas } from '../services/canvasPersistence'
import type { CanvasCard, CanvasState } from '../types/canvas'

export function useCanvasState() {
  const [state, dispatch] = useReducer(canvasReducer, null, () => {
    return loadCanvas() || DEFAULT_STATE
  })

  // Persist on every state change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => saveCanvas(state), 500)
    return () => clearTimeout(timer)
  }, [state])

  const addCard = useCallback((card: CanvasCard) => {
    dispatch({ type: 'ADD_CARD', card })
  }, [])

  const updateCard = useCallback((id: string, patch: Partial<CanvasCard>) => {
    dispatch({ type: 'UPDATE_CARD', id, patch })
  }, [])

  const removeCard = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_CARD', id })
  }, [])

  const moveCard = useCallback((id: string, position: { x: number; y: number }) => {
    dispatch({ type: 'MOVE_CARD', id, position })
  }, [])

  const resizeCard = useCallback((id: string, size: { w: number; h: number }) => {
    dispatch({ type: 'RESIZE_CARD', id, size })
  }, [])

  const pinCard = useCallback((id: string) => {
    dispatch({ type: 'PIN_CARD', id })
  }, [])

  const dismissCard = useCallback((id: string) => {
    dispatch({ type: 'DISMISS_CARD', id })
  }, [])

  const setStatus = useCallback((id: string, status: CanvasCard['status']) => {
    dispatch({ type: 'SET_STATUS', id, status })
  }, [])

  const resetLayout = useCallback(() => {
    dispatch({ type: 'RESET_LAYOUT' })
  }, [])

  const cards = Object.values(state.cards).filter(c => !c.dismissedAt)

  return {
    cards,
    allCards: state.cards,
    layout: state.layout,
    viewport: state.viewport,
    addCard, updateCard, removeCard, moveCard, resizeCard,
    pinCard, dismissCard, setStatus, resetLayout,
  }
}
```

## CanvasGrid Component

```tsx
// src/components/canvas/CanvasGrid.tsx

import { useRef, useCallback } from 'react'
import { CanvasCard } from './CanvasCard'
import type { CanvasCard as CanvasCardType } from '../../types/canvas'
import './canvas.css'

interface CanvasGridProps {
  cards: CanvasCardType[]
  layout: { columns: number; gap: number }
  onMoveCard: (id: string, position: { x: number; y: number }) => void
  onResizeCard: (id: string, size: { w: number; h: number }) => void
  onPinCard: (id: string) => void
  onDismissCard: (id: string) => void
  children?: (card: CanvasCardType) => React.ReactNode  // card content renderer
}

export function CanvasGrid(props: CanvasGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const CELL = 40

  const handleDrop = useCallback((id: string, x: number, y: number) => {
    const snappedX = Math.round(x / CELL) * CELL
    const snappedY = Math.round(y / CELL) * CELL
    props.onMoveCard(id, { x: snappedX, y: snappedY })
  }, [props.onMoveCard])

  return (
    <div className="canvas-grid" ref={gridRef}>
      {props.cards
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(card => (
          <CanvasCard
            key={card.id}
            card={card}
            cellSize={CELL}
            onDrop={handleDrop}
            onPin={props.onPinCard}
            onDismiss={props.onDismissCard}
          >
            {props.children?.(card)}
          </CanvasCard>
        ))}
    </div>
  )
}
```

## CanvasCard Component

```tsx
// src/components/canvas/CanvasCard.tsx

import { useRef, useState, useCallback, type ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import type { CanvasCard as CanvasCardType } from '../../types/canvas'

interface CanvasCardProps {
  card: CanvasCardType
  cellSize: number
  onDrop: (id: string, x: number, y: number) => void
  onPin: (id: string) => void
  onDismiss: (id: string) => void
  children: ReactNode
}

function CardErrorFallback({ cardType, onRetry }: { cardType: string; onRetry: () => void }) {
  return (
    <div className="canvas-card-error">
      <div className="error-icon">⚠</div>
      <div className="error-type">{cardType} card</div>
      <div className="error-message">Something went wrong</div>
      <button onClick={onRetry} className="error-retry">Retry</button>
    </div>
  )
}

export function CanvasCard({ card, cellSize, onDrop, onPin, onDismiss, children }: CanvasCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; cardX: number; cardY: number } | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card-actions')) return
    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      cardX: card.position.x,
      cardY: card.position.y,
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      // Visual feedback only — snap happens on drop
      const el = document.getElementById(`canvas-card-${card.id}`)
      if (el) {
        el.style.transform = `translate(${dragRef.current.cardX + dx}px, ${dragRef.current.cardY + dy}px)`
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      onDrop(card.id, dragRef.current.cardX + dx, dragRef.current.cardY + dy)
      dragRef.current = null
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [card.id, card.position, onDrop])

  return (
    <ErrorBoundary
      fallbackRender={({ resetErrorBoundary }) => (
        <CardErrorFallback cardType={card.type} onRetry={resetErrorBoundary} />
      )}
    >
      <div
        id={`canvas-card-${card.id}`}
        className={`canvas-card ${isDragging ? 'dragging' : ''} status-${card.status}`}
        style={{
          position: 'absolute',
          left: card.position.x,
          top: card.position.y,
          width: card.size.w * cellSize,
          height: card.size.h * cellSize,
          zIndex: card.zIndex,
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="card-header">
          <span className="card-type-badge">{card.type}</span>
          <div className="card-actions">
            <button onClick={() => onPin(card.id)} title={card.pinned ? 'Unpin' : 'Pin'}>
              {card.pinned ? '📌' : '📍'}
            </button>
            <button onClick={() => onDismiss(card.id)} title="Dismiss">✕</button>
          </div>
        </div>
        <div className="card-body">
          {children}
        </div>
      </div>
    </ErrorBoundary>
  )
}
```

## Canvas CSS

```css
/* src/components/canvas/canvas.css */

.canvas-grid {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 80vh;
  background-image:
    linear-gradient(rgba(63, 63, 70, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(63, 63, 70, 0.15) 1px, transparent 1px);
  background-size: 40px 40px;
  background-color: var(--surface);
  overflow: auto;
}

.canvas-card {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  cursor: grab;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
  user-select: none;
}

.canvas-card:hover {
  border-color: var(--line-2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.canvas-card.dragging {
  cursor: grabbing;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border-color: var(--cyan);
  z-index: 9999 !important;
}

.canvas-card.status-loading {
  border-color: rgba(34, 211, 238, 0.3);
}

.canvas-card.status-error {
  border-color: rgba(248, 113, 113, 0.5);
  border-left: 3px solid #f87171;
}

.canvas-card.status-live {
  border-color: rgba(34, 211, 238, 0.4);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
}

.card-type-badge {
  font-size: 10px;
  font-family: var(--mono);
  color: var(--tm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.canvas-card:hover .card-actions {
  opacity: 1;
}

.card-actions button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--tm);
  padding: 2px 4px;
  border-radius: 4px;
}

.card-actions button:hover {
  background: var(--surface);
  color: var(--tp);
}

.card-body {
  padding: 12px;
  overflow: auto;
  height: calc(100% - 37px);
}

.canvas-card-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  color: var(--tm);
}

.error-icon { font-size: 24px; margin-bottom: 8px; }
.error-type { font-size: 11px; font-family: var(--mono); text-transform: uppercase; margin-bottom: 4px; }
.error-message { font-size: 12px; margin-bottom: 12px; }
.error-retry {
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--tp);
  cursor: pointer;
}
.error-retry:hover { background: var(--surface-2); }
```

## Canvas Persistence

```ts
// src/services/canvasPersistence.ts

import type { CanvasState } from '../types/canvas'

const STORAGE_KEY = 'deskflow-canvas-state'

export function loadCanvas(): CanvasState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveCanvas(state: CanvasState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}
```

## Integration with AiPage

In `AiPage.tsx`, import and render the canvas:

```tsx
import { useCanvasState } from '../hooks/useCanvasState'
import { CanvasGrid } from '../components/canvas/CanvasGrid'

// Inside AiPage component:
const canvas = useCanvasState()

// In JSX:
<CanvasGrid
  cards={canvas.cards}
  layout={canvas.layout}
  onMoveCard={canvas.moveCard}
  onResizeCard={canvas.resizeCard}
  onPinCard={canvas.pinCard}
  onDismissCard={canvas.dismissCard}
>
  {(card) => renderCardContent(card)}
</CanvasGrid>
```

## Card Content Renderer (bridge to existing components)

```tsx
function renderCardContent(card: CanvasCard) {
  switch (card.type) {
    case 'focus':
      return <FocusCard data={card.data} />
    case 'plan':
      return <PlanCard data={card.data} />
    case 'finance':
      return <FinanceCard data={card.data} />
    case 'digest':
      return <DigestCard data={card.data} />
    case 'approval':
      return <ApprovalCard data={card.data} cardId={card.id} />
    case 'transient':
      return <TransientCard data={card.data} />
    case 'annotation':
      return <AnnotationCard data={card.data} />
    default:
      return <div>Unknown card type</div>
  }
}
```

## Manual Test Checklist

- [ ] Canvas renders with 40px grid background
- [ ] Cards appear at correct grid positions
- [ ] Cards can be dragged and snap to grid on release
- [ ] Multiple cards can be open simultaneously
- [ ] Card hover shows pin/dismiss buttons
- [ ] Pin button toggles pin state
- [ ] Dismiss button removes card with animation
- [ ] Card crash shows error fallback, not white screen
- [ ] Canvas state persists across page refresh (localStorage)
- [ ] Canvas state persists across Electron restart
- [ ] `npx vite build` passes
- [ ] App launches without black screen
