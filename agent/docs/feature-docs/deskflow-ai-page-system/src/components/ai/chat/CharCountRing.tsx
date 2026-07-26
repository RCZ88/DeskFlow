import { cn } from "../lib/cn"

export interface CharCountRingProps {
	count: number
	max: number
	size?: number
	className?: string
}

/**
 * Circular character-budget indicator that lives inside the chat input.
 * The ring fills via strokeDashoffset and shifts pink -> amber -> red as the
 * user approaches the limit. Purely informational; announced politely to AT.
 */
export function CharCountRing({ count, max, size = 22, className }: CharCountRingProps) {
	const pct = Math.min(1, count / max)
	const r = (size - 3) / 2
	const circumference = 2 * Math.PI * r
	const offset = circumference * (1 - pct)
	const color = pct >= 1 ? "#f87171" : pct >= 0.85 ? "#f59e0b" : "#f472b6"
	const remaining = max - count
	return (
		<span
			className={cn("relative inline-flex items-center justify-center", className)}
			title={remaining + " characters left"}
			aria-label={remaining + " characters left"}
			role="status"
		>
			<svg width={size} height={size} className="-rotate-90">
				<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3f3f46" strokeWidth="2" />
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke={color}
					strokeWidth="2"
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					className="transition-[stroke-dashoffset,stroke] duration-150"
				/>
			</svg>
			{pct >= 0.85 ? (
				<span className="absolute text-[9px] font-medium tabular-nums text-zinc-300">
					{remaining}
				</span>
			) : null}
		</span>
	)
}
