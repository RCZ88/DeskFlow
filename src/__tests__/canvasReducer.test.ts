import { describe, it, expect } from 'vitest'
import { canvasReducer, DEFAULT_STATE } from '../types/canvas'
import type { CanvasCard, CanvasState } from '../types/canvas'

function makeCard(overrides?: Partial<CanvasCard>): CanvasCard {
  return {
    id: 'test-1',
    type: 'focus',
    position: { x: 0, y: 0 },
    size: { w: 8, h: 5 },
    zIndex: 0,
    pinned: false,
    data: {},
    source: 'user',
    status: 'live',
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('canvasReducer', () => {
  describe('ADD_CARD', () => {
    it('adds a card and sets zIndex from nextZIndex', () => {
      const card = makeCard()
      const result = canvasReducer(DEFAULT_STATE, { type: 'ADD_CARD', card })
      expect(result.cards['test-1']).toBeDefined()
      expect(result.cards['test-1'].zIndex).toBe(1)
      expect(result.nextZIndex).toBe(2)
    })

    it('increments nextZIndex on each add', () => {
      const card1 = makeCard({ id: 'c1' })
      const card2 = makeCard({ id: 'c2' })
      let state = canvasReducer(DEFAULT_STATE, { type: 'ADD_CARD', card: card1 })
      state = canvasReducer(state, { type: 'ADD_CARD', card: card2 })
      expect(state.cards['c1'].zIndex).toBe(1)
      expect(state.cards['c2'].zIndex).toBe(2)
      expect(state.nextZIndex).toBe(3)
    })
  })

  describe('UPDATE_CARD', () => {
    it('updates a card patch', () => {
      const state: CanvasState = {
        cards: { 'c1': makeCard({ id: 'c1' }) },
        nextZIndex: 2,
      }
      const result = canvasReducer(state, { type: 'UPDATE_CARD', id: 'c1', patch: { status: 'error' } })
      expect(result.cards['c1'].status).toBe('error')
    })

    it('ignores update for non-existent card', () => {
      const result = canvasReducer(DEFAULT_STATE, { type: 'UPDATE_CARD', id: 'missing', patch: { status: 'error' } })
      expect(result).toEqual(DEFAULT_STATE)
    })
  })

  describe('REMOVE_CARD', () => {
    it('removes a card', () => {
      const state: CanvasState = {
        cards: { 'c1': makeCard({ id: 'c1' }), 'c2': makeCard({ id: 'c2' }) },
        nextZIndex: 3,
      }
      const result = canvasReducer(state, { type: 'REMOVE_CARD', id: 'c1' })
      expect(result.cards['c1']).toBeUndefined()
      expect(result.cards['c2']).toBeDefined()
    })
  })

  describe('MOVE_CARD', () => {
    it('updates position', () => {
      const state: CanvasState = {
        cards: { 'c1': makeCard({ id: 'c1', position: { x: 0, y: 0 } }) },
        nextZIndex: 2,
      }
      const result = canvasReducer(state, { type: 'MOVE_CARD', id: 'c1', position: { x: 80, y: 40 } })
      expect(result.cards['c1'].position).toEqual({ x: 80, y: 40 })
    })
  })

  describe('PIN_CARD', () => {
    it('sets pinned to true', () => {
      const state: CanvasState = {
        cards: { 'c1': makeCard({ id: 'c1', pinned: false }) },
        nextZIndex: 2,
      }
      const result = canvasReducer(state, { type: 'PIN_CARD', id: 'c1' })
      expect(result.cards['c1'].pinned).toBe(true)
    })
  })

  describe('DISMISS_CARD', () => {
    it('sets dismissedAt timestamp', () => {
      const state: CanvasState = {
        cards: { 'c1': makeCard({ id: 'c1' }) },
        nextZIndex: 2,
      }
      const before = Date.now()
      const result = canvasReducer(state, { type: 'DISMISS_CARD', id: 'c1' })
      expect(result.cards['c1'].dismissedAt).toBeGreaterThanOrEqual(before)
    })
  })

  describe('SET_STATUS', () => {
    it('updates status', () => {
      const state: CanvasState = {
        cards: { 'c1': makeCard({ id: 'c1', status: 'loading' }) },
        nextZIndex: 2,
      }
      const result = canvasReducer(state, { type: 'SET_STATUS', id: 'c1', status: 'live' })
      expect(result.cards['c1'].status).toBe('live')
    })
  })

  describe('RESET_LAYOUT', () => {
    it('resets to default state', () => {
      const state: CanvasState = {
        cards: { 'c1': makeCard({ id: 'c1' }) },
        nextZIndex: 5,
      }
      const result = canvasReducer(state, { type: 'RESET_LAYOUT' })
      expect(result).toEqual(DEFAULT_STATE)
    })
  })

  describe('HYDRATE', () => {
    it('replaces entire state', () => {
      const hydrated: CanvasState = {
        cards: { 'h1': makeCard({ id: 'h1', type: 'plan' }) },
        nextZIndex: 10,
      }
      const result = canvasReducer(DEFAULT_STATE, { type: 'HYDRATE', state: hydrated })
      expect(result).toEqual(hydrated)
    })
  })
})
