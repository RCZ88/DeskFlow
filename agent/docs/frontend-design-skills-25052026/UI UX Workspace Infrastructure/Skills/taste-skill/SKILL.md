---
id: taste-skill
name: Taste Skill
version: 1.0.0
category: design
tags: [taste, knobs, variance, motion, density, aesthetic]
---

# Taste Skill

## Philosophy

Design taste is not subjective — it is configurable. This skill exposes three tunable knobs that control the aggressiveness, dynamism, and information density of generated designs. The agent reads these values from the context configuration and adapts its output accordingly.

## The Three Knobs

### DESIGN_VARIANCE (1-10)
Controls how much the design deviates from safe, conventional patterns.

| Value | Name | Behavior |
|-------|------|----------|
| 1-2 | Conservative | Stick to established patterns. Minimal risk. Bootstrap/Material defaults. |
| 3-4 | Safe | Subtle refinements. Minor customizations. Professional but generic. |
| 5-6 | Balanced | Mix of safe and bold. One distinctive element per component. |
| 7-8 | Expressive | Strong personality. Custom animations, unique layouts, bold colors. |
| 9-10 | Experimental | Break conventions. Avant-garde layouts, extreme motion, artistic risks. |

**DeskFlow Default: 5** (Balanced — professional dev tool with personality)

### MOTION_INTENSITY (1-10)
Controls the amount, complexity, and prominence of animations.

| Value | Name | Behavior |
|-------|------|----------|
| 1-2 | Static | No animations. Instant state changes. Maximum performance. |
| 3-4 | Subtle | Only essential motion (hover states, focus rings). 150ms max. |
| 5-6 | Moderate | Standard transitions (250ms). Fade, slide, scale. No physics. |
| 7-8 | Dynamic | Spring physics, staggered entrances, scroll-driven effects. |
| 9-10 | Cinematic | Complex choreography, particle effects, 3D transforms, long sequences. |

**DeskFlow Default: 5** (Moderate — responsive but not distracting for productivity)

### VISUAL_DENSITY (1-10)
Controls how much information and visual elements fit in a given space.

| Value | Name | Behavior |
|-------|------|----------|
| 1-2 | Airy | Maximum whitespace. Single focus per screen. Editorial feel. |
| 3-4 | Spacious | Generous padding. Clear separation. Easy scanning. |
| 5-6 | Balanced | Standard density. Comfortable for extended use. |
| 7-8 | Dense | Tight packing. Information-rich. Power-user oriented. |
| 9-10 | Maximal | Every pixel carries information. Bloomberg terminal density. |

**DeskFlow Default: 7** (Dense — data-heavy dashboard with terminal integration)

## Current Configuration

```
DESIGN_VARIANCE:   {{design_variance}}
MOTION_INTENSITY:  {{motion_intensity}}
VISUAL_DENSITY:    {{visual_density}}
```

## Aesthetic Variant Matrix

Combine knobs to produce specific aesthetic directions:

| Variance | Motion | Density | Resulting Aesthetic |
|----------|--------|---------|-------------------|
| Low (1-3) | Low (1-3) | Low (1-3) | Corporate minimalism — IBM, McKinsey |
| Low (1-3) | Low (1-3) | High (7-10) | Bloomberg terminal — dense data, no fluff |
| Low (1-3) | High (7-10) | Low (1-3) | Apple marketing — sparse but cinematic |
| Low (1-3) | High (7-10) | High (7-10) | Cyberpunk HUD — dense data, extreme motion |
| High (7-10) | Low (1-3) | Low (1-3) | Brutalist web — bold shapes, static, airy |
| High (7-10) | Low (1-3) | High (7-10) | Neo-brutalist dashboard — bold, dense, static |
| High (7-10) | High (7-10) | Low (1-3) | Experimental art — sparse but chaotic |
| High (7-10) | High (7-10) | High (7-10) | Maximalist chaos — everything, everywhere |
| Mid (4-6) | Mid (4-6) | Mid (4-6) | Balanced SaaS — Stripe, Notion, Linear |

## Anti-Repetition Rules

To prevent "AI slop" (same fonts, same gradients, same cards):

1. **Font Rotation**: If the last 3 components used Geist, switch to Inter or SF Pro for variety.
2. **Color Shift**: If the last design used pink accent, try cyan or emerald for the next.
3. **Shape Variation**: Alternate between sharp corners (0px), subtle rounding (4-6px), and heavy rounding (12-16px) based on component purpose.
4. **Pattern Break**: Every 5th component should break ONE convention from the previous 4 (different shadow style, different border treatment, etc.).
5. **Contextual Memory**: Before generating, check: "What was the last accent color used? What was the last border radius? What was the last animation style?" — then consciously vary.

## Implementation Guide for Agents

When generating UI with taste skill active:

1. Read the three knob values from context
2. Apply the corresponding behavior from the tables above
3. Check anti-repetition rules against recent generation history
4. Log the design choices made: "Using variance=5 (balanced), motion=5 (moderate), density=7 (dense)"
5. If user feedback contradicts the knobs, suggest adjusting the slider rather than one-off fixes

## Activation Criteria

**Activate when:**
- User wants to "make it look different", "less generic", "more interesting"
- User complains about "AI-looking" output
- Setting up a new project and need aesthetic direction
- User explicitly mentions taste, style, or visual personality

**Do NOT activate when:**
- User has provided exact design specs or mockups
- Working on internal debugging/admin tools where function > form
- User explicitly requests "default" or "standard" styling
