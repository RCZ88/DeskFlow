import React from 'react';
import { Lightbulb, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { ProposalCard as ProposalCardType } from '../../shared/learn/types';

interface Props {
  proposal: ProposalCardType;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Pending' },
  approved: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Rejected' },
};

export function ProposalCard({ proposal, onApprove, onReject }: Props) {
  const cfg = statusConfig[proposal.status];

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-zinc-200">{proposal.title}</h4>
            <cfg.icon className={`w-3 h-3 ${cfg.color}`} />
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Node: {proposal.node_title} &middot; {new Date(proposal.created_at).toLocaleDateString()}
          </p>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{proposal.body_md}</p>
          {proposal.status === 'pending' && onApprove && onReject && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => onApprove(proposal.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium transition border border-emerald-500/30"
              >
                <CheckCircle2 className="w-3 h-3" />
                Approve
              </button>
              <button
                onClick={() => onReject(proposal.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium transition border border-red-500/30"
              >
                <XCircle className="w-3 h-3" />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
