# CONTEXT BUNDLE — Lyceum Learn Module Redesign (v3)

## Raw User Request (verbatim)

"the UI still really bad. Currently, it still looks like a vibe-coded shit. It looks like a vibe-coded which it is but like you can improve that. The welcoming page should be the best because it should show that this is a good page and should get a good first impression. Also, AI output was not valid JSON. Expected ',' or '}' after property value in JSON at position 4395 (line 107 column 89). Use the generate-prompt skill. Use all frontend skills — impeccable, humancentred-UIUX, frontend-design, frontend-external-infra, motion-alive. Use MCP tools to make the initial design choices. The AI receiving this prompt doesn't have access to MCP, so include the MCP results in the prompt."

---

## 1. Project Overview

**DeskFlow** — Electron + React + better-sqlite3 desktop productivity tracker.
**Lyceum** — Learning module inside DeskFlow. Routes at `/learn`. Uses `.ldoc` JSON format for lessons.
**Tech stack**: React 19, Vite, Tailwind CSS 4.1, framer-motion 12.35, lucide-react icons, Electron main process with better-sqlite3.
**No `lib/utils.ts`** — no `cn` utility. Components use template literals for className.
**No `@/` alias** — imports use relative paths like `../../../components/ui/blur-fade`.

---

## 2. Design System Tokens (DeskFlow)

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

--accent-secondary: #22d3ee  (cyan-400)
--success:         #34d399  (emerald-400)
--warning:         #fbbf24  (amber-400)
--error:           #f87171  (red-400)

--border-subtle:   #27272a
--border-default:  #3f3f46
--border-active:   #52525b
```

### Lyceum Page Accent
- `--page-accent` set inline on LearnPage wrapper: `#6366f1` (indigo-500)
- Lyceum uses indigo-400/500/600 as its accent range

### Geometry Rules
```
Max border-radius: rounded-xl (12px) — NEVER rounded-2xl/rounded-3xl
Card padding: p-5 (20px) — NEVER p-6/p-8
```

### Typography
```
Body font:    Geist / Inter (13px default)
Mono font:    JetBrains Mono
Heading:      weight 600, no different font family
Measure:      45-75 chars per line
Weight:       400 body, 500 labels, 600 headings, 700 hero
```

---

## 3. Motion Level — L2 Responsive

Per `motion-alive/SKILL.md` line 107: onboarding/empty state moments get a pass to L2.

**L2 — Responsive** ("alive but focused"):
- Allowed: everything in L1, plus list stagger, layout animations, AnimatePresence enter/exit, hover lift+glow, ONE restrained ambient accent, gentle spring on playful/secondary elements only
- Forbidden: multiple competing ambient layers, heavy particle systems, full-page scroll scenes
- Timing: 150-300ms, ease cubic-bezier(0.16,1,0.3,1); springs stiffness 300-500 / damping 30+
- All motion: transform + opacity ONLY — never width/height/top/left
- Reduced-motion guard: `@media (prefers-reduced-motion: reduce)` must suppress all animations

### Anti-Patterns
- NO spring physics on serious UI (use cubic-bezier)
- NO `transition: all 0.3s` — specify exact properties
- NO multiple competing ambient layers
- NO bounce/overshoot

---

## 4. MCP-Sourced Components (from Magic UI)

### BlurFade — Entrance Choreography
```tsx
// Source: registry/magicui/blur-fade.tsx
// ALREADY CREATED at: src/components/ui/blur-fade.tsx
// Uses framer-motion (motion.div, useInView, AnimatePresence)
// Props: delay?, duration?, direction?, offset?, blur?, inView?, inViewMargin?
// Behavior: useInView (once: true) triggers; blur 6px→0px + opacity 0→1 + y offset→0
// Re-skin: ease [0.16,1,0.3,1], duration ~0.4-0.5s, stagger ~0.07s between items
```

### ShinyButton — Primary CTA
```tsx
// Source: registry/magicui/shiny-button.tsx
// ALREADY CREATED at: src/components/ui/shiny-button.tsx
// Uses framer-motion (motion.button)
// Behavior: CSS mask traveling light sweep (--x variable 100%→-100%), spring repeat
// Re-skinned: indigo accent, rounded-xl, border-indigo-500/40
```

### AnimatedGradientText — Heading Enhancement
```tsx
// Source: registry/magicui/animated-gradient-text.tsx
// NOT YET CREATED — must be adapted for framer-motion (not motion/react)
// Props: speed?, colorFrom?, colorTo?
// Behavior: animated gradient background-position on text via CSS animation
// Re-skin: colorFrom="#6366f1" (indigo-500), colorTo="#a78bfa" (violet-400)
// NOTE: uses cn utility — must replace with template literals
```

### AnimatedShinyText — Subtle Text Shimmer
```tsx
// Source: registry/magicui/animated-shiny-text.tsx
// NOT YET CREATED
// Props: shimmerWidth?
// Behavior: light glare pans across text via CSS background-position animation
// Re-skin: gradient via-white/80 for dark theme
// NOTE: uses cn utility — must replace with template literals
```

### BorderBeam — Animated Border Accent
```tsx
// Source: registry/magicui/border-beam.tsx
// NOT YET CREATED — imports from motion/react, must change to framer-motion
// Props: size?, duration?, delay?, colorFrom?, colorTo?, reverse?, initialOffset?, borderWidth?
// Behavior: animated beam travels along container border using offset-path
// Re-skin: colorFrom="#6366f1", colorTo="#a78bfa"
// NOTE: uses cn utility — must replace with template literals
```

### NeonGradientCard — Featured Card Glow
```tsx
// Source: registry/magicui/neon-gradient-card.tsx
// NOT YET CREATED
// Props: borderSize?, borderRadius?, neonColors? {firstColor, secondColor}
// Behavior: animated neon gradient border with blur glow behind card
// Re-skin: firstColor="#6366f1", secondColor="#8b5cf6", borderRadius=12
// NOTE: uses cn utility — must replace with template literals
```

---

## 5. Current Code — LearnPage.tsx Welcome Screen (lines 275-398)

```tsx
// Current implementation structure:
// - Ambient aurora background (radial gradient, CSS keyframe animation)
// - BlurFade cascade with staggered delays (0, 0.08, 0.16, 0.22, 0.28, 0.36)
// - Icon cluster (BookOpen in gradient container with glow halo)
// - Heading + subtext
// - ShinyButton primary CTA ("Create New Lesson")
// - Gradient divider with "or"
// - Three secondary cards (Try example, Import file, Paste ldoc)
// - "How it works" tertiary link
// - OnboardingPanel + CreateLessonDialog modals
// - @keyframes aurora-glow CSS animation
```

**Problems with current:**
- Still looks generic — the same pattern as every AI-generated empty state
- No visual depth or texture — just a flat radial gradient
- Secondary cards have no personality — just icons in boxes
- No sense of "this is a premium product"
- The aurora glow is too subtle and doesn't create real atmosphere

---

## 6. Current Code — CreateLessonDialog.tsx (599 lines)

```tsx
// Structure:
// - Step-based wizard: 'input' → 'prompt' → 'result'
// - Input mode toggle: simple vs detailed
// - Simple mode: single textarea for topic
// - Detailed mode: topic + description + context doc upload + numNodes slider
// - Prompt step: shows generated prompt + system prompt, copy button, validate + generate buttons
// - Result step: shows generated lesson JSON, import button
// - Uses framer-motion AnimatePresence for step transitions
// - All Lucide icons, dark theme styling
```

**Problems with current:**
- Step transitions are abrupt — no staggered entrance
- The dialog itself is functional but not beautiful
- No visual feedback during generation (just a spinner)
- The prompt preview is a raw textarea — should be a code block

---

## 7. JSON Generation Error

**Error:** `AI output was not valid JSON. Expected ',' or '}' after property value in JSON at position 4395 (line 107 column 89)`

**Source:** The `learn:buildPrompt` IPC handler (src/services/learn/index.ts:115) builds a prompt using `author-guide.md` as the system prompt, then sends it to the AI provider. The AI returns JSON with trailing commas or malformed structure.

**author-guide.md rule 9:** "Output valid JSON ONLY. No comments, no trailing commas, no markdown fences, no text before or after the JSON object."

**Root cause:** The AI model is generating JSON with trailing commas (e.g., `{"key": "value",}`) which is invalid JSON. The author-guide.md explicitly warns against this but the model doesn't always comply.

**Fix needed:** Either:
1. Add JSON parsing with fallback (try JSON.parse, if fails try removing trailing commas)
2. Add a stricter prompt instruction
3. Post-process the AI output to strip trailing commas before parsing

---

## 8. IPC Endpoints

| Endpoint | Purpose |
|----------|---------|
| `learn:importLdoc` | Import + validate + save lesson JSON |
| `learn:validate` | Validate JSON against ldoc schema |
| `learn:pick-file` | Open file picker for .ldoc files |
| `learn:get-worked-example` | Load bundled example lesson |
| `learn:get-schema` | Load ldoc.schema.json |
| `learn:get-author-guide` | Load author-guide.md |
| `learn:listLessons` | List all saved lessons |
| `learn:getLesson` | Get full lesson with nodes |
| `learn:getNode` | Get single node with blocks |
| `learn:getGraph` | Get lesson dependency graph |
| `learn:askTutor` | Ask tutor a question |
| `learn:submitQuiz` | Submit quiz answer |
| `learn:getProgress` | Get mastery progress |
| `learn:getDueReviews` | Get spaced repetition reviews |
| `learn:buildPrompt` | Build AI prompt from user input |
| `learn:generateLesson` | Generate lesson via AI |

---

## 9. Files That Must Be Modified

1. `src/components/learn/LearnPage.tsx` — Welcome screen (empty state) + overall page styling
2. `src/components/learn/CreateLessonDialog.tsx` — Lesson creation dialog
3. `src/components/ui/animated-gradient-text.tsx` — NEW component (if used)
4. `src/components/ui/animated-shiny-text.tsx` — NEW component (if used)
5. `src/components/ui/border-beam.tsx` — NEW component (if used)
6. `src/services/learn/index.ts` — JSON parsing fix for trailing commas
7. `src/index.css` — @keyframes for aurora-glow and any new animations

---

## 10. Source Routing (from frontend-external-infra SKILL.md)

| Need | MCP Server | Component |
|------|-----------|-----------|
| Entrance animation | Magic UI | BlurFade ✅ already created |
| Primary CTA shine | Magic UI | ShinyButton ✅ already created |
| Heading gradient | Magic UI | AnimatedGradientText |
| Text shimmer | Magic UI | AnimatedShinyText |
| Animated border | Magic UI | BorderBeam |
| Card glow | Magic UI | NeonGradientCard |
| Icons | Lucide | (already using lucide-react) |
| Standard blocks | shadcn | (not usable — no registries configured) |
