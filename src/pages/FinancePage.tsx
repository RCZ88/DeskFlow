import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  { key: 'transactions', label: 'Transactions', icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
  { key: 'categories', label: 'Categories', icon: <Tag className="w-3.5 h-3.5" /> },
];

export function FinancePage() {
  const [isLocked, setIsLocked] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FinanceTabKey>('overview');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
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
      if (securitySettings.rememberDevice && securitySettings.rememberDeviceExpiry && Date.now() < securitySettings.rememberDeviceExpiry) {
        setIsLocked(false);
      } else if (securitySettings.locked) {
        setIsLocked(true);
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
          const lockResult = await window.deskflowAPI?.financeIsLocked() as { locked: boolean };
          setIsLocked(lockResult?.locked ?? true);
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
    const timeoutMs = securitySettings?.lockTimeout || 5 * 60 * 1000;
    lockTimerRef.current = setTimeout(() => {
      handleLock();
    }, timeoutMs);
  }, [securitySettings]);

  useEffect(() => {
    if (securitySettings?.hasPassword && !securitySettings?.locked) {
      resetLockTimer();
    }
    securityCheckIntervalRef.current = setInterval(() => {
      if (window.deskflowAPI) {
        window.deskflowAPI.financeIsLocked().then(result => {
          setIsLocked(result?.locked ?? true);
        });
      }
    }, 30000);
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (securityCheckIntervalRef.current) clearInterval(securityCheckIntervalRef.current);
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

  const handleCreateAccount = async (data: {
    name: string; type: FinanceAccount['type']; description?: string;
    icon?: string; color?: string; currency?: string; balance?: number;
  }): Promise<boolean> => {
    try {
      const result = await window.deskflowAPI?.financeCreateAccount({
        name: data.name, type: data.type, description: data.description || null,
        icon: data.icon || 'Wallet', color: data.color || '#10b981',
        currency: data.currency || 'USD', balance: data.balance || 0,
      }) as FinanceAccount;
      if (result) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const handleAddTransaction = async (data: {
    account_id: number; wallet_id: number | null; category_id: number;
    type: 'income' | 'expense' | 'transfer'; amount: number;
    description: string; note: string; date: string;
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
  }): Promise<boolean> => {
    try {
      const result = await window.deskflowAPI?.financeCreateWallet(data) as { id: number };
      if (result?.id) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const handleArchiveWallet = async (id: number): Promise<boolean> => {
    try {
      const result = await window.deskflowAPI?.financeArchiveWallet(id) as { success: boolean };
      if (result?.success) { await fetchData(); return true; }
      return false;
    } catch { return false; }
  };

  const hasPassword = securitySettings?.hasPassword ?? false;

  const checkPasswordRequirement = async (action: string): Promise<boolean> => {
    if (!hasPassword) return true;
    if (passwordRequirements[`password_req_${action}`] !== false) {
      const pw = window.prompt('Enter your finance password:');
      if (!pw) return false;
      const ok = await window.deskflowAPI?.financeVerifyPassword(pw) as { success: boolean };
      return ok?.success ?? false;
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
    accounts.reduce((s, a) => s + convertAmount(a.type === 'custodial' ? 0 : a.balance, a.currency, displayCurrency), 0),
    [accounts, displayCurrency]
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
            <h1 className="text-[15px] font-semibold text-white">Finance</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-300 hover:text-white text-xs font-medium transition-colors border border-zinc-700/30 focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950"
              >
                <span>{getCurrencyInfo(displayCurrency).symbol}</span>
                <span>{displayCurrency}</span>
              </button>
              <AnimatePresence>
                {showCurrencyPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-full right-0 mt-1 w-36 max-h-48 overflow-y-auto bg-zinc-800 border border-zinc-700/50 rounded-lg z-10"
                  >
                    {['USD', 'IDR', 'SGD', 'GBP', 'EUR', 'JPY', 'AUD', 'CNY', 'KRW', 'INR'].map(code => (
                      <button
                        key={code}
                        onClick={() => { setDisplayCurrency(code); setShowCurrencyPicker(false); window.deskflowAPI?.financeSetDisplayCurrency(code); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-700 transition-colors ${displayCurrency === code ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300'
                          }`}
                      >
                        <span className="w-5 text-center">{getCurrencyInfo(code).symbol}</span>
                        <span>{code}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <TabBar tabs={tabs} activeKey={activeTab} onTabChange={(k) => setActiveTab(k as FinanceTabKey)} />
        </div>

        <FinanceStickyHeader
          isLocked={false}
          netWorth={netWorth}
          displayCurrency={displayCurrency}
          onToggleLock={handleLock}
          trend={trend}
          monthlyTrends={monthlyTrends}
          hasPassword={securitySettings?.hasPassword ?? false}
        />

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
              />
            )}
            {activeTab === 'transactions' && (
              <TransactionsTab
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
      </div>

      <motion.button
        variants={fab}
        initial="hidden"
        animate="show"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowQuickAdd(true)}
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
