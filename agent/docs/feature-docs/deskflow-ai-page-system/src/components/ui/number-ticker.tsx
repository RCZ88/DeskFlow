import { useEffect, useRef } from "react"
import { useMotionValue, useSpring, useTransform, motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

interface NumberTickerProps {
  value: number
  direction?: "up" | "down"
  delay?: number
  duration?: number
  decimals?: number
  className?: string
  suffix?: string
  prefix?: string
  formatter?: (value: number) => string
}

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  duration = 800,
  decimals = 0,
  className,
  suffix = "",
  prefix = "",
  formatter,
}: NumberTickerProps) {
  const prefersReduced = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === "down" ? value : 0)
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  })
  const rounded = useTransform(springValue, (v) =>
    formatter ? formatter(v) : v.toFixed(decimals)
  )

  useEffect(() => {
    if (prefersReduced) return
    const timer = setTimeout(() => {
      motionValue.set(direction === "down" ? 0 : value)
    }, delay)
    return () => clearTimeout(timer)
  }, [value, direction, delay, motionValue, prefersReduced])

  if (prefersReduced) {
    return (
      <span className={cn("tabular-nums", className)}>
        {prefix}{formatter ? formatter(value) : value.toFixed(decimals)}{suffix}
      </span>
    )
  }

  return (
    <span className={cn("tabular-nums", className)} ref={ref}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  )
}
