import { useRef, useState, useCallback, useEffect, Component, type ReactNode, type ErrorInfo } from 'react'
import { Pin, PinOff, Maximize2, Minimize2 } from 'lucide-react'
import { CanvasCardFallback } from './CanvasCardFallback'
import { FocusCard } from './cards/FocusCard'
import { PlanCard } from './cards/PlanCard'
import { FinanceCard } from './cards/FinanceCard'
import { DigestCard } from './cards/DigestCard'
import { ApprovalCard } from './cards/ApprovalCard'
import { AnnotationCard } from './cards/AnnotationCard'
import { ResponseCardContent } from './ResponseCardContent'
import { GroupCard } from './GroupCard'
import { ConnectorsCard } from './ConnectorsCard'
import { WeeklyScheduleCard } from './cards/WeeklyScheduleCard'
import { DeadlineTrackerCard } from './cards/DeadlineTrackerCard'
import { DailyPlannerCard } from './cards/DailyPlannerCard'
import type { CanvasCard as CanvasCardType } from '../../../types/canvas'
import './cards/cards.css'

const CELL = 40

function renderCardContent(card: CanvasCardType) {
  switch (card.type) {
    case 'focus': return <FocusCard card={card} goals={card.data?.goals} loading={card.status === 'loading'} />
    case 'plan': return <PlanCard card={card} goals={card.data?.goals} notes={card.data?.notes} loading={card.status === 'loading'} />
    case 'finance': return <FinanceCard card={card} summary={card.data?.summary} loading={card.status === 'loading'} />
    case 'digest': return <DigestCard card={card} topics={card.data?.topics} loading={card.status === 'loading'} />
    case 'approval': return <ApprovalCard card={card} />
    case 'transient': return <div style={{ fontSize: 12, color: '#71717a' }}>{card.data?.text || card.data?.message || 'Transient card'}</div>
    case 'annotation': return <AnnotationCard card={card} />
    case 'response': return <ResponseCardContent content={card.data?.content || ''} isToolOutput={card.data?.isToolOutput} timestamp={card.data?.timestamp} isUserInput={card.data?.isUserInput} aiResponse={card.data?.aiResponse} aiTimestamp={card.data?.aiTimestamp} />
    case 'group': return <GroupCard items={card.data?.items || []} />
    case 'connectors': return <ConnectorsCard state={card.data?.state || 'loading'} connectors={card.data?.connectors || []} errorMessage={card.data?.errorMessage} onRetry={card.data?.onRetry} onAdd={card.data?.onAdd} onSync={card.data?.onSync} onRefresh={card.data?.onRefresh} syncing={card.data?.syncing} />
    case 'reflect': {
      const days = card.data?.days || []
      return (<div style={{ fontSize: 13 }}>{days.length === 0 ? <p style={{ fontSize: 12, color: '#3f3f46', margin: 0 }}>No reflections yet</p> : <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{days.slice(0, 5).map((d: any, i: number) => (<li key={i} style={{ padding: '5px 0', borderBottom: '1px solid rgba(63,63,70,0.15)', fontSize: 13, color: '#d4d4d8' }}><span style={{ fontWeight: 500 }}>{d.date || 'Today'}</span>{d.summary && <span style={{ display: 'block', fontSize: 12, color: '#52525b', marginTop: 2 }}>{d.summary.slice(0, 80)}...</span>}</li>))}</ul>}</div>)
    }
    case 'schedule': return <WeeklyScheduleCard />
    case 'deadlines': return <DeadlineTrackerCard />
    case 'planner': return <DailyPlannerCard />
    default: return <div style={{ fontSize: 12, color: '#52525b' }}>{card.type}</div>
  }
}

interface CanvasCardProps {
  card: CanvasCardType
  onDragEnd: (id: string, position: { x: number; y: number }) => void
  onDismiss: (id: string) => void
  onPin?: (id: string) => void
  onResize?: (id: string, size: { w: number; h: number }) => void
  onDragStart?: () => void
  onDragStop?: () => void
  onClick?: (id: string) => void
  zoom?: number
}

interface ErrorBoundaryState { hasError: boolean; error: Error | null }
class CardErrorBoundary extends Component<{ cardType: string; onRetry: () => void; onDismiss: () => void; children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(`[CanvasCard] ${this.props.cardType} crashed:`, error, info.componentStack) }
  render() {
    if (this.state.hasError) return <CanvasCardFallback cardType={this.props.cardType} error={this.state.error?.message || 'Unknown error'} onRetry={() => this.setState({ hasError: false, error: null })} onDismiss={this.props.onDismiss} />
    return this.props.children
  }
}

export function CanvasCard({ card, onDragEnd, onDismiss, onPin, onResize, onDragStart, onDragStop, onClick, zoom = 1 }: CanvasCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)
  const isDraggingRef = useRef(false)

  // ── Resize handlers (defined FIRST so drag handlers can reference them) ──
  const handleResizeDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: card.size.w, origH: card.size.h }
    if (cardRef.current) {
      cardRef.current.setPointerCapture(e.pointerId)
    }
  }, [card.size])

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current || !cardRef.current) return
    const dx = (e.clientX - resizeRef.current.startX) / zoom
    const dy = (e.clientY - resizeRef.current.startY) / zoom
    const newW = Math.max(4, Math.min(20, Math.round((resizeRef.current.origW * CELL + dx) / CELL)))
    const newH = Math.max(4, Math.min(20, Math.round((resizeRef.current.origH * CELL + dy) / CELL)))
    cardRef.current.style.width = `${newW * CELL}px`
    cardRef.current.style.height = `${newH * CELL}px`
  }, [zoom])

  const handleResizeUp = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current || !cardRef.current) return
    const dx = (e.clientX - resizeRef.current.startX) / zoom
    const dy = (e.clientY - resizeRef.current.startY) / zoom
    const newW = Math.max(4, Math.min(20, Math.round((resizeRef.current.origW * CELL + dx) / CELL)))
    const newH = Math.max(4, Math.min(20, Math.round((resizeRef.current.origH * CELL + dy) / CELL)))
    resizeRef.current = null
    cardRef.current.releasePointerCapture(e.pointerId)
    onResize?.(card.id, { w: newW, h: newH })
  }, [card.id, onResize, zoom])

  // ── Drag handlers ──
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, select, a')) return
    if ((e.target as HTMLElement).closest('.dk-canvas-resize-handle')) return

    let startX = card.position.x
    let startY = card.position.y
    if (cardRef.current) {
      const computed = getComputedStyle(cardRef.current).transform
      if (computed && computed !== 'none') {
        const m = new DOMMatrix(computed)
        startX = m.m41
        startY = m.m42
      }
    }

    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: startX, origY: startY }
    isDraggingRef.current = true
    if (cardRef.current) {
      cardRef.current.classList.add('dragging')
      cardRef.current.style.zIndex = '1000'
    }
    onDragStart?.()
  }, [onDragStart])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (resizeRef.current) {
      handleResizeMove(e)
      return
    }
    if (!dragRef.current || !cardRef.current) return
    const dx = (e.clientX - dragRef.current.startX) / zoom
    const dy = (e.clientY - dragRef.current.startY) / zoom
    const newX = dragRef.current.origX + dx
    const newY = dragRef.current.origY + dy
    cardRef.current.style.transform = `translate(${newX}px, ${newY}px)`
  }, [zoom, handleResizeMove])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (resizeRef.current) {
      handleResizeUp(e)
      return
    }
    if (!dragRef.current) return
    const dx = (e.clientX - dragRef.current.startX) / zoom
    const dy = (e.clientY - dragRef.current.startY) / zoom
    const rawX = dragRef.current.origX + dx
    const rawY = dragRef.current.origY + dy
    const snappedX = Math.round(rawX / CELL) * CELL
    const snappedY = Math.round(rawY / CELL) * CELL
    const finalPos = { x: snappedX, y: snappedY }

    dragRef.current = null
    isDraggingRef.current = false
    if (cardRef.current) {
      cardRef.current.classList.remove('dragging')
      cardRef.current.style.zIndex = String(card.zIndex)
    }
    onDragEnd(card.id, finalPos)
    onDragStop?.()
  }, [card.id, card.zIndex, onDragEnd, onDragStop, zoom, handleResizeUp])

  const handleCardClick = useCallback((e: React.PointerEvent) => {
    // Only fire if not dragging or resizing
    if (dragRef.current || resizeRef.current) return
    // Don't fire on header buttons or resize handle
    if ((e.target as HTMLElement).closest('.dk-canvas-card-actions, .dk-canvas-resize-handle')) return
    onClick?.(card.id)
  }, [card.id, onClick])

  const isTransient = !card.pinned && card.source === 'ai'

  return (
    <CardErrorBoundary cardType={card.type} onRetry={() => {}} onDismiss={() => onDismiss(card.id)}>
      <div
        ref={cardRef}
        className={`dk-canvas-card ${isTransient ? 'transient' : ''} status-${card.status}`}
        data-tutorial="ai.card-types"
        style={{
          position: 'absolute', left: 0, top: 0,
          width: card.size.w * CELL, height: card.size.h * CELL,
          transform: `translate(${card.position.x}px, ${card.position.y}px)`,
          zIndex: card.zIndex,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleCardClick}
      >
        <div className="dk-canvas-card-header">
          <span className="dk-canvas-card-type">{card.type}</span>
          <div className="dk-canvas-card-actions">
            <button
              className={`dk-canvas-pin-btn ${card.pinned ? 'pinned' : ''}`}
              onClick={(e) => { e.stopPropagation(); onPin?.(card.id) }}
              title={card.pinned ? 'Unpin card' : 'Pin card'}
            >
              {card.pinned ? <PinOff size={13} /> : <Pin size={13} />}
            </button>
            <button className="dk-canvas-dismiss" onClick={(e) => { e.stopPropagation(); onDismiss(card.id) }} title="Dismiss">✕</button>
          </div>
        </div>
        <div className="dk-canvas-card-body">
          {renderCardContent(card)}
        </div>
        <div
          className="dk-canvas-resize-handle"
          onPointerDown={handleResizeDown}
        />
      </div>
    </CardErrorBoundary>
  )
}
