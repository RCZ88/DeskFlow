import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Lightbulb, Trophy, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, Chip, EmptyState, ErrorState, GhostButton, LoadingBlock, SectionHeader, toast } from './ui'
import { cn } from '@/lib/utils'

const api = () => (window as any).deskflowAPI?.contentEngine

type Correlation = { variable: string; insight: string; impact: string; direction: 'positive' | 'negative' }
type Recommendation = string

function impactBadge(impact: string): { cls: string; label: string } {
  const s = (impact || '').toLowerCase()
  if (s === 'high') return { cls: 'border-rose-500/25 bg-rose-500/10 text-rose-400', label: 'HIGH' }
  if (s === 'med' || s === 'medium') return { cls: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]', label: 'MED' }
  return { cls: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400', label: 'LOW' }
}

interface LearnViewProps {
  episodeId?: number
  onPhaseChange?: (phase: string) => void
}

export function LearnView({ episodeId, onPhaseChange }: LearnViewProps) {
  console.log('%c[ContentEngine] Phase45 v1.0 loaded', 'color:#f5c518;font-weight:bold')

  const [correlations, setCorrelations] = useState<Correlation[]>([])
  const [bestPerformer, setBestPerformer] = useState<string | null>(null)
  const [worstPerformer, setWorstPerformer] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lessonCount, setLessonCount] = useState(0)
  const [frameworkCount, setFrameworkCount] = useState(0)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [corrRes, lessonsRes, fwRes] = await Promise.all([
        api()?.analyticsCorrelate(),
        api()?.lessonsList(),
        api()?.frameworksList(),
      ])
      if (corrRes?.ok) {
        setCorrelations(Array.isArray(corrRes.correlations) ? corrRes.correlations : [])
        setBestPerformer(corrRes.best_performer ?? null)
        setWorstPerformer(corrRes.worst_performer ?? null)
        setRecommendations(Array.isArray(corrRes.recommendations) ? corrRes.recommendations : [])
      } else {
        setError(corrRes?.error || 'Failed to load correlations.')
      }
      if (Array.isArray(lessonsRes)) setLessonCount(lessonsRes.length)
      if (Array.isArray(fwRes)) setFrameworkCount(fwRes.length)
    } catch (e: any) {
      setError(e?.message || 'Failed to load learn data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <section className="space-y-6">
      <SectionHeader
        label="Content Engine / Learn"
        title="Learn"
        action={
          <div className="flex items-center gap-2">
            {lessonCount > 0 && (
              <Chip className="border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
              </Chip>
            )}
            {frameworkCount > 0 && (
              <Chip className="border-violet-500/25 bg-violet-500/10 text-violet-400">
                {frameworkCount} framework{frameworkCount !== 1 ? 's' : ''}
              </Chip>
            )}
          </div>
        }
      />

      {loading && <LoadingBlock label="Analyzing correlations…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && correlations.length === 0 && !bestPerformer && !worstPerformer && (
        <EmptyState
          icon={<Lightbulb size={28} />}
          title="No learnings yet"
          hint="Publish a few videos and check Analytics — the engine extracts variable correlations and recommendations here."
        />
      )}

      {!loading && !error && (correlations.length > 0 || bestPerformer || worstPerformer) && (
        <>
          {/* ── VARIABLE CORRELATIONS ── */}
          {correlations.length > 0 && (
            <Card className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={13} className="text-[#f5c518]" />
                <span className="text-[10px] tracking-wider text-zinc-500 uppercase">Variable Correlations</span>
              </div>

              <div className="space-y-1.5">
                {correlations.map((c, i) => {
                  const isPositive = c.direction === 'positive'
                  const ib = impactBadge(c.impact)
                  return (
                    <div
                      key={`${c.variable}-${i}`}
                      className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                    >
                      {isPositive
                        ? <TrendingUp size={12} className="shrink-0 text-emerald-400" />
                        : <TrendingDown size={12} className="shrink-0 text-rose-400" />
                      }
                      <span className="w-32 shrink-0 truncate font-mono text-[11px] text-zinc-400">{c.variable}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{c.insight}</span>
                      <Chip className={cn(
                        isPositive ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/25 bg-rose-500/10 text-rose-400',
                      )}>
                        {isPositive ? '+' : ''}{c.impact}
                      </Chip>
                      <Chip className={ib.cls}>{ib.label}</Chip>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* ── BEST / WORST PERFORMERS ── */}
          <div className="grid grid-cols-2 gap-4">
            {bestPerformer && (
              <Card className="space-y-2 border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <Trophy size={13} className="text-emerald-400" />
                  <span className="text-[10px] tracking-wider text-zinc-500 uppercase">Best Performer</span>
                </div>
                <p className="text-sm font-medium text-zinc-200">{bestPerformer}</p>
              </Card>
            )}
            {worstPerformer && (
              <Card className="space-y-2 border-rose-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} className="text-rose-400" />
                  <span className="text-[10px] tracking-wider text-zinc-500 uppercase">Worst Performer</span>
                </div>
                <p className="text-sm font-medium text-zinc-200">{worstPerformer}</p>
              </Card>
            )}
          </div>

          {/* ── RECOMMENDATIONS ── */}
          {recommendations.length > 0 && (
            <Card className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb size={13} className="text-[#00d4ff]" />
                <span className="text-[10px] tracking-wider text-zinc-500 uppercase">Recommendations</span>
              </div>
              <ul className="space-y-1.5">
                {recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#00d4ff]" />
                    <span className="break-words">{typeof rec === 'string' ? rec : String(rec)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* ── ACTIONS ── */}
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => onPhaseChange?.('lessons')}>
              Extract Lessons
              <ArrowRight size={13} />
            </GhostButton>
            <GhostButton onClick={() => onPhaseChange?.('frameworks')}>
              View Frameworks
              <ArrowRight size={13} />
            </GhostButton>
          </div>
        </>
      )}
    </section>
  )
}
