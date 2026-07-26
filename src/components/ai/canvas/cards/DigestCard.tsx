import type { CanvasCard } from '../../../../types/canvas'

interface DigestCardProps {
  card: CanvasCard
  topics?: any[]
  loading?: boolean
}

export function DigestCard({ card, topics = [], loading }: DigestCardProps) {
  const data = card.data || {}
  const items = data.topics || topics

  if (loading) {
    return (
      <div className="card-digest">
        <div className="card-focus-skeleton" />
        <div className="card-focus-skeleton short" />
      </div>
    )
  }

  return (
    <div className="card-digest">
      {items.length === 0 ? (
        <p className="card-focus-empty">No digest topics</p>
      ) : (
        <ul className="card-digest-list">
          {items.slice(0, 5).map((t: any, i: number) => (
            <li key={i} className="card-digest-item">
              <span className="card-digest-topic">{t.topic || t.title}</span>
              {t.summary && <span className="card-digest-summary">{t.summary.slice(0, 80)}...</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
