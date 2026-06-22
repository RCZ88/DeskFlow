import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from 'lucide-react';
import { GlassSurface } from './_fx/GlassSurface';
import { TabHeader } from './_fx/TabHeader';
import { EmptyState } from './EmptyState';
import { getCurrencyInfo } from './currency-data';
import type { FinanceWallet, CryptoPrice } from './finance-types';

interface CryptoMarketTabProps {
  wallets: FinanceWallet[];
  displayCurrency: string;
  loading: boolean;
  onWalletClick: (id: number) => void;
}

const walletMeta: Record<string, { icon: any; label: string; color: string }> = {
  crypto: { icon: Wallet, label: 'Crypto', color: '#8B5CF6' },
};

export function CryptoMarketTab({ wallets, displayCurrency, loading, onWalletClick }: CryptoMarketTabProps) {
  const sym = getCurrencyInfo(displayCurrency).symbol;
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseMeta(raw: any): Record<string, any> {
    if (raw && typeof raw === 'object') return raw;
    try { return JSON.parse(raw || '{}'); } catch { return {}; }
  }

  const allAssets = useMemo(() => {
    const map = new Map<string, { coin_id: string; symbol: string; amount: number; walletIds: number[]; walletNames: string[] }>();
    wallets.forEach(w => {
      try {
        const meta = parseMeta(w.metadata);
        const assets = Array.isArray(meta.assets) ? meta.assets : (meta.coin_id ? [meta] : []);
        assets.forEach((a: any) => {
          const cid = a.coin_id || a.asset || '';
          if (!cid) return;
          const sym = (a.symbol || a.asset || '').toUpperCase();
          const existing = map.get(cid);
          if (existing) {
            existing.amount += Number(a.amount) || 0;
            if (!existing.walletIds.includes(w.id)) {
              existing.walletIds.push(w.id);
              existing.walletNames.push(w.name);
            }
          } else {
            map.set(cid, { coin_id: cid, symbol: sym, amount: Number(a.amount) || 0, walletIds: [w.id], walletNames: [w.name] });
          }
        });
      } catch { /* ignore */ }
    });
    return Array.from(map.values());
  }, [wallets]);

  const coinIds = allAssets.map(a => a.coin_id).filter(Boolean);
  const hasAssets = allAssets.length > 0;
  const walletsWithAssets = wallets.filter(w => {
    try {
      const meta = parseMeta(w.metadata);
      if (Array.isArray(meta.assets) && meta.assets.length > 0) return true;
      if (meta.coin_id) return true;
      return false;
    } catch { return false; }
  });
  const walletsWithoutAssets = wallets.filter(w => !walletsWithAssets.includes(w));

  const fetchAllPrices = useCallback(async () => {
    if (coinIds.length === 0) { setPrices([]); return; }
    setLoadingPrices(true); setError(null);
    try {
      const r = await (window as any).deskflowAPI?.financeFetchCryptoPrices(coinIds) as CryptoPrice[];
      if (r) setPrices(r);
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setLoadingPrices(false); }
  }, [JSON.stringify(coinIds)]);

  useEffect(() => { fetchAllPrices(); }, [fetchAllPrices]);

  const priceMap = new Map(prices.map(p => [p.id, p]));

  if (loading) {
    return (
      <div className="p-5 space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="animate-pulse bg-zinc-800/60 rounded-xl h-16" />
        ))}
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="p-5">
        <TabHeader
          title="Your Crypto Portfolio"
          icon={<Wallet className="w-4 h-4" />}
          action={null}
        />
        <EmptyState
          icon={<Wallet className="w-12 h-12" />}
          title="No crypto wallets yet"
          description="Create a crypto wallet, then add the coins you own to track live prices."
        />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <TabHeader
        title="Your Crypto Portfolio"
        icon={<Wallet className="w-4 h-4" />}
        action={
          <button
            onClick={fetchAllPrices}
            disabled={loadingPrices}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPrices ? 'animate-spin' : ''}`} />
            Refresh Prices
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Could not load prices: {error}</span>
          <button onClick={fetchAllPrices} className="ml-auto text-[10px] underline hover:no-underline">Retry</button>
        </div>
      )}

      {hasAssets && (
        <div className="grid grid-cols-1 gap-2">
          {allAssets.map(a => {
            const p = priceMap.get(a.coin_id);
            const currentPrice = p?.current_price ?? 0;
            const pc24h = p?.price_change_percentage_24h ?? null;
            const coinName = p?.name || a.symbol || a.coin_id;
            const coinSym = p?.symbol?.toUpperCase() || a.symbol || '';
            const value = a.amount * currentPrice;

            return (
              <GlassSurface
                key={a.coin_id}
                interactive
                onClick={() => a.walletIds.length === 1 ? onWalletClick(a.walletIds[0]) : undefined}
                className="p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/15 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-[#8B5CF6]">{coinSym ? coinSym.slice(0, 2) : '?'}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{coinName}</span>
                        {coinSym && <span className="text-[10px] text-zinc-500">{coinSym}</span>}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {a.walletNames.length === 1 ? a.walletNames[0] : `${a.walletNames.length} wallets`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-xs font-semibold text-white tabular-nums">
                      {sym}{currentPrice.toFixed(currentPrice < 1 ? 6 : 2)}
                    </div>
                    {pc24h !== null && (
                      <div className={`flex items-center gap-0.5 justify-end text-[10px] tabular-nums mt-0.5 ${pc24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pc24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {pc24h >= 0 ? '+' : ''}{pc24h.toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] text-zinc-500">
                    {a.amount.toFixed(a.amount < 1 ? 6 : 4)} {coinSym || 'coins'}
                  </span>
                  <span className="text-[10px] text-zinc-400 tabular-nums">
                    Value: {sym}{value.toFixed(2)}
                  </span>
                </div>
              </GlassSurface>
            );
          })}
        </div>
      )}

      {!hasAssets && walletsWithoutAssets.length > 0 && (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="w-14 h-14 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center mb-3">
            <Wallet className="w-7 h-7 text-[#8B5CF6]" />
          </div>
          <p className="text-sm text-zinc-300 font-medium">No coins added yet</p>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-[260px] leading-relaxed">
            Open a crypto wallet and add the coins you own to see live prices and portfolio value.
          </p>
        </div>
      )}

      {walletsWithoutAssets.length > 0 && hasAssets && (
        <div className="space-y-2">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-600 px-1">Wallets with no coins added</div>
          {walletsWithoutAssets.map(w => (
            <GlassSurface
              key={w.id}
              interactive
              onClick={() => onWalletClick(w.id)}
              className="p-3 flex items-center gap-3"
            >
              <div className="w-7 h-7 rounded-md bg-zinc-800/50 flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5 text-zinc-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-zinc-400 truncate">{w.name}</div>
                <div className="text-[10px] text-zinc-600">Tap to add coins</div>
              </div>
              <div className="text-[10px] text-zinc-600">{sym}{w.balance.toFixed(2)}</div>
            </GlassSurface>
          ))}
        </div>
      )}

      {!loadingPrices && hasAssets && coinIds.length > 0 && prices.length === 0 && !error && (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 text-zinc-600" />
            <p className="text-xs text-zinc-600">Click Refresh to load prices</p>
          </div>
        </div>
      )}
    </div>
  );
}
