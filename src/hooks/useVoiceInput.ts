/**
 * useVoiceInput — Speech Recognition Hook (v3)
 * Uses refs for context values to prevent recognition re-creation on state changes.
 */

import { useState, useRef, useCallback, useEffect, useId } from 'react';
import { useVoiceContext } from '../context/VoiceContext';
import { getStoredLanguage, insertAtCursor, getCursorPosition } from '../lib/voice-utils';

// ── Types ─────────────────────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
    SpeechRecognition?: new () => SpeechRecognition;
  }
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';
export type VoiceError = 'no-permission' | 'no-speech' | 'aborted' | 'unknown';

export interface UseVoiceInput {
  supported: boolean;
  state: VoiceState;
  interim: string;
  solidifying: boolean;
  error?: VoiceError;
  start: () => void;
  stop: () => void;
  countdownMs: number;
  lang: string;
  setLang: (lang: string) => void;
  backspace: () => void;
  sentences: string[];
  isActive: boolean;
}

export interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  silenceMs?: number;
  lang?: string;
  mode?: 'append' | 'replace';
  elementRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useVoiceInput({
  onTranscript,
  silenceMs = 5000,
  lang: langProp,
  mode = 'append',
  elementRef,
}: UseVoiceInputOptions): UseVoiceInput {
  const inputId = useId();
  const ctx = useVoiceContext();

  // Local state for backwards compatibility
  const [localState, setLocalState] = useState<VoiceState>('idle');
  const [localInterim, setLocalInterim] = useState('');
  const [localSolidifying, setLocalSolidifying] = useState(false);
  const [localError, setLocalError] = useState<VoiceError | undefined>();
  const [localCountdown, setLocalCountdown] = useState(silenceMs);

  const [sentences, setSentences] = useState<string[]>([]);
  const [lang, setLangState] = useState(langProp || getStoredLanguage());

  // ── Refs (stable — never cause re-renders) ─────────────────────────
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const solidifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userStoppedRef = useRef(false);
  const startedAtRef = useRef<number>(0);

  // Refs for values used inside recognition callbacks (avoid stale closures)
  const onTranscriptRef = useRef(onTranscript);
  const elementRefRef = useRef(elementRef);
  const hasProvider = !!ctx;
  const ctxRef = useRef(ctx);
  const modeRef = useRef(mode);
  const langRef = useRef(lang);
  const silenceMsRef = useRef(silenceMs);
  const sentencesRef = useRef(sentences);

  // Keep refs up to date
  onTranscriptRef.current = onTranscript;
  elementRefRef.current = elementRef;
  ctxRef.current = ctx;
  modeRef.current = mode;
  langRef.current = lang;
  silenceMsRef.current = silenceMs;
  sentencesRef.current = sentences;

  // ── State derivation ───────────────────────────────────────────────
  const state = hasProvider ? ctx.state : localState;
  const interim = hasProvider ? ctx.interim : localInterim;
  const solidifying = hasProvider ? ctx.solidifying : localSolidifying;
  const error = hasProvider ? ctx.error : localError;
  const countdownMs = hasProvider ? ctx.countdownMs : localCountdown;
  const isActive = hasProvider ? ctx.activeInputId === inputId : state === 'listening';

  // ── Helpers ─────────────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    if (solidifyTimerRef.current) { clearTimeout(solidifyTimerRef.current); solidifyTimerRef.current = null; }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    const setter = hasProvider ? ctx.setCountdownMs : setLocalCountdown;
    setter(silenceMsRef.current);
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, silenceMsRef.current);
  }, [hasProvider, ctx]);

  // ── Backspace ────────────────────────────────────────────────────────
  const backspace = useCallback(() => {
    if (sentencesRef.current.length === 0) return;
    const last = sentencesRef.current[sentencesRef.current.length - 1];
    setSentences(prev => prev.slice(0, -1));
    onTranscriptRef.current(`\x00BACKSPACE:${last}`);
  }, []);

  // ── Language ───────────────────────────────────────────────────────
  const setLang = useCallback((newLang: string) => {
    setLangState(newLang);
    if (hasProvider) ctx.setLanguage(newLang);
    if (state === 'listening' && recognitionRef.current) {
      recognitionRef.current.stop();
      setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.lang = newLang;
          try { recognitionRef.current.start(); } catch { /* ignore */ }
        }
      }, 200);
    }
  }, [state, hasProvider, ctx]);

  // ── SpeechRecognition Setup (NO ctx dependency!) ──────────────────
  useEffect(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = langRef.current;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimStr = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) {
          interimStr += result[0].transcript;
        }
      }

      // Update interim
      const c = ctxRef.current;
      if (c) c.setInterim(interimStr);
      else setLocalInterim(interimStr);

      // Process final results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript;

          // Clear interim
          if (c) c.setInterim('');
          else setLocalInterim('');

          // Set solidifying
          if (c) c.setSolidifying(true);
          else setLocalSolidifying(true);

          // Track sentence
          setSentences(prev => [...prev, text]);

          // Cursor-aware insertion
          const el = elementRefRef.current?.current;
          if (el && modeRef.current === 'append') {
            const cursor = getCursorPosition(el);
            const { newValue, newCursor } = insertAtCursor(el.value, text, cursor, 'append');
            el.value = newValue;
            el.setSelectionRange(newCursor.start, newCursor.end);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }

          onTranscriptRef.current(text);

          if (solidifyTimerRef.current) clearTimeout(solidifyTimerRef.current);
          solidifyTimerRef.current = setTimeout(() => {
            if (c) c.setSolidifying(false);
            else setLocalSolidifying(false);
          }, 800);
        }
      }

      // Reset silence timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      const currentSilenceMs = silenceMsRef.current;
      const countdownSetter = c ? c.setCountdownMs : setLocalCountdown;
      countdownSetter(currentSilenceMs);
      silenceTimerRef.current = setTimeout(() => {
        recognitionRef.current?.stop();
      }, currentSilenceMs);
    };

    recognition.onerror = (event: Event & { error: string }) => {
      const c = ctxRef.current;

      if (event.error === 'no-speech' || event.error === 'aborted') {
        if (c) c.setError(event.error === 'no-speech' ? 'no-speech' : 'aborted');
        else setLocalError(event.error === 'no-speech' ? 'no-speech' : 'aborted');
        setTimeout(() => {
          if (c) c.setError(undefined);
          else setLocalError(undefined);
        }, 1200);
        return;
      }

      if (c) {
        if (event.error === 'not-allowed') c.setError('no-permission');
        else c.setError('unknown');
        c.stopSession();
      } else {
        setLocalState('error');
        if (event.error === 'not-allowed') setLocalError('no-permission');
        else setLocalError('unknown');
        setTimeout(() => {
          setLocalState('idle');
          setLocalError(undefined);
        }, 1200);
      }
      clearTimers();
    };

    recognition.onend = () => {
      if (userStoppedRef.current) {
        userStoppedRef.current = false;
        const c = ctxRef.current;
        if (c) c.stopSession();
        else {
          setLocalState('idle');
          setLocalInterim('');
        }
        clearTimers();
        return;
      }

      // Natural end — restart recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          const c = ctxRef.current;
          if (c) c.stopSession();
          else setLocalState('idle');
          clearTimers();
        }
      }
    };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); clearTimers(); };
  }, []); // ← EMPTY dependency array — recognition created once

  // ── Start ────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (!recognitionRef.current) return;

    userStoppedRef.current = false;

    if (hasProvider) {
      ctx.startSession({
        inputId,
        element: elementRefRef.current?.current ?? null,
        onTranscript: onTranscriptRef.current,
        onBackspace: backspace,
        onStop: () => { recognitionRef.current?.stop(); },
      });
    } else {
      setLocalState('listening');
    }

    const setInterimFn = hasProvider ? ctx.setInterim : setLocalInterim;
    const setCountdownFn = hasProvider ? ctx.setCountdownMs : setLocalCountdown;

    setInterimFn('');
    setSentences([]);
    if (hasProvider) ctx.setError(undefined);
    else setLocalError(undefined);

    setCountdownFn(silenceMsRef.current);
    startedAtRef.current = Date.now();

    try {
      recognitionRef.current.lang = langRef.current;
      recognitionRef.current.start();
    } catch {
      if (hasProvider) ctx.stopSession();
      else setLocalState('idle');
      return;
    }

    resetSilenceTimer();
    countdownTimerRef.current = setInterval(() => {
      setCountdownFn(prev => Math.max(0, prev - 100));
    }, 100);
  }, [hasProvider, ctx, inputId, backspace, resetSilenceTimer]);

  // ── Stop ─────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    userStoppedRef.current = true;
    if (state === 'listening') {
      if (!hasProvider) setLocalState('processing');
      setTimeout(() => {
        if (recognitionRef.current) recognitionRef.current.stop();
      }, 200);
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [state, hasProvider]);

  // Cleanup
  useEffect(() => () => clearTimers(), [clearTimers]);

  const supported = typeof window !== 'undefined' && !!(window.webkitSpeechRecognition || window.SpeechRecognition);

  return {
    supported,
    state,
    interim,
    solidifying,
    error,
    start,
    stop,
    countdownMs,
    lang,
    setLang,
    backspace,
    sentences,
    isActive,
  };
}
