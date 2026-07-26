# PROMPT — Lyceum Learn Module: Premium Welcome Screen + Dialog Polish

## Raw Request (verbatim)

> "The lesson creation UI still looks vibe-coded. Also, AI output was not valid JSON. Can you use the generate-prompt skill, use all frontend skills (impeccable, humancentred-UIUX, frontend-design, frontend-external-infra, motion), and use MCP tools (Magic UI, Lucide, shadcn) to design the best possible UI for the Learn module's welcome screen and create lesson dialog. Make it premium and non-generic."

---

## Problem Statement

The Learn module's welcome screen (empty state) and CreateLessonDialog have functional UIs but look generic and "vibe-coded" — they don't convey the quality of the underlying system. The welcome screen is the first impression for a learning product and must feel premium, crafted, and trustworthy. The CreateLessonDialog (already redesigned but may need polish) handles two modes and a 3-step flow.

Additionally: the AI lesson generation returns invalid JSON (trailing comma issue).

---

## Context Bundle Reference

All code context, design tokens, MCP components, and current implementations are in:
**`agent/docs/learn-redesign-v2/CONTEXT_BUNDLE.md`** — read this first. It contains:
- DeskFlow CSS design tokens (colors, spacing, animation tokens)
- DeskFlow geometry rules (max `rounded-xl`, max `p-5`)
- **MCP-sourced Magic UI components** with source code: `BlurFade` (entrance animation), `ShinyButton` (CTA), `NeonGradientCard` (glowing card), `dot-pattern-with-glow-effect` (ambient background)
- Motion skill **L2 — Responsive** guidance (onboarding/empty state moment)
- Current welcome screen code at `src/components/learn/LearnPage.tsx` lines 273–395
- Current CreateLessonDialog code at `src/components/learn/CreateLessonDialog.tsx` (599 lines, already redesigned)
- JSON generation error details

---

## Mandatory Skills & Constraints

You MUST apply ALL of these skills during design and implementation:

1. **`impeccable`** (design skill) — Typography scale (1.25 ratio), HSL dark-theme color discipline, spatial 8px grid, motion duration scale, interaction states (hover/focus/press/disabled)
2. **`humancentred-UIUX`** (design skill) — 6 pillars: clarity, progressive disclosure, visual hierarchy, complete state coverage (empty/loading/error/populated), feedback micro-interactions, forgiveness/affordance. Empty state must have: icon + one-line explanation + clear CTA. Anti-slop checklist.
3. **`frontend-design`** (DeskFlow-specific) — Color system (zinc-950 base, pink-500 accent, cyan-400 info), per-page accent colors, spacing scale, animation tokens, typography scale, anti-patterns (no box-shadow elevation, no pure black, no >2 fonts)
4. **`frontend-external-infra`** (MCP routing) — Source routing rules, DeskFlow re-skin checklist, anti-slop checklist. Key: use `BlurFade` (Magic UI) for entrance, `ShinyButton` (Magic UI) for CTA.
5. **`motion-alive`** ("Bring the UI Alive") — L2 Responsive for onboarding moment. Three motion families: Reactive (hover/press), Transitional (entrance stagger), Ambient (ONE restrained accent). Anti-patterns: no springs in serious UI, no multiple ambient layers, no bounce.

**Hard constraints:**
- `max rounded-xl` (12px) — never `rounded-2xl` or `rounded-3xl`
- `max p-5` card padding (20px) — never `p-6` or `p-8`
- Body font: Geist / Inter (13px default)
- Mono font: JetBrains Mono
- Animation easing: `cubic-bezier(0.16, 1, 0.3, 1)` for all UI transitions
- Reduced-motion: `@media (prefers-reduced-motion: reduce)` must suppress all animations
- Only `transform` + `opacity` for all transitions — never animate `width`, `height`, `top`, `left`, `box-shadow` geometry
- Motion budget (L2): 150–300ms for UI transitions, 400ms for page-level, ambient loops 8–30s
- ONE ambient accent only at L2

---

## Engineering Tasks

### Task E1: BlurFade Entrance System (Welcome Screen)
Install and integrate `BlurFade` from Magic UI for the welcome screen entrance choreography.

**Install command (run in project root):**
```
npx shadcn@latest add "https://magicui.design/r/blur-fade.json"
```

**Implementation approach:**
- Wrap each visual element (icon, heading, CTA, divider, secondary cards, tertiary link) in individual `<BlurFade>` components
- Use staggered `delay` props: icon `0ms`, heading `80ms`, CTA `160ms`, divider `220ms`, secondary cards `280ms`, tertiary link `360ms`
- Direction: `"up"` for all elements
- Duration: `0.4` (400ms)
- Direction offset: `8` (8px y travel)
- Blur: `6px` to `0px`
- Easing: `easeOut` (built into BlurFade)
- Wrap in `AnimatePresence` at the container level to handle unmount gracefully

**Reduced-motion variant:** When `prefers-reduced-motion` is active, collapse BlurFade to instant opacity with no blur/transform using `useReducedMotion()` from `motion/react`.

### Task E2: ShinyButton for Primary CTA
Install and integrate `ShinyButton` from Magic UI for the "Create New Lesson" CTA.

**Install command:**
```
npx shadcn@latest add "https://magicui.design/r/shiny-button.json"
```

**Re-skin for DeskFlow/Lyceum:**
- Change `--primary` CSS var usage to indigo accent: replace the button's `dark:bg-[radial-gradient(circle_at_50%_0%,var(--primary)/10%...)]` with indigo-500/15
- Change `dark:text-[rgb(255,255,255,90%)]` to `text-zinc-50` or `text-zinc-100`
- Change border to `border-indigo-500/40`
- Add `hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]` on hover
- Keep the shine sweep effect — it adds a premium "crafted" feel without being garish
- Button text: `"Create New Lesson"` with `Wand2` icon

### Task E3: Ambient Background (ONE restrained accent)
Add ONE subtle animated background element behind the welcome screen content.

**Recommended approach — CSS radial aurora (L2 appropriate):**
```css
@keyframes aurora-glow {
  0%, 100% { transform: scale(1) translateY(0); opacity: 0.18; }
  50% { transform: scale(1.08) translateY(-8px); opacity: 0.28; }
}
.aurora-glow {
  animation: aurora-glow 12s ease-in-out infinite;
}
```
Apply as a pseudo-element or absolute-positioned div behind the content.

**Alternative — animated dot grid (Magic UI):**
```
npx shadcn@latest add "https://magicui.design/r/dot-pattern-with-glow-effect.json"
```
Use as a `position: absolute` backdrop with `opacity: 0.4`, scaled to fill the container, `pointer-events: none`.

**Constraint:** Only ONE ambient layer. Do NOT combine aurora + dot grid + shimmer simultaneously.

### Task E4: Secondary Action Cards — Visual Hierarchy
The three secondary actions (Try Example, Import File, Paste ldoc) must have distinct visual weight and clear affordances.

**Design:**
- Each card: `flex-col` (icon above, label below) — vertical stack, not horizontal
- Cards have equal width, rounded-xl, subtle border
- Icon color: each card has a distinct accent color (indigo for example, emerald for import, amber for paste) — these colors come from DeskFlow's semantic tokens
- Hover: `translateY(-2px)` + border brightens + icon color intensifies
- Press: `scale(0.97)` tactile feedback
- Disabled state (importing example): `opacity-40 cursor-not-allowed` + spinner icon

### Task E5: JSON Generation Error — Backend Fix
Investigate and fix the JSON generation error in the AI lesson generation pipeline.

**Likely cause:** The AI returns JSON with a trailing comma or incomplete object at position 4395 (line 107).

**Files to investigate:**
- `resources/learn/author-guide.md` — system prompt for AI generation
- `src/services/learn/index.ts` — `learn:buildPrompt` handler
- Any AI provider call code that formats the JSON response

**Fix approach:**
1. Add JSON validation on the backend before returning: parse the JSON, if it fails, attempt to fix common issues (trailing commas, unquoted keys) or return an error
2. Add a comment to the author-guide.md instructing the AI to output ONLY valid JSON with no trailing commas
3. Alternatively: wrap JSON.parse in a try/catch and apply a post-processing regex to strip trailing commas before the final parse

---

## High-Fidelity Visual Specs

### Welcome Screen Layout
```
┌──────────────────────────────────────────────────┐
│                                                  │
│        [ambient aurora/dot grid — subtle]        │
│                                                  │
│               ┌─────────────────┐                │
│               │   BookOpen icon │                │
│               │   (w-16 h-16)  │                │
│               │  indigo glow    │                │
│               └─────────────────┘                │
│                                                  │
│            Welcome to Lyceum                      │
│   Learn anything through structured lessons...    │
│                                                  │
│        ╔══════════════════════════════╗        │
│        ║   ✦ Create New Lesson         ║  ← ShinyButton
│        ╚══════════════════════════════╝        │
│                                                  │
│                   or                             │
│                                                  │
│     ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│     │  ↓ example│ │ ↑ import│ │  ldoc  │       │
│     │ Try the  │ │ Import  │ │  Paste  │       │
│     │ example  │ │  file   │ │  ldoc   │       │
│     └─────────┘ └─────────┘ └─────────┘       │
│                                                  │
│              How it works  ?                   │
└──────────────────────────────────────────────────┘
```

### Typography
- Welcome heading: `text-2xl font-semibold text-zinc-100 tracking-tight`
- Subheading: `text-sm text-zinc-500 leading-relaxed max-w-sm`
- Primary CTA: `text-sm font-semibold`
- Secondary cards: `text-xs font-medium`
- Tertiary link: `text-xs text-zinc-600`

### Colors
- Page accent: `indigo-500` / `indigo-400` / `indigo-600`
- Primary CTA bg: `bg-indigo-500`, hover `bg-indigo-400`, text `text-zinc-50`
- Secondary card borders: `border-zinc-700/50`, hover `border-zinc-600/60`
- Secondary card icon colors: `text-indigo-400` (example), `text-emerald-400` (import), `text-amber-400` (paste)

### Spacing
- Welcome screen vertical padding: `py-20` (80px)
- Element gaps: `gap-5` (20px) between major elements
- Secondary cards gap: `gap-2` (8px)
- CTA top margin: `mt-2` (8px) below divider

### Motion Choreography (BlurFade stagger)
```
Icon:         delay=0,    duration=0.4, blur=6→0, y=8→0
Heading:      delay=0.08,  duration=0.4, blur=6→0, y=8→0
CTA:          delay=0.16,  duration=0.4, blur=6→0, y=8→0
Divider:      delay=0.22,  duration=0.3, opacity only
Cards:        delay=0.28,  duration=0.4, blur=6→0, y=8→0
How it works: delay=0.36,  duration=0.3, opacity only
```

### Hover/Focus States
- **All buttons**: `whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}` (motion/react)
- **Primary CTA**: border glows `indigo-500/40 → indigo-400/60` on hover
- **Secondary cards**: `bg-zinc-800/50 → bg-zinc-800/80`, border brightens, icon color intensifies
- **Focus-visible**: `ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-zinc-950`

---

## Interaction Flows

### Flow 1: First Visit (Empty State)
1. User lands on Learn page → empty state renders
2. BlurFade cascade plays: icon → heading → CTA → divider → cards → link
3. User sees ambient background animation (subtle)
4. User's eye is drawn to primary CTA ("Create New Lesson")
5. Secondary actions visible below, recede visually (lower contrast)
6. "How it works" is tertiary — lowest visual weight

### Flow 2: User clicks "Create New Lesson"
1. `ShinyButton` press animation (scale 0.97)
2. `CreateLessonDialog` opens via `AnimatePresence`
3. Dialog enters with scale 0.96 → 1.0, opacity 0 → 1 (250ms, ease-out)
4. Step 1 (input mode) shown

### Flow 3: Mode Toggle in Dialog
1. User clicks "Simple" or "Detailed" segmented control
2. AnimatePresence crossfades between the two form variants
3. Content slides horizontally (simple ↔ detailed) — 200ms ease-out

### Flow 4: Generate Prompt (Step 1 → Step 2)
1. User fills form + clicks "Generate Prompt"
2. Button enters loading state: `opacity-70 cursor-wait + spinner`
3. IPC call to `learnBuildPrompt` with params
4. Result arrives → step transitions to "prompt"
5. Prompt block fades in (200ms)

### Flow 5: JSON Error
1. User clicks "Generate Here" in dialog (Step 2)
2. Generation fails → error state appears below CTA card
3. Error message: plain-language, no raw JSON visible
4. Error includes recovery action ("Check your input and try again")

---

## Empty State Requirements (humancentred-UIUX)

Per the Complete State Coverage pillar, the welcome screen IS the empty state. It must have:
- **Icon**: BookOpen in indigo — clear signifier of "learning/lessons"
- **Explanation**: "Learn anything through structured, mastery-tracked lessons. Build your own or let AI generate one tailored to you."
- **Primary CTA**: "Create New Lesson" — the ONE clear action
- **Secondary actions**: 3 paths for different user intents (try example, import existing, paste)
- **Tertiary**: "How it works" for users who need orientation

---

## Anti-Slop Checklist (from frontend-external-infra SKILL.md)

- [ ] **Type**: Geist body + JetBrains Mono code only — no third font
- [ ] **Color**: NOT purple/indigo gradient-on-everything. Gradient is intentional and rare — only on ONE element (CTA or icon background)
- [ ] **Geometry**: `rounded-xl` max, `p-5` card padding
- [ ] **Hero**: no tiny uppercase eyebrow pill + oversized headline + lone CTA cliché
- [ ] **Sections**: no repeated tracked-upercase kicker label above every heading
- [ ] **Motion**: real micro-interactions on key actions; respects `prefers-reduced-motion`
- [ ] **Imagery**: matches the actual product; no filler glow/blobs beyond the ONE ambient layer
- [ ] **Empty/loading/error states**: exist and styled per DeskFlow patterns
- [ ] **Icons**: all from lucide-react — no emoji, no inline SVG duplicates
- [ ] **Accessibility**: focus-visible rings use `ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-zinc-950`

---

## Output Format

Return a complete, production-ready implementation as a structured response with:

1. **File changes** — exact file paths and the full replacement code for each changed section
2. **Install commands** — any Magic UI / shadcn component install commands needed
3. **Anti-slop self-check** — confirm each checklist item passes
4. **Motion level declaration** — state "Built at L2 (Responsive)"
5. **JSON fix details** — exact code changes for the JSON validation fix

DO NOT output multiple options. Design the single best solution and implement it.
