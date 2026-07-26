import { motion, useReducedMotion } from "framer-motion"
import { BarChart3 } from "lucide-react"
import { cn } from "../../lib/cn"
import { ACCENT, MOTION, TEXT } from "../../tokens"
import { CardShell } from "./CardShell"
import type { ChartDataset } from "../parsed"

const PALETTE = [ACCENT.cyan.hex, ACCENT.pink.hex, ACCENT.emerald.hex, ACCENT.amber.hex, ACCENT.violet.hex, ACCENT.red.hex]

function seriesColor(ds: ChartDataset, i: number): string {
	return ds.color || PALETTE[i % PALETTE.length]
}

/**
 * Dependency-free chart (bar / line / pie) rendered as SVG so it needs no
 * Chart.js install. Bars grow via scaleY, the line draws via pathLength, pie
 * slices fade in — all transform/opacity, reduced-motion safe.
 */
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
	const reduce = useReducedMotion()
	const W = 320
	const H = 140
	const pad = 8
	const allValues = datasets.flatMap((d) => d.data)
	const max = Math.max(1, ...allValues)

	return (
		<CardShell accent="amber" icon={<BarChart3 size={14} />} title={title || "Chart"} subtitle={chartType + " chart"}>
			<div className="w-full overflow-hidden">
				<svg viewBox={"0 0 " + W + " " + H} className="w-full" role="img" aria-label={title || "chart"}>
					{chartType === "bar"
						? labels.map((lab, i) => {
								const ds = datasets[0]
								const v = ds?.data[i] ?? 0
								const bw = (W - pad * 2) / labels.length
								const bh = (v / max) * (H - pad * 2)
								const x = pad + i * bw
								const y = H - pad - bh
								return (
									<motion.rect
										key={lab + i}
										x={x + bw * 0.15}
										y={y}
										width={bw * 0.7}
										height={bh}
										rx={3}
										fill={seriesColor(ds || { label: "", data: [] }, 0)}
										style={ { transformOrigin: y + bh + "px", transformBox: "fill-box" } as const }
										initial={ { scaleY: reduce ? 1 : 0, opacity: reduce ? 1 : 0.4 } }
										animate={ { scaleY: 1, opacity: 1 } }
										transition={ { duration: reduce ? 0 : MOTION.slow, ease: MOTION.ease, delay: reduce ? 0 : i * MOTION.stagger } }
									/>
								)
						  })
						: null}

					{chartType === "line"
						? datasets.map((ds, di) => {
								const step = (W - pad * 2) / Math.max(1, labels.length - 1)
								const pts = ds.data.map((v, i) => {
									const x = pad + i * step
									const y = H - pad - (v / max) * (H - pad * 2)
									return x + "," + y
								})
								return (
									<motion.polyline
										key={ds.label + di}
										fill="none"
										stroke={seriesColor(ds, di)}
										strokeWidth={2}
										strokeLinecap="round"
										strokeLinejoin="round"
										points={pts.join(" ")}
										initial={ { pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 } }
										animate={ { pathLength: 1, opacity: 1 } }
										transition={ { duration: reduce ? 0 : 0.6, ease: MOTION.ease } }
									/>
								)
						  })
						: null}

					{chartType === "pie" ? <PieSlices data={datasets[0]?.data || []} reduce={reduce} /> : null}
				</svg>
			</div>
			<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
				{(chartType === "pie" ? labels : datasets.map((d) => d.label)).map((lab, i) => (
					<span key={lab + i} className={cn("inline-flex items-center gap-1.5 text-[11px]", TEXT.secondary)}>
						<span className="h-2 w-2 rounded-full" style={ { backgroundColor: PALETTE[i % PALETTE.length] } as const } />
						{lab}
					</span>
				))}
			</div>
		</CardShell>
	)
}

function PieSlices({ data, reduce }: { data: number[]; reduce: boolean }) {
	const cx = 160
	const cy = 70
	const r = 56
	const total = data.reduce((s, v) => s + v, 0) || 1
	let angle = -Math.PI / 2
	return (
		<>
			{data.map((v, i) => {
				const slice = (v / total) * Math.PI * 2
				const x1 = cx + r * Math.cos(angle)
				const y1 = cy + r * Math.sin(angle)
				angle += slice
				const x2 = cx + r * Math.cos(angle)
				const y2 = cy + r * Math.sin(angle)
				const large = slice > Math.PI ? 1 : 0
				const d = "M" + cx + " " + cy + " L" + x1 + " " + y1 + " A" + r + " " + r + " 0 " + large + " 1 " + x2 + " " + y2 + " Z"
				return (
					<motion.path
						key={i}
						d={d}
						fill={PALETTE[i % PALETTE.length]}
						initial={ { opacity: reduce ? 1 : 0 } }
						animate={ { opacity: 1 } }
						transition={ { duration: reduce ? 0 : MOTION.normal, ease: MOTION.ease, delay: reduce ? 0 : i * 0.06 } }
					/>
				)
			})}
		</>
	)
}
