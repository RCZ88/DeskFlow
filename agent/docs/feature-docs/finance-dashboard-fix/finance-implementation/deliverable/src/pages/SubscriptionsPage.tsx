// src/pages/SubscriptionsPage.tsx
//
// /subscriptions route. Wrapped in PageShell (same as other pages).
// State coverage: loading (skeletons) / error (retry) / empty (illustration+CTA) / populated.
//
// IPC assumptions (match bundle naming style e.g. financeCreateTransaction):
//   window.api.subscriptionsList(), subscriptionsCreate, subscriptionsUpdate,
//   subscriptionsDelete, financeCreateTransaction, financeListWallets, financeListCategories,
//   financeListTransactions.  Adjust names to the real preload bridge.
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, Plus, Search } from "lucide-react";
import type {
  FinanceSubscription,
  FinanceTransaction,
  FinanceWallet,
} from "../components/finance/finance-types";
import { SubscriptionCard } from "../components/subscriptions/SubscriptionCard";
import {
  monthlyAmount,
  advanceRenewal,
  subscriptionTag,
  isDue,
} from "../lib/subscriptions";
// import { PageShell } from "../components/PageShell";
// import { SubscriptionModal } from "../components/finance/SubscriptionModal";

type Status = FinanceSubscription["status"] | "all";
type SortKey = "renewal" | "price" | "name";

const api = (window as any).api;

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<FinanceSubscription[] | null>(null);
  const [wallets, setWallets] = useState<FinanceWallet[]>([]);
  const [txns, setTxns] = useState<FinanceTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [walletId, setWalletId] = useState<number | "all">("all");
  const [sort, setSort] = useState<SortKey>("renewal");
  const [editing, setEditing] = useState<FinanceSubscription | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setError(null);
    try {
      const [s, w, t] = await Promise.all([
        api.subscriptionsList(),
        api.financeListWallets(),
        api.financeListTransactions(),
      ]);
      setSubs(s);
      setWallets(w);
      setTxns(t);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load subscriptions");
    }
  }
  useEffect(() => {
    load();
  }, []);

  const walletName = (id: number) =>
    wallets.find((w) => w.id === id)?.name ?? "Unknown wallet";

  const historyFor = (id: number) =>
    txns.filter((t) => (t.tags ?? "").includes(subscriptionTag(id)));

  const filtered = useMemo(() => {
    let list = (subs ?? []).slice();
    if (q.trim())
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q.trim().toLowerCase()),
      );
    if (status !== "all") list = list.filter((s) => s.status === status);
    if (walletId !== "all") list = list.filter((s) => s.wallet_id === walletId);
    list.sort((a, b) => {
      if (sort === "price") return b.price - a.price;
      if (sort === "name") return a.name.localeCompare(b.name);
      return (a.next_renewal_date ?? "").localeCompare(b.next_renewal_date ?? "");
    });
    return list;
  }, [subs, q, status, walletId, sort]);

  const totalMonthly = useMemo(
    () =>
      (subs ?? [])
        .filter((s) => s.status === "active")
        .reduce((sum, s) => sum + monthlyAmount(s), 0),
    [subs],
  );
  const activeCount = (subs ?? []).filter((s) => s.status === "active").length;
  const dueNow = (subs ?? []).filter(isDue);

  async function recordPayment(s: FinanceSubscription) {
    await api.financeCreateTransaction({
      type: "expense",
      amount: s.price,
      category_id: s.category_id, // falls back to generic 'Subscriptions' server-side if null
      wallet_id: s.wallet_id,
      description: s.name,
      tags: subscriptionTag(s.id),
      date: new Date().toISOString().slice(0, 10),
      on_behalf_of: 0,
    });
    await api.subscriptionsUpdate({
      ...s,
      next_renewal_date: advanceRenewal(s),
    });
    await load();
  }

  async function toggleStatus(s: FinanceSubscription) {
    await api.subscriptionsUpdate({
      ...s,
      status: s.status === "paused" ? "active" : "paused",
    });
    await load();
  }
  async function cancel(s: FinanceSubscription) {
    await api.subscriptionsUpdate({ ...s, status: "cancelled" });
    await load();
  }

  const fmtUSD = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);

  return (
    // <PageShell>
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800/50 bg-zinc-950/80 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-6 w-6 text-violet-400" aria-hidden />
            <h1 className="text-xl font-bold">Subscriptions</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-lg font-bold tabular-nums text-violet-300">
                {fmtUSD(totalMonthly)}
              </div>
              <div className="text-xs text-zinc-500">/mo · {activeCount} active</div>
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-violet-500 px-4 font-medium text-white hover:bg-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <Plus className="h-4 w-4" aria-hidden /> New Subscription
            </button>
          </div>
        </div>

        {dueNow.length > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-amber-400/10 px-3 py-2 text-sm text-amber-300">
            <span>{dueNow.length} subscription(s) due now.</span>
            <button
              type="button"
              onClick={async () => {
                for (const s of dueNow) await recordPayment(s);
              }}
              className="rounded-md bg-amber-400/20 px-2 py-1 font-medium hover:bg-amber-400/30"
            >
              Record all due
            </button>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-zinc-500" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="h-9 rounded-lg border border-zinc-800 bg-zinc-900 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-sm">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
          <select value={String(walletId)} onChange={(e) => setWalletId(e.target.value === "all" ? "all" : Number(e.target.value))} className="h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-sm">
            <option value="all">All wallets</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-sm">
            <option value="renewal">Sort: renewal</option>
            <option value="price">Sort: price</option>
            <option value="name">Sort: name</option>
          </select>
        </div>
      </header>

      <main className="px-6 py-6">
        {error ? (
          <div className="grid place-items-center gap-3 py-20 text-center">
            <p className="text-red-400">{error}</p>
            <button onClick={load} className="rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700">Retry</button>
          </div>
        ) : subs === null ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl border border-zinc-800/50 bg-zinc-900/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center gap-3 py-20 text-center">
            <CalendarClock className="h-12 w-12 text-zinc-700" aria-hidden />
            <p className="text-zinc-300">No subscriptions yet</p>
            <button onClick={() => setCreating(true)} className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400">Add your first subscription</button>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filtered.map((s) => (
                <SubscriptionCard
                  key={s.id}
                  subscription={s}
                  walletName={walletName(s.wallet_id)}
                  history={historyFor(s.id)}
                  onEdit={setEditing}
                  onToggleStatus={toggleStatus}
                  onCancel={cancel}
                  onRecordPayment={recordPayment}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* {(creating || editing) && (
        <SubscriptionModal
          subscription={editing}
          wallets={wallets}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={async () => { setCreating(false); setEditing(null); await load(); }}
        />
      )} */}
    </div>
    // </PageShell>
  );
}
