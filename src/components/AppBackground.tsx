import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { LivingSubstrate } from "./life-river/LivingSubstrate";
import { LightRays } from "./ui/light-rays";
import { AmbientGlow, DotPattern, GradientWash, MeshGradient, Vignette } from "./ui/ambient-patterns";
import { PAGE_ORGANISM, type Organism } from "../lib/rd-presets";

type Tier = "hero" | "standard" | "minimal";
type AmbientType = "dot" | "wash" | "mesh" | "none";

const PAGE_CONFIG: Record<string, { tier: Tier; ambient: AmbientType }> = {
  "/":         { tier: "hero",     ambient: "none" },
  "/activity": { tier: "standard", ambient: "dot" },
  "/ide":      { tier: "standard", ambient: "none" },
  "/life":     { tier: "hero",     ambient: "none" },
  "/finance":  { tier: "standard", ambient: "wash" },
  "/external": { tier: "standard", ambient: "dot" },
  "/terminal": { tier: "minimal",  ambient: "none" },
  "/ai":       { tier: "standard", ambient: "mesh" },
  "/learn":    { tier: "standard", ambient: "wash" },
  "/settings": { tier: "minimal",  ambient: "none" },
  "/database": { tier: "minimal",  ambient: "dot" },
  "/reports":  { tier: "standard", ambient: "dot" },
  "/resume":   { tier: "standard", ambient: "wash" },
};

const TIER_CFG = {
  hero:     { speed: 2 as const, resolution: 384 as const, maxAlpha: 0.35 },
  standard: { speed: 1 as const, resolution: 256 as const, maxAlpha: 0.20 },
  minimal:  { speed: 1 as const, resolution: 256 as const, maxAlpha: 0.10 },
};

const PAGE_ACCENTS: Record<string, string> = {
  "/": "#ec4899",
  "/activity": "#22d3ee",
  "/ide": "#8b5cf6",
  "/life": "#fbbf24",
  "/finance": "#10b981",
  "/external": "#fbbf24",
  "/terminal": "#a3e635",
  "/ai": "#8b5cf6",
  "/learn": "#6366f1",
  "/settings": "#22d3ee",
  "/database": "#a78bfa",
  "/reports": "#ec4899",
  "/resume": "#cbd5e1",
};

export function AppBackground({ pathname = "/" }: { pathname?: string }) {
  const [accent, setAccent] = useState(PAGE_ACCENTS[pathname] || "#fbbf24");
  const config = PAGE_CONFIG[pathname] || { tier: "standard" as Tier, ambient: "none" as AmbientType };
  const organism: Organism = PAGE_ORGANISM[pathname] ?? "coral";

  useEffect(() => {
    setAccent(PAGE_ACCENTS[pathname] || "#fbbf24");
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/terminal") return;
    const on = (e: Event) => setAccent((e as CustomEvent).detail.accent || "#a3e635");
    window.addEventListener("substrate:accent", on);
    return () => window.removeEventListener("substrate:accent", on);
  }, [pathname]);

  const showRays = config.tier !== "minimal";

  return (
    <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden bg-[#09090b]">
      {/* Layer 1: Living Substrate — ALWAYS present, tier scales effort/alpha */}
      <LivingSubstrate
        accent={accent}
        organism={organism}
        speed={TIER_CFG[config.tier].speed}
        resolution={TIER_CFG[config.tier].resolution}
        maxAlpha={TIER_CFG[config.tier].maxAlpha}
      />

      {/* Layer 2 */}
      <AmbientGlow />

      {/* Layer 3 */}
      {showRays && <LightRays count={config.tier === "hero" ? 6 : 4} speed={config.tier === "hero" ? 18 : 12} />}

      {/* Layer 4: additive texture overlays, never a replacement */}
      {config.ambient === "dot" && <DotPattern opacity={config.tier === "minimal" ? 0.02 : 0.04} />}
      {config.ambient === "wash" && <GradientWash />}
      {config.ambient === "mesh" && <MeshGradient />}
      {pathname === "/" && <DotPattern opacity={0.03} />}

      {/* Layer 5 */}
      <Vignette />
    </div>
  );
}
