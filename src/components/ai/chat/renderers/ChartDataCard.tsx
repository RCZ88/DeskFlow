import { CardShell } from "./CardShell"
import type { ChartDataset } from "../parsed"

export function ChartDataCard({
  chartType,
  labels,
  datasets,
  title,
}: {
  chartType: "bar" | "line" | "pie"
  labels: string[]
  datasets: ChartDataset[]
  title?: string
}) {
  const allValues = datasets.flatMap((d) => d.data)
  const max = Math.max(1, ...allValues)
  const TRACK = 132

  if (chartType === "bar") {
    const ds = datasets[0]
    return (
      <CardShell title={title || "Chart"} badge="chart_data" accent="amber" icon="▰">
        <div className="dk-chart">
          {labels.map((lab, i) => {
            const v = ds?.data[i] ?? 0
            const h = Math.max(6, Math.round((v / max) * TRACK))
            return (
              <div className="dk-bar" key={lab + i}>
                <div className="dk-fill" style={{ height: h }} />
                <div className="dk-bar-dl">{lab}</div>
              </div>
            )
          })}
        </div>
      </CardShell>
    )
  }

  if (chartType === "line") {
    const W = 320, H = 140, pad = 8
    const step = (W - pad * 2) / Math.max(1, labels.length - 1)
    const pts = datasets[0]?.data.map((v, i) => {
      const x = pad + i * step
      const y = H - pad - (v / max) * (H - pad * 2)
      return x + "," + y
    }) ?? []
    return (
      <CardShell title={title || "Chart"} badge="chart_data" accent="amber" icon="▰">
        <svg viewBox={"0 0 " + W + " " + H} className="w-full" role="img" aria-label={title || "chart"}>
          <polyline fill="none" stroke="var(--cyan)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={pts.join(" ")} />
        </svg>
      </CardShell>
    )
  }

  return (
    <CardShell title={title || "Chart"} badge="chart_data" accent="amber" icon="▰">
      <div className="text-[12px] text-[var(--tm)]">Pie chart: {labels.join(", ")}</div>
    </CardShell>
  )
}
