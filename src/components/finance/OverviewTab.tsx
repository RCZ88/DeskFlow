import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Handshake, Bell, ArrowUpRight, ArrowDownLeft, Repeat, HelpCircle } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { GlassSurface } from './_fx/GlassSurface';
import { pageContainer, riseItem } from './_fx/financeMotion';
import { EmptyState } from './EmptyState';
import { IncomeExpenseCard } from './IncomeExpenseCard';
import { Sparkline } from './_fx/Sparkline';
import { FinanceInsightsCard } from './FinanceInsightsCard';
import { RecentTxnsCard } from './RecentTxnsCard';
import { SpendingCategoryChart } from './SpendingCategoryChart';
import { IncomeExpenseBarChart } from './IncomeExpenseBarChart';
import { NetWorthLineChart } from './NetWorthLineChart';
import { FollowThroughCard } from './FollowThroughCard';
import { SpendingSplitCard } from './SpendingSplitCard';
import { RepaymentModal } from './RepaymentModal';
import { followThroughReceivable, getUnpaidByPerson } from '../../lib/netWorth';
import { groupByPerson } from '../../lib/receivables';
import { formatCurrency as fc, convertAmount, getCurrencyInfo, COMMON_CURRENCIES } from './currency-data';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import type {
  FinanceAccount, FinanceWallet, FinanceCategory, FinanceTransaction,
  FinanceSummary, FinanceSpendingByCategory, FinanceMonthlyTrend,
} from './finance-types';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

interface OverviewTabProps {
  summary: FinanceSummary | null;
  spendingByCategory: FinanceSpendingByCategory[];
  monthlyTrends: FinanceMonthlyTrend[];
  accounts: FinanceAccount[];
  recentTransactions: FinanceTransaction[];
  allTransactions?: FinanceTransaction[];
  categories: FinanceCategory[];
  wallets: FinanceWallet[];
  subscriptions?: any[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  displayCurrency: string;
  baseCurrency: string;
  currentNetWorth?: number;
  onCreateAccount?: (data: {
    name: string; type: FinanceAccount['type']; description?: string;
    icon?: string; color?: string;
  }) => Promise<boolean>;
  onDeleteTransaction?: (id: number) => Promise<boolean>;
  onVerifyPassword?: (password: string) => Promise<boolean>;
  onBehalfOfSummary?: { totalExpense: number; breakdown: { label: string; total: number; count: number }[] } | null;
  onRecordFtRepayment?: (data: {
    originalTxId: number; personId?: number; amount: number; date: string;
    walletId?: number; description?: string; isOverpayment?: boolean;
  }) => Promise<boolean>;
  ftPersons?: { id: number; name: string; email?: string | null; phone?: string | null }[];
}

export function OverviewTab({
  summary, spendingByCategory, monthlyTrends, accounts, recentTransactions,
  allTransactions = [], categories, wallets, subscriptions = [], loading, error, onRetry, displayCurrency, baseCurrency,
  onCreateAccount, onDeleteTransaction, onVerifyPassword, onBehalfOfSummary, currentNetWorth, onRecordFtRepayment, ftPersons = [],
}: OverviewTabProps) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();
  const [showFT, setShowFT] = useState(false);
  const [nwPeriod, setNwPeriod] = useState<'day' | 'month' | 'auto'>('day');
  const [repaymentModal, setRepaymentModal] = useState<{
    personName: string; txIds: number[]; totalAmount: number;
  } | null>(null);

  // Format an amount that is ALREADY in displayCurrency (no second conversion).
  const fmtMoney = (v: number) =>
    showNumbers ? fc(v, displayCurrency) : maskNumber(fc(v, displayCurrency), maskMode, maskFixedValue);

  const activeAccounts = useMemo(() => accounts.filter(a => !a.is_archived), [accounts]);
  const activeWallets = useMemo(() => wallets.filter(w => !w.is_archived), [wallets]);

  const income = convertAmount(summary?.totalIncome ?? 0, baseCurrency, displayCurrency);
  const expense = convertAmount(summary?.totalExpense ?? 0, baseCurrency, displayCurrency);

  // Follow Through receivable (C6 model: money others owe us from FT expenses)
  const ftReceivable = useMemo(
    () => followThroughReceivable(allTransactions),
    [allTransactions],
  );

  // Unpaid FT expenses grouped by person (for SpendingSplitCard)
  const unpaidByPerson = useMemo(() => {
    const map = getUnpaidByPerson(allTransactions);
    return [...map.entries()].map(([name, data]) => ({
      name,
      total: data.total,
      count: data.count,
      unpaidTxIds: data.txIds,
    })).sort((a, b) => b.total - a.total);
  }, [allTransactions]);

  // Personal spending = total expense (excl FT already filtered in summary) minus FT
  const personalExpense = expense - (onBehalfOfSummary?.totalExpense ?? 0);

  // Net worth total — use explicit prop if given, else fall back to summary + receivable
  const totalNetWorth = currentNetWorth ?? convertAmount(summary?.netBalance ?? 0, baseCurrency, displayCurrency);

  // Monthly net flow
  const netFlowSeries = useMemo(
    () => monthlyTrends.map(m => convertAmount(m.net, baseCurrency, displayCurrency)),
    [monthlyTrends, baseCurrency, displayCurrency],
  );
  const latestNet = netFlowSeries.length ? netFlowSeries[netFlowSeries.length - 1] : 0;
  const momDelta = netFlowSeries.length >= 2 ? latestNet - netFlowSeries[netFlowSeries.length - 2] : null;

  // Net worth shown across several currencies (base currency comes from Settings).
  const currencyBalances = useMemo(() => {
    const codes = [baseCurrency, ...COMMON_CURRENCIES.filter(c => c !== baseCurrency)].slice(0, 6);
    const baseNet = summary?.netBalance ?? 0;
    return codes.map(code => ({
      code,
      symbol: getCurrencyInfo(code).symbol,
      formatted: fc(convertAmount(baseNet, baseCurrency, code), code),
    }));
  }, [summary, baseCurrency]);

  const barChartData = useMemo(
    () => monthlyTrends.slice(-6).map(m => ({
      month: m.month,
      income: convertAmount(m.income, baseCurrency, displayCurrency),
      expense: convertAmount(m.expense, baseCurrency, displayCurrency),
    })),
    [monthlyTrends, baseCurrency, displayCurrency],
  );

  // Follow Through MoM change + trend
  const ftMomChangePct = useMemo(() => {
    if (monthlyTrends.length < 2) return null;
    // Approximate FT from total minus personal (personal is onBehalfOf=0)
    // Since monthlyTrends already excludes FT, we can't derive FT from it directly.
    // Use the summary-based approach: totalExpense includes all, summary filters FT.
    // For now, return null until we have FT-specific monthly data.
    return null;
  }, [monthlyTrends]);

  const ftTrend = useMemo(() => {
    // Placeholder: last 6 months of FT spending (0s until we have FT monthly breakdown)
    return monthlyTrends.slice(-6).map(() => 0);
  }, [monthlyTrends]);

  // Compute openingNW from ALL transactions (not just monthlyTrends which is capped at 12 months)
  const openingNW = useMemo(() => {
    // Sum ALL transaction signed amounts to get total net flow
    const totalNetFlow = allTransactions.reduce((s, t) => {
      if (t.type === 'income') return s + convertAmount(Math.abs(t.amount), baseCurrency, displayCurrency);
      if (t.type === 'expense') return s - convertAmount(Math.abs(t.amount), baseCurrency, displayCurrency);
      // Transfers are neutral for net worth (money moved between wallets, not gained/lost)
      // BUT transfer fees DO reduce net worth
      if (t.type === 'transfer') return s - convertAmount(t.fee || 0, baseCurrency, displayCurrency);
      return s;
    }, 0);
    return totalNetWorth - totalNetFlow;
  }, [totalNetWorth, allTransactions, baseCurrency, displayCurrency]);

  const effectivePeriod = useMemo(() => {
    if (!allTransactions || allTransactions.length === 0) return 'day';
    const uniqueDates = new Set(allTransactions.map(t => t.date));
    const uniqueMonths = new Set(allTransactions.map(t => t.date.slice(0, 7)));
    // Use 'month' mode only if transactions span more than 12 unique months
    // Otherwise, always use 'day' to show individual transaction impact
    return uniqueMonths.size > 12 ? 'month' : 'day';
  }, [allTransactions]);

  const netWorthSeries = useMemo(() => {
    // Always build the series from individual transactions, grouped by date
    const dayMap = new Map<string, number>();
    for (const t of allTransactions) {
      let signed: number;
      if (t.type === 'income') {
        signed = Math.abs(t.amount);
      } else if (t.type === 'expense') {
        signed = -Math.abs(t.amount);
      } else if (t.type === 'transfer') {
        // Transfers are neutral except for the fee
        signed = -(t.fee || 0);
      } else {
        signed = 0;
      }
      const converted = convertAmount(signed, baseCurrency, displayCurrency);
      dayMap.set(t.date, (dayMap.get(t.date) ?? 0) + converted);
    }

    const sorted = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    if (sorted.length === 0) {
      // No transactions — show current net worth as a flat line
      return [{ month: new Date().toISOString().split('T')[0], value: totalNetWorth }];
    }

    let run = openingNW;
    const series: { month: string; value: number }[] = [];

    // Prepend a starting point (opening NW before any transactions) if we have history
    const firstDate = sorted[0][0];
    const dayBefore = new Date(firstDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    series.push({ month: dayBefore.toISOString().split('T')[0], value: openingNW });

    for (const [date, net] of sorted) {
      run += net;
      series.push({ month: date, value: run });
    }

    // If the last data point is not today, append the current net worth as the final point
    const today = new Date().toISOString().split('T')[0];
    if (series[series.length - 1].month !== today) {
      series.push({ month: today, value: totalNetWorth });
    }

    // If effectivePeriod is 'month', downsample to monthly granularity
    if (effectivePeriod === 'month') {
      const monthMap = new Map<string, number>();
      for (const point of series) {
        const monthKey = point.month.slice(0, 7); // YYYY-MM
        monthMap.set(monthKey, point.value); // Last value for each month wins
      }
      return [...monthMap.entries()].map(([month, value]) => ({ month, value }));
    }

    return series;
  }, [effectivePeriod, allTransactions, openingNW, totalNetWorth, baseCurrency, displayCurrency]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 animate-pulse bg-zinc-800/60 rounded-[20px] h-40" />
        <div className="lg:col-span-2 animate-pulse bg-zinc-800/60 rounded-[20px] h-40" />
        <div className="lg:col-span-4 animate-pulse bg-zinc-800/60 rounded-[20px] h-28" />
        <div className="lg:col-span-2 animate-pulse bg-zinc-800/60 rounded-[20px] h-64" />
        <div className="lg:col-span-2 animate-pulse bg-zinc-800/60 rounded-[20px] h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 space-y-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-[20px] p-5 text-center">
          <p className="text-sm text-red-400 mb-2">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-medium transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!activeAccounts.length) {
    return (
      <EmptyState
        icon={<Wallet className="w-12 h-12" />}
        title="No accounts yet"
        description="Create your first account to start tracking your finances"
        action={onCreateAccount ? { label: 'Create Account', onClick: () => onCreateAccount({ name: 'New Account', type: 'personal' }) } : undefined}
      />
    );
  }

  const personalAccounts = activeAccounts.filter(a => a.type !== 'custodial');
  const custodialAccounts = activeAccounts.filter(a => a.type === 'custodial');
  const hasTrends = monthlyTrends.length > 0;

  return (
    <>
    <motion.div
      variants={pageContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
    >
      {/* 2x2 Summary Cards */}
      <motion.div variants={riseItem}>
        <GlassSurface className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">Income</span>
          </div>
          <p className="text-white text-xl font-bold">{fmtMoney(income)}</p>
        </GlassSurface>
      </motion.div>
      <motion.div variants={riseItem}>
        <GlassSurface className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-red-400" />
            </span>
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">Expense</span>
          </div>
          <p className="text-white text-xl font-bold">{fmtMoney(expense)}</p>
        </GlassSurface>
      </motion.div>
      <motion.div variants={riseItem}>
        <GlassSurface className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-indigo-400" />
            </span>
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">Net Worth</span>
          </div>
          <p className="text-white text-xl font-bold">{fmtMoney(totalNetWorth)}</p>
        </GlassSurface>
      </motion.div>
      <motion.div variants={riseItem}>
        <GlassSurface className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${latestNet >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <TrendingUp className={`w-4 h-4 ${latestNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
            </span>
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">Net Flow</span>
          </div>
          <p className={`text-xl font-bold ${latestNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{latestNet >= 0 ? '+' : ''}{fmtMoney(latestNet)}</p>
          {momDelta !== null && (
            <p className="text-[11px] text-zinc-500 mt-0.5">{momDelta >= 0 ? '↑' : '↓'} {fmtMoney(Math.abs(momDelta))} vs last month</p>
          )}
        </GlassSurface>
      </motion.div>

      {/* Row: Spending Split + Receivables */}
      <motion.div variants={riseItem} className="lg:col-span-1">
        <SpendingSplitCard
          personalExpense={personalExpense}
          ftExpense={onBehalfOfSummary?.totalExpense ?? 0}
          currency={displayCurrency}
          unpaidByPerson={unpaidByPerson}
          onRecordRepayment={(name, txIds, total) => setRepaymentModal({ personName: name, txIds, totalAmount: total })}
          allCaughtUp={unpaidByPerson.length === 0}
        />
      </motion.div>
      <motion.div variants={riseItem} className="lg:col-span-1">
        <GlassSurface className="p-5 h-full">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Handshake className="w-4 h-4 text-amber-400" />
            </span>
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">Receivables</span>
          </div>
          {(() => {
            const receivablePeople = groupByPerson(allTransactions);
            if (receivablePeople.length === 0) return <p className="text-xs text-zinc-600">No outstanding receivables</p>;
            return (
              <div className="space-y-1.5">
                {receivablePeople.map(p => (
                  <div key={p.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-800/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-amber-400">{p.name[0]?.toUpperCase()}</span>
                      </div>
                      <span className="text-xs font-medium text-zinc-200 truncate">{p.name}</span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-amber-400">{fmtMoney(p.totalOwed)}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </GlassSurface>
      </motion.div>

      <motion.div variants={riseItem} className="lg:col-span-2">
        <GlassSurface className="p-5 h-full flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">
                Net flow this month
              </span>
              <p className={`text-money font-bold text-[28px] leading-[32px] mt-1 ${latestNet >= 0 ? 'text-emerald-400' : 'text-[#fb7185]'}`}>
                {fmtMoney(latestNet)}
              </p>
            </div>
            {netFlowSeries.length >= 2 && (
              <Sparkline
                data={netFlowSeries}
                color={latestNet >= 0 ? '#34d399' : '#fb7185'}
                width={96}
                height={40}
                className="shrink-0 mt-1"
              />
            )}
          </div>
          {momDelta !== null ? (
            <div className="flex items-center gap-1.5 mt-3">
              {momDelta >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-[#fb7185]" />
              )}
              <span className={`text-xs font-semibold tabular-nums ${momDelta >= 0 ? 'text-emerald-400' : 'text-[#fb7185]'}`}>
                {momDelta >= 0 ? '+' : ''}{fmtMoney(momDelta)}
              </span>
              <span className="text-[11px] text-zinc-500">vs last month</span>
            </div>
          ) : (
            <span className="text-[11px] text-zinc-600 mt-3">Not enough history yet</span>
          )}
        </GlassSurface>
      </motion.div>

      {/* Insights strip */}
      <motion.div variants={riseItem} className="lg:col-span-4">
        <FinanceInsightsCard
          summary={summary}
          spendingByCategory={spendingByCategory}
          monthlyTrends={monthlyTrends}
          displayCurrency={displayCurrency}
          baseCurrency={baseCurrency}
          convertAmount={convertAmount}
        />
      </motion.div>

      {/* Upcoming renewals + net worth across currencies */}
      <motion.div variants={riseItem} className="lg:col-span-4">
        <GlassSurface className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">
              Upcoming Renewals
            </span>
            <span className="text-[10px] text-zinc-600">This month</span>
          </div>
          {(() => {
            const now = new Date();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const upcoming = subscriptions.filter((s: any) =>
              s.status === 'active' && s.next_renewal_date &&
              new Date(s.next_renewal_date) <= endOfMonth && new Date(s.next_renewal_date) >= now
            );
            if (upcoming.length === 0) {
              return (
                <div className="flex items-center gap-2 py-3">
                  <Bell className="w-4 h-4 text-zinc-600" />
                  <span className="text-xs text-zinc-600">No renewals this month</span>
                </div>
              );
            }
            const totalUpcoming = upcoming.reduce((s: number, sub: any) => s + sub.price, 0);
            return (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-lg font-bold tabular-nums text-white">{fmtMoney(totalUpcoming)}</span>
                  <span className="text-[10px] text-zinc-500">across {upcoming.length} subscription{upcoming.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {upcoming.slice(0, 4).map((sub: any) => (
                    <div key={sub.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-800/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <Repeat className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="text-xs text-zinc-300 truncate">{sub.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-zinc-500">
                          {sub.next_renewal_date ? new Date(sub.next_renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-white">{fmtMoney(sub.price)}</span>
                      </div>
                    </div>
                  ))}
                  {upcoming.length > 4 && (
                    <span className="text-[10px] text-zinc-600">+{upcoming.length - 4} more</span>
                  )}
                </div>
              </div>
            );
          })()}
        </GlassSurface>
      </motion.div>

      {/* Net worth across currencies */}
      <motion.div variants={riseItem} className="lg:col-span-4">
        <GlassSurface className="p-5">
          <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">
            Net worth across currencies
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
            {currencyBalances.map(cb => (
              <div
                key={cb.code}
                className={`rounded-xl border p-3 ${cb.code === baseCurrency ? 'border-emerald-500/40 bg-emerald-500/[0.06]' : 'border-white/5 bg-zinc-900/40'}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-zinc-300">{cb.symbol}</span>
                  <span className="text-[11px] text-zinc-500">{cb.code}</span>
                  {cb.code === baseCurrency && (
                    <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                      Base
                    </span>
                  )}
                </div>
                <p className="text-money font-semibold text-sm text-zinc-100 mt-1.5 tabular-nums">
                  {showNumbers ? cb.formatted : maskNumber(cb.formatted, maskMode, maskFixedValue)}
                </p>
              </div>
            ))}
          </div>
        </GlassSurface>
      </motion.div>

      {/* Net worth trend + spending breakdown */}
      <motion.div variants={riseItem} className="lg:col-span-2">
        <GlassSurface className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">
              Net worth trend
            </span>
            <div className="flex items-center gap-0.5 bg-zinc-900/50 p-0.5 rounded-full">
              {(['day', 'month', 'auto'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setNwPeriod(p)}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-colors capitalize ${
                    nwPeriod === p ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-1">
            {(hasTrends || netWorthSeries.length > 0) ? (
              <NetWorthLineChart data={netWorthSeries} currency={displayCurrency} />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
                <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
                <span className="text-xs">Not enough history yet</span>
              </div>
            )}
          </div>
        </GlassSurface>
      </motion.div>
      <motion.div variants={riseItem} className="lg:col-span-2">
        <SpendingCategoryChart
          data={spendingByCategory}
          baseCurrency={baseCurrency}
          displayCurrency={displayCurrency}
          convertAmount={convertAmount}
          allTransactions={allTransactions}
        />
      </motion.div>

      {/* Cashflow + recent activity */}
      <motion.div variants={riseItem} className="lg:col-span-2">
        <GlassSurface className="p-5">
          <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">
            Cashflow · last 6 months
          </span>
          <div className="mt-3">
            {hasTrends ? (
              <IncomeExpenseBarChart data={barChartData} currency={displayCurrency} />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
                <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
                <span className="text-xs">No cashflow data this period</span>
              </div>
            )}
          </div>
        </GlassSurface>
      </motion.div>
      <motion.div variants={riseItem} className="lg:col-span-2">
        <RecentTxnsCard
          transactions={recentTransactions}
          displayCurrency={displayCurrency}
          baseCurrency={baseCurrency}
          accounts={accounts}
          categories={categories}
          wallets={wallets}
          onDeleteTransaction={onDeleteTransaction}
          onVerifyPassword={onVerifyPassword}
        />
      </motion.div>

      {/* Accounts */}
      <motion.div variants={riseItem} className="lg:col-span-4 space-y-4">
        <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500 block">
          Accounts
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {personalAccounts.map(account => {
            const accountWallets = activeWallets.filter(w => w.account_id === account.id);
            const walletBalance = (w: FinanceWallet) =>
              (w.type === 'physical' || w.type === 'cash') && w.metadata?.denominations
                ? (Array.isArray(w.metadata.denominations)
                    ? w.metadata.denominations.reduce((sx: number, d: any) => sx + (d.value || 0) * (d.count || 0), 0)
                    : (w.balance ?? 0))
                : (w.balance ?? 0);

            const convertedBalance = accountWallets.reduce((sum, w) => sum + convertAmount(walletBalance(w), w.currency, displayCurrency), 0);
            return (
              <GlassSurface key={account.id} className="p-4 text-left">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{account.name}</p>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{account.type}</span>
                  </div>
                  <p className="text-base font-bold tabular-nums text-white">{fmtMoney(convertedBalance)}</p>
                </div>
                {accountWallets.length > 0 && (
                  <div className="space-y-1 mt-2 pt-2 border-t border-zinc-700/30">
                    {accountWallets.slice(0, 3).map(w => (
                      <div key={w.id} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400 truncate">{w.name}</span>
                        <span className="tabular-nums text-zinc-300">{fmtMoney(convertAmount(walletBalance(w), w.currency, displayCurrency))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassSurface>
            );
          })}
        </div>

        {custodialAccounts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-amber-400" />
              <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-amber-400">
                Holding for others
              </span>
              <span className="text-[10px] text-zinc-600">Not counted in net worth</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {custodialAccounts.map(account => {
                const accountWallets = activeWallets.filter(w => w.account_id === account.id);
                const convertedBalance = accountWallets.reduce((sum, w) => sum + convertAmount(walletBalance(w), w.currency, displayCurrency), 0);
                return (
                  <GlassSurface key={account.id} className="p-4 border-l-2 border-amber-500/40">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">{account.name}</p>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Custodial</span>
                      </div>
                      <p className="text-base font-bold tabular-nums text-zinc-400">{fmtMoney(convertedBalance)}</p>
                    </div>
                  </GlassSurface>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>

      {/* Repayment Modal */}
      <RepaymentModal
        open={repaymentModal !== null}
        onClose={() => setRepaymentModal(null)}
        personName={repaymentModal?.personName ?? ''}
        totalAmount={repaymentModal?.totalAmount ?? 0}
        txIds={repaymentModal?.txIds ?? []}
        wallets={activeWallets}
        displayCurrency={displayCurrency}
        onConfirm={async (data) => {
          let success = true;
          const personId = ftPersons.find(p => p.name === data.personName)?.id;
          for (const txId of data.txIds) {
            const ok = await onRecordFtRepayment?.({
              originalTxId: txId,
              personId,
              amount: data.amount / data.txIds.length,
              date: data.date,
              walletId: data.walletId,
              description: data.description,
            });
            if (!ok) { success = false; break; }
          }
          if (success) setRepaymentModal(null);
          return success;
        }}
      />
    </>
  );
}
