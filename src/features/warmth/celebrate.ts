import confetti from 'canvas-confetti';

export function celebrateMilestone(element?: HTMLElement | null) {
  const origin = element
    ? { x: (element.offsetLeft + element.offsetWidth / 2) / window.innerWidth, y: (element.offsetTop + element.offsetHeight / 2) / window.innerHeight }
    : { x: 0.5, y: 0.5 };

  const colors = ['#e8866b', '#6fb38f', '#fbbf24', '#5ab0c9'];

  confetti({ ...origin, particleCount: 80, spread: 100, colors, startVelocity: 22, gravity: 0.6 });
  setTimeout(() => confetti({ ...origin, particleCount: 40, spread: 60, colors, startVelocity: 12, gravity: 0.5 }), 140);
}
