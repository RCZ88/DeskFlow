import { useEffect, useState } from 'react'
import { Layers, Plus, Trash2, ChevronRight, Film, X, GripVertical, Palette, Clock, Target, BookOpen } from 'lucide-react'
import { AmberButton, Card, Chip, ConfirmIconButton, EmptyState, ErrorState, GhostButton, LoadingBlock, SectionHeader, TextInput, TextArea, toast } from './ui'
import { BridgeForm } from '@/components/ai-bridge/BridgeForm'
import { cn } from '@/lib/utils'
import { BlurFade, BentoCard, StatusChip } from './ui-laminar'

const api = () => (window as any).deskflowAPI?.contentEngine

const FRAME_MODES = [
  { id: 'strict', label: 'Strict', desc: 'Every frame follows the series template exactly. No creative deviation.', icon: '🔒' },
  { id: 'flexible', label: 'Flexible', desc: 'Series style is a guideline. Creative freedom allowed per episode.', icon: '🎨' },
] as const

const DURATIONS = ['15s', '30s', '45s', '60s', '90s', '3min', '5min', '10min']

function SeriesForm({ onSave, onCancel }: { onSave: (s: any) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [niche, setNiche] = useState('')
  const [tone, setTone] = useState('')
  const [visualStyle, setVisualStyle] = useState('')
  const [pacing, setPacing] = useState('')
  const [targetDuration, setTargetDuration] = useState('30s')
  const [frameMode, setFrameMode] = useState<'strict' | 'flexible'>('strict')

  const values = { name, description, niche, tone, visualStyle, pacing }
  const setField = (k: string, v: string) => {
    if (k === 'name') setName(v)
    else if (k === 'description') setDescription(v)
    else if (k === 'niche') setNiche(v)
    else if (k === 'tone') setTone(v)
    else if (k === 'visualStyle') setVisualStyle(v)
    else if (k === 'pacing') setPacing(v)
  }

  const save = () => {
    if (!name.trim()) { toast('Series name required', 'error'); return }
    onSave({ name: name.trim(), description, niche, tone, visual_style: visualStyle, pacing, target_duration: targetDuration, frame_mode: frameMode })
  }

  return (
    <BentoCard className="border-amber-500/20">
      <div className="mb-3 text-[10px] font-semibold tracking-wider text-amber-400 uppercase">New Series</div>
      <BridgeForm
        heading="Content Series"
        category="content-engine"
        context="Define a content series (name, description, niche, tone, visual style, pacing) based on the conversation"
        values={values}
        onChange={setField}
        onBulkUpdate={(merged) => {
          if (merged.name !== undefined) setName(merged.name)
          if (merged.description !== undefined) setDescription(merged.description)
          if (merged.niche !== undefined) setNiche(merged.niche)
          if (merged.tone !== undefined) setTone(merged.tone)
          if (merged.visualStyle !== undefined) setVisualStyle(merged.visualStyle)
          if (merged.pacing !== undefined) setPacing(merged.pacing)
        }}
        fields={[
          { key: 'name', label: 'Series Name *', placeholder: "e.g. 'Tech Tips Tuesdays'", kind: 'text' },
          { key: 'description', label: 'Description', placeholder: 'What the series is about', kind: 'textarea' },
          { key: 'niche', label: 'Niche', placeholder: 'tech, fitness, finance' },
          { key: 'tone', label: 'Series Tone', placeholder: 'conversational, witty, fast-paced' },
          { key: 'visualStyle', label: 'Visual Style', placeholder: 'clean, minimal, bold text overlays' },
          { key: 'pacing', label: 'Pacing', placeholder: 'fast cuts, 2s per beat' },
        ]}
      />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] text-zinc-500">Target Duration</label>
          <div className="flex flex-wrap gap-1">
            {DURATIONS.map(d => (
              <button key={d} onClick={() => setTargetDuration(d)}
                className={cn('rounded-md px-2 py-1 text-[10px] transition-colors',
                  targetDuration === d ? 'bg-amber-500/15 text-amber-400' : 'bg-white/[0.04] text-zinc-500 hover:bg-white/[0.06]')}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-zinc-500">Frame Mode</label>
          <div className="flex gap-2">
            {FRAME_MODES.map(m => (
              <button key={m.id} onClick={() => setFrameMode(m.id)}
                className={cn('flex-1 rounded-lg border p-2.5 text-left transition-all',
                  frameMode === m.id ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/[0.06] hover:border-white/[0.12]')}>
                <div className="text-xs font-medium text-zinc-200">{m.icon} {m.label}</div>
                <div className="mt-0.5 text-[10px] text-zinc-500">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <AmberButton onClick={save}>Save Series</AmberButton>
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
      </div>
    </BentoCard>
  )
}

function SeriesCard({ series, onOpen, onDeleted }: { series: any; onOpen: () => void; onDeleted: () => void }) {
  const epCount = series.episodes?.length || 0
  return (
    <BentoCard onClick={onOpen} className="cursor-pointer">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-100">{series.name}</span>
            <StatusChip status={series.status} />
            <Chip className={series.frame_mode === 'strict' ? 'border-amber-500/25 bg-amber-500/10 text-amber-400' : 'border-blue-500/25 bg-blue-500/10 text-blue-400 text-[9px]'}>
              {series.frame_mode === 'strict' ? '🔒 Strict' : '🎨 Flexible'}
            </Chip>
          </div>
          {series.description && <div className="mt-1 line-clamp-1 text-xs text-zinc-500">{series.description}</div>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {series.niche && <Chip>{series.niche}</Chip>}
            {series.target_duration && <Chip><Clock size={9} className="mr-0.5" />{series.target_duration}</Chip>}
            {series.tone && <Chip><BookOpen size={9} className="mr-0.5" />{series.tone.slice(0, 30)}</Chip>}
            {series.visual_style && <Chip><Palette size={9} className="mr-0.5" />{series.visual_style.slice(0, 30)}</Chip>}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-600">
            <Film size={10} /> {epCount} episode{epCount !== 1 ? 's' : ''}
          </div>
        </div>
        <ConfirmIconButton onConfirm={(e?: any) => { e?.stopPropagation?.(); api()?.seriesDelete(series.id).then(() => { toast('Series deleted'); onDeleted() }) }} icon={<Trash2 size={12} />} label="Delete series" />
      </div>
    </BentoCard>
  )
}

function SeriesDetail({ series, onBack, onChanged }: { series: any; onBack: () => void; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...series })
  const [allEpisodes, setAllEpisodes] = useState<any[]>([])

  useEffect(() => {
    api()?.episodesList().then((list: any[]) => setAllEpisodes(Array.isArray(list) ? list : []))
  }, [])

  const save = async () => {
    const res = await api()?.seriesSave({ ...form, id: series.id })
    if (res?.ok) { toast('Series updated'); onChanged(); setEditing(false) }
    else toast(res?.error || 'Save failed', 'error')
  }

  const addEpisode = async (epId: number) => {
    const res = await api()?.seriesAddEpisode({ seriesId: series.id, episodeId: epId })
    if (res?.ok) { toast(`Episode added as #${res.episode_number}`); onChanged() }
  }

  const removeEpisode = async (epId: number) => {
    const res = await api()?.seriesRemoveEpisode({ episodeId: epId })
    if (res?.ok) { toast('Episode removed from series'); onChanged() }
  }

  const linkedIds = new Set((series.episodes || []).map((e: any) => e.id))
  const unlinked = allEpisodes.filter(e => !linkedIds.has(e.id))

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <GhostButton className="h-7 px-2" onClick={onBack}><ChevronRight size={14} className="rotate-180" /> Back</GhostButton>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-zinc-100">{series.name}</span>
            <Chip className={series.frame_mode === 'strict' ? 'border-amber-500/25 bg-amber-500/10 text-amber-400' : 'border-blue-500/25 bg-blue-500/10 text-blue-400'}>
              {series.frame_mode === 'strict' ? '🔒 Strict' : '🎨 Flexible'}
            </Chip>
          </div>
        </div>
        <GhostButton onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</GhostButton>
      </div>

      {editing ? (
        <BentoCard className="border-amber-500/20">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] text-zinc-500">Name</label>
              <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] text-zinc-500">Description</label>
              <TextArea rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">Niche</label>
              <TextInput value={form.niche || ''} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">Target Duration</label>
              <TextInput value={form.target_duration || ''} onChange={(e) => setForm({ ...form, target_duration: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">Tone</label>
              <TextInput value={form.tone || ''} onChange={(e) => setForm({ ...form, tone: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">Visual Style</label>
              <TextInput value={form.visual_style || ''} onChange={(e) => setForm({ ...form, visual_style: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">Pacing</label>
              <TextInput value={form.pacing || ''} onChange={(e) => setForm({ ...form, pacing: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">Frame Mode</label>
              <div className="flex gap-2">
                {FRAME_MODES.map(m => (
                  <button key={m.id} onClick={() => setForm({ ...form, frame_mode: m.id })}
                    className={cn('flex-1 rounded-lg border p-2 text-left text-[10px]',
                      form.frame_mode === m.id ? 'border-amber-500/30 bg-amber-500/5 text-zinc-200' : 'border-white/[0.06] text-zinc-500')}>
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3"><AmberButton onClick={save}>Save</AmberButton></div>
        </BentoCard>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <BentoCard>
            <div className="mb-2 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">Series Settings</div>
            {series.niche && <div className="text-xs text-zinc-300"><span className="text-zinc-600">Niche: </span>{series.niche}</div>}
            {series.tone && <div className="text-xs text-zinc-300"><span className="text-zinc-600">Tone: </span>{series.tone}</div>}
            {series.visual_style && <div className="text-xs text-zinc-300"><span className="text-zinc-600">Visual: </span>{series.visual_style}</div>}
            {series.pacing && <div className="text-xs text-zinc-300"><span className="text-zinc-600">Pacing: </span>{series.pacing}</div>}
            {series.target_duration && <div className="text-xs text-zinc-300"><span className="text-zinc-600">Duration: </span>{series.target_duration}</div>}
            {!series.niche && !series.tone && !series.visual_style && !series.pacing && (
              <div className="text-xs text-zinc-600">No settings configured yet. Click Edit to set up series-wide style.</div>
            )}
          </BentoCard>
          <BentoCard>
            <div className="mb-2 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">Frame Mode</div>
            <div className="text-xs text-zinc-300">
              {series.frame_mode === 'strict'
                ? '🔒 Strict — Every frame in every episode MUST follow the series template exactly. No creative deviation allowed.'
                : '🎨 Flexible — Series style is a guideline. Each episode can deviate creatively while staying on-brand.'}
            </div>
          </BentoCard>
        </div>
      )}

      <BentoCard>
        <div className="mb-3 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
          <Film size={11} className="mr-1 inline" /> Episodes in Series ({series.episodes?.length || 0})
        </div>
        {(!series.episodes || series.episodes.length === 0) ? (
          <div className="text-xs text-zinc-600">No episodes in this series yet. Assign episodes from the Episodes view.</div>
        ) : (
          <div className="space-y-1.5">
            {series.episodes.map((ep: any) => (
              <div key={ep.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] p-2.5">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">#{ep.episode_number}</span>
                  <span className="text-xs text-zinc-200">{ep.title}</span>
                  <StatusChip status={ep.status} />
                </div>
                <GhostButton className="h-5 px-1.5 text-[10px]" onClick={() => removeEpisode(ep.id)}>Remove</GhostButton>
              </div>
            ))}
          </div>
        )}
      </BentoCard>

      {unlinked.length > 0 && (
        <BentoCard>
          <div className="mb-2 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">Add Episode to Series</div>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {unlinked.map(ep => (
              <div key={ep.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] p-2 hover:bg-white/[0.03]">
                <span className="text-xs text-zinc-300">{ep.title}</span>
                <GhostButton className="h-5 px-1.5 text-[10px]" onClick={() => addEpisode(ep.id)}>+ Add</GhostButton>
              </div>
            ))}
          </div>
        </BentoCard>
      )}
    </section>
  )
}

export function SeriesView() {
  const [series, setSeries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try { const list = await api()?.seriesList(); setSeries(Array.isArray(list) ? list : []) }
    catch (e: any) { setError(e?.message || 'Failed to load series') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const create = async (s: any) => {
    const res = await api()?.seriesSave(s)
    if (res?.ok) { toast('Series created'); setCreating(false); load() }
    else toast(res?.error || 'Failed to create', 'error')
  }

  const open = async (id: number) => {
    const s = await api()?.seriesGet(id)
    if (s) setSelected(s)
    else toast('Could not load series', 'error')
  }

  if (selected) return <SeriesDetail series={selected} onBack={() => { setSelected(null); load() }} onChanged={load} />

  return (
    <section className="space-y-6 p-6">
      <SectionHeader label="Content Engine / 03" title="Series" icon={<Layers size={14} className="text-white/70" />}
        action={
          <AmberButton onClick={() => setCreating(!creating)}>
            {creating ? <X size={13} /> : <Plus size={13} />}
            {creating ? 'Close' : 'New Series'}
          </AmberButton>
        }
      />

      {creating && <SeriesForm onSave={create} onCancel={() => setCreating(false)} />}
      {loading && <LoadingBlock label="Loading series…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && series.length === 0 && (
        <EmptyState icon={<Layers size={28} />} title="No series yet" hint="Series group episodes under a shared style, tone, and visual identity. All episodes in a series inherit its settings." action={<AmberButton onClick={() => setCreating(true)}><Plus size={13} /> New Series</AmberButton>} />
      )}

      {!loading && !error && series.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {series.map(s => <SeriesCard key={s.id} series={s} onOpen={() => open(s.id)} onDeleted={load} />)}
        </div>
      )}
    </section>
  )
}
