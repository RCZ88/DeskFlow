import type { ExternalActivity, ExternalSession } from "@/types/external";

export type Gap = {
  id: string;
  start: Date;
  end: Date;
  duration_seconds: number;
};

export type GapSegment = {
  id: string;
  activityId: string | null;
  minutes: number;
};

export type TrackedInterval = {
  start: Date;
  end: Date;
};

export function createId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function mergeTrackedIntervals(
  sessions: ExternalSession[],
  rangeStart: Date,
  rangeEnd: Date
): TrackedInterval[] {
  const intervals: TrackedInterval[] = [];

  for (const session of sessions) {
    const start = new Date(session.started_at);
    const end = new Date(session.ended_at);

    const clampedStart = start < rangeStart ? rangeStart : start;
    const clampedEnd = end > rangeEnd ? rangeEnd : end;

    if (clampedEnd <= clampedStart) continue;

    intervals.push({
      start: clampedStart,
      end: clampedEnd,
    });
  }

  intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: TrackedInterval[] = [];

  for (const interval of intervals) {
    const last = merged[merged.length - 1];

    if (!last) {
      merged.push({ ...interval });
      continue;
    }

    if (interval.start <= last.end) {
      last.end = interval.end > last.end ? interval.end : last.end;
    } else {
      merged.push({ ...interval });
    }
  }

  return merged;
}

export function detectGaps(
  sessions: ExternalSession[],
  rangeStart: Date,
  rangeEnd: Date,
  minGapMinutes = 5
): Gap[] {
  if (rangeEnd <= rangeStart) return [];

  const merged = mergeTrackedIntervals(sessions, rangeStart, rangeEnd);
  const gaps: Gap[] = [];

  let cursor = rangeStart;

  for (const interval of merged) {
    if (interval.start > cursor) {
      const durationSeconds = Math.round((interval.start.getTime() - cursor.getTime()) / 1000);

      if (durationSeconds >= minGapMinutes * 60) {
        gaps.push({
          id: createId("gap"),
          start: new Date(cursor),
          end: new Date(interval.start),
          duration_seconds: durationSeconds,
        });
      }
    }

    cursor = interval.end > cursor ? interval.end : cursor;
  }

  if (rangeEnd > cursor) {
    const durationSeconds = Math.round((rangeEnd.getTime() - cursor.getTime()) / 1000);

    if (durationSeconds >= minGapMinutes * 60) {
      gaps.push({
        id: createId("gap"),
        start: new Date(cursor),
        end: new Date(rangeEnd),
        duration_seconds: durationSeconds,
      });
    }
  }

  return gaps;
}

export function mergeAdjacentSegments(segments: GapSegment[]): GapSegment[] {
  const merged: GapSegment[] = [];

  for (const segment of segments) {
    if (!segment.activityId || segment.minutes <= 0) continue;

    const last = merged[merged.length - 1];

    if (last && last.activityId === segment.activityId) {
      last.minutes += segment.minutes;
    } else {
      merged.push({ ...segment });
    }
  }

  return merged;
}

export async function fillGapWithSegments(
  gap: Gap,
  segments: GapSegment[],
  addExternalTime: (
    activityId: string,
    minutes: number,
    startedAt: string,
    endedAt: string
  ) => Promise<void>
): Promise<void> {
  const merged = mergeAdjacentSegments(segments);
  if (!merged.length) return;

  let cursor = new Date(gap.start);
  const gapEnd = new Date(gap.end);

  for (const segment of merged) {
    if (!segment.activityId) continue;

    const minutes = Math.max(1, Math.round(segment.minutes));
    const end = new Date(cursor.getTime() + minutes * 60_000);

    if (end > gapEnd) break;

    await addExternalTime(
      segment.activityId,
      minutes,
      cursor.toISOString(),
      end.toISOString()
    );

    cursor = end;
  }
}

export function suggestGapActivities(
  gap: Gap,
  sessions: ExternalSession[],
  activities: ExternalActivity[],
  limit = 4
): ExternalActivity[] {
  const gapHour = gap.start.getHours();
  const gapWeekday = gap.start.getDay();
  const now = Date.now();

  const scores = new Map<string, number>();

  const activityByName = new Map(activities.map((activity) => [activity.name, activity]));

  for (const session of sessions) {
    const activity = activityByName.get(session.activity_name);
    if (!activity) continue;
    if (activity.type === "sleep") continue;

    const start = new Date(session.started_at);
    const hourDistance = Math.abs(start.getHours() - gapHour);
    const hourScore = hourDistance <= 2 ? 3 : hourDistance <= 4 ? 1 : 0;
    const weekdayScore = start.getDay() === gapWeekday ? 2 : 0;

    const ageDays = Math.max(0, (now - start.getTime()) / 86_400_000);
    const recencyBoost = Math.max(0.25, 1 - ageDays / 45);

    const durationHours = Math.max(0.1, session.duration_seconds / 3600);
    const score = durationHours * (1 + hourScore + weekdayScore) * recencyBoost;

    scores.set(activity.id, (scores.get(activity.id) ?? 0) + score);
  }

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);

  const suggested = sorted
    .map(([activityId]) => activities.find((activity) => activity.id === activityId))
    .filter(Boolean) as ExternalActivity[];

  if (suggested.length >= limit) {
    return suggested.slice(0, limit);
  }

  const fallback = activities
    .filter((activity) => activity.type !== "sleep")
    .filter((activity) => !suggested.some((s) => s.id === activity.id));

  return [...suggested, ...fallback].slice(0, limit);
}
