# Canvas Redesign — Context Bundle

> Self-contained source code reference for the AI Canvas system.
> Target AI uses this to understand the full architecture before redesigning.

---

## 1. Design Tokens — `src/components/ai/design-tokens.css`

```css
:root {
  /* ── Background Scale ── */
  --dk-bg-deep: #000000;
  --dk-bg-base: #09090b;
  --dk-bg-surface: rgba(9, 9, 11, 0.80);
  --dk-bg-raised: rgba(24, 24, 27, 0.65);
  --dk-bg-input: rgba(24, 24, 27, 0.85);
  --dk-bg-overlay: rgba(0, 0, 0, 0.60);

  /* ── Text Scale ── */
  --dk-text-primary: #fafafa;
  --dk-text-secondary: #a1a1aa;
  --dk-text-muted: #71717a;
  --dk-text-ghost: #52525b;

  /* ── Border Scale ── */
  --dk-border-subtle: rgba(255, 255, 255, 0.06);
  --dk-border-default: rgba(255, 255, 255, 0.09);
  --dk-border-strong: rgba(255, 255, 255, 0.14);
  --dk-border-focus: rgba(255, 255, 255, 0.20);

  /* ── Accent ── */
  --dk-accent: #fafafa;
  --dk-accent-dim: rgba(250, 250, 250, 0.12);

  /* ── Semantic ── */
  --dk-success: #22c55e;
  --dk-warning: #eab308;
  --dk-danger: #ef4444;
  --dk-info: #3b82f6;

  /* ── Shadows ── */
  --dk-shadow-sm: 0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03);
  --dk-shadow-md: 0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04);
  --dk-shadow-lg: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
  --dk-shadow-glow: 0 0 20px rgba(250,250,250,0.06);

  /* ── Radius ── */
  --dk-radius-sm: 6px;
  --dk-radius-md: 10px;
  --dk-radius-lg: 12px;

  /* ── Grid ── */
  --dk-cell: 40px;

  /* ── Easing ── */
  --dk-ease: cubic-bezier(0.16, 1, 0.3, 1);

  /* ── Typography ── */
  --dk-sans: 'Inter', system-ui, sans-serif;
  --dk-display: 'Space Grotesk', system-ui, sans-serif;
  --dk-mono: 'JetBrains Mono', monospace;
}

/* ── Glass Utilities ── */
.dk-glass {
  background: rgba(24,24,27,0.55);
  backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid rgba(255,255,255,0.08);
}

.dk-glass-heavy {
  background: rgba(24,24,27,0.72);
  backdrop-filter: blur(40px) saturate(1.8);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
}

.dk-glass-card {
  background: linear-gradient(165deg, rgba(24,24,27,0.70) 0%, rgba(9,9,11,0.50) 100%);
  backdrop-filter: blur(24px) saturate(1.8);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06);
}

/* ── Typography ── */
.dk-text-display { font-family: var(--dk-display); font-weight: 600; letter-spacing: -0.02em; }
.dk-text-body { font-family: var(--dk-sans); font-weight: 400; }
.dk-text-mono { font-family: var(--dk-mono); font-weight: 400; }
.dk-text-label { font-family: var(--dk-sans); font-weight: 500; font-size: 0.75rem; letter-spacing: 0.02em; text-transform: uppercase; color: var(--dk-text-muted); }
```

---

## 2. Canvas Layout CSS — `src/components/ai/canvas/canvas.css`

```css
/* ── Canvas Container ── */
.dk-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--dk-bg-deep);
  cursor: grab;
  user-select: none;
}

.dk-canvas.dragging { cursor: grabbing; }

/* ── Dot Grid ── */
.dk-canvas-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: var(--dk-cell) var(--dk-cell);
}

/* ── Viewport (pan/zoom transform target) ── */
.dk-canvas-viewport {
  position: absolute;
  inset: 0;
  transform-origin: 0 0;
  will-change: transform;
}

/* ── Canvas Card (base) ── */
.dk-canvas-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  border-radius: var(--dk-radius-lg);
  overflow: hidden;
  cursor: default;
  transition: box-shadow 0.2s var(--dk-ease), border-color 0.2s var(--dk-ease);
}

.dk-canvas-card:hover {
  border-color: var(--dk-border-strong);
  box-shadow: var(--dk-shadow-lg);
}

.dk-canvas-card.selected {
  border-color: var(--dk-accent);
  box-shadow: 0 0 0 1px var(--dk-accent), var(--dk-shadow-lg);
}

/* ── Card Header ── */
.dk-canvas-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--dk-border-subtle);
  min-height: 32px;
}

.dk-canvas-card-type {
  font-family: var(--dk-sans);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dk-text-muted);
}

/* ── Card Actions (pin/dismiss) ── */
.dk-canvas-card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.dk-canvas-card:hover .dk-canvas-card-actions { opacity: 1; }

.dk-canvas-pin-btn,
.dk-canvas-dismiss {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--dk-text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.dk-canvas-pin-btn:hover { background: var(--dk-accent-dim); color: var(--dk-text-primary); }
.dk-canvas-pin-btn.pinned { color: var(--dk-accent); opacity: 1; }
.dk-canvas-dismiss:hover { background: rgba(239,68,68,0.15); color: var(--dk-danger); }

/* ── Card Body ── */
.dk-canvas-card-body {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  min-height: 0;
}

/* ── Drag Resize Handle ── */
.dk-canvas-resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  opacity: 0;
  transition: opacity 0.15s;
}

.dk-canvas-card:hover .dk-canvas-resize-handle { opacity: 0.5; }

/* ── Minimap ── */
.dk-canvas-minimap {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 160px;
  height: 120px;
  border-radius: var(--dk-radius-md);
  overflow: hidden;
  pointer-events: auto;
  z-index: 50;
}

/* ── Manager Panel ── */
.dk-canvas-manager {
  position: absolute;
  top: 0;
  right: 0;
  width: 280px;
  height: 100%;
  z-index: 100;
}

/* ── Input Bar ── */
.dk-canvas-input-bar {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 80;
}

/* ── Group Card ── */
.group-card {
  position: absolute;
  border-radius: var(--dk-radius-lg);
  border: 1px dashed var(--group-border, var(--dk-border-default));
  background: var(--group-bg, rgba(24,24,27,0.30));
}

.group-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--group-border, var(--dk-border-subtle));
}

.group-body-wrapper {
  overflow: visible;
}

.group-cards {
  position: relative;
}

.group-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 16px;
  color: var(--dk-text-muted);
  font-size: 0.7rem;
}
```

---

## 3. Card Styles CSS — `src/components/ai/canvas/cards/cards.css`

```css
/* ── State Views ── */
.dk-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 20px 12px;
  text-align: center;
  min-height: 80px;
}

.dk-state-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--dk-accent-dim);
  color: var(--dk-text-muted);
}

.dk-state-title {
  font-family: var(--dk-sans);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--dk-text-secondary);
}

.dk-state-message {
  font-size: 0.7rem;
  color: var(--dk-text-muted);
  max-width: 200px;
}

.dk-state-cta {
  margin-top: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--dk-accent);
  background: var(--dk-accent-dim);
  border: none;
  border-radius: 6px;
  padding: 4px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.dk-state-cta:hover { background: rgba(250,250,250,0.18); }

/* ── Loading Skeletons ── */
.dk-state-loading {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.dk-state-skeleton-row {
  opacity: 0.5;
  animation: dk-shimmer 1.5s ease-in-out infinite;
}

@keyframes dk-shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

/* ── Card-Specific: Focus ── */
.card-focus-list { list-style: none; padding: 0; margin: 0; }
.card-focus-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 0.75rem;
  color: var(--dk-text-secondary);
}
.card-focus-check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--dk-border-default);
  background: transparent;
  color: var(--dk-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.15s;
}
.card-focus-check.done {
  background: var(--dk-success);
  border-color: var(--dk-success);
  color: white;
}

/* ── Card-Specific: Finance ── */
.card-finance-value {
  font-family: var(--dk-display);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--dk-text-primary);
  letter-spacing: -0.02em;
}

.card-finance-delta {
  font-size: 0.7rem;
  font-weight: 500;
}
.card-finance-delta.positive { color: var(--dk-success); }
.card-finance-delta.negative { color: var(--dk-danger); }

/* ── Card-Specific: Plan ── */
.card-plan-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--dk-border-subtle);
}
.card-plan-item:last-child { border-bottom: none; }
.card-plan-marker {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dk-text-muted);
  margin-top: 5px;
  flex-shrink: 0;
}

/* ── Card-Specific: Reflect ── */
.card-reflect-quote {
  font-family: var(--dk-display);
  font-size: 0.85rem;
  font-style: italic;
  color: var(--dk-text-secondary);
  line-height: 1.5;
  padding: 8px 0;
  border-left: 2px solid var(--dk-accent-dim);
  padding-left: 12px;
}

/* ── Card-Specific: Digest ── */
.card-digest-item {
  display: flex;
  gap: 8px;
  padding: 6px 0;
}
.card-digest-dot {
  width: 4px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* ── Dynamic Card Renderer ── */
.dk-dynamic-card {
  background: rgba(24,24,27,0.60);
  backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  overflow: hidden;
}

.dk-dynamic-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--dk-border-subtle);
}

.dk-dynamic-card-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}
```

---

## 4. TypeScript Types — `src/types/canvas.ts`

```typescript
export type CardType =
  | 'focus'
  | 'plan'
  | 'reflect'
  | 'finance'
  | 'digest'
  | 'approval'
  | 'transient'
  | 'annotation'
  | 'response'
  | 'group'
  | 'connectors'
  | 'schedule'
  | 'deadlines'
  | 'planner'
  | 'automation'
  | 'generated'

export type CardStatus = 'active' | 'pinned' | 'dismissed' | 'archived'

export interface CanvasCard {
  id: string
  type: CardType
  position: { x: number; y: number }
  size: { w: number; h: number }
  zIndex: number
  pinned: boolean
  source?: string
  createdAt: number
  groupId?: string
  status: CardStatus
  data?: Record<string, any>
  dismissedAt?: number
}

export interface CanvasGroup {
  id: string
  label: string
  colorId: string
  position?: { x: number; y: number }
  cardIds: string[]
}

export interface CanvasState {
  cards: Record<string, CanvasCard>
  groups: Record<string, CanvasGroup>
  nextZIndex: number
  pan: { x: number; y: number }
  zoom: number
}

export type CanvasAction =
  | { type: 'ADD_CARD'; card: CanvasCard }
  | { type: 'UPDATE_CARD'; id: string; patch: Partial<CanvasCard> }
  | { type: 'REMOVE_CARD'; id: string }
  | { type: 'MOVE_CARD'; id: string; position: { x: number; y: number } }
  | { type: 'RESIZE_CARD'; id: string; size: { w: number; h: number } }
  | { type: 'PIN_CARD'; id: string; pinned: boolean }
  | { type: 'DISMISS_CARD'; id: string }
  | { type: 'REORDER_CARD'; id: string; zIndex: number }
  | { type: 'SET_PAN'; pan: { x: number; y: number } }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'CREATE_GROUP'; group: CanvasGroup }
  | { type: 'UPDATE_GROUP'; id: string; patch: Partial<CanvasGroup> }
  | { type: 'DELETE_GROUP'; id: string }
  | { type: 'ADD_TO_GROUP'; cardId: string; groupId: string }
  | { type: 'REMOVE_FROM_GROUP'; cardId: string; newPosition?: { x: number; y: number } }
  | { type: 'LOAD_STATE'; state: CanvasState }

export interface GroupColor {
  id: string
  label: string
  accent: string
  bg: string
  border: string
}

export const GROUP_COLORS: GroupColor[] = [
  { id: 'violet', label: 'Violet', accent: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)' },
  { id: 'emerald', label: 'Emerald', accent: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
  { id: 'sky', label: 'Sky', accent: '#38bdf8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.25)' },
  { id: 'amber', label: 'Amber', accent: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)' },
  { id: 'rose', label: 'Rose', accent: '#fb7185', bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.25)' },
  { id: 'pink', label: 'Pink', accent: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.25)' },
  { id: 'cyan', label: 'Cyan', accent: '#22d3ee', bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.25)' },
  { id: 'teal', label: 'Teal', accent: '#2dd4bf', bg: 'rgba(45,212,191,0.08)', border: 'rgba(45,212,191,0.25)' },
]

export interface DefaultSetupCard {
  type: CardType
  enabled: boolean
  defaultData?: Record<string, any>
  position: { x: number; y: number }
  size: { w: number; h: number }
  pinned: boolean
}

export interface DefaultSetupConfig {
  version: number
  cards: DefaultSetupCard[]
  updatedAt: number
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
        cards: { ...state.cards, [action.id]: { ...state.cards[action.id], ...action.patch } },
      }
    case 'REMOVE_CARD': {
      const { [action.id]: _, ...rest } = state.cards
      return { ...state, cards: rest }
    }
    case 'MOVE_CARD':
      if (!state.cards[action.id]) return state
      return {
        ...state,
        cards: { ...state.cards, [action.id]: { ...state.cards[action.id], position: action.position, zIndex: state.nextZIndex } },
        nextZIndex: state.nextZIndex + 1,
      }
    case 'RESIZE_CARD':
      if (!state.cards[action.id]) return state
      return {
        ...state,
        cards: { ...state.cards, [action.id]: { ...state.cards[action.id], size: action.size } },
      }
    case 'PIN_CARD':
      if (!state.cards[action.id]) return state
      return {
        ...state,
        cards: { ...state.cards, [action.id]: { ...state.cards[action.id], pinned: action.pinned, status: action.pinned ? 'pinned' : 'active' } },
      }
    case 'DISMISS_CARD':
      if (!state.cards[action.id]) return state
      return {
        ...state,
        cards: { ...state.cards, [action.id]: { ...state.cards[action.id], status: 'dismissed', dismissedAt: Date.now() } },
      }
    case 'REORDER_CARD':
      if (!state.cards[action.id]) return state
      return {
        ...state,
        cards: { ...state.cards, [action.id]: { ...state.cards[action.id], zIndex: action.zIndex } },
      }
    case 'SET_PAN':
      return { ...state, pan: action.pan }
    case 'SET_ZOOM':
      return { ...state, zoom: Math.min(3, Math.max(0.15, action.zoom)) }
    case 'CREATE_GROUP':
      return { ...state, groups: { ...state.groups, [action.group.id]: action.group } }
    case 'UPDATE_GROUP':
      if (!state.groups[action.id]) return state
      return { ...state, groups: { ...state.groups, [action.id]: { ...state.groups[action.id], ...action.patch } } }
    case 'DELETE_GROUP': {
      const { [action.id]: _, ...rest } = state.groups
      return { ...state, groups: rest }
    }
    case 'ADD_TO_GROUP': {
      const group = state.groups[action.groupId]
      if (!group) return state
      return {
        ...state,
        groups: { ...state.groups, [action.groupId]: { ...group, cardIds: [...group.cardIds, action.cardId] } },
        cards: { ...state.cards, [action.cardId]: { ...state.cards[action.cardId], groupId: action.groupId } },
      }
    }
    case 'REMOVE_FROM_GROUP': {
      const card = state.cards[action.cardId]
      if (!card?.groupId) return state
      const group = state.groups[card.groupId]
      if (!group) return state
      return {
        ...state,
        groups: { ...state.groups, [card.groupId]: { ...group, cardIds: group.cardIds.filter(id => id !== action.cardId) } },
        cards: {
          ...state.cards,
          [action.cardId]: {
            ...card,
            groupId: undefined,
            ...(action.newPosition ? { position: action.newPosition } : {}),
          },
        },
      }
    }
    case 'LOAD_STATE':
      return action.state
    default:
      return state
  }
}
```

---

## 5. CanvasCard.tsx — Card Wrapper with Drag/Resize

```tsx
import { useRef, useState, useCallback, useEffect } from 'react'
import type { CanvasCard as CanvasCardType } from '../../../types/canvas'
import { CardFrame } from './shared/CardFrame'

const CELL = 40

interface CanvasCardProps {
  card: CanvasCardType
  isSelected: boolean
  onSelect: (id: string, multi: boolean) => void
  onMove: (id: string, pos: { x: number; y: number }) => void
  onResize: (id: string, size: { w: number; h: number }) => void
  onPin: (id: string, pinned: boolean) => void
  onDismiss: (id: string) => void
  onReorder: (id: string) => void
  zoom: number
  children: React.ReactNode
}

export function CanvasCard({
  card, isSelected, onSelect, onMove, onResize, onPin, onDismiss, onReorder, zoom, children
}: CanvasCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 })
  const resizeStart = useRef({ x: 0, y: 0, origW: 0, origH: 0 })

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.dk-canvas-resize-handle')) return
    e.stopPropagation()
    onSelect(card.id, e.shiftKey)
    onReorder(card.id)
    dragStart.current = { x: e.clientX, y: e.clientY, origX: card.position.x, origY: card.position.y }
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [card.id, card.position, onSelect, onReorder])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    const dx = (e.clientX - dragStart.current.x) / zoom
    const dy = (e.clientY - dragStart.current.y) / zoom
    onMove(card.id, {
      x: Math.round((dragStart.current.origX + dx) / CELL) * CELL,
      y: Math.round((dragStart.current.origY + dy) / CELL) * CELL,
    })
  }, [dragging, card.id, zoom, onMove])

  const handlePointerUp = useCallback(() => { setDragging(false) }, [])

  const handleResizeDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    resizeStart.current = { x: e.clientX, y: e.clientY, origW: card.size.w, origH: card.size.h }
    setResizing(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [card.size])

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizing) return
    const dx = (e.clientX - resizeStart.current.x) / zoom
    const dy = (e.clientY - resizeStart.current.y) / zoom
    onResize(card.id, {
      w: Math.max(3, Math.round((resizeStart.current.origW * CELL + dx) / CELL)),
      h: Math.max(2, Math.round((resizeStart.current.origH * CELL + dy) / CELL)),
    })
  }, [resizing, card.id, zoom, onResize])

  const handleResizeUp = useCallback(() => { setResizing(false) }, [])

  return (
    <div
      ref={ref}
      className={`dk-canvas-card ${isSelected ? 'selected' : ''} ${dragging ? 'dragging' : ''}`}
      style={{
        left: card.position.x,
        top: card.position.y,
        width: card.size.w * CELL,
        height: card.size.h * CELL,
        zIndex: card.zIndex,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <CardFrame
        type={card.type}
        pinned={card.pinned}
        onPin={() => onPin(card.id, !card.pinned)}
        onDismiss={() => onDismiss(card.id)}
      >
        {children}
      </CardFrame>
      <div
        className="dk-canvas-resize-handle"
        onPointerDown={handleResizeDown}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeUp}
      />
    </div>
  )
}
```

---

## 6. CanvasGrid.tsx — Pan/Zoom/Drag-Select Grid

```tsx
import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import type { CanvasCard, CanvasGroup, CanvasState, CanvasAction } from '../../../types/canvas'
import { CanvasCard as CanvasCardComponent } from './CanvasCard'

const CELL = 40
const MIN_ZOOM = 0.15
const MAX_ZOOM = 3.0
const ZOOM_STEP = 0.08

interface CanvasGridProps {
  state: CanvasState
  dispatch: React.Dispatch<CanvasAction>
  renderCardContent: (card: CanvasCard) => React.ReactNode
}

export function CanvasGrid({ state, dispatch, renderCardContent }: CanvasGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isDraggingSelect, setIsDraggingSelect] = useState(false)
  const panStart = useRef({ x: 0, y: 0, origPanX: 0, origPanY: 0 })
  const selectStart = useRef({ x: 0, y: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectRect, setSelectRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (e.shiftKey) {
      // Horizontal scroll → pan X
      dispatch({ type: 'SET_PAN', pan: { x: state.pan.x - e.deltaY, y: state.pan.y } })
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl+wheel → zoom
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      dispatch({ type: 'SET_ZOOM', zoom: state.zoom + delta })
    } else {
      // Vertical scroll → pan Y
      dispatch({ type: 'SET_PAN', pan: { x: state.pan.x, y: state.pan.y - e.deltaY } })
    }
  }, [state.pan, state.zoom, dispatch])

  // Pan with middle-click or space+drag
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault()
      setIsPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY, origPanX: state.pan.x, origPanY: state.pan.y }
    } else if (e.button === 0 && !e.altKey && (e.target as HTMLElement).classList.contains('dk-canvas-grid')) {
      // Click on empty grid → deselect + start drag-select
      setSelectedIds(new Set())
      setIsDraggingSelect(true)
      selectStart.current = { x: e.clientX, y: e.clientY }
    }
  }, [state.pan, dispatch])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      dispatch({ type: 'SET_PAN', pan: { x: panStart.current.origPanX + dx, y: panStart.current.origPanY + dy } })
    }
    if (isDraggingSelect) {
      const sx = selectStart.current.x
      const sy = selectStart.current.y
      setSelectRect({
        x: Math.min(sx, e.clientX),
        y: Math.min(sy, e.clientY),
        w: Math.abs(e.clientX - sx),
        h: Math.abs(e.clientY - sy),
      })
    }
  }, [isPanning, isDraggingSelect, dispatch])

  const handlePointerUp = useCallback(() => {
    setIsPanning(false)
    setIsDraggingSelect(false)
    setSelectRect(null)
  }, [])

  // Drag-select hit detection
  useEffect(() => {
    if (!isDraggingSelect || !selectRect) return
    const newSelected = new Set<string>()
    const { x: rx, y: ry, w: rw, h: rh } = selectRect
    for (const card of Object.values(state.cards)) {
      const cx = card.position.x * state.zoom + state.pan.x
      const cy = card.position.y * state.zoom + state.pan.y
      const cw = card.size.w * CELL * state.zoom
      const ch = card.size.h * CELL * state.zoom
      if (cx < rx + rw && cx + cw > rx && cy < ry + rh && cy + ch > ry) {
        newSelected.add(card.id)
      }
    }
    setSelectedIds(newSelected)
  }, [isDraggingSelect, selectRect, state.cards, state.zoom, state.pan])

  // Group formation from multi-select
  useEffect(() => {
    if (selectedIds.size < 2) return
    const handleGroupHotkey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault()
        const cards = [...selectedIds].map(id => state.cards[id]).filter(Boolean)
        if (cards.length < 2) return
        const minX = Math.min(...cards.map(c => c.position.x))
        const minY = Math.min(...cards.map(c => c.position.y))
        const groupId = crypto.randomUUID()
        dispatch({
          type: 'CREATE_GROUP',
          group: { id: groupId, label: 'New Group', colorId: 'violet', position: { x: minX, y: minY }, cardIds: [...selectedIds] },
        })
        for (const cardId of selectedIds) {
          dispatch({ type: 'ADD_TO_GROUP', cardId, groupId })
        }
        setSelectedIds(new Set())
      }
    }
    window.addEventListener('keydown', handleGroupHotkey)
    return () => window.removeEventListener('keydown', handleGroupHotkey)
  }, [selectedIds, state.cards, dispatch])

  // Sorted cards by zIndex
  const sortedCards = useMemo(
    () => Object.values(state.cards).sort((a, b) => a.zIndex - b.zIndex),
    [state.cards]
  )

  return (
    <div
      ref={containerRef}
      className="dk-canvas"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="dk-canvas-grid" />
      <div
        className="dk-canvas-viewport"
        style={{ transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})` }}
      >
        {sortedCards.map(card => (
          <CanvasCardComponent
            key={card.id}
            card={card}
            isSelected={selectedIds.has(card.id)}
            onSelect={(id, multi) => {
              setSelectedIds(prev => {
                const next = new Set(multi ? prev : [])
                next.has(id) ? next.delete(id) : next.add(id)
                return next
              })
            }}
            onMove={(id, pos) => dispatch({ type: 'MOVE_CARD', id, position: pos })}
            onResize={(id, size) => dispatch({ type: 'RESIZE_CARD', id, size })}
            onPin={(id, pinned) => dispatch({ type: 'PIN_CARD', id, pinned })}
            onDismiss={(id) => dispatch({ type: 'DISMISS_CARD', id })}
            onReorder={(id) => dispatch({ type: 'REORDER_CARD', id, zIndex: state.nextZIndex })}
            zoom={state.zoom}
          >
            {renderCardContent(card)}
          </CanvasCardComponent>
        ))}
      </div>
      {/* Drag-select rectangle overlay */}
      {selectRect && (
        <div
          style={{
            position: 'fixed',
            left: selectRect.x,
            top: selectRect.y,
            width: selectRect.w,
            height: selectRect.h,
            border: '1px solid rgba(250,250,250,0.3)',
            background: 'rgba(250,250,250,0.05)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        />
      )}
    </div>
  )
}
```

---

## 7. CanvasContainer.tsx — Top-Level Orchestrator

```tsx
import { useReducer, useState, useCallback, useEffect, useMemo } from 'react'
import type { CanvasState, CanvasCard, CanvasAction } from '../../../types/canvas'
import { canvasReducer } from '../../../types/canvas'
import { CanvasGrid } from './CanvasGrid'
import { CanvasMinimap } from './CanvasMinimap'
import { CanvasManagerPanel } from './CanvasManagerPanel'
import { CanvasInput } from './CanvasInput'
import { CardDrawer } from './CardDrawer'
import { CommandPalette } from './CommandPalette'
import { SaveIndicator } from './SaveIndicator'
import { loadCanvasLayout, saveCanvasLayout, createNewCanvas, loadDefaultSetup, BUILTIN_DEFAULT_SETUP } from '../../../services/canvasPersistence'
import { autoArrange } from '../../../lib/autoArrange'

const DEFAULT_STATE: CanvasState = {
  cards: {},
  groups: {},
  nextZIndex: 1,
  pan: { x: 0, y: 0 },
  zoom: 1,
}

function seedDefaultSetup(state: CanvasState): CanvasState {
  const setup = loadDefaultSetup() || BUILTIN_DEFAULT_SETUP
  const cards: Record<string, CanvasCard> = {}
  let z = 1
  for (const entry of setup) {
    if (!entry.enabled) continue
    const id = crypto.randomUUID()
    cards[id] = {
      id,
      type: entry.type as CanvasCard['type'],
      position: entry.position,
      size: entry.size,
      zIndex: z++,
      pinned: entry.pinned,
      createdAt: Date.now(),
      status: 'active',
      data: entry.defaultData || {},
    }
  }
  return { ...state, cards, nextZIndex: z }
}

export function CanvasContainer() {
  const [state, dispatch] = useReducer(canvasReducer, DEFAULT_STATE, (init) => {
    const loaded = loadCanvasLayout()
    if (loaded && Object.keys(loaded.cards).length > 0) return loaded
    return seedDefaultSetup(init)
  })

  const [showManager, setShowManager] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Auto-save on state change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSaveState('saving')
      saveCanvasLayout(state)
      setTimeout(() => setSaveState('saved'), 300)
      setTimeout(() => setSaveState('idle'), 2000)
    }, 500)
    return () => clearTimeout(timer)
  }, [state])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowPalette(v => !v) }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCanvasLayout(state) }
      if (e.key === 'Escape') { setShowManager(false); setShowDrawer(false); setShowPalette(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state])

  const handleAutoArrange = useCallback(() => {
    const positions = autoArrange(Object.values(state.cards))
    for (const [id, pos] of Object.entries(positions)) {
      dispatch({ type: 'MOVE_CARD', id, position: pos })
    }
  }, [state.cards, dispatch])

  const handleNewCanvas = useCallback(() => {
    const { newState } = createNewCanvas(state)
    dispatch({ type: 'LOAD_STATE', state: newState })
  }, [state])

  const renderCardContent = useCallback((card: CanvasCard) => {
    // Card type → component mapping happens here
    // This is a simplified version — the real implementation lazy-loads each card type
    return <div style={{ padding: 8, fontSize: 12, color: '#a1a1aa' }}>{card.type}</div>
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <CanvasGrid state={state} dispatch={dispatch} renderCardContent={renderCardContent} />
      <CanvasMinimap cards={Object.values(state.cards)} pan={state.pan} zoom={state.zoom} />
      <SaveIndicator state={saveState} />
      {showManager && (
        <CanvasManagerPanel
          onClose={() => setShowManager(false)}
          onNew={handleNewCanvas}
          onAutoArrange={handleAutoArrange}
        />
      )}
      {showDrawer && <CardDrawer onClose={() => setShowDrawer(false)} />}
      {showPalette && (
        <CommandPalette
          onClose={() => setShowPalette(false)}
          onCommand={(intent) => {
            if (intent.type === 'open_card' && intent.cardType) {
              // Add new card of that type
            }
          }}
        />
      )}
      <CanvasInput
        onToggleManager={() => setShowManager(v => !v)}
        onToggleDrawer={() => setShowDrawer(v => !v)}
        onTogglePalette={() => setShowPalette(v => !v)}
      />
    </div>
  )
}
```

---

## 8. CanvasMinimap.tsx — SVG Navigation Minimap

```tsx
import { useMemo } from 'react'
import type { CanvasCard } from '../../../types/canvas'

const CELL = 40
const MINIMAP_W = 160
const MINIMAP_H = 120

const CARD_TYPE_COLORS: Record<string, string> = {
  focus: '#f472b6', plan: '#a78bfa', reflect: '#c084fc', finance: '#34d399',
  digest: '#22d3ee', approval: '#fbbf24', transient: '#71717a', annotation: '#fb923c',
  response: '#60a5fa', group: '#818cf8', connectors: '#2dd4bf', schedule: '#f87171',
  deadlines: '#f97316', planner: '#38bdf8',
}

interface CanvasMinimapProps {
  cards: CanvasCard[]
  pan: { x: number; y: number }
  zoom: number
}

export function CanvasMinimap({ cards, pan, zoom }: CanvasMinimapProps) {
  const bounds = useMemo(() => {
    if (cards.length === 0) return { minX: 0, maxX: 400, minY: 0, maxY: 300 }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const c of cards) {
      minX = Math.min(minX, c.position.x)
      minY = Math.min(minY, c.position.y)
      maxX = Math.max(maxX, c.position.x + c.size.w * CELL)
      maxY = Math.max(maxY, c.position.y + c.size.h * CELL)
    }
    const pad = 100
    return { minX: minX - pad, maxX: maxX + pad, minY: minY - pad, maxY: maxY + pad }
  }, [cards])

  const rangeX = bounds.maxX - bounds.minX || 1
  const rangeY = bounds.maxY - bounds.minY || 1
  const scale = Math.min(MINIMAP_W / rangeX, MINIMAP_H / rangeY)

  return (
    <div className="dk-canvas-minimap dk-glass-heavy">
      <svg width={MINIMAP_W} height={MINIMAP_H}>
        {cards.map(card => {
          const x = (card.position.x - bounds.minX) * scale
          const y = (card.position.y - bounds.minY) * scale
          const w = card.size.w * CELL * scale
          const h = card.size.h * CELL * scale
          return (
            <rect
              key={card.id}
              x={x} y={y} width={w} height={h}
              rx={2}
              fill={CARD_TYPE_COLORS[card.type] || '#71717a'}
              opacity={card.pinned ? 0.9 : 0.5}
            />
          )
        })}
        {/* Viewport indicator */}
        <rect
          x={(-pan.x / zoom - bounds.minX) * scale}
          y={(-pan.y / zoom - bounds.minY) * scale}
          width={(window.innerWidth / zoom) * scale}
          height={(window.innerHeight / zoom) * scale}
          fill="none"
          stroke="rgba(250,250,250,0.4)"
          strokeWidth={1}
          rx={2}
        />
      </svg>
    </div>
  )
}
```

---

## 9. CanvasManagerPanel.tsx — Save/Load Sidebar

```tsx
import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Edit3, Check } from 'lucide-react'
import { listCanvases, renameCanvas, deleteCanvas, type CanvasSnapshot } from '../../../services/canvasPersistence'

interface CanvasManagerPanelProps {
  onClose: () => void
  onNew: () => void
  onAutoArrange: () => void
}

export function CanvasManagerPanel({ onClose, onNew, onAutoArrange }: CanvasManagerPanelProps) {
  const [canvases, setCanvases] = useState<CanvasSnapshot[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => { setCanvases(listCanvases()) }, [])

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameCanvas(id, editName.trim())
      setCanvases(listCanvases())
    }
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    deleteCanvas(id)
    setCanvases(listCanvases())
  }

  return (
    <div className="dk-canvas-manager dk-glass-heavy" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontFamily: 'var(--dk-display)', fontSize: 14, fontWeight: 600, color: 'var(--dk-text-primary)' }}>
          Canvas Manager
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--dk-text-muted)', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={onNew} className="dk-state-cta" style={{ flex: 1 }}>
          <Plus size={12} /> New Canvas
        </button>
        <button onClick={onAutoArrange} className="dk-state-cta" style={{ flex: 1 }}>
          Auto Arrange
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {canvases.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: 'var(--dk-bg-raised)' }}>
            {editingId === c.id ? (
              <>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(c.id); if (e.key === 'Escape') setEditingId(null) }}
                  style={{ flex: 1, background: 'var(--dk-bg-input)', border: '1px solid var(--dk-border-default)', borderRadius: 4, padding: '2px 6px', color: 'var(--dk-text-primary)', fontSize: 12 }}
                  autoFocus
                />
                <button onClick={() => handleRename(c.id)} style={{ background: 'none', border: 'none', color: 'var(--dk-success)', cursor: 'pointer' }}>
                  <Check size={12} />
                </button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--dk-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--dk-text-muted)' }}>{c.cardCount} cards</span>
                <button onClick={() => { setEditingId(c.id); setEditName(c.name) }} style={{ background: 'none', border: 'none', color: 'var(--dk-text-muted)', cursor: 'pointer' }}>
                  <Edit3 size={12} />
                </button>
                <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: 'var(--dk-danger)', cursor: 'pointer' }}>
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 10. CardDrawer.tsx — Add Card Slide-Out Panel

```tsx
import { useState } from 'react'
import { X, Target, Calendar, DollarSign, Newspaper, MessageSquare, Clock, ListTodo, Zap, GitBranch } from 'lucide-react'
import type { CardType } from '../../../types/canvas'

interface CardDrawerProps {
  onClose: () => void
}

const CARD_CATEGORIES = [
  {
    label: 'Core',
    cards: [
      { type: 'focus' as CardType, label: 'Focus', icon: Target, description: 'Daily goals & habits' },
      { type: 'plan' as CardType, label: 'Plan', icon: Calendar, description: 'Long-term roadmap' },
      { type: 'reflect' as CardType, label: 'Reflect', icon: MessageSquare, description: 'Daily reflection' },
      { type: 'finance' as CardType, label: 'Finance', icon: DollarSign, description: 'Budget & spending' },
    ],
  },
  {
    label: 'Content',
    cards: [
      { type: 'digest' as CardType, label: 'Digest', icon: Newspaper, description: 'News & updates' },
      { type: 'schedule' as CardType, label: 'Schedule', icon: Clock, description: 'Weekly schedule' },
      { type: 'deadlines' as CardType, label: 'Deadlines', icon: Calendar, description: 'Deadline tracker' },
      { type: 'planner' as CardType, label: 'Planner', icon: ListTodo, description: 'Daily planner' },
    ],
  },
  {
    label: 'Tools',
    cards: [
      { type: 'connectors' as CardType, label: 'Connectors', icon: GitBranch, description: 'External integrations' },
      { type: 'automation' as CardType, label: 'Automation', icon: Zap, description: 'Automated workflows' },
    ],
  },
]

export function CardDrawer({ onClose }: CardDrawerProps) {
  const [selectedCategory, setSelectedCategory] = useState('Core')

  return (
    <div className="dk-canvas-manager dk-glass-heavy" style={{ padding: 16, width: 260 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--dk-display)', fontSize: 14, fontWeight: 600, color: 'var(--dk-text-primary)' }}>
          Add Card
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--dk-text-muted)', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {CARD_CATEGORIES.map(cat => (
          <button
            key={cat.label}
            onClick={() => setSelectedCategory(cat.label)}
            style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
              background: selectedCategory === cat.label ? 'var(--dk-accent-dim)' : 'transparent',
              color: selectedCategory === cat.label ? 'var(--dk-text-primary)' : 'var(--dk-text-muted)',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Card list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {CARD_CATEGORIES.find(c => c.label === selectedCategory)?.cards.map(card => (
          <button
            key={card.type}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 8, border: '1px solid var(--dk-border-subtle)',
              background: 'var(--dk-bg-raised)', cursor: 'pointer', textAlign: 'left',
              transition: 'border-color 0.15s',
            }}
          >
            <card.icon size={16} style={{ color: 'var(--dk-text-muted)' }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--dk-text-primary)' }}>{card.label}</div>
              <div style={{ fontSize: 10, color: 'var(--dk-text-muted)' }}>{card.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## 11. CommandPalette.tsx — Slash Command + Intent Parser

```tsx
import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { parseIntent, getSuggestions, type Intent } from '../../../services/intentParser'

interface CommandPaletteProps {
  onClose: () => void
  onCommand: (intent: Intent) => void
}

export function CommandPalette({ onClose, onCommand }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestions = getSuggestions(query)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const intent = parseIntent(query)
    onCommand(intent)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', justifyContent: 'center', paddingTop: '20vh',
        background: 'var(--dk-bg-overlay)',
      }}
      onClick={onClose}
    >
      <div
        className="dk-glass-heavy"
        style={{ width: 480, borderRadius: 12, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 8 }}>
          <Search size={16} style={{ color: 'var(--dk-text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or ask anything..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--dk-text-primary)', fontSize: 14, fontFamily: 'var(--dk-sans)',
            }}
          />
        </form>
        {suggestions.length > 0 && (
          <div style={{ borderTop: '1px solid var(--dk-border-subtle)', padding: 8, maxHeight: 240, overflowY: 'auto' }}>
            {suggestions.map(s => (
              <button
                key={s.name}
                onClick={() => { setQuery(s.name); onCommand(parseIntent(s.name)); onClose() }}
                style={{
                  display: 'flex', width: '100%', alignItems: 'center', gap: 10,
                  padding: '6px 10px', borderRadius: 6, border: 'none',
                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--dk-accent-dim)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--dk-text-primary)' }}>{s.name}</span>
                <span style={{ fontSize: 11, color: 'var(--dk-text-muted)', marginLeft: 'auto' }}>{s.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## 12. CanvasInput.tsx — Bottom Chat Input Bar

```tsx
import { useState, useRef, useCallback } from 'react'
import { Send, Mic, Command } from 'lucide-react'

interface CanvasInputProps {
  onToggleManager: () => void
  onToggleDrawer: () => void
  onTogglePalette: () => void
}

export function CanvasInput({ onToggleManager, onToggleDrawer, onTogglePalette }: CanvasInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    // Route through intent parser
    setValue('')
  }, [value])

  return (
    <div className="dk-canvas-input-bar dk-glass-heavy" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12, width: 480 }}>
      <button onClick={onTogglePalette} style={{ background: 'none', border: 'none', color: 'var(--dk-text-muted)', cursor: 'pointer', padding: 4 }}>
        <Command size={14} />
      </button>
      <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex' }}>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Ask anything, or type / for commands..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--dk-text-primary)', fontSize: 13, fontFamily: 'var(--dk-sans)',
          }}
        />
      </form>
      <button style={{ background: 'none', border: 'none', color: 'var(--dk-text-muted)', cursor: 'pointer', padding: 4 }}>
        <Mic size={14} />
      </button>
      <button
        onClick={handleSubmit}
        style={{
          background: value.trim() ? 'var(--dk-accent)' : 'var(--dk-accent-dim)',
          border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
          color: value.trim() ? 'var(--dk-bg-deep)' : 'var(--dk-text-muted)',
          transition: 'all 0.15s',
        }}
      >
        <Send size={12} />
      </button>
    </div>
  )
}
```

---

## 13. StateView.tsx — 4-State Card Pattern

```tsx
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '../../../ui/skeleton'

export type ViewState = 'empty' | 'loading' | 'error' | 'populated'
export type LoadingShape = 'list' | 'text' | 'chart'

interface StateViewProps {
  state: ViewState
  emptyProps?: { icon: LucideIcon; title: string; description?: string; ctaLabel?: string; onCta?: () => void }
  errorProps?: { message: string; onRetry?: () => void }
  loadingType?: LoadingShape
  children: ReactNode
}

const LOADING_SHAPES: Record<LoadingShape, ReactNode[]> = {
  list: [<Skeleton key="l1" className="h-8 w-full" />, <Skeleton key="l2" className="h-8 w-full" />, <Skeleton key="l3" className="h-8 w-3/4" />],
  text: [<Skeleton key="t1" className="h-4 w-full" />, <Skeleton key="t2" className="h-4 w-5/6" />, <Skeleton key="t3" className="h-4 w-4/6" />],
  chart: [<Skeleton key="c1" className="h-32 w-full" />, <Skeleton key="c2" className="h-8 w-full" />, <Skeleton key="c3" className="h-8 w-full" />],
}

export function StateView({ state, emptyProps, errorProps, loadingType = 'list', children }: StateViewProps) {
  if (state === 'loading') return <div className="dk-state-loading">{LOADING_SHAPES[loadingType].map((s, i) => <div key={i} className="dk-state-skeleton-row">{s}</div>)}</div>
  if (state === 'error') {
    const Icon = emptyProps?.icon
    return (
      <div className="dk-state dk-state-error">
        {Icon && <div className="dk-state-icon"><Icon size={16} /></div>}
        <div className="dk-state-title">Couldn't load this card</div>
        <div className="dk-state-message">{errorProps?.message || 'Something went wrong.'}</div>
        {errorProps?.onRetry && <button className="dk-state-cta" onClick={errorProps.onRetry}>Try again</button>}
      </div>
    )
  }
  if (state === 'empty') {
    const Icon = emptyProps?.icon
    return (
      <div className="dk-state">
        {Icon && <div className="dk-state-icon"><Icon size={16} /></div>}
        <div className="dk-state-title">{emptyProps?.title || 'Nothing here yet'}</div>
        {emptyProps?.description && <div className="dk-state-message">{emptyProps.description}</div>}
        {emptyProps?.ctaLabel && emptyProps?.onCta && <button className="dk-state-cta" onClick={emptyProps.onCta}>{emptyProps.ctaLabel}</button>}
      </div>
    )
  }
  return <>{children}</>
}
```

---

## 14. GroupCard.tsx — Group Container

```tsx
import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Edit3, Palette, Ungroup, Layers } from 'lucide-react'
import { GROUP_COLORS, type CanvasCard, type CanvasGroup } from '../../../types/canvas'

const CELL = 40

interface GroupCardProps {
  group: CanvasGroup
  cards: CanvasCard[]
  renderChild: (card: CanvasCard) => ReactNode
  onUpdateGroup: (patch: Partial<Pick<CanvasGroup, 'label' | 'colorId'>>) => void
  onUngroup: (mode: 'restore' | 'scatter') => void
  onRemoveFromGroup: (cardId: string, newPosition?: { x: number; y: number }) => void
}

export function GroupCard({ group, cards, renderChild, onUpdateGroup, onUngroup, onRemoveFromGroup }: GroupCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(group.label)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const colorRef = useRef<HTMLDivElement>(null)
  const color = GROUP_COLORS.find(c => c.id === group.colorId) || GROUP_COLORS[0]

  const { placed, contentW, contentH } = useMemo(() => {
    const baseX = group.position?.x || 0
    const baseY = group.position?.y || 0
    const placed = cards.map(card => {
      const left = Math.max(0, (card.position?.x || 0) - baseX - 10)
      const top = Math.max(0, (card.position?.y || 0) - baseY - 30)
      return { card, left, top, right: left + card.size.w * CELL, bottom: top + card.size.h * CELL }
    })
    let w = 0, h = 0
    for (const p of placed) { w = Math.max(w, p.right); h = Math.max(h, p.bottom) }
    return { placed, contentW: w, contentH: cards.length === 0 ? 64 : h }
  }, [cards, group.position])

  // ... (event handlers for rename, color picker, click-outside)

  return (
    <div className="group-card" style={{ '--group-accent': color.accent, '--group-bg': color.bg, '--group-border': color.border } as React.CSSProperties}>
      <div className="group-card-header">
        <button className="group-expand-btn" onClick={() => setExpanded(v => !v)}>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
            <ChevronDown size={14} style={{ color: color.accent }} />
          </motion.div>
        </button>
        <div className="group-color-dot" style={{ background: color.accent }} />
        {editing ? (
          <input ref={inputRef} value={editLabel} onChange={e => setEditLabel(e.target.value)}
            onBlur={handleRename} onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setEditing(false); setEditLabel(group.label) } }}
            className="group-name-input" style={{ color: color.accent }} />
        ) : (
          <span className="group-name" style={{ color: color.accent }} onDoubleClick={() => { setEditing(true); setEditLabel(group.label) }}>{group.label}</span>
        )}
        <span className="group-count">{cards.length}</span>
        <div className="group-actions">
          <button onClick={() => { setEditing(true); setEditLabel(group.label) }} title="Rename" className="group-action-btn"><Edit3 size={12} /></button>
          <div ref={colorRef} className="group-color-wrapper">
            <button onClick={() => setShowColorPicker(v => !v)} title="Change color" className="group-action-btn"><Palette size={12} /></button>
            <AnimatePresence>
              {showColorPicker && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="group-color-picker">
                  {GROUP_COLORS.map(c => (
                    <button key={c.id} className={`group-color-swatch ${c.id === group.colorId ? 'active' : ''}`}
                      style={{ background: c.accent }} onClick={() => { onUpdateGroup({ colorId: c.id }); setShowColorPicker(false) }} title={c.label} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => onUngroup(cards.length > 5 ? 'scatter' : 'restore')} title="Ungroup cards" className="group-action-btn group-action-danger"><Ungroup size={12} /></button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: contentH, opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="group-body-wrapper">
            <div className="group-cards" style={{ position: 'relative', display: 'block', width: contentW, height: contentH, padding: 0, maxHeight: 'none', overflow: 'visible' } as React.CSSProperties}>
              {cards.length === 0 ? (
                <div className="group-empty"><Layers size={16} className="group-empty-icon" /><span>No cards yet</span></div>
              ) : (
                placed.map(({ card, left, top }) => (
                  <div key={card.id} className="group-real-card dk-canvas-card"
                    style={{ left, top, width: card.size.w * CELL, height: card.size.h * CELL, position: 'absolute', zIndex: 0, cursor: 'default', transform: 'none' }}
                    onPointerDown={(e) => e.stopPropagation()}>
                    <div className="dk-canvas-card-header" style={{ cursor: 'default' }}>
                      <span className="dk-canvas-card-type">{card.type}</span>
                      <div className="dk-canvas-card-actions">
                        <button className="dk-canvas-dismiss" onClick={(e) => { e.stopPropagation(); onRemoveFromGroup(card.id) }} title="Remove from group">✕</button>
                      </div>
                    </div>
                    <div className="dk-canvas-card-body" style={{ overflow: 'hidden' }}>{renderChild(card)}</div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

---

## 15. CardFrame.tsx — Shared Glass Frame

```tsx
import type { ReactNode } from 'react'
import { Pin, PinOff, X } from 'lucide-react'

interface CardFrameProps {
  type: string
  pinned?: boolean
  onPin?: () => void
  onDismiss?: () => void
  hideHeader?: boolean
  children: ReactNode
}

export function CardFrame({ type, pinned, onPin, onDismiss, hideHeader, children }: CardFrameProps) {
  if (hideHeader) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {(onPin || onDismiss) && (
          <div className="dk-canvas-card-actions floating">
            {onPin && <button className={`dk-canvas-pin-btn ${pinned ? 'pinned' : ''}`} onClick={(e) => { e.stopPropagation(); onPin() }}>{pinned ? <PinOff size={13} /> : <Pin size={13} />}</button>}
            {onDismiss && <button className="dk-canvas-dismiss" onClick={(e) => { e.stopPropagation(); onDismiss() }}><X size={13} /></button>}
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
      </div>
    )
  }
  return (
    <>
      <div className="dk-canvas-card-header" style={{ cursor: 'grab' }}>
        <span className="dk-canvas-card-type">{type}</span>
        <div className="dk-canvas-card-actions">
          {onPin && <button className={`dk-canvas-pin-btn ${pinned ? 'pinned' : ''}`} onClick={(e) => { e.stopPropagation(); onPin() }}>{pinned ? <PinOff size={13} /> : <Pin size={13} />}</button>}
          {onDismiss && <button className="dk-canvas-dismiss" onClick={(e) => { e.stopPropagation(); onDismiss() }}><X size={13} /></button>}
        </div>
      </div>
      <div className="dk-canvas-card-body">{children}</div>
    </>
  )
}
```

---

## 16. canvasPersistence.ts — Save/Load/New Canvas

```typescript
import type { CanvasState, CardType, DefaultSetupCard, DefaultSetupConfig } from '../types/canvas'

const STORAGE_PREFIX = 'deskflow-canvas-'
const ACTIVE_KEY = 'deskflow-canvas-active'

export interface CanvasSnapshot {
  id: string
  name: string
  savedAt: number
  cardCount: number
  state: CanvasState
}

export function loadCanvasLayout(): CanvasState | null {
  try {
    const activeId = localStorage.getItem(ACTIVE_KEY)
    if (!activeId) {
      const hasAny = listCanvases()
      if (hasAny.length > 0) { localStorage.setItem(ACTIVE_KEY, hasAny[0].id); return hasAny[0].state }
      return null
    }
    const raw = localStorage.getItem(STORAGE_PREFIX + activeId)
    if (!raw) {
      const hasAny = listCanvases()
      if (hasAny.length > 0) { localStorage.setItem(ACTIVE_KEY, hasAny[0].id); return hasAny[0].state }
      return null
    }
    const parsed = JSON.parse(raw)
    if (parsed && parsed.state && parsed.state.cards) return parsed.state as CanvasState
    return null
  } catch { return null }
}

export function saveCanvasLayout(state: CanvasState, name?: string): string {
  const activeId = localStorage.getItem(ACTIVE_KEY) || crypto.randomUUID()
  localStorage.setItem(ACTIVE_KEY, activeId)
  const cardCount = Object.keys(state.cards).length
  const snapshot: CanvasSnapshot = { id: activeId, name: name || `Canvas ${cardCount} cards`, savedAt: Date.now(), cardCount, state: serializeState(state) }
  localStorage.setItem(STORAGE_PREFIX + activeId, JSON.stringify(snapshot))
  return activeId
}

export function listCanvases(): CanvasSnapshot[] {
  const result: CanvasSnapshot[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try { const raw = localStorage.getItem(key); if (raw) result.push(JSON.parse(raw)) } catch {}
    }
  }
  result.sort((a, b) => b.savedAt - a.savedAt)
  return result
}

export function loadCanvasById(id: string): CanvasState | null {
  try { const raw = localStorage.getItem(STORAGE_PREFIX + id); if (!raw) return null; const snapshot: CanvasSnapshot = JSON.parse(raw); localStorage.setItem(ACTIVE_KEY, id); return snapshot.state } catch { return null }
}

export function renameCanvas(id: string, newName: string): void {
  try { const raw = localStorage.getItem(STORAGE_PREFIX + id); if (!raw) return; const snapshot: CanvasSnapshot = JSON.parse(raw); snapshot.name = newName; localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(snapshot)) } catch {}
}

export function deleteCanvas(id: string): void {
  localStorage.removeItem(STORAGE_PREFIX + id)
  if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY)
}

export function clearCanvasLayout(): void { localStorage.removeItem(ACTIVE_KEY) }

export function createNewCanvas(currentState: CanvasState): { newState: CanvasState; savedId: string } {
  const savedId = saveCanvasLayout(currentState, `Canvas ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
  const newId = crypto.randomUUID()
  localStorage.setItem(ACTIVE_KEY, newId)
  return { newState: { cards: {}, groups: {}, nextZIndex: 1, pan: { x: 0, y: 0 }, zoom: 1 }, savedId }
}

// Default setup
const SETUP_KEY = 'deskflow-canvas-default-setup'

export function loadDefaultSetup(): DefaultSetupConfig | null {
  try {
    const raw = localStorage.getItem(SETUP_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((e: any) => e && typeof e.type === 'string' && e.position && typeof e.position.x === 'number' && e.size && typeof e.size.w === 'number').map((e: any) => ({ type: e.type, enabled: true, position: e.position, size: e.size, pinned: !!e.pinned }))
      return valid.length > 0 ? { version: 1, cards: valid as DefaultSetupCard[], updatedAt: Date.now() } : null
    }
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.cards)) return null
    const valid = parsed.cards.filter((e: any) => e && typeof e.type === 'string' && typeof e.enabled === 'boolean' && e.position && typeof e.position.x === 'number' && e.size && typeof e.size.w === 'number')
    return valid.length > 0 ? { version: 1, cards: valid as DefaultSetupCard[], updatedAt: parsed.updatedAt || Date.now() } : null
  } catch { return null }
}

export function saveDefaultSetup(cards: DefaultSetupCard[]): void {
  try { const config: DefaultSetupConfig = { version: 1, cards, updatedAt: Date.now() }; localStorage.setItem(SETUP_KEY, JSON.stringify(config)) } catch {}
}

export function clearDefaultSetup(): void { try { localStorage.removeItem(SETUP_KEY) } catch {} }

const BUILTIN_POSITIONS: Record<string, { position: { x: number; y: number }; size: { w: number; h: number } }> = {
  focus:     { position: { x: 20,  y: 20 },  size: { w: 9, h: 6 } },
  plan:      { position: { x: 420, y: 20 },  size: { w: 9, h: 6 } },
  finance:   { position: { x: 820, y: 20 },  size: { w: 9, h: 6 } },
  digest:    { position: { x: 1220, y: 20 }, size: { w: 9, h: 6 } },
  schedule:  { position: { x: 20,  y: 330 }, size: { w: 11, h: 7 } },
  deadlines: { position: { x: 500, y: 330 }, size: { w: 9, h: 7 } },
  planner:   { position: { x: 900, y: 330 }, size: { w: 9, h: 7 } },
  reflect:   { position: { x: 1280, y: 330 }, size: { w: 7, h: 7 } },
  connectors:{ position: { x: 20,  y: 700 }, size: { w: 9, h: 6 } },
  automation:{ position: { x: 430, y: 700 }, size: { w: 9, h: 6 } },
}

const BUILTIN_CARD_TYPES: CardType[] = ['focus', 'plan', 'finance', 'digest', 'schedule', 'deadlines', 'planner', 'reflect', 'connectors', 'automation']

export const BUILTIN_DEFAULT_SETUP: DefaultSetupCard[] = BUILTIN_CARD_TYPES.map((type) => ({
  type, enabled: true, defaultData: {}, ...BUILTIN_POSITIONS[type], pinned: true,
}))
```

---

## 17. autoArrange.ts — Card Auto-Layout

```typescript
import type { CanvasCard } from '../types/canvas'

const GAP = 40
const ROW_MAX_WIDTH = 1600

export function autoArrange(cards: CanvasCard[]): Record<string, { x: number; y: number }> {
  const sorted = [...cards].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type)
    return (a.createdAt || 0) - (b.createdAt || 0)
  })

  const positions: Record<string, { x: number; y: number }> = {}
  let currentX = 0, currentY = 0, rowHeight = 0

  for (const card of sorted) {
    const cardWidth = card.size.w * 40 + GAP
    const cardHeight = card.size.h * 40 + GAP
    if (currentX + cardWidth > ROW_MAX_WIDTH && currentX > 0) {
      currentX = 0; currentY += rowHeight + GAP; rowHeight = 0
    }
    positions[card.id] = { x: currentX, y: currentY }
    currentX += cardWidth
    rowHeight = Math.max(rowHeight, cardHeight)
  }

  // Center the layout
  let layoutMinX = Infinity, layoutMinY = Infinity, layoutMaxX = -Infinity, layoutMaxY = -Infinity
  for (const pos of Object.values(positions)) {
    layoutMinX = Math.min(layoutMinX, pos.x); layoutMinY = Math.min(layoutMinY, pos.y)
    layoutMaxX = Math.max(layoutMaxX, pos.x); layoutMaxY = Math.max(layoutMaxY, pos.y)
  }
  const layoutCenterX = (layoutMinX + layoutMaxX) / 2
  const layoutCenterY = (layoutMinY + layoutMaxY) / 2

  for (const id of Object.keys(positions)) {
    positions[id] = { x: Math.round(positions[id].x - layoutCenterX), y: Math.round(positions[id].y - layoutCenterY) }
  }
  return positions
}
```

---

## 18. intentParser.ts — Slash Command Routing

```typescript
import { getAllCommands, findCommand, fillPrompt } from './customSlashCommands'

export type IntentType = 'open_card' | 'run_command' | 'send_to_ai' | 'custom_command' | 'clarify' | 'error' | 'noop'

export interface Intent {
  type: IntentType; cardType?: string; command?: string; args?: string; prompt?: string; options?: string[]; message?: string
}

const KEYWORD_MAP: Record<string, string> = {
  'goals': 'focus', 'goal': 'focus', 'today goals': 'focus', 'daily goals': 'focus', 'my goals': 'focus', 'show goals': 'focus',
  'plan': 'plan', 'long-term': 'plan', 'longterm': 'plan', 'milestones': 'plan', 'show plan': 'plan',
  'digest': 'digest', 'news': 'digest', "what's new": 'digest', 'headlines': 'digest',
  'finance': 'finance', 'money': 'finance', 'wallet': 'finance', 'balance': 'finance', 'spending': 'finance', 'subscriptions': 'finance',
  'reflect': 'reflect', 'review': 'reflect', 'yesterday': 'reflect', 'how did i do': 'reflect',
}

const SLASH_CARD_MAP: Record<string, string> = { 'focus': 'focus', 'plan': 'plan', 'digest': 'digest', 'reflect': 'reflect', 'finance': 'finance' }
const AI_SEND_COMMANDS = new Set(['plan', 'digest', 'reflect', 'focus', 'help'])
const DATA_COMMANDS = new Set(['unread', 'inbox', 'calendar', 'today', 'sync', 'email'])

export function parseIntent(input: string): Intent {
  const trimmed = input.trim()
  if (!trimmed) return { type: 'noop' }
  if (trimmed.startsWith('/')) {
    const [cmd, ...args] = trimmed.slice(1).split(' ')
    const argStr = args.join(' ').trim()
    const cmdLower = cmd.toLowerCase()
    if (SLASH_CARD_MAP[cmdLower]) return { type: 'open_card', cardType: SLASH_CARD_MAP[cmdLower], args: argStr }
    if (DATA_COMMANDS.has(cmdLower)) return { type: 'run_command', command: cmdLower, args: argStr }
    if (AI_SEND_COMMANDS.has(cmdLower)) return { type: 'send_to_ai', prompt: trimmed }
    const custom = findCommand(cmdLower)
    if (custom) return { type: 'custom_command', command: cmdLower, args: argStr, prompt: fillPrompt(custom.prompt, argStr) }
    return { type: 'error', message: `Unknown command: /${cmd}` }
  }
  const lower = trimmed.toLowerCase()
  for (const [keyword, cardType] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) return { type: 'open_card', cardType }
  }
  return { type: 'send_to_ai', prompt: trimmed }
}

export function getSuggestions(input: string): Array<{ name: string; description: string; category: string }> {
  const trimmed = input.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('/')) {
    const query = trimmed.slice(1).toLowerCase()
    const builtIn = [
      { name: '/focus', description: 'Open focus card', category: 'Cards' },
      { name: '/plan', description: 'Open plan card', category: 'Cards' },
      { name: '/digest', description: 'Open digest card', category: 'Cards' },
      { name: '/reflect', description: 'Open reflect card', category: 'Cards' },
      { name: '/finance', description: 'Open finance card', category: 'Cards' },
      { name: '/unread', description: 'Show unread emails', category: 'Data' },
      { name: '/inbox', description: 'Show recent emails', category: 'Data' },
      { name: '/calendar', description: 'Show upcoming events', category: 'Data' },
      { name: '/today', description: 'Today at a glance', category: 'Data' },
      { name: '/sync', description: 'Sync connectors', category: 'Data' },
      { name: '/email', description: 'Search emails', category: 'Data' },
    ]
    const custom = getAllCommands().map(c => ({ name: `/${c.name}`, description: c.description, category: 'Custom' }))
    return [...builtIn, ...custom].filter(s => s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query))
  }
  const lower = trimmed.toLowerCase()
  const suggestions = [
    { name: 'Show my goals', description: 'Open focus card', category: 'Quick' },
    { name: 'What should I focus on?', description: 'Ask AI for focus advice', category: 'Quick' },
    { name: 'Show my finances', description: 'Open finance card', category: 'Quick' },
    { name: 'Review today', description: 'Open reflect card', category: 'Quick' },
  ]
  return suggestions.filter(s => s.name.toLowerCase().includes(lower))
}
```

---

## 19. DynamicCardRenderer.tsx — AI-Generated Card Renderer

```tsx
import type { DynamicUIComponent, DynamicComponentData } from '../../../types/dynamicUI'
import { ACCENT, TEXT } from '../../tokens'
import { cn } from '../../lib/cn'
import { motion } from 'framer-motion'
import { cardEnterVariants } from '../../lib/motion'
import { X, Sparkles } from 'lucide-react'

interface DynamicCardRendererProps {
  component: DynamicUIComponent
  onDismiss?: (id: string) => void
  onAction?: (id: string, actionId: string) => void
  isBuilding?: boolean
}

export function DynamicCardRenderer({ component, onDismiss, onAction, isBuilding }: DynamicCardRendererProps) {
  const accent = ACCENT[component.accent] || ACCENT.violet
  return (
    <motion.div variants={cardEnterVariants} initial="hidden" animate="show" exit="exit"
      className="relative h-full flex flex-col bg-[rgba(24,24,27,0.60)] backdrop-blur-xl border border-[rgba(63,63,70,0.50)] rounded-2xl overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent.hex }} />
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={12} style={{ color: accent.hex }} />
          <span className="text-xs font-semibold text-white truncate">{component.title}</span>
          {component.subtitle && <span className="text-[10px] text-zinc-500 truncate">{component.subtitle}</span>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-medium">AI</span>
          {onDismiss && <button onClick={() => onDismiss(component.id)} className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"><X size={12} /></button>}
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto"><DataRenderer data={component.data} accent={accent.hex} /></div>
      {component.actions && component.actions.length > 0 && (
        <div className="flex gap-2 px-4 py-2 border-t border-zinc-800/50">
          {component.actions.map(a => (
            <button key={a.id} onClick={() => onAction?.(component.id, a.id)}
              className={cn('text-[10px] px-2.5 py-1 rounded-lg font-medium transition-colors',
                a.variant === 'primary' ? 'bg-violet-500/20 text-violet-300 hover:bg-violet-500/30' :
                a.variant === 'danger' ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' :
                'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              )}>{a.label}</button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// DataRenderer handles: card, stat, list, chart, table, timeline, form
// (Full implementation in source — 149 lines with SVG sparkline + bar chart)
```

---

## 20. FocusCard.tsx — Example Card Type

```tsx
import type { CanvasCard } from '../../../../types/canvas'
import { StateView, type ViewState } from '../shared/StateView'
import { Target } from 'lucide-react'

interface FocusCardProps {
  card: CanvasCard
  goals?: any[]
  onToggleGoal?: (goal: any) => void
  loading?: boolean
  error?: string
}

export function FocusCard({ card, goals = [], onToggleGoal, loading, error }: FocusCardProps) {
  const data = card.data || {}
  const activeGoals = goals.filter(g => g.status === 'done' || g.status === 'active')
  const state: ViewState = loading ? 'loading' : error ? 'error' : activeGoals.length === 0 ? 'empty' : 'populated'

  return (
    <StateView state={state} loadingType="list"
      emptyProps={{ icon: Target, title: 'No active goals', description: 'Ask the AI to suggest goals, or add them in the Focus page.' }}
      errorProps={{ message: error || 'Failed to load goals' }}>
      <div className="card-focus">
        <div className="card-focus-header"><span className="card-focus-count">{activeGoals.length} active</span></div>
        <ul className="card-focus-list">
          {activeGoals.map((g: any) => (
            <li key={g.id} className="card-focus-item">
              <button className={`card-focus-check ${g.status === 'done' ? 'done' : ''}`} onClick={() => onToggleGoal?.(g)}>
                {g.status === 'done' ? '✓' : '○'}
              </button>
              <span className={g.status === 'done' ? 'done' : ''}>{g.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </StateView>
  )
}
```

---

## Architecture Summary

```
CanvasContainer (orchestrator, state, shortcuts)
├── CanvasGrid (pan/zoom/drag-select, card rendering)
│   ├── CanvasCard (per-card drag/resize/select)
│   │   └── CardFrame (glass header + body)
│   │       └── [Card Type Component] (FocusCard, PlanCard, etc.)
│   │           └── StateView (empty/loading/error/populated)
│   └── GroupCard (group container with color picker)
├── CanvasMinimap (SVG navigation overview)
├── CanvasManagerPanel (save/load/rename sidebar)
├── CardDrawer (add-card slide-out with categories)
├── CommandPalette (Ctrl+K slash commands + intent parser)
├── CanvasInput (bottom chat bar with send/voice)
└── SaveIndicator (auto-save status pill)
```

## Key Constants

| Constant | Value | Used in |
|----------|-------|---------|
| CELL | 40px | All position/size math |
| MIN_ZOOM | 0.15 | CanvasGrid wheel handler |
| MAX_ZOOM | 3.0 | CanvasGrid wheel handler |
| ZOOM_STEP | 0.08 | Ctrl+wheel delta |
| GAP | 40px | autoArrange row spacing |
| ROW_MAX_WIDTH | 1600px | autoArrange row break |
| STORAGE_PREFIX | 'deskflow-canvas-' | localStorage keys |
| ACTIVE_KEY | 'deskflow-canvas-active' | Current canvas pointer |

## Card Type Color Map

```
focus=#f472b6, plan=#a78bfa, reflect=#c084fc, finance=#34d399, digest=#22d3ee,
approval=#fbbf24, transient=#71717a, annotation=#fb923c, response=#60a5fa,
group=#818cf8, connectors=#2dd4bf, schedule=#f87171, deadlines=#f97316, planner=#38bdf8
```

## Installed Dependencies

- React 18+
- framer-motion (animations)
- lucide-react (icons)
- tailwindcss (utility classes)
- better-sqlite3 (backend DB, not relevant to canvas CSS)
