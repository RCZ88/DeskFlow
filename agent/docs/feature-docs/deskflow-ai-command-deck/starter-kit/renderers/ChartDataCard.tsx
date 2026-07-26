import { CardShell } from "../CardShell"
import type { ChartPoint } from "../deck-types"

/**
 * Dependency-free bar chart. NOTE: bars use pixel heights computed from the
 * max value against a fixed track height — this avoids the classic
 * “percentage-height bar collapses to 0” bug when the flex column has no
 * explicit height.
 */
export function ChartDataCard(props: { title?: string; points: ChartPoint[]; unit?: string }) {
  const { title = "Chart", points } = props
  const TRACK = 132 // px, matches .dk-chart height minus label room
  const max = Math.max(1, ...points.map((p) => p.value))
  return (
    <CardShell title={title} badge="chart_data" icon="▰">
      <div className="dk-chart">
        {points.map((p, i) => {
          const h = Math.max(6, Math.round((p.value / max) * TRACK))
          return (
            <div className="dk-bar" key={i}>
              <div className="dk-fill" style={ { height: h } } title={`${p.label}: ${p.value}`} />
              <div className="dk-bar-dl">{p.label}</div>
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}
