import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import { getCurrencyInfo } from './currency-data';
import type { FinanceAccount, FinanceCategory, FinanceWallet } from './finance-types';

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  wallets: FinanceWallet[];
  displayCurrency: string;
  onSave: (data: {
    account_id: number;
    wallet_id: number | null;
    category_id: number;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    description: string;
    note: string;
    date: string;
  }) => Promise<boolean>;
}

export function QuickAddModal({ open, onClose, accounts, categories, wallets, displayCurrency, onSave }: QuickAddModalProps) {
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [walletId, setWalletId] = useState<number | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [showNote, setShowNote] = useState(false);

  useEffect(() => {
    if (open) {
      setType('expense');
      setAmount('');
      setDescription('');
      setNote('');
      setCategoryId(null);
      setAccountId(accounts[0]?.id ?? null);
      setWalletId(null);
      setDate(new Date().toISOString().split('T')[0]);
      setShowNote(false);
    }
  }, [open, accounts]);

  const filteredCategories = categories.filter(c => c.type === type && !c.is_archived);
  const accountWallets = wallets.filter(w => w.account_id === accountId && !w.is_archived);

  const handleSave = async () => {
    if (!amount || !categoryId || !accountId) return;
    setSaving(true);
    const ok = await onSave({
      account_id: accountId,
      wallet_id: walletId,
      category_id: categoryId,
      type,
      amount: type === 'expense' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)),
      description,
      note,
      date,
    });
    setSaving(false);
    if (ok) onClose();
  };

  const typeConfig = {
    income: { icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Income' },
    expense: { icon: ArrowDownRight, color: 'text-red-400', bg: 'bg-red-500/15', label: 'Expense' },
    transfer: { icon: ArrowLeftRight, color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Transfer' },
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[var(--z-modal)] flex items-center justify-center p-5"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Add Transaction</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-1.5 mb-4">
              {(Object.keys(typeConfig) as Array<'income' | 'expense' | 'transfer'>).map((t) => {
                const cfg = typeConfig[t];
                return (
                  <button
                    key={t}
                    onClick={() => { setType(t); setCategoryId(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      type === t ? `${cfg.bg} ${cfg.color}` : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <cfg.icon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">{getCurrencyInfo(displayCurrency).symbol}</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg pl-7 pr-3 py-3 text-lg font-semibold text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />

              <div className="flex gap-2">
                <select
                  value={accountId ?? ''}
                  onChange={(e) => { setAccountId(Number(e.target.value)); setWalletId(null); }}
                  className="flex-1 bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="" disabled>Account</option>
                  {accounts.filter(a => !a.is_archived).map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>

                {accountWallets.length > 0 && (
                  <select
                    value={walletId ?? ''}
                    onChange={(e) => setWalletId(e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">Wallet (opt)</option>
                    {accountWallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />

              <div className="flex flex-wrap gap-1.5">
                {filteredCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      categoryId === cat.id
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowNote(!showNote)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showNote ? 'Hide notes' : '+ Add notes'}
              </button>

              {showNote && (
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Notes..."
                  rows={2}
                  className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                />
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !amount || !categoryId || !accountId}
                className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Plus className="w-3.5 h-3.5" /> Add</>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
