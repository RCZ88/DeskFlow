import { cn } from "../lib/cn"

/**
 * Loading skeleton block. Uses Tailwind's animate-pulse (opacity only) so it
 * is safe under the transform/opacity constraint. Reduced-motion users still
 * see the shape; the pulse is handled by the browser and is subtle.
 */
export function Skeleton({ className }: { className?: string }) {
	return (
		<div
			aria-hidden
			className={cn(
				"animate-pulse rounded-lg bg-zinc-800/40",
				"motion-reduce:animate-none",
				className,
			)}
		/>
	)
}

/** A common skeleton row: icon tile + two text lines. */
export function SkeletonRow() {
	return (
		<div className="flex items-center gap-3 px-1 py-2">
			<Skeleton className="h-8 w-8 shrink-0" />
			<div className="flex-1 space-y-2">
				<Skeleton className="h-3 w-1/3" />
				<Skeleton className="h-3 w-2/3" />
			</div>
		</div>
	)
}
