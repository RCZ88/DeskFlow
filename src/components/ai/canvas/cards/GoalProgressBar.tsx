interface GoalProgressBarProps {
  percent: number
  size?: 'sm' | 'md'
  showLabel?: boolean
}

export function GoalProgressBar({ percent, size = 'md', showLabel = true }: GoalProgressBarProps) {
  const color = percent >= 100 ? '#4ade80' : percent >= 50 ? '#fbbf24' : percent >= 25 ? '#fb923c' : '#f87171'

  return (
    <div className={`dk-progress-bar dk-progress-${size}`}>
      <div className="dk-progress-track">
        <div
          className="dk-progress-fill"
          style={{ width: `${Math.min(100, percent)}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="dk-progress-label" style={{ color }}>
          {percent >= 100 ? 'Done' : `${Math.round(percent)}%`}
        </span>
      )}
    </div>
  )
}
