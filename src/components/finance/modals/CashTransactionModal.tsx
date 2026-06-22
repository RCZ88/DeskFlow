import { useState, useEffect, useMemo, useCallback } from 'react';
import { PiggyBank, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { TransactionModalShell } from './TransactionModalShell';
import { useFormattedAmount } from './useFormattedAmount';
import { DenominationPicker } from './DenominationPicker';
import { autoFill, denomTotal } from './autoFill';
import { getCurrencyInfo } from '../currency-data';
import { getLastType, getLastCategoryId, saveLastTxPrefs } from './txPrefs';
import type { FinanceWallet, FinanceCategory, CashDenomination } from '../finance-types';

interface Props {
  open: boolean; onClose: () => void;
  wallet: FinanceWallet; categories: FinanceCategory[]; displayCurrency: string; baseCurrency: string;
  onSubmit: (data: Record<string, any>) => Promise<boolean>;
}

const TYPES = ['withdraw', 'deposit'] as const;

export function CashTransactionModal({ open, onClose, wallet, categories, displayCurrency, baseCurrency, onSubmit }: Props) {
  const sym = getCurrencyInfo(displayCurrency).symbol;
  const meta = (wallet.metadata as any) || {};
  const cDenoms: CashDenomination[] = useMemo(() => {
    if (Array.isArray(meta.denominations) && meta.denominations.length > 0) return meta.denominations;
    const defaults: Record<string, CashDenomination[]> = {
      USD: [{ value: 100, label: '$100', count: 0 }, { value: 50, label: '$50', count: 0 }, { value: 20, label: '$20', count: 0 }, { value: 10, label: '$10', count: 0 }, { value: 5, label: '$5', count: 0 }, { value: 1, label: '$1', count: 0 }],
      IDR: [{ value: 100000, label: 'Rp 100K', count: 0 }, { value: 50000, label: 'Rp 50K', count: 0 }, { value: 20000, label: 'Rp 20K', count: 0 }, { value: 10000, label: 'Rp 10K', count: 0 }, { value: 5000, label: 'Rp 5K', count: 0 }, { value: 2000, label: 'Rp 2K', count: 0 }, { value: 1000, label: 'Rp 1K', count: 0 }],
    };
    return (defaults[displayCurrency] || [{ value: 100, label: '100', count: 0 }, { value: 50, label: '50', count: 0 }, { value: 20, label: '20', count: 0 }, { value: 10, label: '10', count: 0 }, { value: 5, label: '5', count: 0 }, { value: 1, label: '1', count: 0 }])
      .map(d => ({ ...d }));
  }, [meta.denominations, displayCurrency]);

  const [type, setType] = useState<'withdraw' | 'deposit'>('withdraw');
  const { display: amountDisplay, setFormatted: setAmount, numeric: amountNumeric, inputRef } = useFormattedAmount();
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const resetFields = useCallback(() => {
    setAmount(''); setPicks({}); setDescription(''); setDate(new Date().toISOString().split('T')[0]);
  }, [setAmount]);

  useEffect(() => {
    if (open) {
      const lastType = getLastType('cash');
      setType(lastType && (TYPES as readonly string[]).includes(lastType) ? lastType as any : 'withdraw');
      const lastCat = getLastCategoryId('cash');
      setCategoryId(lastCat && categories.some(c => c.id === lastCat && !c.is_archived) ? lastCat : null);
      resetFields();
    }
  }, [open, categories, resetFields]);

  const pickedTotal = denomTotal(cDenoms.map(d => ({ ...d, count: picks[d.value] ?? 0 })));
  const changeAmount = type === 'withdraw' ? Math.max(0, pickedTotal - amountNumeric) : 0;
  const filtered = categories.filter(c => (c.type === 'expense' || c.type === 'income') && !c.is_archived);

  const handleAutoFill = () => {
    if (amountNumeric <= 0) return;
    setPicks(autoFill(amountNumeric, cDenoms));
  };

  const handleSubmit = async () => {
    const withdraw = type === 'withdraw';
    const effectiveAmount = withdraw ? (amountNumeric || pickedTotal) : pickedTotal;
    if (effectiveAmount <= 0 || !categoryId) return false;
    const amt = withdraw ? -Math.abs(effectiveAmount) : Math.abs(effectiveAmount);
    const ok = await onSubmit({
      account_id: wallet.account_id, wallet_id: wallet.id, category_id: categoryId,
      type: withdraw ? 'expense' : 'income', amount: amt, description: description || (withdraw ? 'Withdraw' : 'Deposit'),
      date, metadata: { cash_type: type, denominations_used: picks, change: changeAmount },
    });
    if (ok) { saveLastTxPrefs('cash', type, categoryId); resetFields(); setCategoryId(categoryId); }
    return ok;
  };

  return (
    <TransactionModalShell open={open} onClose={onClose} accent="#EC4899" IconComponent={PiggyBank} title="Add Transaction" typeLabel="Cash"
      onSubmit={handleSubmit} onReset={resetFields}>
      {() => (
        <>
          <div className="text-[11px] text-zinc-400">Cash on hand: <span className="text-white font-medium tabular-nums">{sym}{denomTotal(cDenoms).toFixed(2)}</span></div>
          <div className="flex items-center gap-1.5 mb-1">
            {TYPES.map(t => (
              <button key={t} onClick={() => { setType(t); setPicks({}); }}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                  type === t ? 'bg-[#EC4899]/15 text-[#EC4899] border border-[#EC4899]/30' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200'
                }`}>{t === 'withdraw' ? <><ArrowDownRight className="w-3 h-3" /> Withdraw</> : <><ArrowUpRight className="w-3 h-3" /> Deposit</>}</button>
            ))}
          </div>
          {type === 'withdraw' && (
            <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/50 rounded-lg pl-4 pr-3 py-3 focus-within:ring-2 focus-within:ring-[#EC4899]/50">
              <span className="text-xl font-semibold text-zinc-500 tabular-nums shrink-0">{sym}</span>
              <input type="text" inputMode="decimal" value={amountDisplay} onChange={e => { setAmount(e.target.value); setPicks({}); }} placeholder="How much withdrawn?" autoFocus ref={inputRef}
                 className="w-full bg-transparent text-xl font-semibold tabular-nums text-white placeholder-zinc-600 outline-none text-right" />
            </div>
          )}
          <DenominationPicker denoms={cDenoms} picks={picks} onPicksChange={setPicks} accent="#EC4899" currencySymbol={sym}
            label={type === 'withdraw' ? 'Which bills were taken?' : 'Add bills to cash'} />
          {type === 'withdraw' && (
            <div className="flex gap-2">
              <button onClick={handleAutoFill} className="flex-1 py-2 rounded-lg bg-[#EC4899]/15 text-[#EC4899] border border-[#EC4899]/20 hover:bg-[#EC4899]/25 text-xs font-medium transition-colors">Auto-fill</button>
              <button onClick={() => setPicks({})} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors">Reset</button>
            </div>
          )}
          {changeAmount > 0 && <div className="text-[11px] text-amber-400">Change kept: {sym}{changeAmount.toFixed(2)}</div>}
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description"
            className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50" />
          <div className="flex flex-wrap gap-1.5">
            {filtered.map(cat => (
              <button key={cat.id} onClick={() => setCategoryId(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  categoryId === cat.id ? 'bg-[#EC4899]/15 text-[#EC4899] border border-[#EC4899]/30' : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}>{cat.name}</button>
            ))}
          </div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#EC4899]/50" />
        </>
      )}
    </TransactionModalShell>
  );
}
