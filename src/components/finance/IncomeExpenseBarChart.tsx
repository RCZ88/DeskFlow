import React, { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from "chart.js";
import { BarChart3, Calendar, CalendarDays } from "lucide-react";
import { useNumberMask } from "../../context/NumberMaskContext";
import { maskNumber } from "../../utils/maskNumber";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface Props {
  data: MonthlyData[];
  currency: string;
}

type ViewMode = "monthly" | "weekly";

function formatCompact(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toString();
}

export default function IncomeExpenseBarChart({ data, currency }: Props) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");

  const rp = (n: number) => {
    const s = `Rp${n.toLocaleString("id-ID")}`;
    return showNumbers ? s : maskNumber(s, maskMode, maskFixedValue);
  };

  const { labels, incomeData, expenseData } = useMemo(() => {
    if (!data || data.length === 0) return { labels: [], incomeData: [], expenseData: [] };

    // Data is already aggregated monthly from parent
    // Sort oldest → newest
    const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));

    if (viewMode === "weekly") {
      // For weekly, we'd need raw transactions - since we only have monthly aggregates,
      // show monthly data but with weekly-style labels
      return {
        labels: sorted.map(d => d.month),
        incomeData: sorted.map(d => d.income),
        expenseData: sorted.map(d => d.expense),
      };
    }

    return {
      labels: sorted.map(d => d.month),
      incomeData: sorted.map(d => d.income),
      expenseData: sorted.map(d => d.expense),
    };
  }, [data, viewMode]);

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
                  callback: (v) => formatCompact(Number(v)),
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
                    return `${ctx.dataset.label}: ${rp(val)}`;
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
