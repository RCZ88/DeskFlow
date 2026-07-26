# Doc 8 — Dashboard Redesign Spec (NEW in v2)

> **Scope.** The front-end dashboard redesign you asked for: what to keep, cut, and add; the "one thing that's always changing"; the AI daily fun-fact; and a concrete card layout with data bindings to endpoints that already exist. Ties into Doc 4 (Rewind/Insight engine).

## A. Current state (what's on the Dashboard today)

From your walkthrough + `DashboardPage.tsx` (3,280 lines, 43 `useState`, 34 `useEffect`, **7 `setInterval`s**):

- Stopwatch
- Pinned external activity (quick access)
- Focus sessions + "Top focus sessions" (this week / today / all-time)
- Productivity card -> opens the heat map
- App ecosystem card -> opens the solar system (`OrbitSystem`)
- Recent sessions

Data comes from `getDashboardAggregates` (good — a real aggregate endpoint) plus many individual calls (`getProductivitySessions`, `getExternalSessions`, `getDayDetail`, `getLogs`, `getCurrentForeground`...).

## B. Diagnosis (objective)

| Problem | Evidence | Why it hurts |
| --- | --- | --- |
| **It's a launcher, not a story** | Every card is a door to another page (heat map, solar system, sessions) | Nothing is *answered* on the dashboard itself; the user must click to learn anything |
| **Static between sessions** | No time-varying element except the live stopwatch | You said you want "something constantly changing" — there's nothing to come back for |
| **Redundant with Activity/Insights** | Focus/productivity/app cards echo pages that now live under Activity | The dashboard repeats data instead of *summarizing* it |
| **Nothing from the new modules** | No Finance, no Learn, no Subscriptions on the dashboard (`grep` finds none) | Two of your biggest new investments are invisible from the home screen |
| **Perf cost** | 7 intervals incl. a 1s tick + 5s refetch (Doc 3) | The home screen is the worst place for a polling storm |

**The core principle for the redesign:** *A dashboard should answer "what should I know and do right now?" in one glance — it summarizes and surfaces, it does not duplicate.* Drill-downs are a click away; the dashboard's job is the one-glance narrative + the single next action.

## C. The redesign — three bands

### Band 1 (hero): "Today, so far" + the one changing thing

A single wide hero that is *always different*:
- **Left:** the live stopwatch / current focus session (keep — it's your one genuinely live element).
- **Center:** **the AI daily fun-fact / insight** — the "one thing that's always changing." One sentence, generated once per day from `daily_rollup` (Doc 4), rotating through a template library so it's fresh without an LLM on every load. Examples:
  - "You're on a **6-day** focus streak — your longest this month."
  - "Mornings are your deep-work window: **72%** of focus time lands before noon."
  - "You spent **2.3×** more time in VS Code than in the browser today — unusually heads-down."
  - "**3 lessons** are due for review today (Learn)."
  - "**Netflix renews in 2 days** — $15.99 (Subscriptions)."
- **Right:** the day's headline metric ring (focus time vs goal), from `getDashboardAggregates`.

> This band is the answer to "make something poppy and constantly changing." See Doc 4 for the template-vs-LLM engine (deterministic phrasing, LLM only for the optional flourish).

### Band 2: the cross-module summary strip (the new value)

Four compact **summary** cards — each shows the *number + tiny sparkline + one-line takeaway*, and clicks through to its page. Crucially these **summarize**, they don't re-render the full charts:

| Card | Data (existing endpoint) | One-glance content |
| --- | --- | --- |
| **Activity** | `getDashboardAggregates` | Focus time today + productive/neutral/distracting split bar |
| **Finance** | `finance:*` summary (add `finance:get-dashboard-summary`) | Net worth (masked if locked) + this-month spend delta + "N renewals in 7d" |
| **Learn** | `learn` repo (add `learn:due-count`) | "N due for review" + mastery ring + current streak |
| **External** | `getExternalSessions` | Sleep last night + external/screen ratio (you already built the ratio) |

If Finance is locked, show the card in a masked state ("••• — unlock to view") — never the raw number (Doc 6).

### Band 3: Rewind + recent context

- **Rewind entry** (Doc 4): a slim "Your week in review" band that expands into the Spotify-Wrapped-style modal. Monthly/7-day recap, shareable card. This is the "poppy, surprising" feature — it lives here as the hero's deeper cousin.
- **Recent sessions** (keep, condensed) + **pinned external activity** (keep — genuinely useful quick access).
- **Cut / demote:** the full heat map and the solar system stay as *drill-downs* (click the Activity/App card), not as always-rendered dashboard widgets. They're expensive (`OrbitSystem` is 4,203 lines of 3D) and they're the "too many charts" you flagged.

## D. What to add vs cut (explicit)

**Add**
- AI daily fun-fact (hero) — the always-changing element.
- Cross-module summary strip (Finance / Learn / External / Activity) — makes new modules visible + gives reasons to return.
- Rewind "week in review" entry (Doc 4).
- Goal-vs-actual focus ring for today.

**Cut / demote to drill-down**
- Always-rendered heat map -> click-through from Activity card.
- Always-rendered solar system (`OrbitSystem`) -> click-through from App card.
- Duplicate "top focus sessions (week/today/all-time)" triple -> one card with a period toggle (don't render three).

**Keep**
- Stopwatch / live session.
- Pinned external activity.
- Recent sessions (condensed).

## E. Engineering notes (do it without a rewrite)

1. **Fix the perf first (Doc 3).** Replace the 7 intervals with: one 1s tick *only* for the running stopwatch, and event-driven push (`onTrackingUpdate`) for everything else. The dashboard is the worst place to poll.
2. **One aggregate call.** Extend `getDashboardAggregates` (or add `getHomeSummary`) to return the whole summary strip in a single IPC round-trip, computed from `daily_rollup` (Doc 4) — so the home screen never recomputes from raw logs.
3. **Card contract.** Make each summary card a dumb presentational component `SummaryCard({ title, value, spark, takeaway, onClick, masked? })`. This is also the fix for the 43-useState god-component: the dashboard becomes a layout of cards fed by one hook `useHomeSummary()`.
4. **Fun-fact source.** Reuse the Insight Engine from Doc 4 (`insights:daily-fun-fact`) — don't build a second one. Deterministic template selection seeded by the date so it's stable within a day.
5. **Masked finance.** Respect `financeIsLocked` / `NumberMaskContext` (you already have `maskNumber`) on the Finance card.

## F. This doc's mini-backlog

1. `[P1]` Kill the dashboard polling storm; single stopwatch tick + push updates (Doc 3).
2. `[P1]` `getHomeSummary` aggregate from `daily_rollup`; one round-trip.
3. `[P1]` Hero band: stopwatch + daily fun-fact + goal ring.
4. `[P1]` Cross-module summary strip (Activity/Finance/Learn/External).
5. `[P2]` Rewind "week in review" entry (Doc 4).
6. `[P2]` Demote heat map + solar system to drill-downs; collapse the 3 focus-session cards into one with a period toggle.
7. `[P2]` Refactor DashboardPage into `SummaryCard`s + `useHomeSummary()`.
