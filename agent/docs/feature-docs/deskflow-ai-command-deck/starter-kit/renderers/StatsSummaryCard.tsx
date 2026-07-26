import { CardShell } from "../CardShell"
import type { StatMetric, AccentKey } from "../deck-types"

const TINT: Record<AccentKey, { bg: string; fg: string }> = {
  pink:    { bg: "rgba(236,72,153,.14)", fg: "#f9a8d4" },
  emerald: { bg: "rgba(52,211,153,.14)", fg: "#6ee7b7" },
  amber:   { bg: "rgba(251,191,36,.14)", fg: "#fcd34d" },
  violet:  { bg: "rgba(167,139,250,.15)", fg: "#c4b5fd" },
  cyan:    { bg: "rgba(34,211,238,.13)", fg: "#67e8f9" },
  red:     { bg: "rgba(248,113,113,.14)", fg: "#fca5a5" },
}

export function StatsSummaryCard(props: { title?: string; metrics: StatMetric[] }) {
  const { title = "Summary", metrics } = props
  return (
    <CardShell title={title} badge="stats_summary" icon="📊">
      <div className="dk-mgrid">
        {metrics.map((m, i) => {
          const tint = TINT[m.accent ?? "pink"]
          return (
            <div className="dk-metric" key={i}>
              <div className="dk-metric-top">
                <span className="dk-metric-lab">
                  {m.icon ? (
                    <span className="dk-metric-mi" style={ { background: tint.bg, color: tint.fg } }>
                      {m.icon}
                    </span>
                  ) : null}
                  {m.label}
                </span>
                {m.trend ? (
                  <span className={`dk-trend dk-${m.trend.dir}`}>
                    {m.trend.dir === "up" ? "▲" : "▼"} {m.trend.text}
                  </span>
                ) : null}
              </div>
              <div className="dk-metric-val">{m.value}</div>
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}
