# Finance Fix Packet — Context Bundle

## Current DB State (NO DB CHANGES ALLOWED)

```
=== TRANSACTIONS ===
#1  expense  amt=0     wallet=3  desc="Pulsa XL"
#2  expense  amt=0     wallet=3  desc="Taxi to Whoosh Station Halim"
#3  transfer amt=-2000000 wallet=3 from=3 desc="Transfer to PINTU WALLET"
#4  transfer amt=2000000  wallet=4 from=3 desc="Transfer from BANK BCA"
#11 transfer amt=-2050000 wallet=6 from=6 desc="Transfer to BANK BCA"
#12 transfer amt=2050000  wallet=3 from=6 desc="Transfer from MAIN WALLET"
#13 expense amt=0     wallet=3  desc="Buat Kartu Debit"
#14 transfer amt=-100000 wallet=3 from=3 desc="Transfer to OVO"
#15 transfer amt=100000  wallet=7 from=3 desc="Transfer from BANK BCA"
#16 expense amt=0     wallet=7  desc="Wuwa Monthly Subsription"
#17 expense amt=0     wallet=7  desc="Google Storage 30gb"
#18 expense amt=0     wallet=3  desc="Passport"

=== WALLETS ===
BANK BCA        id=3  balance=3314403    initial=4570663
PINTU WALLET    id=4  balance=5428586.76 initial=5428586.76
TRUST WALLET    id=5  balance=0          initial=0
MAIN WALLET     id=6  balance=-2880000   initial=2880000
OVO             id=7  balance=210576     initial=205671

=== ACCOUNTS ===
CZ  balance=2594979
```

**KEY PROBLEM:** Expense transactions #1,2,13,16,17,18 all have amount=0. Their original amounts were destroyed during an encryption migration cycle. The wallet balances are CORRECT but the transaction amounts are gone. DB changes are NOT allowed.

## Transfer Data Model

Each transfer creates TWO rows in `finance_transactions`:
- **Leg 1 (source):** `wallet_id=srcWallet, from_wallet_id=srcWallet, to_wallet_id=dstWallet, amount=-X`
- **Leg 2 (destination):** `wallet_id=dstWallet, from_wallet_id=srcWallet, to_wallet_id=dstWallet, amount=+X`

Both legs share the same `transfer_id`.

## File: src/components/finance/WalletDetailView.tsx

### walletTransactions filter (line 1464):
```tsx
const walletTransactions = useMemo(() =>
  transactions.filter(t => t.wallet_id === wallet.id),
  [transactions, wallet.id]
);
```
This is CORRECT — each wallet only sees its own leg. The source wallet sees the debit leg, the destination sees the credit leg.

### PhysicalDetail filter (line 1252):
```tsx
const walletTxns = useMemo(() =>
  transactions.filter(t => t.type === 'expense' || t.type === 'income' || t.type === 'transfer'),
  [transactions]
);
```
This shows all transaction types for the physical wallet. The data flows: `walletTransactions` → PhysicalDetail → `walletTxns`.

### TransactionList component (line 115):
```tsx
function TransactionList({ transactions, displayCurrency, emptyText, walletId }: {
  transactions: FinanceTransaction[]; displayCurrency: string; emptyText?: string; walletId?: number;
}) {
  // ...
  {txn.type === 'expense' || (txn.type === 'transfer' && txn.amount < 0) ? '-' : txn.type === 'income' || (txn.type === 'transfer' && txn.amount > 0) ? '+' : ''}{sym}{Math.abs(txn.amount).toFixed(2)}
}
```

## File: src/main.ts — Finance Handlers

### get-transactions (line 22015):
Decrypts amount/description/note if financeDataKey is set. Returns rows with `wallet_id`, `from_wallet_id`, `to_wallet_id`, `transfer_id`.

### get-summary (line 22337):
Sums all transaction amounts. Since expense amounts are 0, this returns 0 for expenses.

### get-wallets (line 21680):
Returns wallets with decrypted balance/initial_balance/metadata.

### get-on-behalf-of-summary (line 22381):
Sums expense amounts where on_behalf_of=1. Returns 0 since amounts are 0.

### recalculate-balances (line 22736):
Computes `initial_balance + SUM(amount WHERE wallet_id=?)`. For wallets with 0 expense amounts, this gives wrong results.

### update-initial-balance (line 21449):
Stores initial_balance as-is. Password protected with 24h cooldown.

### create-transaction (line 22055):
Encrypts amount if financeDataKey is set, else stores as String(safeAmount).

### create-transfer (line 22115):
Creates two legs with encrypted amounts if financeDataKey is set.

### delete-transaction (line 22276):
Reverses balances for all legs of a transfer.

## File: src/main.ts — Encryption Helpers

```typescript
let financeDataKey: Buffer | null = null;
const ENC_PREFIX = 'enc:v1:';
function encryptField(value: string, key: Buffer): string { /* AES-256-GCM */ }
function decryptField(value: string, key: Buffer): string { /* AES-256-GCM */ }
function isEncrypted(value: any): boolean { return typeof value === 'string' && value.startsWith(ENC_PREFIX); }
```

## File: src/components/finance/OverviewTab.tsx

Dashboard shows: Income, Expense, Net Flow, Spending Split, Receivables, Net Flow Hero, Insights, Charts, Cashflow, Recent Transactions, Accounts. All data comes from get-summary, get-transactions, get-wallets, get-spending-by-category, get-monthly-trends.

## File: src/components/finance/SpendingSplitCard.tsx

Shows personal vs follow-through spending split. Takes personalExpense and ftExpense props.

## File: src/components/finance/finance-types.ts

```typescript
export interface FinanceWallet {
  id: number; account_id: number; name: string;
  type: 'bank' | 'debit_card' | 'credit_card' | 'crypto' | 'cash' | 'ewallet' | 'physical' | 'other';
  provider: string | null; last_four: string | null;
  balance: number; currency: string; is_archived: number;
  metadata?: string; created_at: string; updated_at: string;
}

export interface FinanceTransaction {
  id: number; account_id: number; wallet_id: number | null;
  category_id: number; type: 'income' | 'expense' | 'transfer';
  amount: number; fee: number; description: string | null;
  note: string | null; date: string; time: string | null;
  transfer_id: string | null; from_wallet_id: number | null;
  to_wallet_id: number | null; on_behalf_of: number;
  on_behalf_of_label: string | null; metadata: string | null;
  created_at: string; updated_at: string;
}
```

## Constraints
- NO database changes allowed
- Expense amounts in DB are permanently 0 — must work around this
- Wallet balances ARE correct
- The code must handle transactions with amount=0 gracefully
