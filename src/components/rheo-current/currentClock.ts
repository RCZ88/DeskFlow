import { CURRENT_CYCLE_MS } from './types';

export function createClock() {
  let currentPhase = 0;
  let previousTimestamp = 0;

  function update(delta: number): number {
    currentPhase = (currentPhase + delta / CURRENT_CYCLE_MS) % 1;
    return currentPhase;
  }

  function setTimestamp(ts: number) {
    previousTimestamp = ts;
  }

  function getCurrentPhase(): number {
    return currentPhase;
  }

  function reset() {
    currentPhase = 0;
    previousTimestamp = 0;
  }

  return { update, setTimestamp, getCurrentPhase, reset };
}
