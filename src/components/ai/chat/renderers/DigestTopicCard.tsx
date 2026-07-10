import { CardShell } from "./CardShell"
import type { CardAction } from "../parsed"

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
  onAction?: (action: CardAction) => void
}

const TREND_GLYPH = { up: "\u25B2", down: "\u25BC", flat: "\u2015" } as const
const trendCls = (t?: Trend) => (t === "up" ? "dk-up" : t === "down" ? "dk-dn" : "dk-flat")
const authDot = (a?: string) => (a === "high" ? "dk-ok" : a === "medium" ? "dk-med" : "dk-off")

const TAG_CLS: Record<string, string> = {
  breaking: "dk-tag-breaking",
  analysis: "dk-tag-analysis",
  trending: "dk-tag-trending",
  update: "dk-tag-update",
  milestone: "dk-tag-milestone",
}
const tagClass = (t: string) => TAG_CLS[t.toLowerCase()] ?? "dk-tag-update"

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
    <CardShell title={headline ?? topic} badge="digest_topic" icon={"\uD83D\uDCF0"}>
      {/* badge row: date + confidence + tags */}
      <div className="dk-news-meta dk-news-meta--chat">
        {dateLabel && <span className="dk-datebadge dk-date-today">{dateLabel}</span>}
        {conf !== null && <span className="dk-conf-num">{conf}% conf</span>}
        {tags?.slice(0, 3).map((t) => <span key={t} className={`dk-tag ${tagClass(t)}`}>{t}</span>)}
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
            onClick={() => onAction?.({ kind: "open-url", url: primary.url })}
          >
            {primary.name} {"\u2197"}
          </button>
        </div>
      )}
    </CardShell>
  )
}

export default DigestTopicCard
