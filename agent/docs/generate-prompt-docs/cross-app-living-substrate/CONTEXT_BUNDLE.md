# CONTEXT_BUNDLE.md — Cross-App Living Substrate

## Source: rd-display.glsl (current — hardcoded amber)
```glsl
// Reaction-Diffusion display fragment shader
// v3 AMBIENT ramp — alpha capped at 0.55

uniform sampler2D textureToDisplay;
varying vec2 v_uv;

const vec3 COLOR_BG  = vec3(0.0353, 0.0353, 0.0431);  // #09090b
const vec3 COLOR_LOW = vec3(0.4706, 0.2078, 0.0588);  // #78350f
const vec3 COLOR_MID = vec3(0.8510, 0.4667, 0.0235);  // #d97706
const vec3 COLOR_HI  = vec3(0.9608, 0.6196, 0.0431);  // #f59e0b

void main() {
  vec4 pixel = texture2D(textureToDisplay, v_uv);
  float B = pixel.g;
  float aLow  = smoothstep(0.0, 0.4, B);
  float aMid  = smoothstep(0.3, 0.7, B);
  float aHigh = smoothstep(0.6, 1.0, B);
  float alpha = mix(0.0, 0.15, aLow) + mix(0.0, 0.20, aMid) + mix(0.0, 0.20, aHigh);
  vec3 color = mix(COLOR_BG, COLOR_LOW, aLow);
  color = mix(color, COLOR_MID, aMid);
  color = mix(color, COLOR_HI, aHigh);
  gl_FragColor = vec4(color * alpha, alpha);
}
```

## Source: rd-simulation.glsl (current — with flowSpeed advection)
```glsl
uniform sampler2D previousIterationTexture;
uniform float f;
uniform float k;
uniform float dA;
uniform float dB;
uniform float timestep;
uniform float flowSpeed;
uniform vec2 resolution;
varying vec2 v_uvs[9];
// ... (5-point stencil, laplacian, advection)
```

## Source: LivingSubstrate.tsx (current — zero props)
```tsx
export function LivingSubstrate() {
  // respects prefers-reduced-motion
  // BUFFER_SIZE = 384 if DPR>1.5 else 256
  // 28 seed circles
  // simMaterial.uniforms: f=0.058, k=0.065, flowSpeed=0.0015
  // displayMaterial: transparent, AdditiveBlending
  // Vignette: radial-gradient(transparent 30%, rgba(9,9,11,0.85) 100%)
  // Pauses on document.hidden
}
```

## Source: AppBackground.tsx (current — particles + rays)
```tsx
export function AppBackground() {
  return (
    <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden">
      <Particles quantity={60} color="#10b981" />
      <Particles quantity={45} color="#3b82f6" />
      <Particles quantity={35} color="#ef4444" />
      <LightRays count={5} speed={18} />
    </div>
  )
}
```

## Source: Page accent map (from index.css feature-doc)
```css
[data-page="dashboard"] { --page-accent: #ec4899; }
[data-page="ide"]       { --page-accent: #8b5cf6; }
[data-page="external"]  { --page-accent: #fbbf24; }
[data-page="finance"]   { --page-accent: #10b981; }
[data-page="insights"]  { --page-accent: #ec4899; }
[data-page="database"]  { --page-accent: #a78bfa; }
[data-page="settings"]  { --page-accent: #22d3ee; }
```

## Source: App.tsx route definitions (lines 2908-2985)
```tsx
<Route path="/" element={<DashboardPage />} />
<Route path="/activity" element={<ActivityPage />} />
<Route path="/ide" element={<IDEProjectsPage />} />
<Route path="/life" element={<LifePage />} />
<Route path="/finance" element={<FinancePage />} />
<Route path="/external" element={<ExternalPage />} />
<Route path="/reports" element={<InsightsPage />} />
<Route path="/database" element={<DatabasePage />} />
<Route path="/settings" element={<SettingsPage />} />
<Route path="/terminal" element={<TerminalPage />} />
<Route path="/ai" element={<AiPage />} />
<Route path="/learn" element={<LearnPage />} />
<Route path="/resume" element={<ResumePage />} />
```

## Key Invariants
- GLSL1 style (texture2D, varying, gl_FragColor) — never GLSL3
- `prefers-reduced-motion` disables animation
- Vignette overlay mandatory for text contrast
- Glass cards use `bg-zinc-900/75 backdrop-blur-xl`
- No new npm dependencies
- GPU < 15% on standard tier
