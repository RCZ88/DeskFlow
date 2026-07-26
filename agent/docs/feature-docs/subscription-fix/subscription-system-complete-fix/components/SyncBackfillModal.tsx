// ============================================================================
// SyncBackfillModal.tsx
// src/components/finance/SyncBackfillModal.tsx
// ============================================================================
// When syncing an old subscription, asks user: backfill individually or one adjustment?
// ============================================================================

import React, { useState } from 'react';
import { X, Layers, GitCommit, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  subscription: {
    id: number;
    name: string;
    price: number;
    currency: string;
    start_date?: string;
    billing_cycle: string;
  };
  missingMonths: number;
  totalAmount: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: 'individual' | 'adjustment') => void;
  displayCurrency: string;
}

export default function SyncBackfillModal({
  subscription, missingMonths, totalAmount, isOpen, onClose, onConfirm, displayCurrency
}: Props) {
  const [selectedMode, setSelectedMode] = useState<'individual' | 'adjustment'>('adjustment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: displayCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(val);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(selectedMode);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Sync Payments</h3>
            <p className="text-xs text-zinc-500">{subscription.name}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="bg-amber-950/30 border border-amber-900/30 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-amber-300 font-medium">Old Subscription Detected</p>
                <p className="text-[10px] text-amber-400/70 mt-0.5">
                  Started {subscription.start_date ? new Date(subscription.start_date).toLocaleDateString('id-ID') : 'unknown'}. 
                  {missingMonths} months need to be backfilled.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-400 mb-3">How would you like to handle the past {missingMonths} months?</p>

          {/* Option A: Adjustment */}
          <button
            onClick={() => setSelectedMode('adjustment')}
            className={`w-full text-left p-3 rounded-lg border transition-all mb-2 ${
              selectedMode === 'adjustment'
                ? 'bg-violet-950/30 border-violet-500/50'
                : 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                selectedMode === 'adjustment' ? 'border-violet-500 bg-violet-500' : 'border-zinc-600'
              }`}>
                {selectedMode === 'adjustment' && <CheckCircle size={12} className="text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-violet-400" />
                  <span className="text-sm font-medium text-zinc-200">One Adjustment</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Create ONE transaction for {formatCurrency(totalAmount)} covering all {missingMonths} months.
                  Simple and clean.
                </p>
              </div>
            </div>
          </button>

          {/* Option B: Individual */}
          <button
            onClick={() => setSelectedMode('individual')}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              selectedMode === 'individual'
                ? 'bg-violet-950/30 border-violet-500/50'
                : 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                selectedMode === 'individual' ? 'border-violet-500 bg-violet-500' : 'border-zinc-600'
              }`}>
                {selectedMode === 'individual' && <CheckCircle size={12} className="text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <GitCommit size={14} className="text-violet-400" />
                  <span className="text-sm font-medium text-zinc-200">Individual Transactions</span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Create {missingMonths} separate transactions, one per month. 
                  More detailed but takes longer.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {isSubmitting ? 'Syncing...' : `Sync ${selectedMode === 'adjustment' ? 'Adjustment' : `${missingMonths} Payments`}`}
          </button>
        </div>
      </div>
    </div>
  );
}
