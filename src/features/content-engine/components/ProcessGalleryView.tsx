import { useEffect, useState } from 'react'
import { Activity, Bot, Eye, GitBranch, GraduationCap, LayoutGrid, Timer, TrendingUp } from 'lucide-react'
import type { ProcessGalleryItem } from '@/types/deskflow-api'
import { Card, EmptyState, ErrorState, LoadingBlock, ScoreBar, SectionHeader, StatusChip } from './ui'
import { cn } from '@/lib/utils'

const api = () => (window as any).deskflowAPI?.contentEngine

function fmtDuration(min: number) {
  if (min < 1) return '<1 min'
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function Stat({ icon: Icon, label, value, color }: { icon: typeof Timer; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-md', color)}>
        <Icon size={12} />
      </span>
      <div>
        <div className="text-[10px] text-zinc-500">{label}</div>
        <div className="text-xs font-semibold text-zinc-200">{value}</div>
      </div>
    </div>
  )
}

function GalleryCard({ item, onClick }: { item: ProcessGalleryItem; onClick?: () => void }) {
  return (
    <Card
      className={cn(
        'flex flex-col gap-3 p-4 transition-colors cursor-pointer',
        onClick && 'hover:border-[#f5c518]/25',
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-100">{item.title}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <StatusChip status={item.status} />
            <span className="text-[10px] text-zinc-600">{item.scheme_id}</span>
          </div>
        </div>
        {item.score != null && (
          <div className="text-right">
            <div className={cn(
              'text-lg font-bold font-mono',
              item.score >= 0.8 ? 'text-emerald-400' : item.score >= 0.6 ? 'text-[#f5c518]' : 'text-rose-400',
            )}>
              {Math.round(item.score * 100)}
            </div>
            <div className="text-[9px] text-zinc-600 uppercase">score</div>
          </div>
        )}
      </div>

      {/* Score bar */}
      {item.score != null && <ScoreBar score={item.score} />}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={LayoutGrid} label="Steps" value={item.steps} color="bg-white/[0.04] text-zinc-400" />
        <Stat icon={Bot} label="AI Calls" value={item.ai_calls} color="bg-violet-500/10 text-violet-400" />
        <Stat icon={GitBranch} label="Pivots" value={item.pivots} color="bg-[#00d4ff]/10 text-[#00d4ff]" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Timer} label="Duration" value={fmtDuration(item.duration_min)} color="bg-white/[0.04] text-zinc-400" />
        <Stat icon={Eye} label="Views" value={item.views.toLocaleString()} color="bg-white/[0.04] text-zinc-400" />
        <Stat icon={GraduationCap} label="Lessons" value={item.lessons} color="bg-[#f5c518]/10 text-[#f5c518]" />
      </div>

      {/* Lesson preview */}
      {item.lesson_text && (
        <div className="rounded-lg border border-[#f5c518]/15 bg-[#f5c518]/[0.03] p-2.5">
          <div className="mb-0.5 text-[9px] font-semibold tracking-wider text-[#f5c518] uppercase">Lesson Learned</div>
          <p className="text-[11px] leading-relaxed text-zinc-400 line-clamp-2">{item.lesson_text}</p>
        </div>
      )}
    </Card>
  )
}

export function ProcessGalleryView({ onOpenEpisode }: { onOpenEpisode?: (id: number) => void }) {
  const [items, setItems] = useState<ProcessGalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await api()?.processGallery()
      setItems(Array.isArray(list) ? list : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load process gallery.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Aggregate stats
  const totalSteps = items.reduce((s, i) => s + i.steps, 0)
  const totalAiCalls = items.reduce((s, i) => s + i.ai_calls, 0)
  const totalPivots = items.reduce((s, i) => s + i.pivots, 0)
  const totalViews = items.reduce((s, i) => s + i.views, 0)
  const avgScore = items.filter((i) => i.score != null).length > 0
    ? items.filter((i) => i.score != null).reduce((s, i) => s + (i.score ?? 0), 0) / items.filter((i) => i.score != null).length
    : null
  const totalLessons = items.reduce((s, i) => s + i.lessons, 0)

  return (
    <section className="space-y-5">
      <SectionHeader
        label="PROCESS GALLERY"
        title="The Beauty of Process"
        action={
          <span className="text-[11px] text-zinc-500">
            {items.length} episode{items.length !== 1 ? 's' : ''} tracked
          </span>
        }
      />

      {/* Growth trend summary */}
      {!loading && !error && items.length > 0 && (
        <Card className="border-[#00d4ff]/15">
          <div className="mb-3 text-[9px] font-semibold tracking-wider text-[#00d4ff] uppercase">Growth Trend Summary</div>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-zinc-100">{totalSteps}</div>
              <div className="text-[10px] text-zinc-500">Total Steps</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-violet-400">{totalAiCalls}</div>
              <div className="text-[10px] text-zinc-500">AI Interactions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-[#00d4ff]">{totalPivots}</div>
              <div className="text-[10px] text-zinc-500">Iterations</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-[#f5c518]">{totalViews.toLocaleString()}</div>
              <div className="text-[10px] text-zinc-500">Total Views</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-emerald-400">{totalLessons}</div>
              <div className="text-[10px] text-zinc-500">Lessons Extracted</div>
            </div>
          </div>
          {avgScore != null && (
            <div className="mt-3 flex items-center gap-3 border-t border-white/[0.06] pt-3">
              <span className="text-[10px] text-zinc-500">Average Score</span>
              <div className="flex-1"><ScoreBar score={avgScore} /></div>
              <span className="text-xs font-mono font-semibold text-zinc-200">{Math.round(avgScore * 100)}%</span>
            </div>
          )}
        </Card>
      )}

      {loading && <LoadingBlock label="Loading process gallery…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<TrendingUp size={28} />}
          title="No process data yet"
          hint="As you create episodes, generate scripts, and extract lessons, the process gallery will show the beauty of your creative workflow."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <GalleryCard
              key={item.episode_id}
              item={item}
              onClick={onOpenEpisode ? () => onOpenEpisode(item.episode_id) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}
