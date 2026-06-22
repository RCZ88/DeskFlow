import { useState, useEffect, useMemo, useCallback } from 'react';
import { Coins } from 'lucide-react';
import { TransactionModalShell } from './TransactionModalShell';
import { useFormattedAmount } from './useFormattedAmount';
import { getCurrencyInfo } from '../currency-data';
import { getLastType, getLastCategoryId, saveLastTxPrefs } from './txPrefs';
import type { FinanceWallet, FinanceCategory, CryptoPrice } from '../finance-types';

interface Props {
  open: boolean; onClose: () => void;
  wallet: FinanceWallet; categories: FinanceCategory[]; displayCurrency: string; baseCurrency: string;
  onSubmit: (data: Record<string, any>) => Promise<boolean>;
}

const TYPES = ['buy', 'sell', 'transfer'] as const;

export function CryptoTransactionModal({ open, onClose, wallet, categories, displayCurrency, baseCurrency, onSubmit }: Props) {
  const sym = getCurrencyInfo(displayCurrency).symbol;
  const meta = (wallet.metadata as any) || {};
  const assets: { coin_id: string; symbol: string; amount: number; avg_buy_price: number }[] = useMemo(() => {
    if (Array.isArray(meta.assets) && meta.assets.length > 0) return meta.assets.map((a: any) => ({
      coin_id: a.coin_id || a.asset || '', symbol: (a.symbol || a.asset || '').toUpperCase(),
      amount: Number(a.amount) || 0, avg_buy_price: Number(a.avg_buy_price || a.avgBuyPrice) || 0,
    }));
    if (meta.coin_id) return [{ coin_id: meta.coin_id, symbol: (meta.symbol || '').toUpperCase(), amount: Number(wallet.balance) || 0, avg_buy_price: Number(meta.acquisition_price) || 0 }];
    return [];
  }, [meta, wallet.balance]);

  const [type, setType] = useState<'buy' | 'sell' | 'transfer'>('buy');
  const [assetIdx, setAssetIdx] = useState(0);
  const { display: qtyDisplay, setFormatted: setQty, numeric: qtyNumeric, inputRef: qtyInputRef } = useFormattedAmount();
  const { display: priceDisplay, setFormatted: setPrice, numeric: priceNumeric, inputRef: priceInputRef } = useFormattedAmount();
  const { display: feeDisplay, setFormatted: setFee, numeric: feeNumeric, inputRef: feeInputRef } = useFormattedAmount();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [prices, setPrices] = useState<CryptoPrice[]>([]);

  const resetFields = useCallback(() => {
    setQty(''); setPrice(''); setFee(''); setDate(new Date().toISOString().split('T')[0]);
  }, [setQty, setPrice, setFee]);

  useEffect(() => {
    if (open) {
      const lastType = getLastType('crypto');
      setType(lastType && (TYPES as readonly string[]).includes(lastType) ? lastType as any : 'buy');
      const lastCat = getLastCategoryId('crypto');
      setCategoryId(lastCat && categories.some(c => c.id === lastCat && !c.is_archived) ? lastCat : null);
      resetFields();
      if (assets.length > 0) {
        const ids = assets.map(a => a.coin_id).filter(Boolean);
        if (ids.length > 0) {
          (window as any).deskflowAPI?.financeFetchCryptoPrices(ids).then((r: CryptoPrice[]) => {
            if (r?.length) setPrices(r);
          }).catch(() => {});
        }
      }
    }
  }, [open, assets, categories, resetFields]);

  const selectedAsset = assets[assetIdx] || assets[0];
  const currentPrice = prices.find(p => p.id === selectedAsset?.coin_id);
  const livePrice = currentPrice?.current_price;

  useEffect(() => { if (livePrice) setPrice(String(livePrice)); }, [livePrice, setPrice]);

  const total = qtyNumeric * priceNumeric;
  const net = type === 'sell' ? total - feeNumeric : total + feeNumeric;
  const filtered = categories.filter(c => (c.type === 'expense' || c.type === 'income') && !c.is_archived);
  const hasAssets = assets.length > 0;

  const handleSubmit = async () => {
    if (!qtyNumeric || !categoryId) return false;
    const ok = await onSubmit({
      account_id: wallet.account_id, wallet_id: wallet.id, category_id: categoryId,
      type: type === 'sell' ? 'income' : 'expense', amount: type === 'sell' ? total : -total,
      description: `${type.toUpperCase()} ${qtyNumeric} ${selectedAsset?.symbol}`,
      date, metadata: { crypto_type: type, asset: selectedAsset?.coin_id, quantity: qtyNumeric, price_per_coin: priceNumeric, fee: feeNumeric, net },
    });
    if (ok) { saveLastTxPrefs('crypto', type, categoryId); resetFields(); setCategoryId(categoryId); }
    return ok;
  };

  if (!hasAssets && open) {
    return (
      <TransactionModalShell open={open} onClose={onClose} accent="#8B5CF6" IconComponent={Coins} title="Add Transaction" typeLabel="Crypto"
        onSubmit={async () => false}>
        {() => (
          <div className="flex flex-col items-center py-6 text-center">
            <Coins className="w-10 h-10 text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-400 font-medium">No assets tracked</p>
            <p className="text-[11px] text-zinc-500 mt-1">Add an asset to this crypto wallet first, then you can add transactions.</p>
          </div>
        )}
      </TransactionModalShell>
    );
  }

  return (
    <TransactionModalShell open={open} onClose={onClose} accent="#8B5CF6" IconComponent={Coins} title="Add Transaction" typeLabel="Crypto"
      onSubmit={handleSubmit} onReset={resetFields}>
      {() => (
        <>
          {selectedAsset && (
            <div className="text-[11px] text-zinc-400 mb-1">
              You hold: <span className="text-white tabular-nums font-medium">{selectedAsset.amount.toFixed(selectedAsset.amount < 1 ? 6 : 4)} {selectedAsset.symbol}</span>
            </div>
          )}
          {assets.length > 1 && (
            <select value={assetIdx} onChange={e => { setAssetIdx(Number(e.target.value)); setCategoryId(null); }}
              className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50">
              {assets.map((a, i) => (
                <option key={i} value={i}>{a.symbol} — {a.amount.toFixed(a.amount < 1 ? 6 : 4)} held</option>
              ))}
            </select>
          )}
          {livePrice && (
            <div className="text-[11px] text-zinc-400">
              1 {selectedAsset?.symbol} = <span className="text-white tabular-nums font-medium">{sym}{livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</span>
              {currentPrice?.price_change_percentage_24h != null && (
                <span className={`ml-1.5 ${currentPrice.price_change_percentage_24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currentPrice.price_change_percentage_24h >= 0 ? '+' : ''}{currentPrice.price_change_percentage_24h.toFixed(2)}%
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 mb-1">
            {TYPES.map(t => (
              <button key={t} onClick={() => { setType(t); setCategoryId(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                  type === t ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200'
                }`}>{t}</button>
            ))}
          </div>
          <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/50 rounded-lg pl-4 pr-3 py-3 focus-within:ring-2 focus-within:ring-[#8B5CF6]/50">
            <span className="text-xs font-medium text-zinc-500 shrink-0">{selectedAsset?.symbol}</span>
            <input type="text" inputMode="decimal" value={qtyDisplay} onChange={e => setQty(e.target.value)} placeholder="Quantity" autoFocus ref={qtyInputRef}
              className="w-full bg-transparent text-xl font-semibold tabular-nums text-white placeholder-zinc-600 outline-none text-right" />
          </div>
          <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/50 rounded-lg pl-4 pr-3 py-2 focus-within:ring-2 focus-within:ring-[#8B5CF6]/50">
            <span className="text-sm font-medium text-zinc-500 tabular-nums shrink-0">{sym}</span>
            <input type="text" inputMode="decimal" value={priceDisplay} onChange={e => setPrice(e.target.value)} placeholder="Price per coin" ref={priceInputRef}
              className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none text-right" />
          </div>
          <div className="flex items-center gap-3 bg-zinc-800/80 border border-zinc-700/50 rounded-lg pl-4 pr-3 py-2 focus-within:ring-2 focus-within:ring-[#8B5CF6]/50">
            <span className="text-sm font-medium text-zinc-500 tabular-nums shrink-0">{sym}</span>
            <input type="text" inputMode="decimal" value={feeDisplay} onChange={e => setFee(e.target.value)} placeholder="Fee (optional)" ref={feeInputRef}
              className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none text-right" />
          </div>
          <div className="rounded-lg p-3" style={{ backgroundColor: '#8B5CF610' }}>
            <div className="flex justify-between text-[11px]"><span className="text-zinc-400">Qty × Price</span><span className="text-white tabular-nums font-medium">{sym}{total.toFixed(2)}</span></div>
            {feeNumeric > 0 && <div className="flex justify-between text-[11px] mt-0.5"><span className="text-zinc-500">Fee</span><span className="text-zinc-400 tabular-nums">+{sym}{feeNumeric.toFixed(2)}</span></div>}
            <div className="flex justify-between text-xs mt-1.5 pt-1.5 border-t border-zinc-700/30"><span className="text-zinc-300 font-medium">Net</span><span className="text-white tabular-nums font-bold">{sym}{net.toFixed(2)}</span></div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filtered.map(cat => (
              <button key={cat.id} onClick={() => setCategoryId(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  categoryId === cat.id ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30' : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}>{cat.name}</button>
            ))}
          </div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50" />
        </>
      )}
    </TransactionModalShell>
  );
}
