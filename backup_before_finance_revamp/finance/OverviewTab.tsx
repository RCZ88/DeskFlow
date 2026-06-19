import { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Wallet,
  ArrowUpRight, ArrowDownRight, ArrowLeftRight, Receipt, Plus,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { GlassCard } from '../GlassCard';
import { SectionHeader } from '../SectionHeader';
import { EmptyState } from '../EmptyState';
import { CreateAccountModal } from './AccountsTab';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import type { FinanceAccount, FinanceWallet, FinanceCategory, FinanceTransaction, FinanceSummary, FinanceSpendingByCategory, FinanceMonthlyTrend } from './finance-types';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const CHART_THEME = {
  tooltip: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    titleColor: '#e4e4e7',
    bodyColor: '#a1a1aa',
    borderColor: 'rgba(63, 63, 70, 0.5)',
    borderWidth: 1,
    cornerRadius: 8,
    padding: 10,
  },
  ticks: { color: '#71717a', font: { size: 10 } },
  grid: { color: 'rgba(113,113,122,0.08)' },
  border: { color: 'rgba(113,113,122,0.15)' },
};

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
    icon?: string; color?: string; currency?: string; balance?: number;
  }) => Promise<boolean>;
  onAddTransaction: (data: {
    account_id: number; wallet_id: number | null; category_id: number;
    type: 'income' | 'expense' | 'transfer'; amount: number;
    description: string; note: string; date: string;
  }) => Promise<boolean>;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 120;
  const h = 36;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="absolute bottom-0 right-0 opacity-10 pointer-events-none"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
    </svg>
  );
}

export function OverviewTab({
  summary, spendingByCategory, monthlyTrends, accounts, recentTransactions,
  categories, wallets, loading, error, onRetry, displayCurrency, baseCurrency, onCreateAccount, onAddTransaction,
}: OverviewTabProps) {
  const { showNumbers } = useNumberMask();

  const [qaType, setQaType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [qaAmount, setQaAmount] = useState('');
  const [qaDesc, setQaDesc] = useState('');
  const [qaCategory, setQaCategory] = useState<number | null>(null);
  const [qaAccount, setQaAccount] = useState<number | null>(null);
  const [qaSaving, setQaSaving] = useState(false);
  const [qaSuccess, setQaSuccess] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);

  const amountRef = useRef<HTMLInputElement>(null);

  const typeAccent =
    qaType === 'income' ? 'emerald' :
    qaType === 'transfer' ? 'amber' : 'red';

  useEffect(() => {
    if (qaSuccess) {
      const t = setTimeout(() => setQaSuccess(false), 2000);
      return () => clearTimeout(t);
    }
  }, [qaSuccess]);

  const fc = (amount: number, currency?: string) => fmtCurrency(amount, currency || displayCurrency);
  const fcc = (amount: number) => fmtCurrency(convertAmount(amount, baseCurrency, displayCurrency), displayCurrency);

  const netWorth = accounts.reduce((s, a) => s + convertAmount(a.type === 'custodial' ? 0 : a.balance, a.currency, displayCurrency), 0);

  const handleQuickAdd = async () => {
    if (!qaAmount || !qaCategory || !qaAccount) return;
    setQaSaving(true);
    const ok = await onAddTransaction({
      account_id: qaAccount,
      wallet_id: null,
      category_id: qaCategory,
      type: qaType,
      amount: qaType === 'expense' ? -Math.abs(parseFloat(qaAmount)) : Math.abs(parseFloat(qaAmount)),
      description: qaDesc,
      note: '',
      date: new Date().toISOString().split('T')[0],
    });
    setQaSaving(false);
    if (ok) {
      setQaSuccess(true);
      setQaAmount('');
      setQaDesc('');
      setQaCategory(null);
      if (amountRef.current) amountRef.current.focus();
    }
  };

  const categoriesForType = categories.filter(c => c.type === qaType && !c.is_archived);

  const recentCategories = useMemo(() => {
    const ids = [...new Set(recentTransactions.map(t => t.category_id))];
    return ids.map(id => categoriesForType.find(c => c.id === id)).filter(Boolean) as FinanceCategory[];
  }, [recentTransactions, categoriesForType]);

  const sortedCategories = useMemo(() => {
    const recent = new Set(recentCategories.map(c => c.id));
    return [
      ...recentCategories,
      ...categoriesForType.filter(c => !recent.has(c.id)),
    ];
  }, [categoriesForType, recentCategories]);

  const MAX_DOUGHNUT_ITEMS = 8;

  const doughnutData = useMemo(() => {
    if (!spendingByCategory.length) return null;
    const items = spendingByCategory.length > MAX_DOUGHNUT_ITEMS
      ? [
          ...spendingByCategory.slice(0, MAX_DOUGHNUT_ITEMS - 1),
          {
            categoryName: 'Other',
            amount: spendingByCategory.slice(MAX_DOUGHNUT_ITEMS - 1).reduce((s, c) => s + c.amount, 0),
            categoryColor: '#52525b',
          },
        ]
      : spendingByCategory;
    return {
      labels: items.map(c => c.categoryName),
      datasets: [{
        data: items.map(c => convertAmount(c.amount, baseCurrency, displayCurrency)),
        backgroundColor: items.map(c => c.categoryColor + 'CC'),
        borderColor: items.map(c => c.categoryColor),
        borderWidth: 1,
        hoverOffset: 8,
      }],
    };
  }, [spendingByCategory, baseCurrency, displayCurrency]);

  const barData = useMemo(() => {
    if (!monthlyTrends.length) return null;
    const last6 = monthlyTrends.slice(-6);
    return {
      labels: last6.map(m => m.month),
      datasets: [
        {
          label: 'Income',
          data: last6.map(m => convertAmount(m.income, baseCurrency, displayCurrency)),
          backgroundColor: 'rgba(52, 211, 153, 0.7)',
          borderColor: 'rgba(52, 211, 153, 1)',
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 20,
        },
        {
          label: 'Expense',
          data: last6.map(m => convertAmount(m.expense, baseCurrency, displayCurrency)),
          backgroundColor: 'rgba(248, 113, 113, 0.7)',
          borderColor: 'rgba(248, 113, 113, 1)',
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 20,
        },
      ],
    };
  }, [monthlyTrends, baseCurrency, displayCurrency]);

  const qaNoAccounts = accounts.filter(a => !a.is_archived).length === 0;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="animate-pulse bg-zinc-800/60 rounded-xl h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 space-y-4 max-w-3xl">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
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

  if (!accounts.length) {
    return (
      <div>
        <EmptyState
          icon={<Wallet className="w-12 h-12" />}
          title="No accounts yet"
          description="Create your first account to start tracking your finances"
          action={onCreateAccount ? { label: 'Create Account', onClick: () => setShowCreate(true) } : undefined}
        />
        {showCreate && onCreateAccount && (
          <CreateAccountModal onClose={() => setShowCreate(false)} onSave={onCreateAccount} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <GlassCard accent={typeAccent === 'income' ? 'emerald' : typeAccent === 'transfer' ? 'amber' : undefined} className="!p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-zinc-800/50 rounded-lg p-0.5 shrink-0">
            {(['income', 'expense', 'transfer'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setQaType(t); setQaCategory(null); }}
                className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors min-h-[44px] focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950 ${
                  qaType === t
                    ? t === 'income' ? 'bg-emerald-500/20 text-emerald-400' :
                      t === 'transfer' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {t === 'income' ? <TrendingUp className="w-3 h-3 inline mr-1" /> :
                 t === 'transfer' ? <ArrowLeftRight className="w-3 h-3 inline mr-1" /> :
                 <TrendingDown className="w-3 h-3 inline mr-1" />}
                {t}
              </button>
            ))}
          </div>

          <div className="relative w-44">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-medium z-10">
              {getCurrencyInfo(displayCurrency).symbol}
            </span>
            <input
              ref={amountRef}
              type="number"
              step="0.01"
              value={qaAmount}
              onChange={(e) => setQaAmount(e.target.value)}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              placeholder="0.00"
              className="w-full bg-transparent border-b-2 border-zinc-700/50 pl-8 pr-3 py-2 text-2xl font-bold tabular-nums text-white placeholder-zinc-600 focus:outline-none focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
            />
            <div className="absolute bottom-0 left-2 right-2 h-[2px] overflow-hidden">
              <motion.div
                animate={{ scaleX: amountFocused ? 1 : 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full h-full origin-center ${
                  typeAccent === 'emerald' ? 'bg-emerald-500/60' :
                  typeAccent === 'amber' ? 'bg-amber-500/60' :
                  'bg-red-500/60'
                }`}
              />
            </div>
          </div>

          <input
            type="text"
            value={qaDesc}
            onChange={(e) => setQaDesc(e.target.value)}
            placeholder="Description"
            className="flex-1 min-w-[140px] bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
          />

          <div className="relative">
            <select
              value={qaAccount ?? ''}
              onChange={(e) => setQaAccount(Number(e.target.value))}
              className="appearance-none bg-zinc-800/80 border border-zinc-700/50 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950 cursor-pointer"
            >
              <option value="" disabled>Account</option>
              {accounts.filter(a => !a.is_archived).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleQuickAdd}
            disabled={qaSaving || qaSuccess || !qaAmount || !qaCategory || !qaAccount || qaNoAccounts}
            className={`shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950 ${
              qaSuccess
                ? 'bg-emerald-500 text-white'
                : `${
                    typeAccent === 'emerald' ? 'bg-emerald-500 hover:bg-emerald-400' :
                    typeAccent === 'amber' ? 'bg-amber-500 hover:bg-amber-400' :
                    'bg-red-500 hover:bg-red-400'
                  } text-white`
            }`}
          >
            {qaSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : qaSuccess ? (
              <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </motion.svg>
            ) : (
              <><Plus className="w-4 h-4" /> Add</>
            )}
          </motion.button>
        </div>

        <div className="mt-4 relative">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" style={{ maskImage: 'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)' }}>
            {sortedCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setQaCategory(cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950 ${
                  qaCategory === cat.id
                    ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/50'
                    : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
            {sortedCategories.length === 0 && (
              <span className="text-[11px] text-zinc-500 italic py-1.5">
                No categories for {qaType} — create one in Categories
              </span>
            )}
          </div>
        </div>

        {qaNoAccounts && (
          <p className="text-[11px] text-amber-400/70 mt-2">
            Create an account first to start adding transactions
          </p>
        )}
      </GlassCard>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard variant="compact" className="!p-5 relative overflow-hidden">
          <Sparkline data={monthlyTrends.map(m => m.income)} color="#34d399" />
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-zinc-500 font-medium">Income</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-emerald-400">{fcc(summary?.totalIncome ?? 0)}</p>
          {monthlyTrends.length >= 2 && (
            <p className="text-[10px] text-zinc-600 mt-1">
              <span className="text-emerald-400">▲</span> vs last period
            </p>
          )}
        </GlassCard>

        <GlassCard variant="compact" className="!p-5 relative overflow-hidden">
          <Sparkline data={monthlyTrends.map(m => m.expense)} color="#f87171" />
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xs text-zinc-500 font-medium">Expenses</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-red-400">{fcc(summary?.totalExpense ?? 0)}</p>
          {monthlyTrends.length >= 2 && (
            <p className="text-[10px] text-zinc-600 mt-1">
              <span className="text-red-400">▼</span> vs last period
            </p>
          )}
        </GlassCard>

        <GlassCard variant="compact" className="!p-5 relative overflow-hidden">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-zinc-500 font-medium">Net Worth</p>
          </div>
            <p className={`text-xl font-bold tabular-nums ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{showNumbers ? fc(netWorth) : maskNumber(fc(netWorth))}</p>
          {accounts.filter(a => a.type === 'custodial' && !a.is_archived).length > 0 && (
            <p className="text-[10px] text-amber-400/50 mt-1">Excludes custodial holdings</p>
          )}
        </GlassCard>

        <GlassCard variant="compact" className="!p-5">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-500 font-medium">Transactions</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-white">{recentTransactions.length}</p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard accent="emerald" className="!p-5">
          <SectionHeader title="Spending by Category" icon={<TrendingDown className="w-4 h-4" />} />
          <div className="mt-4">
            {!doughnutData ? (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
                <Receipt className="w-8 h-8 mb-2 opacity-30" />
                <span className="text-xs">No spending data this period</span>
              </div>
            ) : (
              <div className="h-[260px]">
                <Doughnut
                  data={doughnutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          color: '#a1a1aa',
                          font: { size: 10 },
                          padding: 10,
                          usePointStyle: true,
                          pointStyleWidth: 8,
                        },
                      },
                      tooltip: CHART_THEME.tooltip,
                    },
                  }}
                />
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard accent="emerald" className="!p-5">
          <SectionHeader title="Monthly Trends" icon={<TrendingUp className="w-4 h-4" />} />
          <div className="mt-4">
            {!barData ? (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
                <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
                <span className="text-xs">No trend data this period</span>
              </div>
            ) : (
              <div className="h-[260px]">
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          color: '#a1a1aa',
                          font: { size: 10 },
                          padding: 10,
                          usePointStyle: true,
                          pointStyleWidth: 8,
                        },
                      },
                      tooltip: CHART_THEME.tooltip,
                    },
                    scales: {
                      x: {
                        ticks: CHART_THEME.ticks,
                        grid: { display: false },
                        border: CHART_THEME.border,
                      },
                      y: {
                        ticks: { ...CHART_THEME.ticks, maxTicksLimit: 5 },
                        grid: CHART_THEME.grid,
                        border: { display: false },
                      },
                    },
                  }}
                />
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard accent="emerald" className="!p-5">
        <SectionHeader title="Account Summary" icon={<Wallet className="w-4 h-4" />} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {accounts.filter(a => !a.is_archived && a.type !== 'custodial').map(account => {
            const converted = convertAmount(account.balance, account.currency, displayCurrency);
            return (
              <GlassCard key={account.id} variant="compact" className="!p-3 !bg-zinc-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-zinc-300">{account.name}</span>
                  {account.type !== 'personal' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      account.type === 'business' ? 'bg-blue-500/10 text-blue-400' :
                      account.type === 'joint' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {account.type}
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">{account.currency}</span>
                </div>
                <p className={`text-sm font-semibold tabular-nums ${converted >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmtCurrency(converted, displayCurrency)}
                </p>
                {account.currency !== displayCurrency && (
                  <p className="text-[10px] text-zinc-500 tabular-nums">{fmtCurrency(account.balance, account.currency)}</p>
                )}
              </GlassCard>
            );
          })}
        </div>

        {accounts.filter(a => a.type === 'custodial' && !a.is_archived).length > 0 && (
          <div className="mt-4 border-l-2 border-amber-400/40 pl-4">
            <p className="text-[10px] font-medium text-amber-400/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Wallet className="w-3 h-3" /> Holding for Others
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {accounts.filter(a => a.type === 'custodial' && !a.is_archived).map(account => {
                const converted = convertAmount(account.balance, account.currency, displayCurrency);
                return (
                  <GlassCard key={account.id} variant="compact" className="!p-3 !bg-zinc-800/40 !border-amber-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-zinc-400">{account.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                        Holding
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">{account.currency}</span>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums ${converted >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fmtCurrency(converted, displayCurrency)}
                    </p>
                    <p className="text-[10px] text-zinc-600 italic">Not counted in net worth</p>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}
      </GlassCard>

      {showCreate && onCreateAccount && (
        <CreateAccountModal onClose={() => setShowCreate(false)} onSave={onCreateAccount} />
      )}
    </div>
  );
}
