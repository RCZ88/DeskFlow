import { type ReactNode } from "react"
import { BarChart3, Timer, Clock, Flame, Crosshair, Zap, TrendingUp, TrendingDown } from "lucide-react"
import { CardShell } from "./CardShell"
import type { StatMetric } from "../parsed"

const TINT: Record<string, { bg: string; fg: string }> = {
  pink:    { bg: "rgba(236,72,153,.14)", fg: "#f9a8d4" },
  emerald: { bg: "rgba(52,211,153,.14)", fg: "#6ee7b7" },
  amber:   { bg: "rgba(251,191,36,.14)", fg: "#fcd34d" },
  violet:  { bg: "rgba(167,139,250,.15)", fg: "#c4b5fd" },
  cyan:    { bg: "rgba(34,211,238,.13)", fg: "#67e8f9" },
  red:     { bg: "rgba(248,113,113,.14)", fg: "#fca5a5" },
}

export function StatsSummaryCard({ metrics, period }: { metrics: StatMetric[]; period?: string }) {
  return (
    <CardShell title="Summary" badge="stats_summary" accent="cyan" icon={<BarChart3 size={14} />} subtitle={period}>
      <div className="dk-mgrid">
        {metrics.map((m, i) => {
          const tint = TINT[m.icon ?? "pink"] ?? TINT.pink
          return (
            <div className="dk-metric" key={m.label + i}>
              <div className="dk-metric-top">
                <span className="dk-metric-lab">
                  {m.icon ? <span className="dk-metric-mi" style={{ background: tint.bg, color: tint.fg }}>{tintIcon(m.icon)}</span> : null}
                  {m.label}
                </span>
                {typeof m.change === "number" ? (
                  <span className={"dk-trend dk-" + (m.change >= 0 ? "up" : "dn")}>
                    {(m.change >= 0 ? "▲" : "▼")} {Math.abs(m.change)}{typeof m.change === "number" ? "%" : ""}
                  </span>
                ) : null}
              </div>
              <div className="dk-metric-val">{formatVal(m)}</div>
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}

function tintIcon(icon: string): ReactNode {
  const map: Record<string, ReactNode> = {
    Activity: <Timer size={14} />, Clock: <Clock size={14} />, Flame: <Flame size={14} />,
    Target: <Crosshair size={14} />, Zap: <Zap size={14} />, BarChart3: <BarChart3 size={14} />,
    TrendingUp: <TrendingUp size={14} />, TrendingDown: <TrendingDown size={14} />,
  }
  return map[icon] ?? icon
}

function formatVal(m: StatMetric): string {
  if (typeof m.value === "string") return m.value
  if (typeof m.value === "number") {
    if (m.format === "duration") {
      const h = Math.floor(m.value / 3600)
      const min = Math.floor((m.value % 3600) / 60)
      return h + "h " + min + "m"
    }
    if (m.format === "percent") return Math.round(m.value) + "%"
    return String(m.value)
  }
  return String(m.value ?? "")
}
