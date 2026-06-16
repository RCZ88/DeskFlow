export interface AnalyticsRawData {
  aiUsage?: {
    totalTokens?: number;
    totalCost?: number;
    byTool?: Record<string, { tokens?: number; cost?: number; sessions?: number }>;
  } | null;
  sessions?: Array<{ agent?: string; status?: string }>;
}

export interface DerivedStats {
  totalTokens: string;
  totalCost: string;
  activeSessions: string;
  toolsModels: string;
  tokensByTool: { labels: string[]; values: number[] };
  sessionsByAgent: { labels: string[]; values: number[] };
  hasData: boolean;
}

const fmtNum = (n: number) => {
  if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(1) + 'T';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
};

const fmtCost = (n: number) => {
  if (n >= 1) return '$' + n.toFixed(2);
  if (n >= 0.01) return '$' + n.toFixed(3);
  if (n > 0) return '$' + n.toFixed(4);
  return '$0.00';
};

export function deriveStats(raw: AnalyticsRawData): DerivedStats {
  const aiUsage = raw.aiUsage;
  const sessions = raw.sessions || [];

  const totalTokens = aiUsage?.totalTokens || 0;
  const totalCost = aiUsage?.totalCost || 0;
  const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'running').length;
  const toolsModels = aiUsage?.byTool ? Object.keys(aiUsage.byTool).length : 0;

  const byTool = aiUsage?.byTool || {};
  const tokenEntries = Object.entries(byTool)
    .map(([tool, data]) => ({ tool, tokens: data?.tokens || 0 }))
    .sort((a, b) => b.tokens - a.tokens);

  const sessionCounts: Record<string, number> = {};
  for (const s of sessions) {
    const agent = s.agent || 'Unknown';
    sessionCounts[agent] = (sessionCounts[agent] || 0) + 1;
  }
  const sessionEntries = Object.entries(sessionCounts).sort((a, b) => b[1] - a[1]);

  return {
    totalTokens: fmtNum(totalTokens),
    totalCost: fmtCost(totalCost),
    activeSessions: String(activeSessions),
    toolsModels: String(toolsModels),
    tokensByTool: { labels: tokenEntries.map(e => e.tool), values: tokenEntries.map(e => e.tokens) },
    sessionsByAgent: { labels: sessionEntries.map(e => e[0]), values: sessionEntries.map(e => e[1]) },
    hasData: totalTokens > 0 || sessions.length > 0,
  };
}
