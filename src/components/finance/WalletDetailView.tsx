import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Landmark, CreditCard, Wallet, Banknote, PiggyBank, Save, RefreshCw, AlertTriangle, Plus, Trash2, Eye, EyeOff, Link2, Unlink, WalletCards } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { GlassSurface } from './_fx/GlassSurface';
import { getCurrencyInfo, formatCurrency as fmtCurrency } from './currency-data';
import type { FinanceWallet, FinanceTransaction, CashDenomination, CryptoPrice, CryptoHistoryPoint } from './finance-types';

interface WalletDetailViewProps {
  wallet: FinanceWallet & { metadata?: any };
  displayCurrency: string;
  transactions: FinanceTransaction[];
  wallets: FinanceWallet[];
  onBack: () => void;
  onSaveMetadata: (id: number, metadata: Record<string, any>) => Promise<boolean>;
  onUpdateWallet: (data: { id: number; name: string; type: string; provider?: string; last_four?: string; balance?: number; currency?: string }) => Promise<boolean>;
  onDeleteWallet?: (id: number) => Promise<boolean>;
  onAddTransaction: (walletType: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const walletMeta: Record<string, { icon: any; label: string; color: string }> = {
  bank: { icon: Landmark, label: 'Bank', color: '#3B82F6' },
  debit_card: { icon: CreditCard, label: 'Debit Card', color: '#10B981' },
  credit_card: { icon: CreditCard, label: 'Credit Card', color: '#F59E0B' },
  crypto: { icon: Wallet, label: 'Crypto', color: '#8B5CF6' },
  cash: { icon: PiggyBank, label: 'Cash', color: '#EC4899' },
  physical: { icon: WalletCards, label: 'Physical', color: '#F97316' },
  ewallet: { icon: Banknote, label: 'E-Wallet', color: '#06B6D4' },
  other: { icon: Wallet, label: 'Other', color: '#6B7280' },
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Filler);

const maskField = (val: string | null | undefined): string => {
  if (!val) return '';
  if (val.length <= 4) return val;
  return '\u2022'.repeat(val.length - 4) + val.slice(-4);
};

const CURRENCY_DENOMINATIONS: Record<string, { value: number; label: string }[]> = {
  USD: [
    { value: 100, label: '$100' }, { value: 50, label: '$50' }, { value: 20, label: '$20' },
    { value: 10, label: '$10' }, { value: 5, label: '$5' }, { value: 1, label: '$1' },
    { value: 0.25, label: '25\u00a2' }, { value: 0.10, label: '10\u00a2' }, { value: 0.05, label: '5\u00a2' }, { value: 0.01, label: '1\u00a2' },
  ],
  EUR: [
    { value: 500, label: '\u20ac500' }, { value: 200, label: '\u20ac200' }, { value: 100, label: '\u20ac100' },
    { value: 50, label: '\u20ac50' }, { value: 20, label: '\u20ac20' }, { value: 10, label: '\u20ac10' }, { value: 5, label: '\u20ac5' },
    { value: 2, label: '\u20ac2' }, { value: 1, label: '\u20ac1' }, { value: 0.50, label: '50c' }, { value: 0.20, label: '20c' }, { value: 0.10, label: '10c' },
  ],
  GBP: [
    { value: 50, label: '\u00a350' }, { value: 20, label: '\u00a320' }, { value: 10, label: '\u00a310' }, { value: 5, label: '\u00a35' }, { value: 1, label: '\u00a31' },
    { value: 0.50, label: '50p' }, { value: 0.20, label: '20p' }, { value: 0.10, label: '10p' }, { value: 0.05, label: '5p' }, { value: 0.01, label: '1p' },
  ],
  IDR: [
    { value: 100000, label: '100rb' }, { value: 50000, label: '50rb' }, { value: 20000, label: '20rb' },
    { value: 10000, label: '10rb' }, { value: 5000, label: '5rb' }, { value: 2000, label: '2rb' }, { value: 1000, label: '1rb' },
  ],
  JPY: [
    { value: 10000, label: '\u00a510,000' }, { value: 5000, label: '\u00a55,000' }, { value: 2000, label: '\u00a52,000' },
    { value: 1000, label: '\u00a51,000' }, { value: 500, label: '\u00a5500' }, { value: 100, label: '\u00a5100' }, { value: 50, label: '\u00a550' }, { value: 10, label: '\u00a510' }, { value: 1, label: '\u00a51' },
  ],
};

const DEFAULT_DENOMINATIONS = [
  { value: 100, label: '100' }, { value: 50, label: '50' }, { value: 20, label: '20' },
  { value: 10, label: '10' }, { value: 5, label: '5' }, { value: 1, label: '1' },
];

function getDenominations(currency: string) {
  return CURRENCY_DENOMINATIONS[currency] || DEFAULT_DENOMINATIONS;
}

type EditableField = string | number | boolean | null | undefined;

function FieldRow({ label, value, onChange, type = 'text', masked = false, warning, hint }: {
  label: string; value: EditableField; onChange?: (v: string) => void; type?: string; masked?: boolean; warning?: string; hint?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const display = masked && !revealed ? maskField(String(value ?? '')) : String(value ?? '');
  return (
    <div className={`py-2 px-3 rounded-lg transition-colors ${warning ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-zinc-800/20 hover:bg-zinc-800/40'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">{label}</span>
        <div className="flex items-center gap-1.5">
          {onChange ? (
            <input type={type} value={String(value ?? '')} onChange={e => onChange(e.target.value)}
              className="text-xs text-right bg-transparent text-zinc-200 tabular-nums outline-none w-40 border-b border-white/5 focus:border-[var(--page-accent)] transition-colors" />
          ) : (
            <span className="text-xs text-zinc-200 tabular-nums">{display}</span>
          )}
          {masked && !onChange && (
            <button onClick={() => setRevealed(!revealed)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
      {warning && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-400">
          <AlertTriangle className="w-3 h-3" />{warning}
        </div>
      )}
      {hint && (
        <div className="mt-1 text-[10px] text-zinc-500 leading-relaxed">{hint}</div>
      )}
    </div>
  );
}

function TransactionList({ transactions, displayCurrency, emptyText }: {
  transactions: FinanceTransaction[]; displayCurrency: string; emptyText?: string;
}) {
  const sym = getCurrencyInfo(displayCurrency).symbol;
  if (transactions.length === 0) {
    return <div className="text-center py-6 text-xs text-zinc-500">{emptyText || 'No transactions yet'}</div>;
  }
  return (
    <div className="space-y-1">
      {transactions.slice(0, 15).map(txn => (
        <div key={txn.id} className="flex justify-between items-center py-2 px-3 bg-zinc-800/30 rounded-lg">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-zinc-300 truncate">{txn.description || 'Untitled'}</div>
            <div className="text-[10px] text-zinc-500">{new Date(txn.date).toLocaleDateString()}</div>
          </div>
          <div className={`text-xs font-medium tabular-nums ml-2 ${txn.type === 'expense' ? 'text-red-400' : txn.type === 'income' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {txn.type === 'expense' ? '-' : txn.type === 'income' ? '+' : ''}{sym}{Math.abs(txn.amount).toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}

function BankDetail({ metadata, onChange, transactions, displayCurrency }: {
  metadata: Record<string, any>; onChange: (k: string, v: string) => void; transactions: FinanceTransaction[]; displayCurrency: string;
}) {
  return (
    <div className="space-y-4">
      <GlassSurface tier={2} className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Account Details</div>
        <div className="space-y-1">
          <FieldRow label="Institution" value={metadata.institution || metadata.bank_name} onChange={v => onChange('institution', v)} />
          <FieldRow label="Account Number" value={metadata.accountNumber || metadata.account_number} masked />
          <FieldRow label="Routing Number" value={metadata.routingNumber || metadata.swift} onChange={v => onChange('routingNumber', v)} />
          <FieldRow label="IBAN" value={metadata.iban} onChange={v => onChange('iban', v)} />
          <FieldRow label="Notes" value={metadata.notes} onChange={v => onChange('notes', v)} />
        </div>
      </GlassSurface>
      <GlassSurface tier={2} className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Recent Transactions</div>
        <TransactionList transactions={transactions} displayCurrency={displayCurrency} emptyText="No transactions for this account yet" />
      </GlassSurface>
    </div>
  );
}

function DebitCardDetail({ metadata, onChange, transactions, displayCurrency, wallets, onWalletClick }: {
  metadata: Record<string, any>; onChange: (k: string, v: string) => void; transactions: FinanceTransaction[]; displayCurrency: string;
  wallets: FinanceWallet[]; onWalletClick?: (id: number) => void;
}) {
  const linkedBank = wallets.find(w => w.id === Number(metadata.linkedAccountId));
  return (
    <div className="space-y-4">
      <GlassSurface tier={2} className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Card Details</div>
        <div className="space-y-1">
          <FieldRow label="Card Network" value={metadata.card_network} onChange={v => onChange('card_network', v)} />
          <FieldRow label="Issuer" value={metadata.issuer} onChange={v => onChange('issuer', v)} />
          <FieldRow label="ATM Withdrawal Limit" value={(metadata.atmWithdrawalLimit || metadata.daily_limit) ?? ''} onChange={v => onChange('atmWithdrawalLimit', v)} type="number" />
          <FieldRow label="Daily Spending Limit" value={metadata.dailySpendingLimit ?? ''} onChange={v => onChange('dailySpendingLimit', v)} type="number" />
          <FieldRow label="Notes" value={metadata.notes} onChange={v => onChange('notes', v)} />
        </div>
      </GlassSurface>
      {linkedBank && onWalletClick && (
        <button onClick={() => onWalletClick(linkedBank.id)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[#3B82F6] text-xs hover:bg-[#3B82F6]/20 transition-colors w-full">
          <Link2 className="w-3.5 h-3.5" />
          <span>Linked: {linkedBank.name}</span>
        </button>
      )}
      <GlassSurface tier={2} className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Recent Spending</div>
        <TransactionList transactions={transactions.filter(t => t.type === 'expense')} displayCurrency={displayCurrency} emptyText="No spending transactions yet" />
      </GlassSurface>
    </div>
  );
}

function CreditCardDetail({ metadata, onChange, wallet, transactions, displayCurrency }: {
  metadata: Record<string, any>; onChange: (k: string, v: string) => void; wallet: FinanceWallet;
  transactions: FinanceTransaction[]; displayCurrency: string;
}) {
  const creditLimit = Number(metadata.creditLimit || metadata.credit_limit) || 0;
  const currentBalance = Math.abs(wallet.balance);
  const utilization = creditLimit > 0 ? (currentBalance / creditLimit) * 100 : 0;
  const available = creditLimit - currentBalance;
  const statementBalance = Number(metadata.lastStatementBalance || metadata.statement_balance) || 0;
  const statementDate = metadata.statementDate || metadata.statement_date || '';
  const paymentDueDate = metadata.paymentDueDate || metadata.payment_due_date || '';
  const sym = getCurrencyInfo(displayCurrency).symbol;

  const isDueSoon = paymentDueDate && (() => {
    const due = new Date(paymentDueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 7 && daysUntilDue >= 0;
  })();

  const recentTxns = transactions.slice(0, 10);
  const today = new Date().toISOString().split('T')[0];
  const pendingTxns = recentTxns.filter(t => t.date === today);
  const clearedTxns = recentTxns.filter(t => t.date !== today);

  return (
    <div className="space-y-4">
      {creditLimit > 0 && (
        <GlassSurface tier={2} className="p-4">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-zinc-400">Credit Utilization</span>
            <span className={`font-semibold tabular-nums ${utilization > 80 ? 'text-red-400' : utilization > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {utilization.toFixed(1)}%
            </span>
          </div>
          <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full transition-all rounded-full ${utilization > 80 ? 'bg-gradient-to-r from-red-500 to-red-400' : utilization > 50 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
              style={{ width: `${Math.min(utilization, 100)}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-zinc-500 mt-1.5">
            <span>Used: {sym}{currentBalance.toFixed(2)}</span>
            <span>Available: {sym}{Math.max(available, 0).toFixed(2)}</span>
          </div>
        </GlassSurface>
      )}

      <GlassSurface tier={2} className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Card Details</div>
        <div className="space-y-1">
          <FieldRow label="Card Network" value={metadata.card_network} onChange={v => onChange('card_network', v)} />
          <FieldRow label="Issuer" value={metadata.issuer} onChange={v => onChange('issuer', v)} />
          <FieldRow label="Credit Limit" value={(metadata.creditLimit || metadata.credit_limit) ?? ''} onChange={v => onChange('creditLimit', v)} type="number" />
          <FieldRow label="APR (%)" value={metadata.apr ?? ''} onChange={v => onChange('apr', v)} type="number" />
          {statementBalance > 0 && <FieldRow label="Statement Balance" value={`${sym}${statementBalance.toFixed(2)}`} />}
          {statementDate && <FieldRow label="Statement Date" value={statementDate} />}
          <FieldRow label="Payment Due Date" value={paymentDueDate} onChange={v => onChange('paymentDueDate', v)} type="date"
            warning={isDueSoon ? 'Payment due within 7 days' : undefined} />
          <FieldRow label="Notes" value={metadata.notes} onChange={v => onChange('notes', v)} />
        </div>
      </GlassSurface>

      {pendingTxns.length > 0 && (
        <GlassSurface tier={2} className="p-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-amber-400 mb-2">Pending ({pendingTxns.length})</div>
          <TransactionList transactions={pendingTxns} displayCurrency={displayCurrency} />
        </GlassSurface>
      )}

      <GlassSurface tier={2} className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Cleared ({clearedTxns.length})</div>
        <TransactionList transactions={clearedTxns} displayCurrency={displayCurrency} emptyText="No cleared transactions yet" />
      </GlassSurface>
    </div>
  );
}

const POPULAR_COINS = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
  { id: 'tether', name: 'Tether', symbol: 'USDT' },
  { id: 'binancecoin', name: 'BNB', symbol: 'BNB' },
  { id: 'solana', name: 'Solana', symbol: 'SOL' },
  { id: 'ripple', name: 'XRP', symbol: 'XRP' },
  { id: 'usd-coin', name: 'USDC', symbol: 'USDC' },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA' },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE' },
  { id: 'tron', name: 'TRON', symbol: 'TRX' },
  { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'LINK' },
  { id: 'polkadot', name: 'Polkadot', symbol: 'DOT' },
  { id: 'polygon-ecosystem-token', name: 'Polygon', symbol: 'POL' },
  { id: 'litecoin', name: 'Litecoin', symbol: 'LTC' },
  { id: 'bitcoin-cash', name: 'Bitcoin Cash', symbol: 'BCH' },
  { id: 'stellar', name: 'Stellar', symbol: 'XLM' },
  { id: 'uniswap', name: 'Uniswap', symbol: 'UNI' },
  { id: 'monero', name: 'Monero', symbol: 'XMR' },
  { id: 'ethereum-classic', name: 'Ethereum Classic', symbol: 'ETC' },
  { id: 'filecoin', name: 'Filecoin', symbol: 'FIL' },
  { id: 'cosmos', name: 'Cosmos', symbol: 'ATOM' },
  { id: 'algorand', name: 'Algorand', symbol: 'ALGO' },
  { id: 'vechain', name: 'VeChain', symbol: 'VET' },
  { id: 'internet-computer', name: 'Internet Computer', symbol: 'ICP' },
  { id: 'near', name: 'NEAR Protocol', symbol: 'NEAR' },
  { id: 'aptos', name: 'Aptos', symbol: 'APT' },
  { id: 'optimism', name: 'Optimism', symbol: 'OP' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB' },
  { id: 'pepe', name: 'Pepe', symbol: 'PEPE' },
];

function CryptoDetail({ metadata, onChange, wallet, displayCurrency, onTotalValueChange }: {
  metadata: Record<string, any>; onChange: (key: string, v: string) => void; wallet: FinanceWallet; displayCurrency: string; onTotalValueChange?: (val: number) => void;
}) {
  const sym = getCurrencyInfo(displayCurrency).symbol;
  const loc = getCurrencyInfo(displayCurrency).locale;
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [history, setHistory] = useState<CryptoHistoryPoint[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframeDays, setTimeframeDays] = useState(7);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [searchCoin, setSearchCoin] = useState('');
  const [selectedCoinId, setSelectedCoinId] = useState('');
  const [newAssetAmount, setNewAssetAmount] = useState('');
  const [newAssetAvgPrice, setNewAssetAvgPrice] = useState('');
  const [addMode, setAddMode] = useState<'manual' | 'from-spend'>('manual');
  const [newTotalSpent, setNewTotalSpent] = useState('');
  const [editingCoinIdx, setEditingCoinIdx] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editAvgPrice, setEditAvgPrice] = useState('');

  const TIMEFRAMES = [
    { days: 1, label: '1D' }, { days: 7, label: '1W' }, { days: 30, label: '1M' },
    { days: 90, label: '3M' }, { days: 365, label: '1Y' }, { days: 9999, label: 'ALL' },
  ] as const;

  const isZeroDec = displayCurrency === 'IDR' || displayCurrency === 'VND' || displayCurrency === 'KRW' || displayCurrency === 'JPY';
  const fmt = useCallback((val: number, minDec = 2, maxDec = 2) => {
    if (isZeroDec) return val.toLocaleString(loc, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return val.toLocaleString(loc, { minimumFractionDigits: minDec, maximumFractionDigits: maxDec });
  }, [isZeroDec, loc]);

  const fmtCrypto = useCallback((val: number) => {
    if (val === 0) return '0';
    if (val < 0.0001) return val.toLocaleString(loc, { minimumFractionDigits: 8, maximumFractionDigits: 8 });
    if (val < 1) return val.toLocaleString(loc, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
    return val.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }, [loc]);

  const assets: { coin_id: string; symbol: string; amount: number; avg_buy_price: number }[] = useMemo(() => {
    if (Array.isArray(metadata.assets) && metadata.assets.length > 0) {
      return metadata.assets.map((a: any) => ({
        coin_id: a.coin_id || a.asset || '',
        symbol: (a.symbol || a.asset || '').toUpperCase(),
        amount: Number(a.amount) || 0,
        avg_buy_price: Number(a.avg_buy_price || a.avgBuyPrice) || 0,
      }));
    }
    if (metadata.coin_id) {
      return [{
        coin_id: metadata.coin_id,
        symbol: (metadata.symbol || metadata.coin_id).toUpperCase(),
        amount: Number(metadata.amount) || 0,
        avg_buy_price: Number(metadata.avg_buy_price || metadata.avgBuyPrice) || 0,
      }];
    }
    return [];
  }, [metadata]);

  const coinIds = assets.map(a => a.coin_id).filter(Boolean);
  const hasAssets = assets.length > 0;
  const primaryCoinId = coinIds[0] || '';

  const totalValue = useMemo(() => {
    return assets.reduce((sum, a) => {
      const p = prices.find(pr => pr.coin_id === a.coin_id);
      return sum + (a.amount * (p?.current_price || 0));
    }, 0);
  }, [assets, prices]);

  const totalCost = useMemo(() => assets.reduce((s, a) => s + a.amount * a.avg_buy_price, 0), [assets]);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  useEffect(() => { onTotalValueChange?.(totalValue); }, [totalValue, onTotalValueChange]);

  const primaryPrice = prices.find(p => p.coin_id === primaryCoinId);
  const pc24h = primaryPrice?.price_change_percentage_24h ?? null;

  useEffect(() => {
    if (coinIds.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoadingPrices(true); setError(null);
      try {
        const r = await (window as any).deskflowAPI?.financeFetchCryptoPrices(coinIds, displayCurrency) as CryptoPrice[];
        if (!cancelled && r?.length) { setPrices(r); setLastUpdated(Date.now()); setStale(false); }
      } catch (e: any) { if (!cancelled) setError(e?.message || String(e)); }
      finally { if (!cancelled) setLoadingPrices(false); }
    })();
    return () => { cancelled = true; };
  }, [JSON.stringify(coinIds)]);

  useEffect(() => {
    if (!primaryCoinId) return;
    let cancelled = false;
    (async () => {
      setLoadingHistory(true);
      try {
        const r = await (window as any).deskflowAPI?.financeGetCryptoHistory(primaryCoinId, timeframeDays, displayCurrency) as CryptoHistoryPoint[];
        if (!cancelled && r) setHistory(r);
      } catch { /* non-critical */ }
      finally { if (!cancelled) setLoadingHistory(false); }
    })();
    return () => { cancelled = true; };
  }, [primaryCoinId, timeframeDays]);

  const fmtLabel = useCallback((ts: number) => {
    const d = new Date(ts);
    if (timeframeDays <= 1) return d.toLocaleTimeString(undefined, { hour: '2-digit' });
    if (timeframeDays <= 90) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  }, [timeframeDays]);

  const lineData = useMemo(() => {
    if (history.length === 0) return null;
    const isUp = history.length > 1 && history[history.length - 1].price >= history[0].price;
    const c = isUp ? '16, 185, 129' : '239, 68, 68';
    return {
      labels: history.map(p => fmtLabel(p.timestamp)),
      datasets: [{
        data: history.map(p => p.price),
        borderColor: isUp ? '#10B981' : '#EF4444',
        backgroundColor: (ctx: any) => {
          if (!ctx.chart?.ctx) return 'transparent';
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
          g.addColorStop(0, `rgba(${c}, 0.25)`); g.addColorStop(1, `rgba(${c}, 0)`); return g;
        },
        fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2,
        pointHoverRadius: 4, pointHoverBackgroundColor: isUp ? '#10B981' : '#EF4444',
        pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2,
      }]
    };
  }, [history, fmtLabel]);

  const donutData = useMemo(() => {
    if (assets.length <= 1) return null;
    const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#EF4447'];
    return {
      labels: assets.map(a => a.symbol || a.coin_id),
      datasets: [{
        data: assets.map(a => {
          const p = prices.find(pr => pr.coin_id === a.coin_id);
          return a.amount * (p?.current_price || 0);
        }),
        backgroundColor: colors.slice(0, assets.length),
        borderColor: 'rgba(24, 24, 27, 0.8)',
        borderWidth: 2,
      }]
    };
  }, [assets, prices]);

  const donutOpts: any = {
    responsive: true, maintainAspectRatio: false, cutout: '70%',
    plugins: {
      legend: { position: 'right' as const, labels: { color: '#a1a1aa', font: { size: 10 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 } },
      tooltip: {
        backgroundColor: 'rgba(24, 24, 27, 0.95)', titleColor: '#e4e4e7', bodyColor: '#a1a1aa',
        borderColor: 'rgba(63, 63, 70, 0.5)', borderWidth: 1, cornerRadius: 8,
        callbacks: { label: (ctx: any) => ` ${ctx.label}: ${sym}${fmt(ctx.parsed)} (${((ctx.parsed / totalValue) * 100).toFixed(1)}%)` }
      }
    }
  };

  const lineOpts: any = {
    responsive: true, maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(24, 24, 27, 0.95)', titleColor: '#e4e4e7', bodyColor: '#a1a1aa',
        borderColor: 'rgba(63, 63, 70, 0.5)', borderWidth: 1, cornerRadius: 8,
        callbacks: { label: (ctx: any) => `${sym}${fmt(ctx.parsed.y)}` }
      }
    },
    scales: {
      x: { ticks: { color: '#71717a', font: { size: 10 }, maxTicksLimit: 8 }, grid: { display: false }, border: { color: 'rgba(113,113,122,0.15)' } },
      y: { ticks: { color: '#71717a', font: { size: 10 }, maxTicksLimit: 5, callback: (v: any) => `${sym}${v}` }, grid: { color: 'rgba(113,113,122,0.08)' }, border: { display: false } },
    },
  };

  const ago = lastUpdated ? (() => { const s = Math.floor((Date.now() - lastUpdated) / 1000); return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`; })() : null;

  const filteredCoins = useMemo(() => {
    const q = searchCoin.trim().toLowerCase();
    if (!q) return POPULAR_COINS.slice(0, 8);
    return POPULAR_COINS.filter(c =>
      c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [searchCoin]);

  const canUseCustom = searchCoin.trim().length > 0 && filteredCoins.length === 0 && !selectedCoinId;

  const handleSelectCoin = (coin: typeof POPULAR_COINS[0]) => {
    setSelectedCoinId(coin.id);
    setSearchCoin(`${coin.name} (${coin.symbol})`);
  };

  const handleUseCustom = () => {
    const raw = searchCoin.trim().toLowerCase().replace(/\s+/g, '-');
    setSelectedCoinId(raw);
  };

  const handleAddAsset = () => {
    if (!selectedCoinId) return;
    let amount: number;
    if (addMode === 'from-spend') {
      if (!newTotalSpent || !newAssetAvgPrice) return;
      const spent = parseFloat(newTotalSpent);
      const avgPrice = parseFloat(newAssetAvgPrice);
      if (!spent || !avgPrice) return;
      amount = spent / avgPrice;
    } else {
      if (!newAssetAmount) return;
      amount = parseFloat(newAssetAmount);
    }
    const coin = POPULAR_COINS.find(c => c.id === selectedCoinId);
    const newAssets = [...assets, {
      coin_id: selectedCoinId,
      symbol: coin?.symbol || selectedCoinId.split('-').pop()?.toUpperCase() || selectedCoinId.slice(0, 4).toUpperCase(),
      amount,
      avg_buy_price: parseFloat(newAssetAvgPrice) || 0,
    }];
    onChange('assets', JSON.stringify(newAssets));
    setShowAddAsset(false);
    setSearchCoin('');
    setSelectedCoinId('');
    setNewAssetAmount('');
    setNewAssetAvgPrice('');
    setNewTotalSpent('');
    setAddMode('manual');
  };

  const handleRemoveAsset = (idx: number) => {
    const newAssets = assets.filter((_, i) => i !== idx);
    onChange('assets', JSON.stringify(newAssets));
  };

  const handleStartEdit = (idx: number) => {
    const a = assets[idx];
    setEditingCoinIdx(idx);
    setEditAmount(String(a.amount));
    setEditAvgPrice(String(a.avg_buy_price));
  };

  const handleSaveEdit = () => {
    if (editingCoinIdx === null) return;
    const newAssets = [...assets];
    newAssets[editingCoinIdx] = {
      ...newAssets[editingCoinIdx],
      amount: parseFloat(editAmount) || 0,
      avg_buy_price: parseFloat(editAvgPrice) || 0,
    };
    onChange('assets', JSON.stringify(newAssets));
    setEditingCoinIdx(null);
    setEditAmount('');
    setEditAvgPrice('');
  };

  if (!hasAssets) {
    return (
      <div className="space-y-3">
        {/* Empty state — big, friendly, impossible to miss */}
        <div className="flex flex-col items-center py-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#8B5CF6]/10 flex items-center justify-center mb-4">
            <Wallet className="w-8 h-8 text-[#8B5CF6]" />
          </div>
          <p className="text-base text-white font-semibold">This wallet is empty</p>
          <p className="text-[11px] text-zinc-500 mt-1.5 max-w-[240px] leading-relaxed">
            Add the cryptocurrencies you own to see live prices, portfolio value, and performance charts.
          </p>
          <button onClick={() => setShowAddAsset(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-sm font-medium transition-all mt-5 shadow-lg shadow-[#8B5CF6]/20">
            <Plus className="w-4 h-4" /> Add Your First Coin
          </button>
        </div>

        {/* Wallet metadata fields — demoted below the CTA */}
        <GlassSurface tier={2} className="p-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Wallet Details</div>
          <div className="space-y-1">
            <FieldRow label="Blockchain" value={metadata.blockchain} onChange={v => onChange('blockchain', v)} />
            <FieldRow label="Wallet Address" value={metadata.wallet_address} masked />
            <FieldRow label="Notes" value={metadata.notes} onChange={v => onChange('notes', v)} />
          </div>
        </GlassSurface>

        {/* Add Asset form */}
        {showAddAsset && (
          <GlassSurface tier={2} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-[#8B5CF6]/20 flex items-center justify-center">
                <Plus className="w-3.5 h-3.5 text-[#8B5CF6]" />
              </div>
              <div className="text-sm font-medium text-white">Add a Coin</div>
            </div>

            <div className="space-y-3">
              {/* Coin picker */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="block text-[10px] font-medium text-zinc-400">Select Coin</label>
                  <div className="relative group">
                    <div className="w-3.5 h-3.5 rounded-full bg-zinc-700/50 flex items-center justify-center cursor-help">
                      <span className="text-[8px] text-zinc-400">?</span>
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                      <p className="text-[10px] text-zinc-300 leading-relaxed">
                        CoinGecko ID is the unique API identifier for each coin. Find yours by searching a coin at <span className="text-zinc-400">coingecko.com</span> — the ID is in the URL (e.g. <code className="text-[#A78BFA]">coingecko.com/en/coins/<u>bitcoin</u></code>).
                      </p>
                    </div>
                  </div>
                </div>
                <input
                  value={searchCoin}
                  onChange={e => { setSearchCoin(e.target.value); setSelectedCoinId(''); }}
                  placeholder="Search coins (e.g. Bitcoin, BTC)"
                  autoFocus
                  className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                />
                {filteredCoins.length > 0 && (
                  <div className="mt-1.5 max-h-[180px] overflow-y-auto rounded-lg border border-zinc-700/30 bg-zinc-800/60">
                    {filteredCoins.map(coin => (
                      <button
                        key={coin.id}
                        onClick={() => handleSelectCoin(coin)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-zinc-700/40 ${selectedCoinId === coin.id ? 'bg-[#8B5CF6]/10' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white font-medium">{coin.name}</span>
                          <span className="text-[10px] text-zinc-500">{coin.symbol}</span>
                        </div>
                        {selectedCoinId === coin.id && <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />}
                      </button>
                    ))}
                  </div>
                )}
                {canUseCustom && (
                  <button
                    onClick={handleUseCustom}
                    className="mt-1.5 w-full text-left px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/40 border border-zinc-700/30 transition-colors"
                  >
                    <span className="text-[10px] text-zinc-400">Not in the list? </span>
                    <span className="text-[10px] text-[#A78BFA] font-medium">Use '{searchCoin.trim().toLowerCase().replace(/\s+/g, '-')}' as CoinGecko ID</span>
                  </button>
                )}
              </div>

              {/* Input mode toggle */}
              <div className="flex gap-2">
                <button onClick={() => { setAddMode('manual'); setNewTotalSpent(''); }}
                  className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all ${addMode === 'manual' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'bg-zinc-800/60 text-zinc-500 hover:text-zinc-300'}`}>
                  Manual
                </button>
                <button onClick={() => { setAddMode('from-spend'); setNewAssetAmount(''); }}
                  className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all ${addMode === 'from-spend' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'bg-zinc-800/60 text-zinc-500 hover:text-zinc-300'}`}>
                  From Spend
                </button>
              </div>

              {addMode === 'manual' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-400 mb-1.5">Amount You Own</label>
                    <input
                      value={newAssetAmount}
                      onChange={e => setNewAssetAmount(e.target.value)}
                      placeholder="0.00"
                      type="number"
                      step="any"
                      className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-400 mb-1.5">Avg Buy Price <span className="text-zinc-600 font-normal">(optional)</span></label>
                    <input
                      value={newAssetAvgPrice}
                      onChange={e => setNewAssetAvgPrice(e.target.value)}
                      placeholder={`${sym}0.00`}
                      type="number"
                      step="any"
                      className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-400 mb-1.5">Total Spent</label>
                    <input
                      value={newTotalSpent}
                      onChange={e => setNewTotalSpent(e.target.value)}
                      placeholder={`${sym}0.00`}
                      type="number"
                      step="any"
                      className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                    />
                    <p className="text-[9px] text-zinc-600 mt-1">Total money you put into this coin</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-400 mb-1.5">Avg Buy Price</label>
                    <input
                      value={newAssetAvgPrice}
                      onChange={e => setNewAssetAvgPrice(e.target.value)}
                      placeholder={`${sym}0.00`}
                      type="number"
                      step="any"
                      className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                    />
                    <p className="text-[9px] text-zinc-600 mt-1">Amount = Total Spent &divide; Avg Buy Price</p>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Live prices are fetched from <strong className="text-zinc-400">CoinGecko</strong>. To track individual buys, sells, and fees, use the <strong className="text-zinc-400">Transactions</strong> tab.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleAddAsset}
                  disabled={!selectedCoinId || (addMode === 'manual' ? !newAssetAmount : (!newTotalSpent || !newAssetAvgPrice))}
                  className="flex-1 py-2.5 rounded-lg bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-all"
                >
                  Add Coin
                </button>
                <button
                  onClick={() => { setShowAddAsset(false); setSearchCoin(''); setSelectedCoinId(''); setNewAssetAmount(''); setNewAssetAvgPrice(''); setNewTotalSpent(''); setAddMode('manual'); }}
                  className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </GlassSurface>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loadingPrices && prices.length === 0 && (
        <div className="animate-pulse space-y-3">
          <GlassSurface tier={2} className="p-4"><div className="h-14" /></GlassSurface>
          <GlassSurface tier={2} className="p-3"><div className="h-[220px]" /></GlassSurface>
        </div>
      )}

      {error && !loadingPrices && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /><span>{error}</span>
          <button onClick={() => { setLoadingPrices(true); setError(null); }} className="ml-auto text-[10px] underline hover:no-underline">Retry</button>
        </div>
      )}

      {stale && !error && !loadingPrices && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /><span>Cached prices from {ago || 'earlier'}</span>
        </div>
      )}

      <GlassSurface tier={2} className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">Portfolio Value</div>
            <div className="text-xl font-bold text-white tabular-nums mt-1">{prices.length > 0 ? `${sym}${fmt(totalValue)}` : '\u2014'}</div>
          </div>
          {pc24h !== null && (
            <div className={`text-right ${pc24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <div className="text-sm font-semibold tabular-nums">{pc24h >= 0 ? '+' : ''}{fmt(pc24h)}%</div>
              <div className="text-[10px] opacity-70">24h</div>
            </div>
          )}
        </div>
        {totalCost > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 text-[11px]">
            <span className="text-zinc-500">P&amp;L</span>
            <span className={`font-medium tabular-nums ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}{sym}{fmt(totalPnl)}
            </span>
            <span className={`tabular-nums ${totalPnl >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
              ({totalPnlPct >= 0 ? '+' : ''}{fmt(totalPnlPct, 1, 1)}%)
            </span>
          </div>
        )}
      </GlassSurface>

      <GlassSurface tier={2} className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">Performance</div>
          <div className="flex items-center gap-1">
            {TIMEFRAMES.map(tf => (
              <button key={tf.label} onClick={() => setTimeframeDays(tf.days)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${timeframeDays === tf.days ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                {tf.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[220px]">
          {lineData ? <Line data={lineData} options={lineOpts} />
            : loadingHistory ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-zinc-600">Loading chart&hellip;</span>
                </div>
              </div>
            ) : prices.length > 0 ? (
              <div className="h-full flex items-center justify-center"><span className="text-[10px] text-zinc-600">Chart data unavailable</span></div>
            ) : null}
        </div>
      </GlassSurface>

      {donutData && (
        <GlassSurface tier={2} className="p-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-3">Allocation</div>
          <div className="h-[160px]"><Doughnut data={donutData} options={donutOpts} /></div>
        </GlassSurface>
      )}

      <GlassSurface tier={2} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">Assets</div>
          <button onClick={() => setShowAddAsset(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#8B5CF6] hover:bg-[#8B5CF6]/10 transition-colors">
            <Plus className="w-3 h-3" /> Add Coin
          </button>
        </div>
        <div className="space-y-1">
          {assets.map((a, idx) => {
            const p = prices.find(pr => pr.coin_id === a.coin_id);
            const price = p?.current_price || 0;
            const change = p?.price_change_percentage_24h ?? null;
            const value = a.amount * price;
            const assetPnl = value - (a.amount * a.avg_buy_price);
            const assetPnlPct = a.avg_buy_price > 0 ? (assetPnl / (a.amount * a.avg_buy_price)) * 100 : 0;
            const isEditing = editingCoinIdx === idx;
            return (
              <div key={idx} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-zinc-800/20 hover:bg-zinc-800/40 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-md bg-[#8B5CF6]/15 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-[#8B5CF6]">{a.symbol ? a.symbol.slice(0, 2) : '?'}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-200 font-medium">{a.symbol || a.coin_id}</div>
                    {isEditing ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input value={editAmount} onChange={e => setEditAmount(e.target.value)}
                          type="number" step="any"
                          className="w-20 bg-zinc-800 border border-zinc-700/50 rounded px-1.5 py-0.5 text-[10px] text-white tabular-nums" />
                        <span className="text-[9px] text-zinc-600">@</span>
                        <input value={editAvgPrice} onChange={e => setEditAvgPrice(e.target.value)}
                          type="number" step="any"
                          className="w-20 bg-zinc-800 border border-zinc-700/50 rounded px-1.5 py-0.5 text-[10px] text-white tabular-nums" />
                        <button onClick={handleSaveEdit}
                          className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">Save</button>
                        <button onClick={() => setEditingCoinIdx(null)}
                          className="px-2 py-0.5 rounded text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors">X</button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-500 tabular-nums">{fmtCrypto(a.amount)}</div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-xs text-zinc-200 tabular-nums">{sym}{fmt(value)}</div>
                  <div className="flex items-center gap-1.5 justify-end">
                    {change !== null && (
                      <span className={`text-[10px] tabular-nums ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {change >= 0 ? '+' : ''}{fmt(change, 1, 1)}%
                      </span>
                    )}
                    {a.avg_buy_price > 0 && (
                      <span className={`text-[10px] tabular-nums ${assetPnl >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                        {assetPnl >= 0 ? '+' : ''}{fmt(assetPnlPct, 1, 1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0 ml-2">
                  <button onClick={() => handleStartEdit(idx)} className="p-1 rounded text-zinc-600 hover:text-[#A78BFA] hover:bg-[#8B5CF6]/10 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleRemoveAsset(idx)} className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </GlassSurface>

      {showAddAsset && (
        <GlassSurface tier={2} className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-[#8B5CF6]/20 flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-[#8B5CF6]" />
            </div>
            <div className="text-sm font-medium text-white">Add a Coin</div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="block text-[10px] font-medium text-zinc-400">Select Coin</label>
                <div className="relative group">
                  <div className="w-3.5 h-3.5 rounded-full bg-zinc-700/50 flex items-center justify-center cursor-help">
                    <span className="text-[8px] text-zinc-400">?</span>
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                    <p className="text-[10px] text-zinc-300 leading-relaxed">
                      CoinGecko ID is the unique API identifier for each coin. Find yours by searching a coin at <span className="text-zinc-400">coingecko.com</span> — the ID is in the URL (e.g. <code className="text-[#A78BFA]">coingecko.com/en/coins/<u>bitcoin</u></code>).
                    </p>
                  </div>
                </div>
              </div>
              <input
                value={searchCoin}
                onChange={e => { setSearchCoin(e.target.value); setSelectedCoinId(''); }}
                placeholder="Search coins (e.g. Bitcoin, BTC)"
                autoFocus
                className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
              />
              {filteredCoins.length > 0 && (
                <div className="mt-1.5 max-h-[180px] overflow-y-auto rounded-lg border border-zinc-700/30 bg-zinc-800/60">
                  {filteredCoins.map(coin => (
                    <button
                      key={coin.id}
                      onClick={() => handleSelectCoin(coin)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors hover:bg-zinc-700/40 ${selectedCoinId === coin.id ? 'bg-[#8B5CF6]/10' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white font-medium">{coin.name}</span>
                        <span className="text-[10px] text-zinc-500">{coin.symbol}</span>
                      </div>
                      {selectedCoinId === coin.id && <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />}
                    </button>
                  ))}
                </div>
              )}
              {canUseCustom && (
                <button
                  onClick={handleUseCustom}
                  className="mt-1.5 w-full text-left px-3 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/40 border border-zinc-700/30 transition-colors"
                >
                  <span className="text-[10px] text-zinc-400">Not in the list? </span>
                  <span className="text-[10px] text-[#A78BFA] font-medium">Use '{searchCoin.trim().toLowerCase().replace(/\s+/g, '-')}' as CoinGecko ID</span>
                </button>
              )}
            </div>

            {/* Input mode toggle */}
            <div className="flex gap-2">
              <button onClick={() => { setAddMode('manual'); setNewTotalSpent(''); }}
                className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all ${addMode === 'manual' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'bg-zinc-800/60 text-zinc-500 hover:text-zinc-300'}`}>
                Manual
              </button>
              <button onClick={() => { setAddMode('from-spend'); setNewAssetAmount(''); }}
                className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all ${addMode === 'from-spend' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'bg-zinc-800/60 text-zinc-500 hover:text-zinc-300'}`}>
                From Spend
              </button>
            </div>

            {addMode === 'manual' ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-zinc-400 mb-1.5">Amount You Own</label>
                  <input
                    value={newAssetAmount}
                    onChange={e => setNewAssetAmount(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    step="any"
                    className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-zinc-400 mb-1.5">Avg Buy Price <span className="text-zinc-600 font-normal">(optional)</span></label>
                  <input
                    value={newAssetAvgPrice}
                    onChange={e => setNewAssetAvgPrice(e.target.value)}
                    placeholder={`${sym}0.00`}
                    type="number"
                    step="any"
                    className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-zinc-400 mb-1.5">Total Spent</label>
                  <input
                    value={newTotalSpent}
                    onChange={e => setNewTotalSpent(e.target.value)}
                    placeholder={`${sym}0.00`}
                    type="number"
                    step="any"
                    className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                  />
                  <p className="text-[9px] text-zinc-600 mt-1">Total money you put into this coin</p>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-zinc-400 mb-1.5">Avg Buy Price</label>
                  <input
                    value={newAssetAvgPrice}
                    onChange={e => setNewAssetAvgPrice(e.target.value)}
                    placeholder={`${sym}0.00`}
                    type="number"
                    step="any"
                    className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                  />
                  <p className="text-[9px] text-zinc-600 mt-1">Amount = Total Spent &divide; Avg Buy Price</p>
                </div>
              </div>
            )}

            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Live prices are fetched from <strong className="text-zinc-400">CoinGecko</strong>. To track individual buys, sells, and fees, use the <strong className="text-zinc-400">Transactions</strong> tab.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleAddAsset}
                disabled={!selectedCoinId || (addMode === 'manual' ? !newAssetAmount : (!newTotalSpent || !newAssetAvgPrice))}
                className="flex-1 py-2.5 rounded-lg bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-all"
              >
                Add Coin
              </button>
              <button
                onClick={() => { setShowAddAsset(false); setSearchCoin(''); setSelectedCoinId(''); setNewAssetAmount(''); setNewAssetAvgPrice(''); setNewTotalSpent(''); setAddMode('manual'); }}
                className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </GlassSurface>
      )}

      {totalCost > 0 && (
        <GlassSurface tier={2} className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">Total P&amp;L</span>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold tabular-nums ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalPnl >= 0 ? '+' : ''}{sym}{fmt(totalPnl)}
              </span>
              <span className={`text-[10px] tabular-nums ${totalPnl >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                ({totalPnlPct >= 0 ? '+' : ''}{fmt(totalPnlPct, 1, 1)}%)
              </span>
            </div>
          </div>
        </GlassSurface>
      )}

      <GlassSurface tier={2} className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Wallet Details</div>
        <div className="space-y-1">
          <FieldRow label="Blockchain" value={metadata.blockchain} onChange={v => onChange('blockchain', v)} />
          <FieldRow label="Wallet Address" value={metadata.wallet_address} masked />
          <FieldRow label="Notes" value={metadata.notes} onChange={v => onChange('notes', v)} />
        </div>
      </GlassSurface>

      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-zinc-600">
          Prices from CoinGecko{ago ? <span className="text-zinc-700"> &middot; Updated {ago}</span> : ''}
        </span>
        <button onClick={() => { setLoadingPrices(true); setError(null); }} disabled={loadingPrices}
          className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-white transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${loadingPrices ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
    </div>
  );
}

function CashDetail({ metadata, onChange, onDenominationsChange, displayCurrency, onTotalValueChange }: {
  metadata: Record<string, any>; onChange: (k: string, v: string) => void;
  onDenominationsChange: (d: CashDenomination[]) => void; displayCurrency: string;
  onTotalValueChange?: (v: number) => void;
}) {
  const sym = getCurrencyInfo(displayCurrency).symbol;
  const denoms: CashDenomination[] = useMemo(() => {
    if (Array.isArray(metadata.denominations) && metadata.denominations.length > 0) return metadata.denominations;
    return getDenominations(displayCurrency).map(d => ({ value: d.value, label: d.label, count: 0 }));
  }, [metadata.denominations, displayCurrency]);

  const total = useMemo(() => denoms.reduce((s, d) => s + d.value * d.count, 0), [denoms]);
  const isEmpty = denoms.every(d => d.count === 0);

  useEffect(() => { onTotalValueChange?.(total); }, [total, onTotalValueChange]);

  const updateCount = (idx: number, count: number) => {
    const next = [...denoms];
    next[idx] = { ...next[idx], count: Math.max(0, count) };
    onDenominationsChange(next);
  };

  const quickAdd = (value: number) => {
    const idx = denoms.findIndex(d => d.value === value);
    if (idx >= 0) updateCount(idx, denoms[idx].count + 1);
  };

  return (
    <div className="space-y-4">
      <GlassSurface tier={2} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">Denominations</div>
          <div className="text-sm font-semibold text-white tabular-nums">{sym}{total.toFixed(2)}</div>
        </div>

        {isEmpty && (
          <div className="text-center py-4 mb-3">
            <p className="text-xs text-zinc-500">Enter your physical cash by adding bills below.</p>
          </div>
        )}

        <div className="space-y-1">
          {denoms.map((d, i) => (
            <div key={d.label} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-800/30">
              <span className="text-xs text-zinc-300 w-14">{d.label}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateCount(i, d.count - 1)} className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700/50 text-sm">-</button>
                <span className="text-xs tabular-nums text-zinc-200 w-8 text-center">{d.count}</span>
                <button onClick={() => updateCount(i, d.count + 1)} className="w-6 h-6 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700/50 text-sm">+</button>
              </div>
              <span className="text-xs tabular-nums text-zinc-400 w-20 text-right">{sym}{(d.value * d.count).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-3 mt-2 border-t border-white/5">
          <span className="text-xs font-medium text-zinc-300">Total</span>
          <span className="text-sm font-bold text-white tabular-nums">{sym}{total.toFixed(2)}</span>
        </div>
      </GlassSurface>

      <GlassSurface tier={2} className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Quick Add</div>
        <div className="flex flex-wrap gap-1.5">
          {getDenominations(displayCurrency).filter(d => d.value >= 1).map(d => (
            <button key={d.value} onClick={() => quickAdd(d.value)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800/50 text-zinc-300 hover:text-white hover:bg-zinc-700/50 text-[10px] font-medium transition-colors">
              +{d.label}
            </button>
          ))}
        </div>
      </GlassSurface>

      <GlassSurface tier={2} className="p-4">
        <FieldRow label="Notes" value={metadata.notes} onChange={v => onChange('notes', v)} />
      </GlassSurface>
    </div>
  );
}

function PhysicalDetail({ metadata, onChange, onDenominationsChange, transactions, displayCurrency, onTotalValueChange }: {
  metadata: Record<string, any>; onChange: (k: string, v: string) => void;
  onDenominationsChange: (d: CashDenomination[]) => void; transactions: FinanceTransaction[]; displayCurrency: string;
  onTotalValueChange?: (v: number) => void;
}) {
  const sym = getCurrencyInfo(displayCurrency).symbol;
  const denoms: CashDenomination[] = useMemo(() => {
    if (Array.isArray(metadata.denominations) && metadata.denominations.length > 0) return metadata.denominations;
    return getDenominations(displayCurrency).map(d => ({ value: d.value, label: d.label, count: 0 }));
  }, [metadata.denominations, displayCurrency]);

  const total = useMemo(() => denoms.reduce((s, d) => s + d.value * d.count, 0), [denoms]);
  const isEmpty = denoms.every(d => d.count === 0);

  useEffect(() => { onTotalValueChange?.(total); }, [total, onTotalValueChange]);

  const updateCount = (idx: number, count: number) => {
    const next = [...denoms];
    next[idx] = { ...next[idx], count: Math.max(0, count) };
    onDenominationsChange(next);
  };

  const walletTxns = useMemo(() =>
    transactions.filter(t => t.type === 'expense' || t.type === 'income'),
    [transactions]
  );

  return (
    <div className="space-y-4">
      <GlassSurface tier={2} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">Wallet Contents</div>
          <div className="text-sm font-semibold text-white tabular-nums">{sym}{total.toFixed(2)}</div>
        </div>

        {isEmpty && (
          <div className="text-center py-4 mb-3">
            <p className="text-xs text-zinc-500">No cash counted yet. Add bills using the controls below.</p>
          </div>
        )}

        <div className="space-y-1">
          {denoms.map((d, i) => (
            <div key={d.label} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-800/30">
              <span className="text-xs text-zinc-300 w-14">{d.label}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => updateCount(i, d.count - 1)}
                  className="h-11 w-11 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700/50 active:scale-95 text-sm transition-all">-</button>
                <span className="text-xs tabular-nums text-zinc-200 w-12 text-center">{d.count}</span>
                <button onClick={() => updateCount(i, d.count + 1)}
                  className="h-11 w-11 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700/50 active:scale-95 text-sm transition-all">+</button>
              </div>
              <span className="text-sm tabular-nums text-zinc-400 w-24 text-right">{sym}{(d.value * d.count).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-3 mt-2 border-t border-zinc-700/50">
          <span className="text-xs font-medium text-zinc-300">Total</span>
          <span className="text-xl font-bold text-white tabular-nums">{sym}{total.toFixed(2)}</span>
        </div>
      </GlassSurface>

      <GlassSurface tier={2} className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Quick Add</div>
        <div className="flex flex-wrap gap-2">
          {getDenominations(displayCurrency).filter(d => d.value >= 1).map(d => (
            <button key={d.value} onClick={() => {
              const idx = denoms.findIndex(x => x.value === d.value);
              if (idx >= 0) updateCount(idx, denoms[idx].count + 1);
            }}
            className="h-11 px-4 rounded-full bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20 hover:bg-[#F97316]/20 active:scale-95 text-[10px] font-medium transition-all">
              +{d.label}
            </button>
          ))}
        </div>
      </GlassSurface>

      <GlassSurface tier={2} className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Description</div>
        <div className="space-y-2">
          <input
            value={metadata.description || ''}
            onChange={e => onChange('description', e.target.value)}
            placeholder="Where is this wallet? (e.g. Brown leather bifold)"
            className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F97316]/50"
          />
          <textarea
            value={metadata.notes || ''}
            onChange={e => onChange('notes', e.target.value)}
            placeholder="Notes..."
            rows={2}
            className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F97316]/50 resize-none"
          />
        </div>
      </GlassSurface>

      <GlassSurface tier={2} className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Recent Transactions</div>
        {walletTxns.length === 0 ? (
          <div className="text-center py-4 text-xs text-zinc-500">No transactions yet. Tap + to add one.</div>
        ) : (
          <TransactionList transactions={walletTxns} displayCurrency={displayCurrency} />
        )}
      </GlassSurface>
    </div>
  );
}

function EwalletDetail({ metadata, onChange, transactions, displayCurrency }: {
  metadata: Record<string, any>; onChange: (k: string, v: string) => void;
  transactions: FinanceTransaction[]; displayCurrency: string;
}) {
  const [showAddLink, setShowAddLink] = useState(false);
  const [newProvider, setNewProvider] = useState('');
  const [newLastFour, setNewLastFour] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const linkedAccounts: { provider: string; lastFour?: string; label?: string }[] =
    Array.isArray(metadata.linkedAccounts) ? metadata.linkedAccounts : [];

  const handleAddLink = () => {
    if (!newProvider) return;
    const updated = [...linkedAccounts, { provider: newProvider, lastFour: newLastFour || undefined, label: newLabel || undefined }];
    onChange('linkedAccounts', JSON.stringify(updated));
    setShowAddLink(false); setNewProvider(''); setNewLastFour(''); setNewLabel('');
  };

  const handleRemoveLink = (idx: number) => {
    const updated = linkedAccounts.filter((_, i) => i !== idx);
    onChange('linkedAccounts', JSON.stringify(updated));
  };

  return (
    <div className="space-y-4">
      <GlassSurface tier={2} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500">Linked Payment Methods</div>
          <button onClick={() => setShowAddLink(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#06B6D4] hover:bg-[#06B6D4]/10 transition-colors">
            <Plus className="w-3 h-3" /> Link Card
          </button>
        </div>
        {linkedAccounts.length === 0 ? (
          <div className="text-center py-4 text-xs text-zinc-500">No linked payment methods</div>
        ) : (
          <div className="space-y-1">
            {linkedAccounts.map((link, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-800/30">
                <div className="flex items-center gap-2 min-w-0">
                  <CreditCard className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-300">{link.provider}{link.lastFour ? ` \u2022\u2022\u2022${link.lastFour}` : ''}</div>
                    {link.label && <div className="text-[10px] text-zinc-500">{link.label}</div>}
                  </div>
                </div>
                <button onClick={() => handleRemoveLink(idx)} className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0">
                  <Unlink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassSurface>

      {showAddLink && (
        <GlassSurface tier={2} className="p-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Link New Card</div>
          <div className="space-y-2">
            <input value={newProvider} onChange={e => setNewProvider(e.target.value)} placeholder="Provider (e.g. Visa)"
              className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/50" />
            <div className="flex gap-2">
              <input value={newLastFour} onChange={e => setNewLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Last 4" maxLength={4}
                className="flex-1 bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/50" />
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label (optional)"
                className="flex-1 bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#06B6D4]/50" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddLink} className="flex-1 py-2 rounded-lg bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-white text-xs font-medium transition-colors">Link</button>
              <button onClick={() => setShowAddLink(false)} className="flex-1 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors">Cancel</button>
            </div>
          </div>
        </GlassSurface>
      )}

      <GlassSurface tier={2} className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Details</div>
        <div className="space-y-1">
          <FieldRow label="Platform" value={metadata.platform} onChange={v => onChange('platform', v)} />
          <FieldRow label="Phone / Email" value={metadata.phone_or_email} onChange={v => onChange('phone_or_email', v)} />
          <FieldRow label="Daily Limit" value={metadata.daily_limit ?? ''} onChange={v => onChange('daily_limit', v)} type="number" />
          <FieldRow label="Notes" value={metadata.notes} onChange={v => onChange('notes', v)} />
        </div>
      </GlassSurface>

      <GlassSurface tier={2} className="p-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500 mb-2">Recent Transactions</div>
        <TransactionList transactions={transactions} displayCurrency={displayCurrency} />
      </GlassSurface>
    </div>
  );
}

function OtherDetail({ metadata, onChange }: { metadata: Record<string, any>; onChange: (k: string, v: string) => void }) {
  return (
    <GlassSurface tier={2} className="p-4">
      <FieldRow label="Notes" value={metadata.notes} onChange={v => onChange('notes', v)} />
    </GlassSurface>
  );
}

export function WalletDetailView({ wallet, displayCurrency, transactions, wallets, onBack, onSaveMetadata, onUpdateWallet, onDeleteWallet, onAddTransaction, onDirtyChange }: WalletDetailViewProps) {
  const meta = walletMeta[wallet.type] || walletMeta.other;
  const WalletIcon = meta.icon;
  const [editName, setEditName] = useState(false);
  const [nameBuf, setNameBuf] = useState(wallet.name);
  const [localMetadata, setLocalMetadata] = useState<Record<string, any>>(wallet.metadata || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cryptoLiveTotal, setCryptoLiveTotal] = useState(0);
  const cryptoTotalRef = useRef(0);
  const [cashLiveTotal, setCashLiveTotal] = useState(0);
  const cashTotalRef = useRef(0);
  const symbol = getCurrencyInfo(displayCurrency).symbol;

  const walletTransactions = useMemo(() =>
    transactions.filter(t => t.wallet_id === wallet.id),
    [transactions, wallet.id]
  );

  useEffect(() => { setLocalMetadata(wallet.metadata || {}); setNameBuf(wallet.name); }, [wallet]);

  const isDirty = nameBuf !== wallet.name || JSON.stringify(localMetadata) !== JSON.stringify(wallet.metadata || {});
  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const handleMetadataChange = useCallback((key: string, value: string) => {
    let parsed: any = value;
    try { parsed = JSON.parse(value); } catch { /* keep as string */ }
    setLocalMetadata(prev => ({ ...prev, [key]: parsed }));
  }, []);

  const handleDenominationsChange = useCallback((d: CashDenomination[]) => {
    setLocalMetadata(prev => ({ ...prev, denominations: d }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      let newBalance = wallet.balance;
      if ((wallet.type === 'cash' || wallet.type === 'physical') && cashTotalRef.current > 0) {
        newBalance = cashTotalRef.current;
      } else if ((wallet.type === 'cash' || wallet.type === 'physical') && Array.isArray(localMetadata.denominations)) {
        newBalance = localMetadata.denominations.reduce((sum: number, d: CashDenomination) => sum + d.value * d.count, 0);
      }
      if (wallet.type === 'crypto' && cryptoTotalRef.current > 0) {
        newBalance = cryptoTotalRef.current;
      }
      const needsWalletUpdate = nameBuf !== wallet.name || Math.abs(newBalance - wallet.balance) > 0.001;
      if (needsWalletUpdate) {
        await onUpdateWallet({
          id: wallet.id, name: nameBuf, type: wallet.type,
          provider: wallet.provider || undefined, last_four: wallet.last_four || undefined,
          balance: newBalance, currency: wallet.currency,
        });
      }
      await onSaveMetadata(wallet.id, localMetadata);
      onDirtyChange?.(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  const renderDetailBody = () => {
    switch (wallet.type) {
      case 'bank': return <BankDetail metadata={localMetadata} onChange={handleMetadataChange} transactions={walletTransactions} displayCurrency={displayCurrency} />;
      case 'debit_card': return <DebitCardDetail metadata={localMetadata} onChange={handleMetadataChange} transactions={walletTransactions} displayCurrency={displayCurrency} wallets={wallets} />;
      case 'credit_card': return <CreditCardDetail metadata={localMetadata} onChange={handleMetadataChange} wallet={wallet} transactions={walletTransactions} displayCurrency={displayCurrency} />;
      case 'crypto': return <CryptoDetail metadata={localMetadata} onChange={handleMetadataChange} wallet={wallet} displayCurrency={displayCurrency} onTotalValueChange={v => { cryptoTotalRef.current = v; setCryptoLiveTotal(v); }} />;
      case 'cash': return <CashDetail metadata={localMetadata} onChange={handleMetadataChange} onDenominationsChange={handleDenominationsChange} displayCurrency={displayCurrency} onTotalValueChange={v => { cashTotalRef.current = v; setCashLiveTotal(v); }} />;
      case 'physical': return <PhysicalDetail metadata={localMetadata} onChange={handleMetadataChange} onDenominationsChange={handleDenominationsChange} transactions={walletTransactions} displayCurrency={displayCurrency} onTotalValueChange={v => { cashTotalRef.current = v; setCashLiveTotal(v); }} />;
      case 'ewallet': return <EwalletDetail metadata={localMetadata} onChange={handleMetadataChange} transactions={walletTransactions} displayCurrency={displayCurrency} />;
      default: return <OtherDetail metadata={localMetadata} onChange={handleMetadataChange} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassSurface className="p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-2">
            {onDeleteWallet && (
              <button onClick={() => onDeleteWallet(wallet.id)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
              {saved ? <>&#10003; Saved!</> : saving ? <><Save className="w-3 h-3" /> Saving...</> : <><Save className="w-3 h-3" /> Save</>}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}18` }}>
            <WalletIcon className="w-5 h-5" style={{ color: meta.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {editName ? (
                <input autoFocus value={nameBuf} onChange={e => setNameBuf(e.target.value)} onBlur={() => setEditName(false)}
                  onKeyDown={e => e.key === 'Enter' && setEditName(false)}
                  className="text-sm font-medium bg-zinc-800 text-white outline-none px-1 rounded border border-white/10" />
              ) : (
                <h3 className="text-sm font-medium text-white cursor-pointer hover:text-zinc-300 transition-colors" onClick={() => setEditName(true)}>{wallet.name}</h3>
              )}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>{meta.label}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {wallet.provider && <span className="text-[10px] text-zinc-500">{wallet.provider}</span>}
              {wallet.last_four && <span className="text-[10px] text-zinc-500">{'\u2022'.repeat(3)}{wallet.last_four}</span>}
            </div>
          </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                {(wallet.type === 'crypto' || wallet.type === 'cash' || wallet.type === 'physical') ? (
                  <>
                    <div className="text-sm font-semibold text-white tabular-nums">
                      {wallet.type === 'crypto'
                        ? fmtCurrency(cryptoLiveTotal > 0 ? cryptoLiveTotal : wallet.balance, displayCurrency)
                        : fmtCurrency(cashLiveTotal > 0 ? cashLiveTotal : wallet.balance, displayCurrency)}
                    </div>
                    <div className="text-[10px] text-zinc-500">{displayCurrency}</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-semibold text-white tabular-nums">{fmtCurrency(wallet.balance, displayCurrency)}</div>
                    <div className="text-[10px] text-zinc-500">{displayCurrency}</div>
                  </>
                )}
              </div>
            <button onClick={() => onAddTransaction(wallet.type)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-white text-lg font-medium transition-colors"
              style={{ backgroundColor: `${meta.color}30`, color: meta.color }}
              title="Add transaction">
              +
            </button>
          </div>
        </div>

        {renderDetailBody()}
      </GlassSurface>
    </motion.div>
  );
}
