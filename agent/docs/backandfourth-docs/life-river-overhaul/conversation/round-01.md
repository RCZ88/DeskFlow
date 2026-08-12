# Round 01 — Project Owner provides 3 requested files

## Specialist asked for:
1. VoiceInputWrapper.tsx — cloneElement pattern, ref injection, mic button positioning
2. phase-drawer.tsx — quick-edit flow for "edit from visualization"
3. LifePage.tsx — full river mode render section for lens state lifting

## We provided:

---

### CONTEXT: src/components/VoiceInputWrapper.tsx (500 lines, full)

```tsx
/**
 * VoiceInputWrapper — Self-contained voice input with portal-based panel
 * Panel renders via React Portal at document.body level — never clipped
 * by parent overflow, scroll containers, or z-index stacking contexts.
 */
import { useRef, useCallback, useEffect, useState, type ReactElement, cloneElement } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Square, Delete, AlertCircle, WifiOff } from 'lucide-react';
import { sttGetStatus, sttStartApi, sttStartNative } from '../lib/stt';

interface VoiceInputWrapperProps {
  children: ReactElement;
  silenceMs?: number;
}

interface InputMetrics {
  height: number;
  width: number;
  fontSize: number;
  borderRadius: number;
  rect: DOMRect;
}

export function VoiceInputWrapper({ children, silenceMs = 8000 }: VoiceInputWrapperProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [bars, setBars] = useState<number[]>(new Array(24).fill(0));
  const [volume, setVolume] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const retriesRef = useRef(0);
  const networkRetriesRef = useRef(0);
  const MAX_RETRIES = 5;
  const engineStopRef = useRef<(() => void) | null>(null);
  const sessionRef = useRef(0);

  const [processing, setProcessing] = useState(false);
  const [engineLabel, setEngineLabel] = useState<string | null>(null);

  // Measure input and compute absolute portal position
  const [portalPos, setPortalPos] = useState<{
    top: number; left: number; width: number; height: number;
    panelWidth: number; panelAbove: boolean; fontSize: number; borderRadius: number;
  } | null>(null);

  const measure = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const height = el.offsetHeight || 32;
    const width = el.offsetWidth || 200;
    const fontSize = parseFloat(cs.fontSize) || 14;
    const borderRadius = parseFloat(cs.borderRadius) || 8;

    const panelWidth = Math.max(280, Math.min(width, 500));
    const panelHeight = 72;
    const MARGIN = 6;

    const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
    const panelAbove = spaceBelow < panelHeight && rect.top > spaceBelow;

    let left = rect.left;
    if (left + panelWidth > window.innerWidth - MARGIN) {
      left = window.innerWidth - panelWidth - MARGIN;
    }
    if (left < MARGIN) left = MARGIN;

    const top = panelAbove
      ? rect.top - panelHeight - MARGIN
      : rect.bottom + MARGIN;

    setPortalPos({ top, left, width, height, panelWidth, panelAbove, fontSize, borderRadius });
  }, []);

  useEffect(() => {
    if (!listening) { setPortalPos(null); return; }
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [listening, measure]);

  const micSize = Math.max(28, Math.min((portalPos?.height || 32) - 4, 40));
  const micIconSize = Math.max(12, Math.min(micSize - 12, 18));
  const btnRadius = Math.max(4, (portalPos?.borderRadius || 8) - 2);
  const fontSize = portalPos?.fontSize || 14;

  // Audio Visualizer
  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const newBars = new Array(24).fill(0);
        for (let i = 0; i < 24; i++) {
          const idx = Math.floor(Math.pow(i / 24, 1.5) * data.length);
          newBars[i] = (data[idx] || 0) / 255;
        }
        setBars(newBars);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        setVolume(sum / data.length / 255);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError('Microphone access denied');
      setTimeout(() => setError(null), 2000);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch {} audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setBars(new Array(24).fill(0));
    setVolume(0);
  }, []);

  // Text insertion — sets value + dispatches input event for React controlled inputs
  const insertText = useCallback((text: string) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const spacer = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n') ? ' ' : '';
    const newValue = before + spacer + text + after;
    const pos = start + spacer.length + text.length;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) setter.call(el, newValue);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.setSelectionRange(pos, pos);
  }, []);

  const removeLastSentence = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const parts = el.value.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const newText = parts.slice(0, -1).join('. ') + (parts.length > 1 ? '.' : '');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) setter.call(el, newText);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    setSentences(prev => prev.slice(0, -1));
  }, []);

  // Speech Recognition (engine-aware: API → Windows native → browser)
  const stopListening = useCallback(() => {
    sessionRef.current++;
    retriesRef.current = 0;
    networkRetriesRef.current = 0;
    setReconnecting(false);
    setProcessing(false);
    setListening(false);
    setInterim('');
    if (engineStopRef.current) {
      try { engineStopRef.current(); } catch {}
      engineStopRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onresult = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    stopAudio();
  }, [stopAudio]);

  const startBrowserListening = useCallback((lang: string, session: number, fail: (msg: string) => void, resetSilence: () => void) => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      fail('Speech recognition not available — add a speech API key in Settings → General → Voice & Speech.');
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      if (sessionRef.current !== session) return;
      let interimStr = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (!r.isFinal) { interimStr += r[0].transcript; }
        else { setInterim(''); setSentences(p => [...p, r[0].transcript]); insertText(r[0].transcript); }
      }
      if (interimStr) setInterim(interimStr);
      retriesRef.current = 0;
      networkRetriesRef.current = 0;
      setReconnecting(false);
      resetSilence();
    };

    recognition.onerror = (event: any) => {
      if (sessionRef.current !== session) return;
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'network') {
        networkRetriesRef.current++;
        setReconnecting(true);
        return;
      }
      fail(event.error === 'not-allowed' ? 'Microphone permission denied' : 'Voice error');
    };

    recognition.onend = () => {
      if (!recognitionRef.current) return;
      if (networkRetriesRef.current > 0) {
        const delay = Math.min(1000 * Math.pow(1.5, Math.min(networkRetriesRef.current - 1, 4)), 5000);
        setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch { stopListening(); }
          }
        }, delay);
        return;
      }
      if (retriesRef.current >= MAX_RETRIES) {
        fail('Connection lost');
        return;
      }
      const delay = Math.min(300 * Math.pow(2, retriesRef.current), 3000);
      retriesRef.current++;
      setTimeout(() => {
        if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch { stopListening(); }
        }
      }, delay);
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch { fail('Voice error'); return; }
    resetSilence();
  }, [insertText, stopListening]);

  const startListening = useCallback(() => {
    const session = ++sessionRef.current;
    setListening(true);
    setSentences([]);
    setInterim('');
    setError(null);
    setProcessing(false);
    setEngineLabel(null);

    const fail = (msg: string) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
      stopListening();
    };

    const resetSilence = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => stopListening(), silenceMs);
    };

    startAudio();
    const lang = localStorage.getItem('voice-lang') || navigator.language || 'en-US';

    sttGetStatus().then((status) => {
      if (sessionRef.current !== session) return;
      if (status.engine === 'api') {
        setEngineLabel('Cloud API');
        engineStopRef.current = sttStartApi(lang, {
          onState: (s) => {
            if (sessionRef.current === session && s === 'processing') setProcessing(true);
          },
          onFinal: (text) => {
            if (sessionRef.current !== session) return;
            setProcessing(false);
            setSentences(p => [...p, text]);
            insertText(text);
            stopListening();
          },
          onError: (msg) => fail(msg),
        });
        resetSilence();
      } else if (status.engine === 'native') {
        setEngineLabel('Windows speech');
        engineStopRef.current = sttStartNative(lang, {
          onFinal: (text) => {
            if (sessionRef.current !== session) return;
            setSentences(p => [...p, text]);
            insertText(text);
            resetSilence();
          },
          onError: (msg) => fail(msg),
        });
        resetSilence();
      } else {
        startBrowserListening(lang, session, fail, resetSilence);
      }
    }).catch(() => fail('Speech not available'));
  }, [silenceMs, insertText, startAudio, stopListening, startBrowserListening]);

  const toggle = useCallback(() => { listening ? stopListening() : startListening(); }, [listening, startListening, stopListening]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && listening) stopListening(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [listening, stopListening]);

  useEffect(() => () => stopListening(), [stopListening]);

  const supported = typeof window !== 'undefined' && (!!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition) || !!window.deskflowAPI);
  if (!supported) return <>{children}</>;

  // KEY PATTERN — cloneElement wraps the child with ref + pr-10:
  const childWithRef = cloneElement(children, {
    ref: (node: any) => {
      inputRef.current = node;
      const r = (children.props as any).ref;
      if (typeof r === 'function') r(node);
      else if (r && 'current' in r) r.current = node;
    },
    className: `${(children.props as any).className || ''} pr-10`,
  });

  // Portal Panel — rendered at document.body via createPortal
  const panel = portalPos && (listening || error || reconnecting) ? createPortal(
    <AnimatePresence>
      <motion.div
        key="voice-panel"
        initial={{ opacity: 0, y: portalPos.panelAbove ? 6 : -6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: portalPos.panelAbove ? 6 : -6, scale: 0.97 }}
        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
        style={{
          position: 'fixed',
          top: portalPos.top,
          left: portalPos.left,
          width: portalPos.panelWidth,
          zIndex: 99999,
        }}
      >
        <div className="rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 shadow-xl shadow-black/20 overflow-hidden"
          style={{ padding: Math.max(8, fontSize * 0.75) }}>
          <div className="flex items-center gap-2">
            {/* Sound Wave — 24 bars */}
            <div className="flex-shrink-0 flex items-end gap-[2px]" style={{ height: micSize * 0.8 }}>
              {bars.map((value, i) => {
                const h = Math.max(3, Math.round(value * micSize * 0.7));
                const opacity = 0.4 + value * 0.6;
                const isCenter = i >= 8 && i <= 15;
                return (
                  <div key={i} className="rounded-full transition-all duration-75"
                    style={{ width: 3, height: listening ? h : 3,
                      backgroundColor: isCenter ? `rgba(232,134,107,${opacity})` : `rgba(217,104,70,${opacity * 0.8})` }} />
                );
              })}
            </div>

            <div className="w-px bg-zinc-700/50 flex-shrink-0" style={{ height: micSize * 0.6 }} />

            {/* Interim text / error / engine label */}
            <div className="flex-1 min-w-0">
              {error ? (
                <div className="flex items-center gap-1 text-red-400" style={{ fontSize: fontSize * 0.85 }}>
                  <AlertCircle className="flex-shrink-0" style={{ width: micIconSize, height: micIconSize }} />
                  <span className="truncate">{error}</span>
                </div>
              ) : reconnecting ? (
                <div className="flex items-center gap-1 text-amber-400/80" style={{ fontSize: fontSize * 0.85 }}>
                  <WifiOff className="flex-shrink-0 animate-pulse" style={{ width: micIconSize, height: micIconSize }} />
                  <span className="truncate">Reconnecting...</span>
                </div>
              ) : interim ? (
                <p className="text-zinc-300 italic truncate" style={{ fontSize: fontSize * 0.85 }}>{interim}</p>
              ) : processing ? (
                <p className="text-zinc-400 italic truncate" style={{ fontSize: fontSize * 0.85 }}>
                  {engineLabel ? `${engineLabel} — transcribing…` : 'Transcribing…'}
                </p>
              ) : (
                <p className="text-zinc-500 italic" style={{ fontSize: fontSize * 0.85 }}>
                  {engineLabel ? `${engineLabel} — listening…` : 'Listening...'}
                </p>
              )}
            </div>

            {/* Controls — delete last sentence + stop */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button type="button" onClick={removeLastSentence} disabled={sentences.length === 0}
                className={`grid place-items-center rounded transition-colors ${
                  sentences.length === 0 ? 'text-zinc-600 cursor-not-allowed' : 'text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-700/60'
                }`} style={{ width: micSize * 0.85, height: micSize * 0.85 }}>
                <Delete style={{ width: micIconSize * 0.85, height: micIconSize * 0.85 }} />
              </button>
              <button type="button" onClick={stopListening}
                className="grid place-items-center rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                style={{ width: micSize * 0.85, height: micSize * 0.85 }}>
                <Square className="fill-current" style={{ width: micIconSize * 0.7, height: micIconSize * 0.7 }} />
              </button>
            </div>
          </div>

          {/* Volume bar */}
          <div className="mt-1.5 rounded-full bg-zinc-800 overflow-hidden" style={{ height: 3 }}>
            <div className="h-full rounded-full bg-[#e8866b]/60 transition-all duration-100" style={{ width: `${volume * 100}%` }} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <>
      <div className="relative inline-block w-full">
        {childWithRef}
        {/* Mic Button — sized to match input height */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10">
          <button type="button" onClick={toggle}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            aria-pressed={listening}
            style={{ width: micSize, height: micSize, minWidth: micSize, minHeight: micSize, borderRadius: btnRadius }}
            className={`relative grid place-items-center p-0 transition-all duration-150
              focus-visible:ring-2 focus-visible:ring-[#e8866b]/60 focus-visible:outline-none
              ${listening
                ? 'bg-[#d96846]/15 text-[#e8866b] ring-1 ring-[#d96846]/30'
                : error
                  ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/40'
                  : 'text-zinc-400 bg-zinc-900/60 ring-1 ring-zinc-800/60 hover:text-[#e8866b] hover:ring-[#d96846]/30'
              }`}
          >
            {listening && <span className="absolute inset-0 rounded-[inherit] animate-[pulse-ring_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite] pointer-events-none" />}
            {listening ? <Mic style={{ width: micIconSize, height: micIconSize }} /> : <MicOff style={{ width: micIconSize, height: micIconSize }} />}
          </button>
        </div>
      </div>
      {panel}
    </>
  );
}
```

---

### CONTEXT: src/components/life-river/phase-drawer.tsx (409 lines, full)

```tsx
"use client"
import * as React from 'react'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectItem } from '@/components/ui/select'
import { categoryOf, magnitudeGradient, magnitudeWords, phaseAgeLabel, phaseSpanLabel, uid, MONTHS, type LifePhase, type LifePhaseMilestone } from '@/lib/riverMath'
import { cn } from '@/lib/utils'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { ReflectionFlow } from './reflection-flow'
import { EraTrendsCard } from './era-trends-card'

const COLOR_CHOICES = ['#fbbf24', '#6fb38f', '#38bdf8', '#a78bfa', '#f472b6', '#e8866b']

interface PhaseDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  phase: LifePhase | null
  phases: LifePhase[]
  initialView?: 'detail' | 'reflect'
  onSave: (phase: LifePhase) => void
  onDelete: (phaseId: string) => void
  onReflect: (phase: LifePhase, answers: string[]) => Promise<string | null>
  onEraTrends: (phase: LifePhase) => Promise<string | null>
  onRename: (phaseId: string, title: string) => void
  onToast: (message: string) => void
}

export function PhaseDrawer({ open, onOpenChange, phase, phases, initialView = 'detail', onSave, onDelete, onReflect, onEraTrends, onRename, onToast }: PhaseDrawerProps) {
  const [view, setView] = useState<'detail' | 'reflect'>('detail')
  const [draft, setDraft] = useState<LifePhase | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleText, setTitleText] = useState('')
  const [armDelete, setArmDelete] = useState(false)
  const [linkValue, setLinkValue] = useState('')

  useEffect(() => {
    if (open) {
      setDraft(phase ? { ...phase } : null)
      setView(initialView)
      setEditingTitle(false)
      setArmDelete(false)
      setLinkValue('')
    }
  }, [open, phase, initialView])

  if (!draft) return <Sheet open={open} onOpenChange={onOpenChange} />

  const cat = categoryOf(draft.category)
  const base = draft.color || cat.color
  const unlinked = phases.filter(p => p.id !== draft.id && !draft.connections.includes(p.id))

  // commit = immediate save — every edit persists to DB right away
  const commit = (next: LifePhase) => {
    setDraft(next)
    onSave(next)
  }

  const updateMilestone = (id: string, patch: Partial<LifePhaseMilestone>) => {
    commit({ ...draft, milestones: draft.milestones.map(m => (m.id === id ? { ...m, ...patch } : m)) })
  }

  const addMilestone = () => {
    commit({ ...draft, milestones: [...draft.milestones, { id: uid('ms'), month: 1, year: draft.startYear, label: '' }] })
  }

  const addConnection = (id: string) => {
    commit({ ...draft, connections: [...draft.connections, id] })
    setLinkValue('')
  }

  const commitTitle = () => {
    setEditingTitle(false)
    const t = titleText.trim()
    if (!t || t === draft.title) return
    onRename(draft.id, t)
    commit({ ...draft, title: t })
    onToast(`Phase renamed to "${t}"`)
  }

  const handleDelete = () => {
    if (!armDelete) {
      setArmDelete(true)
      setTimeout(() => setArmDelete(false), 3000)
      return
    }
    onDelete(draft.id)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[420px]">
        <AnimatePresence mode="wait">
          {view === 'reflect' ? (
            <motion.div key="reflect" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              <SheetHeader>
                <SheetTitle className="text-[13px] text-amber-300">Reflect on "{draft.title}"</SheetTitle>
                <SheetDescription>Three questions. One honest paragraph.</SheetDescription>
              </SheetHeader>
              <div className="pt-2">
                <ReflectionFlow
                  onBack={() => setView('detail')}
                  onSubmit={answers => onReflect(draft, answers)}
                  onKeep={text => { commit({ ...draft, reflection: text }); setView('detail') }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col gap-4">
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
                    style={{ borderColor: `${base}55`, color: base, background: `${base}14` }}>
                    <span className="size-1.5 rounded-full" style={{ background: base }} />
                    {cat.label}
                  </span>
                  <span className="text-[11px] text-zinc-500">{phaseSpanLabel(draft)}</span>
                </div>
                <div data-lifephase="phase-title">
                  {editingTitle ? (
                    <input autoFocus value={titleText} onChange={e => setTitleText(e.target.value)}
                      onBlur={commitTitle}
                      onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleText(draft.title) } }}
                      className="w-full rounded-md border border-amber-400/40 bg-transparent px-1 font-display text-[17px] font-medium text-zinc-50 outline-none focus-visible:ring-2 focus-visible:ring-amber-400/30"
                      aria-label="Phase title" />
                  ) : (
                    <SheetTitle className="flex items-center gap-1.5">
                      <button onClick={() => { setTitleText(draft.title); setEditingTitle(true) }}
                        className="group/title cursor-text text-left underline decoration-amber-400/30 decoration-dotted underline-offset-4 hover:decoration-amber-400/80"
                        title="Click to rename">
                        {draft.title}
                      </button>
                    </SheetTitle>
                  )}
                </div>
                <SheetDescription>{phaseAgeLabel(draft)} long · {magnitudeWords(draft.magnitude)}</SheetDescription>
              </SheetHeader>

              {/* magnitude bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10.5px] text-zinc-500">
                  <span>Magnitude</span><span className="text-zinc-400">{draft.magnitude}/100</span>
                </div>
                <div className="h-1.5 w-full rounded-full" style={{ background: magnitudeGradient(draft.magnitude) }} />
              </div>

              {/* description */}
              {draft.description && <p className="font-serif text-[13.5px] leading-relaxed text-zinc-300 italic">{draft.description}</p>}

              {/* reflection */}
              {draft.reflection && (
                <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3">
                  <p className="mb-1 text-[10px] tracking-wide text-amber-300/70 uppercase">Reflection</p>
                  <p className="font-serif text-[13px] leading-relaxed text-zinc-300 italic">{draft.reflection}</p>
                </div>
              )}

              <EraTrendsCard phase={draft} onGenerate={() => onEraTrends(draft)} onSave={commit} />

              {/* milestones — inline editable */}
              <div className="space-y-2">
                <p className="text-[10px] tracking-wide text-zinc-500 uppercase">Milestones</p>
                <div className="space-y-1.5" data-lifephase="milestones">
                  {draft.milestones.map(m => (
                    <div key={m.id} className="flex items-center gap-1.5">
                      <select value={m.month ?? 1} onChange={e => updateMilestone(m.id, { month: Number(e.target.value) })}
                        className="h-7 w-16 rounded-md border border-border bg-background px-1 text-[11px] text-foreground outline-none">
                        {MONTHS.map((mo, i) => <option key={mo} value={i + 1}>{mo}</option>)}
                      </select>
                      <input value={m.year} onChange={e => updateMilestone(m.id, { year: parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0 })}
                        className="h-7 w-16 rounded-md border border-border bg-background px-1.5 text-[11px] text-foreground outline-none" placeholder="Year" />
                      <input value={m.label} onChange={e => updateMilestone(m.id, { label: e.target.value })}
                        className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-1.5 text-[11px] text-foreground outline-none" placeholder="What happened?" />
                      <button onClick={() => commit({ ...draft, milestones: draft.milestones.filter(x => x.id !== m.id) })}
                        className="text-zinc-600 transition-colors hover:text-rose-400"><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <button onClick={addMilestone} className="flex items-center gap-1 text-[11px] text-amber-300/80 transition-colors hover:text-amber-300">
                    <Plus size={11} /> Milestone
                  </button>
                </div>
              </div>

              {/* connections */}
              <div className="space-y-2">
                <p className="text-[10px] tracking-wide text-zinc-500 uppercase">Connected phases</p>
                <div className="flex flex-wrap gap-1.5" data-lifephase="connections">
                  {draft.connections.map(id => {
                    const target = phases.find(p => p.id === id)
                    if (!target) return null
                    const tcat = categoryOf(target.category)
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]"
                        style={{ borderColor: `${tcat.color}44`, color: tcat.color, background: `${tcat.color}10` }}>
                        {target.title}
                        <button onClick={() => commit({ ...draft, connections: draft.connections.filter(c => c !== id) })}
                          className="opacity-60 transition-opacity hover:opacity-100">×</button>
                      </span>
                    )
                  })}
                  {unlinked.length > 0 && (
                    <Select value={linkValue} onValueChange={addConnection}
                      valueLabel={Object.fromEntries(unlinked.map(p => [p.id, p.title]))}>
                      {unlinked.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                    </Select>
                  )}
                </div>
              </div>

              {/* color picker */}
              <div className="space-y-1.5">
                <p className="text-[10px] tracking-wide text-zinc-500 uppercase">Reach color</p>
                <div className="flex gap-2">
                  {COLOR_CHOICES.map(c => (
                    <button key={c} onClick={() => commit({ ...draft, color: c })}
                      className={cn('size-5 rounded-full border-2 transition-transform hover:scale-110', base === c ? 'border-white/80' : 'border-transparent')}
                      style={{ background: c }} />
                  ))}
                  <button onClick={() => commit({ ...draft, color: null })}
                    className={cn('size-5 rounded-full border border-dashed text-[9px] leading-none text-zinc-500', !draft.color && 'border-amber-400/70 text-amber-300')}
                    title="Category default">auto</button>
                </div>
              </div>

              {/* impact notes */}
              <div className="space-y-1.5">
                <p className="text-[10px] tracking-wide text-zinc-500 uppercase">Impact notes</p>
                <Textarea value={draft.impactNotes} onChange={e => commit({ ...draft, impactNotes: e.target.value })}
                  placeholder="How is this phase still shaping you today?" rows={2} />
              </div>

              <SheetFooter>
                <Button variant="ghost" size="sm" onClick={() => setView('reflect')}><Sparkles size={13} /> Reflect</Button>
                <Button variant="ghost" size="sm" className={cn('text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-300', armDelete && '!bg-rose-500/25 !text-rose-200 ring-1 ring-rose-400/50')}
                  onClick={handleDelete}><Trash2 size={13} /> {armDelete ? 'Tap again to confirm' : 'Delete'}</Button>
                <SheetClose render={<Button variant="outline" size="sm">Close</Button>} />
              </SheetFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  )
}
```

**Key for "edit from visualization":** PhaseDrawer saves IMMEDIATELY on every change (commit() calls onSave). Two edit paths exist:
- PhaseDrawer (Sheet slide-out, 420px) — quick inline edit, lighter
- PhaseFormDialog (9-step wizard modal) — comprehensive edit, heavier
When user clicks a ring/phase in the visualization, you could open either depending on context.

---

### CONTEXT: src/features/warmth/LifePage.tsx (450 lines, full)

```tsx
"use client"
import * as React from 'react'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { HeartHandshake, Images, Layers, Map, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

import { RiverMap } from '@/components/life-river/RiverMap'
import { TimelineView } from '@/components/life-river/TimelineView'
import { CoreSample } from '@/components/life-river/CoreSample'
import { TodayTributary } from '@/components/life-river/TodayTributary'
import { PhaseCard } from '@/components/life-river/PhaseCard'
import { PhaseFormDialog } from '@/components/life-river/phase-form-dialog'
import { MemoryLightbox } from '@/components/life-river/memory-lightbox'
import { LifeRiver } from '@/components/life-river/river'
import { NotesTab } from '@/components/life-river/NotesTab'
import CovenantPage from '../../features/covenant/CovenantPage'
import MemoriesPage from '../../features/memories/MemoriesPage'
import GoldPage from '../../features/warmth/gold/GoldPage'
import { confetti } from '../../components/ui/confetti'
import { useLifePhases } from '@/hooks/useLifePhases'
import { useCovenant } from '../../features/covenant/useCovenant'
import { useMemories, type LoadedMemory } from '../../features/memories/useMemories'
import type { Goal, LongTermGoal } from '../../components/dashboard/types'
import type { LTGForm } from '../warmth/gold/GoldPage'

const toStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayStr = () => toStr(new Date())

type ViewMode = 'pages' | 'river'
type PageTab = 'covenant' | 'memories' | 'gold' | 'notes'

const PAGE_TABS: { key: PageTab; label: string; icon: typeof HeartHandshake; accent: string }[] = [
  { key: 'covenant', label: 'Covenant', icon: HeartHandshake, accent: '#e8866b' },
  { key: 'memories', label: 'Memories', icon: Images, accent: '#6fb38f' },
  { key: 'gold', label: 'Gold', icon: Layers, accent: '#fbbf24' },
  { key: 'notes', label: 'Notes', icon: BookOpen, accent: '#a78bfa' },
]

const crossfade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
}

const pillTransition = { type: 'spring' as const, stiffness: 400, damping: 32 }

export default function LifePage() {
  const { phases, loading, error, savePhase, reflect } = useLifePhases()
  const covenant = useCovenant()
  const memories = useMemories()

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem('life-view-mode') as ViewMode) || 'river' } catch { return 'river' }
  })
  const [pageTab, setPageTab] = useState<PageTab>('covenant')

  const [zoomStop, setZoomStop] = useState('Life')
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [adding, setAdding] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [ltgs, setLtgs] = useState<LongTermGoal[]>([])
  const [viewing, setViewing] = useState<LoadedMemory | null>(null)

  const feedRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: feedRef })
  const mapOpacity = useTransform(scrollY, [0, 200], [1, 0.85])
  const mapScale = useTransform(scrollY, [0, 300], [1, 0.97])

  useEffect(() => () => { if (highlightTimer.current) clearTimeout(highlightTimer.current) }, [])

  const setMode = useCallback((m: ViewMode) => {
    setViewMode(m)
    try { localStorage.setItem('life-view-mode', m) } catch { /* ignore */ }
  }, [])

  const reloadGoals = useCallback(async () => {
    try {
      const gRes = await (window as any).deskflowAPI.getGoals(todayStr())
      if (gRes?.goals) setGoals(gRes.goals)
    } catch { /* non-critical */ }
  }, [])

  const reloadLtgs = useCallback(async () => {
    try {
      const lRes = await (window as any).deskflowAPI.getLongtermGoals()
      if (lRes?.goals) setLtgs(lRes.goals)
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [gRes, lRes] = await Promise.all([
          (window as any).deskflowAPI.getGoals(todayStr()),
          (window as any).deskflowAPI.getLongtermGoals(),
        ])
        if (cancelled) return
        if (gRes?.goals) setGoals(gRes.goals)
        if (lRes?.goals) setLtgs(lRes.goals)
      } catch { /* non-critical */ }
    })()
    return () => { cancelled = true }
  }, [])

  const scrollToPhase = useCallback((id: string) => {
    setActivePhaseId(id)
    setHighlightId(id)
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlightId(null), 900)
    try { document.getElementById(`phase-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) } catch { /* ignore */ }
  }, [])

  const toggleGoal = useCallback(async (goal: Goal) => {
    const newStatus = goal.status === 'done' ? 'active' : 'done'
    const completedAt = newStatus === 'done' ? new Date().toISOString() : undefined
    setGoals(prev => prev.map(g => (g.id === goal.id ? { ...g, status: newStatus as any, completedAt } : g)))
    if (newStatus === 'done') confetti({ particleCount: 60, spread: 90, startVelocity: 40, colors: ['#8b5cf6', '#a78bfa', '#34d399', '#fbbf24'] })
    try { await (window as any).deskflowAPI.saveGoal(todayStr(), { ...goal, status: newStatus, completedAt }) }
    catch { setGoals(prev => prev.map(g => (g.id === goal.id ? goal : g))) }
  }, [])

  const handleAddGoal = useCallback(async (goal: Goal) => {
    setGoals(prev => [...prev, goal])
    try {
      await (window as any).deskflowAPI.saveGoal(todayStr(), goal)
      confetti({ particleCount: 50, spread: 80, startVelocity: 35, colors: ['#fbbf24', '#f59e0b', '#34d399', '#a78bfa'] })
      await reloadGoals()
    } catch { setGoals(prev => prev.filter(g => g.id !== goal.id)) }
  }, [reloadGoals])

  const handleAddLTG = useCallback(async (form: LTGForm): Promise<boolean> => {
    try {
      const res = await (window as any).deskflowAPI.saveGoalsBatch([{
        id: `ltg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: form.title.trim(), description: form.description.trim() || null,
        category: form.category, priority: form.priority, deadline: form.deadline || null,
        status: 'active', period: 'longterm', date: '2000-01-01', source: 'manual', links: [],
      }])
      if (res?.success) { await reloadLtgs(); return true }
      return false
    } catch { return false }
  }, [reloadLtgs])

  const handleKeepReflection = useCallback((phase: Parameters<typeof reflect>[0], text: string) => {
    savePhase({ ...phase, reflection: text }, { silent: true })
  }, [savePhase])

  // Per-phase aggregates for Ring & Grain hero
  const nowYear = new Date().getFullYear()
  const memoriesByPhase = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of phases) {
      const endY = p.endYear && p.endYear > 0 ? p.endYear : nowYear
      map[p.id] = memories.items.filter(m => {
        const y = parseInt((m.meta.date || '').slice(0, 4), 10)
        return Number.isFinite(y) && y >= p.startYear && y <= endY
      }).length
    }
    return map
  }, [phases, memories.items, nowYear])

  const ltgsByPhase = useMemo(() => {
    const map: Record<string, LongTermGoal[]> = {}
    const yearOf = (s?: string | null) => { if (!s) return NaN; const y = parseInt(String(s).slice(0, 4), 10); return Number.isFinite(y) ? y : NaN }
    for (const p of phases) {
      const endY = p.endYear && p.endYear > 0 ? p.endYear : nowYear
      map[p.id] = ltgs.filter(ltg => {
        const y = yearOf(ltg.deadline) || yearOf(ltg.createdAt)
        return Number.isFinite(y) && y >= p.startYear && y <= endY
      })
    }
    return map
  }, [phases, ltgs, nowYear])

  if (loading && phases.length === 0) {
    return (<div className="flex flex-col gap-4 p-5" data-page="life">
      <div className="h-64 animate-pulse rounded-xl border border-zinc-800/50 bg-zinc-900/40" />
      <div className="h-40 animate-pulse rounded-xl border border-zinc-800/50 bg-zinc-900/40" />
      <div className="h-40 animate-pulse rounded-xl border border-zinc-800/50 bg-zinc-900/40" />
    </div>)
  }

  if (error && phases.length === 0) {
    return (<div className="flex flex-col items-center gap-3 p-10 text-center" data-page="life">
      <p className="text-[13px] text-zinc-400">Could not load the river.</p>
      <p className="text-[12px] text-zinc-600">{error}</p>
      <button onClick={() => window.location.reload()} className="rounded-lg border border-zinc-700/60 bg-zinc-800/40 px-3 py-1.5 text-[12px] text-zinc-300 hover:bg-zinc-800/70">Reload</button>
    </div>)
  }

  return (
    <div className="flex flex-col h-full" data-page="life">
      {/* ── Mode Toggle ── */}
      <div className="sticky top-0 z-40 -mx-5 px-5 bg-zinc-900/20 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center gap-2 py-2">
          <span className="text-[15px] font-semibold mr-2 text-[var(--text-primary)]">Life</span>
          <div className="flex gap-1 bg-zinc-800/50 p-0.5 rounded-lg">
            {([{ key: 'pages' as ViewMode, label: 'Pages', icon: Map }, { key: 'river' as ViewMode, label: 'River', icon: Layers }]).map(mode => (
              <button key={mode.key} onClick={() => setMode(mode.key)}
                className={`relative px-3 py-1.5 text-xs rounded-md transition-colors min-h-[36px] flex items-center gap-1.5 ${viewMode === mode.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {viewMode === mode.key && <motion.div layoutId="life-mode-pill" className="absolute inset-0 rounded-md bg-zinc-700/80 border border-white/10" transition={pillTransition} />}
                <mode.icon className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10 font-medium">{mode.label}</span>
              </button>
            ))}
          </div>
          {viewMode === 'pages' && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-1 ml-2 bg-zinc-800/50 p-0.5 rounded-lg">
              {PAGE_TABS.map(tab => (
                <button key={tab.key} onClick={() => setPageTab(tab.key)}
                  className={`relative px-3 py-1.5 text-xs rounded-md transition-colors min-h-[36px] flex items-center gap-1.5 ${pageTab === tab.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  {pageTab === tab.key && <motion.div layoutId="life-page-pill" className="absolute inset-0 rounded-md" style={{ background: `${tab.accent}22`, border: `1px solid ${tab.accent}40` }} transition={pillTransition} />}
                  <tab.icon className="w-3.5 h-3.5 relative z-10" style={pageTab === tab.key ? { color: tab.accent } : undefined} />
                  <span className="relative z-10 font-medium">{tab.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      {viewMode === 'pages' ? (
        <div className="flex-1 min-h-0 overflow-auto p-5">
          <AnimatePresence mode="wait">
            {pageTab === 'covenant' && <motion.div key="covenant" {...crossfade} className="max-w-3xl mx-auto"><CovenantPage embedded /></motion.div>}
            {pageTab === 'memories' && <motion.div key="memories" {...crossfade} className="max-w-4xl mx-auto"><MemoriesPage embedded /></motion.div>}
            {pageTab === 'gold' && <motion.div key="gold" {...crossfade} className="max-w-5xl mx-auto"><GoldPage /></motion.div>}
            {pageTab === 'notes' && <motion.div key="notes" {...crossfade} className="max-w-5xl mx-auto"><NotesTab /></motion.div>}
          </AnimatePresence>
        </div>
      ) : (
        /* ═══ RIVER MODE ═══ */
        <div className="flex flex-col flex-1 min-h-0 relative" ref={feedRef}>
          {/* Vital Thread */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 pointer-events-none z-0"
            style={{ background: 'linear-gradient(to bottom, rgba(251,191,36,0.25) 0%, rgba(111,179,143,0.2) 40%, rgba(56,189,248,0.15) 80%, transparent 100%)', filter: 'blur(0.5px)' }} />

          {/* Apex Map (parallax) */}
          <motion.div style={{ opacity: mapOpacity, scale: mapScale }} className="space-y-3">
            <CoreSample
              phases={phases}
              covenant={{ completions: covenant.completions, commitments: covenant.commitments }}
              memoriesByPhase={memoriesByPhase}
              ltgsByPhase={ltgsByPhase}
              selectedPhaseId={activePhaseId}
              onPhaseClick={scrollToPhase}
              onOpenMemories={phaseId => {
                const first = memories.items.find(m => {
                  const y = parseInt((m.meta.date || '').slice(0, 4), 10)
                  const p = phases.find(ph => ph.id === phaseId)
                  return p && Number.isFinite(y) && y >= p.startYear && y <= (p.endYear || nowYear)
                })
                if (first) setViewing(first)
              }}
            />
            {phases.length > 0 && <TimelineView phases={phases} onJump={scrollToPhase} />}
            <RiverMap phases={phases} zoomStop={zoomStop} onZoomChange={setZoomStop}
              activePhaseId={activePhaseId} onPhaseClick={scrollToPhase} onAddPhase={() => setAdding(true)} />
          </motion.div>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-auto p-5 ws-scroll relative z-10">
            <div className="mx-auto max-w-5xl space-y-8">
              <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                <TodayTributary covenant={covenant} memories={memories} goals={goals} longTermGoals={ltgs}
                  onToggleGoal={toggleGoal} onAddGoal={handleAddGoal} onAddLTG={handleAddLTG} />
              </motion.div>

              {phases.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center">
                  <p className="text-[12.5px] text-zinc-600">Add your first phase above and it will flow into the river.</p>
                </div>
              ) : (
                phases.map((phase, i) => (
                  <motion.div key={phase.id} id={`phase-${phase.id}`} className="scroll-mt-32"
                    initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}>
                    <div className={cn('rounded-xl transition-shadow duration-300', highlightId === phase.id && 'ring-2 ring-amber-400/80 shadow-[0_0_30px_rgba(251,191,36,0.35)]')}>
                      <PhaseCard phase={phase} active={activePhaseId === phase.id} allPhases={phases}
                        memories={memories.items} longTermGoals={ltgs} onActiveChange={setActivePhaseId}
                        onSave={p => { savePhase(p) }} onReflect={(p, answers, variation) => reflect(p, answers, variation)}
                        onKeepReflection={handleKeepReflection} onOpenMemory={setViewing} onJump={scrollToPhase} />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <PhaseFormDialog open={adding} onOpenChange={setAdding} allPhases={phases}
            onSave={p => { savePhase(p); setAdding(false) }} />
          {viewing && <MemoryLightbox memory={viewing} onClose={() => setViewing(null)} />}
        </div>
      )}
    </div>
  )
}
```

**Lens state is NOT in LifePage.** `CoreSample` owns `lens` as local `useState<LensId>('phases')`. To propagate lens to other components:
1. Lift `lens` state from CoreSample → LifePage
2. Pass `lens` + `onLensChange` as props to CoreSample
3. Pass `lens` to TimelineView, PhaseCard, TodayTributary as needed
4. CoreSample becomes a controlled component (receives lens as prop)

**State already in LifePage:** viewMode, pageTab, zoomStop, activePhaseId, highlightId, adding, goals, ltgs, viewing, goals/ltgs reload callbacks.

---

## Decisions made:
- None yet — waiting for Specialist to produce RESULT.md after reviewing these files.

## Convergence status: ongoing
