# PROMPT — Presentation Slide Prompt Audit

## Raw Request

The user has an existing prompt (`PROMPT_GENERATE_SLIDE`) used to generate interactive HTML/CSS/JS presentation slides from an external AI. The prompt is stored in `src/services/presentation/prompts.ts`. The external AI has NO access to any files, repositories, or codebase — it only has the system prompt. The prompt needs to be audited and improved to include ALL design skills, MCP components, visual grounding patterns, anti-slop rules, motion budgets, and theme tokens inline.

The user wants an external AI to:
1. **Read** the current PROMPT_GENERATE_SLIDE (provided below in the Context Bundle)
2. **Audit** it against every skill, design system, and quality standard
3. **Identify gaps** — what's missing, what's referenced but not included, what's incomplete
4. **Produce a RESULT.md** with a fully rewritten PROMPT_GENERATE_SLIDE that includes EVERYTHING inline

## Context Bundle

### Current PROMPT_GENERATE_SLIDE (the prompt to audit)

```
You are a senior frontend engineer + design specialist. Your task is to generate a single, self-contained HTML/CSS/JS presentation slide as inline HTML.

## Task
{{CONTENT}}

Slide count: {{SLIDE_COUNT}}
Mode: {{MODE}}

## Layout Options
- full-bleed: edge-to-edge content
- split-left: 55/45 two-column
- split-right: 45/55 two-column
- minimal: headline + subtitle + small element

## Design System
CSS variables:
--bg: #0A0A0B
--surface: rgba(255,255,255,0.03)
--border: rgba(255,255,255,0.08)
--fg: #FAFAFA
--muted: #8B8B8B
--accent: #10b981

Font stack: Inter for UI, JetBrains Mono for code. Import via Google Fonts @import.

## Visual Grounding Pattern
Each slide MUST have a "visual anchor" — a large, prominent visual element that occupies 50-70% of the viewport.

Good anchors: Canvas/WebGL, code blocks with syntax highlighting, animated diagrams, interactive demos, large numbers with tickers.

Bad anchors: Text-only, hero images, decorative blobs, fake gradients.

## Anti-Slop Checklist (verify before output)
- [ ] Uses native <select>, <input type="range">, <details>/<summary> — never fake divs
- [ ] No purple gradients, no glassmorphism — flat dark surfaces only
- [ ] Inter font, not system-ui
- [ ] Hover states on every interactive element
- [ ] Focus-visible rings on all controls
- [ ] Content is real data, not lorem ipsum

## Code Quality
- Single <style> block, no external CSS
- All JS inline in <script>
- No external dependencies (no React, no CDN libraries)
- Use IntersectionObserver for scroll-triggered animations
- Use CSS custom properties for theming
- Mobile-friendly (min-width: 320px)
- All animations use CSS transitions or requestAnimationFrame
- Numbers animate with a counting effect on viewport entry
- Accessibility: aria-labels, semantic HTML, reduced-motion media query

## Interactivity Budget
Each slide MUST include at least ONE interactive element:
- Hover state that reveals or changes content
- Click/press state with visual feedback
- Scroll-triggered number counter or bar chart
- Animated progress ring or bar
- Step-through reveal (click to show next)
- Toggle or switch that changes state

Output ONLY the raw HTML. No markdown fences, no explanation, no commentary.
```

### What the prompt is SUPPOSED to include (referenced but missing)

The following skills and systems are referenced by name in the design pipeline but their CONTENT is not included in the prompt. The external AI cannot read these files — it needs the full content inline.

#### 1. Frontend External Infrastructure (MCP Components)

The prompt references MCP components but doesn't include the actual component APIs or code patterns. The external AI needs:

- **shadcn/ui** component patterns: button, card, dialog, input, select, tabs, tooltip — with exact HTML/CSS structure
- **Magic UI** patterns: animated-beam, border-beam, magic-card, number-ticker, particles — with vanilla JS equivalents
- **Lucide icons** — a curated list of 20-30 icons most useful for presentations (TrendingUp, BarChart3, Sparkles, etc.) with inline SVG equivalents
- **21st.dev** component patterns — any unique patterns not covered by shadcn

#### 2. Visual Grounding System

The prompt references "visual anchoring" but doesn't include the full visual grounding patterns:

- **The 12 visual primitives**: Hero Number, Code Block, Diagram, Chart, Interactive Demo, Progress Ring, Step-Through, Comparison, Timeline, Quote, Icon Grid, Data Table
- **Each primitive needs**: HTML structure, CSS styling, JS interactivity, when to use it, when NOT to use it
- **Example code** for each primitive (vanilla HTML/CSS/JS)

#### 3. Micro-Interactions Library

The prompt mentions "interactive elements" but doesn't include the full micro-interaction library:

- **Hover Effects**: card-lift, glow-expand, color-shift, border-animate, text-reveal
- **Click Effects**: ripple, press-scale, toggle-switch, step-reveal
- **Scroll Effects**: counter-tick, bar-grow, fade-slide, parallax
- **Focus Effects**: ring-pulse, border-highlight
- **Each effect needs**: CSS code, JS code, when to use, anti-patterns to avoid

#### 4. Design Tokens (Complete)

The prompt has basic tokens but missing:

- **Typography scale**: display (48px/600), h1 (32px/600), h2 (24px/500), body (16px/400), caption (13px/400), overline (10px/600/uppercase)
- **Spacing scale**: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
- **Border radius**: sm (8px), md (12px), lg (16px), xl (20px)
- **Shadow system**: elevated (0 2px 8px rgba(0,0,0,0.3)), floating (0 8px 32px rgba(0,0,0,0.4))
- **Transition timing**: ease-out (200ms), ease-in-out (300ms), spring (500ms cubic-bezier(0.34,1.56,0.64,1))

#### 5. Anti-Slop Patterns (Expanded)

The checklist is good but needs:

- **Specific anti-patterns with examples** of what NOT to do
- **The "AI slop" signature** — how to recognize it (purple gradients, glassmorphism, system-ui font, no hover states, lorem ipsum)
- **Replacement patterns** — for each anti-pattern, what to do instead

#### 6. Theme System

The prompt has one theme (--bg: #0A0A0B) but needs:

- **Multiple theme presets**: Vercel Dark, Cyberpunk, Minimalist Mono, Warm Dark
- **Full token set per theme**: bg, surface, border, fg, muted, accent, accent2, warning, fontHeader, fontBody, fontMono
- **Instructions on how to apply themes** — swap CSS variables, not rewrite styles

#### 7. Slide Structure Patterns

The prompt doesn't include:

- **Hook slide pattern**: bold statement + visual anchor + subtle animation
- **Value slide pattern**: concept explanation + diagram + code example
- **Visual-only slide pattern**: full-bleed canvas/demo + minimal text overlay
- **CTA slide pattern**: key takeaway + action prompt + visual summary
- **Each pattern needs**: HTML structure, CSS layout, JS interactivity, example content

#### 8. Content Processing

The prompt doesn't explain how to:

- **Extract key insights** from a topic description
- **Break a topic into slide-sized chunks**
- **Map concepts to visual primitives** (e.g., "neural network" → diagram, "performance" → chart, "code" → code block)
- **Generate meaningful headlines** that aren't just topic titles

#### 9. Accessibility Standards

The prompt mentions "aria-labels" but needs:

- **Complete accessibility checklist**: semantic HTML, heading hierarchy, color contrast (4.5:1 minimum), keyboard navigation, screen reader labels, reduced-motion support
- **Example accessible patterns** for each interactive element

#### 10. Export Quality

The prompt doesn't mention:

- **Pixel density**: content must render at 2x for Retina export
- **Color accuracy**: use exact hex values, not color-mix()
- **Font loading**: ensure fonts are loaded before render (use Font Loading API or preload)
- **Fixed dimensions**: slides must be exactly 1080×960 pixels

## Your Task

You are auditing the current PROMPT_GENERATE_SLIDE against the 10 categories above.

### Step 1: Score each category (1-10)
For each of the 10 categories, rate the current prompt:
- 1-3: Missing or severely incomplete
- 4-6: Referenced but not fully included
- 7-8: Mostly complete, minor gaps
- 9-10: Complete and production-ready

### Step 2: Identify critical gaps
For each category scored below 7, list:
- What's missing
- Why it matters (the external AI can't access files)
- What specifically needs to be added

### Step 3: Rewrite the prompt
Produce a COMPLETE, REWRITTEN PROMPT_GENERATE_SLIDE that:
- Includes ALL content inline (the external AI has no file access)
- Covers all 10 categories
- Is production-ready (the external AI can generate slides from this prompt alone)
- Stays under 8000 tokens (the prompt itself, not the generated output)
- Uses the structured slide plan format (PlannedSlide[] with frame, purpose, layout, visual, interactivity)

### Step 4: Validate the rewrite
Run the rewritten prompt through these checks:
- [ ] Does it include actual HTML/CSS/JS code examples for visual primitives?
- [ ] Does it include actual CSS code for micro-interactions?
- [ ] Does it include actual SVG/icon code for common icons?
- [ ] Does it include complete theme token sets?
- [ ] Does it include slide structure patterns with HTML templates?
- [ ] Does it include accessibility requirements with specific standards?
- [ ] Does it include export quality requirements?
- [ ] Does it include anti-slop patterns with specific examples?
- [ ] Does it include content processing instructions?
- [ ] Is it under 8000 tokens?

## Output Format

Save the result to `agent/docs/generate-prompt-docs/presentation-slide-prompt-audit/RESULT.md` with:

1. **Audit Scorecard** — scores for each of the 10 categories
2. **Gap Analysis** — detailed list of what's missing per category
3. **Rewritten PROMPT_GENERATE_SLIDE** — the complete, production-ready prompt
4. **Validation Checklist** — pass/fail for each of the 10 checks above

## Constraints

- The rewritten prompt MUST be self-contained — the external AI has no access to any files
- The rewritten prompt MUST stay under 8000 tokens
- The rewritten prompt MUST use the structured slide plan format
- The rewritten prompt MUST include actual code examples (not just descriptions)
- The rewritten prompt MUST maintain the existing output format (raw HTML, no markdown fences)
