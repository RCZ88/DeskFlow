# PROMPT.md — Cross-App Living Substrate

## Task
Upgrade the reaction-diffusion `LivingSubstrate` from a hardcoded amber Life-page component to a **global ambient background** that adapts its color to each page's accent. The substrate becomes the app's "living breath" — a subtle, organic, page-tinted layer behind all content.

## Deliverables

### 1. Shader Upgrade (`rd-display.glsl`)
- Add `uniform vec3 accentColor` (page accent in [0,1] RGB)
- Compute `COLOR_LOW`, `COLOR_MID`, `COLOR_HI` from `accentColor` (darken 40%, full, lighten 20%)
- Keep `COLOR_BG = #09090b` (app background, never changes)
- Cap max alpha at 0.35 for ambient use (was 0.55 for Life hero)

### 2. Component Upgrade (`LivingSubstrate.tsx`)
- Add props: `accent?: string`, `speed?: number`, `resolution?: 256|384`, `maxAlpha?: number`, `enabled?: boolean`
- Default accent = `#fbbf24` (amber, backward-compatible)
- Parse accent hex → RGB [0,1] → pass as uniform to display material
- Speed prop controls simulation pass count (1 or 2 per frame)
- Keep all existing guards: `prefers-reduced-motion`, `document.hidden`, ErrorBoundary

### 3. Global Mounting (`AppBackground.tsx`)
- Replace the 3 particle layers with `<LivingSubstrate />`
- Keep light rays as secondary layer
- Read `--page-accent` from `document.documentElement` on route change
- Pass as `accent` prop
- Add `data-rd-tier` per route for performance tiers

### 4. Per-Page Integration
- **Dashboard:** hero tier (384, 2 passes, full alpha) — the app's face
- **Activity:** standard tier (256, 1 pass) — data-heavy, calmer
- **IDE:** standard tier — violet tint matches AI tools
- **Life:** hero tier — amber tint (current behavior, now global)
- **Finance:** standard tier — emerald tint
- **Terminal:** dynamic tint from workspace group accent
- **Settings/Database:** minimal tier (256, 1 pass, 0.10 alpha) — barely visible

### 5. Glass Opacity Standard
All glass cards across the app must use `bg-zinc-900/75 backdrop-blur-xl` to block coral bleed while letting glow through edges. Audit and update any `bg-zinc-900/30` or `/40` instances.

## Constraints
- No new npm dependencies (R3F + THREE already installed)
- GLSL1 style (`texture2D`, `varying`, `gl_FragColor`) — do NOT convert to GLSL3
- `prefers-reduced-motion` must disable animation globally
- GPU usage under 15% on standard tier
- All text must pass WCAG AA contrast against tinted glass
- Vignette overlay (`radial-gradient`) is mandatory on every page

## Files to Modify
- `src/shaders/rd-display.glsl`
- `src/components/life-river/LivingSubstrate.tsx`
- `src/components/AppBackground.tsx`
- `src/features/warmth/LifePage.tsx` (remove local substrate)
- `src/App.tsx` (add data-rd-tier per route)
- `src/index.css` (add RD token variables)
