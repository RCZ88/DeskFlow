export const GRACE_RESET_LINES = [
  'A day passed quietly. Your practice did not.',
  'The streak reset. Everything you have already done is still true.',
  'One missed day is just a day. Your total practice stays whole.',
  'This is a fresh start, not a lost one.',
  'Streaks reset. Growth does not.',
];

export function pickGraceLine(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GRACE_RESET_LINES[h % GRACE_RESET_LINES.length];
}

export const MILESTONE_LINES: Record<number, string> = {
  3: 'Three days in. A pattern is forming.',
  7: 'A full week of showing up.',
  14: 'Two weeks. This is becoming part of you.',
  30: 'Thirty days of practice.',
  60: 'Sixty days. Quiet, steady work.',
  100: 'One hundred days. That is a life, not a phase.',
  180: 'Half a year of showing up.',
  365: 'A full year. Whatever this practice is, it is yours now.',
};

export function milestoneLine(n: number): string {
  return MILESTONE_LINES[n] || `${n} days of practice.`;
}
