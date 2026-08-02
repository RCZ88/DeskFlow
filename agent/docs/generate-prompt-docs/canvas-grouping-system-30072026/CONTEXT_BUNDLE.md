# Canvas Grouping System — Context Bundle

## Overview

DeskFlow is an Electron + React + better-sqlite3 desktop productivity tracker. The AI Assistant page (`/ai`) has an infinite canvas where cards appear as the AI generates responses. Users can drag cards to arrange them, and drag one card onto another to "group" them.

**Current state:** The grouping system is half-built. The types and reducer support groups, but:
1. GroupCard only shows text items — not the actual child cards
2. Ungrouping dismisses the group card but doesn't restore the originals
3. No way to rename groups, change colors, or see group contents properly
4. The `onGroupCards` callback in AiPage creates a group card but stores child data as plain text items, losing all card type information
5. CanvasGrid doesn't render groups separately — all cards render as individual CanvasCards

## Files

### src/types/canvas.ts

```ts
export type CardType =
  | 'focus' | 'plan' | 'reflect' | 'finance'
  | 'digest' | 'approval' | 'transient' | 'annotation'
  | 'response' | 'group' | 'connectors'
  | 'schedule' | 'deadlines' | 'planner'

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

export interface CanvasGroup {
  id: string
  label: string
  colorId: GroupColorId
  cardIds: string[]
  position: { x: number; y: number }
  size: { w: number; h: number }
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
  | { type: 'PIN_CARD'; id: string }
  | { type: 'DISMISS_CARD'; id: string }
  | { type: 'SET_STATUS'; id: string; status: CardStatus }
  | { type: 'RESET_LAYOUT' }
  | { type: 'HYDRATE'; state: CanvasState }
  | { type: 'SET_PAN_ZOOM'; pan: { x: number; y: number }; zoom: number }
  | { type: 'CREATE_GROUP'; group: CanvasGroup }
  | { type: 'UPDATE_GROUP'; id: string; patch: Partial<Pick<CanvasGroup, 'label' | 'colorId'>> }
  | { type: 'DELETE_GROUP'; id: string }
  | { type: 'UNGROUP'; id: string }
  | { type: 'ADD_TO_GROUP'; cardId: string; groupId: string }
  | { type: 'REMOVE_FROM_GROUP'; cardId: string }

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
    case 'CREATE_GROUP':
      return { ...state, groups: { ...state.groups, [action.group.id]: action.group } }
    case 'UPDATE_GROUP': {
      const group = state.groups[action.id]
      if (!group) return state
      return { ...state, groups: { ...state.groups, [action.id]: { ...group, ...action.patch } } }
    }
    case 'DELETE_GROUP': {
      const { [action.id]: _, ...rest } = state.groups
      const cards = Object.fromEntries(
        Object.entries(state.cards).map(([id, c]) => [id, c.groupId === action.id ? { ...c, groupId: undefined } : c])
      )
      return { ...state, groups: rest, cards }
    }
    case 'UNGROUP': {
      const group = state.groups[action.id]
      if (!group) return state
      const { [action.id]: _, ...restGroups } = state.groups
      const cards = Object.fromEntries(
        Object.entries(state.cards).map(([id, c]) => [id, c.groupId === action.id ? { ...c, groupId: undefined } : c])
      )
      return { ...state, groups: restGroups, cards }
    }
    case 'ADD_TO_GROUP': {
      if (!state.cards[action.cardId] || !state.groups[action.groupId]) return state
      const group = state.groups[action.groupId]
      return {
        ...state,
        cards: { ...state.cards, [action.cardId]: { ...state.cards[action.cardId], groupId: action.groupId } },
        groups: { ...state.groups, [action.groupId]: { ...group, cardIds: [...group.cardIds, action.cardId] } },
      }
    }
    case 'REMOVE_FROM_GROUP': {
      const card = state.cards[action.cardId]
      if (!card?.groupId || !state.groups[card.groupId]) return state
      const group = state.groups[card.groupId]
      return {
        ...state,
        cards: { ...state.cards, [action.cardId]: { ...card, groupId: undefined } },
        groups: { ...state.groups, [card.groupId]: { ...group, cardIds: group.cardIds.filter(id => id !== action.cardId) } },
      }
    }
    default:
      return state
  }
}
```

### src/hooks/useCanvasState.ts

The hook exposes: `createGroup(label, cardIds, colorId)`, `updateGroup(id, patch)`, `ungroup(id)`, `deleteGroup(id)`, `addToGroup(cardId, groupId)`, `removeFromGroup(cardId)`.

Key: `createGroup` computes bounding box, creates a `CanvasGroup`, dispatches `CREATE_GROUP` + `ADD_TO_GROUP` for each card. `updateGroup` dispatches `UPDATE_GROUP`. `ungroup` dispatches `UNGROUP`.

### src/components/ai/canvas/GroupCard.tsx

```tsx
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Edit3, Palette, Ungroup, X } from 'lucide-react'
import { GROUP_COLORS, type GroupColorId, type CanvasCard } from '../../../types/canvas'

interface GroupCardProps {
  label: string
  colorId: GroupColorId
  cards: CanvasCard[]
  onRename: (label: string) => void
  onColorChange: (colorId: GroupColorId) => void
  onUngroup: () => void
}

export function GroupCard({ label, colorId, cards, onRename, onColorChange, onUngroup }: GroupCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(label)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const colorRef = useRef<HTMLDivElement>(null)

  const color = GROUP_COLORS.find(c => c.id === colorId) || GROUP_COLORS[0]

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
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

  const handleRename = () => {
    if (editLabel.trim() && editLabel.trim() !== label) {
      onRename(editLabel.trim())
    }
    setEditing(false)
  }

  return (
    <div className="dk-group-card" style={{ borderColor: color.border, background: color.bg }}>
      <div className="dk-group-header" style={{ borderBottomColor: color.border }}>
        <button className="dk-group-expand-btn" onClick={() => setExpanded(v => !v)}>
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ color: color.accent }} />
        </button>
        <div className="dk-group-icon" style={{ background: color.accent }} />
        {editing ? (
          <input
            ref={inputRef}
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => e.key === 'Enter' && handleRename()}
            className="dk-group-name-input"
            style={{ color: color.accent }}
          />
        ) : (
          <span className="dk-group-name" style={{ color: color.accent }}>{label}</span>
        )}
        <span className="dk-group-count">{cards.length} cards</span>
        <div className="dk-group-actions">
          <button onClick={() => { setEditing(true); setEditLabel(label) }} title="Rename" className="dk-group-action-btn">
            <Edit3 size={12} />
          </button>
          <div ref={colorRef} className="dk-group-color-wrapper">
            <button onClick={() => setShowColorPicker(v => !v)} title="Color" className="dk-group-action-btn">
              <Palette size={12} />
            </button>
            {showColorPicker && (
              <div className="dk-group-color-picker">
                {GROUP_COLORS.map(c => (
                  <button
                    key={c.id}
                    className={`dk-group-color-swatch ${c.id === colorId ? 'active' : ''}`}
                    style={{ background: c.accent }}
                    onClick={() => { onColorChange(c.id); setShowColorPicker(false) }}
                    title={c.label}
                  />
                ))}
              </div>
            )}
          </div>
          <button onClick={onUngroup} title="Ungroup cards" className="dk-group-action-btn dk-group-action-danger">
            <Ungroup size={12} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="dk-group-cards">
          {cards.length === 0 ? (
            <div className="dk-group-empty">No cards in this group</div>
          ) : (
            cards.map(card => (
              <div key={card.id} className="dk-group-mini-card">
                <div className="dk-group-mini-card-header">
                  <span className="dk-group-mini-card-type" style={{ color: color.accent }}>{card.type}</span>
                </div>
                <div className="dk-group-mini-card-body">
                  {card.data?.content && (
                    <span className="dk-group-mini-card-text">{String(card.data.content).slice(0, 120)}</span>
                  )}
                  {card.data?.text && !card.data?.content && (
                    <span className="dk-group-mini-card-text">{String(card.data.text).slice(0, 120)}</span>
                  )}
                  {!card.data?.content && !card.data?.text && (
                    <span className="dk-group-mini-card-text dk-group-mini-card-empty">[{card.type} card]</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

### src/components/ai/canvas/CanvasCard.tsx

Key section — the `renderCardContent` function for group cards:

```tsx
case 'group': return (
  <GroupCard
    label={card.data?.label || 'Group'}
    colorId={card.data?.colorId || 'violet'}
    cards={(card.data?.childCards || []).map((c: any) => ({
      ...c,
      position: { x: 0, y: 0 },
      zIndex: 0,
      groupId: card.id,
    }))}
    onRename={(label) => onUpdateCard?.(card.id, { label })}
    onColorChange={(colorId) => onUpdateCard?.(card.id, { colorId })}
    onUngroup={() => onDismiss(card.id)}
  />
)
```

**Problem:** `onUpdateCard` is not being threaded from CanvasGrid to CanvasCard. CanvasGrid doesn't have `onUpdateCard` in its props interface or pass it to CanvasCard.

### src/components/ai/canvas/CanvasGrid.tsx

CanvasGrid renders all cards individually. It does NOT filter out cards that belong to groups. It does NOT pass `onUpdateCard` to CanvasCard.

### src/components/ai/canvas/CanvasMinimap.tsx

Color-coded by card type. Group cards show as `#818cf8` (indigo). No special group rendering.

### src/pages/AiPage.tsx (lines 1488-1525)

The `onGroupCards` callback:

```tsx
onGroupCards={(cardIds) => {
  if (cardIds.length < 2) return
  const groupedCards = cardIds.map(id => canvas.allCards[id]).filter(Boolean)
  if (groupedCards.length < 2) return

  const childCards = groupedCards.map(c => ({
    id: c.id, type: c.type, data: c.data, source: c.source,
    size: c.size, pinned: c.pinned, status: c.status, createdAt: c.createdAt,
  }))

  const avgX = groupedCards.reduce((sum, c) => sum + c.position.x, 0) / groupedCards.length
  const avgY = groupedCards.reduce((sum, c) => sum + c.position.y, 0) / groupedCards.length

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const c of groupedCards) {
    minX = Math.min(minX, c.position.x)
    minY = Math.min(minY, c.position.y)
    maxX = Math.max(maxX, c.position.x + c.size.w * 40)
    maxY = Math.max(maxY, c.position.y + c.size.h * 40)
  }

  canvas.addCard('group', {
    childCards,
    label: `Group (${groupedCards.length})`,
    colorId: 'violet',
  }, {
    position: { x: minX - 10, y: minY - 30 },
    size: { w: Math.max(10, Math.ceil((maxX - minX + 20) / 40)), h: Math.max(6, Math.ceil((maxY - minY + 60) / 40)) },
    pinned: true,
  })

  cardIds.forEach(id => canvas.dismissCard(id))
}}
```

### src/components/ai/canvas/canvas.css (group-related section)

```css
.dk-group-card { border-radius: 12px; border: 1px solid; overflow: hidden; }
.dk-group-header { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid; cursor: pointer; background: rgba(24, 24, 27, 0.3); }
.dk-group-expand-btn { background: none; border: none; padding: 2px; cursor: pointer; display: flex; align-items: center; color: var(--dk-text-muted); }
.dk-group-icon { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.dk-group-name { font-size: 12px; font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dk-group-name-input { font-size: 12px; font-weight: 600; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; padding: 2px 6px; outline: none; flex: 1; min-width: 0; }
.dk-group-count { font-size: 10px; color: var(--dk-text-faint); white-space: nowrap; }
.dk-group-actions { display: flex; gap: 2px; opacity: 0; transition: opacity var(--dk-fast) var(--dk-ease); }
.dk-group-card:hover .dk-group-actions { opacity: 1; }
.dk-group-action-btn { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border-radius: 4px; background: rgba(255, 255, 255, 0.05); border: none; color: var(--dk-text-faint); cursor: pointer; }
.dk-group-action-btn:hover { background: rgba(255, 255, 255, 0.1); color: var(--dk-text-secondary); }
.dk-group-action-danger:hover { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.dk-group-color-wrapper { position: relative; }
.dk-group-color-picker { position: absolute; top: 100%; right: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 6px; background: var(--dk-bg-surface); border: 1px solid var(--dk-border-default); border-radius: 8px; box-shadow: var(--dk-shadow-lg); z-index: 10; }
.dk-group-color-swatch { width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }
.dk-group-color-swatch:hover { transform: scale(1.2); }
.dk-group-color-swatch.active { border-color: white; box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3); }
.dk-group-cards { padding: 8px; display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow-y: auto; }
.dk-group-mini-card { background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(63, 63, 70, 0.3); border-radius: 8px; overflow: hidden; }
.dk-group-mini-card-header { padding: 6px 10px; border-bottom: 1px solid rgba(63, 63, 70, 0.2); background: rgba(24, 24, 27, 0.3); }
.dk-group-mini-card-type { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.dk-group-mini-card-body { padding: 8px 10px; }
.dk-group-mini-card-text { font-size: 11px; color: var(--dk-text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.dk-group-mini-card-empty { color: var(--dk-text-faint); font-style: italic; }
.dk-group-empty { text-align: center; padding: 16px; font-size: 11px; color: var(--dk-text-faint); }
```

## Key Problems to Solve

1. **CanvasGrid doesn't filter grouped cards** — cards with `groupId` should not render individually; they should be rendered inside their group card
2. **onUpdateCard not threaded** — CanvasGrid doesn't pass `onUpdateCard` to CanvasCard, so group rename/color changes don't work
3. **Ungroup doesn't restore cards** — clicking ungroup dismisses the group card but the child cards (stored in `data.childCards`) are lost
4. **No drag-out-of-group** — users can't drag individual cards out of a group
5. **No group list/management** — no way to see all groups, their sizes, their contents from a panel
6. **Agent can't set group properties** — the AI agent has no way to specify group color, name, or smart-arrange when creating groups
7. **Group card size is fixed** — doesn't adapt to the number/type of child cards

## Design Tokens

- Glass pattern: `bg-[rgba(24,24,27,0.80)] backdrop-blur-xl border border-[rgba(63,63,70,0.50)]`
- Card border radius: 16px
- Card header: `bg-[rgba(24,24,27,0.5)]` with 1px border bottom
- Accent colors: `--dk-accent` (cyan), `--dk-success` (emerald), `--dk-danger` (rose)
- Font: Geist Sans + JetBrains Mono
- Cell size: 40px grid
