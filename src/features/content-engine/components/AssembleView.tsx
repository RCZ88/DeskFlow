import { useEffect, useState } from 'react'
import { Scissors, Layers, ArrowRight, GripVertical } from 'lucide-react'
import { AmberButton, Card, Chip, EmptyState, ErrorState, GhostButton, LoadingBlock, SectionHeader, toast } from './ui'
import { cn } from '@/lib/utils'

const api = () => (window as any).deskflowAPI?.contentEngine

type CutEntry = { index: number; start_s: number; end_s: number; duration_s: number; text: string; seg_type: string; source_seg_id?: string }
type OverlayEntry = { start_s: number; end_s: number; text: string; position: string; style?: string; font_size?: string }

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function segTypeColor(t: string): string {
  const s = t.toLowerCase()
  if (s === 'hook') return 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]'
  if (s === 'value') return 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]'
  if (s === 'cta') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
  if (s === 'bridge') return 'border-violet-500/25 bg-violet-500/10 text-violet-400'
  return 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400'
}

function posLabel(p: string): string {
  const map: Record<string, string> = {
    'top-center': 'Top Center', 'top-left': 'Top Left', 'top-right': 'Top Right',
    'bottom-center': 'Bottom Center', 'bottom-left': 'Bottom Left', 'bottom-right': 'Bottom Right',
    'center': 'Center',
  }
  return map[p] || p
}

interface AssembleViewProps {
  episodeId: number
  onPhaseChange?: (phase: string) => void
}

export function AssembleView({ episodeId, onPhaseChange }: AssembleViewProps) {
  console.log('%c[ContentEngine] Phase45 v1.0 loaded', 'color:#f5c518;font-weight:bold')

  const [cuts, setCuts] = useState<CutEntry[]>([])
  const [overlays, setOverlays] = useState<OverlayEntry[]>([])
  const [totalDuration, setTotalDuration] = useState(0)
  const [totalOverlays, setTotalOverlays] = useState(0)
  const [overlayNotes, setOverlayNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const load = async () => {
    if (!episodeId) return
    setLoading(true)
    setError(null)
    try {
      const [cutRes, overlayRes] = await Promise.all([
        api()?.editCutlist({ episodeId }),
        api()?.editOverlayPlan({ episodeId }),
      ])
      if (cutRes?.ok) {
        setCuts(Array.isArray(cutRes.cutlist) ? cutRes.cutlist : [])
        setTotalDuration(cutRes.total_duration ?? 0)
      }
      if (overlayRes?.ok) {
        setOverlays(Array.isArray(overlayRes.plan?.overlays) ? overlayRes.plan.overlays : [])
        setTotalOverlays(overlayRes.plan?.total_overlays ?? 0)
        setOverlayNotes(overlayRes.plan?.notes ?? '')
      }
      if (!cutRes?.ok && !overlayRes?.ok) {
        setError(cutRes?.error || overlayRes?.error || 'Failed to load assembly data.')
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load assembly data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [episodeId])

  const sendToOverlay = async () => {
    setSending(true)
    try {
      toast('Sending cut list to Overlay Studio…', 'info')
      onPhaseChange?.('studio')
      toast('Handed off to Overlay Studio', 'success')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        label="Content Engine / Assemble"
        title="Assemble"
        action={
          <Chip className="border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]">
            Build your final cut
          </Chip>
        }
      />

      {loading && <LoadingBlock label="Loading cut list & overlay plan…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && cuts.length === 0 && overlays.length === 0 && (
        <EmptyState
          icon={<Scissors size={28} />}
          title="Nothing to assemble yet"
          hint="Keep segments from your script in the Episodes view — the kept segments become your cut list here."
        />
      )}

      {!loading && !error && (cuts.length > 0 || overlays.length > 0) && (
        <>
          {/* ── CUT LIST ── */}
          {cuts.length > 0 && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors size={13} className="text-[#f5c518]" />
                  <span className="text-[10px] tracking-wider text-zinc-500 uppercase">Cut List</span>
                </div>
                <Chip className="font-mono">{cuts.length} cuts</Chip>
              </div>

              <div className="space-y-1.5">
                {cuts.map((cut, i) => (
                  <div
                    key={cut.source_seg_id ?? i}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-colors',
                      'hover:bg-white/[0.04]',
                    )}
                  >
                    <GripVertical size={12} className="shrink-0 text-zinc-700" />
                    <span className="w-6 text-right font-mono text-[10px] text-zinc-600">#{cut.index ?? i + 1}</span>
                    <span className="font-mono text-[11px] text-zinc-400">
                      {fmtTime(cut.start_s)}–{fmtTime(cut.end_s)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">
                      "{cut.text || '…'}"
                    </span>
                    <Chip className={segTypeColor(cut.seg_type)}>{cut.seg_type}</Chip>
                    <span className="font-mono text-[10px] text-zinc-600">{fmtTime(cut.duration_s)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                <span className="text-[10px] tracking-wider text-zinc-600 uppercase">Total Duration</span>
                <span className="font-mono text-sm font-semibold text-zinc-200">{fmtTime(totalDuration)}</span>
              </div>
            </Card>
          )}

          {/* ── OVERLAY PLAN ── */}
          {overlays.length > 0 && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={13} className="text-[#00d4ff]" />
                  <span className="text-[10px] tracking-wider text-zinc-500 uppercase">Overlay Plan</span>
                </div>
                <Chip className="font-mono">{totalOverlays} overlays</Chip>
              </div>

              <div className="space-y-1.5">
                {overlays.map((ov, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <span className="font-mono text-[11px] text-zinc-400">
                      {fmtTime(ov.start_s)}–{fmtTime(ov.end_s)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">
                      "{ov.text}"
                    </span>
                    <Chip className="border-violet-500/25 bg-violet-500/10 text-violet-400">
                      {posLabel(ov.position)}
                    </Chip>
                    {ov.style && (
                      <Chip className="border-zinc-500/20 text-zinc-500">{ov.style}</Chip>
                    )}
                  </div>
                ))}
              </div>

              {overlayNotes && (
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="mb-1 text-[9px] tracking-wider text-zinc-600 uppercase">Notes</div>
                  <p className="text-xs leading-relaxed text-zinc-400">{overlayNotes}</p>
                </div>
              )}
            </Card>
          )}

          {/* ── HANDOFF ── */}
          <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div>
              <div className="text-xs font-medium text-zinc-300">Ready to add overlays visually?</div>
              <div className="mt-0.5 text-[11px] text-zinc-500">
                Send this plan to Overlay Studio for drag-and-drop positioning.
              </div>
            </div>
            <AmberButton onClick={sendToOverlay} disabled={sending}>
              {sending ? 'Sending…' : 'Send to Overlay Studio'}
              <ArrowRight size={13} />
            </AmberButton>
          </div>
        </>
      )}
    </section>
  )
}
