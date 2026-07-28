# FOLLOW-UP PROMPT — Workspace Design Preset System (Complete)

## Raw Request

"I would like the solution for using or not being able to describe something accurately actually just gives some samples of design taste and sort of style that is pre-made. And you can refer to that. And then the user can slightly adjust. So basically instead of relying on the user being able to generate a complete descriptive style and like in complete sense, we would have those bunch of benchmark of stuff, a bunch of default built-in styles, different styles like polymorphism, and other design aspects. The user is able to just adjust basically maybe adjusting the colors, maybe adjusting some components of the design theme. So it's not describing the specification from scratch, but rather, it's supposed to be something that is able to be selected and adjusted a little bit by a little bit. And as well as, I need the improvement on how the AI uses the MCP, because MCP using all the skills, I don't think it's the most effective. And I feel like with those knobs of skills, it's not effective on improving the user without a clear design preference."

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` as the source of truth for code structure, data shapes, and architecture. The target AI must read this first.

---

# THE FULL SITUATION

## What is DeskFlow?

DeskFlow is an **Electron desktop app** for productivity tracking. It has a **workspace** — a full-screen terminal environment where users run AI agents (Claude, OpenCode, etc.) to build software. The workspace is NOT just a terminal. It is a complete development environment with:

- A **sidebar** with 6 groups of tools (Setup, Work, Insights, Studio, Conductor, Context)
- Each group has multiple subtabs (Presets, Configs, Sessions, Files, Analytics, etc.)
- A **command bar** at the top with project context, terminal tabs, and action buttons
- A **terminal area** where AI agents run in real terminal panes
- **Cross-session sync** between multiple AI agents
- **Context injection** that feeds problems, requests, and session data to agents
- **Auto-assign routing** that uses AI to route prompts to the best session
- **Workspace persistence** that saves and restores the entire state

## The Core Problem

AI agents cannot use design skills effectively. When the AI tries to build UI components for the workspace, it produces generic, inconsistent output because:

1. **Design skills are documentation, not enforceable** — Skills like "Frontend Design", "Impeccable", "Human-Centric UX" exist as SKILL.md files but the AI doesn't consistently apply them
2. **Users cannot describe design accurately** — Asking "what style do you want?" gives vague answers like "make it look clean" or "make it cyberpunk"
3. **No visual reference** — The AI has no way to show users what different styles look like before building
4. **Inconsistent execution** — Even when the AI knows the rules, it applies them inconsistently across components

## The Solution: Design Presets

Instead of relying on users to describe what they want, provide **pre-built visual design presets** that users can:

1. **Browse visually** — See a gallery of different design styles
2. **Select one** — Click to apply a style
3. **Adjust slightly** — Tweak colors, radius, density, motion
4. **AI follows it** — The selected preset is injected into agent prompts so AI generates consistent UI

---

# WHAT ALREADY EXISTS

## 1. Preset Definitions (`src/lib/designPresets.ts`)

8 presets are already defined with full style parameters:

| Preset | Category | Accent | Radius | Glass | Glow | Animation | Density |
|--------|----------|--------|--------|-------|------|-----------|---------|
| Cyberpunk Neon | vibrant | `#00f0ff` | 6px | Yes | Yes | moderate | comfortable |
| Minimal Clean | light | `#171717` | 8px | No | No | subtle | airy |
| Glassmorphic | dark | `#8b5cf6` | 12px | Yes | No | subtle | comfortable |
| Brutalist | dark | `#ff4444` | 0px | No | No | none | compact |
| Warm Organic | dark | `#c8a06a` | 10px | No | No | subtle | comfortable |
| Terminal Hacker | dark | `#00ff41` | 0px | No | Yes | none | dense |
| Ocean Depths | dark | `#22d3ee` | 10px | Yes | No | subtle | comfortable |
| Neon Synthwave | vibrant | `#ff6ec7` | 8px | Yes | Yes | moderate | comfortable |

Each preset has: 14 color values, geometry (radius, border-width, padding), typography (font stack, mono, base size, weights), motion (duration, easing, intensity), glass/effects (blur, opacity, shadow, glow), density, spacing scale, MCP component recommendations, and design rules.

## 2. Design System Components (`src/components/workspace/_ds/`)

A design system exists with these primitives:
- **Containers**: `WorkspaceCard` (4 variants: default/interactive/elevated/inset), `WorkspaceSection`, `WorkspaceToolbar`, `WorkspaceGroupHeader`
- **Forms**: `WS_INPUT`, `WS_BTN_PRIMARY`, `WS_BTN_SECONDARY`, `WS_BTN_GHOST`, `WS_BTN_DANGER`, `WS_BTN_ICON`, `WS_CHIP`
- **Motion**: `DUR` (fast/normal/slow), `EASE_OUT`, `listContainer`, `riseItem`, `expandPanel`, `popItem`, `tabPanel`
- **Primitives**: `StatusPill`, `Chip`, `ProgressBar`, `Skeleton`, `IconButton`, `EmptyState`, `WorkspaceError`
- **Badges**: `WorkspaceStatusBadge`, `WorkspaceCategoryBadge`, `WorkspacePriorityBadge`
- **Controls**: `ModalShell`, `filterChipCls`, `Pill`

## 3. shadcn/ui Components (installed in `src/components/ui/`)

32 components available:

| Component | File |
|-----------|------|
| accordion | `src/components/ui/accordion.tsx` |
| alert-dialog | `src/components/ui/alert-dialog.tsx` |
| animated-circular-progress-bar | `src/components/ui/animated-circular-progress-bar.tsx` |
| animated-gradient-text | `src/components/ui/animated-gradient-text.tsx` |
| animated-shiny-text | `src/components/ui/animated-shiny-text.tsx` |
| aurora-text | `src/components/ui/aurora-text.tsx` |
| badge | `src/components/ui/badge.tsx` |
| blur-fade | `src/components/ui/blur-fade.tsx` |
| border-beam | `src/components/ui/border-beam.tsx` |
| button | `src/components/ui/button.tsx` |
| calendar | `src/components/ui/calendar.tsx` |
| collapsible | `src/components/ui/collapsible.tsx` |
| confetti | `src/components/ui/confetti.tsx` |
| dialog | `src/components/ui/dialog.tsx` |
| dot-pattern | `src/components/ui/dot-pattern.tsx` |
| dropdown-menu | `src/components/ui/dropdown-menu.tsx` |
| input | `src/components/ui/input.tsx` |
| magic-card | `src/components/ui/magic-card.tsx` |
| marquee | `src/components/ui/marquee.tsx` |
| number-ticker | `src/components/ui/number-ticker.tsx` |
| particles | `src/components/ui/particles.tsx` |
| popover | `src/components/ui/popover.tsx` |
| progress | `src/components/ui/progress.tsx` |
| scroll-area | `src/components/ui/scroll-area.tsx` |
| select | `src/components/ui/select.tsx` |
| separator | `src/components/ui/separator.tsx` |
| shiny-button | `src/components/ui/shiny-button.tsx` |
| skeleton | `src/components/ui/skeleton.tsx` |
| switch | `src/components/ui/switch.tsx` |
| tabs | `src/components/ui/tabs.tsx` |
| toggle | `src/components/ui/toggle.tsx` |
| tooltip | `src/components/ui/tooltip.tsx` |

## 4. Magic UI Components (available via MCP)

77 components including: animated-beam, border-beam, magic-card, number-ticker, particles, shimmer-button, terminal, blur-fade, animated-gradient-text, meteors, neon-gradient-card, rainbow-button, globe, bento-grid, dock, animated-grid-pattern, flickering-grid, glare-hover, hexagon-pattern, interactive-grid-pattern, kinetic-text, lens, light-rays, line-shadow-text, orbiting-circles, pixel-image, pointer, progressive-blur, pulsating-button, retro-grid, ripple, ripple-button, safari, scroll-based-velocity, scroll-progress, shine-border, shiny-button, smooth-cursor, sparkles-text, spinning-text, striped-pattern, text-3d-flip, text-animate, text-reveal, tweet-card, typing-animation, video-text, warp-background, word-rotate

## 5. Lucide Icons (installed)

1500+ icons via `lucide-react`

---

# WHAT'S MISSING

1. **No visual gallery** — Users cannot browse and select presets visually
2. **No adjustment knobs** — Presets are static; no color/radius/density/motion adjustment
3. **No preset → prompt injection** — Selected preset does not flow into agent system prompts
4. **No preset → component adaptation** — Components do not change their styling based on the selected preset
5. **MCP components not routed per preset** — Presets define recommendations but there's no logic to actually use different components
6. **Sessions tab** — Still 600+ lines of inline raw Tailwind in TerminalPage.tsx
7. **Files tab** — Uses raw divs, not the design system
8. **Context tabs** — Not using the design system
9. **No design taste knobs** — The workspace has no UI for design variance, motion intensity, or visual density

---

# WORKSPACE SIDEBAR STRUCTURE

```
Setup (orange)
├── Presets    — Terminal command presets
├── Configs    — Model settings, auto-assign, sync, costs
└── Fortress   — Backup/safety system

Work (green)
├── Sessions   — AI agent sessions list
├── Map        — Terminal pane layout visual
├── Files      — Agent file browser
└── Workspaces — Saved workspace snapshots

Insights (purple)
├── Analytics  — AI usage stats, charts
├── Prompts    — Prompt history
├── Issues     — Problems and requests
├── Performance — System stats
└── Bugs       — Bug reports

Studio (indigo)
├── Skills     — AI skill management
└── Design     — Design library, taste knobs, component browser

Conductor (rose)
├── Missions   — Multi-agent orchestration
├── Approvals  — Escalation approvals
├── Trace      — Execution trace
├── Budget     — Cost tracking
├── Providers  — Agent providers
├── Templates  — Mission templates
└── Settings   — Conductor config

Context (amber)
├── Context    — Context system toggles
├── Maintenance — Memory, compaction, search
├── Context Map — Visual graph
└── Page Context — Page-specific context
```

---

# DESIGN SKILLS (ALL 7 — FULL DESCRIPTIONS)

## 1. Frontend Design
- **Philosophy:** Design is communication. Every pixel serves cognitive load reduction.
- **Core Principles:** Progressive Disclosure, Density Without Clutter, Glass as Structure, Motion as Feedback, Type as UI
- **Color System:** zinc-950 base, pink-500 accent, cyan-400 info, emerald-400 success, amber-400 warning
- **Typography:** Geist (body), JetBrains Mono (code). Badge 11px, Meta 12px, Body 13px, Card title 13px/600, Section h2 15px/600, Page title 18px/600
- **Animation Tokens:** fast 150ms, normal 250ms, slow 400ms, ease-out cubic-bezier(0.16,1,0.3,1)
- **Anti-patterns:** No box-shadow elevation, no pure black, no >2 fonts, no animating width/height, no default focus rings, no <44px touch targets, no >12px border radius

## 2. Human-Centric UX
- **6 Pillars:** Clarity Over Cleverness, Progressive Disclosure, Visual Hierarchy, Complete State Coverage, Feedback & Micro-interactions, Forgiveness & Affordance
- **#1 Anti-Slop Rule:** EVERY data-driven component must define Empty, Loading, Error, Populated states
- **Checklist:** Primary action obvious in <1s, no raw system tokens, empty/loading/error states, clear hierarchy, progressive disclosure, hover/focus/active/disabled states, 150-300ms transitions, submit feedback, plain-language copy, color+icon meaning, ≥44px targets

## 3. Impeccable
- **7 Dimensions:** Typography (modular scale 1.25, measure 45-75ch), Color (HSL, opacity layers, accent discipline), Spatial (8px grid, density zones), Motion (duration scale, easing library, transform+opacity only), Interaction (hover/active/focus/loading states), Responsive (4 breakpoints, 44px targets), UX Writing (direct, concise, error format)
- **27 Anti-Patterns:** More than 2 fonts, body <14px, line height <1.4, font-thin on dark, inconsistent weights, pure black bg, >3 accents, opacity for text hierarchy, insufficient contrast, color-only state, >45° gradients, cards without boundaries, >24px radius, padding asymmetry, missing hover, animating layout, transition:all, duration >500ms, no reduced-motion, loading spinners >3s, parallax in productivity, arbitrary z-index, fixed widths, <44px targets, hidden content, missing focus, horizontal scroll

## 4. Design Taste System
- **Master Aggregator:** References all design sub-skills
- **Knobs:** DESIGN_VARIANCE (1-10), MOTION_INTENSITY (1-10), VISUAL_DENSITY (1-10)
- **Decision Tree:** Product type → Component purpose → User-facing vs internal → Knob values → Anti-repetition → Anti-patterns
- **Style References:** Claude (warm terracotta), Linear (ultra-minimal purple), Vercel (black/white precision), Stripe (purple gradients), Supabase (dark emerald), Sentry (data-dense), PostHog (playful dark), Raycast (sleek chrome)

## 5. frontend-external-infra
- **MCP Servers:** shadcn (61 components), magicui (77 components), lucide (1500+ icons), @21st-dev/magic (prompt-to-component), motion-dev (animation codegen), unsplash (stock photos), reactbits (135+ animated components), iconify (200k+ icons)
- **Source Routing:** Standard UI → shadcn, Animated effects → Magic UI, Icons → Lucide, Specific component → 21st.dev
- **Re-Skin Rules:** Colors → DeskFlow CSS vars, max rounded-xl, p-5 padding, Geist+JetBrains Mono fonts, dark mode only, glass layer, reduced-motion
- **Anti-Slop Checklist:** Type pairing, Color tokens, Geometry scale, No hero clichés, No section kickers, Real motion, Real imagery, Empty/loading/error states, Lucide icons only, Accessibility focus rings

## 6. Motion — Bring the UI Alive
- **3 Liveliness Levels:**
  - L1 Composed: calm, professional. Motion only for feedback. 120-200ms.
  - L2 Responsive: alive but focused. Micro-interactions + smooth transitions + one ambient accent. 150-300ms. (DEFAULT)
  - L3 Expressive: cinematic. Scroll choreography, ambient backgrounds, springy personality. 200-600ms.
- **4 Motion Families:** Reactive (hover/press/focus), Transitional (enter/exit/tab swap/list stagger), Ambient (breathing glow/gradient drift/shimmer), Narrative/Scroll (scroll-reveal/parallax)
- **Core Principles:** PURPOSE over decoration, SHORTER than you think, ONE motion vocabulary, NATURAL easing, ANIMATE cheap properties, RESPECT reduced-motion, STAGGER to show structure, AMBIENT is seasoning

## 7. UI UX Pro Max
- **Industry Rules:** Developer Tools (dark chrome, monospace, high density, fast motion), Project Management (ultra-clean, subtle color coding), Financial (precision, tabular data), AI/ML (conversational, warm), Analytics (chart-forward, playful)
- **Style Library:** Dark Glass, Neo-Brutalist, Swiss Grid, Material You, Cupertino, Terminal Chic, Editorial, Cyberpunk, Bauhaus, Minimalist
- **Typography Pairing:** Geist (UI) + JetBrains Mono (code). Maximum contrast between heading/body fonts.

---

# MCP COMPONENT INVENTORY (COMPLETE)

## shadcn/ui (32 installed)

| Component | Category | Use For |
|-----------|----------|---------|
| accordion | Layout | Expandable content sections |
| alert-dialog | Overlay | Confirmation dialogs |
| animated-circular-progress-bar | Data Viz | Circular progress indicators |
| animated-gradient-text | Typography | Animated gradient headings |
| animated-shiny-text | Typography | Shimmer text effects |
| aurora-text | Typography | Aurora text glow effect |
| badge | Data Display | Status/category badges |
| blur-fade | Effect | Blur transition animation |
| border-beam | Effect | Animated border light |
| button | Form | Primary/secondary/ghost actions |
| calendar | Form | Date picker |
| collapsible | Layout | Expandable/collapsible sections |
| confetti | Effect | Celebration animation |
| dialog | Overlay | Modal dialogs |
| dot-pattern | Background | SVG dot pattern |
| dropdown-menu | Navigation | Dropdown menus |
| input | Form | Text input fields |
| magic-card | Card | Mouse-following glow card |
| marquee | Effect | Infinite scrolling text |
| number-ticker | Data Viz | Animated number counter |
| particles | Background | Floating particle effects |
| popover | Overlay | Popover panels |
| progress | Data Viz | Progress bars |
| scroll-area | Layout | Custom scrollable areas |
| select | Form | Dropdown selectors |
| separator | Layout | Visual dividers |
| shiny-button | Button | Shimmering button effect |
| skeleton | Loading | Loading placeholders |
| switch | Form | Toggle switches |
| tabs | Navigation | Tab navigation |
| toggle | Form | Toggle buttons |
| tooltip | Overlay | Hover tooltips |

## Magic UI (77 available via MCP)

| Component | Category | Use For |
|-----------|----------|---------|
| animated-beam | Effect | Connecting line animation |
| animated-circular-progress-bar | Data Viz | Circular gauge |
| animated-gradient-text | Typography | Gradient text animation |
| animated-grid-pattern | Background | Grid pattern background |
| animated-list | Layout | Staggered list animation |
| animated-shiny-text | Typography | Shimmer text effect |
| aurora-text | Typography | Aurora glow text |
| bento-grid | Layout | Bento-style grid |
| blur-fade | Effect | Blur transition |
| border-beam | Effect | Animated border light |
| confetti | Effect | Confetti animation |
| dot-pattern | Background | SVG dot pattern |
| flickering-grid | Background | Flickering grid effect |
| glare-hover | Effect | Diagonal glare on hover |
| globe | 3D | Interactive 3D globe |
| hexagon-pattern | Background | Hexagon pattern |
| hyper-text | Typography | Scramble text animation |
| interactive-grid-pattern | Background | Interactive grid |
| kinetic-text | Typography | Font weight animation |
| lens | Effect | Zoom lens component |
| light-rays | Effect | Animated light rays |
| line-shadow-text | Typography | Moving line shadow |
| magic-card | Card | Mouse-following glow |
| marquee | Effect | Infinite scroll |
| meteors | Effect | Meteor shower |
| morphing-text | Typography | Text morphing |
| neon-gradient-card | Card | Neon card effect |
| number-ticker | Data Viz | Animated counter |
| orbiting-circles | Effect | Orbiting circles |
| particles | Background | Floating particles |
| pixel-image | Effect | Pixelated image |
| pointer | Effect | Cursor pointer |
| progressive-blur | Effect | Progressive blur gradient |
| pulsating-button | Button | Pulsating button |
| rainbow-button | Button | Rainbow effect button |
| retro-grid | Background | Retro grid animation |
| ripple | Effect | Ripple effect |
| ripple-button | Button | Button with ripple |
| safari | Mockup | Safari browser mockup |
| scroll-based-velocity | Typography | Scroll-speed text |
| scroll-progress | Data Viz | Scroll progress indicator |
| shimmer-button | Button | Shimmer button effect |
| shine-border | Effect | Animated shine border |
| shiny-button | Button | Shiny button effect |
| smooth-cursor | Effect | Smooth cursor animation |
| sparkles-text | Typography | Sparkle text effect |
| spinning-text | Typography | Spinning text |
| striped-pattern | Background | Striped pattern |
| terminal | Display | Terminal-style display |
| text-3d-flip | Typography | 3D text flip |
| text-animate | Typography | Text animation |
| text-reveal | Typography | Scroll text reveal |
| tweet-card | Card | Tweet display card |
| typing-animation | Typography | Typing animation |
| video-text | Typography | Video text effect |
| warp-background | Background | Warp background |
| word-rotate | Typography | Rotating words |

## Lucide Icons (1500+ installed)

All icons from `lucide-react`. Never use emoji as UI icons.

---

# WHAT NEEDS TO BE DESIGNED

## 1. Design Preset Manager
A UI component where users can:
- Browse a visual gallery of preset cards (each showing icon, name, description, color swatches)
- Click a preset to select it
- See a live preview of the selected preset
- Adjust knobs: color shift, border radius, density, motion intensity, glass toggle
- Save the adjusted preset configuration
- The selected preset is stored in workspace state

## 2. Preset → Prompt Injection
When an AI session is created, the selected preset's design directive is appended to the system prompt (as Layer 9). The directive tells the AI exactly what visual style to use.

## 3. Preset → Component Adaptation
Components in the workspace should adapt to the selected preset via CSS custom properties on the workspace root element.

## 4. MCP Component Routing per Preset
Each preset recommends specific MCP components. The system should use these recommendations when generating or rendering components.

## 5. Design Taste Knobs
The workspace should have UI for adjusting design variance (1-10), motion intensity (1-10), and visual density (1-10).

---

# WHAT THE TARGET AI SHOULD DO

You are the **Lead Designer and Engineer**. You have full freedom to:
- Design the component architecture
- Design the data flow
- Design the visual layout
- Design the adjustment mechanism
- Design how presets flow into agent prompts
- Design how components adapt to presets
- Design the MCP component routing per preset
- Design the preview mechanism

You have access to all components listed above and all design skills listed above.

## Design Directive Format (for prompt injection)

The target AI should design this format:

```
## Design Directive — [Preset Name]

You MUST follow this design preset exactly.

**Colors:** [exact hex values]
**Geometry:** [border-radius, border-width, card-padding]
**Typography:** [font-family, mono font, base size]
**Motion:** [duration, easing, animation intensity]
**Effects:** [glass, glow, shadow]
**Density:** [airy/comfortable/compact/dense]
**MCP Components:** [cards, buttons, effects, typography recommendations]
**Rules:** [MUST-follow rules]
```
