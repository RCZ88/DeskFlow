import { useId, useMemo } from 'react'

const W = 320

export function RetentionCurveChart({ data, height = 130 }: { data: Array<{ t: number; pct: number }>; height?: number }) {
  const gid = useId()
  const { points, maxT, maxPct } = useMemo(() => {
    const pts = [...data].sort((a, b) => a.t - b.t)
    const maxT = Math.max(1, ...pts.map((p) => p.t))
    const maxPct = Math.max(1, ...pts.map((p) => p.pct))
    const x = (t: number) => (t / maxT) * W
    const y = (p: number) => height - (p / maxPct) * (height - 16) - 8
    return {
      points: pts.map((p) => `${x(p.t).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' '),
      maxT,
      maxPct,
    }
  }, [data, height])

  if (data.length === 0) {
    return <div className="py-8 text-center text-xs text-zinc-600">No retention data for this video yet</div>
  }

  const grid = [0, 25, 50, 75, 100].map((g) => ({
    g,
    y: height - (g / 100) * (height - 16) - 8,
  }))

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none" aria-label="Retention curve">
      <defs>
        <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5c518" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#f5c518" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {grid.map(({ g, y }) => (
        <g key={g}>
          <line x1="0" x2={W} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <text x="4" y={y - 3} fontSize="8" fill="#71717a">{g}%</text>
        </g>
      ))}
      <polygon points={`0,${height} ${points} ${W},${height}`} fill={`url(#fill-${gid})`} />
      <polyline points={points} fill="none" stroke="#f5c518" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <text x={W - 34} y={height - 4} fontSize="8" fill="#71717a">{maxT}s</text>
    </svg>
  )
}