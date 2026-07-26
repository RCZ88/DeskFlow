import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock as LockIcon, TrendingUp, TrendingDown, Eye, EyeOff, RefreshCw } from 'lucide-react';
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
  syncStatus?: { phase: string; wallets: number; updated: number } | null;
  syncResults?: string[] | null;
  onSyncBalances?: () => void;
  onSyncDismiss?: () => void;
}

const EXPANDED_H = 112;
const COMPACT_H = 48;
const T = { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const };

/** Walk up the DOM to find the nearest scrollable ancestor. */
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  let parent = el.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (
      style.overflow === 'auto' ||
      style.overflow === 'scroll' ||
      style.overflowY === 'auto' ||
      style.overflowY === 'scroll'
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

export function FinanceStickyHeader({
  isLocked, netWorth, displayCurrency, onToggleLock, trend, sparklineData, monthlyTrends, hasPassword = true, syncStatus, syncResults, onSyncBalances, onSyncDismiss,
}: FinanceStickyHeaderProps) {
  const { showNumbers, setShowNumbers, maskMode, maskFixedValue } = useNumberMask();
  const [shrunk, setShrunk] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const shrunkRef = useRef(false);

  /*
   * Scroll-based collapse with hysteresis:
   *  - Collapse when scrolled past 64px
   *  - Expand when scrolled back above 24px
   * This 40px gap prevents flicker at the boundary.
   */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollContainer = getScrollParent(sentinel);
    if (!sentinel || !scrollContainer) return;

    let ticking = false;
    const COLLAPSE_THRESHOLD = 64;
    const EXPAND_THRESHOLD = 24;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const scrollTop = scrollContainer === document.documentElement
          ? window.scrollY
          : scrollContainer.scrollTop;
        const shouldShrink = scrollTop > COLLAPSE_THRESHOLD;
        const shouldExpand = scrollTop < EXPAND_THRESHOLD;
        // Only update if decisively past the threshold — not in the dead zone
        if (shouldShrink && !shrunkRef.current) {
          shrunkRef.current = true;
          setShrunk(true);
        } else if (shouldExpand && shrunkRef.current) {
          shrunkRef.current = false;
          setShrunk(false);
        }
      });
    };

    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // check initial state
    return () => scrollContainer.removeEventListener('scroll', onScroll);
  }, []);

  const heroDisplay = useCountUp(netWorth);
  const symbol = fmtCurrency(0, displayCurrency).replace(/[\d,.]/g, '').trim() || '$';
  const sparkData = sparklineData ?? monthlyTrends?.map(m => m.income + m.expense) ?? [];
  const isPositive = netWorth >= 0;
  const colorClass = isPositive ? 'text-emerald-400' : 'text-red-400';
  const valueStr = showNumbers
    ? `${symbol}${heroDisplay}`
    : maskNumber(fmtCurrency(netWorth, displayCurrency), maskMode, maskFixedValue);

  return (
    <>
      {/* Sentinel — invisible marker that tells us when the header becomes sticky. */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />

      <GlassSurface
        tier={3}
        className={`sticky top-0 z-[15] px-4 sm:px-6 overflow-hidden ${
          shrunk ? 'shadow-[0_8px_40px_rgba(0,0,0,0.45)] border-b border-white/10' : ''
        }`}
        style={{
          height: shrunk ? COMPACT_H : EXPANDED_H,
          transition: 'height 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s ease',
        }}
      >
        <div className="relative h-full">
          {/* ------------------------------------------------------------------ */}
          {/* Expanded layer — full net-worth dashboard header                     */}
          {/* ------------------------------------------------------------------ */}
          <motion.div
            className="absolute inset-x-0 bottom-0 pb-4 flex items-end"
            initial={false}
            animate={shrunk ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
            transition={T}
            style={{ pointerEvents: shrunk ? 'none' : 'auto' }}
          >
            <div className="flex items-end justify-between w-full">
              <div className="flex items-end gap-4 min-w-0">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-zinc-500">Net Worth</p>
                  <p className={`text-[34px] leading-[38px] text-money font-bold ${colorClass} truncate`}>{valueStr}</p>
                </div>
                {trend && (
                  <div className="hidden sm:flex items-center gap-1.5 mb-1.5">
                    {trend.value >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span className={`text-xs font-semibold tabular-nums ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trend.value >= 0 ? '+' : ''}{fmtCurrency(trend.value, displayCurrency)}
                    </span>
                    <span className={`text-[11px] ${trend.value >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                      ({trend.percent >= 0 ? '+' : ''}{isFinite(trend.percent) ? trend.percent.toFixed(1) : '—'}%)
                    </span>
                  </div>
                )}
                {sparkData.length >= 2 && (
                  <div className="hidden lg:flex items-center mb-1.5">
                    <Sparkline data={sparkData} width={56} height={20} className="shrink-0" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 mb-0.5">
                {onSyncBalances && (
                  <button
                    onClick={onSyncBalances}
                    disabled={!!syncStatus}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-[11px] font-medium transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncStatus ? 'animate-spin' : ''}`} />
                    {syncStatus ? syncStatus.phase : 'Sync'}
                  </button>
                )}
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

          {/* ------------------------------------------------------------------ */}
          {/* Compact layer — thin sticky summary bar                              */}
          {/* ------------------------------------------------------------------ */}
          <motion.div
            className="absolute inset-0 flex items-center"
            initial={false}
            animate={shrunk ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
            transition={T}
            style={{ pointerEvents: shrunk ? 'auto' : 'none' }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[9px] font-semibold tracking-[0.06em] uppercase text-zinc-500 shrink-0">NW</span>
                <span className={`text-[15px] leading-[18px] font-bold ${colorClass} truncate`}>{valueStr}</span>
                {trend && (
                  <span className={`hidden sm:inline text-[11px] tabular-nums ${trend.value >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                    {trend.value >= 0 ? '+' : ''}{isFinite(trend.percent) ? trend.percent.toFixed(1) : '—'}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onSyncBalances && (
                  <button
                    onClick={onSyncBalances}
                    disabled={!!syncStatus}
                    className="h-8 flex items-center gap-1 px-2.5 rounded-full bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-[10px] font-medium transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncStatus ? 'animate-spin' : ''}`} />
                    {syncStatus ? syncStatus.phase : 'Sync'}
                  </button>
                )}
                <button
                  onClick={() => setShowNumbers(!showNumbers)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800/60 border border-white/5 text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                  aria-label={showNumbers ? 'Hide numbers' : 'Show numbers'}
                >
                  {showNumbers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                {!isLocked && hasPassword && (
                  <button
                    onClick={onToggleLock}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800/60 border border-white/5 text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                    aria-label="Lock finance"
                  >
                    <LockIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </GlassSurface>

      {/* Sync results — rendered OUTSIDE GlassSurface (which has overflow-hidden) */}
      <AnimatePresence>
        {syncResults && syncResults.length > 0 && !syncStatus && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.2 }}
            className="sticky top-[48px] z-[14] mx-4 sm:mx-6 mb-2"
          >
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px]">
              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-emerald-300">
                {syncResults.map((r, i) => (
                  <span key={i}>{r}</span>
                ))}
              </div>
              {onSyncDismiss && (
                <button
                  onClick={onSyncDismiss}
                  className="ml-auto text-emerald-400/60 hover:text-emerald-400 transition-colors shrink-0"
                  aria-label="Dismiss sync results"
                >✕</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
