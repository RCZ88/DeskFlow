// ============================================================================
// SubscriptionBurdenRadar.tsx
// src/components/finance/SubscriptionBurdenRadar.tsx
// ============================================================================
// Shows % of income consumed by subscriptions + upcoming renewal timeline.
// ============================================================================

import React, { useEffect, useState, useMemo } from 'react';
import { Radar, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Receipt, AlertTriangle, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip, Legend, CategoryScale, LinearScale, BarElement
);

interface Subscription {
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

interface RadarData {
  axes: string[];
  values: number[];
  colors: string[];
}

interface SubscriptionData {
  totalMonthlyCost: number;
  burdenPercentage: number;
  monthlyIncome: number;
  subscriptionCount: number;
  growthTrend: number;
  upcomingRenewals: number;
  urgentRenewals: number;
  radarData: RadarData;
  subscriptions: Subscription[];
}

export default function SubscriptionBurdenRadar() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await window.electron.invoke('finance:get-subscription-intelligence');
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to load subscription data');
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

  const getBurdenColor = (pct: number) => {
    if (pct <= 10) return 'text-emerald-400';
    if (pct <= 20) return 'text-amber-400';
    return 'text-red-400';
  };

  // Radar chart
  const radarChartData: ChartData<'radar'> = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    return {
      labels: data.radarData.axes,
      datasets: [{
        label: 'Current',
        data: data.radarData.values,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: '#8b5cf6',
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#8b5cf6',
        borderWidth: 2,
      }],
    };
  }, [data]);

  const radarOptions: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { display: false, stepSize: 20 },
        grid: { color: '#27272a' },
        pointLabels: {
          color: '#a1a1aa',
          font: { size: 10, family: 'Geist' },
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#fafafa',
        bodyColor: '#e4e4e7',
        borderColor: '#27272a',
        borderWidth: 1,
        padding: 10,
      },
    },
  };

  // Timeline bar chart (upcoming renewals)
  const timelineData: ChartData<'bar'> = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    const urgent = data.subscriptions.filter(s => s.isUrgent);
    const warning = data.subscriptions.filter(s => s.isWarning);
    const normal = data.subscriptions.filter(s => !s.isUrgent && !s.isWarning);

    return {
      labels: ['Urgent (≤7d)', 'Warning (≤30d)', 'Normal'],
      datasets: [{
        data: [urgent.length, warning.length, normal.length],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
        borderRadius: 6,
        barThickness: 24,
      }],
    };
  }, [data]);

  const timelineOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#71717a', font: { size: 10 } },
      },
      y: {
        grid: { color: '#27272a', drawBorder: false },
        ticks: { color: '#71717a', font: { size: 10 }, stepSize: 1 },
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-xl p-5 border border-zinc-800 animate-pulse">
        <div className="h-6 w-48 bg-zinc-800 rounded mb-4"></div>
        <div className="h-40 bg-zinc-800/50 rounded-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-xl p-5 border border-zinc-800">
        <div className="text-center py-8">
          <Receipt size={32} className="text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">No active subscriptions</p>
          <p className="text-xs text-zinc-600 mt-1">Add subscriptions to see your burden analysis</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isGrowing = data.growthTrend > 0;

  return (
    <div className="bg-zinc-900/80 backdrop-blur-xl rounded-xl p-5 border border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Subscription Intelligence</h3>
        </div>
        <div className={`flex items-center gap-1 text-xs ${isGrowing ? 'text-red-400' : 'text-emerald-400'}`}>
          {isGrowing ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{isGrowing ? '+' : ''}{data.growthTrend.toFixed(1)}% vs 3mo ago</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800/50 text-center">
          <div className={`text-xl font-bold ${getBurdenColor(data.burdenPercentage)}`}>
            {data.burdenPercentage.toFixed(1)}%
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">of monthly income</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800/50 text-center">
          <div className="text-xl font-bold text-zinc-100">{data.subscriptionCount}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">active subs</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-800/50 text-center">
          <div className="text-xl font-bold text-zinc-100">{formatCurrency(data.totalMonthlyCost)}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">monthly cost</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Radar Chart */}
        <div className="relative h-48">
          <Radar data={radarChartData} options={radarOptions} />
        </div>

        {/* Timeline */}
        <div className="h-48">
          <div className="text-xs font-medium text-zinc-400 mb-2">Renewal Status</div>
          <Bar data={timelineData} options={timelineOptions} />
        </div>
      </div>

      {/* Upcoming Renewals List */}
      {data.subscriptions.filter(s => s.daysUntilRenewal <= 30).length > 0 && (
        <div className="border-t border-zinc-800 pt-3">
          <div className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1">
            <Calendar size={12} />
            Upcoming Renewals
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {data.subscriptions
              .filter(s => s.daysUntilRenewal <= 30)
              .map((sub) => (
                <div
                  key={sub.id}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                    sub.isUrgent
                      ? 'bg-red-950/30 border border-red-900/30'
                      : sub.isWarning
                        ? 'bg-amber-950/30 border border-amber-900/30'
                        : 'bg-zinc-800/30 border border-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {sub.isUrgent && <AlertTriangle size={12} className="text-red-400" />}
                    <span className="text-zinc-300">{sub.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-200 font-medium">{formatCurrency(sub.price)}</div>
                    <div className={`text-[10px] ${sub.isUrgent ? 'text-red-400' : 'text-zinc-500'}`}>
                      {sub.daysUntilRenewal <= 0 ? 'Due today' : `${sub.daysUntilRenewal} days`}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
