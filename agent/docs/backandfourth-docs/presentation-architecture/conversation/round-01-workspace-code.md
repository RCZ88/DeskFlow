# CONTEXT: PresentationWorkspace.tsx — Complete Current Implementation

> This is the EXACT source code of `src/features/presentation/PresentationWorkspace.tsx` (1008 lines).
> No summarization. No omissions. The full file as it exists on disk.

---

```tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Presentation, ChevronLeft, ChevronRight, Download, Trash2, LoaderCircle, Eye, Code, Copy, Check, X, Clipboard, AlertTriangle, Brain, Palette, ChevronDown, RotateCcw, Sparkles, Archive, ArchiveRestore } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROMPT_GENERATE_SLIDE, PROMPT_GENERATE_JSON } from '@/services/presentation/prompts'
import { parseSlides, type ParsedSlide } from '@/services/presentation/htmlParser'
import { validateSlide, validateSpec, validateThemeId } from '@/services/presentation/slideValidator'
import { MODES } from '@/services/presentation/modeRegistry'
import { buildSlidePlan, compilePrompt } from '@/services/presentation/promptComposer'
import { THEME_REGISTRY, getTheme, getThemeFromCombo, PALETTES, FONT_COMBOS, type ThemeDefinition } from '@/services/presentation/themeRegistry'
import SlideRenderer from './SlideRenderer'
const api = () => (window as any).deskflowAPI?.presentation
const ce = () => (window as any).deskflowAPI?.contentEngine
const ctx = () => (window as any).deskflowAPI
console.log('%c[Presentation] v7.0 loaded', 'color: #10b981; font-weight: bold')

type Episode = { id: number; title: string; status: string }
type PS = { id: string; episode_id?: number; topic?: string; title: string; status: string; slide_count: number; created_at: string; archived_at?: string }
type SL = { id: string; presentation_id: string; index_order: number; frame_type: string; html_content: string }
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
      <div className="flex h-4 rounded overflow-hidden mb-1.5">
        <div className="flex-1" style={{ background: t.tokens.bg }} />
        <div className="flex-1" style={{ background: t.tokens.fg }} />
        <div className="flex-1" style={{ background: t.tokens.accent }} />
        <div className="flex-1" style={{ background: t.tokens.accent2 }} />
        <div className="flex-1" style={{ background: t.tokens.warning }} />
      </div>
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
      <div className="px-2 py-2 space-y-2">
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

function PromptPreview({ prompt, topic, theme, slideCount, mode, aiSlideCount }: { prompt: string; topic: string; theme: ThemeDefinition; slideCount: number; mode: string; aiSlideCount: boolean }) {
  const [view, setView] = useState<'raw' | 'visual'>('visual')
  const sections = useMemo(() => {
    const lines = prompt.split('\n')
    const result: { text: string; variable?: string; color: string }[] = []
    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      if (line.startsWith('Goal: ')) { result.push({ text: line, variable: 'topic', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }); i++; continue }
      if (line.match(/^SLIDE PLAN \(\d+ slides\)/)) { result.push({ text: line, variable: aiSlideCount ? 'AI decides count' : `slides: ${slideCount}`, color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }); i++; continue }
      if (line.trim() === ':root {') { let block = line + '\n'; i++; while (i < lines.length && !lines[i].trim().startsWith('}')) { block += lines[i] + '\n'; i++ } if (i < lines.length) block += lines[i]; result.push({ text: block, variable: 'theme colors + fonts', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }); i++; continue }
      if (line.startsWith('Structured —') || line.startsWith('Generation mode:')) { result.push({ text: line, variable: `mode: ${mode}`, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' }); i++; continue }
      if (line.match(/^Slide \d+ \[/)) { result.push({ text: line, variable: `slide ${line.match(/Slide (\d+)/)?.[1]}`, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' }); i++; continue }
      result.push({ text: line, color: 'text-zinc-500' }); i++
    }
    return result
  }, [prompt, topic, theme, slideCount, mode, aiSlideCount])
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/[0.06]">
        <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">Prompt Preview</span>
        <div className="flex gap-0.5 p-0.5 rounded bg-white/[0.04]">
          <button onClick={() => setView('visual')} className={cn('h-4 px-1.5 rounded text-[8px] font-medium transition-colors', view === 'visual' ? 'bg-[#10b981]/15 text-[#10b981]' : 'text-zinc-500')}>Visual</button>
          <button onClick={() => setView('raw')} className={cn('h-4 px-1.5 rounded text-[8px] font-medium transition-colors', view === 'raw' ? 'bg-[#10b981]/15 text-[#10b981]' : 'text-zinc-500')}>Raw</button>
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto p-2 font-mono text-[9px] leading-relaxed">
        {view === 'raw' ? (
          <pre className="text-zinc-500 whitespace-pre-wrap">{prompt}</pre>
        ) : (
          <div className="space-y-0.5">
            {sections.map((s, i) => (
              <div key={i} className="flex items-start gap-1">
                {s.variable ? (
                  <span className={cn('shrink-0 px-1 py-0.5 rounded border text-[7px] font-semibold leading-none mt-0.5', s.color)}>{s.variable}</span>
                ) : <span className="shrink-0 w-1" />}
                <pre className="text-zinc-500 whitespace-pre-wrap flex-1 min-w-0">{s.text}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function PresentationWorkspace() {
  // === 1. STATE (lines 301-342) ===
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
  const [outputFormat, setOutputFormat] = useState<'html' | 'json'>('html')   // ← MODE TOGGLE
  const [sidebarWidth, setSidebarWidth] = useState(360)
  const [theme, setTheme] = useState<ThemeDefinition>(getTheme('vercel-dark'))
  const [customTheme, setCustomTheme] = useState<ThemeDefinition | null>(null)
  const [customPresets, setCustomPresets] = useState<ThemeDefinition[]>(() => {
    try { return JSON.parse(localStorage.getItem('presentation-custom-themes') || '[]') } catch { return [] }
  })
  const [autoSave, setAutoSave] = useState(true)
  const [draftData, setDraftData] = useState<any>(null)
  const [aspectRatio, setAspectRatio] = useState<'9:8' | '9:16'>('9:8')

  const activeTheme = customTheme || theme

  // === 2. mkPrompt (lines 378-390) ===
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
    return compilePrompt(plan, sysPrompt, activeTheme.tokens, aspectRatio)
  }, [src, topic, topicMode, selEp, episodes, slideCount, aiSlideCount, mode, pasteHtml, activeTheme, aspectRatio, outputFormat])

  // === 3. handleAuto (lines 414-439) ===
  const handleAuto = useCallback(async () => {
    if (!canGen || generating) return
    setGenerating(true)
    try {
      const prompt = mkPrompt()
      const result = await api()?.generate?.({
        prompt,
        slideCount: aiSlideCount ? 0 : slideCount,
        episodeId: selEp || undefined,
        topic: topic || undefined,
        mode,
        theme: activeTheme.tokens,
      })
      if (result?.id) {
        await loadPresentations()
        toast('Presentation generated')
        await handleOpen(result.id)
      } else {
        toast(result?.error || 'Generation failed', 'error')
      }
    } catch (e: any) {
      toast(e.message || 'Generation failed', 'error')
    } finally {
      setGenerating(false)
    }
  }, [canGen, generating, mkPrompt, slideCount, selEp, topic, mode, activeTheme, loadPresentations])

  // === 4. handlePasteImport (lines 441-464) ===
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
      if (result?.ok) {
        await loadPresentations()
        toast('Imported')
        setPasteHtml('')
        await handleOpen(result.data.id)
      } else {
        toast(result?.error || 'Import failed', 'error')
      }
    } catch (e: any) {
      toast(e.message || 'Import failed', 'error')
    } finally {
      setGenerating(false)
    }
  }, [pasteHtml, topic, loadPresentations])

  // === 5. handleOpen (lines 496-501) ===
  const handleOpen = useCallback(async (id: string) => {
    try {
      const detail = await api()?.get?.(id)
      if (detail) { setActivePres(detail); setCurrentSlide(0); setShowCode(false) }
    } catch { /* noop */ }
  }, [])

  // === 6. handleDelete / handleArchive / handleUnarchive (lines 503-534) ===
  const handleDelete = useCallback(async (id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); setTimeout(() => setConfirmDeleteId(null), 4000); return }
    setConfirmDeleteId(null)
    try { await api()?.delete?.(id); if (activePres?.id === id) setActivePres(null); await loadPresentations(); toast('Deleted') }
    catch { toast('Delete failed', 'error') }
  }, [activePres, loadPresentations, confirmDeleteId])

  const handleArchive = useCallback(async (id: string) => {
    try { await api()?.archive?.(id); if (activePres?.id === id) setActivePres(null); await loadPresentations(); toast('Archived') }
    catch { toast('Archive failed', 'error') }
  }, [activePres, loadPresentations])

  const handleUnarchive = useCallback(async (id: string) => {
    try { await api()?.unarchive?.(id); if (activePres?.id === id) setActivePres(null); await loadPresentations(); toast('Restored') }
    catch { toast('Restore failed', 'error') }
  }, [activePres, loadPresentations])

  // === 7. Derived state (line 552-553) ===
  const slides = activePres?.slides?.sort((a, b) => a.index_order - b.index_order) || []
  const modeInfo = MODES[mode] || MODES.educational

  // === 8. OUTPUT FORMAT TOGGLE (lines 719-724) ===
  // In the left panel, before action buttons:
  // <button onClick={() => setOutputFormat('html')}>HTML</button>
  // <button onClick={() => setOutputFormat('json')}>JSON</button>

  // === 9. RENDERING DECISION (lines 901-931) ===
  // {slides[currentSlide] ? (
  //   showCode ? (
  //     <pre>{slides[currentSlide].html_content}</pre>        // CODE VIEW
  //   ) : (() => {
  //     try {
  //       const spec = JSON.parse(slides[currentSlide].html_content)   // TRY JSON
  //       if (spec?.slides && Array.isArray(spec.slides)) {
  //         const jsonSlide = spec.slides[currentSlide] || spec.slides[0]
  //         return <SlideRenderer slide={jsonSlide} ... />              // JSON → SlideRenderer
  //       }
  //     } catch { /* not JSON */ }
  //     return <iframe srcDoc={slides[currentSlide].html_content} ... /> // HTML → iframe
  //   })()
  // ) : <div>No slides</div>}

  // === 10. ASPECT RATIO (line 858-859, line 915, line 923) ===
  // Toggle button: setAspectRatio(aspectRatio === '9:8' ? '9:16' : '9:8')
  // Passed to: compilePrompt(plan, sysPrompt, activeTheme.tokens, aspectRatio)
  // Used in: style={{ aspectRatio: aspectRatio === '9:16' ? '9/16' : '1080/960' }}

  // === 11. showCode (lines 861-864, lines 904-907) ===
  // Toggle button: setShowCode(!showCode)
  // When true: shows <pre> with raw html_content text
  // When false: shows iframe or SlideRenderer
  // No save/edit functionality exists — code view is read-only
}
```

---

## Key findings for the Specialist AI

1. **`outputFormat` state** — `useState<'html' | 'json'>('html')` at line 319. Read in `mkPrompt` (line 388) to select which system prompt to use. Written by toggle buttons at lines 722-723.

2. **`mkPrompt()`** — line 378. Builds SlidePlan, selects `PROMPT_GENERATE_JSON` or `PROMPT_GENERATE_SLIDE` based on `outputFormat`, calls `compilePrompt(plan, sysPrompt, tokens, aspectRatio)`.

3. **`handleAuto()`** — line 414. Calls `api()?.generate?.({...})`. The backend handler in main.ts is a STUB that returns `{ ok: false, error: 'Use auto-generate' }`. The real logic in `index.ts` is DEAD CODE.

4. **`handlePasteImport()`** — line 441. Stores raw HTML directly: `api()?.import?.({ slideCount: 1, slides: [{ html: pasteHtml }] })`. No parsing.

5. **Rendering decision** — lines 908-927. Tries `JSON.parse(html_content)`. If valid JSON with `slides[]` → `SlideRenderer`. If parse fails → `<iframe srcDoc={html_content}>`.

6. **`aspectRatio`** — state at line 342. Passed to `compilePrompt` (line 389). Used in `style={{ aspectRatio: ... }}` at lines 915, 923.

7. **`showCode`** — toggle at line 861. When true, shows raw `html_content` in a `<pre>`. When false, shows iframe or SlideRenderer. No editing/saving.

8. **Types** — `SL = { id, presentation_id, index_order, frame_type, html_content }`. `PD = PS & { slides: SL[] }`. `html_content` stores either raw HTML or JSON string.
