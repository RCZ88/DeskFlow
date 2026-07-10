# Doc 5 — Product / Customer-Value Review + Ranked Backlog

> **Scope.** Step out of the code and look at DeskFlow as a *product*: is it actually useful, is the displayed data relevant, and — objectively — what would make it meaningfully better? Then the single master execution order across all five docs.

## A. The honest customer-value verdict

**What DeskFlow is, from a user's chair:** a local-first Windows tracker that fuses app usage, browser activity, productivity scoring, IDE/terminal/git activity, AI usage, and finance into one dashboard. That fusion — *dev-tool + git + AI-cost telemetry alongside plain time-tracking* — is genuinely differentiated. RescueTime/ActivityWatch don't know about your commits or AI spend; WakaTime knows code but not your browser or focus. **Your moat is the join across those domains.**

**The core tension (be objective):** the product currently optimizes for *breadth of capture* over *clarity of payoff*. You track an impressive amount, but the user's takeaway per visit is diluted across ~16 pages and dozens of charts. A tracker's value isn't "how much did you record" — it's "what did you realize, and what will you do differently." Right now the app answers the first question far better than the second.

> **The one-line reframe:** DeskFlow should sell *realizations*, not *records*. Every screen should be able to answer "so what?" in one glance. This is exactly why the Rewind/Insight engine (Doc 4) isn't a gimmick — it's the missing "so what" layer.

## B. Data relevancy — what to show, what to cut

**Symptom.** "Too many charts -> redundancy and confusion" (your words). Multiple pages show the same underlying numbers in slightly different cuts (Doc 1 C). A chart earns its place only if it changes a decision.

**The test for every widget:** *If this number doubled, would the user do something different?* If no -> it's trivia, demote or cut it.

**Concrete pruning pass:**
- **Dashboard should show 3-5 things, not everything.** A hero fun-fact (Doc 4), one "today vs your normal" delta, one focus/streak signal, one "where time is going" breakdown. Everything else is one click away in Activity.
- **Kill duplicate breakdowns.** The app-distribution donut, the stats table, and the productivity split are three views of one dataset — pick the best per page (Doc 1 tabs).
- **Prefer comparative over absolute.** "4h 12m coding" is trivia; "4h 12m coding — 32% above your weekday norm" is a realization. Wire the `comparison` field from Doc 4 into normal charts too.
- **Relevance is per-user (Doc 4 scoring).** Someone who never opens a terminal shouldn't see terminal cards. Let the data decide what surfaces.

**Principle.** *Every pixel should reduce uncertainty or drive a decision.* Information isn't value; *changed behavior* is. Dashboards are decision instruments, not data dumps.

## C. Dashboard redesign (objective, concrete)

Today the dashboard leads with `OrbitSystem` (a 4.2k-line 3D scene) — beautiful, but it's decoration in the hero slot and it costs battery (Doc 3 P4). Proposed structure, top to bottom:
1. **Fun-Fact Hero band** (Doc 4) — the "something constantly changing" you asked for; one surprising, true, phrased stat per day.
2. **"Today vs normal" strip** — 3 deltas (focus, distraction, top app) with up/down arrows.
3. **One primary breakdown** — where time went today (bar), with a period toggle.
4. **Active session / streak** — the live, actionable bit.
5. **OrbitSystem demoted** to an optional "Ambient" toggle for people who love it (keep the art, remove the tax).

**Principle.** *Lead with meaning, make delight opt-in.* The most-visited screen should deliver insight in under 2 seconds; eye-candy is a reward, not the entry toll.

## D. Frontend / design-system objective notes

- **Inconsistent data-loading paradigms** (props vs self-fetch) leak into UX as inconsistent loading/skeleton states. Standardize (Doc 1 D, Doc 3 P2) -> uniform skeletons, uniform empty states.
- **No visible design-system primitives surfaced in the scan** (lots of bespoke per-page styling across 3k-line pages). Extract a small set of primitives (`Card`, `StatTile`, `TabBar`, `DeltaBadge`, `EmptyState`) so every page looks coherent and new features are fast to style. Tailwind v4 only, per your setup — no postcss/autoprefixer.
- **Empty/first-run states matter most for a tracker** (day 1 has no data). Design "we're learning your patterns..." states explicitly; don't show empty charts.
- **Accessibility/perf of animation:** honor `prefers-reduced-motion` (also helps battery). Ties to Doc 3 P4.

**Principle.** *A design system is leverage: define primitives once, get consistency and speed for free.* Bespoke styling per 3k-line page is how UIs drift.

## E. "Is it useful?" — objective improvements beyond code

1. **Close the loop from insight -> action.** Tracking that doesn't suggest a next step is a mirror, not a coach. Let an insight offer one action ("set a focus block," "mute this distractor"). *Value = behavior change.*
2. **Make the differentiators legible.** The git+AI+focus join is your edge — build a signature view around it ("Engineering day": commits x focus x AI-assist x cost). No one else can show this.
3. **Trust & privacy as a feature.** Local-first is a selling point — say it loudly in-product; never make it feel surveillant. Frame stats as *for you*, not *about you*.
4. **Reduce cognitive load, not features.** The fix for "too much" is hierarchy and defaults, not deletion. Progressive disclosure: 3 things up front, depth on demand.
5. **Onboarding tells the story in 60 seconds.** A tracker's aha-moment is delayed (needs data). Bridge it: show a sample Rewind on day 1 so users *see the payoff* before their own data arrives.

## F. Master ranked backlog (the one list to execute, across all docs)

> Ordered by leverage x urgency. Each line points to its detail doc. Security first (cheap + protects users), then the perf/arch changes that everything else depends on, then the value features.

| # | Item | Sev | Doc |
| --- | --- | --- | --- |
| 1 | Allowlist URL schemes in `open-url` before `openExternal` | P0 | Doc 2 S1 |
| 2 | Add Content-Security-Policy header | P0 | Doc 2 S2 |
| 3 | Replace 1s/5s polling with event-driven refetch (existing `on*` bridges) | P1 | Doc 3 P1/P2 |
| 4 | Materialize `daily_rollup` (perf substrate + Rewind prerequisite) | P1 | Doc 3 P3 / Doc 4 |
| 5 | Convert interpolated `execSync` -> `execFile(args[])` | P1 | Doc 2 S3 |
| 6 | Lock down local HTTP server (bind localhost, token, schema-validate) | P1 | Doc 2 S4 |
| 7 | Extract `insights/` domain from `main.ts` (proves module pattern) | P1 | Doc 1 A1 |
| 8 | Merge App+Website+Productivity -> one tabbed **Activity** page | P1 | Doc 1 C |
| 9 | Ship Insight-Engine spine + daily Fun-Fact Hero (template copy) | P1 | Doc 4 P0 |
| 10 | Dashboard redesign: meaning-first, demote OrbitSystem to opt-in | P1 | Doc 5 C / Doc 3 P4 |
| 11 | Introduce `TimeRangeContext`/`TrackingDataContext`; kill prop-drilling | P2 | Doc 1 A2 |
| 12 | Insight strip + generator library on Insights page | P2 | Doc 4 P1 |
| 13 | Extract design-system primitives; unify loading/empty states | P2 | Doc 5 D |
| 14 | Purge 29 committed `.bak`/`.backup` files; add gitignore | P2 | Doc 1 B1 |
| 15 | Rewind player modal + PNG share + (optional) local-LLM phrasing | P2 | Doc 4 P2 |
| 16 | Sanitize untrusted strings on render (DOMPurify) | P2 | Doc 2 S5 |
| 17 | Coalesce main-process timers; write-on-change; virtualize tables | P2 | Doc 3 P5/P6 |
| 18 | Build hardening: Electron fuses + ASAR (needs build config) | P3 | Doc 2 S6 |

**How to run this:** Items 1-2 are an afternoon and remove real risk. Items 3-4 unblock everything (perf + Rewind). Items 7-10 are the visible product leap. Do them in order; each doc has the code.

**Principle for sequencing.** *Fix what protects users first, then remove the constraints everything else depends on, then build the value on top.* Never build features on a foundation you're about to change — order by dependency, not by excitement.
