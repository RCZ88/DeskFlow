import React, { useEffect, useState, useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip } from 'chart.js';
import { RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Target, Calendar, Droplets, Wallet } from 'lucide-react';
import { computeCashFlow, computeBudgetStatuses, getUpcomingPayments, computeLiquidityScore, type FixedItem, type Budget, type BudgetStatus, type CashFlowSummary, type UpcomingPayment, type LiquidityBreakdown } from './budgetExpensesProcessor';
import { formatCurrency } from '../currency-data';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip);

const PALETTE = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];
const FT_SHADES = ['#f59e0b', '#d97706', '#b45309'];

interface Props { displayCurrency: string; }

export default function BudgetExpensesDashboard({ displayCurrency }: Props) {
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetSpent, setBudgetSpent] = useState<Map<number, number>>(new Map());
  const [liquidity, setLiquidity] = useState<LiquidityBreakdown | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const api = (window as any).deskflowAPI;

  const fmt = (v: number) => formatCurrency(v, displayCurrency);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fixed, buds, budStatus, liq, txns] = await Promise.all([
          api?.fixedExpensesList?.() || [],
          api?.budgetsList?.() || [],
          api?.budgetsGetStatus?.() || null,
          api?.financeGetLiquidityBreakdown?.() || null,
          api?.financeGetTransactions?.() || [],
        ]);
        setFixedItems(Array.isArray(fixed) ? fixed : []);
        setBudgets(Array.isArray(buds) ? buds : []);
        if (budStatus?.budgets) {
          const map = new Map<number, number>();
          budStatus.budgets.forEach((b: any) => map.set(b.id, b.spent || 0));
          setBudgetSpent(map);
        }
        if (liq?.success) setLiquidity(liq.data);
        setTransactions(Array.isArray(txns) ? txns : []);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, []);

  const cashFlow = useMemo(() => computeCashFlow(fixedItems), [fixedItems]);
  const budgetStatuses = useMemo(() => computeBudgetStatuses(budgets, budgetSpent), [budgets, budgetSpent]);
  const upcoming = useMemo(() => getUpcomingPayments(fixedItems, 5), [fixedItems]);

  // Spending by category from transactions
  const categoryData = useMemo(() => {
    const byCat = new Map<string, number>();
    transactions.forEach((t: any) => {
      if (t.type !== 'expense') return;
      const name = t.description || 'Uncategorized';
      byCat.set(name, (byCat.get(name) || 0) + Math.abs(t.amount));
    });
    const sorted = [...byCat.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const restSum = rest.reduce((s, r) => s + r.amount, 0);
    const all = [...top.map((t, i) => ({ ...t, color: PALETTE[i % PALETTE.length] })), ...(restSum > 0 ? [{ name: 'Other', amount: restSum, color: PALETTE[5] }] : [])];
    const total = all.reduce((s, c) => s + c.amount, 0) || 1;
    return all.map(c => ({ ...c, percentage: (c.amount / total) * 100 }));
  }, [transactions]);

  if (loading) return <div className="rounded-xl border border-zinc-700/30 p-5 animate-pulse"><div className="h-4 w-48 bg-zinc-800 rounded mb-4" /><div className="h-40 bg-zinc-800/50 rounded" /></div>;

  const isEmpty = fixedItems.length === 0 && budgets.length === 0 && cashFlow.monthlyIncome === 0 && cashFlow.monthlyExpenses === 0;

  if (isEmpty) return (
    <div className="rounded-xl border border-zinc-700/30 p-8 text-center">
      <Target className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
      <p className="text-sm text-zinc-400 mb-1">No budget data yet</p>
      <p className="text-xs text-zinc-600">Add fixed income and expenses to see analysis</p>
    </div>
  );

  const total = categoryData.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-700/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-zinc-500 uppercase">Fixed Income</span>
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center"><ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /></div>
          </div>
          <p className="text-xl font-bold text-emerald-400">{fmt(cashFlow.monthlyIncome)}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">{fmt(cashFlow.annualIncome)}/year</p>
        </div>
        <div className="rounded-xl border border-zinc-700/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-zinc-500 uppercase">Fixed Expenses</span>
            <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center"><ArrowDownRight className="w-3.5 h-3.5 text-red-400" /></div>
          </div>
          <p className="text-xl font-bold text-red-400">{fmt(cashFlow.monthlyExpenses)}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">{fmt(cashFlow.annualExpenses)}/year</p>
        </div>
        <div className="rounded-xl border border-zinc-700/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-zinc-500 uppercase">Net Cash Flow</span>
            <div className={`w-6 h-6 rounded-md ${cashFlow.isSurplus ? 'bg-blue-500/10' : 'bg-red-500/10'} flex items-center justify-center`}>
              {cashFlow.isSurplus ? <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
            </div>
          </div>
          <p className={`text-xl font-bold ${cashFlow.isSurplus ? 'text-blue-400' : 'text-red-400'}`}>{cashFlow.isSurplus ? '+' : ''}{fmt(cashFlow.netCashFlow)}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">{cashFlow.savingsRate.toFixed(1)}% savings rate</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Cash Flow Bar */}
        <div className="lg:col-span-7 rounded-xl border border-zinc-700/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div><h3 className="text-xs font-semibold text-white">Monthly Cash Flow</h3><p className="text-[10px] text-zinc-500">Income vs Expenses vs Net</p></div>
            <span className={`px-2 py-0.5 rounded text-[9px] font-medium ${cashFlow.isSurplus ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {cashFlow.isSurplus ? 'SURPLUS' : 'DEFICIT'}
            </span>
          </div>
          <div className="h-[180px]">
            <Bar data={{ labels: ['Income', 'Expenses', 'Net'], datasets: [{ data: [cashFlow.monthlyIncome, cashFlow.monthlyExpenses, Math.abs(cashFlow.netCashFlow)], backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(239,68,68,0.85)', cashFlow.isSurplus ? 'rgba(99,102,241,0.85)' : 'rgba(244,63,94,0.85)'], borderRadius: 6, borderSkipped: false, barThickness: 48 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(24,24,27,0.95)', titleColor: '#a1a1aa', bodyColor: '#fff', borderColor: 'rgba(63,63,70,0.5)', borderWidth: 1, padding: 10, callbacks: { label: (ctx) => `  ${fmt(ctx.parsed.y as number)}` } } }, scales: { x: { grid: { display: false }, ticks: { color: '#71717a', font: { size: 11 } } }, y: { grid: { color: 'rgba(113,113,122,0.08)' }, ticks: { color: '#52525b', font: { size: 10 }, callback: (v) => formatCurrency(Number(v), displayCurrency, { compact: true }) } } } }} />
          </div>
        </div>

        {/* Spending Category */}
        <div className="lg:col-span-5 rounded-xl border border-zinc-700/30 p-4">
          <h3 className="text-xs font-semibold text-white mb-3">Spending by Category</h3>
          {categoryData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-zinc-500 text-xs">No spending data</div>
          ) : (
            <div className="flex gap-3 items-start">
              <div className="relative w-[140px] h-[140px] shrink-0">
                <Doughnut
                  data={{
                    labels: categoryData.map(c => c.name),
                    datasets: [{
                      data: categoryData.map(c => c.amount),
                      backgroundColor: categoryData.map(c => c.color),
                      borderColor: '#18181b',
                      borderWidth: 2,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(24,24,27,0.95)',
                        titleColor: '#a1a1aa',
                        bodyColor: '#fff',
                        borderColor: 'rgba(63,63,70,0.5)',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                          label: (ctx) => {
                            const v = ctx.parsed as number;
                            return `  ${fmt(v)} (${((v / total) * 100).toFixed(1)}%)`;
                          },
                        },
                      },
                    },
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-sm font-bold text-white">{fmt(total)}</span><span className="text-[8px] text-zinc-500 uppercase">Total</span></div>
              </div>
              <div className="flex-1 space-y-1 max-h-[140px] overflow-y-auto">
                {categoryData.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-0.5 px-1.5 rounded hover:bg-zinc-800/30">
                    <div className="flex items-center gap-1.5 min-w-0"><span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: c.color }} /><span className="text-[10px] text-zinc-300 truncate">{c.name}</span></div>
                    <span className="text-[10px] text-zinc-400 shrink-0">{c.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Budget + Upcoming Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Budget Progress */}
        <div className="lg:col-span-7 rounded-xl border border-zinc-700/30 p-4">
          <h3 className="text-xs font-semibold text-white mb-3">Budget Progress</h3>
          {budgetStatuses.length === 0 ? (
            <p className="text-xs text-zinc-500">No budgets set</p>
          ) : (
            <div className="space-y-3">
              {budgetStatuses.map(b => (
                <div key={b.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-zinc-300">{b.name}</span>
                    <span className="text-[10px] text-zinc-500">{fmt(b.spent)} / {fmt(b.amount)}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(b.utilization, 100)}%`, backgroundColor: b.status === 'over' ? '#ef4444' : b.status === 'danger' ? '#f97316' : b.status === 'warning' ? '#eab308' : '#10b981' }} />
                  </div>
                  <p className="text-[9px] text-zinc-600 mt-0.5">{b.utilization.toFixed(0)}% used</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Due Dates */}
        <div className="lg:col-span-5 rounded-xl border border-zinc-700/30 p-4">
          <h3 className="text-xs font-semibold text-white mb-3">Upcoming Due Dates</h3>
          {upcoming.length === 0 ? (
            <p className="text-xs text-zinc-500">No upcoming payments</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(p => (
                <div key={p.id} className={`flex items-center justify-between py-2 px-3 rounded-lg ${p.isOverdue ? 'bg-red-500/5 border border-red-500/10' : p.isImminent ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-zinc-800/30 border border-zinc-800/50'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${p.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {p.type === 'income' ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-red-400" />}
                    </div>
                    <div><p className="text-[11px] text-zinc-200">{p.name}</p><p className="text-[9px] text-zinc-500">{p.daysUntilDue <= 0 ? 'Overdue' : `${p.daysUntilDue} days`}</p></div>
                  </div>
                  <span className={`text-[11px] font-medium ${p.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Liquidity Waterfall */}
      {liquidity && (
        <div className="rounded-xl border border-zinc-700/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500" /><h3 className="text-xs font-semibold text-white">Liquidity Waterfall</h3></div>
            <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">{liquidity.liquidityScore.toFixed(1)}% liquid</span>
          </div>
          <p className="text-[10px] text-zinc-500 mb-3">How quickly you can access your money</p>
          <div className="h-[140px]">
            <Bar data={{ labels: liquidity.tiers.map(t => t.name), datasets: [{ data: liquidity.tiers.map(t => t.amount), backgroundColor: liquidity.tiers.map(t => t.color), borderRadius: 6, borderSkipped: false }] }} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(24,24,27,0.95)', titleColor: '#a1a1aa', bodyColor: '#fff', borderColor: 'rgba(63,63,70,0.5)', borderWidth: 1, padding: 10, callbacks: { label: (ctx) => `  ${fmt(ctx.parsed.x as number)} (${liquidity.tiers[ctx.dataIndex]?.percentage.toFixed(1)}%)` } } }, scales: { x: { grid: { color: 'rgba(113,113,122,0.08)' }, ticks: { color: '#52525b', font: { size: 10 }, callback: (v) => formatCurrency(Number(v), displayCurrency, { compact: true }) } }, y: { grid: { display: false }, ticks: { color: '#a1a1aa', font: { size: 11, weight: 'bold' as const } } } } }} />
          </div>
        </div>
      )}
    </div>
  );
}
