/**
 * VoiceContext — Global Voice Input Manager
 * Ensures only ONE SpeechRecognition instance is active app-wide.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { VoiceState, VoiceError } from '../hooks/useVoiceInput';

// ── Types ─────────────────────────────────────────────────────────────

export interface ActiveVoiceSession {
  inputId: string;
  element: HTMLInputElement | HTMLTextAreaElement | null;
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onBackspace?: () => void;
  onStop?: () => void;
}

export interface VoiceContextValue {
  // Global state
  state: VoiceState;
  interim: string;
  solidifying: boolean;
  error?: VoiceError;
  countdownMs: number;
  activeInputId: string | null;
  language: string;

  // Session info
  activeSession: ActiveVoiceSession | null;

  // Actions
  startSession: (session: ActiveVoiceSession) => void;
  stopSession: () => void;
  setInterim: (text: string) => void;
  setSolidifying: (v: boolean) => void;
  setError: (error?: VoiceError) => void;
  setCountdownMs: (ms: number) => void;
  setLanguage: (lang: string) => void;
  backspace: () => void;
}

// ── Context ───────────────────────────────────────────────────────────

const VoiceContext = createContext<VoiceContextValue | null>(null);

export function useVoiceContext(): VoiceContextValue | null {
  return useContext(VoiceContext);
}

// ── Provider ──────────────────────────────────────────────────────────

interface VoiceProviderProps {
  children: React.ReactNode;
  defaultLang?: string;
}

export function VoiceProvider({ children, defaultLang = 'en-US' }: VoiceProviderProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [interim, setInterim] = useState('');
  const [solidifying, setSolidifying] = useState(false);
  const [error, setError] = useState<VoiceError | undefined>();
  const [countdownMs, setCountdownMs] = useState(5000);
  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [language, setLanguageState] = useState(defaultLang);

  const sessionRef = useRef<ActiveVoiceSession | null>(null);

  // Load persisted language
  useEffect(() => {
    try {
      const stored = localStorage.getItem('voice-lang');
      if (stored) setLanguageState(stored);
    } catch { /* ignore */ }
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    try { localStorage.setItem('voice-lang', lang); } catch { /* ignore */ }
  }, []);

  const startSession = useCallback((session: ActiveVoiceSession) => {
    // If another session is active, stop it first
    if (sessionRef.current && sessionRef.current.inputId !== session.inputId) {
      sessionRef.current.onStop?.();
    }
    sessionRef.current = session;
    setActiveInputId(session.inputId);
    setState('listening');
    setInterim('');
    setError(undefined);
  }, []);

  const stopSession = useCallback(() => {
    sessionRef.current?.onStop?.();
    sessionRef.current = null;
    setActiveInputId(null);
    setState('idle');
    setInterim('');
  }, []);

  const backspace = useCallback(() => {
    sessionRef.current?.onBackspace?.();
  }, []);

  const value: VoiceContextValue = {
    state,
    interim,
    solidifying,
    error,
    countdownMs,
    activeInputId,
    language,
    activeSession: sessionRef.current,
    startSession,
    stopSession,
    setInterim,
    setSolidifying,
    setError,
    setCountdownMs,
    setLanguage,
    backspace,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
}
