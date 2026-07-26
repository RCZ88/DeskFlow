import {
  Building2, CreditCard, Landmark, Coins, Wallet, Smartphone, type LucideIcon,
} from 'lucide-react';

export function walletIcon(type: string): LucideIcon {
  switch (type) {
    case 'bank': return Landmark;
    case 'debit_card': case 'credit_card': return CreditCard;
    case 'crypto': return Coins;
    case 'cash': return Wallet;
    case 'ewallet': return Smartphone;
    default: return Building2;
  }
}

export function walletColor(type: string): string {
  switch (type) {
    case 'bank': return '#3b82f6';
    case 'debit_card': return '#10b981';
    case 'credit_card': return '#f59e0b';
    case 'crypto': return '#8b5cf6';
    case 'cash': return '#22d3ee';
    case 'ewallet': return '#ec4899';
    default: return '#71717a';
  }
}
