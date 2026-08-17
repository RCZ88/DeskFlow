import { useState } from 'react'
import { Sparkles, BrainCircuit, Save, ArrowRight, ListChecks, Zap } from 'lucide-react'
import { AmberButton, GhostButton, Card, Chip, EmptyState, ErrorState, LoadingBlock, SectionHeader, TextArea, toast } from './ui'

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
      })
      if (res?.ok) {
        toast('Idea saved to your backlog')
        setResult(null)
        setThought('')
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
          <GhostButton onClick={loadSummary} disabled={summaryLoading}>
            <ListChecks size={13} />
            {summaryLoading ? 'Loading…' : 'Session Summary'}
          </GhostButton>
        }
      />
      <Card>
        <div className="mb-1.5 text-[10px] tracking-wider text-zinc-500 uppercase">Dump your thought…</div>
        <TextArea
          rows={4}
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          placeholder="A video idea, a question, a half-formed thought — the AI will sort out whether it's content gold or a general thought."
        />
        <div className="mt-3">
          <AmberButton onClick={classify} disabled={!thought.trim() || classifying}>
            {classifying ? <Zap size={13} className="animate-pulse" /> : <ArrowRight size={13} />}
            {classifying ? 'AI is thinking…' : 'Classify'}
          </AmberButton>
        </div>
      </Card>

      {classifying && <LoadingBlock label="AI is thinking…" />}

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
            {result.category === 'content_idea' ? (
              <Chip className="border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]">
                <Sparkles size={10} /> Content idea
              </Chip>
            ) : (
              <Chip className="border-zinc-500/20 bg-zinc-500/10 text-zinc-400">General thought</Chip>
            )}
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
          {result.category === 'content_idea' && (
            <div className="flex gap-2">
              <AmberButton onClick={saveAsIdea} disabled={saving}>
                <Save size={13} />
                {saving ? 'Saving…' : 'Save as Idea'}
              </AmberButton>
              <GhostButton onClick={askAi} disabled={asking}>
                <Zap size={13} />
                {asking ? 'Asking…' : 'Ask AI'}
              </GhostButton>
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
    </section>
  )
}
