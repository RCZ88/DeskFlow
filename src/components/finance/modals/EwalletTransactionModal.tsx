import { useState, useEffect, useCallback } from 'react';
import { Smartphone, ArrowDownRight, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { TransactionModalShell } from './TransactionModalShell';
import { useFormattedAmount } from './useFormattedAmount';
import { CategoryChipGrid } from './CategoryChipGrid';
import { getCurrencyInfo } from '../currency-data';
import { getLastType, getLastCategoryId, saveLastTxPrefs } from './txPrefs';
import type { FinanceWallet, FinanceCategory } from '../finance-types';

interface Props {
  open: boolean; onClose: () => void;
  wallet: FinanceWallet; categories: FinanceCategory[]; wallets: FinanceWallet[];
  displayCurrency: string; baseCurrency: string;
  onSubmit: (data: Record<string, any>) => Promise<boolean>;
  onCreateCategory: (data: { name: string; type: string; icon?: string; color?: string }) => Promise<boolean>;
}

const TYPES = ['expense', 'topup', 'transfer'] as const;

export function EwalletTransactionModal({ open, onClose, wallet, categories, wallets, displayCurrency, baseCurrency, onSubmit, onCreateCategory }: Props) {
  const [type, setType] = useState<'expense' | 'topup' | 'transfer'>('expense');
  const { display: amountDisplay, setFormatted: setAmount, numeric: amountNumeric, inputRef } = useFormattedAmount();
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [toWalletId, setToWalletId] = useState<number | null>(null);
  const [fromWalletId, setFromWalletId] = useState<number | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);

  const resetFields = useCallback(() => {
    setAmount(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]); setToWalletId(null);
  }, [setAmount]);

  useEffect(() => {
    if (open) {
      const lastType = getLastType('ewallet');
      setType(lastType && (TYPES as readonly string[]).includes(lastType) ? lastType as any : 'expense');
      const lastCat = getLastCategoryId('ewallet');
      setCategoryId(lastCat && categories.some(c => c.id === lastCat && !c.is_archived) ? lastCat : null);
      resetFields();
      setFromWalletId(wallet.id);
      setTransferId(crypto.randomUUID());
    }
  }, [open, categories, resetFields, wallet.id]);

  const sym = getCurrencyInfo(displayCurrency).symbol;
  const meta = (wallet.metadata as any) || {};
  const catType = type === 'topup' ? 'income' : 'expense';
  const filtered = categories.filter(c => c.type === catType && !c.is_archived);
  const allWallets = wallets.filter(w => !w.is_archived);
  const destOptions = allWallets.filter(w => w.id !== fromWalletId);
  const srcOptions = allWallets.filter(w => w.id !== toWalletId);

  const handleSubmit = async () => {
    if (!amountNumeric) return false;
    if (type !== 'transfer' && !categoryId) return false;
    if (type === 'transfer' && (!fromWalletId || !toWalletId)) return false;
    const amt = Math.abs(amountNumeric);
    if (type === 'transfer') {
      const source = allWallets.find(w => w.id === fromWalletId);
      const dest = allWallets.find(w => w.id === toWalletId);
      if (!source || !dest) return false;
      const desc = description ? `: ${description}` : '';
      await onSubmit({ account_id: source.account_id, wallet_id: source.id, category_id: 0, type: 'expense', amount: -amt, description: `Transfer to ${dest.name}${desc}`, date, to_wallet_id: toWalletId, transfer_id: transferId });
      await onSubmit({ account_id: dest.account_id, wallet_id: dest.id, category_id: 0, type: 'income', amount: amt, description: `Transfer from ${source.name}${desc}`, date, from_wallet_id: source.id, transfer_id: transferId });
    } else {
      await onSubmit({ account_id: wallet.account_id, wallet_id: wallet.id, category_id: categoryId!, type: catType, amount: type === 'expense' ? -amt : amt, description, date, metadata: { ewallet_type: type } });
    }
    saveLastTxPrefs('ewallet', type, categoryId);
    resetFields(); setCategoryId(categoryId); setFromWalletId(wallet.id);
    if (type === 'transfer') setTransferId(crypto.randomUUID());
    return true;
  };

  return (
    <TransactionModalShell open={open} onClose={onClose} accent="#06B6D4" IconComponent={Smartphone} title="Add Transaction" typeLabel="E-Wallet" onSubmit={handleSubmit} onReset={resetFields}>
      {() => (<>
        {(meta.platform || meta.daily_limit) && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-[#06B6D4]/5 rounded-lg border border-[#06B6D4]/10 text-[11px]">
            {meta.platform && <span className="font-medium text-zinc-300">{meta.platform}</span>}
            {meta.daily_limit && <span className="ml-auto text-zinc-500">Daily limit: <span className="text-white font-medium tabular-nums">{sym}{Number(meta.daily_limit).toLocaleString()}</span></span>}
          </div>
        )}
        <div className="flex items-center gap-1.5 mb-1">
          {TYPES.map(t => (<button key={t} onClick={() => setType(t)} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${type === t ? 'bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200'}`}>{t === 'expense' ? <><ArrowDownRight className="w-3 h-3"/> Expense</> : t === 'topup' ? <><ArrowUpRight className="w-3 h-3"/> Top-up</> : <><ArrowLeftRight className="w-3 h-3"/> Transfer</>}</button>))}
        </div>
        {type === 'transfer' && (
          <div className="space-y-2">
            <select value={fromWalletId ?? ''} onChange={e => { const v = Number(e.target.value); setFromWalletId(v); if (v === toWalletId) setToWalletId(null); }}
              className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/50">
              <option value="" disabled>From wallet...</option>
              {srcOptions.map(w => (<option key={w.id} value={w.id}>{w.name} ({w.type})</option>))}
            </select>
            <span className="flex justify-center"><ArrowLeftRight className="w-4 h-4 text-zinc-600" /></span>
            <select value={toWalletId ?? ''} onChange={e => { const v = Number(e.target.value); setToWalletId(v); if (v === fromWalletId) setFromWalletId(null); }}
              className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/50">
              <option value="" disabled>To wallet...</option>
              {destOptions.map(w => (<option key={w.id} value={w.id}>{w.name} ({w.type})</option>))}
            </select>
          </div>
        )}
        {type !== 'transfer' && (<>
          <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/50 rounded-lg pl-4 pr-3 py-3 focus-within:ring-2 focus-within:ring-[#06B6D4]/50"><span className="text-xl font-semibold text-zinc-500 tabular-nums shrink-0">{sym}</span><input type="text" inputMode="decimal" value={amountDisplay} onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus ref={inputRef} className="w-full bg-transparent text-xl font-semibold tabular-nums text-white placeholder-zinc-600 outline-none text-right"/></div>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/50"/>
          <CategoryChipGrid categories={filtered} selectedId={categoryId} onSelect={setCategoryId} accent="#06B6D4" onCreateCategory={onCreateCategory} categoryType={catType}/>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/50"/>
        </>)}
        {type === 'transfer' && (<>
          <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/50 rounded-lg pl-4 pr-3 py-3 focus-within:ring-2 focus-within:ring-[#06B6D4]/50"><span className="text-xl font-semibold text-zinc-500 tabular-nums shrink-0">{sym}</span><input type="text" inputMode="decimal" value={amountDisplay} onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus ref={inputRef} className="w-full bg-transparent text-xl font-semibold tabular-nums text-white placeholder-zinc-600 outline-none text-right"/></div>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/50"/>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/50"/>
        </>)}
      </>)}
    </TransactionModalShell>
  );
}
