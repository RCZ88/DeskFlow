export const mean = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

export const std = (arr: number[]) => {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(arr.length, 1));
};

export const zScore = (x: number, hist: number[]) => {
  const m = mean(hist), s = std(hist);
  return s === 0 ? 0 : (x - m) / s;
};

export const percentile = (x: number, hist: number[]) => {
  const sorted = [...hist].sort((a, b) => a - b);
  const rank = sorted.filter(v => v <= x).length;
  return sorted.length === 0 ? 0 : rank / sorted.length;
};

export const delta = (current: number, previous: number) =>
  previous === 0 ? 0 : ((current - previous) / previous) * 100;

export const streak = (hist: { date: string; value: number }[], threshold: number) => {
  let count = 0;
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].value >= threshold) count++;
    else break;
  }
  return count;
};
