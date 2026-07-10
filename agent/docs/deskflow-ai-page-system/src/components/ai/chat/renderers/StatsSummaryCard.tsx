import {
	Activity,
	Clock,
	Flame,
	Target,
	TrendingUp,
	TrendingDown,
	Zap,
	BarChart3,
	type LucideIcon,
} from "lucide-react"
import { cn } from "../../lib/cn"
import { TEXT } from "../../tokens"
import { CardShell } from "./CardShell"
import { CountUp } from "../../primitives/CountUp"
import { formatStat, type StatMetric } from "../parsed"

const ICONS: Record<string, LucideIcon> = {
	Activity,
	Clock,
	Flame,
	Target,
	Zap,
	BarChart3,
}

/**
 * Compact 2-col metric grid for AI usage/stat summaries. Numbers count up on
 * mount; a signed change renders a colored trend chip. Neutral zinc surface,
 * cyan header accent only (anti-slop: the number is the hero, not the chrome).
 */
export function StatsSummaryCard({ metrics, period }: { metrics: StatMetric[]; period?: string }) {
	return (
		<CardShell
			accent="cyan"
			icon={<BarChart3 size={14} />}
			title="Summary"
			subtitle={period}
		>
			<div className="grid grid-cols-2 gap-2.5">
				{metrics.map((m, i) => {
					const Icon = (m.icon && ICONS[m.icon]) || Activity
					const up = (m.change ?? 0) >= 0
					const Trend = up ? TrendingUp : TrendingDown
					return (
						<div
							key={m.label + i}
							className="flex flex-col gap-2 rounded-lg bg-zinc-900/40 p-3 ring-1 ring-zinc-800/60"
						>
							<div className="flex items-center justify-between">
								<span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900/60 text-cyan-300 ring-1 ring-zinc-800/60">
									<Icon size={12} />
								</span>
								{typeof m.change === "number" ? (
									<span
										className={cn(
											"inline-flex items-center gap-0.5 text-[10px] font-medium",
										up ? "text-emerald-400" : "text-red-400",
									)}
									>
										<Trend size={11} />
										{Math.abs(m.change)}%
									</span>
								) : null}
							</div>
							<CountUp
								value={m.value}
								format={(n) => formatStat(n, m.format)}
								className={cn("text-xl font-semibold", TEXT.primary)}
							/>
							<p className={cn("text-[11px] uppercase tracking-wide", TEXT.muted)}>{m.label}</p>
						</div>
					)
				})}
			</div>
		</CardShell>
	)
}
