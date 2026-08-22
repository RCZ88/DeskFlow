import { useState, useEffect, useCallback } from 'react'
import { Presentation, ChevronLeft, ChevronRight, Download, Trash2, Plus, LoaderCircle, Eye, Code, Copy, Check, X, ArrowRight, Clipboard, MessageSquare, FileText, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
const api = () => (window as any).deskflowAPI?.presentation
const ce = () => (window as any).deskflowAPI?.contentEngine
const ai = () => (window as any).deskflowAPI
console.log('%c[Presentation] v3.0 loaded', 'color: #10b981; font-weight: bold')

type Episode = { id: number; title: string; status: string }
type ChatThread = { threadDate: string; title?: string; messageCount?: number }
type PS = { id: string; episode_id?: number; topic?: string; title: string; status: string; slide_count: number; created_at: string }
type SL = { id: string; presentation_id: string; index_order: number; frame_type: string; html_content: string }
type PD = PS & { slides: SL[] }
type Tab = 'generate' | 'chats' | 'episodes'

let _tid = 0
const _tl = new Set<(t: any) => void>()
function toast(text: string, kind: 'success' | 'error' | 'info' = 'success') { _tl.forEach(l => l({ id: ++_tid, text, kind })) }
function ToastHost() {
  const [items, setItems] = useState<any[]>([])
  useEffect(() => { const fn = (t: any) => { setItems(p => [...p.slice(-3), t]); setTimeout(() => setItems(p => p.filter(x => x.id !== t.id)), 3600) }; _tl.add(fn); return () => { _tl.delete(fn) } }, [])
  if (!items.length) return null
  return <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2">{items.map(t => <div key={t.id} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur-xl', t.kind === 'success' && 'border-emerald-500/30 bg-emerald-950/90 text-emerald-200', t.kind === 'error' && 'border-rose-500/30 bg-rose-950/90 text-rose-200', t.kind === 'info' && 'border-white/[0.08] bg-[#141419]/95 text-zinc-200')}><span>{t.text}</span></div>)}</div>
}

export function PresentationWorkspace() {
  const [list, setList] = useState<PS[]>([])
  const [active, setActive] = useState<PD | null>(null)
  const [cur, setCur] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)
  // Generate controls
  const [src, setSrc] = useState<'episode' | 'topic' | 'chat'>('topic')
  const [eps, setEps] = useState<Episode[]>([])
  const [selEp, setSelEp] = useState<number | null>(null)
  const [chats, setChats] = useState<ChatThread[]>([])
  const [selChat, setSelChat] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [tMode, setTMode] = useState<'specific' | 'ai-decides'>('specific')
  const [sc, setSc] = useState(8)
  const [gMode, setGMode] = useState<'auto' | 'manual'>('auto')
  const [gen, setGen] = useState(false)
  const [paste, setPaste] = useState(false)
  const [pastedHtml, setPastedHtml] = useState('')
  const [loadEps, setLoadEps] = useState(false)
  const [loadChats, setLoadChats] = useState(false)

  const loadList = useCallback(async () => { setLoading(true); try { const r = await api()?.list(); if (r?.ok) setList(r.data || []) } finally { setLoading(false) } }, [])
  const loadPres = useCallback(async (id: string) => { const r = await api()?.get(id); if (r?.ok && r.data) { setActive(r.data); setCur(0) } }, [])
  useEffect(() => { loadList() }, [loadList])
  useEffect(() => { (window as any).__presRefresh = loadList }, [loadList])

  const loadEpsList = useCallback(async () => { setLoadEps(true); try { const r = await ce()?.episodesList?.(); setEps(Array.isArray(r) ? r : r?.data || []) } catch {} finally { setLoadEps(false) } }, [])
  const loadChatList = useCallback(async () => { setLoadChats(true); try { const r = await ai()?.aiChatListThreads?.(); setChats(Array.isArray(r) ? r : r?.data || []) } catch {} finally { setLoadChats(false) } }, [])

  useEffect(() => { if (src === 'episode') loadEpsList(); if (src === 'chat') loadChatList() }, [src, loadEpsList, loadChatList])

  const mkPrompt = () => {
    if (src === 'episode' && selEp) { const e = eps.find(x => x.id === selEp); return 'Generate ' + sc + ' interactive HTML/CSS/JS slides about "' + (e?.title || 'Untitled') + '". Pro Max design (vercel-dark, 1080x960, glassmorphism, blurInUp, glow, gradient text). One HTML per slide. Complete DOCTYPE+style+script+Google Fonts. No fences.' }
    if (src === 'chat' && selChat) { const c = chats.find(x => x.threadDate === selChat); return 'Generate ' + sc + ' interactive HTML/CSS/JS slides summarizing the AI conversation "' + (c?.title || selChat) + '". Pro Max design (vercel-dark, 1080x960, glassmorphism, blurInUp, glow, gradient text). One HTML per slide. Complete DOCTYPE+style+script+Google Fonts. No fences.' }
    if (src === 'topic' && topic.trim()) { const m = tMode === 'ai-decides' ? ' Creative: AI decides structure.' : ' Specific: Follow EXACTLY.'; return 'Generate ' + sc + ' interactive HTML/CSS/JS slides about: "' + topic + '".' + m + ' Pro Max design (vercel-dark, 1080x960, glassmorphism, blurInUp, glow, gradient text). One HTML per slide. Complete DOCTYPE+style+script+Google Fonts. No fences.' }
    return ''
  }

  const canGenerate = gMode === 'auto' ? ((src === 'episode' && selEp) || (src === 'chat' && selChat) || (src === 'topic' && topic.trim())) : ((src === 'episode' && selEp) || (src === 'chat' && selChat) || (src === 'topic' && topic.trim()))

  const handleAuto = async () => { if (!canGenerate) return; setGen(true); try { toast('Generating...', 'info'); const o: any = { slideCount: sc }; if (src === 'episode' && selEp) o.episodeId = selEp; if (src === 'chat' && selChat) { o.topic = chats.find(x => x.threadDate === selChat)?.title || 'Chat Summary'; o.chatThread = selChat } if (src === 'topic') { o.topic = topic; o.topicMode = tMode } const r = await api()?.generate(o); if (r?.ok) { toast('Generated ' + (r.data?.slideCount || '?') + ' slides', 'success'); await loadList(); await loadPres(r.data.id) } else toast(r?.error || 'Failed', 'error') } finally { setGen(false) } }

  const handleCopy = async () => { const p = mkPrompt(); if (!p) return; await navigator.clipboard.writeText(p); toast('Prompt copied', 'success'); setPaste(true) }

  const handlePasteImport = async () => { if (!pastedHtml.trim()) return; const t = src === 'episode' ? eps.find(x => x.id === selEp)?.title || 'Episode' : src === 'chat' ? chats.find(x => x.threadDate === selChat)?.title || 'Chat' : topic || 'Topic'; toast('Importing...', 'info'); const r = await api()?.generate({ topic: t, slideCount: 1, manualHtml: pastedHtml }); if (r?.ok) { toast('Imported', 'success'); setPastedHtml(''); setPaste(false); await loadList(); await loadPres(r.data.id) } else toast(r?.error || 'Failed', 'error') }

  const hDel = async (id: string) => { await api()?.delete(id); toast('Deleted'); if (active?.id === id) setActive(null); await loadList() }
  const hExp = async (tr = false) => { if (!active?.slides[cur]) return; const r = await api()?.exportSlide(active.slides[cur].id, tr); if (r?.ok) toast('Exported'); else if (r?.error) toast(r.error, 'error') }
  const hCopy = async () => { if (!active?.slides[cur]) return; await navigator.clipboard.writeText(active.slides[cur].html_content); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const hSave = async (h: string) => { if (!active?.slides[cur]) return; await api()?.updateSlide(active.slides[cur].id, h); setShowCode(false); await loadPres(active.id); toast('Updated') }
  const slide = active?.slides[cur]

  return (<div className="flex h-full" data-page="presentation">
    {/* ── Left sidebar: presentations list ── */}
    <div className="w-52 shrink-0 flex flex-col border-r border-white/[0.06] bg-[rgba(24,24,27,0.60)] backdrop-blur-xl">
      <div className="p-3 border-b border-white/[0.06]"><div className="flex items-center gap-1.5"><Presentation size={13} className="text-[#10b981]" /><span className="text-[10px] font-semibold text-zinc-200 uppercase tracking-wider">Saved</span></div></div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && <div className="flex justify-center py-8"><LoaderCircle size={16} className="animate-spin text-zinc-600" /></div>}
        {!loading && !list.length && <div className="text-center py-6"><p className="text-[10px] text-zinc-600">No presentations yet</p></div>}
        {list.map(p => <button key={p.id} onClick={() => loadPres(p.id)} className={cn('w-full text-left rounded-lg p-2 transition-colors group relative', active?.id === p.id ? 'bg-[#10b981]/10 border border-[#10b981]/20' : 'hover:bg-white/[0.04] border border-transparent')}>
          <div className="text-[11px] font-medium text-zinc-200 truncate">{p.title}</div>
          <div className="flex items-center gap-2 mt-0.5"><span className="text-[9px] text-zinc-600">{p.slide_count} slides</span></div>
          <button onClick={e => { e.stopPropagation(); hDel(p.id) }} className="absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400"><Trash2 size={10} /></button>
        </button>)}
      </div>
    </div>

    {/* ── Center: generate controls + viewer ── */}
    <div className="flex-1 flex flex-col min-w-0">
      {/* Generate bar */}
      <div className="border-b border-white/[0.06] bg-[rgba(24,24,27,0.40)] px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Source</span>
          <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.04]">
            <button onClick={() => setSrc('topic')} className={cn('h-6 px-3 rounded-md text-[10px] font-medium transition-colors', src === 'topic' ? 'bg-[#10b981]/15 text-[#10b981]' : 'text-zinc-500 hover:text-zinc-300')}>Topic</button>
            <button onClick={() => setSrc('episode')} className={cn('h-6 px-3 rounded-md text-[10px] font-medium transition-colors', src === 'episode' ? 'bg-[#10b981]/15 text-[#10b981]' : 'text-zinc-500 hover:text-zinc-300')}>Episode</button>
            <button onClick={() => setSrc('chat')} className={cn('h-6 px-3 rounded-md text-[10px] font-medium transition-colors', src === 'chat' ? 'bg-[#10b981]/15 text-[#10b981]' : 'text-zinc-500 hover:text-zinc-300')}>Existing Chat</button>
          </div>
          <div className="flex-1" />
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Mode</span>
          <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.04]">
            <button onClick={() => setGMode('auto')} className={cn('h-6 px-3 rounded-md text-[10px] font-medium transition-colors', gMode === 'auto' ? 'bg-[#10b981]/15 text-[#10b981]' : 'text-zinc-500 hover:text-zinc-300')}>Auto</button>
            <button onClick={() => setGMode('manual')} className={cn('h-6 px-3 rounded-md text-[10px] font-medium transition-colors', gMode === 'manual' ? 'bg-[#f59e0b]/15 text-[#f59e0b]' : 'text-zinc-500 hover:text-zinc-300')}>Manual</button>
          </div>
        </div>

        {/* Source-specific inputs */}
        <div className="flex items-center gap-3">
          {src === 'topic' && <>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Type your topic..." className="flex-1 h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#10b981]/50" />
            <div className="flex gap-1"><button onClick={() => setTMode('specific')} className={cn('h-8 px-3 rounded-lg border text-[10px] font-medium', tMode === 'specific' ? 'border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981]' : 'border-white/[0.06] text-zinc-500')}>Specific</button><button onClick={() => setTMode('ai-decides')} className={cn('h-8 px-3 rounded-lg border text-[10px] font-medium', tMode === 'ai-decides' ? 'border-[#a855f7]/40 bg-[#a855f7]/10 text-[#a855f7]' : 'border-white/[0.06] text-zinc-500')}>Creative</button></div>
          </>}
          {src === 'episode' && <>
            {loadEps ? <LoaderCircle size={14} className="animate-spin text-zinc-600" /> : <select value={selEp ?? ''} onChange={e => setSelEp(Number(e.target.value) || null)} className="flex-1 h-8 rounded-lg border border-white/[0.08] bg-[#1a1a20] px-2 text-xs text-zinc-100 outline-none"><option value="">Select episode...</option>{eps.map(e => <option key={e.id} value={e.id}>{e.title} ({e.status})</option>)}</select>}
          </>}
          {src === 'chat' && <>
            {loadChats ? <LoaderCircle size={14} className="animate-spin text-zinc-600" /> : <select value={selChat ?? ''} onChange={e => setSelChat(e.target.value || null)} className="flex-1 h-8 rounded-lg border border-white/[0.08] bg-[#1a1a20] px-2 text-xs text-zinc-100 outline-none"><option value="">Select chat thread...</option>{chats.map(c => <option key={c.threadDate} value={c.threadDate}>{c.title || c.threadDate}</option>)}</select>}
          </>}
          <label className="text-[10px] text-zinc-500">Slides</label>
          <input type="number" min={3} max={20} value={sc} onChange={e => setSc(Number(e.target.value))} className="h-8 w-16 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 text-xs text-zinc-100 outline-none text-center" />
          {gMode === 'auto'
            ? <button onClick={handleAuto} disabled={gen || !canGenerate} className="h-8 px-4 rounded-lg bg-[#10b981] text-[11px] font-semibold text-black hover:brightness-110 disabled:opacity-40 flex items-center gap-1.5">{gen ? <><LoaderCircle size={12} className="animate-spin" /> Generating...</> : <><Presentation size={12} /> Generate</>}</button>
            : paste
              ? <button onClick={handlePasteImport} disabled={!pastedHtml.trim()} className="h-8 px-4 rounded-lg bg-[#10b981] text-[11px] font-semibold text-black hover:brightness-110 disabled:opacity-40 flex items-center gap-1.5"><Check size={12} /> Import HTML</button>
              : <button onClick={() => { const p = mkPrompt(); if (p) { navigator.clipboard.writeText(p); toast('Prompt copied', 'success') }; setPaste(true) }} disabled={!canGenerate} className="h-8 px-4 rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[11px] font-medium text-[#f59e0b] hover:bg-[#f59e0b]/20 disabled:opacity-40 flex items-center gap-1.5"><Copy size={12} /> Copy Prompt</button>
          }
        </div>

        {/* Manual paste-back */}
        {gMode === 'manual' && paste && <div className="mt-3 flex gap-2"><textarea value={pastedHtml} onChange={e => setPastedHtml(e.target.value)} placeholder="Paste the complete HTML document here..." className="flex-1 h-24 resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-[10px] font-mono text-zinc-400 outline-none placeholder:text-zinc-700" /><div className="flex flex-col gap-1"><button onClick={handlePasteImport} disabled={!pastedHtml.trim()} className="h-9 px-3 rounded-lg bg-[#10b981] text-[11px] font-semibold text-black hover:brightness-110 disabled:opacity-40 flex items-center gap-1"><Check size={11} /> Import</button><button onClick={() => { setPaste(false); setPastedHtml('') }} className="h-9 px-3 rounded-lg border border-white/[0.06] text-[10px] text-zinc-500">Cancel</button></div></div>}
        {gMode === 'manual' && !paste && <div className="mt-2"><button onClick={() => setPaste(true)} className="h-7 px-3 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[10px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] flex items-center gap-1.5"><Clipboard size={11} /> Or paste HTML directly (no prompt needed)</button></div>}
      </div>

      {/* Viewer area */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#0A0A0B] overflow-hidden">
        {!active ? (
          <div className="flex flex-col items-center gap-4 opacity-40">
            <Presentation size={48} className="text-zinc-600" />
            <p className="text-sm text-zinc-600">Select a presentation or create a new one</p>
          </div>
        ) : slide ? (
          <div className="flex flex-col items-center gap-4 w-full h-full">
            {/* Slide info bar */}
            <div className="flex items-center gap-3 w-full max-w-[1080px]">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{slide.frame_type}</span>
              <span className="text-[10px] text-zinc-600">Slide {cur + 1} of {active.slides.length}</span>
              <div className="flex-1" />
              <button onClick={() => setShowCode(true)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]"><Code size={13} /></button>
              <button onClick={hCopy} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]">{copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}</button>
              <button onClick={() => hExp(false)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]"><Download size={13} /></button>
              <button onClick={() => hExp(true)} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] title='Transparent PNG'"><Eye size={13} /></button>
            </div>
            {/* 9:8 iframe */}
            <div className="flex-1 w-full flex items-center justify-center" style={{ maxHeight: 'calc(100% - 40px)' }}>
              <div style={{ width: '1080px', height: '960px', maxWidth: '100%', maxHeight: '100%', position: 'relative', aspectRatio: '9/8' }} className="rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl">
                <iframe key={slide.id + '-' + cur} srcDoc={slide.html_content} className="w-full h-full border-0" sandbox="allow-scripts" />
              </div>
            </div>
            {/* Navigation */}
            <div className="flex items-center gap-4 shrink-0">
              <button onClick={() => setCur(c => Math.max(0, c - 1))} disabled={cur === 0} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] disabled:opacity-30"><ChevronLeft size={16} /></button>
              <div className="flex items-center gap-1.5">{active.slides.map((_, i) => <button key={i} onClick={() => setCur(i)} className={cn('w-2 h-2 rounded-full transition-all', i === cur ? 'bg-[#10b981] scale-125' : 'bg-zinc-700 hover:bg-zinc-500')} />)}</div>
              <button onClick={() => setCur(c => Math.min(active.slides.length - 1, c + 1))} disabled={cur >= active.slides.length - 1} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        ) : null}
      </div>
    </div>

    {/* Code modal */}
    {showCode && slide && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm"><div className="w-[800px] h-[700px] rounded-2xl border border-white/[0.08] bg-[#141419] flex flex-col shadow-2xl"><div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]"><div className="flex items-center gap-2"><Code size={13} className="text-[#10b981]" /><span className="text-xs font-semibold text-zinc-200">Code View — Slide {slide.index_order + 1}</span></div><div className="flex items-center gap-2"><button onClick={() => { if (active) loadPres(active.id) }} className="h-7 px-3 rounded-lg bg-[#10b981] text-[11px] font-semibold text-black flex items-center gap-1"><Check size={11} /> Refresh</button><button onClick={() => setShowCode(false)} className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]"><X size={14} /></button></div></div><textarea readOnly value={slide.html_content} className="flex-1 resize-none bg-transparent p-4 text-[11px] font-mono text-zinc-400 outline-none" /></div></div>}
    <ToastHost />
  </div>)
}
