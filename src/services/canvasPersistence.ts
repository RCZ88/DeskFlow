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
  // Remove ALL canvas entries — not just the active one.
  // listCanvases() iterates all deskflow-canvas-* keys; remove them all
  // so loadCanvasLayout() returns null (empty state) on next startup.
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith(STORAGE_PREFIX) || key === ACTIVE_KEY || key === 'deskflow-canvas-layout')) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k))
}

// ─── Default Canvas Setup (R1: saved configuration for NEW canvases) ───
// The user configures which cards (type, position, size, pinned) appear on
// every NEW blank canvas. Stored as a versioned DefaultSetupConfig; seeding
// (useCanvasState createNewCanvas + AiPage mount effect) reads it and falls
// back to BUILTIN_DEFAULT_SETUP when nothing is saved.

import type { CardType, DefaultSetupCard, DefaultSetupConfig } from '../types/canvas'

export interface CanvasSetupEntry {
  type: string
  position: { x: number; y: number }
  size: { w: number; h: number }
  pinned: boolean
}

const SETUP_KEY = 'deskflow-canvas-default-setup'

export function loadDefaultSetup(): DefaultSetupConfig | null {
  try {
    const raw = localStorage.getItem(SETUP_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Legacy format (pre-v2): bare CanvasSetupEntry[] → wrap into a config.
    if (Array.isArray(parsed)) {
      const valid = parsed
        .filter(
          (e: any) => e && typeof e.type === 'string' && e.position && typeof e.position.x === 'number' && e.size && typeof e.size.w === 'number'
        )
        .map((e: any) => ({ type: e.type, enabled: true, position: e.position, size: e.size, pinned: !!e.pinned }))
      return valid.length > 0 ? { version: 1, cards: valid as DefaultSetupCard[], updatedAt: Date.now() } : null
    }
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.cards)) return null
    const valid = parsed.cards.filter(
      (e: any) => e && typeof e.type === 'string' && typeof e.enabled === 'boolean' && e.position && typeof e.position.x === 'number' && e.size && typeof e.size.w === 'number'
    )
    return valid.length > 0 ? { version: 1, cards: valid as DefaultSetupCard[], updatedAt: parsed.updatedAt || Date.now() } : null
  } catch { return null }
}

export function saveDefaultSetup(cards: DefaultSetupCard[]): void {
  try {
    const config: DefaultSetupConfig = { version: 1, cards, updatedAt: Date.now() }
    localStorage.setItem(SETUP_KEY, JSON.stringify(config))
  } catch { /* ignore */ }
}

export function clearDefaultSetup(): void {
  try { localStorage.removeItem(SETUP_KEY) } catch { /* ignore */ }
}

// Built-in fallback: a balanced starter canvas, all pinned so the user can
// re-arrange freely. Used when no saved setup exists AND the canvas is fresh.
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
  type,
  enabled: true,
  defaultData: {},
  ...BUILTIN_POSITIONS[type],
  pinned: true,
}))
