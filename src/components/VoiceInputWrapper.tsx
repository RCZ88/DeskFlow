/**
 * VoiceInputWrapper — Self-contained voice input with smart positioning
 * Click mic → starts. Click again → stops. Panel positions itself
 * based on viewport space so it's never cropped or obstructed.
 */

import { useRef, useCallback, useEffect, useState, type ReactElement, cloneElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Square, Delete, AlertCircle } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────

interface VoiceInputWrapperProps {
  children: ReactElement;
  silenceMs?: number;
}

interface PanelPosition {
  vertical: 'below' | 'above';
  horizontal: 'left' | 'center' | 'right';
  maxHeight: number;
}

// ── Smart Positioning ─────────────────────────────────────────────────

function computePosition(rect: DOMRect): PanelPosition {
  const PANEL_HEIGHT = 80;
  const PANEL_WIDTH = 340;
  const MARGIN = 8;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  // Space below and above
  const spaceBelow = viewportH - rect.bottom - MARGIN;
  const spaceAbove = rect.top - MARGIN;

  // Vertical: prefer below, flip above if not enough space
  const vertical = spaceBelow >= PANEL_HEIGHT ? 'below' : 'above';

  // Horizontal: center on input, but shift if near edges
  const centerX = rect.left + rect.width / 2;
  const halfPanel = PANEL_WIDTH / 2;

  let horizontal: 'left' | 'center' | 'right' = 'center';
  if (centerX - halfPanel < MARGIN) horizontal = 'left';
  else if (centerX + halfPanel > viewportW - MARGIN) horizontal = 'right';

  // Max height for panel content
  const maxHeight = vertical === 'below' ? spaceBelow : spaceAbove;

  return { vertical, horizontal, maxHeight };
}

// ── Component ─────────────────────────────────────────────────────────

export function VoiceInputWrapper({ children, silenceMs = 8000 }: VoiceInputWrapperProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [bars, setBars] = useState<number[]>(new Array(24).fill(0));
  const [volume, setVolume] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<PanelPosition>({
    vertical: 'below',
    horizontal: 'center',
    maxHeight: 300,
  });

  // ── Recalculate position when listening starts or on scroll/resize ───
  const updatePosition = useCallback(() => {
    const el = inputRef.current || containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition(computePosition(rect));
  }, []);

  useEffect(() => {
    if (!listening) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [listening, updatePosition]);

  // ── Audio Visualizer ────────────────────────────────────────────────
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
      analyserRef.current = analyser;

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
    analyserRef.current = null;
    setBars(new Array(24).fill(0));
    setVolume(0);
  }, []);

  // ── Text insertion ──────────────────────────────────────────────────
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

    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    if (nativeSetter) nativeSetter.call(el, newValue);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.setSelectionRange(pos, pos);
  }, []);

  const removeLastSentence = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const text = el.value;
    const parts = text.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const newText = parts.slice(0, -1).join('. ') + (parts.length > 1 ? '.' : '');
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    if (nativeSetter) nativeSetter.call(el, newText);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    setSentences(prev => prev.slice(0, -1));
  }, []);

  // ── Speech Recognition ──────────────────────────────────────────────
  const stopListening = useCallback(() => {
    setListening(false);
    setInterim('');
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

  const startListening = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      setError('Speech recognition not supported');
      setTimeout(() => setError(null), 2000);
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = localStorage.getItem('voice-lang') || navigator.language || 'en-US';

    recognition.onresult = (event: any) => {
      let interimStr = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (!r.isFinal) {
          interimStr += r[0].transcript;
        } else {
          const text = r[0].transcript;
          setInterim('');
          setSentences(prev => [...prev, text]);
          insertText(text);
        }
      }
      if (interimStr) setInterim(interimStr);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => stopListening(), silenceMs);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(event.error === 'not-allowed' ? 'Microphone permission denied' : 'Voice error');
      setTimeout(() => setError(null), 2000);
      stopListening();
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        try { recognition.start(); } catch { stopListening(); }
      }
    };

    recognitionRef.current = recognition;
    setListening(true);
    setSentences([]);
    setInterim('');

    try {
      recognition.start();
    } catch {
      stopListening();
      return;
    }

    startAudio();

    silenceTimerRef.current = setTimeout(() => stopListening(), silenceMs);
  }, [silenceMs, insertText, startAudio, stopListening]);

  const toggle = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && listening) stopListening();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [listening, stopListening]);

  useEffect(() => () => stopListening(), [stopListening]);

  const supported = typeof window !== 'undefined' && !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);
  if (!supported) return <>{children}</>;

  const isMultiline = children.type === 'textarea' ||
    (typeof children.type === 'function' && (children.type as any).name?.toLowerCase().includes('textarea'));

  const childWithRef = cloneElement(children, {
    ref: (node: any) => {
      inputRef.current = node;
      const childRef = (children.props as any).ref;
      if (typeof childRef === 'function') childRef(node);
      else if (childRef && 'current' in childRef) childRef.current = node;
    },
    className: `${(children.props as any).className || ''} pr-10`,
  });

  // ── Panel position styles ───────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 50,
    width: 340,
    maxWidth: '95vw',
    maxHeight: Math.min(position.maxHeight, 120),
    overflow: 'hidden',
  };

  if (position.vertical === 'below') {
    panelStyle.top = '100%';
    panelStyle.marginTop = 8;
  } else {
    panelStyle.bottom = '100%';
    panelStyle.marginBottom = 8;
  }

  if (position.horizontal === 'left') {
    panelStyle.left = 0;
  } else if (position.horizontal === 'right') {
    panelStyle.right = 0;
  } else {
    panelStyle.left = '50%';
    panelStyle.transform = 'translateX(-50%)';
  }

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      {childWithRef}

      {/* Mic Button */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10">
        <button
          type="button"
          onClick={toggle}
          aria-label={listening ? 'Stop voice input' : 'Start voice input'}
          aria-pressed={listening}
          className={`
            relative grid place-items-center rounded-lg w-8 h-8 min-w-[44px] min-h-[44px] p-0
            transition-all duration-150
            focus-visible:ring-2 focus-visible:ring-[#e8866b]/60 focus-visible:outline-none
            ${listening
              ? 'bg-[#d96846]/15 text-[#e8866b] ring-1 ring-[#d96846]/30'
              : error
                ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/40'
                : 'text-zinc-400 bg-zinc-900/60 ring-1 ring-zinc-800/60 hover:text-[#e8866b] hover:ring-[#d96846]/30'
            }
          `}
        >
          {listening && (
            <span className="absolute inset-0 rounded-lg animate-[pulse-ring_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite] pointer-events-none" />
          )}
          {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </button>
      </div>

      {/* Floating Panel — positioned via computed style */}
      <AnimatePresence>
        {(listening || error) && (
          <motion.div
            initial={{ opacity: 0, y: position.vertical === 'below' ? 8 : -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position.vertical === 'below' ? 8 : -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            style={panelStyle}
          >
            <div className="rounded-xl p-3 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 shadow-xl shadow-black/20">
              <div className="flex items-center gap-3">
                {/* Sound Wave */}
                <div className="flex-shrink-0 flex items-end gap-[2px] h-8" aria-hidden="true">
                  {bars.map((value, i) => {
                    const height = Math.max(4, Math.round(value * 32));
                    const opacity = 0.4 + value * 0.6;
                    const isCenter = i >= 8 && i <= 15;
                    return (
                      <div
                        key={i}
                        className="w-[3px] rounded-full transition-all duration-75"
                        style={{
                          height: listening ? height : 4,
                          backgroundColor: isCenter
                            ? `rgba(232, 134, 107, ${opacity})`
                            : `rgba(217, 104, 70, ${opacity * 0.8})`,
                        }}
                      />
                    );
                  })}
                </div>

                <div className="w-px h-6 bg-zinc-700/50 flex-shrink-0" />

                {/* Interim text */}
                <div className="flex-1 min-w-0">
                  {error ? (
                    <div className="flex items-center gap-1.5 text-red-400 text-sm">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{error}</span>
                    </div>
                  ) : interim ? (
                    <p className="text-sm text-zinc-300 italic truncate">{interim}</p>
                  ) : (
                    <p className="text-sm text-zinc-500 italic">Listening...</p>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={removeLastSentence}
                    disabled={sentences.length === 0}
                    className={`grid place-items-center rounded-md w-7 h-7 transition-colors ${
                      sentences.length === 0
                        ? 'text-zinc-600 cursor-not-allowed'
                        : 'text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-700/60'
                    }`}
                    aria-label="Remove last sentence"
                  >
                    <Delete className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={stopListening}
                    className="grid place-items-center rounded-full w-7 h-7 bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                    aria-label="Stop voice input"
                  >
                    <Square className="h-3 w-3 fill-current" />
                  </button>
                </div>
              </div>

              {/* Volume bar */}
              <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#e8866b]/60 transition-all duration-100"
                  style={{ width: `${volume * 100}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
