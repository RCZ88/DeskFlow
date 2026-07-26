# BUILD PACKET — Lyceum Learn Module Premium Redesign

> Hand this to the coding agent (it has the repo; this packet has the resolved design + full code). Every decision that would normally come from MCP/skills is **already made and embedded** below. Do not re-open settled choices. Stay inside the files in CONTEXT_BUNDLE.md §9. No `cn`, no `@/`, `framer-motion` only, `rounded-xl`/`p-5` max, indigo accent (not pink).

---

## 0 · Resolved design decisions (these ARE the "MCP results" — do not deviate)

**The single ambient layer (Requirement 8 — choose ONE): a static dot-grid texture + ONE slow breathing radial glow.**
Rationale: aurora blobs are the #1 “AI-slop” tell (Requirement 5). A faint dot grid with a radial fade mask reads like Linear/Raycast — *intentional surface*, not decoration. The grid is **static** (texture, not motion), and the **only animated ambient element** is one indigo radial glow that breathes 9s ease-in-out. That satisfies “ONE restrained ambient accent” with zero competing layers. Implemented purely inline in `LearnPage.tsx` + keyframes in `index.css` (no new ambient component file, per §9).

**Component assignments (locked):**
| Surface element | Component | Props |
|---|---|---|
| “Welcome to Lyceum” heading | `AnimatedGradientText` (new) | `colorFrom="#6366f1"`, `colorTo="#a78bfa"`, `speed={1}` |
| Subtitle | `AnimatedShinyText` (new) | dark-skinned, `shimmerWidth={120}` |
| Primary CTA shine | `ShinyButton` (exists) | indigo, `Wand2` icon as children |
| CTA featured border | `BorderBeam` (new) | `colorFrom="#6366f1"`, `colorTo="#a78bfa"`, `size={60}`, `duration={6}` |
| Entrance cascade | `BlurFade` (exists) | `direction="up"`, `duration={0.45}`, `blur="6px"`, stagger `0.07` |
| Icons | lucide-react | BookOpen, Wand2, Download, FileUp, FileCode2, HelpCircle |

**Color budget (Requirement 2):** indigo-500 primary, violet-400 secondary, emerald-400 success. Depth via opacity layers (`/10`, `/15`, `/20`, `/50`) — no new hex.

**Spatial (Requirement 3):** 8px grid. Hero stack gaps 24–40px. Cards `p-5` max, `py-4` min on tap targets (≥ 44px). `rounded-xl` max everywhere.

**Motion timing (L2):** cubic-bezier `[0.16, 1, 0.3, 1]`, 150ms hover/press, 400–450ms entrance. Transform + opacity only. Reduced-motion suppresses everything (guards included).

---

## 1 · NEW — `src/components/ui/animated-gradient-text.tsx`

```tsx
import React from 'react';

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
  /** Higher = faster sweep. 1 ≈ 8s loop. */
  speed?: number;
  colorFrom?: string;
  colorTo?: string;
}

/**
 * Animated gradient text. Re-skinned from Magic UI for framer-motion-free CSS
 * (pure background-position animation — cheaper than JS). Reduced-motion is
 * handled by the `.lyceum-animate-gradient` rule in index.css.
 */
export function AnimatedGradientText({
  children,
  className = '',
  speed = 1,
  colorFrom = '#6366f1',
  colorTo = '#a78bfa',
}: AnimatedGradientTextProps) {
  return (
    <span
      className={`lyceum-animate-gradient inline bg-clip-text text-transparent ${className}`}
      style={{
        ['--bg-size' as string]: `${speed * 300}%`,
        ['--color-from' as string]: colorFrom,
        ['--color-to' as string]: colorTo,
        backgroundImage:
          'linear-gradient(90deg, var(--color-from), var(--color-to), var(--color-from))',
        backgroundSize: 'var(--bg-size) 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      {children}
    </span>
  );
}
```

**Why:** No `cn`, no `motion/react`. Gradient runs as CSS so it can't jank the entrance cascade. Indigo→violet only.

---

## 2 · NEW — `src/components/ui/animated-shiny-text.tsx`

```tsx
import React, { CSSProperties } from 'react';

interface AnimatedShinyTextProps {
  children: React.ReactNode;
  className?: string;
  /** Width of the moving highlight band, px. */
  shimmerWidth?: number;
}

/**
 * Subtle light glare that pans across muted text. Dark-theme skin: base text
 * zinc-400/70, highlight via-white/80. Reduced-motion handled in index.css.
 */
export function AnimatedShinyText({
  children,
  className = '',
  shimmerWidth = 120,
}: AnimatedShinyTextProps) {
  return (
    <span
      style={{ ['--shiny-width' as string]: `${shimmerWidth}px` } as CSSProperties}
      className={
        'lyceum-animate-shiny-text mx-auto max-w-md bg-clip-text bg-no-repeat ' +
        '[background-position:0_0] [background-size:var(--shiny-width)_100%] ' +
        'text-zinc-400/70 ' +
        'bg-gradient-to-r from-transparent via-white/80 via-50% to-transparent ' +
        className
      }
    >
      {children}
    </span>
  );
}
```

**Why:** Gives the subtitle quiet life without a second accent color. The base zinc text stays readable; only a white highlight pans.

---

## 3 · NEW — `src/components/ui/border-beam.tsx`

```tsx
import React from 'react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  reverse?: boolean;
  initialOffset?: number;
  borderWidth?: number;
  transition?: Transition;
  style?: React.CSSProperties;
}

/**
 * A light beam that travels along the parent's border (parent must be
 * `relative` + `rounded-xl`). Adapted from Magic UI to framer-motion.
 * Under prefers-reduced-motion it renders a static gradient hairline instead.
 */
export function BorderBeam({
  className = '',
  size = 60,
  duration = 6,
  delay = 0,
  colorFrom = '#6366f1',
  colorTo = '#a78bfa',
  reverse = false,
  initialOffset = 0,
  borderWidth = 1.5,
  transition,
  style,
}: BorderBeamProps) {
  const reduced = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]"
      style={{ borderWidth: `${borderWidth}px` }}
    >
      {reduced ? (
        <div
          className="absolute inset-0 rounded-[inherit] opacity-40"
          style={{
            background: `linear-gradient(90deg, ${colorFrom}, ${colorTo})`,
            WebkitMask:
              'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: `${borderWidth}px`,
          }}
        />
      ) : (
        <motion.div
          className={`absolute aspect-square ${className}`}
          style={{
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
            ...style,
          }}
          initial={{ offsetDistance: `${initialOffset}%` }}
          animate={{
            offsetDistance: reverse
              ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
              : [`${initialOffset}%`, `${100 + initialOffset}%`],
          }}
          transition=
            repeat: Infinity,
            ease: 'linear',
            duration,
            delay: -delay,
            ...transition,
          
        />
      )}
    </div>
  );
}
```

**Why:** `framer-motion` (not `motion/react`), no `cn`, indigo→violet, and a genuine reduced-motion fallback (static hairline) so Requirement 10 holds for a continuously-animating element. Electron's Chromium supports `offset-path`/`offsetDistance`.

---

## 4 · REPLACE — Welcome screen block in `src/components/learn/LearnPage.tsx` (empty state, ~lines 275–398)

**Imports to ensure at the top of LearnPage.tsx:**
```tsx
import { motion } from 'framer-motion';
import { BookOpen, Wand2, Download, FileUp, FileCode2, HelpCircle } from 'lucide-react';
import { BlurFade } from '../ui/blur-fade';
import { ShinyButton } from '../ui/shiny-button';
import { AnimatedGradientText } from '../ui/animated-gradient-text';
import { AnimatedShinyText } from '../ui/animated-shiny-text';
import { BorderBeam } from '../ui/border-beam';
```
*(Adjust the relative depth to match this file's actual location; CONTEXT_BUNDLE §1 says relative paths, no alias.)*

**Wire these to the component's EXISTING handlers** (do not invent new state — map to whatever already opens the dialog / imports / etc.):
- `onCreate` → the existing “open CreateLessonDialog” setter (e.g. `setShowCreateDialog(true)`)
- `onTryExample` → existing worked-example import (`learn:get-worked-example` → `learn:importLdoc`)
- `onImportFile` → existing `learn:pick-file` flow
- `onPasteLdoc` → existing paste-JSON flow
- `onHowItWorks` → existing OnboardingPanel open

**Replacement JSX for the empty state:**
```tsx
<div className="relative flex min-h-full w-full items-center justify-center overflow-hidden px-6 py-16">
  {/* ---- Ambient layer: static dot grid + ONE breathing glow ---- */}
  <div aria-hidden className="pointer-events-none absolute inset-0">
    {/* dot grid texture (static) */}
    <div
      className="absolute inset-0"
      style=
        backgroundImage: 'radial-gradient(circle at center, rgba(244,244,245,0.06) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 42%, #000 0%, transparent 78%)',
        maskImage: 'radial-gradient(ellipse 60% 50% at 50% 42%, #000 0%, transparent 78%)',
      
    />
    {/* single breathing radial glow (the only animated ambient element) */}
    <div
      className="lyceum-ambient-glow absolute left-1/2 top-[38%] h-[420px] w-[620px]"
      style=
        background: 'radial-gradient(circle at center, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.10) 35%, transparent 70%)',
      
    />
  </div>

  {/* ---- Foreground: BlurFade cascade ---- */}
  <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
    {/* 1 · Emblem */}
    <BlurFade delay={0} direction="up" duration={0.45} blur="6px">
      <div className="relative mb-8 inline-flex h-16 w-16 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 backdrop-blur-xl">
        <BookOpen className="h-7 w-7 text-indigo-300" strokeWidth={1.75} />
        <span className="absolute -right-1.5 -bottom-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg border border-violet-400/30 bg-zinc-900/80 backdrop-blur-xl">
          <Wand2 className="h-3 w-3 text-violet-300" strokeWidth={2} />
        </span>
      </div>
    </BlurFade>

    {/* 2 · Heading */}
    <BlurFade delay={0.07} direction="up" duration={0.45} blur="6px">
      <h1 className="text-4xl font-semibold tracking-tight">
        Welcome to <AnimatedGradientText colorFrom="#6366f1" colorTo="#a78bfa">Lyceum</AnimatedGradientText>
      </h1>
    </BlurFade>

    {/* 3 · Subtitle */}
    <BlurFade delay={0.14} direction="up" duration={0.45} blur="6px">
      <p className="mt-3 text-[15px] leading-relaxed">
        <AnimatedShinyText shimmerWidth={120}>
          Turn any topic into an interactive, AI-tutored lesson.
        </AnimatedShinyText>
      </p>
    </BlurFade>

    {/* 4 · Primary CTA (featured with BorderBeam) */}
    <BlurFade delay={0.21} direction="up" duration={0.45} blur="6px">
      <div className="relative mt-8 inline-flex rounded-xl">
        <ShinyButton onClick={onCreate} className="px-6 py-3 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <Wand2 className="h-4 w-4" strokeWidth={2} />
            Create New Lesson
          </span>
        </ShinyButton>
        <BorderBeam size={60} duration={6} colorFrom="#6366f1" colorTo="#a78bfa" borderWidth={1.5} />
      </div>
    </BlurFade>

    {/* 5 · Divider */}
    <BlurFade delay={0.28} direction="up" duration={0.45} blur="6px">
      <div className="mt-8 mb-6 flex w-64 items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-zinc-700/60" />
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-600">or</span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-zinc-700/60" />
      </div>
    </BlurFade>

    {/* 6 · Secondary actions (subordinate, ≥ 44px) */}
    <BlurFade delay={0.35} direction="up" duration={0.45} blur="6px">
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { icon: Download, label: 'Try example', hint: 'One-click demo lesson', onClick: onTryExample },
          { icon: FileUp, label: 'Import file', hint: 'Open a .ldoc file', onClick: onImportFile },
          { icon: FileCode2, label: 'Paste \u2009.ldoc', hint: 'Paste lesson JSON', onClick: onPasteLdoc },
        ].map(({ icon: Icon, label, hint, onClick }) => (
          <motion.button
            key={label}
            onClick={onClick}
            whileHover= y: -2, scale: 1.02 
            whileTap= scale: 0.97 
            transition= duration: 0.15, ease: [0.16, 1, 0.3, 1] 
            className="flex flex-col items-start gap-2 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-5 py-4 text-left backdrop-blur-xl transition-colors hover:border-indigo-500/30 hover:bg-zinc-900/70"
          >
            <Icon className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
            <span className="text-sm font-medium text-zinc-200">{label}</span>
            <span className="text-xs text-zinc-500">{hint}</span>
          </motion.button>
        ))}
      </div>
    </BlurFade>

    {/* 7 · Tertiary link */}
    <BlurFade delay={0.42} direction="up" duration={0.45} blur="6px">
      <button
        onClick={onHowItWorks}
        className="mt-7 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
        How it works
      </button>
    </BlurFade>
  </div>
</div>
```

**Why this beats the current screen:** one emblem (not a glowing blob), a single gradient accent on the word “Lyceum” only, an obvious primary CTA that literally catches light + a beam tracing it, three clearly-subordinate cards with real hints and ≥44px targets, and a calm dot-grid-with-glow surface that reads premium instead of templated.

---

## 5 · APPEND — `src/index.css`

```css
/* ===== Lyceum welcome animations ===== */
@keyframes lyceum-gradient {
  to { background-position: var(--bg-size, 300%) 0; }
}
.lyceum-animate-gradient {
  animation: lyceum-gradient 8s linear infinite;
}

@keyframes lyceum-shiny-text {
  0%, 90%, 100% { background-position: calc(-100% - var(--shiny-width, 120px)) 0; }
  30%, 60%      { background-position: calc(100% + var(--shiny-width, 120px)) 0; }
}
.lyceum-animate-shiny-text {
  animation: lyceum-shiny-text 8s ease-in-out infinite;
}

@keyframes lyceum-glow-breathe {
  0%, 100% { opacity: 0.35; transform: translate(-50%, -50%) scale(1); }
  50%      { opacity: 0.55; transform: translate(-50%, -50%) scale(1.08); }
}
.lyceum-ambient-glow {
  transform: translate(-50%, -50%);
  animation: lyceum-glow-breathe 9s ease-in-out infinite;
  will-change: opacity, transform;
}

@media (prefers-reduced-motion: reduce) {
  .lyceum-animate-gradient,
  .lyceum-animate-shiny-text,
  .lyceum-ambient-glow {
    animation: none !important;
  }
  .lyceum-ambient-glow { opacity: 0.4; }
}
```

**Why:** Requirement 10 — all four ambient/text animations have a single reduced-motion kill switch. (`BlurFade`, `ShinyButton`, `BorderBeam` already guard themselves.)

---

## 6 · REDESIGN — `src/components/learn/CreateLessonDialog.tsx`

> You have the 599-line source; **keep all existing state, handlers, and IPC calls** (`learn:buildPrompt`, `learn:generateLesson`, `learn:importLdoc`, validate, file upload, numNodes slider, simple/detailed toggle). Only swap the *presentation* and add the missing states. Apply these patterns:

### 6.1 Step indicator (replace abrupt step text)
```tsx
import { motion } from 'framer-motion';

const STEPS = ['Describe', 'Prompt', 'Lesson'] as const;

function StepIndicator({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <motion.span
                animate= scale: active ? 1 : 0.85, opacity: active || done ? 1 : 0.5 
                transition= duration: 0.15, ease: [0.16, 1, 0.3, 1] 
                className={
                  'flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-semibold ' +
                  (active
                    ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40'
                    : done
                    ? 'bg-emerald-400/10 text-emerald-300'
                    : 'bg-zinc-800/60 text-zinc-500')
                }
              >
                {done ? '\u2713' : i + 1}
              </motion.span>
              <span className={`text-xs font-medium ${active ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-zinc-700/60" />}
          </div>
        );
      })}
    </div>
  );
}
```

### 6.2 Step transitions (staggered, not abrupt)
Wrap each step body in `AnimatePresence mode="wait"` with:
```tsx
<motion.div
  key={step}
  initial= opacity: 0, y: 8, filter: 'blur(4px)' 
  animate= opacity: 1, y: 0, filter: 'blur(0px)' 
  exit= opacity: 0, y: -8, filter: 'blur(4px)' 
  transition= duration: 0.25, ease: [0.16, 1, 0.3, 1] 
>
  {/* step content */}
</motion.div>
```

### 6.3 Generation progress (replace bare spinner — Requirements 12, 13)
Drive this from your real async phases; fall back to timed advance if you only have one await.
```tsx
const PHASES = ['Building prompt', 'Generating lesson', 'Validating', 'Importing'] as const;

function GenerationProgress({ phase }: { phase: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {PHASES.map((p, i) => {
        const state = i < phase ? 'done' : i === phase ? 'active' : 'pending';
        return (
          <div key={p} className="flex items-center gap-3">
            <span
              className={
                'flex h-5 w-5 items-center justify-center rounded-md text-[10px] ' +
                (state === 'done'
                  ? 'bg-emerald-400/10 text-emerald-300'
                  : state === 'active'
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'bg-zinc-800/60 text-zinc-600')
              }
            >
              {state === 'done' ? '\u2713' : state === 'active' ? (
                <motion.span
                  animate= rotate: 360 
                  transition= repeat: Infinity, ease: 'linear', duration: 0.8 
                  className="block h-2.5 w-2.5 rounded-full border border-indigo-300 border-t-transparent"
                />
              ) : i + 1}
            </span>
            <span className={`text-sm ${state === 'pending' ? 'text-zinc-600' : 'text-zinc-300'}`}>{p}</span>
          </div>
        );
      })}
    </div>
  );
}
```

### 6.4 Prompt preview as a real code block (not a raw textarea)
```tsx
<div className="relative rounded-xl border border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
  <div className="flex items-center justify-between border-b border-zinc-800/50 px-4 py-2.5">
    <span className="text-xs font-medium text-zinc-400">Generated prompt</span>
    <button onClick={handleCopy} className="text-xs text-zinc-400 transition-colors hover:text-indigo-300">
      {copied ? 'Copied \u2713' : 'Copy'}
    </button>
  </div>
  <pre className="max-h-72 overflow-auto p-4 font-mono text-[12px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
    {generatedPrompt}
  </pre>
</div>
```

### 6.5 Required state coverage (Requirement 12)
- **input** → simple/detailed form (keep logic). Apply `p-5` cards, `rounded-xl`, indigo focus ring `focus:ring-2 focus:ring-indigo-500/40`.
- **loading** → `GenerationProgress` (6.3), never a lone spinner.
- **error** → recoverable card: `border-red-400/30 bg-red-400/5`, the error message, and a **Try again** button. For the JSON error, show the position info from §7.
- **success** → emerald confirmation (`text-emerald-300`) + node count + primary **Import lesson** button.
- Every button: `whileHover= scale: 1.02  whileTap= scale: 0.97 ` with the 150ms cubic-bezier.

### 6.6 Dialog shell
Glass + max geometry: `rounded-xl border border-zinc-800/50 bg-zinc-900/80 backdrop-blur-xl`, header row = `StepIndicator` + close button. Backdrop `bg-black/60 backdrop-blur-sm`, fade via `AnimatePresence`.

---

## 7 · ENGINEERING FIX — trailing-comma / dirty JSON (`src/services/learn/index.ts`)

The model sometimes returns trailing commas, ```json fences, or prose around the object. The current code parses the raw response and throws `Expected ',' or '}' … position 4395`. Add a defensive sanitizer and use it wherever the AI response is parsed (the `learn:generateLesson` handler; `learn:buildPrompt` at ~line 115 only builds the prompt and needs no change).

**Add near the top of `src/services/learn/index.ts`:**
```ts
/** Pull the outermost {...} out of an LLM response, dropping fences/prose. */
function extractJsonObject(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return s.trim();
}

/** Remove trailing commas before } or ]. */
function stripTrailingCommas(s: string): string {
  return s.replace(/,\s*([}\]])/g, '$1');
}

/** Defensive parse: raw → extracted → comma-stripped. Clear error on failure. */
export function parseLessonJson(raw: string):
  | { ok: true; data: unknown }
  | { ok: false; error: string } {
  const attempts = [
    raw,
    extractJsonObject(raw),
    stripTrailingCommas(raw),
    stripTrailingCommas(extractJsonObject(raw)),
  ];
  for (const candidate of attempts) {
    try {
      return { ok: true, data: JSON.parse(candidate) };
    } catch {
      /* try next */
    }
  }
  // Report against the best-cleaned candidate so the position info is useful.
  const cleaned = stripTrailingCommas(extractJsonObject(raw));
  try {
    return { ok: true, data: JSON.parse(cleaned) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `AI output was not valid JSON even after sanitisation: ${msg}. ` +
        `Cleaned preview (first 200 chars): ${cleaned.slice(0, 200)}`,
    };
  }
}
```

**Then in the `learn:generateLesson` handler, replace the direct parse:**
```ts
// BEFORE:
// const lesson = JSON.parse(aiResponse);

// AFTER:
const parsed = parseLessonJson(aiResponse);
if (!parsed.ok) {
  return { ok: false, error: parsed.error };   // surfaced by the dialog's error state (§6.5)
}
const lesson = parsed.data;
// …continue with existing validate/import flow
```

**Why this is the right fix:** it's purely defensive (the author-guide still forbids trailing commas), it also handles the two *other* common LLM failures (code fences + prose wrapper), and on genuine failure it returns a clear, position-bearing message that the redesigned dialog shows in its error state with a Try again button — no more dead-end crash.

---

## 8 · Acceptance checklist (maps to the 19 requirements)

- [ ] 1 Heading dominant; `AnimatedGradientText` on “Lyceum” only; weights 600/500/400; no weight-300.
- [ ] 2 ≤ 3 accents (indigo/violet/emerald); depth via opacity, no new hex.
- [ ] 3 8px grid; cards `p-5`/`py-4`; `rounded-xl` max everywhere.
- [ ] 4 Glass cards `bg-zinc-900/50 backdrop-blur-xl border-zinc-800/50`.
- [ ] 5 No aurora-blob cliché; dot-grid+glow surface; distinct emblem.
- [ ] 6 `BlurFade` cascade, 0.07s stagger, up/0.45/6px.
- [ ] 7 `ShinyButton` primary CTA.
- [ ] 8 Exactly ONE animated ambient layer (breathing glow); grid is static.
- [ ] 9 Hover `y:-2 scale:1.02`, press `scale:0.97`, 150ms cubic-bezier on all interactive els.
- [ ] 10 `prefers-reduced-motion` kills gradient/shiny/glow/BorderBeam.
- [ ] 11 Primary obvious < 1s; secondary subordinate; “How it works” tertiary.
- [ ] 12 Dialog covers input/loading/error/success.
- [ ] 13 Generation shows phased progress, not a bare spinner.
- [ ] 14 All targets ≥ 44px (`py-4`+).
- [ ] 15 `AnimatedGradientText` created, framer-motion/no-cn, indigo→violet.
- [ ] 16 `AnimatedShinyText` created, dark skin, subtitle.
- [ ] 17 `BorderBeam` created, framer-motion, on the CTA.
- [ ] 18 Icons: BookOpen/Wand2/Download/FileUp/FileCode2/HelpCircle.
- [ ] 19 Trailing-comma (+fence/prose) JSON fix with clear error.
- [ ] Constraints: only §9 files touched; no `cn`; relative imports; `framer-motion` only; geometry caps; indigo (not pink); reused existing `BlurFade`/`ShinyButton`.
```
