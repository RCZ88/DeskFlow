import React, { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import { PieChart } from "lucide-react";
import { formatCurrency as fmtCurrency, convertAmount } from "./currency-data";
import { useNumberMask } from "../../context/NumberMaskContext";
import { maskNumber } from "../../utils/maskNumber";

ChartJS.register(ArcElement, Tooltip);

interface SpendingByCategory { category: string; amount: number; color?: string; }
interface Transaction { id: number; type: string; amount: number; on_behalf_of?: number; on_behalf_of_label?: string; description?: string; }
interface Props { data: SpendingByCategory[]; baseCurrency: string; displayCurrency: string; convertAmount: (amount: number, from: string, to: string) => number; allTransactions?: Transaction[]; }

const PALETTE = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308'];
const FT_SHADES = ['#f59e0b', '#d97706', '#b45309'];

export default function SpendingCategoryChart({ data, baseCurrency, displayCurrency, convertAmount: convert, allTransactions = [] }: Props) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();
  const fmtMoney = (v: number) =>
    showNumbers ? fmtCurrency(v, displayCurrency) : maskNumber(fmtCurrency(v, displayCurrency), maskMode, maskFixedValue);
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { labels: [], data: [], bgColors: [], isFtFlags: [] };
    const labels: string[] = []; const values: number[] = []; const bgColors: string[] = []; const isFtFlags: boolean[] = [];
    data.forEach((item, idx) => { labels.push(item.category); values.push(convert(item.amount, baseCurrency, displayCurrency)); bgColors.push(PALETTE[idx % PALETTE.length]); isFtFlags.push(false); });
    const ftExpenses = allTransactions.filter(t => t.type === "expense" && t.on_behalf_of && t.on_behalf_of > 0);
    if (ftExpenses.length > 0) {
      const ftByLabel: Record<string, number> = {};
      ftExpenses.forEach(t => { const label = t.on_behalf_of_label || t.description || "Follow Through"; ftByLabel[label] = (ftByLabel[label] || 0) + Math.abs(t.amount); });
      Object.entries(ftByLabel).forEach(([name, amount], idx) => { labels.push(`${name} (FT)`); values.push(convert(amount, baseCurrency, displayCurrency)); bgColors.push(FT_SHADES[idx % FT_SHADES.length]); isFtFlags.push(true); });
    }
    return { labels, data: values, bgColors, isFtFlags };
  }, [data, allTransactions, baseCurrency, displayCurrency, convert]);

  const totalSpent = useMemo(() => chartData.data.reduce((a, b) => a + b, 0), [chartData]);

  if (chartData.data.length === 0) {
    return (<div className="rounded-xl border border-zinc-700/30 p-5"><div className="flex items-center gap-2 mb-4"><PieChart className="w-4 h-4 text-zinc-500" /><h3 className="text-sm font-semibold text-white">Spending by Category</h3></div><div className="flex flex-col items-center justify-center py-10 text-zinc-500"><PieChart className="w-12 h-12 mb-3 opacity-30" /><p className="text-sm">No spending data yet</p></div></div>);
  }

  return (
    <div className="rounded-xl border border-zinc-700/30 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><PieChart className="w-4 h-4 text-zinc-500" /><h3 className="text-sm font-semibold text-white">Spending by Category</h3></div>
        <span className="text-xs text-zinc-500">Total: {fmtMoney(totalSpent)}</span>
      </div>
      <div className="flex gap-4 items-start">
        <div className="relative w-[160px] h-[160px] shrink-0">
          <Doughnut
            data={{
              labels: chartData.labels,
              datasets: [{
                data: chartData.data,
                backgroundColor: chartData.bgColors,
                borderColor: "#18181b",
                borderWidth: 2,
                hoverOffset: 6,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: "62%",
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
                      const value = ctx.parsed as number;
                      const pct = totalSpent > 0 ? ((value / totalSpent) * 100).toFixed(1) : "0.0";
                      return `${ctx.label}: ${fmtMoney(value)} (${pct}%)`;
                    },
                  },
                },
              },
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-sm font-bold text-white">{fmtMoney(totalSpent)}</span>
            <span className="text-[8px] text-zinc-500 uppercase">Total</span>
          </div>
        </div>
        <div className="flex-1 space-y-1 max-h-[160px] overflow-y-auto pr-1">
          {chartData.labels.map((label, idx) => {
            const value = chartData.data[idx];
            const pct = totalSpent > 0 ? ((value / totalSpent) * 100).toFixed(1) : "0.0";
            const isFt = chartData.isFtFlags[idx];
            return (
              <div key={label} className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-zinc-800/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: chartData.bgColors[idx] }} />
                  <span className={`text-[11px] truncate ${isFt ? "text-amber-400 font-medium" : "text-zinc-300"}`}>{label}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-medium text-zinc-200 tabular-nums">{fmtMoney(value)}</span>
                  <span className="text-[9px] text-zinc-500 ml-1">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
