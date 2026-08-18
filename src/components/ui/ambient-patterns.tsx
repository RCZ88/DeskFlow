import { cn } from "@/lib/utils"

// Layer 2: Ambient Glow (Always present, subtle radial wash from accent)
export function AmbientGlow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("absolute inset-0 pointer-events-none transition-opacity duration-1000", className)}
      style={{
        background: `radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--page-accent) 15%, transparent), transparent 70%)`,
      }}
    />
  )
}

// Layer 4B: Gradient Wash (Clean/Minimal pages)
export function GradientWash({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("absolute inset-0 pointer-events-none transition-opacity duration-1000 opacity-[0.03]", className)}
      style={{
        background: `linear-gradient(135deg, var(--page-accent) 0%, transparent 40%, transparent 60%, var(--page-accent) 100%)`,
      }}
    />
  )
}

// Layer 4C: Mesh Gradient (Creative/Fluid pages - AI, IDE)
export function MeshGradient({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      <div
        className="absolute inset-0 opacity-[0.08] df-animate-mesh"
        style={{
          background: `
            radial-gradient(at 20% 30%, var(--page-accent) 0px, transparent 50%),
            radial-gradient(at 80% 70%, color-mix(in srgb, var(--page-accent) 60%, #8b5cf6) 0px, transparent 50%),
            radial-gradient(at 50% 50%, color-mix(in srgb, var(--page-accent) 40%, #0ea5e9) 0px, transparent 50%)
          `,
          backgroundSize: "200% 200%",
        }}
      />
    </div>
  )
}

// Layer 5: Vignette (Mandatory for WCAG AA text contrast over substrate)
export function Vignette({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("absolute inset-0 z-[1] pointer-events-none", className)}
      style={{
        background: "radial-gradient(ellipse at center, transparent 30%, rgba(9,9,11,0.85) 100%)",
      }}
    />
  )
}
