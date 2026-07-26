import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Database, BarChart3, DollarSign, Zap, AlertTriangle,
  Clock, Activity, Cpu, TrendingUp, Code2,
  PieChart as PieChartIcon, FileText, Timer, Wrench, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Filler);

const CHART_COLORS = [
  'rgba(168, 85, 247, 0.8)', 'rgba(34, 211, 238, 0.8)', 'rgba(52, 211, 153, 0.8)',
  'rgba(251, 113, 133, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(96, 165, 250, 0.8)',
  'rgba(129, 140, 248, 0.8)', 'rgba(251, 146, 60, 0.8)', 'rgba(167, 139, 250, 0.8)',
  'rgba(74, 222, 128, 0.8)', 'rgba(244, 114, 182, 0.8)', 'rgba(163, 230, 53, 0.8)',
];

const CHART_BORDERS = CHART_COLORS.map(c => c.replace('0.8)', '1)'));

const WORKSPACE_CATEGORIES = ['IDE', 'AI Tools', 'Developer Tools', 'Education', 'Productivity', 'Tools'];

const STATUS_COLORS: Record<string, string> = {
  'Fixed': 'rgba(52, 211, 153, 0.8)', 'Irrelevant': 'rgba(113, 113, 122, 0.8)',
  'In Progress': 'rgba(96, 165, 250, 0.8)', 'NEW': 'rgba(251, 113, 133, 0.8)',
  'Not Started': 'rgba(245, 158, 11, 0.8)', 'AI Attempted Fix': 'rgba(168, 85, 247, 0.8)',
  'User Testing': 'rgba(34, 211, 238, 0.8)', 'Completed': 'rgba(52, 211, 153, 0.8)',
  'Cancelled': 'rgba(113, 113, 122, 0.8)', 'Pending': 'rgba(245, 158, 11, 0.8)',
  'active': 'rgba(52, 211, 153, 0.8)', 'running': 'rgba(34, 211, 238, 0.8)',
  'completed': 'rgba(129, 140, 248, 0.8)', 'stopped': 'rgba(113, 113, 122, 0.8)',
  'error': 'rgba(251, 113, 133, 0.8)',
};

const getStatusColor = (status: string, fallbackIdx: number) => STATUS_COLORS[status] || CHART_COLORS[fallbackIdx % CHART_COLORS.length];
const getStatusBorder = (status: string, fallbackIdx: number) => getStatusColor(status, fallbackIdx).replace('0.8)', '1)');
const fmtNum = (n: number) => { if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'; if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'; if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'; return n.toLocaleString(); };
const fmtCost = (n: number) => { if (n >= 1) return '$' + n.toFixed(2); if (n >= 0.01) return '$' + n.toFixed(3); if (n > 0) return '$' + n.toFixed(4); return '$0.00'; };
const fmtSec = (s: number) => { if (s >= 3600) return (s / 3600).toFixed(1) + 'h'; if (s >= 60) return (s / 60).toFixed(1) + 'm'; return s.toFixed(1) + 's'; };

const pieOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' as const, labels: { color: '#a1a1aa', font: { size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 } },
    tooltip: { backgroundColor: 'rgba(24, 24, 27, 0.95)', titleColor: '#e4e4e7', bodyColor: '#a1a1aa', borderColor: 'rgba(63, 63, 70, 0.5)', borderWidth: 1, cornerRadius: 8, padding: 10 },
  },
};

const barOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(24, 24, 27, 0.95)', titleColor: '#e4e4e7', bodyColor: '#a1a1aa', borderColor: 'rgba(63, 63, 70, 0.5)', borderWidth: 1, cornerRadius: 8, padding: 10 } },
  scales: {
    x: { ticks: { color: '#71717a', font: { size: 10 } }, grid: { color: 'rgba(113,113,122,0.08)' }, border: { color: 'rgba(113,113,122,0.15)' } },
    y: { ticks: { color: '#71717a', font: { size: 10 } }, grid: { color: 'rgba(113,113,122,0.08)' }, border: { color: 'rgba(113,113,122,0.15)' } },
  },
};

function StatCard({ icon: Icon, iconColor, iconBg, value, label, sub, delay = 0 }: {
  icon: any; iconColor: string; iconBg: string; value: string; label: string; sub?: string; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}
      className="glass rounded-xl p-4 flex items-center gap-3 min-w-0">
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
  title: string; icon: any; subtitle?: string; children: React.ReactNode; isEmpty: boolean; emptyText: string; full?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className={`glass rounded-xl p-5 ${full ? 'col-span-2' : ''}`}>
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
        ) : children}
      </div>
    </motion.div>
  );
}

type DashboardVariant = 'project' | 'workspace' | 'full';

export default function AnalyticsDashboard({ aiUsage, sessions, problems, requests, dailyStats, appStats, promptHistory, loading, period, variant = 'full', projectLanguages }: {
  aiUsage?: any; sessions: any[]; problems?: any[]; requests?: any[]; dailyStats?: any[]; appStats?: any[]; promptHistory?: any[]; loading: boolean; period: string; variant?: DashboardVariant; projectLanguages?: { language: string; count: number }[];
}) {
  const tokenByTool = useMemo(() => {
    if (!aiUsage?.byTool) return { labels: [], values: [] };
    const entries = Object.entries(aiUsage.byTool).map(([tool, data]: [string, any]) => ({ tool, tokens: data?.tokens || 0 })).sort((a, b) => b.tokens - a.tokens);
    return { labels: entries.map(e => e.tool), values: entries.map(e => e.tokens) };
  }, [aiUsage]);

  const costByTool = useMemo(() => {
    if (!aiUsage?.byTool) return { labels: [], values: [] };
    const entries = Object.entries(aiUsage.byTool).map(([tool, data]: [string, any]) => ({ tool, cost: data?.cost || 0 })).sort((a, b) => b.cost - a.cost);
    return { labels: entries.map(e => e.tool), values: entries.map(e => e.cost) };
  }, [aiUsage]);

  const sessionsByAgent = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) counts[s.agent || 'Unknown'] = (counts[s.agent || 'Unknown'] || 0) + 1;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [sessions]);

  const sessionsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) counts[s.status || 'Unknown'] = (counts[s.status || 'Unknown'] || 0) + 1;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [sessions]);

  const categoryDist = useMemo(() => {
    if (!appStats?.length) return { labels: [], values: [] };
    const totals: Record<string, number> = {};
    for (const stat of appStats) { const cat = stat.category || 'Other'; totals[cat] = (totals[cat] || 0) + (stat.total_ms || 0); }
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [appStats]);

  const languageDist = useMemo(() => {
    if (!projectLanguages?.length) return { labels: [], values: [] };
    const sorted = [...projectLanguages].sort((a, b) => b.count - a.count);
    return { labels: sorted.map(e => e.language), values: sorted.map(e => e.count) };
  }, [projectLanguages]);

  const problemsByStatus = useMemo(() => {
    if (!problems?.length) return { labels: [], values: [] };
    const counts: Record<string, number> = {};
    for (const p of problems) counts[p.status || 'Unknown'] = (counts[p.status || 'Unknown'] || 0) + 1;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [problems]);

  const requestsByStatus = useMemo(() => {
    if (!requests?.length) return { labels: [], values: [] };
    const counts: Record<string, number> = {};
    for (const r of requests) counts[r.status || 'Unknown'] = (counts[r.status || 'Unknown'] || 0) + 1;
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
  }, [requests]);

  const dailyTrend = useMemo(() => {
    if (!dailyStats?.length) return { labels: [], values: [] };
    const dayTotals: Record<string, number> = {};
    for (const stat of dailyStats) { 
      if (!WORKSPACE_CATEGORIES.includes(stat.category)) continue;
      const day = stat.day || stat.date; if (!day) continue; dayTotals[day] = (dayTotals[day] || 0) + (stat.total_sec || 0); 
    }
    const sorted = Object.keys(dayTotals).sort();
    return { labels: sorted.map(d => { try { return format(new Date(d + 'T00:00:00'), 'MMM d'); } catch { return d; } }), values: sorted.map(d => +(dayTotals[d] / 3600).toFixed(2)) };
  }, [dailyStats]);

  const responseTiming = useMemo(() => {
    if (!promptHistory?.length) return { avgResponse: null, avgThink: null, count: 0 };
    const bySession: Record<string, any[]> = {};
    for (const msg of promptHistory) { const sid = msg.session_id; if (!sid) continue; if (!bySession[sid]) bySession[sid] = []; bySession[sid].push(msg); }
    let totalResponseGap = 0, responseGapCount = 0;
    let totalThinkGap = 0, thinkGapCount = 0;
    for (const msgs of Object.values(bySession)) {
      const sorted = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      for (let i = 0; i < sorted.length - 1; i++) {
        const t0 = new Date(sorted[i].created_at).getTime();
        const t1 = new Date(sorted[i + 1].created_at).getTime();
        const gap = (t1 - t0) / 1000;
        if (sorted[i].role === 'user' && sorted[i + 1].role === 'assistant' && gap >= 0 && gap < 600) { totalResponseGap += gap; responseGapCount++; }
        else if (sorted[i].role === 'assistant' && sorted[i + 1].role === 'user' && gap >= 0 && gap < 7200) { totalThinkGap += gap; thinkGapCount++; }
      }
    }
    return { avgResponse: responseGapCount > 0 ? totalResponseGap / responseGapCount : null, avgThink: thinkGapCount > 0 ? totalThinkGap / thinkGapCount : null, count: responseGapCount };
  }, [promptHistory]);

  const summaryStats = useMemo(() => {
    const totalTokens = aiUsage?.totalTokens || 0;
    const totalCost = aiUsage?.totalCost || 0;
    const sessionCount = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'running').length;
    const problemCount = problems?.length || 0;
    const openProblems = problems ? problems.filter(p => !['Fixed', 'Irrelevant'].includes(p.status)).length : 0;
    const requestCount = requests?.length || 0;
    const openRequests = requests ? requests.filter(r => !['Completed', 'Cancelled'].includes(r.status)).length : 0;
    const toolsUsed = aiUsage?.byTool ? Object.keys(aiUsage.byTool).length : 0;
    return { totalTokens, totalCost, sessionCount, activeSessions, problemCount, openProblems, requestCount, openRequests, toolsUsed };
  }, [aiUsage, sessions, problems, requests]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-purple-400" />
        <span className="text-sm">Loading analytics...</span>
      </div>
    );
  }

  if (variant === 'project') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <StatCard icon={Activity} iconColor="text-cyan-400" iconBg="bg-cyan-500/10"
            value={String(summaryStats.sessionCount)} label="Sessions"
            sub={summaryStats.activeSessions > 0 ? `${summaryStats.activeSessions} active` : undefined} delay={0} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Sessions by Agent" icon={Cpu} subtitle="AI agent usage distribution"
            isEmpty={sessionsByAgent.values.length === 0} emptyText="No session data available">
            <Pie data={{ labels: sessionsByAgent.labels, datasets: [{ data: sessionsByAgent.values, backgroundColor: sessionsByAgent.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: sessionsByAgent.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }] }} options={pieOptions} />
          </ChartCard>
          <ChartCard title="Session Status" icon={Activity} subtitle="Active vs completed sessions"
            isEmpty={sessionsByStatus.values.length === 0} emptyText="No status data available">
            <Doughnut data={{ labels: sessionsByStatus.labels, datasets: [{ data: sessionsByStatus.values, backgroundColor: sessionsByStatus.labels.map((l, i) => getStatusColor(l, i)), borderColor: sessionsByStatus.labels.map((l, i) => getStatusBorder(l, i)), borderWidth: 1.5 }] }} options={pieOptions} />
          </ChartCard>
        </div>
      </div>
    );
  }

  if (variant === 'workspace') {
    return (
      <div className="space-y-6">
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
            <Pie data={{ labels: tokenByTool.labels, datasets: [{ data: tokenByTool.values, backgroundColor: tokenByTool.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: tokenByTool.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }] }} options={pieOptions} />
          </ChartCard>
          <ChartCard title="Cost Distribution" icon={DollarSign} subtitle="Spending breakdown by tool"
            isEmpty={costByTool.values.length === 0} emptyText="No cost data available">
            <Doughnut data={{ labels: costByTool.labels, datasets: [{ data: costByTool.values, backgroundColor: costByTool.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: costByTool.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }] }} options={pieOptions} />
          </ChartCard>
          <ChartCard title="Problems by Status" icon={AlertTriangle} subtitle="Issue pipeline breakdown"
            isEmpty={problemsByStatus.values.length === 0} emptyText="No problem data available">
            <Pie data={{ labels: problemsByStatus.labels, datasets: [{ data: problemsByStatus.values, backgroundColor: problemsByStatus.labels.map((l, i) => getStatusColor(l, i)), borderColor: problemsByStatus.labels.map((l, i) => getStatusBorder(l, i)), borderWidth: 1.5 }] }} options={pieOptions} />
          </ChartCard>
          <ChartCard title="Requests by Status" icon={FileText} subtitle="Feature request pipeline"
            isEmpty={requestsByStatus.values.length === 0} emptyText="No request data available">
            <Doughnut data={{ labels: requestsByStatus.labels, datasets: [{ data: requestsByStatus.values, backgroundColor: requestsByStatus.labels.map((l, i) => getStatusColor(l, i)), borderColor: requestsByStatus.labels.map((l, i) => getStatusBorder(l, i)), borderWidth: 1.5 }] }} options={pieOptions} />
          </ChartCard>
          <ChartCard title="Response Timing" icon={Timer} subtitle="Average AI response & think times"
            isEmpty={responseTiming.avgResponse === null && responseTiming.avgThink === null} emptyText="No message timing data available">
            <div className="flex flex-col items-center justify-center h-full gap-6 py-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">{responseTiming.avgResponse !== null ? fmtSec(responseTiming.avgResponse) : '—'}</div>
                <div className="text-xs text-zinc-500 mt-1">Avg Response Time</div>
                <div className="text-[10px] text-zinc-600">user prompt &rarr; assistant reply</div>
              </div>
              <div className="w-16 h-px bg-zinc-800" />
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400">{responseTiming.avgThink !== null ? fmtSec(responseTiming.avgThink) : '—'}</div>
                <div className="text-xs text-zinc-500 mt-1">Avg Think Time</div>
                <div className="text-[10px] text-zinc-600">assistant reply &rarr; next prompt</div>
              </div>
              {responseTiming.count > 0 && <div className="text-[10px] text-zinc-600">Based on {responseTiming.count} response pairs</div>}
            </div>
          </ChartCard>
        </div>

        {languageDist.labels.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Language Distribution" icon={Code2} subtitle="Coding languages across all projects"
              isEmpty={false} emptyText="">
              <Doughnut data={{
                labels: languageDist.labels,
                datasets: [{ data: languageDist.values, backgroundColor: languageDist.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: languageDist.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }]
              }} options={pieOptions} />
            </ChartCard>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.35 }}
          className="glass rounded-xl p-5">
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
                  {Object.entries(aiUsage.byTool).sort(([, a]: any[], [, b]: any[]) => (b.tokens || 0) - (a.tokens || 0))
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
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.35 }}
            className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-medium text-zinc-200">Problems Progress</h3>
            </div>
            {!problems?.length ? (
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
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.35 }}
            className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium text-zinc-200">Requests Progress</h3>
            </div>
            {!requests?.length ? (
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <Pie data={{ labels: tokenByTool.labels, datasets: [{ data: tokenByTool.values, backgroundColor: tokenByTool.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: tokenByTool.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }] }} options={pieOptions} />
        </ChartCard>
        <ChartCard title="Cost Distribution" icon={DollarSign} subtitle="Spending breakdown by tool"
          isEmpty={costByTool.values.length === 0} emptyText="No cost data available">
          <Doughnut data={{ labels: costByTool.labels, datasets: [{ data: costByTool.values, backgroundColor: costByTool.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: costByTool.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }] }} options={pieOptions} />
        </ChartCard>
        <ChartCard title="Sessions by Agent" icon={Cpu} subtitle="AI agent usage distribution"
          isEmpty={sessionsByAgent.values.length === 0} emptyText="No session data available">
          <Pie data={{ labels: sessionsByAgent.labels, datasets: [{ data: sessionsByAgent.values, backgroundColor: sessionsByAgent.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: sessionsByAgent.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }] }} options={pieOptions} />
        </ChartCard>
        <ChartCard title="Session Status" icon={Activity} subtitle="Active vs completed sessions"
          isEmpty={sessionsByStatus.values.length === 0} emptyText="No status data available">
          <Doughnut data={{ labels: sessionsByStatus.labels, datasets: [{ data: sessionsByStatus.values, backgroundColor: sessionsByStatus.labels.map((l, i) => getStatusColor(l, i)), borderColor: sessionsByStatus.labels.map((l, i) => getStatusBorder(l, i)), borderWidth: 1.5 }] }} options={pieOptions} />
        </ChartCard>
        <ChartCard title="Activity by Category" icon={PieChartIcon} subtitle="Tracked time by activity type"
          isEmpty={categoryDist.values.length === 0} emptyText="No activity data available">
          <Doughnut data={{ labels: categoryDist.labels, datasets: [{ data: categoryDist.values, backgroundColor: categoryDist.labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]), borderColor: categoryDist.labels.map((_, i) => CHART_BORDERS[i % CHART_BORDERS.length]), borderWidth: 1.5 }] }} options={pieOptions} />
        </ChartCard>
        <ChartCard title="Problems by Status" icon={AlertTriangle} subtitle="Issue pipeline breakdown"
          isEmpty={problemsByStatus.values.length === 0} emptyText="No problem data available">
          <Pie data={{ labels: problemsByStatus.labels, datasets: [{ data: problemsByStatus.values, backgroundColor: problemsByStatus.labels.map((l, i) => getStatusColor(l, i)), borderColor: problemsByStatus.labels.map((l, i) => getStatusBorder(l, i)), borderWidth: 1.5 }] }} options={pieOptions} />
        </ChartCard>
        <ChartCard title="Requests by Status" icon={FileText} subtitle="Feature request pipeline"
          isEmpty={requestsByStatus.values.length === 0} emptyText="No request data available">
          <Doughnut data={{ labels: requestsByStatus.labels, datasets: [{ data: requestsByStatus.values, backgroundColor: requestsByStatus.labels.map((l, i) => getStatusColor(l, i)), borderColor: requestsByStatus.labels.map((l, i) => getStatusBorder(l, i)), borderWidth: 1.5 }] }} options={pieOptions} />
        </ChartCard>
        <ChartCard title="Response Timing" icon={Timer} subtitle="Average AI response & think times"
          isEmpty={responseTiming.avgResponse === null && responseTiming.avgThink === null} emptyText="No message timing data available">
          <div className="flex flex-col items-center justify-center h-full gap-6 py-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">{responseTiming.avgResponse !== null ? fmtSec(responseTiming.avgResponse) : '—'}</div>
              <div className="text-xs text-zinc-500 mt-1">Avg Response Time</div>
              <div className="text-[10px] text-zinc-600">user prompt &rarr; assistant reply</div>
            </div>
            <div className="w-16 h-px bg-zinc-800" />
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">{responseTiming.avgThink !== null ? fmtSec(responseTiming.avgThink) : '—'}</div>
              <div className="text-xs text-zinc-500 mt-1">Avg Think Time</div>
              <div className="text-[10px] text-zinc-600">assistant reply &rarr; next prompt</div>
            </div>
            {responseTiming.count > 0 && <div className="text-[10px] text-zinc-600">Based on {responseTiming.count} response pairs</div>}
          </div>
        </ChartCard>
        <ChartCard title="Daily Activity Trend" icon={TrendingUp} subtitle="Hours tracked per day"
          isEmpty={dailyTrend.values.length === 0} emptyText="No daily activity data available" full>
          <Bar data={{ labels: dailyTrend.labels, datasets: [{ data: dailyTrend.values, backgroundColor: 'rgba(168, 85, 247, 0.6)', borderColor: 'rgba(168, 85, 247, 1)', borderWidth: 1, borderRadius: 6, barPercentage: 0.7 }] }}
            options={{ ...barOptions, scales: { ...barOptions.scales, y: { ...barOptions.scales.y, title: { display: true, text: 'Hours', color: '#71717a', font: { size: 10 } } } } }} />
        </ChartCard>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.35 }}
        className="glass rounded-xl p-5">
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
                {Object.entries(aiUsage.byTool).sort(([, a]: any[], [, b]: any[]) => (b.tokens || 0) - (a.tokens || 0))
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
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.35 }}
          className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-medium text-zinc-200">Problems Progress</h3>
          </div>
          {!problems?.length ? (
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
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.35 }}
          className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-medium text-zinc-200">Requests Progress</h3>
          </div>
          {!requests?.length ? (
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
    </div>
  );
}