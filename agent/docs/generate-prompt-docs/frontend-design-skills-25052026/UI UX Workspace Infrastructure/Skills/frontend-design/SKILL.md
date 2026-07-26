---
id: frontend-design
name: Frontend Design
version: 2.0.0
category: design
tags: [ui, ux, frontend, css, react, tailwind]
---

# Frontend Design Skill

## Philosophy

Design is not decoration — it is communication. Every pixel, transition, and whitespace decision should serve the user's cognitive load reduction. The DeskFlow agent workspace demands dark, data-dense, glassmorphic interfaces that feel native to the desktop while maintaining web-grade flexibility.

## Core Principles

1. **Progressive Disclosure** — Show what matters, hide what doesn't. Use opacity, scale, and height transitions to reveal complexity gradually.
2. **Density Without Clutter** — Data-heavy UIs (terminal logs, heatmaps, orbit systems) need tight spacing (8px grid) with clear visual hierarchy through color weight, not just size.
3. **Glass as Structure** — Use `backdrop-filter: blur()` not as decoration but as spatial depth cues. Dark glass cards (`bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50`) create layers without adding visual weight.
4. **Motion as Feedback** — Every state change should have a micro-interaction (150-300ms). Never animate layout properties (width/height) — use transform and opacity only.
5. **Type as UI** — In dark dashboards, typography carries 60% of the visual hierarchy. Use weight and color temperature, not just size.

## Anti-Patterns (NEVER)

- **NEVER** use `box-shadow` for elevation in dark themes — use border brightness and glass layers instead.
- **NEVER** use pure black (`#000`) backgrounds — always `zinc-950` or `slate-950` with subtle texture.
- **NEVER** use more than 2 font families in a single view.
- **NEVER** animate `width`, `height`, `top`, `left` — these trigger layout recalculation and jank in Electron.
- **NEVER** use default browser focus rings — replace with `ring-2 ring-pink-500/50` or brand accent.
- **NEVER** place interactive elements closer than 44px touch targets (even on desktop — mouse precision varies).

## DeskFlow-Specific Conventions

### Color System
```
Background:     zinc-950 (base), zinc-900 (elevated), zinc-900/50 (glass)
Primary:        pink-500 (accent), pink-400 (hover), pink-600 (active)
Secondary:      cyan-400 (info), emerald-400 (success), amber-400 (warning)
Text:           zinc-100 (primary), zinc-400 (secondary), zinc-600 (disabled)
Border:         zinc-800 (subtle), zinc-700 (active), zinc-600/50 (glass edge)
```

### Spacing Scale
```
xs: 4px   (icon padding, tight inline)
sm: 8px   (component internal padding)
md: 12px  (card padding, list items)
lg: 16px  (section gaps)
xl: 24px  (page sections)
2xl: 32px (major divisions)
```

### Animation Tokens
```
fast:    150ms (hover states, toggles)
normal:  250ms (modals, dropdowns)
slow:    400ms (page transitions, layout shifts)
spring:  cubic-bezier(0.34, 1.56, 0.64, 1) (playful bounces)
ease-out: cubic-bezier(0.16, 1, 0.3, 1) (standard exits)
```

## Component Patterns

### Glass Card
```tsx
<div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-4 
                hover:border-zinc-700/50 transition-colors duration-200">
```

### Status Badge
```tsx
<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
                 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
  Active
</span>
```

### Terminal Pane Chrome
```tsx
<div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden
                shadow-2xl shadow-black/50">
  {/* Header bar */}
  <div className="h-8 bg-zinc-900/80 border-b border-zinc-800 flex items-center px-3 gap-2">
    <div className="flex gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
    </div>
    <span className="text-xs text-zinc-500 ml-2 font-mono">bash — zsh</span>
  </div>
</div>
```

## When to Activate

Activate this skill when:
- The user asks for UI improvements, design reviews, or frontend polish
- Generating React components for the DeskFlow renderer process
- Working with Tailwind CSS v4 syntax (NO v3 `@tailwind` directives)
- Creating dark-themed, data-dense dashboard components
- Designing glassmorphic overlays, modals, or terminal chrome
