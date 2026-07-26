# Phase 1: Canvas Foundation — Implementation Plan

> Depends on: Phase 0 complete
> Scope: Grid, card wrapper, state system. No card types. No command palette.
> Status: READY TO IMPLEMENT

---

## 1. `src/types/canvas.ts` — Type Definitions

```ts
export type CardType =
  | 'focus' | 'plan' | 'reflect' | 'finance'
  | 'digest' | 'approval' | 'transient' | 'annotation'

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

export type CanvasAction =
  | { type: 'ADD_CARD'; card: CanvasCard }
  | { type: 'UPDATE_CARD'; id: string; patch: Partial<CanvasCard> }
  | { type: 'REMOVE_CARD'; id: string }
  | { type: 'MOVE_CARD'; id: string; position: { x: number; y: number } }
  | { type: 'PIN_CARD'; id: string }
  | { type: 'DISMISS_CARD'; id: string }
  | { type: 'SET_STATUS'; id: string; status: CardStatus }
  | { type: 'RESET_LAYOUT' }
  | { type: 'HYDRATE'; state: CanvasState }

export const DEFAULT_CARDS: Record<string, CanvasCard> = {}

export const DEFAULT_STATE: CanvasState = {
  cards: DEFAULT_CARDS,
  nextZIndex: 1,
}

export function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'ADD_CARD':
      return {
        ...state,
        cards: { ...state.cards, [action.card.id]: action.card },
        nextZIndex: state.nextZIndex + 1,
      }
    case 'UPDATE_CARD':
      if (!state.cards[action.id]) return state
      return {
        ...state,
        cards: {
          ...state.cards,
          [action.id]: { ...state.cards[action.id], ...action.patch },
        },
      }
    case 'REMOVE_CARD': {
      const { [action.id]: _, ...rest } = state.cards
      return { ...state, cards: rest }
    }
    case 'MOVE_CARD':
      if (!state.cards[action.id]) return state
      return {
        ...state,
        cards: {
          ...state.cards,
          [action.id]: { ...state.cards[action.id], position: action.position },
        },
      }
    case 'PIN_CARD':
      if (!state.cards[action.id]) return state
      return {
        ...state,
        cards: {
          ...state.cards,
          [action.id]: { ...state.cards[action.id], pinned: true },
        },
      }
    case 'DISMISS_CARD':
      if (!state.cards[action.id]) return state
      return {
        ...state,
        cards: {
          ...state.cards,
          [action.id]: { ...state.cards[action.id], dismissedAt: Date.now() },
        },
      }
    case 'SET_STATUS':
      if (!state.cards[action.id]) return state
      return {
        ...state,
        cards: {
          ...state.cards,
          [action.id]: { ...state.cards[action.id], status: action.status },
        },
      }
    case 'RESET_LAYOUT':
      return DEFAULT_STATE
    case 'HYDRATE':
      return action.state
    default:
      return state
  }
}
```

---

## 2. `src/services/canvasPersistence.ts` — Layout Persistence

```ts
import type { CanvasState } from '../types/canvas'

const STORAGE_KEY = 'deskflow-canvas-layout'

export function loadCanvasLayout(): CanvasState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Validate basic structure
    if (parsed && typeof parsed === 'object' && parsed.cards && typeof parsed.cards === 'object') {
      return parsed as CanvasState
    }
    return null
  } catch {
    return null
  }
}

export function saveCanvasLayout(state: CanvasState): void {
  try {
    // Only persist position, size, zIndex, pinned — not live data
    const slim: CanvasState = {
      nextZIndex: state.nextZIndex,
      cards: Object.fromEntries(
        Object.entries(state.cards).map(([id, card]) => [
          id,
          {
            id: card.id,
            type: card.type,
            position: card.position,
            size: card.size,
            zIndex: card.zIndex,
            pinned: card.pinned,
            source: card.source,
            createdAt: card.createdAt,
            // Omit: data, status, dismissedAt (runtime only)
          },
        ])
      ),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
  } catch {}
}
```

---

## 3. `src/hooks/useCanvasState.ts` — State Management

```ts
import { useReducer, useCallback, useEffect, useRef } from 'react'
import { canvasReducer, DEFAULT_STATE } from '../types/canvas'
import { loadCanvasLayout, saveCanvasLayout } from '../services/canvasPersistence'
import type { CanvasCard, CanvasState, CardStatus, CardType } from '../types/canvas'

const DISMISS_TIMEOUT_MS = 30_000

export function useCanvasState() {
  const [state, dispatch] = useReducer(canvasReducer, null, () => {
    return loadCanvasLayout() || DEFAULT_STATE
  })

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Debounced persist
  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => saveCanvasLayout(state), 500)
    return () => { if (persistTimer.current) clearTimeout(persistTimer.current) }
  }, [state])

  // Cleanup dismiss timers on unmount
  useEffect(() => {
    return () => {
      dismissTimers.current.forEach(t => clearTimeout(t))
      dismissTimers.current.clear()
    }
  }, [])

  const addCard = useCallback((
    type: CardType,
    data: Record<string, any>,
    opts?: { position?: { x: number; y: number }; size?: { w: number; h: number }; pinned?: boolean; source?: CanvasCard['source'] }
  ) => {
    const id = `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const card: CanvasCard = {
      id,
      type,
      position: opts?.position ?? { x: 40, y: 40 },
      size: opts?.size ?? { w: 8, h: 5 },
      zIndex: 0, // set by reducer
      pinned: opts?.pinned ?? false,
      data,
      source: opts?.source ?? 'ai',
      status: 'live',
      createdAt: Date.now(),
    }
    dispatch({ type: 'ADD_CARD', card })

    // Auto-dismiss transient cards
    if (!card.pinned) {
      const timer = setTimeout(() => {
        dispatch({ type: 'DISMISS_CARD', id })
        dismissTimers.current.delete(id)
      }, DISMISS_TIMEOUT_MS)
      dismissTimers.current.set(id, timer)
    }

    return id
  }, [])

  const updateCard = useCallback((id: string, patch: Partial<CanvasCard>) => {
    dispatch({ type: 'UPDATE_CARD', id, patch })
  }, [])

  const removeCard = useCallback((id: string) => {
    const timer = dismissTimers.current.get(id)
    if (timer) { clearTimeout(timer); dismissTimers.current.delete(id) }
    dispatch({ type: 'REMOVE_CARD', id })
  }, [])

  const moveCard = useCallback((id: string, position: { x: number; y: number }) => {
    dispatch({ type: 'MOVE_CARD', id, position })
  }, [])

  const pinCard = useCallback((id: string) => {
    // Cancel auto-dismiss when pinning
    const timer = dismissTimers.current.get(id)
    if (timer) { clearTimeout(timer); dismissTimers.current.delete(id) }
    dispatch({ type: 'PIN_CARD', id })
  }, [])

  const dismissCard = useCallback((id: string) => {
    const timer = dismissTimers.current.get(id)
    if (timer) { clearTimeout(timer); dismissTimers.current.delete(id) }
    dispatch({ type: 'DISMISS_CARD', id })
  }, [])

  const setStatus = useCallback((id: string, status: CardStatus) => {
    dispatch({ type: 'SET_STATUS', id, status })
  }, [])

  const resetLayout = useCallback(() => {
    dismissTimers.current.forEach(t => clearTimeout(t))
    dismissTimers.current.clear()
    dispatch({ type: 'RESET_LAYOUT' })
  }, [])

  const cards = Object.values(state.cards).filter(c => !c.dismissedAt)

  return {
    cards,
    allCards: state.cards,
    nextZIndex: state.nextZIndex,
    addCard,
    updateCard,
    removeCard,
    moveCard,
    pinCard,
    dismissCard,
    setStatus,
    resetLayout,
  }
}
```

---

## 4. `src/components/ai/canvas/CanvasGrid.tsx` — Root Canvas

```tsx
import { type ReactNode } from 'react'
import { CanvasCard } from './CanvasCard'
import type { CanvasCard as CanvasCardType } from '../../../types/canvas'
import './canvas.css'

interface CanvasGridProps {
  cards: CanvasCardType[]
  onMoveCard: (id: string, position: { x: number; y: number }) => void
  onPinCard: (id: string) => void
  onDismissCard: (id: string) => void
  children: ReactNode
}

export function CanvasGrid({ cards, onMoveCard, onPinCard, onDismissCard, children }: CanvasGridProps) {
  return (
    <div className="dk-canvas-grid">
      {cards
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(card => (
          <CanvasCard
            key={card.id}
            card={card}
            onDragEnd={onMoveCard}
            onDismiss={onDismissCard}
          >
            {children}
          </CanvasCard>
        ))}
    </div>
  )
}
```

---

## 5. `src/components/ai/canvas/CanvasCard.tsx` — Card Wrapper

```tsx
import { useRef, useState, useCallback, type ReactNode } from 'react'
import { CanvasCardFallback } from './CanvasCardFallback'
import type { CanvasCard as CanvasCardType } from '../../../types/canvas'

const CELL = 40

interface CanvasCardProps {
  card: CanvasCardType
  onDragEnd: (id: string, position: { x: number; y: number }) => void
  onDismiss: (id: string) => void
  children: ReactNode
}

// Simple error boundary (class component required for error boundaries)
import { Component, type ErrorInfo } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class CardErrorBoundary extends Component<
  { cardType: string; onRetry: () => void; onDismiss: () => void; children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[CanvasCard] ${this.props.cardType} crashed:`, error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <CanvasCardFallback
          cardType={this.props.cardType}
          error={this.state.error?.message || 'Unknown error'}
          onRetry={() => this.setState({ hasError: false, error: null })}
          onDismiss={this.props.onDismiss}
        />
      )
    }
    return this.props.children
  }
}

export function CanvasCard({ card, onDragEnd, onDismiss, children }: CanvasCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Don't drag if clicking a button or interactive element
    if ((e.target as HTMLElement).closest('button, input, textarea, select, a')) return
    if (!card.pinned && card.type !== 'approval') return // only pinned/approval cards are draggable

    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: card.position.x,
      origY: card.position.y,
    }
  }, [card.position, card.pinned, card.type])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !cardRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    cardRef.current.style.transform = `translate(${dragRef.current.origX + dx}px, ${dragRef.current.origY + dy}px)`
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const rawX = dragRef.current.origX + dx
    const rawY = dragRef.current.origY + dy
    // Snap to grid
    const snappedX = Math.round(rawX / CELL) * CELL
    const snappedY = Math.round(rawY / CELL) * CELL
    onDragEnd(card.id, { x: Math.max(0, snappedX), y: Math.max(0, snappedY) })
    dragRef.current = null
    setIsDragging(false)
  }, [card.id, onDragEnd])

  const isTransient = !card.pinned && card.source === 'ai'

  return (
    <CardErrorBoundary cardType={card.type} onRetry={() => {}} onDismiss={() => onDismiss(card.id)}>
      <div
        ref={cardRef}
        className={`dk-canvas-card ${isDragging ? 'dragging' : ''} ${isTransient ? 'transient' : ''} status-${card.status}`}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: card.size.w * CELL,
          height: card.size.h * CELL,
          transform: `translate(${card.position.x}px, ${card.position.y}px)`,
          zIndex: card.zIndex,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="dk-canvas-card-header">
          <span className="dk-canvas-card-type">{card.type}</span>
          <div className="dk-canvas-card-actions">
            {card.pinned && <span className="dk-canvas-pin">📌</span>}
            <button className="dk-canvas-dismiss" onClick={() => onDismiss(card.id)} title="Dismiss">✕</button>
          </div>
        </div>
        <div className="dk-canvas-card-body">
          {children}
        </div>
      </div>
    </CardErrorBoundary>
  )
}
```

---

## 6. `src/components/ai/canvas/CanvasCardFallback.tsx` — Error Fallback

```tsx
interface CanvasCardFallbackProps {
  cardType: string
  error: string
  onRetry: () => void
  onDismiss: () => void
}

export function CanvasCardFallback({ cardType, error, onRetry, onDismiss }: CanvasCardFallbackProps) {
  return (
    <div className="dk-canvas-card dk-canvas-card-error">
      <div className="dk-canvas-error-icon">⚠</div>
      <div className="dk-canvas-error-type">{cardType}</div>
      <div className="dk-canvas-error-msg">{error}</div>
      <div className="dk-canvas-error-actions">
        <button onClick={onRetry} className="dk-canvas-btn-retry">Retry</button>
        <button onClick={onDismiss} className="dk-canvas-btn-dismiss">Dismiss</button>
      </div>
    </div>
  )
}
```

---

## 7. `src/components/ai/canvas/canvas.css` — Canvas Styles

```css
/* Canvas Grid — 40px background grid */
.dk-canvas-grid {
  position: relative;
  width: 100%;
  min-height: 100%;
  background-color: #0a0a0f;
  background-image:
    linear-gradient(rgba(63, 63, 70, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(63, 63, 70, 0.12) 1px, transparent 1px);
  background-size: 40px 40px;
  overflow: auto;
  padding: 20px;
}

/* Canvas Card — base */
.dk-canvas-card {
  background: #111118;
  border: 1px solid #1e1e2a;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  cursor: grab;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
  user-select: none;
}

.dk-canvas-card:hover {
  border-color: #2a2a3a;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.dk-canvas-card.dragging {
  cursor: grabbing;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border-color: #22d3ee;
  z-index: 9999 !important;
}

/* Transient cards — translucent, dashed border */
.dk-canvas-card.transient {
  opacity: 0.85;
  border-style: dashed;
  border-color: #2a2a3a;
}

.dk-canvas-card.transient:hover {
  opacity: 1;
}

/* Status variants */
.dk-canvas-card.status-live { border-left: 3px solid #22d3ee; }
.dk-canvas-card.status-loading { border-left: 3px solid #fbbf24; }
.dk-canvas-card.status-error { border-left: 3px solid #f87171; }
.dk-canvas-card.status-stale { border-left: 3px solid #52525b; }

/* Card header */
.dk-canvas-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #1e1e2a;
}

.dk-canvas-card-type {
  font-size: 10px;
  font-family: var(--mono, 'JetBrains Mono', monospace);
  color: #71717a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dk-canvas-card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.dk-canvas-card:hover .dk-canvas-card-actions {
  opacity: 1;
}

.dk-canvas-pin {
  font-size: 12px;
  margin-right: 4px;
}

.dk-canvas-dismiss {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: #71717a;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
}

.dk-canvas-dismiss:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #a1a1aa;
}

/* Card body */
.dk-canvas-card-body {
  padding: 12px;
  overflow: auto;
}

/* Error fallback */
.dk-canvas-card-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  cursor: default;
}

.dk-canvas-error-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.dk-canvas-error-type {
  font-size: 11px;
  font-family: var(--mono, 'JetBrains Mono', monospace);
  color: #71717a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.dk-canvas-error-msg {
  font-size: 12px;
  color: #52525b;
  margin-bottom: 16px;
  max-width: 200px;
}

.dk-canvas-error-actions {
  display: flex;
  gap: 8px;
}

.dk-canvas-btn-retry,
.dk-canvas-btn-dismiss {
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #1e1e2a;
  cursor: pointer;
  transition: background 0.15s;
}

.dk-canvas-btn-retry {
  background: #1a1a24;
  color: #e4e4e7;
}

.dk-canvas-btn-retry:hover {
  background: #22d3ee;
  color: #0a0a0f;
}

.dk-canvas-btn-dismiss {
  background: transparent;
  color: #71717a;
}

.dk-canvas-btn-dismiss:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #a1a1aa;
}
```

---

## 8. Integration into `AiPage.tsx`

### Decision: Render canvas ALONGSIDE existing deck, not replacing it

The existing AiPageDeck with its ExpandableCards, ChatPanel, and all board components is fully functional. Replacing it in one shot is too risky. Instead:

1. Add a `canvasMode` toggle (default: false)
2. When `canvasMode` is false: render existing AiPageDeck (no change)
3. When `canvasMode` is true: render CanvasGrid with cards
4. A toggle button in the topbar switches between modes

This way existing functionality is preserved, and we can incrementally migrate cards to the canvas.

### Edits to `AiPage.tsx`

**Add imports at top:**

```tsx
import { useCanvasState } from '../hooks/useCanvasState'
import { CanvasGrid } from '../components/ai/canvas/CanvasGrid'
```

**Add state after existing state declarations:**

```tsx
const [canvasMode, setCanvasMode] = useState(false)
const canvas = useCanvasState()
```

**Add toggle button in topbar (after the existing "History" button):**

```tsx
<button
  onClick={() => setCanvasMode(v => !v)}
  className="dk-topbar-btn"
  style={{ height: 26, padding: "0 10px" }}
>
  <span style={{ fontSize: 11, fontFamily: "var(--mono)" }}>
    {canvasMode ? '📊 Deck' : '🗺️ Canvas'}
  </span>
</button>
```

**Add canvas rendering AFTER the existing AiPageDeck (inside the bootState === 'ready' block):**

```tsx
{canvasMode && (
  <div style={{ marginTop: 16 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#a1a1aa' }}>Canvas</h3>
      <span style={{ fontSize: 10, color: '#52525b', fontFamily: 'var(--mono)' }}>
        {canvas.cards.length} cards · Drag to reposition
      </span>
    </div>
    <CanvasGrid
      cards={canvas.cards}
      onMoveCard={canvas.moveCard}
      onPinCard={canvas.pinCard}
      onDismissCard={canvas.dismissCard}
    >
      <div style={{ color: '#52525b', fontSize: 12, textAlign: 'center', padding: 40 }}>
        Cards will appear here as you interact with the AI
      </div>
    </CanvasGrid>
  </div>
)}
```

### What gets wrapped as CanvasCards (Phase 1 — layout only, no content migration yet)

In Phase 1, the canvas is EMPTY by default. Cards only appear when:
- The AI generates a `CardGeneration` response (Phase 2)
- The user manually adds cards via the command palette (Phase 2)

The existing ExpandableCards (Focus, Plan, Digest, Reflect, Connectors) remain in the AiPageDeck. They will be migrated to CanvasCards in Phase 4.

---

## 9. Files Summary

| File | Action | Lines |
|------|--------|-------|
| `src/types/canvas.ts` | **NEW** | ~90 |
| `src/services/canvasPersistence.ts` | **NEW** | ~40 |
| `src/hooks/useCanvasState.ts` | **NEW** | ~120 |
| `src/components/ai/canvas/CanvasGrid.tsx` | **NEW** | ~35 |
| `src/components/ai/canvas/CanvasCard.tsx` | **NEW** | ~130 |
| `src/components/ai/canvas/CanvasCardFallback.tsx` | **NEW** | ~30 |
| `src/components/ai/canvas/canvas.css` | **NEW** | ~140 |
| `src/pages/AiPage.tsx` | **EDIT** | ~20 lines added |

---

## 10. Manual Test Checklist

- [ ] Canvas grid renders with 40px background pattern on dark background
- [ ] Toggle button switches between Deck view and Canvas view
- [ ] Canvas view shows empty state message ("Cards will appear here...")
- [ ] Existing Deck view still works identically (no regression)
- [ ] `npx vite build` passes with no errors
- [ ] Preload rebuilds (> 70KB)
- [ ] App launches without black screen
- [ ] Canvas state persists in localStorage (check DevTools → Application → Local Storage)
- [ ] Page refresh restores canvas state
- [ ] No console errors on page load
