import type { Commitment, DayCompletion, StreakStats } from './types';
import { daysBetween, todayStr } from './storage';

// Pure, testable streak math. The "grace-reset" philosophy lives here:
// a missed day resets the *current* streak (that's just what a streak is),
// but totalCompletions and longest are never erased, and the caller can
// always render them side-by-side with current -- so one hard day never
// wipes out visible progress. This module never produces a "failure" label;
// it only produces numbers. Copy/framing is a UI concern (see
// GraceResetMoment.tsx and covenantCopy.ts).

function isDueOnDate(commitment: Commitment, dateStr: string): boolean {
  if (commitment.cadence === 'daily') return true;
  const weekday = new Date(dateStr + 'T00:00:00').getDay();
  return commitment.weeklyTargetDays.includes(weekday);
}

/**
 * Walks backwards day-by-day from today, only counting days the commitment
 * was actually "due" (relevant for weekly-cadence commitments), so a
 * Mon/Wed/Fri commitment doesn't look "broken" on a Tuesday.
 */
export function computeStreakStats(commitment: Commitment, completions: DayCompletion[]): StreakStats {
  const done = new Set(
    completions.filter(c => c.commitmentId === commitment.id).map(c => c.date),
  );
  const totalCompletions = done.size;
  const sortedDates = [...done].sort();
  const lastCompletedDate = sortedDates.length ? sortedDates[sortedDates.length - 1] : null;

  // Longest streak: scan all due-dates chronologically.
  let longest = 0;
  let running = 0;
  const earliest = sortedDates[0] ?? todayStr();
  const totalDaySpan = Math.max(0, daysBetween(earliest, todayStr())) + 1;
  for (let i = 0; i < totalDaySpan; i++) {
    const d = new Date(earliest + 'T00:00:00');
    d.setDate(d.getDate() + i);
    const ds = todayStr(0);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    void ds;
    if (!isDueOnDate(commitment, dateStr)) continue;
    if (done.has(dateStr)) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  // Current streak: walk backward from today, skipping non-due days, until
  // we hit a due day that was missed.
  let current = 0;
  let justReset = false;
  let cursor = todayStr();
  // If today is due and not yet completed, don't count today as a break --
  // there's still time. Start the backward walk from yesterday in that case.
  const todayDue = isDueOnDate(commitment, cursor);
  const todayDone = done.has(cursor);
  if (todayDue && !todayDone) {
    cursor = todayStr(-1);
  }
  for (let guard = 0; guard < 3650; guard++) {
    if (!isDueOnDate(commitment, cursor)) {
      cursor = shiftDate(cursor, -1);
      continue;
    }
    if (done.has(cursor)) {
      current += 1;
      cursor = shiftDate(cursor, -1);
    } else {
      break;
    }
  }

  // A streak "just reset" when there is completion history (the person has
  // practiced before), the most recent due day before today was missed, and
  // current is back to 0 while totalCompletions is > 0. The caller
  // (useCovenant) is responsible for only surfacing this once per break via
  // a seen-set, so it doesn't replay on every render.
  if (totalCompletions > 0 && current === 0) {
    const prevDue = previousDueDateBeforeToday(commitment);
    if (prevDue && !done.has(prevDue)) {
      justReset = true;
    }
  }

  return { current, longest, totalCompletions, lastCompletedDate, justReset };
}

function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + deltaDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function previousDueDateBeforeToday(commitment: Commitment): string | null {
  let cursor = shiftDate(todayStr(), -1);
  for (let guard = 0; guard < 14; guard++) {
    if (isDueOnDate(commitment, cursor)) return cursor;
    cursor = shiftDate(cursor, -1);
  }
  return null;
}

export const MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365];

export function nextMilestone(totalCompletions: number): number | null {
  return MILESTONES.find(m => m > totalCompletions) ?? null;
}

export function justHitMilestone(totalCompletions: number): number | null {
  return MILESTONES.includes(totalCompletions) ? totalCompletions : null;
}
