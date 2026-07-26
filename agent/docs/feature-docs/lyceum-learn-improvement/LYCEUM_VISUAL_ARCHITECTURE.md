# Lyceum Visual Style & Architecture Report

---

## 1. Design Tokens

### 1.1 CSS Custom Properties (@theme block — index.css)

```css
/* === Workspace Surface Tokens === */
--ws-surface: #09090b;
--ws-surface-raised: #18181b;
--ws-border: rgb(39 39 42 / 0.6);
--ws-border-strong: rgb(63 63 70 / 0.6);
--ws-accent: #06b6d4;
--ws-radius-card: 0.5rem;
--ws-dur: 150ms;
--ws-ease: cubic-bezier(0.2, 0, 0, 1);

/* === Lyceum Warm Editorial Palette === */
--color-clay-300: #f0a892;
--color-clay-400: #e8866b;
--color-clay-500: #d96846;
--color-clay-600: #c2553a;
--color-sage-400: #6fb38f;
--color-amber-400: #fbbf24;
--color-sky-400: #5ab0c9;
--color-glow: #f7f3ee;

/* === Fonts === */
--font-serif: "Source Serif 4", Georgia, serif;
--font-mono: "JetBrains Mono", "Fira Code", monospace;
/* (sans is system default / Inter via Tailwind) */
```

### 1.2 Lyceum Feature Tokens (lyceum-learn-features.css)

```css
/* Fallback values used throughout the feature CSS */
--bg-primary: #141211;
--bg-secondary: #1c1917;
--bg-tertiary: #292524;
--border: #292524;
--text-primary: #f5f5f4;
--text-secondary: #a8a29e;
--text-muted: #57534e;
--accent-primary: #d97706;  /* amber — used for CTAs, focus, active states */
```

### 1.3 Warmth Tokens (warmth-tokens.css)

```css
:root {
  --warmth-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --warmth-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --warmth-dur-fast: 120ms;
  --warmth-dur-base: 220ms;
  --warmth-dur-slow: 420ms;
}
```

### 1.4 Tailwind Configuration

**Tailwind CSS v4** — no `tailwind.config.ts`. Configuration is done via `@theme` in `src/index.css` and `@tailwindcss/vite` plugin.

Custom utilities defined in `@layer utilities`:
```css
.ws-sidebar-edge { box-shadow: inset 1px 0 0 0 var(--ws-border); }
.ws-scroll { scrollbar-width: thin; scrollbar-color: #3f3f46 transparent; }
.ws-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.ws-scroll::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 9999px; }
.ws-tip { /* tooltip via data-tip attr */ }
```

### 1.5 Typography Scale

| Token | Font | Fallback |
|-------|------|----------|
| `--font-serif` | "Source Serif 4" | Georgia, serif |
| `--font-mono` | "JetBrains Mono" | "Fira Code", monospace |
| sans (Tailwind default) | Inter / system | ui-sans-serif, system-ui |

**Sizes used across components:**
- `text-[10px]` — mono labels, status badges, uppercase tracking labels
- `text-[11px]` — rarity stars, phase counts, competency counts
- `text-[12px]` — card trailers, muted descriptions, checklist text
- `text-xs` (12px) — secondary text, TOC links
- `text-[13px]` — card titles, TOC body, phase tabs, assessment body
- `text-sm` (14px) — section titles, checklist titles, tutor text
- `text-[15px]` — showcase card titles
- `text-base` (16px) — dashboard section titles
- `text-lg` (18px) — page headers, stat values
- `text-xl` (20px) — book card titles (serif)
- `text-2xl` (24px) — hero book title
- `text-3xl` (30px) — mastery strip headline
- `text-4xl` (36px) — library page title (serif)
- `text-5xl` (48px) — welcome hero headline (serif)

**Letter spacing patterns:**
- `tracking-[0.05em]` — assessment type badges
- `tracking-[0.16em]` — due reviews button
- `tracking-[0.18em]` — book version label
- `tracking-[0.22em]` — book part label
- `tracking-[0.24em]` — hero book "Volume I"
- `tracking-[0.28em]` — mastery strip label, library "Lyceum" label
- `tracking-[0.32em]` — library header mono label

**Font weights:**
- `font-medium` (500) — button text, section headers
- `font-semibold` (600) — card titles, headings, TOC title
- `font-bold` (700) — mastery ring level number

---

## 2. Color Palette

### 2.1 Mastery Level Colors

| Level | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| L0 | `#5B6472` | `zinc-500` range | Untested / novice |
| L1 | `#5B8DEF` | `blue-400` range | Just started |
| L2 | `#23B5B5` | `teal-400` range | Beginner |
| L3 | `#3CCB7F` | `emerald-400` range | Competent |
| L4 | `#A78BFA` | `violet-400` range | Proficient |
| L5 | `#F5C04E` | `amber-400` range | Mastered |

### 2.2 Book Cloth Colors (by curriculum part)

```typescript
const CLOTHS = [
  { cloth: '#c2553a', deep: '#a8432c', gilt: '#f3d9a4', ink: '#fbeee6' }, // clay
  { cloth: '#3f7d63', deep: '#2f6650', gilt: '#f3d9a4', ink: '#eaf5ef' }, // sage
  { cloth: '#b8842f', deep: '#9c6e20', gilt: '#fff4d6', ink: '#fdf3df' }, // amber
  { cloth: '#3c7d92', deep: '#2d6175', gilt: '#f3d9a4', ink: '#e6f3f8' }, // sky
  { cloth: '#6b4a8a', deep: '#553a70', gilt: '#f3d9a4', ink: '#efe8f6' }, // plum
];
```

### 2.3 Background Colors

| Usage | Value | Class |
|-------|-------|-------|
| Page background | `#09090b` | `bg-zinc-950` |
| Card/panel bg | `#1c1917` | `bg-zinc-900` |
| Input/field bg | `#141211` | `bg-[#141211]` |
| Hover card bg | `color-mix(in srgb, #d97706 4%, #1c1917)` | custom CSS |
| Modal overlay | `bg-black/60 backdrop-blur-sm` | Tailwind |
| Active TOC bg | `rgba(217, 119, 6, 0.08)` | custom CSS |

### 2.4 Text Colors

| Usage | Value | Class |
|-------|-------|-------|
| Primary text | `#f5f5f4` | `text-zinc-100` |
| Secondary text | `#a8a29e` | `text-zinc-400` |
| Muted text | `#57534e` | `text-zinc-600` |
| Link default | `#a8a29e` | — |
| Link hover | `#f5f5f4` | — |
| Error text | `#ef4444` | `text-red-500` |
| Success text | `#22c55e` | `text-emerald-500` |
| Warning text | `#f59e0b` | `text-amber-500` |
| Gold/gilt text | `#f3d9a4` | custom via `style` prop |
| Book ink text | `#fbeee6` | custom via `style` prop |
| Glow text | `#f7f3ee` | `text-glow` utility |

### 2.5 Accent Colors

| Token | Value | Usage |
|-------|-------|-------|
| `clay-300` | `#f0a892` | Light clay accent |
| `clay-400` | `#e8866b` | TOC active bar, tutor icon |
| `clay-500` | `#d96846` | CTA backgrounds |
| `clay-600` | `#c2553a` | Hero book cover, book cloth |
| `sage-400` | `#6fb38f` | Aurora gradient, completed state |
| `amber-400` | `#fbbf24` | Tutor icon, dashboard badges |
| `sky-400` | `#5ab0c9` | Dashboard Q&A badge |

### 2.6 Border Colors

| Usage | Value | Class |
|-------|-------|-------|
| Default border | `#292524` | `border-zinc-800` |
| Hover border | `#d97706` | `border-amber-600` |
| Focus ring | `#d97706` | via `focus:border-amber-500/50` |
| Divider | `rgba(255,255,255,0.1)` | `border-white/10` |
| Active TOC bar | `#c2553a` | clay-600 inline |

### 2.7 Status Colors

| Status | Border | Background | Text |
|--------|--------|------------|------|
| Correct | `rgba(34,197,94,0.3)` | `rgba(34,197,94,0.06)` | `#22c55e` |
| Incorrect | `rgba(239,68,68,0.3)` | `rgba(239,68,68,0.06)` | `#ef4444` |
| Due reviews | `rgba(251,191,36,0.4)` | `rgba(251,191,36,0.15)` | `#fbbf24` |

---

## 3. Component Patterns

### 3.1 Card Patterns

**Showcase Card** (`.lyceum-showcase-card`):
```css
border: 1px solid #292524;
border-radius: 12px;
background: #1c1917;
padding: 18px;
transition: all 0.15s;
/* hover: */
border-color: #d97706;
background: color-mix(in srgb, #d97706 4%, #1c1917);
transform: translateY(-1px);
```

**Assessment Question Card** (`.lyceum-assessment-question`):
```css
padding: 12px;
border: 1px solid #292524;
border-radius: 8px;
background: #141211;
/* correct: */ border-color: rgba(34, 197, 94, 0.3);
/* incorrect: */ border-color: rgba(239, 68, 68, 0.3);
```

**Stat Card** (TutorDashboardSection):
```tsx
<div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-400">
    {icon}
  </div>
</div>
```

**Book Card** (BookCard.tsx):
- 248px tall hardcover with gradient cloth background
- Sewn spine: `w-[10px] bg-black/25` vertical stripe + `w-px bg-white/15` stitch line
- Page edges: striped gradient `#efe7d6` / `#d9cfba`
- Shelf shadow: `radial-gradient(50% 100% at 50% 0%, rgba(0,0,0,0.45), transparent 70%)` + `blur(2px)`
- Hover: warm shadow `0 26px 50px -24px rgba(0,0,0,0.7)`

### 3.2 Button Patterns

**Primary CTA** (compose lesson):
```tsx
className="inline-flex items-center gap-2 rounded-xl border border-clay-400/40 bg-clay-500/15 px-6 py-3 font-serif text-sm font-semibold text-glow transition-all hover:bg-clay-500/25 hover:shadow-[0_0_20px_rgba(194,85,58,0.25)]"
```

**Secondary/Outline** (phase tabs):
```css
border: 1px solid #292524;
border-radius: 9999px;
background: #1c1917;
color: #a8a29e;
padding: 8px 14px;
transition: all 0.15s;
/* active: */
border-color: var(--phase-accent);
background: color-mix(in srgb, var(--phase-accent) 10%, transparent);
color: var(--phase-accent);
```

**Ghost/Icon Button** (selection toolbar):
```css
width: 28px; height: 28px;
border: none; border-radius: 6px;
background: none;
color: #a8a29e;
/* hover: */
background: #292524;
color: #f5f5f4;
```

**Submit Button** (assessment):
```css
padding: 8px 20px;
border: none; border-radius: 8px;
background: #d97706; color: #fff;
font-weight: 600;
/* disabled: */ opacity: 0.4; cursor: not-allowed;
```

**Reset/Cancel Button** (assessment):
```css
padding: 8px 20px;
border: 1px solid #292524;
border-radius: 8px;
background: transparent;
color: #a8a29e;
```

**Tutor Submit** (TutorPanel):
```tsx
className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition border border-amber-500/30"
```

### 3.3 Input/Form Patterns

**Text Input** (TutorPanel):
```css
flex-1; padding: 8px 12px;
border-radius: 8px;
background: rgba(24,24,27,0.6);  /* zinc-800/60 */
border: 1px solid rgba(63,63,70,0.5);  /* zinc-700/50 */
color: #e4e4e7;  /* zinc-200 */
font-size: 14px;
/* focus: */
border-color: rgba(251,191,36,0.5);  /* amber-500/50 */
/* placeholder: */
color: #52525b;  /* zinc-600 */
```

**Textarea** (assessment):
```css
width: 100%; padding: 8px 10px;
border: 1px solid #292524; border-radius: 6px;
background: #141211; color: #f5f5f4;
font-size: 13px; resize: vertical;
/* focus: */ border-color: #d97706; outline: none;
```

### 3.4 Navigation Patterns

**TOC Item** (active):
```css
color: #d97706;
background: rgba(217, 119, 6, 0.08);
```
Active indicator: `layoutId="active-bar"` — animated clay-600 vertical bar (2px wide, rounded)

**Phase Tabs** (CurriculumShowcase):
```css
/* pill-shaped filter tabs with accent color when active */
```

### 3.5 Feedback Patterns

**Empty State** (mastery):
```tsx
<div className="rounded-2xl border border-white/10 bg-[#1c1917]/60 backdrop-blur-sm px-6 py-5">
  <p className="text-sm text-sage-400/70 italic font-serif text-center">
    Your mastery map fills in as you study — open a volume to begin.
  </p>
</div>
```

**Loading** (TutorDashboardSection):
```tsx
<Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
```

**Error Panel** (TutorPanel):
```tsx
<div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
  <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
    <AlertTriangle className="w-4 h-4 text-red-400" />
  </div>
</div>
```

**Out-of-Scope** (TutorPanel):
```tsx
<div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
  // amber variant
</div>
```

---

## 4. Animation System

### 4.1 Framer Motion Presets (motion.ts)

```typescript
export const lift = {
  rest: { y: 0, rotateZ: 0 },
  hover: { y: -8, rotateZ: -0.4 },
};
export const springy = { type: 'spring' as const, stiffness: 320, damping: 26 };
export const tap = { scale: 0.985 };

export const fadeSlide = (dir: 'left' | 'right' = 'left') => ({
  initial: { opacity: 0, x: dir === 'left' ? 24 : -24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: dir === 'left' ? -24 : 24 },
});

export const reveal = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
};

export const glowPulse = {
  initial: { boxShadow: '0 0 0px rgba(245,192,78,0)' },
  animate: {
    boxShadow: ['0 0 0px rgba(245,192,78,0)', '0 0 16px rgba(245,192,78,0.5)', '0 0 0px rgba(245,192,78,0)'],
    transition: { duration: 1.2, ease: 'easeOut' },
  },
};
```

### 4.2 BlurFade Component

```typescript
// Staggered entrance: blur(6px) + y-offset → blur(0) + y=0
// Duration: 0.4s, ease: [0.16, 1, 0.3, 1]
// Direction: up (default), down, left, right
// Offset: 8px default
// Respects prefers-reduced-motion
```

### 4.3 BorderBeam Component

```typescript
// Animated light beam orbiting a card border
// Uses CSS offset-path for circular motion
// Default colors: #6366f1 → #a78bfa (indigo/violet)
// Welcome book uses: colorFrom="#f3d9a4" colorTo="#c2553a" (gold → clay)
// Duration: 6s, border: 1.5px
```

### 4.4 Warmth Animations

```css
.warmth-shimmer::after {
  background: linear-gradient(100deg, transparent 30%, rgba(247,243,238,0.10) 50%, transparent 70%);
  animation: warmth-shimmer-sweep 2.8s ease-in-out infinite;
}
@keyframes warmth-shimmer-sweep {
  100% { transform: translateX(100%); }
}
```

### 4.5 Book Hero Float

```typescript
const float = {
  rest: { y: 0, rotateZ: -3 },
  float: { y: [-3, 3, -3], rotateZ: [-3, -2.5, -3] },
  hover: { y: -8, rotateZ: -3 },
};
const floatLoop = { duration: 4, ease: 'easeInOut', repeat: Infinity };
```

### 4.6 Mastery Ring Animation

```typescript
// SVG circle with stroke-dasharray/dashoffset
// Animated via CSS transition: duration-1000 ease-out
// Pulse effect on L5: animate-ping with 1.2s duration
```

### 4.7 Page Transitions (LearnPage)

```tsx
<AnimatePresence mode="wait">
  {view === 'showcase' && <CurriculumShowcase key="showcase" ... />}
  {view === 'reader' && <ReaderView key="reader" ... />}
</AnimatePresence>
// ReaderView node switch:
<motion.div
  key={currentNode.id}
  initial={{ opacity: 0, x: 24 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -24 }}
  transition={{ duration: 0.2, ease: 'easeOut' }}
/>
```

### 4.8 TutorPanel Expand/Collapse

```tsx
<motion.div
  initial={{ width: 0, opacity: 0 }}
  animate={{ width: 320, opacity: 1 }}
  exit={{ width: 0, opacity: 0 }}
  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
/>
```

---

## 5. Layout & Spacing

### 5.1 Grid Systems

**Showcase Grid:**
```css
.lyceum-showcase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
```

**Library Grid:**
```tsx
className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-4"
```

**Dashboard Stats:**
```tsx
className="grid grid-cols-2 gap-3"
```

### 5.2 Containers

| Container | Max Width | Padding |
|-----------|-----------|---------|
| Welcome page | `max-w-5xl` (1024px) | `px-6 py-16` |
| Library page | `max-w-6xl` (1152px) | `px-6 py-10` |
| Reader content | `max-w-[72ch]` | `px-8 py-6` |
| Library header | `max-w-4xl` (896px) | `px-6 pb-8` |

### 5.3 Z-Index Scale

| Layer | z-index | Usage |
|-------|---------|-------|
| Base | 0 | Default content |
| Sticky | 10 | Active TOC bar (`layoutId`) |
| Floating | 20 | Due reviews popover |
| Overlay | 40 | Keyboard shortcuts modal |
| Modal | 50 | Onboarding panel, LearnerSetup |

### 5.4 Spacing Scale

| Value | Usage |
|-------|-------|
| `gap-1` (4px) | Checklist items, icon gaps |
| `gap-2` (8px) | Phase tab items, button groups |
| `gap-3` (12px) | Stat cards, header items |
| `gap-4` (16px) | Dashboard sections |
| `gap-6` (24px) | Mastery strip zones |
| `p-3` / `px-3` (12px) | Compact cards, TOC items |
| `p-4` / `px-4` (16px) | Checklist, assessment header |
| `p-5` (20px) | Book card padding, showcase card |
| `p-6` (24px) | Modal body, welcome page |
| `py-10` (40px) | Library page vertical |
| `py-16` (64px) | Welcome page vertical |

---

## 6. Existing Visualization Components

### 6.1 MasteryRing (101 lines)

```typescript
// SVG circular progress ring
// Props: level (L0-L5), target?, size (default 32), strokeWidth (default 3), animated (default true)
// Implementation:
//   - Background circle: targetColor + '20' opacity
//   - Foreground circle: levelColor, strokeDasharray=circumference, strokeDashoffset animated
//   - Center label: level number (e.g. "3")
//   - Pulse on L5: animate-ping with 1.2s duration

const LEVEL_COLORS: Record<MasteryLevel, string> = {
  L0: '#5B6472', L1: '#5B8DEF', L2: '#23B5B5',
  L3: '#3CCB7F', L4: '#A78BFA', L5: '#F5C04E',
};
```

### 6.2 MasteryStrip (151 lines)

```typescript
// Three-zone horizontal strip:
// Zone 1: MasteryRing (44px) + proficient count headline
// Zone 2: L0-L5 bar chart (vertical bars, colored per level)
// Zone 3: Due reviews button/popover
// Wrapped in: rounded-2xl border border-white/10 bg-[#1c1917]/60 backdrop-blur-sm px-6 py-5
```

### 6.3 CurriculumGraph (248 lines)

```typescript
// SVG DAG visualization
// Layout: manual topological sort → layer assignment → grid positioning
//   - Horizontal spacing: 220px per layer
//   - Vertical spacing: 100px between nodes in same layer
// Node: 160x32px rect, colored by current mastery level
// Edge: SVG line, color highlight on selection
// Zoom: Ctrl+scroll, range 0.3-2.0
// Interactions: click node to select, locked nodes (prereq not met) are dimmed
```

### 6.4 BlockRenderer (109 lines)

```typescript
// Dispatcher: routes LdocBlock type → typed component
// Visual blocks (mermaid, chart, flow, etc.) get max-w-4xl wrapper
// Text blocks get max-w-[68ch] wrapper
// 19 block types: prose, math, mermaid, code, image, video, quiz, callout,
//   layer, widget, chart, table, flow, finchart, svg, tutor, proposal,
//   conversation, notes
```

### 6.5 BookCard (127 lines)

```typescript
// Physical book metaphor with:
// - Gradient cloth cover (5 color schemes by part)
// - Woven cloth grain texture (::after pseudo-element)
// - Sewn spine (dark stripe + white stitch line)
// - Page edges (striped cream gradient)
// - Shelf shadow (radial gradient + blur)
// - Gilt text for part label and version
// - Ink text for title
// - Status badge (valid/draft) as "gilt foil"
// - Framer Motion lift hover (y: -8, rotateZ: -0.4)
// - Staggered BlurFade entrance (delay = 0.04 * index)
```

---

## 7. The "Warm Wood" Aesthetic

### 7.1 Visual Metaphors

- **Book/Shelf**: BookCard is a physical hardcover with cloth binding, gilt text, page edges, and shelf shadow. LessonLibrary groups books on "shelves" with `lyceum-shelf-rail` (wood-grain gradient).
- **Welcome Hero**: A floating 3D book on a stand with BorderBeam glow and warm ambient wash.
- **Paper**: `lyceum-paper` class available for reader background with dot-grain texture.
- **Cloth Grain**: Woven texture via overlapping 45deg repeating-linear-gradients on book covers.

### 7.2 Texture & Depth

- **Flat with subtle depth**: Cards use solid backgrounds with 1px borders, no drop shadows on cards (only book shadows and popovers)
- **Gradients**: Warm editorial gradients (clay→deep clay, sage→deep sage)
- **Backdrop blur**: `backdrop-blur-sm` on empty states, `backdrop-blur-xl` on glass panels
- **Box shadows**: Reserved for floating elements (selection toolbar: `0 4px 12px rgba(0,0,0,0.35)`), book hover: `0 26px 50px -24px rgba(0,0,0,0.7)`)

### 7.3 Iconography

- **Library**: Lucide React (outlined style)
- **Sizes**: 3px (tiny), 3.5px (small), 4px (standard), 5px (large)
- **Colors**: Match text context — `text-zinc-500` for muted, `text-clay-400` for warm accent, `text-amber-400` for tutor, `text-emerald-400` for success

### 7.4 Overall Mood

**Adjectives:** warm, scholarly, focused, premium, intimate, tactile, grounded, editorial

The Lyceum aesthetic evokes a **private library or study** — dark warm backgrounds, serif typography for headings, physical book metaphors, warm clay/amber/sage accents against dark zinc. It feels like a premium reading experience, not a generic SaaS dashboard. The cloth-bound books, gilt text, page edges, and shelf rails create a tactile, physical metaphor for learning. Animations are smooth and purposeful (spring physics, blur-fade entrances) without being flashy.
