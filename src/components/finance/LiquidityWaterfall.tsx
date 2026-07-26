import React, { useEffect, useState, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip,
} from "chart.js";
import { Droplets, ArrowDown, ArrowUp, Minus, PiggyBank, Wallet } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface RunwayData {
  income: number;
  fixedCosts: number;
  variableCosts: number;
  savings: number;
  net: number;
}

export default function LiquidityWaterfall() {
  const [data, setData] = useState<RunwayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await (window as any).deskflowAPI?.financeGetLiquidityBreakdown?.();
        if (result?.success && result?.data) {
          setData(result.data);
        } else {
          // Fallback: compute from transactions
          const txns = await (window as any).deskflowAPI?.financeGetTransactions?.();
          if (txns && Array.isArray(txns)) {
            const now = new Date();
            const thisMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
            const monthTxs = txns.filter((t: any) => t.date?.startsWith(thisMonth));
            const income = monthTxs.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
            const expenses = monthTxs.filter((t: any) => t.type === "expense");
            const fixedCats = ["rent", "subscription", "insurance", "utilities", "internet", "phone"];
            const fixed = expenses.filter((t: any) => fixedCats.some(fc => (t.description || "").toLowerCase().includes(fc))).reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
            const variable = expenses.filter((t: any) => !fixedCats.some(fc => (t.description || "").toLowerCase().includes(fc))).reduce((s: number, t: any) => s + Math.abs(t.amount), 0);
            setData({ income, fixedCosts: fixed, variableCosts: variable, savings: Math.max(0, income - fixed - variable), net: income - fixed - variable });
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, []);

  const items = useMemo(() => {
    if (!data) return [];
    return [
      { key: "income", label: "Income", value: data.income, color: "#10b981", icon: Wallet, desc: "Total money received this month" },
      { key: "fixed", label: "Fixed Costs", value: -data.fixedCosts, color: "#ef4444", icon: ArrowDown, desc: "Recurring bills (rent, subscriptions, utilities)" },
      { key: "variable", label: "Variable", value: -data.variableCosts, color: "#f97316", icon: Minus, desc: "Flexible spending (food, transport, etc.)" },
      { key: "savings", label: "Savings", value: data.savings, color: "#3b82f6", icon: PiggyBank, desc: "Remaining after all expenses" },
      { key: "net", label: "Net Flow", value: data.net, color: data.net >= 0 ? "#10b981" : "#ef4444", icon: data.net >= 0 ? ArrowUp : ArrowDown, desc: "Overall monthly cash flow" },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-700/30 p-5 animate-pulse">
        <div className="h-4 w-40 bg-zinc-800 rounded mb-4" />
        <div className="h-[200px] bg-zinc-800/50 rounded" />
      </div>
    );
  }

  const hasData = data && (data.income > 0 || data.fixedCosts > 0 || data.variableCosts > 0);

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
                ticks: { color: "#71717a", font: { size: 10, family: "JetBrains Mono" } },
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
