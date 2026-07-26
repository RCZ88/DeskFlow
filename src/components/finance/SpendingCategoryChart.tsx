import React, { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { PieChart } from "lucide-react";
import { formatCurrency as fmtCurrency, convertAmount } from "./currency-data";

ChartJS.register(ArcElement, Tooltip, Legend);

interface SpendingByCategory {
  category: string;
  amount: number;
  color?: string;
}

interface Transaction {
  id: number;
  type: "income" | "expense" | "transfer";
  amount: number;
  category_id?: number;
  on_behalf_of?: number;
  on_behalf_of_label?: string;
  description?: string;
}

interface Props {
  data: SpendingByCategory[];
  baseCurrency: string;
  displayCurrency: string;
  convertAmount: (amount: number, from: string, to: string) => number;
  allTransactions?: Transaction[];
}

const CATEGORY_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e",
  "#14b8a6", "#a855f7", "#ec4899", "#6366f1", "#0ea5e9",
];

const FT_SHADES = [
  "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f",
];

export default function SpendingCategoryChart({ data, baseCurrency, displayCurrency, convertAmount: convert, allTransactions = [] }: Props) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { labels: [], data: [], bgColors: [], isFtFlags: [] };

    const labels: string[] = [];
    const values: number[] = [];
    const bgColors: string[] = [];
    const isFtFlags: boolean[] = [];

    // Regular spending segments from data prop
    data.forEach((item, idx) => {
      labels.push(item.category);
      const converted = convert(item.amount, baseCurrency, displayCurrency);
      values.push(converted);
      bgColors.push(item.color || CATEGORY_COLORS[idx % CATEGORY_COLORS.length]);
      isFtFlags.push(false);
    });

    // Follow Through segments from transactions
    const ftExpenses = allTransactions.filter(
      (t) => t.type === "expense" && t.on_behalf_of && t.on_behalf_of > 0
    );

    if (ftExpenses.length > 0) {
      const ftByLabel: Record<string, number> = {};
      ftExpenses.forEach((t) => {
        const label = t.on_behalf_of_label || t.description || "FT Other";
        ftByLabel[label] = (ftByLabel[label] || 0) + Math.abs(t.amount);
      });

      Object.entries(ftByLabel).forEach(([name, amount], idx) => {
        labels.push(`${name} (FT)`);
        const converted = convert(amount, baseCurrency, displayCurrency);
        values.push(converted);
        bgColors.push(FT_SHADES[idx % FT_SHADES.length]);
        isFtFlags.push(true);
      });
    }

    return { labels, data: values, bgColors, isFtFlags };
  }, [data, allTransactions, baseCurrency, displayCurrency, convert]);

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
          Total: {fmtCurrency(totalSpent, displayCurrency)}
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
                    return `${context.label}: ${fmtCurrency(value, displayCurrency)} (${pct}%)`;
                  },
                },
              },
            },
          }}
        />
      </div>

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
                {fmtCurrency(value, displayCurrency)} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
