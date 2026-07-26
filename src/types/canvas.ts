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
  groupId?: string
}

export interface CanvasGroup {
  id: string
  label: string
  cardIds: string[]
  position: { x: number; y: number }
  size: { w: number; h: number }
}

export interface CanvasState {
  cards: Record<string, CanvasCard>
  groups: Record<string, CanvasGroup>
  nextZIndex: number
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
  | { type: 'CREATE_GROUP'; group: CanvasGroup }
  | { type: 'DELETE_GROUP'; id: string }
  | { type: 'ADD_TO_GROUP'; cardId: string; groupId: string }
  | { type: 'REMOVE_FROM_GROUP'; cardId: string }

export const DEFAULT_STATE: CanvasState = {
  cards: {},
  groups: {},
  nextZIndex: 1,
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
    case 'CREATE_GROUP':
      return { ...state, groups: { ...state.groups, [action.group.id]: action.group } }
    case 'DELETE_GROUP': {
      const { [action.id]: _, ...rest } = state.groups
      // Remove group assignment from cards
      const cards = Object.fromEntries(
        Object.entries(state.cards).map(([id, c]) => [id, c.groupId === action.id ? { ...c, groupId: undefined } : c])
      )
      return { ...state, groups: rest, cards }
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
