import { useRef, useCallback, useState, useEffect } from 'react'
import { CanvasCard } from './CanvasCard'
import type { CanvasCard as CanvasCardType } from '../../../types/canvas'
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
  isPanning: boolean
  setIsPanning: (v: boolean) => void
  focusedCardId?: string | null
}

const MIN_ZOOM = 0.15
const MAX_ZOOM = 3.0
const ZOOM_STEP = 0.08

export function CanvasGrid({
  cards, pan, onPanChange, zoom, onZoomChange, onMoveCard, onDismissCard,
  onPinCard, onResizeCard, onCardClick, isPanning, setIsPanning, focusedCardId,
}: CanvasGridProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const gridLayerRef = useRef<HTMLDivElement>(null)
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const panRef = useRef(pan)
  const zoomRef = useRef(zoom)
  panRef.current = pan
  zoomRef.current = zoom

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.dk-canvas-card')) return
    if ((e.target as HTMLElement).closest('.dk-minimap')) return
    if ((e.target as HTMLElement).closest('.dk-find-arrow')) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }, [pan, setIsPanning])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    const newPan = { x: panStart.current.panX + dx, y: panStart.current.panY + dy }
    onPanChange(newPan)
  }, [isPanning, onPanChange])

  const handlePointerUp = useCallback(() => {
    setIsPanning(false)
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

  const handleCardDragStart = useCallback(() => {
    gridLayerRef.current?.setAttribute('data-card-dragging', 'true')
  }, [])

  const handleCardDragStop = useCallback(() => {
    gridLayerRef.current?.removeAttribute('data-card-dragging')
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
        {cards.sort((a, b) => a.zIndex - b.zIndex).map(card => (
          <CanvasCard
            key={card.id}
            card={card}
            onDragEnd={(id, pos) => onMoveCard(id, pos)}
            onDismiss={onDismissCard}
            onPin={onPinCard}
            onResize={onResizeCard}
            onClick={onCardClick}
            onDragStart={handleCardDragStart}
            onDragStop={handleCardDragStop}
            zoom={zoom}
            isFocused={card.id === focusedCardId}
          />
        ))}
      </div>
    </div>
  )
}
