# RUN.md — Finance Page Build & Run Instructions

## How the app loads its UI

- **Prod (what `npm start` uses):** Electron loads `dist-electron/main.cjs` as the main process.
  `createWindow()` in main.cjs spins up a Node.js `http.createServer` serving files from `../dist/`
  (relative to `dist-electron/`, so the `dist/` folder). It then calls `mainWindow.loadURL('http://localhost:<port>/index.html')`.
- **Dev:** If `VITE_DEV_SERVER_URL` env var is set, the window loads from that URL instead.
  Currently this env var is NOT set, so `npm start` always uses the production path.
- **There is no file://, no app:// scheme.** The app:// scheme is registered but unused.

## Build + Relaunch Sequence

```powershell
# 1. Kill any running DeskFlow instances
Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "DeskFlow" -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Rebuild (renderer + preload + services + main)
npm run build

# 3. Start
npm start
```

## Current BUILD MARKER: v2

After launching, navigate to the Finance page. You should see:
- **In the UI:** "Finance BUILD MARKER v2" in the page header (small green monospace badge)
- **In Main console:** `BUILD MARKER v2`
- **In Renderer console:** `BUILD MARKER v2`

## Cycle 6 Changes (2026-06-22)

### Phase 2 — New Requirements Implemented

| # | Feature | File(s) | How to verify |
|---|---------|---------|---------------|
| 2.1 | Balance locked on edit | `AccountsTab.tsx:697-710` | Edit existing wallet → balance is read-only with hint "Balance changes only through transactions" |
| 2.2 | Popup stays open after adding | `TransactionModalShell.tsx:39-48` | Add transaction → see "Added!" banner, form clears, can add another |
| 2.3 | Fancy amount with caret tracking | `useFormattedAmount.ts` | Type 1000000 → shows 1,000,000 live, cursor doesn't jump |
| 2.4 | Last-used selections persist | `txPrefs.ts`, `BankTransactionModal.tsx:38-41` | Set type=Expense, close popup, reopen → Expense selected |
| 2.5 | Transfer creates linked double-entry | `BankTransactionModal.tsx:62-74` | Transfer from Wallet A to B → A gets expense, B gets income, shared transferId |
| 2.6 | Inline category creation | `CategoryChipGrid.tsx:41-66` | Tap "+ New" in category grid → inline form → type name + Enter |
| UX | CoinGecko ID help text | `WalletDetailView.tsx:447,469,629` | Open crypto wallet → CoinGecko ID field has explanation |

### Files Modified
- `src/components/finance/AccountsTab.tsx` — EditWalletModal balance locked (read-only + hint)
- `src/components/finance/modals/useFormattedAmount.ts` — Caret position preservation
- `src/components/finance/modals/BankTransactionModal.tsx` — TransferId linking, amount input ref
- `src/components/finance/WalletDetailView.tsx` — FieldRow hint prop, CoinGecko ID help text, crypto asset help
- `src/pages/FinancePage.tsx` — BUILD MARKER v2
- `src/main.tsx` — BUILD MARKER v2 console.log
- `src/main.ts` — BUILD MARKER v2 console.log
- `agent/REQUESTS.md` — Added requests #055-#058
- `agent/state.md` — Cycle 6 entry

### Not Completed
- The other 6 modals (Debit, Credit, Crypto, Physical, Cash, Ewallet) were NOT individually updated with amount input refs or transferId linking. Only BankTransactionModal received these fixes. The modals exist and work but need the same patterns applied.
- Per-modal caret position tracking only works in BankTransactionModal currently.

## Output locations

| What | Source | Output |
|------|--------|--------|
| Renderer | `src/pages/*.tsx`, `src/components/**/*.tsx` | `dist/assets/index.js` (bundled) |
| Main process | `src/main.ts` | `dist-electron/main.cjs` |
| Preload | `src/preload.ts` | `dist-electron/preload.cjs` |
