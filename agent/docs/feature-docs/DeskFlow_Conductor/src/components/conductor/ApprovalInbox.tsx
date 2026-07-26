import { useState } from 'react';
import { ShieldAlert, CircleDollarSign, GitMerge, Sparkles, Radar, Check, X } from 'lucide-react';

export type EscalationReasonVM = 'policy' | 'budget' | 'confidence' | 'blast-radius' | 'merge-conflict' | 'goal-proposal';
export type EscalationStatusVM = 'pending' | 'approved' | 'rejected';

export interface EscalationItemVM {
  id: string;
  nodeId: string | null;
  reason: EscalationReasonVM;
  detail: string;
  status: EscalationStatusVM;
  createdAt: number;
  decidedAt?: number;
  note?: string;
}

const REASON_META: Record<EscalationReasonVM, { icon: any; color: string; label: string }> = {
  policy: { icon: ShieldAlert, color: '#f59e0b', label: 'Policy' },
  budget: { icon: CircleDollarSign, color: '#f59e0b', label: 'Budget' },
  confidence: { icon: Radar, color: '#ef4444', label: 'Confidence' },
  'blast-radius': { icon: ShieldAlert, color: '#ef4444', label: 'Blast radius' },
  'merge-conflict': { icon: GitMerge, color: '#f43f5e', label: 'Merge conflict' },
  'goal-proposal': { icon: Sparkles, color: '#8b5cf6', label: 'New goal' },
};

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function ApprovalInbox({
  escalations, onResolve,
}: {
  escalations: EscalationItemVM[];
  onResolve: (escalationId: string, decision: 'approved' | 'rejected', note?: string) => void;
}) {
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const pending = escalations.filter((e) => e.status === 'pending').slice().reverse();
  const resolved = escalations.filter((e) => e.status !== 'pending').slice().reverse().slice(0, 20);

  function setNote(id: string, value: string) {
    setNoteDrafts((prev) => {
      const next = { ...prev };
      next[id] = value;
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Approval inbox</div>
      {pending.length === 0 && (
        <div className="text-[11px] text-zinc-500 italic">No pending approvals.</div>
      )}
      {pending.map((e) => {
        const meta = REASON_META[e.reason];
        const Icon = meta.icon;
        const badgeStyle: React.CSSProperties = { background: `${meta.color}22`, color: meta.color };
        return (
          <div key={e.id} className="rounded-lg border border-zinc-700 bg-zinc-900/70 p-2.5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={badgeStyle}>
                <Icon size={11} />
                {meta.label}
              </span>
              <span className="text-[10px] text-zinc-500 ml-auto">{timeAgo(e.createdAt)}</span>
            </div>
            <div className="text-[11.5px] text-zinc-300">{e.detail}</div>
            <input
              type="text"
              placeholder="Optional note..."
              value={noteDrafts[e.id] || ''}
              onChange={(ev) => setNote(e.id, ev.target.value)}
              className="rounded-md bg-zinc-950 border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 placeholder-zinc-600"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => onResolve(e.id, 'approved', noteDrafts[e.id])}
                className="inline-flex items-center gap-1 rounded-md bg-[color:var(--page-accent)] px-2.5 py-1 text-[11px] font-medium text-zinc-950"
              >
                <Check size={12} /> Approve
              </button>
              <button
                onClick={() => onResolve(e.id, 'rejected', noteDrafts[e.id])}
                className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-300 ring-1 ring-inset ring-zinc-700"
              >
                <X size={12} /> Reject
              </button>
            </div>
          </div>
        );
      })}
      {resolved.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Recent decisions</div>
          {resolved.map((e) => {
            const meta = REASON_META[e.reason];
            const dotColor = e.status === 'approved' ? '#10b981' : '#ef4444';
            const dotStyle: React.CSSProperties = { background: dotColor };
            return (
              <div key={e.id} className="flex items-center gap-2 text-[10.5px] text-zinc-500">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={dotStyle} />
                <span className="truncate">{meta.label}: {e.detail}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
