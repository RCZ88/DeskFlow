import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency as fmtCurrency } from './currency-data';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import { useCountUp } from './_fx/useCountUp';
import { GlassSurface } from './_fx/GlassSurface';

interface NetWorthCardProps {
  netWorth: number;
  currency: string;
  trend?: { value: number; percent: number } | null;
}

export function NetWorthCard({ netWorth, currency, trend }: NetWorthCardProps) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();
  const heroDisplay = useCountUp(netWorth);
  const symbol = fmtCurrency(0, currency).replace(/[\d,.]/g, '').trim() || '$';

  return (
    <GlassSurface accent className="p-6 relative overflow-hidden col-span-2 row-span-1 min-h-[160px] flex flex-col justify-between">
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">
        Net Worth
      </p>

      <p className={`text-money text-[32px] leading-[40px] font-bold mt-1 ${
        netWorth >= 0 ? 'text-[#ecfdf5]' : 'text-[#fb7185]'
      }`}>
        {showNumbers
          ? `${symbol}${heroDisplay}`
          : maskNumber(fmtCurrency(netWorth, currency), maskMode, maskFixedValue)}
      </p>

      {trend && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            trend.value >= 0
              ? 'bg-emerald-500/12 text-emerald-400'
              : 'bg-red-500/12 text-red-400'
          }`}>
            {trend.value >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{trend.percent >= 0 ? '+' : ''}{trend.percent.toFixed(1)}%</span>
            <span className="opacity-60">· 30d</span>
          </div>
        </div>
      )}
    </GlassSurface>
  );
}
