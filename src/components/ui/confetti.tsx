"use client"

import { useCallback, useEffect, useRef } from "react"

interface ConfettiOptions {
  particleCount?: number
  spread?: number
  startVelocity?: number
  decay?: number
  gravity?: number
  ticks?: number
  colors?: string[]
  origin?: { x: number; y: number }
}

function createParticle(
  canvas: HTMLCanvasElement,
  options: ConfettiOptions
) {
  const color = options.colors?.[Math.floor(Math.random() * (options.colors?.length ?? 1))] ?? "#ec4899"
  const origin = options.origin ?? { x: 0.5, y: 0.5 }
  const angle = Math.random() * Math.PI * 2
  const velocity = (options.startVelocity ?? 45) * (0.5 + Math.random() * 0.5)
  const spread = (options.spread ?? 60) * (Math.PI / 180)
  const drift = (Math.random() - 0.5) * spread

  return {
    x: origin.x * canvas.width,
    y: origin.y * canvas.height,
    vx: Math.cos(angle + drift) * velocity,
    vy: Math.sin(angle + drift) * velocity,
    color,
    decay: options.decay ?? 0.9,
    gravity: options.gravity ?? 1.2,
    ticks: options.ticks ?? 200,
    currentTicks: 0,
    size: Math.random() * 4 + 2,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
  }
}

function animate(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  particles: ReturnType<typeof createParticle>[]
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const alive = particles.filter((p) => p.currentTicks < p.ticks)
  if (alive.length === 0) {
    canvas.remove()
    return
  }

  for (const p of alive) {
    p.x += p.vx
    p.y += p.vy
    p.vy += p.gravity
    p.vx *= p.decay
    p.vy *= p.decay
    p.rotation += p.rotationSpeed
    p.currentTicks++

    const opacity = 1 - p.currentTicks / p.ticks
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate((p.rotation * Math.PI) / 180)
    ctx.globalAlpha = opacity
    ctx.fillStyle = p.color
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
    ctx.restore()
  }

  requestAnimationFrame(() => animate(canvas, ctx, alive))
}

export function confetti(options?: ConfettiOptions) {
  const canvas = document.createElement("canvas")
  canvas.style.position = "fixed"
  canvas.style.top = "0"
  canvas.style.left = "0"
  canvas.style.width = "100vw"
  canvas.style.height = "100vh"
  canvas.style.pointerEvents = "none"
  canvas.style.zIndex = "9999"
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    canvas.remove()
    return
  }

  const count = options?.particleCount ?? 50
  const particles = Array.from({ length: count }, () => createParticle(canvas, options ?? {}))
  animate(canvas, ctx, particles)
}
