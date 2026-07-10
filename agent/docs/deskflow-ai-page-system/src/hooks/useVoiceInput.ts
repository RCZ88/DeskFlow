import { useState, useRef, useCallback, useEffect } from 'react';

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

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  silenceMs?: number;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';
export type VoiceError = 'no-permission' | 'no-speech' | 'aborted' | 'unknown';

export interface UseVoiceInput {
  supported: boolean;
  state: VoiceState;
  interim: string;
  error?: VoiceError;
  start: () => void;
  stop: () => void;
  countdownMs: number;
}

export function useVoiceInput({ onTranscript, silenceMs = 5000 }: UseVoiceInputOptions): UseVoiceInput {
  const [state, setState] = useState<VoiceState>('idle');
  const [supported, setSupported] = useState(true);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<VoiceError | undefined>();
  const [countdownMs, setCountdownMs] = useState(silenceMs);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setCountdownMs(silenceMs);
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, silenceMs);
  }, [silenceMs]);

  useEffect(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimStr = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) { interimStr += result[0].transcript; }
      }
      setInterim(interimStr);
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          setInterim('');
          onTranscript(result[0].transcript);
        }
      }
      resetSilenceTimer();
    };

    recognition.onerror = (event: Event & { error: string }) => {
      setState('error');
      if (event.error === 'not-allowed') setError('no-permission');
      else if (event.error === 'no-speech') setError('no-speech');
      else if (event.error === 'aborted') setError('aborted');
      else setError('unknown');
      clearTimers();
      setTimeout(() => { setState('idle'); setError(undefined); }, 1200);
    };

    recognition.onend = () => {
      setState('idle');
      setInterim('');
      clearTimers();
    };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); clearTimers(); };
  }, [onTranscript, resetSilenceTimer, clearTimers]);

  const start = useCallback(() => {
    if (!recognitionRef.current || !supported) return;
    setInterim('');
    setError(undefined);
    setCountdownMs(silenceMs);
    setState('listening');
    startedAtRef.current = Date.now();
    try { recognitionRef.current.start(); } catch { setState('idle'); return; }
    resetSilenceTimer();
    countdownTimerRef.current = setInterval(() => {
      setCountdownMs(prev => Math.max(0, prev - 100));
    }, 100);
  }, [supported, silenceMs, resetSilenceTimer]);

  const stop = useCallback(() => {
    if (state === 'listening') {
      setState('processing');
      setTimeout(() => {
        if (recognitionRef.current) recognitionRef.current.stop();
      }, 200);
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [state]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return { supported, state, interim, error, start, stop, countdownMs };
}
