import { useMemo, useState } from 'react';
import { X, Phone, Mail, FileText, Wallet, Calendar, CheckCircle2, Clock } from 'lucide-react';
import type { FinanceFtPerson, FinanceTransaction, FinanceWallet } from './finance-types';
import { getRepaymentStatus, getFtPerson } from '../../lib/receivables';

interface PersonDetailModalProps {
  open: boolean;
  onClose: () => void;
  person: FinanceFtPerson;
  transactions: FinanceTransaction[];
  wallets: FinanceWallet[];
  displayCurrency: string;
  onRecordPayment: () => void;
  onRefresh: () => void;
}

export function PersonDetailModal({
  open, onClose, person, transactions, wallets, displayCurrency, onRecordPayment
}: PersonDetailModalProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'repaid'>('all');

  const personTxns = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.ft_person_id === person.id) return true;
      if (tx.on_behalf_of_label === person.name) return true;
      return getFtPerson(tx) === person.name;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, person]);

  const { pendingTxs, repaidTxs, totalOwed, totalRepaid } = useMemo(() => {
    const pending: FinanceTransaction[] = [];
    const repaid: FinanceTransaction[] = [];
    let owed = 0;
    let repaidAmt = 0;
    for (const tx of personTxns) {
      if (tx.type !== 'expense' || tx.on_behalf_of !== 1) continue;
      const status = getRepaymentStatus(tx, transactions);
      const stillOwed = Math.abs(tx.amount) - status.totalRepaid;
      if (status.repaid || stillOwed <= 0) { repaid.push(tx); repaidAmt += Math.abs(tx.amount); }
      else { pending.push(tx); owed += stillOwed; }
    }
    return { pendingTxs: pending, repaidTxs: repaid, totalOwed: owed, totalRepaid: repaidAmt };
  }, [personTxns, transactions]);

  const displayedTxs = useMemo(() => {
    if (filter === 'pending') return pendingTxs;
    if (filter === 'repaid') return repaidTxs;
    return personTxns.filter(tx => tx.type === 'expense' && tx.on_behalf_of === 1);
  }, [filter, pendingTxs, repaidTxs, personTxns]);

  const balance = totalOwed;
  const initials = person.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 p-5 border-b border-zinc-800/60">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg font-bold">{initials}</div>
              <div>
                <h2 className="text-base font-semibold text-zinc-100">{person.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  {person.email && <span className="flex items-center gap-1 text-[11px] text-zinc-500"><Mail className="w-3 h-3" />{person.email}</span>}
                  {person.phone && <span className="flex items-center gap-1 text-[11px] text-zinc-500"><Phone className="w-3 h-3" />{person.phone}</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors"><X className="w-4 h-4" /></button>
          </div>

          {/* Balance Summary */}
          <div className="mt-4 rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-amber-400/80 uppercase tracking-wider">Current Balance</p>
                <p className="text-2xl font-bold text-amber-400 mt-0.5">{displayCurrency}{balance.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-zinc-500">Total Repaid</p>
                <p className="text-sm font-semibold text-emerald-400 mt-0.5">{displayCurrency}{totalRepaid.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-amber-500/10">
              <span className="text-[11px] text-zinc-500">{pendingTxs.length} pending</span>
              <span className="text-[11px] text-zinc-600">·</span>
              <span className="text-[11px] text-zinc-500">{repaidTxs.length} repaid</span>
            </div>
          </div>

          {balance > 0 && (
            <button onClick={onRecordPayment}
              className="w-full mt-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-medium text-xs py-2.5 transition-colors flex items-center justify-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Record Payment
            </button>
          )}
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex gap-1 mb-4 p-0.5 rounded-lg bg-zinc-800/50">
            {(['all', 'pending', 'repaid'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors capitalize ${filter === f ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-400'}`}>
                {f}
              </button>
            ))}
          </div>

          {displayedTxs.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <FileText className="w-8 h-8 text-zinc-700 mb-2" />
              <p className="text-xs text-zinc-500">No {filter} transactions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedTxs.map(tx => {
                const status = getRepaymentStatus(tx, transactions);
                const isRepaid = status.repaid;
                const stillOwed = Math.abs(tx.amount) - status.totalRepaid;
                return (
                  <div key={tx.id} className={`rounded-lg border p-3 transition-colors ${isRepaid ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-zinc-800/30 border-zinc-800/60'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isRepaid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="text-xs font-medium text-zinc-200">{tx.description || 'Untitled expense'}</span>
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${isRepaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {displayCurrency}{Math.abs(tx.amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <Calendar className="w-3 h-3" /> {new Date(tx.date).toLocaleDateString()}
                      </span>
                      {!isRepaid && stillOwed > 0 && <span className="text-[10px] text-amber-400/80">{displayCurrency}{stillOwed.toFixed(2)} remaining</span>}
                      {isRepaid && <span className="text-[10px] text-emerald-400/80">Fully repaid</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
