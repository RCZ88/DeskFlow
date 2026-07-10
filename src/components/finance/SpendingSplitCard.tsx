import { motion } from 'framer-motion';
import { Handshake, ArrowLeftRight, RotateCcw, Check } from 'lucide-react';
import type { FinanceTransaction } from './finance-types';

interface PersonSplit {
  name: string;
  total: number;
  count: number;
  unpaidTxIds: number[];
}

interface SpendingSplitCardProps {
  currency: string;
  personalExpense: number;
  ftExpense: number;
  unpaidByPerson: PersonSplit[];
  onRecordRepayment?: (personName: string, txIds: number[], totalAmount: number) => void;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const staggerItem = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
};

export function SpendingSplitCard({
  currency,
  personalExpense,
  ftExpense,
  unpaidByPerson,
  onRecordRepayment,
}: SpendingSplitCardProps) {
  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  const grandTotal = personalExpense + ftExpense;
  const ftPct = grandTotal > 0 ? (ftExpense / grandTotal) * 100 : 0;
  const allCaughtUp = unpaidByPerson.length === 0 && ftExpense > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-zinc-800/60 bg-zinc-900/80 backdrop-blur-xl p-5 h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Handshake className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Spending Split</h3>
          <p className="text-[11px] text-zinc-500">Personal vs follow-through</p>
        </div>
      </div>

      {grandTotal === 0 ? (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
            <Handshake className="w-5 h-5 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-400 max-w-[240px]">
            No expenses recorded yet. Your spending breakdown will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="flex h-2.5 rounded-full overflow-hidden bg-zinc-800 mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${100 - ftPct}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="bg-zinc-500"
            />
            {ftExpense > 0 && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${ftPct}%` }}
                transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="bg-amber-400"
              />
            )}
          </div>

          {/* Legend */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
                <span className="text-sm text-zinc-300">Your spending</span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-white">{fmt(personalExpense)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-sm text-zinc-300 flex items-center gap-1">
                  <Handshake className="w-3.5 h-3.5 text-amber-400" />
                  Follow Through
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-amber-400">{fmt(ftExpense)}</span>
            </div>
          </div>

          {/* Per-person unpaid breakdown */}
          {unpaidByPerson.length > 0 && (
            <div className="border-t border-zinc-800/50 pt-3 mt-auto">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-2">
                Awaiting repayment
              </p>
              <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-1.5">
                {unpaidByPerson.map((p) => (
                  <motion.div
                    key={p.name}
                    variants={staggerItem}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/20 transition-colors duration-150"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-200 truncate">{p.name}</p>
                      <p className="text-[10px] text-zinc-500">
                        {p.count} transaction{p.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-amber-400">{fmt(p.total)}</span>
                      {onRecordRepayment && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => onRecordRepayment(p.name, p.unpaidTxIds, p.total)}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 transition-colors duration-150"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Repaid
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {allCaughtUp && (
            <div className="border-t border-zinc-800/50 pt-3 mt-auto">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
                All follow-through expenses repaid
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
