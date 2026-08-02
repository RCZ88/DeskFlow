import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Edit3, Palette, Ungroup, X, Check, GripVertical, Layers, Rows3, Columns3 } from 'lucide-react'
import { GROUP_COLORS, type GroupColorId, type CanvasCard, type CanvasGroup } from '../../../types/canvas'

function extractCardPreview(card: CanvasCard): string {
  const d = card.data
  if (!d) return `[${card.type}]`
  switch (card.type) {
    case 'response': return String(d.content || '').slice(0, 120)
    case 'annotation':
    case 'transient': return String(d.text || d.message || '').slice(0, 120)
    case 'focus': {
      const goals = d.goals
      if (Array.isArray(goals) && goals.length > 0) {
        const g = goals[0]
        return `${goals.length} goal${goals.length > 1 ? 's' : ''}: ${String(g.text || g.title || g.name || '').slice(0, 80)}`
      }
      return '[focus]'
    }
    case 'plan': {
      const goals = d.goals
      const notes = d.notes
      if (Array.isArray(goals) && goals.length > 0) {
        const g = goals[0]
        return `Plan: ${String(g.text || g.title || g.name || '').slice(0, 80)}`
      }
      if (notes) return String(notes).slice(0, 120)
      return '[plan]'
    }
    case 'reflect': {
      const days = d.days
      if (Array.isArray(days) && days.length > 0) {
        const latest = days[days.length - 1]
        if (latest.reviewSummary) return String(latest.reviewSummary).slice(0, 120)
        const goalCount = Array.isArray(latest.goals) ? latest.goals.length : 0
        return `${goalCount} goal${goalCount !== 1 ? 's' : ''} reviewed`
      }
      return '[reflect]'
    }
    case 'finance': {
      const s = d.summary
      if (s) {
        const parts = []
        if (s.totalBalance != null) parts.push(`$${Number(s.totalBalance).toFixed(0)}`)
        if (s.monthlySpent != null) parts.push(`$${Number(s.monthlySpent).toFixed(0)} spent`)
        return parts.join(' · ') || '[finance]'
      }
      return '[finance]'
    }
    case 'digest': {
      const topics = d.topics
      if (Array.isArray(topics) && topics.length > 0) {
        const t = topics[0]
        return `${topics.length} topic${topics.length > 1 ? 's' : ''}: ${String(t.topic || t.title || '').slice(0, 80)}`
      }
      return '[digest]'
    }
    case 'approval': {
      if (d.title) return String(d.title).slice(0, 120)
      if (d.description) return String(d.description).slice(0, 120)
      return '[approval]'
    }
    case 'connectors': {
      const conns = d.connectors
      if (Array.isArray(conns) && conns.length > 0) {
        const types = [...new Set(conns.map((c: any) => c.type || 'connector'))]
        return `${conns.length} connector${conns.length > 1 ? 's' : ''}: ${types.join(', ')}`
      }
      return '[connectors]'
    }
    case 'schedule': return 'Weekly Schedule'
    case 'deadlines': return 'Deadline Tracker'
    case 'planner': return 'Daily Planner'
    case 'group': return d.label || '[group]'
    default: return `[${card.type}]`
  }
}

interface GroupCardProps {
  group: CanvasGroup
  cards: CanvasCard[]
  onUpdateGroup: (patch: Partial<Pick<CanvasGroup, 'label' | 'colorId' | 'orientation' | 'ratio'>>) => void
  onUngroup: (mode: 'restore' | 'scatter') => void
  onRemoveFromGroup: (cardId: string, newPosition?: { x: number; y: number }) => void
}

export function GroupCard({ group, cards, onUpdateGroup, onUngroup, onRemoveFromGroup }: GroupCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(group.label)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const colorRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const color = GROUP_COLORS.find(c => c.id === group.colorId) || GROUP_COLORS[0]

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }
    if (showColorPicker) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showColorPicker])

  const handleRename = useCallback(() => {
    if (editLabel.trim() && editLabel.trim() !== group.label) {
      onUpdateGroup({ label: editLabel.trim() })
    }
    setEditing(false)
  }, [editLabel, group.label, onUpdateGroup])

  const handleDragEnd = useCallback((cardId: string, e: any) => {
    // Only remove from group when the mini-card is dropped OUTSIDE the group
    // container. Dropping inside (or an aborted drag with no real drop point)
    // keeps the card grouped.
    const container = cardRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (typeof x !== 'number' || typeof y !== 'number') return
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      onRemoveFromGroup(cardId)
    }
  }, [onRemoveFromGroup])

  return (
    <div
      ref={cardRef}
      className="group-card"
      style={{
        '--group-accent': color.accent,
        '--group-bg': color.bg,
        '--group-border': color.border,
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className="group-card-header">
        <button className="group-expand-btn" onClick={() => setExpanded(v => !v)}>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <ChevronDown size={14} style={{ color: color.accent }} />
          </motion.div>
        </button>

        <div className="group-color-dot" style={{ background: color.accent }} />

        {editing ? (
          <input
            ref={inputRef}
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') { setEditing(false); setEditLabel(group.label) }
            }}
            className="group-name-input"
            style={{ color: color.accent }}
          />
        ) : (
          <span
            className="group-name"
            style={{ color: color.accent }}
            onDoubleClick={() => { setEditing(true); setEditLabel(group.label) }}
          >
            {group.label}
          </span>
        )}

        <span className="group-count">{cards.length}</span>

        <div className="group-actions">
          <button
            onClick={() => { setEditing(true); setEditLabel(group.label) }}
            title="Rename"
            className="group-action-btn"
          >
            <Edit3 size={12} />
          </button>

          <div ref={colorRef} className="group-color-wrapper">
            <button
              onClick={() => setShowColorPicker(v => !v)}
              title="Change color"
              className="group-action-btn"
            >
              <Palette size={12} />
            </button>

            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="group-color-picker"
                >
                  {GROUP_COLORS.map(c => (
                    <button
                      key={c.id}
                      className={`group-color-swatch ${c.id === group.colorId ? 'active' : ''}`}
                      style={{ background: c.accent }}
                      onClick={() => { onUpdateGroup({ colorId: c.id }); setShowColorPicker(false) }}
                      title={c.label}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {cards.length >= 2 && (
            <div className="group-orientation-toggle">
              <button
                className={`group-action-btn ${(group.orientation || 'vertical') === 'vertical' ? 'active' : ''}`}
                onClick={() => onUpdateGroup({ orientation: 'vertical' })}
                title="Vertical layout"
              >
                <Rows3 size={12} />
              </button>
              <button
                className={`group-action-btn ${group.orientation === 'horizontal' ? 'active' : ''}`}
                onClick={() => onUpdateGroup({ orientation: 'horizontal' })}
                title="Horizontal layout"
              >
                <Columns3 size={12} />
              </button>
            </div>
          )}

          <button
            onClick={() => onUngroup(cards.length > 5 ? 'scatter' : 'restore')}
            title="Ungroup cards"
            className="group-action-btn group-action-danger"
          >
            <Ungroup size={12} />
          </button>
        </div>
      </div>

      {/* Ratio slider — only when 2+ cards */}
      {expanded && cards.length >= 2 && (
        <div className="group-ratio-bar">
          <span className="group-ratio-label" style={{ color: color.accent }}>A</span>
          <input
            type="range"
            min={0.2}
            max={0.8}
            step={0.05}
            value={group.ratio ?? 0.5}
            onChange={e => onUpdateGroup({ ratio: parseFloat(e.target.value) })}
            className="group-ratio-slider"
            style={{ '--ratio-fill': color.accent } as React.CSSProperties}
          />
          <span className="group-ratio-label" style={{ color: color.accent }}>B</span>
        </div>
      )}

      {/* Body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="group-body-wrapper"
          >
            <div
              className="group-cards"
              style={{
                flexDirection: group.orientation === 'horizontal' ? 'row' : 'column',
              } as React.CSSProperties}
            >
              {cards.length === 0 ? (
                <div className="group-empty">
                  <Layers size={16} className="group-empty-icon" />
                  <span>No cards yet</span>
                </div>
              ) : (
                cards.map((card, i) => {
                  const isHorizontal = group.orientation === 'horizontal'
                  const ratio = group.ratio ?? 0.5
                  // In horizontal mode with exactly 2 cards: first card gets ratio, second gets 1-ratio
                  // With 3+ cards: first two get ratio split, rest flex equally
                  let flexStyle: React.CSSProperties = {}
                  if (isHorizontal && cards.length === 2) {
                    flexStyle = { flex: i === 0 ? ratio : (1 - ratio) }
                  } else if (isHorizontal) {
                    flexStyle = { flex: 1 }
                  }
                  return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15, delay: i * 0.03 }}
                    className="group-mini-card"
                    style={flexStyle}
                    draggable
                    onDragEnd={(e) => handleDragEnd(card.id, e)}
                  >
                    <div className="group-mini-card-grip">
                      <GripVertical size={10} />
                    </div>
                    <div className="group-mini-card-content">
                      <div className="group-mini-card-header">
                        <span className="group-mini-card-type" style={{ color: color.accent }}>
                          {card.type}
                        </span>
                        <span className={`group-mini-card-status status-${card.status}`} />
                      </div>
                      <div className="group-mini-card-body">
                        <span className="group-mini-card-text">
                          {extractCardPreview(card)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="group-mini-card-remove"
                      onClick={(e) => { e.stopPropagation(); onRemoveFromGroup(card.id) }}
                      title="Remove from group"
                    >
                      <X size={10} />
                    </button>
                  </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
