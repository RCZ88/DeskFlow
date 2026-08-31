import { useEffect, useState } from 'react'
import { Lightbulb, Star, ChevronRight, Trash2, Sparkles, CheckCircle2, SlidersHorizontal, ShieldCheck, ShieldX, Shield, Clapperboard, ExternalLink, ClipboardPaste, Check, Zap, BrainCircuit, ArrowRight } from 'lucide-react'
import { AmberButton, CopyPromptButton, GhostButton, Card, Chip, ConfirmIconButton, EmptyState, ErrorState, LoadingBlock, SectionHeader, TextInput, TextArea, toast } from './ui'
import { cn } from '@/lib/utils'
import { useContentEngine } from '../ContentEngineContext'
import { TemplateSelector } from './TemplateSelector'

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
  const [creatingEp, setCreatingEp] = useState(false)
  const { requestOpenEpisode } = useContentEngine()
  const priority = idea.priority ?? 1

  const createEpisode = async () => {
    if (creatingEp) return
    setCreatingEp(true)
    try {
      const res = await api()?.episodeSave({ idea_id: idea.id ? Number(idea.id) : undefined, title: idea.title, status: 'draft' })
      if (res?.ok) {
        toast('Episode created from idea')
        requestOpenEpisode(res.id)
      } else {
        toast(res?.error || 'Failed to create episode', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Failed to create episode', 'error')
    } finally {
      setCreatingEp(false)
    }
  }

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
        <button onClick={createEpisode} disabled={creatingEp}
          className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-[#f5c518]/10 hover:text-[#f5c518]">
          <Clapperboard size={11} /> {creatingEp ? 'Creating…' : 'Episode'}
        </button>
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

  // Quick Capture (merged from BrainstormView)
  const [captureThought, setCaptureThought] = useState('')
  const [classifying, setClassifying] = useState(false)
  const [classifyResult, setClassifyResult] = useState<any>(null)
  const [classifyError, setClassifyError] = useState<string | null>(null)
  const [routing, setRouting] = useState(false)

  // External AI state
  const [externalMode, setExternalMode] = useState(false)
  const [externalPrompt, setExternalPrompt] = useState('')
  const [externalPaste, setExternalPaste] = useState('')
  const [externalImporting, setExternalImporting] = useState(false)
  const [externalSending, setExternalSending] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [frameMode, setFrameMode] = useState<'strict' | 'flexible'>('strict')

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

  const sendToExternalAI = async () => {
    setExternalSending(true)
    try {
      const res = await api()?.externalBuildSynthesizePrompt({ note: synthNote.trim() || undefined, count: 3, templateIds: selectedTemplates, frameMode })
      if (res?.ok && res.prompt) {
        setExternalPrompt(res.prompt)
        setExternalMode(true)
        await navigator.clipboard.writeText(res.prompt)
        setCopiedPrompt(true)
        setTimeout(() => setCopiedPrompt(false), 2000)
        window.open('https://chatgpt.com', '_blank')
        toast('Prompt copied — paste it into ChatGPT/Claude')
      } else {
        toast(res?.error || 'Failed to build prompt', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Failed to build prompt', 'error')
    } finally {
      setExternalSending(false)
    }
  }

  const copyPromptOnly = async () => {
    try {
      const res = await api()?.externalBuildSynthesizePrompt({ note: synthNote.trim() || undefined, count: 3, templateIds: selectedTemplates, frameMode })
      if (res?.ok && res.prompt) {
        setExternalPrompt(res.prompt)
        setExternalMode(true)
        await navigator.clipboard.writeText(res.prompt)
        setCopiedPrompt(true)
        setTimeout(() => setCopiedPrompt(false), 2000)
        toast('Prompt copied — paste it into any AI, then paste the response below')
      } else {
        toast(res?.error || 'Failed to build prompt', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Failed to build prompt', 'error')
    }
  }

  const importExternalResponse = async () => {
    if (!externalPaste.trim()) { toast('Paste the AI response first', 'error'); return }
    setExternalImporting(true)
    try {
      const res = await api()?.externalImportSynthesize({ rawJson: externalPaste.trim() })
      if (res?.ok) {
        toast(`Imported ${res.count || 0} ideas`)
        setExternalMode(false)
        setExternalPaste('')
        setExternalPrompt('')
        load()
      } else {
        toast(res?.error || 'Import failed', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Import failed', 'error')
    } finally {
      setExternalImporting(false)
    }
  }

  // Quick Capture: classify a thought and route it
  const classifyThought = async () => {
    if (!captureThought.trim() || classifying) return
    setClassifying(true)
    setClassifyError(null)
    setClassifyResult(null)
    try {
      const res = await api()?.brainstormClassify({ thought: captureThought.trim() })
      if (res?.ok && res.category) setClassifyResult(res)
      else setClassifyError(res?.error || 'Classification failed')
    } catch (e: any) {
      setClassifyError(e?.message || 'Unexpected error')
    } finally {
      setClassifying(false)
    }
  }

  const routeClassified = async () => {
    if (!classifyResult || routing) return
    setRouting(true)
    try {
      const cat = classifyResult.category
      if (cat === 'content_idea') {
        await api()?.ideaSave({
          title: classifyResult.suggested_title || captureThought.trim().slice(0, 80),
          hook: captureThought.trim(),
          status: 'raw',
          format_type: classifyResult.format_type,
          niche: classifyResult.niche_hint || null,
        })
        toast('Routed to Ideas', 'success')
      } else if (cat === 'framework_update') {
        await api()?.frameworkSave({
          name: classifyResult.suggested_title || captureThought.trim().slice(0, 40),
          rules: [{ id: 'rule-1', rule: captureThought.trim() }],
          description: classifyResult.reason || '',
        })
        toast('Routed to Frameworks', 'success')
      } else if (cat === 'analytics') {
        await api()?.lessonSave({
          lesson: captureThought.trim(),
          applies_to: 'general',
          confidence: 0.7,
          status: 'active',
        })
        toast('Routed to Lessons', 'success')
      } else {
        await api()?.ideaSave({
          title: captureThought.trim().slice(0, 80),
          hook: captureThought.trim(),
          status: 'raw',
          format_type: 'other',
        })
        toast('Routed to Ideas', 'success')
      }
      setCaptureThought('')
      setClassifyResult(null)
      load()
    } catch (e: any) {
      toast(e?.message || 'Routing failed', 'error')
    } finally {
      setRouting(false)
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
            <GhostButton onClick={copyPromptOnly} disabled={externalSending}>
              <ClipboardPaste size={13} /> Copy Prompt
            </GhostButton>
            <GhostButton onClick={sendToExternalAI} disabled={externalSending}>
              {externalSending ? <Zap size={13} className="animate-pulse" /> : <ExternalLink size={13} />}
              {externalSending ? 'Building…' : 'External AI'}
            </GhostButton>
          </div>
        }
      />

      <TemplateSelector selected={selectedTemplates} onChange={setSelectedTemplates} frameMode={frameMode} onFrameModeChange={setFrameMode} />

      {/* Quick Capture — classify a thought and route it */}
      <Card className="border-[#a855f7]/20">
        <div className="flex items-center gap-2 mb-3">
          <BrainCircuit size={14} className="text-[#a855f7]" />
          <span className="text-[10px] font-semibold tracking-wider text-[#a855f7] uppercase">Quick Capture</span>
          <span className="text-[9px] text-zinc-500">— dump a thought, AI classifies and routes it</span>
        </div>
        <div className="flex gap-2">
          <TextArea
            className="flex-1"
            rows={2}
            placeholder="A video idea, a question, a half-formed thought..."
            value={captureThought}
            onChange={(e) => setCaptureThought(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); classifyThought() } }}
          />
          <div className="flex flex-col gap-1.5 shrink-0">
            <AmberButton onClick={classifyThought} disabled={!captureThought.trim() || classifying} className="h-8">
              <BrainCircuit size={13} />
              {classifying ? 'Classifying…' : 'Classify'}
            </AmberButton>
            <CopyPromptButton fieldKey="brainstorm-idea" />
          </div>
        </div>
        {classifyError && <div className="mt-2 text-[11px] text-rose-400">{classifyError}</div>}
        {classifyResult && (
          <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Chip className="border-[#a855f7]/25 bg-[#a855f7]/10 text-[#a855f7]">{classifyResult.category}</Chip>
                {classifyResult.suggested_title && <span className="text-[11px] text-zinc-300 font-medium">{classifyResult.suggested_title}</span>}
              </div>
              <button onClick={() => setClassifyResult(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300">Dismiss</button>
            </div>
            {classifyResult.reason && <p className="text-[10px] text-zinc-500 mb-2">{classifyResult.reason}</p>}
            <div className="flex items-center gap-2">
              <AmberButton onClick={routeClassified} disabled={routing} className="h-7">
                <ArrowRight size={12} />
                {routing ? 'Routing…' : `Route to ${classifyResult.category === 'content_idea' ? 'Ideas' : classifyResult.category === 'framework_update' ? 'Frameworks' : 'Lessons'}`}
              </AmberButton>
              <GhostButton onClick={() => { setCaptureThought(classifyResult.suggested_title || captureThought); setClassifyResult(null) }} className="h-7 text-[10px]">Edit thought</GhostButton>
            </div>
          </div>
        )}
      </Card>

      {externalMode && (
        <Card className="border-[#00d4ff]/20">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] font-semibold tracking-wider text-[#00d4ff] uppercase">
              <ClipboardPaste size={11} className="mr-1 inline" />
              Paste External AI Response
            </div>
            <GhostButton onClick={() => { setExternalMode(false); setExternalPaste(''); setExternalPrompt('') }} className="h-5 px-1.5 text-[10px]">
              Cancel
            </GhostButton>
          </div>
          {externalPrompt && (
            <div className="mb-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[9px] tracking-wider text-zinc-500 uppercase">Prompt sent to AI</span>
                <button
                  onClick={async () => { await navigator.clipboard.writeText(externalPrompt); setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 2000) }}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-white/[0.06]"
                >
                  {copiedPrompt ? <Check size={10} /> : <ClipboardPaste size={10} />}
                  {copiedPrompt ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-zinc-400">{externalPrompt}</pre>
            </div>
          )}
          <textarea
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-[#00d4ff]/40"
            rows={4}
            value={externalPaste}
            onChange={(e) => setExternalPaste(e.target.value)}
            placeholder="Paste the JSON output from ChatGPT/Claude here…"
          />
          <div className="mt-2">
            <AmberButton onClick={importExternalResponse} disabled={!externalPaste.trim() || externalImporting}>
              {externalImporting ? <Zap size={13} className="animate-pulse" /> : <ClipboardPaste size={13} />}
              {externalImporting ? 'Importing…' : 'Import Response'}
            </AmberButton>
          </div>
        </Card>
      )}

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
          hint="Use Quick Capture above to classify a thought, or hit “Synthesize 3” to have the AI generate your first batch."
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
