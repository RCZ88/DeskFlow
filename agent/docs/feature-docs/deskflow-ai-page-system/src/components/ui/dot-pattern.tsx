import { cn } from "@/lib/utils"

interface DotPatternProps {
  className?: string
  opacity?: number
  radius?: number
  gap?: number
}

export function DotPattern({
  className,
  opacity = 0.04,
  radius = 1,
  gap = 24,
}: DotPatternProps) {
  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
      style={{ opacity }}
    >
      <defs>
        <pattern
          id="dot-pattern"
          x={0}
          y={0}
          width={gap}
          height={gap}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={gap / 2} cy={gap / 2} r={radius} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot-pattern)" />
    </svg>
  )
}
