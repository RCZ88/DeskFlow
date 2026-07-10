import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface ParticlesProps {
  className?: string
  quantity?: number
  color?: string
  /** 0-1, kept intentionally low by callers for an ambient, non-distracting effect */
  opacity?: number
}

// A minimal, dependency-free recreation of Magic UI's `particles` background --
// slow-drifting dots on a canvas. Pauses automatically on prefers-reduced-motion
// and when the tab/window is hidden, per the Motion skill's performance rules.
export function Particles({ className, quantity = 30, color = "#ec4899", opacity = 0.25 }: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduce) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let running = true
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const parent = canvas.parentElement
      const w = parent?.clientWidth || canvas.clientWidth || 300
      const h = parent?.clientHeight || canvas.clientHeight || 150
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.scale(dpr, dpr)
    }
    resize()

    const particles = Array.from({ length: quantity }).map(() => ({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      r: Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      a: Math.random() * opacity,
    }))

    const draw = () => {
      if (!running) return
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = p.a
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    const onVisibility = () => {
      running = document.visibilityState === "visible"
      if (running) raf = requestAnimationFrame(draw)
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("resize", resize)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("resize", resize)
    }
  }, [quantity, color, opacity])

  return <canvas ref={canvasRef} className={cn("pointer-events-none absolute inset-0 size-full", className)} />
}
