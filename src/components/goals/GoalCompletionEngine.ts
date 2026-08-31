import type { Goal, CompletionLogic } from '../../types/goals';

export interface CompletionEvaluation {
  isCompleted: boolean;
  isLate: boolean;
  isMissed: boolean;
  percentComplete: number;
  streakImpact: 'none' | 'reset' | 'continue' | 'pause';
}

export function evaluateGoal(goal: Goal, now: Date = new Date()): CompletionEvaluation {
  const logic: CompletionLogic = goal.completionLogic || { lateAllowed: false, gracePeriodMinutes: 0, partialCredit: false, streakOnMiss: 'reset' };

  if (goal.status === 'done') {
    return { isCompleted: true, isLate: false, isMissed: false, percentComplete: 100, streakImpact: 'none' };
  }

  const goalDate = new Date(goal.date + 'T23:59:59');
  const deadline = new Date(goalDate.getTime() + logic.gracePeriodMinutes * 60 * 1000);
  const isPastDeadline = now > deadline;

  let percentComplete = 0;
  if (goal.target?.type === 'time' && goal.target?.targetSeconds) {
    percentComplete = Math.min(100, Math.round(((goal.progressSeconds || 0) / goal.target.targetSeconds) * 100));
  } else if (goal.target?.type === 'external' && goal.target?.maxExternalSeconds) {
    percentComplete = Math.min(100, Math.max(0, 100 - (((goal.progressSeconds || 0) / goal.target.maxExternalSeconds) * 100)));
  } else if (goal.target?.done) {
    percentComplete = 100;
  }

  const isCompleted = percentComplete >= 100 || goal.status === 'done';
  // Partial credit: if enabled and the goal hit its threshold % of target, treat as complete.
  const partialDone = logic.partialCredit && (logic.partialCreditThreshold ?? 80) <= percentComplete && percentComplete > 0;
  const isCompletedOrPartial = isCompleted || partialDone;
  const isLate = isCompletedOrPartial && isPastDeadline;
  const isMissed = !isCompletedOrPartial && isPastDeadline;

  let streakImpact: CompletionEvaluation['streakImpact'] = 'none';
  if (isMissed) {
    streakImpact = logic.streakOnMiss;
  }

  return { isCompleted: isCompletedOrPartial, isLate, isMissed, percentComplete, streakImpact };
}

export function getMissedGoals(goals: Goal[], today: string): Goal[] {
  return goals.filter(g => {
    if (g.status === 'done' || g.status === 'archived') return false;
    return g.date < today;
  });
}

export function formatGracePeriod(minutes: number): string {
  if (minutes === 0) return 'No grace period';
  if (minutes < 60) return `${minutes}m grace`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m grace` : `${h}h grace`;
}

export function formatStreakRule(rule: string): string {
  const map: Record<string, string> = {
    reset: '🔥 Streak resets on miss',
    continue: '✅ Streak continues on miss',
    pause: '⏸️ Streak pauses on miss',
  };
  return map[rule] || rule;
}
