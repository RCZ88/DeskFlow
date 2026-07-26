// ============================================================================
// SubscriptionCard.tsx
// src/components/finance/SubscriptionCard.tsx
// ============================================================================
// Enhanced subscription card with payment status, history button, and actions
// ============================================================================

import React, { useState } from 'react';
import {
  Edit3, Trash2, RotateCcw, CreditCard, Calendar, Zap, AlertTriangle,
  CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, History
} from 'lucide-react';

interface Subscription {
  id: number;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billing_cycle: string;
  start_date?: string;
  next_renewal_date?: string;
  cancel_url?: string;
  cancel_reminder_days?: number;
  reminder_note?: string;
  status: string;
  payment_status?: string;
  last_payment_date?: string;
  last_payment_txn_id?: number;
  autodebet?: number;
  wallet_id?: number;
  wallet_name?: string;
  category_id?: number;
  category_name?: string;
  category_color?: string;
}

interface Props {
  subscription: Subscription;
  wallets: Array<{ id: number; name: string; balance: number }>;
  displayCurrency: string;
  onEdit: (sub: Subscription) => void;
  onDelete: (id: number) => void;
  onToggleAutodebet: (id: number) => void;
  onRecordPayment: (sub: Subscription) => void;
  onRetryPayment: (sub: Subscription) => void;
  onViewHistory: (sub: Subscription) => void;
  onSync: (sub: Subscription) => void;
}

export default function SubscriptionCard({
  subscription, wallets, displayCurrency,
  onEdit, onDelete, onToggleAutodebet, onRecordPayment,
  onRetryPayment, onViewHistory, onSync
}: Props) {
  const [showActions, setShowActions] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: displayCurrency, minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })} (overdue)`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    return d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'paid': return 'text-emerald-400 bg-emerald-950/30 border-emerald-900/30';
      case 'failed': return 'text-red-400 bg-red-950/30 border-red-900/30';
      case 'pending': return 'text-amber-400 bg-amber-950/30 border-amber-900/30';
      case 'cancelled': return 'text-zinc-400 bg-zinc-800/30 border-zinc-800/30';
      default: return 'text-zinc-400 bg-zinc-800/30 border-zinc-800/30';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={12} />;
      case 'failed': return <XCircle size={12} />;
      case 'pending': return <Clock size={12} />;
      case 'cancelled': return <AlertTriangle size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const isOverdue = subscription.next_renewal_date
    ? new Date(subscription.next_renewal_date) < new Date()
    : false;

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSync(subscription);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-zinc-800 overflow-hidden transition-all hover:border-zinc-700">
      {/* Main Card */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          {/* Left: Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-zinc-100 truncate">{subscription.name}</h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusColor(subscription.payment_status)} flex items-center gap-1`}>
                {getStatusIcon(subscription.payment_status)}
                {subscription.payment_status || 'pending'}
              </span>
              {isOverdue && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/30 border border-red-900/30 text-red-400">
                  Overdue
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
              <span className="font-medium text-zinc-300">{formatCurrency(subscription.price)}</span>
              <span>/ {subscription.billing_cycle}</span>
              {subscription.wallet_name && (
                <span className="flex items-center gap-1">
                  <CreditCard size={10} />
                  {subscription.wallet_name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[10px] text-zinc-600 mt-2">
              <span className="flex items-center gap-1">
                <Calendar size={10} />
                Next: {formatDate(subscription.next_renewal_date)}
              </span>
              {subscription.last_payment_date && (
                <span className="flex items-center gap-1">
                  <CheckCircle size={10} className="text-emerald-500/50" />
                  Last paid: {new Date(subscription.last_payment_date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions Toggle */}
          <button
            onClick={() => setShowActions(!showActions)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          >
            {showActions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Quick Actions Row */}
        <div className="flex items-center gap-2 mt-3">
          {/* Autodebet Toggle */}
          <button
            onClick={() => onToggleAutodebet(subscription.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
              subscription.autodebet
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-zinc-800/50 text-zinc-500 border border-zinc-800/50'
            }`}
          >
            <Zap size={10} className={subscription.autodebet ? 'fill-violet-400' : ''} />
            {subscription.autodebet ? 'Auto' : 'Manual'}
          </button>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-800/50 hover:bg-zinc-800 hover:text-zinc-300 transition-all disabled:opacity-50"
          >
            <RotateCcw size={10} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>

          {/* History Button */}
          <button
            onClick={() => onViewHistory(subscription)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-800/50 hover:bg-zinc-800 hover:text-zinc-300 transition-all"
          >
            <History size={10} />
            History
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Record Payment */}
          <button
            onClick={() => onRecordPayment(subscription)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
          >
            <CreditCard size={10} />
            Pay
          </button>

          {/* Retry (if failed) */}
          {subscription.payment_status === 'failed' && (
            <button
              onClick={() => onRetryPayment(subscription)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all"
            >
              <RotateCcw size={10} />
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Expanded Actions */}
      {showActions && (
        <div className="px-4 pb-4 border-t border-zinc-800/50 pt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(subscription)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-800/50 hover:bg-zinc-800 hover:text-zinc-300 transition-all"
            >
              <Edit3 size={10} />
              Edit
            </button>
            <button
              onClick={() => onDelete(subscription.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-red-950/20 text-red-400 border border-red-900/20 hover:bg-red-950/40 transition-all"
            >
              <Trash2 size={10} />
              Delete
            </button>
            {subscription.cancel_url && (
              <a
                href={subscription.cancel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-800/50 hover:bg-zinc-800 hover:text-zinc-300 transition-all"
              >
                <AlertTriangle size={10} />
                Cancel Service
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
