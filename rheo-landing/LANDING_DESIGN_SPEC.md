# RHEO Landing Page — Design Spec (v1.0)

## Creative Direction: "The Loom"

RHEO's subsystems are threads on one loom; its AI is the shuttle running through all of them.

## Page Flow (top to bottom)

| # | Section | Purpose | Key Visual |
|---|---------|---------|------------|
| 1 | NavBar (glass) | Navigation | Glass morphism on scroll |
| 2 | Hero | Feel the metaphor | ASCII flow field canvas |
| 3 | Threads | Meet each thread once | LoomSVG warp threads + mascot intro |
| 4 | Shuttle | AI-native, not bolted on | 3 AI captions |
| 5 | Fabric | Zoom-out payoff | LoomSVG weft reveal |
| 6 | ModuleStore | Full feature reference | 12 patch cards (mascot + label + desc) |
| 7 | Quiet | Contemplation beat | Quote |
| 8 | OpenSource | Trust | MIT / privacy |
| 9 | Footer | Exit | Brand + live clock |

## Persistent UI Elements

- **Grain overlay**: SVG feTurbulence, 4% opacity, fixed fullscreen, z-[200], pointer-events-none
- **Rheo-line spine**: Fixed right-edge vertical line (x=24px from right), 24h day-ruler with 24 ticks, scroll-proportional playhead, readout showing current time

## Tokens

```css
--bg: #09090b
--amber: #fbbf24
--terracotta: #c2703d
--text: #fafafa
--text-secondary: #a1a1aa
--surface: #18181b
--raised: #27272a
```

## Liveliness Level: L3 (Cinematic)

Product landing = immersive, scroll-driven, cinematic reveals. Reduced-motion = static end-state for each feature.

## ASCII Flow Field Hero Spec

- **Grid**: 12px character cells on canvas
- **Ramp**: `" .·:;+=×#@"` (10 levels, low→high density)
- **Energy formula**: `base + |scrollVelocity| × 0.9`
- **Pointer repulsor**: 90px radius, pushes glyph brightness away
- **Spring recovery**: ~1.2s after scroll stops
- **Glyph count**: ≤1500 desktop, ≤500 mobile
- **DPR cap**: 1.5
- **Rendering**: Batched fillText (group by brightness level)
- **Pause**: When canvas is offscreen (IntersectionObserver)
- **Reduced motion**: Static noise texture, no animation

## Rheo-line Spine Spec

- **Position**: Fixed right edge, 24px from right, full viewport height
- **Style**: 1px line, var(--color-text-muted) at 0.3 opacity
- **Day ruler**: 24 tick marks (one per hour), labels every 6h
- **Playhead**: 8px amber circle at scroll-progress position
- **Readout**: Digital time display near playhead
- **Reduced motion**: Static line with playhead at current time position

## NavBar Glass-on-Scroll

- **Default**: Transparent (no background)
- **Scrolled (>48px)**: bg-[rgba(24,24,27,0.60)] backdrop-blur-xl border-b border-white/5
- **Transition**: 300ms ease

## Footer Clock

- **Live digital clock** in the brand area, updating every second
- **Format**: HH:MM:SS in mono font
- **Reduced motion**: Static time, no ticking
