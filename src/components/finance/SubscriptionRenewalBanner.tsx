import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Calendar, Check, X, SkipForward } from 'lucide-react';
import { getCurrencyInfo } from './currency-data';
import type { FinanceSubscription } from './finance-types';

interface SubscriptionRenewalBannerProps {
  upcomingRenewals: FinanceSubscription[];
  displayCurrency: string;
  onGenerateTransactions: () => Promise<{ created: number; subscriptions: { subId: number; txnId: number; name: string; amount: number }[] }>;
  onSkipRenewal?: (id: number) => Promise<boolean>;
  onRefresh: () => void;
}

export function SubscriptionRenewalBanner({
  upcomingRenewals, displayCurrency, onGenerateTransactions, onSkipRenewal, onRefresh,
}: SubscriptionRenewalBannerProps) {
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [skippingIds, setSkippingIds] = useState<Set<number>>(new Set());

  if (dismissed || upcomingRenewals.length === 0) return null;

  const visible = upcomingRenewals.filter(r => !skippingIds.has(r.id));
  if (visible.length === 0) return null;

  const symbol = getCurrencyInfo(displayCurrency).symbol;
  const total = visible.reduce((s, r) => s + r.price, 0);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await onGenerateTransactions();
      if (result.created > 0) {
        setSuccess(true);
        setTimeout(() => { setDismissed(true); onRefresh(); }, 2000);
      }
    } catch {} finally { setGenerating(false); }
  };

  const handleSkip = async (id: number) => {
    if (!onSkipRenewal) return;
    setSkippingIds(prev => new Set(prev).add(id));
    try {
      await onSkipRenewal(id);
    } catch {} finally {
      onRefresh();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <RefreshCw className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-zinc-100">
                {success ? 'Transactions Created' : 'Subscriptions Due for Renewal'}
              </h4>
              {!success && (
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {visible.length} subscription{visible.length > 1 ? 's' : ''} totalling {symbol}{total.toFixed(2)} need attention
                </p>
              )}
            </div>
            {!success && (
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-all font-medium disabled:opacity-40 flex items-center gap-1.5"
                >
                  {generating ? (
                    <div className="w-3.5 h-3.5 border-2 border-indigo-300/30 border-t-indigo-300 rounded-full animate-spin" />
                  ) : (
                    <><Check className="w-3 h-3" /> Pay All</>
                  )}
                </button>
                <button onClick={() => setDismissed(true)}
                  className="text-[10px] px-2 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {!success && visible.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {visible.slice(0, 5).map(sub => (
                <div key={sub.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span className="text-xs text-zinc-300 truncate">{sub.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-zinc-400 tabular-nums">
                      {symbol}{Math.abs(sub.price).toFixed(2)}
                    </span>
                    {sub.next_renewal_date && (
                      <span className="text-[10px] text-zinc-600">{sub.next_renewal_date.slice(5)}</span>
                    )}
                    {onSkipRenewal && (
                      <button
                        onClick={() => handleSkip(sub.id)}
                        className="text-[10px] px-1.5 py-1 rounded-lg bg-zinc-700/40 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60 transition-colors"
                        title="Skip this renewal"
                      >
                        <SkipForward className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {visible.length > 5 && (
                <p className="text-[10px] text-zinc-600 text-center pt-1">
                  +{visible.length - 5} more
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
