/**
 * useVoiceInput — Enhanced Speech Recognition Hook
 * Now integrates with VoiceContext for global singleton behavior.
 * Backwards-compatible with existing AI Chat usage.
 */

import { useState, useRef, useCallback, useEffect, useId } from 'react';
import { useVoiceContext } from '../context/VoiceContext';
import { getStoredLanguage, insertAtCursor, getCursorPosition, removeLastSentence } from '../lib/voice-utils';

// ── Types (re-exported for backwards compatibility) ───────────────────

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
  // NEW API (v2)
  /** Current language code */
  lang: string;
  /** Set language and restart if listening */
  setLang: (lang: string) => void;
  /** Remove last transcribed sentence */
  backspace: () => void;
  /** Array of transcribed sentences for undo */
  sentences: string[];
  /** Whether this instance is the globally active one */
  isActive: boolean;
}

// ── Options ───────────────────────────────────────────────────────────

export interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  silenceMs?: number;
  /** Language code (e.g. 'en-US'). Defaults to stored preference or navigator.language */
  lang?: string;
  /** Insert mode: append to cursor (default) or replace selection */
  mode?: 'append' | 'replace';
  /** Optional ref to the input/textarea element for cursor-aware insertion */
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

  // Local state for backwards compatibility when used outside VoiceProvider
  const [localState, setLocalState] = useState<VoiceState>('idle');
  const [localInterim, setLocalInterim] = useState('');
  const [localSolidifying, setLocalSolidifying] = useState(false);
  const [localError, setLocalError] = useState<VoiceError | undefined>();
  const [localCountdown, setLocalCountdown] = useState(silenceMs);

  // Sentence tracking for backspace
  const [sentences, setSentences] = useState<string[]>([]);
  const [lang, setLangState] = useState(langProp || getStoredLanguage());

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const solidifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(0);
  const hasProvider = !!ctx;

  // Use global state if provider exists, otherwise local
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
    setter(silenceMs);
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, silenceMs);
  }, [silenceMs, hasProvider, ctx]);

  // ── Backspace ────────────────────────────────────────────────────────

  const backspace = useCallback(() => {
    if (sentences.length === 0) return;
    const last = sentences[sentences.length - 1];
    setSentences(prev => prev.slice(0, -1));
    // Notify consumer to remove last sentence from their text
    // We pass a special prefix so the consumer knows it's a backspace
    onTranscript(`\x00BACKSPACE:${last}`);
  }, [sentences, onTranscript]);

  // ── Language ───────────────────────────────────────────────────────

  const setLang = useCallback((newLang: string) => {
    setLangState(newLang);
    if (hasProvider) ctx.setLanguage(newLang);
    // If currently listening, restart with new language
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

  // ── SpeechRecognition Setup ────────────────────────────────────────

  useEffect(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimStr = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) {
          interimStr += result[0].transcript;
        }
      }
      const setInterimFn = hasProvider ? ctx.setInterim : setLocalInterim;
      setInterimFn(interimStr);

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript;
          setInterimFn('');

          const setSolidifyFn = hasProvider ? ctx.setSolidifying : setLocalSolidifying;
          setSolidifyFn(true);

          // Track sentence
          setSentences(prev => [...prev, text]);

          // Cursor-aware insertion if elementRef provided
          if (elementRef?.current && mode === 'append') {
            const el = elementRef.current;
            const cursor = getCursorPosition(el);
            const { newValue, newCursor } = insertAtCursor(el.value, text, cursor, mode);
            el.value = newValue;
            el.setSelectionRange(newCursor.start, newCursor.end);
            // Dispatch input event so controlled components catch it
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }

          onTranscript(text);

          if (solidifyTimerRef.current) clearTimeout(solidifyTimerRef.current);
          solidifyTimerRef.current = setTimeout(() => setSolidifyFn(false), 800);
        }
      }
      resetSilenceTimer();
    };

    recognition.onerror = (event: Event & { error: string }) => {
      const setStateFn = hasProvider
        ? (s: VoiceState) => { /* ctx.state is controlled by startSession/stopSession */ }
        : setLocalState;
      const setErrorFn = hasProvider ? ctx.setError : setLocalError;

      if (hasProvider) {
        if (event.error === 'not-allowed') ctx.setError('no-permission');
        else if (event.error === 'no-speech') ctx.setError('no-speech');
        else if (event.error === 'aborted') ctx.setError('aborted');
        else ctx.setError('unknown');
      } else {
        setLocalState('error');
        if (event.error === 'not-allowed') setLocalError('no-permission');
        else if (event.error === 'no-speech') setLocalError('no-speech');
        else if (event.error === 'aborted') setLocalError('aborted');
        else setLocalError('unknown');
      }

      clearTimers();
      setTimeout(() => {
        if (hasProvider) {
          ctx.setError(undefined);
          // ctx handles state
        } else {
          setLocalState('idle');
          setLocalError(undefined);
        }
      }, 1200);
    };

    recognition.onend = () => {
      if (hasProvider) {
        ctx.stopSession();
      } else {
        setLocalState('idle');
        setLocalInterim('');
      }
      clearTimers();
    };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); clearTimers(); };
  }, [onTranscript, lang, mode, elementRef, hasProvider, ctx, resetSilenceTimer, clearTimers]);

  // ── Start / Stop ────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    if (state === 'listening') return; // already active

    // If another input is active globally, this will be handled by VoiceContext
    if (hasProvider) {
      ctx.startSession({
        inputId,
        element: elementRef?.current ?? null,
        onTranscript,
        onBackspace: backspace,
        onStop: () => {
          recognitionRef.current?.stop();
        },
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

    setCountdownFn(silenceMs);
    startedAtRef.current = Date.now();

    try {
      recognitionRef.current.lang = lang;
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
  }, [state, silenceMs, lang, inputId, elementRef, onTranscript, backspace, hasProvider, ctx, resetSilenceTimer]);

  const stop = useCallback(() => {
    if (state === 'listening') {
      if (hasProvider) {
        // Let context handle state transition
      } else {
        setLocalState('processing');
      }
      setTimeout(() => {
        if (recognitionRef.current) recognitionRef.current.stop();
      }, 200);
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [state, hasProvider]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // Check support
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
