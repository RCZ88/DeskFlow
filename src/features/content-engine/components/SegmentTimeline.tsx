import { useState } from 'react'
import { Check, Scissors, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, Spinner } from './ui'

const SEG_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  hook: { bg: 'bg-[#f5c518]/15', border: 'border-[#f5c518]/30', text: 'text-[#f5c518]' },
  value: { bg: 'bg-[#00d4ff]/15', border: 'border-[#00d4ff]/30', text: 'text-[#00d4ff]' },
  transition: { bg: 'bg-violet-500/15', border: 'border-violet-500/30', text: 'text-violet-400' },
  cta: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  filler: { bg: 'bg-zinc-500/15', border: 'border-zinc-500/30', text: 'text-zinc-400' },
}

function segColor(type?: string) {
  return SEG_TYPE_COLORS[type || ''] || { bg: 'bg-white/[0.06]', border: 'border-white/[0.10]', text: 'text-zinc-400' }
}

function fmtSec(s?: number | null) {
  if (s == null || !Number.isFinite(s)) return '—'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

interface SegmentTimelineProps {
  takeId: number
  duration: number
  segments?: any[]
  loading?: boolean
  onToggleKeep?: (segId: number, keep: boolean) => void
}

export function SegmentTimeline({ takeId, duration, segments = [], loading, onToggleKeep }: SegmentTimelineProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (loading) {
    return (
      <Card className="flex items-center gap-3 p-5">
        <Spinner size={16} />
        <span className="text-xs text-zinc-400">Loading segments…</span>
      </Card>
    )
  }

  if (!duration || duration <= 0) {
    return (
      <Card className="p-4 text-center">
        <span className="text-xs text-zinc-600">No duration set — import a take first.</span>
      </Card>
    )
  }

  const keptCount = segments.filter((s) => s.keep).length
  const totalCount = segments.length
  const keptDuration = segments.filter((s) => s.keep).reduce((acc, s) => acc + ((s.end_s ?? 0) - (s.start_s ?? 0)), 0)

  return (
    <div className="space-y-3">
      {/* Timeline bar */}
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">Segment Timeline</span>
          <span className="font-mono text-[10px] text-zinc-500">{fmtSec(duration)} total</span>
        </div>

        {/* Bar */}
        <div className="relative h-10 w-full overflow-hidden rounded-lg bg-white/[0.03] border border-white/[0.06]">
          {segments.map((seg, idx) => {
            const start = (seg.start_s ?? 0) / duration * 100
            const width = ((seg.end_s ?? 0) - (seg.start_s ?? 0)) / duration * 100
            const colors = segColor(seg.seg_type)
            const hovered = hoveredIdx === idx
            return (
              <div
                key={seg.id ?? idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onToggleKeep?.(seg.id, !seg.keep)}
                className={cn(
                  'absolute top-0 bottom-0 cursor-pointer border-r border-white/[0.04] transition-all duration-150',
                  colors.bg,
                  seg.keep ? 'opacity-100' : 'opacity-30',
                  hovered && 'ring-1 ring-white/20 z-10',
                )}
                style={{ left: `${start}%`, width: `${Math.max(width, 0.5)}%` }}
                title={`#${seg.seg_index + 1} ${fmtSec(seg.start_s)}–${fmtSec(seg.end_s)} ${seg.keep ? '✓ kept' : '✗ cut'}`}
              >
                {width > 8 && (
                  <span className={cn('flex h-full items-center justify-center font-mono text-[8px] font-bold', colors.text)}>
                    {seg.seg_index + 1}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-2 flex items-center gap-3 text-[9px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/40" />
            {keptCount}/{totalCount} kept
          </span>
          <span className="font-mono">{fmtSec(keptDuration)} kept duration</span>
          <span className="text-zinc-600">Click to toggle keep/cut</span>
        </div>
      </Card>

      {/* Segment list (structure view) */}
      {segments.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            Structure — Kept Segments
          </div>
          <div className="space-y-1">
            {segments
              .filter((s) => s.keep)
              .map((seg, idx) => {
                const colors = segColor(seg.seg_type)
                return (
                  <div
                    key={seg.id ?? idx}
                    className={cn(
                      'flex items-start gap-2 rounded-lg border px-3 py-2',
                      colors.border, colors.bg,
                    )}
                  >
                    <span className={cn('mt-0.5 font-mono text-[10px] font-bold', colors.text)}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-zinc-500">
                          {fmtSec(seg.start_s)}–{fmtSec(seg.end_s)}
                        </span>
                        <span className={cn('inline-flex items-center rounded border px-1 py-px text-[8px] font-semibold uppercase', colors.border, colors.text)}>
                          {seg.seg_type || 'value'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-300 line-clamp-2">{seg.text}</p>
                    </div>
                    <button
                      onClick={() => onToggleKeep?.(seg.id, false)}
                      className="mt-0.5 shrink-0 text-zinc-600 hover:text-rose-400 transition-colors"
                      title="Cut this segment"
                    >
                      <Scissors size={12} />
                    </button>
                  </div>
                )
              })}
            {segments.filter((s) => s.keep).length === 0 && (
              <div className="flex items-center gap-2 py-3 text-[11px] text-zinc-600">
                <SkipForward size={12} />
                No kept segments — toggle some on in the timeline above.
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
