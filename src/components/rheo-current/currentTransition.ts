import { Topology, TransitionState, TRANSITION_DURATION } from './types';

export function createTransitionState(): TransitionState {
  return {
    active: false,
    startedAt: 0,
    duration: TRANSITION_DURATION,
    from: { mode: 'stream', entities: [], accent: '#10b981' },
    to: { mode: 'stream', entities: [], accent: '#10b981' },
  };
}

export function startTransition(
  state: TransitionState,
  from: Topology,
  to: Topology,
  now: number
): TransitionState {
  return {
    active: true,
    startedAt: now,
    duration: TRANSITION_DURATION,
    from,
    to,
  };
}

export function getTransitionProgress(state: TransitionState, now: number): number {
  if (!state.active) return 1;
  const elapsed = now - state.startedAt;
  if (elapsed >= state.duration) return 1;
  return elapsed / state.duration;
}

export function isTransitionComplete(state: TransitionState, now: number): boolean {
  if (!state.active) return true;
  return (now - state.startedAt) >= state.duration;
}
