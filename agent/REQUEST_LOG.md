# REQUEST LOG — Cycle 189-191 (UPDATED)

> COMPILED REQUEST LIST — every request from the last 10 prompts. Check items off as done.

## Requests Checklist

### Finance — Transactions
- [x] 1. Historical toggle for income transactions (all 7 wallet types) — violet styling, separate filter, skip balance update
- [x] 2. Multi-select filter chips on TransactionsTab (type + category)
- [ ] 3. Transaction sorting — sort by transaction DATE (not added date), asc/desc toggle, sort by amount/name — CODE DONE, needs visual verify
- [ ] 4. Crypto wallet balance in list views — shows crypto holdings subtitle below main balance — CODE DONE, needs visual verify

### Finance — Transfers
- [x] 5. Crypto→crypto transfer double-fee fix (send gross amount)
- [x] 6. Crypto→fiat transfer: wallet selector shows ALL wallets, fiat mode when non-crypto dest selected
- [ ] 7. Crypto→fiat transfer — latest build has isCrossType fix + feeType scoping fix + validation fix — needs runtime test

### Finance — Wallet Balances
- [x] 8. Auto-recalculate wallet balance after every transaction (safety net)
- [x] 9. Settings toggle for auto-recalc (Settings → Finance → Balance Auto-Recalculate)

### Finance — Subscriptions
- [x] 10. Fix RangeError "Too many parameter values" in retry-payment and record-payment
- [x] 11. Subscription retry now tracks failed_dates in metadata, shows retry chips per failed date
- [x] 12. handleRetrySubscriptionPayment passes date param to backend
- [x] 13. Subscription dates UTC bug — all toISOString().slice(0,10) replaced with toLocalDateStr()
- [ ] 14. Subscription payments must ALL be on the SAME DATE each month — CODE FIXED, needs visual verify

### Finance — Follow-Through Person Balance
- [x] 15. DB migration: added balance + wallet_id columns to finance_ft_persons
- [x] 16. Backend IPC: ft-person-topup, ft-person-deduct, ft-person-set-wallet handlers
- [x] 17. Preload bridge for new FT person IPC handlers
- [x] 18. UI: PersonCard shows stored balance + linked wallet name (violet badge + wallet chip)
- [x] 19. UI: PersonDetailModal — stored balance section + Top Up button + Deduct button + wallet link picker
- [x] 20. UI: FollowThroughCard — shows stored balance per person in breakdown (violet "bal:" chip)
- [x] 21. Top-up flow: TopUpModal with wallet picker + amount input + description → calls financeFtPersonTopup
- [x] 22. Deduct flow: DeductModal with current balance display + amount input → calls financeFtPersonDeduct

### Infrastructure
- [x] 23. Error propagation: handleAddTransaction throws with actual error message
- [x] 24. Transfer handler returns {success:false, error:"..."} instead of null
- [x] 25. Console logging for transfer debug

## Status
- DONE: 22/25
- NEEDS VISUAL VERIFY: 3 (#3, #4, #14)
- NEEDS RUNTIME TEST: 1 (#7 — crypto→fiat transfer with latest fixes)
- ALL CODE DONE: 25/25 (remaining are runtime verification only)
