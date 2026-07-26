import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, ExternalLink, Bell, BellOff, Calendar, Wallet, CreditCard, RefreshCw, X, Check, AlertTriangle, DollarSign, ArrowUpRight } from 'lucide-react';
import { GlassSurface } from './_fx/GlassSurface';
import { formatCurrency } from './currency-data';
import { SubscriptionModal } from './SubscriptionModal';
import type { FinanceSubscription, FinanceWallet } from './finance-types';

interface Props {
  subscriptions: FinanceSubscription[];
  wallets: FinanceWallet[];
  displayCurrency: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onCreate: (data: any) => Promise<boolean>;
  onUpdate: (data: any) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
  onRecordPayment?: (sub: FinanceSubscription) => Promise<void>;
  onNavigateToPage?: () => void;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function getRenewalUrgency(days: number): { color: string; bg: string; label: string } {
  if (days < 0) return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Overdue' };
  if (days <= 3) return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: `${days}d` };
  if (days <= 7) return { color: '#f97316', bg: 'rgba(249,115,22,0.1)', label: `${days}d` };
  if (days <= 14) return { color: '#eab308', bg: 'rgba(234,179,8,0.1)', label: `${days}d` };
  if (days <= 30) return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: `${days}d` };
  return { color: '#52525b', bg: 'rgba(82,82,91,0.08)', label: `${days}d` };
}

function getWalletIcon(walletType: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    bank: <Wallet className="w-3.5 h-3.5" />,
    debit_card: <CreditCard className="w-3.5 h-3.5" />,
    credit_card: <CreditCard className="w-3.5 h-3.5" />,
    ewallet: <CreditCard className="w-3.5 h-3.5" />,
  };
  return icons[walletType] || <Wallet className="w-3.5 h-3.5" />;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  paused: { label: 'Paused', color: '#eab308', bg: 'rgba(234,179,8,0.08)' },
  cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  expired: { label: 'Expired', color: '#52525b', bg: 'rgba(82,82,91,0.08)' },
};

function computeMonthlyCost(sub: FinanceSubscription): number {
  const base = sub.price;
  switch (sub.billing_cycle) {
    case 'weekly': return base * 4.33;
    case 'monthly': return base;
    case 'quarterly': return base / 3;
    case 'yearly': return base / 12;
    case 'custom': return (base / (sub.billing_interval || 1));
    default: return base;
  }
}

export function SubscriptionsTab({ subscriptions, wallets, displayCurrency, loading, error, onRetry, onCreate, onUpdate, onDelete, onRecordPayment, onNavigateToPage }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<FinanceSubscription | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [recordingPayment, setRecordingPayment] = useState<number | null>(null);

  const walletMap = useMemo(() => {
    const m = new Map<number, FinanceWallet>();
    wallets.forEach(w => m.set(w.id, w));
    return m;
  }, [wallets]);

  const totalMonthly = useMemo(() =>
    subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + computeMonthlyCost(s), 0),
    [subscriptions]
  );

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return subscriptions;
    return subscriptions.filter(s => s.status === filterStatus);
  }, [subscriptions, filterStatus]);

  const grouped = useMemo(() => {
    const groups: Record<string, FinanceSubscription[]> = {};
    const order = ['active', 'paused', 'cancelled', 'expired'];
    order.forEach(st => {
      const items = filtered.filter(s => s.status === st);
      if (items.length > 0) groups[st] = items;
    });
    return groups;
  }, [filtered]);

  useEffect(() => { setConfirmDelete(null); }, [editingSub]);

  if (loading) {
    return (
      <GlassSurface className="p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading subscriptions...</span>
        </div>
      </GlassSurface>
    );
  }

  if (error) {
    return (
      <GlassSurface className="p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-zinc-400 mb-3">{error}</p>
        <button onClick={onRetry} className="text-xs px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
          Retry
        </button>
      </GlassSurface>
    );
  }

  return (
    <motion.div variants={{ enter: { opacity: 1, y: 0 }, center: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } }}
      initial="enter" animate="center" exit="exit" transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Subscriptions</h2>
        <div className="flex items-center gap-2">
          {onNavigateToPage && (
            <button onClick={onNavigateToPage}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors">
              <ArrowUpRight className="w-3 h-3" /> View all
            </button>
          )}
          <button onClick={() => { setEditingSub(null); setShowModal(true); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      {/* Monthly summary */}
      <GlassSurface className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Monthly spend</p>
            <p className="text-lg font-semibold text-white tabular-nums mt-0.5">{formatCurrency(totalMonthly, displayCurrency)}<span className="text-xs text-zinc-500 font-normal">/mo</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Yearly</p>
            <p className="text-sm font-medium text-zinc-300 tabular-nums mt-0.5">{formatCurrency(totalMonthly * 12, displayCurrency)}<span className="text-xs text-zinc-500 font-normal">/yr</span></p>
          </div>
        </div>
      </GlassSurface>

      {/* Status filter pills */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'All', count: subscriptions.length },
          ...Object.entries(statusConfig).map(([k, v]) => ({ key: k, label: v.label, count: subscriptions.filter(s => s.status === k).length })),
        ].filter(x => x.count > 0 || x.key === 'all').map(opt => (
          <button key={opt.key} onClick={() => setFilterStatus(opt.key)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${filterStatus === opt.key ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {opt.label}{opt.count > 0 && opt.key !== 'all' ? ` (${opt.count})` : ''}
          </button>
        ))}
      </div>

      {/* Subscription list */}
      {subscriptions.length === 0 ? (
        <GlassSurface className="p-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <Bell className="w-5 h-5 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400 mb-1">No subscriptions yet</p>
          <p className="text-[11px] text-zinc-600 mb-4">Track your recurring payments and get cancel reminders</p>
          <button onClick={() => { setEditingSub(null); setShowModal(true); }}
            className="text-xs px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
            Add your first subscription
          </button>
        </GlassSurface>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([status, items]) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusConfig[status]?.color }} />
                <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-500">{statusConfig[status]?.label || status}</span>
                <span className="text-[10px] text-zinc-600">{items.length}</span>
              </div>
              <div className="space-y-1.5">
                {items.map(sub => {
                  const wallet = walletMap.get(sub.wallet_id);
                  const renewalDays = sub.next_renewal_date ? daysUntil(sub.next_renewal_date) : null;
                  const urgency = renewalDays !== null ? getRenewalUrgency(renewalDays) : null;
                  const isActive = sub.status === 'active';
                  return (
                    <GlassSurface key={sub.id} className="p-3.5 group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{sub.name}</span>
                            {sub.cancel_reminder_days > 0 && isActive && (
                              <Bell className="w-3 h-3 text-zinc-500 shrink-0" title={`Reminder ${sub.cancel_reminder_days} days before renewal`} />
                            )}
                            {sub.cancel_reminder_days === 0 && isActive && (
                              <BellOff className="w-3 h-3 text-zinc-600 shrink-0" title="No reminder" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {wallet && (
                              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                {getWalletIcon(wallet.type)}
                                {wallet.name}
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-600">{sub.description || sub.billing_cycle}</span>
                          </div>
                          {sub.next_renewal_date && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <Calendar className="w-3 h-3 text-zinc-600" />
                              <span className="text-[11px] text-zinc-500">Renews {formatDate(sub.next_renewal_date)}</span>
                              {renewalDays !== null && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: urgency?.color, backgroundColor: urgency?.bg }}>
                                  {urgency?.label}
                                </span>
                              )}
                            </div>
                          )}
                          {sub.cancel_url && isActive && (
                            <a href={sub.cancel_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 mt-1 transition-colors"
                              onClick={e => e.stopPropagation()}>
                              <ExternalLink className="w-3 h-3" /> Cancel link
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-white tabular-nums">
                            {formatCurrency(sub.price, displayCurrency)}
                            <span className="text-[10px] text-zinc-500 font-normal">
                              /{sub.billing_cycle === 'monthly' ? 'mo' : sub.billing_cycle === 'yearly' ? 'yr' : sub.billing_cycle === 'weekly' ? 'wk' : sub.billing_cycle === 'quarterly' ? 'qtr' : `${sub.billing_interval}x`}
                            </span>
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isActive && onRecordPayment && (
                              <button onClick={async () => { setRecordingPayment(sub.id); await onRecordPayment(sub); setRecordingPayment(null); }}
                                disabled={recordingPayment === sub.id}
                                className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                                title="Record payment">
                                {recordingPayment === sub.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <button onClick={() => { setEditingSub(sub); setShowModal(true); }}
                              className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {confirmDelete === sub.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={async () => { await onDelete(sub.id); setConfirmDelete(null); }}
                                  className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setConfirmDelete(null)}
                                  className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(sub.id)}
                                className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-500 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </GlassSurface>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <SubscriptionModal
            subscription={editingSub}
            wallets={wallets}
            displayCurrency={displayCurrency}
            onClose={() => { setShowModal(false); setEditingSub(null); }}
            onSave={async (data) => {
              const ok = editingSub
                ? await onUpdate({ ...data, id: editingSub.id })
                : await onCreate(data);
              if (ok) { setShowModal(false); setEditingSub(null); }
              return ok;
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
