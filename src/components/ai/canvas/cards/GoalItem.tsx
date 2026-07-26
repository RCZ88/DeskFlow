import { useCallback } from 'react'
import { ProgressRing } from './ProgressRing'
import { Play, CheckCircle2, Circle, Sparkles, Trash2 } from 'lucide-react'
import type { Goal } from '../../../../services/GoalStore'

const CATEGORY_COLORS: Record<string, string> = {
  work: '#22d3ee', personal: '#4ade80', health: '#f87171', learning: '#a78bfa',
}

interface GoalItemProps {
  goal: Goal
  progressSeconds?: number
  isActive?: boolean
  onToggle?: (goal: Goal) => void
  onFocus?: (goal: Goal) => void
  onDelete?: (goalId: string) => void
}

export function GoalItem({ goal, progressSeconds = 0, isActive = false, onToggle, onFocus, onDelete }: GoalItemProps) {
  const color = CATEGORY_COLORS[goal.category] || '#a1a1aa'
  const target = goal.target?.targetSeconds || 3600
  const progress = Math.min(target, (goal.progressSeconds || 0) + progressSeconds)
  const pct = goal.target?.type === 'time' ? Math.round((progress / target) * 100) : goal.status === 'completed' ? 100 : 0
  const isCompleted = goal.status === 'completed'
  const isSuggested = goal.source === 'ai' && goal.status === 'suggested'

  const handleToggle = useCallback(() => onToggle?.(goal), [goal, onToggle])
  const handleFocus = useCallback(() => onFocus?.(goal), [goal, onFocus])
  const handleDelete = useCallback(() => onDelete?.(goal.id), [goal.id, onDelete])

  return (
    <div
      className={`dk-goal-item group relative ${isActive ? 'focus-active' : ''} ${isCompleted ? 'completed' : ''}`}
      style={{ '--goal-color': color } as React.CSSProperties}
    >
      <button className="dk-goal-item-check" onClick={handleToggle}
        aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}>
        {isCompleted ? <CheckCircle2 size={18} color={color} /> : <Circle size={18} color="var(--dk-text-faint)" />}
      </button>

      <div className="dk-goal-item-main">
        <div className="dk-goal-item-title-row">
          <span className="dk-goal-item-dot" style={{ background: color }} />
          <span className="dk-goal-item-title">{goal.title}</span>
          {isSuggested && <span className="dk-goal-item-badge"><Sparkles size={10} />Suggested</span>}
        </div>
        {goal.target?.type === 'time' ? (
          <div className="dk-goal-item-meta">
            <span className="dk-goal-item-time">{formatDuration(progress)} / {formatDuration(target)}</span>
          </div>
        ) : (
          <span className="dk-goal-item-type">Completion goal</span>
        )}
      </div>

      {goal.target?.type === 'time' && (
        <div className="dk-goal-item-right">
          <ProgressRing percent={pct} size={32} strokeWidth={2.5} color={pct >= 100 ? '#4ade80' : color} label={pct >= 100 ? '✓' : `${pct}%`} />
          {goal.target?.matchCategory && onFocus && (
            <button className="dk-goal-item-focus-btn" onClick={handleFocus} aria-label="Start focus session">
              <Play size={12} fill="currentColor" />
            </button>
          )}
        </div>
      )}

      {onDelete && (
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ position: 'absolute', top: 6, right: 6, padding: 4, borderRadius: 4, background: 'transparent', border: 'none', color: '#52525b', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
          onMouseLeave={e => e.currentTarget.style.color = '#52525b'}
          aria-label="Delete goal"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
