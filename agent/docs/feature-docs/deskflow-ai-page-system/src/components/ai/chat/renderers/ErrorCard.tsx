import { AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "../../lib/cn"
import { TEXT } from "../../tokens"
import type { CardAction } from "../parsed"

/**
 * Assistant-reported error. Red-tinted, with an optional recovery hint and a
 * retry affordance that re-sends the last user turn (AiPage handles retry).
 */
export function ErrorCard({
	message,
	recovery,
	onAction,
}: {
	message: string
	recovery?: string
	onAction?: (a: CardAction) => void
}) {
	return (
		<div
			role="alert"
			className="flex flex-col gap-2 rounded-xl bg-red-500/5 p-5 ring-1 ring-red-500/20"
		>
			<div className="flex items-center gap-2">
				<AlertCircle size={16} className="shrink-0 text-red-400" />
				<p className={cn("text-[13px] font-medium", TEXT.primary)}>{message}</p>
			</div>
			{recovery ? <p className={cn("pl-6 text-[12px] leading-5", TEXT.secondary)}>{recovery}</p> : null}
			<div className="pl-6">
				<button
					type="button"
					onClick={() => onAction?.({ kind: "retry" })}
					className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-[12px] font-medium text-red-300 ring-1 ring-red-500/20 transition-colors hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
				>
					<RefreshCw size={13} /> Retry
				</button>
			</div>
		</div>
	)
}
