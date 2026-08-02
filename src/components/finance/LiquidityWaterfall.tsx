import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import { Droplets } from "lucide-react";
import { useNumberMask } from "../../context/NumberMaskContext";
import { maskNumber } from "../../utils/maskNumber";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface TierData {
  name: string;
  amount: number;
  color: string;
  icon: string;
  percentage: number;
  wallets: Array<{ id: number; name: string; balance: number }>;
}

interface LiquidityData {
  tiers: TierData[];
  totalNetWorth: number;
  liquidityScore: number;
  liquidAmount: number;
  lockedAmount: number;
}

export default function LiquidityWaterfall() {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();
  const [data, setData] = useState<LiquidityData | null>(null);
  const [loading, setLoading] = useState(true);

  const rp = useCallback((n: number) => {
    const s = `Rp${n.toLocaleString("id-ID")}`;
    return showNumbers ? s : maskNumber(s, maskMode, maskFixedValue);
  }, [showNumbers, maskMode, maskFixedValue]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await (window as any).deskflowAPI?.financeGetLiquidityBreakdown?.();
        if (result?.success && result?.data) { setData(result.data); }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, []);

  const items = useMemo(() => {
    if (!data?.tiers) return [];
    return data.tiers.map(t => ({
      label: t.name,
      value: t.amount,
      color: t.color,
      pct: t.percentage,
      wallets: t.wallets,
    }));
  }, [data]);

  const chartData = useMemo(() => ({
    labels: items.map(i => i.label),
    datasets: [{
      data: items.map(i => i.value),
      backgroundColor: items.map(i => i.color),
      borderRadius: 6,
      borderSkipped: false,
    }],
  }), [items]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y" as const,
    scales: {
      x: {
        grid: { color: "rgba(113,113,122,0.08)" },
        ticks: {
          color: "#71717a",
          font: { size: 10, family: "JetBrains Mono" },
          callback: (v: any) => {
            const n = Math.abs(Number(v));
            if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
            if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
            return n.toString();
          },
        },
      },
      y: {
        grid: { display: false },
        ticks: { color: "#a1a1aa", font: { size: 11, family: "JetBrains Mono", weight: "bold" as const } },
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
          label: (ctx: any) => {
            const item = items[ctx.dataIndex];
            const val = Math.abs(ctx.parsed.x as number);
            return [
              rp(val),
              `${item.pct}% of total`,
              ...item.wallets.map(w => `  ${w.name}: ${rp(w.balance)}`),
            ];
          },
        },
      },
    },
  }), [items, rp]);

  if (loading) return <div className="rounded-xl border border-zinc-700/30 p-5 animate-pulse"><div className="h-4 w-40 bg-zinc-800 rounded mb-4" /><div className="h-[200px] bg-zinc-800/50 rounded" /></div>;

  if (!data || items.length === 0) return (
    <div className="rounded-xl border border-zinc-700/30 p-5">
      <div className="flex items-center gap-2 mb-2"><Droplets className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-semibold text-white">Liquidity Waterfall</h3></div>
      <p className="text-xs text-zinc-500 mb-4">How quickly you can access your money</p>
      <div className="flex flex-col items-center justify-center py-8 text-zinc-500"><Droplets className="w-12 h-12 mb-3 opacity-30" /><p className="text-sm">No wallets to analyze</p></div>
    </div>
  );

  return (
    <div className="rounded-xl border border-zinc-700/30 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-semibold text-white">Liquidity Waterfall</h3></div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">{data.liquidityScore}% liquid</span>
      </div>
      <p className="text-xs text-zinc-500 mb-4">How quickly you can access your money</p>

      <div className="relative h-[180px]">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-zinc-700/30">
        <div className="text-center"><p className="text-[10px] text-zinc-500">Liquid</p><p className="text-sm font-semibold text-emerald-400">{rp(data.liquidAmount)}</p></div>
        <div className="text-center"><p className="text-[10px] text-zinc-500">Locked</p><p className="text-sm font-semibold text-violet-400">{rp(data.lockedAmount)}</p></div>
      </div>
    </div>
  );
}
