import { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, Clipboard, ClipboardCheck, Film, Loader2, Pause, Play, Sparkles, Upload, Wand2, X } from 'lucide-react'
import { OVERLAY_TYPE_CONFIG, CANVAS_WIDTH, CANVAS_HEIGHT, FACE_CAM_ZONE } from '../types/overlayStudio'
import { PROMPT_CUT_PLANNER, PROMPT_SCENE_DSL } from '../lib/overlayPrompts'
import { extractJson, validateCutPlan, validateSceneDSL, allPassed, passedCount, generateRepairPrompt } from '../lib/overlayParser'

const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const SAMPLE_TRANSCRIPT = {
  video_id: 'demo', duration: 847.2,
  segments: [
    { id: 0, start: 0.0, end: 4.8, text: 'People think SVM is just a line. But it is actually a hyperplane in high-dimensional space.' },
    { id: 1, start: 5.2, end: 12.8, text: 'Let me explain the kernel trick. When data is not linearly separable in 2D, we map it to higher dimensions.' },
    { id: 2, start: 13.1, end: 22.5, text: 'The support vectors are the closest points to the hyperplane. They define the margin.' },
    { id: 3, start: 23.0, end: 35.0, text: 'Now let me talk about something completely different. Yesterday I went to the grocery store.' },
    { id: 4, start: 35.5, end: 50.0, text: 'The regularization parameter C controls the trade-off between margin size and misclassification.' },
    { id: 5, start: 50.5, end: 65.0, text: 'For non-linear problems, we use the RBF kernel. It maps inputs to infinite-dimensional space.' },
    { id: 6, start: 65.5, end: 78.0, text: 'In summary, SVM finds the optimal hyperplane by maximizing the margin between support vectors.' },
  ]
}

function HighlightText({ text, emphasis }: { text: string; emphasis: string[] }) {
  if (!emphasis.length) return <span>{text}</span>
  return <span>{text.split(/(\s+)/).map((w, i) => {
    const c = w.replace(/[^\w]/g, '').toLowerCase()
    return emphasis.some(e => e.toLowerCase() === c) ? <span key={i} className="text-[#22d3ee] font-semibold">{w}</span> : <span key={i}>{w}</span>
  })}</span>
}

function ValidationChecklist({ checks }: { checks: Array<{ rule: string; message: string; passed: boolean }> }) {
  const { passed, total } = passedCount(checks)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-zinc-300">Validation</span>
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${passed === total ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{passed}/{total} passed</span>
      </div>
      {checks.map((c, i) => (
        <div key={i} className="flex items-start gap-2.5 text-[11px] py-1">
          <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${c.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{c.passed ? '✓' : '✗'}</span>
          <div className="min-w-0 flex-1">
            <span className={`font-medium ${c.passed ? 'text-zinc-400' : 'text-red-300'}`}>{c.rule}</span>
            {!c.passed && <span className="text-zinc-500 ml-1.5">— {c.message}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Glass Card (Frontend Design pattern) ───────────────────────────────────
function GlassCard({ children, className = '', interactive = false }: { children: React.ReactNode; className?: string; interactive?: boolean }) {
  return (
    <div className={`bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5 transition-colors duration-150 ${interactive ? 'hover:border-zinc-700/60 cursor-pointer' : ''} ${className}`}>
      {children}
    </div>
  )
}

type Phase = 'upload' | 'plan' | 'visualize'
type PlanMode = 'none' | 'bridge-cut' | 'bridge-scene'

export function FeatureStudioPage() {
  const [phase, setPhase] = useState<Phase>('upload')
  const [transcript, setTranscript] = useState<any>(null)
  const [transcriptFile, setTranscriptFile] = useState('')
  const [transcriptError, setTranscriptError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [cutPlan, setCutPlan] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [sceneDsl, setSceneDsl] = useState<any>(null)
  const [planMode, setPlanMode] = useState<PlanMode>('none')
  const [bridgeStep, setBridgeStep] = useState<'prompt' | 'paste' | 'validate'>('prompt')
  const [copied, setCopied] = useState(false)
  const [pastedResponse, setPastedResponse] = useState('')
  const [bridgeChecks, setBridgeChecks] = useState<Array<{ rule: string; message: string; passed: boolean }>>([])
  const [bridgeError, setBridgeError] = useState<string | null>(null)

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`

  const loadSample = useCallback(() => { setTranscript(SAMPLE_TRANSCRIPT); setTranscriptFile('demo_video.mp4 (sample)'); setPhase('plan') }, [])
  const handleTranscriptUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => { try { const data = JSON.parse(String(reader.result)); if (!data.segments?.length) throw new Error('Missing segments array'); setTranscript(data); setTranscriptFile(file.name); setTranscriptError(null); setPhase('plan') } catch (err: any) { setTranscriptError(err.message) } }
    reader.readAsText(file)
  }, [])
  const handleVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return; setUploading(true)
    setTimeout(() => { setUploading(false); setTranscriptError('Transcription requires the Python backend (faster-whisper + ffmpeg). Upload a transcript.json instead.') }, 1500)
  }, [])

  const cutPlanPrompt = useMemo(() => transcript ? PROMPT_CUT_PLANNER + '\n\n================ INPUT DATA ================\nvideo_id: ' + transcript.video_id + '\ntranscript:\n' + JSON.stringify(transcript, null, 2) : '', [transcript])
  const sceneDslPrompt = useMemo(() => { if (!transcript) return ''; const kept = cutPlan?.kept?.map((k: any) => transcript.segments?.find((s: any) => s.id === k.segment_id)).filter(Boolean) || transcript.segments; return PROMPT_SCENE_DSL + '\n\n================ INPUT DATA ================\nvideo_id: ' + transcript.video_id + '\nkept_transcript:\n' + JSON.stringify({ video_id: transcript.video_id, segments: kept }, null, 2) }, [transcript, cutPlan])
  const activePrompt = planMode === 'bridge-cut' ? cutPlanPrompt : sceneDslPrompt

  const copyPrompt = useCallback(async () => { try { await navigator.clipboard.writeText(activePrompt) } catch { const ta = document.createElement('textarea'); ta.value = activePrompt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) }; setCopied(true); setTimeout(() => setCopied(false), 2000) }, [activePrompt])
  const validateResponse = useCallback(() => { if (!pastedResponse.trim()) { setBridgeError('Paste the AI response first.'); return }; setBridgeError(null); try { const parsed = extractJson(pastedResponse); const checks = planMode === 'bridge-cut' ? validateCutPlan(parsed, transcript) : validateSceneDSL(parsed, transcript); setBridgeChecks(checks); setBridgeStep('validate'); if (allPassed(checks)) { if (planMode === 'bridge-cut') setCutPlan(parsed); else setSceneDsl(parsed) } } catch (err: any) { setBridgeError(err.message); setBridgeChecks([{ rule: 'Valid JSON', message: err.message, passed: false }]); setBridgeStep('validate') } }, [pastedResponse, planMode, transcript])
  const repairPrompt = useMemo(() => !bridgeChecks.length || allPassed(bridgeChecks) ? '' : generateRepairPrompt(pastedResponse, bridgeChecks), [bridgeChecks, pastedResponse])
  const copyRepair = useCallback(async () => { try { await navigator.clipboard.writeText(repairPrompt) } catch {} }, [repairPrompt])
  const startBridge = useCallback((mode: 'bridge-cut' | 'bridge-scene') => { setPlanMode(mode); setBridgeStep('prompt'); setPastedResponse(''); setBridgeChecks([]); setBridgeError(null) }, [])

  return (
    <div className="min-h-full text-zinc-100" data-page="studio">
      <div className="mx-auto max-w-[1800px] w-full flex flex-col gap-5 p-5">
        {/* ── Header (Frontend Design: SectionHeader pattern) ── */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ec4899]/15 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-[#ec4899]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">Overlay Studio</h1>
              <p className="text-xs text-zinc-500 mt-0.5">{!transcript ? 'Upload a video or transcript to get started' : `Transcript loaded · ${transcript.segments?.length || 0} segments · ${fmt(transcript.duration || 0)}`}</p>
            </div>
          </div>
          {transcript && (
            <button onClick={() => { setPhase('upload'); setTranscript(null); setCutPlan(null); setSceneDsl(null); setPlanMode('none') }}
              className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors duration-150 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-zinc-800/50">
              Start over
            </button>
          )}
        </header>

        {/* ═══════════════ UPLOAD PHASE ═══════════════ */}
        <AnimatePresence mode="wait">
          {phase === 'upload' && !transcript && (
            <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
              <GlassCard className="flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-xl bg-[#ec4899]/10 flex items-center justify-center mb-4">
                  <Film size={24} className="text-[#ec4899]" />
                </div>
                <h2 className="text-base font-semibold text-zinc-100 mb-1">Start with a video or transcript</h2>
                <p className="text-xs text-zinc-500 mb-6 max-w-md text-center leading-relaxed">
                  Upload a video for automatic transcription, or a transcript.json if you already have one.
                </p>
                <div className="flex gap-3">
                  <label className="inline-flex items-center gap-2 rounded-xl bg-[#ec4899] px-5 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-[#db2777] active:scale-[0.97] transition-all duration-150 cursor-pointer min-h-[44px] shadow-lg shadow-[#ec4899]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900">
                    <Upload size={14} /> Upload video
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-5 py-2.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700/50 active:scale-[0.97] transition-all duration-150 cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Upload transcript.json
                    <input type="file" accept=".json" className="hidden" onChange={handleTranscriptUpload} />
                  </label>
                  <button onClick={loadSample}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-5 py-2.5 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/30 active:scale-[0.97] transition-all duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50">
                    Load sample
                  </button>
                </div>
                {uploading && <div className="mt-5 flex items-center gap-2 text-xs text-[#22d3ee]"><Loader2 size={14} className="animate-spin" /> Transcribing video...</div>}
                {transcriptError && (
                  <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3.5 text-xs text-amber-300 max-w-md" role="alert">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {transcriptError}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════ PLAN PHASE ═══════════════ */}
        {phase === 'plan' && transcript && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
            className="flex-1 grid gap-5 min-h-0" style={{ gridTemplateColumns: '1fr 380px' }}>
            <div className="flex flex-col gap-4 min-h-0">
              {/* Transcript (Glass Card) */}
              <GlassCard className="flex-1 min-h-0 overflow-auto">
                <h3 className="text-xs font-semibold text-zinc-300 mb-3">Transcript</h3>
                <div className="space-y-1">
                  {transcript.segments?.map((seg: any) => {
                    const kept = cutPlan?.kept?.find((k: any) => k.segment_id === seg.id)
                    return (
                      <div key={seg.id}
                        className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${kept ? 'bg-emerald-500/[0.06] border border-emerald-500/20' : cutPlan ? 'bg-zinc-800/20 border border-transparent opacity-50' : 'hover:bg-zinc-800/40 border border-transparent'}`}>
                        <span className="text-[9px] text-zinc-600 font-mono w-8 shrink-0 pt-0.5">#{seg.id}</span>
                        <span className="text-[9px] text-[#22d3ee] font-mono w-20 shrink-0 pt-0.5">{fmt(seg.start)} – {fmt(seg.end)}</span>
                        <span className="text-[11px] text-zinc-300 leading-relaxed flex-1">{seg.text}</span>
                        {kept && <span className="text-[8px] text-emerald-400 font-semibold shrink-0 pt-0.5 uppercase tracking-wider">{kept.role}</span>}
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
              {/* Timeline */}
              {cutPlan && (
                <GlassCard>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsPlaying(!isPlaying)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200 transition-all duration-150 min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]/50">
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      </motion.button>
                      <span className="text-xs text-zinc-500 font-mono">{fmt(currentTime)} / {fmt(transcript.duration)}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${(() => { const t = cutPlan.kept?.reduce((s: number, k: any) => s + (k.end - k.start), 0) || 0; return t >= 90 && t <= 180 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400' })()}`}>
                      Kept: {fmt(cutPlan.kept?.reduce((s: number, k: any) => s + (k.end - k.start), 0) || 0)} / 3:00
                    </span>
                  </div>
                  <div className="relative h-11 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
                    {transcript.segments?.map((seg: any) => {
                      const kept = cutPlan.kept?.find((k: any) => k.segment_id === seg.id)
                      return (
                        <div key={seg.id}
                          className={`absolute top-1 bottom-1 rounded transition-all duration-150 ${kept ? 'bg-emerald-500/20 border-l-2 border-emerald-400' : 'bg-zinc-700/20 border-l-2 border-zinc-600 opacity-40'}`}
                          style={{ left: `${(seg.start / transcript.duration) * 100}%`, width: `${((seg.end - seg.start) / transcript.duration) * 100}%` }} />
                      )
                    })}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-[#22d3ee] pointer-events-none z-10" style={{ left: `${(currentTime / transcript.duration) * 100}%` }}>
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#22d3ee] rounded-full shadow-lg shadow-[#22d3ee]/30" />
                    </div>
                  </div>
                </GlassCard>
              )}
            </div>

            {/* Right panel */}
            <GlassCard className="flex flex-col min-h-0 overflow-auto">
              {!cutPlan && !sceneDsl && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-300">Next step</h3>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">Choose what to generate. The AI reads your transcript and produces a structured plan.</p>
                  <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => startBridge('bridge-cut')}
                    className="w-full text-left rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-4 hover:border-[#ec4899]/30 hover:bg-zinc-800/50 transition-all duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]/50">
                    <div className="text-sm font-medium text-zinc-200">Generate Cut Plan</div>
                    <div className="text-[10px] text-zinc-500 mt-1">AI selects which segments to keep (90–180s) and why.</div>
                  </motion.button>
                  <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => startBridge('bridge-scene')}
                    className="w-full text-left rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-4 hover:border-[#ec4899]/30 hover:bg-zinc-800/50 transition-all duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]/50">
                    <div className="text-sm font-medium text-zinc-200">Generate Visual Scenes</div>
                    <div className="text-[10px] text-zinc-500 mt-1">AI plans diagrams, equations, charts, cards for each moment.</div>
                  </motion.button>
                </div>
              )}

              {planMode !== 'none' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-zinc-300">{planMode === 'bridge-cut' ? 'Cut Plan' : 'Scene DSL'}</h3>
                    <button onClick={() => setPlanMode('none')} className="text-zinc-500 hover:text-zinc-200 transition-colors duration-150 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg"><X size={14} /></button>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['prompt', 'paste', 'validate'] as const).map((s, i) => (
                      <div key={s} className="flex items-center gap-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${bridgeStep === s ? 'bg-[#ec4899] text-zinc-950' : (['prompt', 'paste', 'validate'].indexOf(bridgeStep) > i ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500')}`}>
                          {['prompt', 'paste', 'validate'].indexOf(bridgeStep) > i ? '✓' : i + 1}
                        </div>
                        <span className={`text-[10px] ${bridgeStep === s ? 'text-zinc-200' : 'text-zinc-500'}`}>{s === 'prompt' ? 'Copy' : s === 'paste' ? 'Paste' : 'Check'}</span>
                        {i < 2 && <div className="w-4 h-px bg-zinc-700" />}
                      </div>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {bridgeStep === 'prompt' && (
                      <motion.div key="prompt" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="space-y-2">
                        <div className="rounded-lg border border-zinc-700/30 bg-zinc-950/60 p-3 max-h-[200px] overflow-auto">
                          <pre className="text-[9px] text-zinc-500 leading-relaxed whitespace-pre-wrap font-mono">{activePrompt.slice(0, 1500)}{activePrompt.length > 1500 ? '\n\n... (truncated)' : ''}</pre>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-zinc-600">{activePrompt.length} chars</span>
                          <div className="flex gap-2">
                            <motion.button whileTap={{ scale: 0.95 }} onClick={copyPrompt} disabled={!activePrompt}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-[#ec4899] px-3 py-2 text-[10px] font-semibold text-zinc-950 hover:bg-[#db2777] disabled:opacity-40 transition-all duration-150 min-h-[44px] shadow-lg shadow-[#ec4899]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]/50">
                              {copied ? <ClipboardCheck size={12} /> : <Clipboard size={12} />} {copied ? 'Copied!' : 'Copy Prompt'}
                            </motion.button>
                            <button onClick={() => setBridgeStep('paste')}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2 text-[10px] text-zinc-300 hover:bg-zinc-700/50 active:scale-[0.97] transition-all duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/50">
                              Next →
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-zinc-600">Paste into:</span>
                          {['ChatGPT', 'Claude', 'Gemini'].map(name => (
                            <span key={name} className="text-[9px] text-zinc-500 hover:text-[#22d3ee] transition-colors duration-150 cursor-pointer">{name}</span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {bridgeStep === 'paste' && (
                      <motion.div key="paste" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="space-y-2">
                        <textarea value={pastedResponse} onChange={e => setPastedResponse(e.target.value)}
                          placeholder="Paste the AI's JSON response here..."
                          className="h-[150px] w-full resize-none rounded-lg border border-zinc-700/30 bg-zinc-950/60 p-3 font-mono text-[10px] leading-relaxed text-zinc-300 placeholder-zinc-600 outline-none transition-all duration-150 focus:border-[#ec4899]/60 focus:ring-2 focus:ring-[#ec4899]/20" />
                        {bridgeError && <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/[0.08] p-2.5 text-[10px] text-red-300" role="alert"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {bridgeError}</div>}
                        <div className="flex gap-2">
                          <motion.button whileTap={{ scale: 0.95 }} onClick={validateResponse} disabled={!pastedResponse.trim()}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#ec4899] px-4 py-2.5 text-[10px] font-semibold text-zinc-950 hover:bg-[#db2777] disabled:opacity-40 transition-all duration-150 min-h-[44px] shadow-lg shadow-[#ec4899]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]/50">Validate</motion.button>
                          <button onClick={() => setBridgeStep('prompt')} className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 text-[10px] text-zinc-300 hover:bg-zinc-700/50 active:scale-[0.97] transition-all duration-150 min-h-[44px]">←</button>
                        </div>
                      </motion.div>
                    )}

                    {bridgeStep === 'validate' && (
                      <motion.div key="validate" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} className="space-y-2">
                        <div className="rounded-lg border border-zinc-700/30 bg-zinc-950/60 p-3 max-h-[200px] overflow-auto">
                          <ValidationChecklist checks={bridgeChecks} />
                        </div>
                        {allPassed(bridgeChecks) ? (
                          <div className="text-[10px] text-emerald-400 text-center py-2 font-medium">All checks passed! Result applied.</div>
                        ) : (
                          <div className="space-y-2">
                            {repairPrompt && (
                              <motion.button whileTap={{ scale: 0.95 }} onClick={copyRepair}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500/[0.12] border border-amber-500/25 px-3 py-2.5 text-[10px] font-medium text-amber-300 hover:bg-amber-500/[0.18] transition-all duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50">
                                <Clipboard size={12} /> Copy Repair Prompt
                              </motion.button>
                            )}
                            <button onClick={() => { setBridgeStep('paste'); setBridgeChecks([]); setBridgeError(null) }}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 text-[10px] text-zinc-300 hover:bg-zinc-700/50 active:scale-[0.97] transition-all duration-150 min-h-[44px]">
                              ← Paste Different Response
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {cutPlan && !planMode && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-300">Cut Plan Result</h3>
                  <div className="space-y-1.5">
                    {cutPlan.kept?.map((k: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15 p-2.5">
                        <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] text-emerald-400 font-medium">{k.role} · {fmt(k.start)} – {fmt(k.end)}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">{k.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => startBridge('bridge-scene')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#ec4899] px-4 py-2.5 text-[10px] font-semibold text-zinc-950 hover:bg-[#db2777] transition-all duration-150 min-h-[44px] shadow-lg shadow-[#ec4899]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec4899]/50">
                    <Sparkles size={12} /> Generate Visual Scenes →
                  </motion.button>
                </div>
              )}

              {sceneDsl && !planMode && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-300">Scenes Result</h3>
                  <div className="space-y-1.5">
                    {sceneDsl.scenes?.map((s: any, i: number) => (
                      <div key={i} className="rounded-lg bg-zinc-800/30 border border-zinc-700/20 p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-[#22d3ee] font-semibold">{s.renderer}</span>
                          <span className="text-[9px] text-zinc-600 font-mono">{fmt(s.start_time)} – {fmt(s.end_time)}</span>
                        </div>
                        <div className="text-[10px] text-zinc-300 font-medium mt-0.5">{s.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  )
}
