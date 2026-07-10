export function maxOf(arr: number[], fallback = 0): number {
  let m = -Infinity;
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
  return m === -Infinity ? fallback : m;
}
export function minOf(arr: number[], fallback = 0): number {
  let m = Infinity;
  for (let i = 0; i < arr.length; i++) if (arr[i] < m) m = arr[i];
  return m === Infinity ? fallback : m;
}
export function maxBy<T>(arr: T[], fn: (x: T) => number, fallback = 0): number {
  let m = -Infinity;
  for (let i = 0; i < arr.length; i++) { const v = fn(arr[i]); if (v > m) m = v; }
  return m === -Infinity ? fallback : m;
}
