// ============================================================================
// PaymentHistoryModal.tsx
// src/components/finance/PaymentHistoryModal.tsx
// ============================================================================
// Shows all payments (paid/failed/cancelled/upcoming) for a subscription
// ============================================================================

import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, Clock, Calendar, AlertTriangle, RotateCcw } from 'lucide-react';

interface PaymentRecord {
  date: string;
  status: 'paid' | 'failed' | 'cancelled' | 'upcoming' | 'unpaid';
  amount: number;
  txnId?: number;
  reversalId?: number;
}

interface Props {
  subscription: {
    id: number;
    name: string;
    price: number;
    currency: string;
    billing_cycle: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onRetry: (date: string) => void;
  onCancel: (txnId: number) => void;
  displayCurrency: string;
}

export default function PaymentHistoryModal({ 
  subscription, isOpen, onClose, onRetry, onCancel, displayCurrency 
}: Props) {
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !subscription.id) return;
    fetchHistory();
  }, [isOpen, subscription.id]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const result = await window.electron.invoke('subscriptions:get-payment-history', subscription.id);
      if (result.success) {
        setHistory(result.paymentHistory || []);
        setTransactions(result.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: displayCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'failed': return <XCircle size={14} className="text-red-400" />;
      case 'cancelled': return <AlertTriangle size={14} className="text-amber-400" />;
      case 'upcoming': return <Calendar size={14} className="text-blue-400" />;
      case 'unpaid': return <Clock size={14} className="text-zinc-500" />;
      default: return <Clock size={14} className="text-zinc-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-emerald-400 bg-emerald-950/30 border-emerald-900/30';
      case 'failed': return 'text-red-400 bg-red-950/30 border-red-900/30';
      case 'cancelled': return 'text-amber-400 bg-amber-950/30 border-amber-900/30';
      case 'upcoming': return 'text-blue-400 bg-blue-950/30 border-blue-900/30';
      case 'unpaid': return 'text-zinc-400 bg-zinc-800/30 border-zinc-800/30';
      default: return 'text-zinc-400 bg-zinc-800/30 border-zinc-800/30';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{subscription.name}</h3>
            <p className="text-xs text-zinc-500">{formatCurrency(subscription.price)} / {subscription.billing_cycle}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-zinc-500 text-sm">Loading...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No payment history yet</div>
          ) : (
            history.map((record, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(record.status)}`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(record.status)}
                  <div>
                    <div className="text-xs font-medium text-zinc-200">{formatDate(record.date)}</div>
                    <div className="text-[10px] text-zinc-500 capitalize">{record.status}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-zinc-200">{formatCurrency(record.amount)}</div>
                  {record.status === 'failed' && (
                    <button
                      onClick={() => onRetry(record.date)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                    >
                      <RotateCcw size={10} />
                      Retry
                    </button>
                  )}
                  {record.status === 'paid' && record.txnId && (
                    <button
                      onClick={() => onCancel(record.txnId!)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-1"
                    >
                      <XCircle size={10} />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="p-4 border-t border-zinc-800">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-zinc-800/50 rounded-lg p-2">
              <div className="text-lg font-bold text-emerald-400">
                {history.filter(h => h.status === 'paid').length}
              </div>
              <div className="text-[10px] text-zinc-500">Paid</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2">
              <div className="text-lg font-bold text-red-400">
                {history.filter(h => h.status === 'failed').length}
              </div>
              <div className="text-[10px] text-zinc-500">Failed</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2">
              <div className="text-lg font-bold text-zinc-400">
                {history.filter(h => h.status === 'unpaid').length}
              </div>
              <div className="text-[10px] text-zinc-500">Unpaid</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
