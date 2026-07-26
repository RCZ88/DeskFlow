import React, { useEffect, useState, useMemo } from "react";
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

export default function SubscriptionBurdenRadar() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await (window as any).deskflowAPI?.financeGetSubscriptionIntelligence?.();
        if (result?.success && result?.data) {
          setSubscriptions(result.data.subscriptions || []);
          setMonthlyIncome(result.data.monthlyIncome || 0);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, []);

  const safeSubs = useMemo(() => {
    if (!subscriptions) return []
    return Array.isArray(subscriptions) ? subscriptions : []
  }, [subscriptions])

  const chartData = useMemo(() => {
    if (safeSubs.length === 0) return null;
    const cats = ["Streaming", "Software", "Utilities", "Insurance", "Other"];
    const totals = cats.map((c) =>
      safeSubs
        .filter((s) => (s.category || "Other") === c)
        .reduce((sum, s) => sum + toMonthly(s.amount, s.frequency), 0)
    );
    const maxVal = Math.max(...totals, 1);
    return {
      labels: cats,
      datasets: [{
        label: "Monthly Cost",
        data: totals.map((t) => (t / maxVal) * 100),
        backgroundColor: COLORS.primary,
        borderColor: COLORS.stroke,
        borderWidth: 2,
        pointBackgroundColor: COLORS.stroke,
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: COLORS.stroke,
      }],
    };
  }, [safeSubs]);

  const totalMonthly = useMemo(
    () => safeSubs.reduce((sum, s) => sum + toMonthly(s.amount, s.frequency), 0),
    [safeSubs]
  );

  const burdenPct = monthlyIncome > 0 ? (totalMonthly / monthlyIncome) * 100 : 0;
  const count = safeSubs.length;

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-700/30 p-5 animate-pulse">
        <div className="h-4 w-48 bg-zinc-800 rounded mb-4" />
        <div className="h-40 bg-zinc-800/50 rounded-lg" />
      </div>
    );
  }

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

      {chartData && (
        <div className="relative w-full aspect-square max-h-[280px]">
          <Radar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                r: {
                  angleLines: { color: COLORS.grid },
                  grid: { color: COLORS.grid },
                  pointLabels: { color: COLORS.tick, font: { size: 10, family: "JetBrains Mono" } },
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
                      const val = safeSubs
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
      )}

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-700/30">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Wallet className="w-3 h-3 text-zinc-500" />
            <span className="text-xs text-zinc-500">Monthly</span>
          </div>
          <p className="text-sm font-semibold text-white">Rp{totalMonthly.toLocaleString("id-ID")}</p>
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
