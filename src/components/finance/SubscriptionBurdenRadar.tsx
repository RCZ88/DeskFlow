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
import { Zap, TrendingUp, Calendar, Wallet, AlertTriangle } from "lucide-react";
import { useNumberMask } from "../../context/NumberMaskContext";
import { maskNumber } from "../../utils/maskNumber";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface RadarAxis {
  axes: string[];
  values: number[];
  colors: string[];
}

interface SubscriptionDetail {
  id: number;
  name: string;
  price: number;
  currency: string;
  billingCycle: string;
  monthlyEquivalent: number;
  nextRenewalDate: string;
  daysUntilRenewal: number;
  isUrgent: boolean;
  isWarning: boolean;
}

interface SubIntelligence {
  totalMonthlyCost: number;
  burdenPercentage: number;
  monthlyIncome: number;
  subscriptionCount: number;
  growthTrend: number;
  upcomingRenewals: number;
  urgentRenewals: number;
  radarData?: RadarAxis;
  subscriptions: SubscriptionDetail[];
}

const COLORS = {
  primary: "rgba(245, 158, 11, 0.25)",
  stroke: "#f59e0b",
  grid: "rgba(113, 113, 122, 0.15)",
  tick: "#71717a",
};

function axisCaption(axis: string, val: number, d: SubIntelligence | null): string {
  switch (axis) {
    case "Burden %":
      return `${val.toFixed(1)}% of monthly income`;
    case "Upcoming":
      return `${d?.upcomingRenewals ?? 0} renewal(s) within 30 days`;
    case "Cancellation Opp":
      return `${d?.subscriptionCount ?? 0} active subscription(s) to review`;
    default:
      return `${axis}: ${Math.round(val)}`;
  }
}

export default function SubscriptionBurdenRadar() {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();
  const [data, setData] = useState<SubIntelligence | null>(null);
  const [loading, setLoading] = useState(true);

  const rp = (n: number) => {
    const safe = Number.isFinite(n) ? n : 0;
    const s = `Rp${safe.toLocaleString("id-ID")}`;
    return showNumbers ? s : maskNumber(s, maskMode, maskFixedValue);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await (window as any).deskflowAPI?.financeGetSubscriptionIntelligence?.();
        if (result?.success && result?.data) {
          setData(result.data);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, []);

  const count = data?.subscriptionCount ?? (Array.isArray(data?.subscriptions) ? data!.subscriptions.length : 0);

  const chartData = useMemo(() => {
    const radar = data?.radarData;
    if (!radar || !Array.isArray(radar.axes) || radar.axes.length === 0) return null;
    const values = (radar.values || []).map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0));
    return {
      labels: radar.axes,
      datasets: [{
        label: "Index",
        data: values,
        backgroundColor: COLORS.primary,
        borderColor: COLORS.stroke,
        borderWidth: 2,
        pointBackgroundColor: Array.isArray(radar.colors) && radar.colors.length === radar.axes.length ? radar.colors : COLORS.stroke,
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: COLORS.stroke,
        pointRadius: 3,
      }],
    };
  }, [data]);

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

  const totalMonthly = Number.isFinite(data?.totalMonthlyCost) ? data!.totalMonthlyCost : 0;
  const burdenPct = Number.isFinite(data?.burdenPercentage) ? data!.burdenPercentage : 0;
  const upcoming = Number.isFinite(data?.upcomingRenewals) ? data!.upcomingRenewals : 0;
  const urgent = Number.isFinite(data?.urgentRenewals) ? data!.urgentRenewals : 0;

  return (
    <div className="rounded-xl border border-zinc-700/30 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-white">Subscription Intelligence</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {urgent > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
              <AlertTriangle className="w-3 h-3" /> {urgent} urgent
            </span>
          )}
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
            {count} active
          </span>
        </div>
      </div>

      {chartData ? (
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
                    title: (items) => (items[0]?.label ? String(items[0].label) : ""),
                    label: (ctx) => {
                      const val = Number(ctx.parsed?.r) || 0;
                      const axis = ctx.label ? String(ctx.label) : "";
                      return axisCaption(axis, val, data);
                    },
                  },
                },
              },
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
          <Zap className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-xs">No burden signals to chart yet</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-700/30">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Wallet className="w-3 h-3 text-zinc-500" />
            <span className="text-xs text-zinc-500">Monthly</span>
          </div>
          <p className="text-sm font-semibold text-white">{rp(totalMonthly)}</p>
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
            <span className="text-xs text-zinc-500">Renewals</span>
          </div>
          <p className="text-sm font-semibold text-white">{upcoming}</p>
        </div>
      </div>
    </div>
  );
}
