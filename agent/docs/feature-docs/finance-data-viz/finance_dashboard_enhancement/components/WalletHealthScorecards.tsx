// ============================================================================
// WalletHealthScorecards.tsx
// src/components/finance/WalletHealthScorecards.tsx
// ============================================================================
// Per-wallet health metrics: balance drift, transaction frequency, fee burden.
// ============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  ChartData,
  ChartOptions,
} from 'chart.js';
import {
  HeartPulse, TrendingDown, TrendingUp, AlertTriangle,
  Activity, Receipt, CreditCard, Wallet, Coins, Smartphone,
  Landmark, Banknote, Package
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface WalletAlert {
  type: string;
  message: string;
  severity: 'warning' | 'critical' | 'info';
}

interface SparkPoint {
  date: string;
  balance: number;
}

interface WalletHealth {
  walletId: number;
  name: string;
  type: string;
  balance: number;
  currency: string;
  healthScore: number;
  balanceDrift: number;
  transactionFrequency: number;
  feeBurden: number;
  sparklineData: SparkPoint[];
  alerts: WalletAlert[];
}

interface HealthData {
  wallets: WalletHealth[];
}

const WALLET_ICONS: Record<string, React.ElementType> = {
  bank: Landmark,
  debit_card: CreditCard,
  credit_card: CreditCard,
  crypto: Coins,
  cash: Banknote,
  physical: Package,
  ewallet: Smartphone,
  other: Wallet,
};

const WALLET_COLORS: Record<string, string> = {
  bank: '#3b82f6',
  debit_card: '#10b981',
  credit_card: '#f59e0b',
  crypto: '#8b5cf6',
  cash: '#22d3ee',
  physical: '#f97316',
  ewallet: '#ec4899',
  other: '#71717a',
};

export default function WalletHealthScorecards() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await window.electron.invoke('finance:get-wallet-health');
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to load wallet health');
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

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-emerald-950/30 border-emerald-900/30';
    if (score >= 40) return 'bg-amber-950/30 border-amber-900/30';
    return 'bg-red-950/30 border-red-900/30';
  };

  const getScoreRing = (score: number) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-xl p-5 border border-zinc-800 animate-pulse">
        <div className="h-6 w-40 bg-zinc-800 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="h-40 bg-zinc-800/50 rounded-lg"></div>
          <div className="h-40 bg-zinc-800/50 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-xl p-5 border border-zinc-800">
        <div className="text-center py-8">
          <HeartPulse size={32} className="text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No wallet data available</p>
        </div>
      </div>
    );
  }

  if (!data || data.wallets.length === 0) return null;

  return (
    <div className="bg-zinc-900/80 backdrop-blur-xl rounded-xl p-5 border border-zinc-800">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <HeartPulse size={18} className="text-rose-400" />
        <h3 className="text-sm font-semibold text-zinc-100">Wallet Health Scorecards</h3>
      </div>

      {/* Scorecard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.wallets.map((wallet) => {
          const Icon = WALLET_ICONS[wallet.type] || Wallet;
          const color = WALLET_COLORS[wallet.type] || '#71717a';
          const scoreColor = getScoreColor(wallet.healthScore);
          const scoreBg = getScoreBg(wallet.healthScore);
          const scoreRing = getScoreRing(wallet.healthScore);

          // Sparkline chart
          const sparklineData: ChartData<'line'> = {
            labels: wallet.sparklineData.map(d => d.date.slice(5)),
            datasets: [{
              data: wallet.sparklineData.map(d => d.balance),
              borderColor: color,
              backgroundColor: `${color}10`,
              borderWidth: 1.5,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
            }],
          };

          const sparklineOptions: ChartOptions<'line'> = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
              x: { display: false },
              y: { display: false },
            },
          };

          return (
            <div
              key={wallet.walletId}
              className={`rounded-lg p-4 border ${scoreBg} transition-all hover:border-zinc-700`}
            >
              {/* Top Row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{wallet.name}</div>
                    <div className="text-[10px] text-zinc-500 capitalize">{wallet.type.replace('_', ' ')}</div>
                  </div>
                </div>

                {/* Score Ring */}
                <div className="relative w-12 h-12 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#27272a" strokeWidth="3" />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={scoreRing}
                      strokeWidth="3"
                      strokeDasharray={`${wallet.healthScore}, 100`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${scoreColor}`}>
                    {wallet.healthScore}
                  </div>
                </div>
              </div>

              {/* Balance + Sparkline */}
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="text-lg font-bold text-zinc-100">{formatCurrency(wallet.balance)}</div>
                  <div className={`text-[10px] flex items-center gap-0.5 ${wallet.balanceDrift >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {wallet.balanceDrift >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {wallet.balanceDrift >= 0 ? '+' : ''}{wallet.balanceDrift.toFixed(1)}% drift
                  </div>
                </div>
                <div className="w-24 h-10">
                  <Line data={sparklineData} options={sparklineOptions} />
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-zinc-950/30 rounded-md p-2">
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Activity size={10} />
                    Frequency
                  </div>
                  <div className="text-xs font-medium text-zinc-300">{wallet.transactionFrequency} txns/mo</div>
                </div>
                <div className="bg-zinc-950/30 rounded-md p-2">
                  <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                    <Receipt size={10} />
                    Fee burden
                  </div>
                  <div className={`text-xs font-medium ${wallet.feeBurden > 5 ? 'text-red-400' : 'text-zinc-300'}`}>
                    {wallet.feeBurden.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {wallet.alerts.length > 0 && (
                <div className="space-y-1">
                  {wallet.alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-1.5 text-[10px] p-1.5 rounded ${
                        alert.severity === 'critical'
                          ? 'bg-red-950/50 text-red-300'
                          : alert.severity === 'warning'
                            ? 'bg-amber-950/50 text-amber-300'
                            : 'bg-blue-950/50 text-blue-300'
                      }`}
                    >
                      <AlertTriangle size={10} className="flex-shrink-0 mt-0.5" />
                      <span>{alert.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
