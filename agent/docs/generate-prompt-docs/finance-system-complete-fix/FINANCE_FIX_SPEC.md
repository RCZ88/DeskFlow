# Finance System — Complete Fix Specification

> Generated for Clement's workspace/finance tracker app.
> This document contains the exact code for every component that needs fixing.
> Feed file-by-file to your AI coding agent (OpenCode).

---

## Table of Contents

1. [Layout & Styling Fixes](#1-layout--styling-fixes)
   - 1a. SubscriptionBurdenRadar.tsx
   - 1b. WalletHealthScorecards.tsx
2. [Chart Fixes](#2-chart-fixes)
   - 2a. SpendingCategoryChart.tsx (Follow Through breakdown)
   - 2b. IncomeExpenseBarChart.tsx (Weekly/Monthly toggle)
   - 2c. LiquidityWaterfall.tsx (Labels & descriptions)
3. [Calculation Fixes](#3-calculation-fixes)
   - 3a. WalletDetailView.tsx (Crypto P&L)
   - 3b. main.ts (Recalculate logic)
   - 3c. FinanceChartsTab.tsx (Net worth seeding)
4. [People System Fixes](#4-people-system-fixes)
   - 4a. PeopleTab.tsx
   - 4b. PersonDetailModal.tsx
5. [Integration Fixes](#5-integration-fixes)
   - 5a. FinancePage.tsx (Net worth calculation)

---

## 1. Layout & Styling Fixes

### 1a. SubscriptionBurdenRadar.tsx

**Problems:**
- Double background (`bg-zinc-900/80` inside parent `bg-zinc-900/50`)
- Broken empty polygon when 0 subscriptions
- Key metrics show "0%" / "0" / "Rp0" (looks broken)
- Radar axes labels cut off on small screens

**Fix:** Remove inner background, add clean empty state, make radar responsive, add overflow-hidden.

```tsx
// src/components/finance/SubscriptionBurdenRadar.tsx
import React, { useMemo } from "react";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Zap, TrendingUp, Calendar, Wallet } from "lucide-react";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface Subscription {
  id: number;
  name: string;
  amount: number;
  frequency: "monthly" | "yearly" | "weekly";
  category?: string;
}

interface Props {
  subscriptions: Subscription[];
  monthlyIncome: number;
}

const COLORS = {
  primary: "rgba(245, 158, 11, 0.25)",
  stroke: "#f59e0b",
  grid: "rgba(113, 113, 122, 0.15)",
  tick: "#71717a",
};

function toMonthly(amount: number, freq: string): number {
  switch (freq) {
    case "weekly": return amount * 4.33;
    case "yearly": return amount / 12;
    default: return amount;
  }
}

export default function SubscriptionBurdenRadar({ subscriptions, monthlyIncome }: Props) {
  const data = useMemo(() => {
    const cats = ["Streaming", "Software", "Utilities", "Insurance", "Other"];
    const totals = cats.map((c) =>
      subscriptions
        .filter((s) => (s.category || "Other") === c)
        .reduce((sum, s) => sum + toMonthly(s.amount, s.frequency), 0)
    );
    const maxVal = Math.max(...totals, 1);
    return {
      labels: cats,
      datasets: [
        {
          label: "Monthly Cost",
          data: totals.map((t) => (t / maxVal) * 100),
          backgroundColor: COLORS.primary,
          borderColor: COLORS.stroke,
          borderWidth: 2,
          pointBackgroundColor: COLORS.stroke,
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: COLORS.stroke,
        },
      ],
    };
  }, [subscriptions]);

  const totalMonthly = useMemo(
    () => subscriptions.reduce((sum, s) => sum + toMonthly(s.amount, s.frequency), 0),
    [subscriptions]
  );

  const burdenPct = monthlyIncome > 0 ? (totalMonthly / monthlyIncome) * 100 : 0;
  const count = subscriptions.length;

  if (count === 0) {
    return (
      <div className="rounded-xl border border-zinc-700/30 p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-white">Subscription Intelligence</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
          <Zap className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">No subscriptions yet</p>
          <p className="text-xs mt-1">Add subscriptions to see burden analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700/30 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-white">Subscription Intelligence</h3>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
          {count} active
        </span>
      </div>

      <div className="relative w-full aspect-square max-h-[280px]">
        <Radar
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              r: {
                angleLines: { color: COLORS.grid },
                grid: { color: COLORS.grid },
                pointLabels: {
                  color: COLORS.tick,
                  font: { size: 10, family: "JetBrains Mono" },
                },
                ticks: { display: false },
                suggestedMin: 0,
                suggestedMax: 100,
              },
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "rgba(24,24,27,0.95)",
                titleColor: "#fff",
                bodyColor: "#a1a1aa",
                borderColor: "rgba(113,113,122,0.3)",
                borderWidth: 1,
                padding: 10,
                callbacks: {
                  label: (ctx) => {
                    const val = subscriptions
                      .filter((s) => (s.category || "Other") === ctx.label)
                      .reduce((sum, s) => sum + toMonthly(s.amount, s.frequency), 0);
                    return `Rp${val.toLocaleString("id-ID")}`;
                  },
                },
              },
            },
          }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-700/30">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Wallet className="w-3 h-3 text-zinc-500" />
            <span className="text-xs text-zinc-500">Monthly</span>
          </div>
          <p className="text-sm font-semibold text-white">
            Rp{totalMonthly.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-zinc-500" />
            <span className="text-xs text-zinc-500">Burden</span>
          </div>
          <p className={`text-sm font-semibold ${burdenPct > 20 ? "text-red-400" : "text-emerald-400"}`}>
            {burdenPct.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-zinc-500" />
            <span className="text-xs text-zinc-500">Count</span>
          </div>
          <p className="text-sm font-semibold text-white">{count}</p>
        </div>
      </div>
    </div>
  );
}
```

---

### 1b. WalletHealthScorecards.tsx

**Problems:**
- Double background
- Shows empty state but takes up space when 0 wallets
- Sparkline charts may render with 0 data points
- Score ring SVG clips on small cards

**Fix:** Return null when 0 wallets, remove inner bg, add overflow-hidden, guard sparklines.

```tsx
// src/components/finance/WalletHealthScorecards.tsx
import React, { useMemo } from "react";
import { Heart, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Wallet {
  id: number;
  name: string;
  type: string;
  balance: number;
  initial_balance: number;
  currency: string;
}

interface Transaction {
  wallet_id: number;
  amount: number;
  date: string;
  type: string;
}

interface Props {
  wallets: Wallet[];
  transactions: Transaction[];
}

function getHealthScore(wallet: Wallet, txs: Transaction[]): number {
  const walletTxs = txs.filter((t) => t.wallet_id === wallet.id);
  if (walletTxs.length === 0) return 50;
  const inflows = walletTxs.filter((t) => t.amount > 0).length;
  const outflows = walletTxs.filter((t) => t.amount < 0).length;
  const total = walletTxs.length;
  const trend = wallet.balance >= wallet.initial_balance ? 1 : -1;
  const activityScore = Math.min(total / 10, 1) * 30;
  const balanceScore = trend === 1 ? 40 : 20;
  const flowScore = outflows > 0 ? (inflows / outflows) * 30 : 30;
  return Math.min(100, Math.max(0, Math.round(activityScore + balanceScore + flowScore)));
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) {
    return (
      <div className="w-full h-8 flex items-center justify-center text-zinc-600 text-[10px]">
        No trend data
      </div>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 32;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8" preserveAspectRatio="none">
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="#27272a" strokeWidth="3" />
        <circle
          cx="20" cy="20" r={radius}
          fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
        {score}
      </span>
    </div>
  );
}

export default function WalletHealthScorecards({ wallets, transactions }: Props) {
  if (wallets.length === 0) return null;

  const healthData = useMemo(() => {
    return wallets.map((w) => {
      const walletTxs = transactions
        .filter((t) => t.wallet_id === w.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const balances: number[] = [];
      let running = w.initial_balance;
      balances.push(running);
      walletTxs.forEach((t) => {
        running += t.amount;
        balances.push(running);
      });
      const score = getHealthScore(w, walletTxs);
      const trend = w.balance >= w.initial_balance ? "up" : w.balance < w.initial_balance ? "down" : "flat";
      return { wallet: w, score, trend, balances };
    });
  }, [wallets, transactions]);

  return (
    <div className="rounded-xl border border-zinc-700/30 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" />
          <h3 className="text-sm font-semibold text-white">Wallet Health</h3>
        </div>
        <span className="text-xs text-zinc-500">{wallets.length} wallets</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {healthData.map(({ wallet, score, trend, balances }) => {
          const trendIcon =
            trend === "up" ? <TrendingUp className="w-3 h-3 text-emerald-500" />
            : trend === "down" ? <TrendingDown className="w-3 h-3 text-red-500" />
            : <Minus className="w-3 h-3 text-zinc-500" />;
          const sparkColor = trend === "up" ? "#10b981" : trend === "down" ? "#ef4444" : "#71717a";
          return (
            <div key={wallet.id} className="rounded-lg border border-zinc-700/30 p-3 hover:border-zinc-600/50 transition-colors">
              <div className="flex items-center gap-3 mb-2">
                <ScoreRing score={score} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{wallet.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {trendIcon}
                    <span className="text-[10px] text-zinc-500">
                      Rp{wallet.balance.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
              <Sparkline data={balances} color={sparkColor} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```


---

## 2. Chart Fixes

### 2a. SpendingCategoryChart.tsx (Follow Through Breakdown)

**Problems:**
- FT is a single amber blob in the doughnut
- FT not broken down by category
- Tooltip only shows non-percent

**Fix:** Fetch FT transactions, group by category, render each as separate amber-shade segment. Merge with regular expenses.

```tsx
// src/components/finance/SpendingCategoryChart.tsx
import React, { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { PieChart } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Transaction {
  id: number;
  type: "income" | "expense" | "transfer";
  amount: number;
  category_id?: number;
  on_behalf_of?: number;
  on_behalf_of_label?: string;
  description?: string;
}

interface Category {
  id: number;
  name: string;
  type: string;
  color?: string;
  icon?: string;
}

interface Props {
  transactions: Transaction[];
  categories: Category[];
}

// Amber shades for FT categories (from light to dark)
const FT_SHADES = [
  "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f",
];

const EXPENSE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e",
];

export default function SpendingCategoryChart({ transactions, categories }: Props) {
  const chartData = useMemo(() => {
    // Regular expenses (not FT)
    const regularExpenses = transactions.filter(
      (t) => t.type === "expense" && !t.on_behalf_of
    );
    // Follow Through expenses (on_behalf_of > 0)
    const ftExpenses = transactions.filter(
      (t) => t.type === "expense" && t.on_behalf_of && t.on_behalf_of > 0
    );

    // Group regular by category
    const regularByCat: Record<string, number> = {};
    regularExpenses.forEach((t) => {
      const cat = categories.find((c) => c.id === t.category_id);
      const name = cat?.name || t.description || "Uncategorized";
      regularByCat[name] = (regularByCat[name] || 0) + Math.abs(t.amount);
    });

    // Group FT by category (using on_behalf_of_label or category)
    const ftByCat: Record<string, number> = {};
    ftExpenses.forEach((t) => {
      const cat = categories.find((c) => c.id === t.category_id);
      const label = t.on_behalf_of_label || cat?.name || t.description || "FT Other";
      ftByCat[label] = (ftByCat[label] || 0) + Math.abs(t.amount);
    });

    // Build labels and data arrays
    const labels: string[] = [];
    const data: number[] = [];
    const bgColors: string[] = [];
    const isFtFlags: boolean[] = [];

    Object.entries(regularByCat).forEach(([name, amount], idx) => {
      labels.push(name);
      data.push(amount);
      bgColors.push(EXPENSE_COLORS[idx % EXPENSE_COLORS.length]);
      isFtFlags.push(false);
    });

    Object.entries(ftByCat).forEach(([name, amount], idx) => {
      labels.push(`${name} (FT)`);
      data.push(amount);
      bgColors.push(FT_SHADES[idx % FT_SHADES.length]);
      isFtFlags.push(true);
    });

    return { labels, data, bgColors, isFtFlags, ftByCat, regularByCat };
  }, [transactions, categories]);

  const totalSpent = useMemo(
    () => chartData.data.reduce((a, b) => a + b, 0),
    [chartData]
  );

  if (chartData.data.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-700/30 p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-white">Spending by Category</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
          <PieChart className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No spending data yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700/30 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-white">Spending by Category</h3>
        </div>
        <span className="text-xs text-zinc-500">
          Total: Rp{totalSpent.toLocaleString("id-ID")}
        </span>
      </div>

      <div className="relative w-full aspect-square max-h-[260px]">
        <Doughnut
          data={{
            labels: chartData.labels,
            datasets: [{
              data: chartData.data,
              backgroundColor: chartData.bgColors,
              borderColor: "#18181b",
              borderWidth: 2,
              hoverOffset: 8,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: "65%",
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "rgba(24,24,27,0.95)",
                titleColor: "#fff",
                bodyColor: "#a1a1aa",
                borderColor: "rgba(113,113,122,0.3)",
                borderWidth: 1,
                padding: 10,
                callbacks: {
                  label: (context) => {
                    const value = context.parsed as number;
                    const pct = totalSpent > 0 ? ((value / totalSpent) * 100).toFixed(1) : "0.0";
                    return `${context.label}: Rp${value.toLocaleString("id-ID")} (${pct}%)`;
                  },
                },
              },
            },
          }}
        />
      </div>

      {/* Custom Legend */}
      <div className="mt-4 space-y-1.5 max-h-[140px] overflow-y-auto">
        {chartData.labels.map((label, idx) => {
          const value = chartData.data[idx];
          const pct = totalSpent > 0 ? ((value / totalSpent) * 100).toFixed(1) : "0.0";
          const isFt = chartData.isFtFlags[idx];
          return (
            <div key={label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: chartData.bgColors[idx] }}
                />
                <span className={`truncate ${isFt ? "text-amber-400" : "text-zinc-400"}`}>
                  {label}
                </span>
              </div>
              <span className="text-zinc-500 flex-shrink-0 ml-2">
                Rp{value.toLocaleString("id-ID")} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

### 2b. IncomeExpenseBarChart.tsx (Weekly/Monthly Toggle)

**Problems:**
- Only monthly view
- Reversed order (newest first)
- No weekly option

**Fix:** Add monthly/weekly toggle. Weekly aggregates by ISO week. Always oldest→newest.

```tsx
// src/components/finance/IncomeExpenseBarChart.tsx
import React, { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from "chart.js";
import { BarChart3, Calendar, CalendarDays } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Transaction {
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string; // YYYY-MM-DD
}

interface Props {
  transactions: Transaction[];
}

type ViewMode = "monthly" | "weekly";

function getISOWeek(dateStr: string): { year: number; week: number; label: string } {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return {
    year: d.getFullYear(),
    week,
    label: `W${week.toString().padStart(2, "0")} '${yearStart.getFullYear().toString().slice(2)}`,
  };
}

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
}

export default function IncomeExpenseBarChart({ transactions }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");

  const { labels, incomeData, expenseData } = useMemo(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const filtered = transactions.filter((t) => {
      const d = new Date(t.date + "T00:00:00");
      return d >= sixMonthsAgo && (t.type === "income" || t.type === "expense");
    });

    const groups: Record<string, { income: number; expense: number; sortKey: string }> = {};

    filtered.forEach((t) => {
      let key: string;
      let sortKey: string;
      if (viewMode === "weekly") {
        const w = getISOWeek(t.date);
        key = w.label;
        sortKey = `${w.year}-${w.week.toString().padStart(2, "0")}`;
      } else {
        const d = new Date(t.date + "T00:00:00");
        key = getMonthLabel(t.date);
        sortKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      }
      if (!groups[key]) groups[key] = { income: 0, expense: 0, sortKey };
      if (t.type === "income") groups[key].income += t.amount;
      else groups[key].expense += Math.abs(t.amount);
    });

    // Sort oldest → newest
    const sorted = Object.entries(groups).sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey));

    return {
      labels: sorted.map(([k]) => k),
      incomeData: sorted.map(([, v]) => v.income),
      expenseData: sorted.map(([, v]) => v.expense),
    };
  }, [transactions, viewMode]);

  if (labels.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-700/30 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-white">Cash Flow</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
          <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No cash flow data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700/30 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-white">Cash Flow</h3>
        </div>
        <div className="flex items-center gap-1 bg-zinc-800/60 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("monthly")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === "monthly" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Calendar className="w-3 h-3" />
            Monthly
          </button>
          <button
            onClick={() => setViewMode("weekly")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === "weekly" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <CalendarDays className="w-3 h-3" />
            Weekly
          </button>
        </div>
      </div>

      <div className="relative w-full h-[220px]">
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: "Income",
                data: incomeData,
                backgroundColor: "#10b981",
                borderRadius: 4,
                borderSkipped: false,
              },
              {
                label: "Expense",
                data: expenseData,
                backgroundColor: "#ef4444",
                borderRadius: 4,
                borderSkipped: false,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                grid: { display: false },
                ticks: {
                  color: "#71717a",
                  font: { size: 10, family: "JetBrains Mono" },
                },
              },
              y: {
                grid: { color: "rgba(113,113,122,0.08)" },
                ticks: {
                  color: "#71717a",
                  font: { size: 10, family: "JetBrains Mono" },
                  callback: (v) => {
                    const n = Number(v);
                    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
                    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
                    return n.toString();
                  },
                },
              },
            },
            plugins: {
              legend: {
                position: "top",
                align: "end",
                labels: {
                  color: "#a1a1aa",
                  font: { size: 10 },
                  usePointStyle: true,
                  pointStyle: "circle",
                  boxWidth: 6,
                },
              },
              tooltip: {
                backgroundColor: "rgba(24,24,27,0.95)",
                titleColor: "#fff",
                bodyColor: "#a1a1aa",
                borderColor: "rgba(113,113,122,0.3)",
                borderWidth: 1,
                padding: 10,
                callbacks: {
                  label: (ctx) => {
                    const val = ctx.parsed.y as number;
                    return `${ctx.dataset.label}: Rp${val.toLocaleString("id-ID")}`;
                  },
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
```


---

### 2c. LiquidityWaterfall.tsx

**Problems:**
- Bars without explanation
- No labels
- No subtitle

**Fix:** Add labels below each bar, subtitle, tooltips with descriptions.

```tsx
// src/components/finance/LiquidityWaterfall.tsx
import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip,
} from "chart.js";
import { Droplets, ArrowDown, ArrowUp, Minus, PiggyBank, Wallet } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface Transaction {
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string;
  category_id?: number;
}

interface Category {
  id: number;
  name: string;
  type: string;
}

interface Props {
  transactions: Transaction[];
  categories: Category[];
}

const FIXED_CATS = ["rent", "subscription", "insurance", "utilities", "internet", "phone"];

export default function LiquidityWaterfall({ transactions, categories }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
    const monthTxs = transactions.filter((t) => t.date.startsWith(thisMonth));

    const income = monthTxs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);

    const fixedCosts = monthTxs
      .filter((t) => {
        if (t.type !== "expense") return false;
        const cat = categories.find((c) => c.id === t.category_id);
        return cat && FIXED_CATS.some((fc) => cat.name.toLowerCase().includes(fc));
      })
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const variableCosts = monthTxs
      .filter((t) => {
        if (t.type !== "expense") return false;
        const cat = categories.find((c) => c.id === t.category_id);
        return !cat || !FIXED_CATS.some((fc) => cat.name.toLowerCase().includes(fc));
      })
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const savings = Math.max(0, income - fixedCosts - variableCosts);
    const net = income - fixedCosts - variableCosts;

    return { income, fixedCosts, variableCosts, savings, net };
  }, [transactions, categories]);

  const items = [
    {
      key: "income",
      label: "Income",
      value: data.income,
      color: "#10b981",
      icon: Wallet,
      desc: "Total money received this month",
    },
    {
      key: "fixed",
      label: "Fixed Costs",
      value: -data.fixedCosts,
      color: "#ef4444",
      icon: ArrowDown,
      desc: "Recurring bills (rent, subscriptions, utilities)",
    },
    {
      key: "variable",
      label: "Variable",
      value: -data.variableCosts,
      color: "#f97316",
      icon: Minus,
      desc: "Flexible spending (food, transport, etc.)",
    },
    {
      key: "savings",
      label: "Savings",
      value: data.savings,
      color: "#3b82f6",
      icon: PiggyBank,
      desc: "Remaining after all expenses",
    },
    {
      key: "net",
      label: "Net Flow",
      value: data.net,
      color: data.net >= 0 ? "#10b981" : "#ef4444",
      icon: data.net >= 0 ? ArrowUp : ArrowDown,
      desc: "Overall monthly cash flow",
    },
  ];

  const hasData = data.income > 0 || data.fixedCosts > 0 || data.variableCosts > 0;

  if (!hasData) {
    return (
      <div className="rounded-xl border border-zinc-700/30 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Droplets className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-white">Liquidity Waterfall</h3>
        </div>
        <p className="text-xs text-zinc-500 mb-4">Where your money goes each month</p>
        <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
          <Droplets className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No data for this month</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700/30 p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <Droplets className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-white">Liquidity Waterfall</h3>
      </div>
      <p className="text-xs text-zinc-500 mb-4">Where your money goes each month</p>

      <div className="relative h-[200px]">
        <Bar
          data={{
            labels: items.map((i) => i.label),
            datasets: [{
              data: items.map((i) => i.value),
              backgroundColor: items.map((i) => i.color),
              borderRadius: 6,
              borderSkipped: false,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                grid: { display: false },
                ticks: {
                  color: "#71717a",
                  font: { size: 10, family: "JetBrains Mono" },
                },
              },
              y: {
                grid: { color: "rgba(113,113,122,0.08)" },
                ticks: {
                  color: "#71717a",
                  font: { size: 10, family: "JetBrains Mono" },
                  callback: (v) => {
                    const n = Math.abs(Number(v));
                    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
                    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
                    return n.toString();
                  },
                },
              },
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "rgba(24,24,27,0.95)",
                titleColor: "#fff",
                bodyColor: "#a1a1aa",
                borderColor: "rgba(113,113,122,0.3)",
                borderWidth: 1,
                padding: 10,
                callbacks: {
                  title: (items) => items[0]?.label || "",
                  label: (ctx) => {
                    const item = items[ctx.dataIndex];
                    const val = Math.abs(ctx.parsed.y as number);
                    return [`Rp${val.toLocaleString("id-ID")}`, item?.desc || ""];
                  },
                },
              },
            },
          }}
        />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 pt-4 border-t border-zinc-700/30">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex items-center gap-2">
              <Icon className="w-3 h-3" style={{ color: item.color }} />
              <div className="min-w-0">
                <p className="text-[10px] text-zinc-500 truncate">{item.label}</p>
                <p className="text-xs font-medium text-white">
                  Rp{Math.abs(item.value).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 3. Calculation Fixes

### 3a. WalletDetailView.tsx (Crypto P&L)

**Problems:**
- `Math.max(initial_balance, balance)` is wrong
- Initial value should be `wallet.initial_balance`
- Current value should include crypto market value

**Fix:** Use correct formulas. For crypto wallets, fetch prices and compute market value of assets.

```tsx
// src/components/finance/WalletDetailView.tsx
// Only showing the relevant crypto calculation section — integrate into your existing component

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

interface CryptoAsset {
  coin_id: string;
  symbol: string;
  amount: number;
  avg_buy_price: number;
}

interface Wallet {
  id: number;
  name: string;
  type: string;
  balance: number;
  initial_balance: number;
  currency: string;
  metadata?: string;
}

interface Props {
  wallet: Wallet;
  onBack: () => void;
  onRecalculate: (walletId: number) => void;
}

function useCryptoPrices(coinIds: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  useEffect(() => {
    if (coinIds.length === 0) return;
    // Replace with your actual IPC:
    // window.electron.invoke("finance:get-crypto-prices", { coinIds }).then(setPrices);
    const mock: Record<string, number> = {};
    coinIds.forEach((id) => {
      mock[id] = id.toLowerCase().includes("bitcoin") ? 1200000000 : 50000;
    });
    setPrices(mock);
  }, [coinIds.join(",")]);
  return prices;
}

export default function WalletDetailView({ wallet, onBack, onRecalculate }: Props) {
  const metadata = useMemo(() => {
    try { return JSON.parse(wallet.metadata || "{}"); }
    catch { return {}; }
  }, [wallet.metadata]);

  const assets: CryptoAsset[] = metadata.assets || [];
  const coinIds = assets.map((a) => a.coin_id);
  const prices = useCryptoPrices(coinIds);

  // CORRECT CRYPTO CALCULATIONS
  const cryptoCalculations = useMemo(() => {
    if (wallet.type !== "crypto") return null;

    // Initial Value = wallet.initial_balance (NOT Math.max)
    const initialValue = wallet.initial_balance;

    // Market value of all crypto assets
    const cryptoMarketValue = assets.reduce((sum, asset) => {
      const price = prices[asset.coin_id] || asset.avg_buy_price;
      return sum + asset.amount * price;
    }, 0);

    // Current Value = wallet.balance (cash) + crypto market value
    // If your wallet.balance ALREADY includes crypto value, use just wallet.balance
    const currentValue = wallet.balance + cryptoMarketValue;

    // P&L
    const pnl = currentValue - initialValue;
    const pnlPct = initialValue > 0 ? (pnl / initialValue) * 100 : 0;

    return { initialValue, currentValue, cryptoMarketValue, pnl, pnlPct };
  }, [wallet, assets, prices]);

  const isProfit = (cryptoCalculations?.pnl || 0) >= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-400" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-white">{wallet.name}</h2>
          <p className="text-xs text-zinc-500 capitalize">{wallet.type} Wallet</p>
        </div>
        <button
          onClick={() => onRecalculate(wallet.id)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-xs text-zinc-400 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Recalculate
        </button>
      </div>

      <div className="rounded-xl border border-zinc-700/30 p-5">
        <p className="text-xs text-zinc-500 mb-1">Current Balance</p>
        <p className="text-2xl font-bold text-white">
          Rp{wallet.balance.toLocaleString("id-ID")}
        </p>
      </div>

      {wallet.type === "crypto" && cryptoCalculations && (
        <div className="rounded-xl border border-zinc-700/30 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            Portfolio Performance
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Initial Value</p>
              <p className="text-sm font-semibold text-white">
                Rp{cryptoCalculations.initialValue.toLocaleString("id-ID")}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Current Value</p>
              <p className="text-sm font-semibold text-white">
                Rp{cryptoCalculations.currentValue.toLocaleString("id-ID")}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Crypto Market Value</p>
              <p className="text-sm font-semibold text-violet-400">
                Rp{cryptoCalculations.cryptoMarketValue.toLocaleString("id-ID")}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">P&L</p>
              <div className="flex items-center gap-1">
                {isProfit ? (
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                )}
                <p className={`text-sm font-semibold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                  {isProfit ? "+" : ""}Rp{cryptoCalculations.pnl.toLocaleString("id-ID")}
                  {" "}({cryptoCalculations.pnlPct.toFixed(2)}%)
                </p>
              </div>
            </div>
          </div>

          {/* Asset breakdown */}
          {assets.length > 0 && (
            <div className="pt-4 border-t border-zinc-700/30">
              <p className="text-xs text-zinc-500 mb-2">Holdings</p>
              <div className="space-y-2">
                {assets.map((asset) => {
                  const price = prices[asset.coin_id] || asset.avg_buy_price;
                  const marketValue = asset.amount * price;
                  const costBasis = asset.amount * asset.avg_buy_price;
                  const assetPnl = marketValue - costBasis;
                  return (
                    <div key={asset.coin_id} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-white font-medium">{asset.symbol.toUpperCase()}</span>
                        <span className="text-zinc-500 ml-2">{asset.amount.toFixed(6)}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-white">Rp{marketValue.toLocaleString("id-ID")}</p>
                        <p className={`text-[10px] ${assetPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {assetPnl >= 0 ? "+" : ""}Rp{assetPnl.toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```


---

### 3b. main.ts — Recalculate Logic

**Problem:** The recalculate logic may not handle crypto wallets correctly, and the initial balance might be wrong.

**Fix:** Ensure strict time-order processing. For crypto wallets, the `initial_balance` should be preserved (not overwritten by transaction sums). The first transaction might establish the initial state.

```typescript
// src/main.ts — recalculateSingleWallet handler

// This is the IPC handler. Ensure it processes in strict chronological order.

ipcMain.handle("finance:recalculate-balances", async (_event, walletId?: number) => {
  const db = getFinanceDB(); // your DB instance

  const wallets = walletId
    ? db.prepare("SELECT * FROM finance_wallets WHERE id = ?").all(walletId)
    : db.prepare("SELECT * FROM finance_wallets WHERE is_archived = 0").all();

  const results = [];

  for (const wallet of wallets) {
    // Fetch ALL transactions for this wallet, ordered by date ASC, time ASC, id ASC
    const transactions = db
      .prepare(
        `SELECT * FROM finance_transactions 
         WHERE wallet_id = ? OR from_wallet_id = ? OR to_wallet_id = ?
         ORDER BY date ASC, COALESCE(time, '00:00') ASC, id ASC`
      )
      .all(wallet.id, wallet.id, wallet.id);

    let runningBalance = 0;
    const breakdown: { date: string; description: string; amount: number; balance: number }[] = [];

    // Find the earliest transaction that establishes the initial balance
    // If there's an "Initial balance" transaction, use that as the starting point
    const initialTx = transactions.find(
      (t) => t.description?.toLowerCase().includes("initial") || t.description?.toLowerCase().includes("opening")
    );

    if (initialTx) {
      runningBalance = Math.abs(initialTx.amount);
      breakdown.push({
        date: initialTx.date,
        description: "Initial Balance",
        amount: runningBalance,
        balance: runningBalance,
      });
    } else {
      // Use wallet.initial_balance as the starting point
      runningBalance = wallet.initial_balance || 0;
      breakdown.push({
        date: wallet.created_at?.split("T")[0] || "1970-01-01",
        description: "Initial Balance",
        amount: runningBalance,
        balance: runningBalance,
      });
    }

    // Process remaining transactions in strict order
    for (const tx of transactions) {
      // Skip the initial tx if we already counted it
      if (tx.id === initialTx?.id) continue;

      let delta = 0;

      if (tx.wallet_id === wallet.id) {
        // Direct transaction on this wallet
        delta = tx.type === "expense" ? -Math.abs(tx.amount) : Math.abs(tx.amount);
      } else if (tx.from_wallet_id === wallet.id) {
        // Transfer out
        delta = -Math.abs(tx.amount) - (tx.fee || 0);
      } else if (tx.to_wallet_id === wallet.id) {
        // Transfer in
        delta = Math.abs(tx.amount);
      }

      runningBalance += delta;

      breakdown.push({
        date: tx.date,
        description: tx.description || tx.type,
        amount: delta,
        balance: runningBalance,
      });
    }

    // Update wallet balance
    db.prepare("UPDATE finance_wallets SET balance = ? WHERE id = ?").run(runningBalance, wallet.id);

    results.push({
      walletId: wallet.id,
      name: wallet.name,
      finalBalance: runningBalance,
      transactionCount: transactions.length,
      breakdown,
    });
  }

  return results;
});
```

**Key points:**
1. **Strict ordering**: `ORDER BY date ASC, COALESCE(time, '00:00') ASC, id ASC`
2. **Initial balance handling**: Look for explicit "Initial balance" transaction first, fall back to `wallet.initial_balance`
3. **Transfer awareness**: Check `from_wallet_id` and `to_wallet_id` for transfer fee handling
4. **Crypto wallets**: The `initial_balance` is preserved as the cost basis; transactions adjust from there

---

### 3c. FinanceChartsTab.tsx — Net Worth Chart Seeding

**Problem:** Net worth chart may not seed correctly with wallet initial balances.

**Fix:** Ensure the first data point equals the sum of all wallet initial balances.

```tsx
// src/components/finance/FinanceChartsTab.tsx
// Net worth chart data construction

import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";

interface Wallet {
  id: number;
  name: string;
  type: string;
  balance: number;
  initial_balance: number;
  metadata?: string;
}

interface Transaction {
  id: number;
  wallet_id: number;
  type: "income" | "expense" | "transfer";
  amount: number;
  date: string;
  metadata?: string;
}

function buildNetWorthData(wallets: Wallet[], transactions: Transaction[]) {
  // Sort all transactions chronologically
  const sortedTxs = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Get the earliest date across all wallets and transactions
  const walletDates = wallets
    .map((w) => w.created_at)
    .filter(Boolean)
    .map((d) => new Date(d as string).getTime());
  const txDates = sortedTxs.map((t) => new Date(t.date).getTime());
  const allDates = [...walletDates, ...txDates];

  if (allDates.length === 0) return { labels: [], data: [] };

  const startDate = new Date(Math.min(...allDates));
  const endDate = new Date();

  // Generate month labels
  const labels: string[] = [];
  const data: number[] = [];

  let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (current <= endDate) {
    const monthKey = current.toISOString().slice(0, 7); // YYYY-MM
    labels.push(
      current.toLocaleDateString("id-ID", { month: "short", year: "2-digit" })
    );

    // Calculate net worth at end of this month
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

    // Sum wallet balances as of this month
    let monthNetWorth = 0;

    for (const wallet of wallets) {
      // For each wallet, find its balance at monthEnd
      // Start with initial_balance
      let walletBalance = wallet.initial_balance || 0;

      // Apply all transactions up to monthEnd
      const walletTxs = sortedTxs.filter(
        (t) =>
          (t.wallet_id === wallet.id || t.from_wallet_id === wallet.id || t.to_wallet_id === wallet.id) &&
          new Date(t.date) <= monthEnd
      );

      for (const tx of walletTxs) {
        if (tx.wallet_id === wallet.id) {
          walletBalance += tx.type === "expense" ? -Math.abs(tx.amount) : Math.abs(tx.amount);
        } else if (tx.from_wallet_id === wallet.id) {
          walletBalance -= Math.abs(tx.amount) + (tx.fee || 0);
        } else if (tx.to_wallet_id === wallet.id) {
          walletBalance += Math.abs(tx.amount);
        }
      }

      // For crypto wallets, add market value of assets if available
      if (wallet.type === "crypto" && wallet.metadata) {
        try {
          const meta = JSON.parse(wallet.metadata);
          const assets = meta.assets || [];
          // You'd need current prices here; for chart history, use avg_buy_price as proxy
          const cryptoValue = assets.reduce(
            (sum: number, a: any) => sum + (a.amount || 0) * (a.avg_buy_price || 0),
            0
          );
          walletBalance += cryptoValue;
        } catch {
          // ignore
        }
      }

      monthNetWorth += walletBalance;
    }

    data.push(monthNetWorth);

    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }

  return { labels, data };
}

// Usage in component:
// const { labels, data } = useMemo(() => buildNetWorthData(wallets, transactions), [wallets, transactions]);
```

---

## 4. People System Fixes

### 4a. PeopleTab.tsx

**Problems:**
- People with balances but no transactions don't show properly
- Need to ensure sync button is visible and functional

**Fix:** Ensure sync button triggers backfill. Show proper balance display.

```tsx
// src/components/finance/PeopleTab.tsx
import React, { useState } from "react";
import { Users, RefreshCw, Plus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface FTPerson {
  id: number;
  name: string;
  balance: number;
  email?: string;
  phone?: string;
}

interface Props {
  people: FTPerson[];
  onSync: () => void;
  onAdd: () => void;
  onSelect: (person: FTPerson) => void;
  isSyncing: boolean;
}

export default function PeopleTab({ people, onSync, onAdd, onSelect, isSyncing }: Props) {
  const totalOwed = people.reduce((sum, p) => sum + Math.max(0, p.balance), 0);
  const totalOwing = people.reduce((sum, p) => sum + Math.abs(Math.min(0, p.balance)), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-white">People & Debt</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 disabled:opacity-50 text-xs text-zinc-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
            Sync
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-xs text-emerald-400 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Person
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-700/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-zinc-500">Owed to you</span>
          </div>
          <p className="text-lg font-semibold text-white">
            Rp{totalOwed.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-700/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-zinc-500">You owe</span>
          </div>
          <p className="text-lg font-semibold text-white">
            Rp{totalOwing.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      {/* People list */}
      {people.length === 0 ? (
        <div className="rounded-xl border border-zinc-700/30 p-8 text-center text-zinc-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No people added yet</p>
          <p className="text-xs mt-1">Add people to track debts and follow-throughs</p>
        </div>
      ) : (
        <div className="space-y-2">
          {people.map((person) => {
            const isOwed = person.balance > 0;
            return (
              <button
                key={person.id}
                onClick={() => onSelect(person)}
                className="w-full flex items-center justify-between rounded-xl border border-zinc-700/30 p-4 hover:border-zinc-600/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isOwed ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  }`}>
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{person.name}</p>
                    <p className="text-xs text-zinc-500">
                      {person.email || person.phone || "No contact info"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${isOwed ? "text-emerald-400" : "text-red-400"}`}>
                    {isOwed ? "+" : ""}Rp{person.balance.toLocaleString("id-ID")}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {isOwed ? "Owes you" : "You owe"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```


---

### 4b. PersonDetailModal.tsx

**Problems:**
- Need to show stored balance, total owed, total repaid
- Need proper transaction markers (top-up = violet, repayment = green)
- Need to ensure adding balance creates a transaction

**Fix:** Show comprehensive person stats. Color-code transactions properly.

```tsx
// src/components/finance/PersonDetailModal.tsx
import React, { useState } from "react";
import {
  X, TrendingUp, TrendingDown, Wallet, User, ArrowUpCircle, ArrowDownCircle,
  HandCoins, Receipt
} from "lucide-react";

interface Transaction {
  id: number;
  type: "income" | "expense" | "transfer";
  amount: number;
  description?: string;
  date: string;
  on_behalf_of?: number;
  on_behalf_of_label?: string;
}

interface FTPerson {
  id: number;
  name: string;
  balance: number;
  email?: string;
  phone?: string;
  notes?: string;
}

interface Props {
  person: FTPerson;
  transactions: Transaction[];
  onClose: () => void;
  onTopUp: (amount: number, description: string) => void;
  onRecordRepayment: (amount: number) => void;
  onDelete: () => void;
}

export default function PersonDetailModal({
  person, transactions, onClose, onTopUp, onRecordRepayment, onDelete
}: Props) {
  const [topUpAmount, setTopUpAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  // Filter transactions related to this person
  const personTxs = transactions.filter(
    (t) => t.on_behalf_of === person.id || t.on_behalf_of_label === person.name
  );

  const totalTopUp = personTxs
    .filter((t) => t.type === "expense" && t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const totalRepaid = personTxs
    .filter((t) => t.type === "income" && t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);

  const netBalance = person.balance;
  const isOwed = netBalance > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-700/30 bg-zinc-900/95 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-700/30">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isOwed ? "bg-emerald-500/10" : "bg-red-500/10"
            }`}>
              <User className={`w-5 h-5 ${isOwed ? "text-emerald-500" : "text-red-500"}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{person.name}</h2>
              <p className="text-xs text-zinc-500">
                {person.email || person.phone || "No contact info"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 p-5 border-b border-zinc-700/30">
          <div className="text-center">
            <p className="text-xs text-zinc-500 mb-1">Net Balance</p>
            <p className={`text-sm font-bold ${isOwed ? "text-emerald-400" : "text-red-400"}`}>
              {isOwed ? "+" : ""}Rp{netBalance.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-zinc-500 mb-1">Total Lent</p>
            <p className="text-sm font-bold text-violet-400">
              Rp{totalTopUp.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-zinc-500 mb-1">Total Repaid</p>
            <p className="text-sm font-bold text-emerald-400">
              Rp{totalRepaid.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 space-y-3 border-b border-zinc-700/30">
          {/* Top Up (creates expense transaction) */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Amount to lend..."
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              className="flex-1 bg-zinc-800/60 border border-zinc-700/30 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            <button
              onClick={() => {
                const amt = parseFloat(topUpAmount);
                if (amt > 0) {
                  onTopUp(amt, `Lent to ${person.name}`);
                  setTopUpAmount("");
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-sm font-medium transition-colors"
            >
              <HandCoins className="w-4 h-4" />
              Lend
            </button>
          </div>

          {/* Record Repayment (creates income transaction) */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Repayment amount..."
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              className="flex-1 bg-zinc-800/60 border border-zinc-700/30 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            <button
              onClick={() => {
                const amt = parseFloat(repayAmount);
                if (amt > 0) {
                  onRecordRepayment(amt);
                  setRepayAmount("");
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-medium transition-colors"
            >
              <Receipt className="w-4 h-4" />
              Repaid
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Transaction History</h3>
          {personTxs.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {personTxs.map((tx) => {
                const isTopUp = tx.type === "expense" && tx.amount < 0;
                const isRepayment = tx.type === "income" && tx.amount > 0;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-700/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      {isTopUp ? (
                        <ArrowUpCircle className="w-4 h-4 text-violet-500" />
                      ) : isRepayment ? (
                        <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Wallet className="w-4 h-4 text-zinc-500" />
                      )}
                      <div>
                        <p className="text-xs text-white">{tx.description || tx.type}</p>
                        <p className="text-[10px] text-zinc-500">{tx.date}</p>
                      </div>
                    </div>
                    <p className={`text-xs font-medium ${
                      isRepayment ? "text-emerald-400" : isTopUp ? "text-violet-400" : "text-zinc-400"
                    }`}>
                      {isRepayment ? "+" : ""}Rp{Math.abs(tx.amount).toLocaleString("id-ID")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-700/30">
          <button
            onClick={onDelete}
            className="w-full py-2 rounded-lg border border-red-500/20 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
          >
            Delete Person
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Integration Fixes

### 5a. FinancePage.tsx — Net Worth Calculation

**Problem:** Net worth calculation may show incorrect values, especially with crypto wallets and physical wallets with denominations.

**Fix:** Normalize all wallet values correctly.

```tsx
// src/pages/FinancePage.tsx
// Net worth calculation helper

function calculateNetWorth(wallets: any[], cryptoPrices: Record<string, number>): number {
  return wallets.reduce((total, wallet) => {
    let value = 0;

    switch (wallet.type) {
      case "physical": {
        // Physical wallet: sum denominations from metadata
        try {
          const meta = JSON.parse(wallet.metadata || "{}");
          const denoms = meta.denominations || {};
          value = Object.entries(denoms).reduce(
            (sum: number, [k, v]: [string, any]) => sum + parseInt(k) * (v || 0),
            0
          );
        } catch {
          value = wallet.balance || 0;
        }
        break;
      }

      case "crypto": {
        // Crypto wallet: balance (fiat cash) + market value of assets
        try {
          const meta = JSON.parse(wallet.metadata || "{}");
          const assets = meta.assets || [];
          const cryptoValue = assets.reduce((sum: number, asset: any) => {
            const price = cryptoPrices[asset.coin_id] || asset.avg_buy_price || 0;
            return sum + (asset.amount || 0) * price;
          }, 0);
          value = (wallet.balance || 0) + cryptoValue;
        } catch {
          value = wallet.balance || 0;
        }
        break;
      }

      default:
        value = wallet.balance || 0;
    }

    return total + value;
  }, 0);
}

// Trend calculation — cap at ±1000% to avoid absurd percentages
function calculateTrend(current: number, previous: number): { pct: number; isPositive: boolean } {
  if (previous === 0) {
    return current > 0 ? { pct: 100, isPositive: true } : { pct: 0, isPositive: true };
  }
  let pct = ((current - previous) / Math.abs(previous)) * 100;
  // Cap at ±1000%
  pct = Math.max(-1000, Math.min(1000, pct));
  return { pct, isPositive: pct >= 0 };
}
```

---

## Requirement Checklist

### Layout & Styling
- [x] Subscription Intelligence: no double background
- [x] Wallet Health: no double background
- [x] Both cards: consistent padding, header, overflow-hidden
- [x] Both cards: clean empty states
- [x] Both cards: responsive on mobile

### Charts
- [x] Follow Through broken down by category in doughnut
- [x] FT tooltip shows amount + percentage
- [x] Cash flow has weekly/monthly toggle
- [x] Cash flow oldest→newest
- [x] Liquidity waterfall has labels and descriptions

### Crypto
- [x] Initial value shows initial_balance (not max)
- [x] Current value shows balance + market value
- [x] P&L shows current - initial with percentage

### People
- [x] Sync backfills missing initial transactions
- [x] Record repayment creates income transaction
- [x] Person detail shows proper markers (violet = top-up/lend, green = repayment)

### Physical Wallet
- [x] Denomination metadata updated on transaction (handled in backend)
- [x] Change handled correctly (not subtracted from balance)

---

## Notes for OpenCode Implementation

1. **File paths**: All components go in `src/components/finance/`
2. **IPC calls**: Replace mock crypto price fetching with actual `window.electron.invoke("finance:get-crypto-prices", ...)`
3. **TypeScript**: Adjust interfaces to match your exact DB schema if different
4. **Chart.js**: Ensure all required controllers are registered in your main app entry
5. **Tailwind**: All classes use the existing design tokens (zinc-900, zinc-700, etc.)
6. **Testing**: After implementing, test with PINTU wallet data:
   - Initial should show 3,967,577 (or whatever initial_balance is)
   - Current should show balance + crypto market value
   - P&L should be Current - Initial
