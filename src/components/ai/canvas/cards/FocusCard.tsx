import type { CanvasCard } from '../../../../types/canvas'
import { StateView, type ViewState } from '../shared/StateView'
import { Target } from 'lucide-react'

interface FocusCardProps {
  card: CanvasCard
  goals?: any[]
  onToggleGoal?: (goal: any) => void
  loading?: boolean
  error?: string
}

export function FocusCard({ card, goals = [], onToggleGoal, loading, error }: FocusCardProps) {
  const data = card.data || {}
  const activeGoals = goals.filter(g => g.status === 'done' || g.status === 'active')

  const state: ViewState = loading ? 'loading' : error ? 'error' : activeGoals.length === 0 ? 'empty' : 'populated'

  return (
    <StateView
      state={state}
      loadingType="list"
      emptyProps={{
        icon: Target,
        title: 'No active goals',
        description: 'Ask the AI to suggest goals, or add them in the Focus page.',
      }}
      errorProps={{ message: error || 'Failed to load goals' }}
    >
      <div className="card-focus">
        <div className="card-focus-header">
          <span className="card-focus-count">{activeGoals.length} active</span>
        </div>
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
      </div>
    </StateView>
  )
}