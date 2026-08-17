import { ShieldCheck, ShieldX, AlertTriangle, BarChart3 } from 'lucide-react'
import type { ScoringSchemeInfo, FrameScoreBreakdown } from '@/types/deskflow-api'
import { cn } from '@/lib/utils'
import { Card, Spinner } from './ui'

interface EpisodeScoreSummaryProps {
  scheme: ScoringSchemeInfo | null
  breakdown: FrameScoreBreakdown[]
  average: number
  threshold: number
  rubricVersion: string
  totalFrames: number
  loading?: boolean
}

const CRITERION_COLORS: Record<string, string> = {
  hook: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  curiosity: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  pattern_interrupt: 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]',
  attention_anchor: 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]',
  curiosity_gap: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  retention: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  clarity: 'border-violet-500/25 bg-violet-500/10 text-violet-400',
  emotion: 'border-rose-500/25 bg-rose-500/10 text-rose-400',
  specific_pain: 'border-rose-500/25 bg-rose-500/10 text-rose-400',
  value_loop: 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]',
  three_cs: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  visual_hook: 'border-violet-500/25 bg-violet-500/10 text-violet-400',
  verbal_hook: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
  context_lock: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  hook_at_3_4s: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  value_speed: 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]',
  specific_paint: 'border-rose-500/25 bg-rose-500/10 text-rose-400',
}

function criterionClass(id: string) {
  return CRITERION_COLORS[id] || 'border-white/[0.08] bg-white/[0.04] text-zinc-400'
}

export function EpisodeScoreSummary({
  scheme,
  breakdown,
  average,
  threshold,
  rubricVersion,
  totalFrames,
  loading,
}: EpisodeScoreSummaryProps) {
  if (loading) {
    return (
      <Card className="flex items-center gap-3 p-5">
        <Spinner size={16} />
        <span className="text-xs text-zinc-400">Computing episode score…</span>
      </Card>
    )
  }

  if (!scheme || breakdown.length === 0) {
    return null
  }

  const pass = average >= threshold
  const avgPct = Math.max(0, Math.min(1, average)) * 100
  const avgColor = average < threshold ? 'text-rose-400' : average <= 0.8 ? 'text-[#f5c518]' : 'text-emerald-400'
  const barColor = average < threshold ? 'bg-rose-500' : average <= 0.8 ? 'bg-[#f5c518]' : 'bg-emerald-500'

  const rejectedCount = breakdown.filter((f) => f.rejected).length
  const nnFailsCount = breakdown.filter((f) => f.nonNegotiableFails?.length > 0).length
  const passCount = breakdown.filter((f) => !f.rejected).length

  const schemeIdLabels: Record<string, string> = {
    signal_builder: 'Signal Builder',
    audience_builder: 'Audience Builder',
    media_operator: 'Media Operator',
  }

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-[#f5c518]" />
          <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            Episode Score
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">v{rubricVersion}</span>
          <span className={cn(
            'inline-flex rotate-[-8deg] rounded border-2 px-1.5 py-0.5 text-[9px] font-black tracking-widest uppercase',
            pass ? 'border-emerald-500/60 text-emerald-400' : 'border-rose-500/60 text-rose-400',
          )}>
            {pass ? 'PASS' : 'REJECT'}
          </span>
        </div>
      </div>

      {/* Overall score bar */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">Weighted average</span>
          <span className={cn('text-lg font-bold tabular-nums', avgColor)}>{average.toFixed(3)}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${avgPct}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-600">
          <span>threshold {threshold.toFixed(2)}</span>
          <span>
            {passCount}/{totalFrames} frames passing
            {rejectedCount > 0 && <span className="ml-2 text-rose-400">{rejectedCount} rejected</span>}
          </span>
        </div>
      </div>

      {/* Scheme info */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
        <span className="text-[10px] font-semibold text-[#f5c518] uppercase">{scheme.name}</span>
        <span className={cn(
          'inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase',
          scheme.tier === 'A' ? 'border-emerald-500/40 text-emerald-400' :
          scheme.tier === 'B' ? 'border-[#f5c518]/40 text-[#f5c518]' :
          'border-zinc-500/40 text-zinc-400',
        )}>
          Tier {scheme.tier}
        </span>
        {scheme.duration && (
          <span className="text-[10px] text-zinc-600">{scheme.duration}</span>
        )}
      </div>

      {/* Per-criterion breakdown */}
      {scheme.weights && Object.keys(scheme.weights).length > 0 && (
        <div>
          <div className="mb-2 text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">
            Weight Distribution
          </div>
          <div className="space-y-1.5">
            {Object.entries(scheme.weights)
              .sort(([, a], [, b]) => b - a)
              .map(([criterion, weight]) => {
                const criterionBreakdown = breakdown.find((b) =>
                  b.criteria?.includes(criterion),
                )
                const avgForCriterion = criterionBreakdown?.score ?? 0
                const weightPct = weight * 100
                return (
                  <div key={criterion} className="flex items-center gap-2.5">
                    <span className={cn(
                      'inline-flex min-w-[90px] items-center rounded-md border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider',
                      criterionClass(criterion),
                    )}>
                      {criterion.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-[#f5c518]/60 transition-all duration-500"
                          style={{ width: `${weightPct}%` }}
                        />
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400 w-8 text-right">
                      {weight.toFixed(2)}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* NN failures callout */}
      {nnFailsCount > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] p-3">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-rose-400" />
          <div>
            <div className="text-[10px] font-semibold text-rose-400">Non-negotiable failures</div>
            <div className="mt-0.5 text-[11px] text-rose-300/70">
              {nnFailsCount} frame(s) failed non-negotiable criteria — auto-rejected regardless of weighted score.
            </div>
          </div>
        </div>
      )}

      {/* Per-frame score list */}
      {breakdown.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">
            Frame Scores
          </div>
          <div className="space-y-1">
            {breakdown.map((b) => {
              const bPct = Math.max(0, Math.min(1, b.score)) * 100
              const bColor = b.rejected ? 'bg-rose-500' : b.score < threshold ? 'bg-rose-500' : b.score <= 0.8 ? 'bg-[#f5c518]' : 'bg-emerald-500'
              const bTextColor = b.rejected ? 'text-rose-400' : b.score < threshold ? 'text-rose-400' : b.score <= 0.8 ? 'text-[#f5c518]' : 'text-emerald-400'
              return (
                <div key={b.index} className="flex items-center gap-2 py-0.5">
                  <span className="font-mono text-[10px] text-zinc-600 w-6">#{b.index + 1}</span>
                  <div className="flex-1">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', bColor)}
                        style={{ width: `${bPct}%` }}
                      />
                    </div>
                  </div>
                  <span className={cn('font-mono text-[10px] tabular-nums', bTextColor)}>
                    {b.score.toFixed(2)}
                  </span>
                  {b.rejected && <ShieldX size={10} className="text-rose-500" />}
                  {!b.rejected && b.nonNegotiableFails?.length === 0 && <ShieldCheck size={10} className="text-emerald-500" />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
