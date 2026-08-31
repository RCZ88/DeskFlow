import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, BrainCircuit, Save, ArrowRight, ListChecks, Zap, History, Trash2, FilePlus2, ExternalLink, ClipboardPaste, Check } from 'lucide-react'
import { AmberButton, CopyPromptButton, GhostButton, Card, Chip, EmptyState, ErrorState, LoadingBlock, SectionHeader, TextArea, toast } from './ui'
import { TemplateSelector } from './TemplateSelector'

const api = () => (window as any).deskflowAPI?.contentEngine

export function BrainstormView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [thought, setThought] = useState('')
  const [classifying, setClassifying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [asking, setAsking] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<any[] | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // External AI state
  const [externalMode, setExternalMode] = useState(false)
  const [externalPrompt, setExternalPrompt] = useState('')
  const [externalPaste, setExternalPaste] = useState('')
  const [externalImporting, setExternalImporting] = useState(false)
  const [externalSending, setExternalSending] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
  const [frameMode, setFrameMode] = useState<'strict' | 'flexible'>('strict')

  // Persistence + list
  const [brainstorms, setBrainstorms] = useState<any[]>([])
  const [currentId, setCurrentId] = useState<number | null>(null)
  const currentIdRef = useRef<number | null>(null)
  const thoughtRef = useRef(thought)
  const resultRef = useRef(result)
  const loadedOnce = useRef(false)
  useEffect(() => { thoughtRef.current = thought }, [thought])
  useEffect(() => { resultRef.current = result }, [result])

  useEffect(() => {
    (async () => {
      try {
        const list = await api()?.brainstormList()
        const arr = Array.isArray(list) ? list : []
        setBrainstorms(arr)
        if (!loadedOnce.current && arr.length) {
          loadedOnce.current = true
          loadBrainstorm(arr[0])
        }
      } catch {
        setBrainstorms([])
      }
    })()
  }, [])

  const autosave = useCallback(async () => {
    const t = thoughtRef.current
    const r = resultRef.current
    if (!t.trim() && !r) return
    try {
      const res = await api()?.brainstormSave({
        id: currentIdRef.current ?? undefined,
        thought: t,
        category: r?.category || 'general_thought',
        format_type: r?.format_type || null,
        niche_hint: r?.niche_hint || null,
        suggested_title: r?.suggested_title || null,
        reason: r?.reason || null,
        status: 'draft',
      })
      if (res?.ok && res.id != null) {
        currentIdRef.current = res.id
        setCurrentId(res.id)
      }
    } catch {
      /* autosave is best-effort */
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { void autosave() }, 800)
    return () => clearTimeout(t)
  }, [thought, result, autosave])

  const [showReclassify, setShowReclassify] = useState(false)

  const classify = async () => {
    if (!thought.trim() || classifying) return
    setClassifying(true)
    setError(null)
    setResult(null)
    try {
      const res = await api()?.brainstormClassify({ thought: thought.trim() })
      if (res?.ok && res.category) setResult(res)
      else setError(res?.error || 'Classification failed — the AI backend did not respond.')
    } catch (e: any) {
      setError(e?.message || 'Unexpected error while classifying your thought.')
    } finally {
      setClassifying(false)
    }
  }

  const confirmAndRoute = async () => {
    if (!result || saving) return
    setSaving(true)
    try {
      let destination = ''
      if (result.category === 'content_idea') {
        await api()?.ideaSave({
          title: result.suggested_title || thought.trim().slice(0, 80),
          hook: thought.trim(),
          status: 'raw',
          format_type: result.format_type,
          niche: result.niche_hint || null,
          brainstorm_id: currentId ?? null,
        })
        destination = 'Ideas'
      } else if (result.category === 'framework_update') {
        await api()?.frameworkSave({
          name: result.suggested_title || thought.trim().slice(0, 40),
          rules: [{ id: 'rule-1', rule: thought.trim() }],
          description: result.reason || '',
        })
        destination = 'Frameworks'
      } else if (result.category === 'analytics') {
        await api()?.lessonSave({
          lesson: thought.trim(),
          applies_to: 'general',
          confidence: 0.7,
          status: 'active',
        })
        destination = 'Lessons'
      } else {
        await api()?.ideaSave({
          title: thought.trim().slice(0, 80),
          hook: thought.trim(),
          status: 'raw',
          format_type: 'other',
          brainstorm_id: currentId ?? null,
        })
        destination = 'Ideas'
      }
      toast(`Routed to ${destination}`, 'success')
      setResult(null)
      setThought('')
      refreshList()
    } catch (e: any) {
      toast(e?.message || 'Routing failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveAsIdea = async () => {
    if (!result || saving) return
    setSaving(true)
    try {
      const res = await api()?.ideaSave({
        title: result.suggested_title || thought.trim().slice(0, 80),
        hook: thought.trim(),
        status: 'raw',
        format_type: result.format_type,
        niche: result.niche_hint || null,
        brainstorm_id: currentId ?? null,
      })
      if (res?.ok) {
        toast('Idea saved to your backlog')
        setResult(null)
        setThought('')
        currentIdRef.current = null
        setCurrentId(null)
        refreshList()
      } else {
        setError(res?.error || 'Failed to save the idea.')
      }
    } catch (e: any) {
      setError(e?.message || 'Unexpected error while saving the idea.')
    } finally {
      setSaving(false)
    }
  }

  const askAi = async () => {
    if (asking) return
    setAsking(true)
    try {
      const res = await api()?.synthesizeIdeas({ note: thought.trim() || result?.suggested_title, count: 3 })
      if (res?.ok) {
        toast('AI expanded your thought into 3 new ideas')
        onNavigate('ideas')
      } else {
        toast(res?.error || 'AI expansion failed', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'AI expansion failed', 'error')
    } finally {
      setAsking(false)
    }
  }

  const loadSummary = async () => {
    setSummaryLoading(true)
    try {
      const res = await api()?.brainstormSummary()
      if (res?.ok && Array.isArray(res.summary)) setSummary(res.summary)
      else setError(res?.error || 'Session summary is unavailable right now.')
    } catch (e: any) {
      setError(e?.message || 'Unexpected error while loading the summary.')
    } finally {
      setSummaryLoading(false)
    }
  }

  const loadBrainstorm = (b: any) => {
    currentIdRef.current = b.id ?? null
    setCurrentId(b.id ?? null)
    setThought(b.thought || '')
    setResult(
      b.category
        ? { category: b.category, format_type: b.format_type, niche_hint: b.niche_hint, suggested_title: b.suggested_title, reason: b.reason }
        : null,
    )
    setSummary(null)
  }

  const refreshList = async () => {
    try {
      const list = await api()?.brainstormList()
      setBrainstorms(Array.isArray(list) ? list : [])
    } catch {
      /* ignore */
    }
  }

  const newBrainstorm = () => {
    currentIdRef.current = null
    setCurrentId(null)
    setThought('')
    setResult(null)
    setSummary(null)
    setError(null)
  }

  const removeBrainstorm = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api()?.brainstormDelete(id)
      if (currentId === id) newBrainstorm()
      refreshList()
    } catch {
      toast('Could not delete brainstorm', 'error')
    }
  }

  const sendToExternalAI = async () => {
    setExternalSending(true)
    try {
      const res = await api()?.externalBuildClassifyPrompt({ templateIds: selectedTemplates, frameMode })
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
      const res = await api()?.externalBuildClassifyPrompt({ templateIds: selectedTemplates, frameMode })
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
      const res = await api()?.externalImportClassify({ rawJson: externalPaste.trim() })
      if (res?.ok) {
        toast(`Imported: ${res.category || 'classified'}`)
        setResult(res)
        setExternalMode(false)
        setExternalPaste('')
        setExternalPrompt('')
        refreshList()
      } else {
        toast(res?.error || 'Import failed', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Import failed', 'error')
    } finally {
      setExternalImporting(false)
    }
  }

  const summaryItem = (item: any, i: number) => {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object') return String(item.line ?? item.text ?? item.title ?? JSON.stringify(item))
    return String(item)
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        label="Content Engine / 01"
        title="Brainstorm"
        action={
          <div className="flex gap-2">
            <GhostButton onClick={newBrainstorm} disabled={!thought && !currentId}>
              <FilePlus2 size={13} />
              New
            </GhostButton>
            <GhostButton onClick={loadSummary} disabled={summaryLoading}>
              <ListChecks size={13} />
              {summaryLoading ? 'Loading…' : 'Session Summary'}
            </GhostButton>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Card>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[10px] tracking-wider text-zinc-500 uppercase">Dump your thought…</div>
                <CopyPromptButton fieldKey="brainstorm-idea" />
              </div>
              {currentId != null && <div className="text-[9px] text-zinc-600">Autosaved · #{currentId}</div>}
            </div>
            <TextArea
              rows={4}
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              placeholder="A video idea, a question, a half-formed thought — the AI will sort out whether it's content gold or a general thought."
            />
            <div className="mt-3">
              <TemplateSelector selected={selectedTemplates} onChange={setSelectedTemplates} frameMode={frameMode} onFrameModeChange={setFrameMode} />
            </div>
            <div className="mt-3">
              <AmberButton onClick={classify} disabled={!thought.trim() || classifying}>
                {classifying ? <Zap size={13} className="animate-pulse" /> : <ArrowRight size={13} />}
                {classifying ? 'AI is thinking…' : 'Classify'}
              </AmberButton>
              <GhostButton onClick={copyPromptOnly} disabled={externalSending} className="ml-2">
                <ClipboardPaste size={13} /> Copy Prompt
              </GhostButton>
              <GhostButton onClick={sendToExternalAI} disabled={externalSending} className="ml-1">
                {externalSending ? <Zap size={13} className="animate-pulse" /> : <ExternalLink size={13} />}
                {externalSending ? 'Building…' : 'Send to External AI'}
              </GhostButton>
            </div>
          </Card>

          {classifying && <LoadingBlock label="AI is thinking…" />}

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
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[9px] tracking-wider text-zinc-500 uppercase">Prompt — edit before copying</span>
                    <button
                      onClick={async () => { await navigator.clipboard.writeText(externalPrompt); setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 2000) }}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-white/[0.06]"
                    >
                      {copiedPrompt ? <Check size={10} /> : <ClipboardPaste size={10} />}
                      {copiedPrompt ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <TextArea
                    rows={8}
                    value={externalPrompt}
                    onChange={(e) => setExternalPrompt(e.target.value)}
                    className="font-mono text-[11px]"
                  />
                </div>
              )}
              <TextArea
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

          {error && <ErrorState message={error} onRetry={classify} />}

          {!classifying && !error && !result && !summary && (
            <EmptyState
              icon={<BrainCircuit size={28} />}
              title="Your thoughts, classified"
              hint="Dump anything above and the AI decides: content idea worth pursuing, or just a general thought to keep out of your backlog."
            />
          )}

          {result && !classifying && (
            <Card className="border-[#f5c518]/20">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {result.category === 'content_idea' && <Chip className="border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]"><Sparkles size={10} /> Content idea</Chip>}
                {result.category === 'framework_update' && <Chip className="border-violet-500/25 bg-violet-500/10 text-violet-400"><Layers size={10} /> Framework update</Chip>}
                {result.category === 'system_improvement' && <Chip className="border-cyan-500/25 bg-cyan-500/10 text-cyan-400"><Zap size={10} /> System improvement</Chip>}
                {result.category === 'analytics' && <Chip className="border-blue-500/25 bg-blue-500/10 text-blue-400"><BarChart3 size={10} /> Analytics insight</Chip>}
                {result.category === 'general_thought' && <Chip className="border-zinc-500/20 bg-zinc-500/10 text-zinc-400"><Lightbulb size={10} /> General thought</Chip>}
                {result.format_type && <Chip>Format: {result.format_type}</Chip>}
                {result.niche_hint && <Chip>Niche hint: {result.niche_hint}</Chip>}
              </div>
              {result.reason && <p className="mb-3 text-xs leading-relaxed text-zinc-300">{result.reason}</p>}
              {result.suggested_title && (
                <div className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                  <div className="text-[9px] tracking-wider text-zinc-500 uppercase">Suggested title</div>
                  <div className="mt-0.5 text-sm font-medium text-zinc-100">“{result.suggested_title}”</div>
                </div>
              )}
              <div className="flex gap-2">
                <AmberButton onClick={confirmAndRoute} disabled={saving}>
                  <Check size={13} />
                  {saving ? 'Routing…' : 'Confirm & Route'}
                </AmberButton>
                <GhostButton onClick={() => setShowReclassify(!showReclassify)}>
                  <RefreshCw size={13} /> Reclassify
                </GhostButton>
                <GhostButton onClick={askAi} disabled={asking}>
                  <Zap size={13} />
                  {asking ? 'Asking…' : 'Ask AI'}
                </GhostButton>
              </div>
              {showReclassify && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5">
                  <select
                    value={result.category || ''}
                    onChange={(e) => setResult({ ...result, category: e.target.value })}
                    className="h-7 rounded-md border border-white/[0.08] bg-[#1a1a20] px-2 text-[11px] text-zinc-300 outline-none"
                  >
                    <option value="content_idea">Content Idea</option>
                    <option value="framework_update">Framework Update</option>
                    <option value="system_improvement">System Improvement</option>
                    <option value="analytics">Analytics Insight</option>
                    <option value="general_thought">General Thought</option>
                  </select>
                  <GhostButton onClick={() => setShowReclassify(false)} className="h-6 text-[10px]">Done</GhostButton>
                </div>
              )}
            </Card>
          )}

          {summary && (
            <Card>
              <div className="mb-2 text-[10px] font-semibold tracking-wider text-[#f5c518] uppercase">Session Summary</div>
              {summary.length === 0 ? (
                <div className="text-xs text-zinc-500">Nothing summarized yet — classify a few thoughts first.</div>
              ) : (
                <ul className="space-y-1.5">
                  {summary.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#f5c518]" />
                      <span className="break-words">{summaryItem(item, i)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        {/* Saved brainstorms */}
        <Card className="self-start">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            <History size={12} /> Saved brainstorms
          </div>
          {brainstorms.length === 0 ? (
            <div className="text-xs text-zinc-600">Your typed thoughts autosave here. Click one to resume.</div>
          ) : (
            <ul className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
              {brainstorms.map((b) => (
                <li
                  key={b.id}
                  onClick={() => loadBrainstorm(b)}
                  className={cn(
                    'group flex cursor-pointer items-start gap-2 rounded-lg border p-2 transition-colors',
                    b.id === currentId ? 'border-[#f5c518]/30 bg-[#f5c518]/5' : 'border-white/[0.06] hover:bg-white/[0.04]',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-xs text-zinc-200">{b.thought || '(empty)'}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Chip className={b.category === 'content_idea' ? 'bg-[#f5c518]/10 text-[#f5c518]' : 'bg-zinc-500/10 text-zinc-400'}>
                        {b.category === 'content_idea' ? 'idea' : 'thought'}
                      </Chip>
                      {b.idea_id != null && <span className="text-[9px] text-emerald-400">→ idea</span>}
                    </div>
                  </div>
                  <button
                    onClick={(e) => removeBrainstorm(b.id, e)}
                    className="shrink-0 rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    aria-label="Delete brainstorm"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  )
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
