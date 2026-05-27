import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Download, Search, Table2, RefreshCw, X,
  BarChart3, DollarSign, Zap, AlertTriangle,
  Clock, Activity, Cpu, MessageSquare, TrendingUp,
  PieChart as PieChartIcon, FileText, Users, CheckCircle2,
  CircleDot, Loader2, Timer, Wrench
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Filler
);

const CHART_COLORS = [
  'rgba(168, 85, 247, 0.8)',   // purple
  'rgba(34, 211, 238, 0.8)',   // cyan
  'rgba(52, 211, 153, 0.8)',   // emerald
  'rgba(251, 113, 133, 0.8)',  // rose
  'rgba(245, 158, 11, 0.8)',   // amber
  'rgba(96, 165, 250, 0.8)',   // blue
  'rgba(129, 140, 248, 0.8)',  // indigo
  'rgba(251, 146, 60, 0.8)',   // orange
  'rgba(167, 139, 250, 0.8)',  // violet
  'rgba(74, 222, 128, 0.8)',   // green
  'rgba(244, 114, 182, 0.8)',  // pink
  'rgba(163, 230, 53, 0.8)',   // lime
];

const CHART_BORDERS = CHART_COLORS.map(c => c.replace('0.8)', '1)'));

const STATUS_COLORS: Record<string, string> = {
  'Fixed': 'rgba(52, 211, 153, 0.8)',
  'Irrelevant': 'rgba(113, 113, 122, 0.8)',
  'In Progress': 'rgba(96, 165, 250, 0.8)',
  'NEW': 'rgba(251, 113, 133, 0.8)',
  'Not Started': 'rgba(245, 158, 11, 0.8)',
  'AI Attempted Fix': 'rgba(168, 85, 247, 0.8)',
  'User Testing': 'rgba(34, 211, 238, 0.8)',
  'Completed': 'rgba(52, 211, 153, 0.8)',
  'Cancelled': 'rgba(113, 113, 122, 0.8)',
  'Pending': 'rgba(245, 158, 11, 0.8)',
  'active': 'rgba(52, 211, 153, 0.8)',
  'running': 'rgba(34, 211, 238, 0.8)',
  'completed': 'rgba(129, 140, 248, 0.8)',
  'stopped': 'rgba(113, 113, 122, 0.8)',
  'error': 'rgba(251, 113, 133, 0.8)',
};

const getStatusColor = (status: string, fallbackIdx: number): string => {
  return STATUS_COLORS[status] || CHART_COLORS[fallbackIdx % CHART_COLORS.length];
};

const getStatusBorder = (status: string, fallbackIdx: number): string => {
  const c = getStatusColor(status, fallbackIdx);
  return c.replace('0.8)', '1)');
};

const fmtNum = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
};

const fmtCost = (n: number): string => {
  if (n >= 1) return '$' + n.toFixed(2);
  if (n >= 0.01) return '$' + n.toFixed(3);
  if (n > 0) return '$' + n.toFixed(4);
  return '$0.00';
};

const fmtSec = (s: number): string => {
  if (s >= 3600) return (s / 3600).toFixed(1) + 'h';
  if (s >= 60) return (s / 60).toFixed(1) + 'm';
  return s.toFixed(1) + 's';
};

const fmtMs = (ms: number): string => fmtSec(ms / 1000);

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        color: '#a1a1aa',
        font: { size: 11 },
        padding: 12,
        usePointStyle: true,
        pointStyleWidth: 8,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(24, 24, 27, 0.95)',
      titleColor: '#e4e4e7',
      bodyColor: '#a1a1aa',
      borderColor: 'rgba(63, 63, 70, 0.5)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
    },
  },
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(24, 24, 27, 0.95)',
      titleColor: '#e4e4e7',
      bodyColor: '#a1a1aa',
      borderColor: 'rgba(63, 63, 70, 0.5)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
    },
  },
  scales: {
    x: {
      ticks: { color: '#71717a', font: { size: 10 } },
      grid: { color: 'rgba(113,113,122,0.08)' },
      border: { color: 'rgba(113,113,122,0.15)' },
    },
    y: {
      ticks: { color: '#71717a', font: { size: 10 } },
      grid: { color: 'rgba(113,113,122,0.08)' },
      border: { color: 'rgba(113,113,122,0.15)' },
    },
  },
};

function StatCard({ icon: Icon, iconColor, iconBg, value, label, sub, delay = 0 }: {
  icon: any; iconColor: string; iconBg: string;
  value: string; label: string; sub?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="glass rounded-2xl p-4 flex items-center gap-3 min-w-0"
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-semibold text-white truncate">{value}</div>
        <div className="text-xs text-zinc-500 truncate">{label}</div>
        {sub && <div className="text-[10px] text-zinc-600 truncate">{sub}</div>}
      </div>
    </motion.div>
  );
}

function ChartCard({ title, icon: Icon, subtitle, children, isEmpty, emptyText, full = false }: {
  title: string; icon: any; subtitle?: string;
  children: React.ReactNode; isEmpty: boolean; emptyText: string; full?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`glass rounded-2xl p-5 ${full ? 'col-span-2' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-zinc-400" />
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
      </div>
      {subtitle && <p className="text-[11px] text-zinc-600 mb-3">{subtitle}</p>}
      <div className="relative" style={{ height: isEmpty ? 200 : 240 }}>
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
            <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
            <span className="text-xs">{emptyText}</span>
          </div>
        ) : (
          children
        )}
      </div>
    </motion.div>
  );
}

function EmptyAnalytics() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
      <Database className="w-12 h-12 mb-3 opacity-20" />
      <p className="text-sm">No analytics data available</p>
      <p className="text-xs text-zinc-600 mt-1">Start using the app to see insights</p>
    </div>
  );
}

export default function DatabasePage() {
  const [activeView, setActiveView] = useState<'analytics' | 'tables'>('analytics');
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [aiUsage, setAiUsage] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [appStats, setAppStats] = useState<any[]>([]);
  const [promptHistory, setPromptHistory] = useState<any[]>([]);

  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableSchema, setTableSchema] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableSearch, setTableSearch] = useState('');
  const [tableLoading, setTableLoading] = useState(false);
  const [tableDataPage, setTableDataPage] = useState(0);
  const TABLE_PAGE_SIZE = 50;

  const api = (window as any).deskflowAPI;

  const fetchAnalyticsData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const periodMap: Record<string, string> = { '7d': 'week', '30d': 'month', 'all': 'all' };
      const p = periodMap[period] || 'month';

      const results = await Promise.allSettled([
        api?.getAIUsageSummary?.(p === 'all' ? 'month' : p),
        api?.getTerminalSessions?.(undefined, 500),
        api?.getProblems?.({}),
        api?.getRequests?.({}),
        api?.getDailyStats?.(p),
        api?.getAppStats?.(p),
        api?.getPromptHistory?.({ limit: 2000 }),
      ]);

      if (results[0].status === 'fulfilled' && results[0].value) setAiUsage(results[0].value);
      if (results[1].status === 'fulfilled' && results[1].value?.data) setSessions(results[1].value.data);
      else if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) setSessions(results[1].value);
      if (results[2].status === 'fulfilled' && results[2].value?.data) setProblems(results[2].value.data);
      else if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) setProblems(results[2].value);
      if (results[3].status === 'fulfilled' && results[3].value?.data) setRequests(results[3].value.data);
      else if (results[3].status === 'fulfilled' && Array.isArray(results[3].value)) setRequests(results[3].value);
      if (results[4].status === 'fulfilled' && Array.isArray(results[4].value)) setDailyStats(results[4].value);
      if (results[5].status === 'fulfilled' && Array.isArray(results[5].value)) setAppStats(results[5].value);
      if (results[6].status === 'fulfilled' && Array.isArray(results[6].value)) setPromptHistory(results[6].value);
    } catch (err) {
      console.error('[DatabasePage] Analytics fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, api]);

  const fetchTables = useCallback(async () => {
    if (!api?.getDatabaseTables) return;
    try {
      const res = await api.getDatabaseTables();
      if (res?.tables) setTables(res.tables);
    } catch {}
  }, [api]);

  const fetchTableSchema = useCallback(async (tableName: string) => {
    if (!api?.getTableSchema) return;
    try {
      const schema = await api.getTableSchema(tableName);
      setTableSchema(schema || []);
    } catch { setTableSchema([]); }
  }, [api]);

  const fetchTableData = useCallback(async (tableName: string, page = 0) => {
    if (!api?.getTableData) return;
    setTableLoading(true);
    try {
      const offset = page * TABLE_PAGE_SIZE;
      const data = await api.getTableData(tableName, TABLE_PAGE_SIZE + 1, offset);
      setTableData(data || []);
      setTableDataPage(page);
    } catch { setTableData([]); }
    finally { setTableLoading(false); }
  }, [api]);

  useEffect(() => { fetchAnalyticsData(); }, [fetchAnalyticsData]);
  useEffect(() => { fetchTables(); }, [fetchTables]);
  useEffect(() => {
    if (selectedTable) {
      fetchTableSchema(selectedTable);
      fetchTableData(selectedTable);
    }
  }, [selectedTable, fetchTableSchema, fetchTableData]);

  const tokenByTool = useMemo(() => {
    if (!aiUsage?.byTool) return { labels: [], values: [] };
    const entries = Object.entries(aiUsage.byTool)
      .map(([tool, data]: [string, any]) => ({ tool, tokens: data?.tokens || 0 }))
      .sort((a, b) => b.tokens - a.tokens);
    return { labels: entries.map(e => e.tool), values: entries.map(e => e.tokens) };
  }, [aiUsage]);

  const costByTool = useMemo(() => {
    if (!aiUsage?.byTool) return { labels: [], values: [] };
    const entries = Object.entries(aiUsage.byTool)
      .map(([tool, data]: [string, any]) => ({ tool, cost: data?.cost || 0 }))
      .sort((a, b) => b.cost - a.cost);
    return { labels: entries.map(e => e.tool), values: entries.map(e => e.cost) };
  }, [aiUsage]);

  const sessionsByAgent = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) { counts[s.agent || 'Unknown'] = (counts[s.agent || 'Unknown'] || 0) + 1; }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [sessions]);

  const sessionsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) { counts[s.status || 'Unknown'] = (counts[s.status || 'Unknown'] || 0) + 1; }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [sessions]);

  const categoryDist = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const stat of appStats) {
      const cat = stat.category || 'Other';
      totals[cat] = (totals[cat] || 0) + (stat.total_ms || 0);
    }
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [appStats]);

  const problemsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of problems) { counts[p.status || 'Unknown'] = (counts[p.status || 'Unknown'] || 0) + 1; }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [problems]);

  const requestsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of requests) { counts[r.status || 'Unknown'] = (counts[r.status || 'Unknown'] || 0) + 1; }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [requests]);

  const dailyTrend = useMemo(() => {
    const dayTotals: Record<string, number> = {};
    for (const stat of dailyStats) {
      const day = stat.day || stat.date;
      if (!day) continue;
      dayTotals[day] = (dayTotals[day] || 0) + (stat.total_sec || 0);
    }
    const sorted = Object.keys(dayTotals).sort();
    return {
      labels: sorted.map(d => {
        try { return format(new Date(d + 'T00:00:00'), 'MMM d'); } catch { return d; }
      }),
      values: sorted.map(d => +(dayTotals[d] / 3600).toFixed(2)),
    };
  }, [dailyStats]);

  const responseTiming = useMemo(() => {
    if (!promptHistory.length) return { avgResponse: null, avgThink: null, count: 0 };
    const bySession: Record<string, any[]> = {};
    for (const msg of promptHistory) {
      const sid = msg.session_id;
      if (!sid) continue;
      if (!bySession[sid]) bySession[sid] = [];
      bySession[sid].push(msg);
    }
    let totalResponseGap = 0, responseGapCount = 0;
    let totalThinkGap = 0, thinkGapCount = 0;
    for (const msgs of Object.values(bySession)) {
      const sorted = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      for (let i = 0; i < sorted.length - 1; i++) {
        const t0 = new Date(sorted[i].created_at).getTime();
        const t1 = new Date(sorted[i + 1].created_at).getTime();
        const gap = (t1 - t0) / 1000;
        if (sorted[i].role === 'user' && sorted[i + 1].role === 'assistant') {
          if (gap >= 0 && gap < 600) { totalResponseGap += gap; responseGapCount++; }
        } else if (sorted[i].role === 'assistant' && sorted[i + 1].role === 'user') {
          if (gap >= 0 && gap < 7200) { totalThinkGap += gap; thinkGapCount++; }
        }
      }
    }
    return {
      avgResponse: responseGapCount > 0 ? totalResponseGap / responseGapCount : null,
      avgThink: thinkGapCount > 0 ? totalThinkGap / thinkGapCount : null,
      count: responseGapCount,
    };
  }, [promptHistory]);

  const summaryStats = useMemo(() => {
    const totalTokens = aiUsage?.totalTokens || 0;
    const totalCost = aiUsage?.totalCost || 0;
    const sessionCount = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'running').length;
    const problemCount = problems.length;
    const openProblems = problems.filter(p => !['Fixed', 'Irrelevant'].includes(p.status)).length;
    const requestCount = requests.length;
    const openRequests = requests.filter(r => !['Completed', 'Cancelled'].includes(r.status)).length;
    const toolsUsed = aiUsage?.byTool ? Object.keys(aiUsage.byTool).length : 0;
    return { totalTokens, totalCost, sessionCount, activeSessions, problemCount, openProblems, requestCount, openRequests, toolsUsed };
  }, [aiUsage, sessions, problems, requests]);

  const filteredTables = useMemo(() => {
    if (!tableSearch) return tables;
    const q = tableSearch.toLowerCase();
    return tables.filter(t => t.toLowerCase().includes(q));
  }, [tables, tableSearch]);

  const hasNextPage = tableData.length > TABLE_PAGE_SIZE;
  const displayRows = hasNextPage ? tableData.slice(0, TABLE_PAGE_SIZE) : tableData;

  const exportCSV = useCallback(() => {
    if (!selectedTable || !displayRows.length) return;
    const cols = Object.keys(displayRows[0]);
    const csv = [
      cols.join(','),
      ...displayRows.map(row =>
        cols.map(c => {
          const val = String(row[c] ?? '');
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${selectedTable}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [selectedTable, displayRows]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      <div className="flex-shrink-0 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Database</h1>
              <p className="text-xs text-zinc-500">{tables.length} tables</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
              <button
                onClick={() => setActiveView('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeView === 'analytics' ? 'bg-zinc-700/60 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Analytics
                </span>
              </button>
              <button
                onClick={() => setActiveView('tables')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeView === 'tables' ? 'bg-zinc-700/60 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Table2 className="w-3.5 h-3.5" />
                  Tables
                </span>
              </button>
            </div>
            {activeView === 'analytics' && (
              <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
                {(['7d', '30d', 'all'] as const).map(p => (
                  <button
                    key={p} onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      period === p ? 'bg-purple-500/20 text-purple-300' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'All Time'}
                  </button>
                ))}
              </div>
            )}
            {activeView === 'analytics' && (
              <button
                onClick={() => fetchAnalyticsData(true)} disabled={refreshing}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {activeView === 'analytics' ? (
            <motion.div
              key="analytics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="p-6 space-y-6"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-purple-400" />
                  <span className="text-sm">Loading analytics...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <StatCard icon={Zap} iconColor="text-purple-400" iconBg="bg-purple-500/10"
                      value={fmtNum(summaryStats.totalTokens)} label="Total Tokens" sub={`${summaryStats.toolsUsed} tools`} delay={0} />
                    <StatCard icon={DollarSign} iconColor="text-amber-400" iconBg="bg-amber-500/10"
                      value={fmtCost(summaryStats.totalCost)} label="Total Cost" delay={0.05} />
                    <StatCard icon={Activity} iconColor="text-cyan-400" iconBg="bg-cyan-500/10"
                      value={String(summaryStats.sessionCount)} label="Sessions"
                      sub={summaryStats.activeSessions > 0 ? `${summaryStats.activeSessions} active` : undefined} delay={0.1} />
                    <StatCard icon={AlertTriangle} iconColor="text-rose-400" iconBg="bg-rose-500/10"
                      value={String(summaryStats.problemCount)} label="Problems"
                      sub={summaryStats.openProblems > 0 ? `${summaryStats.openProblems} open` : undefined} delay={0.15} />
                    <StatCard icon={FileText} iconColor="text-blue-400" iconBg="bg-blue-500/10"
                      value={String(summaryStats.requestCount)} label="Requests"
                      sub={summaryStats.openRequests > 0 ? `${summaryStats.openRequests} open` : undefined} delay={0.2} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ChartCard title="Token Distribution" icon={Zap} subtitle="Token usage breakdown by tool"
                      isEmpty={tokenByTool.values.length === 0} emptyText="No token data available">
                      <Pie data={{
                        labels: tokenByTool.labels,
                        datasets: [{ data: tokenByTool.values, backgroundColor: tokenByTool.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: tokenByTool.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }]
                      }} options={pieOptions} />
                    </ChartCard>

                    <ChartCard title="Cost Distribution" icon={DollarSign} subtitle="Spending breakdown by tool"
                      isEmpty={costByTool.values.length === 0} emptyText="No cost data available">
                      <Doughnut data={{
                        labels: costByTool.labels,
                        datasets: [{ data: costByTool.values, backgroundColor: costByTool.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: costByTool.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }]
                      }} options={pieOptions} />
                    </ChartCard>

                    <ChartCard title="Sessions by Agent" icon={Cpu} subtitle="AI agent usage distribution"
                      isEmpty={sessionsByAgent.values.length === 0} emptyText="No session data available">
                      <Pie data={{
                        labels: sessionsByAgent.labels,
                        datasets: [{ data: sessionsByAgent.values, backgroundColor: sessionsByAgent.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: sessionsByAgent.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }]
                      }} options={pieOptions} />
                    </ChartCard>

                    <ChartCard title="Session Status" icon={Activity} subtitle="Active vs completed sessions"
                      isEmpty={sessionsByStatus.values.length === 0} emptyText="No status data available">
                      <Doughnut data={{
                        labels: sessionsByStatus.labels,
                        datasets: [{ data: sessionsByStatus.values, backgroundColor: sessionsByStatus.labels.map((l, i) => getStatusColor(l, i)), borderColor: sessionsByStatus.labels.map((l, i) => getStatusBorder(l, i)), borderWidth: 1.5 }]
                      }} options={pieOptions} />
                    </ChartCard>

                    <ChartCard title="Activity by Category" icon={PieChartIcon} subtitle="Tracked time by activity type"
                      isEmpty={categoryDist.values.length === 0} emptyText="No activity data available">
                      <Doughnut data={{
                        labels: categoryDist.labels,
                        datasets: [{ data: categoryDist.values, backgroundColor: categoryDist.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: categoryDist.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }]
                      }} options={pieOptions} />
                    </ChartCard>

                    <ChartCard title="Problems by Status" icon={AlertTriangle} subtitle="Issue pipeline breakdown"
                      isEmpty={problemsByStatus.values.length === 0} emptyText="No problem data available">
                      <Pie data={{
                        labels: problemsByStatus.labels,
                        datasets: [{ data: problemsByStatus.values, backgroundColor: problemsByStatus.labels.map((l, i) => getStatusColor(l, i)), borderColor: problemsByStatus.labels.map((l, i) => getStatusBorder(l, i)), borderWidth: 1.5 }]
                      }} options={pieOptions} />
                    </ChartCard>

                    <ChartCard title="Requests by Status" icon={FileText} subtitle="Feature request pipeline"
                      isEmpty={requestsByStatus.values.length === 0} emptyText="No request data available">
                      <Doughnut data={{
                        labels: requestsByStatus.labels,
                        datasets: [{ data: requestsByStatus.values, backgroundColor: requestsByStatus.labels.map((l, i) => getStatusColor(l, i)), borderColor: requestsByStatus.labels.map((l, i) => getStatusBorder(l, i)), borderWidth: 1.5 }]
                      }} options={pieOptions} />
                    </ChartCard>

                    <ChartCard title="Response Timing" icon={Timer} subtitle="Average AI response & think times"
                      isEmpty={responseTiming.avgResponse === null && responseTiming.avgThink === null} emptyText="No message timing data available">
                      <div className="flex flex-col items-center justify-center h-full gap-6 py-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-400">
                            {responseTiming.avgResponse !== null ? fmtSec(responseTiming.avgResponse) : '—'}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">Avg Response Time</div>
                          <div className="text-[10px] text-zinc-600">user prompt &rarr; assistant reply</div>
                        </div>
                        <div className="w-16 h-px bg-zinc-800" />
                        <div className="text-center">
                          <div className="text-3xl font-bold text-cyan-400">
                            {responseTiming.avgThink !== null ? fmtSec(responseTiming.avgThink) : '—'}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">Avg Think Time</div>
                          <div className="text-[10px] text-zinc-600">assistant reply &rarr; next prompt</div>
                        </div>
                        {responseTiming.count > 0 && (
                          <div className="text-[10px] text-zinc-600">Based on {responseTiming.count} response pairs</div>
                        )}
                      </div>
                    </ChartCard>

                    <ChartCard title="Daily Activity Trend" icon={TrendingUp} subtitle="Hours tracked per day"
                      isEmpty={dailyTrend.values.length === 0} emptyText="No daily activity data available" full>
                      <Bar data={{
                        labels: dailyTrend.labels,
                        datasets: [{ data: dailyTrend.values, backgroundColor: 'rgba(168, 85, 247, 0.6)', borderColor: 'rgba(168, 85, 247, 1)', borderWidth: 1, borderRadius: 6, barPercentage: 0.7 }]
                      }} options={{
                        ...barOptions, scales: {
                          ...barOptions.scales,
                          y: { ...barOptions.scales.y, title: { display: true, text: 'Hours', color: '#71717a', font: { size: 10 } } },
                        },
                      }} />
                    </ChartCard>
                  </div>

                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.35 }} className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Wrench className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-medium text-zinc-200">AI Usage Summary</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-purple-400">{fmtNum(summaryStats.totalTokens)}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Total Tokens</div>
                      </div>
                      <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-amber-400">{fmtCost(summaryStats.totalCost)}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Total Cost</div>
                      </div>
                      <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-emerald-400">{summaryStats.toolsUsed}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Tools Used</div>
                      </div>
                      <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-cyan-400">{summaryStats.sessionCount}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Total Sessions</div>
                      </div>
                      <div className="bg-zinc-800/40 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-rose-400">{responseTiming.avgResponse !== null ? fmtSec(responseTiming.avgResponse) : '—'}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Avg Response</div>
                      </div>
                    </div>
                    {aiUsage?.byTool && Object.keys(aiUsage.byTool).length > 0 && (
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-zinc-800/60">
                              <th className="text-left text-zinc-500 font-medium py-2 pr-4">Tool</th>
                              <th className="text-right text-zinc-500 font-medium py-2 pr-4">Tokens</th>
                              <th className="text-right text-zinc-500 font-medium py-2 pr-4">Cost</th>
                              <th className="text-right text-zinc-500 font-medium py-2">Sessions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(aiUsage.byTool)
                              .sort(([, a]: any[], [, b]: any[]) => (b.tokens || 0) - (a.tokens || 0))
                              .map(([tool, data]: [string, any], i: number) => (
                                <tr key={tool} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                                  <td className="py-2 pr-4 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                    <span className="text-zinc-300">{tool}</span>
                                  </td>
                                  <td className="text-right text-zinc-400 py-2 pr-4">{fmtNum(data.tokens || 0)}</td>
                                  <td className="text-right text-zinc-400 py-2 pr-4">{fmtCost(data.cost || 0)}</td>
                                  <td className="text-right text-zinc-400 py-2">{data.sessions || 0}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.35 }} className="glass rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <h3 className="text-sm font-medium text-zinc-200">Problems Progress</h3>
                      </div>
                      {problems.length === 0 ? (
                        <p className="text-xs text-zinc-600 text-center py-6">No problems tracked</p>
                      ) : (
                        <div className="space-y-2">
                          {(() => {
                            const total = problems.length;
                            const fixed = problems.filter(p => p.status === 'Fixed').length;
                            const inProgress = problems.filter(p => ['In Progress', 'AI Attempted Fix'].includes(p.status)).length;
                            const open = total - fixed - problems.filter(p => p.status === 'Irrelevant').length;
                            const pct = total > 0 ? Math.round((fixed / total) * 100) : 0;
                            return (
                              <>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-zinc-400">{fixed} of {total} fixed</span>
                                  <span className="text-emerald-400 font-medium">{pct}%</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                                  <div className="bg-emerald-500/80 h-full transition-all" style={{ width: `${(fixed/total)*100}%` }} />
                                  <div className="bg-blue-500/60 h-full transition-all" style={{ width: `${(inProgress/total)*100}%` }} />
                                </div>
                                <div className="flex gap-4 text-[10px] text-zinc-600 mt-1">
                                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Fixed ({fixed})</span>
                                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> In Progress ({inProgress})</span>
                                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-zinc-600" /> Open ({open - inProgress})</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.35 }} className="glass rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-medium text-zinc-200">Requests Progress</h3>
                      </div>
                      {requests.length === 0 ? (
                        <p className="text-xs text-zinc-600 text-center py-6">No requests tracked</p>
                      ) : (
                        <div className="space-y-2">
                          {(() => {
                            const total = requests.length;
                            const completed = requests.filter(r => r.status === 'Completed').length;
                            const inProgress = requests.filter(r => r.status === 'In Progress').length;
                            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                            return (
                              <>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-zinc-400">{completed} of {total} completed</span>
                                  <span className="text-emerald-400 font-medium">{pct}%</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                                  <div className="bg-emerald-500/80 h-full transition-all" style={{ width: `${(completed/total)*100}%` }} />
                                  <div className="bg-blue-500/60 h-full transition-all" style={{ width: `${(inProgress/total)*100}%` }} />
                                </div>
                                <div className="flex gap-4 text-[10px] text-zinc-600 mt-1">
                                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Completed ({completed})</span>
                                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> In Progress ({inProgress})</span>
                                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-zinc-600" /> Pending ({total - completed - inProgress})</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </motion.div>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="tables"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <div className="flex gap-4 h-full">
                <div className="w-64 flex-shrink-0 glass rounded-2xl p-3 overflow-auto">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="text" placeholder="Filter tables..." value={tableSearch}
                      onChange={e => setTableSearch(e.target.value)}
                      className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                  <div className="space-y-0.5">
                    {filteredTables.map(table => (
                      <button key={table} onClick={() => setSelectedTable(table)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          selectedTable === table ? 'bg-purple-500/15 text-purple-300' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Table2 className="w-3 h-3 flex-shrink-0 opacity-50" />
                          <span className="truncate">{table}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 glass rounded-2xl p-4 overflow-auto">
                  {selectedTable ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-sm font-semibold text-white">{selectedTable}</h2>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            {tableSchema.length} columns
                            {tableData.length > 0 && ` · ${tableDataPage * TABLE_PAGE_SIZE + 1}–${Math.min((tableDataPage + 1) * TABLE_PAGE_SIZE, tableDataPage * TABLE_PAGE_SIZE + displayRows.length)} rows`}
                          </p>
                        </div>
                        <button onClick={exportCSV} disabled={!displayRows.length}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-all disabled:opacity-30 flex items-center gap-1.5"
                        >
                          <Download className="w-3 h-3" /> Export CSV
                        </button>
                      </div>
                      {tableSchema.length > 0 && (
                        <div className="mb-4 overflow-x-auto">
                          <div className="flex gap-1.5 flex-wrap">
                            {tableSchema.map((col: any, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/50 border border-zinc-700/30 text-[10px]">
                                <span className="text-zinc-300 font-mono">{col.name || col.column_name}</span>
                                <span className="text-zinc-600">{col.type || col.data_type}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {tableLoading ? (
                        <div className="flex items-center justify-center py-12 text-zinc-500">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      ) : displayRows.length > 0 ? (
                        <>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-zinc-800/60">
                                  {Object.keys(displayRows[0]).map(col => (
                                    <th key={col} className="text-left text-zinc-500 font-medium py-2 pr-4 whitespace-nowrap">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {displayRows.map((row, i) => (
                                  <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                                    {Object.entries(row).map(([col, val], j) => (
                                      <td key={j} className="py-1.5 pr-4 text-zinc-400 max-w-[200px] truncate">
                                        {val === null ? <span className="text-zinc-700 italic">null</span> : String(val)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/40">
                            <button onClick={() => fetchTableData(selectedTable, tableDataPage - 1)} disabled={tableDataPage === 0}
                              className="px-3 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
                            >Previous</button>
                            <span className="text-xs text-zinc-600">Page {tableDataPage + 1}</span>
                            <button onClick={() => fetchTableData(selectedTable, tableDataPage + 1)} disabled={!hasNextPage}
                              className="px-3 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
                            >Next</button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12 text-zinc-600 text-xs">No data in this table</div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                      <Database className="w-10 h-10 mb-2 opacity-20" />
                      <p className="text-xs">Select a table to browse</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
