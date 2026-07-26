# CONTEXT_BUNDLE.md — Canvas Card Design Revamp (COMPLETE)

## Task
Audit and revamp ALL canvas card components. Every component, CSS rule, and design decision must be in THIS file. The target AI has NO access to MCP servers, design skills, or the codebase. This bundle IS the codebase.

---

## PART 1: REAL MCP COMPONENT SOURCE CODE (use these, adapt to DeskFlow tokens)

### shadcn Card (adapt to --dk-* tokens)
```tsx
// Source: shadcn MCP — @shadcn/card
// Re-skin: replace bg-card → var(--dk-bg-surface), border → var(--dk-border-default), rounded-xl → var(--dk-radius-lg)
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm", className)} {...props} />
  )
}
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6", className)} {...props} />
  )
}
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("leading-none font-semibold", className)} {...props} />
}
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-6", className)} {...props} />
}
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center px-6 [.border-t]:pt-6", className)} {...props} />
}
```

### shadcn Progress (adapt to --dk-* tokens)
```tsx
// Source: shadcn MCP — @shadcn/progress
// Re-skin: bg-primary/20 → var(--dk-border-subtle), bg-primary → var(--dk-accent)
function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)} {...props}>
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}
```

### shadcn Badge (adapt to --dk-* tokens)
```tsx
// Source: shadcn MCP — @shadcn/badge
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-white",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
)
```

### shadcn Skeleton
```tsx
// Source: shadcn MCP — @shadcn/skeleton
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-accent", className)} {...props} />
}
```

### shadcn Tabs
```tsx
// Source: shadcn MCP — @shadcn/tabs
// Full source available — Tabs, TabsList, TabsTrigger, TabsContent
// Re-skin: bg-muted → var(--dk-bg-raised), text-foreground → var(--dk-text-primary)
```

### Magic UI — Magic Card (spotlight follows cursor)
```tsx
// Source: Magic UI MCP — magic-card
// USE FOR: Canvas cards that need hover spotlight effect
// Props: gradientSize, gradientFrom, gradientTo, mode ("gradient"|"orb")
// Install: npx shadcn@latest add "https://magicui.design/r/magic-card.json"
// Dependencies: motion, next-themes
// Re-skin: gradientFrom/gradientTo → use --dk-accent colors
import { motion, useMotionTemplate, useMotionValue } from "motion/react"

export function MagicCard({ children, className, gradientSize = 200, gradientFrom = "#9E7AFF", gradientTo = "#FE8BBB" }) {
  const mouseX = useMotionValue(-gradientSize)
  const mouseY = useMotionValue(-gradientSize)
  // ... tracks mouse position, renders radial gradient border effect
}
```

### Magic UI — Number Ticker (animated counter)
```tsx
// Source: Magic UI MCP — number-ticker
// USE FOR: Goal progress numbers, deadline countdowns, stats
// Props: value, startValue, direction ("up"|"down"), delay, decimalPlaces
// Install: npx shadcn@latest add "https://magicui.design/r/number-ticker.json"
// Dependencies: motion
import { useInView, useMotionValue, useSpring } from "motion/react"

export function NumberTicker({ value, startValue = 0, direction = "up", delay = 0, decimalPlaces = 0 }) {
  const motionValue = useMotionValue(direction === "down" ? value : startValue)
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })
  const isInView = useInView(ref, { once: true })
  // Animates number from startValue to value with spring physics
}
```

### Magic UI — Shimmer Button (perimeter light effect)
```tsx
// Source: Magic UI MCP — shimmer-button
// USE FOR: "Suggest Goals" CTA, primary action buttons
// Props: shimmerColor, shimmerSize, borderRadius, shimmerDuration, background
// Install: npx shadcn@latest add "https://magicui.design/r/shimmer-button.json"
// Re-skin: background → var(--dk-accent-dim), shimmerColor → var(--dk-accent)
export const ShimmerButton = React.forwardRef(({ shimmerColor = "#ffffff", background = "rgba(0,0,0,1)", borderRadius = "100px", children, ...props }, ref) => (
  <button style={{ "--shimmer-color": shimmerColor, "--radius": borderRadius, "--bg": background }} className="group relative overflow-hidden ..." ref={ref} {...props}>
    {/* Animated conic-gradient sparkle rotating around perimeter */}
    {children}
  </button>
))
```

### Magic UI — Glare Hover (diagonal glare effect)
```tsx
// Source: Magic UI MCP — glare-hover
// USE FOR: Card hover effect alternative to Magic Card
// Props: color, opacity, angle, size, duration, playOnce
// Install: npx shadcn@latest add "https://magicui.design/r/glare-hover.json"
// Pure CSS — no motion dependency
export function GlareHover({ background = "#000", color = "#ffffff", opacity = 0.5, angle = -45, size = 250, duration = 650, children }) {
  // Uses ::before pseudo-element with background-position transition
  // Hover triggers glare sweep across the element
}
```

### Magic UI — Animated List (sequenced entrance)
```tsx
// Source: Magic UI MCP — animated-list
// USE FOR: Goal lists, deadline lists, digest topics
// Props: delay (ms between items)
// Install: npx shadcn@latest add "https://magicui.design/r/animated-list.json"
// Dependencies: motion
export function AnimatedList({ children, delay = 1000 }) {
  const [index, setIndex] = useState(0)
  // Shows items one by one with spring animation (scale 0→1, opacity 0→1)
}
```

---

## PART 2: DESIGN TOKENS (use these, nothing else)

```css
:root {
  --dk-bg-deep: #09090b;
  --dk-bg-base: #111118;
  --dk-bg-surface: rgba(20, 20, 25, 0.92);
  --dk-bg-raised: rgba(30, 30, 35, 0.95);
  --dk-bg-input: rgba(24, 24, 27, 0.9);
  --dk-text-primary: #f4f4f5;
  --dk-text-secondary: #d4d4d8;
  --dk-text-muted: #a1a1aa;
  --dk-text-faint: #71717a;
  --dk-text-placeholder: #52525b;
  --dk-border-subtle: rgba(63, 63, 70, 0.25);
  --dk-border-default: rgba(63, 63, 70, 0.5);
  --dk-border-strong: rgba(63, 63, 70, 0.7);
  --dk-accent: #22d3ee;
  --dk-accent-dim: rgba(34, 211, 238, 0.15);
  --dk-success: #4ade80;
  --dk-warning: #fbbf24;
  --dk-danger: #f87171;
  --dk-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --dk-shadow-md: 0 4px 16px rgba(0,0,0,0.4);
  --dk-shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
  --dk-shadow-glow: 0 0 30px rgba(34,211,238,0.06);
  --dk-space-1: 4px; --dk-space-2: 8px; --dk-space-3: 12px;
  --dk-space-4: 16px; --dk-space-5: 20px; --dk-space-6: 24px;
  --dk-radius-sm: 6px; --dk-radius-md: 10px; --dk-radius-lg: 12px;
  --dk-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --dk-fast: 150ms; --dk-normal: 250ms; --dk-slow: 400ms;
  --dk-sans: 'Geist', sans-serif;
  --dk-mono: 'JetBrains Mono', monospace;
}
```

---

## PART 3: CATEGORY COLOR SYSTEM

```typescript
const CATEGORY_COLORS: Record<string, string> = {
  work: '#22d3ee',      // cyan
  personal: '#4ade80',   // green
  health: '#f87171',     // red
  learning: '#a78bfa',   // purple
  class: '#fbbf24',      // yellow
  lab: '#fb923c',        // orange
}
```

---

## PART 4: CURRENT CARD SOURCE CODE (full files to replace)

### DailyPlannerCard.tsx (293 lines)
```tsx
// Full source at: src/components/ai/canvas/cards/DailyPlannerCard.tsx
// PROBLEMS: text-heavy, no visual hierarchy, flat goal list, plain buttons
// fetches: goals, schedule, deadlines, review via IPC
// has: useGoalProgress, useFocusGoals hooks
// renders: GoalTimeline, GoalProgressBar, goal items, suggest button, review
```

### WeeklyScheduleCard.tsx (119 lines)
```tsx
// Full source at: src/components/ai/canvas/cards/WeeklyScheduleCard.tsx
// PROBLEMS: plain text grid, no visual weight, tiny goal dots
// fetches: schedule, goalsBatch via IPC
// renders: 7-day grid with schedule blocks + goal dots + completion bars
```

### DeadlineTrackerCard.tsx (192 lines)
```tsx
// Full source at: src/components/ai/canvas/cards/DeadlineTrackerCard.tsx
// PROBLEMS: no urgency visual, priority is just a dot, no countdown
// fetches: deadlines, goals via IPC
// renders: sorted deadline list with goal linking + quick input
```

### GoalTimeline.tsx (111 lines)
```tsx
// Full source at: src/components/ai/canvas/cards/GoalTimeline.tsx
// PROBLEMS: schedule blocks are plain rectangles, no current-time glow
// renders: 6am-12am grid with schedule blocks, gaps, current time indicator
```

### GoalProgressBar.tsx (25 lines)
```tsx
// Full source at: src/components/ai/canvas/cards/GoalProgressBar.tsx
// PROBLEMS: flat bar, animates width (layout property), no ring variant
// renders: horizontal progress bar with color coding
```

### FocusCard.tsx (48 lines)
```tsx
// Full source at: src/components/ai/canvas/cards/FocusCard.tsx
// PROBLEMS: minimal list, no progress, no focus session connection
```

### PlanCard.tsx (52 lines)
```tsx
// Full source at: src/components/ai/canvas/cards/PlanCard.tsx
// PROBLEMS: plain list + textarea, no hierarchy
```

### DigestCard.tsx (38 lines)
```tsx
// Full source at: src/components/ai/canvas/cards/DigestCard.tsx
// PROBLEMS: minimal text, no visual engagement
```

### ApprovalCard.tsx (54 lines)
```tsx
// Full source at: src/components/ai/canvas/cards/ApprovalCard.tsx
// PROBLEMS: plain buttons, no confirmation animation
```

### AnnotationCard.tsx (18 lines)
```tsx
// Full source at: src/components/ai/canvas/cards/AnnotationCard.tsx
// PROBLEMS: no loading/empty/error states
```

### cards.css (330+ lines)
```css
/* Full CSS at: src/components/ai/canvas/cards/cards.css */
/* PROBLEMS: hardcoded hex values instead of --dk-* tokens, no reduced-motion, transition: all on some elements */
```

---

## PART 5: DESIGN SKILLS RULES (apply these to every component)

### From frontend-external-infra:
- Never design from zero. Pull from MCP sources listed above.
- Re-skin: colors → --dk-*, radius → max 12px, padding → 20px, fonts → Geist + JetBrains Mono
- Anti-slop: no emoji icons, no purple gradients, no hero clichés, empty/loading/error states required

### From frontend-design:
- Card glass: bg: var(--dk-bg-surface), backdrop-filter: blur(16px), border: 1px solid var(--dk-border-default)
- Typography: Badge 11px/500, Body 13px/400, Section 11px/600, Title 14px/600
- Animation: only transform + opacity, easing cubic-bezier(0.16, 1, 0.3, 1)

### From humancentred-UIUX:
- Every data component needs: Empty (icon+text+CTA), Loading (skeleton), Error (cause+fix), Populated
- Touch targets min 44px
- State changes animate 150-300ms

### From impeccable:
- 8px grid for spacing
- No `transition: all` — specify properties
- No width/height animation — use transform scaleX/scaleY
- prefers-reduced-motion fallback required

### From motion-alive:
- L2 Responsive level (default for DeskFlow)
- Micro-interactions 150-300ms
- Stagger children 0.04-0.06s
- Entrance: y/x 4-12px, scale 0.96-1.0

---

## PART 6: WHAT TO PRODUCE

For each card, produce:
1. **Replacement TSX** — complete component with empty/loading/error/populated states
2. **Replacement CSS** — all styles using --dk-* tokens only
3. **Integration notes** — any changes needed in CanvasCard.tsx or AiPageDeck.tsx

New components to create:
- **ProgressRing** — SVG circular progress (replaces flat bars for goals)
- **CountdownRing** — deadline urgency visual (days remaining as ring fill)
- **GoalItem** — revamped goal with category stripe, progress ring, time display
- **ScheduleBlock** — revamped with gradient fill + hover animation
- **DeadlineItem** — revamped with urgency badge + countdown

Every component must:
- Use --dk-* tokens only
- Transform + opacity animation only
- Reduced motion fallback
- lucide-react icons only
- Empty/loading/error/populated states
- MCP-sourced patterns where applicable
