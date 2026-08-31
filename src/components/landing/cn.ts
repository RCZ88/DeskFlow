// Minimal className joiner for landing components. Avoids pulling @/lib/utils
// so the landing kit stays self-contained and monochrome-token-driven.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
