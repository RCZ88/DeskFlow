import { useMemo, useState } from "react"
import { Newspaper, Sparkles, Compass } from "lucide-react"
import { GlassCard } from "../GlassCard"
import { SectionHead } from "../SectionHead"
import { StateShell } from "../StateShell"
import type { DataState, TopicDigestItem } from "../types"

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

const TREND_GLYPH = { up: "\u25B2", down: "\u25BC", flat: "\u2015" } as const
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
  onDismissError?: () => void
  variant?: "card" | "inset"
}

export function DailyDigestBoard(props: DailyDigestBoardProps) {
  const {
    state, topics, generating, provider,
    readyToGenerate, onRefresh, onConfigure, onGenerate, errorMessage, onDismissError,
    variant = "card",
  } = props

  const freshness = useMemo(() => {
    const today = topics.some((t) => {
      const r = recency(t.date)
      return r?.label === "Today"
    })
    return today ? "Updated today" : topics.length ? "Cached" : "\u2014"
  }, [topics])

  const content = (
    <>
      <SectionHead
        hero
        accent="cyan"
        icon={<Newspaper size={18} />}
        title="Research Digest"
        desc={provider ? `${provider} \u00B7 ${freshness}` : freshness}
        right={
          <button
            data-refresh-digest
            className="dk-btn dk-ghost dk-mini"
            onClick={onRefresh}
            disabled={generating}
          >
            {generating ? "Generating\u2026" : "Refresh"}
          </button>
        }
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
                <Sparkles size={24} className="text-cyan-400/60" />
                <h3>Ready to generate today{"'"}s digest</h3>
                <p>Pull the latest on your topics with fresh data {"&"} sources.</p>
                <button className="rounded-lg bg-cyan-500/15 border border-cyan-500/30 px-4 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-500/25 transition-colors" onClick={onGenerate} disabled={generating}>
                  {generating ? "Generating\u2026" : "Generate digest"}
                </button>
              </div>
            ) : (
              <div className="dk-empty">
                <Compass size={24} className="text-zinc-500" />
                <h3>No topics configured</h3>
                <p>Add interests and we{"'"}ll build a daily, data-driven brief.</p>
                <button className="rounded-lg bg-violet-500/15 border border-violet-500/30 px-4 py-2 text-xs font-medium text-violet-300 hover:bg-violet-500/25 transition-colors" onClick={onConfigure}>Add topics</button>
              </div>
            )
          }
        >
          {!generating && errorMessage && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-300 ring-1 ring-red-500/20">
              <span className="flex-1">{errorMessage}</span>
              <button className="rounded bg-red-500/15 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-500/25" onClick={onGenerate}>Retry</button>
              {onDismissError && <button className="text-xs text-red-400 hover:text-red-200" onClick={onDismissError}>Dismiss</button>}
            </div>
          )}
          <div className="dk-news-grid">
            {topics.map((item, i) => (
              <NewsCard key={`${item.topic}-${i}`} item={item} />
            ))}
          </div>
        </StateShell>
      </div>
    </>
  )

  if (variant === "inset") return content

  return <GlassCard accent="cyan" className="dk-digest">{content}</GlassCard>
}

export default DailyDigestBoard
