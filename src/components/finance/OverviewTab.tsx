import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
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
  categories: FinanceCategory[];
  wallets: FinanceWallet[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  displayCurrency: string;
  baseCurrency: string;
  onCreateAccount?: (data: {
    name: string; type: FinanceAccount['type']; description?: string;
    icon?: string; color?: string;
  }) => Promise<boolean>;
  // Adding transactions is handled by the global floating action button.
  // Kept here for API compatibility with the parent page.
  onAddTransaction?: (data: {
    account_id: number; wallet_id: number | null; category_id: number;
    type: 'income' | 'expense' | 'transfer'; amount: number;
    description: string; note: string; date: string;
  }) => Promise<boolean>;
  onDeleteTransaction?: (id: number) => Promise<boolean>;
  onVerifyPassword?: (password: string) => Promise<boolean>;
}

export function OverviewTab({
  summary, spendingByCategory, monthlyTrends, accounts, recentTransactions,
  categories, wallets, loading, error, onRetry, displayCurrency, baseCurrency,
  onCreateAccount, onDeleteTransaction, onVerifyPassword,
}: OverviewTabProps) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();

  // Format an amount that is ALREADY in displayCurrency (no second conversion).
  const fmtMoney = (v: number) =>
    showNumbers ? fc(v, displayCurrency) : maskNumber(fc(v, displayCurrency), maskMode, maskFixedValue);

  const activeAccounts = useMemo(() => accounts.filter(a => !a.is_archived), [accounts]);
  const activeWallets = useMemo(() => wallets.filter(w => !w.is_archived), [wallets]);

  const income = convertAmount(summary?.totalIncome ?? 0, baseCurrency, displayCurrency);
  const expense = convertAmount(summary?.totalExpense ?? 0, baseCurrency, displayCurrency);

  // Monthly net flow (the net worth TOTAL already lives in the persistent finance header).
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

  const netWorthSeries = useMemo(() => {
    let run = 0;
    return monthlyTrends.map(m => {
      run += convertAmount(m.net, baseCurrency, displayCurrency);
      return { month: m.month, value: run };
    });
  }, [monthlyTrends, baseCurrency, displayCurrency]);

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
    <motion.div
      variants={pageContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-4 gap-4"
    >
      {/* Income vs expense + monthly net flow (net worth total is in the persistent header) */}
      <motion.div variants={riseItem} className="lg:col-span-2">
        <IncomeExpenseCard income={income} expense={expense} currency={displayCurrency} />
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
          <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">
            Net worth trend
          </span>
          <div className="mt-3">
            {hasTrends ? (
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
            const convertedBalance = accountWallets.reduce((sum, w) => sum + convertAmount(w.balance, w.currency, displayCurrency), 0);
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
                        <span className="tabular-nums text-zinc-300">{fmtMoney(convertAmount(w.balance, w.currency, displayCurrency))}</span>
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
                const convertedBalance = accountWallets.reduce((sum, w) => sum + convertAmount(w.balance, w.currency, displayCurrency), 0);
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
  );
}
