import { useState, useCallback, useEffect, useRef } from 'react';

const api = (window as any).deskflowAPI;

export interface TimerState {
  status: 'idle' | 'running' | 'paused';
  sessionId: number | null;
  elapsed: number; // seconds
  startedAt: string | null;
  lessonId: number | null;
}

export function useStudyTimer() {
  const [state, setState] = useState<TimerState>({
    status: 'idle',
    sessionId: null,
    elapsed: 0,
    startedAt: null,
    lessonId: null,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pausedAtRef = useRef<number>(0);

  // Auto-pause on window blur
  useEffect(() => {
    const handleBlur = () => {
      if (state.status === 'running' && state.sessionId) {
        api.learnTimerPause({ sessionId: state.sessionId });
        pausedAtRef.current = Date.now();
        setState(prev => ({ ...prev, status: 'paused' }));
      }
    };
    const handleFocus = () => {
      if (state.status === 'paused' && state.sessionId && pausedAtRef.current) {
        const pauseDuration = Math.floor((Date.now() - pausedAtRef.current) / 1000);
        api.learnTimerResume({ sessionId: state.sessionId });
        setState(prev => ({ ...prev, status: 'running', elapsed: prev.elapsed + pauseDuration }));
        pausedAtRef.current = 0;
      }
    };
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [state.status, state.sessionId]);

  // Timer tick
  useEffect(() => {
    if (state.status === 'running') {
      intervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, elapsed: prev.elapsed + 1 }));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.status]);

  const start = useCallback(async (lessonId?: number) => {
    const result = await api.learnTimerStart({ lessonId });
    if (result.ok) {
      setState({
        status: 'running',
        sessionId: result.data.sessionId,
        elapsed: 0,
        startedAt: result.data.startedAt,
        lessonId: lessonId || null,
      });
    }
  }, []);

  const pause = useCallback(async () => {
    if (state.sessionId) {
      await api.learnTimerPause({ sessionId: state.sessionId });
      pausedAtRef.current = Date.now();
      setState(prev => ({ ...prev, status: 'paused' }));
    }
  }, [state.sessionId]);

  const resume = useCallback(async () => {
    if (state.sessionId) {
      const pauseDuration = Math.floor((Date.now() - pausedAtRef.current) / 1000);
      await api.learnTimerResume({ sessionId: state.sessionId });
      setState(prev => ({ ...prev, status: 'running', elapsed: prev.elapsed + pauseDuration }));
      pausedAtRef.current = 0;
    }
  }, [state.sessionId]);

  const stop = useCallback(async (stats?: { nodesSeen?: number[]; quizzesTaken?: number; cardsReviewed?: number; masteryGained?: number }) => {
    if (state.sessionId) {
      await api.learnTimerStop({
        sessionId: state.sessionId,
        duration: state.elapsed,
        ...stats,
      });
      setState({
        status: 'idle',
        sessionId: null,
        elapsed: 0,
        startedAt: null,
        lessonId: null,
      });
    }
  }, [state.sessionId, state.elapsed]);

  const formatTime = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  return {
    ...state,
    formattedTime: formatTime(state.elapsed),
    start,
    pause,
    resume,
    stop,
    toggle: state.status === 'running' ? pause : resume,
  };
}
