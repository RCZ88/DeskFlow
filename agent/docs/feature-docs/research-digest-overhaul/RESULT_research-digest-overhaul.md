# RESULT — Research Digest Overhaul (Data-Driven, News-Style)

**Session:** Research Digest Overhaul — Data-Driven News-Style Presentation
**Role:** Lead Designer & Engineer
**Scope:** `DailyDigestBoard.tsx` (full rewrite), `DigestTopicCard.tsx` (full rewrite), CSS additions, subpage decision, backward-compat. No new deps. Existing IPC/data flow, `StateShell`, `GlassCard`, `SectionHead` preserved.

---

## Assumptions (from CONTEXT_BUNDLE)

- `TopicDigestItem` already has: `topic, headline?, summary, date?, confidence?, source?{name,url,authority}, stats?{label,value,change?,trend?}, tags?[], mentions?, sources?[]`.
- `StateShell` renders one of `loading | empty | error | ready` from a `state: DataState` prop, with slots for each. I pass explicit slots; adapt prop names to your signature if they differ (only the JSX wiring changes, not the cards).
- `GlassCard` = cyan glass shell; `SectionHead` = hero header with title/icon/right actions.
- All new fields are **optional** → every render path guards for `undefined` (see §5).

---

## 1. `DailyDigestBoard.tsx` — full rewrite

```tsx
import { useMemo, useState } from "react"
import { GlassCard } from "../GlassCard"
import { SectionHead } from "../SectionHead"
import { StateShell, type DataState } from "../StateShell"
import type { TopicDigestItem } from "../types"

/* ------------------------------------------------------------------ *
 * helpers (pure, testable, all guard for missing fields)
 * ------------------------------------------------------------------ */

type Recency = { label: string; cls: string }
function recency(date?: string): Recency | null {
  if (!date) return null
  const raw = date.trim().toLowerCase()
  if (raw === "recent" || raw === "today") return { label: "Today", cls: "dk-date-today" }
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return { label: date, cls: "dk-date-old" }
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return { label: "Today", cls: "dk-date-today" }
  if (days <= 7) return { label: `${days}d ago`, cls: "dk-date-week" }
  return { label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), cls: "dk-date-old" }
}

const TAG_CLS: Record<string, string> = {
  breaking: "dk-tag-breaking",
  analysis: "dk-tag-analysis",
  trending: "dk-tag-trending",
  update: "dk-tag-update",
  milestone: "dk-tag-milestone",
}
const tagClass = (t: string) => TAG_CLS[t.toLowerCase()] ?? "dk-tag-update"

function confMeta(c?: number) {
  if (typeof c !== "number") return null
  const pct = Math.round(Math.max(0, Math.min(1, c)) * 100)
  const cls = pct >= 75 ? "dk-conf-hi" : pct >= 40 ? "dk-conf-md" : "dk-conf-lo"
  return { pct, cls }
}

const authDot = (a?: string) =>
  a === "high" ? "dk-ok" : a === "medium" ? "dk-med" : "dk-off"

const TREND_GLYPH = { up: "▲", down: "▼", flat: "―" } as const
const trendCls = (t?: "up" | "down" | "flat") =>
  t === "up" ? "dk-up" : t === "down" ? "dk-dn" : "dk-flat"

/* ------------------------------------------------------------------ *
 * NewsCard — the at-a-glance, data-forward card
 * ------------------------------------------------------------------ */

function NewsCard({ item }: { item: TopicDigestItem }) {
  const [showAllSources, setShowAllSources] = useState(false)
  const rec = recency(item.date)
  const conf = confMeta(item.confidence)
  const headline = item.headline ?? item.topic
  const primary = item.source ?? (item.sources?.[0]
    ? { name: item.sources[0].title, url: item.sources[0].url, authority: "low" as const }
    : undefined)
  const extraSources = (item.sources ?? []).filter((s) => s.url !== primary?.url)

  return (
    <article className="dk-card dk-acc dk-cyan dk-news">
      {/* metadata bar */}
      <div className="dk-news-meta">
        {rec && <span className={`dk-datebadge ${rec.cls}`}>{rec.label}</span>}
        {item.tags?.map((t) => (
          <span key={t} className={`dk-tag ${tagClass(t)}`}>{t}</span>
        ))}
        {conf && (
          <span className="dk-conf" title={`Confidence ${conf.pct}%`}>
            <span className="dk-conf-track">
              <span className={`dk-conf-fill ${conf.cls}`} style={ { width: `${conf.pct}%` } } />
            </span>
            <span className="dk-conf-num">{conf.pct}%</span>
          </span>
        )}
        {typeof item.mentions === "number" && (
          <span className="dk-news-mentions">{item.mentions.toLocaleString()} mentions</span>
        )}
      </div>

      {/* topic eyebrow + headline */}
      <div className="dk-news-eyebrow">{item.topic}</div>
      <h3 className="dk-news-headline">{headline}</h3>

      {/* stats block — the largest text after the headline */}
      {item.stats && (
        <div className="dk-news-stat">
          <div className="dk-news-stat-val">
            {typeof item.stats.value === "number" ? item.stats.value.toLocaleString() : item.stats.value}
            {item.stats.trend && (
              <span className={`dk-trend ${trendCls(item.stats.trend)}`}>
                {TREND_GLYPH[item.stats.trend]}
                {typeof item.stats.change === "number" ? ` ${Math.abs(item.stats.change)}%` : ""}
              </span>
            )}
          </div>
          <div className="dk-news-stat-lab">{item.stats.label}</div>
        </div>
      )}

      {/* summary — always visible, no collapse */}
      <p className="dk-news-summary">{item.summary}</p>

      {/* source attribution */}
      {primary && (
        <div className="dk-news-source">
          <span className={`dk-sdot ${authDot(item.source?.authority)}`} />
          <a className="dk-news-src-link" href={primary.url} target="_blank" rel="noreferrer">
            {primary.name}
          </a>
          {item.source?.authority && (
            <span className="dk-news-auth">{item.source.authority} authority</span>
          )}
          {extraSources.length > 0 && (
            <button className="dk-btn dk-ghost dk-mini dk-news-more" onClick={() => setShowAllSources((v) => !v)}>
              {showAllSources ? "Hide" : `+${extraSources.length} sources`}
            </button>
          )}
        </div>
      )}

      {/* progressive disclosure: only the extra source LIST collapses */}
      {showAllSources && extraSources.length > 0 && (
        <ul className="dk-news-srclist">
          {extraSources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

/* ------------------------------------------------------------------ *
 * skeleton shaped like a NewsCard (loading state)
 * ------------------------------------------------------------------ */

function NewsSkeleton() {
  return (
    <div className="dk-card dk-acc dk-cyan dk-news dk-news-skel" aria-hidden>
      <div className="dk-news-meta">
        <span className="dk-sk dk-sk-badge" /><span className="dk-sk dk-sk-tag" /><span className="dk-sk dk-sk-conf" />
      </div>
      <div className="dk-sk dk-sk-eyebrow" />
      <div className="dk-sk dk-sk-head" />
      <div className="dk-sk dk-sk-stat" />
      <div className="dk-sk dk-sk-line" /><div className="dk-sk dk-sk-line" /><div className="dk-sk dk-sk-line short" />
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * DailyDigestBoard
 * ------------------------------------------------------------------ */

export interface DailyDigestBoardProps {
  state: DataState
  topics: TopicDigestItem[]
  generating?: boolean
  provider?: string
  readyToGenerate?: boolean
  onRefresh: () => void
  onConfigure: () => void
  onGenerate: () => void
  errorMessage?: string
}

export function DailyDigestBoard(props: DailyDigestBoardProps) {
  const {
    state, topics, generating, provider,
    readyToGenerate, onRefresh, onConfigure, onGenerate, errorMessage,
  } = props

  const freshness = useMemo(() => {
    const today = topics.some((t) => {
      const r = recency(t.date)
      return r?.label === "Today"
    })
    return today ? "Updated today" : topics.length ? "Cached" : "—"
  }, [topics])

  return (
    <GlassCard accent="cyan" className="dk-digest">
      <SectionHead
        hero
        icon="📰"
        title="Research Digest"
        subtitle={provider ? `${provider} · ${freshness}` : freshness}
        actions={[
          { label: generating ? "Generating…" : "Refresh", onClick: onRefresh, disabled: generating },
        ]}
      />

      <div className="dk-digest-body">
        <StateShell
          state={state}
          errorMessage={errorMessage}
          onRetry={onRefresh}
          loading={
            <div className="dk-news-grid">
              <NewsSkeleton /><NewsSkeleton /><NewsSkeleton />
            </div>
          }
          empty={
            readyToGenerate ? (
              <div className="dk-empty">
                <div className="dk-empty-ic">✨</div>
                <div className="dk-empty-t">Ready to generate today’s digest</div>
                <div className="dk-empty-s">Pull the latest on your topics with fresh data & sources.</div>
                <button className="dk-btn dk-pri" onClick={onGenerate} disabled={generating}>
                  {generating ? "Generating…" : "Generate digest"}
                </button>
              </div>
            ) : (
              <div className="dk-empty">
                <div className="dk-empty-ic">🧭</div>
                <div className="dk-empty-t">No topics configured</div>
                <div className="dk-empty-s">Add interests and we’ll build a daily, data-driven brief.</div>
                <button className="dk-btn dk-pri" onClick={onConfigure}>Add topics</button>
              </div>
            )
          }
        >
          <div className="dk-news-grid">
            {topics.map((item, i) => (
              <NewsCard key={`${item.topic}-${i}`} item={item} />
            ))}
          </div>
        </StateShell>
      </div>
    </GlassCard>
  )
}

export default DailyDigestBoard
```

---

## 2. `DigestTopicCard.tsx` — full rewrite (chat renderer, compact)

```tsx
import { CardShell } from "./CardShell"

type Trend = "up" | "down" | "flat"
export interface DigestTopicCardProps {
  topic: string
  headline?: string
  summary: string
  date?: string
  confidence?: number
  source?: { name: string; url: string; authority?: "high" | "medium" | "low" }
  stats?: { label: string; value: string | number; change?: number; trend?: Trend }
  tags?: string[]
  sources?: { title: string; url: string }[]
  onAction?: (action: { type: string; payload?: unknown }) => void
}

const TREND_GLYPH = { up: "▲", down: "▼", flat: "―" } as const
const trendCls = (t?: Trend) => (t === "up" ? "dk-up" : t === "down" ? "dk-dn" : "dk-flat")
const authDot = (a?: string) => (a === "high" ? "dk-ok" : a === "medium" ? "dk-med" : "dk-off")

function shortDate(date?: string) {
  if (!date) return null
  const raw = date.trim().toLowerCase()
  if (raw === "recent" || raw === "today") return "Today"
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return "Today"
  if (days <= 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function DigestTopicCard(props: DigestTopicCardProps) {
  const { topic, headline, summary, date, confidence, source, stats, tags, sources, onAction } = props
  const dateLabel = shortDate(date)
  const conf = typeof confidence === "number" ? Math.round(confidence * 100) : null
  const primary = source ?? (sources?.[0] ? { name: sources[0].title, url: sources[0].url } : undefined)

  return (
    <CardShell title={headline ?? topic} badge="digest_topic" icon="📰">
      {/* badge row: date + confidence + tags */}
      <div className="dk-news-meta dk-news-meta--chat">
        {dateLabel && <span className="dk-datebadge dk-date-today">{dateLabel}</span>}
        {conf !== null && <span className="dk-conf-num">{conf}% conf</span>}
        {tags?.slice(0, 3).map((t) => <span key={t} className="dk-tag dk-tag-update">{t}</span>)}
      </div>

      {stats && (
        <div className="dk-news-stat dk-news-stat--chat">
          <span className="dk-news-stat-val">
            {typeof stats.value === "number" ? stats.value.toLocaleString() : stats.value}
            {stats.trend && (
              <span className={`dk-trend ${trendCls(stats.trend)}`}>
                {TREND_GLYPH[stats.trend]}{typeof stats.change === "number" ? ` ${Math.abs(stats.change)}%` : ""}
              </span>
            )}
          </span>
          <span className="dk-news-stat-lab">{stats.label}</span>
        </div>
      )}

      <p className="dk-news-summary">{summary}</p>

      {primary && (
        <div className="dk-news-source">
          <span className={`dk-sdot ${authDot(source?.authority)}`} />
          <button
            className="dk-btn dk-ghost dk-mini"
            onClick={() => onAction?.({ type: "open-url", payload: primary.url })}
          >
            {primary.name} ↗
          </button>
        </div>
      )}
    </CardShell>
  )
}

export default DigestTopicCard
```

---

## 3. CSS additions (append to `deck.css`)

Reuses existing `--` tokens, `dk-trend`, `dk-tag`, `dk-sdot`, `dk-btn`, `dk-conf` families. Adds news-card, meta, stat, source, skeleton, and a new authority color (`dk-med`) + tag colors.

```css
/* ---- news grid + card ---- */
.dk-news-grid{display:flex;flex-direction:column;gap:12px}
.dk-news{padding:16px;position:relative}
.dk-news-eyebrow{font-family:var(--mono);font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:var(--tm);margin-bottom:4px}
.dk-news-headline{font-size:14px;font-weight:700;line-height:1.35;color:var(--tp);margin:0 0 8px}
.dk-news-summary{font-size:13px;line-height:1.55;color:var(--ts);margin:8px 0 0}

/* metadata bar */
.dk-news-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px}
.dk-news-meta--chat{margin-bottom:8px}
.dk-datebadge{font-family:var(--mono);font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:6px;border:1px solid var(--line-2)}
.dk-date-today{color:#6ee7b7;background:rgba(52,211,153,.14);border-color:transparent}
.dk-date-week{color:#fcd34d;background:rgba(251,191,36,.14);border-color:transparent}
.dk-date-old{color:var(--tm)}
.dk-news-mentions{font-family:var(--mono);font-size:10.5px;color:var(--tm)}

/* confidence meter */
.dk-conf{display:inline-flex;align-items:center;gap:6px}
.dk-conf-track{width:56px;height:5px;border-radius:3px;background:rgba(255,255,255,.10);overflow:hidden}
.dk-conf-fill{display:block;height:100%;border-radius:3px}
.dk-conf-hi{background:var(--emerald)} .dk-conf-md{background:var(--amber)} .dk-conf-lo{background:var(--red)}
.dk-conf-num{font-family:var(--mono);font-size:10.5px;color:var(--ts)}

/* stat block — largest text after headline */
.dk-news-stat{margin:10px 0 2px;padding:10px 12px;border:1px solid var(--line);border-radius:11px;background:rgba(255,255,255,.02)}
.dk-news-stat--chat{margin:0 0 8px}
.dk-news-stat-val{font-size:21px;font-weight:700;letter-spacing:-.5px;font-variant-numeric:tabular-nums;color:var(--tp);display:flex;align-items:baseline;gap:8px}
.dk-news-stat-lab{font-size:11px;color:var(--tm);margin-top:3px}
.dk-trend.dk-flat{background:rgba(255,255,255,.08);color:var(--ts)}

/* source attribution */
.dk-news-source{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}
.dk-news-src-link{font-size:12px;font-weight:600;color:var(--cyan);text-decoration:none}
.dk-news-src-link:hover{text-decoration:underline}
.dk-news-auth{font-family:var(--mono);font-size:10px;color:var(--tm);text-transform:uppercase;letter-spacing:.5px}
.dk-news-more{margin-left:auto}
.dk-news-srclist{list-style:none;margin:8px 0 0;padding:8px 0 0;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:6px}
.dk-news-srclist a{font-size:12px;color:var(--ts);text-decoration:none}
.dk-news-srclist a:hover{color:var(--tp)}

/* authority dot: medium (amber) — extends existing dk-sdot ok/off */
.dk-sdot.dk-med{background:var(--amber);box-shadow:0 0 0 3px rgba(251,191,36,.16)}

/* tag colors by category */
.dk-tag-breaking{background:rgba(248,113,113,.15);color:#fca5a5}
.dk-tag-analysis{background:rgba(167,139,250,.16);color:#c4b5fd}
.dk-tag-trending{background:rgba(251,191,36,.15);color:#fcd34d}
.dk-tag-update{background:rgba(34,211,238,.13);color:#67e8f9}
.dk-tag-milestone{background:rgba(52,211,153,.14);color:#6ee7b7}

/* empty states */
.dk-empty{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:34px 18px}
.dk-empty-ic{font-size:26px}
.dk-empty-t{font-size:14px;font-weight:600;color:var(--tp)}
.dk-empty-s{font-size:12.5px;color:var(--ts);max-width:320px;line-height:1.5}
.dk-empty .dk-btn{margin-top:6px}

/* skeleton */
.dk-sk{display:block;border-radius:6px;background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,.09),rgba(255,255,255,.05));background-size:200% 100%;animation:dk-shimmer 1.3s linear infinite}
@keyframes dk-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.dk-sk-badge{width:52px;height:16px} .dk-sk-tag{width:64px;height:16px} .dk-sk-conf{width:70px;height:16px}
.dk-sk-eyebrow{width:90px;height:10px;margin-bottom:6px} .dk-sk-head{width:80%;height:16px;margin-bottom:10px}
.dk-sk-stat{width:100%;height:52px;margin-bottom:10px} .dk-sk-line{width:100%;height:11px;margin-top:7px} .dk-sk-line.short{width:60%}
@media (prefers-reduced-motion:reduce){.dk-sk{animation:none}}
```

---

## 4. Subpage evaluation — **YES (hybrid)**

**Decision:** Keep a **compact 2-card preview** in the deck rail, and add a dedicated **“Digest” sub-tab** for the full news feed.

**Justification:**
- Cards are now feature-rich (headline + stat block + summary + sources). Three+ of them do not fit the rail without heavy scrolling, and they visually out-weigh the chat if left inline.
- A dedicated tab lets the digest breathe as a **2-column news grid** at full width, matching the “terminal/newsletter” reference the user cited.
- A rail **preview** preserves at-a-glance value on the main deck (top 2 by confidence/recency) with a “View all →” that switches tabs.

**Sub-navigation design (in-page tab state, no router change needed):**

```tsx
// AiPage.tsx
type AiTab = "deck" | "digest"
const [tab, setTab] = useState<AiTab>("deck")

<div className="dk-subnav">
  <button className={`dk-subtab${tab==="deck"?" dk-on":""}`}   onClick={() => setTab("deck")}>◈ Command Deck</button>
  <button className={`dk-subtab${tab==="digest"?" dk-on":""}`} onClick={() => setTab("digest")}>📰 Digest
    {unreadDigest ? <span className="dk-subtab-dot" /> : null}
  </button>
</div>

{tab === "deck"
  ? <AiPageDeck digestSlot={<DigestPreview topics={digestTopics} onViewAll={() => setTab("digest")} />} … />
  : <DigestPage topics={digestTopics} state={digestDataState} onRefresh={() => loadDigest(true,true)} … />}
```

```css
.dk-subnav{display:flex;gap:6px;margin-bottom:18px;flex:none}
.dk-subtab{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 14px;border-radius:10px;
  border:1px solid var(--line-2);background:var(--surface);color:var(--ts);font-size:13px;font-weight:600;cursor:pointer}
.dk-subtab.dk-on{color:var(--tp);border-color:transparent;background:rgba(34,211,238,.14)}
.dk-subtab-dot{width:6px;height:6px;border-radius:50%;background:var(--cyan)}
/* digest page uses a 2-col grid on wide screens */
.dk-digestpage .dk-news-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media (max-width:900px){.dk-digestpage .dk-news-grid{grid-template-columns:1fr}}
```

- **`DigestPage`** reuses `DailyDigestBoard` exactly (same props, same IPC) but rendered full-width with the 2-col grid class — zero data-flow change.
- **`DigestPreview`** renders the top 2 `NewsCard`s + a “View all N →” button that calls `onViewAll`.
- No React Router change required; if you prefer real routes, mount at `/ai` and `/ai/digest` — the components are identical.

---

## 5. Backward compatibility

Every new field is optional and guarded, so **old cached `ai_briefs` rows that only have `topic` + `summary` render cleanly**:

| Missing field | Fallback behavior |
|---|---|
| `headline` | `headline ?? topic` → headline shows the topic name |
| `date` | `recency()` returns `null` → no date badge rendered |
| `confidence` | `confMeta()` returns `null` → no confidence meter |
| `stats` | block skipped entirely |
| `source` | falls back to `sources[0]`; if none, source row skipped |
| `sources` | `[]` → no “+N sources”, no expandable list |
| `tags` | `undefined?.map` guarded → no pills |
| `mentions` | `typeof … number` guard → hidden |

Result for a legacy item: a clean card = topic-as-headline + summary paragraph + cyan accent bar. No layout holes, no `undefined` text, no crashes. New items automatically light up the metadata bar, stat block, and source attribution as the data arrives from the already-updated prompts.

**No IPC/DB/prompt changes** — `get-topic-digest`, `ai_briefs`, `ai_interests`, the provider chain, and `cleanDigestJson()` are all untouched; this is purely a renderer + CSS overhaul.
