# Design Audit — RHEO Renderer (read-only, pre-LAMINAR)

- **Date:** 2026-08-31
- **Scope:** Renderer only (`src/`). No code modified.
- **Purpose:** Ground `docs/design.md` (the "LAMINAR" design constitution) in reality instead of assumptions.
- **Method:** Static code census via `grep`/`read_file` over `src/`, `index.html`, `package.json`, and the existing design docs (`agent/DESIGN.md`, `agent/docs/DESIGN_SYSTEM.md`, `src/tokens.css`, `src/index.css`).

> **Screenshot index — NOT CAPTURED.** This audit is static. Attaching to a live Electron window (probe or Playwright CDP) requires building and launching the app, which is out of scope for a read-only audit. See §3 and §10(c) for what remains unverified visually.

---

## 1. STACK CENSUS

| Concern | Reality (from code) |
|---|---|
| Renderer framework | **React 19.2** (`react`/`react-dom`), `react-router-dom` 6.30 |
| Build / bundler | **Vite 7** + `@tailwindcss/vite` 4.2 (**Tailwind v4**, `@theme` CSS-first, no `tailwind.config`) |
| Styling system | Tailwind v4 utility classes inline in TSX (~the dominant path) + **four competing token/style layers** (see §2, §6) |
| Component library | shadcn-style (`components.json` style `base-nova`, registry `@react-bits`) — but `react-bits` is imported in **0** files; canonical components are partially real (§5) |
| Chart libraries | **5 in use:** `chart.js` (26 files) + `react-chartjs-2` (24), `recharts` (4), `lightweight-charts` (1), `vega-embed` (1) |
| Icons | **`lucide-react`** (591 files) — sole icon source. `simple-icons` (0 uses) and `react-bits` (0 uses) are declared deps but dead |
| Font loading | Google Fonts `<link>` in `index.html` (29 families). No `next/font`, no `@fontsource` self-host, no preload |
| Electron | **Electron 41.1** (`titleBarStyle: 'default'` → **native frame**). `focusManager` spawns a `frame:false transparent` floating window for its OSD overlay only |
| Animation libs | **`framer-motion` 12** (331 files). `motion` (1). Framer's `spring` API is available everywhere despite being banned by the design doc (§7, §8) |

**Architecture note:** Vite + Electron, not Next.js — so `next/font` is correctly *not* used; self-host via `@fontsource/*` is the right substitution and is not done.

---

## 2. COLOR CENSUS

Raw counts over `src/`: **592 distinct hex** + **885 distinct `rgba()`** color literals. **254 hex values occur exactly once** (pure one-off drift). Only ~30 hex values appear ≥10 times.

### Top-of-distribution hex (the "committed" set)

| Hex | Count | Identity |
|---|---|---|
| `#ffffff` | 9142 | foreground/white |
| `#4E79A7` | 2043 | **Tableau-10 categorical** (blue) |
| `#F28E2B` | 1703 | **Tableau-10** (orange) |
| `#E15759` | 1528 | **Tableau-10** (red) |
| `#76B7B2` | 1468 | **Tableau-10** (teal) |
| `#59A14F` | 1339 | **Tableau-10** (green) |
| `#EDC948` | 1273 | **Tableau-10** (yellow) |
| `#B07AA1` | 1246 | **Tableau-10** (purple) |
| `#FF9DA7` | 1186 | **Tableau-10** (pink) |
| `#9C755F` | 1150 | **Tableau-10** (brown) |
| `#BAB0AC` | 1150 | **Tableau-10** (gray) |
| `#10b981` / `#34d399` / `#22c55e` | 375 / 103 / 123 | emerald success family |
| `#f5c518` / `#f59e0b` / `#fbbf24` | 327 / 213 / 138 | amber warning family |
| `#8b5cf6` / `#a855f7` / `#6366f1` / `#a78bfa` | 193 / 103 / 113 / 80 | violet/indigo accents |
| `#ec4899` / `#f472b6` | 166 / (voice glow) | pink brand accent |
| `#22d3ee` / `#06b6d4` | 125 / 95 | cyan secondary |
| zinc grays (`#71717a`,`#a1a1aa`,`#6b7280`,`#3f3f46`,`#52525b`,`#27272a`,`#18181b`,`#1c1917`) | 52–174 each | surface/border/text scale |

**Key finding:** The single largest intentional color cluster is the **Tableau-10 categorical palette** (10 hues, ~14,700 combined occurrences), hard-coded as hex in charts and category maps. This is the de-facto "accent system" of the app — not any token.

### Color-debt table (per concern)

| Concern | Distinct hues | Example hexes | Apparent intent |
|---|---|---|---|
| Charts / data-viz | 10 (Tableau-10) + emerald/amber/cyan/violet | `#4E79A7 #F28E2B #E15759 …` | categorical series coloring |
| Per-page accent (DESIGN_SYSTEM) | 6 mapped (pink/cyan/sky/violet/amber/emerald) | `#ec4899 #22d3ee #38bdf8 #8b5cf6 #fbbf24 #34d399` | navigation landmarks |
| Semantic | success/warning/error/info | `#34d399 #fbbf24 #f87171 #38bdf8` | status |
| Session categories | 6 | red/blue/purple/teal/amber/zinc `*-500/15` | feature/bug/refactor… |
| Terminal 12 tabs | 12 | green/indigo/orange/rose/amber/violet… | tab landmarks |
| Decorative glow/aurora | pinks, cyans, whites | `rgba(244,114,182,…)` in `index.css` keyframes | ambient motion |
| One-off literals | **254 single-use hex** | (scattered) | ungoverned |

---

## 3. PAGE INVENTORY

Routes declared in `src/App.tsx`:

| Route | Label (sidebar) | Purpose |
|---|---|---|
| `/` | Dashboard | Hero timer + KPIs + heatmap |
| `/activity` | Activity | Apps/websites/productivity (tabbed) |
| `/external` | External | External-activity tracking (child of Activity) |
| `/ai` | AI Assistant | AI chat / compositions |
| `/studio` | Documentation | Feature studio |
| `/learn` | Learn | Lyceum learning |
| `/resume` | Resume | Resume builder (sub-routes build/preview/import/export) |
| `/ide` | IDE Projects | IDE project stats |
| `/finance` | Finance | Personal finance / portfolio |
| `/reports` | Insights | Reports (child: Rankings) |
| `/rankings` | Rankings | Leaderboard |
| `/life` | Life | Life phases / river |
| `/settings` | Settings | Settings (child: Database) |
| `/database` | Database | DB viewer |
| `/guide` | Guide | Docs |
| `/terminal` | Terminal | Terminal workspace (12 tabs) |
| `/agentic` | Agentic System | Agent orchestration |
| `/pricing` | (stub) | "Not Yet Added Feature" |

**Accent-coverage gap (critical):** `src/index.css` defines `[data-page="…"]` accent overrides for `dashboard, productivity, stats, browser, ide, external, insights, database, settings, tutorial, finance`. **The live routes never set `data-page`** (grep of `App.tsx` = 0 matches), so:
1. Every page silently falls back to `--page-accent: var(--accent-primary)` = **pink**.
2. The map keys (`stats`, `browser`, `productivity`, `insights`, `tutorial`) are **old route names** that no longer exist (`/activity`, `/reports`, `/learn` are the real ones).

=> The per-page accent system is **entirely dead**. This is the literal mechanism behind "every page feels like its own theme" (no theme is actually applied) — combined with the fact that three token systems disagree.

**Screenshot status:** Not captured (see header). Each major surface above should be screenshot-indexed once a build is available.

---

## 4. TYPOGRAPHY

| Concern | Reality |
|---|---|
| Families loaded (`index.html`) | **29** Google Fonts families (Anton, Inter, Space Mono, Poppins, Caveat, Playfair, Lora, DM Sans, Bangers, Baloo 2, Bebas Neue, Space Grotesk, Archivo Black, Cormorant, Montserrat, Titan One, Chewy, Manrope, IBM Plex Mono, Permanent Marker, Nunito Sans, Kalam, Unbounded, JetBrains Mono, DM Serif, Source Serif 4, Libre Caslon, Fredoka) |
| Families actually used in `src/` | **~5:** `Inter` (629 refs), `JetBrains Mono` (114), plus ~14 decorative ones referenced **1–11 times each** (markdown/export pipelines: Libre Caslon, Manrope, Montserrat, Anton, Space Grotesk, Fredoka…) |
| Body font | `Inter` (per `index.css` `body { font-family: "Inter","Geist",… }`) |
| Documented primary font | **`Geist`** (`DESIGN_SYSTEM.md` §2.1) — **NOT loaded in `index.html` at all** (grep = 0). Falls through to `system-ui`. The design doc's headline font choice is unfulfilled. |
| Display font | `Space Grotesk` (in `tokens.css` + landing), not used by the main app body |
| One-off size problem | No single source for type scale; sizes set ad-hoc in TSX. `DESIGN_SYSTEM.md` mandates `text-lg font-semibold` (18px) page titles and bans `text-3xl/4xl` — but the doc itself is not enforced in code. |
| Tabular numerals | `JetBrains Mono` carries them for data; **no `tabular-nums` utility found on numeric UI** outside mono contexts → misaligned stat figures likely. |

---

## 5. COMPONENT DIVERGENCE

Canonical "16 standard components" from `DESIGN_SYSTEM.md` vs. reality (files defining each):

| Component | DESIGN_SYSTEM says | Real count | Notes |
|---|---|---|---|
| `GlassCard` | 1 canonical (3 variants) | **2** definitions | variant CSS not unified |
| `SectionHeader` | 1 | **3** | |
| `TabBar` | 1 | **2** | plus many ad-hoc tab UIs |
| `StatCard` | 1 | **5** | |
| `EmptyState` | 1 | **6** | 6 separate empty-state implementations |
| `LoadingState` | 1 | 1 | (skeleton vs spinner inconsistency likely) |
| `CategoryColors` | 1 | exists, but **≥10 files re-declare their own `red-500/15…` maps** | the canonical map is not used as the single source |
| `PageShell` | 1 | 1 | |
| `StickyHeader` / `ModalOverlay` / `ConfirmDialog` / `TerminalTab` / `SessionCard` / `SystemCard` / `KnobSlider` / `ChartContainer` | 1 each | 1 each (mostly real) | |

**Duplication map:** `EmptyState` ×6, `StatCard` ×5, `SectionHeader` ×3, `GlassCard` ×2, `TabBar` ×2. The "single `CategoryColors`" promise is violated by ≥10 inline category-color maps (`src/components/ai/…`, `conductor/MissionWizard.tsx`, `finance/…`, `DailyPlanCard.tsx`, etc.) each with its own hue choices.

---

## 6. EXISTING DESIGN DOCS — STALENESS

There are **three competing "single source of truth" token layers**, and they disagree:

| Layer | File | Status | Conflict |
|---|---|---|---|
| A | `agent/DESIGN.md` | "Prime directive" doc | says use "tweakcn tokens in globals.css"; references `globals.css` which **does not exist** (app uses `index.css`) |
| B | `agent/docs/DESIGN_SYSTEM.md` | "Approved — implementation ready" (1048 lines) | defines pink `#ec4899` brand, Geist font, `rounded-xl` max, spring ban, 16 components, per-page accent map |
| C | `src/tokens.css` | "single source of truth", **MONOCHROME LAW** (white/black only, bloom ≤8%) | **consumed 0 times** in `src/` despite being imported first in `main.tsx`. Its tokens (`--hairline`, `--surface-1`, `laminar-*`) appear nowhere in components |
| D (implicit) | `src/index.css` `@theme` | the file components *actually* read from | defines yet another token set (`--ws-*`, `--color-primary:#fbbf24` amber, `--resume-*`, serif display, aurora/glow keyframes) |

**Concrete mismatches (reality vs docs):**

1. **Monochrome law (C) is dead.** `tokens.css` bans any hue outside white/black; reality has 592 hex + Tableau-10 + per-page accents. The LAMINAR file is imported but unused — a third, unused constitution.
2. **Brand accent color is unresolved.** DESIGN_SYSTEM says pink `#ec4899`; `index.css` `--color-primary` is amber `#fbbf24`; the app renders primarily zinc + Tableau-10 charts. Three different "the accent is X."
3. **Font mismatch.** Docs say Geist (not loaded) → actual Inter; docs say 2 families max per view, but 29 are loaded.
4. **Radius rule violated.** DESIGN_SYSTEM bans `rounded-2xl/3xl` (>12px); grep finds `rounded-2xl` ×101, `rounded-3xl` ×6 still present. (`rounded-lg` 2611 / `rounded-xl` 1352 / `rounded-full` 1341 dominate.)
5. **Shadows banned, everywhere.** DESIGN_SYSTEM §5.1 GlassCard "elevated" uses `shadow-[0_0_30px…]`; grep finds 212 shadow utilities (`shadow-2xl` 78, `shadow-lg` 48, `shadow-xl` 34, plus 51 arbitrary `shadow-[…]`). The "hairlines not shadows" rule is not followed.
6. **Springs banned, framer-motion ubiquitous.** DESIGN_SYSTEM §7.3 "Removed: Spring physics anywhere" — yet `framer-motion` is in 331 files and `index.css` ships `pulse-ring`, `scorePulse`, aurora, `border-beam` infinite loops.
7. **`globals.css` referenced but absent** (DESIGN.md), and `DESIGN_SYSTEM.md` predates the Tailwind v4 `@theme` migration (it still assumes `tailwind.config` token flow).

---

## 7. DATA-VIZ

- **Categorical palette:** **Tableau-10** (`#4E79A7 #F28E2B #E15759 #76B7B2 #59A14F #EDC948 #B07AA1 #FF9DA7 #9C755F #BAB0AC`), hard-coded hex, used in charts and category pills. ~14,700 combined occurrences.
- **Session/mission categories:** a *different* 6-color map (`red-500/15`, `blue-500/15`, `purple-500/15`, `teal-500/15`, `amber-500/15`, `zinc-500/15`) re-declared in ≥10 files — does **not** reuse Tableau-10 or the canonical `CategoryColors`.
- **Conductor mission templates:** a *third* scheme (`text-cyan-300/bg-cyan-500/10`, `text-rose-300`, `text-emerald-300`, `text-amber-300`) hardcoded in `MissionWizard.tsx`.
- **Terminal 12 tabs:** a *fourth* categorical map (`colorMap` in `index.css`) with 12 hues.
- **Chart types in use:** bar, line, area/stream, donut/pie, waterfall, heatmap, candlestick (lightweight-charts), force/cytoscape graphs, mermaid diagrams, vega embeddings — spread across 5 charting libraries. No shared `ChartContainer` wrapper is consistently used (the canonical one exists in 1 file).

**Net:** at least **4 independent categorical color systems** and **5 chart libraries** with no shared wrapper. This is the most expensive inconsistency to unify.

---

## 8. MOTION

| Concern | Reality |
|---|---|
| Declared standard easing | `tokens.css`: `cubic-bezier(0.19,1,0.22,1)` (ease-out-expo). `index.css`/`DESIGN_SYSTEM`: `cubic-bezier(0.16,1,0.3,1)`. **Two different "standard" easings.** |
| Distinct easing curves in code | **19** different `cubic-bezier(...)` literals (incl. bounce `0.34,1.56,0.64,1` ×2) |
| Durations | `--dur-fast 150 / --normal 250 / --slow 400` (tokens.css) vs `--fast 150 / --normal 250 / --slow 400` (index.css) — agree on numbers, split across two files |
| Infinite / ambient loops | **≥52 `infinite` animations** declared (aurora 8s, shiny-text 8s, shine 14s, shimmer 1.4s, border-beam 6s, pulse-ring 1.5s, mesh 20s, sidebarShine 3.2s, df-edge-breath 4s, scorePulse 2.4s, tapestry-breathe, lyceum-glow-breathe 9s, voice-bar…). Several are decorative (aurora, shine, border-beam) and **contradict** DESIGN_SYSTEM §14 animation anti-patterns. |
| Battery relevance | App runs all day. Continuous `infinite` keyframes (esp. `aurora`, `mesh` 20s, `sidebarShine`, `lyceum-ambient-glow`) keep the compositor busy permanently. DESIGN_SYSTEM "Removed spring physics" is honored only on paper. |
| Reduced-motion | `prefers-reduced-motion` handling exists in `tokens.css`, `index.css`, and several component CSS files — but inconsistent (some loops only slowed, not stopped). |

---

## 9. TERMINOLOGY (exact strings the product uses)

- **Product name is split.** Code: `DeskFlow` (572), `DeskFlow AI` (9), `App Tracker` (8). Agent docs: `RHEO` (23, and `AGENTS.md` insists "this project is called RHEO — never TURGO"). `index.html <title>` = "DeskFlow AI - Elite Productivity Tracker". **The design doc must pick one name and apply it everywhere** (window title, fallback screen, docs).
- **Sidebar menu labels (verbatim from `App.tsx`):** Dashboard, Activity, External, AI Assistant, Documentation, Learn, Resume, IDE Projects, Finance, Insights, Rankings, Life, Settings, Database, Guide, Terminal, Agentic System.
- **Activity sub-tabs:** apps / websites / productivity (via `/activity?tab=…`).
- **Feature nouns seen in code:** Life Phases ("Today's Edge"), Career Tapestry, Lyceum (Learn), Conductor, Mission Wizard, LivingSubstrate/AppBackground (ambient), Terminal 12-tab workspace, Focus session, Daily Digest, Rankings, Cash Flow Runway, Net Worth.
- **The doc should speak this vocabulary**, not invent "Overview/Dashboard/Settings" generic labels.

---

## 10. SLOP INDEX (summary counts)

| Metric | Count |
|---|---|
| Distinct hex colors | **592** |
| Distinct `rgba()` literals | **885** |
| One-off (single-use) hex | **254** |
| Font families loaded | **29** (≈5 actually used) |
| Canonical components duplicated | `EmptyState` ×6, `StatCard` ×5, `SectionHeader` ×3, `GlassCard` ×2, `TabBar` ×2 |
| Categorical color systems | **≥4** (Tableau-10, session-cat, conductor, terminal-12) |
| Chart libraries | **5** |
| Radius values in use | 8 (`lg/xl/full/md/2xl/sm/3xl/none`) — 2 banned still present |
| Shadow styles | 6 Tailwind + **51 arbitrary `shadow-[…]`** (212 total utilities) |
| Easing curves | **19** distinct |
| Infinite animation loops | **≥52** |
| Competing token layers | **3** (DESIGN.md / DESIGN_SYSTEM.md / tokens.css) + implicit `index.css` |
| Per-page accent coverage | **0%** (map dead; no `data-page` set) |
| Brand-accent definitions | **3 conflicting** (pink / amber / none) |

### (a) Top 5 highest-leverage inconsistencies

1. **Three dead/contradictory token constitutions** (`DESIGN.md`, `DESIGN_SYSTEM.md`, `tokens.css`) plus an implicit `index.css`. LAMINAR `tokens.css` is imported but used **0×**. → Collapse to ONE enforced source.
2. **Per-page accent system is 100% dead** (no `data-page` set; map keys are obsolete route names). This is the direct cause of "every page feels like its own theme" — no theme is actually applied. → Either wire `data-page` onto every route or delete the system.
3. **Geist (documented primary font) is not loaded**; 29 fonts are loaded, ~5 used. → Load exactly the 2 families the system needs; delete the rest.
4. **Four independent categorical color systems + five chart libraries** with no shared wrapper. → One `CategoryColors` + one `ChartContainer`, enforced.
5. **Shadows + springs + decorative infinite loops** exist everywhere despite being explicitly banned by the design docs. → Either the docs are wrong or the code is; reconcile and enforce.

### (b) Worth KEEPING in the new system

- **`data-page` accent-selector pattern** (once actually wired) is a clean, low-cost way to give each surface one identity color.
- **`tokens.css` MONOCHROME LAW intent** (hairlines over shadows, white-only accents, bloom ≤8%) — even if the file is unused, the *rule* is the right LAMINAR foundation; keep the rule, fix the enforcement.
- **`prefers-reduced-motion` handling** already present in multiple layers — keep and unify.
- **Lucide-only icons** (591 files, consistent) — good; keep, and drop the unused `simple-icons`/`react-bits` icon deps.
- **`EmptyState`/`LoadingState`/`GlassCard` existence** — the canonical components are real; just dedupe the duplicates down to them.
- **Tailwind v4 `@theme`** is the right place to host tokens; consolidate all token layers there.

### (c) Questions I cannot answer from code alone

1. **Which tokens are *actually rendered* vs. declared?** Static grep shows declarations; only a running build + screenshot pass can confirm what users see (esp. whether the amber `--color-primary` or pink `--accent-primary` wins in practice).
2. **Screenshot evidence per surface** (§3 list) — not captured; needs a built + launched app + probe/Playwright CDP attach. Want me to do a build-and-screenshot pass next?
3. **Is `framer-motion` spring actually used**, or just imported? Grep shows 331 importers; the *call sites* (vs bare imports) need a second pass to quantify the spring ban violation.
4. **Product name decision:** DeskFlow vs RHEO vs App Tracker — which is canonical? (Agent docs say RHEO; code says DeskFlow.) The design doc can't resolve this without your call.
5. **Light mode** (` .light` block in `index.css`, ~280 lines) — is it shipped/used, or dead? Affects how much of the token system must be dual-mode.
