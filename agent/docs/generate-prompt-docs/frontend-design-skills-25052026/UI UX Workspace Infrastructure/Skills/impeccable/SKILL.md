---
id: impeccable
name: Impeccable
version: 1.0.0
category: design
tags: [design-system, typography, color, motion, spatial, interaction, responsive, ux-writing]
---

# Impeccable Design Skill

## Philosophy

Impeccable design is invisible — it removes friction so completely that users don't notice it. This skill provides domain-specific reference knowledge across 7 design dimensions, 23 actionable commands, and 27 anti-patterns to guard against.

## 7 Domain References

### 1. Typography
- **Scale**: Use a modular scale (1.25 ratio) for font sizes: 12, 15, 18.75, 23.44, 29.3, 36.6px
- **Line height**: 1.5 for body, 1.2 for headings, 1.6 for terminal/code
- **Measure**: 45-75 characters per line for readability (use `max-w-prose` or `max-w-[65ch]`)
- **Font stack**: Geist (sans) + JetBrains Mono (code). Fallback: system-ui, -apple-system, sans-serif
- **Weight hierarchy**: 400 (body), 500 (labels), 600 (headings), 700 (hero). NEVER use 300 on dark backgrounds.
- **Anti-pattern**: Using `font-thin` (100) on dark zinc backgrounds — becomes illegible below 400 weight

### 2. Color
- **HSL for dark themes**: Use `hsl()` over hex for systematic dark theme adjustments. Shift lightness ±5% for hover states.
- **Opacity layers**: Build color depth through opacity, not new hex values. `bg-pink-500/10` + `border-pink-500/20` creates depth without palette bloat.
- **Accent discipline**: One primary accent (pink-500), one secondary (cyan-400), one semantic (emerald/amber/red). Never exceed 3 accent colors in a view.
- **Contrast ratios**: Minimum 4.5:1 for body text, 3:1 for large text/UI components. Use WebAIM contrast checker mentally.
- **Anti-pattern**: Using `opacity-50` on text — reduces contrast unpredictably. Use dedicated text color tokens instead.

### 3. Spatial
- **8px grid**: All spacing must be multiples of 8px (4px for micro-adjustments only).
- **Density zones**: 
  - **High density** (terminal, data tables): 4-8px gaps, compact padding
  - **Medium density** (forms, lists): 12-16px gaps
  - **Low density** (hero, empty states): 24-48px gaps
- **Z-index discipline**: 
  - 0: base content
  - 10: elevated cards
  - 20: dropdowns, tooltips
  - 30: modals, dialogs
  - 40: toasts, notifications
  - 50: overlays, backdrops
- **Anti-pattern**: Arbitrary z-index values (999, 1000) — use the scale above.

### 4. Motion
- **Duration scale**:
  - Micro (0-100ms): color changes, opacity toggles
  - Fast (100-200ms): hover states, button presses
  - Normal (200-300ms): dropdowns, accordions
  - Slow (300-500ms): modals, page transitions
  - Dramatic (500-800ms): onboarding, celebratory
- **Easing library**:
  - `ease-out`: UI feedback (buttons, toggles)
  - `ease-in-out`: Symmetric animations (modals, drawers)
  - `spring`: Playful interactions (badges, reactions)
  - `linear`: Continuous motion (spinners, progress)
- **Performance**: Only animate `transform` and `opacity`. Never `width`, `height`, `top`, `left`, `margin`, `padding`.
- **Anti-pattern**: `transition: all 0.3s` — specify exact properties to prevent unintended transitions.

### 5. Interaction
- **Hover states**: Every interactive element MUST have a hover state. Minimum: `opacity-80` or `brightness-110`.
- **Active states**: Pressed state should be 10% darker/lighter than hover. Use `scale-[0.98]` for tactile feedback.
- **Focus visible**: Replace default outline with `ring-2 ring-pink-500/50 ring-offset-2 ring-offset-zinc-950`.
- **Loading states**: Never show a disabled button without a spinner. Use `opacity-50 cursor-wait` + spinner.
- **Anti-pattern**: Disabled buttons that look like enabled buttons — always use `opacity-40` + `cursor-not-allowed`.

### 6. Responsive
- **Breakpoints**: Mobile-first with 4 breakpoints:
  - `sm`: 640px (large phones)
  - `md`: 768px (tablets)
  - `lg`: 1024px (laptops)
  - `xl`: 1280px (desktops)
- **Container queries**: Use `@container` for component-level responsiveness (sidebar vs main content).
- **Touch targets**: Minimum 44×44px for all interactive elements, even on desktop.
- **Anti-pattern**: Hiding content on mobile instead of reorganizing it. Never use `hidden md:block` for primary content.

### 7. UX Writing
- **Voice**: Direct, concise, action-oriented. No "Please" or "Sorry" in error messages.
- **Error format**: "[Thing] [verb] because [reason]. [Action to fix]."
  - Good: "Session failed to save because the disk is full. Free up space and retry."
  - Bad: "Oops! Something went wrong. Please try again later."
- **Button labels**: Use verb + noun. "Save workspace" not "Save". "Generate prompt" not "Submit".
- **Empty states**: Explain what WOULD be there, not just "No data". "No sessions yet. Start a terminal to create your first session."
- **Anti-pattern**: Technical jargon in user-facing copy. Use "workspace" not "PTY instance", "session" not "terminal binding".

## 23 Commands

| Command | Purpose | When to use |
|---------|---------|-------------|
| `craft` | Generate a new component from scratch | User asks for a new UI element |
| `teach` | Explain a design decision | User asks "why" about a design choice |
| `document` | Write design system docs | Creating or updating DESIGN.md |
| `extract` | Pull design tokens from existing code | Analyzing current styles |
| `shape` | Refactor layout without changing content | Reorganizing a cluttered component |
| `critique` | Review design against anti-patterns | User shares a screenshot or code |
| `audit` | Full accessibility/contrast check | Pre-release verification |
| `polish` | Micro-interactions and hover states | Component feels "flat" or "dead" |
| `bolder` | Increase visual weight/density | UI feels too light or insubstantial |
| `quieter` | Reduce visual noise | UI feels cluttered or overwhelming |
| `distill` | Remove unnecessary elements | Feature bloat or over-design |
| `harden` | Add error/empty/loading states | Component only handles happy path |
| `onboard` | Create first-run experience | New feature needs introduction |
| `animate` | Add motion to static component | State changes feel abrupt |
| `colorize` | Apply or refine color scheme | Colors feel arbitrary or off-brand |
| `typeset` | Fix typography hierarchy | Text feels unreadable or unstructured |
| `layout` | Reorganize spatial relationships | Elements feel misaligned or cramped |
| `delight` | Add surprise-and-delight moment | User wants "wow" factor |
| `overdrive` | Maximize visual impact (use sparingly) | Marketing page, hero section |
| `clarify` | Improve information hierarchy | User is confused by the UI |
| `adapt` | Make component responsive | Works on one size, breaks on others |
| `optimize` | Performance audit for animations | Jank, frame drops, slow interactions |
| `live` | Real-time design preview loop | Iterative design with user |

## 27 Anti-Patterns by Category

### Fonts (5)
1. Using more than 2 font families in one view
2. Body text below 14px on desktop
3. Line height below 1.4 for body text
4. Using `font-thin` (100-200) on dark backgrounds
5. Inconsistent font weights across similar elements

### Colors (6)
6. Pure black (`#000`) backgrounds
7. More than 3 accent colors in a single view
8. Using `opacity` to create text hierarchy instead of dedicated tokens
9. Insufficient contrast ratios (< 4.5:1 for body)
10. Color as the ONLY indicator of state (always pair with icon or text)
11. Gradients that span more than 45° or use more than 3 color stops

### Cards (4)
12. Cards without clear boundaries (no border or shadow)
13. Excessive border-radius (> 24px for small cards)
14. Padding asymmetry (different on all sides without purpose)
15. Missing hover state on clickable cards

### Animations (6)
16. Animating layout properties (width, height, margin)
17. `transition: all` instead of specific properties
18. Duration > 500ms for UI feedback animations
19. No reduced-motion fallback (`@media (prefers-reduced-motion)`)
20. Loading spinners without progress indication for > 3s operations
21. Parallax or scroll-jacking in productivity tools

### Layout (6)
22. Arbitrary z-index values (999, 10000)
23. Fixed widths that break on smaller screens
24. Touch targets below 44×44px
25. Content hidden on mobile instead of reorganized
26. Missing focus indicators on interactive elements
27. Horizontal scroll on primary content area

## Activation Criteria

**Activate when:**
- User asks for "better UI", "make it look good", "polish this", "design review"
- Generating components that will be user-facing (not internal tools)
- Working with CSS, Tailwind, or styling questions
- User mentions "looks like AI generated" or "generic"
- Creating dashboard, settings, or data visualization components

**Do NOT activate when:**
- User is writing backend code or database queries
- User explicitly asks for "functional only, no styling"
- Working with internal debugging or logging output
