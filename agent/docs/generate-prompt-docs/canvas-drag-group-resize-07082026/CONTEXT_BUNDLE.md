# CONTEXT_BUNDLE — AI Canvas: Drag / Resize / Grouping Fix

> Generated for the external Architect AI (has NO repo access — this file IS the project).
> Everything below is verbatim from the actual source. Line numbers match the files on disk.
> Repo: **App Tracker** (DeskFlow) — Electron + React 18 + TypeScript + Vite + zustand + framer-motion + Tailwind v4. Dark mode only. HashRouter. No test runner installed.

---

## 1. TASK OVERVIEW

The AI Canvas (`/ai` route → `AiPage.tsx` → `CanvasContainer` → `CanvasGrid` → `CanvasCard`) has THREE user-reported failures:

1. **Dragging cards does not reliably work** — users report the dragged card "snaps back" / nothing moves / the canvas pans away at drop time.
2. **Resizing cards** — resize handle exists; verify it works and persists.
3. **Grouping cards** — dropping one card on another creates a group, but the user's hard requirement is:
   > **"IT SHOULD SHOW THE CARD, IT SHOULDNT CHANGE HOW THE CARD THAT IS BEING GROUPED IS DISPLAYED"**
   Grouping must WRAP the real cards in a container at their real positions/sizes — it must NEVER replace card bodies with previews/mini-chips or re-render cards differently inside the group.

---

## 2. FILE MAP

| File | Role |
|---|---|
| `src/types/canvas.ts` | Types + pure reducer (single source of truth for canvas state) |
| `src/hooks/useCanvasState.ts` | zustand-ish hook wrapping the reducer, persistence to localStorage |
| `src/components/ai/canvas/CanvasContainer.tsx` | Top-level canvas component: pan/zoom state, auto-focus logic |
| `src/components/ai/canvas/CanvasGrid.tsx` | Viewport, pan/zoom handlers, drop-target detection, renders cards |
| `src/components/ai/canvas/CanvasCard.tsx` | Single card: drag/resize/click pointer logic + card content switch |
| `src/components/ai/canvas/GroupCard.tsx` | Group container — renders REAL child cards via `renderChild` |
| `src/components/ai/canvas/canvas.css` | All canvas + group styles |
| `src/pages/AiPage.tsx` | The page that hosts the canvas; merges persisted + derived cards |
| `src/hooks/useCanvasState.ts` | Hook API used by AiPage (`canvas.*`) |

---

## 3. VERBATIM SOURCE — `src/types/canvas.ts` (302 lines)

```ts
// lines 1-58
export type CardType =
  | 'focus' | 'plan' | 'reflect' | 'finance'
  | 'digest' | 'approval' | 'transient' | 'annotation'
  | 'response' | 'group' | 'connectors'
  | 'schedule' | 'deadlines' | 'planner'
  | 'automation'
  | 'generated'

export type CardStatus = 'live' | 'stale' | 'error' | 'loading'

export const GROUP_COLORS = [
  { id: 'violet', label: 'Violet', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)', accent: '#8b5cf6' },
  { id: 'blue', label: 'Blue', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', accent: '#3b82f6' },
  { id: 'emerald', label: 'Emerald', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', accent: '#10b981' },
  { id: 'amber', label: 'Amber', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', accent: '#f59e0b' },
  { id: 'rose', label: 'Rose', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.35)', accent: '#f43f5e' },
  { id: 'cyan', label: 'Cyan', bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.35)', accent: '#06b6d4' },
  { id: 'pink', label: 'Pink', bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.35)', accent: '#ec4899' },
  { id: 'slate', label: 'Slate', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.35)', accent: '#64748b' },
] as const

export type GroupColorId = typeof GROUP_COLORS[number]['id']

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
  groupId?: string
}

export type GroupOrientation = 'vertical' | 'horizontal'

export interface CanvasGroup {
  id: string
  label: string
  colorId: GroupColorId
  cardIds: string[]
  position: { x: number; y: number }
  size: { w: number; h: number }
  createdAt: number
  orientation?: GroupOrientation
  ratio?: number // 0-1, controls the size split between items (0.5 = equal)
}

export interface CanvasState {
  cards: Record<string, CanvasCard>
  groups: Record<string, CanvasGroup>
  nextZIndex: number
  pan: { x: number; y: number }
  zoom: number
}

// lines 61-127 (actions + reducer start)
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
  | { type: 'HYDRATE'; state: CanvasState }
  | { type: 'SET_PAN_ZOOM'; pan: { x: number; y: number }; zoom: number }
  | { type: 'CREATE_GROUP'; group: CanvasGroup; cardIds: string[]; groupCard: CanvasCard }
  | { type: 'UPDATE_GROUP'; id: string; patch: Partial<Pick<CanvasGroup, 'label' | 'colorId' | 'orientation' | 'ratio'>> }
  | { type: 'DELETE_GROUP'; id: string }
  | { type: 'UNGROUP'; id: string; mode: 'restore' | 'scatter' }
  | { type: 'ADD_TO_GROUP'; cardId: string; groupId: string }
  | { type: 'REMOVE_FROM_GROUP'; cardId: string; newPosition?: { x: number; y: number } }
  | { type: 'ARRANGE_GROUP'; id: string; positions: Record<string, { x: number; y: number }>; size: { w: number; h: number } }
  | { type: 'ADD_GENERATED_CARD'; card: CanvasCard }
  | { type: 'REMOVE_GENERATED_CARD'; id: string }

export const DEFAULT_STATE: CanvasState = {
  cards: {},
  groups: {},
  nextZIndex: 1,
  pan: { x: 0, y: 0 },
  zoom: 1,
}

export function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'ADD_CARD':
      return {
        ...state,
        cards: { ...state.cards, [action.card.id]: { ...action.card, zIndex: state.nextZIndex } },
        nextZIndex: state.nextZIndex + 1,
      }
    case 'UPDATE_CARD':
      if (!state.cards[action.id]) return state
      return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], ...action.patch } } }
    case 'REMOVE_CARD': {
      const { [action.id]: _, ...rest } = state.cards
      return { ...state, cards: rest }
    }
    case 'MOVE_CARD':
      if (!state.cards[action.id]) return state
      return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], position: action.position } } }
    case 'RESIZE_CARD':
      if (!state.cards[action.id]) return state
      return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], size: action.size } } }
    case 'PIN_CARD':
      if (!state.cards[action.id]) return state
      return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], pinned: !state.cards[action.id].pinned } } }
    case 'DISMISS_CARD':
      if (!state.cards[action.id]) return state
      return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], dismissedAt: Date.now() } } }
    case 'SET_STATUS':
      if (!state.cards[action.id]) return state
      return { ...state, cards: { ...state.cards, [action.id]: { ...state.cards[action.id], status: action.status } } }
    case 'RESET_LAYOUT':
      return DEFAULT_STATE
    case 'HYDRATE':
      return action.state
    case 'SET_PAN_ZOOM':
      return { ...state, pan: action.pan, zoom: action.zoom }

    // ── Group actions ──
    case 'CREATE_GROUP': {
      const { group, cardIds, groupCard } = action
      const updatedCards = { ...state.cards }
      // Tag child cards with groupId (they remain visible, CanvasGrid will filter)
      cardIds.forEach(id => {
        if (updatedCards[id]) {
          updatedCards[id] = { ...updatedCards[id], groupId: group.id }
        }
      })
      return {
        ...state,
        groups: { ...state.groups, [group.id]: group },
        cards: { ...updatedCards, [groupCard.id]: groupCard },
        nextZIndex: state.nextZIndex + 1,
      }
    }
    case 'UPDATE_GROUP': {
      const group = state.groups[action.id]
      if (!group) return state
      return { ...state, groups: { ...state.groups, [action.id]: { ...group, ...action.patch } } }
    }
    case 'DELETE_GROUP': {
      const { [action.id]: _, ...rest } = state.groups
      const cards = { ...state.cards }
      for (const [id, c] of Object.entries(cards)) {
        if (c.type === 'group' && c.data?.groupId === action.id) {
          // Remove the visual group card itself
          delete cards[id]
        } else if (c.groupId === action.id) {
          cards[id] = { ...c, groupId: undefined }
        }
      }
      return { ...state, groups: rest, cards }
    }
    case 'UNGROUP': {
      const group = state.groups[action.id]
      if (!group) return state
      const { [action.id]: _, ...restGroups } = state.groups
      const updatedCards = { ...state.cards }

      // Find the visual group card and extract child card data
      const groupCardId = Object.keys(updatedCards).find(
        id => updatedCards[id].data?.groupId === action.id
      )
      const childCards = groupCardId ? updatedCards[groupCardId].data?.childCards || [] : []

      // Remove the visual group card
      if (groupCardId) {
        delete updatedCards[groupCardId]
      }

      // Restore child cards from stored data or clear groupId
      group.cardIds.forEach((id, index) => {
        const storedChild = childCards.find((c: any) => c.id === id)
        if (storedChild) {
          // Restore from stored data
          let newPos = storedChild.position || { x: 0, y: 0 }
          if (action.mode === 'scatter') {
            const offset = (index % 3) * 40
            const offsetY = Math.floor(index / 3) * 40
            newPos = { x: group.position.x + offset, y: group.position.y + offsetY }
          }
          updatedCards[id] = {
            ...storedChild,
            position: newPos,
            groupId: undefined,
            dismissedAt: undefined,
            zIndex: state.nextZIndex + index,
          }
        } else if (updatedCards[id]) {
          // Fallback: just clear groupId
          let newPos = updatedCards[id].position
          if (action.mode === 'scatter') {
            const offset = (index % 3) * 40
            const offsetY = Math.floor(index / 3) * 40
            newPos = { x: group.position.x + offset, y: group.position.y + offsetY }
          }
          updatedCards[id] = {
            ...updatedCards[id],
            groupId: undefined,
            position: newPos,
            dismissedAt: undefined,
          }
        }
      })

      return { ...state, groups: restGroups, cards: updatedCards, nextZIndex: state.nextZIndex + group.cardIds.length }
    }
    case 'ADD_TO_GROUP': {
      if (!state.cards[action.cardId] || !state.groups[action.groupId]) return state
      const group = state.groups[action.groupId]
      const card = state.cards[action.cardId]
      const updatedCards = {
        ...state.cards,
        [action.cardId]: { ...card, groupId: action.groupId },
      }
      // Keep the group card's childCards snapshot in sync
      for (const [id, c] of Object.entries(updatedCards)) {
        if (c.type === 'group' && c.data?.groupId === action.groupId) {
          const existing = (c.data?.childCards || []).filter((cc: any) => cc.id !== action.cardId)
          const snapshot = {
            id: card.id, type: card.type, data: card.data, source: card.source,
            position: card.position, size: card.size, pinned: card.pinned,
            status: card.status, createdAt: card.createdAt,
          }
          updatedCards[id] = { ...c, data: { ...c.data, childCards: [...existing, snapshot] } }
        }
      }
      return {
        ...state,
        cards: updatedCards,
        groups: { ...state.groups, [action.groupId]: { ...group, cardIds: [...group.cardIds, action.cardId] } },
      }
    }
    case 'REMOVE_FROM_GROUP': {
      const card = state.cards[action.cardId]
      if (!card?.groupId || !state.groups[card.groupId]) return state
      const group = state.groups[card.groupId]
      const updatedCards = {
        ...state.cards,
        [action.cardId]: {
          ...card,
          groupId: undefined,
          position: action.newPosition || card.position,
          dismissedAt: undefined,
        },
      }
      // Keep the group card's childCards snapshot in sync
      for (const [id, c] of Object.entries(updatedCards)) {
        if (c.type === 'group' && c.data?.groupId === card.groupId) {
          updatedCards[id] = {
            ...c,
            data: { ...c.data, childCards: (c.data?.childCards || []).filter((cc: any) => cc.id !== action.cardId) },
          }
        }
      }
      return {
        ...state,
        cards: updatedCards,
        groups: {
          ...state.groups,
          [card.groupId]: { ...group, cardIds: group.cardIds.filter(id => id !== action.cardId) },
        },
      }
    }
    case 'ARRANGE_GROUP': {
      const group = state.groups[action.id]
      if (!group) return state
      const updatedCards = { ...state.cards }
      Object.entries(action.positions).forEach(([cardId, pos]) => {
        if (updatedCards[cardId]) {
          updatedCards[cardId] = { ...updatedCards[cardId], position: pos }
        }
      })
      return {
        ...state,
        groups: { ...state.groups, [action.id]: { ...group, size: action.size } },
        cards: updatedCards,
      }
    }
    case 'ADD_GENERATED_CARD':
      return {
        ...state,
        cards: { ...state.cards, [action.card.id]: { ...action.card, zIndex: state.nextZIndex } },
        nextZIndex: state.nextZIndex + 1,
      }
    case 'REMOVE_GENERATED_CARD': {
      const { [action.id]: _, ...restCards } = state.cards
      return { ...state, cards: restCards }
    }
    default:
      return state
  }
}
```

---

## 4. VERBATIM SOURCE — `src/hooks/useCanvasState.ts` (relevant parts)

```ts
// line 102-104 (moveCard) — INSIDE the hook's returned API
const moveCard = useCallback((id: string, position: { x: number; y: number }) => {
  dispatch({ type: 'MOVE_CARD', id, position })
}, [])

// lines 143-192 (createGroup) — THE grouping entry point called by AiPage
const createGroup = useCallback((label: string, cardIds: string[], colorId: GroupColorId = 'violet') => {
  const cards = cardIds.map(id => state.cards[id]).filter(Boolean)
  if (cards.length === 0) return null

  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const c of cards) {
    minX = Math.min(minX, c.position.x)
    minY = Math.min(minY, c.position.y)
    maxX = Math.max(maxX, c.position.x + c.size.w * 40)
    maxY = Math.max(maxY, c.position.y + c.size.h * 40)
  }

  const groupId = generateUUID()
  const groupCardId = generateUUID()

  const group: CanvasGroup = {
    id: groupId,
    label,
    colorId,
    cardIds,
    position: { x: minX - 10, y: minY - 30 },
    size: { w: Math.max(10, Math.ceil((maxX - minX + 20) / 40)), h: Math.max(6, Math.ceil((maxY - minY + 60) / 40)) },
    createdAt: Date.now(),
  }

  const groupCard: CanvasCard = {
    id: groupCardId,
    type: 'group',
    position: { x: minX - 10, y: minY - 30 },
    size: group.size,
    zIndex: 0,
    pinned: true,
    data: {
      groupId,
      arrange: 'grid',
      childCards: cards.map(c => ({
        id: c.id, type: c.type, data: c.data, source: c.source,
        position: c.position,
        size: c.size, pinned: c.pinned, status: c.status, createdAt: c.createdAt,
      })),
    },
    source: 'user',
    status: 'live',
    createdAt: Date.now(),
  }

  dispatch({ type: 'CREATE_GROUP', group, cardIds, groupCard })
  return groupId
}, [state.cards])

// lines 194-212
const updateGroup = useCallback((id: string, patch: Partial<Pick<CanvasGroup, 'label' | 'colorId'>>) => {
  dispatch({ type: 'UPDATE_GROUP', id, patch })
}, [])

const ungroup = useCallback((id: string, mode: 'restore' | 'scatter' = 'restore') => {
  dispatch({ type: 'UNGROUP', id, mode })
}, [])

const deleteGroup = useCallback((id: string) => {
  dispatch({ type: 'DELETE_GROUP', id })
}, [])

const addToGroup = useCallback((cardId: string, groupId: string) => {
  dispatch({ type: 'ADD_TO_GROUP', cardId, groupId })
}, [])

const removeFromGroup = useCallback((cardId: string, newPosition?: { x: number; y: number }) => {
  dispatch({ type: 'REMOVE_FROM_GROUP', cardId, newPosition })
}, [])

// lines 214-268 (arrangeGroup — grid/stack/mosaic/custom)
const arrangeGroup = useCallback((groupId: string, mode: 'grid' | 'stack' | 'mosaic' | 'custom', customPositions?: Record<string, { x: number; y: number }>) => {
  const group = state.groups[groupId]
  if (!group) return

  const groupCards = group.cardIds.map(id => state.cards[id]).filter(Boolean)
  const positions: Record<string, { x: number; y: number }> = {}
  const CELL = 40
  const GAP = 1

  if (mode === 'custom' && customPositions) {
    Object.assign(positions, customPositions)
  } else if (mode === 'stack') {
    groupCards.forEach((card, i) => {
      positions[card.id] = {
        x: group.position.x + 2 * CELL,
        y: group.position.y + (i + 1) * (3 * CELL + GAP),
      }
    })
  } else if (mode === 'mosaic') {
    groupCards.forEach((card, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      positions[card.id] = {
        x: group.position.x + ((col * 5) + 1) * CELL,
        y: group.position.y + ((row * 4) + 1) * CELL,
      }
    })
  } else {
    // grid (default)
    const count = groupCards.length
    const cols = Math.ceil(Math.sqrt(count))
    groupCards.forEach((card, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      positions[card.id] = {
        x: group.position.x + (col + 1) * (4 * CELL + GAP),
        y: group.position.y + (row + 1) * (3 * CELL + GAP),
      }
    })
  }

  // Compute new group size based on arrangement
  const posArray = Object.values(positions)
  let newMaxX = 0, newMaxY = 0
  for (const p of posArray) {
    newMaxX = Math.max(newMaxX, p.x - group.position.x + 4 * CELL)
    newMaxY = Math.max(newMaxY, p.y - group.position.y + 3 * CELL)
  }
  const newSize = {
    w: Math.max(group.size.w, Math.ceil(newMaxX / CELL) + 2),
    h: Math.max(group.size.h, Math.ceil(newMaxY / CELL) + 2),
  }

  dispatch({ type: 'ARRANGE_GROUP', id: groupId, positions, size: newSize })
}, [state.groups, state.cards])
```

---

## 5. VERBATIM SOURCE — `src/components/ai/canvas/CanvasCard.tsx` (358 lines, FULL)

> THE most important file. Note line 141 `suppressClickRef` (recent fix for click-after-drag selecting the card and auto-focus panning the camera). Note `handlePointerUp` line 243-268: it ONLY calls `onDragEnd` when `hasMovedRef.current` is true — a click (no movement) never commits a move. Drag uses DOM `transform` matrix read (line 207-212) and snaps to `CELL=40` grid (line 254-255).

```tsx
import { useRef, useState, useCallback, useEffect, Component, type ReactNode, type ErrorInfo } from 'react'
import { Pin, PinOff, Maximize2, Minimize2 } from 'lucide-react'
import { CanvasCardFallback } from './CanvasCardFallback'
import { FocusCard } from './cards/FocusCard'
import { PlanCard } from './cards/PlanCard'
import { FinanceCard } from './cards/FinanceCard'
import { DigestCard } from './cards/DigestCard'
import { ApprovalCard } from './cards/ApprovalCard'
import { AnnotationCard } from './cards/AnnotationCard'
import { ResponseCardContent } from './ResponseCardContent'
import { GroupCard } from './GroupCard'
import { ConnectorsCard } from './ConnectorsCard'
import { WeeklyScheduleCard } from './cards/WeeklyScheduleCard'
import { DeadlineTrackerCard } from './cards/DeadlineTrackerCard'
import { DailyPlannerCard } from './cards/DailyPlannerCard'
import { DynamicCard } from './cards/DynamicCard'
import { AutomationCard } from '../automations/AutomationCard'
import type { CanvasCard as CanvasCardType, CanvasGroup } from '../../../types/canvas'
import './cards/cards.css'

const CELL = 40

interface CardContentCtx {
  onUpdateCard?: (id: string, patch: Record<string, any>) => void
  onDismiss?: (id: string) => void
  groups?: Record<string, CanvasGroup>
  onUpdateGroup?: (groupId: string, patch: Partial<Pick<CanvasGroup, 'label' | 'colorId' | 'orientation' | 'ratio'>>) => void
  onUngroup?: (groupId: string, mode: 'restore' | 'scatter') => void
  onRemoveFromGroup?: (cardId: string, newPosition?: { x: number; y: number }) => void
}

function renderCardContent(card: CanvasCardType, ctx: CardContentCtx) {
  switch (card.type) {
    case 'focus': return <FocusCard card={card} goals={card.data?.goals} loading={card.status === 'loading'} />
    case 'plan': return <PlanCard card={card} goals={card.data?.goals} notes={card.data?.notes} loading={card.status === 'loading'} />
    case 'finance': return <FinanceCard card={card} summary={card.data?.summary} loading={card.status === 'loading'} />
    case 'digest': return <DigestCard card={card} topics={card.data?.topics} loading={card.status === 'loading'} />
    case 'approval': return <ApprovalCard card={card} />
    case 'transient': return <div style={{ fontSize: 12, color: '#71717a' }}>{card.data?.text || card.data?.message || 'Transient card'}</div>
    case 'annotation': return <AnnotationCard card={card} />
    case 'response': return <ResponseCardContent content={card.data?.content || ''} isToolOutput={card.data?.isToolOutput} timestamp={card.data?.timestamp} isUserInput={card.data?.isUserInput} aiResponse={card.data?.aiResponse} aiTimestamp={card.data?.aiTimestamp} />
    case 'generated': return <DynamicCard card={card} onDismiss={ctx.onDismiss} />
    case 'group': {
      // Canonical group record lives in state.groups (label/colorId/cardIds);
      // card.data.groupId links the visual card to it. Fall back to data when
      // a group record is missing (e.g. hydrated from an old snapshot).
      const groupId = card.data?.groupId || card.id
      const canonical = ctx.groups?.[groupId]
      const groupObj: CanvasGroup = {
        id: groupId,
        label: canonical?.label || card.data?.label || 'Group',
        colorId: canonical?.colorId || card.data?.colorId || 'violet',
        cardIds: canonical?.cardIds || (card.data?.childCards || []).map((c: any) => c.id),
        position: canonical?.position || card.position,
        size: canonical?.size || card.size,
        createdAt: canonical?.createdAt || card.createdAt,
      }
      return (
        <GroupCard
          group={groupObj}
          cards={(card.data?.childCards || []).map((c: any) => ({
            ...c,
            position: c.position || { x: 0, y: 0 },
            zIndex: 0,
            groupId,
          }))}
          renderChild={(c) => renderCardContent(c, ctx)}
          onUpdateGroup={(patch) => ctx.onUpdateGroup?.(groupId, patch)}
          onUngroup={(mode) => ctx.onUngroup?.(groupId, mode)}
          onRemoveFromGroup={(cid, newPosition) => ctx.onRemoveFromGroup?.(cid, newPosition)}
        />
      )
    }
    case 'connectors': return <ConnectorsCard state={card.data?.state || 'loading'} connectors={card.data?.connectors || []} errorMessage={card.data?.errorMessage} onRetry={card.data?.onRetry} onAdd={card.data?.onAdd} onSync={card.data?.onSync} onRefresh={card.data?.onRefresh} syncing={card.data?.syncing} />
    case 'reflect': {
      const days = card.data?.days || []
      return (<div style={{ fontSize: 13 }}>{days.length === 0 ? <p style={{ fontSize: 12, color: '#3f3f46', margin: 0 }}>No reflections yet</p> : <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{days.slice(0, 5).map((d: any, i: number) => (<li key={i} style={{ padding: '5px 0', borderBottom: '1px solid rgba(63,63,70,0.15)', fontSize: 13, color: '#d4d4d8' }}><span style={{ fontWeight: 500 }}>{d.date || 'Today'}</span>{d.summary && <span style={{ display: 'block', fontSize: 12, color: '#52525b', marginTop: 2 }}>{d.summary.slice(0, 80)}...</span>}</li>))}</ul>}</div>)
    }
    case 'schedule': return <WeeklyScheduleCard />
    case 'deadlines': return <DeadlineTrackerCard />
    case 'planner': return <DailyPlannerCard />
    case 'automation': {
      const auto = card.data?.automation
      if (!auto) return <div style={{ fontSize: 12, color: '#52525b' }}>Automation</div>
      return (
        <AutomationCard
          data={auto}
          onEdit={card.data?.onEdit}
          onToggle={card.data?.onToggle}
          onDelete={card.data?.onDelete}
          onTestRun={card.data?.onTestRun}
          onDismiss={() => ctx.onDismiss?.(card.id)}
        />
      )
    }
    default: return <div style={{ fontSize: 12, color: '#52525b' }}>{card.type}</div>
  }
}

interface CanvasCardProps {
  card: CanvasCardType
  onDragEnd: (id: string, position: { x: number; y: number }) => void
  onDismiss: (id: string) => void
  onPin?: (id: string) => void
  onResize?: (id: string, size: { w: number; h: number }) => void
  onDragStart?: () => void
  onDragStop?: () => void
  onClick?: (id: string) => void
  onUpdateCard?: (id: string, patch: Record<string, any>) => void
  groups?: Record<string, CanvasGroup>
  onUpdateGroup?: (groupId: string, patch: Partial<Pick<CanvasGroup, 'label' | 'colorId' | 'orientation' | 'ratio'>>) => void
  onUngroup?: (groupId: string, mode: 'restore' | 'scatter') => void
  onRemoveFromGroup?: (cardId: string, newPosition?: { x: number; y: number }) => void
  zoom?: number
  isFocused?: boolean
  isDropTarget?: boolean
  onDropTarget?: (id: string | null) => void
}

interface ErrorBoundaryState { hasError: boolean; error: Error | null }
class CardErrorBoundary extends Component<{ cardType: string; onRetry: () => void; onDismiss: () => void; children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(`[CanvasCard] ${this.props.cardType} crashed:`, error, info.componentStack) }
  render() {
    if (this.state.hasError) return <CanvasCardFallback cardType={this.props.cardType} error={this.state.error?.message || 'Unknown error'} onRetry={() => this.setState({ hasError: false, error: null })} onDismiss={this.props.onDismiss} />
    return this.props.children
  }
}

export function CanvasCard({ card, onDragEnd, onDismiss, onPin, onResize, onDragStart, onDragStop, onClick, onUpdateCard, groups, onUpdateGroup, onUngroup, onRemoveFromGroup, zoom = 1, isFocused, isDropTarget, onDropTarget }: CanvasCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)
  const isDraggingRef = useRef(false)
  const hasMovedRef = useRef(false)
  // A real drag ends with a pointerup that the browser ALSO turns into a click
  // on the same element. Without this flag, that click fires onClick → selects
  // the card → auto-focus pans the camera to the just-dropped card, making the
  // drag look like it "snapped back". Suppress the click after a real drag.
  const suppressClickRef = useRef(false)

  // ── Resize handlers (defined FIRST so drag handlers can reference them) ──
  const handleResizeDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: card.size.w, origH: card.size.h }
    if (cardRef.current) {
      cardRef.current.setPointerCapture(e.pointerId)
    }
  }, [card.size])

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current || !cardRef.current) return
    const dx = (e.clientX - resizeRef.current.startX) / zoom
    const dy = (e.clientY - resizeRef.current.startY) / zoom
    const newW = Math.max(4, Math.min(20, Math.round((resizeRef.current.origW * CELL + dx) / CELL)))
    const newH = Math.max(4, Math.min(20, Math.round((resizeRef.current.origH * CELL + dy) / CELL)))
    cardRef.current.style.width = `${newW * CELL}px`
    cardRef.current.style.height = `${newH * CELL}px`
  }, [zoom])

  const handleResizeUp = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current || !cardRef.current) return
    const dx = (e.clientX - resizeRef.current.startX) / zoom
    const dy = (e.clientY - resizeRef.current.startY) / zoom
    const newW = Math.max(4, Math.min(20, Math.round((resizeRef.current.origW * CELL + dx) / CELL)))
    const newH = Math.max(4, Math.min(20, Math.round((resizeRef.current.origH * CELL + dy) / CELL)))
    resizeRef.current = null
    try { cardRef.current.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    onResize?.(card.id, { w: newW, h: newH })
  }, [card.id, onResize, zoom])

  // ── Cancel any in-flight drag/resize and restore committed state ──
  // Used on pointercancel, lost focus / window blur, and unmount — events
  // where pointerup may never fire. Without this, the card stays stuck in
  // the dragging class, z-index 1000, and the grid's draggingCardId is never
  // cleared (card clicks die, resize stays armed, drop targets stay lit).
  const cleanupInteraction = useCallback(() => {
    const wasActive = dragRef.current || resizeRef.current
    dragRef.current = null
    resizeRef.current = null
    isDraggingRef.current = false
    hasMovedRef.current = false
    if (cardRef.current) {
      cardRef.current.classList.remove('dragging')
      cardRef.current.style.zIndex = String(card.zIndex)
      cardRef.current.style.transform = `translate(${card.position.x}px, ${card.position.y}px)`
      cardRef.current.style.width = `${card.size.w * CELL}px`
      cardRef.current.style.height = `${card.size.h * CELL}px`
    }
    if (wasActive) {
      suppressClickRef.current = true
      onDragStop?.()
    }
  }, [card.zIndex, card.position.x, card.position.y, card.size.w, card.size.h, onDragStop])

  // ── Drag handlers ──
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    suppressClickRef.current = false
    if ((e.target as HTMLElement).closest('button, input, textarea, select, a, [role="button"], [onClick]')) return
    if ((e.target as HTMLElement).closest('.dk-canvas-resize-handle')) return

    let startX = card.position.x
    let startY = card.position.y
    if (cardRef.current) {
      const computed = getComputedStyle(cardRef.current).transform
      if (computed && computed !== 'none') {
        const m = new DOMMatrix(computed)
        startX = m.m41
        startY = m.m42
      }
    }

    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: startX, origY: startY }
    isDraggingRef.current = true
    hasMovedRef.current = false
    if (cardRef.current) {
      cardRef.current.classList.add('dragging')
      cardRef.current.style.zIndex = '1000'
      cardRef.current.setPointerCapture(e.pointerId)
    }
    onDragStart?.()
  }, [onDragStart])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (resizeRef.current) {
      hasMovedRef.current = true
      handleResizeMove(e)
      return
    }
    if (!dragRef.current || !cardRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (!hasMovedRef.current && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      hasMovedRef.current = true
    }
    const newX = dragRef.current.origX + dx / zoom
    const newY = dragRef.current.origY + dy / zoom
    cardRef.current.style.transform = `translate(${newX}px, ${newY}px)`
  }, [zoom, handleResizeMove])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (resizeRef.current) {
      handleResizeUp(e)
      return
    }
    if (!dragRef.current) return
    if (hasMovedRef.current) {
      const dx = (e.clientX - dragRef.current.startX) / zoom
      const dy = (e.clientY - dragRef.current.startY) / zoom
      const rawX = dragRef.current.origX + dx
      const rawY = dragRef.current.origY + dy
      const snappedX = Math.round(rawX / CELL) * CELL
      const snappedY = Math.round(rawY / CELL) * CELL
      onDragEnd(card.id, { x: snappedX, y: snappedY })
      suppressClickRef.current = true
    }
    dragRef.current = null
    isDraggingRef.current = false
    hasMovedRef.current = false
    if (cardRef.current) {
      cardRef.current.classList.remove('dragging')
      cardRef.current.style.zIndex = String(card.zIndex)
      try { cardRef.current.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    onDragStop?.()
  }, [card.id, card.zIndex, onDragEnd, onDragStop, zoom, handleResizeUp])

  const handlePointerCancel = useCallback(() => {
    cleanupInteraction()
  }, [cleanupInteraction])

  // Safety net: if pointerup is ever lost (alt-tab, pointercancel, window
  // blur, card unmounted mid-drag), restore the card to its committed state
  // and clear the grid's dragging state instead of leaving it stuck.
  useEffect(() => {
    const onWindow = () => {
      if (dragRef.current || resizeRef.current) cleanupInteraction()
    }
    window.addEventListener('pointerup', onWindow)
    window.addEventListener('pointercancel', onWindow)
    window.addEventListener('blur', onWindow)
    return () => {
      window.removeEventListener('pointerup', onWindow)
      window.removeEventListener('pointercancel', onWindow)
      window.removeEventListener('blur', onWindow)
      cleanupInteraction()
    }
  }, [cleanupInteraction])

  const handleCardClick = useCallback((e: React.PointerEvent) => {
    // A click that immediately follows a real drag must not select the card —
    // otherwise auto-focus pans the camera away from where the card was dropped.
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    // Only fire if not dragging or resizing
    if (dragRef.current || resizeRef.current) return
    // Don't fire on any interactive element (buttons, inputs, links, etc.)
    if ((e.target as HTMLElement).closest('button, input, textarea, select, a, [role="button"], [onClick]')) return
    // Don't fire on header actions or resize handle
    if ((e.target as HTMLElement).closest('.dk-canvas-card-actions, .dk-canvas-resize-handle')) return
    onClick?.(card.id)
  }, [card.id, onClick])

  const isTransient = !card.pinned && card.source === 'ai'
  const isGroupCard = card.type === 'group'

  return (
    <CardErrorBoundary cardType={card.type} onRetry={() => {}} onDismiss={() => onDismiss(card.id)}>
      <div
        ref={cardRef}
        className={`dk-canvas-card ${isTransient ? 'transient' : ''} ${isFocused ? 'focused' : ''} ${isDropTarget ? 'drop-target' : ''} status-${card.status}`}
        data-card-id={card.id}
        data-tutorial="ai.card-types"
        style={{
          position: 'absolute', left: 0, top: 0,
          width: card.size.w * CELL, height: card.size.h * CELL,
          transform: `translate(${card.position.x}px, ${card.position.y}px)`,
          zIndex: card.zIndex,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleCardClick}
      >
        <div
          className="dk-canvas-card-header"
          style={{ cursor: 'grab' }}
        >
          <span className="dk-canvas-card-type">{card.type}</span>
          <div className="dk-canvas-card-actions">
            <button
              className={`dk-canvas-pin-btn ${card.pinned ? 'pinned' : ''}`}
              onClick={(e) => { e.stopPropagation(); onPin?.(card.id) }}
              title={card.pinned ? 'Unpin card' : 'Pin card'}
            >
              {card.pinned ? <PinOff size={13} /> : <Pin size={13} />}
            </button>
            {!isGroupCard && (
              <button className="dk-canvas-dismiss" onClick={(e) => { e.stopPropagation(); onDismiss(card.id) }} title="Dismiss">✕</button>
            )}
          </div>
        </div>
        <div className="dk-canvas-card-body">
          {renderCardContent(card, { onUpdateCard, onDismiss, groups, onUpdateGroup, onUngroup, onRemoveFromGroup })}
        </div>
        <div
          className="dk-canvas-resize-handle"
          onPointerDown={handleResizeDown}
        />
      </div>
    </CardErrorBoundary>
  )
}
```

> **NOTE:** `Maximize2` / `Minimize2` are imported but unused (line 2). `onDropTarget` prop is received but never used in the component body — drop-target highlighting is driven by the `isDropTarget` prop.

---

## 6. VERBATIM SOURCE — `src/components/ai/canvas/CanvasGrid.tsx` (247 lines, FULL)

```tsx
import { useRef, useCallback, useState, useEffect } from 'react'
import { CanvasCard } from './CanvasCard'
import type { CanvasCard as CanvasCardType, CanvasGroup } from '../../../types/canvas'
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
  onUpdateCard?: (id: string, patch: Record<string, any>) => void
  groups?: Record<string, CanvasGroup>
  onUpdateGroup?: (groupId: string, patch: Partial<Pick<CanvasGroup, 'label' | 'colorId' | 'orientation' | 'ratio'>>) => void
  onUngroup?: (groupId: string, mode: 'restore' | 'scatter') => void
  onRemoveFromGroup?: (cardId: string, newPosition?: { x: number; y: number }) => void
  isPanning: boolean
  setIsPanning: (v: boolean) => void
  focusedCardId?: string | null
  onGroupCards?: (cardIds: string[]) => void
  onDraggingChange?: (dragging: boolean) => void
}

const MIN_ZOOM = 0.15
const MAX_ZOOM = 3.0
const ZOOM_STEP = 0.08
const CELL = 40

export function CanvasGrid({
  cards, pan, onPanChange, zoom, onZoomChange, onMoveCard, onDismissCard,
  onPinCard, onResizeCard, onCardClick, onUpdateCard, groups, onUpdateGroup, onUngroup, onRemoveFromGroup,
  isPanning, setIsPanning, focusedCardId, onGroupCards, onDraggingChange,
}: CanvasGridProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const gridLayerRef = useRef<HTMLDivElement>(null)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const panRef = useRef(pan)
  const zoomRef = useRef(zoom)
  const draggingCardId = useRef<string | null>(null)
  const dropTargetRef = useRef<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  panRef.current = pan
  zoomRef.current = zoom

  // Refs for cards so the global pointermove handler always reads latest
  const cardsRef = useRef(cards)
  cardsRef.current = cards

  // Global pointermove for drop-target detection via math (not elementFromPoint
  // which fails when dragged card's zIndex covers everything)
  // Uses the DRAGGED card's center point, not the cursor — so the target only
  // highlights when the card itself overlaps, not just the cursor.
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const draggingId = draggingCardId.current
      if (!draggingId) {
        if (dropTargetRef.current) {
          dropTargetRef.current = null
          setDropTargetId(null)
        }
        return
      }

      const currentCards = cardsRef.current

      // Read the dragged card's visual position from the DOM
      const draggedEl = document.querySelector(`[data-card-id="${draggingId}"]`) as HTMLElement | null
      let dragCX: number, dragCY: number
      if (draggedEl) {
        const computed = getComputedStyle(draggedEl).transform
        let visX = 0, visY = 0
        if (computed && computed !== 'none') {
          const m = new DOMMatrix(computed)
          visX = m.m41
          visY = m.m42
        }
        const draggedCard = currentCards.find(c => c.id === draggingId)
        const cardW = (draggedCard?.size.w || 4) * CELL
        const cardH = (draggedCard?.size.h || 3) * CELL
        dragCX = visX + cardW / 2
        dragCY = visY + cardH / 2
      } else {
        // Dragged card left the DOM (dismissed/unmounted mid-drag) — clear the
        // stuck drag state so the canvas doesn't stay in "dragging" mode.
        draggingCardId.current = null
        dropTargetRef.current = null
        setDropTargetId(null)
        gridLayerRef.current?.removeAttribute('data-card-dragging')
        return
      }

      // Target rects are in GRID coordinates — the dragged card's transform is
      // inside the scaled layer (no zoom/pan applied to the element itself), so
      // multiplying by zoom/pan here made drop targets wrong when zoomed/panned.
      const targetCard = currentCards.find(c => {
        if (c.id === draggingId) return false
        const left = c.position.x
        const top = c.position.y
        const right = left + c.size.w * CELL
        const bottom = top + c.size.h * CELL
        return dragCX >= left && dragCX <= right &&
               dragCY >= top && dragCY <= bottom
      })

      const targetId = targetCard?.id || null
      if (targetId !== dropTargetRef.current) {
        dropTargetRef.current = targetId
        setDropTargetId(targetId)
      }
    }

    window.addEventListener('pointermove', handler)
    return () => window.removeEventListener('pointermove', handler)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.dk-canvas-card')) return
    if ((e.target as HTMLElement).closest('.dk-minimap')) return
    if ((e.target as HTMLElement).closest('.dk-find-arrow')) return
    setIsPanning(true)
    const p = panRef.current
    panStart.current = { x: e.clientX, y: e.clientY, panX: p.x, panY: p.y }
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }, [setIsPanning])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    const newPan = { x: panStart.current.panX + dx, y: panStart.current.panY + dy }
    onPanChange(newPan)
  }, [isPanning, onPanChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsPanning(false)
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* ignore */ }
  }, [setIsPanning])

  // Native wheel listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top
      const p = panRef.current
      const z = zoomRef.current
      const gridX = (cursorX - p.x) / z
      const gridY = (cursorY - p.y) / z
      const direction = e.deltaY < 0 ? 1 : -1
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + direction * ZOOM_STEP * z))
      const newPanX = cursorX - gridX * newZoom
      const newPanY = cursorY - gridY * newZoom
      onZoomChange(newZoom, { x: newPanX, y: newPanY })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [onZoomChange])

  const bgStyle = {
    backgroundPosition: `${pan.x}px ${pan.y}px`,
    backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
  }

  const handleCardDragStart = useCallback((cardId: string) => {
    draggingCardId.current = cardId
    onDraggingChange?.(true)
    gridLayerRef.current?.setAttribute('data-card-dragging', 'true')
  }, [onDraggingChange])

  const handleCardDragStop = useCallback((cardId: string) => {
    const targetId = dropTargetRef.current
    if (targetId && targetId !== cardId && onGroupCards) {
      onGroupCards([cardId, targetId])
    }
    draggingCardId.current = null
    dropTargetRef.current = null
    setDropTargetId(null)
    onDraggingChange?.(false)
    gridLayerRef.current?.removeAttribute('data-card-dragging')
  }, [onGroupCards, onDraggingChange])

  const handleDropTarget = useCallback((targetId: string | null) => {
    // Ignore self-targeting
    if (targetId === draggingCardId.current) {
      setDropTargetId(null)
      return
    }
    setDropTargetId(targetId)
  }, [])

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
      <div
        ref={gridLayerRef}
        className="dk-canvas-grid-layer"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        {cards.length === 0 && (
          <div className="dk-canvas-empty" style={{ left: 0, top: 0 }}>
            <span>Cards will appear here as you interact with the AI</span>
          </div>
        )}
        {cards
          .filter(card => !card.groupId)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map(card => (
          <CanvasCard
            key={card.id}
            card={card}
            onDragEnd={(id, pos) => onMoveCard(id, pos)}
            onDismiss={onDismissCard}
            onPin={onPinCard}
            onResize={onResizeCard}
            onClick={onCardClick}
            onUpdateCard={onUpdateCard}
            groups={groups}
            onUpdateGroup={onUpdateGroup}
            onUngroup={onUngroup}
            onRemoveFromGroup={onRemoveFromGroup}
            onDragStart={() => handleCardDragStart(card.id)}
            onDragStop={() => handleCardDragStop(card.id)}
            zoom={zoom}
            isFocused={card.id === focusedCardId}
            isDropTarget={card.id === dropTargetId}
            onDropTarget={handleDropTarget}
          />
        ))}
      </div>
    </div>
  )
}
```

---

## 7. VERBATIM SOURCE — `src/components/ai/canvas/GroupCard.tsx` (220 lines, FULL)

> This is the CURRENT grouping renderer. It already renders REAL cards at their real positions via `renderChild` — it does NOT use mini-chips. The placement math (lines 29-44) positions children at `(card.position - group.position)` minus a 10px/30px creation margin, at real sizes (`card.size * 40`). The user requirement is that this "show the real card" behavior is PRESERVED and ENFORCED.

```tsx
import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Edit3, Palette, Ungroup, X, Layers } from 'lucide-react'
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

  // Children are placed at their real canvas positions (relative to the group
  // container) with their real sizes — grouping only wraps them in a box.
  const { placed, contentW, contentH } = useMemo(() => {
    const baseX = group.position?.x || 0
    const baseY = group.position?.y || 0
    const placed = cards.map(card => {
      const left = Math.max(0, (card.position?.x || 0) - baseX - 10)
      const top = Math.max(0, (card.position?.y || 0) - baseY - 30)
      return { card, left, top, right: left + card.size.w * CELL, bottom: top + card.size.h * CELL }
    })
    let w = 0
    let h = 0
    for (const p of placed) {
      w = Math.max(w, p.right)
      h = Math.max(h, p.bottom)
    }
    return { placed, contentW: w, contentH: cards.length === 0 ? 64 : h }
  }, [cards, group.position])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }
    if (showColorPicker) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showColorPicker])

  const handleRename = useCallback(() => {
    if (editLabel.trim() && editLabel.trim() !== group.label) {
      onUpdateGroup({ label: editLabel.trim() })
    }
    setEditing(false)
  }, [editLabel, group.label, onUpdateGroup])

  return (
    <div
      className="group-card"
      style={{
        '--group-accent': color.accent,
        '--group-bg': color.bg,
        '--group-border': color.border,
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className="group-card-header">
        <button className="group-expand-btn" onClick={() => setExpanded(v => !v)}>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <ChevronDown size={14} style={{ color: color.accent }} />
          </motion.div>
        </button>

        <div className="group-color-dot" style={{ background: color.accent }} />

        {editing ? (
          <input
            ref={inputRef}
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') { setEditing(false); setEditLabel(group.label) }
            }}
            className="group-name-input"
            style={{ color: color.accent }}
          />
        ) : (
          <span
            className="group-name"
            style={{ color: color.accent }}
            onDoubleClick={() => { setEditing(true); setEditLabel(group.label) }}
          >
            {group.label}
          </span>
        )}

        <span className="group-count">{cards.length}</span>

        <div className="group-actions">
          <button
            onClick={() => { setEditing(true); setEditLabel(group.label) }}
            title="Rename"
            className="group-action-btn"
          >
            <Edit3 size={12} />
          </button>

          <div ref={colorRef} className="group-color-wrapper">
            <button
              onClick={() => setShowColorPicker(v => !v)}
              title="Change color"
              className="group-action-btn"
            >
              <Palette size={12} />
            </button>

            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="group-color-picker"
                >
                  {GROUP_COLORS.map(c => (
                    <button
                      key={c.id}
                      className={`group-color-swatch ${c.id === group.colorId ? 'active' : ''}`}
                      style={{ background: c.accent }}
                      onClick={() => { onUpdateGroup({ colorId: c.id }); setShowColorPicker(false) }}
                      title={c.label}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => onUngroup(cards.length > 5 ? 'scatter' : 'restore')}
            title="Ungroup cards"
            className="group-action-btn group-action-danger"
          >
            <Ungroup size={12} />
          </button>
        </div>
      </div>

      {/* Body — real cards at their real positions, just wrapped */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: contentH, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="group-body-wrapper"
          >
            <div
              className="group-cards"
              style={{
                position: 'relative',
                display: 'block',
                width: contentW,
                height: contentH,
                padding: 0,
                maxHeight: 'none',
                overflow: 'visible',
              } as React.CSSProperties}
            >
              {cards.length === 0 ? (
                <div className="group-empty">
                  <Layers size={16} className="group-empty-icon" />
                  <span>No cards yet</span>
                </div>
              ) : (
                placed.map(({ card, left, top }) => (
                  <div
                    key={card.id}
                    className="group-real-card"
                    style={{ left, top, width: card.size.w * CELL, height: card.size.h * CELL }}
                  >
                    {renderChild(card)}
                    <button
                      type="button"
                      className="group-real-remove"
                      onClick={(e) => { e.stopPropagation(); onRemoveFromGroup(card.id) }}
                      title="Remove from group"
                    >
                      <X size={10} />
                    </button>
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

## 8. VERBATIM SOURCE — `src/components/ai/canvas/CanvasContainer.tsx` (auto-focus + pan wiring)

```tsx
// lines 84-101: persist pan/zoom + notify parent
useEffect(() => {
  try {
    localStorage.setItem(PAN_STORAGE_KEY, JSON.stringify({ x: pan.x, y: pan.y, zoom }))
  } catch { /* ignore */ }
  onSetPanZoom?.(pan, zoom)
}, [pan.x, pan.y, zoom])

// lines 103-132: auto-center on mount
useEffect(() => {
  if (hasAutoCentered.current) return
  if (viewportSize.w === 0 || viewportSize.h === 0) return
  const raw = localStorage.getItem(PAN_STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.x === 'number') {
        hasAutoCentered.current = true
        return
      }
    } catch {}
  }
  if (cards.length === 0) {
    setPan({ x: viewportSize.w / 2 - 2000, y: viewportSize.h / 2 - 2000 })
    hasAutoCentered.current = true
    return
  }
  const bounds = computeCardBounds(cards)
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  setPan({
    x: viewportSize.w / 2 - centerX,
    y: viewportSize.h / 2 - centerY,
  })
  hasAutoCentered.current = true
}, [cards, viewportSize])

// lines 186-211: AUTO-FOCUS — pans camera to focused card ONLY on content change
// CRITICAL: draggingRef guard (line 195) is wired via onDraggingChange at line 366,
// so mid-drag re-renders never shift the camera. Do not break this.
const draggingRef = useRef(false)
const panStateRef = useRef<{ id: string | null; contentKey: string }>({ id: null, contentKey: '' })
useEffect(() => {
  if (!autoFocus || !focusedCardId || viewportSize.w === 0) return
  if (draggingRef.current) return
  const card = cards.find(c => c.id === focusedCardId)
  if (!card) return

  const contentKey = typeof card.data?.content === 'string' ? card.data.content : ''
  const prev = panStateRef.current
  const contentChanged = prev.id !== focusedCardId || prev.contentKey !== contentKey
  if (!contentChanged) return
  panStateRef.current = { id: focusedCardId, contentKey }

  const cardCenterX = card.position.x + (card.size.w * 40) / 2
  const cardCenterY = card.position.y + (card.size.h * 40) / 2
  setPan({
    x: viewportSize.w / 2 - cardCenterX * zoom,
    y: viewportSize.h / 2 - cardCenterY * zoom,
  })
}, [focusedCardId, autoFocus, cards, viewportSize, zoom])

// line 366 — the drag guard wiring:
//   <CanvasGrid ... onDraggingChange={(v) => { draggingRef.current = v }} />
```

---

## 9. VERBATIM SOURCE — `src/pages/AiPage.tsx` (canvas integration)

```tsx
// lines 178-179: state
const [autoFocus, setAutoFocus] = useState(true);
const [focusedCardId, setFocusedCardId] = useState<string | null>(null);

// lines 232-263: AUTOMATION CARDS — ⚠️ SEPARATE SOURCE, DERIVED VIA useMemo
// These cards are NOT in the canvas store! They are recomputed on every
// automations change. MOVE_CARD dispatches to canvas.cards only — it will
// SILENTLY NO-OP for automation cards (reducer MOVE_CARD returns state
// unchanged when state.cards[id] doesn't exist).
const { toggleAutomation, deleteAutomation, testRun } = automationActions;
const automationCanvasCards = useMemo(() => {
  const existing = Object.values(canvas.allCards).filter((c: any) => c.type === 'automation')
  const usedPositions = new Set(existing.map((c: any) => `${Math.round(c.position.x / 40)},${Math.round(c.position.y / 40)}`))
  let col = 0, row = 0
  return automationActions.automations.map((auto, i) => {
    while (usedPositions.has(`${col},${row}`)) {
      col += 6
      if (col > 18) { col = 0; row += 6 }
    }
    usedPositions.add(`${col},${row}`)
    const pos = { x: 40 + col * 40, y: 40 + row * 40 }
    return {
      id: `auto-${auto.ruleId}`,
      type: 'automation' as CardType,
      position: pos,
      size: { w: 8, h: 5 },
      zIndex: 20 + i,
      pinned: true,
      data: {
        automation: auto,
        onToggle: () => toggleAutomation(auto.ruleId, auto.enabled),
        onDelete: () => deleteAutomation(auto.ruleId, auto.name),
        onTestRun: () => testRun(auto.ruleId, auto.name),
      },
      source: 'ai' as const,
      status: 'live' as const,
      createdAt: Date.now(),
    }
  })
}, [automationActions.automations, canvas.allCards, toggleAutomation, deleteAutomation, testRun])

// lines 1660-1704: canvas mount
<div data-tutorial="ai.canvas" style={{ flex: 1, minHeight: 0 }}>
  <CanvasContainer
    cards={[...canvas.cards, ...automationCanvasCards]}
    onMoveCard={canvas.moveCard}
    onDismissCard={canvas.dismissCard}
    onArrangeCards={canvas.arrangeCards}
    onPinCard={canvas.pinCard}
    onResizeCard={canvas.resizeCard}
    onCardClick={(id) => setSelectedCardId(id)}
    onUpdateCard={canvas.updateCard}
    groups={canvas.groups}
    onUpdateGroup={canvas.updateGroup}
    onUngroup={canvas.ungroup}
    onRemoveFromGroup={canvas.removeFromGroup}
    saveStatus={canvas.saveStatus}
    onSaveCanvas={canvas.forceSave}
    onSend={handleSend}
    onStop={chat.stop}
    streaming={chat.streaming}
    thinking={chat.thinking}
    focusedCardId={focusedCardId}
    autoFocus={autoFocus}
    onToggleAutoFocus={() => setAutoFocus(v => !v)}
    onOpenPalette={() => setPaletteOpen(true)}
    onGroupCards={(cardIds) => {
      if (cardIds.length < 2) return
      const groupedCards = cardIds.map(id => canvas.allCards[id]).filter(Boolean)
      if (groupedCards.length < 2) return
      // Compute center position
      const avgX = groupedCards.reduce((sum, c) => sum + c.position.x, 0) / groupedCards.length
      const avgY = groupedCards.reduce((sum, c) => sum + c.position.y, 0) / groupedCards.length
      // Use the hook's createGroup which handles everything
      canvas.createGroup(`Group (${groupedCards.length})`, cardIds, 'violet')
    }}
    canvasList={canvas.canvasList}
    activeCanvasId={null}
    onLoadCanvas={canvas.loadCanvas}
    onRenameCanvas={canvas.rename}
    onDeleteCanvas={canvas.removeCanvas}
    onSaveAs={canvas.saveAs}
    onSetPanZoom={canvas.setPanZoom}
  />
</div>
```

---

## 10. VERBATIM SOURCE — `src/components/ai/canvas/canvas.css` (card + group rules)

```css
/* ═══ Cards ═══ (lines 336-389) */
.dk-canvas-card {
  position: absolute;
  background: linear-gradient(135deg, rgba(24,24,27,0.85) 0%, rgba(9,9,11,0.7) 100%);
  backdrop-filter: blur(20px) saturate(1.2);
  border: 1px solid rgba(63, 63, 70, 0.5);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
  cursor: grab;
  user-select: none;
  touch-action: none;
  will-change: transform;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dk-canvas-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  pointer-events: none;
}

.dk-canvas-card:hover {
  border-color: rgba(113, 113, 122, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05);
  transform: translateY(-1px);
}

.dk-canvas-card.dragging {
  cursor: grabbing;
  border-color: var(--dk-accent);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(34, 211, 238, 0.3), 0 0 60px rgba(34, 211, 238, 0.1);
  z-index: 1000 !important;
  transition: none !important;
}

.dk-canvas-card.drop-target {
  border-color: var(--dk-accent) !important;
  box-shadow: 0 0 0 3px var(--dk-accent-dim), 0 0 30px rgba(34, 211, 238, 0.3);
  transform: scale(1.02);
}

.dk-canvas-card.focused {
  border-color: var(--dk-accent) !important;
  box-shadow: 0 0 0 2px var(--dk-accent-dim), 0 0 40px rgba(34, 211, 238, 0.25), 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: dk-card-focus-pulse 2s ease-in-out infinite;
}

/* ═══ Group Card — MCP Design ═══ (lines 943-1169) */
.group-card {
  border-radius: 16px;
  border: 1px solid var(--group-border, rgba(63, 63, 70, 0.50));
  background: rgba(24, 24, 27, 0.80);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  transition: box-shadow 0.2s ease, transform 0.1s ease;
}

.group-card:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.group-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--group-border, rgba(63, 63, 70, 0.50));
  background: rgba(24, 24, 27, 0.50);
  cursor: pointer;
  user-select: none;
}

.group-expand-btn { background: none; border: none; padding: 2px; cursor: pointer; display: flex; align-items: center; color: var(--dk-text-muted); border-radius: 4px; transition: background 0.15s ease; }
.group-expand-btn:hover { background: rgba(255, 255, 255, 0.05); }
.group-color-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 8px currentColor; }
.group-name { font-family: 'Geist Sans', sans-serif; font-size: 13px; font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: text; }
.group-name-input { font-family: 'Geist Sans', sans-serif; font-size: 13px; font-weight: 600; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 6px; padding: 2px 8px; outline: none; flex: 1; min-width: 0; color: inherit; transition: border-color 0.15s ease; }
.group-name-input:focus { border-color: var(--group-accent, var(--dk-accent)); }
.group-count { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--dk-text-faint); background: rgba(255, 255, 255, 0.05); padding: 2px 6px; border-radius: 4px; white-space: nowrap; }

.group-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s ease; }
.group-card:hover .group-actions { opacity: 1; }
.group-action-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: rgba(255, 255, 255, 0.05); border: 1px solid transparent; color: var(--dk-text-faint); cursor: pointer; transition: all 0.15s ease; }
.group-action-btn:hover { background: rgba(255, 255, 255, 0.1); color: var(--dk-text-primary); border-color: rgba(255, 255, 255, 0.1); }
.group-action-danger:hover { background: rgba(244, 63, 94, 0.15); color: #f43f5e; border-color: rgba(244, 63, 94, 0.3); }
.group-color-wrapper { position: relative; }

.group-color-picker {
  position: absolute; top: 100%; right: 0; margin-top: 6px;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 8px;
  background: rgba(24, 24, 27, 0.95);
  border: 1px solid rgba(63, 63, 70, 0.50);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 50;
  backdrop-filter: blur(8px);
}
.group-color-swatch { width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.15s ease, border-color 0.15s ease; }
.group-color-swatch:hover { transform: scale(1.15); }
.group-color-swatch.active { border-color: white; box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2); }

.group-body-wrapper { overflow: hidden; }

/* NOTE: .group-cards (below) is the CURRENT rule — the component overrides it
   inline (position:relative, display:block, maxHeight:none, overflow:visible)
   because the old column/list styling (gap, flex column, max-height, scroll)
   would reflow real cards. If the old rule is removed, remove the inline
   overrides too. */
.group-cards {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}

.group-mini-card {
  display: flex;
  align-items: stretch;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(63, 63, 70, 0.4);
  border-radius: 10px;
  overflow: hidden;
  cursor: grab;
  transition: border-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
}

.group-real-card {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.group-real-remove {
  position: absolute; top: 6px; right: 6px; z-index: 10;
  width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
}
.group-real-card:hover .group-real-remove { opacity: 1; }
.group-real-remove:hover { background: rgba(239, 68, 68, 0.85); }
```

---

## 11. KNOWN ROOT-CAUSE CANDIDATES (verified in source — validate & fix ALL)

### R1 — Automation cards (`auto-*`) can NEVER be moved (drag "does nothing" for them)
`CanvasContainer` receives `cards={[...canvas.cards, ...automationCanvasCards]}` (AiPage:1663). The `automationCanvasCards` (AiPage:234-263) are **not part of the canvas store** — they're a `useMemo` over `automationActions.automations`. `CanvasCard.handlePointerUp` calls `onDragEnd` → `CanvasGrid` → `canvas.moveCard` → reducer `MOVE_CARD`, which does `if (!state.cards[action.id]) return state` — automation cards aren't in `state.cards`, so **the move is silently discarded**, AND the next render recomputes positions from the memo → the card visually snaps back. **User-visible: "dragging doesn't work."**
Options (pick one & document): (a) persist automation cards into the store and keep the memo as a sync-only source; (b) special-case `onMoveCard` for `auto-*` ids (needs somewhere to store the override — e.g. a `positionOverrides` in canvas state); (c) make automation cards non-draggable and REMOVE the misleading grab cursor. **User wants dragging to work — prefer (a) or (b).**

### R2 — Drop-to-group with automation cards crashes or no-ops
`onGroupCards` (AiPage:1685) maps ids through `canvas.allCards` — automation cards are absent there → `groupedCards.length < 2` → grouping silently no-ops for a drag onto an automation card. Also `createGroup` reads `state.cards[id]` — same gap. Fix must make group membership source-agnostic (store the cards' full data in the group's `childCards` snapshot like `CREATE_GROUP` already does for real cards).

### R3 — Drag "snap-back" perception for normal cards (candidates)
- The 0.2s `transition: all` on `.dk-canvas-card` is removed only while `.dragging`; after drop the card animates from the dragged DOM transform to the new committed position — at low zoom this looks like the card "jumps". Consider committing the transform immediately on pointerup (set style before React re-render) or accepting it as polish.
- `handlePointerUp` fires `onDragStop` → `handleCardDragStop` → possible `onGroupCards` → state change → re-render. Ensure nothing in the re-render resets `focusedCardId` or triggers `setPan` (the `panStateRef` contentKey guard covers it ONLY when `card.data.content` is a string — a card whose focus was set via AiPage:362/386/456/475 `setFocusedCardId` with non-string content will pan on FIRST focus, that's intended behavior).

### R4 — Resize commits but only to cards in the store
`RESIZE_CARD` same store gap as R1 — automation cards can't be resized either.

### R5 — Grouping must SHOW THE REAL CARDS (user HARD requirement)
Current `GroupCard` renders real children via `renderChild` — PRESERVE this. Regressions to forbid: mini-chips/preview text (`.group-mini-card` CSS exists but is dead — never revive it), re-scaling children, `overflow: hidden` clipping real card bodies, or hiding the original cards anywhere. ALSO: when a group is created, the child cards get `groupId` and are filtered OUT of the grid (`.filter(card => !card.groupId)`) — they then render ONLY inside GroupCard from the `childCards` **snapshot**. Snapshots carry `data` but lose function props (`onClick`-style closures) — acceptable for display, but `REMOVE_FROM_GROUP` restores from snapshot with `dismissedAt: undefined` — verify no data loss on remove.

---

## 12. DESIGN TOKENS (re-skin rules — apply to ANY new UI)

- Fonts: `Geist Sans` body, `JetBrains Mono` mono. Radii: max `16px` (`rounded-xl` equivalent). Dark mode only. Glass: `rgba(24,24,27,0.80)` + `backdrop-filter: blur(12px)`. Accent: `var(--dk-accent)` (cyan family #22d3ee-ish), text: `--dk-text-primary/muted/faint`.
- Group accent vars: `--group-accent`, `--group-bg`, `--group-border` from GROUP_COLORS.
- Icons: `lucide-react` (installed). NO new npm deps unless approved — framer-motion, zustand, lucide are available.

## 13. BUILD & VERIFY (run these before final answer)

- `npx vite build` (renderer). Note: if `dist\src.zip` is locked by another process, build with `npx vite build --outDir <temp>` and copy into `dist\`.
- Typecheck: `npx tsc -p tsconfig.app.json` (no test runner in this repo).
- Runtime: app must be fully relaunched after rebuild (Electron caches the old bundle).

## 14. HARD INVARIANTS — DO NOT VIOLATE

1. **PTY event order sacred** — irrelevant here, but never touch terminal code.
2. `localStorage` access wrapped in try/catch (PAN_STORAGE_KEY pattern).
3. Never reorder drag/resize commit logic destructively; keep `onDragEnd` snapping to `CELL=40`.
4. Keep `suppressClickRef` (click-after-drag suppression) — removing it regresses drag-vs-select.
5. Keep the `draggingRef` auto-focus guard wired (CanvasContainer:366).
6. Grouping renders REAL cards via `renderChild` — never previews (user requirement).
7. ALL canvas state flows through `canvasReducer` — no component-local state for positions/sizes.
8. DB access is READ-ONLY (canvas is localStorage-only, no DB involvement).
