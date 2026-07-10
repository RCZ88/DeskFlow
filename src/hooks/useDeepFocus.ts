import { useMemo } from 'react';
import { useFocusSession } from './useFocusSession';

// Typed, normalized wrapper around useFocusSession for the dashboard's
// Productivity & Focus zone. Adapts the raw IPC shapes (nullable state,
// string strictness, DB history rows) into the exact contract the UI expects.

export interface DeepFocusState {
  active: boolean;
  endsAt: number | null;
  remainingSec: number;
  strictness: 'distracting' | 'non_allowed';
  paused: boolean;
}

export interface DeepFocusHistoryItem {
  id: string;
  started_at: Date;
  planned_sec: number;
  duration_seconds: number;
  outcome: 'completed' | 'failed' | 'aborted';
  broke_on_name?: string;
}

const IDLE_STATE: DeepFocusState = {
  active: false,
  endsAt: null,
  remainingSec: 0,
  strictness: 'distracting',
  paused: false,
};

function normStrictness(s: unknown): 'distracting' | 'non_allowed' {
  return s === 'non_allowed' ? 'non_allowed' : 'distracting';
}

function normOutcome(o: unknown): 'completed' | 'failed' | 'aborted' {
  return o === 'completed' || o === 'failed' ? o : 'aborted';
}

export function useDeepFocus() {
  const { state, history, start, stop } = useFocusSession();

  const focusState: DeepFocusState = useMemo(() => {
    if (!state) return IDLE_STATE;
    return {
      active: !!state.active,
      endsAt: state.endsAt ?? null,
      remainingSec: Math.max(0, Math.round(state.remainingSec ?? 0)),
      strictness: normStrictness(state.strictness),
      paused: !!state.paused,
    };
  }, [state]);

  const focusHistory: DeepFocusHistoryItem[] = useMemo(() => {
    return (history ?? [])
      .filter((r: any) => r && r.outcome !== 'active')
      .map((r: any) => ({
        id: String(r.id ?? r.session_id ?? r.started_at ?? Math.random()),
        started_at: new Date(r.started_at ?? r.created_at ?? Date.now()),
        planned_sec: Number(r.planned_sec ?? 0),
        duration_seconds: Number(r.actual_sec ?? r.duration_seconds ?? 0),
        outcome: normOutcome(r.outcome),
        broke_on_name: r.broke_on_name ?? undefined,
      }));
  }, [history]);

  return {
    state: focusState,
    history: focusHistory,
    start: (durationSec: number, strictness: 'distracting' | 'non_allowed') =>
      start(durationSec, strictness),
    end: () => stop(),
  };
}
