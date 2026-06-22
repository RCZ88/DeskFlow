import { useState, useEffect, useMemo, useCallback } from 'react';
import { WalletCards, ArrowDownRight, ArrowUpRight } from 'lucide-react';
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

const TYPES = ['spend', 'deposit'] as const;
const DENOM_CACHE: Record<string, CashDenomination[]> = {};

function getCachedDenoms(currency: string): CashDenomination[] {
  if (!DENOM_CACHE[currency]) {
    // Build denomination list from the wallet's currency — simplified default set
    const defaults: Record<string, CashDenomination[]> = {
      USD: [{ value: 100, label: '$100', count: 0 }, { value: 50, label: '$50', count: 0 }, { value: 20, label: '$20', count: 0 }, { value: 10, label: '$10', count: 0 }, { value: 5, label: '$5', count: 0 }, { value: 1, label: '$1', count: 0 }],
      IDR: [{ value: 100000, label: 'Rp 100K', count: 0 }, { value: 50000, label: 'Rp 50K', count: 0 }, { value: 20000, label: 'Rp 20K', count: 0 }, { value: 10000, label: 'Rp 10K', count: 0 }, { value: 5000, label: 'Rp 5K', count: 0 }, { value: 2000, label: 'Rp 2K', count: 0 }, { value: 1000, label: 'Rp 1K', count: 0 }],
    };
    DENOM_CACHE[currency] = defaults[currency] || [{ value: 100, label: '100', count: 0 }, { value: 50, label: '50', count: 0 }, { value: 20, label: '20', count: 0 }, { value: 10, label: '10', count: 0 }, { value: 5, label: '5', count: 0 }, { value: 1, label: '1', count: 0 }];
  }
  return DENOM_CACHE[currency];
}

export function PhysicalTransactionModal({ open, onClose, wallet, categories, displayCurrency, baseCurrency, onSubmit }: Props) {
  const sym = getCurrencyInfo(displayCurrency).symbol;
  const meta = (wallet.metadata as any) || {};
  const wDenoms: CashDenomination[] = useMemo(() => {
    if (Array.isArray(meta.denominations) && meta.denominations.length > 0) return meta.denominations;
    return getCachedDenoms(displayCurrency).map(d => ({ ...d }));
  }, [meta.denominations, displayCurrency]);

  const [type, setType] = useState<'spend' | 'deposit'>('spend');
  const { display: amountDisplay, setFormatted: setAmount, numeric: amountNumeric, inputRef: amountInputRef } = useFormattedAmount();
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const resetFields = useCallback(() => {
    setAmount(''); setPicks({}); setDescription(''); setDate(new Date().toISOString().split('T')[0]);
  }, [setAmount]);

  useEffect(() => {
    if (open) {
      const lastType = getLastType('physical');
      setType(lastType && (TYPES as readonly string[]).includes(lastType) ? lastType as any : 'spend');
      const lastCat = getLastCategoryId('physical');
      setCategoryId(lastCat && categories.some(c => c.id === lastCat && !c.is_archived) ? lastCat : null);
      resetFields();
    }
  }, [open, categories, resetFields]);

  const pickedTotal = denomTotal(wDenoms.map(d => ({ ...d, count: picks[d.value] ?? 0 })));
  const changeAmount = type === 'spend' ? Math.max(0, pickedTotal - amountNumeric) : 0;
  const filtered = categories.filter(c => (c.type === 'expense' || c.type === 'income') && !c.is_archived);

  const handleAutoFill = () => {
    if (amountNumeric <= 0) return;
    setPicks(autoFill(amountNumeric, wDenoms));
  };

  const handleSubmit = async () => {
    const spend = type === 'spend';
    const effectiveAmount = spend ? (amountNumeric || pickedTotal) : pickedTotal;
    if (effectiveAmount <= 0 || !categoryId) return false;
    const amt = spend ? -Math.abs(effectiveAmount) : Math.abs(effectiveAmount);
    const ok = await onSubmit({
      account_id: wallet.account_id, wallet_id: wallet.id, category_id: categoryId,
      type: spend ? 'expense' : 'income', amount: amt, description: description || (spend ? 'Spend' : 'Deposit'),
      date, metadata: { physical_type: type, denominations_used: picks, change: changeAmount },
    });
    if (ok) { saveLastTxPrefs('physical', type, categoryId); resetFields(); setCategoryId(categoryId); }
    return ok;
  };

  return (
    <TransactionModalShell open={open} onClose={onClose} accent="#F97316" IconComponent={WalletCards} title="Add Transaction" typeLabel="Physical"
      onSubmit={handleSubmit} onReset={resetFields}>
      {() => (
        <>
          <div className="text-[11px] text-zinc-400">Wallet total: <span className="text-white font-medium tabular-nums">{sym}{denomTotal(wDenoms).toFixed(2)}</span></div>
          <div className="flex items-center gap-1.5 mb-1">
            {TYPES.map(t => (
              <button key={t} onClick={() => { setType(t); setPicks({}); }}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                  type === t ? 'bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200'
                }`}>{t === 'spend' ? <><ArrowDownRight className="w-3 h-3" /> Spend</> : <><ArrowUpRight className="w-3 h-3" /> Deposit</>}</button>
            ))}
          </div>
          {type === 'spend' && (
            <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/50 rounded-lg pl-4 pr-3 py-3 focus-within:ring-2 focus-within:ring-[#F97316]/50">
              <span className="text-xl font-semibold text-zinc-500 tabular-nums shrink-0">{sym}</span>
              <input type="text" inputMode="decimal" value={amountDisplay} onChange={e => { setAmount(e.target.value); setPicks({}); }} placeholder="How much did you spend?" autoFocus ref={amountInputRef}
                 className="w-full bg-transparent text-xl font-semibold tabular-nums text-white placeholder-zinc-600 outline-none text-right" />
            </div>
          )}
          <DenominationPicker denoms={wDenoms} picks={picks} onPicksChange={setPicks} accent="#F97316" currencySymbol={sym}
            label={type === 'spend' ? 'Which bills did you use?' : 'Add bills to your wallet'} />
          {type === 'spend' && (
            <div className="flex gap-2">
              <button onClick={handleAutoFill} className="flex-1 py-2 rounded-lg bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/20 hover:bg-[#F97316]/25 text-xs font-medium transition-colors">Auto-fill</button>
              <button onClick={() => setPicks({})} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors">Reset</button>
            </div>
          )}
          {changeAmount > 0 && <div className="text-[11px] text-amber-400">Change kept in wallet: {sym}{changeAmount.toFixed(2)}</div>}
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description"
            className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F97316]/50" />
          <div className="flex flex-wrap gap-1.5">
            {filtered.map(cat => (
              <button key={cat.id} onClick={() => setCategoryId(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  categoryId === cat.id ? 'bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30' : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}>{cat.name}</button>
            ))}
          </div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/50" />
        </>
      )}
    </TransactionModalShell>
  );
}
