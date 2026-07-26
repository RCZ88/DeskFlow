import { PiggyBank, TrendingUp, ArrowUpRight } from 'lucide-react';
import { GlassSurface } from './_fx/GlassSurface';
import { formatCurrency } from './currency-data';
import type { FinanceSummary, FinanceSpendingByCategory, FinanceMonthlyTrend } from './finance-types';

interface FinanceInsightsCardProps {
  summary: FinanceSummary | null;
  spendingByCategory: FinanceSpendingByCategory[];
  monthlyTrends: FinanceMonthlyTrend[];
  displayCurrency: string;
  baseCurrency: string;
  convertAmount: (amount: number, from: string, to: string) => number;
}

export function FinanceInsightsCard({
  summary, spendingByCategory, monthlyTrends, displayCurrency, baseCurrency, convertAmount,
}: FinanceInsightsCardProps) {
  const income = summary?.totalIncome ?? 0;
  const expense = summary?.totalExpense ?? 0;
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

  const topCategory = spendingByCategory.length > 0
    ? spendingByCategory.reduce((a, b) => (a.amount > b.amount ? a : b))
    : null;

  const avgDaily = (() => {
    if (monthlyTrends.length === 0) return null;
    const totalExp = monthlyTrends.reduce((s, m) => s + convertAmount(m.expense, baseCurrency, displayCurrency), 0);
    const days = monthlyTrends.length * 30;
    return days > 0 ? totalExp / days : null;
  })();

  return (
    <GlassSurface accent className="p-6 col-span-2 row-span-1 min-h-[160px] flex flex-col">
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500 mb-3">
        Insights
      </p>
      <div className="grid grid-cols-3 gap-4 flex-1">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Savings Rate</span>
          </div>
          <p className={`text-xl font-bold tabular-nums ${savingsRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {savingsRate >= 0 ? '+' : ''}{savingsRate.toFixed(1)}%
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5">
            of income saved this period
          </p>
        </div>

        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Top Spend</span>
          </div>
          {topCategory ? (
            <>
              <p className="text-base font-bold tabular-nums text-white truncate">
                {topCategory.categoryName}
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                {topCategory.percentage.toFixed(1)}% of expenses
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-600">No data</p>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Daily Avg</span>
          </div>
          {avgDaily !== null ? (
            <>
              <p className="text-base font-bold tabular-nums text-blue-400">
                {formatCurrency(convertAmount(avgDaily, displayCurrency, displayCurrency), displayCurrency)}
              </p>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                spent per day
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-600">No data</p>
          )}
        </div>
      </div>
    </GlassSurface>
  );
}
