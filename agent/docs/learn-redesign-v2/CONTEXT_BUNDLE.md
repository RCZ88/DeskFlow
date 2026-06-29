# CONTEXT BUNDLE — Lyceum Learn Module Redesign (v2)

## Raw User Request (verbatim)
"The lesson creation UI still looks vibe-coded. Also, AI output was not valid JSON. Can you use the generate-prompt skill, use all frontend skills (impeccable, humancentred-UIUX, frontend-design, frontend-external-infra, motion), and use MCP tools (Magic UI, Lucide, shadcn) to design the best possible UI for the Learn module's welcome screen and create lesson dialog. Make it premium and non-generic."

---

## 1. Design System Tokens (DeskFlow)

### CSS Variables (src/index.css)
```
--bg-primary:     #09090b   (zinc-950 base)
--bg-secondary:   #18181b   (zinc-900 elevated)
--bg-tertiary:    #27272a   (zinc-800)
--bg-glass:       rgba(24, 24, 27, 0.80)
--bg-glass-heavy: rgba(24, 24, 27, 0.92)

--text-primary:   #f4f4f5   (zinc-100)
--text-secondary: #a1a1aa   (zinc-400)
--text-muted:     #52525b   (zinc-600)

--accent-primary:   #ec4899 (pink-500 — DeskFlow brand)
--accent-hover:     #db2777 (pink-600)
--accent-muted:     rgba(236, 72, 153, 0.15)

--accent-secondary: #22d3ee  (cyan-400 — secondary info)
--success:         #34d399  (emerald-400)
--warning:         #fbbf24  (amber-400)
--error:           #f87171  (red-400)

--border-subtle:   #27272a
--border-default:  #3f3f46
--border-active:   #52525b
```

### Lyceum Page Accent
- Page accent is `--page-accent` set via inline style on LearnPage wrapper
- Lyceum uses **indigo-500** as its primary accent (indigo-400/500/600 range)

### Spacing Scale
```
xs: 4px   sm: 8px   md: 12px   lg: 16px   xl: 24px   2xl: 32px
```

### Animation Tokens
```
fast:   150ms (hover/press)
normal: 250ms (modals/dropdowns)
slow:   400ms (page transitions)
ease-out: cubic-bezier(0.16, 1, 0.3, 1)
```

### Typography
```
Body font:    Geist / Inter (13px default)
Mono font:    JetBrains Mono
Heading:      weight 600, no different font family
Measure:      45-75 chars per line (max-w-prose / max-w-[65ch])
```

### Geometry Rules
```
Max border-radius: rounded-xl (12px) — NEVER rounded-2xl/rounded-3xl
Card padding: p-5 (20px) — NEVER p-6/p-8
```

---

## 2. Motion Level Selection

**Level: L2 — Responsive** ("alive but focused")
- Applies to: onboarding/empty state moment — allowed to be more expressive than a data dashboard
- Onboarding moments get a pass to L2 per the motion skill (line 107 of motion-alive SKILL.md)
- One restrained ambient accent is permitted at L2

### Motion Families Used
- **B: Transitional** — List stagger entrance (BlurFade with staggered delays)
- **A: Reactive** — Hover lift + press feedback on all buttons
- **C: Ambient** — ONE subtle background element (floating dot grid or aurora glow)

### Anti-Patterns to Avoid
- NO spring physics (L2 "gentle" springs only: stiffness 300, damping 30)
- NO multiple competing ambient layers
- NO gradients "on everything" — one intentional gradient is allowed
- NO bounce/overshoot on serious UI
- All motion: transform + opacity only, never width/height/top/left
- Reduced-motion guard: `@media (prefers-reduced-motion: reduce)` must suppress all animations

---

## 3. MCP-Sourced Components

### BlurFade (Magic UI) — RECOMMENDED for entrance choreography
```tsx
// Source: registry/magicui/blur-fade.tsx
// Dependency: motion (motion/react)
// Install: npx shadcn@latest add "https://magicui.design/r/blur-fade.json"
import { BlurFade } from "@/components/ui/blur-fade"
// Props: delay?, duration?, direction?, offset?, blur?
// Behavior: uses useInView (once: true) to trigger; wraps AnimatePresence + motion.div
// Animation: blur 6px → 0px + opacity 0→1 + y offset → 0
// Re-skin for DeskFlow: use ease [0.16,1,0.3,1], duration ~0.4-0.5s, stagger ~0.07s between items
```
**Usage for welcome screen:** Wrap each element in BlurFade with incrementing `delay={0.05 * index}`. Stagger creates a cascade that signals "the app is alive and ready."

### ShinyButton (Magic UI) — RECOMMENDED for primary CTA
```tsx
// Source: registry/magicui/shiny-button.tsx
// Dependency: motion
// Install: npx shadcn@latest add "https://magicui.design/r/shiny-button.json"
import { ShinyButton } from "@/components/ui/shiny-button"
// Behavior: CSS mask traveling light sweep across the button text
// Animation: --x CSS variable travels from 100% → -100%, spring-based repeat
// Re-skin for DeskFlow:
//   - Change dark:bg-[radial-gradient(...)] to use indigo accent
//   - Change dark:text-[rgb(255,255,255,90%)] to zinc-100
//   - border color: indigo-500/40
//   - hover:shadow-[0_0_20px_var(--accent-primary)/15%]
```
**Usage:** Primary "Create New Lesson" button — the shine sweep adds a "crafted" premium feel without being garish.

### NeonGradientCard (Magic UI) — CANDIDATE for featured cards
```tsx
// Source: registry/magicui/neon-gradient-card.tsx
// Default colors: #ff00aa (pink) + #00FFF1 (cyan)
// Re-skin for DeskFlow/Lyceum: firstColor: '#6366f1' (indigo-500), secondColor: '#8b5cf6' (violet-500)
// Note: uses rounded-(borderRadius) CSS variable, needs DeskFlow rounded-xl max
// Warning: this is for cards that DESERVE a glow border — use sparingly
```

### dot-pattern-with-glow-effect (Magic UI) — AMBIENT background
```tsx
// Install: npx shadcn@latest add "https://magicui.design/r/dot-pattern-with-glow-effect.json"
```

### animated-grid-pattern (Magic UI) — AMBIENT background
```tsx
// Install: npx shadcn@latest add "https://magicui.design/r/animated-grid-pattern.json"
// Pure CSS animated grid with SVG
```

---

## 4. Current Code — LearnPage Welcome Screen (lines 273–395)

```tsx
// Empty state — current implementation
// PROBLEMS: generic layout, no real motion choreography, no distinct personality
// Still has: ambient radial, icon, heading, primary CTA, divider, 3 secondary cards, tertiary link

<div className="h-full flex flex-col items-center justify-center py-20 px-4 relative overflow-hidden">
  {/* Ambient radial */}
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="w-[480px] h-[480px] rounded-full opacity-20"
      style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.06) 45%, transparent 70%)' }}
    />
  </div>

  {/* Icon — motion.div with scale+opacity, no blur */}
  <motion.div initial={{ opacity:0, scale:0.88 }} animate={{ opacity:1, scale:1 }}
    transition={{ duration:0.45, ease:[0.16,1,0.3,1] }}>
    {/* Glow halo behind icon */}
    <div className="absolute inset-0 blur-2xl opacity-40 scale-150"
      style={{ background:'radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)' }} />
    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
      <BookOpen className="w-8 h-8 text-indigo-400" />
    </div>
  </motion.div>

  {/* Heading */}
  <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
    transition={{ duration:0.4, delay:0.08, ease:[0.16,1,0.3,1] }}>
    <h2 className="text-2xl font-semibold text-zinc-100 tracking-tight mb-2">Welcome to Lyceum</h2>
    <p className="text-zinc-500 text-sm leading-relaxed max-w-sm">Learn anything through structured, mastery-tracked lessons...</p>
  </motion.div>

  {/* Primary CTA — generic indigo button */}
  <motion.button ...>
    <Wand2 className="w-4 h-4 text-indigo-200" /> Create New Lesson
  </motion.button>

  {/* Divider with "or" */}

  {/* Three secondary action cards — equal width, stacked horizontally */}
  <div className="flex items-center gap-2 w-full max-w-xs">
    <button ...><Download /> Try the example</button>
    <button ...><FileUp /> Import file</button>
    <button ...><FileCode2 /> Paste</button>
  </div>

  {/* Tertiary "How it works" link */}
  <button ...>How it works</button>
</div>
```

### Problems with Current Welcome Screen
1. **Stagger is fake** — each motion.div has hardcoded delay but they don't actually chain in a meaningful sequence
2. **No blur-fade** — no actual blur-to-sharp entrance, just opacity+fade
3. **Primary CTA is generic** — just a bg-indigo button with shadow, no premium feel
4. **Secondary cards look alike** — identical styling, just different icons/colors, no visual hierarchy
5. **Ambient radial is bland** — static radial gradient, no animation
6. **"or" divider is weak** — just two 1px lines with text, no personality

---

## 5. Current Code — CreateLessonDialog (already redesigned, 599 lines)

The CreateLessonDialog was already rewritten in the previous session. Key current features:
- Segmented mode toggle (Simple/Detailed) in step indicator row
- AnimatePresence mode transitions
- 3-step flow (input → prompt → result)
- File upload support
- Prompt copy + download
- "Generate Here" with inline status/error/success states

**Remaining issues to verify:**
- Does the `BlurFade` component work correctly with the step transitions?
- Is the JSON generation error (invalid JSON with trailing comma) fixed in the backend?

---

## 6. File Structure

```
src/components/learn/
  LearnPage.tsx         — Main page, welcome screen at lines 273-395
  CreateLessonDialog.tsx — Modal dialog (already redesigned, 599 lines)
  OnboardingPanel.tsx   — "How it works" panel
  BlockRenderer.tsx      — Lesson content renderer
  TutorPanel.tsx        — AI tutor panel
  MasteryRing.tsx       — Progress ring component
  CurriculumGraph.tsx    — Knowledge graph visualization
  ValidationReport.tsx   — JSON validation report
  SelectionFloatingPill.tsx — Text selection floating UI
  CitationChip.tsx       — Citation reference chips
  WidgetHost.tsx        — Widget container

src/index.css           — Design tokens, CSS vars, scrollbar styles
```

---

## 7. JSON Generation Error

**Error description:** "AI output was not valid JSON. Expected ',' or '}' after property value in JSON at position 4395 (line 107 column 89)"

**Likely cause:** The AI returned a trailing comma in the JSON output (e.g., `"nodes": [{...}, {...},]`) or similar syntax error. This is a backend issue in the lesson generation prompt in `resources/learn/author-guide.md`.

**Backend files to check/fix:**
- `resources/learn/author-guide.md` — system prompt for AI lesson generation
- `src/services/learn/index.ts` — `learn:buildPrompt` IPC handler
- `src/services/learn/` — generation service

---

## 8. Constraints

1. Must use `BlurFade` from Magic UI for entrance choreography (installable via `npx shadcn@latest add "https://magicui.design/r/blur-fade.json"`)
2. Primary CTA should use `ShinyButton` from Magic UI (installable via `npx shadcn@latest add "https://magicui.design/r/shiny-button.json"`)
3. All motion must respect `prefers-reduced-motion`
4. Animation tokens: ease `[0.16,1,0.3,1]`, duration 150-400ms, stagger 50-70ms
5. Max border-radius: `rounded-xl` (12px)
6. DeskFlow page accent for Learn: indigo-500/600 range
7. Font stack: Geist (body) + JetBrains Mono (code)
8. The `BlurFade` component requires `motion` package (already available as `framer-motion` is installed)
9. shadcn MCP is NOT configured in this project (no components.json at project root) — components must be installed via CLI command, not pulled via MCP at build time. The MCP is used only for SOURCE/REFERENCE, not for direct import.
