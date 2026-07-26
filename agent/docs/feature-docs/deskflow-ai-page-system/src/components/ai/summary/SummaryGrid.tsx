import { Activity, Clock, Flame, Target } from "lucide-react"
import { motion } from "framer-motion"
import { MetricCard } from "../MetricCard"
import { StateShell } from "../StateShell"
import { Skeleton } from "../primitives/Skeleton"
import { useMotionProps } from "../lib/motion"
import type { DataState } from "../types"

export interface SummaryStats {
	goalsCompleted: number
	focusSeconds: number
	streakDays: number
	activeGoals: number
}

export interface SummaryGridProps {
	state: DataState
	stats: SummaryStats
	periodLabel?: string
	refreshing?: boolean
	stale?: boolean
	onRefresh?: () => void
	errorMessage?: string
	onRetry?: () => void
}

function fmtDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600)
	const m = Math.round((seconds % 3600) / 60)
	return h > 0 ? h + "h " + m + "m" : m + "m"
}

/**
 * At-a-glance stats strip for the context rail. Four MetricCards on one
 * responsive row; only the primary (goals completed) uses the section accent.
 */
export function SummaryGrid({
	state,
	stats,
	periodLabel = "this week",
	refreshing,
	stale,
	onRefresh,
	errorMessage,
	onRetry,
}: SummaryGridProps) {
	const m = useMotionProps()
	return (
		<StateShell
			state={state}
			errorMessage={errorMessage}
			onRetry={onRetry}
			loading={
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-28" />
					))}
				</div>
			}
			empty={
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<MetricCard accent="pink" icon={<Target size={15} />} label="Goals done" value={0} footer={periodLabel} />
					<MetricCard accent="emerald" icon={<Clock size={15} />} label="Focus time" value={0} format={fmtDuration} footer={periodLabel} />
					<MetricCard accent="amber" icon={<Flame size={15} />} label="Streak" value={0} format={(n) => n + "d"} footer="keep going" />
					<MetricCard accent="violet" icon={<Activity size={15} />} label="Active goals" value={0} footer="in flight" />
				</div>
			}
		>
			<motion.div
				variants={m.parent}
				initial="hidden"
				animate="show"
				className="grid grid-cols-2 gap-3 lg:grid-cols-4"
			>
				<motion.div variants={m.item}>
					<MetricCard
						accent="pink"
						icon={<Target size={15} />}
						label="Goals done"
						value={stats.goalsCompleted}
						footer={periodLabel}
						refreshing={refreshing}
						stale={stale}
						onRefresh={onRefresh}
					/>
				</motion.div>
				<motion.div variants={m.item}>
					<MetricCard accent="emerald" icon={<Clock size={15} />} label="Focus time" value={stats.focusSeconds} format={fmtDuration} footer={periodLabel} />
				</motion.div>
				<motion.div variants={m.item}>
					<MetricCard accent="amber" icon={<Flame size={15} />} label="Streak" value={stats.streakDays} format={(n) => n + "d"} footer="keep going" />
				</motion.div>
				<motion.div variants={m.item}>
					<MetricCard accent="violet" icon={<Activity size={15} />} label="Active goals" value={stats.activeGoals} footer="in flight" />
				</motion.div>
			</motion.div>
		</StateShell>
	)
}
