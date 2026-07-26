import { useMemo } from 'react'
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'

interface CountdownRingProps {
  daysLeft: number
  totalDays?: number
  size?: number
}

const URGENCY_CONFIG = {
  critical: { color: '#f87171', Icon: AlertTriangle, threshold: 1 },
  urgent: { color: '#fb923c', Icon: Clock, threshold: 3 },
  warning: { color: '#fbbf24', Icon: Clock, threshold: 7 },
  safe: { color: '#4ade80', Icon: CheckCircle2, threshold: Infinity },
}

export function CountdownRing({ daysLeft, totalDays = 14, size = 32 }: CountdownRingProps) {
  const config = useMemo(() => {
    if (daysLeft < 0) return URGENCY_CONFIG.critical
    if (daysLeft <= URGENCY_CONFIG.urgent.threshold) return URGENCY_CONFIG.urgent
    if (daysLeft <= URGENCY_CONFIG.warning.threshold) return URGENCY_CONFIG.warning
    return URGENCY_CONFIG.safe
  }, [daysLeft])

  const { Icon } = config
  const progress = Math.max(0, Math.min(1, daysLeft / totalDays))
  const radius = (size - 3) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - progress * circumference

  return (
    <div className="dk-countdown-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--dk-border-subtle)" strokeWidth={2} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={config.color} strokeWidth={2} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset var(--dk-slow) var(--dk-ease)' }}
        />
      </svg>
      <Icon size={size / 2.5} color={config.color} className="dk-countdown-icon" />
    </div>
  )
}
