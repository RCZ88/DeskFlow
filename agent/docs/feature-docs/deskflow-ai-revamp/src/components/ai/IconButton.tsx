import { forwardRef, type ReactNode } from "react"
import { cn } from "./lib/cn"
import { RING } from "./tokens"

export interface IconButtonProps {
	/** A lucide icon element, e.g. <RefreshCw size={16} />. */
	icon: ReactNode
	/** Accessible label + tooltip text. Required. */
	label: string
	onClick?: () => void
	disabled?: boolean
	active?: boolean
	className?: string
	type?: "button" | "submit"
}

/**
 * 32x32 icon button. Fast (150ms) hover/focus feedback, tooltip via title,
 * DeskFlow focus ring. No box-shadow.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
	function IconButton(
		{ icon, label, onClick, disabled, active, className, type = "button" },
		ref,
	) {
		return (
			<button
				ref={ref}
				type={type}
				title={label}
				aria-label={label}
				aria-pressed={active}
				onClick={onClick}
				disabled={disabled}
				className={cn(
					"inline-flex h-8 w-8 items-center justify-center rounded-lg",
					"text-zinc-400 transition-colors duration-150",
					"hover:bg-zinc-800/60 hover:text-zinc-100",
					active && "bg-zinc-800/80 text-zinc-100",
					"disabled:cursor-not-allowed disabled:text-zinc-600 disabled:hover:bg-transparent",
					RING.focus,
					className,
				)}
			>
				{icon}
			</button>
		)
	},
)
