# DeskFlow — Principal-Engineer Audit + Rewind Implementation (Master Index)

> **What this is.** A rigorous, evidence-based review of the *actual* DeskFlow source, split into focused documents plus this master backlog. Every finding cites a real file:line. Every fix comes with **the principle** so you learn the reusable idea, not just the patch.

> **VERSION 2 (2026-07-02).** Re-audited against the updated `src.zip` (~134k LOC). Since v1 you shipped a lot: the **Activity** page merge (my #6 recommendation — done), a full **Finance** module, a new **Learn / "Lyceum"** module, and a **Subscriptions** page. This index now covers **8 documents**. See the per-doc "v2 UPDATE" sections and the new Docs 6-8. What changed at a glance is in section 6 below.

## 1. What "act as a principal engineer auditing your project" actually means

A principal-engineer review is not "read code and point at bugs." It's a disciplined pass in three lenses, each asking a different question:

| Lens | The question it asks | What it protects |
| --- | --- | --- |
| **Architecture review** | *Do the boundaries make sense? Will this still be changeable in 6 months?* | Your future velocity |
| **Security audit** | *What can an attacker (or a malicious file/URL/repo) make this do?* | Your users + their machine |
| **Performance teardown** | *Where does time, memory, and battery actually go?* | The felt quality of the product |

**How this makes you learn while the product improves:** every finding is written as `Symptom -> Fix -> Principle`. The symptom is specific to your code; the principle is the transferable rule (e.g. "validate at the trust boundary") you'll apply to the next 100 files without me.

> **Severity scale:** **P0** = ship-blocker (security/data-loss/crash). **P1** = serious (perf cliff, active architecture debt). **P2** = correctness/maintainability. **P3** = polish. Each finding is tagged `Sev · file:line`.

## 2. What I scanned (v2)

- Re-extracted the repo and mapped structure: **21 top-level dirs**, `main.ts` = **22,043 lines** (was 21,432), `App.tsx` = 3,361, `IDEProjectsPage.tsx` = **5,434** (was 5,523 then regrew), `TerminalPage.tsx` = 5,315, `DashboardPage.tsx` = **3,280**.
- New surfaces audited: `components/finance/` (wallets, transactions, crypto, lock screen), `services/learn/` + `components/learn/` (SQLite-backed lesson engine), `pages/ActivityPage.tsx`, `pages/SubscriptionsPage.tsx`.
- Electron security config, `preload.ts` bridge (985 lines), renderer polling loops, finance password/lock backend, and the tracking loop.

## 3. The eight documents

1. **Architecture & Information-Architecture Review** — god-objects (`main.ts`, `App.tsx`), the tracking-merge decision (now shipped), and where the new modules fit. *(has v2 UPDATE)*
2. **Security Audit** — `open-url` still unvalidated, still no CSP, `execSync` interpolation, IPC trust boundary, **plus new Finance data-at-rest findings**. *(has v2 UPDATE)*
3. **Performance & Memory Teardown** — the renderer polling storm (still a 1s interval), Dashboard hook sprawl (43 useState / 34 useEffect / 7 intervals), materialized aggregates. *(has v2 UPDATE)*
4. **DeskFlow Rewind + Insight Engine — Concrete Implementation** — files, data model, IPC endpoints, lives inside Insights.
5. **Product / Customer-Value Review + Ranked Backlog** — objective usefulness critique + master execution order.
6. **Finance Module Review (NEW)** — architecture, the lock-screen vs data-at-rest gap, CoinGecko integration, and a hardening plan.
7. **Learn / "Lyceum" Module Review (NEW)** — the lesson/curriculum engine, grounding/citations, spaced-repetition schema, and what to finish.
8. **Dashboard Redesign Spec (NEW)** — the front-end redesign you asked for: what to keep, cut, and add; the "one changing thing"; and a concrete card layout with data bindings.

## 4. Master ranked backlog (v2 — do these in order)

1. **[P0 · Security]** Validate/allowlist URL schemes in `open-url` (`main.ts:8189`) before `shell.openExternal`. *(Doc 2)* — **still open**
2. **[P0 · Security]** Add a Content-Security-Policy (none found in repo). *(Doc 2)* — **still open**
3. **[P0 · Security]** Finance lock is a **UI gate only** — the SQLite DB (balances, account numbers, crypto addresses, IBAN/SWIFT) is stored in plaintext. Encrypt sensitive fields at rest. *(Docs 2 & 6)* — **new**
4. **[P1 · Perf]** Kill the renderer polling storm: replace the 1s/5s `setInterval` refetches with event-driven push. `App.tsx:1188`, `DashboardPage.tsx:299`. *(Doc 3)* — **still open**
5. **[P1 · Security]** Convert `execSync(`...${var}...`)` git/tool calls to `execFile(cmd, [args])`. `main.ts:6431,6436,12109,12129`. *(Doc 2)* — **still open**
6. **[P1 · Arch]** Stop god-object growth: `main.ts` grew to 22k. Carve into domain modules behind a typed IPC registry — Finance and Learn already model the right shape, backfill the rest. *(Doc 1)*
7. **[P1 · Product]** Ship the Dashboard redesign (Rewind hero + one changing insight + cross-module summary). *(Docs 4 & 8)*
8. **[P2 · Hygiene]** Remove the **28 committed `.bak`/`.backup` files + `finance.zip` + `FinancePage.backup.tsx`** from the tree; rely on git. *(Doc 1)* — **regressed (was 29, still ~28 + new zips)**
9. **[P2 · Perf]** Materialize `daily_rollup` so Dashboard/Insights/Rewind never recompute from raw logs. *(Docs 3 & 4)*
10. **[P2 · Finance]** Finish the crypto/CoinGecko path: cache prices, handle rate-limit/offline, and never block the UI on the network. *(Doc 6)*
11. **[P2 · Learn]** Finish Learn: wire the tutor grounding end-to-end and standardize on the typed bridge (drop `(window as any).deskflowAPI`). *(Doc 7)*
12. **[P3]** Design-system pass + chart rationalization. *(Docs 5 & 8)*

## 5. What I still want you to tag (to sharpen the audit)

- `package.json` + lockfile (dependency versions, known CVEs, Electron version).
- `electron-builder`/`forge` config + `vite.config` (build hardening, ASAR, fuses).
- `index.html` (to confirm CSP absence and check meta tags).
- The **browser extension** code (it feeds `browser-tracking-event` — a real trust boundary).
- The local **HTTP server** in `main.ts` (~line 14178, `/foreground-app`) — what port, localhost-only?, any auth?
- The finance **sync** endpoints (`/v1/auth/pair`, `/v1/auth/refresh`, `main.ts:5942-6108`) — where does financial data go over the wire?

## 6. What changed since v1 (changelog)

| Area | v1 state | v2 state |
| --- | --- | --- |
| Tracking pages | 4 near-duplicate routes | **Merged into `ActivityPage`** (Apps/Websites/Productivity tabs) ✓ matches Doc 1 rec |
| Finance | small placeholder (`FinancePage.backup.tsx`, 28 lines) | **Full module**: 1,220-line page + `components/finance/*`, SQLite, lock screen, crypto |
| Learn | did not exist | **New "Lyceum" module**: `services/learn/*` (migrations, tutor, grounding) + `components/learn/*` |
| Subscriptions | did not exist | **New `SubscriptionsPage`** (renewal tracking, wired to finance types) |
| Security P0/P1 | open-url, CSP, execSync flagged | **None fixed** — all still present |
| Repo hygiene | 29 backup files | ~28 backups **+ new** `finance.zip`, `FinancePage.backup.tsx` (regressed) |
| God-objects | main.ts 21,432 | **grew to 22,043**; Dashboard now 3,280 |
