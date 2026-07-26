# Prompt — Lyceum Learn Popup UI Revamp

## Raw Request

> Three popup/dialog UIs in the Lyceum Learn module still use old indigo/purple styling that conflicts with the warm editorial design language (clay/sage/amber/sky). These need to be revamped to match.

## Context

Read `agent/docs/lyceum-ui-revamp-v2/CONTEXT_BUNDLE.md` first. It contains:
- Exact file paths, line numbers, and current color classes for every affected element
- The target editorial design tokens (clay-300/400/500/600, sage-300/400/500, amber-200/300/400, sky-300/400)
- Design patterns (rounded-xl, backdrop-blur-xl, motion animations)
- Architecture notes (all three are renderer-side only, no IPC changes needed)

## The Mandate

Design a comprehensive solution for revamping these three popup UIs from indigo/purple to the warm editorial palette:

### 1. CreateLessonDialog (`src/components/learn/CreateLessonDialog.tsx`)

**Engineering task:** Map every indigo/purple CSS class to its editorial replacement using the design tokens in CONTEXT_BUNDLE.md. Every `indigo-*`, `violet-*`, and `emerald-*` token must be replaced.

**Design task:** Provide exact replacement classes for:
- Step indicator active state (currently `bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40`)
- "Generate Prompt" button (currently `bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30`)
- "Generate Here" card (currently gradient `from-indigo-500/20 to-violet-500/10`, `border-indigo-500/25`)
- Step indicator done state (currently `bg-emerald-400/10 text-emerald-300`)
- Icon container (`bg-indigo-500/10 border border-indigo-500/20`)
- Info callout (`bg-indigo-500/5 border border-indigo-500/15`)
- Focus rings on all textarea inputs
- File icon color
- Dialog title area

**UX task:** Animation flow should use spring-based `motion.div` transitions matching existing welcome page patterns. Step transitions should feel fluid, not abrupt.

### 2. ImportView (`src/components/learn/LearnPage.tsx` lines ~744-886)

**Engineering task:** Replace indigo tokens in:
- "Start with worked example" button  
- Tab active state (currently `border-indigo-400`)
- "Validate & Import" button
- Textarea focus state (`focus:border-indigo-500/50`)

**Design task:** The button hierarchy should use clay as primary CTA, sage for success/completion, amber for attention/warnings.

**UX task:** Import success/failure feedback should be more visually distinct. Consider a subtle clay-tinted border on success, warm slate on failure.

### 3. OnboardingPanel (`src/components/learn/OnboardingPanel.tsx`)

**Engineering task:** Replace indigo tokens in:
- Header icon (`text-indigo-400`)
- Icon circle (`bg-indigo-500/15 text-indigo-400`)
- Dot indicator active (`bg-indigo-400`)
- "Next" button
- "Got it" button (currently `bg-emerald-500/20`)

**Design task:** Onboarding steps should use clay-progressive colors as the user advances (clay-300 → clay-400 → clay-500 → sage for complete).

**UX task:** Consider the panel's overlay behavior. Should it auto-dismiss on last step? Should there be a "Don't show again" persistent preference?

## Constraints

1. **No IPC or backend changes.** All three components are renderer-only. Touch no IPC handler, no preload bridge, no DB.
2. **Use existing Tailwind classes and @theme design tokens.** Do not add new CSS custom properties or Tailwind config changes — all clay/sage/amber/sky tokens already exist in `index.css @theme`.
3. **Preserve all existing behavior.** The revamp is visual only — step logic, state management, API calls, keyboard interactions stay identical.
4. **Use the same animation primitives** already in the file: `framer-motion`, `AnimatePresence`, spring transitions.
5. **Do not change layout, spacing, or structure** — only color, borders, backgrounds, text colors, and icon colors.
6. **Do not remove or reorder any UI elements.**

## Output Format

Return the solution as a diff-like specification. For each file:
- List every indigo/purple/emerald class → its replacement class
- Note any Tailwind arbitrary value that needs updating
- Provide before/after visual descriptions for key changes (button states, indicators, feedback)

Use the CONTEXT_BUNDLE.md line references to anchor each change to the exact source location.
