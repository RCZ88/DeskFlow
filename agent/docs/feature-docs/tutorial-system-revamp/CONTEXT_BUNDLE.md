# Tutorial System — Context Bundle

## 1. Current Tutorial Page (`src/pages/TutorialPage.tsx`)

- **528 lines**, live at `/tutorial`
- Static **feature catalog** with 15 features across 3 categories (Core, Tracker Mind, Data)
- Each feature has: `id`, `name`, `icon`, `category`, `status`, `description`, `whatYoullFind` (string[]), `whatYouCanDo` (string[]), `visualIcons`, `route`
- LocalStorage-based progress tracking (`guide-progress` key), tracks "viewed" features
- Category filter tabs (All / Core / Tracker Mind / Data)
- `TutorialOverlay` is **NOT currently imported or used** — the page is purely a catalog
- Uses `PageShell` with `variant="sticky-header"` and `page="tutorial"`

### Key state:
```tsx
const [progress, setProgress] = useState<GuideProgress>(loadProgress);
const [selectedCategory, setSelectedCategory] = useState<string>('All');
interface GuideProgress { viewedFeatures: string[]; }
```

### Card structure:
```
GlassCard (interactive) → gradient top bar → icon + name + status → description → "What You'll Find" bullets → "What You Can Do" bullets → decor icons + "Open" button
```

## 2. TutorialOverlay Component (`src/components/TutorialOverlay.tsx`)

- **122 lines**, **EXISTS but NOT WIRED** to TutorialPage
- `TutorialStep` interface:
```tsx
interface TutorialStep {
  target: string;      // CSS selector (e.g., #sidebar-nav)
  title: string;       // step title
  instruction: string; // step instructions
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}
```
- Props: `isVisible`, `step`, `stepIndex`, `totalSteps`, `featureName`, `onNext`, `onPrev`, `onClose`, `onTryIt`
- Renders: full-screen backdrop (bg-black/70 backdrop-blur-sm), 300px spotlight circle (amber glow), positioned instruction card
- Navigation: step progress dots (amber=current, green=done, grey=pending), Back/Next/Try It/Done buttons
- Animation: AnimatePresence with 200ms opacity + 250ms scale/y
- Uses Lucide icons: X, ArrowLeft, ArrowRight, ExternalLink, Check

## 3. GlassCard Component (`src/components/GlassCard.tsx`)

```tsx
// Default: bg-zinc-900/75 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-4
// Elevated: bg-zinc-900/90 backdrop-blur-2xl border border-zinc-700/40 shadow-xl
// Interactive: bg-zinc-900/75 backdrop-blur-xl border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700/50 cursor-pointer
// Accent variants: pink, amber, violet, cyan, indigo, emerald, none
// Accent renders: 2px top stripe + bg opacity layer
export function GlassCard({ variant = 'default', accent, className, children, onClick })
```

## 4. PageShell Pattern

```tsx
<PageShell page="tutorial" variant="sticky-header">
  // sticky header bar (bg-zinc-950/80 backdrop-blur-xl border-b)
  // scrollable content area (flex-1 overflow-auto p-5)
</PageShell>
```

## 5. FEATURES Array (All 15)

See `src/pages/TutorialPage.tsx` lines 29–315. Each feature has:
- `id`: string (e.g. 'dashboard', 'orbit', 'stats')
- `name`: string (e.g. 'Dashboard', '3D Orbit Visualization')
- `icon`: Lucide icon component
- `category`: 'Core' | 'Tracker Mind' | 'Data'
- `status`: 'released' | 'beta' | 'planned'
- `description`: short string
- `whatYoullFind`: string[] (4 items)
- `whatYouCanDo`: string[] (4 items)
- `visualIcons`: Lucide icon[] (3)
- `route`: string (e.g. '/', '/stats', '/external')

## 6. Design Tokens

```css
/* Brand */
--page-accent: pink-500 (for assistant/ai page)

/* Tutorial-specific */
bg-zinc-950    /* page background */
zinc-900/75    /* glass card base */
zinc-800/50    /* border default */
zinc-700/50    /* border elevated */
emberald-500   /* success / completed */
amber-500      /* beta / active tutorial */
purple-500     /* Tracker Mind category */
blue-500       /* Data category */
emerald-500    /* Core category */

/* Typography */
h1:  text-lg font-semibold
h2:  text-base font-semibold
h3:  text-sm font-semibold
body: text-xs (12px) or text-sm (14px)
meta: text-xs text-zinc-500

/* Spacing */
card padding: p-5 (20px)
card gap: gap-3 (12px)
section gap: space-y-4
filter tabs: px-3 py-1 rounded-lg text-xs

/* Animation */
duration: 200-250ms (normal), 150ms (fast)
easing: ease-out, ease-in-out
motion: opacity + y (never layout properties)

/* Overlay (TutorialOverlay) */
z-[100] — above all content
backdrop: bg-black/70 backdrop-blur-sm
spotlight: 300px circle, amber-400/30 border, amber-400/5 bg, shadow glow
card: bg-zinc-800 rounded-xl border border-zinc-700
step dot: amber-400 current, emerald-500 completed, zinc-700 pending
```
