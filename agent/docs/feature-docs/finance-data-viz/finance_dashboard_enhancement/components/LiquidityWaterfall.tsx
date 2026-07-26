// ============================================================================
// LiquidityWaterfall.tsx
// src/components/finance/LiquidityWaterfall.tsx
// ============================================================================
// Shows how much of net worth is immediately accessible vs locked.
// Answers: "If I need Rp 10M right now, can I get it?"
// ============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Droplets, Zap, Clock, Lock, AlertCircle } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface WalletDetail {
  id: number;
  name: string;
  balance: number;
  currency: string;
}

interface LiquidityTier {
  name: string;
  amount: number;
  color: string;
  icon: string;
  wallets: WalletDetail[];
  percentage: number;
}

interface TransferSpeed {
  from: string;
  to: string;
  avgMinutes: number;
}

interface LiquidityData {
  tiers: LiquidityTier[];
  totalNetWorth: number;
  liquidityScore: number;
  liquidAmount: number;
  lockedAmount: number;
  transferSpeeds: TransferSpeed[];
}

export default function LiquidityWaterfall() {
  const [data, setData] = useState<LiquidityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await window.electron.invoke('finance:get-liquidity-breakdown');
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to load liquidity data');
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case '💵': return <Zap size={16} className="text-emerald-400" />;
      case '🏦': return <Droplets size={16} className="text-blue-400" />;
      case '💳': return <Clock size={16} className="text-amber-400" />;
      case '⛓️': return <Lock size={16} className="text-violet-400" />;
      default: return <Droplets size={16} />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 60) return 'text-emerald-400';
    if (score >= 30) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 60) return 'Excellent';
    if (score >= 30) return 'Moderate';
    return 'Low';
  };

  // Stacked horizontal bar chart
  const chartData: ChartData<'bar'> = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    return {
      labels: ['Liquidity Breakdown'],
      datasets: data.tiers.map((tier) => ({
        label: tier.name,
        data: [tier.amount],
        backgroundColor: tier.color,
        borderRadius: 6,
        barThickness: 40,
      })),
    };
  }, [data]);

  const chartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#fafafa',
        bodyColor: '#e4e4e7',
        borderColor: '#27272a',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (ctx) => {
            const val = ctx.raw as number;
            const tier = data?.tiers[ctx.datasetIndex];
            return `${tier?.name}: ${formatCurrency(val)} (${tier?.percentage.toFixed(1)}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { color: '#27272a', drawBorder: false },
        ticks: { color: '#71717a', font: { size: 10 } },
      },
      y: {
        stacked: true,
        display: false,
        grid: { display: false },
      },
    },
  };

  if (loading) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-xl p-5 border border-zinc-800 animate-pulse">
        <div className="h-6 w-40 bg-zinc-800 rounded mb-4"></div>
        <div className="h-32 bg-zinc-800/50 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-xl p-5 border border-red-900/30">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle size={18} />
          <span className="text-sm font-medium">{error}</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-zinc-900/80 backdrop-blur-xl rounded-xl p-5 border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Droplets size={18} className="text-blue-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Liquidity Waterfall</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Score:</span>
          <span className={`text-sm font-bold ${getScoreColor(data.liquidityScore)}`}>
            {data.liquidityScore.toFixed(0)}% — {getScoreLabel(data.liquidityScore)}
          </span>
        </div>
      </div>

      {/* Score Gauge */}
      <div className="mb-5">
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${data.liquidityScore}%`,
              background: data.liquidityScore >= 60
                ? 'linear-gradient(90deg, #10b981, #34d399)'
                : data.liquidityScore >= 30
                  ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(90deg, #ef4444, #f87171)',
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-zinc-600">0%</span>
          <span className="text-[10px] text-zinc-600">100%</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-16 mb-5">
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {data.tiers.map((tier) => (
          <div
            key={tier.name}
            className="p-3 rounded-lg border border-zinc-800/50"
            style={{ backgroundColor: `${tier.color}10` }}
          >
            <div className="flex items-center gap-2 mb-1">
              {getIcon(tier.icon)}
              <span className="text-xs font-medium text-zinc-300">{tier.name}</span>
            </div>
            <div className="text-sm font-bold text-zinc-100">{formatCurrency(tier.amount)}</div>
            <div className="text-[10px] text-zinc-500">{tier.percentage.toFixed(1)}% of net worth</div>
            {tier.wallets.length > 0 && (
              <div className="text-[10px] text-zinc-600 mt-1">
                {tier.wallets.length} wallet{tier.wallets.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Transfer Speeds */}
      {data.transferSpeeds.length > 0 && (
        <div className="border-t border-zinc-800 pt-3">
          <div className="text-xs font-medium text-zinc-400 mb-2">Fastest Transfer Routes</div>
          <div className="space-y-1.5">
            {data.transferSpeeds.slice(0, 3).map((speed, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">
                  {speed.from} <span className="text-zinc-700">→</span> {speed.to}
                </span>
                <span className="text-zinc-400 font-mono">
                  {speed.avgMinutes < 60
                    ? `${Math.round(speed.avgMinutes)} min`
                    : `${(speed.avgMinutes / 60).toFixed(1)} hrs`
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
