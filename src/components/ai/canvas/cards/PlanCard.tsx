import type { CanvasCard } from '../../../../types/canvas'

interface PlanCardProps {
  card: CanvasCard
  goals?: any[]
  notes?: string
  onSaveNotes?: (content: string) => void
  loading?: boolean
}

export function PlanCard({ card, goals = [], notes = '', onSaveNotes, loading }: PlanCardProps) {
  const data = card.data || {}

  if (loading) {
    return (
      <div className="card-plan">
        <div className="card-focus-skeleton" />
      </div>
    )
  }

  return (
    <div className="card-plan">
      <div className="card-plan-header">
        <span className="card-focus-count">{goals.length} goals</span>
      </div>
      {goals.length > 0 ? (
        <ul className="card-focus-list">
          {goals.map((g: any) => (
            <li key={g.id} className="card-focus-item">
              <span className={`card-plan-dot ${g.category || 'work'}`} />
              <span>{g.title}</span>
              {g.priority && <span className="card-plan-priority">P{g.priority}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="card-focus-empty">No long-term goals</p>
      )}
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
  )
}
