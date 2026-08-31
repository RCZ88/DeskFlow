/**
 * currentPhase.ts — Module-level singleton for The Current's pulse phase.
 * 
 * The phase is a number 0→1 that increments continuously via rAF.
 * It NEVER resets across route changes — geometry changes, phase doesn't.
 * Each page reads from this singleton to render its topology.
 */

const CYCLE_MS = 8000; // full pulse cycle duration

let phase = 0;
let lastTimestamp = 0;
let animId = 0;
let listeners: Set<() => void> = new Set();

function tick(timestamp: number) {
  if (document.hidden) {
    lastTimestamp = timestamp;
    animId = requestAnimationFrame(tick);
    return;
  }
  if (lastTimestamp === 0) lastTimestamp = timestamp;
  const delta = timestamp - lastTimestamp;
  phase = (phase + delta / CYCLE_MS) % 1;
  lastTimestamp = timestamp;
  listeners.forEach(fn => {
    try { fn(); } catch { /* skip failing renderer */ }
  });
  animId = requestAnimationFrame(tick);
}

/** Start the global phase clock (call once at app mount) */
export function startPhaseClock() {
  if (animId) return;
  lastTimestamp = 0;
  animId = requestAnimationFrame(tick);
}

/** Stop the clock (cleanup) */
export function stopPhaseClock() {
  if (animId) cancelAnimationFrame(animId);
  animId = 0;
}

/** Get current phase (0–1). Safe to call from any renderer. */
export function getPhase(): number {
  return phase;
}

/** Subscribe to phase changes. Returns unsubscribe function. */
export function onPhaseTick(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
