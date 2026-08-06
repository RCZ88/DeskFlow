# PROMPT.md — Monthly Financial Recap (Reports) Design

## Raw Request (user's words, verbatim fragments)

> "I want the monthly recap generation to be auto on new-month rollover AND manually triggerable to backfill missed months, with AI-generated per-month insight content that chooses what to include based on the real tracked data."
>
> "For the contents of the report, it should be that you use the generate from skill alongside with all features as the context bundle. So what are the features that we have: the subscription, the payment, the categories, one of the things that are important..."
>
> "The timeline on the top navigation board doesn't affect what it is on... So we need to make sure that it actually fixes it properly."
>
> "Do it right now using the generate from skill. And if necessary, you can be back and forth with it, so it's on the data right now."

---

## Your Role

You are the **Lead Designer and Engineer** for the App Tracker (DeskFlow/RHEO) desktop finance app. You will design a complete, production-grade **Monthly Financial Recap (Reports)** feature — backend (IPC + DB + AI generation), data processing, and high-fidelity dark-mode UI — as a single coherent solution. You have NO access to the repo; read `CONTEXT_BUNDLE.md` (same folder) FIRST — it is your codebase reference and contains all real source code, schemas, IPC endpoints, and a live data snapshot.

## Problem Statement

The user tracks finances in the Finance page (wallets, subscriptions, transactions, budgets, fixed expenses, follow-through people, crypto). They want a **monthly recap report** — a written, AI-narrated summary of what happened financially in a given month, generated automatically when a new month rolls over (report for the PREVIOUS month), and manually generatable/backfillable for any past month. The recap must make its own decisions about what to include based on the REAL data (subscriptions billed, categories with spending, income events, balances, people). Critically, the recap has its own month timeline — the finance page's top navigation month selector must NOT influence it.

## Mandate

Design a comprehensive solution covering: (A) data pipeline, (B) AI generation, (C) persistence + IPC, (D) UI/UX. Produce exact specs (SQL, TypeScript interfaces, function signatures with logic, JSX structure, hex/class-level visuals). Do not offer options — pick the best design and specify it fully.

---

## A. Engineering Task — Data Processing Pipeline

1. **Month rollover detection & auto-generation.** Specify where the auto-check lives in the main process (pattern: `app.whenReady()` at src/main.ts:18877 + `setInterval` precedent at 18927-18931; optional backup-scheduler-style hook). Logic: on startup (and periodically), determine which calendar months have finance data but NO recap row → queue/generate the PREVIOUS month automatically. Must be idempotent — never regenerate or overwrite an existing month (`month UNIQUE`). First-ever launch with 3 months of data: decide (and justify) whether it auto-generates only the most recent previous month or backfills all — recommend ONE behavior.
2. **Month stats computation (code, not AI).** Define the exact aggregation queries (reusing the patterns from `finance:get-summary` / `finance:get-monthly-trends` / `finance:get-spending-by-category` at src/main.ts:26829-26911): income, expense, net, transaction count, top categories (name/amount/count), per-wallet spend, subscriptions billed in that month (derive from `finance_subscriptions` + generated transactions with matching `description`/dates — see `subscriptions:generate-due-transactions` at 27743), fixed expenses paid (via `finance_fixed_expense_payments.month`), follow-through activity (`on_behalf_of`/`ft_person_id`), wallet balance delta (start vs end of month), biggest single transaction, days with activity. Specify the JSON shape of the computed `stats` object.
3. **AI prompt construction.** Specify the system prompt + user message builder: system prompt enumerates every finance feature (subscriptions, payments/transactions, categories, wallets, budgets, fixed expenses, people/Follow Through, crypto, savings/loans) and instructs the AI to CHOOSE what to include per month based on the stats provided; user message = the month's stats JSON (concise, numbers rounded). Rules: AI writes prose only, never invents numbers; ~150-300 words; tone per your recommendation (warm, honest, non-judgmental).
4. **AI invocation.** Follow the exact chain from `runLifePhaseAI` (src/main.ts:16700-16720) + `buildChain`/`runWithFallback` (src/services/providers/router.ts). Specify: new feature key (e.g. `'monthlyRecap'`) that MUST be added to the typed union in router.ts:7; maxTokens/temperature; timeout; error handling (no providers → store stats-only recap with `status='failed'` + fallback text, never crash); persistence of `provider_id`.
5. **Persistence.** Exact CREATE TABLE for `finance_monthly_recaps` (columns: month UNIQUE, title, summary/narrative, stats_json, status, provider_id, timestamps) following the guarded-migration style (src/main.ts:3294-3340). Include list/get/upsert queries.
6. **New IPC channels.** `finance:recap-list` (all recaps, newest first, with stats summary), `finance:recap-get` (by month), `finance:recap-generate` (month → computes stats → calls AI → upserts; returns the recap), `finance:recap-delete` (optional). Full signatures, payloads, and return shapes (see `{ok,data}|{ok,error}` + raw-return conventions in CONTEXT_BUNDLE §5a/§10.6). Preload methods `financeRecapList/financeRecapGet/financeRecapGenerate` (pattern: src/preload.ts:1025-1070) + d.ts types.

## B. Design Task — High-Fidelity Visual Spec

The Recap UI lives in the Finance page. Choose where it mounts (recommend: a new top-level tab `recap` in the tabs array at src/pages/FinancePage.tsx:61-68 + `FinanceTabKey` union in finance-types.ts:451, following the tabPanel motion.div pattern at 1183+; justify vs the nested subtab pattern at 1344-1408). Specify:
1. **Layout & components.** Header with own month selector (prev/next arrows + month label + "Generate/Backfill" button — independent of the top `selectedMonth`), recap card(s): month hero (income/expense/net + MoM delta vs previous recap), AI narrative prose section (typography hierarchy, first-letter or pull-quote treatment), stats grid (top categories with amounts + colored category chips), subscription-billed list, wallet delta list, follow-through activity, empty state, loading state (generating spinner — AI can take seconds), error state (no provider configured / AI failed with stats-only fallback), "no data for this month" state.
2. **Tokens.** Dark mode, glass (`bg-zinc-900/80 backdrop-blur-xl`), max `rounded-xl`, emerald accent (#10b981 family) with category colors pulled from `finance_categories.color`, Geist + JetBrains Mono, spacing p-5, subtle borders (zinc-800), tab-panel motion (existing `tabPanel` variants).
3. **Generated recap list.** If a history list is included, specify its row layout (month, title, generated date, status badge, click-to-open).

## C. UX Task — Interaction Flow

1. Auto-generation: what the user SEES when the app opens in a new month (toast/badge "July recap generated" vs silent — recommend one), and where the recap is revealed.
2. Manual: click Generate → month picker (only months with data? or all?), loading state with progress hint, result swap-in.
3. Regenerate: allow "Regenerate" for a month? (Recommend: yes with confirm, since AI content can improve; stats never change.)
4. All 4 states must be specified: empty / loading / error / populated — plus the no-data month state. Hover/focus/disabled on every interactive element. Keyboard: month arrows.

## Constraints

1. **HARD:** recap month state is fully independent of FinancePage `selectedMonth` (src/pages/FinancePage.tsx:110) — no cross-contamination anywhere (no shared fetcher, no shared state, no top-timeline influence).
2. AI never invents numbers — stats computed in code and passed as data.
3. Idempotent auto-generation; `month` UNIQUE; never overwrite.
4. No new npm dependencies. No PTY/terminal code. Files are CRLF.
5. Follow existing IPC/preload/DB/AI patterns in CONTEXT_BUNDLE.md exactly.
6. `Vite + esbuild` build conventions — new files under `src/components/finance/` for UI, handlers in `src/main.ts`.

## Frontend Skills (apply their rules to the UI spec)

1. **Frontend Design** — DeskFlow component patterns, tokens, spacing, typography, glass cards
2. **Human-Centric UX** — empty/loading/error states, progressive disclosure, feedback
3. **Impeccable** — typography/color/spatial/motion/interaction/responsive/UX-writing dimensions
4. **Motion — Bring the UI Alive** — L2/L3 liveliness for recap reveal, stat tick-ups
5. **UI UX Pro Max** — financial-domain design rules
6. **Design Taste System** — anti-repetition, variance
7. **frontend-external-infra** — source routing, re-skin rules, anti-slop checklist

## MCP Inventory (available components — pick concrete ones, then re-skin)

| Component | Source | Use for |
|-----------|--------|---------|
| card / dialog / select / tabs / skeleton | shadcn | Recap cards, month picker, dialogs |
| NumberTicker, AnimatedNumber | Magic UI | Income/expense stat count-ups |
| Sparkles, RefreshCw, ChevronLeft/Right, CalendarRange, FileText, Bot, Wallet, TrendingUp/Down | Lucide | Header icons, generate button, status |
| DotPattern, GlareHover | React Bits | Card texture/glare |

**Anti-Slop Checklist (mandatory):** re-skin all sourced components to DeskFlow tokens (colors → emerald/zinc palette, glass bg-zinc-900/80, backdrop-blur-xl); max rounded-xl; dark-mode only; Geist + JetBrains Mono; no purple gradients; no invented icons (use Lucide names above); every state (empty/loading/error/populated) specified; accessibility (focus rings, aria-labels on icon buttons).

## Output Format

Single comprehensive markdown spec (`RESULT.md`-style) with sections: Architecture Overview → Data Pipeline (queries + stats JSON schema) → AI Generation (prompts + chain) → DB Schema → IPC + Preload → UI Component Spec (per component: props, states, JSX structure, visuals) → Interaction Flow → Edge Cases (no provider, empty month, first launch, rollover while app closed for months, regeneration) → Backend Audit Table (each new IPC traced to handler/DB). Be exhaustive — this goes straight to implementation.
