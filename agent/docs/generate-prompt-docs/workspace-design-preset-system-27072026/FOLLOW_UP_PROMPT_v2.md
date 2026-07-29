# FOLLOW-UP PROMPT — Design Preview System + Theme Constructor

## Raw Request

"the tabs and verythign about hte terminal onthe owrkspace is not working. the ui is compeltely broken for hte terminal. the page ifor hte terinal is split in half, and the ui is jut completely broken and split into pieces"

"the showing of hte preview design on the list of detsigns is NOT accurate and is not shoing proper design and not showcasing a lot of the feature like animation and like actual button interactions and different like stuff it only covers like ismpel butotns and text and doesnt actually have a solid theme .adn we should have afeature of like a theme constructor where we canselect like the fonts and stuff and like the animatinos and hte oclors and everythign to cusomize those bsaed preview set which should also be already packaged with all of the compnents and intecate showcasing of each individual features of hte design"

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` as the source of truth for code structure, data shapes, and architecture. The target AI must read this first.

---

# THE SITUATION

## What Exists Today

The DeskFlow workspace has a design preset system with 7 styles (Flat, Skeuomorphism, Neumorphism, Glassmorphism, Dark Mode, Minimalism, Brutalism). Each style has exact CSS math, style options, and MCP routing rules. There is a `DesignStudioTab` component that shows a visual gallery of styles and a live preview.

## The Problem

1. **The preview is too simple** — It only shows buttons and text. It does NOT showcase:
   - Animations (hover, transitions, ambient effects)
   - Button interactions (press, focus, disabled states)
   - Card layouts with proper styling
   - Input fields with focus states
   - Status badges and indicators
   - The actual visual identity of each style

2. **No theme constructor** — Users cannot customize:
   - Fonts (font family, weight, size)
   - Colors (accent, background, text, border)
   - Animations (duration, easing, intensity)
   - Border radius
   - Spacing/density
   - Glass/glow effects

3. **The preview doesn't feel like a real app** — It's just a static card with a button. It should feel like a miniature version of the actual workspace with real components.

## What Needs to Be Built

### A. Rich Design Preview Component

A preview that showcases EVERY aspect of a design style:

**Layout:**
- Header bar with navigation dots
- Main content area with card grid
- Sidebar panel with settings
- Footer with status indicators

**Components to showcase:**
- Buttons (primary, secondary, ghost, disabled, loading)
- Cards (default, interactive, elevated, with accent rails)
- Input fields (text, search, with focus states)
- Status badges (active, inactive, warning, error)
- Toggle switches (on/off states)
- Progress bars (indeterminate, determinate)
- Navigation tabs (active/inactive states)
- Tooltips on hover
- Animated elements (number tickers, progress animations)
- Color swatches showing the palette
- Typography samples (heading, body, caption, code)

**Interactions:**
- Hover effects on all interactive elements
- Click animations (press scale, ripple)
- Focus ring visibility on keyboard navigation
- Disabled state styling
- Loading state spinners

### B. Theme Constructor Component

A panel where users can customize the selected style:

**Font Controls:**
- Font family selector (Inter, Geist, SF Pro, JetBrains Mono)
- Font weight slider (400-700)
- Base size slider (12-16px)
- Line height slider (1.2-1.8)

**Color Controls:**
- Accent color picker (hue wheel + saturation/lightness)
- Background shade slider (darker/lighter)
- Text contrast slider
- Border color picker
- Success/Warning/Error color overrides

**Geometry Controls:**
- Border radius slider (0-24px)
- Border width slider (0-3px)
- Card padding slider (8-32px)
- Spacing scale slider (tight ↔ spacious)

**Animation Controls:**
- Duration slider (0-500ms)
- Easing selector (linear, ease-out, ease-in-out, spring)
- Animation intensity (none, subtle, moderate, expressive)
- Glass blur toggle + slider (0-32px)
- Glow toggle + color picker

**Effects Controls:**
- Shadow depth slider (none ↔ strong)
- Glass opacity slider (0-100%)
- Backdrop blur toggle
- Glow radius slider

### C. Style-Specific Preview Variations

Each of the 7 styles should have a DIFFERENT preview layout that showcases its unique characteristics:

| Style | Preview Focus | Unique Showcase |
|-------|--------------|-----------------|
| Flat | Color blocks, clean borders | Solid color transitions, no shadows |
| Skeuomorphism | Gradient buttons, depth layers | Inset/outset shadows, texture samples |
| Neumorphism | Dual-shadow cards, extruded buttons | Light/dark shadow pairs, pressed states |
| Glassmorphism | Frosted panels over gradient bg | Backdrop blur, transparency layers |
| Dark Mode | High-contrast elements, OLED black | Contrast ratios, accent glow |
| Minimalism | Maximum whitespace, typography | Font weights, spacing, no borders |
| Brutalist | Thick borders, monospace, clashing | Raw colors, sharp corners, density |

### D. MCP Component Integration

The preview should USE real MCP components, not just styled divs:

| Preview Element | MCP Source | Component |
|----------------|------------|-----------|
| Cards | shadcn | `card` |
| Buttons | shadcn | `button` |
| Inputs | shadcn | `input` |
| Toggles | shadcn | `switch` |
| Badges | shadcn | `badge` |
| Progress | shadcn | `progress` |
| Tabs | shadcn | `tabs` |
| Tooltips | shadcn | `tooltip` |
| Scroll areas | shadcn | `scroll-area` |
| Animated cards | Magic UI | `magic-card` |
| Border effects | Magic UI | `border-beam` |
| Number counters | Magic UI | `number-ticker` |
| Particle backgrounds | Magic UI | `particles` |
| Text animations | Magic UI | `animated-gradient-text` |
| Shimmer effects | Magic UI | `shimmer-button` |

### E. Design Directive Output

When a style is selected and customized, generate a complete design directive:

```
## Design Directive — [Style Name] (Customized)

**Colors:**
- Background: [exact hex]
- Surface: [exact hex]
- Border: [exact hex]
- Accent: [exact hex]
- Text: [exact hex]
- Text Muted: [exact hex]
- Success: [exact hex]
- Warning: [exact hex]
- Error: [exact hex]

**Typography:**
- Font Family: [exact font stack]
- Mono Font: [exact font stack]
- Base Size: [exact px]
- Line Height: [exact ratio]
- Font Weights: normal=[400], medium=[500], semibold=[600]

**Geometry:**
- Border Radius: [exact px]
- Border Width: [exact px]
- Card Padding: [exact px]
- Spacing Scale: xs=[4px], sm=[8px], md=[12px], lg=[16px], xl=[24px]

**Motion:**
- Duration: [exact ms]
- Easing: [exact cubic-bezier]
- Animation Intensity: [none/subtle/moderate/expressive]
- Glass Blur: [exact px or none]
- Glow: [enabled/disabled, color if enabled]

**MCP Components (whitelist):**
[exact list of allowed components]

**MCP Components (blacklist):**
[exact list of forbidden components]

**Rules:**
[list of MUST-follow rules for this style]
```

## Engineering Freedom

You are free to:
- Design the preview component architecture
- Design the theme constructor layout
- Design how customization affects the preview in real-time
- Design how the customized style saves/loads
- Design how the style options flow into the design directive
- Design the animation system for the preview
- Design the color picker interface
- Design the font selector interface

## Anti-Slop Checklist

After your solution is complete, verify:
1. Preview showcases ALL component types (not just buttons)
2. Animations are visible and match the style's intensity
3. Theme constructor has real-time preview updates
4. Each style has a DIFFERENT preview layout
5. MCP components are actually used (not just styled divs)
6. Color picker is intuitive (not just hex input)
7. Font selector shows actual font previews
8. Animation controls have visual feedback
9. The preview feels like a miniature app, not a static card
10. All 7 styles are distinctly different in the preview
