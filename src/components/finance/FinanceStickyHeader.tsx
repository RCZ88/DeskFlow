import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock as LockIcon, Unlock as UnlockIcon, TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react';
import { formatCurrency as fmtCurrency } from './currency-data';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import { useCountUp } from './_fx/useCountUp';
import { DUR } from './_fx/financeMotion';
import { GlassSurface } from './_fx/GlassSurface';
import { Sparkline } from './_fx/Sparkline';

interface FinanceStickyHeaderProps {
  isLocked: boolean;
  netWorth: number;
  displayCurrency: string;
  onToggleLock: () => void;
  trend?: { value: number; percent: number } | null;
  sparklineData?: number[];
  monthlyTrends?: { month: string; income: number; expense: number }[];
  hasPassword?: boolean;
}

export function FinanceStickyHeader({
  isLocked, netWorth, displayCurrency, onToggleLock, trend, sparklineData, monthlyTrends, hasPassword = true,
}: FinanceStickyHeaderProps) {
  const { showNumbers, setShowNumbers, maskMode, maskFixedValue } = useNumberMask();
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const heroDisplay = useCountUp(netWorth);
  const symbol = fmtCurrency(0, displayCurrency).replace(/[\d,.]/g, '').trim() || '$';

  const sparkData = sparklineData ?? monthlyTrends?.map(m => m.income + m.expense) ?? [];

  return (
    <>
      <div ref={sentinelRef} className="absolute top-24 left-0 right-0 h-px pointer-events-none" />
      <GlassSurface
        tier={3}
        className={`sticky top-0 z-[15] ${
          scrolled ? 'h-16' : 'h-28'
        } flex items-center px-6 transition-[height_650ms] ease-[0.22,1,0.36,1]`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4 min-w-0">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">
                Net Worth
              </p>
              <p
                className={`text-money font-bold ${
                  scrolled ? 'text-[22px] leading-[26px]' : 'text-[34px] leading-[38px]'
                } ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {showNumbers ? `${symbol}${heroDisplay}` : maskNumber(fmtCurrency(netWorth, displayCurrency), maskMode, maskFixedValue)}
              </p>
            </div>

            {trend && !scrolled && (
              <div className="hidden sm:flex items-center gap-1.5 self-end mb-1">
                {trend.value >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                )}
                <span className={`text-xs font-semibold tabular-nums ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trend.value >= 0 ? '+' : ''}{fmtCurrency(trend.value, displayCurrency)}
                </span>
                <span className={`text-[11px] ${trend.value >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                  ({trend.percent >= 0 ? '+' : ''}{trend.percent.toFixed(1)}%)
                </span>
              </div>
            )}

            {sparkData.length >= 2 && !scrolled && (
              <div className="hidden lg:flex items-center self-end mb-1">
                <Sparkline data={sparkData} width={56} height={20} className="shrink-0" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowNumbers(!showNumbers)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-zinc-800/60 border border-white/5 text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
              aria-label={showNumbers ? 'Hide numbers' : 'Show numbers'}
            >
              {showNumbers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            {!isLocked && hasPassword && (
              <button
                onClick={onToggleLock}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-zinc-800/60 border border-white/5 text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                aria-label="Lock finance"
              >
                <LockIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </GlassSurface>
    </>
  );
}
