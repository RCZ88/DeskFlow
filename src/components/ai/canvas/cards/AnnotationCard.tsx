import type { CanvasCard } from '../../../../types/canvas'

interface AnnotationCardProps {
  card: CanvasCard
}

export function AnnotationCard({ card }: AnnotationCardProps) {
  const data = card.data || {}
  return (
    <div className="card-annotation">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, marginTop: 2 }}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span>{data.text || 'Annotation'}</span>
      {data.parentType && <span className="card-annotation-parent">on {data.parentType}</span>}
    </div>
  )
}
