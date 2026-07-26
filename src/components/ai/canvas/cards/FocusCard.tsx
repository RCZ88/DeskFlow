import { useEffect } from 'react'
import type { CanvasCard } from '../../../../types/canvas'

interface FocusCardProps {
  card: CanvasCard
  goals?: any[]
  onToggleGoal?: (goal: any) => void
  loading?: boolean
}

export function FocusCard({ card, goals = [], onToggleGoal, loading }: FocusCardProps) {
  const data = card.data || {}
  const activeGoals = goals.filter(g => g.status === 'done' || g.status === 'active')

  if (loading) {
    return (
      <div className="card-focus">
        <div className="card-focus-skeleton" />
        <div className="card-focus-skeleton short" />
      </div>
    )
  }

  return (
    <div className="card-focus">
      <div className="card-focus-header">
        <span className="card-focus-count">{activeGoals.length} active</span>
      </div>
      {activeGoals.length === 0 ? (
        <p className="card-focus-empty">No active goals</p>
      ) : (
        <ul className="card-focus-list">
          {activeGoals.map((g: any) => (
            <li key={g.id} className="card-focus-item">
              <button
                className={`card-focus-check ${g.status === 'done' ? 'done' : ''}`}
                onClick={() => onToggleGoal?.(g)}
              >
                {g.status === 'done' ? '✓' : '○'}
              </button>
              <span className={g.status === 'done' ? 'done' : ''}>{g.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
