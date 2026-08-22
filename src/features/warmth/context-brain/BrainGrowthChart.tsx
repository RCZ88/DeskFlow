import { useState, useEffect, useCallback, useMemo } from 'react'
import { TrendingUp, Calendar, Zap, Database } from 'lucide-react'
import { NumberTicker } from '../../../components/ui/number-ticker'

console.log('%c[BrainGrowthChart] v1.0 loaded', 'color: #22c55e; font-weight: bold')

interface Episode {
  id: string
  source: string
  occurredAt: string
}

interface GrowthData {
  date: string
  count: number
  cumulative: number
}

export function BrainGrowthChart() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  const loadGrowth = useCallback(async () => {
    try {
      setLoading(true)
      const api = (window as any).deskflowAPI
      if (!api) return

      const [epResult, brainStats] = await Promise.all([
        api.brainGetEpisodes?.({ limit: 500 }),
        api.brainStats?.(),
      ])

      setEpisodes(epResult?.items || [])
      setStats(brainStats)
    } catch (e) {
      console.error('[BrainGrowth] Load failed:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadGrowth() }, [loadGrowth])

  // Aggregate episodes by day
  const growthData = useMemo(() => {
    const dayMap = new Map<string, number>()
    for (const ep of episodes) {
      const day = ep.occurredAt?.slice(0, 10) || 'unknown'
      dayMap.set(day, (dayMap.get(day) || 0) + 1)
    }
    const sorted = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count, cumulative: 0 }))
    // Compute cumulative
    let cum = 0
    for (const d of sorted) {
      cum += d.count
      d.cumulative = cum
    }
    return sorted
  }, [episodes])

  // Source breakdown
  const sourceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const ep of episodes) {
      counts[ep.source] = (counts[ep.source] || 0) + 1
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
  }, [episodes])

  const SOURCE_COLORS: Record<string, string> = {
    goals: '#22c55e',
    finance: '#3b82f6',
    deadlines: '#ef4444',
    life_phase: '#ec4899',
    terminal: '#8b5cf6',
    manual: '#f59e0b',
    external_ai: '#06b6d4',
    deskflow_ai: '#a78bfa',
    connector: '#71717a',
  }

  const maxCumulative = growthData.length > 0 ? growthData[growthData.length - 1].cumulative : 1
  const maxDaily = Math.max(...growthData.map(d => d.count), 1)

  if (loading) {
    return (
      <div className="rounded-xl p-6" style={{ background: 'rgba(24,24,27,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} style={{ color: '#22c55e' }} />
          <span className="text-xs font-medium" style={{ color: '#d4d4d8' }}>Brain Growth</span>
        </div>
        <div className="h-32 flex items-center justify-center">
          <div className="text-[11px]" style={{ color: '#52525b' }}>Loading growth data...</div>
        </div>
      </div>
    )
  }

  if (growthData.length === 0) {
    return (
      <div className="rounded-xl p-6" style={{ background: 'rgba(24,24,27,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} style={{ color: '#22c55e' }} />
          <span className="text-xs font-medium" style={{ color: '#d4d4d8' }}>Brain Growth</span>
        </div>
        <div className="h-32 flex items-center justify-center">
          <div className="text-center">
            <Database size={20} style={{ color: '#3f3f46', margin: '0 auto 6px' }} />
            <div className="text-[11px]" style={{ color: '#52525b' }}>No episodes yet — the brain grows as you use the app</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: 'rgba(24,24,27,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} style={{ color: '#22c55e' }} />
          <span className="text-xs font-medium" style={{ color: '#d4d4d8' }}>Brain Growth</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: '#71717a' }}>
          <span><NumberTicker value={stats?.episodes || 0} /> episodes</span>
          <span><NumberTicker value={stats?.entities || 0} /> entities</span>
          <span><NumberTicker value={stats?.currentFacts || 0} /> facts</span>
        </div>
      </div>

      {/* Growth chart — cumulative line + daily bars */}
      <div className="relative" style={{ height: 140 }}>
        <svg width="100%" height="100%" viewBox="0 0 600 140" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
            <line
              key={pct}
              x1={0} y1={140 - pct * 120} x2={600} y2={140 - pct * 120}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1}
            />
          ))}

          {/* Daily bars */}
          {growthData.map((d, i) => {
            const barWidth = Math.max(600 / growthData.length - 2, 3)
            const x = (i / growthData.length) * 600 + 1
            const barHeight = (d.count / maxDaily) * 40
            return (
              <rect
                key={d.date}
                x={x}
                y={140 - barHeight}
                width={barWidth}
                height={barHeight}
                fill="rgba(34,197,94,0.25)"
                rx={2}
              />
            )
          })}

          {/* Cumulative line */}
          {growthData.length > 1 && (
            <polyline
              points={growthData.map((d, i) => {
                const x = (i / (growthData.length - 1)) * 600
                const y = 140 - (d.cumulative / maxCumulative) * 120
                return `${x},${y}`
              }).join(' ')}
              fill="none"
              stroke="#22c55e"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Cumulative dots */}
          {growthData.map((d, i) => {
            const x = (i / Math.max(growthData.length - 1, 1)) * 600
            const y = 140 - (d.cumulative / maxCumulative) * 120
            return (
              <circle
                key={d.date}
                cx={x}
                cy={y}
                r={3}
                fill="#22c55e"
                stroke="#09090b"
                strokeWidth={1.5}
              />
            )
          })}
        </svg>

        {/* Date labels */}
        <div className="flex justify-between mt-1">
          <span className="text-[9px] font-mono" style={{ color: '#52525b' }}>
            {growthData[0]?.date?.slice(5) || ''}
          </span>
          <span className="text-[9px] font-mono" style={{ color: '#52525b' }}>
            {growthData[growthData.length - 1]?.date?.slice(5) || ''}
          </span>
        </div>
      </div>

      {/* Source breakdown */}
      {sourceBreakdown.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {sourceBreakdown.map(([source, count]) => (
            <div
              key={source}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px]"
              style={{
                background: `${SOURCE_COLORS[source] || '#71717a'}12`,
                border: `1px solid ${SOURCE_COLORS[source] || '#71717a'}25`,
                color: SOURCE_COLORS[source] || '#71717a',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: SOURCE_COLORS[source] || '#71717a' }} />
              {source} · {count}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
