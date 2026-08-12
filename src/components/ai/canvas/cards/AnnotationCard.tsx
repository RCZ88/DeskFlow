import type { CanvasCard } from '../../../../types/canvas'
import { StateView } from '../shared/StateView'
import { StickyNote } from 'lucide-react'

interface AnnotationCardProps {
  card: CanvasCard
}

export function AnnotationCard({ card }: AnnotationCardProps) {
  const data = card.data || {}
  if (!data.text) {
    return (
      <StateView
        state="empty"
        emptyProps={{
          icon: StickyNote,
          title: 'Empty annotation',
          description: 'Ask the AI to take a note on a card or file to fill this in.',
        }}
      >
        {null}
      </StateView>
    )
  }
  return (
    <div className="card-annotation">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, marginTop: 2 }}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span>{data.text}</span>
      {data.parentType && <span className="card-annotation-parent">on {data.parentType}</span>}
    </div>
  )
}
