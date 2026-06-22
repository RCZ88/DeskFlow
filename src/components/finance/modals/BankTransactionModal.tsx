import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Landmark, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import { TransactionModalShell } from './TransactionModalShell';
import { useFormattedAmount } from './useFormattedAmount';
import { CategoryChipGrid } from './CategoryChipGrid';
import { getCurrencyInfo } from '../currency-data';
import { getLastType, getLastCategoryId, saveLastTxPrefs } from './txPrefs';
import type { FinanceWallet, FinanceAccount, FinanceCategory } from '../finance-types';

interface Props {
  open: boolean; onClose: () => void;
  wallet: FinanceWallet; accounts: FinanceAccount[]; categories: FinanceCategory[]; wallets: FinanceWallet[];
  displayCurrency: string; baseCurrency: string;
  onSubmit: (data: Record<string, any>) => Promise<boolean>;
  onCreateCategory: (data: { name: string; type: string; icon?: string; color?: string }) => Promise<boolean>;
}

const BANK_TYPES = ['income', 'expense', 'transfer'] as const;

export function BankTransactionModal({ open, onClose, wallet, categories, wallets, displayCurrency, baseCurrency, onSubmit, onCreateCategory }: Props) {
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const { display: amountDisplay, setFormatted: setAmount, numeric: amountNumeric, inputRef: amountRef } = useFormattedAmount();
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [toWalletId, setToWalletId] = useState<number | null>(null);
  const [fromWalletId, setFromWalletId] = useState<number | null>(null);

  const resetFields = useCallback(() => {
    setAmount(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]); setNote(''); setShowNote(false); setToWalletId(null); setFromWalletId(null);
  }, [setAmount]);

  useEffect(() => {
    if (open) {
      const lastType = getLastType('bank');
      setType(lastType && (BANK_TYPES as readonly string[]).includes(lastType) ? lastType as any : 'expense');
      const lastCat = getLastCategoryId('bank');
      setCategoryId(lastCat && categories.some(c => c.id === lastCat && !c.is_archived) ? lastCat : null);
      resetFields();
      if (open) setFromWalletId(wallet.id); // set source to current wallet
    }
  }, [open, categories, resetFields, wallet.id]);

  const sym = getCurrencyInfo(displayCurrency).symbol;
  const meta = (wallet.metadata as any) || {};
  const wacc = wallet.currency || baseCurrency;
  const filtered = categories.filter(c => c.type === type && !c.is_archived);
  const allWallets = wallets.filter(w => !w.is_archived);
  const destOptions = allWallets.filter(w => w.id !== fromWalletId);
  const srcOptions = allWallets.filter(w => w.id !== toWalletId);

  const handleSubmit = async () => {
    if (!amountNumeric) return false;
    if (type !== 'transfer' && !categoryId) return false;
    if (type === 'transfer' && (!fromWalletId || !toWalletId)) return false;

    const amt = Math.abs(amountNumeric);

    // Transfer = expense on source + income on destination (double-entry, linked by transferId)
    if (type === 'transfer') {
      const sourceWallet = allWallets.find(w => w.id === fromWalletId);
      const destWallet = allWallets.find(w => w.id === toWalletId);
      if (!sourceWallet || !destWallet) return false;
      const transferId = `txfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const desc = description ? `: ${description}` : '';
      await onSubmit({
        account_id: sourceWallet.account_id, wallet_id: sourceWallet.id, category_id: categoryId || 0,
        type: 'expense', amount: -amt, description: `Transfer to ${destWallet.name}${desc}`, note, date, to_wallet_id: toWalletId, transfer_id: transferId,
      });
      await onSubmit({
        account_id: destWallet.account_id, wallet_id: destWallet.id, category_id: categoryId || 0,
        type: 'income', amount: amt, description: `Transfer from ${sourceWallet.name}${desc}`, date, from_wallet_id: sourceWallet.id, transfer_id: transferId,
      });
    } else {
      const txAmt = type === 'expense' ? -amt : amt;
      await onSubmit({ account_id: wallet.account_id, wallet_id: wallet.id, category_id: categoryId!, type, amount: txAmt, description, note, date });
    }

    saveLastTxPrefs('bank', type, categoryId);
    resetFields();
    setCategoryId(categoryId);
    setFromWalletId(wallet.id);
    return true;
  };

  return (
    <TransactionModalShell open={open} onClose={onClose} accent="#3B82F6" IconComponent={Landmark} title="Add Transaction" typeLabel="Bank"
      onSubmit={handleSubmit} onReset={resetFields}>
      {() => (
        <>
          {(meta.bank_name || wallet.last_four) && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-[#3B82F6]/5 rounded-lg border border-[#3B82F6]/10 text-[11px]">
              {meta.bank_name && <span className="font-medium text-zinc-300">{meta.bank_name}</span>}
              {wallet.last_four && <span className="text-zinc-500">••••{wallet.last_four}</span>}
              <span className="ml-auto text-zinc-500">Balance: <span className="text-white font-medium tabular-nums">{getCurrencyInfo(wacc).symbol}{wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
            </div>
          )}
          <div className="flex items-center gap-1.5 mb-1">
            {BANK_TYPES.map(t => (
              <button key={t} onClick={() => { setType(t); setCategoryId(null); setToWalletId(null); }}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  type === t ? 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200'
                }`}>{t === 'income' ? <><ArrowUpRight className="w-3 h-3" /> Income</> : t === 'expense' ? <><ArrowDownRight className="w-3 h-3" /> Expense</> : <><ArrowLeftRight className="w-3 h-3" /> Transfer</>}</button>
            ))}
          </div>

          {type === 'transfer' && (
            <div className="space-y-2">
              <select value={fromWalletId ?? ''} onChange={e => { const v = Number(e.target.value); setFromWalletId(v); if (v === toWalletId) setToWalletId(null); }}
                className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50">
                <option value="" disabled>From wallet...</option>
                {srcOptions.map(w => (<option key={w.id} value={w.id}>{w.name} ({w.type})</option>))}
              </select>
              <span className="flex justify-center"><ArrowLeftRight className="w-4 h-4 text-zinc-600" /></span>
              <select value={toWalletId ?? ''} onChange={e => { const v = Number(e.target.value); setToWalletId(v); if (v === fromWalletId) setFromWalletId(null); }}
                className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50">
                <option value="" disabled>To wallet...</option>
                {destOptions.map(w => (<option key={w.id} value={w.id}>{w.name} ({w.type})</option>))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/50 rounded-lg pl-4 pr-3 py-3 focus-within:ring-2 focus-within:ring-[#3B82F6]/50">
            <span className="text-xl font-semibold text-zinc-500 tabular-nums shrink-0">{getCurrencyInfo(wacc).symbol}</span>
            <input ref={amountRef} type="text" inputMode="decimal" value={amountDisplay} onChange={e => setAmount(e.target.value, e.target.selectionStart ?? undefined)} placeholder="0" autoFocus
              className="w-full bg-transparent text-xl font-semibold tabular-nums text-white placeholder-zinc-600 outline-none text-right" />
          </div>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description"
            className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50" />

          {type !== 'transfer' && (
            <CategoryChipGrid categories={filtered} selectedId={categoryId} onSelect={setCategoryId} accent="#3B82F6" onCreateCategory={onCreateCategory} categoryType={type} />
          )}

          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50" />
          {type !== 'transfer' && (
            <>
              <button onClick={() => setShowNote(!showNote)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                {showNote ? 'Hide notes' : '+ Add notes'}
              </button>
              {showNote && (
                <motion.textarea initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} value={note} onChange={e => setNote(e.target.value)} placeholder="Notes..." rows={2}
                  className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50 resize-none" />
              )}
            </>
          )}
        </>
      )}
    </TransactionModalShell>
  );
}
