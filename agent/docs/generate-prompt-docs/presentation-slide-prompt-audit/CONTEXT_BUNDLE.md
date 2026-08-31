# CONTEXT_BUNDLE.md — Presentation Slide Prompt Audit

> **Purpose:** Self-contained reference bundle for auditing and improving the presentation slide generation prompt system. The external AI has NO access to any files — everything needed is embedded here.
> **Generated:** 2026-08-23

---

## TABLE OF CONTENTS

1. [Current PROMPT_GENERATE_SLIDE (full)](#1-current-prompt_generate_slide)
2. [buildSlidePrompt helper](#2-buildslideprompt-helper)
3. [Frontend External Infrastructure Skill](#3-frontend-external-infrastructure-skill)
4. [Human-Centric UX Skill](#4-human-centric-ux-skill)
5. [Impeccable Design Skill](#5-impeccable-design-skill)
6. [Theme Registry (4 themes)](#6-theme-registry)
7. [Slide Plan Format (PlannedSlide interface)](#7-slide-plan-format)
8. [Mode Registry (4 modes)](#8-mode-registry)
9. [Validation Rules (7-layer contract)](#9-validation-rules)
10. [Design Tokens (index.css)](#10-design-tokens)
11. [Design Presets (7 styles)](#11-design-presets)

---

## 1. CURRENT PROMPT_GENERATE_SLIDE

Source: `src/services/promptComposer.ts` — the system prompt template injected into every AI call.

```typescript
export const PROMPT_GENERATE_SLIDE = `You are a Principal Frontend Architect & Motion Designer at Vercel/Framer. You generate high-fidelity, production-grade, interactive HTML/CSS/JS presentation slides. Every slide is ONE complete, valid HTML file.

**Output ONLY valid HTML. No explanations, no markdown commentary — just the slides.**

═══════════════════════════════════════════════════════
CONTENT TO VISUALIZE
═══════════════════════════════════════════════════════
{{CONTENT}}

**Slide count:** {{SLIDE_COUNT}}
**Generation mode:** {{MODE}}

═══════════════════════════════════════════════════════
FRONTEND DESIGN SKILLS APPLIED
═══════════════════════════════════════════════════════
These skills are baked into every slide you produce:

1. Frontend Design — Component patterns, tokens, spacing, typography, glass cards. Dark chrome, monospace dominance, high information density.
2. Human-Centric UX — Empty/loading/error states, progressive disclosure, visual hierarchy, feedback loops. Every slide must handle the "what if content is too much" case.
3. Impeccable — 7 design dimensions: typography (tight letter-spacing, weight contrast), color (semantic, consistent), spatial (8px grid, breathing room), motion (purposeful, never decorative), interaction (hover/focus/press states), responsive (fit 1080x960), UX writing (clear, concise labels).
4. Motion — Bring the UI Alive — L2 Responsive level: hover/focus/press feedback, list stagger, layout animations, ONE ambient accent. Timing: 150-300ms, cubic-bezier(0.16,1,0.3,1). Stagger: 0.04-0.06s per child. Distance: 4-12px offsets.
5. UI UX Pro Max — Developer tool aesthetic: dark chrome, high density, command palette patterns. AI/ML: conversational, warm, trustworthy. Style: Dark Glass (backdrop blur, zinc base, single accent).
6. Design Taste System — Design variance knobs, anti-repetition rules. Never repeat the same layout pattern twice in one deck.
7. frontend-external-infra — Source routing, re-skin rules, anti-slop checklist.

═══════════════════════════════════════════════════════
MCP COMPONENT INVENTORY (vanilla JS equivalents for iframes)
═══════════════════════════════════════════════════════
Since slides are raw HTML in iframes, you cannot use React components. Use these vanilla JS equivalents:

| MCP Component | Vanilla JS Pattern | Use For |
|---------------|-------------------|---------|
| blur-fade (MagicUI) | CSS @keyframes blurInUp + stagger delays | Element entrance animations |
| magic-card (MagicUI) | Mouse-following radial gradient div | Interactive card hover glow |
| number-ticker (MagicUI) | requestAnimationFrame count-up | Animated stat numbers |
| animated-gradient-text (MagicUI) | CSS background-clip text shimmer | Headline emphasis |
| animated-beam (MagicUI) | SVG path with gradient animation | Connecting ideas in diagrams |
| particles (MagicUI) | Canvas floating dots | Ambient slide backgrounds |
| bento-grid (MagicUI) | CSS Grid asymmetric layout | Feature showcase layouts |
| border-beam (MagicUI) | CSS conic gradient border | Active state indicators (small only) |
| meteors (MagicUI) | CSS animated shooting stars | Dramatic reveal backgrounds |
| card (shadcn) | Glass card with backdrop-filter | Content containers |
| dialog (shadcn) | Modal with backdrop blur | Popups (avoid in slides) |
| button (shadcn) | Glass button with hover/press states | CTAs, navigation |
| badge (shadcn) | Rounded-full pill with accent color | Labels, status indicators |
| CodeBlock (Learn) | <pre><code> with syntax colors | Code demonstrations |
| Slider (installed) | Div-based track + thumb + fill | Interactive parameter controls |
| Select (installed) | Div-based dropdown with open/close | Choice controls |

═══════════════════════════════════════════════════════
ANTI-SLOP CHECKLIST (verify EVERY slide before emitting)
═══════════════════════════════════════════════════════
- NOT default Inter-only — use var(--font-header) for headlines, var(--font-mono) for code
- NOT purple/indigo gradient-on-everything — use the provided accent colors
- NOT same-radius-everything — 24px cards, 12px buttons, 8px badges
- NOT hero cliché (tiny uppercase pill + oversized headline + lone CTA)
- NOT repeated tracked-uppercase kicker above every heading
- Real micro-interactions on key actions; respects prefers-reduced-motion
- Imagery matches the actual topic; no filler glow/blobs
- Empty/loading/error states exist and are styled
- All icons from a consistent set (SVG inline, no emoji as UI)
- Focus-visible rings use the accent color
- Every animation has a purpose (entrance, state change, feedback, or orientation)
- Glass layer: bg-zinc-900/80 backdrop-blur-xl pattern
- Max rounded-xl (24px), p-5 (20px) padding

═══════════════════════════════════════════════════════
THEME ENGINE (use the provided theme object)
═══════════════════════════════════════════════════════
Map the theme to CSS variables on :root: --bg, --surface, --border, --fg, --muted, --accent, --accent-2, --warning, --accent-glow, --font-header, --font-body, --font-mono.

═══════════════════════════════════════════════════════
SPATIAL CONSTRAINTS (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════
1. <body> MUST be: width:1080px; height:960px; overflow:hidden; margin:0; position:relative; background:var(--bg); color:var(--fg); font-family:var(--font-body);
2. NO SCROLLING. All content fits in 1080x960 via CSS Grid/Flexbox.
3. TYPOGRAPHY: Headlines 3.5rem+ weight 800 letter-spacing -0.04em var(--font-header). Sub 1.5rem weight 600. Body 1rem weight 400 line-height 1.6. Code 0.875rem var(--font-mono). Labels 0.75rem uppercase letter-spacing 0.1em var(--muted).
4. SPACING: 8px grid. Cards: padding 32px, border-radius 24px. Sections: margin 24-48px.

═══════════════════════════════════════════════════════
GLASSMORPHISM CARD SYSTEM
═══════════════════════════════════════════════════════
.glass-card{background:var(--surface);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid var(--border);border-radius:24px;padding:32px;box-shadow:0 20px 40px rgba(0,0,0,0.4);position:relative;overflow:hidden}

═══════════════════════════════════════════════════════
VANILLA JS MICRO-INTERACTIONS (ALL 7 MANDATORY)
═══════════════════════════════════════════════════════

1. BLUR-FADE (MagicUI blur-fade): Every element stagger-animates in.
@keyframes blurInUp{from{opacity:0;transform:translateY(20px);filter:blur(10px)}to{opacity:1;transform:translateY(0);filter:blur(0)}}
.stagger{animation:blurInUp .6s cubic-bezier(.16,1,.3,1) both}
.stagger-1{animation-delay:.04s}.stagger-2{.08s}.stagger-3{.12s}.stagger-4{.16s}.stagger-5{.20s}.stagger-6{.24s}.stagger-7{.28s}.stagger-8{.32s}

2. MOUSE GLOW (MagicUI magic-card): Radial gradient follows cursor inside cards.
HTML: <div class="glow-card"><div class="glow"></div><div class="content">...</div></div>
CSS: .glow-card{position:relative;overflow:hidden}.glow{position:absolute;width:300px;height:300px;background:radial-gradient(circle,var(--accent) 0%,transparent 70%);opacity:0;filter:blur(40px);pointer-events:none;transform:translate(-50%,-50%);transition:opacity .3s;z-index:0}
JS: card.onmouseenter=()=>glow.style.opacity='.08';card.onmouseleave=()=>glow.style.opacity='0';card.onmousemove=e=>{const r=card.getBoundingClientRect();glow.style.left=(e.clientX-r.left)+'px';glow.style.top=(e.clientY-r.top)+'px'}

3. NUMBER TICKER (MagicUI number-ticker): Animated count-up with cubic ease-out.
function animateNumber(el,target,dur=1200){const s=performance.now();(function u(n){const p=Math.min((n-s)/dur,1);el.textContent=Math.round(target*(1-Math.pow(1-p,3))).toLocaleString();if(p<1)requestAnimationFrame(u)})(s)}
Usage: <span class="ticker" data-target="99">0</span> then document.querySelectorAll('.ticker').forEach(el=>animateNumber(el,+el.dataset.target))

4. GRADIENT TEXT (MagicUI animated-gradient-text): Shimmer on headlines.
.gradient-text{background:linear-gradient(90deg,var(--accent),var(--accent-2),var(--accent));background-size:300% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:gradShift 4s ease-in-out infinite}
@keyframes gradShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}

5. CUSTOM SLIDER: NEVER use <input type="range">. Div-based glassmorphic.
.slider-track{width:100%;height:4px;background:rgba(255,255,255,.1);border-radius:999px;position:relative;cursor:pointer}
.slider-fill{height:100%;background:var(--accent);border-radius:999px;transition:width .15s}
.slider-thumb{width:16px;height:16px;background:var(--accent);border-radius:50%;position:absolute;top:50%;transform:translate(-50%,-50%);box-shadow:0 0 12px var(--accent);cursor:grab;transition:transform .2s,box-shadow .2s}
.slider-thumb:hover{transform:translate(-50%,-50%) scale(1.3);box-shadow:0 0 24px var(--accent)}

6. CUSTOM DROPDOWN: NEVER use <select>. Div-based glassmorphic.
.dropdown-trigger{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:12px;cursor:pointer;transition:border-color .2s}
.dropdown-trigger:hover{border-color:var(--accent)}
.dropdown-menu{position:absolute;top:100%;left:0;right:0;margin-top:4px;background:rgba(15,15,20,.95);backdrop-filter:blur(24px);border:1px solid var(--border);border-radius:12px;overflow:hidden;z-index:100;opacity:0;transform:translateY(-8px);pointer-events:none;transition:all .2s cubic-bezier(.16,1,.3,1)}
.dropdown-menu.open{opacity:1;transform:translateY(0);pointer-events:auto}
.dropdown-item{padding:10px 16px;cursor:pointer;transition:background .15s;font-size:14px}
.dropdown-item:hover{background:rgba(255,255,255,.05)}
.dropdown-item.selected{background:var(--accent);color:#000}

7. SPRING EASING + MICRO: cubic-bezier(0.16,1,0.3,1) for ALL transitions. Buttons scale .98 on click. Hover brightens borders. Cards lift -2px on hover.

═══════════════════════════════════════════════════════
VISUAL GROUNDING: INTEGRATED WIDGETS (CRITICAL)
═══════════════════════════════════════════════════════
DEFAULT: Build ONE self-contained widget with diagram + inline callouts + drawn leader lines in the SAME coordinate space. NOT a text block pointing at a separate diagram.

Pattern: <div class="viz"><svg viewBox="..."><!-- diagram + leader lines + arrow markers --></svg><!-- formula/callouts in same div --><script>// interactivity</script></div>

Leader lines: SVG <path> or <line> with marker-end arrow. Both endpoints MUST be in the same SVG. Callout text sits AT the arrowhead, inside the diagram coordinate space.

WHEN TO ADD JS INTERACTIVITY (only if one is true):
- Reader controls step-through (algorithm trace, pipeline stages)
- Changing input visibly changes output (slider-driven recompute)
- Hover reveals hidden relationships (part-to-explanation)
- Synchronized comparison (before/after linked hover)

INTERACTIVITY PATTERNS:
a. Step-through: N states + "Next" button, each click highlights different node + swaps caption
b. Before/after diff: Two panels, slider swaps state
c. Parameter recompute: Slider bound to JS function that redraws derived value
d. Synchronized hover: Two panels, hovering A highlights counterpart in B
e. Interactive matrix: Hover output cell highlights contributing input cells

═══════════════════════════════════════════════════════
LAYOUT & ASYMMETRY
═══════════════════════════════════════════════════════
Avoid centered layouts. Use: grid-template-columns: 1.5fr 1fr or 1fr 1.5fr. Overlapping elements with negative margins. Offset cards at different heights.

═══════════════════════════════════════════════════════
MOTION BUDGET (L2 Responsive)
═══════════════════════════════════════════════════════
- Allowed: hover/focus/press feedback, fade/slide enter+exit, list stagger, hover lift+glow, ONE restrained ambient accent
- Timing: 150-300ms, cubic-bezier(0.16,1,0.3,1)
- Stagger: children 0.04-0.06s; cap total entrance under ~0.4s
- Distance: y/x 4-12px, scale 0.96-1.0
- NEVER: multiple competing ambient layers, heavy particle systems, full-page scroll scenes, long fades >400ms

═══════════════════════════════════════════════════════
INPUT DATA
═══════════════════════════════════════════════════════
You receive a topic and slide count. For each slide determine layout type:
- hook: Massive centered typography, gradient-text, blurInUp. Bold claim. 1-2 words headline.
- value: Split layout 1.5fr 1fr. Text left, visual right. Integrated widget with leader lines.
- transition: Minimal text, visual bridge. Muted.
- call_to_action: Bold CTA, accent color, button-like.
- visual_only: Full bleed SVG/diagram. Interactive if it helps understanding.

═══════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════
Output ALL slides sequentially. Each slide ONE complete HTML in \`\`\`html fences.
Every slide MUST: <!DOCTYPE html>, all CSS in <style>, all JS in <script>, Google Fonts CDN, 1080x960px, ALL 7 micro-interactions, glassmorphism, staggered blurInUp, theme CSS variables, self-contained.`;
```

---

## 2. BUILDSLIDEPROMPT HELPER

This is how each frame is sent to the AI with the theme:

```typescript
export function buildSlidePrompt(frame: any, theme?: string): string {
  const themeName = theme || 'vercel-dark'
  const themeObj = THEMES[themeName] || THEMES['vercel-dark']
  return `Generate a presentation slide using the "${themeName}" theme.

THEME: ${JSON.stringify(themeObj)}

frame_type: ${frame.frame_type}
text: "${frame.text}"
visual: "${frame.visual}"
timestamp: ${frame.timestamp}

frame_type '${frame.frame_type}' determines layout. Include ALL micro-interactions. For 'value' type: build an integrated widget with diagram + leader lines + inline callouts in same SVG coordinate space. Add JS interactivity if it helps understanding (step-through, hover-reveal, slider-recompute). Output ONLY valid HTML.`
}
```

**Template slots:**
- `{{CONTENT}}` — replaced by `compilePrompt()` with the slide plan (goal, audience, tone, slide descriptions, groups)
- `{{SLIDE_COUNT}}` — replaced with the number of slides
- `{{MODE}}` — replaced with the generation mode description

---

## 3. FRONTEND EXTERNAL INFRASTRUCTURE SKILL

Source: `agent/skills/frontend-external-infra/SKILL.md`

### What This Is

This skill bridges the gap between **instructions-only design skills** (frontend-design, impeccable, humancentred-UIUX) and **real component libraries** the agent can pull from. Instead of inventing UI patterns from the model's training data average ("AI slop"), the agent connects to live MCP servers that serve real, curated, production-grade components, blocks, icons, and animations.

> **Rule:** Never design from zero. Pull from a connected source first, then adapt to DeskFlow's design tokens. If a source isn't available, say so — do not invent a substitute that looks generic.

### Connected MCP Servers

| Server | What it gives you | When to use |
|--------|------------------|-------------|
| **shadcn** (`npx shadcn@latest mcp`) | Browse/search/read source of thousands of Tailwind v4+React components from the shadcn/ui registry + any configured third-party registries (Aceternity, etc.) | Any standard UI block: forms, dialogs, tables, sidebars, navs, cards, pricing, landing sections. Search first, read source, adapt to DeskFlow tokens. |
| **magicui** (`@magicuidesign/mcp`) | 150+ animated Tailwind components: beams, particles, bento grids, text animations, backgrounds, buttons, device mocks, effects | Animated elements, special effects (animated beam, border beam, particles, meteors, confetti), text animations (blur fade, number ticker, word rotate), backgrounds (grid patterns, ripples), bento grids. |
| **lucide** (`lucide-icons-mcp`) | 1500+ clean SVG icons with search and usage code | Any icon need. Never use emoji as UI icons. Prefer lucide over Iconify unless lucide genuinely lacks the icon. |
| **@21st-dev/magic** | Prompt-to-component: generate a polished React component from a `/ui` description | When you need a specific component variation that doesn't exist in shadcn/Magic UI — describe what you need and let 21st.dev generate it. API key from `.env`. |
| **motion-dev** (community MCP) | Offline Motion.dev docs + animation codegen for React/JS/Vue — free alternative to paid Motion+ AI Kit | When a component needs high-quality motion beyond simple fade/slide. Clone from github.com/Abhishekrajpurohit/motion-dev-mcp, run `npm install && npm run build && npm run rebuild`, then configure as a local MCP. |
| **unsplash** (`unsplash-smart-mcp-server`) | Search/download stock photography with auto-attribution | When real imagery is needed (hero backgrounds, section illustrations). Requires Unsplash API key in `.env`. |
| **reactbits** (`reactbits-dev-mcp-server`) | 135+ animated React components (CSS + Tailwind variants) | Text animations, particle effects, background effects, hover interactions. No API key needed. |
| **iconify** (`better-icons-mcp`) | 200,000+ icons across 200+ sets (Lucide, Material, Heroicons, Tabler, etc.) | When lucide lacks the icon you need. Check lucide first; fall back to iconify. No API key needed. |
| **fragments-ui** (`@usefragments/mcp`) | 66 accessible React components + 80 design tokens + 11 MCP tools for token audit, a11y checks, component discovery, browser rendering | AI-native design system. .fragment.tsx metadata files guide the agent on implementation. Free. |
| **shadcn-ui-mcp** (`@jpisnice/shadcn-ui-mcp-server`) | Multi-framework shadcn component docs with smart caching. Supports React, Svelte, Vue, React Native. | When you need shadcn component docs with usage examples across frameworks. Faster than the generic shadcn MCP. |
| **refero-mcp** (`@refero/mcp`) | 135,000+ screens and 10,000+ real product flows (onboarding, checkout, tables, paywalls) | Research phase: find real-world UI references before writing layout code. Requires Pro subscription. |
| **aidesigner** (URL MCP) | MCP tools to generate_design, refine_design, clone_design from any live URL | When you want to generate, clone, or refine production-ready web designs in a live editor session. |

### Source Routing (what to reach for, in order)

| You need… | Use… |
|-----------|------|
| Standard UI block (form, table, dialog, sidebar, card, nav, etc.) | `shadcn` MCP — search registries, read component source |
| Landing section (hero, features, pricing, bento, testimonials) | `shadcn` MCP → `@aceternity` registry, or `magicui` MCP for animated variants |
| Animated effect (beam, particles, grid, confetti, text animation) | `magicui` MCP — they specialize in this |
| An icon | `lucide` MCP — search by keyword, get the import code |
| A specific component from a text description | `@21st-dev/magic` — `/ui [description]` |
| Animated component variant (text, particles, hover effects) | `reactbits` MCP — 135+ typed components, no key needed |
| Animation codegen, offline docs, examples | `motion-dev` community MCP — clone from GitHub, build, configure locally (free) |
| Real photography | `unsplash` MCP — search stock photos with attribution (needs Unsplash API key in `.env`) |
| An icon lucide doesn't have | `iconify` MCP — 200k+ icons across 200+ sets |
| Theme/palette generation | Use tweakcn.com (web tool). Paste generated CSS vars over DeskFlow's `:root` in index.css. |
| AI-native components with metadata | `fragments-ui` MCP — 66 accessible components, 80 design tokens, .fragment.tsx metadata. Free. |
| Multi-framework shadcn docs | `shadcn-ui-mcp` — component docs with usage for React, Svelte, Vue, React Native |
| Real-world UI research / inspiration | `refero-mcp` — search 135k+ screens and 10k+ flows. Pro key required. |
| Generate a design from scratch or refine existing | `aidesigner` MCP — call generate_design or refine_design from a live URL |
| Motion / kinetic typography | Swishy.ai (web tool) — text-to-motion with CSS + Framer Motion output. Search for kinetic typography patterns. |
| Visual theme exploration / layout ideas | Variant.com (web canvas) — generate infinite layout ideas by visual theme. Feed screenshots into agent vision. |
| Premium shadcn motion components | Cult UI — `npx shadcn@latest add https://www.cult-ui.com/r/<component>.json`. Dynamic Islands, Family Buttons, rich animations. |

### DeskFlow Re-Skin Rules

When you pull a component from any MCP source, you MUST re-skin it:

1. **Colors**: Replace the source's colors with DeskFlow CSS vars (`--bg-primary`, `--accent-primary`, `--text-primary`, etc.). See `src/index.css` for the full token set.
2. **Border radius**: Max `rounded-xl` (12px). Never `rounded-2xl` or `rounded-3xl`.
3. **Card padding**: Use `p-5` (20px). Never `p-6` or `p-8`.
4. **Fonts**: Body = Geist/Inter (13px). Mono = JetBrains Mono. Headings use weight (600), not a different font.
5. **Dark mode only**: DeskFlow is always dark. Strip any light-mode variants.
6. **Glass layer**: Use `glass` or `glass-heavy` classes from `index.css` instead of opaque backgrounds where depth is needed.
7. **Animation respects reduced motion**: Wrap any animation in `@media (prefers-reduced-motion: reduce)` suppression.

### Anti-Slop Checklist (block the PR if any fail)

- [ ] **Type**: NOT default Inter/Geist-only — that IS the DeskFlow default, so check that the pairing is correct (Geist body, JetBrains Mono code). No third font introduced.
- [ ] **Color**: NOT purple/indigo gradient-on-everything. Use DeskFlow's defined tokens (`--accent-primary`, `--page-accent`, etc.). Gradients are intentional and rare.
- [ ] **Geometry**: radius + padding come from DeskFlow's scale (`rounded-xl`, `p-5`), not the source's original values.
- [ ] **Hero**: no tiny uppercase eyebrow pill + oversized headline + lone CTA cliché.
- [ ] **Sections**: no repeated tracked-uppercase kicker label above every heading.
- [ ] **Motion**: real micro-interactions on key actions; respects `prefers-reduced-motion`.
- [ ] **Imagery**: matches the actual product; no filler glow/blobs.
- [ ] **Empty/loading/error states**: exist and are styled using DeskFlow patterns (Skeleton, EmptyState from frontend-design skill).
- [ ] **Icons**: all from lucide-react. No emoji as UI icons. No inline SVG that duplicates an existing lucide icon.
- [ ] **Accessibility**: focus-visible rings use DeskFlow's `--page-accent` pattern from `index.css`.

### UI Generation Workflow

1. **Scope**: State what screen/component you're building and the one action that matters.
2. **Source**: Pull candidate block/component from the routed MCP server (see Source Routing above).
3. **Read**: Use the MCP to read the full source code of the component(s).
4. **Adapt**: Re-skin to DeskFlow tokens using the rules above.
5. **Animate**: Check if Magic UI has a better animated variant. If using framer-motion directly, use DeskFlow's duration tokens (`--fast: 150ms`, `--normal: 250ms`, `--slow: 400ms`) and easing (`--ease-out`).
6. **States**: Add empty, loading, and error states for every data-driven component (see humancentred-UIUX skill).
7. **Checklist**: Run the anti-slop checklist before finishing.

---

## 4. HUMAN-CENTRIC UX SKILL

Source: `agent/skills/humancentred-UIUX/SKILL.md`

### Philosophy

A UI is not "done" when it works for a machine — it is done when a human can look at it and immediately know **where they are, what is happening, and what to do next** without being taught. AI co-coding agents default to *system-centric* design: they emit interfaces that are internally consistent and machine-parseable but cognitively hostile to humans. This is "AI slop." The job of this skill is to force every generated interface through a human-comprehension filter so the output is clear, straightforward, low-friction, and pleasant — optimizing for **user experience first**, aesthetics second.

Function and clarity are the foundation. Beauty is the finish, not the substitute.

### Scope Rule (READ FIRST)

This skill is **scope-aware**. Before generating or reviewing, determine the target:

1. **If the user names a specific part** — Apply this skill **only to that part**. Do NOT refactor or touch unrelated areas. Match the existing conventions of the file/page you are editing.
2. **If the user does NOT specify a part** — Apply this skill to the **entire project / whole surface** being generated or reviewed.
3. **Always state your scope out loud** at the start.

### The 6 Pillars of Good UX

#### 1. Clarity Over Cleverness
The user should never have to decode the interface.
- Every label, button, tooltip, placeholder, and error is written in plain human language — never raw system tokens, enum values, or stack traces.
- Primary action of any screen is obvious within 1 second.
- Icons are never used alone for non-universal actions — pair with a label or tooltip.

#### 2. Progressive Disclosure
Show what matters now; hide complexity until it is needed.
- Do not render every option, field, or toggle at once. Use tabs, sections, accordions, "Advanced" toggles, or step flows.
- Default to the common case; make the rare case reachable, not omnipresent.
- A screen should answer one primary question. If it answers five, split it.

#### 3. Visual Hierarchy
Humans scan, they do not read. Guide the eye.
- Establish hierarchy with weight, color temperature, and spacing — not size alone.
- Most important element = highest contrast. Metadata = muted. One clear focal point per view.
- Group related items; separate unrelated items with deliberate whitespace.

#### 4. Complete State Coverage (the #1 anti-slop rule)
AI almost always designs only the "happy path." Humans experience time and failure. EVERY data-driven component must define:
- **Empty** — icon + friendly one-line explanation + a clear call-to-action. Never a blank box.
- **Loading** — skeleton placeholders matching content shape (not just a spinner).
- **Error** — plain-language cause + a recovery action (Retry / Fix / Contact). Never raw JSON.
- **Populated** — the normal state.
- **Partial / Overflow** — long text truncation, large lists paginated/virtualized, very large numbers formatted.

#### 5. Feedback & Quality-of-Life Micro-interactions
The system must always acknowledge the human.
- Every interactive element has hover, focus, active, and disabled states.
- State changes get a 150–300ms transition (opacity/transform) so they feel intentional, not jarring.
- Destructive or irreversible actions require confirmation and/or offer undo.
- Provide immediate feedback on submit (button → loading → success/error). Never leave the user wondering if it worked.
- Preserve user effort: don't wipe form input on error; remember scroll position and unsaved-change warnings.

#### 6. Forgiveness & Affordance
Make the right action easy and mistakes cheap.
- It is always visually obvious what is clickable vs static.
- Touch/click targets are comfortably sized (≥ 44px), even on desktop.
- Inputs validate inline with helpful messages, not after a wall-bounce submit.
- Keyboard navigation and visible focus rings work; nothing is mouse-only.

### Anti-Patterns (NEVER ship these)

- **NEVER** expose raw system identifiers, enum codes, or stack traces to the user.
- **NEVER** render a data view without Empty / Loading / Error states.
- **NEVER** present a flat wall of equally-weighted elements with no focal point.
- **NEVER** dump every setting/field/action onto one screen — use progressive disclosure.
- **NEVER** trigger a silent action with no feedback (no spinner, no toast, no state change).
- **NEVER** destroy user input or work without confirmation or undo.
- **NEVER** rely on color alone to convey meaning (accessibility) — pair with text/icon/shape.
- **NEVER** use icon-only buttons for non-obvious actions without a label or tooltip.
- **NEVER** prioritize a "cool" visual effect at the cost of comprehension or performance.

### Generation Workflow

1. **Declare scope** (specific part vs whole project) per the Scope Rule.
2. **Identify the user's primary goal** for the surface. State it in one sentence.
3. **Design the happy path**, then immediately design Empty / Loading / Error for every data element.
4. **Establish hierarchy**: pick the single primary action and make it dominant; demote the rest.
5. **Apply progressive disclosure**: hide secondary/advanced controls.
6. **Wire feedback**: hover/focus/active/disabled + transitions + submit feedback + confirmations.
7. **Humanize copy**: rewrite every label, error, and empty message in plain language.
8. **Self-review against the Checklist below before returning code.**

### Pre-Return Review Checklist

- [ ] Scope stated (specific part or whole project).
- [ ] Primary action on each screen is obvious in < 1s.
- [ ] No raw system tokens, enums, or stack traces visible to the user.
- [ ] Empty, Loading, and Error states exist for every data-driven element.
- [ ] Clear visual hierarchy — one focal point, muted metadata.
- [ ] Secondary/advanced complexity is hidden behind disclosure.
- [ ] All interactive elements have hover / focus / active / disabled states.
- [ ] State changes animate (150–300ms), nothing snaps jarringly.
- [ ] Submit/save gives immediate feedback; destructive actions confirm or offer undo.
- [ ] Copy is plain-language and instructive (labels, placeholders, errors, empties).
- [ ] Meaning is never conveyed by color alone; focus rings + keyboard nav work.
- [ ] Targets ≥ 44px; nothing is mouse-only.
- [ ] No "cool" effect harms clarity or performance.

---

## 5. IMPECCABLE DESIGN SKILL

Source: `agent/skills/impeccable/SKILL.md`

### Philosophy

Impeccable design is invisible — it removes friction so completely that users don't notice it. This skill provides domain-specific reference knowledge across 7 design dimensions, 23 actionable commands, and 27 anti-patterns to guard against.

### 7 Domain References

#### 1. Typography
- **Scale**: Use a modular scale (1.25 ratio) for font sizes: 12, 15, 18.75, 23.44, 29.3, 36.6px
- **Line height**: 1.5 for body, 1.2 for headings, 1.6 for terminal/code
- **Measure**: 45-75 characters per line for readability (use `max-w-prose` or `max-w-[65ch]`)
- **Font stack**: Geist (sans) + JetBrains Mono (code). Fallback: system-ui, -apple-system, sans-serif
- **Weight hierarchy**: 400 (body), 500 (labels), 600 (headings), 700 (hero). NEVER use 300 on dark backgrounds.
- **Anti-pattern**: Using `font-thin` (100) on dark zinc backgrounds — becomes illegible below 400 weight

#### 2. Color
- **HSL for dark themes**: Use `hsl()` over hex for systematic dark theme adjustments. Shift lightness ±5% for hover states.
- **Opacity layers**: Build color depth through opacity, not new hex values. `bg-pink-500/10` + `border-pink-500/20` creates depth without palette bloat.
- **Accent discipline**: One primary accent (pink-500), one secondary (cyan-400), one semantic (emerald/amber/red). Never exceed 3 accent colors in a view.
- **Contrast ratios**: Minimum 4.5:1 for body text, 3:1 for large text/UI components.
- **Anti-pattern**: Using `opacity-50` on text — reduces contrast unpredictably. Use dedicated text color tokens instead.

#### 3. Spatial
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

#### 4. Motion
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

#### 5. Interaction
- **Hover states**: Every interactive element MUST have a hover state. Minimum: `opacity-80` or `brightness-110`.
- **Active states**: Pressed state should be 10% darker/lighter than hover. Use `scale-[0.98]` for tactile feedback.
- **Focus visible**: Replace default outline with `ring-2 ring-pink-500/50 ring-offset-2 ring-offset-zinc-950`.
- **Loading states**: Never show a disabled button without a spinner. Use `opacity-50 cursor-wait` + spinner.
- **Anti-pattern**: Disabled buttons that look like enabled buttons — always use `opacity-40` + `cursor-not-allowed`.

#### 6. Responsive
- **Breakpoints**: Mobile-first with 4 breakpoints:
  - `sm`: 640px (large phones)
  - `md`: 768px (tablets)
  - `lg`: 1024px (laptops)
  - `xl`: 1280px (desktops)
- **Container queries**: Use `@container` for component-level responsiveness (sidebar vs main content).
- **Touch targets**: Minimum 44×44px for all interactive elements, even on desktop.
- **Anti-pattern**: Hiding content on mobile instead of reorganizing it. Never use `hidden md:block` for primary content.

#### 7. UX Writing
- **Voice**: Direct, concise, action-oriented. No "Please" or "Sorry" in error messages.
- **Error format**: "[Thing] [verb] because [reason]. [Action to fix]."
  - Good: "Session failed to save because the disk is full. Free up space and retry."
  - Bad: "Oops! Something went wrong. Please try again later."
- **Button labels**: Use verb + noun. "Save workspace" not "Save". "Generate prompt" not "Submit".
- **Empty states**: Explain what WOULD be there, not just "No data". "No sessions yet. Start a terminal to create your first session."
- **Anti-pattern**: Technical jargon in user-facing copy. Use "workspace" not "PTY instance", "session" not "terminal binding".

### 23 Commands

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

### 27 Anti-Patterns by Category

#### Fonts (5)
1. Using more than 2 font families in one view
2. Body text below 14px on desktop
3. Line height below 1.4 for body text
4. Using `font-thin` (100-200) on dark backgrounds
5. Inconsistent font weights across similar elements

#### Colors (6)
6. Pure black (`#000`) backgrounds
7. More than 3 accent colors in a single view
8. Using `opacity` to create text hierarchy instead of dedicated tokens
9. Insufficient contrast ratios (< 4.5:1 for body)
10. Color as the ONLY indicator of state (always pair with icon or text)
11. Gradients that span more than 45° or use more than 3 color stops

#### Cards (4)
12. Cards without clear boundaries (no border or shadow)
13. Excessive border-radius (> 24px for small cards)
14. Padding asymmetry (different on all sides without purpose)
15. Missing hover state on clickable cards

#### Animations (6)
16. Animating layout properties (width, height, margin)
17. `transition: all` instead of specific properties
18. Duration > 500ms for UI feedback animations
19. No reduced-motion fallback (`@media (prefers-reduced-motion)`)
20. Loading spinners without progress indication for > 3s operations
21. Parallax or scroll-jacking in productivity tools

#### Layout (6)
22. Arbitrary z-index values (999, 10000)
23. Fixed widths that break on smaller screens
24. Touch targets below 44×44px
25. Content hidden on mobile instead of reorganized
26. Missing focus indicators on interactive elements
27. Horizontal scroll on primary content area

---

## 6. THEME REGISTRY

Source: `src/services/presentation/themeRegistry.ts` + `src/services/presentation/prompts.ts`

All themes are dark. Each theme provides 12 token values that map to CSS variables.

### ThemeDefinition Interface

```typescript
export interface ThemeDefinition {
  id: string
  label: string
  description: string
  tokens: {
    bg: string           // Background color
    surface: string      // Card/panel background (usually rgba)
    border: string       // Border color (usually rgba)
    fg: string           // Primary text color
    muted: string        // Muted/secondary text color
    accent: string       // Primary accent color
    accent2: string      // Secondary accent color
    warning: string      // Warning/attention color
    accentGlow: string   // Glow effect color (rgba with alpha)
    fontHeader: string   // Headline font family
    fontBody: string     // Body text font family
    fontMono: string     // Monospace/code font family
  }
}
```

### Vercel Dark (default)
```json
{
  "id": "vercel-dark",
  "label": "Vercel Dark",
  "description": "Clean, modern dark theme with emerald accent",
  "tokens": {
    "bg": "#0A0A0B",
    "surface": "rgba(255,255,255,0.03)",
    "border": "rgba(255,255,255,0.08)",
    "fg": "#FAFAFA",
    "muted": "#8B8B8B",
    "accent": "#10b981",
    "accent2": "#a855f7",
    "warning": "#f59e0b",
    "accentGlow": "rgba(16,185,129,0.15)",
    "fontHeader": "Inter",
    "fontBody": "Inter",
    "fontMono": "JetBrains Mono"
  }
}
```

### Cyberpunk
```json
{
  "id": "cyberpunk",
  "label": "Cyberpunk",
  "description": "Neon-on-dark with magenta and cyan accents",
  "tokens": {
    "bg": "#0d0221",
    "surface": "rgba(255,0,255,0.04)",
    "border": "rgba(255,0,255,0.12)",
    "fg": "#f0e6ff",
    "muted": "#7a6b8a",
    "accent": "#ff2a6d",
    "accent2": "#05d9e8",
    "warning": "#ff6ac1",
    "accentGlow": "rgba(255,42,109,0.2)",
    "fontHeader": "Space Grotesk",
    "fontBody": "Inter",
    "fontMono": "JetBrains Mono"
  }
}
```

### Minimalist Mono
```json
{
  "id": "minimalist-mono",
  "label": "Minimalist Mono",
  "description": "Ultra-clean monochrome with white accent",
  "tokens": {
    "bg": "#111111",
    "surface": "rgba(255,255,255,0.02)",
    "border": "rgba(255,255,255,0.06)",
    "fg": "#E5E5E5",
    "muted": "#666666",
    "accent": "#FFFFFF",
    "accent2": "#999999",
    "warning": "#CCCCCC",
    "accentGlow": "rgba(255,255,255,0.08)",
    "fontHeader": "Space Grotesk",
    "fontBody": "Inter",
    "fontMono": "JetBrains Mono"
  }
}
```

### Warm Dark
```json
{
  "id": "warm-dark",
  "label": "Warm Dark",
  "description": "Warm tones with amber and orange accents",
  "tokens": {
    "bg": "#1a1410",
    "surface": "rgba(255,200,150,0.04)",
    "border": "rgba(255,200,150,0.08)",
    "fg": "#f5e6d3",
    "muted": "#8a7a6a",
    "accent": "#f59e0b",
    "accent2": "#ef4444",
    "warning": "#fb923c",
    "accentGlow": "rgba(245,158,11,0.15)",
    "fontHeader": "Space Grotesk",
    "fontBody": "Inter",
    "fontMono": "JetBrains Mono"
  }
}
```

### Token-to-CSS Mapping

```typescript
export function getThemeTokens(id: string): Record<string, string> {
  const theme = getTheme(id)
  const tokens: Record<string, string> = {}
  for (const [key, value] of Object.entries(theme.tokens)) {
    tokens[`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = value
  }
  return tokens
}
```

This produces CSS vars like: `--bg`, `--surface`, `--border`, `--fg`, `--muted`, `--accent`, `--accent-2`, `--warning`, `--accent-glow`, `--font-header`, `--font-body`, `--font-mono`.

---

## 7. SLIDE PLAN FORMAT

Source: `src/services/presentation/promptComposer.ts`

### PlannedSlide Interface

```typescript
export interface PlannedSlide {
  index: number
  frame: 'hook' | 'value' | 'transition' | 'call_to_action' | 'visual_only'
  purpose: string
  headlineHint?: string
  layoutHint?: 'split-left' | 'split-right' | 'full-bleed' | 'minimal'
  visualHint?: string
  interactivityHint?: string
  group?: string // optional grouping label (e.g. "Core Concepts", "Visual Examples")
}
```

### SlidePlan Interface

```typescript
export interface SlidePlan {
  goal: string
  audience: string
  tone: string
  slides: PlannedSlide[]
  groups: { label: string; slideIndices: number[] }[]
}
```

### ContentInput Interface

```typescript
export interface ContentInput {
  source: 'topic' | 'episode' | 'external-chat'
  topic?: string
  topicMode?: 'specific' | 'ai-decides'
  episodeTitle?: string
  episodeFrames?: any[]
  externalChat?: string
  slideCount: number
  mode: string
  customGroups?: { label: string; count: number }[]
}
```

### Frame Types

| Frame | Purpose | Layout |
|-------|---------|--------|
| `hook` | Attention-grabbing headline, bold claim, 1-2 words | `full-bleed` |
| `value` | Split layout, text left, visual right, integrated widget | `split-left` or `split-right` |
| `transition` | Minimal text, visual bridge, muted | `minimal` |
| `call_to_action` | Bold CTA, accent color, button-like | `full-bleed` |
| `visual_only` | Full bleed SVG/diagram, interactive if it helps | `full-bleed` |

### compilePrompt function

```typescript
export function compilePrompt(plan: SlidePlan, systemPrompt: string, theme: any): string {
  const slideDescriptions = plan.slides.map(s =>
    `Slide ${s.index + 1} [${s.frame}] — Group: "${s.group || 'Content'}"
  Purpose: ${s.purpose}
  ${s.headlineHint ? `Headline: "${s.headlineHint}"` : ''}
  Layout: ${s.layoutHint || 'split-left'}
  ${s.visualHint ? `Visual: ${s.visualHint}` : ''}
  ${s.interactivityHint ? `Interactivity: ${s.interactivityHint}` : ''}`
  ).join('\n\n')

  const groupSummary = plan.groups.map(g =>
    `• "${g.label}" → Slides ${g.slideIndices.map(i => i + 1).join(', ')}`
  ).join('\n')

  return systemPrompt
    .replace('{{CONTENT}}',
      `Goal: ${plan.goal}\nAudience: ${plan.audience}\nTone: ${plan.tone}\n\n` +
      `SLIDE PLAN (${plan.slides.length} slides):\n\n${slideDescriptions}\n\n` +
      `GROUPS:\n${groupSummary}\n\n` +
      `Follow the slide plan exactly. Each slide must match its frame type, purpose, and layout hint.`)
    .replace('{{SLIDE_COUNT}}', String(plan.slides.length))
    .replace('{{MODE}}', `Structured — ${plan.slides.length} slides in ${plan.groups.length} groups`)
}
```

---

## 8. MODE REGISTRY

Source: `src/services/presentation/modeRegistry.ts`

### GenerationMode Interface

```typescript
export interface GenerationMode {
  id: string
  label: string
  description: string
  defaultSlideCount: number
  minSlides: number
  maxSlides: number
  frameSequence: string[]
  promptPreset: string
}
```

### Educational Mode
```json
{
  "id": "educational",
  "label": "Educational",
  "description": "Explain concepts with diagrams, examples, and visual grounding",
  "defaultSlideCount": 8,
  "minSlides": 4,
  "maxSlides": 15,
  "frameSequence": ["hook", "value", "value", "value", "value", "value", "value", "call_to_action"],
  "promptPreset": "Teach this topic step by step. Each slide builds on the previous. Use diagrams, equations, and interactive elements to make abstract concepts concrete."
}
```

### YouTube Shorts Mode
```json
{
  "id": "youtube_shorts",
  "label": "YouTube Shorts",
  "description": "Fast hook, high-contrast claim, quick payoff, CTA ending",
  "defaultSlideCount": 6,
  "minSlides": 3,
  "maxSlides": 10,
  "frameSequence": ["hook", "value", "value", "visual_only", "value", "call_to_action"],
  "promptPreset": "Create fast-paced, high-impact slides for a YouTube Short. Hook in the first slide, deliver value fast, end with a clear CTA."
}
```

### Pitch Deck Mode
```json
{
  "id": "pitch",
  "label": "Pitch Deck",
  "description": "Problem → Solution → Market → Product → Traction → Ask",
  "defaultSlideCount": 8,
  "minSlides": 5,
  "maxSlides": 12,
  "frameSequence": ["hook", "value", "value", "value", "value", "value", "value", "call_to_action"],
  "promptPreset": "Create a pitch deck. Start with the problem, present the solution, show market proof, demonstrate the product, show traction, and end with the ask."
}
```

### Technical Deep Dive Mode
```json
{
  "id": "technical",
  "label": "Technical Deep Dive",
  "description": "Definition → Architecture → Code → Tradeoffs → Summary",
  "defaultSlideCount": 8,
  "minSlides": 4,
  "maxSlides": 15,
  "frameSequence": ["hook", "value", "value", "visual_only", "value", "value", "value", "call_to_action"],
  "promptPreset": "Create a technical deep dive. Start with definitions, show architecture diagrams, include code examples, discuss tradeoffs, and summarize."
}
```

---

## 9. VALIDATION RULES

Source: `src/services/presentation/slideValidator.ts`

### 7-Layer Validation Contract

Every slide is validated against 7 layers. Errors block the slide; warnings allow it through with a note.

### ValidationIssue Interface

```typescript
export interface ValidationIssue {
  layer: string
  rule: string
  message: string
  severity: 'error' | 'warning' | 'info'
}
```

### ValidationReport Interface

```typescript
export interface ValidationReport {
  slideIndex: number
  status: 'valid' | 'warning' | 'invalid'
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}
```

### Layer 1: Structural (errors if missing)
- `<!DOCTYPE html>` — must be present
- `<html>` tag — must be present
- `<head>` tag — must be present
- `<body>` tag — must be present
- `<style>` tag — must be present
- `<script>` tag — must be present
- Font import — warning if Inter font import missing

### Layer 2: Layout (errors if wrong)
- Body width must be `1080px`
- Body height must be `960px`
- Scrolling forbidden — `overflow: scroll` or `overflow-y: auto` is an error

### Layer 3: Theme (warnings if missing)
Required CSS variables:
```
--bg, --surface, --border, --fg, --muted, --accent, --accent-2, --warning,
--font-header, --font-body, --font-mono
```

### Layer 4: Micro-interactions (warnings if missing)
- `blurInUp` animation must be present
- `.glow` or `.glow-card` mouse glow effect
- `.gradshift` or `.gradient-text` animation
- `cubic-bezier(0.16` spring easing

### Layer 5: Anti-slop (errors if violated)
- Native `<select>` — error if used (must use custom dropdown)
- Native `<input type="range">` — error if used (must use custom slider)
- Excessive emoji (>2 instances of 🤖💀🔥⚡✨🎯📊💡) — warning

### Layer 6: Security (errors if violated)
- External script sources restricted to: `fonts.googleapis.com`, `fonts.gstatic.com`, `cdn.jsdelivr.net`
- Any other external script URL is an error

### Repair Prompt Generation

```typescript
export function generateRepairPrompt(html: string, report: ValidationReport): string {
  const issues = [...report.errors, ...report.warnings]
  if (issues.length === 0) return ''

  return `Slide ${report.slideIndex + 1} failed validation. Fix ONLY this slide and output a complete standalone HTML file.

Errors:
${issues.map(i => `- [${i.severity}] ${i.rule}: ${i.message}`).join('\n')}

Original HTML:
${html.slice(0, 2000)}

Return only one corrected HTML file in a \`\`\`html fence. Fix ALL listed issues.`
}
```

---

## 10. DESIGN TOKENS

Source: `src/index.css` (DeskFlow app tokens)

### Core Colors

```css
:root {
  /* Backgrounds */
  --bg-primary:     #09090b;
  --bg-secondary:   #18181b;
  --bg-tertiary:    #27272a;
  --bg-elevated:    #2d2d31;
  --bg-glass:       rgba(24, 24, 27, 0.80);
  --bg-glass-heavy: rgba(24, 24, 27, 0.92);

  /* Text */
  --text-primary:   #f4f4f5;
  --text-secondary: #a1a1aa;
  --text-muted:     #52525b;
  --text-disabled:  #3f3f46;

  /* Accent */
  --accent-primary:   #ec4899;
  --accent-hover:     #db2777;
  --accent-muted:     rgba(236, 72, 153, 0.15);
  --accent-secondary: #22d3ee;

  /* Semantic */
  --success:         #34d399;
  --success-muted:   rgba(52, 211, 153, 0.15);
  --warning:         #fbbf24;
  --warning-muted:   rgba(251, 191, 36, 0.15);
  --error:           #f87171;
  --error-muted:     rgba(248, 113, 113, 0.15);
  --info:            #38bdf8;
  --info-muted:      rgba(56, 189, 248, 0.15);

  /* Borders */
  --border-subtle:   #27272a;
  --border-default:  #3f3f46;
  --border-active:   #52525b;
  --border-glass:    rgba(63, 63, 70, 0.50);

  /* Z-index scale */
  --z-base:      0;
  --z-elevated:  10;
  --z-dropdown:  20;
  --z-sticky:    25;
  --z-overlay:   30;
  --z-modal:     40;
  --z-toast:     50;
  --z-max:       100;

  /* Motion */
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:     cubic-bezier(0.4, 0, 1, 1);
  --ease-inout:  cubic-bezier(0.4, 0, 0.2, 1);
  --fast:        150ms;
  --normal:      250ms;
  --slow:        400ms;

  /* Page accent (overridden per page) */
  --page-accent: var(--accent-primary);
}
```

### Page-Specific Accents

```css
[data-page="dashboard"]    { --page-accent: #ec4899; }
[data-page="productivity"] { --page-accent: #ec4899; }
[data-page="stats"]        { --page-accent: #22d3ee; }
[data-page="browser"]      { --page-accent: #38bdf8; }
[data-page="ide"]          { --page-accent: #8b5cf6; }
[data-page="external"]     { --page-accent: #fbbf24; }
[data-page="insights"]     { --page-accent: #ec4899; }
[data-page="database"]     { --page-accent: #a78bfa; }
[data-page="settings"]     { --page-accent: #22d3ee; }
[data-page="tutorial"]     { --page-accent: #34d399; }
[data-page="finance"]      { --page-accent: #10b981; }
```

### Glass Classes

```css
.glass {
  background: var(--bg-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-glass);
}

.glass-heavy {
  background: var(--bg-glass-heavy);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--border-glass);
}
```

### Font Stacks

```css
body {
  font-family: "Geist", "Inter", system-ui, -apple-system, sans-serif;
  font-size: 13px;
  line-height: 1.5;
}

code, pre, .font-mono {
  font-family: "JetBrains Mono", "Fira Code", monospace;
}
```

### Focus Ring Pattern

```css
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px color-mix(in srgb, var(--page-accent) 50%, transparent);
}
```

### Tailwind Theme Tokens (v4 @theme)

```css
@theme {
  --color-background: #09090b;
  --color-foreground: #fafafa;
  --color-card: #18181b;
  --color-card-foreground: #fafafa;
  --color-popover: #18181b;
  --color-popover-foreground: #fafafa;
  --color-primary: #fbbf24;
  --color-primary-foreground: #09090b;
  --color-secondary: #27272a;
  --color-secondary-foreground: #fafafa;
  --color-muted: #27272a;
  --color-muted-foreground: #a1a1aa;
  --color-accent: #27272a;
  --color-accent-foreground: #fafafa;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #fafafa;
  --color-border: #27272a;
  --color-input: #27272a;
  --color-ring: #fbbf24;
}
```

---

## 11. DESIGN PRESETS

Source: `src/lib/designPresets.ts`

### DesignStyle Interface

```typescript
export interface DesignStyle {
  id: string
  name: string
  description: string
  tokens: Record<string, string>
  allowedMCP: string[]
  forbiddenMCP: string[]
  aiRules: string[]
}
```

### 7 Styles

#### 1. Flat Design
- **Tokens:** `--bg-primary: #ffffff`, `--accent-primary: #2563eb`, `--radius-base: 0px`, `--shadow-base: none`, `--blur-base: 0px`
- **Allowed MCP:** button, card, badge, separator, input, select
- **Forbidden MCP:** magic-card, border-beam, particles, shiny-button, blur-fade, aurora-text
- **Rules:** NEVER use shadows, gradients, or backdrop-blur. Solid backgrounds only. Borders 2px solid. No animations except basic 150ms transitions. Flat color blocks for hierarchy.

#### 2. Skeuomorphism
- **Tokens:** `--bg-primary: #f0f0f0`, `--accent-primary: #0066cc`, `--radius-base: 8px`, `--shadow-base: inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.3)`, `--blur-base: 0px`
- **Allowed MCP:** tabs, slider, switch, progress, button, input, select
- **Forbidden MCP:** magic-card, border-beam, particles, aurora-text
- **Rules:** ALL surfaces must have gradient backgrounds (never flat). Inset shadows for pressed/recessed. Outset shadows for elevated. Tactile textures.

#### 3. Neumorphism
- **Tokens:** `--bg-primary: #e0e5ec`, `--accent-primary: #5f72af`, `--radius-base: 12px`, `--shadow-base: 6px 6px 12px rgba(174, 174, 192, 0.4), -6px -6px 12px rgba(255, 255, 255, 0.9)`, `--blur-base: 0px`
- **Allowed MCP:** input, switch, progress, button, badge
- **Forbidden MCP:** magic-card, border-beam, shiny-button, particles, card
- **Rules:** NEVER use standard borders. Dual box-shadows for depth. Element bg MUST match page bg exactly. Inset for pressed, outset for elevated.

#### 4. Glassmorphism
- **Tokens:** `--bg-primary: #1e1b4b`, `--bg-secondary: rgba(255, 255, 255, 0.08)`, `--accent-primary: #8b5cf6`, `--radius-base: 16px`, `--shadow-base: 0 8px 32px rgba(0, 0, 0, 0.3)`, `--blur-base: 16px`
- **Allowed MCP:** particles, dialog, blur-fade, magic-card, button, input, select, scroll-area
- **Forbidden MCP:** dot-pattern, shiny-button
- **Rules:** ALL cards/panels must use `backdrop-filter: blur(var(--blur-base))`. Background must be gradient/colorful. Borders semi-transparent white (rgba(255,255,255,0.1-0.2)). Never solid opaque backgrounds.

#### 5. Dark Mode (High-Contrast)
- **Tokens:** `--bg-primary: #000000`, `--accent-primary: #22d3ee`, `--radius-base: 8px`, `--shadow-base: none`, `--blur-base: 0px`
- **Allowed MCP:** tooltip, number-ticker, scroll-area, button, input, select, switch, badge, separator
- **Forbidden MCP:** magic-card, border-beam, particles, aurora-text, animated-gradient-text
- **Rules:** Background pure black or near-black. Text pure white or near-white. Borders very subtle (#1a1a1a to #262626). No shadows, no blur, no glass.

#### 6. Minimalism
- **Tokens:** `--bg-primary: #ffffff`, `--accent-primary: #111827`, `--radius-base: 0px`, `--shadow-base: none`, `--blur-base: 0px`
- **Allowed MCP:** separator, accordion, button, input, select, badge
- **Forbidden MCP:** marquee, particles, magic-card, border-beam, shiny-button, dot-pattern
- **Rules:** NEVER use borders, shadows, or background colors on cards. Typography carries ALL hierarchy — weight and size, not color or decoration. Maximum whitespace. One accent color used extremely sparingly.

#### 7. Brutalism
- **Tokens:** `--bg-primary: #ffffff`, `--accent-primary: #ff0000`, `--radius-base: 0px`, `--shadow-base: 6px 6px 0px #000000`, `--blur-base: 0px`
- **Allowed MCP:** button, input, terminal, badge, separator
- **Forbidden MCP:** magic-card, border-beam, particles, shiny-button, blur-fade, card, dialog
- **Rules:** NO rounded corners — sharp rectangles. 3px borders on ALL containers. Typography BOLD and MONOSPACE. No shadows with blur — only hard offset shadows. Extreme contrast encouraged.

### Font Options

```typescript
export const FONT_OPTIONS = [
  { label: 'Inter (Sans)', value: "'Inter', sans-serif" },
  { label: 'Geist (Sans)', value: "'Geist', sans-serif" },
  { label: 'SF Pro (Sans)', value: "'SF Pro Display', system-ui, sans-serif" },
  { label: 'JetBrains Mono (Code)', value: "'JetBrains Mono', monospace" },
]
```

### Easing Options

```typescript
export const EASING_OPTIONS = [
  { label: 'Linear', value: 'linear' },
  { label: 'Ease-Out', value: 'cubic-bezier(0.0, 0.0, 0.2, 1)' },
  { label: 'Ease-In-Out', value: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  { label: 'Spring', value: 'cubic-bezier(0.5, 1.5, 0.5, 1)' },
]
```

---

## CROSS-REFERENCE: SKILLS × PRESENTATION SYSTEM

| Presentation Element | Primary Skill | Secondary Skill |
|---------------------|---------------|-----------------|
| Theme token mapping | frontend-external-infra (re-skin rules) | impeccable (color domain) |
| Glass card styling | frontend-external-infra (glass layer) | impeccable (spatial domain) |
| Micro-interactions | humancentred-UIUX (feedback pillar) | impeccable (motion domain) |
| Layout asymmetry | humancentred-UIUX (visual hierarchy pillar) | impeccable (spatial domain) |
| Typography | impeccable (typography domain) | frontend-external-infra (re-skin fonts) |
| Anti-slop | frontend-external-infra (anti-slop checklist) | humancentred-UIUX (anti-patterns) |
| Empty/loading/error states | humancentred-UIUX (complete state coverage) | impeccable (harden command) |
| Validation rules | humancentred-UIUX (pre-return checklist) | impeccable (audit command) |
| Motion budget | impeccable (motion domain) | frontend-external-infra (animation timing) |
| UX copy | humancentred-UIUX (clarity pillar) | impeccable (UX writing domain) |
