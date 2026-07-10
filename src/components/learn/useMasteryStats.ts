import { useMemo } from 'react';
import type { LessonSummary, NodeProgress, MasteryLevel } from '../../shared/learn/types';

export const LEVEL_ORDER: MasteryLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];

export const LEVEL_COLORS: Record<MasteryLevel, string> = {
  L0: '#5B6472', L1: '#5B8DEF', L2: '#23B5B5',
  L3: '#3CCB7F', L4: '#A78BFA', L5: '#F5C04E',
};

export interface DueItem { nodeId: string; dueAt: string; level: MasteryLevel; }

export interface MasteryStats {
  totalNodes: number;
  trackedNodes: number;
  mastered: number;
  proficientPlus: number;
  dueCount: number;
  dueItems: DueItem[];
  distribution: Record<MasteryLevel, number>;
  masteryPct: number;
}

export function useMasteryStats(
  progress: Record<string, NodeProgress>,
  lessons: LessonSummary[],
): MasteryStats {
  return useMemo(() => {
    const now = Date.now();
    const vals = Object.values(progress);
    const distribution = Object.fromEntries(LEVEL_ORDER.map((l) => [l, 0])) as Record<MasteryLevel, number>;
    for (const p of vals) if (p.level in distribution) distribution[p.level]++;
    const dueItems = vals
      .filter((p) => p.due_at && new Date(p.due_at).getTime() <= now)
      .map((p) => ({ nodeId: p.node_id, dueAt: p.due_at!, level: p.level }))
      .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
    const totalNodes = lessons.reduce((s, l) => s + (l.nodeCount ?? 0), 0);
    const mastered = distribution.L5;
    const proficientPlus = distribution.L4 + distribution.L5;
    return {
      totalNodes,
      trackedNodes: vals.length,
      mastered,
      proficientPlus,
      dueCount: dueItems.length,
      dueItems,
      distribution,
      masteryPct: totalNodes > 0 ? (proficientPlus / totalNodes) * 100 : 0,
    };
  }, [progress, lessons]);
}
