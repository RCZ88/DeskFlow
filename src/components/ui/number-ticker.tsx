import { useEffect, useRef, useState, useCallback } from "react"
import { useMotionValue, useSpring, useReducedMotion } from "framer-motion"
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

  const formatValue = useCallback(
    (v: number) => (formatter ? formatter(v) : v.toFixed(decimals)),
    [formatter, decimals]
  )

  const [display, setDisplay] = useState(() =>
    formatValue(direction === "down" ? value : 0)
  )

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(formatValue(value))
      return
    }
    const unsub = springValue.on("change", (v: number) => {
      setDisplay(formatValue(v))
    })
    const timer = setTimeout(() => {
      motionValue.set(direction === "down" ? 0 : value)
    }, delay)
    return () => {
      clearTimeout(timer)
      unsub()
    }
  }, [value, direction, delay, motionValue, prefersReduced, springValue, formatValue])

  if (prefersReduced) {
    return (
      <span className={cn("tabular-nums", className)}>
        {prefix}{formatValue(value)}{suffix}
      </span>
    )
  }

  return (
    <span className={cn("tabular-nums", className)} ref={ref}>
      {prefix}{display}{suffix}
    </span>
  )
}
