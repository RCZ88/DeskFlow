import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock as LockIcon, TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react';
import { formatCurrency as fmtCurrency } from './currency-data';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import { useCountUp } from './_fx/useCountUp';
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

const SHRINK_AT = 96;
const EXPAND_AT = 48;
const T = { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const };

export function FinanceStickyHeader({
  isLocked, netWorth, displayCurrency, onToggleLock, trend, sparklineData, monthlyTrends, hasPassword = true,
}: FinanceStickyHeaderProps) {
  const { showNumbers, setShowNumbers, maskMode, maskFixedValue } = useNumberMask();
  const [shrunk, setShrunk] = useState(false);
  const shrunkRef = useRef(false);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (!shrunkRef.current && y > SHRINK_AT) { shrunkRef.current = true; setShrunk(true); }
        else if (shrunkRef.current && y < EXPAND_AT) { shrunkRef.current = false; setShrunk(false); }
        ticking.current = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const heroDisplay = useCountUp(netWorth);
  const symbol = fmtCurrency(0, displayCurrency).replace(/[\d,.]/g, '').trim() || '$';
  const sparkData = sparklineData ?? monthlyTrends?.map(m => m.income + m.expense) ?? [];
  const isPositive = netWorth >= 0;
  const colorClass = isPositive ? 'text-emerald-400' : 'text-red-400';
  const valueStr = showNumbers ? `${symbol}${heroDisplay}` : maskNumber(fmtCurrency(netWorth, displayCurrency), maskMode, maskFixedValue);

  return (
    <GlassSurface tier={3} className="sticky top-0 z-[15] px-4 sm:px-6 overflow-hidden" style={{ height: shrunk ? 36 : 112, transition: 'height 0.22s cubic-bezier(0.16,1,0.3,1)' }}>
      <div className="relative h-full">
        {/* Large layer — fades out on scroll */}
        <motion.div
          className="absolute inset-0 flex items-end pb-4"
          animate={shrunk ? { opacity: 0, y: -8, pointerEvents: 'none' as const } : { opacity: 1, y: 0, pointerEvents: 'auto' as const }}
          transition={T}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4 min-w-0">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">Net Worth</p>
                <p className={`text-[34px] leading-[38px] text-money font-bold ${colorClass}`}>{valueStr}</p>
              </div>
              {trend && (
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
              {sparkData.length >= 2 && (
                <div className="hidden lg:flex items-center self-end mb-1">
                  <Sparkline data={sparkData} width={56} height={20} className="shrink-0" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end mb-0.5">
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
        </motion.div>

        {/* Compact layer — fades in on scroll (thin bar) */}
        <motion.div
          className="absolute inset-0 flex items-center"
          animate={shrunk ? { opacity: 1, y: 0, pointerEvents: 'auto' as const } : { opacity: 0, y: 8, pointerEvents: 'none' as const }}
          transition={T}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-[9px] font-semibold tracking-[0.06em] uppercase text-zinc-500 shrink-0">NW</p>
              <p className={`text-[15px] leading-[18px] font-bold ${colorClass} truncate`}>{valueStr}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowNumbers(!showNumbers)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800/60 border border-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label={showNumbers ? 'Hide numbers' : 'Show numbers'}
              >
                {showNumbers ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              {!isLocked && hasPassword && (
                <button
                  onClick={onToggleLock}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800/60 border border-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                  aria-label="Lock finance"
                >
                  <LockIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </GlassSurface>
  );
}
