# Doc 4 — DeskFlow Rewind + Insight Engine: Concrete Implementation

> **Scope.** The real, code-level plan for the Spotify-Wrapped feature against *your actual repo* — which files change, the data model, the IPC, and how it ships **without a new page** (it lives inside Insights). Builds on the earlier packet's architecture verdict (deterministic engine decides the numbers; local LLM only phrases).

## 0. The no-new-page decision

You have ~16 routes already. **Rewind is not a route — it's two surfaces on pages you already have:**
- **Daily fun-fact** -> a hero band on `DashboardPage.tsx`.
- **Rewind story player** -> a full-screen **modal/overlay** launched from a card inside `InsightsPage.tsx` (which becomes the "story/meaning" home per Doc 1's IA). A modal has no route, no sidebar entry, no new page.

Both read from **one engine** that lives in a new main-process domain folder `electron/domains/insights/` (the first extraction from the `main.ts` god-object, per Doc 1 A1).

## 1. Where the engine lives (backend)

```
electron/domains/insights/
  rollups.ts       # reads daily_rollup (Doc 3 P3) -> period metrics
  detectors.ts     # zscore, percentile, delta, streak, anomaly  (pure fns)
  generators/      # one file per insight type (superlative, record, nightOwl...)
  score.ts         # composite score + diversity selection
  phrase.ts        # template copy now; local-LLM later (optional)
  engine.ts        # orchestrates: rollups -> generators -> score -> select
  handlers.ts      # defineHandler('insights:daily-fun-fact', ...) etc.
```

**Why main-process, not renderer:** the data is in SQLite (main side), it must run without a window open (daily job), and keeping it pure/testable is easier away from React. The renderer only receives finished `InsightAtom[]`.

## 2. Data model additions (SQLite, in `main.ts` migrations block ~line 1807)

You already `db.exec` migrations there with `ALTER TABLE ... ADD COLUMN` guards. Add three tables the same way:

```sql
CREATE TABLE IF NOT EXISTS daily_rollup (
  date TEXT NOT NULL, domain TEXT NOT NULL, metric TEXT NOT NULL,
  value REAL NOT NULL, PRIMARY KEY (date, domain, metric)
);
CREATE INDEX IF NOT EXISTS idx_rollup_date ON daily_rollup(date);

CREATE TABLE IF NOT EXISTS insight_log (
  id TEXT PRIMARY KEY, atom_id TEXT, shown_at TEXT, period TEXT,
  dismissed INTEGER DEFAULT 0, shared INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rewind_cache (
  period_key TEXT PRIMARY KEY, json TEXT NOT NULL, built_at TEXT
);
```

`daily_rollup` is the shared perf substrate (Doc 3 P3). `insight_log` powers the novelty penalty + later weight-tuning. `rewind_cache` freezes a finished month so it never recomputes or changes.

## 3. The core type (shared renderer+main, put in `src/shared/insights.ts`)

```ts
export interface InsightAtom {
  id: string;                       // "top_app.month.2026-06"
  kind: 'superlative'|'record'|'delta'|'streak'|'ratio'|'anomaly'|'milestone'|'pattern';
  scope: { period: 'day'|'week'|'month'|'year'; start: string; end: string };
  domain: 'apps'|'browser'|'productivity'|'sleep'|'git'|'ai'|'external'|'focus';
  value: number | string;           // LOCKED fact
  unit?: 'min'|'hr'|'count'|'pct'|'commits'|'tokens'|'usd'|'days';
  comparison?: { baseline: number; deltaPct: number; direction: 'up'|'down'|'flat' };
  entities?: { label: string; value: number; color?: string }[];
  surprise: number; relevance: number; confidence: number; novelty: number; // 0..1
  visual: 'bigNumber'|'bar'|'race'|'sparkline'|'radial24'|'donut'|'beeswarm'|'calRing';
  copy?: { headline: string; subtext: string; source: 'template'|'llm' };
  shareable: boolean;
}
```

Everything downstream renders from this struct. **The number is on the struct, not in model text** — that's what makes the LLM unable to lie.

## 4. Detectors (the "what makes it interesting" math) — `detectors.ts`

Pure functions over a metric's history array:
```ts
export const zScore = (x: number, hist: number[]) => {
  const m = mean(hist), s = std(hist);
  return s === 0 ? 0 : (x - m) / s;              // |z|>=2 -> surprising
};
export const percentile = (x: number, hist: number[]) => /* rank/len */;
export const deltaPct = (cur: number, prev: number) =>
  prev === 0 ? (cur ? 1 : 0) : (cur - prev) / prev;
export const streak = (daysActive: boolean[]) => /* current & longest run */;
```
`surprise = clamp(|z|/3, 0, 1)`. This is the deterministic core — unit-testable, no AI.

## 5. Generators map to YOUR real data

Each generator reads columns you already collect and emits atoms:

| Generator | Source (existing) | Card |
| --- | --- | --- |
| `topApp` | `logs`/`app_stats` | Top App |
| `focusRecord` | `productivity_sessions` | Deep-Work record/streak |
| `nightOwl` | hourly dist from `logs` | Night Owl (radial24) |
| `commitSpike` | `commits` table | Code Marathon |
| `polyglot` | project languages | Polyglot donut |
| `aiSpend` | `ai_usage` (tokens/cost) | AI Sidekick |
| `contextSwitch` | app-switch count | Most Chaotic Day |
| `sleepVsFocus` | `external`/sleep + focus | Sleep->Focus (opt-in) |
| `consistency` | `getConsistencyScore` | Consistency Crown |

Adding an insight = one generator + one template + one visual hint. That's your "library."

## 6. Scoring & selection — `score.ts`

```ts
const score = a =>
  0.45*a.surprise + 0.25*a.relevance + 0.20*a.confidence + 0.10*a.novelty;
// relevance = how much this user uses that domain (from insight_log + page use)
// selection: sort by score, then greedy pick with max 1-2 per domain (diversity)
```
`relevance` is what makes each person's Rewind different automatically — a heavy git user gets git cards; someone who never logs sleep never sees sleep cards.

## 7. IPC (via the new registry, Doc 1 A1)

```ts
defineHandler('insights:daily-fun-fact', () => engine.dailyFunFact());      // 1 atom
defineHandler('insights:strip',         (a) => engine.strip(a.period));    // 3-4 atoms
defineHandler('insights:rewind',        (a) => engine.rewind(a.period));   // ordered cards (cache)
defineHandler('insights:log-event',     (a) => engine.logEvent(a));        // dwell/share
```
Expose in `preload.ts` as named methods (matching your existing curated-bridge pattern — do **not** add a generic passthrough):
```ts
getDailyFunFact: () => ipcRenderer.invoke('insights:daily-fun-fact'),
getRewind: (period: string) => ipcRenderer.invoke('insights:rewind', { period }),
```

## 8. Frontend — exact files to touch

**New shared components** (`src/components/insights/`): `InsightCard.tsx` (renders any `visual`), `FunFactHero.tsx`, `RewindPlayer.tsx` (full-screen modal, keyboard/tap advance, one card per screen), `ShareCard.tsx` (export to PNG via `html-to-image`).

1. **`DashboardPage.tsx`** -> add `<FunFactHero>` at the top (demotes the OrbitSystem hero per Doc 3 P4). One `getDailyFunFact()` call, cached for the day.
2. **`InsightsPage.tsx`** -> add an `<InsightStrip>` (3-4 `InsightCard`s) at the top of the existing TabBar, and a "Your June Rewind is ready ->" launcher button that opens `<RewindPlayer>` as a modal. **No new route.**
3. **`ActivityPage.tsx`** (from Doc 1) can also host a compact strip later — optional.

## 9. Visual/design (poppy + shareable, cheap)

- One stat per screen, oversized type, per-`kind` gradient background, your existing app color palette as accents.
- Motion = CSS/Canvas count-ups + reveal wipes (no 3D). Keep it renderer-cheap; this is explicitly *not* another OrbitSystem.
- Share = render the card node to PNG, one-tap Save/Copy, tasteful watermark (free marketing loop).
- Privacy line: local-first — nothing leaves the device unless the user exports. State it in the UI.

## 10. Cadence & phasing (maps to the master backlog)

- **P0 — spine:** `daily_rollup` + rollup job + detectors + `InsightAtom` + `getDailyFunFact` with **template copy only**. Add `FunFactHero` to Dashboard. Ships a real daily fun-fact, zero LLM.
- **P1 — library + Insights strip:** 20-30 generators, scorer, diversity select, `InsightCard`, strip on Insights, `insight_log` wiring.
- **P2 — Rewind + share + LLM:** `RewindPlayer` modal, archetype personas, monthly/weekly, `rewind_cache`, PNG share, then the local-LLM phrasing layer (template fallback stays).

**Principle running through all of it.** *Build the engine once; render it many ways.* The fun-fact, the Insights strip, and Rewind are three views of the same `InsightAtom` stream — don't implement "Wrapped" as a separate silo.
