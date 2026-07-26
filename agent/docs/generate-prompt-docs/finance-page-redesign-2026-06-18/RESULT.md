# Finance Page Redesign — Design Instructions (RESULT.md)

> **Read me first.** You are redesigning the `/finance` route of DeskFlow. This document tells you *how to design* — the intent, hierarchy, and standard of finish. `CONTEXT_BUNDLE.md` is ground truth for file names, component contracts, IPC, types, and tokens. Where this document and the bundle disagree on **visuals**, this document wins; where they disagree on **data shapes / IPC**, the bundle wins. This is a **visual + UX refactor only** — preserve every existing behavior (lock + auto-lock timer, currency conversion, custodial net-worth exclusion, FAB QuickAdd, keyboard shortcuts, all IPC).

---

## 0. The mission in one sentence

Turn a functional-but-ugly finance page into something that looks **Notion-native, calm, and expensive** — dense with information yet effortless to scan — without changing a single data path.

**Design knobs:** `VARIANCE 5` (balanced — one distinctive signature per component, nothing avant-garde) · `MOTION 5` (150–250ms, `cubic-bezier(0.16,1,0.3,1)`, zero spring) · `DENSITY 7` (data-rich, 8px rhythm, never cluttered).

**Three golden rules, in priority order:**
1. **Clarity before beauty.** State-coverage and a single obvious focal point come first; polish is the finish, not a substitute.
2. **One focal point per view.** Decide the single question each tab answers, make that the brightest thing on screen, and demote everything else.
3. **Every data component ships five states:** Loading (skeleton), Empty (icon + one line + CTA), Error (plain cause + retry), Populated, Overflow (truncate / aggregate / paginate). No exceptions.

---

## 1. Design DNA (the single source of truth for look & feel)

### Color
| Role | Token | Usage |
|---|---|---|
| Canvas | `zinc-950` (`#09090b`) | Page background. **Never `#000`.** |
| Surface | `zinc-900/60` + `backdrop-blur-xl` | Glass cards |
| Elevated surface | `zinc-900/95` | Modals, popovers, dropdowns |
| Border subtle \u2192 active | `zinc-800/60` \u2192 `zinc-700/60` | Default \u2192 hover |
| Text primary / secondary / muted | `zinc-100` / `zinc-400` / `zinc-600` | Use tokens, never `opacity-50` on text |
| Page accent | `--page-accent: #10b981` (emerald-500) | Primary actions, active states, focus rings |
| Semantic income / expense / transfer | `emerald-400` / `red-400` / `amber-400` | Money direction \u2014 **always paired with icon + sign**, never color alone |

**Hard ceiling: three accents per view.** Emerald is the page accent; income/expense/transfer reuse emerald/red/amber. That is the entire budget \u2014 no blues, no violets anywhere on `/finance` (chart slices may use category-defined colors, which is data, not chrome).

### Elevation — no shadows
Build depth with **three layers only**: (1) `backdrop-blur-xl` glass, (2) a border-brightness step on hover, (3) a 1px `border-t border-white/5` inner highlight on hero cards. The *only* permitted box-shadow is the modal's ambient glow `shadow-[0_0_30px_rgba(0,0,0,0.35)]` — it reads as atmosphere, not lift, and is allowed only on the modal card.

### Type
| Token | Size / weight | Where |
|---|---|---|
| Display | 24\u201332px / 700, `tabular-nums` | Net worth, hero amounts |
| Page title | 15px / 600 | \u201cFinance\u201d in header |
| Section h2 | 15px / 600 | SectionHeader titles |
| Card title | 13px / 600 | Card headings |
| Body | 13px / 400 | Default |
| Meta | 12px / 400, `zinc-400` | Timestamps, sub-labels |
| Badge | 11px / 500, uppercase, `tracking-wide` | Type badges, pills |

Every money figure uses `tabular-nums` so columns align. Two font families max (Geist/Inter sans + JetBrains Mono); use mono only for raw numerics if at all — otherwise sans with `tabular-nums`.

### Spacing · radius · motion · z-index
- **8px grid:** `xs 4 · sm 8 · md 12 · lg 16 · xl 24`. Card padding `p-5`; section rhythm `space-y-6` between blocks, `gap-4` within grids.
- **Radius ceiling:** `rounded-xl` (12px). Pills/dots `rounded-full`. **Never `rounded-2xl/3xl`.**
- **Motion:** `150ms` hover/focus · `250ms` modals, tab swaps, accordions · ease `cubic-bezier(0.16,1,0.3,1)`. Animate **only** `transform` + `opacity`. Honor `prefers-reduced-motion` (instant state, no transitions).
- **Z-index:** use the scale only \u2014 `base 0 · elevated 10 · dropdown 20 · sticky 25 · overlay 30 · modal 40 · toast 50 · max 100`. Never arbitrary `999`.
- **Touch targets \u2265 44\u00d744px** (pad icon buttons; the glyph can be smaller). **Focus ring on every interactive element:** `focus-visible:ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-950`.

---

## 2. Build-safety notes (carry into the work — these caused the last crash)

- **Alias every lucide import** so an icon can never silently resolve to a DOM global: `import { Lock as LockIcon, Unlock as UnlockIcon } from 'lucide-react'` and render `<LockIcon/>`. A bare `<Lock/>` resolves to the browser's `window.Lock` (Web Locks API) and throws `TypeError: Illegal constructor` at runtime — TypeScript will NOT catch it because `Lock` is an ambient DOM global. Treat `Lock`, `Notification`, `Image`, `Range`, `History`, `Worker`, `Event`, `Selection`, `Text` the same way.
- **Register Chart.js explicitly** before rendering: `ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)`. Missing registration throws \u201c<chart> is not a registered controller.\u201d
- **No `any`, no symptom-masking.** Type security settings, IPC payloads, and props. Don't reach for `any`, broad try/catch, or `typeof window` guards to silence an error — fix the cause.
- **After building, confirm the artifact actually changed** (new offsets/hash) and re-test the exact failing path before declaring done.

---

## 3. Per-surface design direction

### 3.1 Global shell & header
**Question:** \u201cAm I secure, and in what currency am I looking?\u201d
- Header is one glass bar: `WalletIcon` in an emerald `IconBox` + **\u201cFinance\u201d** title + an inline **net-worth** read (emerald when \u2265 0, red when negative, `tabular-nums`). Net worth is the header's one quiet flex of confidence — keep it small but legible.
- Right cluster: currency picker (segmented dropdown, 10 common currencies, animated 150ms open), Lock button, Security popover (remember-device toggle + lock-timeout select). Group these with `gap-2`; they are utilities, not focal points — keep them `zinc-400` until hover.
- Tab bar sits directly under the header on a `sticky` blurred strip. Active tab uses `bg-[--page-accent]/15 text-[--page-accent]`; inactive is muted. Tab content crossfades 150ms (`opacity` + `translateY(4\u21920)`), `AnimatePresence mode="wait"`.
- FAB bottom-right, emerald 48px circle, `PlusIcon`, scale on hover/tap, `Ctrl/Cmd+N` opens QuickAdd.

### 3.2 Overview tab — the hero
**Question:** \u201cWhat's my situation right now, and can I log something in two seconds?\u201d This tab carries the redesign; spend the most craft here.
1. **QuickAddBar** (full-width glass, two tiers). Tier 1: type toggle (income/expense/transfer pills) \u2192 large amount input (`text-2xl font-bold tabular-nums`, currency-symbol prefix) \u2192 description \u2192 account select \u2192 Add button whose color tracks the type (emerald/red/amber). Tier 2: horizontally scrollable category chips with a right-edge mask fade, selected chip ringed. **\ud83e\udeb6 Signature:** the amount input's underline scales in on focus (`transform: scaleX`, 250ms). Disabled-with-hint when no accounts exist; submit shows spinner \u2192 250ms success check; never wipe inputs on error.
2. **Four KPI cards** (`grid-cols-2 lg:grid-cols-4`): Income (`TrendingUpIcon`, emerald, \u25b2 vs last period), Expenses (`TrendingDownIcon`, red, \u25bc), Net worth (`WalletIcon`, sign-colored, custodial-exclusion note only when custodial accounts exist), Transactions (`ReceiptIcon`, count). **\ud83e\udeb6 Signature:** a faint `opacity-10` SVG sparkline behind each value, fed by `monthlyTrends`.
3. **Two real charts** (`grid-cols-1 lg:grid-cols-2`), Chart.js — not text lists. Doughnut for spending-by-category (`cutout 68%`, top 7 + aggregated \u201cOther\u201d, slice colors from each category's color, legend right on `lg`/below on mobile). Grouped Bar for last-6-months income vs expense (`borderRadius 6`, `barThickness 20`, emerald vs red). Theme: `zinc-400 11px` ticks, tooltip `zinc-900/95 border-zinc-700/50 rounded-lg`, gridlines off or `zinc-800/40` only. Each chart needs its own empty state (icon + \u201cNo spending this period\u201d + CTA).
4. **Account summary** (`grid-cols-1 md:grid-cols-2`): compact cards (name + type badge + currency + converted balance, original underneath when currencies differ). Custodial accounts live in a separate **\u201cHolding for others\u201d** subsection fenced by an amber `border-l-2`, labeled \u201cNot counted in net worth.\u201d

### 3.3 Accounts tab
**Question:** \u201cWhat accounts/wallets do I have and what's in each?\u201d
- Interactive glass cards, `grid-cols-1 md:grid-cols-2`. **\ud83e\udeb6 Signature:** a thin **left accent rail** (`border-l-2`) in the account-type color (personal=emerald, joint=purple, custodial=amber, business=blue — note: type badges may use these four hues since they're categorical data, but keep card chrome within the 3-accent budget).
- Card row: type `IconBox` + name + type badge + wallet count | balance. Click expands a wallet accordion (`AnimatePresence`, animate measured `height` + `opacity`, never raw height). Wallet rows: type icon (`Landmark`/`CreditCard`/`Banknote`) + name + `last_four` + balance, with edit/archive actions revealed on hover (`opacity-0 \u2192 group-hover:opacity-100`).
- CreateAccountModal: name, 4-way type segmented control, optional description, searchable currency picker, initial balance; custodial type surfaces an amber hint about net-worth exclusion.

### 3.4 Transactions tab
**Question:** \u201cFind and scan my money movements \u2014 beautifully, not as a spreadsheet.\u201d
- Sticky filter bar under the header (`top-14`, `z-elevated`): search input (leading `SearchIcon`, debounced via React state) + type filter pills.
- Ledger grouped by date (\u201cToday\u201d / \u201cYesterday\u201d / full date), each group showing a right-aligned net total. **\ud83e\udeb6 Signature:** a left **semantic hairline** (`border-l-2` emerald/red/amber by type) that brightens on row hover.
- Row: type `IconBox` (`ArrowUpRight`/`ArrowDownRight`/`ArrowLeftRight`) + description + category badge + account + time | signed amount (`tabular-nums`). Delete button hidden until hover, and **must require an inline \u201cDelete? \u00b7 Cancel\u201d confirm** (today it deletes immediately — fix this).
- Two empty variants: \u201cno transactions yet\u201d vs \u201cno matches\u201d (filtered).

### 3.5 Categories tab
**Question:** \u201cOrganize the buckets money flows through.\u201d
- Grouped by type with colored section headers (Income emerald `TrendingUp`, Expense red `TrendingDown`, Transfer amber `ArrowLeftRight`). **\ud83e\udeb6 Signature:** each section's accent faintly tints its cards' borders (`border-[color]/20`).
- Compact cards: color dot/icon + name + spent-this-period in the category color; hover reveals a color-picker button.
- CreateCategoryModal & color-picker modal: 3-way type toggle, searchable 32-icon Lucide grid, 8-swatch color palette, live preview chip, active swatch ringed.

### 3.6 Modals (QuickAdd, Create*) — one pattern
Overlay `fixed inset-0 bg-black/70 backdrop-blur-sm z-[modal]` (the only place `bg-black/*` is allowed). Card `bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-5 max-w-md`. Entrance `opacity 0\u21921` + `scale 0.92\u21921` 250ms. Header with close (X); footer Cancel (ghost) + primary (emerald). Reset state on open; auto-select first account.

### 3.7 Lock screen
Full-bleed centered card: password input with show/hide, setup mode (password + confirm) vs unlock mode (attempts + cooldown). **\ud83e\udeb6 Signature:** on a failed attempt, briefly blur + scale-down the card, then de-blur on success. After 3 fails \u2192 30s cooldown with an animated progress bar; copy: \u201cIncorrect password \u2014 N attempts left\u201d / \u201cToo many attempts. Try again in Ns.\u201d Windows Hello button (`Fingerprint`) is a placeholder; password is always the fallback.

---

## 4. State-coverage matrix (the #1 anti-slop gate)

| Component | Loading | Empty | Error | Overflow / special |
|---|---|---|---|---|
| KPI cards | 4 skeleton cards | `0` / `\u2014` muted | inline `\u2014` + retry | big numbers `tabular-nums`, k/M format |
| Charts | skeleton at chart height | icon + \u201cNo data\u201d + CTA | \u201cCouldn't load \u00b7 Retry\u201d | many categories \u2192 top 7 + \u201cOther\u201d |
| Account list | 3 skeleton cards | \u201cCreate your first account\u201d | retry | long names truncate; custodial fenced |
| Transaction list | 5\u20136 skeleton rows | no-txn vs no-match | retry | debounced search |
| Category grid | skeleton grid | per-group \u201cAdd\u201d | retry | \u2014 |
| Lock | \u2014 | \u2014 | wrong-pw + cooldown | Hello unavailable \u2192 password |

---

## 5. Motion spec

| Interaction | Duration | Properties |
|---|---|---|
| Hover / focus / pill active | 150ms | `border-color`, `background-color`, `opacity`, `transform: scale` |
| Tab / content swap | 150ms | `opacity` \u00b7 `translateY(4\u21920)` |
| Modal in/out | 250ms | `opacity` \u00b7 `scale(0.92\u21921)` |
| Account accordion | 200ms | `opacity` \u00b7 measured `height` |
| Unlock de-blur | 250ms | `filter: blur`, `opacity`, `scale` |

Easing everywhere: `cubic-bezier(0.16,1,0.3,1)`. No `transition: all`. No spring. Honor reduced-motion.

---

## 6. Implementation order

1. **State-coverage sweep** — verify the \u00a74 matrix on every component; add missing skeleton/empty/error states.
2. **Transaction delete confirm** — replace immediate delete with inline \u201cDelete? \u00b7 Cancel.\u201d
3. **Visual polish pass** — header, KPI sparklines, chart theming + empty states, custodial fence, accent rails, semantic hairlines, focus rings.
4. **Motion audit** — confirm `transform`/`opacity` only, correct durations, no spring, reduced-motion respected.
5. **a11y + contrast sweep** — \u00a71 ring tokens, keyboard nav, \u2265 44px targets, contrast \u2265 4.5:1 body / 3:1 large, charts carry non-color labels.

---

## 7. Hard constraints (verbatim — do not violate)

1. No `box-shadow` for elevation (modal ambient glow is the sole exception).
2. No pure `#000`; `zinc-950` base; `bg-black/70` only as the modal overlay.
3. Max radius `rounded-xl`; pills/dots `rounded-full`. No `rounded-2xl/3xl`.
4. Animate `transform`/`opacity` only \u2014 never width/height/top/left/margin.
5. Emerald focus ring on every interactive element; no default browser rings.
6. \u2264 2 font families; \u2264 3 accents per view (emerald + red + amber).
7. Touch targets \u2265 44px; full keyboard nav with visible focus.
8. No `opacity-50` on text \u2014 use `zinc-400/600` tokens.
9. Z-index from the scale only.
10. No spring physics; `cubic-bezier` only.
11. Color is never the only signal \u2014 pair with icon/sign/text.
12. Preserve all behavior: lock + auto-lock, currency conversion/display, custodial net-worth exclusion, FAB QuickAdd, shortcuts. **Visual-only.**
13. Stay within `/finance` files (\u00a78). Don't touch other routes.
14. **No AI integration** \u2014 finance data must never be wired into any AI chat/context.
15. Alias all lucide imports; register Chart.js; no `any`. (See \u00a72.)

---

## 8. Files in scope

```
src/pages/FinancePage.tsx                      \u2014 shell, header, net worth, tab crossfade, FAB, Ctrl+N
src/components/finance/OverviewTab.tsx         \u2014 QuickAddBar, KPI sparklines, doughnut + bar, account summary + custodial
src/components/finance/AccountsTab.tsx         \u2014 accent-rail cards, accordion wallets, CreateAccountModal
src/components/finance/TransactionsTab.tsx     \u2014 semantic-hairline ledger, sticky filters, date groups, delete-confirm
src/components/finance/CategoriesTab.tsx       \u2014 type-zoned groups, compact cards, icon + color picker
src/components/finance/FinanceLockScreen.tsx   \u2014 vault de-blur unlock, Hello button, cooldown
src/components/finance/QuickAddModal.tsx       \u2014 full transaction form modal
src/components/finance/FinanceStickyHeader.tsx \u2014 simplified locked-state header
```
Reuse unchanged: `PageShell`, `TabBar`, `GlassCard`, `SectionHeader`, `EmptyState`, `currency-data`, `finance-types`.

---

## 9. Pre-return review checklist

- [ ] Scope respected: only `/finance` files touched.
- [ ] Primary action obvious in < 1s on every tab; one clear focal point; metadata muted.
- [ ] Loading + Empty + Error states exist for every data component (\u00a74).
- [ ] Hover / focus / active / disabled defined on every interactive element.
- [ ] All motion 150\u2013250ms, `transform`/`opacity` only, reduced-motion handled.
- [ ] Destructive delete confirms; submits give spinner \u2192 success; inputs never wiped on error.
- [ ] Meaning never by color alone (sign + arrow + icon).
- [ ] Emerald focus rings; full keyboard nav; targets \u2265 44px.
- [ ] No `#000`, no shadow-lift, no `rounded-2xl+`, no layout animation, \u2264 3 accents.
- [ ] Contrast \u2265 4.5:1 body / 3:1 large; charts have non-color labels.
- [ ] Existing behavior intact (lock, currency, custodial, shortcuts); no AI wiring.
- [ ] Lucide imports aliased; Chart.js registered; no `any`; build artifact verified to change.
- [ ] No raw tokens/enums/stack traces shown to the user; copy is plain language.
