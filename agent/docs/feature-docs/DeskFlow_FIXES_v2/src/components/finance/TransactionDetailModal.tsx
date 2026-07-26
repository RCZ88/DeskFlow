import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowUpRight, ArrowDownRight, ArrowLeftRight,
  Calendar, Clock, Wallet, Landmark, Tag, RefreshCw,
  FileText, Hash, Trash2, Lock as LockIcon,
  ShoppingCart, Home, Car, Heart, Book, Coffee, Zap, Gift,
  Plane, Smartphone, Shirt, Utensils, Music, Gamepad, Monitor,
  Dumbbell, Droplets, Leaf, Wifi, Film, Train, Briefcase,
  DollarSign, PiggyBank, CreditCard, Banknote, Gem,
  Receipt, TrendingUp, TrendingDown,
} from 'lucide-react';
import { useNumberMask } from '../../context/NumberMaskContext';
import { maskNumber } from '../../utils/maskNumber';
import { convertAmount, formatCurrency as fmtCurrency } from './currency-data';
import type {
  FinanceTransaction, FinanceAccount, FinanceCategory, FinanceWallet,
} from './finance-types';

interface TransactionDetailModalProps {
  transaction: FinanceTransaction | null;
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  wallets: FinanceWallet[];
  displayCurrency: string;
  baseCurrency: string;
  onClose: () => void;
  onDelete?: (id: number) => Promise<boolean>;
  onVerifyPassword?: (password: string) => Promise<boolean>;
}

const ease = [0.16, 1, 0.3, 1];

const typeMeta: Record<string, { label: string; color: string; bg: string }> = {
  income: {
    label: 'Income',
    color: '#22c55e',
    bg: 'bg-emerald-500/15',
  },
  expense: {
    label: 'Expense',
    color: '#ef4444',
    bg: 'bg-red-500/15',
  },
  transfer: {
    label: 'Transfer',
    color: '#f59e0b',
    bg: 'bg-amber-500/15',
  },
};

function formatDateTime(dateStr: string, timeStr: string | null) {
  const d = new Date(dateStr + 'T00:00:00');
  const datePart = d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  if (!timeStr) return datePart;
  return `${datePart} at ${timeStr}`;
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CAT_ICONS: Record<string, React.ComponentType<any>> = {
  ShoppingCart, Home, Car, Heart, Book, Coffee, Zap, Gift,
  Plane, Smartphone, Shirt, Utensils, Music, Gamepad, Monitor,
  Dumbbell, Droplets, Leaf, Wifi, Film, Train, Briefcase,
  DollarSign, PiggyBank, CreditCard, Banknote, Landmark, Gem,
  Receipt, Wallet, TrendingUp, TrendingDown,
};

export function TransactionDetailModal({
  transaction,
  accounts,
  categories,
  wallets,
  displayCurrency,
  baseCurrency,
  onClose,
  onDelete,
  onVerifyPassword,
}: TransactionDetailModalProps) {
  const { showNumbers, maskMode, maskFixedValue } = useNumberMask();
  const [mounted, setMounted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (transaction) {
      const t = window.setTimeout(() => setMounted(true), 16);
      return () => window.clearTimeout(t);
    }
    setMounted(false);
  }, [transaction]);

  const close = useCallback(() => {
    setMounted(false);
    setConfirmDelete(false);
    setDeletePassword('');
    setDeletePasswordError('');
    window.setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const handleDelete = async () => {
    if (!transaction || !onDelete) return;
    setDeleting(true);
    await onDelete(transaction.id);
    setDeleting(false);
    close();
  };

  const handlePasswordDelete = async () => {
    if (!transaction || !onVerifyPassword || !deletePassword) return;
    setDeletePasswordError('');
    const valid = await onVerifyPassword(deletePassword);
    if (!valid) {
      setDeletePasswordError('Incorrect password');
      setDeleting(false);
      return;
    }
    setDeletePassword('');
    await handleDelete();
  };

  if (!transaction) return null;

  const category = categories.find(c => c.id === transaction.category_id);
  const account = accounts.find(a => a.id === transaction.account_id);
  const wallet = transaction.wallet_id
    ? wallets.find(w => w.id === transaction.wallet_id)
    : null;
  const type = typeMeta[transaction.type] || typeMeta.expense;

  const amountAbs = Math.abs(transaction.amount);
  const amountDisplay = convertAmount(amountAbs, baseCurrency, displayCurrency);
  const sign = transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : '';

  const fc = (v: number) => fmtCurrency(v, displayCurrency);
  const masked = (v: number) =>
    showNumbers ? fc(v) : maskNumber(fc(v), maskMode, maskFixedValue);

  const tags = transaction.tags
    ? transaction.tags.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <AnimatePresence>
      {transaction && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: mounted ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Transaction details"
        >
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={mounted
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 0, scale: 0.94, y: 12 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.25, ease }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-zinc-700/50 bg-zinc-900/95 backdrop-blur-xl overflow-hidden"
          >
            {/* Gradient sheen */}
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_40%)]" />

            <div className="relative p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${type.bg}`}>
                    {transaction.type === 'income' && <ArrowUpRight className="w-4 h-4" style={{ color: type.color }} />}
                    {transaction.type === 'expense' && <ArrowDownRight className="w-4 h-4" style={{ color: type.color }} />}
                    {transaction.type === 'transfer' && <ArrowLeftRight className="w-4 h-4" style={{ color: type.color }} />}
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${type.color}18`, color: type.color }}
                  >
                    {type.label}
                  </span>
                </div>
                <button
                  onClick={close}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Hero: amount + description */}
              <div className="mb-6">
                <p
                  className="text-3xl font-bold tracking-tight mb-1"
                  style={{ color: type.color }}
                >
                  {sign}{masked(amountDisplay)}
                </p>
                <p className="text-sm text-white font-medium">
                  {transaction.description || category?.name || 'Transaction'}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {formatDateTime(transaction.date, transaction.time)}
                </p>
              </div>

              {/* Context section */}
              <div className="space-y-2 mb-5">
                {category && (
                  <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-zinc-800/40">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${category.color}18` }}
                    >
                      {(() => {
                        const CatIcon = CAT_ICONS[category.icon as string] || Tag;
                        return <CatIcon className="w-3.5 h-3.5" style={{ color: category.color }} />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-zinc-500">Category</p>
                      <p className="text-xs text-zinc-200 font-medium">{category.name}</p>
                    </div>
                  </div>
                )}

                {account && (
                  <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-zinc-800/40">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-zinc-700/40">
                      <Landmark className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-zinc-500">Account</p>
                      <p className="text-xs text-zinc-200 font-medium">{account.name}</p>
                    </div>
                  </div>
                )}

                {wallet && (
                  <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-zinc-800/40">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-zinc-700/40">
                      <Wallet className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-zinc-500">Wallet</p>
                      <p className="text-xs text-zinc-200 font-medium">{wallet.name}</p>
                    </div>
                  </div>
                )}

                {/* Transfer paired wallet */}
                {transaction.transfer_id && (() => {
                  const partnerWalletId = (transaction as any).to_wallet_id
                    ? (transaction as any).to_wallet_id
                    : (transaction as any).from_wallet_id;
                  const isSource = (transaction as any).amount < 0 || (transaction as any).type === 'expense' || (transaction as any).type === 'transfer' && (transaction as any).amount < 0;
                  const partner = wallets.find(w => w.id === partnerWalletId);
                  if (!partner) return null;
                  return (
                    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-amber-400/80">
                          {isSource ? 'Sent to' : 'Received from'}
                        </p>
                        <p className="text-xs text-zinc-200 font-medium">{partner.name}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Details section */}
              {(transaction.note || tags.length > 0 || transaction.is_recurring) && (
                <div className="mb-5 space-y-3">
                  {transaction.note && (
                    <div className="flex items-start gap-3 py-2 px-3 rounded-lg bg-zinc-800/40">
                      <FileText className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] text-zinc-500 mb-0.5">Note</p>
                        <p className="text-xs text-zinc-300 leading-relaxed">{transaction.note}</p>
                      </div>
                    </div>
                  )}

                  {tags.length > 0 && (
                    <div className="flex items-start gap-3 py-2 px-3 rounded-lg bg-zinc-800/40">
                      <Tag className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] text-zinc-500 mb-1">Tags</p>
                        <div className="flex flex-wrap gap-1">
                          {tags.map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-700/50 text-zinc-300 border border-white/5"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {transaction.is_recurring && (
                    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-zinc-800/40">
                      <RefreshCw className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <div>
                        <p className="text-[11px] text-zinc-500">Recurring</p>
                        <p className="text-xs text-zinc-300">
                          Repeats {transaction.recurring_interval || 'periodically'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Meta section */}
              <div className="border-t border-white/5 pt-4 mb-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3 h-3 text-zinc-600" />
                    <div>
                      <p className="text-[10px] text-zinc-600">ID</p>
                      <p className="text-[10px] text-zinc-400 font-mono">#{transaction.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-zinc-600" />
                    <div>
                      <p className="text-[10px] text-zinc-600">Created</p>
                      <p className="text-[10px] text-zinc-400">{formatTimestamp(transaction.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Clock className="w-3 h-3 text-zinc-600" />
                    <div>
                      <p className="text-[10px] text-zinc-600">Updated</p>
                      <p className="text-[10px] text-zinc-400">{formatTimestamp(transaction.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {onDelete && (
                  <AnimatePresence mode="popLayout">
                    {confirmDelete ? (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, x: 4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 4 }}
                        transition={{ duration: 0.15, ease }}
                        className="flex items-center gap-2 flex-1"
                      >
                        {onVerifyPassword ? (
                          <div className="flex items-center gap-2 flex-1">
                            <div className="relative flex-1">
                              <input
                                type="password"
                                value={deletePassword}
                                onChange={(e) => { setDeletePassword(e.target.value); setDeletePasswordError(''); }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && deletePassword) handlePasswordDelete();
                                  if (e.key === 'Escape') { setConfirmDelete(false); setDeletePassword(''); setDeletePasswordError(''); }
                                }}
                                placeholder="Password"
                                autoFocus
                                className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                              />
                              {deletePasswordError && (
                                <p className="absolute top-full left-0 text-[9px] text-red-400 mt-0.5">{deletePasswordError}</p>
                              )}
                            </div>
                            <button
                              onClick={handlePasswordDelete}
                              disabled={deleting || !deletePassword}
                              className="px-3 py-2 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40 focus-visible:ring-2 ring-red-500/50 ring-offset-2 ring-offset-zinc-950"
                            >
                              {deleting ? '...' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => { setConfirmDelete(false); setDeletePassword(''); setDeletePasswordError(''); }}
                              className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={handleDelete}
                              disabled={deleting}
                              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40 focus-visible:ring-2 ring-red-500/50 ring-offset-2 ring-offset-zinc-950"
                            >
                              {deleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(false)}
                              className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </motion.div>
                    ) : (
                      <motion.button
                        key="delete"
                        layout
                        onClick={() => setConfirmDelete(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors focus-visible:ring-2 ring-red-500/50 ring-offset-2 ring-offset-zinc-950"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </motion.button>
                    )}
                  </AnimatePresence>
                )}

                <button
                  onClick={close}
                  className="ml-auto px-4 py-2 rounded-lg text-xs font-medium bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 transition-colors focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
