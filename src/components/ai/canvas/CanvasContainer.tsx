import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { CanvasGrid } from './CanvasGrid'
import { CanvasInput } from './CanvasInput'
import { SaveIndicator } from './SaveIndicator'
import { CanvasMinimap } from './CanvasMinimap'
import { FindCardsArrow } from './FindCardsArrow'
import { CanvasManagerPanel } from './CanvasManagerPanel'
import { autoArrange } from '../../../lib/autoArrange'
import { loadCanvasLayout } from '../../../services/canvasPersistence'
import type { CanvasCard, CanvasGroup } from '../../../types/canvas'
import type { CanvasSnapshot } from '../../../services/canvasPersistence'

const PAN_STORAGE_KEY = 'rheo-canvas-pan-zoom'

interface CanvasContainerProps {
  cards: CanvasCard[]
  onMoveCard: (id: string, pos: { x: number; y: number }) => void
  onDismissCard: (id: string) => void
  onArrangeCards: (positions: Record<string, { x: number; y: number }>) => void
  onPinCard?: (id: string) => void
  onResizeCard?: (id: string, size: { w: number; h: number }) => void
  onCardClick?: (id: string) => void
  onUpdateCard?: (id: string, patch: Record<string, any>) => void
  groups?: Record<string, CanvasGroup>
  onUpdateGroup?: (groupId: string, patch: Partial<Pick<CanvasGroup, 'label' | 'colorId' | 'orientation' | 'ratio'>>) => void
  onUngroup?: (groupId: string, mode: 'restore' | 'scatter') => void
  onRemoveFromGroup?: (cardId: string, newPosition?: { x: number; y: number }) => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onSaveCanvas?: () => void
  onSend: (text: string) => void
  onStop: () => void
  streaming: boolean
  thinking?: boolean
  focusedCardId?: string | null
  autoFocus?: boolean
  onToggleAutoFocus?: () => void
  onOpenPalette?: () => void
  onGroupCards?: (cardIds: string[]) => void
  canvasList?: CanvasSnapshot[]
  activeCanvasId?: string | null
  onLoadCanvas?: (id: string) => void
  onRenameCanvas?: (id: string, name: string) => void
  onDeleteCanvas?: (id: string) => void
  onSaveAs?: (name: string) => void
  onSetPanZoom?: (pan: { x: number; y: number }, zoom: number) => void
}

export function CanvasContainer({
  cards, onMoveCard, onDismissCard, onArrangeCards, onPinCard, onResizeCard, onCardClick, onUpdateCard,
  groups, onUpdateGroup, onUngroup, onRemoveFromGroup,
  saveStatus, onSaveCanvas, onSend, onStop, streaming, thinking, focusedCardId, autoFocus, onToggleAutoFocus,
  onOpenPalette, onGroupCards, canvasList, activeCanvasId, onLoadCanvas, onRenameCanvas, onDeleteCanvas, onSaveAs,
  onSetPanZoom,
}: CanvasContainerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showManager, setShowManager] = useState(false)
  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    try {
      const raw = localStorage.getItem(PAN_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed
      }
    } catch { /* ignore */ }
    return { x: 0, y: 0 }
  })
  const [zoom, setZoom] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(PAN_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.zoom === 'number') return parsed.zoom
      }
    } catch { /* ignore */ }
    return 1
  })
  const [isPanning, setIsPanning] = useState(false)
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 })
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const hasAutoCentered = useRef(false)

  // Save pan/zoom to localStorage and sync to canvas state on change
  useEffect(() => {
    try {
      localStorage.setItem(PAN_STORAGE_KEY, JSON.stringify({ x: pan.x, y: pan.y, zoom }))
    } catch { /* ignore */ }
    onSetPanZoom?.(pan, zoom)
  }, [pan.x, pan.y, zoom])

  // Measure viewport
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      const cr = entries[0].contentRect
      setViewportSize({ w: cr.width, h: cr.height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Auto-center on populated area on mount (when cards loaded from storage)
  useEffect(() => {
    if (hasAutoCentered.current) return
    if (viewportSize.w === 0 || viewportSize.h === 0) return
    // If we loaded saved pan/zoom, skip auto-center
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

  const handleArrange = useCallback(() => {
    if (cards.length === 0) return
    const positions = autoArrange(cards)
    onArrangeCards(positions)
  }, [cards, onArrangeCards])

  const handleFocus = useCallback(() => {
    if (cards.length === 0) return
    const bounds = computeCardBounds(cards)
    const contentW = bounds.maxX - bounds.minX + 200
    const contentH = bounds.maxY - bounds.minY + 200
    const fitZoom = Math.min(viewportSize.w / contentW, viewportSize.h / contentH, 1.5)
    const clampedZoom = Math.max(0.3, Math.min(1.5, fitZoom))
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2
    setZoom(clampedZoom)
    setPan({
      x: viewportSize.w / 2 - centerX * clampedZoom,
      y: viewportSize.h / 2 - centerY * clampedZoom,
    })
  }, [cards, viewportSize])

  const handleRecenter = useCallback(() => {
    if (cards.length === 0) return
    const bounds = computeCardBounds(cards)
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2
    setPan({
      x: viewportSize.w / 2 - centerX,
      y: viewportSize.h / 2 - centerY,
    })
  }, [cards, viewportSize])

  const handleMinimapPan = useCallback((newPan: { x: number; y: number }) => {
    setPan(newPan)
  }, [])

  const handleZoomChange = useCallback((newZoom: number, newPan: { x: number; y: number }) => {
    setZoom(newZoom)
    setPan(newPan)
  }, [])

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(3.0, zoom * 1.2)
    setZoom(newZoom)
  }, [zoom])

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(0.15, zoom / 1.2)
    setZoom(newZoom)
  }, [zoom])

  // Auto-pan to focused card when it changes
  useEffect(() => {
    if (!autoFocus || !focusedCardId || viewportSize.w === 0) return
    const card = cards.find(c => c.id === focusedCardId)
    if (!card) return

    const cardCenterX = card.position.x + (card.size.w * 40) / 2
    const cardCenterY = card.position.y + (card.size.h * 40) / 2
    setPan({
      x: viewportSize.w / 2 - cardCenterX * zoom,
      y: viewportSize.h / 2 - cardCenterY * zoom,
    })
  }, [focusedCardId, autoFocus, cards, viewportSize, zoom])

  // Persist pan/zoom to localStorage
  const panZoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (panZoomTimer.current) clearTimeout(panZoomTimer.current)
    panZoomTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(PAN_STORAGE_KEY, JSON.stringify({ x: pan.x, y: pan.y, zoom }))
      } catch {}
    }, 300)
    return () => {
      if (panZoomTimer.current) clearTimeout(panZoomTimer.current)
    }
  }, [pan, zoom])

  // Check if any card is visible (accounting for zoom)
  const anyCardVisible = useMemo(() => {
    if (viewportSize.w === 0) return true
    // Viewport bounds in grid coordinates
    const vLeft = -pan.x / zoom
    const vTop = -pan.y / zoom
    const vRight = vLeft + viewportSize.w / zoom
    const vBottom = vTop + viewportSize.h / zoom
    return cards.some(c => {
      const cLeft = c.position.x
      const cTop = c.position.y
      const cRight = cLeft + c.size.w * 40
      const cBottom = cTop + c.size.h * 40
      return cLeft < vRight && cRight > vLeft && cTop < vBottom && cBottom > vTop
    })
  }, [cards, pan, zoom, viewportSize])

  // Compute card cluster center for arrow
  const clusterCenter = useMemo(() => {
    if (cards.length === 0) return null
    const bounds = computeCardBounds(cards)
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
    }
  }, [cards])

  const isCentered = useMemo(() => {
    if (cards.length === 0 || !clusterCenter || viewportSize.w === 0) return true
    const targetPan = {
      x: viewportSize.w / 2 - clusterCenter.x,
      y: viewportSize.h / 2 - clusterCenter.y,
    }
    return Math.abs(pan.x - targetPan.x) < 10 && Math.abs(pan.y - targetPan.y) < 10
  }, [cards, clusterCenter, pan, viewportSize])

  return (
    <div ref={containerRef} className={`dk-canvas-container ${isFullscreen ? 'fullscreen' : ''}`}>
      <SaveIndicator status={saveStatus} />

      {showManager && onLoadCanvas && (
        <CanvasManagerPanel
          canvases={canvasList || []}
          activeId={activeCanvasId || null}
          onLoad={(id) => { onLoadCanvas(id); setShowManager(false) }}
          onRename={(id, name) => onRenameCanvas?.(id, name)}
          onDelete={(id) => onDeleteCanvas?.(id)}
          onSave={(name) => { onSaveAs?.(name); setShowManager(false) }}
          onClose={() => setShowManager(false)}
        />
      )}

      <div className="dk-canvas-toolbar" data-tutorial="ai.auto-arrange">
        <button onClick={() => setShowManager(v => !v)} title="Canvas manager — save/load canvases">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <div className="dk-canvas-toolbar-separator" />
        <button onClick={handleArrange} title="Arrange cards neatly">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
        </button>
        <button onClick={handleFocus} title="Focus — bring camera to cards">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
        <div className="dk-canvas-toolbar-separator" />
        <button onClick={handleZoomOut} title="Zoom out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <span className="dk-canvas-zoom-label">{Math.round(zoom * 100)}%</span>
        <button onClick={handleZoomIn} title="Zoom in">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <div className="dk-canvas-toolbar-separator" />
        <button
          onClick={onToggleAutoFocus}
          title={autoFocus ? "Auto-focus: ON — canvas follows AI activity" : "Auto-focus: OFF — manual navigation"}
          style={{ color: autoFocus ? 'var(--dk-accent)' : 'var(--dk-text-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
        <div className="dk-canvas-toolbar-separator" />
        <button onClick={onSaveCanvas}
          title="Save canvas layout"
          style={{ color: saveStatus === 'saved' ? 'var(--dk-accent)' : 'var(--dk-text-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17,21 17,13 7,13 7,21" />
            <polyline points="7,3 7,8 15,8" />
          </svg>
        </button>
        <div className="dk-canvas-toolbar-separator" />
        <button onClick={() => setIsFullscreen(v => !v)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>
      </div>

      <CanvasGrid
        cards={cards}
        pan={pan}
        onPanChange={setPan}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onMoveCard={onMoveCard}
        onDismissCard={onDismissCard}
        onPinCard={onPinCard}
        onResizeCard={onResizeCard}
        onCardClick={onCardClick}
        onUpdateCard={onUpdateCard}
        groups={groups}
        onUpdateGroup={onUpdateGroup}
        onUngroup={onUngroup}
        onRemoveFromGroup={onRemoveFromGroup}
        isPanning={isPanning}
        setIsPanning={setIsPanning}
        focusedCardId={focusedCardId}
        onGroupCards={onGroupCards}
      />

      {!anyCardVisible && clusterCenter && viewportSize.w > 0 && (
        <FindCardsArrow
          viewportSize={viewportSize}
          pan={pan}
          clusterCenter={clusterCenter}
          onRecenter={handleRecenter}
        />
      )}

      {viewportSize.w > 0 && (
        <div data-tutorial="ai.minimap">
          <CanvasMinimap
            cards={cards}
            pan={pan}
            zoom={zoom}
            viewportSize={viewportSize}
            onPanChange={handleMinimapPan}
          />
        </div>
      )}

      <div data-tutorial="ai.input">
        <CanvasInput onSend={onSend} onStop={onStop} streaming={streaming} thinking={thinking} onOpenPalette={onOpenPalette} />
      </div>
    </div>
  )
}

function computeCardBounds(cards: CanvasCard[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const c of cards) {
    minX = Math.min(minX, c.position.x)
    minY = Math.min(minY, c.position.y)
    maxX = Math.max(maxX, c.position.x + c.size.w * 40)
    maxY = Math.max(maxY, c.position.y + c.size.h * 40)
  }
  return { minX, minY, maxX, maxY }
}
