import { useState, useEffect, useCallback } from 'react';
import { CreditCard, ArrowDownRight, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
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

const TYPES = ['expense', 'payment', 'income', 'transfer'] as const;

export function CreditTransactionModal({ open, onClose, wallet, categories, wallets, displayCurrency, baseCurrency, onSubmit, onCreateCategory }: Props) {
  const [type, setType] = useState<'expense' | 'payment' | 'income' | 'transfer'>('expense');
  const { display: amountDisplay, setFormatted: setAmount, numeric: amountNumeric, inputRef } = useFormattedAmount();
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [installments, setInstallments] = useState('');
  const [showInstallments, setShowInstallments] = useState(false);
  const [toWalletId, setToWalletId] = useState<number | null>(null);
  const [fromWalletId, setFromWalletId] = useState<number | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);

  const resetFields = useCallback(() => {
    setAmount(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]); setInstallments(''); setShowInstallments(false); setToWalletId(null); setTransferId(null);
  }, [setAmount]);

  useEffect(() => {
    if (open) {
      const lastType = getLastType('credit_card');
      setType(lastType && (TYPES as readonly string[]).includes(lastType) ? lastType as any : 'expense');
      const lastCat = getLastCategoryId('credit_card');
      setCategoryId(lastCat && categories.some(c => c.id === lastCat && !c.is_archived) ? lastCat : null);
      resetFields();
      setFromWalletId(wallet.id);
    }
  }, [open, categories, resetFields, wallet.id]);

  const sym = getCurrencyInfo(displayCurrency).symbol;
  const meta = (wallet.metadata as any) || {};
  const filtered = categories.filter(c => (c.type === 'expense' || c.type === 'income') && !c.is_archived);
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
      const tid = crypto.randomUUID();
      setTransferId(tid);
      const desc = description ? `: ${description}` : '';
      await onSubmit({ account_id: source.account_id, wallet_id: source.id, category_id: 0, type: 'expense', amount: -amt, description: `Transfer to ${dest.name}${desc}`, date, to_wallet_id: toWalletId, transfer_id: tid });
      await onSubmit({ account_id: dest.account_id, wallet_id: dest.id, category_id: 0, type: 'income', amount: amt, description: `Transfer from ${source.name}${desc}`, date, from_wallet_id: source.id, transfer_id: tid });
    } else {
      const txAmt = type === 'expense' ? -amt : amt;
      const meta: Record<string, any> = { actual_type: type };
      if (installments) meta.installments = parseInt(installments);
      await onSubmit({ account_id: wallet.account_id, wallet_id: wallet.id, category_id: categoryId!, type: 'expense', amount: txAmt, description, date, metadata: meta });
    }
    saveLastTxPrefs('credit_card', type, categoryId);
    resetFields(); setCategoryId(categoryId); setFromWalletId(wallet.id);
    return true;
  };

  return (
    <TransactionModalShell open={open} onClose={onClose} accent="#F59E0B" IconComponent={CreditCard} title="Add Transaction" typeLabel="Credit"
      onSubmit={handleSubmit} onReset={resetFields}>
      {() => (
        <>
          {(meta.credit_limit || wallet.last_four || meta.card_network) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-2 mb-2 bg-[#F59E0B]/5 rounded-lg border border-[#F59E0B]/10 text-[11px]">
              {meta.card_network && <span className="font-medium text-zinc-300 uppercase">{meta.card_network}</span>}
              {wallet.last_four && <span className="text-zinc-500">••••{wallet.last_four}</span>}
              {meta.credit_limit && wallet.balance < 0 && (
                <span className="ml-auto text-zinc-500">
                  Available: <span className="text-emerald-400 font-medium tabular-nums">{sym}{(Math.max(0, Number(meta.credit_limit) - Math.abs(wallet.balance))).toFixed(2)}</span>
                </span>
              )}
            </div>
          )}
          {meta.credit_limit && wallet.balance < 0 && (
            <div className="mb-2">
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                <span>Utilization</span>
                <span className="tabular-nums">{sym}{Math.abs(wallet.balance).toFixed(2)} / {sym}{Number(meta.credit_limit).toLocaleString()}</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (Math.abs(wallet.balance) / Number(meta.credit_limit)) * 100)}%`,
                    backgroundColor: (Math.abs(wallet.balance) / Number(meta.credit_limit)) < 0.5 ? '#10B981' : (Math.abs(wallet.balance) / Number(meta.credit_limit)) < 0.8 ? '#F59E0B' : '#EF4444'
                  }} />
              </div>
              {meta.due_day && <div className="text-[10px] text-zinc-500 mt-0.5">Due: day {meta.due_day}</div>}
            </div>
          )}
          <div className="flex items-center gap-1.5 mb-1">
            {TYPES.map(t => (
              <button key={t} onClick={() => { setType(t); setCategoryId(null); setToWalletId(null); setShowInstallments(false); }}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                  type === t ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200'
                }`}>{t === 'expense' ? <><ArrowDownRight className="w-3 h-3" /> Expense</> : t === 'payment' ? <>↩ Payment</> : t === 'income' ? <><ArrowUpRight className="w-3 h-3" /> Refund</> : <><ArrowLeftRight className="w-3 h-3" /> Transfer</>}</button>
            ))}
          </div>
          {type === 'transfer' && (
            <div className="space-y-2">
              <select value={fromWalletId ?? ''} onChange={e => { const v = Number(e.target.value); setFromWalletId(v); if (v === toWalletId) setToWalletId(null); }}
                className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/50">
                <option value="" disabled>From wallet...</option>
                {srcOptions.map(w => (<option key={w.id} value={w.id}>{w.name} ({w.type})</option>))}
              </select>
              <span className="flex justify-center"><ArrowLeftRight className="w-4 h-4 text-zinc-600" /></span>
              <select value={toWalletId ?? ''} onChange={e => { const v = Number(e.target.value); setToWalletId(v); if (v === fromWalletId) setFromWalletId(null); }}
                className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/50">
                <option value="" disabled>To wallet...</option>
                {destOptions.map(w => (<option key={w.id} value={w.id}>{w.name} ({w.type})</option>))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/50 rounded-lg pl-4 pr-3 py-3 focus-within:ring-2 focus-within:ring-[#F59E0B]/50">
            <span className="text-xl font-semibold text-zinc-500 tabular-nums shrink-0">{sym}</span>
            <input type="text" inputMode="decimal" value={amountDisplay} onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus ref={inputRef}
              className="w-full bg-transparent text-xl font-semibold tabular-nums text-white placeholder-zinc-600 outline-none text-right" />
          </div>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description"
            className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/50" />
          {type !== 'transfer' && (
            <CategoryChipGrid categories={filtered} selectedId={categoryId} onSelect={setCategoryId} accent="#F59E0B" onCreateCategory={onCreateCategory} categoryType={type === 'payment' ? 'expense' : type} />
          )}
          {type === 'expense' && (
            <>
              <button onClick={() => setShowInstallments(!showInstallments)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                {showInstallments ? 'Hide installments' : '+ Pay in installments'}
              </button>
              {showInstallments && (
                <input type="number" value={installments} onChange={e => setInstallments(e.target.value)} placeholder="Number of months" min="2" max="60"
                  className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/50" />
              )}
            </>
          )}
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/50" />
        </>
      )}
    </TransactionModalShell>
  );
}
