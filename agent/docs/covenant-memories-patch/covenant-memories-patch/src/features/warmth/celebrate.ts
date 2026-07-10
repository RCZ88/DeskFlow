// A gentler, warm-palette wrapper around the confetti library already used
// elsewhere in DeskFlow (see canvas-confetti usage in src/App.tsx). Kept
// intentionally soft and brief — this is a quiet moment of pride, not a
// slot-machine payout. Reused for streak milestones and other warm-corner wins.
import confetti from 'canvas-confetti';

const WARM_PALETTE = ['#e8866b', '#d96846', '#6fb38f', '#fbbf24', '#f7f3ee'];

export function celebrateMilestone(originEl?: HTMLElement | null) {
  if (typeof window === 'undefined') return;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  let origin = { x: 0.5, y: 0.35 };
  if (originEl) {
    const rect = originEl.getBoundingClientRect();
    origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };
  }

  const shared = {
    particleCount: 60,
    spread: 65,
    startVelocity: 28,
    gravity: 0.9,
    scalar: 0.85,
    ticks: 200,
    colors: WARM_PALETTE,
    origin,
  };

  confetti(shared);
  window.setTimeout(() => confetti({ ...shared, particleCount: 30, spread: 100, scalar: 0.6 }), 160);
}
