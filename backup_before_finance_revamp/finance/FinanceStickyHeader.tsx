import { Lock as LockIcon, Unlock as UnlockIcon, Wallet as WalletIcon, Eye, EyeOff } from 'lucide-react';
import { formatCurrency as fmtCurrency } from './currency-data';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';

interface FinanceStickyHeaderProps {
  isLocked: boolean;
  netWorth: number;
  displayCurrency: string;
  onToggleLock: () => void;
}

export function FinanceStickyHeader({ isLocked, netWorth, displayCurrency, onToggleLock }: FinanceStickyHeaderProps) {
  const { showNumbers, setShowNumbers } = useNumberMask();
  return (
    <div className="sticky top-0 z-[var(--z-sticky)] h-14 flex items-center justify-between px-5 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <WalletIcon className="w-4 h-4 text-emerald-400" />
        </div>
        <h1 className="text-lg font-semibold text-white">Finance</h1>
        {!isLocked && (
          <div className="flex items-center gap-1.5 ml-3">
            <span className="text-xs text-zinc-400">Net Worth</span>
            <span className={`text-sm font-semibold ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
               {showNumbers ? fmtCurrency(netWorth, displayCurrency) : maskNumber(fmtCurrency(netWorth, displayCurrency))}
            </span>
          </div>
        )}
      </div>

        <div className="flex items-center gap-2">
          {/* Hide/Show Numbers toggle */}
          <button
            onClick={() => setShowNumbers(!showNumbers)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950 ${showNumbers ? 'bg-zinc-800 text-zinc-300' : 'bg-emerald-500/15 text-emerald-400'}`}
            aria-pressed={showNumbers}
            aria-label="Toggle hide numbers"
          >
            {showNumbers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="text-xs">{showNumbers ? 'Hide' : 'Show'} numbers</span>
          </button>
          <button
            onClick={onToggleLock}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${isLocked
                ? 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
              }`}
          >
            {isLocked ? <LockIcon className="w-3.5 h-3.5" /> : <UnlockIcon className="w-3.5 h-3.5" />}
            {isLocked ? 'Locked' : 'Unlocked'}
          </button>
        </div>
    </div>
  );
}
