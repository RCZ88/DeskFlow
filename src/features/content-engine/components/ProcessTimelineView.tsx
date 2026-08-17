import { useEffect, useState } from 'react'
import { Activity, Bot, Brain, CheckCircle2, ChevronDown, ChevronRight, Clock, Cpu, Pencil, Zap } from 'lucide-react'
import type { ProcessEvent } from '@/types/deskflow-api'
import { Card, EmptyState, ErrorState, LoadingBlock, SectionHeader } from './ui'
import { cn } from '@/lib/utils'

const api = () => (window as any).deskflowAPI?.contentEngine

const EVENT_TYPE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: typeof Clock }> = {
  idea_created: { color: 'text-[#f5c518]', bg: 'bg-[#f5c518]/15', label: 'Idea Created', icon: Pencil },
  idea_classified: { color: 'text-[#f5c518]', bg: 'bg-[#f5c518]/15', label: 'Idea Classified', icon: Cpu },
  script_generated: { color: 'text-[#00d4ff]', bg: 'bg-[#00d4ff]/15', label: 'Script Generated', icon: Activity },
  bullet_regenerated: { color: 'text-[#00d4ff]', bg: 'bg-[#00d4ff]/15', label: 'Bullet Regenerated', icon: Activity },
  evidence_validated: { color: 'text-violet-400', bg: 'bg-violet-500/15', label: 'Evidence Validated', icon: Zap },
  gate_overridden: { color: 'text-violet-400', bg: 'bg-violet-500/15', label: 'Gate Overridden', icon: Zap },
  seo_injected: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'SEO Injected', icon: Cpu },
  episode_created: { color: 'text-[#f5c518]', bg: 'bg-[#f5c518]/15', label: 'Episode Created', icon: Pencil },
  published: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Published', icon: Activity },
  lesson_extracted: { color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Lesson Extracted', icon: Zap },
  reflection_analyzed: { color: 'text-violet-400', bg: 'bg-violet-500/15', label: 'Reflection Analyzed', icon: Brain },
  calibration_run: { color: 'text-[#00d4ff]', bg: 'bg-[#00d4ff]/15', label: 'Calibration Run', icon: Cpu },
  analytics_imported: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Analytics Imported', icon: Activity },
  process_complete: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Process Complete', icon: CheckCircle2 },
}

function getEventConfig(type: string) {
  return EVENT_TYPE_CONFIG[type] || { color: 'text-zinc-400', bg: 'bg-zinc-500/15', label: type, icon: Activity }
}

function fmtTimestamp(ts: string) {
  try {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch { return ts }
}

function EventRow({ event, isLast }: { event: ProcessEvent; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = getEventConfig(event.event_type)
  const Icon = cfg.icon
  const hasDetail = event.detail && (typeof event.detail === 'string' ? event.detail.length > 0 : Object.keys(event.detail).length > 0)

  return (
    <div className="relative flex gap-3">
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
          isLast ? 'border-emerald-500/40 bg-emerald-500/20' : 'border-white/[0.12] bg-[rgba(24,24,27,0.80)]',
        )}>
          <div className={cn('h-2 w-2 rounded-full', isLast ? 'bg-emerald-400' : 'bg-zinc-500')} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-white/[0.08]" />}
      </div>

      {/* Content */}
      <div className={cn('min-w-0 flex-1 pb-5', isLast && 'pb-0')}>
        <button
          onClick={() => hasDetail && setExpanded(!expanded)}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
            hasDetail && 'hover:bg-white/[0.04] cursor-pointer',
            !hasDetail && 'cursor-default',
          )}
        >
          <span className={cn('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md', cfg.bg)}>
            <Icon size={11} className={cfg.color} />
          </span>
          <span className="text-xs font-semibold text-zinc-200">{cfg.label}</span>
          {event.ai_model && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium text-violet-400">
              <Bot size={9} /> {event.ai_model}
            </span>
          )}
          <span className="ml-auto text-[10px] text-zinc-600">{fmtTimestamp(event.created_at)}</span>
          {hasDetail && (
            expanded ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />
          )}
        </button>

        {/* Detail expansion */}
        {expanded && hasDetail && (
          <div className="ml-8 mt-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            {event.label && (
              <div className="mb-1.5 text-[10px] font-medium text-zinc-400">{event.label}</div>
            )}
            <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-zinc-300 font-mono">
              {typeof event.detail === 'string' ? event.detail : JSON.stringify(event.detail, null, 2)}
            </pre>
          </div>
        )}

        {/* Inline label if no detail */}
        {!expanded && event.label && !hasDetail && (
          <div className="ml-8 mt-0.5 truncate text-[11px] text-zinc-500">{event.label}</div>
        )}
      </div>
    </div>
  )
}

export function ProcessTimelineView({ episodeId }: { episodeId: number }) {
  const [events, setEvents] = useState<ProcessEvent[]>([])
  const [summary, setSummary] = useState<{ title: string; narrative: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [evts, sum] = await Promise.all([
        api()?.processTimeline({ episodeId }),
        api()?.processSummary({ episodeId }),
      ])
      setEvents(Array.isArray(evts) ? evts : [])
      if (sum?.ok && sum.summary) setSummary(sum.summary)
    } catch (e: any) {
      setError(e?.message || 'Failed to load process timeline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [episodeId])

  const steps = events.length
  const aiCalls = events.filter((e) => e.ai_model).length
  const pivots = events.filter((e) => e.event_type === 'bullet_regenerated' || e.event_type === 'gate_overridden').length

  return (
    <section className="space-y-5">
      <SectionHeader
        label="PROCESS"
        title={summary?.title || `Episode #${episodeId}`}
        action={
          steps > 0 ? (
            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
              <span>{steps} step{steps !== 1 ? 's' : ''}</span>
              <span>{aiCalls} AI interaction{aiCalls !== 1 ? 's' : ''}</span>
              <span>{pivots} iteration{pivots !== 1 ? 's' : ''}</span>
            </div>
          ) : undefined
        }
      />

      {/* Narrative */}
      {summary?.narrative && (
        <Card className="border-[#00d4ff]/20">
          <div className="mb-1 text-[9px] font-semibold tracking-wider text-[#00d4ff] uppercase">Process Narrative</div>
          <p className="text-xs leading-relaxed text-zinc-300">{summary.narrative}</p>
        </Card>
      )}

      {loading && <LoadingBlock label="Loading process timeline…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && events.length === 0 && (
        <EmptyState
          icon={<Activity size={28} />}
          title="No process events yet"
          hint="Process events are logged as you generate scripts, validate evidence, inject SEO, and more."
        />
      )}

      {!loading && !error && events.length > 0 && (
        <Card className="py-4">
          {events.map((event, i) => (
            <EventRow key={event.id} event={event} isLast={i === events.length - 1} />
          ))}
        </Card>
      )}
    </section>
  )
}


