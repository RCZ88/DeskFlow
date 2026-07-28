# PROMPT — Workspace Design Preset System

## Raw Request

"I would like the solution for using or not being able to describe something accurately actually just gives some samples of design taste and sort of style that is pre-made. And you can refer to that. And then the user can slightly adjust. So basically instead of relying on the user being able to generate a complete descriptive style and like in complete sense, we would have those bunch of benchmark of stuff, a bunch of default built-in styles, different styles like polymorphism, and other design aspects. The user is able to just adjust basically maybe adjusting the colors, maybe adjusting some components of the design theme. So it's not describing the specification from scratch, but rather, it's supposed to be something that is able to be selected and adjusted a little bit by a little bit. And as well as, I need the improvement on how the AI uses the MCP, because MCP using all the skills, I don't think it's the most effective. And I feel like with those knobs of skills, it's not effective on improving the user without a clear design preference."

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` as the source of truth for code structure, data shapes, and architecture. The target AI must read this first.

## The Mandate

Design a **Workspace Design Preset System** for the DeskFlow Electron app. You are the Lead Designer and Engineer. You own the entire solution from architecture to pixels.

The core problem: AI agents cannot use design skills effectively, especially lower models. Users cannot describe design accurately. The solution is pre-built design presets with adjustable knobs — users select a visual style, tweak it, and AI agents follow it consistently.

## What Exists Today

The workspace has a design system in `src/components/workspace/_ds/` with containers, forms, motion, primitives, badges, and controls. There are 8 pre-built preset definitions in `src/lib/designPresets.ts` with full color/geometry/typography/motion/glass/MCP mappings. There are shadcn/ui components installed in `src/components/ui/` and Magic UI components available via MCP. The workspace renders in `src/pages/TerminalPage.tsx` (5000+ lines) with 6 sidebar groups (Setup, Work, Insights, Studio, Conductor, Context).

## What's Missing

There is no visual gallery for users to browse and select presets. There are no adjustment knobs for tweaking presets. The selected preset does not flow into agent prompts. Components do not adapt to the selected preset. MCP components are not mapped per-preset. The system needs a way for users to choose a design direction without needing to describe it from scratch.

## Your Task

Design the complete system. You decide the architecture, the components, the data flow, and the visual design. You have access to:

**Frontend Design Skills:**
1. Frontend Design — DeskFlow-specific component patterns, tokens, spacing, typography, glass cards
2. Human-Centric UX — empty/loading/error states, progressive disclosure, visual hierarchy, feedback
3. Impeccable — 7 design dimensions (typography, color, spatial, motion, interaction, responsive, UX writing), 27 anti-patterns
4. Design Taste System — design variance knobs, anti-repetition rules
5. frontend-external-infra — source routing, re-skin rules, anti-slop checklist

**MCP Component Inventory:**

| Component | Source | Use for |
|-----------|--------|---------|
| card | shadcn | Standard UI cards |
| button | shadcn | Actions and controls |
| badge | shadcn | Status indicators |
| input | shadcn | Text fields |
| select | shadcn | Dropdown selectors |
| switch | shadcn | Toggle controls |
| tabs | shadcn | Tab navigation |
| collapsible | shadcn | Expandable sections |
| scroll-area | shadcn | Scrollable containers |
| tooltip | shadcn | Hover hints |
| separator | shadcn | Visual dividers |
| skeleton | shadcn | Loading states |
| magic-card | Magic UI | Mouse-following glow cards |
| border-beam | Magic UI | Animated border effects |
| particles | Magic UI | Background particle effects |
| animated-gradient-text | Magic UI | Animated text gradients |
| number-ticker | Magic UI | Animated number counters |
| shimmer-button | Magic UI | Shimmering button effects |
| terminal | Magic UI | Terminal-style displays |
| blur-fade | Magic UI | Blur transition effects |
| animated-beam | Magic UI | Connecting line animations |
| Lucide icons | Lucide | 1500+ icons for all UI elements |

## Engineering Freedom

You are free to:
- Choose the component architecture (single component, multiple components, hooks, context, etc.)
- Design the data flow (state management, persistence, serialization)
- Design the visual layout (gallery grid, card sizes, knob placement)
- Design the adjustment mechanism (sliders, color pickers, toggles, presets-within-presets)
- Design how presets flow into agent prompts (direct injection, config file, dynamic assembly)
- Design how components adapt to presets (CSS variables, theme provider, styled-components, etc.)
- Design the MCP component routing per preset
- Design the preview mechanism (live preview, side-by-side, overlay)

## Anti-Slop Checklist

After your solution is complete, verify:
1. NOT default Inter/Geist-only — check font pairing is correct (Geist body, JetBrains Mono code)
2. NOT purple/indigo gradient-on-everything — use DeskFlow's defined tokens
3. Geometry: radius + padding come from DeskFlow's scale (rounded-xl, p-5)
4. No hero section clichés (tiny uppercase pill + oversized headline + lone CTA)
5. Real micro-interactions on key actions; respects prefers-reduced-motion
6. Empty/loading/error states exist for every data-driven component
7. All icons from lucide-react — no emoji as UI icons
8. Focus-visible rings use DeskFlow's --page-accent pattern
