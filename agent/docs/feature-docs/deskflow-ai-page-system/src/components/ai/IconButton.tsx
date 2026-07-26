import {
	createElement,
	forwardRef,
	isValidElement,
	type ComponentType,
	type ReactNode,
} from "react"
import { cn } from "./lib/cn"
import { RING } from "./tokens"

type IconInput = ReactNode | ComponentType<{ size?: number; className?: string }>

export interface IconButtonProps {
	/** A rendered icon (<RefreshCw size={16} />) OR a bare icon component (RefreshCw). */
	icon: IconInput
	label: string
	onClick?: () => void
	disabled?: boolean
	active?: boolean
	className?: string
	type?: "button" | "submit"
}

/** Renders an icon whether it's an element OR a bare component reference. */
function renderIcon(icon: IconInput, size = 16): ReactNode {
	if (icon == null || typeof icon === "boolean") return null
	if (isValidElement(icon)) return icon
	if (
		typeof icon === "function" ||
		(typeof icon === "object" && "$$typeof" in (icon as Record<string, unknown>))
	) {
		return createElement(icon as ComponentType<{ size?: number }>, { size })
	}
	return icon as ReactNode
}

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
				{renderIcon(icon)}
			</button>
		)
	},
)