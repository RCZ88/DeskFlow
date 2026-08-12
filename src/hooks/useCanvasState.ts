import { useReducer, useState, useCallback, useEffect, useRef } from 'react'
import { canvasReducer, DEFAULT_STATE } from '../types/canvas'
import {
  loadCanvasLayout, saveCanvasLayout, clearCanvasLayout,
  listCanvases, loadCanvasById, renameCanvas, deleteCanvas,
  loadDefaultSetup, BUILTIN_DEFAULT_SETUP,
  type CanvasSnapshot
} from '../services/canvasPersistence'
import { generateUUID } from '../lib/uuid'
import type { CanvasCard, CanvasState, CardStatus, CardType, CanvasGroup, GroupColorId, CanvasAction, DefaultSetupConfig } from '../types/canvas'

const DISMISS_TIMEOUT_MS = 30_000
const MAX_HISTORY = 50

// Actions that should be recorded in undo history
const HISTORY_ACTIONS = new Set<CanvasAction['type']>([
  'ADD_CARD', 'REMOVE_CARD', 'UPDATE_CARD', 'MOVE_CARD', 'RESIZE_CARD',
  'PIN_CARD', 'DISMISS_CARD', 'SET_STATUS',
  'CREATE_GROUP', 'DELETE_GROUP', 'UNGROUP', 'ADD_TO_GROUP', 'REMOVE_FROM_GROUP',
  'ARRANGE_GROUP', 'UPDATE_GROUP',
  'ADD_GENERATED_CARD', 'REMOVE_GENERATED_CARD',
])

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function seedCardsFromSetup(dispatch: (action: CanvasAction) => void, config: DefaultSetupConfig) {
  for (const c of config.cards) {
    if (!c.enabled) continue
    const card: CanvasCard = {
      id: generateUUID(),
      type: c.type,
      position: c.position,
      size: c.size,
      zIndex: 0,
      pinned: c.pinned,
      data: c.defaultData || {},
      source: 'system',
      status: 'live',
      createdAt: Date.now(),
    }
    dispatch({ type: 'ADD_CARD', card })
  }
}

export function useCanvasState() {
  const loadedFromStorage = useRef(false)
  const [state, rawDispatch] = useReducer(canvasReducer, null, () => {
    const loaded = loadCanvasLayout()
    if (loaded) loadedFromStorage.current = true
    return loaded || DEFAULT_STATE
  })
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [canvasList, setCanvasList] = useState<CanvasSnapshot[]>(listCanvases())
  const [canvasEpoch, setCanvasEpoch] = useState(0)

  // ── Undo / Redo History ──
  const pastRef = useRef<CanvasState[]>([])
  const futureRef = useRef<CanvasState[]>([])
  const [historyVersion, setHistoryVersion] = useState(0)

  const dispatch = useCallback((action: CanvasAction) => {
    // Push current state to history before applying mutation actions
    if (HISTORY_ACTIONS.has(action.type)) {
      // Deep-clone minimal state (cards + groups only — pan/zoom don't need undo)
      const snapshot: CanvasState = {
        ...stateRef.current,
        cards: { ...stateRef.current.cards },
        groups: { ...stateRef.current.groups },
      }
      pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), snapshot]
      futureRef.current = [] // clear redo stack on new action
    }
    rawDispatch(action)
  }, [])

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return
    const prev = pastRef.current[pastRef.current.length - 1]
    pastRef.current = pastRef.current.slice(0, -1)
    // Save current to future
    const current: CanvasState = {
      ...stateRef.current,
      cards: { ...stateRef.current.cards },
      groups: { ...stateRef.current.groups },
    }
    futureRef.current = [...futureRef.current, current]
    // Restore previous state
    rawDispatch({ type: 'HYDRATE', state: prev })
    setHistoryVersion(v => v + 1)
  }, [])

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    const next = futureRef.current[futureRef.current.length - 1]
    futureRef.current = futureRef.current.slice(0, -1)
    // Save current to past
    const current: CanvasState = {
      ...stateRef.current,
      cards: { ...stateRef.current.cards },
      groups: { ...stateRef.current.groups },
    }
    pastRef.current = [...pastRef.current, current]
    // Restore next state
    rawDispatch({ type: 'HYDRATE', state: next })
    setHistoryVersion(v => v + 1)
  }, [])

  const canUndo = pastRef.current.length > 0
  const canRedo = futureRef.current.length > 0

  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const saveResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  // Save on every state change — synchronous, no debounce, no timer to cancel
  useEffect(() => {
    setSaveStatus('saving')
    try {
      saveCanvasLayout(state)
      setSaveStatus('saved')
      if (saveResetTimer.current) clearTimeout(saveResetTimer.current)
      saveResetTimer.current = setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    }
  }, [state.cards, state.groups, state.pan, state.zoom])

  // Force-save on unmount (React navigation away) — saves synchronously
  useEffect(() => {
    return () => {
      try {
        saveCanvasLayout(stateRef.current)
      } catch { /* ignore */ }
    }
  }, [])

  // Force-save on app close (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        saveCanvasLayout(stateRef.current)
      } catch { /* ignore */ }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

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
    const id = generateUUID()
    const card: CanvasCard = {
      id, type,
      position: opts?.position ?? { x: 40, y: 40 },
      size: opts?.size ?? { w: 8, h: 5 },
      zIndex: 0, pinned: opts?.pinned ?? false,
      data, source: opts?.source ?? 'ai',
      status: 'live', createdAt: Date.now(),
    }
    dispatch({ type: 'ADD_CARD', card })
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

  const resizeCard = useCallback((id: string, size: { w: number; h: number }) => {
    dispatch({ type: 'RESIZE_CARD', id, size })
  }, [])

  const pinCard = useCallback((id: string) => {
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

  const arrangeCards = useCallback((positions: Record<string, { x: number; y: number }>) => {
    for (const [id, pos] of Object.entries(positions)) {
      dispatch({ type: 'MOVE_CARD', id, position: pos })
    }
  }, [])

  const setPanZoom = useCallback((pan: { x: number; y: number }, zoom: number) => {
    dispatch({ type: 'SET_PAN_ZOOM', pan, zoom })
  }, [])

  // Group operations
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

  const syncAutomations = useCallback((automations: any[]) => {
    const currentCards = Object.values(stateRef.current.cards) as CanvasCard[]
    const usedPositions = new Set(currentCards.map((c) => `${Math.round(c.position.x / 40)},${Math.round(c.position.y / 40)}`))
    dispatch({ type: 'SYNC_AUTOMATIONS', automations, usedPositions })
  }, [])

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

  const cards = Object.values(state.cards).filter(c => !c.dismissedAt)
  const groups = state.groups

  const clearAll = useCallback(() => {
    dismissTimers.current.forEach(t => clearTimeout(t))
    dismissTimers.current.clear()
    // Reset the loaded flag so live-data attachment re-runs on this fresh canvas.
    loadedFromStorage.current = false
    // Update stateRef immediately so beforeunload/unmount saves the empty
    // state, not the old state (React batches the dispatch).
    stateRef.current = DEFAULT_STATE
    dispatch({ type: 'RESET_LAYOUT' })
    clearCanvasLayout()
    // R1: createNewCanvas seeds from the saved Default Canvas Setup
    // (falling back to built-in defaults) so New Canvas is never blank.
    const config = loadDefaultSetup() ?? { version: 1 as const, cards: BUILTIN_DEFAULT_SETUP, updatedAt: Date.now() }
    seedCardsFromSetup(dispatch, config)
    // Bump the epoch so AiPage's seeding/live-data effect re-runs for this
    // fresh canvas (wasLoaded is a ref — ref changes alone never re-trigger).
    setCanvasEpoch((e) => e + 1)
  }, [])

  const forceSave = useCallback(() => {
    setSaveStatus('saving')
    try {
      saveCanvasLayout(state)
      setSaveStatus('saved')
      setCanvasList(listCanvases())
      if (saveResetTimer.current) clearTimeout(saveResetTimer.current)
      saveResetTimer.current = setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    }
  }, [state])

  // Canvas management
  const saveAs = useCallback((name: string) => {
    setSaveStatus('saving')
    try {
      saveCanvasLayout(state, name)
      setCanvasList(listCanvases())
      setSaveStatus('saved')
      if (saveResetTimer.current) clearTimeout(saveResetTimer.current)
      saveResetTimer.current = setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
    }
  }, [state])

  const loadCanvas = useCallback((id: string) => {
    const loaded = loadCanvasById(id)
    if (loaded) {
      dismissTimers.current.forEach(t => clearTimeout(t))
      dismissTimers.current.clear()
      dispatch({ type: 'HYDRATE', state: loaded })
      setCanvasList(listCanvases())
    }
  }, [])

  const rename = useCallback((id: string, newName: string) => {
    renameCanvas(id, newName)
    setCanvasList(listCanvases())
  }, [])

  const removeCanvas = useCallback((id: string) => {
    deleteCanvas(id)
    setCanvasList(listCanvases())
  }, [])

  const refreshList = useCallback(() => {
    setCanvasList(listCanvases())
  }, [])

  return {
    cards, allCards: state.cards, groups, nextZIndex: state.nextZIndex, saveStatus,
    wasLoaded: loadedFromStorage.current, canvasEpoch,
    addCard, updateCard, removeCard, moveCard, resizeCard, pinCard, dismissCard,
    setStatus, resetLayout, arrangeCards, clearAll, forceSave, setPanZoom,
    createGroup, updateGroup, ungroup, deleteGroup, addToGroup, removeFromGroup, arrangeGroup, syncAutomations,
    canvasList, saveAs, loadCanvas, rename, removeCanvas, refreshList,
    undo, redo, canUndo, canRedo,
  }
}
