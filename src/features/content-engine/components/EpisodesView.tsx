import { useEffect, useState } from 'react'
import { BarChart3, Bot, CheckCircle2, ChevronLeft, Clapperboard, FileSearch, FileText, Film, Plus, RefreshCw, Search, ShieldCheck, ShieldX, Sparkles, Trash2, TrendingUp, Wand2, X } from 'lucide-react'
import type { ScriptFrame, ScoringSchemeInfo, FrameScoreBreakdown } from '@/types/deskflow-api'
import { AmberButton, Card, Chip, ConfirmIconButton, EmptyState, ErrorState, FieldLabel, GhostButton, LoadingBlock, SectionHeader, SelectInput, StatusChip, TextArea, TextInput, toast } from './ui'
import { RetentionPanel } from './RetentionPanel'
import { RetentionCurveChart } from './SvgRetentionChart'
import { AnalyticsBody } from './AnalyticsView'
import { ScriptProofCard } from './ScriptProofCard'
import { EpisodeScoreSummary } from './EpisodeScoreSummary'
import { PhaseStepper } from './PhaseStepper'
import { GreenLightPanel } from './GreenLightPanel'
import { CaptureView } from './CaptureView'
import { AssembleView } from './AssembleView'
import { LearnView } from './LearnView'
import { cn } from '@/lib/utils'

const api = () => (window as any).deskflowAPI?.contentEngine

const TABS = [
  { id: 'script', label: 'Script', Icon: FileText },
  { id: 'seo', label: 'SEO', Icon: FileSearch },
  { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { id: 'assets', label: 'Assets', Icon: Film },
  { id: 'metrics', label: 'Metrics', Icon: TrendingUp },
] as const

type TabId = (typeof TABS)[number]['id']

const FRAME_TYPE_COLORS: Record<string, string> = {
  hook: 'border-[#f5c518]/25 bg-[#f5c518]/10 text-[#f5c518]',
  value: 'border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff]',
  transition: 'border-violet-500/25 bg-violet-500/10 text-violet-400',
  call_to_action: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  visual_only: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400',
}

function fmtSec(s?: number | null) {
  if (s == null || !Number.isFinite(s)) return '—'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function frameCurve(retention: any): Array<{ t: number; pct: number }> | null {
  if (!retention) return null
  if (Array.isArray(retention.curve)) return retention.curve.filter((p: any) => p && typeof p.t === 'number' && typeof p.pct === 'number')
  if (Array.isArray(retention.csv)) return retention.csv.map((v: any, i: number) => ({ t: i, pct: Number(v) }))
  return null
}

function FrameCard({ frame, index, epId, onRegenerated }: { frame: any; index: number; epId: number; onRegenerated: (frame: any) => void }) {
  const [regenMode, setRegenMode] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [regenLoading, setRegenLoading] = useState(false)
  const [proving, setProving] = useState(false)
  const [proveResult, setProveResult] = useState<any>(null)
  const frameType = frame.frame_type || 'value'
  const curve = frameCurve(frame.retention)

  const regenerate = async () => {
    if (regenLoading) return
    setRegenLoading(true)
    try {
      const res = await api()?.scriptRegenerateLine({ episodeId: epId, frameIndex: index, instruction: instruction.trim() })
      if (res?.ok) {
        const next = res.frame ?? res.line ?? res
        toast(`Frame ${index + 1} regenerated`)
        onRegenerated(next)
        setRegenMode(false)
        setInstruction('')
      } else {
        toast(res?.error || 'Regeneration failed', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Regeneration failed', 'error')
    } finally {
      setRegenLoading(false)
    }
  }

  const prove = async () => {
    if (proving) return
    setProving(true)
    setProveResult(null)
    try {
      const res = await api()?.validateScriptEvidence({ episodeId: epId })
      const list = Array.isArray(res?.results) ? res.results : Array.isArray(res?.validations) ? res.validations : []
      const mine = list.find((r: any) => (r.frame_index ?? r.frameIndex) === index) ?? list[index]
      setProveResult(mine ? { pass: mine.pass ?? mine.valid, reasons: mine.reasons ?? mine.reason, score: mine.score, evidence: mine.evidence } : null)
      if (!mine) toast('No per-frame verdict returned — check the batch result below', 'error')
    } catch (e: any) {
      toast(e?.message || 'Validation failed', 'error')
    } finally {
      setProving(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">{index + 1}</span>
          <span className="font-mono text-[10px] text-zinc-500">{fmtSec(frame.duration_seconds ?? frame.duration)}</span>
          <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase', FRAME_TYPE_COLORS[frameType] || FRAME_TYPE_COLORS.value)}>
            {frameType}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <GhostButton className="h-6 px-1.5 text-[10px]" onClick={() => setRegenMode((v) => !v)}>
            <RefreshCw size={11} /> {regenMode ? 'Cancel' : 'Regenerate'}
          </GhostButton>
          <GhostButton className="h-6 px-1.5 text-[10px]" onClick={prove} disabled={proving}>
            <Bot size={11} /> {proving ? '…' : 'AI Prove it'}
          </GhostButton>
        </div>
      </div>

      {frame.visual && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
          <span className="text-[9px] font-medium tracking-wider text-[#00d4ff] uppercase">Visual</span>
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">{frame.visual}</p>
        </div>
      )}

      <p className="text-sm leading-relaxed text-zinc-100">{frame.text}</p>

      {regenMode && (
        <div className="rounded-lg border border-[#f5c518]/20 bg-[#f5c518]/[0.04] p-3">
          <FieldLabel>Regeneration instruction</FieldLabel>
          <TextArea rows={2} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Make it punchier, cut 3 words, open with a question…" />
          <div className="mt-2">
            <AmberButton onClick={regenerate} disabled={regenLoading || !instruction.trim()}>
              <Wand2 size={13} /> {regenLoading ? 'Rewriting…' : 'Rewrite Frame'}
            </AmberButton>
          </div>
        </div>
      )}

      {proveResult && (
        <div className={cn(
          'rounded-lg border p-3',
          proveResult.pass ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-rose-500/20 bg-rose-500/[0.04]',
        )}>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase">
            {proveResult.pass ? <CheckCircle2 size={12} className="text-emerald-400" /> : <X size={12} className="text-rose-400" />}
            <span className={proveResult.pass ? 'text-emerald-400' : 'text-rose-400'}>
              {proveResult.pass ? 'Evidence passes' : 'Evidence fails'}
            </span>
            {proveResult.score != null && <span className="ml-auto font-mono text-zinc-500">{Math.round(proveResult.score * 100)}%</span>}
          </div>
          {Array.isArray(proveResult.reasons) && proveResult.reasons.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {proveResult.reasons.map((r: any, i: number) => (
                <li key={i} className="text-[11px] text-zinc-400">{typeof r === 'string' ? r : String(r?.reason ?? r?.note ?? JSON.stringify(r))}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <RetentionPanel retention={frame.retention} />

      {curve && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="mb-1 text-[9px] tracking-wider text-zinc-500 uppercase">Expected retention</div>
          <RetentionCurveChart data={curve} height={110} />
        </div>
      )}
    </Card>
  )
}
function EpisodeDetail({ ep, onBack, onChanged }: { ep: any; onBack: () => void; onChanged: () => void }) {
  const [tab, setTab] = useState<TabId>('script')
  const [frames, setFrames] = useState<ScriptFrame[]>(Array.isArray(ep.script?.frames) ? ep.script.frames : [])
  const [scriptText, setScriptText] = useState<string>(typeof ep.script === 'string' ? ep.script : '')
  const [themes, setThemes] = useState<any[]>([])
  const [themeId, setThemeId] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validateResults, setValidateResults] = useState<any[] | null>(null)
  const [seo, setSeo] = useState<any>(ep.seo ?? null)
  const [injecting, setInjecting] = useState(false)
  const [override, setOverride] = useState(!!ep.gate_override)
  const [savingOverride, setSavingOverride] = useState(false)
  const [title, setTitle] = useState(ep.title || '')

  // Phase pipeline state
  const [currentPhase, setCurrentPhase] = useState<string>(ep.phase || ep.status || 'draft')
  const [takeCount, setTakeCount] = useState(0)
  const [evaluatedCount, setEvaluatedCount] = useState(0)

  // Scoring state
  const [scoringScheme, setScoringScheme] = useState<ScoringSchemeInfo | null>(null)
  const [scoringBreakdown, setScoringBreakdown] = useState<FrameScoreBreakdown[]>([])
  const [scoringAverage, setScoringAverage] = useState(0)
  const [scoringThreshold, setScoringThreshold] = useState(0.6)
  const [scoringVersion, setScoringVersion] = useState('1.0.0')
  const [scoringLoading, setScoringLoading] = useState(false)
  const [rejectedFrames, setRejectedFrames] = useState<Set<number>>(new Set())

  useEffect(() => {
    const loadThemes = async () => {
      try {
        const list = await api()?.themesGetAll()
        setThemes(Array.isArray(list) ? list : [])
      } catch { /* themes are optional */ }
    }
    loadThemes()
  }, [])

  // Load take count for phase stepper
  useEffect(() => {
    const loadTakes = async () => {
      try {
        const list = await api()?.takesList({ episodeId: ep.id })
        const arr = Array.isArray(list) ? list : []
        setTakeCount(arr.length)
        setEvaluatedCount(arr.filter((t: any) => t.status === 'evaluated').length)
      } catch { /* optional */ }
    }
    loadTakes()
  }, [ep.id])

  const handlePhaseChange = (phase: string) => {
    setCurrentPhase(phase)
    onChanged()
  }

  const handlePhaseClick = (phase: string) => {
    setCurrentPhase(phase)
  }

  // Load scoring data when frames change
  useEffect(() => {
    if (frames.length === 0) { setScoringScheme(null); setScoringBreakdown([]); return }
    let cancelled = false
    const loadScoring = async () => {
      setScoringLoading(true)
      try {
        const res = await api()?.scoringCurrent({ episodeId: ep.id })
        if (cancelled) return
        if (res?.ok) {
          setScoringScheme(res.scheme ?? null)
          setScoringBreakdown(Array.isArray(res.breakdown) ? res.breakdown : [])
          setScoringAverage(res.average ?? 0)
          setScoringThreshold(res.threshold ?? 0.6)
          setScoringVersion(res.version ?? '1.0.0')
        }
      } catch { /* scoring is optional */ }
      finally { if (!cancelled) setScoringLoading(false) }
    }
    loadScoring()
    return () => { cancelled = true }
  }, [ep.id, frames.length])

  const saveTitle = async () => {
    if (!title.trim()) return
    try {
      const res = await api()?.episodeSave({ ...ep, title: title.trim() })
      if (res?.ok) { toast('Episode renamed'); onChanged() }
      else toast(res?.error || 'Failed to rename episode', 'error')
    } catch (e: any) { toast(e?.message || 'Failed to rename episode', 'error') }
  }

  const applyTheme = async () => {
    if (!themeId) return
    try {
      const res = await api()?.themesApply({ themeId, episodeId: ep.id })
      if (res?.ok) { toast('Theme applied to episode'); onChanged() }
      else toast(res?.error || 'Failed to apply theme', 'error')
    } catch (e: any) { toast(e?.message || 'Failed to apply theme', 'error') }
  }

  const generate = async () => {
    if (generating) return
    setGenerating(true)
    try {
      const res = await api()?.scriptGenerate({ episodeId: ep.id })
      if (res?.ok) {
        if (Array.isArray(res.frames)) setFrames(res.frames)
        if (typeof res.script === 'string') setScriptText(res.script)
        toast('Script generated')
        onChanged()
      } else {
        toast(res?.error || 'Script generation failed', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Script generation failed', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const validateBatch = async () => {
    if (validating) return
    setValidating(true)
    setValidateResults(null)
    try {
      const res = await api()?.validateScriptEvidence({ episodeId: ep.id })
      const list = Array.isArray(res?.results) ? res.results : Array.isArray(res?.validations) ? res.validations : null
      setValidateResults(list)
      if (!list) toast('Validation returned nothing — is the script generated?', 'error')
      else {
        const fails = list.filter((r: any) => !(r.pass ?? r.valid))
        toast(fails.length === 0 ? 'All frames pass evidence checks' : `${fails.length} frame(s) need attention`, fails.length === 0 ? 'success' : 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Validation failed', 'error')
    } finally {
      setValidating(false)
    }
  }

  const toggleOverride = async (v: boolean) => {
    if (savingOverride) return
    setSavingOverride(true)
    try {
      const res = await api()?.gateOverride({ episodeId: ep.id, override: v })
      if (res?.ok) { setOverride(v); toast(v ? 'Gates overridden — episode can proceed' : 'Gate override removed'); onChanged() }
      else toast(res?.error || 'Failed to update gate override', 'error')
    } catch (e: any) {
      toast(e?.message || 'Failed to update gate override', 'error')
    } finally {
      setSavingOverride(false)
    }
  }

  const inject = async () => {
    if (injecting) return
    setInjecting(true)
    try {
      const res = await api()?.injectSeo({ episodeId: ep.id, niche: ep.niche ?? undefined })
      if (res?.ok) { setSeo(res.seo ?? res); toast('SEO injected') }
      else toast(res?.error || 'SEO injection failed', 'error')
    } catch (e: any) {
      toast(e?.message || 'SEO injection failed', 'error')
    } finally {
      setInjecting(false)
    }
  }

  const gates = ep.gates ?? (Array.isArray(validateResults) ? null : null)
  const gateItems = gates ? [
    { key: 'scroll_stop', label: 'Scroll Stop', check: gates.scroll_stop },
    { key: 'hard_cut', label: 'Hard Cut', check: gates.hard_cut },
    { key: 'asset_ready', label: 'Asset Ready', check: gates.asset_ready },
  ] : []

  const seoPositions = seo ? [
    { key: 'title', label: 'Title', value: seo.title },
    { key: 'first_line', label: 'First Line', value: seo.first_line },
    { key: 'text_overlay', label: 'Text Overlay', value: seo.text_overlay },
    { key: 'caption', label: 'Caption', value: seo.caption },
  ] : []

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <GhostButton className="h-7 px-2" onClick={onBack}>
          <ChevronLeft size={14} /> Back
        </GhostButton>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <input
              className="w-full max-w-md rounded-md border border-transparent bg-transparent px-1 py-0.5 text-lg font-bold text-zinc-100 outline-none transition-colors hover:border-white/[0.08] focus:border-[#f5c518]/40"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
            />
            <StatusChip status={ep.status} />
          </div>
          {ep.niche && <div className="mt-0.5 px-1 text-[11px] text-zinc-500">Niche · {ep.niche}</div>}
        </div>
        <div className="flex items-center gap-2">
          <SelectInput className="w-56" value={themeId} onChange={(e) => setThemeId(e.target.value)}>
            <option value="">Theme (optional)</option>
            {themes.some((t: any) => t.is_builtin) && (
              <optgroup label="Built-in Themes">
                {themes.filter((t: any) => t.is_builtin).map((t: any) => (
                  <option key={t.id ?? t.name} value={t.id}>
                    {t.name} — {t.font_display || t.accent_color || ''}
                  </option>
                ))}
              </optgroup>
            )}
            {themes.some((t: any) => !t.is_builtin) && (
              <optgroup label="Custom Themes">
                {themes.filter((t: any) => !t.is_builtin).map((t: any) => (
                  <option key={t.id ?? t.name} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
            )}
          </SelectInput>
          <GhostButton onClick={applyTheme} disabled={!themeId}>
            <Sparkles size={13} /> Apply
          </GhostButton>
        </div>
      </div>

      <PhaseStepper
        currentPhase={currentPhase}
        onPhaseClick={handlePhaseClick}
        episodeStatus={ep.status}
        gates={gates}
        takeCount={takeCount}
        evaluatedCount={evaluatedCount}
      />

      {/* Phase panels — shown when navigating via stepper */}
      {currentPhase === 'idea' && (
        <GreenLightPanel
          episodeId={ep.id}
          gates={gates}
          onPhaseChange={handlePhaseChange}
          validating={validating}
          onValidate={validateBatch}
        />
      )}

      {currentPhase === 'capture' && (
        <CaptureView episodeId={ep.id} onPhaseChange={handlePhaseChange} />
      )}

      {currentPhase === 'assemble' && (
        <AssembleView episodeId={ep.id} onPhaseChange={handlePhaseChange} />
      )}

      {currentPhase === 'learn' && (
        <LearnView episodeId={ep.id} onPhaseChange={handlePhaseChange} />
      )}

      <div className="flex items-center gap-1 border-b border-white/[0.06] pb-2">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium transition-colors',
              tab === id ? 'bg-[#f5c518]/10 text-[#f5c518]' : 'text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300',
            )}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {tab === 'script' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <AmberButton onClick={generate} disabled={generating}>
              <Wand2 size={13} />
              {generating ? 'Generating…' : frames.length > 0 ? 'Regenerate Script' : 'Generate Script'}
            </AmberButton>
            <GhostButton onClick={validateBatch} disabled={validating}>
              <Search size={13} />
              {validating ? 'Validating…' : 'Validate Evidence (AI)'}
            </GhostButton>
            {validateResults && (
              <div className="flex items-center gap-1.5">
                {validateResults.map((r: any, i: number) => {
                  const pass = !!(r.pass ?? r.valid)
                  return (
                    <span key={i} title={Array.isArray(r.reasons ?? r.reason) ? (r.reasons ?? r.reason).join(' · ') : String(r.reasons ?? r.reason ?? '')}
                      className={cn(
                        'inline-flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold',
                        pass ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400',
                      )}>
                      {pass ? '✓' : '✗'}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {frames.length > 0 && (
            <EpisodeScoreSummary
              scheme={scoringScheme}
              breakdown={scoringBreakdown}
              average={scoringAverage}
              threshold={scoringThreshold}
              rubricVersion={scoringVersion}
              totalFrames={frames.length}
              loading={scoringLoading}
            />
          )}

          {scriptText && (
            <Card>
              <div className="mb-2 text-[10px] font-semibold tracking-wider text-[#f5c518] uppercase">Full script</div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap text-zinc-300">{scriptText}</p>
            </Card>
          )}

          {frames.length > 0 && (
            <>
              {frames.map((f, i) => (
                <ScriptProofCard
                  key={f.index ?? i}
                  frame={f}
                  scheme={scoringScheme ?? { id: 'signal_builder', name: 'Signal Builder', tier: 'A', description: '', weights: {} }}
                  rubricVersion={scoringVersion}
                  isRejected={rejectedFrames.has(f.index ?? i)}
                  onAccept={() => { toast(`Frame ${i + 1} accepted`) }}
                  onReject={() => {
                    setRejectedFrames((prev) => {
                      const next = new Set(prev)
                      const idx = f.index ?? i
                      if (next.has(idx)) next.delete(idx); else next.add(idx)
                      return next
                    })
                  }}
                  onRegenerate={async (instruction) => {
                    try {
                      const res = await api()?.scriptRegenerateLine({ episodeId: ep.id, frameIndex: f.index ?? i, instruction })
                      if (res?.ok) {
                        const nxt = res.frame ?? res.line ?? res
                        setFrames((prev) => prev.map((p, pi) => (pi === i ? nxt : p)))
                        toast(`Frame ${i + 1} regenerated`)
                        onChanged()
                      } else {
                        toast(res?.error || 'Regeneration failed', 'error')
                      }
                    } catch (e: any) {
                      toast(e?.message || 'Regeneration failed', 'error')
                    }
                  }}
                />
              ))}
            </>
          )}

          {!generating && frames.length === 0 && !scriptText && (
            <EmptyState
              icon={<Clapperboard size={28} />}
              title="No script yet"
              hint="Hit “Generate Script” and the AI will build a frame-by-frame script with retention evidence on every line."
            />
          )}

          {gateItems.length > 0 && (
            <Card className="border-violet-500/20">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] font-semibold tracking-wider text-violet-400 uppercase">Gate check</div>
                <span className={cn(
                  'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase',
                  gates.overall === 'pass' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400',
                )}>
                  {gates.overall ?? 'unknown'}
                </span>
              </div>
              <div className="space-y-2">
                {gateItems.map((g) => (
                  <div key={g.key} className="flex items-start gap-2">
                    {g.check?.pass ? (
                      <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                    ) : (
                      <ShieldX size={14} className="mt-0.5 shrink-0 text-rose-400" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-zinc-200">{g.label}</div>
                      <div className="text-[11px] text-zinc-500">{g.check?.reason || 'No reason recorded'}</div>
                    </div>
                  </div>
                ))}
              </div>
              {Array.isArray(gates.suggestions) && gates.suggestions.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-white/[0.06] pt-3">
                  {gates.suggestions.map((s: string, i: number) => (
                    <li key={i} className="text-[11px] text-zinc-400">· {s}</li>
                  ))}
                </ul>
              )}
              <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <input
                  type="checkbox"
                  checked={override}
                  disabled={savingOverride}
                  onChange={(e) => toggleOverride(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer accent-[#f5c518]"
                />
                <span className="text-[11px] text-zinc-300">Override gates — let this episode proceed anyway</span>
              </label>
            </Card>
          )}
        </div>
      )}

      {tab === 'seo' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AmberButton onClick={inject} disabled={injecting}>
              <FileSearch size={13} />
              {injecting ? 'Injecting…' : 'Inject SEO'}
            </AmberButton>
            {ep.niche && <Chip>Niche: {ep.niche}</Chip>}
          </div>
          {seoPositions.length === 0 && !injecting && (
            <EmptyState
              icon={<FileSearch size={28} />}
              title="No SEO injected yet"
              hint="Injection writes the search-optimized title, first line, overlay text, and caption for this episode."
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            {seoPositions.map((p) => (
              <Card key={p.key} className="p-4">
                <div className="mb-1 text-[9px] tracking-wider text-[#f5c518] uppercase">{p.label}</div>
                <p className="text-xs leading-relaxed text-zinc-300">{String(p.value ?? '')}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'analytics' && <AnalyticsBody episodeId={ep.id} />}

      {tab === 'assets' && (
        <EmptyState
          icon={<Film size={28} />}
          title="Assets coming soon"
          hint="Raw footage, B-roll, SFX and music for this episode will live here."
        />
      )}

      {tab === 'metrics' && (
        <EmptyState
          icon={<TrendingUp size={28} />}
          title="Metrics coming soon"
          hint="Post-publish performance tracking for this episode will live here."
        />
      )}
    </section>
  )
}
export function EpisodesView() {
  const [episodes, setEpisodes] = useState<any[]>([])
  const [approvedIdeas, setApprovedIdeas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)
  const [selectedIdea, setSelectedIdea] = useState<string>('')
  const [ideaTitle, setIdeaTitle] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await api()?.episodesList()
      setEpisodes(Array.isArray(list) ? list : [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load episodes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const open = async (id: number) => {
    try {
      const ep = await api()?.episodeGet(id)
      if (ep) {
        setDetail(ep)
        setSelectedId(id)
      } else {
        toast('Could not load episode', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Could not load episode', 'error')
    }
  }

  const toggleCreate = async () => {
    const next = !creating
    setCreating(next)
    if (next) {
      try {
        const list = await api()?.ideasList()
        setApprovedIdeas(Array.isArray(list) ? list.filter((i) => i.status === 'approved') : [])
        setSelectedIdea('')
      } catch {
        setApprovedIdeas([])
      }
    }
  }

  const create = async () => {
    if (!selectedIdea && !ideaTitle.trim()) return
    try {
      const res = await api()?.episodeSave({
        idea_id: selectedIdea ? Number(selectedIdea) : undefined,
        title: ideaTitle.trim() || 'Untitled episode',
        status: 'draft',
      })
      if (res?.ok) {
        toast('Episode created')
        setCreating(false)
        setIdeaTitle('')
        load()
      } else {
        toast(res?.error || 'Failed to create episode', 'error')
      }
    } catch (e: any) {
      toast(e?.message || 'Failed to create episode', 'error')
    }
  }

  const remove = async (id: number) => {
    try {
      await api()?.episodeDelete(id)
      toast('Episode deleted')
      load()
    } catch (e: any) {
      toast(e?.message || 'Failed to delete episode', 'error')
    }
  }

  if (selectedId !== null && detail) {
    return (
      <EpisodeDetail
        ep={detail}
        onBack={() => { setSelectedId(null); setDetail(null); load() }}
        onChanged={load}
      />
    )
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        label="Content Engine / 03"
        title="Episodes"
        action={
          <AmberButton onClick={toggleCreate}>
            {creating ? <X size={13} /> : <Plus size={13} />}
            {creating ? 'Close' : 'New Episode'}
          </AmberButton>
        }
      />

      {creating && (
        <Card className="border-[#f5c518]/20">
          <div className="mb-3 text-[10px] font-semibold tracking-wider text-[#f5c518] uppercase">New Episode</div>
          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
            <div>
              <FieldLabel>From approved idea</FieldLabel>
              <SelectInput value={selectedIdea} onChange={(e) => setSelectedIdea(e.target.value)}>
                <option value="">— choose an approved idea —</option>
                {approvedIdeas.map((i) => (
                  <option key={i.id ?? i.title} value={i.id}>{i.title}</option>
                ))}
              </SelectInput>
              {approvedIdeas.length === 0 && (
                <div className="mt-1 text-[10px] text-zinc-600">No approved ideas yet — approve one in the Ideas view first.</div>
              )}
            </div>
            <div>
              <FieldLabel>Or title it manually</FieldLabel>
              <TextInput value={ideaTitle} onChange={(e) => setIdeaTitle(e.target.value)} placeholder="Episode title" />
            </div>
            <AmberButton onClick={create} disabled={!selectedIdea && !ideaTitle.trim()}>
              Create
            </AmberButton>
          </div>
        </Card>
      )}

      {loading && <LoadingBlock label="Loading episodes…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && episodes.length === 0 && (
        <EmptyState
          icon={<Clapperboard size={28} />}
          title="No episodes yet"
          hint="Create one from an approved idea and start scripting."
          action={<AmberButton onClick={toggleCreate}><Plus size={13} /> New Episode</AmberButton>}
        />
      )}

      {!loading && !error && episodes.length > 0 && (
        <div className="space-y-2">
          {episodes.map((ep) => (
            <Card key={ep.id} className="flex cursor-pointer items-center gap-3 p-3.5 transition-colors hover:border-[#f5c518]/25" onClick={() => open(ep.id)}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-zinc-100">{ep.title}</span>
                  <StatusChip status={ep.status} />
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
                  {ep.niche && <span>Niche · {ep.niche}</span>}
                  {Array.isArray(ep.script?.frames) && <span>{ep.script.frames.length} frames</span>}
                  {ep.gates?.overall && <span>Gates · {ep.gates.overall}</span>}
                </div>
              </div>
              <ConfirmIconButton
                onConfirm={(e?: any) => { e?.stopPropagation?.(); remove(ep.id) }}
                icon={<Trash2 size={12} />}
                label="Delete episode"
              />
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}