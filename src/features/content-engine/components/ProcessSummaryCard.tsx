import { useEffect, useState } from 'react'
import { Cpu, ArrowRight, Zap, BookOpen } from 'lucide-react'
import { Card, LoadingBlock, ErrorState, EmptyState } from './ui'

const api = () => (window as any).deskflowAPI?.contentEngine

export function ProcessSummaryCard({ episodeId }: { episodeId: number }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ title: string; narrative: string } | null>(null)
  const [events, setEvents] = useState<any[]>([])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api()?.processSummary({ episodeId })
      if (res?.ok) {
        setSummary(res.summary || null)
        setEvents(Array.isArray(res.events) ? res.events : [])
      } else {
        setError(res?.error || 'No process data available')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load process summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [episodeId])

  if (loading) return <LoadingBlock label="Loading process summary…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  if (!summary) {
    return (
      <EmptyState
        icon={<Cpu size={28} />}
        title="No process data yet"
        hint="Generate a script or run scoring to build the process timeline."
      />
    )
  }

  const turningPoint = events.find((e) => e.event_type === 'pivot' || e.event_type === 'turning_point')
  const lastEvent = events[events.length - 1]

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Cpu size={14} className="text-[#8b5cf6]" />
        <span className="text-xs font-semibold text-zinc-100">Process Summary</span>
        {summary.title && (
          <span className="ml-auto truncate rounded-md bg-[#8b5cf6]/10 px-1.5 py-0.5 text-[10px] text-[#a78bfa]">
            {summary.title}
          </span>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-zinc-300">
        {summary.narrative}
      </p>

      <div className="flex flex-wrap gap-3 border-t border-white/[0.06] pt-3">
        {turningPoint && (
          <div className="flex items-start gap-1.5">
            <ArrowRight size={11} className="mt-0.5 shrink-0 text-[#f5c518]" />
            <div>
              <div className="text-[9px] tracking-wider text-zinc-500 uppercase">Key turning point</div>
              <div className="text-[11px] text-zinc-300">
                {turningPoint.label || turningPoint.detail?.label || 'Pivot detected'}
              </div>
            </div>
          </div>
        )}
        {lastEvent && lastEvent.event_type === 'lesson_extracted' && (
          <div className="flex items-start gap-1.5">
            <Zap size={11} className="mt-0.5 shrink-0 text-[#00d4ff]" />
            <div>
              <div className="text-[9px] tracking-wider text-zinc-500 uppercase">Growth signal</div>
              <div className="text-[11px] text-zinc-300">
                {lastEvent.label || 'Lesson extracted from analytics'}
              </div>
            </div>
          </div>
        )}
        {events.length > 0 && (
          <div className="flex items-start gap-1.5">
            <BookOpen size={11} className="mt-0.5 shrink-0 text-zinc-500" />
            <div>
              <div className="text-[9px] tracking-wider text-zinc-500 uppercase">Timeline</div>
              <div className="text-[11px] text-zinc-300">{events.length} events tracked</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
