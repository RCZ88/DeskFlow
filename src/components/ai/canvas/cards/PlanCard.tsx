import type { CanvasCard } from '../../../../types/canvas'
import { StateView, type ViewState } from '../shared/StateView'
import { TrendingUp } from 'lucide-react'

interface PlanCardProps {
  card: CanvasCard
  goals?: any[]
  notes?: string
  onSaveNotes?: (content: string) => void
  loading?: boolean
  error?: string
}

export function PlanCard({ card, goals = [], notes = '', onSaveNotes, loading, error }: PlanCardProps) {
  const data = card.data || {}

  const state: ViewState = loading ? 'loading' : error ? 'error' : goals.length === 0 ? 'empty' : 'populated'

  return (
    <StateView
      state={state}
      loadingType="list"
      emptyProps={{
        icon: TrendingUp,
        title: 'No long-term goals',
        description: 'Set long-term goals in the Plan section to see them here.',
      }}
      errorProps={{ message: error || 'Failed to load long-term plan' }}
    >
      <div className="card-plan">
        <div className="card-plan-header">
          <span className="card-focus-count">{goals.length} goals</span>
        </div>
        <ul className="card-focus-list">
          {goals.map((g: any) => (
            <li key={g.id} className="card-focus-item">
              <span className={`card-plan-dot ${g.category || 'work'}`} />
              <span>{g.title}</span>
              {g.priority && <span className="card-plan-priority">P{g.priority}</span>}
            </li>
          ))}
        </ul>
        {notes && (
          <div className="card-plan-notes">
            <textarea
              value={notes}
              onChange={(e) => onSaveNotes?.(e.target.value)}
              placeholder="# Notes..."
              className="card-plan-textarea"
            />
          </div>
        )}
      </div>
    </StateView>
  )
}