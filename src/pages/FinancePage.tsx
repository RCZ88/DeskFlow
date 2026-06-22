import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Wallet, ArrowUpRight, Tag, Plus, Shield } from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { TabBar } from '../components/TabBar';
import { GlassCard } from '../components/GlassCard';
import { FinanceLockScreen } from '../components/finance/FinanceLockScreen';
import { FinanceStickyHeader } from '../components/finance/FinanceStickyHeader';
import { OverviewTab } from '../components/finance/OverviewTab';
import { AccountsTab } from '../components/finance/AccountsTab';
import { TransactionsTab } from '../components/finance/TransactionsTab';
import { CategoriesTab } from '../components/finance/CategoriesTab';
import { AuroraBackground } from '../components/finance/_fx/AuroraBackground';
import { getCurrencyInfo, formatCurrency, convertAmount } from '../components/finance/currency-data';
import { pageContainer, tabPanel, fab, DUR } from '../components/finance/_fx/financeMotion';
import { QuickAddModal } from '../components/finance/QuickAddModal';
import { ArchivedItemsModal } from '../components/finance/ArchivedItemsModal';
import { PasswordConfirmDialog } from '../components/finance/PasswordConfirmDialog';
import { WalletDetailView } from '../components/finance/WalletDetailView';
import { CryptoMarketTab } from '../components/finance/CryptoMarketTab';
import {
  BankTransactionModal, DebitTransactionModal, CreditTransactionModal,
  CryptoTransactionModal, PhysicalTransactionModal, CashTransactionModal, EwalletTransactionModal,
} from '../components/finance/modals';
import type {
  FinanceAccount, FinanceWallet, FinanceCategory, FinanceTransaction,
  FinanceSummary, FinanceSpendingByCategory, FinanceMonthlyTrend, FinanceTabKey
} from '../components/finance/finance-types';

const SEED_CATEGORIES = [
  { name: 'Salary', type: 'income' as const, icon: 'CircleDollarSign', color: '#10b981', sort_order: 1 },
  { name: 'Freelance', type: 'income' as const, icon: 'CircleDollarSign', color: '#34d399', sort_order: 2 },
  { name: 'Gift', type: 'income' as const, icon: 'CircleDollarSign', color: '#6ee7b7', sort_order: 3 },
  { name: 'Interest', type: 'income' as const, icon: 'CircleDollarSign', color: '#a7f3d0', sort_order: 4 },
  { name: 'Refund', type: 'income' as const, icon: 'CircleDollarSign', color: '#6ee7b7', sort_order: 5 },
  { name: 'Food & Groceries', type: 'expense' as const, icon: 'TrendingDown', color: '#ef4444', sort_order: 6 },
  { name: 'Transport', type: 'expense' as const, icon: 'TrendingDown', color: '#f97316', sort_order: 7 },
  { name: 'Housing', type: 'expense' as const, icon: 'TrendingDown', color: '#f59e0b', sort_order: 8 },
  { name: 'Utilities', type: 'expense' as const, icon: 'TrendingDown', color: '#eab308', sort_order: 9 },
  { name: 'Entertainment', type: 'expense' as const, icon: 'TrendingDown', color: '#ec4899', sort_order: 10 },
  { name: 'Shopping', type: 'expense' as const, icon: 'TrendingDown', color: '#d946ef', sort_order: 11 },
  { name: 'Health', type: 'expense' as const, icon: 'TrendingDown', color: '#8b5cf6', sort_order: 12 },
  { name: 'Education', type: 'expense' as const, icon: 'TrendingDown', color: '#6366f1', sort_order: 13 },
  { name: 'Other', type: 'expense' as const, icon: 'TrendingDown', color: '#52525b', sort_order: 14 },
  { name: 'Transfer', type: 'transfer' as const, icon: 'ArrowLeftRight', color: '#f59e0b', sort_order: 15 },
];

const tabs: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { key: 'accounts', label: 'Accounts', icon: <Wallet className="w-3.5 h-3.5" /> },
  { key: 'crypto', label: 'Crypto', icon: <Wallet className="w-3.5 h-3.5" /> },
  { key: 'transactions', label: 'Transactions', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
  { key: 'categories', label: 'Categories', icon: <Tag className="w-3.5 h-3.5" /> },
];

let pendingLockTimer: ReturnType<typeof setTimeout> | null = null;

export function FinancePage() {
  const [isLocked, setIsLocked] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FinanceTabKey>('overview');
  const location = useLocation();
  useEffect(() => {
    const tab = (location.state as any)?.tab;
    if (tab) setActiveTab(tab);
  }, []);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [walletTxModal, setWalletTxModal] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedAccounts, setArchivedAccounts] = useState<FinanceAccount[]>([]);
  const [archivedWallets, setArchivedWallets] = useState<FinanceWallet[]>([]);
  const [passwordRequirements, setPasswordRequirements] = useState<Record<string, boolean>>({});
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<any>(null);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [wallets, setWallets] = useState<FinanceWallet[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [spendingByCategory, setSpendingByCategory] = useState<FinanceSpendingByCategory[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<FinanceMonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pageAccess, setPageAccess] = useState<{ canAccess: boolean; requiresSetup: boolean; reason?: string } | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const securityCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const passwordResolveRef = useRef<((pw: string | null) => void) | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);

  useEffect(() => {
    checkSetup();
    checkPageAccess();
    if (window.deskflowAPI?.financeGetDisplayCurrency) {
      window.deskflowAPI.financeGetDisplayCurrency().then(result => {
        if (result?.currency) {
          setDisplayCurrency(result.currency);
          setBaseCurrency(result.currency);
        }
      }).catch(() => { });
    }
  }, []);

  useEffect(() => {
    if (window.deskflowAPI) {
      window.deskflowAPI.financeGetSecuritySettings().then(setSecuritySettings);
      window.deskflowAPI.financeGetPasswordRequirements().then(setPasswordRequirements);
    }
  }, []);

  useEffect(() => {
    if (securitySettings) {
      if (securitySettings.locked) {
        setIsLocked(true);
      } else if (securitySettings.rememberDevice && securitySettings.rememberDeviceExpiry && Date.now() < securitySettings.rememberDeviceExpiry) {
        setIsLocked(false);
      }
    }
  }, [securitySettings]);

  const checkSetup = async () => {
    try {
      const result = await window.deskflowAPI?.financeCheckPasswordSetup();
      if (result) {
        const setupResult = result as { hasPassword: boolean };
        setIsFirstTime(!setupResult.hasPassword);
        if (!setupResult.hasPassword) {
          setIsLocked(false);
        } else {
          setIsLocked(true);
        }
      }
    } catch {
      setIsFirstTime(true);
      setIsLocked(false);
    }
  };

  const checkPageAccess = async () => {
    try {
      const result = await window.deskflowAPI?.financeCheckPageAccess();
      if (result) {
        setPageAccess(result);
      }
    } catch (err) {
      console.error('[FinancePage] check page access error:', err);
      setPageAccess({ canAccess: false, requiresSetup: false, reason: 'access_denied' });
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [accts, wals, cats, txns, sum, spend, trends] = await Promise.all([
        (window.deskflowAPI?.financeGetAccounts() as Promise<FinanceAccount[]>) ?? Promise.resolve([]),
        (window.deskflowAPI?.financeGetWallets() as Promise<FinanceWallet[]>) ?? Promise.resolve([]),
        (window.deskflowAPI?.financeGetCategories() as Promise<FinanceCategory[]>) ?? Promise.resolve([]),
        (window.deskflowAPI?.financeGetTransactions() as Promise<FinanceTransaction[]>) ?? Promise.resolve([]),
        (window.deskflowAPI?.financeGetSummary() as Promise<FinanceSummary>) ?? Promise.resolve({ totalIncome: 0, totalExpense: 0, netBalance: 0 }),
        (window.deskflowAPI?.financeGetSpendingByCategory() as Promise<FinanceSpendingByCategory[]>) ?? Promise.resolve([]),
        (window.deskflowAPI?.financeGetMonthlyTrends() as Promise<FinanceMonthlyTrend[]>) ?? Promise.resolve([]),
      ]);
      setAccounts(accts);
      setWallets(wals);
      setCategories(cats);
      setTransactions(txns);
      setSummary(sum);
      const totalExpenseAmt = spend.reduce((s, c) => s + Math.abs(c.amount), 0);
      setSpendingByCategory(spend.map(c => ({
        ...c,
        amount: Math.abs(c.amount),
        percentage: totalExpenseAmt > 0 ? Math.abs(c.amount) / totalExpenseAmt * 100 : 0,
      })));
      setMonthlyTrends(trends);
    } catch (err) {
      console.error('[FinancePage] fetch error:', err);
      setFetchError('Could not load finance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLocked) fetchData();
  }, [isLocked, fetchData]);

  const resetLockTimer = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (pendingLockTimer) { clearTimeout(pendingLockTimer); pendingLockTimer = null; }
  }, []);

  useEffect(() => {
    if (pendingLockTimer) {
      clearTimeout(pendingLockTimer);
      pendingLockTimer = null;
    }
    securityCheckIntervalRef.current = setInterval(() => {
      if (window.deskflowAPI) {
        window.deskflowAPI.financeIsLocked().then(result => {
          setIsLocked(result?.locked ?? true);
        });
      }
    }, 30000);
    return () => {
      if (securityCheckIntervalRef.current) clearInterval(securityCheckIntervalRef.current);
      if (securitySettings?.hasPassword && !securitySettings?.locked) {
        const timeoutMs = securitySettings?.lockTimeout || 5 * 60 * 1000;
        const handleLockClosure = handleLock;
        pendingLockTimer = setTimeout(() => {
          handleLockClosure();
          pendingLockTimer = null;
        }, timeoutMs);
      }
    };
  }, [securitySettings, resetLockTimer]);

  const handleUnlock = async (password: string): Promise<boolean> => {
    try {
      setLockError(null);
      const result = await window.deskflowAPI?.financeUnlock(password) as { success: boolean };
      if (result?.success) {
        setIsLocked(false);
        resetLockTimer();
        return true;
      }
      setLockError('Wrong password');
      return false;
    } catch {
      setLockError('Unlock failed');
      return false;
    }
  };

  const handleSetup = async (password: string): Promise<boolean> => {
    try {
      setLockError(null);
      const result = await window.deskflowAPI?.financeSetPassword(password) as { success: boolean };
      if (result?.success) {
        setIsFirstTime(false);
        setIsLocked(false);
        resetLockTimer();
        return true;
      }
      setLockError('Failed to set password');
      return false;
    } catch {
      setLockError('Setup failed');
      return false;
    }
  };

  const handleBiometricUnlock = async (): Promise<boolean> => {
    try {
      const result = await window.deskflowAPI?.financeBiometricUnlock() as { success: boolean };
      if (result?.success) {
        setIsLocked(false);
        resetLockTimer();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleLock = async () => {
    if (isFirstTime) return;
    await window.deskflowAPI?.financeLock();
    setIsLocked(true);
  };

  useEffect(() => {
    if (selectedWalletId) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSelectedWalletId(null);
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [selectedWalletId]);

  const handleCreateAccount = async (data: {
    name: string; type: FinanceAccount['type']; description?: string;
    icon?: string; color?: string;
  }): Promise<boolean> => {
    try {
      const result = await window.deskflowAPI?.financeCreateAccount({
        name: data.name, type: data.type, description: data.description || null,
        icon: data.icon || 'Wallet', color: data.color || '#10b981',
        currency: 'USD', balance: 0,
      }) as FinanceAccount;
      if (result) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const handleAddTransaction = async (data: {
    account_id: number; wallet_id: number | null; category_id: number;
    type: string; amount: number;
    description: string; note?: string; date: string;
    [key: string]: any;
  }): Promise<boolean> => {
    try {
      const result = await window.deskflowAPI?.financeCreateTransaction(data) as FinanceTransaction;
      if (result) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const handleDeleteTransaction = async (id: number): Promise<boolean> => {
    try {
      const result = await window.deskflowAPI?.financeDeleteTransaction(id) as { success: boolean };
      if (result?.success) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const handleCreateCategory = async (data: {
    name: string; type: FinanceCategory['type']; icon?: string; color?: string;
  }): Promise<boolean> => {
    try {
      const result = await window.deskflowAPI?.financeCreateCategory(data) as FinanceCategory;
      if (result) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const handleCreateWallet = async (data: {
    account_id: number; name: string; type: string; provider?: string;
    last_four?: string; balance?: number; currency?: string;
    metadata?: Record<string, any>;
  }): Promise<boolean> => {
    try {
      const payload = {
        account_id: data.account_id, name: data.name, type: data.type,
        provider: data.provider, last_four: data.last_four,
        balance: data.balance ?? 0, currency: data.currency,
      };
      console.log('[handleCreateWallet] sending:', JSON.stringify(payload));
      const result = await window.deskflowAPI?.financeCreateWallet(payload) as { id: number };
      console.log('[handleCreateWallet] result:', JSON.stringify(result), 'type of id:', typeof result?.id);
      if (result?.id) {
        if (data.metadata && Object.keys(data.metadata).length > 0) {
          await window.deskflowAPI?.financeUpdateWalletMetadata({ id: result.id, metadata: data.metadata });
        }
        await fetchData();
        return true;
      }
      console.warn('[handleCreateWallet] no result.id, returning false');
      return false;
    } catch (e) { console.error('[handleCreateWallet] error:', e); return false; }
  };

  const handleArchiveWallet = async (id: number): Promise<boolean> => {
    try {
      const result = await window.deskflowAPI?.financeArchiveWallet(id) as { success: boolean };
      if (result?.success) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const hasPassword = securitySettings?.hasPassword ?? false;

  const handlePasswordConfirm = async (pw: string): Promise<boolean> => {
    const ok = await window.deskflowAPI?.financeVerifyPassword(pw) as { success: boolean };
    if (ok?.success) {
      const resolve = passwordResolveRef.current;
      if (resolve) {
        passwordResolveRef.current = null;
        resolve(true);
      }
    }
    return ok?.success ?? false;
  };

  const handlePasswordDialogClose = () => {
    setShowPasswordDialog(false);
    const resolve = passwordResolveRef.current;
    if (resolve) {
      passwordResolveRef.current = null;
      resolve(false);
    }
  };

  const checkPasswordRequirement = async (action: string): Promise<boolean> => {
    if (!hasPassword) return true;
    if (passwordRequirements[`password_req_${action}`] !== false) {
      return new Promise<boolean>((resolve) => {
        passwordResolveRef.current = resolve;
        setShowPasswordDialog(true);
      });
    }
    return true;
  };

  const handleDeleteAccount = async (id: number): Promise<boolean> => {
    if (!await checkPasswordRequirement('delete_account')) return false;
    try {
      const result = await window.deskflowAPI?.financeDeleteAccount(id) as { success: boolean };
      if (result?.success) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const handleSaveMetadata = async (id: number, metadata: Record<string, any>): Promise<boolean> => {
    try {
      const result = await window.deskflowAPI?.financeUpdateWalletMetadata({ id, metadata }) as any;
      if (result?.id) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const handleWalletClick = (id: number) => {
    setSelectedWalletId(id);
  };

  const handleDeleteWallet = async (id: number): Promise<boolean> => {
    if (!await checkPasswordRequirement('delete_wallet')) return false;
    try {
      const result = await window.deskflowAPI?.financeDeleteWallet(id) as { success: boolean };
      if (result?.success) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const handleViewArchived = async () => {
    const [archAccts, archWals] = await Promise.all([
      window.deskflowAPI?.financeGetArchivedAccounts() as Promise<FinanceAccount[]>,
      window.deskflowAPI?.financeGetArchivedWallets() as Promise<FinanceWallet[]>,
    ]);
    setArchivedAccounts(archAccts ?? []);
    setArchivedWallets(archWals ?? []);
    setShowArchived(true);
  };

  const handleUnarchiveAccount = async (id: number): Promise<boolean> => {
    try {
      const result = await window.deskflowAPI?.financeUnarchiveAccount(id) as { success: boolean };
      if (result?.success) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const handleUnarchiveWallet = async (id: number): Promise<boolean> => {
    try {
      const result = await window.deskflowAPI?.financeUnarchiveWallet(id) as { success: boolean };
      if (result?.success) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const handleUpdateWallet = async (data: {
    id: number; name: string; type: string; provider?: string;
    last_four?: string; balance?: number; currency?: string;
  }): Promise<boolean> => {
    try {
      const result = await window.deskflowAPI?.financeUpdateWallet(data) as { success: boolean };
      if (result?.success) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const netWorth = useMemo(() =>
    accounts.reduce((s, a) => {
      if (a.type === 'custodial') return s;
      const walletSum = wallets
        .filter(w => w.account_id === a.id && !w.is_archived)
        .reduce((ws, w) => ws + convertAmount(w.balance, w.currency, displayCurrency), 0);
      return s + walletSum;
    }, 0),
    [accounts, wallets, displayCurrency]
  );

  const trend = useMemo(() => {
    if (monthlyTrends.length < 2) return null;
    const last = monthlyTrends[monthlyTrends.length - 1];
    const prev = monthlyTrends[monthlyTrends.length - 2];
    const lastTotal = last.income + last.expense;
    const prevTotal = prev.income + prev.expense;
    const diff = lastTotal - prevTotal;
    const pct = prevTotal > 0 ? (diff / prevTotal) * 100 : 0;
    return { value: diff, percent: pct };
  }, [monthlyTrends]);

  if (isLocked && !isFirstTime) {
    return (
      <div className="flex flex-col h-full" style={{ ['--page-accent' as string]: '#10b981' }}>
        <AuroraBackground intense />
        <FinanceLockScreen
          onUnlock={handleUnlock}
          onSetup={handleSetup}
          onBiometricUnlock={handleBiometricUnlock}
          isFirstTime={false}
          error={lockError}
        />
      </div>
    );
  }

  if (pageAccess && !pageAccess.canAccess) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-5">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-zinc-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-zinc-400 mb-4">
            {pageAccess.reason === 'locked'
              ? 'Your finance page is currently locked. Please unlock to access your data.'
              : 'You do not have permission to access the finance page.'}
          </p>
          {pageAccess.reason === 'locked' && (
            <button
              onClick={() => setIsFirstTime(true)}
              className="px-4 py-2 rounded-lg bg-[var(--page-accent)] hover:bg-[var(--page-accent)]/90 text-white text-sm font-medium transition-colors"
            >
              Unlock Now
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <PageShell page="finance" variant="sticky-header" style={{ ['--page-accent' as string]: '#10b981' }}>
      <AuroraBackground />

      <div className="relative isolate min-h-full px-6 pb-28 pt-4 mx-auto w-full max-w-[1100px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <h1 className="text-[15px] font-semibold text-white">Finance <span className="text-[10px] text-emerald-400 font-mono ml-2 bg-emerald-500/10 px-1.5 py-0.5 rounded">BUILD MARKER v4</span></h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowCurrencyPicker(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-300 hover:text-white text-xs font-medium transition-colors border border-zinc-700/30 focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
            >
              <span>{getCurrencyInfo(displayCurrency).symbol}</span>
              <span>{displayCurrency}</span>
            </button>
          </div>

          <AnimatePresence>
            {showCurrencyPicker && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[var(--z-modal)] flex items-center justify-center p-5"
                onClick={() => setShowCurrencyPicker(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 20 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full max-w-xs bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 pt-4 pb-2 border-b border-zinc-700/30">
                    <h3 className="text-sm font-semibold text-white">Select Currency</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Display currency for all amounts</p>
                  </div>
                  <div className="p-2 max-h-72 overflow-y-auto">
                    {['USD', 'IDR', 'SGD', 'GBP', 'EUR', 'JPY', 'AUD', 'CNY', 'KRW', 'INR'].map(code => (
                      <button
                        key={code}
                        onClick={() => { setDisplayCurrency(code); setShowCurrencyPicker(false); window.deskflowAPI?.financeSetDisplayCurrency(code); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${displayCurrency === code ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300 hover:bg-zinc-800/60'
                          }`}
                      >
                        <span className="w-6 text-center text-base">{getCurrencyInfo(code).symbol}</span>
                        <span className="font-medium">{code}</span>
                        <span className="text-[11px] text-zinc-500 ml-auto">{getCurrencyInfo(code).name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mb-6" style={{ display: selectedWalletId ? 'none' : undefined }}>
          <TabBar tabs={tabs} activeKey={activeTab} onTabChange={(k) => { setActiveTab(k as FinanceTabKey); setSelectedWalletId(null); }} />
        </div>

        <FinanceStickyHeader
          isLocked={isLocked}
          netWorth={netWorth}
          displayCurrency={displayCurrency}
          onToggleLock={handleLock}
          trend={trend}
          monthlyTrends={monthlyTrends}
          hasPassword={securitySettings?.hasPassword ?? true}
        />

        {(() => {
          const dw = selectedWalletId ? wallets.find(x => x.id === selectedWalletId) : null;
          const showDetail = dw !== undefined;
          if (showDetail && dw) {
            return (
              <WalletDetailView
                key={dw.id}
                wallet={dw}
                displayCurrency={displayCurrency}
                transactions={transactions}
                wallets={wallets}
                onBack={() => setSelectedWalletId(null)}
                onSaveMetadata={handleSaveMetadata}
                onUpdateWallet={handleUpdateWallet}
                onDeleteWallet={handleDeleteWallet}
                onAddTransaction={(walletType) => setWalletTxModal(walletType as any)}
              />
            );
          }
          return (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={tabPanel}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeTab === 'overview' && (
                  <OverviewTab
                    data-section="finance.overview"
                    summary={summary}
                    spendingByCategory={spendingByCategory}
                    monthlyTrends={monthlyTrends}
                    accounts={accounts}
                    recentTransactions={transactions.slice(0, 5)}
                    loading={loading}
                    error={fetchError}
                    onRetry={fetchData}
                    onCreateAccount={handleCreateAccount}
                    onAddTransaction={handleAddTransaction}
                    categories={categories}
                    wallets={wallets}
                    displayCurrency={displayCurrency}
                    baseCurrency={baseCurrency}
                  />
                )}
                {activeTab === 'accounts' && (
                  <AccountsTab
                    data-section="finance.accounts"
                    accounts={accounts}
                    wallets={wallets}
                    loading={loading}
                    displayCurrency={displayCurrency}
                    onCreateAccount={handleCreateAccount}
                    onCreateWallet={handleCreateWallet}
                    onArchiveWallet={handleArchiveWallet}
                    onUpdateWallet={handleUpdateWallet}
                    onDeleteAccount={handleDeleteAccount}
                    onDeleteWallet={handleDeleteWallet}
                    onViewArchived={handleViewArchived}
                    archivedCount={archivedAccounts.length + archivedWallets.length}
                    error={fetchError}
                    onRetry={fetchData}
                    onWalletClick={handleWalletClick}
                  />
                )}
                {activeTab === 'crypto' && (
                  <CryptoMarketTab
                    data-section="finance.crypto"
                    wallets={wallets.filter(w => w.type === 'crypto' && !w.is_archived)}
                    displayCurrency={displayCurrency}
                    loading={loading}
                    onWalletClick={handleWalletClick}
                  />
                )}
                {activeTab === 'transactions' && (
                  <TransactionsTab
                    data-section="finance.transactions"
                    transactions={transactions}
                    accounts={accounts}
                    categories={categories}
                    wallets={wallets}
                    loading={loading}
                    displayCurrency={displayCurrency}
                    baseCurrency={baseCurrency}
                    onAddTransaction={handleAddTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    onVerifyPassword={handleUnlock}
                    error={fetchError}
                    onRetry={fetchData}
                  />
                )}
                {activeTab === 'categories' && (
                  <CategoriesTab
                    data-section="finance.categories"
                    categories={categories}
                    loading={loading}
                    displayCurrency={displayCurrency}
                    baseCurrency={baseCurrency}
                    onCreateCategory={handleCreateCategory}
                    error={fetchError}
                    onRetry={fetchData}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          );
        })()}
      </div>

      <motion.button
        variants={fab}
        initial="hidden"
        animate="show"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (selectedWalletId) {
            const w = wallets.find(x => x.id === selectedWalletId);
            if (w) setWalletTxModal(w.type);
          } else {
            setShowQuickAdd(true);
          }
        }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center z-[var(--z-elevated)] focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_30px_rgba(16,185,129,0.35)]"
        title="New transaction (Ctrl+N)"
      >
        <Plus className="w-5 h-5" />
      </motion.button>

      {showQuickAdd && (
        <QuickAddModal
          open={showQuickAdd}
          onClose={() => setShowQuickAdd(false)}
          accounts={accounts}
          categories={categories}
          wallets={wallets}
          displayCurrency={displayCurrency}
          baseCurrency={baseCurrency}
          onSave={handleAddTransaction}
        />
      )}

      {/* Wallet-type-specific transaction modals */}
      {walletTxModal && (() => {
        const w = wallets.find(x => x.id === selectedWalletId);
        if (!w) return null;
        const modalProps = {
          open: true,
          onClose: () => setWalletTxModal(null),
          wallet: w,
          categories,
          wallets,
          displayCurrency,
          baseCurrency,
          onSubmit: handleAddTransaction,
          onCreateCategory: handleCreateCategory,
        };
        switch (walletTxModal) {
          case 'bank': return <BankTransactionModal key={w.id} {...modalProps} />;
          case 'debit_card': return <DebitTransactionModal key={w.id} {...modalProps} />;
          case 'credit_card': return <CreditTransactionModal key={w.id} {...modalProps} />;
          case 'crypto': return <CryptoTransactionModal key={w.id} {...modalProps} />;
          case 'physical': return <PhysicalTransactionModal key={w.id} {...modalProps} />;
          case 'cash': return <CashTransactionModal key={w.id} {...modalProps} />;
          case 'ewallet': return <EwalletTransactionModal key={w.id} {...modalProps} />;
          default: return <QuickAddModal open onClose={() => setWalletTxModal(null)} accounts={accounts} categories={categories} wallets={wallets} displayCurrency={displayCurrency} baseCurrency={baseCurrency} onSave={handleAddTransaction} />;
        }
      })()}

      <PasswordConfirmDialog
        open={showPasswordDialog}
        onClose={handlePasswordDialogClose}
        onConfirm={handlePasswordConfirm}
      />

      <ArchivedItemsModal
        open={showArchived}
        onClose={() => setShowArchived(false)}
        accounts={archivedAccounts}
        wallets={archivedWallets}
        onUnarchiveAccount={handleUnarchiveAccount}
        onUnarchiveWallet={handleUnarchiveWallet}
        onDeleteAccount={handleDeleteAccount}
        onDeleteWallet={handleDeleteWallet}
        hasPassword={hasPassword}
        onVerifyPassword={async (pw) => {
          const r = await window.deskflowAPI?.financeVerifyPassword(pw) as { success: boolean } | undefined;
          return r?.success === true;
        }}
        passwordRequired={passwordRequirements['password_req_delete_account'] !== false}
      />
    </PageShell>
  );
}
