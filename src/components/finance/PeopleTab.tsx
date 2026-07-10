import { useState, useMemo, useCallback } from 'react';
import { Users, Plus, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { FinanceFtPerson, FinanceTransaction, FinanceWallet } from './finance-types';
import { PersonCard } from './PersonCard';
import { PersonDetailModal } from './PersonDetailModal';
import { PaymentAllocationModal } from './PaymentAllocationModal';

interface PeopleTabProps {
  persons: FinanceFtPerson[];
  transactions: FinanceTransaction[];
  wallets: FinanceWallet[];
  displayCurrency: string;
  onRefresh: () => void;
}

export function PeopleTab({ persons, transactions, wallets, displayCurrency, onRefresh }: PeopleTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<FinanceFtPerson | null>(null);
  const [paymentPerson, setPaymentPerson] = useState<FinanceFtPerson | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredPersons = useMemo(() => {
    if (!searchQuery.trim()) return persons;
    const q = searchQuery.toLowerCase();
    return persons.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  }, [persons, searchQuery]);

  const stats = useMemo(() => {
    const totalOwed = persons.reduce((sum, p) => sum + (p.total_owed - p.total_paid), 0);
    const activeCount = persons.filter(p => (p.total_owed - p.total_paid) > 0).length;
    const settledCount = persons.filter(p => (p.total_owed - p.total_paid) <= 0 && p.transaction_count > 0).length;
    return { totalOwed, activeCount, settledCount };
  }, [persons]);

  const handleRecordPayment = useCallback((person: FinanceFtPerson) => {
    setSelectedPerson(null);
    setPaymentPerson(person);
  }, []);

  const handlePaymentClose = useCallback(() => {
    setPaymentPerson(null);
    onRefresh();
  }, [onRefresh]);

  const handlePersonClick = useCallback((person: FinanceFtPerson) => {
    setSelectedPerson(person);
  }, []);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            People & Debt
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">Track who owes you and manage repayments</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Person
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 p-4">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="text-[11px] uppercase tracking-wider">Total Owed</span>
          </div>
          <div className="text-xl font-bold text-amber-400">{displayCurrency}{stats.totalOwed.toFixed(2)}</div>
        </div>
        <div className="rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 p-4">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <Users className="w-3.5 h-3.5" />
            <span className="text-[11px] uppercase tracking-wider">Active</span>
          </div>
          <div className="text-xl font-bold text-emerald-400">{stats.activeCount}</div>
        </div>
        <div className="rounded-xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 p-4">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span className="text-[11px] uppercase tracking-wider">Settled</span>
          </div>
          <div className="text-xl font-bold text-zinc-400">{stats.settledCount}</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search people by name, email, or phone..."
          className="w-full rounded-xl bg-zinc-900/60 border border-zinc-800/60 pl-9 pr-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-amber-500/30 transition-colors" />
      </div>

      {/* People Grid */}
      {filteredPersons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-zinc-600" />
          </div>
          <h3 className="text-sm font-medium text-zinc-400">No people found</h3>
          <p className="text-xs text-zinc-600 mt-1 max-w-xs">
            {searchQuery ? 'Try a different search term' : 'Add people to track debts and shared expenses'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredPersons.map(person => (
            <PersonCard key={person.id} person={person} displayCurrency={displayCurrency} onClick={() => handlePersonClick(person)} />
          ))}
        </div>
      )}

      {/* Person Detail Modal */}
      {selectedPerson && (
        <PersonDetailModal open={true} onClose={() => setSelectedPerson(null)} person={selectedPerson}
          transactions={transactions} wallets={wallets} displayCurrency={displayCurrency}
          onRecordPayment={() => handleRecordPayment(selectedPerson)} onRefresh={onRefresh} />
      )}

      {/* Payment Allocation Modal */}
      {paymentPerson && (
        <PaymentAllocationModal open={true} onClose={handlePaymentClose} person={paymentPerson}
          transactions={transactions} wallets={wallets} displayCurrency={displayCurrency} onRefresh={onRefresh} />
      )}

      {/* Add Person Modal */}
      {showAddModal && (
        <AddPersonModal onClose={() => setShowAddModal(false)} onCreated={onRefresh} />
      )}
    </div>
  );
}

function AddPersonModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await (window as any).deskflowAPI?.financeCreateFtPerson({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined });
      onCreated();
      onClose();
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-5 animate-in zoom-in-95">
        <h3 className="text-sm font-semibold text-zinc-100 mb-4">Add New Person</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="e.g. Sarah Chen"
              className="w-full rounded-lg bg-zinc-800/60 border border-zinc-700/60 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-amber-500/50" />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="optional"
              className="w-full rounded-lg bg-zinc-800/60 border border-zinc-700/60 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-amber-500/50" />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 mb-1 block">Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="optional"
              className="w-full rounded-lg bg-zinc-800/60 border border-zinc-700/60 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-amber-500/50" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs py-2.5 hover:bg-zinc-700 transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={!name.trim() || saving}
            className="flex-1 rounded-lg bg-emerald-500 text-black text-xs py-2.5 font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50">
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
