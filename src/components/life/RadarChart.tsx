import { useMemo } from 'react'

interface RadarChartProps {
  data: Record<string, { content: string; confidence: number; occurrences: number }>
  size?: number
  accentColor?: string
}

export function RadarChart({ data, size = 200, accentColor = '#a855f7' }: RadarChartProps) {
  const entries = useMemo(() => Object.entries(data).slice(0, 8), [data])
  if (entries.length === 0) return null

  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - 20
  const angleStep = (2 * Math.PI) / entries.length

  // Build polygon points for each confidence level
  const buildPolygon = (scale: number) => {
    return entries.map(([_, item], i) => {
      const angle = i * angleStep - Math.PI / 2
      const r = maxR * (item.confidence || 0.5) * scale
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
    }).join(' ')
  }

  const outerPolygon = buildPolygon(1)
  const midPolygon = buildPolygon(0.66)
  const innerPolygon = buildPolygon(0.33)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      <polygon points={buildPolygon(1)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <polygon points={buildPolygon(0.66)} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      <polygon points={buildPolygon(0.33)} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

      {/* Axis lines */}
      {entries.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + maxR * Math.cos(angle)}
            y2={cy + maxR * Math.sin(angle)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        )
      })}

      {/* Data polygon */}
      <polygon
        points={outerPolygon}
        fill={`${accentColor}15`}
        stroke={accentColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {entries.map(([_, item], i) => {
        const angle = i * angleStep - Math.PI / 2
        const r = maxR * (item.confidence || 0.5)
        return (
          <circle
            key={i}
            cx={cx + r * Math.cos(angle)}
            cy={cy + r * Math.sin(angle)}
            r="3"
            fill={accentColor}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1"
          />
        )
      })}

      {/* Labels */}
      {entries.map(([key, item], i) => {
        const angle = i * angleStep - Math.PI / 2
        const labelR = maxR + 14
        const x = cx + labelR * Math.cos(angle)
        const y = cy + labelR * Math.sin(angle)
        const label = item.content.length > 12 ? item.content.slice(0, 12) + '...' : item.content
        const textAnchor = Math.cos(angle) < -0.1 ? 'end' : Math.cos(angle) > 0.1 ? 'start' : 'middle'
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={textAnchor}
            dominantBaseline="central"
            fill="#8888a0"
            fontSize="9"
            fontFamily="'JetBrains Mono', monospace"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}
