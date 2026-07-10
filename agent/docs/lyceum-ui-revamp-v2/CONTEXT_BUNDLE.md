# CONTEXT_BUNDLE — Lyceum Learn Popup UI Revamp

## Problem Statement

Three popup/dialog UIs in the Lyceum Learn module still use old indigo/purple styling (bg-indigo-500/20, text-indigo-300, border-indigo-500/30) that conflicts with the warm editorial design language (clay/sage/amber/sky) used in the main welcome page and library. These need to be revamped.

## UI Components to Revamp

### 1. CreateLessonDialog (`src/components/learn/CreateLessonDialog.tsx`)
- 3-step wizard: Describe → Prompt → Lesson
- Step indicator uses indigo for active step: `bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40`
- "Generate Prompt" button: `bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30`
- "Generate Here" card: gradient `from-indigo-500/20 to-violet-500/10`, `border-indigo-500/25`
- All textarea focus states: `focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10`
- File icon: `text-indigo-400`
- Step indicator uses emerald for done state: `bg-emerald-400/10 text-emerald-300`
- Dialog background: `bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50`
- Icon container: `bg-indigo-500/10 border border-indigo-500/20`
- Info callout: `bg-indigo-500/5 border border-indigo-500/15`

### 2. ImportView (inline component in `src/components/learn/LearnPage.tsx` lines ~737-877)
- "Start with worked example" button: `bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30`
- Tab active state: `border-b-2 border-indigo-400`
- Textarea focus: `focus:border-indigo-500/50`
- "Validate & Import" button: `bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30`

### 3. OnboardingPanel (`src/components/learn/OnboardingPanel.tsx`)
- Header icon: `text-indigo-400`
- Icon circle: `bg-indigo-500/15 text-indigo-400`
- Dot indicator active: `bg-indigo-400`
- "Next" button: `bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30`
- "Got it" button: `bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30`

## Editorial Design Language (Target)
- **Clay** (`--color-clay-300/400/500/600`): primary accent, buttons, borders, hover states
- **Sage** (`--color-sage-400`): success/completion, checkmarks, "done" states
- **Amber** (`--color-amber-400`): highlights, rarity, attention
- **Sky** (`--color-sky-400`): information, secondary accent
- **Typography**: `font-serif` for headings, `font-mono` for metadata/numbers
- **Borders**: `border-clay-400/40`, `border-white/10`
- **Text**: `text-glow` utility, `text-zinc-400` body, `text-clay-300` for editorial accents
- **Shadows**: `shadow-[0_0_20px_rgba(194,85,58,0.25)]` warm clay glow

## Design Tokens (from index.css @theme)
```
--color-clay-300: #f0a892  --color-clay-400: #e8866b  --color-clay-500: #d96846  --color-clay-600: #c2553a
--color-sage-300: #a3d6b9  --color-sage-400: #6fb38f  --color-sage-500: #4a8f68
--color-amber-200: #fef0c3 --color-amber-300: #fddf8a  --color-amber-400: #fbbf24
--color-sky-300: #97d0e1  --color-sky-400: #5ab0c9
```

## CSS Patterns
- `rounded-xl` everywhere (borders)
- `backdrop-blur-xl` + `bg-zinc-900/80` for modals
- `border border-zinc-800/50` or `border-clay-400/40` for containers
- AnimatePresence + motion.div with spring animations
- BlurFade for staggered entrance animations

## Architecture Notes
- All three components are renderer-side only (no IPC changes needed)
- CreateLessonDialog uses frontend-only state (useState), no backend calls except `learnBuildPrompt` and `learnGenerateLdoc` IPC handlers
- OnboardingPanel is purely presentational with no backend
- ImportView calls `learnPickFile`, `learnValidate`, `learnImportLdoc` IPC handlers
- These components are imported by LearnPage.tsx
