# Design Spec: Cross-App Living Substrate (Reaction-Diffusion Ambient Background)

> **Related:** `agent/docs/generate-prompt-docs/cross-app-design-system/CONTINUATION_PROMPT.md` — extends this spec to cover ALL pages with a repeatable design generation framework.

## 1. Vision

The reaction-diffusion "coral" substrate — currently hardcoded to amber on the Life page — becomes the **app's living breath**: a subtle, organic, page-tinted ambient layer that makes every screen feel alive. Each page gets its own color-tinted RD pattern derived from its `--page-accent`, creating visual identity without clutter.

## 2. Architecture

### 2.1 Component: `LivingSubstrate` (upgraded)

**Current:** Zero props, hardcoded amber display ramp, only renders on Life page.

**New API:**
```tsx
interface LivingSubstrateProps {
  /** Accent hex color (e.g. '#8b5cf6'). Derives the 3-stop display ramp. */
  accent?: string
  /** Simulation speed multiplier (default 1.0). Lower = calmer. */
  speed?: number
  /** Resolution: 256 | 384 | 512. Default 256 (384 on high-DPI). */
  resolution?: number
  /** Max alpha cap for display ramp. Default 0.35 (ambient). */
  maxAlpha?: number
  /** Enable/disable (for conditional rendering). Default true. */
  enabled?: boolean
}
```

### 2.2 Color Derivation from Accent

Given an accent hex (e.g. `#8b5cf6` violet), derive a 3-stop display ramp:

```
COLOR_BG  = #09090b (always — the app background)
COLOR_LOW = accent darkened 60% (e.g. violet → deep indigo)
COLOR_MID = accent at full saturation
COLOR_HI  = accent lightened 20% (e.g. violet → lavender)
```

**Formula (simplified):**
```glsl
// Given accent as vec3 in [0,1]
const vec3 COLOR_BG  = vec3(0.0353, 0.0353, 0.0431);  // #09090b
vec3 COLOR_LOW = accent * 0.4;                           // darkened
vec3 COLOR_MID = accent;                                 // full
vec3 COLOR_HI  = mix(accent, vec3(1.0), 0.2);           // lightened
```

The shader receives `accent` as a uniform and computes the ramp in `main()`, eliminating hardcoded colors.

### 2.3 Per-Page Accent Map

| Page | `--page-accent` | RD tint | Notes |
|------|----------------|---------|-------|
| Dashboard | `#ec4899` (pink) | Pink coral | Hero page, full animation |
| Activity | `#22d3ee` (cyan) | Cyan coral | Data-heavy, calmer speed |
| IDE Projects | `#8b5cf6` (violet) | Violet coral | Matches AI tools theme |
| Life | `#fbbf24` (amber) | Amber coral | Current behavior (default) |
| Finance | `#10b981` (emerald) | Emerald coral | Money/growth metaphor |
| External | `#fbbf24` (amber) | Amber coral | Time-tracking warmth |
| Insights | `#ec4899` (pink) | Pink coral | Analytics insight |
| Database | `#a78bfa` (light violet) | Lavender coral | Data exploration |
| Settings | `#22d3ee` (cyan) | Cyan coral | Configuration calm |
| Learn | `#6366f1` (indigo) | Indigo coral | Education/growth |
| Terminal | per-group dynamic | Dynamic | Changes with workspace group |
| AI Assistant | `#8b5cf6` (violet) | Violet coral | Intelligence theme |
| Resume | `#6366f1` (indigo) | Indigo coral | Professional theme |

### 2.4 Mounting Strategy

**Option A: Enhance `AppBackground` (recommended)**
- Replace the 3 particle layers with the RD substrate
- Keep the light rays as a secondary layer
- The RD renders at `z-[0]`, glass content sits at `z-[10]`
- Per-page accent is read from `getComputedStyle(document.documentElement).getPropertyValue('--page-accent')`

**Option B: Per-page mounting**
- Each page imports and renders `<LivingSubstrate accent={pageAccent} />`
- More control per page, but repetitive

**Recommendation:** Option A — single global instance that adapts to the current page.

### 2.5 Performance Budget

| Tier | Resolution | Sim Passes/Frame | Use Case |
|------|-----------|-------------------|----------|
| Hero (Life, Dashboard) | 384 (high-DPI) | 2 | Full animation, primary visual |
| Standard (most pages) | 256 | 1 | Subtle ambient, low GPU cost |
| Minimal (Settings, Database) | 256 | 1 + reduced seeds | Barely visible, text-heavy pages |
| Disabled | — | — | `prefers-reduced-motion`, low-power mode |

### 2.6 Vignette & Contrast

Every page gets the same vignette overlay to ensure text readability:
```tsx
<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(9,9,11,0.85)_100%)]" />
```

Glass cards use `bg-zinc-900/75 backdrop-blur-xl` to block the coral while letting glow bleed through edges.

## 3. Implementation Plan

### Phase 1: Upgrade LivingSubstrate (shader + component)
1. Add `uniform vec3 accentColor` to `rd-display.glsl`
2. Compute `COLOR_LOW`, `COLOR_MID`, `COLOR_HI` from `accentColor` in the shader
3. Add props to `LivingSubstrate.tsx`: `accent`, `speed`, `resolution`, `maxAlpha`, `enabled`
4. Pass accent uniform to the display material
5. Keep backward compatibility: default accent = `#fbbf24` (amber)

### Phase 2: Global Mounting
1. Move `<LivingSubstrate />` from LifePage into `AppBackground.tsx`
2. Read `--page-accent` from `document.documentElement` on route change
3. Pass as `accent` prop to the global substrate
4. Remove `<LivingSubstrate />` from LifePage (it's now global)
5. Keep the Life page's CoreSample CSS glow as a secondary layer

### Phase 3: Per-Page Tuning
1. Add `data-rd-tier="hero|standard|minimal"` attribute to each page
2. AppBackground reads the tier and adjusts resolution/speed
3. Terminal page: read dynamic accent from workspace group state
4. Dashboard: full hero tier with 2 sim passes
5. Settings/Database: minimal tier with 1 pass

### Phase 4: Verification
1. Visual: each page shows tinted coral matching its accent
2. Performance: GPU usage stays under 15% on standard tier
3. Accessibility: `prefers-reduced-motion` disables animation globally
4. Contrast: all text passes WCAG AA against tinted glass

## 4. Shaders (Updated)

### rd-display.glsl (v4 — accent-driven)
```glsl
uniform sampler2D textureToDisplay;
uniform vec3 accentColor;  // NEW: page accent in [0,1]
varying vec2 v_uv;

void main() {
  vec4 pixel = texture2D(textureToDisplay, v_uv);
  float B = pixel.g;

  // Derive ramp from accent
  const vec3 COLOR_BG  = vec3(0.0353, 0.0353, 0.0431);
  vec3 COLOR_LOW = accentColor * 0.4;
  vec3 COLOR_MID = accentColor;
  vec3 COLOR_HI  = mix(accentColor, vec3(1.0), 0.2);

  float aLow  = smoothstep(0.0, 0.4, B);
  float aMid  = smoothstep(0.3, 0.7, B);
  float aHigh = smoothstep(0.6, 1.0, B);

  float alpha = mix(0.0, 0.12, aLow) + mix(0.0, 0.15, aMid) + mix(0.0, 0.10, aHigh);

  vec3 color = mix(COLOR_BG, COLOR_LOW, aLow);
  color = mix(color, COLOR_MID, aMid);
  color = mix(color, COLOR_HI, aHigh);

  gl_FragColor = vec4(color * alpha, alpha);
}
```

## 5. Files to Modify

| File | Change |
|------|--------|
| `src/shaders/rd-display.glsl` | Add `uniform vec3 accentColor`, compute ramp from it |
| `src/components/life-river/LivingSubstrate.tsx` | Add props, pass accent uniform, configurable speed/resolution |
| `src/components/AppBackground.tsx` | Replace particles with global LivingSubstrate, read `--page-accent` |
| `src/features/warmth/LifePage.tsx` | Remove local `<LivingSubstrate />` (now global) |
| `src/App.tsx` | Add `data-rd-tier` attribute per route |

## 6. Design Tokens

```css
/* Added to index.css */
--rd-opacity-hero: 0.35;
--rd-opacity-standard: 0.20;
--rd-opacity-minimal: 0.10;
--rd-speed-hero: 1.0;
--rd-speed-standard: 0.6;
--rd-speed-minimal: 0.3;
```

## 7. Anti-Slop Checklist

- [ ] Coral tint matches page accent (not generic purple)
- [ ] Vignette ensures text contrast (WCAG AA)
- [ ] Performance stays under 15% GPU on standard tier
- [ ] `prefers-reduced-motion` disables animation
- [ ] No coral visible behind modal overlays (z-index > 50)
- [ ] Glass cards use `bg-zinc-900/75` to block coral bleed
- [ ] Each page's accent is distinct (not all the same color)
