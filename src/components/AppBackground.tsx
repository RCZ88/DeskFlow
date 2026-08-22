import { Particles } from './ui/particles';
import { LightRays } from './ui/light-rays';
import { LivingSubstrate } from './life-river/LivingSubstrate';
import { AmbientGlow, GradientWash, MeshGradient, Vignette } from './ui/ambient-patterns';
import { DotPattern } from './ui/dot-pattern';

type Tier = "hero" | "standard" | "minimal";
type AmbientType = "rd" | "dot" | "wash" | "mesh" | "none";

const PAGE_CONFIG: Record<string, { tier: Tier; ambient: AmbientType }> = {
  "/":         { tier: "hero",     ambient: "rd" },
  "/activity": { tier: "standard", ambient: "dot" },
  "/ide":      { tier: "standard", ambient: "mesh" },
  "/life":     { tier: "hero",     ambient: "rd" },
  "/finance":  { tier: "standard", ambient: "wash" },
  "/external": { tier: "standard", ambient: "dot" },
  "/terminal": { tier: "minimal",  ambient: "none" },
  "/ai":       { tier: "standard", ambient: "mesh" },
  "/learn":    { tier: "standard", ambient: "wash" },
  "/settings": { tier: "minimal",  ambient: "wash" },
  "/database": { tier: "minimal",  ambient: "dot" },
  "/reports":  { tier: "standard", ambient: "dot" },
  "/resume":   { tier: "standard", ambient: "wash" },
};

const TIER_CFG = {
  hero:     { speed: 2 as const, maxAlpha: 0.35 },
  standard: { speed: 1 as const, maxAlpha: 0.20 },
  minimal:  { speed: 1 as const, maxAlpha: 0.10 },
};

const PAGE_ACCENTS: Record<string, string> = {
  "/": "#10b981",
  "/activity": "#06b6d4",
  "/ide": "#6366f1",
  "/life": "#fbbf24",
  "/finance": "#10b981",
  "/external": "#f59e0b",
  "/terminal": "#22c55e",
  "/ai": "#8b5cf6",
  "/learn": "#6366f1",
  "/settings": "#06b6d4",
  "/database": "#a78bfa",
  "/reports": "#ec4899",
  "/resume": "#cbd5e1",
};

interface AppBackgroundProps {
  pathname?: string;
}

export function AppBackground({ pathname = '/' }: AppBackgroundProps) {
  const accent = PAGE_ACCENTS[pathname] || '#10b981';
  const config = PAGE_CONFIG[pathname] || { tier: "standard" as Tier, ambient: "wash" as AmbientType };

  const showSubstrate = config.ambient === "rd";
  const showRays = config.tier !== "minimal";

  return (
    <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden bg-[#09090b]">
      {showSubstrate && (
        <LivingSubstrate
          accent={accent}
          speed={TIER_CFG[config.tier].speed}
          maxAlpha={TIER_CFG[config.tier].maxAlpha}
        />
      )}

      <AmbientGlow />

      {showRays && <LightRays count={config.tier === "hero" ? 6 : 4} speed={config.tier === "hero" ? 18 : 12} />}

      {config.ambient === "dot" && <DotPattern opacity={config.tier === "minimal" ? 0.02 : 0.04} />}
      {config.ambient === "wash" && <GradientWash />}
      {config.ambient === "mesh" && <MeshGradient />}

      {pathname === "/" && <DotPattern opacity={0.03} />}
    </div>
  );
}
