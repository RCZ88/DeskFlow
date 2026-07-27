import { useMemo, useState, useCallback } from 'react';
import { X, Phone, Mail, FileText, Wallet, Calendar, CheckCircle2, Clock, Plus, Minus, ChevronDown, Check, Landmark, Pencil, Trash2, ArrowUpRight } from 'lucide-react';
import type { FinanceFtPerson, FinanceTransaction, FinanceWallet } from './finance-types';
import { getRepaymentStatus, getFtPerson } from '../../lib/receivables';
import { TopUpModal } from './modals/TopUpModal';
import { DeductModal } from './modals/DeductModal';

interface PersonDetailModalProps {
  open: boolean;
  onClose: () => void;
  person: FinanceFtPerson;
  transactions: FinanceTransaction[];
  wallets: FinanceWallet[];
  displayCurrency: string;
  onRecordPayment: () => void;
  onRefresh: () => void;
  onNewTransaction?: (personId: number) => void;
}

export function PersonDetailModal({
  open, onClose, person, transactions, wallets, displayCurrency, onRecordPayment, onRefresh, onNewTransaction
}: PersonDetailModalProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'repaid'>('all');
  const [showTopUp, setShowTopUp] = useState(false);
  const [showDeduct, setShowDeduct] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(person.name);
  const [editEmail, setEditEmail] = useState(person.email || '');
  const [editPhone, setEditPhone] = useState(person.phone || '');
  const [editNotes, setEditNotes] = useState(person.notes || '');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [syncing, setSyncing] = useState(false);

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
  const storedBalance = person.balance ?? 0;
  const linkedWallet = person.wallet_id ? wallets.find(w => w.id === person.wallet_id) : null;
  const initials = person.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSetWallet = useCallback(async (walletId: number | null) => {
    try {
      await (window as any).deskflowAPI?.financeFtPersonSetWallet({ personId: person.id, walletId });
      setShowWalletPicker(false);
      onRefresh();
    } catch { /* ignore */ }
  }, [person.id, onRefresh]);

  const handleTopUpDone = useCallback(() => {
    setShowTopUp(false);
    onRefresh();
  }, [onRefresh]);

  const handleSaveEdit = useCallback(async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await (window as any).deskflowAPI?.financeFtPersonEdit({
        personId: person.id,
        name: editName.trim(),
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
      setEditing(false);
      onRefresh();
    } catch { /* ignore */ }
    setSaving(false);
  }, [person.id, editName, editEmail, editPhone, editNotes, onRefresh]);

  const handleDelete = useCallback(async () => {
    try {
      await (window as any).deskflowAPI?.financeFtPersonDelete({ personId: person.id });
      setShowDeleteConfirm(false);
      onClose();
      onRefresh();
    } catch { /* ignore */ }
  }, [person.id, onClose, onRefresh]);

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
                {editing ? (
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="text-base font-semibold text-zinc-100 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500/50" autoFocus />
                ) : (
                  <h2 className="text-base font-semibold text-zinc-100">{person.name}</h2>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {editing ? (
                    <>
                      <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email"
                        className="text-[11px] text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-0.5 w-32 focus:outline-none focus:ring-1 focus:ring-amber-500/50" />
                      <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone"
                        className="text-[11px] text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-0.5 w-28 focus:outline-none focus:ring-1 focus:ring-amber-500/50" />
                    </>
                  ) : (
                    <>
                      {person.email && <span className="flex items-center gap-1 text-[11px] text-zinc-500"><Mail className="w-3 h-3" />{person.email}</span>}
                      {person.phone && <span className="flex items-center gap-1 text-[11px] text-zinc-500"><Phone className="w-3 h-3" />{person.phone}</span>}
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {editing ? (
                <>
                  <button onClick={handleSaveEdit} disabled={saving || !editName.trim()}
                    className="px-2 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-40">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setEditing(false); setEditName(person.name); setEditEmail(person.email || ''); setEditPhone(person.phone || ''); setEditNotes(person.notes || ''); }}
                    className="px-2 py-1 rounded-lg text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors" title="Edit person">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors" title="Delete person">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 transition-colors"><X className="w-4 h-4" /></button>
                </>
              )}
            </div>
          </div>

          {/* Notes (editable) */}
          {editing && (
            <div className="mt-2">
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes..."
                className="w-full text-[11px] text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none h-14" />
            </div>
          )}
          {!editing && person.notes && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-zinc-500">
              <FileText className="w-3 h-3" /> {person.notes}
            </div>
          )}

          {/* Balance Summary — two sections: Owed (computed) + Stored Balance */}
          <div className="mt-4 space-y-3">
            {/* Owed Balance */}
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-amber-400/80 uppercase tracking-wider">Amount Owed</p>
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

            {/* Stored Balance + Wallet Link */}
            <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-violet-400/80 uppercase tracking-wider">Balance</p>
                  <p className="text-xl font-bold text-violet-400 mt-0.5">{displayCurrency}{storedBalance.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Wallet Picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowWalletPicker(!showWalletPicker)}
                      className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 px-2.5 py-1.5 text-[11px] text-violet-300 hover:bg-violet-500/20 transition-colors"
                    >
                      <Landmark className="w-3 h-3" />
                      {linkedWallet ? linkedWallet.name : 'Link Wallet'}
                      <ChevronDown className={`w-3 h-3 transition-transform ${showWalletPicker ? 'rotate-180' : ''}`} />
                    </button>
                    {showWalletPicker && (
                      <div className="absolute right-0 z-10 mt-1 w-52 rounded-lg bg-zinc-800 border border-zinc-700/60 shadow-xl py-1">
                        <button
                          onClick={() => handleSetWallet(null)}
                          className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-zinc-700/50 transition-colors"
                        >
                          <span className="text-zinc-400">No wallet</span>
                          {!person.wallet_id && <Check className="w-3 h-3 text-emerald-400" />}
                        </button>
                        {wallets.filter(w => !w.is_archived).map(w => (
                          <button
                            key={w.id}
                            onClick={() => handleSetWallet(w.id)}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-zinc-700/50 transition-colors"
                          >
                            <span className="text-zinc-200">{w.name}</span>
                            {w.id === person.wallet_id && <Check className="w-3 h-3 text-emerald-400" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Top Up Button */}
                  <button
                    onClick={() => setShowTopUp(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-[11px] text-emerald-400 font-medium hover:bg-emerald-500/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Top Up
                  </button>
                  {/* Deduct Button */}
                  {storedBalance > 0 && (
                    <button
                      onClick={() => setShowDeduct(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-[11px] text-amber-400 font-medium hover:bg-amber-500/20 transition-colors"
                    >
                      <Minus className="w-3 h-3" /> Deduct
                    </button>
                  )}
                </div>
              </div>
              {linkedWallet && (
                <p className="text-[10px] text-zinc-600 mt-2">Linked to {linkedWallet.name} ({displayCurrency}{(linkedWallet.balance ?? 0).toFixed(2)} available)</p>
              )}
            </div>
          </div>

          {balance > 0 && (
            <button onClick={onRecordPayment}
              className="w-full mt-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-medium text-xs py-2.5 transition-colors flex items-center justify-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Record Payment
            </button>
          )}
          {onNewTransaction && (
            <button onClick={() => onNewTransaction(person.id)}
              className="w-full mt-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-medium text-xs py-2.5 transition-colors flex items-center justify-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> New Transaction from {person.name.split(' ')[0]}'s Balance
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
                const isTopUp = tx.description?.toLowerCase().includes('top-up') || tx.description?.toLowerCase().includes('topup');
                // Determine direction: income with on_behalf_of=0 = top-up (adds to balance)
                // income with on_behalf_of=1 = repayment (subtracts from balance)
                // expense with on_behalf_of=1 = deduction/FT expense (subtracts from balance)
                const isIncome = tx.type === 'income';
                const isRepayment = isIncome && tx.on_behalf_of === 1;
                const isDeduction = tx.type === 'expense' && tx.on_behalf_of === 1;
                const addsToBalance = isIncome && tx.on_behalf_of === 0;
                const subtractsFromBalance = isRepayment || isDeduction;
                return (
                  <div key={tx.id} className={`rounded-lg border p-3 transition-colors ${isRepaid ? 'bg-emerald-500/5 border-emerald-500/10' : isTopUp || addsToBalance ? 'bg-violet-500/5 border-violet-500/10' : 'bg-zinc-800/30 border-zinc-800/60'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {addsToBalance ? (
                          <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <Plus className="w-3 h-3 text-violet-400" />
                          </div>
                        ) : isRepaid ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : isDeduction ? (
                          <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Minus className="w-3 h-3 text-amber-400" />
                          </div>
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span className="text-xs font-medium text-zinc-200">{tx.description || 'Untitled expense'}</span>
                        {addsToBalance && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-500/20 text-violet-400">Top-Up</span>
                        )}
                        {isRepayment && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/20 text-emerald-400">Repayment</span>
                        )}
                        {isDeduction && !isTopUp && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/20 text-amber-400">Deduction</span>
                        )}
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${addsToBalance ? 'text-violet-400' : isRepaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {addsToBalance ? '+' : '-'}{displayCurrency}{Math.abs(tx.amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <Calendar className="w-3 h-3" /> {new Date(tx.date).toLocaleDateString()}
                      </span>
                      {addsToBalance && <span className="text-[10px] text-violet-400/80">Added to balance</span>}
                      {isRepayment && <span className="text-[10px] text-emerald-400/80">Reduced balance (repayment)</span>}
                      {isDeduction && !isTopUp && <span className="text-[10px] text-amber-400/80">Reduced balance</span>}
                      {!addsToBalance && !isRepaid && !isDeduction && !isTopUp && stillOwed > 0 && <span className="text-[10px] text-amber-400/80">{displayCurrency}{stillOwed.toFixed(2)} remaining</span>}
                      {isRepaid && <span className="text-[10px] text-emerald-400/80">Fully repaid</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Up Modal */}
      {showTopUp && (
        <TopUpModal
          open={true}
          onClose={() => setShowTopUp(false)}
          personName={person.name}
          personId={person.id}
          wallets={wallets}
          displayCurrency={displayCurrency}
          onSubmit={(data) => (window as any).deskflowAPI?.financeFtPersonTopup(data)}
          onDone={handleTopUpDone}
        />
      )}

      {/* Deduct Modal */}
      {showDeduct && (
        <DeductModal
          open={true}
          onClose={() => setShowDeduct(false)}
          personName={person.name}
          personId={person.id}
          currentBalance={storedBalance}
          displayCurrency={displayCurrency}
          onSubmit={(data) => (window as any).deskflowAPI?.financeFtPersonDeduct(data)}
          onDone={() => { setShowDeduct(false); onRefresh(); }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-5 animate-in zoom-in-95">
            <h3 className="text-sm font-semibold text-zinc-100 mb-2">Delete Person</h3>
            <p className="text-xs text-zinc-400 mb-1">Are you sure you want to delete <span className="font-medium text-zinc-200">{person.name}</span>?</p>
            <p className="text-[11px] text-zinc-500 mb-4">All linked transactions will be unlinked. This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs py-2.5 hover:bg-zinc-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 rounded-lg bg-red-500 text-white text-xs py-2.5 font-medium hover:bg-red-400 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
