// Manual time assignment helpers — pure functions, no deps.

export interface TimeInterval {
  start: Date;
  end: Date;
  app?: string | null;
}

export interface ScatterOptions {
  spanStart: Date;
  spanEnd: Date;
  totalMinutes: number;
  chunkCount: number;
  occupied?: TimeInterval[];
  minChunkMinutes?: number;
}

const MS_MIN = 60 * 1000;

export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

// Returns the free sub-spans of [spanStart, spanEnd] after removing the
// occupied intervals (clipped to the span). Free spans shorter than
// minChunkMinutes are dropped.
export function freeSpans(
  spanStart: Date,
  spanEnd: Date,
  occupied: TimeInterval[],
  minChunkMinutes = 15
): TimeInterval[] {
  const spanStartMs = spanStart.getTime();
  const spanEndMs = spanEnd.getTime();
  const minMs = minChunkMinutes * MS_MIN;

  const cuts: number[] = [spanStartMs, spanEndMs];
  for (const occ of occupied || []) {
    const s = Math.max(occ.start.getTime(), spanStartMs);
    const e = Math.min(occ.end.getTime(), spanEndMs);
    if (e > s) {
      cuts.push(s);
      cuts.push(e);
    }
  }
  cuts.sort((a, b) => a - b);

  const result: TimeInterval[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const s = cuts[i];
    const e = cuts[i + 1];
    if (e - s < minMs) continue;

    let inside = true;
    for (const occ of occupied || []) {
      const os = Math.max(occ.start.getTime(), spanStartMs);
      const oe = Math.min(occ.end.getTime(), spanEndMs);
      if (oe > s && os < e) {
        inside = false;
        break;
      }
    }
    if (inside) result.push({ start: new Date(s), end: new Date(e) });
  }
  return result;
}

// Splits totalMinutes into chunkCount jittered parts (each between ~60% and
// ~140% of the mean, floored at minChunkMinutes), summing exactly to
// totalMinutes. Returns durations in minutes.
export function splitDurations(
  totalMinutes: number,
  chunkCount: number,
  minChunkMinutes = 15
): number[] {
  if (chunkCount <= 0) return [];
  const mean = totalMinutes / chunkCount;
  // Cap the floor at the mean so parts can never overshoot the total
  // (e.g. splitDurations(60, 7, 15) must still sum to exactly 60).
  const floor = Math.min(Math.max(minChunkMinutes, 5), mean);

  let remaining = totalMinutes;
  const parts: number[] = [];

  for (let i = 0; i < chunkCount; i++) {
    const last = i === chunkCount - 1;
    if (last) {
      parts.push(Math.max(0, Math.round(remaining)));
      break;
    }
    const jitter = mean * (0.6 + Math.random() * 0.8);
    const clamped = Math.max(floor, Math.min(jitter, remaining - floor * (chunkCount - i - 1)));
    parts.push(Math.round(clamped));
    remaining -= parts[parts.length - 1];
  }

  // Guard: if rounding left a small remainder, fold it into the last chunk.
  const sum = parts.reduce((a, b) => a + b, 0);
  if (sum !== totalMinutes && parts.length > 0) {
    parts[parts.length - 1] += totalMinutes - sum;
  }
  return parts.filter((p) => p > 0);
}

// Scatters `chunkCount` chunks totaling `totalMinutes` inside the span,
// avoiding occupied intervals. Returns the chunk intervals sorted by start.
export function scatterChunks(options: ScatterOptions): TimeInterval[] {
  const { spanStart, spanEnd, totalMinutes, chunkCount, occupied = [], minChunkMinutes = 15 } = options;

  if (totalMinutes <= 0 || chunkCount <= 0) return [];

  const free = freeSpans(spanStart, spanEnd, occupied, minChunkMinutes);
  if (free.length === 0) return [];

  const freeMs = free.reduce((sum, f) => sum + (f.end.getTime() - f.start.getTime()), 0);
  const maxFillMinutes = Math.floor(freeMs / MS_MIN);
  const usableTotal = Math.min(totalMinutes, maxFillMinutes);

  const chunks: TimeInterval[] = [];

  // Placement pass: split the total, then place each part into a randomly
  // chosen free sub-span at a whole-minute position that fits. When a chunk
  // is placed, the slot is split into BOTH leftover pieces (leading + tail)
  // so no capacity is silently discarded. If no slot fits the whole chunk,
  // the chunk is clamped into the largest slot and the unplaced delta
  // carries into the next round, keeping the assigned total exact.
  const pool = free.map((f) => ({ start: f.start.getTime(), end: f.end.getTime() }));
  let count = chunkCount;
  let remainingTotal = usableTotal;

  while (remainingTotal >= 1 && pool.length > 0) {
    const durations = splitDurations(remainingTotal, Math.max(1, count), minChunkMinutes);
    let durMs = durations[0] * MS_MIN;
    if (durMs < minChunkMinutes * MS_MIN) {
      // Final chunk smaller than the minimum — place the exact remainder so
      // the assigned total always matches the requested total.
      durMs = Math.max(1, Math.round(remainingTotal)) * MS_MIN;
    }

    // Candidate slots that fit the chunk; pick one weighted by size.
    const fitting = pool
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f.end - f.start >= durMs);
    let slot: { start: number; end: number };
    let slotIdx: number;
    if (fitting.length > 0) {
      const totalPoolMs = fitting.reduce((s, { f }) => s + (f.end - f.start), 0);
      let pick = Math.random() * totalPoolMs;
      slotIdx = fitting[0].i;
      for (const { f, i } of fitting) {
        const len = f.end - f.start;
        if (pick < len) {
          slotIdx = i;
          break;
        }
        pick -= len;
      }
      slot = pool[slotIdx];
    } else {
      // No slot fits — clamp into the largest slot and carry the delta.
      let best = 0;
      let bestMs = -1;
      for (let i = 0; i < pool.length; i++) {
        const len = pool[i].end - pool[i].start;
        if (len > bestMs) {
          bestMs = len;
          best = i;
        }
      }
      if (bestMs < MS_MIN) break;
      slotIdx = best;
      slot = pool[slotIdx];
      durMs = Math.min(durMs, bestMs);
    }

    const slotMs = slot.end - slot.start;
    const maxStart = slotMs - durMs;
    // Whole-minute start inside [slot.start, slot.start + maxStart]. MUST use
    // floor, never round: slots from real logs are second-aligned (e.g.
    // 10:23:17), so maxStart/MS_MIN is fractional and round() can overshoot
    // the slot by up to ~1 min, overlapping tracked time (backend rejects).
    const maxStartMin = Math.floor(maxStart / MS_MIN);
    const startMs = slot.start + Math.floor(Math.random() * (maxStartMin + 1)) * MS_MIN;
    const endMs = startMs + durMs;

    chunks.push({ start: new Date(startMs), end: new Date(endMs) });

    // Split the slot into the leftover pieces on BOTH sides of the chunk.
    const leftovers: { start: number; end: number }[] = [];
    if (startMs - slot.start >= MS_MIN) leftovers.push({ start: slot.start, end: startMs });
    if (slot.end - endMs >= MS_MIN) leftovers.push({ start: endMs, end: slot.end });
    pool.splice(slotIdx, 1, ...leftovers);

    remainingTotal -= durMs / MS_MIN;
    if (count > 0) count--;
  }

  return chunks.sort((a, b) => a.start.getTime() - b.start.getTime());
}