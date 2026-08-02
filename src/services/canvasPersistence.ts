import type { CanvasState } from '../types/canvas'

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
      // Check for any saved canvases — if none exist, return null for empty state
      const hasAny = listCanvases()
      if (hasAny.length > 0) {
        // Has canvases but no active ID — activate the most recent
        localStorage.setItem(ACTIVE_KEY, hasAny[0].id)
        return hasAny[0].state
      }
      return null
    }
    const raw = localStorage.getItem(STORAGE_PREFIX + activeId)
    if (!raw) {
      // Active ID points to nothing — try most recent canvas
      const hasAny = listCanvases()
      if (hasAny.length > 0) {
        localStorage.setItem(ACTIVE_KEY, hasAny[0].id)
        return hasAny[0].state
      }
      return null
    }
    const parsed = JSON.parse(raw)
    // CanvasSnapshot has { state: CanvasState, ... }
    if (parsed && parsed.state && parsed.state.cards) {
      return parsed.state as CanvasState
    }
    return null
  } catch {
    return null
  }
}

function parseState(raw: string): CanvasState | null {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.cards && typeof parsed.cards === 'object') {
      return {
        ...parsed,
        groups: parsed.groups || {},
        pan: parsed.pan || { x: 0, y: 0 },
        zoom: parsed.zoom ?? 1,
      } as CanvasState
    }
    return null
  } catch {
    return null
  }
}

export function saveCanvasLayout(state: CanvasState, name?: string): string {
  const activeId = localStorage.getItem(ACTIVE_KEY) || crypto.randomUUID()
  localStorage.setItem(ACTIVE_KEY, activeId)

  const cardCount = Object.keys(state.cards).length
  const snapshot: CanvasSnapshot = {
    id: activeId,
    name: name || `Canvas ${cardCount} cards`,
    savedAt: Date.now(),
    cardCount,
    state: serializeState(state),
  }
  localStorage.setItem(STORAGE_PREFIX + activeId, JSON.stringify(snapshot))
  return activeId
}

function serializeState(state: CanvasState): CanvasState {
  return {
    nextZIndex: state.nextZIndex,
    groups: state.groups || {},
    pan: state.pan,
    zoom: state.zoom,
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
          groupId: card.groupId,
          status: card.status,
          data: card.data,
          dismissedAt: card.dismissedAt,
        },
      ])
    ),
  }
}

export function listCanvases(): CanvasSnapshot[] {
  const result: CanvasSnapshot[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) result.push(JSON.parse(raw))
      } catch { /* skip corrupted entries */ }
    }
  }
  result.sort((a, b) => b.savedAt - a.savedAt)
  return result
}

export function loadCanvasById(id: string): CanvasState | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id)
    if (!raw) return null
    const snapshot: CanvasSnapshot = JSON.parse(raw)
    localStorage.setItem(ACTIVE_KEY, id)
    return snapshot.state
  } catch {
    return null
  }
}

export function renameCanvas(id: string, newName: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id)
    if (!raw) return
    const snapshot: CanvasSnapshot = JSON.parse(raw)
    snapshot.name = newName
    localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(snapshot))
  } catch { /* ignore */ }
}

export function deleteCanvas(id: string): void {
  localStorage.removeItem(STORAGE_PREFIX + id)
  if (localStorage.getItem(ACTIVE_KEY) === id) {
    localStorage.removeItem(ACTIVE_KEY)
  }
}

export function clearCanvasLayout(): void {
  const activeId = localStorage.getItem(ACTIVE_KEY)
  if (activeId) {
    localStorage.removeItem(STORAGE_PREFIX + activeId)
    localStorage.removeItem(ACTIVE_KEY)
  }
  // Also clear legacy key
  localStorage.removeItem('deskflow-canvas-layout')
}
