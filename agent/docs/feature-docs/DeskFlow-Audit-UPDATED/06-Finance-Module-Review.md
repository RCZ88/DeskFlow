# Doc 6 — Finance Module Review (NEW in v2)

> **Scope.** The Finance module you added since v1: `pages/FinancePage.tsx` (1,220 lines), `pages/SubscriptionsPage.tsx` (479), and `components/finance/*` (wallets, transactions, crypto, lock screen, modals). Format is `Symptom -> Fix -> Principle`. **Headline: the architecture is genuinely good; the security model has one serious gap.**

## A. What's good (keep doing this)

- **Proper backend persistence.** Finance data goes through typed IPC (`finance:*` handlers in `main.ts`) into **SQLite**, not localStorage. Schema is well-modeled: `finance_accounts`, `finance_wallets`, `finance_transactions`, `finance_categories`, `finance_subscriptions`, with a typed contract in `components/finance/finance-types.ts`. This is exactly the layering the rest of the app should imitate.
- **Real password hashing.** The lock uses `crypto.scryptSync(password, salt, 64)` with a per-install random 32-byte salt (`main.ts:20593-20601`) and constant-time compare intent. That's the correct primitive — not a naive SHA of the password. Good.
- **WebAuthn biometric unlock** (`FinanceLockScreen.tsx:434-461`) is a nice touch and uses `crypto.getRandomValues` for the challenge.
- **Module cohesion.** `components/finance/` is self-contained (its own `_fx/` motion helpers, `modals/`, `currency-data`, `finance-types`). This is the domain-module shape Doc 1 wants for the whole app.

## B. Findings

### F1 — The lock screen protects the UI, not the data `[P0 · main.ts finance schema]`

**Symptom.** `financeLocked`/`financePasswordHash` gate whether the **renderer shows** the finance UI. But the underlying rows — balances, `last_four`, and wallet `metadata` containing `account_number`, `iban`, `swift`, crypto `wallet_address` (`finance-types.ts` `WalletMetadata`) — are written to the SQLite file in **plaintext**. Anyone with file access (another app, a synced backup, malware, a shared machine) reads them directly with `sqlite3`, no password needed. The AES-256-GCM code that exists (`encryptAuditData`, `main.ts:20492`) is wired to the **audit log**, *not* to finance rows.

**Fix.** Encrypt sensitive finance fields at rest, keyed off the user's finance password (which you already have):
1. On unlock, derive a data key: `dataKey = scrypt(password, kdfSalt, 32)` (separate salt from the auth hash). Hold it in main-process memory only while unlocked.
2. Encrypt the sensitive columns/`metadata` blob with `aes-256-gcm` (you already have the exact helper — generalize `encryptAuditData` into `encryptField(value, key)`), storing `{iv, authTag, ciphertext}`.
3. Leave non-sensitive columns (currency, type, timestamps) clear so you can still index/aggregate; encrypt only PII/secrets (`account_number`, `iban`, `swift`, `wallet_address`, and optionally exact balances).
4. For "remember device," wrap the data key with OS keychain (`safeStorage.encryptString` in Electron) instead of leaving anything derivable from the install path.

**Principle.** *A lock on the door is not encryption of the contents.* Access control (can the UI show it?) and confidentiality at rest (can someone reading the file understand it?) are different guarantees. Financial PII demands the second, and the threat model for a local desktop app explicitly includes "someone else can read the file."

### F2 — Weak fallback key derivation `[P1 · main.ts:20485-20489]`

**Symptom.** `getAuditKey()` falls back to `crypto.createHash('sha256').update(userDataPath).digest()` when the key file is missing. The install path is **not a secret** — it's guessable/enumerable — so the fallback "key" provides obfuscation, not encryption. If you extend this pattern to finance (F1), inheriting this fallback would silently defeat the whole thing.

**Fix.** Never derive a confidentiality key from a non-secret. Use Electron `safeStorage` (OS keychain) as the root of trust; if unavailable, derive strictly from the user password and **fail closed** (refuse to decrypt) rather than falling back to a path-derived key.

**Principle.** *Key material must come from something secret.* A derivation is only as strong as its lowest-entropy input. "Prevents crashes" is not a security posture.

### F3 — CoinGecko live pricing has no resilience contract `[P1 · WalletDetailView.tsx / crypto fetch]`

**Symptom.** Crypto wallets fetch "live prices... automatically from CoinGecko" (`AccountsTab.tsx:567`, `WalletDetailView.tsx:721`). CoinGecko's free tier is aggressively rate-limited (HTTP 429) and can be slow/offline. If the fetch is on the render path or unthrottled per wallet, users see spinners, wrong net-worth, or a hung tab when offline or rate-limited — and net worth is the one number that must never look wrong.

**Fix.**
- Fetch in **main**, batched (one `/simple/price?ids=a,b,c` call for all held coins), on a timer (e.g. every 2-5 min), and **cache** the last good result in SQLite (`crypto_price_cache` with `last_updated`).
- Renderer reads only the cache; show "Prices from CoinGecko - Updated {ago}" (you already render this string) and a stale badge when older than N minutes.
- Handle 429/offline explicitly: exponential backoff, keep last good price, never zero out a balance because a fetch failed.

**Principle.** *Never put a third-party network call on the critical path of a core number.* Cache-first with graceful staleness beats live-but-fragile for anything a user trusts.

### F4 — Currency correctness `[P2 · currency-data / balances]`

**Symptom.** Wallets carry per-wallet `currency`, and there's a `financeGetDisplayCurrency`. Summing multi-currency wallets into one net-worth number requires FX conversion; if that's done with a stale or missing rate (or naive summation), totals are wrong.

**Fix.** Centralize a `toDisplayCurrency(amount, from, to)` using a dated FX table (cache like crypto prices), and always show which rate/date was used for conversions. Store amounts in **minor units (integers)** to avoid float drift (`0.1 + 0.2` bugs) — the schema currently uses `REAL balance`, which will accumulate rounding error over many transactions.

**Principle.** *Money is integers + a currency + a rate-date, never a bare float.* Every finance app that stores money as floating point eventually shows a wrong total.

### F5 — Repo hygiene regression `[P2 · repo]`

**Symptom.** `components/finance/finance.zip`, `pages/FinancePage.backup.tsx`, `pages/FinancePage.backup.tsx` (1.4k) are committed inside the module. This is the same anti-pattern from Doc 1 B1, now inside the newest code.

**Fix.** Delete; add `*.zip` and `*.backup.*` to `.gitignore`. Git history is the backup.

**Principle.** *One source of truth per file* (see Doc 1).

## C. Subscriptions page note

`SubscriptionsPage.tsx` reuses finance types (`FinanceSubscription`, `FinanceWallet`) and renders renewal urgency well. Two quick wins: (1) surface "upcoming renewals in 7 days" on the Dashboard (Doc 8), and (2) roll subscription spend into the finance monthly totals so it's not a separate silo.

## D. This doc's mini-backlog

1. `[P0]` Encrypt finance PII at rest keyed off the password/keychain (F1).
2. `[P1]` Replace path-derived fallback key with `safeStorage`/fail-closed (F2).
3. `[P1]` Move crypto pricing to main, batched + cached + backoff (F3).
4. `[P2]` Integer minor-units for money + dated FX conversion (F4).
5. `[P2]` Remove `finance.zip` / `FinancePage.backup.tsx` (F5).
