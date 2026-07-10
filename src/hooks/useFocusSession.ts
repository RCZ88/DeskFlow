import { useEffect, useState, useCallback } from 'react';

export interface FocusPublicState {
  active: boolean;
  endsAt: number | null;
  remainingSec: number;
  strictness: string;
  paused: boolean;
}

function getApi() {
  return (window as any).deskflowAPI?.focus as any;
}

export function useFocusSession() {
  const [state, setState] = useState<FocusPublicState | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const refreshHistory = useCallback(async () => {
    const api = getApi();
    if (!api) return;
    setHistory(await api.history({ limit: 50 }));
  }, []);

  useEffect(() => {
    const api = getApi();
    if (!api) return;
    api.getState().then(setState);
    const offS = api.onState(setState);
    const offE = api.onEnded(() => { api.getState().then(setState); refreshHistory(); });
    refreshHistory();
    return () => { offS?.(); offE?.(); };
  }, [refreshHistory]);

  const start = useCallback((durationSec: number, strictness: 'distracting' | 'non_allowed' = 'distracting') => {
    const api = getApi();
    if (!api) return Promise.resolve();
    return api.start({ durationSec, strictness }).then(setState);
  }, []);

  const stop = useCallback(() => {
    const api = getApi();
    if (!api) return Promise.resolve();
    return api.end('aborted').then(() => api.getState().then(setState));
  }, []);

  return { state, history, start, stop, refreshHistory };
}
