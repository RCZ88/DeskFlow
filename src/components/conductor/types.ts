export interface EscalationItemVM {
  id: string;
  title?: string;
  reason?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export type EscalationReasonVM = string;