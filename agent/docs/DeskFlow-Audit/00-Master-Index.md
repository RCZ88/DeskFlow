# DeskFlow — Principal-Engineer Audit + Rewind Implementation (Master Index)

> **What this is.** A rigorous, evidence-based review of the *actual* DeskFlow source you gave me (`src.zip`, ~129k LOC), split into five focused documents plus one master backlog here. Every finding cites a real file:line. Every fix comes with **the principle** so you learn the reusable idea, not just the patch.

## 1. What "act as a principal engineer auditing your project" actually means

A principal-engineer review is not "read code and point at bugs." It's a disciplined pass in three lenses, each asking a different question:

| Lens | The question it asks | What it protects |
| --- | --- | --- |
| **Architecture review** | *Do the boundaries make sense? Will this still be changeable in 6 months?* | Your future velocity |
| **Security audit** | *What can an attacker (or a malicious file/URL/repo) make this do?* | Your users + their machine |
| **Performance teardown** | *Where does time, memory, and battery actually go?* | The felt quality of the product |

**How this makes you learn while the product improves:** every finding is written as `Symptom -> Fix -> Principle`. The symptom is specific to your code; the principle is the transferable rule (e.g. "validate at the trust boundary") that you'll apply to the next 100 files without me. You keep the fish *and* the fishing rod.

> **Severity scale used across all docs:** **P0** = ship-blocker (security/data-loss/crash). **P1** = serious (perf cliff, architecture debt that's actively costing you). **P2** = correctness/maintainability. **P3** = polish. Each finding is tagged `Sev · file:line`.

## 2. What I scanned (and how)

- Extracted the repo and mapped structure: **21 top-level dirs**, `main.ts` = **21,432 lines**, `App.tsx` = 3,347, `IDEProjectsPage.tsx` = 5,523, `TerminalPage.tsx` = 5,308.
- **460 IPC handlers** (`ipcMain.handle/on`) and **676 DB call sites** — audited for injection and trust-boundary issues.
- **232 `exec`/`spawn` sites** repo-wide — audited the real `child_process` ones in `main.ts`.
- Electron security config, `preload.ts` bridge (957 lines), renderer polling loops, and the tracking loop.

## 3. The five documents

1. **Architecture & Information-Architecture Review** — the god-objects (`main.ts`, `App.tsx`), and the decision you asked about: *should tracking pages be merged?* (App+Website+Productivity vs Insights). Concrete IA plan with **zero new pages**.
2. **Security Audit** — `open-url` has no URL validation, missing CSP, `execSync` string-interpolation pattern, IPC trust boundary. Prioritized with fixes + principles.
3. **Performance & Memory Teardown** — the renderer polling storm (a **1-second** interval, 5s dashboard refetch), tracking-loop efficiency, materialized aggregates, bundle/heavy 3D components.
4. **DeskFlow Rewind + Insight Engine — Concrete Implementation** — exactly which files change, the data model, IPC endpoints, and how it lives *inside the Insights page* (no new page).
5. **Product / Customer-Value Review + Ranked Backlog** — objective "is this actually useful?" critique, data-relevancy pruning, and the master execution order.

## 4. Master ranked backlog (executive summary — full detail in each doc)

> Do these in order. Rationale + code in the linked docs.

1. **[P0 · Security]** Validate/allowlist URL schemes in the `open-url` handler (`main.ts:7938`) before `shell.openExternal`. *(Doc 2)*
2. **[P0 · Security]** Add a Content-Security-Policy (none found in repo). *(Doc 2)*
3. **[P1 · Perf]** Kill the renderer polling storm: replace the 1s/5s `setInterval` refetches with event-driven push from main. `App.tsx:1186`, `DashboardPage.tsx:298`. *(Doc 3)*
4. **[P1 · Security]** Convert `execSync(`...${var}...`)` git/tool calls to `execFile(cmd, [args])`. `main.ts:11842,11862,12194`. *(Doc 2)*
5. **[P1 · Arch]** Stop the god-object growth: carve `main.ts` (21k lines) into domain modules behind a typed IPC registry. *(Doc 1)*
6. **[P1 · Product]** Merge App + Website + Productivity into one **"Activity"** page with tabs; keep **Insights** as the narrative/Rewind home. *(Docs 1 & 5)*
7. **[P2 · Feature]** Ship the **Insight Engine spine + daily fun-fact** (template phrasing, no LLM) into the Insights page. *(Doc 4)*
8. **[P2 · Hygiene]** Remove the **29 committed `.bak`/`.backup` files** from the repo; rely on git. *(Doc 1)*
9. **[P2 · Perf]** Materialize `daily_rollup` so Dashboard/Insights/Rewind never recompute from raw logs. *(Docs 3 & 4)*
10. **[P3]** Design-system pass + chart rationalization. *(Docs 4 & 5)*

## 5. What I still want you to tag (to sharpen the audit)

I have the `src/` tree, but these were **not** in the zip and would materially improve the review:

- `package.json` + lockfile (dependency versions, known CVEs, Electron version).
- `electron-builder`/`forge` config + `vite.config` (build hardening, ASAR, fuses).
- `index.html` (to confirm CSP absence and check meta tags).
- The **browser extension** code (it feeds `browser-tracking-event` — a real trust boundary).
- The local **HTTP server** in `main.ts` (~line 14178, `/foreground-app`) — what port, is it bound to localhost only, any auth?
- **FM-AI** repo, only if you want the shared-infra comparison; otherwise skip for now.

Tag those and I'll fold a security addendum into Doc 2 and a dependency-risk section into Doc 1.
