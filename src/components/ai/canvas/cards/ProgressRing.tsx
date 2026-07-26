import { useEffect, useState } from 'react'

interface ProgressRingProps {
  percent: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: string
  animate?: boolean
}

export function ProgressRing({
  percent,
  size = 36,
  strokeWidth = 3,
  color = 'var(--dk-accent)',
  trackColor = 'var(--dk-border-subtle)',
  label,
  animate = true,
}: ProgressRingProps) {
  const [displayPct, setDisplayPct] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const clamped = Math.min(100, Math.max(0, percent))
  const offset = circumference - (displayPct / 100) * circumference

  useEffect(() => {
    if (!animate) { setDisplayPct(clamped); return }
    const timer = setTimeout(() => setDisplayPct(clamped), 50)
    return () => clearTimeout(timer)
  }, [clamped, animate])

  return (
    <div className="dk-progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset var(--dk-slow) var(--dk-ease)' }}
        />
      </svg>
      {label && <span className="dk-progress-ring-label" style={{ fontSize: Math.max(9, size / 4) }}>{label}</span>}
    </div>
  )
}
