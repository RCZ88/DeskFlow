import type { CanvasCard } from '../../../../types/canvas'
import { StateView, type ViewState } from '../shared/StateView'
import { Bell } from 'lucide-react'

interface ReflectCardProps {
  card: CanvasCard
  days?: any[]
  loading?: boolean
  error?: string
}

export function ReflectCard({ card, days, loading, error }: ReflectCardProps) {
  const data = card.data || {}
  const items = days || data.days || []
  const state: ViewState = loading ? 'loading' : error ? 'error' : items.length === 0 ? 'empty' : 'populated'

  return (
    <StateView
      state={state}
      loadingType="list"
      emptyProps={{
        icon: Bell,
        title: 'No reflections yet',
        description: 'End your day with an Evening Review and your reflections will appear here.',
      }}
      errorProps={{ message: error || 'Failed to load reflections' }}
    >
      <ul className="card-focus-list">
        {items.slice(0, 5).map((d: any, i: number) => (
          <li key={i} className="card-focus-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <span style={{ fontWeight: 500, color: '#d4d4d8', fontSize: 13 }}>{d.date || 'Today'}</span>
            {d.summary && <span style={{ fontSize: 12, color: '#52525b' }}>{d.summary.slice(0, 80)}...</span>}
          </li>
        ))}
      </ul>
    </StateView>
  )
}