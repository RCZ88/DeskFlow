import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Presentation, ChevronLeft, ChevronRight, Download, Trash2, LoaderCircle, Eye, Code, Copy, Check, X, Clipboard, AlertTriangle, Brain, Palette, ChevronDown, RotateCcw, Sparkles, Archive, ArchiveRestore, PanelLeftClose, PanelLeft, ImageDown, FileDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROMPT_GENERATE_SLIDE, PROMPT_GENERATE_JSON } from '@/services/presentation/prompts'
import { parseSlides, type ParsedSlide } from '@/services/presentation/htmlParser'
import { validateSlide, validateSpec, validateThemeId } from '@/services/presentation/slideValidator'
import { MODES } from '@/services/presentation/modeRegistry'
import { buildSlidePlan, compilePrompt, compileDeckPrompt } from '@/services/presentation/promptComposer'
import { recomposeSlideHtml } from '@/services/presentation/deckParser'
import DynamicPromptPreview, { type DynamicSectionDef } from '@/components/DynamicPromptPreview'
import { THEME_REGISTRY, getTheme, getThemeFromCombo, PALETTES, FONT_COMBOS, type ThemeDefinition } from '@/services/presentation/themeRegistry'
import SlideRenderer from './SlideRenderer'
import type { SlideSpec } from '@/services/presentation/spec'
import AspectRatioControl from './AspectRatioControl'
const api = () => (window as any).deskflowAPI?.presentation
const ce = () => (window as any).deskflowAPI?.contentEngine
const ctx = () => (window as any).deskflowAPI
console.log('%c[Presentation] v7.0 loaded', 'color: #10b981; font-weight: bold')

type Episode = { id: number; title: string; status: string }
type PS = { id: string; episode_id?: number; topic?: string; title: string; status: string; slide_count: number; created_at: string; archived_at?: string }
type SL = { id: string; presentation_id: string; index_order: number; frame_type: string; html_content: string; format?: 'html' | 'json'; spec_version?: number }
type PD = PS & { slides: SL[] }
type ParsedSlideWithId = ParsedSlide & { id: string }

const FIELD_PROMPT = `You are a presentation topic extractor. You already have the full conversation history in your context. Analyze everything discussed in this session and output EXACTLY ONE short topic phrase (under 10 words) that would make a great slide presentation.

Rules:
- Output ONLY the topic phrase, nothing else
- No quotes, no punctuation at the end
- Must be specific enough to generate 8 slides about
- Focus on the MAIN technical or conceptual discussion
- Use the conversation history that is already loaded in this session
- Do NOT ask the user to paste anything
- Do NOT request additional input
- Generate the topic IMMEDIATELY from available context

Topic:`

let _tid = 0
const _tl = new Set<(t: any) => void>()
function toast(text: string, kind: 'success' | 'error' | 'info' = 'success') { _tl.forEach(l => l({ id: ++_tid, text, kind })) }
function ToastHost() {
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { const fn = (t: any) => { setItems(p => [...p.slice(-3), t]); setTimeout(() => setItems(p => p.filter(x => x.id !== t.id)), 3600) }; _tl.add(fn); return () => { _tl.delete(fn) } }, [])
  if (!items.length) return null
  return <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2">{items.map(t => <div key={t.id} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur-xl', t.kind === 'success' && 'border-emerald-500/30 bg-emerald-950/90 text-emerald-200', t.kind === 'error' && 'border-rose-500/30 bg-rose-950/90 text-rose-200', t.kind === 'info' && 'border-white/[0.08] bg-[#141419]/95 text-zinc-200')}><span>{t.text}</span></div>)}</div>
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value)
  const panelRef = useRef<HTMLDivElement>(null)
  const gradientRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const safeHex = value.startsWith('#') && value.length === 7 ? value : '#888888'
  const r = parseInt(safeHex.slice(1,3),16), g = parseInt(safeHex.slice(3,5),16), b = parseInt(safeHex.slice(5,7),16)
  const max = Math.max(r,g,b)/255, min = Math.min(r,g,b)/255
  let h = 0, s = 0, l = (max+min)/2
  if (max !== min) { const d = max-min; s = l > 0.5 ? d/(2-max-min) : d/(max+min); if (max===r/255) h=((g/255-b/255)/d+(g< b?6:0))/6; else if (max===g/255) h=((b/255-r/255)/d+2)/6; else h=((r/255-g/255)/d+4)/6 }
  const hue = Math.round(h*360), sat = Math.round(s*100), lit = Math.round(l*100)

  useEffect(() => { setHexInput(value) }, [value])
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const hslToHex = (hh: number, ss: number, ll: number) => {
    ss /= 100; ll /= 100
    const a = ss * Math.min(ll, 1-ll)
    const f = (n: number) => { const k = (n + hh/30) % 12; const c = ll - a * Math.max(Math.min(k-3, 9-k, 1), -1); return Math.round(255*c).toString(16).padStart(2,'0') }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  const fromGradient = (e: React.MouseEvent | MouseEvent) => {
    if (!gradientRef.current) return
    const rect = gradientRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    const hex = hslToHex(hue, Math.round(x*100), Math.round((1-y)*100))
    onChange(hex); setHexInput(hex)
  }

  const onGradientDown = (e: React.MouseEvent) => {
    dragging.current = true; fromGradient(e)
    const onMove = (ev: MouseEvent) => { if (dragging.current) fromGradient(ev) }
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }

  const PRESETS = ['#10b981','#a855f7','#f59e0b','#ef4444','#3b82f6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1']

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setOpen(!open)} className="w-full h-6 rounded-md border border-white/[0.08] bg-white/[0.03] flex items-center gap-1.5 px-1.5 hover:border-white/20 transition-colors">
        <div className="w-4 h-4 rounded border border-white/20 shrink-0" style={{ background: safeHex }} />
        <span className="text-[8px] text-zinc-400 font-mono">{safeHex}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-52 rounded-xl border border-white/[0.12] bg-[#141419] shadow-2xl p-3 space-y-3">
          <div ref={gradientRef} onMouseDown={onGradientDown} className="w-full h-32 rounded-lg cursor-crosshair relative overflow-hidden" style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue},100%,50%))` }}>
            <div className="absolute w-3 h-3 rounded-full border-2 border-white shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{ left: `${sat}%`, top: `${100-lit}%` }} />
          </div>
          <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}>
            <input type="range" min={0} max={359} value={hue} onChange={e => { const hex = hslToHex(+e.target.value, sat, lit); onChange(hex); setHexInput(hex) }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="absolute top-0 w-3 h-full rounded-full border-2 border-white shadow-lg pointer-events-none -translate-x-1/2" style={{ left: `${(hue/360)*100}%`, background: `hsl(${hue},100%,50%)` }} />
          </div>
          <div className="flex gap-1.5">
            <input value={hexInput} onChange={e => setHexInput(e.target.value)} onBlur={() => { if (/^#[0-9a-f]{6}$/i.test(hexInput)) { onChange(hexInput) } else setHexInput(safeHex) }} onKeyDown={e => { if (e.key === 'Enter') { if (/^#[0-9a-f]{6}$/i.test(hexInput)) { onChange(hexInput) } else setHexInput(safeHex) } }} className="flex-1 h-6 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 text-[9px] text-zinc-300 font-mono outline-none focus:border-[#10b981]/50" placeholder="#000000" />
            <div className="w-6 h-6 rounded-md border border-white/10 shrink-0" style={{ background: safeHex }} />
          </div>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map(c => (
              <button key={c} onClick={() => { onChange(c); setHexInput(c) }} className={cn('w-5 h-5 rounded border transition-all hover:scale-125', c === safeHex ? 'border-white ring-1 ring-white/50' : 'border-white/10')} style={{ background: c }} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ThemeCard({ t, selected, onClick, isKit }: { t: ThemeDefinition; selected: boolean; onClick: () => void; isKit?: boolean }) {
  return (
    <button onClick={onClick} className={cn('shrink-0 rounded-lg border p-2 transition-all text-left', isKit ? 'w-36' : 'w-24', selected ? 'border-[#10b981]/60 bg-[#10b981]/10 ring-1 ring-[#10b981]/30' : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.06]')}>
      {/* Color strip */}
      <div className="flex h-4 rounded overflow-hidden mb-1.5">
        <div className="flex-1" style={{ background: t.tokens.bg }} />
        <div className="flex-1" style={{ background: t.tokens.fg }} />
        <div className="flex-1" style={{ background: t.tokens.accent }} />
        <div className="flex-1" style={{ background: t.tokens.accent2 }} />
        <div className="flex-1" style={{ background: t.tokens.warning }} />
      </div>
      {/* Mini preview */}
      <div className="rounded p-1 mb-1 border border-white/[0.06]" style={{ background: t.tokens.bg }}>
        <div className="h-0.5 w-10 rounded mb-0.5" style={{ background: t.tokens.accent }} />
        <div className="h-0.5 w-7 rounded" style={{ background: t.tokens.fg, opacity: 0.5 }} />
      </div>
      <div className="text-[8px] font-semibold text-zinc-200 truncate">{t.label}</div>
      {isKit && <div className="text-[7px] text-zinc-500 truncate" style={{ fontFamily: t.tokens.fontHeader }}>{t.tokens.fontHeader}</div>}
    </button>
  )
}

function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const fonts = ['Inter', 'Space Grotesk', 'JetBrains Mono', 'DM Sans', 'Sora', 'Outfit', 'Plus Jakarta Sans', 'Manrope', 'Lexend', 'Work Sans']

  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = () => setOpen(false)
    window.addEventListener('scroll', h, true)
    window.addEventListener('resize', h)
    return () => { window.removeEventListener('scroll', h, true); window.removeEventListener('resize', h) }
  }, [open])

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen(!open)} className="h-6 px-2 rounded-md border border-white/[0.08] bg-white/[0.03] text-[9px] text-zinc-300 hover:border-white/20 transition-colors flex items-center gap-1 w-full justify-between">
        <span style={{ fontFamily: value }} className="truncate">{value}</span>
        <ChevronDown size={9} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && createPortal(
        <div className="fixed z-[9999] rounded-lg border border-white/[0.12] bg-[#141419] shadow-2xl overflow-hidden max-h-48 overflow-y-auto" style={{ top: pos.top, left: pos.left, width: pos.width }}>
          {fonts.map(f => (
            <button key={f} onClick={() => { onChange(f); setOpen(false) }} className={cn('w-full px-2 py-1.5 text-left text-[9px] hover:bg-white/[0.06] transition-colors flex items-center justify-between', f === value && 'bg-[#10b981]/10 text-[#10b981]')}>
              <span style={{ fontFamily: f }}>{f}</span>
              {f === value && <Check size={9} />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

function ThemeCustomizer({ theme, onChange, onResetToPreset, onSavePreset }: { theme: ThemeDefinition; onChange: (t: ThemeDefinition) => void; onResetToPreset: () => void; onSavePreset: () => void }) {
  const update = (key: string, val: string) => onChange({ ...theme, tokens: { ...theme.tokens, [key]: val } })
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Live preview */}
      <div className="px-3 py-2.5 border-b border-white/[0.06]" style={{ background: theme.tokens.bg }}>
        <div className="text-[13px] font-bold mb-0.5" style={{ color: theme.tokens.fg, fontFamily: theme.tokens.fontHeader }}>Header Font</div>
        <div className="text-[10px] mb-0.5" style={{ color: theme.tokens.fg, fontFamily: theme.tokens.fontBody }}>Body font — the quick brown fox jumps</div>
        <div className="text-[9px] mb-1" style={{ color: theme.tokens.muted, fontFamily: theme.tokens.fontMono }}>Mono font — code & data</div>
        <div className="flex gap-1.5">
          <span className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ background: theme.tokens.accent, color: theme.tokens.bg }}>Accent</span>
          <span className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ background: theme.tokens.accent2, color: theme.tokens.bg }}>Accent2</span>
          <span className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ background: theme.tokens.warning, color: theme.tokens.bg }}>Warn</span>
        </div>
      </div>
      {/* Controls */}
      <div className="px-2 py-2 space-y-2">
        {/* Colors */}
        <div>
          <div className="text-[7px] text-zinc-600 uppercase tracking-wider mb-1">Colors</div>
          <div className="grid grid-cols-3 gap-1.5">
            {([['bg', 'Background'], ['fg', 'Text'], ['accent', 'Accent'], ['accent2', 'Accent 2'], ['muted', 'Muted'], ['warning', 'Warning']] as const).map(([k, label]) => (
              <div key={k}>
                <div className="text-[6px] text-zinc-600 mb-0.5">{label}</div>
                <ColorPicker value={theme.tokens[k]} onChange={v => update(k, v)} />
              </div>
            ))}
          </div>
        </div>
        {/* Fonts */}
        <div>
          <div className="text-[7px] text-zinc-600 uppercase tracking-wider mb-1">Fonts</div>
          <div className="grid grid-cols-3 gap-1">
            <div><div className="text-[6px] text-zinc-600 mb-0.5">Header</div><FontPicker value={theme.tokens.fontHeader} onChange={v => update('fontHeader', v)} label="H" /></div>
            <div><div className="text-[6px] text-zinc-600 mb-0.5">Body</div><FontPicker value={theme.tokens.fontBody} onChange={v => update('fontBody', v)} label="B" /></div>
            <div><div className="text-[6px] text-zinc-600 mb-0.5">Mono</div><FontPicker value={theme.tokens.fontMono} onChange={v => update('fontMono', v)} label="M" /></div>
          </div>
        </div>
        <button onClick={onResetToPreset} className="w-full h-5 rounded text-[7px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] flex items-center justify-center gap-1 transition-colors"><RotateCcw size={8} /> Reset to preset</button>
        <button onClick={onSavePreset} className="w-full h-5 rounded text-[7px] text-[#10b981] hover:bg-[#10b981]/10 flex items-center justify-center gap-1 transition-colors"><Palette size={8} /> Save as Preset</button>
      </div>
    </div>
  )
}




export function PresentationWorkspace() {
  const [src, setSrc] = useState<'topic' | 'episode' | 'external-chat'>('topic')
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState('educational')
  const [slideCount, setSlideCount] = useState(8)
  const [selEp, setSelEp] = useState<number | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [presentations, setPresentations] = useState<PS[]>([])
  const [archivedPresentations, setArchivedPresentations] = useState<PS[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [activePres, setActivePres] = useState<PD | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [pasteHtml, setPasteHtml] = useState('')
  const [topicMode, setTopicMode] = useState<'specific' | 'ai-decides'>('ai-decides')
  const [aiSlideCount, setAiSlideCount] = useState(true)
  const [outputFormat, setOutputFormat] = useState<'html' | 'json'>('html')
  const [sidebarWidth, setSidebarWidth] = useState(360)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const resizing = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onResizeStart = (e: React.MouseEvent) => { resizing.current = true; startX.current = e.clientX; startW.current = sidebarWidth; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none' }
  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (!resizing.current) return; const dx = e.clientX - startX.current; setSidebarWidth(Math.max(280, Math.min(700, startW.current + dx))) }
    const onUp = () => { resizing.current = false; document.body.style.cursor = ''; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])
  const [theme, setTheme] = useState<ThemeDefinition>(getTheme('vercel-dark'))
  const [customTheme, setCustomTheme] = useState<ThemeDefinition | null>(null)
  const [customPresets, setCustomPresets] = useState<ThemeDefinition[]>(() => {
    try { return JSON.parse(localStorage.getItem('presentation-custom-themes') || '[]') } catch { return [] }
  })
  const [extTopicPaste, setExtTopicPaste] = useState('')
  const [autoSave, setAutoSave] = useState(true)
  const [autoSaveKey, setAutoSaveKey] = useState(0)
  const [draftData, setDraftData] = useState<any>(null)
  const [aspectRatio, setAspectRatio] = useState<'9:8' | '9:16'>('9:8')
  // Free, user-draggable numeric target (width/height). Canonical snaps:
  // 9:16 = 0.5625, 1:1 = 1.0, 9:8 = 1.125. Persisted separately so the slider
  // is never forced back to 3 fixed stops.
  const [ratio, setRatio] = useState<number>(9 / 8)

  // Restore draft on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('presentation-draft') || '{}')
      if (saved.src || saved.topic) setDraftData(saved)
      if (saved.src) setSrc(saved.src)
      if (saved.topic) setTopic(saved.topic)
      if (saved.mode) setMode(saved.mode)
      if (saved.slideCount) setSlideCount(saved.slideCount)
      if (saved.topicMode) setTopicMode(saved.topicMode)
      if (saved.aiSlideCount !== undefined) setAiSlideCount(saved.aiSlideCount)
      if (saved.aspectRatio) setAspectRatio(saved.aspectRatio)
      if (saved.selEp) setSelEp(saved.selEp)
      if (saved.selTheme) setTheme(getTheme(saved.selTheme))
      if (saved.customTheme) setCustomTheme(saved.customTheme)
      if (saved.pasteHtml) setPasteHtml(saved.pasteHtml)
      if (saved.sidebarWidth) setSidebarWidth(saved.sidebarWidth)
      if (saved.autoSave !== undefined) setAutoSave(saved.autoSave)
    } catch { /* noop */ }
  }, [])

  // Auto-save to localStorage (debounced)
  useEffect(() => {
    if (!autoSave) return
    const timer = setTimeout(() => {
      const draft = { src, topic, mode, slideCount, topicMode, aiSlideCount, aspectRatio, selEp, selTheme: theme.id, customTheme, pasteHtml, sidebarWidth, autoSave }
      localStorage.setItem('presentation-draft', JSON.stringify(draft))
      setDraftData(draft)
    }, 500)
    return () => clearTimeout(timer)
  }, [src, topic, mode, slideCount, topicMode, aiSlideCount, aspectRatio, selEp, theme, customTheme, pasteHtml, sidebarWidth, autoSave])

  const activeTheme = customTheme || theme

  const mkPrompt = useCallback(() => {
    const plan = buildSlidePlan({
      source: src,
      topic: src === 'external-chat' ? topic : topic,
      topicMode,
      episodeTitle: episodes.find(e => e.id === selEp)?.title,
      externalChat: pasteHtml || undefined,
      slideCount: aiSlideCount ? 0 : slideCount,
      mode,
    })
    const sysPrompt = outputFormat === 'json' ? PROMPT_GENERATE_JSON : PROMPT_GENERATE_SLIDE
    return compilePrompt(plan, sysPrompt, activeTheme.tokens, ratio)
  }, [src, topic, topicMode, selEp, episodes, slideCount, aiSlideCount, mode, pasteHtml, activeTheme, ratio, outputFormat])

  // DECK prompt (used by the hybrid one-deck-call strategy). Produces the
  // single shared-<style> + N-<article> document the model is asked for.
  const mkDeckPrompt = useCallback(() => {
    const plan = buildSlidePlan({
      source: src,
      topic: src === 'external-chat' ? topic : topic,
      topicMode,
      episodeTitle: episodes.find(e => e.id === selEp)?.title,
      externalChat: pasteHtml || undefined,
      slideCount: aiSlideCount ? 0 : slideCount,
      mode,
    })
    return compileDeckPrompt(plan, activeTheme.tokens, ratio)
  }, [src, topic, topicMode, selEp, episodes, slideCount, aiSlideCount, mode, pasteHtml, activeTheme, ratio])

  const canGen = (src === 'episode' && selEp) || ((src === 'topic' || src === 'external-chat') && topic.trim())

  const loadPresentations = useCallback(async () => {
    try {
      const [res, archRes] = await Promise.all([
        api()?.list?.({ archived: false }),
        api()?.list?.({ archived: true }),
      ])
      if (res?.ok) setPresentations(res.data || [])
      if (archRes?.ok) setArchivedPresentations(archRes.data || [])
    } catch { /* noop */ }
  }, [])

  const loadEpisodes = useCallback(async () => {
    try {
      const eps = await ce()?.episodesList?.({ limit: 50 })
      if (eps) setEpisodes(eps)
    } catch { /* noop */ }
  }, [])

  useEffect(() => { loadPresentations(); loadEpisodes() }, [loadPresentations, loadEpisodes])

  const handleAuto = useCallback(async () => {
    if (!canGen || generating) return
    setGenerating(true)
    try {
      // HTML mode uses the HYBRID deck strategy: one deck prompt → backend
      // parses into N independent slides. JSON mode still uses its own spec.
      const prompt = outputFormat === 'json' ? mkPrompt() : mkDeckPrompt()
      // With the one-slide-per-call model, generation needs a concrete count.
      // "AI decides count" falls back to the mode's default slide count.
      const resolvedCount = aiSlideCount ? (MODES[mode]?.defaultSlideCount || 8) : slideCount
      const result = await api()?.generate?.({
        prompt,
        slideCount: resolvedCount,
        episodeId: selEp || undefined,
        topic: topic || undefined,
        mode,
        theme: activeTheme.tokens,
        outputFormat,
        generationStrategy: outputFormat === 'json' ? undefined : 'hybrid',
      })
      if (result?.ok && result.data?.id) {
        await loadPresentations()
        toast('Presentation generated')
        await handleOpen(result.data.id)
      } else {
        toast(result?.error || 'Generation failed', 'error')
      }
    } catch (e: any) {
      toast(e.message || 'Generation failed', 'error')
    } finally {
      setGenerating(false)
    }
  }, [canGen, generating, mkPrompt, mkDeckPrompt, slideCount, selEp, topic, mode, activeTheme, outputFormat, loadPresentations])

  const handlePasteImport = useCallback(async () => {
    if (!pasteHtml.trim()) { toast('Paste HTML output first', 'error'); return }
    setGenerating(true)
    try {
      // Store raw HTML directly — no parsing, no wrapping
      const result = await api()?.import?.({
        topic: topic || 'Imported Presentation',
        slideCount: 1,
        slides: [{ html: pasteHtml, frameType: 'value' }],
      })
      if (result?.ok && result.data?.id) {
        await loadPresentations()
        toast(`Imported ${result.data.slides?.length || result.data.slideCount || 1} slide(s)`)
        setPasteHtml('')
        // `import` returns { id, slideCount } only — fetch the full record (with slides) to open.
        try {
          const full = await api()?.get?.(result.data.id)
          if (full?.ok && full.data) { setActivePres(full.data); setCurrentSlide(0); setShowCode(false) }
        } catch { /* noop */ }
      } else {
        toast(result?.error || 'Import failed', 'error')
      }
    } catch (e: any) {
      toast(e.message || 'Import failed', 'error')
    } finally {
      setGenerating(false)
    }
  }, [pasteHtml, topic, loadPresentations])

  const handleCopyFieldPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(FIELD_PROMPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast('Topic prompt copied — paste into ChatGPT/Claude')
    } catch { toast('Copy failed', 'error') }
  }, [])

  const handleCopySlidePrompt = useCallback(async () => {
    if (!topic.trim()) { toast('Enter a topic first', 'error'); return }
    try {
      // Copy the DECK prompt (the actual payload sent for HTML generation).
      const prompt = outputFormat === 'json' ? mkPrompt() : mkDeckPrompt()
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast('Deck prompt copied — paste into ChatGPT/Claude')
    } catch { toast('Copy failed', 'error') }
  }, [topic, mkPrompt, mkDeckPrompt, outputFormat])

  const saveCustomPreset = useCallback(() => {
    const t = customTheme || theme
    const name = t.label + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const preset: ThemeDefinition = { id: 'custom-' + Date.now(), label: name, description: 'Custom preset', tokens: { ...t.tokens } }
    const updated = [...customPresets, preset]
    setCustomPresets(updated)
    localStorage.setItem('presentation-custom-themes', JSON.stringify(updated))
    toast(`Preset "${name}" saved`)
  }, [customTheme, theme, customPresets])

  const handleOpen = useCallback(async (id: string) => {
    try {
      const res = await api()?.get?.(id)
      if (res?.ok && res.data) { setActivePres(res.data); setCurrentSlide(0); setShowCode(false) }
    } catch { /* noop */ }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      setTimeout(() => setConfirmDeleteId(null), 4000)
      return
    }
    setConfirmDeleteId(null)
    try {
      await api()?.delete?.(id)
      if (activePres?.id === id) setActivePres(null)
      await loadPresentations()
      toast('Deleted')
    } catch { toast('Delete failed', 'error') }
  }, [activePres, loadPresentations, confirmDeleteId])

  const handleArchive = useCallback(async (id: string) => {
    try {
      await api()?.archive?.(id)
      if (activePres?.id === id) setActivePres(null)
      await loadPresentations()
      toast('Archived')
    } catch { toast('Archive failed', 'error') }
  }, [activePres, loadPresentations])

  const handleUnarchive = useCallback(async (id: string) => {
    try {
      await api()?.unarchive?.(id)
      if (activePres?.id === id) setActivePres(null)
      await loadPresentations()
      toast('Restored')
    } catch { toast('Restore failed', 'error') }
  }, [activePres, loadPresentations])

  const handleDownload = useCallback(() => {
    if (!activePres?.slides?.length) return
    const sorted = activePres.slides.sort((a, b) => a.index_order - b.index_order)
    // Extract body content from each slide and wrap in a single valid HTML document
    const slideSections = sorted.map((s, i) => {
      const html = s.html_content || ''
      // Extract inner body content if it's a full HTML doc
      let bodyContent = html
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      if (bodyMatch) {
        bodyContent = bodyMatch[1]
      } else {
        // If no body tags, try to extract everything after </style> or after <head>
        const styleEndMatch = html.match(/<\/style>([\s\S]*)/i)
        if (styleEndMatch) bodyContent = styleEndMatch[1].trim()
      }
      // Extract styles from the slide to embed in the shared head
      const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []
      const styles = styleMatches.map(m => m.replace(/<\/?style[^>]*>/gi, '')).join('\n')
      return { bodyContent, styles, index: i }
    })
    // Collect all unique styles
    const sharedStyle = (activePres as any).shared_style || ''
    const allStyles = [sharedStyle, ...slideSections.map(s => s.styles)].filter(Boolean).join('\n')
    // Build navigation sections
    const sections = slideSections.map(s => `<section class="slide" data-index="${s.index}">${s.bodyContent}</section>`).join('\n')
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${activePres.title || 'Presentation'}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #0A0A0B; color: #FAFAFA; font-family: Inter, system-ui, sans-serif; }
  .slide { display: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
  .slide.active { display: flex; }
  .nav-bar { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; z-index: 1000; background: rgba(10,10,12,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); border-radius: 9999px; padding: 6px 16px; }
  .nav-bar button { background: none; border: none; color: #a1a1aa; cursor: pointer; font-size: 14px; padding: 4px 8px; border-radius: 6px; transition: all 0.15s; }
  .nav-bar button:hover { color: #fafafa; background: rgba(255,255,255,0.08); }
  .nav-bar button:disabled { opacity: 0.3; cursor: default; }
  .nav-bar .counter { font-size: 11px; color: #71717a; font-variant-numeric: tabular-nums; min-width: 48px; text-align: center; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.15); cursor: pointer; transition: all 0.2s; }
  .dot.active { background: #10b981; transform: scale(1.3); }
  ${allStyles}
</style>
</head>
<body>
${sections}
<div class="nav-bar">
  <button onclick="go(-1)" id="prevBtn" disabled>&#9664;</button>
  <span class="counter" id="counter">1 / ${sorted.length}</span>
  <button onclick="go(1)" id="nextBtn">${sorted.length > 1 ? '&#9654;' : ''}</button>
</div>
<script>
  let cur = 0;
  const total = ${sorted.length};
  const slides = document.querySelectorAll('.slide');
  function show(i) {
    slides.forEach(s => s.classList.remove('active'));
    if (slides[i]) slides[i].classList.add('active');
    document.getElementById('counter').textContent = (i + 1) + ' / ' + total;
    document.getElementById('prevBtn').disabled = i === 0;
    document.getElementById('nextBtn').disabled = i >= total - 1;
    document.querySelectorAll('.dot').forEach((d, j) => d.classList.toggle('active', j === i));
  }
  function go(d) { const n = cur + d; if (n >= 0 && n < total) { cur = n; show(cur); } }
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });
  show(0);
</script>
</body>
</html>`
    const blob = new Blob([fullHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activePres.title || 'presentation'}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast('Downloaded')
  }, [activePres])

  // Declared BEFORE the callbacks below so the useCallback dependency arrays
  // (and the JSX) don't hit a temporal-dead-zone crash on render.
  const slides = activePres?.slides?.sort((a, b) => a.index_order - b.index_order) || []

  // Capture the CURRENT slide as a PNG image (per-slide record).
  const handleExportSlidePng = useCallback(async () => {
    const slide = slides[currentSlide]
    if (!slide) return
    setExportingSlide(true)
    try {
      const res = await api()?.exportSlide?.(slide.id, false)
      if (res?.ok) toast('Slide captured as PNG')
      else toast(res?.error || 'Export failed', 'error')
    } catch (e: any) {
      toast(e?.message || 'Export failed', 'error')
    } finally {
      setExportingSlide(false)
    }
  }, [slides, currentSlide])

  // Download the CURRENT slide as a standalone HTML file (recomposed with shared styles).
  const handleDownloadSlideHtml = useCallback(() => {
    const slide = slides[currentSlide]
    if (!slide) return
    const html = recomposeSlideHtml((activePres as any).shared_style || '', slide.html_content || '')
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(activePres.title || 'slide').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'slide'}-${currentSlide + 1}.html`
    a.click()
    URL.revokeObjectURL(url)
    toast(`Slide ${currentSlide + 1} downloaded`)
  }, [slides, currentSlide, activePres])

  const [regenSlide, setRegenSlide] = useState(false)
  // Per-slide export (capture as PNG) busy state.
  const [exportingSlide, setExportingSlide] = useState(false)
  const handleRegenerateSlide = useCallback(async () => {
    if (!activePres?.id || regenSlide) return
    const slide = slides[currentSlide]
    if (!slide) return
    setRegenSlide(true)
    try {
      const prompt = outputFormat === 'json' ? mkPrompt() : mkDeckPrompt()
      const res = await api()?.regenerateSlide?.({
        presentationId: activePres.id,
        slideId: slide.id,
        index: currentSlide,
        count: slides.length,
        prompt,
        outputFormat,
        mode,
      })
      if (res?.ok && res.data?.html) {
        // Refresh the full record so the slide list + shared_style are current.
        const full = await api()?.get?.(activePres.id)
        if (full?.ok && full.data) { setActivePres(full.data); setCurrentSlide(currentSlide) }
        toast('Slide regenerated')
      } else {
        toast(res?.error || 'Regeneration failed', 'error')
      }
    } catch (e: any) {
      toast(e.message || 'Regeneration failed', 'error')
    } finally {
      setRegenSlide(false)
    }
  }, [activePres, slides, currentSlide, outputFormat, mkPrompt, mkDeckPrompt, mode])

  const modeInfo = MODES[mode] || MODES.educational

  return (
    <div className="flex flex-col h-full">
      <ToastHost />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#0a0a0c]">
        <Presentation size={16} className="text-[#10b981]" />
        <h2 className="text-sm font-semibold text-zinc-100">Presentation Studio</h2>
        <span className="text-[10px] text-zinc-500 ml-auto">{presentations.length} saved · {archivedPresentations.length} archived</span>
        <button onClick={() => (window as any).deskflowAPI?.restartApp?.()} className="h-6 px-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[9px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors flex items-center gap-1" title="Restart app to reload main process changes">
          <RotateCcw size={10} /> Restart
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — controls (resizable) */}
        <div style={{ width: sidebarWidth }} className="shrink-0 border-r border-white/[0.06] bg-[#0c0c0e] overflow-y-auto p-4 flex flex-col gap-4 relative">
          {/* Row 1: Source selector */}
          <div>
            <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Source</label>
            <div className="flex gap-1.5">
              {([['topic', 'Topic'], ['episode', 'Episode'], ['external-chat', 'External Chat']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setSrc(v)} className={cn('flex-1 h-7 rounded-lg text-[10px] font-medium border transition-all', src === v ? 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]' : 'border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-zinc-300')}>{l}</button>
              ))}
            </div>
          </div>

          {/* Row 3: Mode + slide count */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Mode</label>
              <select value={mode} onChange={e => { setMode(e.target.value); setSlideCount(MODES[e.target.value]?.defaultSlideCount || 8) }} className="w-full h-7 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-[10px] text-zinc-300 outline-none cursor-pointer">
                {Object.values(MODES).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div className="w-20">
              <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Slides</label>
              {aiSlideCount ? (
                <button onClick={() => { setAiSlideCount(false); setSlideCount(modeInfo.defaultSlideCount || 8) }} className="w-full h-7 rounded-lg border border-[#a855f7]/30 bg-[#a855f7]/10 text-[10px] font-medium text-[#a855f7] hover:bg-[#a855f7]/20 transition-colors flex items-center justify-center gap-1">
                  <Sparkles size={10} /> AI Decides
                </button>
              ) : (
                <div className="flex gap-1">
                  <input type="number" value={slideCount} min={modeInfo.minSlides} max={modeInfo.maxSlides} onChange={e => setSlideCount(Math.max(modeInfo.minSlides, Math.min(modeInfo.maxSlides, +e.target.value || 8)))} className="flex-1 h-7 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-[10px] text-zinc-300 outline-none text-center" />
                  <button onClick={() => setAiSlideCount(true)} className="h-7 w-7 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[10px] text-zinc-500 hover:text-[#a855f7] hover:border-[#a855f7]/30 transition-colors flex items-center justify-center" title="AI Decides">
                    <Sparkles size={10} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Auto-save toggle */}
          <div className="flex items-center gap-2 px-1">
            <button onClick={() => setAutoSave(!autoSave)} className={cn('relative w-7 h-4 rounded-full transition-colors', autoSave ? 'bg-[#10b981]' : 'bg-white/[0.12]')}>
              <div className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform', autoSave ? 'translate-x-3.5' : 'translate-x-0.5')} />
            </button>
            <span className="text-[9px] text-zinc-500">Auto-save draft</span>
          </div>

          {/* Row 4: Source-specific input */}
          {src === 'topic' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Topic</label>
                <div className="flex gap-1">
                  <button onClick={() => setTopicMode('specific')} className={cn('text-[9px] px-1.5 py-0.5 rounded border transition-all', topicMode === 'specific' ? 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]' : 'border-white/[0.06] text-zinc-500 hover:text-zinc-300')}>Specific</button>
                  <button onClick={() => setTopicMode('ai-decides')} className={cn('text-[9px] px-1.5 py-0.5 rounded border transition-all', topicMode === 'ai-decides' ? 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]' : 'border-white/[0.06] text-zinc-500 hover:text-zinc-300')}>AI Decides</button>
                </div>
              </div>
              <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} placeholder="e.g. React Server Components architecture" className="w-full min-h-[72px] resize-y rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[#10b981]/40" />
            </div>
          )}

          {src === 'episode' && (
            <div>
              <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1 block">Episode</label>
              <select value={selEp || ''} onChange={e => setSelEp(+e.target.value || null)} className="w-full h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-xs text-zinc-300 outline-none cursor-pointer">
                <option value="">Select episode...</option>
                {episodes.map(ep => <option key={ep.id} value={ep.id}>{ep.title}</option>)}
              </select>
            </div>
          )}

          {src === 'external-chat' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Topic</label>
                  <button onClick={handleCopyFieldPrompt} className="h-5 px-1.5 rounded text-[8px] font-medium text-[#a855f7] bg-[#a855f7]/10 border border-[#a855f7]/20 hover:bg-[#a855f7]/20 flex items-center gap-1 transition-colors">
                    <Copy size={8} /> Copy Topic Prompt
                  </button>
                </div>
                <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} placeholder="Paste topic from your AI here..." className="w-full min-h-[72px] resize-y rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[#10b981]/40" />
              </div>
            </>
          )}

          {/* Row 4: Theme — Kits + Palette + Fonts */}
          <div>
            {/* Packaged Kits */}
            <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Quick Kits</label>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
              {THEME_REGISTRY.filter(t => t.id.startsWith('kit-')).map(t => (
                <ThemeCard key={t.id} t={t} selected={activeTheme.id === t.id && !customTheme} onClick={() => { setTheme(t); setCustomTheme(null) }} isKit />
              ))}
            </div>

            {/* Palettes */}
            <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1 mt-2 block">Palettes</label>
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
              {THEME_REGISTRY.filter(t => t.id.startsWith('pal-')).map(t => (
                <button key={t.id} onClick={() => { setTheme(t); setCustomTheme(null) }} className={cn('shrink-0 w-14 rounded-lg border p-1 transition-all', activeTheme.id === t.id && !customTheme ? 'border-[#10b981]/60 ring-1 ring-[#10b981]/30' : 'border-white/[0.08] hover:border-white/[0.15]')}>
                  <div className="flex h-3 rounded overflow-hidden mb-0.5">
                    <div className="flex-1" style={{ background: t.tokens.bg }} />
                    <div className="flex-1" style={{ background: t.tokens.fg }} />
                    <div className="flex-1" style={{ background: t.tokens.accent }} />
                    <div className="flex-1" style={{ background: t.tokens.accent2 }} />
                    <div className="flex-1" style={{ background: t.tokens.warning }} />
                  </div>
                  <div className="text-[7px] text-zinc-400 truncate text-center">{t.label}</div>
                </button>
              ))}
            </div>

            {/* Font Combos */}
            <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1 mt-2 block">Fonts</label>
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
              {FONT_COMBOS.map(f => {
                const isActive = activeTheme.tokens.fontHeader === f.display && activeTheme.tokens.fontBody === f.body
                return (
                  <button key={f.id} onClick={() => {
                    const pal = PALETTES.find(p => activeTheme.tokens.accent === p.accent) || PALETTES[0]
                    const newTheme = getThemeFromCombo(pal.id, f.id)
                    setTheme(newTheme); setCustomTheme(null)
                  }} className={cn('shrink-0 w-20 rounded-lg border p-1.5 transition-all text-left', isActive ? 'border-[#10b981]/60 bg-[#10b981]/10 ring-1 ring-[#10b981]/30' : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15]')}>
                    <div className="text-[9px] font-bold truncate mb-0.5" style={{ fontFamily: f.display, color: isActive ? '#10b981' : '#e4e4e7' }}>Aa</div>
                    <div className="text-[7px] text-zinc-500 truncate">{f.name}</div>
                  </button>
                )
              })}
            </div>

            {/* Customizer */}
            <div className="mt-2">
              <ThemeCustomizer theme={activeTheme} onChange={(t) => setCustomTheme(t)} onResetToPreset={() => setCustomTheme(null)} onSavePreset={saveCustomPreset} />
            </div>
          </div>

          {/* Paste import area */}
          {(src === 'topic' || src === 'external-chat') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Or Paste HTML Output</label>
                {src === 'external-chat' && (
                  <button onClick={handleCopySlidePrompt} disabled={!topic.trim()} className={cn('h-5 px-1.5 rounded text-[8px] font-medium flex items-center gap-1 transition-colors', topic.trim() ? 'text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 hover:bg-[#f59e0b]/20' : 'text-zinc-600 bg-white/[0.02] border border-white/[0.06] cursor-not-allowed')}>
                    <Copy size={8} /> Copy Deck Prompt
                  </button>
                )}
              </div>
              <textarea value={pasteHtml} onChange={e => setPasteHtml(e.target.value)} placeholder="Paste raw HTML from external AI..." rows={3} className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[#10b981]/30 resize-none font-mono text-[10px]" />
            </div>
          )}

          {/* Output format toggle */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-[9px] text-zinc-500">Output:</span>
            <button onClick={() => setOutputFormat('html')} className={cn('h-5 px-2 rounded text-[8px] font-medium border transition-all', outputFormat === 'html' ? 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]' : 'border-white/[0.06] text-zinc-500 hover:text-zinc-300')}>HTML</button>
            <button onClick={() => setOutputFormat('json')} className={cn('h-5 px-2 rounded text-[8px] font-medium border transition-all', outputFormat === 'json' ? 'border-[#a855f7]/40 bg-[#a855f7]/10 text-[#a855f7]' : 'border-white/[0.06] text-zinc-500 hover:text-zinc-300')}>JSON</button>
          </div>

          {/* Live dynamic prompt preview — proves which fields changed the prompt */}
          {outputFormat === 'html' && (
            <DynamicPromptPreview
              prompt={mkDeckPrompt()}
              title="Deck Prompt (live)"
              dynamicSections={[
                { id: 'topic', label: 'topic', detect: 'linePrefix', match: 'Goal: ', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                { id: 'slides', label: aiSlideCount ? 'AI decides count' : `slides: ${slideCount}`, detect: 'regex', match: '^SLIDE PLAN \\(\\d+ slides\\)', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
                { id: 'theme', label: 'theme colors + fonts', detect: 'linePrefix', match: ':root {', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
                { id: 'mode', label: `mode: ${mode}`, detect: 'linePrefix', match: 'Structured deck —', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
                { id: 'ratio', label: `ratio: ${Math.round(ratio * 1000) / 1000}`, detect: 'contains', match: 'TARGET ASPECT RATIO', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
                { id: 'deck', label: 'deck slide', detect: 'regex', match: '^<article data-slide=', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
              ]}
            />
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-auto pt-3 border-t border-white/[0.06]">
            {pasteHtml.trim() ? (
              <button onClick={handlePasteImport} disabled={generating} className="flex-1 h-9 rounded-lg bg-[#10b981] text-white text-xs font-semibold hover:bg-[#0ea573] disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all">
                {generating ? <LoaderCircle size={13} className="animate-spin" /> : <Clipboard size={13} />}
                Import Slides
              </button>
            ) : (
              <>
                <button onClick={handleAuto} disabled={!canGen || generating} className="flex-1 h-9 rounded-lg bg-[#10b981] text-white text-xs font-semibold hover:bg-[#0ea573] disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all">
                  {generating ? <LoaderCircle size={13} className="animate-spin" /> : <Brain size={13} />}
                  Auto Generate
                </button>
                <button onClick={handleCopySlidePrompt} disabled={!canGen} className={cn('h-9 px-3 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all', canGen ? 'border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20' : 'border-white/[0.06] bg-white/[0.02] text-zinc-600 cursor-not-allowed')}>
                  <Copy size={13} /> Copy Deck Prompt
                </button>
              </>
            )}
          </div>

          {/* Saved Drafts */}
          <div className="mt-auto pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Saved ({presentations.length + (draftData ? 1 : 0)})</span>
              <button onClick={loadPresentations} className="text-[8px] text-zinc-600 hover:text-zinc-400 transition-colors">Refresh</button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {/* Auto-saved draft */}
              {draftData && (
                <button onClick={() => {
                  setSrc(draftData.src || 'topic')
                  setTopic(draftData.topic || '')
                  setMode(draftData.mode || 'educational')
                  setSlideCount(draftData.slideCount || 8)
                  setTopicMode(draftData.topicMode || 'ai-decides')
                  setAiSlideCount(draftData.aiSlideCount !== false)
                  setSelEp(draftData.selEp || null)
                  setTheme(getTheme(draftData.selTheme || 'vercel-dark'))
                  setCustomTheme(draftData.customTheme || null)
                  setPasteHtml(draftData.pasteHtml || '')
                  toast('Draft restored')
                }} className="w-full text-left rounded-lg px-2 py-1.5 transition-colors hover:bg-[#f59e0b]/[0.06] border border-[#f59e0b]/20">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-bold text-[#f59e0b] bg-[#f59e0b]/10 px-1 rounded">DRAFT</span>
                    <span className="text-[10px] text-zinc-200 font-medium truncate">{draftData.topic || 'Untitled'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[8px] text-zinc-600">{draftData.src}</span>
                    <span className="text-[8px] text-zinc-600">{draftData.mode}</span>
                    {draftData.aiSlideCount !== false && <span className="text-[7px] text-purple-400">AI decides</span>}
                    {draftData.aiSlideCount === false && <span className="text-[8px] text-zinc-600">{draftData.slideCount} slides</span>}
                  </div>
                </button>
              )}
              {/* Saved presentations */}
              {presentations.length === 0 && !draftData && (
                <div className="text-[9px] text-zinc-600 text-center py-3">No saved presentations</div>
              )}
              {presentations.map(p => (
                <div key={p.id} className={cn('w-full text-left rounded-lg px-2 py-1.5 transition-colors group', activePres?.id === p.id ? 'bg-[#10b981]/10 border border-[#10b981]/20' : 'hover:bg-white/[0.04] border border-transparent')}>
                  <button onClick={() => handleOpen(p.id)} className="w-full text-left">
                    <div className="text-[10px] text-zinc-200 font-medium truncate">{p.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] text-zinc-600">{p.slide_count} slides</span>
                      <span className="text-[8px] text-zinc-600">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                  <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleArchive(p.id) }} className="text-[7px] px-1.5 py-0.5 rounded border border-white/[0.06] text-zinc-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors flex items-center gap-0.5">
                      <Archive size={7} /> Archive
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }} className={cn('text-[7px] px-1.5 py-0.5 rounded border transition-colors flex items-center gap-0.5', confirmDeleteId === p.id ? 'border-rose-500/60 text-rose-300 animate-pulse' : 'border-white/[0.06] text-zinc-500 hover:text-rose-400 hover:border-rose-500/30')}>
                      <Trash2 size={7} /> {confirmDeleteId === p.id ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Archived section */}
            {archivedPresentations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-1.5 w-full mb-2 group">
                  <Archive size={9} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wider group-hover:text-zinc-400 transition-colors">Archived ({archivedPresentations.length})</span>
                  <ChevronDown size={9} className={cn('text-zinc-600 transition-transform ml-auto', showArchived && 'rotate-180')} />
                </button>
                {showArchived && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {archivedPresentations.map(p => (
                      <div key={p.id} className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-white/[0.04] border border-transparent group">
                        <button onClick={() => handleOpen(p.id)} className="w-full text-left">
                          <div className="text-[10px] text-zinc-400 font-medium truncate">{p.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[8px] text-zinc-600">{p.slide_count} slides</span>
                            <span className="text-[8px] text-zinc-600">{new Date(p.archived_at || p.created_at).toLocaleDateString()}</span>
                          </div>
                        </button>
                        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); handleUnarchive(p.id) }} className="text-[7px] px-1.5 py-0.5 rounded border border-white/[0.06] text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors flex items-center gap-0.5">
                            <ArchiveRestore size={7} /> Restore
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }} className={cn('text-[7px] px-1.5 py-0.5 rounded border transition-colors flex items-center gap-0.5', confirmDeleteId === p.id ? 'border-rose-500/60 text-rose-300 animate-pulse' : 'border-white/[0.06] text-zinc-500 hover:text-rose-400 hover:border-rose-500/30')}>
                            <Trash2 size={7} /> {confirmDeleteId === p.id ? 'Confirm?' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Resize handle */}
        <div onMouseDown={onResizeStart} className="w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-[#10b981]/20 transition-colors group" title="Drag to resize">
          <div className="w-px h-8 mx-auto bg-white/[0.1] group-hover:bg-[#10b981]/50 transition-colors" />
        </div>

        {/* Right panel — preview / saved list */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0c]">
          {activePres ? (
            <>
              {/* Presentation toolbar */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] bg-[#0c0c0e]">
                <button onClick={() => setActivePres(null)} className="h-7 px-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-all">
                  <ChevronLeft size={11} /> Back
                </button>
                <span className="text-xs text-zinc-200 font-medium truncate">{activePres.title}</span>
                <span className="text-[9px] text-zinc-500 ml-1">{slides.length} slides</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <AspectRatioControl ratio={ratio} onRatioChange={setRatio} onSaved={(msg) => toast(msg)} />
                  <button onClick={() => setShowCode(!showCode)} className={cn('h-7 px-2 rounded-lg border text-[10px] flex items-center gap-1 transition-all', showCode ? 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]' : 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-zinc-200')}>
                    {showCode ? <Eye size={11} /> : <Code size={11} />}
                    {showCode ? 'Preview' : 'Code'}
                  </button>
                  <button onClick={handleDownload} className="h-7 px-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-all" title="Download the whole deck as one HTML file">
                    <Download size={11} /> Deck
                  </button>
                  <button onClick={handleDownloadSlideHtml} className="h-7 px-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-all" title="Download the current slide as a standalone HTML file">
                    <FileDown size={11} /> Slide HTML
                  </button>
                  <button onClick={handleExportSlidePng} disabled={exportingSlide} className={cn('h-7 px-2 rounded-lg border text-[10px] flex items-center gap-1 transition-all', exportingSlide ? 'border-white/[0.08] bg-white/[0.03] text-zinc-500' : 'border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20')} title="Record the current slide as a PNG image">
                    {exportingSlide ? <LoaderCircle size={11} className="animate-spin" /> : <ImageDown size={11} />}
                    {exportingSlide ? 'Exporting…' : 'Export PNG'}
                  </button>
                  {activePres.format_mode !== 'json' && (
                    <button onClick={handleRegenerateSlide} disabled={regenSlide} className={cn('h-7 px-2 rounded-lg border text-[10px] flex items-center gap-1 transition-all', regenSlide ? 'border-white/[0.08] bg-white/[0.03] text-zinc-500' : 'border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20')} title="Regenerate current slide">
                      {regenSlide ? <LoaderCircle size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                      {regenSlide ? 'Regen…' : 'Regen'}
                    </button>
                  )}
                  {activePres.archived_at ? (
                    <button onClick={() => handleUnarchive(activePres.id)} className="h-7 px-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-400 hover:bg-amber-500/10 flex items-center gap-1 transition-all">
                      <ArchiveRestore size={11} /> Restore
                    </button>
                  ) : (
                    <button onClick={() => handleArchive(activePres.id)} className="h-7 px-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-all">
                      <Archive size={11} /> Archive
                    </button>
                  )}
                  <button onClick={() => handleDelete(activePres.id)} className={cn('h-7 px-2 rounded-lg border text-[10px] flex items-center gap-1 transition-all', confirmDeleteId === activePres.id ? 'border-rose-500/60 bg-rose-500/20 text-rose-300 animate-pulse' : 'border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10')}>
                    <Trash2 size={11} /> {confirmDeleteId === activePres.id ? 'Confirm?' : ''}
                  </button>
                </div>
              </div>

              {/* Slide navigation */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]">
                <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0} className="h-6 w-6 rounded border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-zinc-200 disabled:opacity-30 flex items-center justify-center transition-all">
                  <ChevronLeft size={12} />
                </button>
                <span className="text-[10px] text-zinc-400 font-medium">{currentSlide + 1} / {slides.length}</span>
                <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} disabled={currentSlide >= slides.length - 1} className="h-6 w-6 rounded border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-zinc-200 disabled:opacity-30 flex items-center justify-center transition-all">
                  <ChevronRight size={12} />
                </button>
                <div className="flex-1" />
                {/* Slide dots */}
                <div className="flex gap-1">
                  {slides.map((_, i) => (
                    <button key={i} onClick={() => setCurrentSlide(i)} className={cn('w-2 h-2 rounded-full transition-all', i === currentSlide ? 'bg-[#10b981]' : 'bg-white/[0.12] hover:bg-white/[0.2]')} />
                  ))}
                </div>
              </div>

              {/* Slide content */}
              <div className="flex-1 overflow-auto p-4">
                {slides[currentSlide] ? (
                  showCode ? (
                    <pre className="text-[10px] text-zinc-300 font-mono whitespace-pre-wrap bg-[#141419] rounded-xl border border-white/[0.06] p-4 overflow-auto max-h-[60vh]">
                      {slides[currentSlide].html_content}
                    </pre>
                  ) : slides[currentSlide].format === 'json' ? (
                    (() => {
                      try {
                        // In JSON mode each slide row stores a single SlideSpec (JSON.stringify(slide)),
                        // not a wrapper with a `slides` array — use it directly.
                        const jsonSlide = JSON.parse(slides[currentSlide].html_content)
                        if (jsonSlide && (jsonSlide.headline || jsonSlide.type)) {
                          return (
                            <div className="rounded-xl border border-white/[0.08] bg-[#0A0A0B] overflow-hidden h-full" style={{ aspectRatio: ratio }}>
                              <SlideRenderer slide={jsonSlide} theme={activeTheme.tokens} isActive={true} />
                            </div>
                          )
                        }
                      } catch { /* parse failed, fall through to HTML */ }
                      return (
                      <div className="rounded-xl border border-white/[0.08] bg-white overflow-hidden relative" style={{ aspectRatio: ratio, maxHeight: '100%' }}>
                        <iframe srcDoc={slides[currentSlide].html_content} className="absolute inset-0 w-full h-full border-0" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" title={`Slide ${currentSlide + 1}`} style={{ background: '#fff' }} />
                        </div>
                      )
                    })()
                  ) : (
                    <FitSlidePreview key={currentSlide} sharedStyle={activePres.shared_style || ''} html={slides[currentSlide].html_content} ratio={ratio} />
                  )
                ) : (
                  <div className="flex items-center justify-center h-64 text-zinc-600 text-xs">No slides</div>
                )}
              </div>
            </>
          ) : (
            /* Saved presentations list */
            <div className="flex-1 overflow-auto p-4">
              {presentations.length === 0 && archivedPresentations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                  <Presentation size={24} className="opacity-30" />
                  <span className="text-xs">No presentations yet. Configure and generate one.</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Active presentations */}
                  {presentations.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Saved ({presentations.length})</div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {presentations.map(p => (
                          <div key={p.id} className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left hover:border-[#10b981]/30 hover:bg-white/[0.04] transition-all relative">
                            <button onClick={() => handleOpen(p.id)} className="w-full text-left">
                              <div className="text-xs text-zinc-200 font-medium truncate mb-1">{p.title}</div>
                              <div className="text-[10px] text-zinc-500">{p.slide_count} slides</div>
                              <div className="text-[9px] text-zinc-600 mt-1">{new Date(p.created_at).toLocaleDateString()}</div>
                            </button>
                            <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); handleArchive(p.id) }} className="text-[8px] px-1.5 py-0.5 rounded border border-white/[0.06] text-zinc-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors flex items-center gap-0.5">
                                <Archive size={8} /> Archive
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }} className={cn('text-[8px] px-1.5 py-0.5 rounded border transition-colors flex items-center gap-0.5', confirmDeleteId === p.id ? 'border-rose-500/60 text-rose-300 animate-pulse' : 'border-white/[0.06] text-zinc-500 hover:text-rose-400 hover:border-rose-500/30')}>
                                <Trash2 size={8} /> {confirmDeleteId === p.id ? 'Confirm?' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Archived presentations */}
                  {archivedPresentations.length > 0 && (
                    <div>
                      <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2 mb-3 group">
                        <Archive size={11} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider group-hover:text-zinc-400 transition-colors">Archived ({archivedPresentations.length})</span>
                        <ChevronDown size={11} className={cn('text-zinc-600 transition-transform', showArchived && 'rotate-180')} />
                      </button>
                      {showArchived && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                          {archivedPresentations.map(p => (
                            <div key={p.id} className="group rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 text-left hover:border-white/[0.1] hover:bg-white/[0.03] transition-all relative opacity-60 hover:opacity-100">
                              <button onClick={() => handleOpen(p.id)} className="w-full text-left">
                                <div className="text-xs text-zinc-400 font-medium truncate mb-1">{p.title}</div>
                                <div className="text-[10px] text-zinc-600">{p.slide_count} slides</div>
                                <div className="text-[9px] text-zinc-600 mt-1">Archived {new Date(p.archived_at || p.created_at).toLocaleDateString()}</div>
                              </button>
                              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleUnarchive(p.id) }} className="text-[8px] px-1.5 py-0.5 rounded border border-white/[0.06] text-zinc-500 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors flex items-center gap-0.5">
                                  <ArchiveRestore size={8} /> Restore
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }} className={cn('text-[8px] px-1.5 py-0.5 rounded border transition-colors flex items-center gap-0.5', confirmDeleteId === p.id ? 'border-rose-500/60 text-rose-300 animate-pulse' : 'border-white/[0.06] text-zinc-500 hover:text-rose-400 hover:border-rose-500/30')}>
                                  <Trash2 size={8} /> {confirmDeleteId === p.id ? 'Confirm?' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Fit-to-screen slide preview. Renders the slide at its design aspect ratio and
// scales it to fit the available viewport (height-aware, never clipped), centered
// in the container. Uses a ResizeObserver so it adapts to panel resizes.
function FitSlidePreview({ sharedStyle, html, ratio }: { sharedStyle: string; html: string; ratio: number }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [dim, setDim] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setDim({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Design base height; width derived from ratio (w = h * ratio).
  const designH = 900
  const designW = Math.round(designH * ratio)
  const pad = 16
  const availW = Math.max(0, dim.w - pad)
  const availH = Math.max(0, dim.h - pad)
  const scale = availW > 0 && availH > 0 && designW > 0
    ? Math.min(availW / designW, availH / designH, 1)
    : 1

  return (
    <div ref={boxRef} className="w-full h-full flex items-center justify-center overflow-hidden">
      {dim.w > 0 && dim.h > 0 && (
        <div style={{ width: designW, height: designH, transform: `scale(${scale})`, transformOrigin: 'center center' }}>
          <iframe
            srcDoc={recomposeSlideHtml(sharedStyle, html)}
            className="rounded-xl border border-white/[0.08] bg-white border-0"
            style={{ width: designW, height: designH, pointerEvents: 'none' }}
            sandbox="allow-scripts"
            title="Slide preview"
          />
        </div>
      )}
    </div>
  )
}
