# AiPage Focus/Plan/Reflect — Full Redesign Prompt

## Raw Request

> "the Focus, Plan, Reflect sections 'look like shit' — the layout 'doesn't make sense' and needs a full visual and structural rethink. The 5 cards (DailyPlanCard, MyPlanCard, LongTermPlanCard, TopicDigestCard, GoalHistoryCard) must be completely redesigned with proper UI/UX, sourced components from MCP libraries, and all frontend design skills applied."

---

## Context

Read `CONTEXT_BUNDLE.md` first for full codebase context. It contains all 5 card component source code, the design system tokens, available MCP components, IPC endpoints, data types, and project conventions.

---

## The Mandate

You are the Lead Designer and Engineer. Design a **comprehensive, production-ready** redesign of the Focus, Plan, and Reflect sections of the AiPage. This is NOT a menu of options — produce ONE definitive solution with high-fidelity visual specs, data processing logic, and interaction design.

---

## Requirement Checklist

### A. Layout & Information Architecture

1. **Replace the flat card-per-section layout** with a coherent, visually structured design that makes sense at first glance. The current layout (Focus → DailyPlanCard, Plan → MyPlanCard + LongTermPlanCard side by side, Reflect → TopicDigestCard stacked on GoalHistoryCard) is disjointed and cramped.

2. **Propose a new section structure** that could include:
   - A unified **Focus** component showing today's plan as a clear, actionable checklist — not a dense list of raw data
   - A unified **Plan** component combining short-term (MyPlan) and long-term goals in a single cohesive view, with the long-term bulk-import feature integrated naturally
   - A unified **Reflect** component combining topic digests and goal history, possibly with a timeline or activity feed metaphor

3. **Responsive layout**: single-column mobile → logical multi-column desktop. The current `md:grid-cols-2` for the Plan section should be reconsidered in the new structure.

### B. Visual Design

1. **Design System**: Use DeskFlow's design tokens exclusively (`tokens.ts` — ACCENT, SURFACE, RING, TEXT, MOTION). All cards use GlassCard (`bg-zinc-900/40`, `ring-1 ring-zinc-800/60`, `rounded-xl p-5`, accent bars).

2. **Typography**: Body = Geist/Inter (13px). Mono = JetBrains Mono. Headings weight 600. Never introduce a third font.

3. **Colors**: Replace any source component colors with DeskFlow CSS tokens. Dark mode only. Gradients are intentional and rare.

4. **Geometry**: `rounded-xl` max (12px). `p-5` card padding. Never `rounded-2xl`/`-3xl` or `p-6`/`p-8`.

5. **Animations**:
   - Use `MOTION` tokens from `tokens.ts` (fast: 0.15, normal: 0.25, slow: 0.40)
   - Easing: `[0.16, 1, 0.3, 1]` for standard, `[0.4, 0, 0.2, 1]` for easeInOut
   - Stagger children at `MOTION.stagger` (0.05)
   - Respect `prefers-reduced-motion`

### C. Sourced Components (MCP-Based — Full Source & API Below)

The Architect AI cannot call MCP tools. All component source code, props interfaces, install commands, and usage patterns are inlined below. Adapt these to DeskFlow tokens using the re-skin rules from CONTEXT_BUNDLE.md §6.

---

#### Magic UI: AnimatedList (`@/components/ui/animated-list`)

**Install:** `npx shadcn@latest add "https://magicui.design/r/animated-list.json"`

**Source:** Uses `motion/react` (framer-motion) `AnimatePresence` + `motion.div` with spring animation.

```tsx
// Props interface
export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode
  delay?: number           // ms between items appearing, default 1000
}

// AnimatedListItem — wraps each child
export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations: MotionProps = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 350, damping: 40 },
  }
  return <motion.div {...animations} layout className="mx-auto w-full">{children}</motion.div>
}

// AnimatedList — reveals items one by one with delay
export const AnimatedList = React.memo(({ children, className, delay = 1000 }: AnimatedListProps) => {
  const [index, setIndex] = useState(0)
  const childrenArray = useMemo(() => React.Children.toArray(children), [children])
  // ... cycles through items, showing each new one after `delay`
  const itemsToShow = childrenArray.slice(0, index + 1).reverse()
  return (
    <div className={cn(`flex flex-col items-center gap-4`, className)}>
      <AnimatePresence>
        {itemsToShow.map((item) => <AnimatedListItem key={...}>{item}</AnimatedListItem>)}
      </AnimatePresence>
    </div>
  )
})
```

**Usage for animated goal list:** Wrap `<AnimatedListItem>` around each goal row. Re-skin to DeskFlow: replace gap-4 with gap-1.5, use DeskFlow ring/bg classes on list items.

---

#### Magic UI: NumberTicker (`@/components/ui/number-ticker`)

**Install:** `npx shadcn@latest add "https://magicui.design/r/number-ticker.json"`

**Source:** Uses `motion/react` `useMotionValue` + `useSpring` + `useInView`.

```tsx
interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number          // default 0
  direction?: "up" | "down"   // default "up"
  delay?: number               // seconds delay before starting, default 0
  decimalPlaces?: number       // default 0
}

export function NumberTicker({ value, startValue = 0, direction = "up", delay = 0, className, decimalPlaces = 0 }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(direction === "down" ? value : startValue)
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })
  const isInView = useInView(ref, { once: true, margin: "0px" })
  // On inView → animates from startValue → value with spring physics
  // Updates textContent via springValue.on("change", ...)
  return <span ref={ref} className={cn("inline-block tracking-wider tabular-nums", className)}>{startValue}</span>
}
```

**Usage for metrics:** `<NumberTicker value={done.length} className="text-zinc-100 text-lg font-semibold" />` — re-skin to DeskFlow `tabular-nums`, remove `text-black dark:text-white`, use `text-zinc-100`.

---

#### Magic UI: BentoGrid (`@/components/ui/bento-grid`)

**Install:** `npx shadcn@latest add "https://magicui.design/r/bento-grid.json"`

**Source:**
```tsx
interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}
// Default: grid w-full auto-rows-[22rem] grid-cols-3 gap-4

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string
  className: string          // col-span-3 lg:col-span-1 etc
  background: ReactNode      // content behind the card — animated list, calendar, etc
  Icon: React.ElementType
  description: string
  href: string
  cta: string
}
```

**Usage for Focus overview:** Create a 2-column bento showing "goals completed" + "focus time" + "active tasks". Re-skin: replace `bg-background dark:[box-shadow:...]` with DeskFlow `bg-zinc-900/40 ring-1 ring-zinc-800/60`. Strip CTA button (not a landing page). Remove light-mode styles.

---

#### shadcn/ui: Progress (`@/components/ui/progress`)

**Install:** `npx shadcn@latest add @shadcn/progress`

**Source** (after re-skin): Use `@radix-ui/react-progress` under the hood. Apply DeskFlow tokens: `bg-zinc-800/60` for track, accent color for indicator.

---

#### shadcn/ui: Collapsible (`@/components/ui/collapsible`)

**Install:** `npx shadcn@latest add @shadcn/collapsible`

**Source:** Uses `@radix-ui/react-collapsible`. The trigger + content pattern replaces the current custom `AnimatePresence` accordions throughout GoalHistoryCard and TopicDigestCard.

---

#### shadcn/ui: Dialog + AlertDialog (`@/components/ui/dialog`, `@/components/ui/alert-dialog`)

**Install:** `npx shadcn@latest add @shadcn/dialog` + `npx shadcn@latest add @shadcn/alert-dialog`

**Source:** Uses `@radix-ui/react-dialog`. DialogContent: `bg-zinc-900` ring-1 ring-zinc-800/60 rounded-xl p-5. Overlay: `bg-black/50 backdrop-blur-sm`. Use for goal creation/editing and delete confirmation.

---

#### ReactBits: AnimatedContent

**Source:** GSAP + ScrollTrigger based scroll-triggered entrance.

```tsx
interface AnimatedContentProps {
  children: React.ReactNode
  distance?: number          // px to travel, default 100
  direction?: 'vertical' | 'horizontal'
  reverse?: boolean
  duration?: number          // seconds, default 0.8
  ease?: string              // default "power3.out"
  initialOpacity?: number    // default 0
  scale?: number             // default 1
  threshold?: number         // 0-1, default 0.1
  delay?: number             // seconds
}
```

**Usage:** Wrap section containers for scroll-triggered fade-in. Note: depends on GSAP — check if `gsap` is in package.json before using. If not present, use framer-motion `useInView` instead.

---

#### ReactBits: GlareHover

Creates a glare effect that follows the cursor on hover. Use on GlassCard-like elements for polish. Re-skin colors to DeskFlow scheme.

---

**Important:** After pulling any component's code pattern:
1. Apply DeskFlow re-skin rules (CONTEXT_BUNDLE.md §6)
2. Run the anti-slop checklist (CONTEXT_BUNDLE.md §6 checklist)
3. Ensure `prefers-reduced-motion` is respected for all animations

### D. States (Every Data-Driven Component)

Every component MUST handle these 4 states visibly, using DeskFlow patterns:

- **Loading**: Skeleton cards using `animate-pulse` on `bg-zinc-800/40` blocks
- **Empty**: Icon + message + optional CTA (Brain icon for goals, BookOpen for digests, Calendar for history, Flag for long-term)
- **Error**: Red-tinted card with AlertCircle icon + error message + Retry button (use StateShell pattern)
- **Populated**: The actual data display with proper whitespace, hierarchy, and interaction

### E. Interaction & UX

1. **Goal toggling**: Check circle → smooth checkmark animation (not instant swap)
2. **Goal creation**: Inline form OR modal dialog — whichever provides better UX for both single and bulk entry
3. **Long-term goal entry**: The user specifically wants "single or multiple text input fields for entering goals" with proper UI/UX. The current textarea + analyze-with-AI flow should be refined into a polished experience
4. **History browsing**: Date accordions should feel like browsing a timeline, not debug data
5. **Topic digests**: The accordion pattern works but needs better visual treatment — card hover effects, smoother transitions, richer metadata display
6. **Feedback**: The daily review feedback input should be integrated naturally, not tacked on at the bottom

### F. File Structure

Decide whether to:
- Keep the 5 separate files and redesign each independently
- Merge some/all into fewer, more cohesive components
- Add new wrapper components for the Focus/Plan/Reflect sections

Reference the current import structure from `src/pages/AiPage.tsx` to ensure backward compatibility.

---

## Constraints

1. **Must use existing backend IPC** — all IPC endpoints from CONTEXT_BUNDLE.md §8 are available. Do NOT design new endpoints unless they genuinely don't exist.
2. **Must preserve the AiPage.tsx state interface** — the parent page owns all state and passes it down. The redesign must accept the same props or a superset.
3. **All localStorage access must be wrapped in try/catch**.
4. **CRLF line endings** — preserve them in every file.
5. **Security** — never expose or log secrets/keys.
6. **Prefer renderer-side fixes** — read the full IPC handler in `main.ts` before editing it.
7. **Do NOT remove any existing functionality** — all current features (goal CRUD, AI suggestions, bulk import, topic digests, goal history, plan editing) must be preserved and improved.

---

## Output Format

Produce a **RESULT.md** (markdown) with:

1. **Architecture**: New component tree, file structure, data flow
2. **Visual Design**: Exact color tokens, spacing, typography specs, animation values
3. **Component Specs**: For each redesigned component — props interface, states, layout, behavior
4. **Key Implementation Patterns**: How to implement the animations, transitions, and interactions
5. **Backend Integration**: Any new IPC or data shape changes needed
6. **Migration Path**: How to transition from current 5-file structure to the new one

Include exact code patterns where they clarify intent. The solution must be implementable from this document + CONTEXT_BUNDLE.md alone.
