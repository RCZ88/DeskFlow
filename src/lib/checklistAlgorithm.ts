export interface ChecklistConfig {
  autoSortByPriority: boolean;
  groupByParent: boolean;
  defaultFilterMode: 'all' | 'active' | 'completed';
  feedbackMode: 'simple' | 'simple+text' | 'rich';
  maxChecksShown: number;
}

export const DEFAULT_CHECKLIST_CONFIG: ChecklistConfig = {
  autoSortByPriority: true,
  groupByParent: true,
  defaultFilterMode: 'active',
  feedbackMode: 'simple+text',
  maxChecksShown: 50,
};

export interface GroupedChecklist {
  groups: ChecklistGroup[];
  totalCount: number;
  completedCount: number;
}

export interface ChecklistGroup {
  parentId: string;
  parentTitle: string;
  parentType: 'problem' | 'request';
  parentStatus: string;
  parentPriority: string;
  parentSessionId: string | null;
  parentTerminalId: string | null;
  checks: SortedCheckItem[];
  progress: { done: number; total: number; percent: number };
}

export interface SortedCheckItem {
  checkId: string;
  description: string;
  instruction: string;
  checkStatus: 'pending' | 'in_progress' | 'completed';
  feedback?: {
    type: 'approved' | 'rejected' | 'text';
    value?: string;
    timestamp: string;
  };
  session_id?: string;
  updated_at: string;
}

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PARENT_STATUS_RANK: Record<string, number> = {
  'In Progress': 0,
  'AI Attempted Fix': 1,
  'User Testing': 2,
  'NEW': 3,
  'Not Started': 4,
  'Fixed': 5,
  'Irrelevant': 6,
  'Completed': 7,
  'Cancelled': 8,
};

const CHECK_STATUS_RANK: Record<string, number> = {
  in_progress: 0,
  pending: 1,
  completed: 2,
};

export function sortAndGroupChecks(
  problems: any[],
  requests: any[],
  config: ChecklistConfig
): GroupedChecklist {
  const groups: ChecklistGroup[] = [];

  for (const problem of problems) {
    const checks: SortedCheckItem[] = (problem.checks || []).map((c: any) => ({
      checkId: c.id,
      description: c.description,
      instruction: c.instruction,
      checkStatus: c.status,
      feedback: c.feedback,
      session_id: c.session_id,
      updated_at: c.updated_at,
    }));

    const filtered = applyFilter(checks, config.defaultFilterMode);
    if (filtered.length === 0) continue;

    const sorted = config.autoSortByPriority
      ? filtered.sort((a, b) => CHECK_STATUS_RANK[a.checkStatus] - CHECK_STATUS_RANK[b.checkStatus])
      : filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const done = checks.filter(c => c.checkStatus === 'completed').length;
    groups.push({
      parentId: problem.id,
      parentTitle: problem.title,
      parentType: 'problem',
      parentStatus: problem.status,
      parentPriority: problem.priority,
      parentSessionId: problem.session_id || null,
      parentTerminalId: problem.terminal_id || null,
      checks: sorted,
      progress: {
        done,
        total: checks.length,
        percent: checks.length > 0 ? Math.round((done / checks.length) * 100) : 0,
      },
    });
  }

  for (const request of requests) {
    const checks: SortedCheckItem[] = (request.checks || []).map((c: any) => ({
      checkId: c.id,
      description: c.description,
      instruction: c.instruction,
      checkStatus: c.status,
      feedback: c.feedback,
      session_id: c.session_id,
      updated_at: c.updated_at,
    }));

    const filtered = applyFilter(checks, config.defaultFilterMode);
    if (filtered.length === 0) continue;

    const sorted = config.autoSortByPriority
      ? filtered.sort((a, b) => CHECK_STATUS_RANK[a.checkStatus] - CHECK_STATUS_RANK[b.checkStatus])
      : filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const done = checks.filter(c => c.checkStatus === 'completed').length;
    groups.push({
      parentId: request.id,
      parentTitle: request.title,
      parentType: 'request',
      parentStatus: request.status,
      parentPriority: request.priority,
      parentSessionId: request.session_id || null,
      parentTerminalId: null,
      checks: sorted,
      progress: {
        done,
        total: checks.length,
        percent: checks.length > 0 ? Math.round((done / checks.length) * 100) : 0,
      },
    });
  }

  if (config.autoSortByPriority) {
    groups.sort((a, b) => {
      const priDiff = (PRIORITY_RANK[a.parentPriority] ?? 99) - (PRIORITY_RANK[b.parentPriority] ?? 99);
      if (priDiff !== 0) return priDiff;

      const statDiff = (PARENT_STATUS_RANK[a.parentStatus] ?? 99) - (PARENT_STATUS_RANK[b.parentStatus] ?? 99);
      if (statDiff !== 0) return statDiff;

      return a.progress.percent - b.progress.percent;
    });
  } else {
    groups.sort((a, b) => {
      const aLatest = Math.max(...a.checks.map(c => new Date(c.updated_at).getTime()));
      const bLatest = Math.max(...b.checks.map(c => new Date(c.updated_at).getTime()));
      return bLatest - aLatest;
    });
  }

  const allChecks = groups.flatMap(g => g.checks);
  const totalCount = allChecks.length;
  const completedCount = allChecks.filter(c => c.checkStatus === 'completed').length;

  return { groups, totalCount, completedCount };
}

function applyFilter(
  checks: SortedCheckItem[],
  mode: 'all' | 'active' | 'completed'
): SortedCheckItem[] {
  switch (mode) {
    case 'active':
      return checks.filter(c => c.checkStatus !== 'completed');
    case 'completed':
      return checks.filter(c => c.checkStatus === 'completed');
    default:
      return checks;
  }
}
