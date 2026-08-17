import { useEffect, useState } from 'react'
import { Lightbulb, Star, ChevronRight, Trash2, Sparkles, CheckCircle2, SlidersHorizontal, ShieldCheck, ShieldX, Shield } from 'lucide-react'
import { AmberButton, Card, Chip, ConfirmIconButton, EmptyState, ErrorState, LoadingBlock, SectionHeader, TextInput, toast } from './ui'
import { cn } from '@/lib/utils'

const api = () => (window as any).deskflowAPI?.contentEngine

const COLUMNS = [
  { id: 'raw', label: 'Raw' },
  { id: 'refined', label: 'Refined' },
  { id: 'approved', label: 'Approved' },
  { id: 'used', label: 'Used' },
]

const NEXT_STATUS: Record<string, string> = { raw: 'refined', refined: 'approved', approved: 'used' }

function GateChip({ gates }: { gates?: any }) {
  const overall = gates?.overall
  if (!overall) return <Chip><Shield size={10} /> No gates</Chip>
  if (overall === 'pass') return <Chip className="border-emerald-500/25 bg-emerald-500/10 text-emerald-400"><ShieldCheck size={10} /> Gate pass</Chip>
  return <Chip className="border-rose-500/25 bg-rose-500/10 text-rose-400"><ShieldX size={10} /> Gate fail</Chip>
}

function IdeaCard({ idea, onSaved, onDeleted }: { idea: any; onSaved: () => void; onDeleted: () => void }) {
  const [saving, setSaving] = useState(false)
  const priority = idea.priority ?? 1

  const save = async (patch: any) => {
    if (saving) return
    setSaving(true)
    try {
      const res = await api()?.ideaSave({ ...idea, ...patch })
      if (res?.ok) { toast('Idea updated'); onSaved() }
      else toast(res?.error || 'Failed to update idea', 'error')
    } catch (e: any) {
      toast(e?.message || 'Failed to update idea', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-2.5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-100">{idea.title}</div>
          {idea.hook && <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{idea.hook}</div>}
        </div>
        <ConfirmIconButton
          onConfirm={onDeleted}
          icon={<Trash2 size={12} />}
          label="Delete idea"
          className="shrink-0"
        />
      </div>

      {Array.isArray(idea.frames) && idea.frames.length > 0 && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
          <div className="mb-1 text-[9px] tracking-wider text-zinc-600 uppercase">Frames preview</div>
          {idea.frames.slice(0, 3).map((f: any, i: number) => (
            <div key={i} className="truncate text-[11px] text-zinc-400">
              <span className="text-zinc-600">{i + 1}.</span> {String(f.text ?? f).slice(0, 90)}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {idea.format_type && <Chip className="border-[#f5c518]/20 text-[#f5c518]">{idea.format_type}</Chip>}
        {idea.niche && <Chip>{idea.niche}</Chip>}
        {idea.series && <Chip>Series · {idea.series}</Chip>}
      </div>

      <div className="flex items-center justify-between gap-2">
        <GateChip gates={idea.gates} />
        <div className="flex items-center gap-0.5" title={`Priority ${priority}/5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              disabled={saving}
              onClick={() => save({ priority: i })}
              className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
            >
              <Star
                size={12}
                className={cn(i <= priority ? 'fill-[#f5c518] text-[#f5c518]' : 'text-zinc-600')}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-t border-white/[0.06] pt-2.5">
        {idea.status !== 'approved' && idea.status !== 'used' && (
          <button onClick={() => save({ status: 'approved' })} disabled={saving}
            className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400">
            <CheckCircle2 size={11} /> Approve
          </button>
        )}
        {idea.status !== 'refined' && idea.status !== 'used' && (
          <button onClick={() => save({ status: 'refined' })} disabled={saving}
            className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-[#00d4ff]/10 hover:text-[#00d4ff]">
            <SlidersHorizontal size={11} /> Refine
          </button>
        )}
        {idea.status !== 'used' && NEXT_STATUS[idea.status] && (
          <button onClick={() => save({ status: NEXT_STATUS[idea.status] })} disabled={saving}
            className="ml-auto inline-flex h-6 items-center gap-0.5 rounded-md px-1.5 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200">
            <ChevronRight size={12} /> {NEXT_STATUS[idea.status]}
          </button>
        )}
      </div>
    </Card>
  )
}

export function IdeasView() {
  const [ideas, setIdeas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [synthNote, setSynthNote] = useState('')
  const [synthesizing, setSynthesizing] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await api()?.ideasList()
      setIdeas(Array.isArray(list) ? list : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load ideas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const synthesize = async () => {
    if (synthesizing) return
    setSynthesizing(true)
    try {
      const res = await api()?.synthesizeIdeas({ note: synthNote.trim() || undefined, count: 3 })
      if (res?.ok) {
        toast('3 new ideas synthesized')
        setSynthNote('')
        load()
      } else {
        toast(res?.error || 'Synthesis failed', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Synthesis failed', 'error')
    } finally {
      setSynthesizing(false)
    }
  }

  const remove = async (id?: number) => {
    if (!id) return
    try {
      await api()?.ideaDelete(id)
      toast('Idea deleted')
      load()
    } catch (e: any) {
      toast(e?.message || 'Failed to delete idea', 'error')
    }
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        label="Content Engine / 02"
        title="Ideas"
        action={
          <div className="flex items-center gap-2">
            <TextInput
              className="w-52"
              placeholder="Context note (optional)"
              value={synthNote}
              onChange={(e) => setSynthNote(e.target.value)}
            />
            <AmberButton onClick={synthesize} disabled={synthesizing}>
              <Sparkles size={13} />
              {synthesizing ? 'Synthesizing…' : 'Synthesize 3'}
            </AmberButton>
          </div>
        }
      />

      {loading && <LoadingBlock label="Loading ideas…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const items = ideas.filter((i) => (i.status || 'raw') === col.id)
            return (
              <div key={col.id} className="flex min-w-0 flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">{col.label}</span>
                  <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-zinc-500">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-3 py-8 text-center text-[11px] text-zinc-600">
                    Nothing here yet
                  </div>
                ) : (
                  items.map((idea) => (
                    <IdeaCard
                      key={idea.id ?? idea.title}
                      idea={idea}
                      onSaved={load}
                      onDeleted={() => remove(idea.id)}
                    />
                  ))
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && ideas.length === 0 && (
        <EmptyState
          icon={<Lightbulb size={28} />}
          title="No ideas in the funnel yet"
          hint="Classify a thought in Brainstorm, or hit “Synthesize 3” to have the AI generate your first batch."
          action={<AmberButton onClick={synthesize} disabled={synthesizing}><Sparkles size={13} /> Synthesize 3</AmberButton>}
        />
      )}

      {!loading && !error && ideas.length > 0 && (
        <p className="text-[11px] text-zinc-600">
          Dragless by design — use the move buttons to advance an idea through the funnel. Approved ideas feed the Episodes view.
        </p>
      )}
    </section>
  )
}
