// src/components/subscriptions/SubscriptionCard.tsx
//
// Props:
//   subscription: FinanceSubscription
//   walletName: string
//   categoryName?: string
//   history: FinanceTransaction[]        // rows linked by tag `sub:{id}`
//   onEdit / onToggleStatus / onCancel / onRecordPayment
//
// States: this is a leaf card (always populated). History accordion has its own
// empty state. Loading/error for the list live in SubscriptionsPage.
//
// Sources: shadcn Card/Badge/Button patterns re-skinned; Lucide icons; Framer Motion.
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Repeat,
  BellRing,
  ExternalLink,
  Copy,
  Pause,
  Play,
  Pencil,
  XCircle,
  ReceiptText,
  ChevronDown,
} from "lucide-react";
import type {
  FinanceSubscription,
  FinanceTransaction,
} from "../finance/finance-types";
import { monthlyAmount, daysUntil } from "../../lib/subscriptions";

const STATUS: Record<
  FinanceSubscription["status"],
  { label: string; cls: string }
> = {
  active: { label: "Active", cls: "text-emerald-400 bg-emerald-400/10" },
  paused: { label: "Paused", cls: "text-amber-400 bg-amber-400/10" },
  cancelled: { label: "Cancelled", cls: "text-zinc-400 bg-zinc-400/10" },
  expired: { label: "Expired", cls: "text-red-400 bg-red-400/10" },
};

export interface SubscriptionCardProps {
  subscription: FinanceSubscription;
  walletName: string;
  categoryName?: string;
  history: FinanceTransaction[];
  onEdit: (s: FinanceSubscription) => void;
  onToggleStatus: (s: FinanceSubscription) => void;
  onCancel: (s: FinanceSubscription) => void;
  onRecordPayment: (s: FinanceSubscription) => void;
}

export function SubscriptionCard({
  subscription: s,
  walletName,
  categoryName,
  history,
  onEdit,
  onToggleStatus,
  onCancel,
  onRecordPayment,
}: SubscriptionCardProps) {
  const [open, setOpen] = useState(false);
  const days = daysUntil(s.next_renewal_date);
  const reminderOn = (s.cancel_reminder_days ?? 0) > 0;
  const soon = days !== null && days >= 0 && days < 7;
  const st = STATUS[s.status];

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: s.currency || "USD",
    }).format(n);

  return (
    <motion.article
      layout
      initial= opacity: 0, y: 12 
      animate= opacity: 1, y: 0 
      exit= opacity: 0, y: -8 
      transition= duration: 0.18 
      className="flex flex-col gap-4 rounded-xl border border-zinc-800/50 bg-zinc-900/60 p-5 backdrop-blur-xl"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/15 text-violet-400">
            <Repeat className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="font-semibold text-zinc-100">{s.name}</h3>
            {s.description && (
              <p className="text-sm text-zinc-400">{s.description}</p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}
        >
          {st.label}
        </span>
      </header>

      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold tabular-nums text-zinc-100">
          {fmt(s.price)}
          <span className="ml-1 text-sm font-normal text-zinc-500">
            /{s.billing_cycle === "custom" ? `${s.billing_interval}mo` : s.billing_cycle}
          </span>
        </div>
        <div className="text-right text-sm text-zinc-400">
          <div className="tabular-nums">{fmt(monthlyAmount(s))}/mo</div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-zinc-500">Next payment</dt>
          <dd className={soon ? "font-medium text-amber-400" : "text-zinc-200"}>
            {s.next_renewal_date ?? "—"}
            {days !== null && (
              <span className="ml-1 text-xs">
                ({days < 0 ? `${-days}d overdue` : `${days}d away`})
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Started</dt>
          <dd className="text-zinc-200">{s.start_date ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Wallet</dt>
          <dd className="text-zinc-200">{walletName}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Category</dt>
          <dd className="text-zinc-200">{categoryName ?? "Subscriptions"}</dd>
        </div>
      </dl>

      {reminderOn && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-2 text-sm text-amber-300">
          <BellRing className="h-4 w-4" aria-hidden />
          Reminder {s.cancel_reminder_days}d before renewal
          {s.reminder_note ? ` · ${s.reminder_note}` : ""}
        </div>
      )}

      {s.cancel_url && (
        <div className="flex items-center gap-2">
          <a
            href={s.cancel_url}
            onClick={(e) => {
              // Prefer Electron shell.openExternal via preload bridge if present.
              const bridge = (window as any).api?.openExternal;
              if (bridge) {
                e.preventDefault();
                bridge(s.cancel_url);
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-800/70 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <ExternalLink className="h-4 w-4" aria-hidden /> Ready to cancel
          </a>
          <button
            type="button"
            aria-label="Copy cancel link"
            onClick={() => navigator.clipboard?.writeText(s.cancel_url)}
            className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Copy className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onRecordPayment(s)}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-violet-500 px-3 text-sm font-medium text-white hover:bg-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
        >
          <ReceiptText className="h-4 w-4" aria-hidden /> Record payment
        </button>
        <button
          type="button"
          onClick={() => onToggleStatus(s)}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-zinc-800/70 px-3 text-sm text-zinc-200 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {s.status === "paused" ? (
            <>
              <Play className="h-4 w-4" aria-hidden /> Resume
            </>
          ) : (
            <>
              <Pause className="h-4 w-4" aria-hidden /> Pause
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => onEdit(s)}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-zinc-800/70 px-3 text-sm text-zinc-200 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <Pencil className="h-4 w-4" aria-hidden /> Edit
        </button>
        <button
          type="button"
          onClick={() => onCancel(s)}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-3 text-sm text-red-400 hover:bg-red-400/10 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <XCircle className="h-4 w-4" aria-hidden /> Cancel
        </button>
      </div>

      <div className="border-t border-zinc-800/50 pt-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between text-sm text-zinc-400 hover:text-zinc-200"
        >
          Payment history ({history.length})
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.ul
              initial= height: 0, opacity: 0 
              animate= height: "auto", opacity: 1 
              exit= height: 0, opacity: 0 
              className="mt-2 space-y-1 overflow-hidden text-sm"
            >
              {history.length === 0 ? (
                <li className="py-2 text-zinc-500">No payments recorded yet.</li>
              ) : (
                history.map((t) => (
                  <li
                    key={t.id}
                    className="flex justify-between py-1 tabular-nums text-zinc-300"
                  >
                    <span>{t.date}</span>
                    <span>{fmt(Math.abs(t.amount))}</span>
                  </li>
                ))
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
