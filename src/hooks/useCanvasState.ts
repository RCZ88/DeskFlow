import { useReducer, useState, useCallback, useEffect, useRef } from 'react'
import { canvasReducer, DEFAULT_STATE } from '../types/canvas'
import {
  loadCanvasLayout, saveCanvasLayout, clearCanvasLayout,
  listCanvases, loadCanvasById, renameCanvas, deleteCanvas,
  type CanvasSnapshot
} from '../services/canvasPersistence'
import { generateUUID } from '../lib/uuid'
import type { CanvasCard, CanvasState, CardStatus, CardType, CanvasGroup } from '../types/canvas'

const DISMISS_TIMEOUT_MS = 30_000

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useCanvasState() {
  const [state, dispatch] = useReducer(canvasReducer, null, () => {
    return loadCanvasLayout() || DEFAULT_STATE
  })
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [canvasList, setCanvasList] = useState<CanvasSnapshot[]>(listCanvases())

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const saveResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced persist with visual feedback
  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      setSaveStatus('saving')
      try {
        saveCanvasLayout(state)
        setSaveStatus('saved')
        if (saveResetTimer.current) clearTimeout(saveResetTimer.current)
        saveResetTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 500)
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current)
      if (saveResetTimer.current) clearTimeout(saveResetTimer.current)
    }
  }, [state.cards, state.groups])

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

  // Group operations
  const createGroup = useCallback((label: string, cardIds: string[]) => {
    const cards = cardIds.map(id => state.cards[id]).filter(Boolean)
    if (cards.length === 0) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const c of cards) {
      minX = Math.min(minX, c.position.x)
      minY = Math.min(minY, c.position.y)
      maxX = Math.max(maxX, c.position.x + c.size.w * 40)
      maxY = Math.max(maxY, c.position.y + c.size.h * 40)
    }
    const group: CanvasGroup = {
      id: generateUUID(),
      label,
      cardIds,
      position: { x: minX - 20, y: minY - 40 },
      size: { w: maxX - minX + 40, h: maxY - minY + 60 },
    }
    dispatch({ type: 'CREATE_GROUP', group })
    for (const cardId of cardIds) {
      dispatch({ type: 'ADD_TO_GROUP', cardId, groupId: group.id })
    }
    return group.id
  }, [state.cards])

  const deleteGroup = useCallback((id: string) => {
    dispatch({ type: 'DELETE_GROUP', id })
  }, [])

  const addToGroup = useCallback((cardId: string, groupId: string) => {
    dispatch({ type: 'ADD_TO_GROUP', cardId, groupId })
  }, [])

  const removeFromGroup = useCallback((cardId: string) => {
    dispatch({ type: 'REMOVE_FROM_GROUP', cardId })
  }, [])

  const cards = Object.values(state.cards).filter(c => !c.dismissedAt)
  const groups = state.groups

  const clearAll = useCallback(() => {
    dismissTimers.current.forEach(t => clearTimeout(t))
    dismissTimers.current.clear()
    dispatch({ type: 'RESET_LAYOUT' })
    clearCanvasLayout()
  }, [])

  const forceSave = useCallback(() => {
    setSaveStatus('saving')
    try {
      saveCanvasLayout(state)
      setSaveStatus('saved')
      setCanvasList(listCanvases())
      if (saveResetTimer.current) clearTimeout(saveResetTimer.current)
      saveResetTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
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
      saveResetTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
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
    addCard, updateCard, removeCard, moveCard, resizeCard, pinCard, dismissCard,
    setStatus, resetLayout, arrangeCards, clearAll, forceSave,
    createGroup, deleteGroup, addToGroup, removeFromGroup,
    canvasList, saveAs, loadCanvas, rename, removeCanvas, refreshList,
  }
}
