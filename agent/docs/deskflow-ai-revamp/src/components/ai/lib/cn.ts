/**
 * cn — tiny className joiner (no external deps).
 * Filters falsy values so you can write cn('base', cond && 'x', props.className).
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(" ")
}
