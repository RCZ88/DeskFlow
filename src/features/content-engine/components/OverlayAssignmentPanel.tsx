import { useEffect, useState } from 'react'
import { Sparkles, Film, Link2, Plus, Trash2, Eye, Layers, Palette } from 'lucide-react'
import { Card, Chip, SectionHeader, GhostButton, EmptyState, LoadingBlock, ErrorState, AmberButton, ConfirmIconButton, toast } from './ui'

const api = () => (window as any).deskflowAPI?.contentEngine

interface OverlaySession {
  id: string
  episode_id: number
  name: string
  source_video_path: string
  source_video_name: string
  duration_sec?: number
  status: string
  missing_source: boolean
  overlay_plan?: any
  motion_assets?: any[]
  caption_track?: any
  theme_id?: number | null
  created_at: string
  updated_at: string
}

interface OverlayAssignmentPanelProps {
  episodeId: number
  episodeTitle?: string
  seriesId?: number | null
  seriesStyle?: { visual_style?: string; tone?: string; pacing?: string; frame_mode?: string } | null
  onChanged?: () => void
}

export function OverlayAssignmentPanel({ episodeId, episodeTitle, seriesId, seriesStyle, onChanged }: OverlayAssignmentPanelProps) {
  const [sessions, setSessions] = useState<OverlaySession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await api()?.overlaySessionList?.({ episodeId }) ?? []
      setSessions(Array.isArray(list) ? list : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load overlay sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [episodeId])

  const createSession = async () => {
    setCreating(true)
    try {
      const res = await api()?.overlaySessionCreate?.({
        episodeId,
        name: `Overlay — ${episodeTitle || `Episode ${episodeId}`}`,
      })
      if (res?.ok) {
        toast('Overlay session created')
        load()
        onChanged?.()
      } else {
        toast(res?.error || 'Failed to create overlay session', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Failed to create', 'error')
    } finally {
      setCreating(false)
    }
  }

  const deleteSession = async (id: string) => {
    try {
      await api()?.overlaySessionDelete?.(id)
      toast('Overlay session deleted')
      load()
      onChanged?.()
    } catch (e: any) {
      toast(e?.message || 'Failed to delete', 'error')
    }
  }

  const applySeriesStyle = async (sessionId: string) => {
    if (!seriesStyle) return
    try {
      await api()?.overlaySessionUpdate?.(sessionId, {
        theme_id: null, // could map series style to theme
        // Store series style in overlay_plan for prompt generation
        overlay_plan: { series_style: seriesStyle, applied_from_series: seriesId },
      })
      toast('Series style applied to overlay')
      load()
    } catch (e: any) {
      toast(e?.message || 'Failed to apply style', 'error')
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader
          label="OVERLAY STUDIO"
          title="Overlay Sessions"
          icon={<Sparkles size={14} className="text-[#ec4899]" />}
          action={
            <AmberButton onClick={createSession} disabled={creating}>
              <Plus size={13} /> {creating ? 'Creating…' : 'New Overlay'}
            </AmberButton>
          }
        />
      </div>

      {seriesStyle && (seriesStyle.visual_style || seriesStyle.tone || seriesStyle.pacing) && (
        <div className="rounded-lg border border-[#f5c518]/20 bg-[#f5c518]/[0.04] p-3">
          <div className="flex items-center gap-2 mb-1">
            <Palette size={12} className="text-[#f5c518]" />
            <span className="text-[10px] font-semibold tracking-wider text-[#f5c518] uppercase">Series Style Inheritance</span>
            {seriesId && <Chip className="text-[9px] font-mono">Series #{seriesId}</Chip>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {seriesStyle.visual_style && <Chip className="border-violet-500/25 bg-violet-500/10 text-violet-400">Visual: {seriesStyle.visual_style}</Chip>}
            {seriesStyle.tone && <Chip className="border-cyan-500/25 bg-cyan-500/10 text-cyan-400">Tone: {seriesStyle.tone}</Chip>}
            {seriesStyle.pacing && <Chip className="border-emerald-500/25 bg-emerald-500/10 text-emerald-400">Pacing: {seriesStyle.pacing}</Chip>}
            {seriesStyle.frame_mode && <Chip className="border-amber-500/25 bg-amber-500/10 text-amber-400">{seriesStyle.frame_mode === 'strict' ? '🔒 Strict' : '🎨 Flexible'}</Chip>}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1.5">New overlays in this episode inherit these series settings. Apply to existing overlays to update their style.</p>
        </div>
      )}

      {loading && <LoadingBlock label="Loading overlay sessions…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && sessions.length === 0 && (
        <EmptyState
          icon={<Sparkles size={28} />}
          title="No overlay sessions yet"
          hint="Overlay sessions always belong to an episode. Create one to start building overlays for this episode."
        />
      )}

      {!loading && !error && sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="w-8 h-8 rounded-md bg-[#ec4899]/10 flex items-center justify-center">
                <Film size={14} className="text-[#ec4899]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-200 truncate">{session.name}</span>
                  <Chip className={`text-[9px] ${session.status === 'linked' ? 'bg-[#ec4899]/10 text-[#ec4899]' : 'bg-zinc-700/30 text-zinc-500'}`}>
                    {session.status.replace(/_/g, ' ')}
                  </Chip>
                  {session.missingSource && <span className="text-[9px] text-amber-400">⚠ Missing source</span>}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  {session.source_video_name || 'No video'} · {session.overlay_plan?.overlays?.length || 0} overlays planned
                  {session.motion_assets?.length ? ` · ${session.motion_assets.length} motion assets` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {seriesStyle && (
                  <GhostButton className="h-6 px-1.5 text-[10px]" onClick={() => applySeriesStyle(session.id)} title="Apply series style">
                    <Layers size={11} />
                  </GhostButton>
                )}
                <GhostButton className="h-6 px-1.5 text-[10px]" title="Open in Overlay Studio">
                  <Eye size={11} />
                </GhostButton>
                <ConfirmIconButton
                  onConfirm={() => deleteSession(session.id)}
                  icon={<Trash2 size={11} />}
                  label="Delete overlay session"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-[10px] text-zinc-500 border-t border-white/[0.06] pt-3">
        <Link2 size={11} />
        <span>Overlay sessions are always linked to this episode. Deleting the episode removes its overlays.</span>
      </div>
    </Card>
  )
}
