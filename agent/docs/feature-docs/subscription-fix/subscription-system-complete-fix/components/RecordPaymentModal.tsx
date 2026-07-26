// ============================================================================
// RecordPaymentModal.tsx
// src/components/finance/RecordPaymentModal.tsx
// ============================================================================
// Modal with date picker to record a payment for a specific month
// ============================================================================

import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertTriangle, CheckCircle, Wallet } from 'lucide-react';

interface Props {
  subscription: {
    id: number;
    name: string;
    price: number;
    currency: string;
    billing_cycle: string;
    wallet_id: number;
    start_date?: string;
  };
  wallets: Array<{ id: number; name: string; balance: number }>;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { subscriptionId: number; walletId: number; amount: number; date: string; note?: string }) => void;
  displayCurrency: string;
}

export default function RecordPaymentModal({ 
  subscription, wallets, isOpen, onClose, onSubmit, displayCurrency 
}: Props) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(subscription?.wallet_id || 0);
  const [amount, setAmount] = useState(String(subscription?.price || 0));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && subscription) {
      // Default to the subscription's billing day in current month
      const startDate = subscription.start_date ? new Date(subscription.start_date) : new Date();
      const day = startDate.getDate();
      const today = new Date();
      const defaultDate = new Date(today.getFullYear(), today.getMonth(), day);
      if (defaultDate > today) {
        defaultDate.setMonth(defaultDate.getMonth() - 1);
      }
      setSelectedDate(defaultDate.toISOString().slice(0, 10));
      setSelectedWallet(subscription.wallet_id || 0);
      setAmount(String(subscription.price || 0));
      setNote('');
      setError('');
    }
  }, [isOpen, subscription]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: displayCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(val);
  };

  const selectedWalletObj = wallets.find(w => w.id === selectedWallet);
  const hasSufficientBalance = selectedWalletObj && (selectedWalletObj.balance || 0) >= parseFloat(amount || '0');

  const handleSubmit = async () => {
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!selectedWallet) {
      setError('Please select a wallet');
      return;
    }
    if (!hasSufficientBalance) {
      setError(`Insufficient balance — need ${formatCurrency(parseFloat(amount))}, have ${formatCurrency(selectedWalletObj?.balance || 0)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        subscriptionId: subscription.id,
        walletId: selectedWallet,
        amount: parseFloat(amount),
        date: selectedDate,
        note: note || undefined,
      });
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !subscription) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Record Payment</h3>
            <p className="text-xs text-zinc-500">{subscription.name}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Date Picker */}
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block flex items-center gap-1">
              <Calendar size={12} />
              Payment Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <p className="text-[10px] text-zinc-600 mt-1">Select the billing date for this payment</p>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500 transition-colors"
              placeholder="0"
            />
          </div>

          {/* Wallet Selector */}
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block flex items-center gap-1">
              <Wallet size={12} />
              Pay From
            </label>
            <select
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500 transition-colors"
            >
              {wallets.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} — {formatCurrency(w.balance || 0)}
                </option>
              ))}
            </select>
            {selectedWalletObj && (
              <div className={`text-[10px] mt-1 flex items-center gap-1 ${hasSufficientBalance ? 'text-emerald-400' : 'text-red-400'}`}>
                {hasSufficientBalance ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                {hasSufficientBalance ? 'Sufficient balance' : `Need ${formatCurrency(parseFloat(amount || '0'))}, have ${formatCurrency(selectedWalletObj.balance || 0)}`}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500 transition-colors"
              placeholder="e.g., Manual payment for July"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg p-2 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              {error}
            </div>
          )}
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
            onClick={handleSubmit}
            disabled={isSubmitting || !hasSufficientBalance}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
