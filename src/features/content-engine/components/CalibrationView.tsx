import { useEffect, useState } from 'react'
import { Target, TrendingUp, AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, LoadingBlock, ErrorState, EmptyState } from './ui'
import type { CalibrationReport } from '@/types/deskflow-api'

const api = () => (window as any).deskflowAPI?.contentEngine

function AccuracyBar({ value, max = 1 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-[#f5c518]' : 'bg-rose-500'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function CriterionRow({ item }: { item: CalibrationReport['per_criterion'][0] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex cursor-pointer items-center justify-between gap-3" onClick={() => setOpen((v) => !v)}>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-zinc-100">{item.criterion}</div>
          <div className="mt-1"><AccuracyBar value={item.criterion_accuracy} /></div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-[11px] text-zinc-400">{(item.criterion_accuracy * 100).toFixed(0)}%</span>
          {open ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
        </div>
      </div>
      {open && (
        <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] tracking-wider text-zinc-500 uppercase">Predicted avg</div>
              <div className="font-mono text-xs text-zinc-200">{item.predicted_avg.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[9px] tracking-wider text-zinc-500 uppercase">Actual ({item.actual_metric})</div>
              <div className="font-mono text-xs text-zinc-200">{item.actual_value.toFixed(2)}</div>
            </div>
          </div>
          {item.notes && (
            <div className="rounded-md bg-white/[0.03] px-2.5 py-1.5 text-[10px] text-zinc-400">
              {item.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function CalibrationView({ episodeId }: { episodeId: number }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<CalibrationReport | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api()?.scoringCalibrate({ episodeId })
      if (res?.ok && res.calibration) setReport(res.calibration)
      else setError(res?.error || 'Calibration data unavailable')
    } catch (e: any) {
      setError(e?.message || 'Failed to load calibration')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [episodeId])

  if (loading) return <LoadingBlock label="Running calibration analysis…" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!report) return <EmptyState icon={<Target size={28} />} title="No calibration data" hint="Score at least 3 episodes to generate calibration." />

  const overallPct = Math.round(report.accuracy * 100)

  return (
    <div className="space-y-4">
      {/* Overall accuracy */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Target size={14} className="text-[#f5c518]" />
          <span className="text-xs font-semibold text-zinc-100">Calibration Accuracy</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="16" fill="none"
                stroke={overallPct >= 75 ? '#10b981' : overallPct >= 50 ? '#f5c518' : '#f43f5e'}
                strokeWidth="2.5"
                strokeDasharray={`${report.accuracy * 100.5} 100.5`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-zinc-100">
              {overallPct}%
            </span>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <TrendingUp size={10} /> Most accurate: {report.most_accurate}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-rose-400">
              <AlertTriangle size={10} /> Least accurate: {report.least_accurate}
            </div>
          </div>
        </div>
      </Card>

      {/* Per-criterion breakdown */}
      <Card>
        <div className="mb-3 text-xs font-semibold text-zinc-100">Per-Criterion Breakdown</div>
        <div className="space-y-2">
          {report.per_criterion.map((item) => (
            <CriterionRow key={item.criterion} item={item} />
          ))}
        </div>
      </Card>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Card>
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb size={14} className="text-[#00d4ff]" />
            <span className="text-xs font-semibold text-zinc-100">Recommendations</span>
          </div>
          <ul className="space-y-1.5">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#00d4ff]" />
                {rec}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
