import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, BrainCircuit, ArrowRight, Zap, RefreshCw, FilePlus2, ExternalLink, ClipboardPaste, Check } from 'lucide-react'
import { AmberButton, CopyPromptButton, GhostButton, Card, Chip, EmptyState, ErrorState, LoadingBlock, SectionHeader, TextArea, toast } from './ui'
import { TemplateSelector } from './TemplateSelector'
import { BlurFade, BentoCard } from './ui-laminar'

const api = () => (window as any).deskflowAPI?.contentEngine

export function BrainstormView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [thought, setThought] = useState('')
  const [classifying, setClassifying] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const classify = async () => {
    if (!thought.trim() || classifying) return
    setClassifying(true); setError(null); setResult(null)
    try {
      const res = await api()?.brainstormClassify({ thought: thought.trim() })
      if (res?.ok && res.category) setResult(res)
      else setError(res?.error || 'Classification failed')
    } catch (e: any) { setError(e?.message || 'Unexpected error') }
    finally { setClassifying(false) }
  }

  const confirmAndRoute = async () => {
    if (!result) return
    let destination = ''
    if (result.category === 'content_idea') {
      await api()?.ideaSave({ title: result.suggested_title || thought.trim().slice(0, 80), hook: thought.trim(), status: 'raw', format_type: result.format_type, niche: result.niche_hint || null })
      destination = 'Ideas'
    } else if (result.category === 'framework_update') {
      await api()?.frameworkSave({ name: result.suggested_title || thought.trim().slice(0, 40), rules: [{ id: 'rule-1', rule: thought.trim() }], description: result.reason || '' })
      destination = 'Frameworks'
    } else if (result.category === 'analytics') {
      await api()?.lessonSave({ lesson: thought.trim(), applies_to: 'general', confidence: 0.7, status: 'active' })
      destination = 'Lessons'
    } else {
      await api()?.ideaSave({ title: thought.trim().slice(0, 80), hook: thought.trim(), status: 'raw', format_type: 'other' })
      destination = 'Ideas'
    }
    toast(`Routed to ${destination}`, 'success')
    setResult(null); setThought('')
    if (destination === 'Ideas') onNavigate('ideas')
  }

  return (
    <section className="space-y-6 p-6">
      <SectionHeader label="Content Engine / 01" title="Brainstorm" icon={<BrainCircuit size={14} className="text-violet-400" />} />

      <BentoCard>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[10px] tracking-wider text-zinc-500 uppercase">Dump your thought…</span>
          <CopyPromptButton fieldKey="brainstorm-idea" />
        </div>
        <TextArea rows={4} value={thought} onChange={(e) => setThought(e.target.value)} placeholder="A video idea, a question, a half-formed thought — the AI will sort out whether it's content gold or a general thought." />
        <div className="mt-3">
          <AmberButton onClick={classify} disabled={!thought.trim() || classifying}>
            {classifying ? <Zap size={13} className="animate-pulse" /> : <ArrowRight size={13} />}
            {classifying ? 'AI is thinking…' : 'Classify'}
          </AmberButton>
        </div>
      </BentoCard>

      {classifying && <LoadingBlock label="AI is thinking…" />}
      {error && <ErrorState message={error} onRetry={classify} />}

      {!classifying && !error && !result && (
        <EmptyState icon={<BrainCircuit size={28} />} title="Your thoughts, classified" hint="Dump anything above and the AI decides: content idea worth pursuing, or just a general thought." />
      )}

      {result && !classifying && (
        <BentoCard className="border-amber-500/20">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {result.category === 'content_idea' && <Chip className="border-amber-500/25 bg-amber-500/10 text-amber-400"><Sparkles size={10} /> Content idea</Chip>}
            {result.category === 'framework_update' && <Chip className="border-violet-500/25 bg-violet-500/10 text-violet-400">Framework update</Chip>}
            {result.category === 'analytics' && <Chip className="border-cyan-500/25 bg-cyan-500/10 text-cyan-400">Analytics insight</Chip>}
            {result.category === 'general_thought' && <Chip className="border-zinc-500/20 bg-zinc-500/10 text-zinc-400">General thought</Chip>}
            {result.format_type && <Chip>Format: {result.format_type}</Chip>}
            {result.niche_hint && <Chip>Niche hint: {result.niche_hint}</Chip>}
          </div>
          {result.reason && <p className="mb-3 text-xs leading-relaxed text-zinc-300">{result.reason}</p>}
          {result.suggested_title && (
            <div className="mb-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
              <div className="text-[9px] tracking-wider text-zinc-500 uppercase">Suggested title</div>
              <div className="mt-0.5 text-sm font-medium text-zinc-100">"{result.suggested_title}"</div>
            </div>
          )}
          <div className="flex gap-2">
            <AmberButton onClick={confirmAndRoute}><ArrowRight size={13} /> Confirm & Route</AmberButton>
            <GhostButton onClick={() => setResult(null)}><RefreshCw size={13} /> Reclassify</GhostButton>
          </div>
        </BentoCard>
      )}
    </section>
  )
}
