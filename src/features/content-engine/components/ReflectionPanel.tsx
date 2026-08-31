import { useEffect, useState } from 'react'
import { Brain, CheckCircle2, Lightbulb, MessageSquareQuote, Sparkles, X, Zap } from 'lucide-react'
import type { VideoReflection, ReflectionAnalysis } from '@/types/deskflow-api'
import { AmberButton, Card, Chip, CopyPromptButton, EmptyState, GhostButton, LoadingBlock, SectionHeader, TextArea, toast } from './ui'
import { cn } from '@/lib/utils'

const api = () => (window as any).deskflowAPI?.contentEngine

export function ReflectionPanel({ episodeId, onLessonSaved }: { episodeId: number; onLessonSaved?: () => void }) {
  const [reflections, setReflections] = useState<VideoReflection[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeAnalysis, setActiveAnalysis] = useState<ReflectionAnalysis | null>(null)
  const [activeReflectionId, setActiveReflectionId] = useState<number | undefined>(undefined)

  const load = async () => {
    setLoading(true)
    try {
      const list = await api()?.reflectionGet({ episodeId })
      setReflections(Array.isArray(list) ? list : [])
    } catch { /* empty */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [episodeId])

  const save = async () => {
    if (saving || !text.trim()) return
    setSaving(true)
    try {
      const res = await api()?.reflectionSave({ episodeId, reflectionText: text.trim() })
      if (res?.ok) {
        toast('Reflection saved')
        setText('')
        await load()
      } else {
        toast(res?.error || 'Failed to save', 'error')
      }
    } catch (e: any) { toast(e?.message || 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const analyze = async (reflection: VideoReflection) => {
    if (analyzing) return
    setAnalyzing(true)
    setActiveReflectionId(reflection.id)
    setActiveAnalysis(null)
    try {
      const res = await api()?.reflectionAnalyze({ reflectionId: reflection.id, episodeId })
      if (res?.ok && res.analysis) {
        setActiveAnalysis(res.analysis)
      } else {
        toast(res?.error || 'Analysis failed', 'error')
      }
    } catch (e: any) { toast(e?.message || 'Analysis failed', 'error') }
    finally { setAnalyzing(false) }
  }

  const dismissAnalysis = () => {
    setActiveAnalysis(null)
    setActiveReflectionId(undefined)
  }

  const formatFitColor = (verdict: string) =>
    verdict === 'SUITS' ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10' : 'text-rose-400 border-rose-500/25 bg-rose-500/10'

  return (
    <section className="space-y-5">
      <SectionHeader
        label="HUMAN REFLECTION"
        title="How did this video feel?"
        action={<span className="text-[11px] text-zinc-500">{reflections.length} reflection{reflections.length !== 1 ? 's' : ''}</span>}
      />

      {/* New reflection input */}
      <Card>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] tracking-wider text-zinc-500 uppercase">Write your reflection</span>
          <CopyPromptButton fieldKey="reflection" />
        </div>
        <TextArea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your reflection — what felt right, what surprised you, what the data says vs. your gut…"
          className="mb-3"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-600">{text.length} characters</span>
          <AmberButton onClick={save} disabled={saving || !text.trim()}>
            <MessageSquareQuote size={13} />
            {saving ? 'Saving…' : 'Save Reflection'}
          </AmberButton>
        </div>
      </Card>

      {/* Existing reflections */}
      {loading && <LoadingBlock label="Loading reflections…" />}

      {!loading && reflections.length === 0 && !text && (
        <EmptyState
          icon={<MessageSquareQuote size={28} />}
          title="No reflections yet"
          hint="Write how this episode felt — your intuitions are data the AI can learn from."
        />
      )}

      {!loading && reflections.length > 0 && (
        <div className="space-y-4">
          {reflections.map((r) => (
            <Card key={r.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="flex-1 text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">{r.reflection_text}</p>
                {r.created_at && (
                  <span className="shrink-0 text-[10px] text-zinc-600">{new Date(r.created_at).toLocaleDateString()}</span>
                )}
              </div>

              {/* Analyze button */}
              {r.id && !activeAnalysis && (
                <div className="flex items-center gap-2">
                  <GhostButton
                    className="h-7 px-2.5 text-[11px]"
                    onClick={() => analyze(r)}
                    disabled={analyzing}
                  >
                    <Brain size={12} />
                    {analyzing && activeReflectionId === r.id ? 'Analyzing…' : 'Analyze with AI'}
                  </GhostButton>
                </div>
              )}

              {/* Analysis display */}
              {activeReflectionId === r.id && activeAnalysis && (
                <div className="space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-violet-400 uppercase">
                      <Sparkles size={12} />
                      AI ANALYSIS
                    </div>
                    <GhostButton className="h-6 px-1.5 text-[10px]" onClick={dismissAnalysis}>
                      <X size={11} /> Dismiss
                    </GhostButton>
                  </div>

                  {/* Characteristics */}
                  {activeAnalysis.characteristics.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[9px] tracking-wider text-zinc-500 uppercase">Characteristics</div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeAnalysis.characteristics.map((c, i) => (
                          <Chip key={i} className="bg-violet-500/10 border-violet-500/20 text-violet-300">
                            {c.name}: {c.value}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Intuitions */}
                  {activeAnalysis.intuitions.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[9px] tracking-wider text-zinc-500 uppercase">Your Intuitions</div>
                      <ul className="space-y-1">
                        {activeAnalysis.intuitions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
                            <Lightbulb size={11} className="mt-0.5 shrink-0 text-[#f5c518]" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Contradictions */}
                  {activeAnalysis.contradictions.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[9px] tracking-wider text-zinc-500 uppercase">Contradictions (Gut ≠ Data)</div>
                      <div className="space-y-2">
                        {activeAnalysis.contradictions.map((c, i) => (
                          <div key={i} className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Zap size={11} className="text-[#f5c518]" />
                              <span className="text-[10px] font-semibold text-amber-400">Gut: {c.gut}</span>
                            </div>
                            <div className="ml-5 text-[11px] text-zinc-400">Data: {c.data}</div>
                            <div className="ml-5 mt-1 text-[11px] text-emerald-400">Resolution: {c.resolution}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Format Fit */}
                  {activeAnalysis.format_fit && (
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <CheckCircle2 size={12} className={activeAnalysis.format_fit.verdict === 'SUITS' ? 'text-emerald-400' : 'text-rose-400'} />
                        <span className="text-[10px] font-semibold tracking-wider uppercase">
                          Format Fit
                        </span>
                        <span className={cn('rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase', formatFitColor(activeAnalysis.format_fit.verdict))}>
                          {activeAnalysis.format_fit.verdict}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        <span className="text-zinc-300 font-medium">{activeAnalysis.format_fit.format}</span> — {activeAnalysis.format_fit.reasoning}
                      </div>
                    </div>
                  )}

                  {/* Extracted Pattern */}
                  {activeAnalysis.extracted_pattern && (
                    <div className="rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/[0.04] p-3">
                      <div className="mb-1 text-[9px] font-semibold tracking-wider text-[#00d4ff] uppercase">Extracted Pattern</div>
                      <p className="text-xs leading-relaxed text-zinc-300 italic">"{activeAnalysis.extracted_pattern}"</p>
                    </div>
                  )}

                  {/* Suggested Lesson */}
                  {activeAnalysis.suggested_lesson && (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
                      <div className="min-w-0">
                        <div className="mb-0.5 text-[9px] font-semibold tracking-wider text-emerald-400 uppercase">Suggested Lesson</div>
                        <p className="text-xs text-zinc-300">{activeAnalysis.suggested_lesson.lesson}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">Applies to: {activeAnalysis.suggested_lesson.applies_to} · Confidence: {Math.round(activeAnalysis.suggested_lesson.confidence * 100)}%</p>
                      </div>
                      <GhostButton className="ml-3 shrink-0 h-7 px-2 text-[11px]" onClick={() => {
                        toast('Lesson saved from analysis')
                        onLessonSaved?.()
                      }}>
                        <Lightbulb size={12} /> Save as Lesson
                      </GhostButton>
                    </div>
                  )}
                </div>
              )}

              {/* Loading state for analysis */}
              {activeReflectionId === r.id && analyzing && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] py-6">
                  <div className="h-3 w-3 rounded-full bg-violet-400 animate-pulse" />
                  <span className="text-xs text-zinc-400">AI is analyzing your reflection…</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
