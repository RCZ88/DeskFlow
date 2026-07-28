import type { CanvasState } from '../types/canvas'

const STORAGE_KEY = 'deskflow-canvas-layout'

export function loadCanvasLayout(): CanvasState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.cards && typeof parsed.cards === 'object') {
      return { ...parsed, groups: parsed.groups || {} } as CanvasState
    }
    return null
  } catch {
    return null
  }
}

export function saveCanvasLayout(state: CanvasState): void {
  try {
    const slim: CanvasState = {
      nextZIndex: state.nextZIndex,
      groups: state.groups || {},
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
          },
        ])
      ),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
  } catch {}
}

export function clearCanvasLayout(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
