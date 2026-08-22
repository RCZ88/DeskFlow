# CONTEXT_BUNDLE.md — Life Page River Design Overhaul

## RAW REQUEST (verbatim)
"Like a new feature where in the river page, I'll be able to switch like the orientation of the phases to be like, for example sorting it, which has the order of the thing, right? Is it from orders to news and news to orders, we can be able to be able to switch between those orders, showing the stuff in the list of stuff, right? These phases, right? In the list of phases, and we should be able to switch those open, make those so that it's able to properly do those things. I feel like for the visualization, it still looks like AI stuff, there's lack of quality on the visualization and the ring stuff on the live river thing. The switching between the live, the decade, the year, it's also not working that well, I mean, like the visualization is just ass, everything is lack of quality and everything. So I need you to make sure that you use the generic prompt to improve everything. Everything is still AI stuff, I would like you to use the generic prompt. And all the skills, use the MCP, use the MCP properly, find proper resources and things that you can improve the design."

## WHAT'S ALREADY DONE (this session)
1. **Sort toggle** — `sortOrder` state ('oldest'|'newest') persisted to localStorage `life-sort-order`, toggle button in river controls, `displayPhases` useMemo sorts phases accordingly. DONE.
2. **RD morphogen 40s growth** — LivingSubstrate now always renders (bypasses prefers-reduced-motion for morphogen), 40-second growth animation (seed points → full coral), growthProgress uniform in display shader, cure-to-stop after 40s. DONE.
3. **Infinite loop fix** — ConnectionDataStrip uses loadedRef guard, no more perpetual "Listening to that period…" pulse. DONE.
4. **Attachment system** — life_phase_attachments DB table + IPC + preload + ConnectionDataStrip pickers for memories/goals/schedules/covenant. DONE.

## WHAT NEEDS DESIGN OVERHAUL
The following components look "AI slop" and need real design quality:

### PhaseCard (`src/components/life-river/PhaseCard.tsx`)
- Current: basic card with title, date range, description, milestones list
- Problem: flat, no visual hierarchy, no motion, generic AI look
- Needs: real card design with proper typography, accent colors per category, milestone visualization, hover/focus states, empty states

### CoreSample / RingCanvas (`src/components/life-river/CoreSample.tsx`, `RingCanvas.tsx`)
- Current: SVG rings showing phase durations on a timeline
- Problem: crude SVG, no animation, poor label positioning, "AI visualization" look
- Needs: smooth animated rings, proper label layout, interactive hover states, decade/year zoom that actually works well

### TimelineView (`src/components/life-river/TimelineView.tsx`)
- Current: vertical timeline with dots and lines
- Problem: basic, no visual interest, poor spacing
- Needs: real timeline design with proper visual hierarchy

### RiverMap (`src/components/life-river/RiverMap.tsx`)
- Current: zoom controls + phase list
- Problem: crude zoom slider, poor phase list design
- Needs: proper zoom UI, better phase navigation

### Lens indicator + river controls (LifePage.tsx)
- Current: basic button row for lens switching + sort toggle
- Problem: looks like a toolbar from a dashboard, not a life page
- Needs: integrated, elegant control surface

## DESIGN TOKENS (from src/index.css)
- Background: `--bg-primary: #09090b` (zinc-950)
- Accent: `--accent-primary: #f59e0b` (amber-500)
- Text: `--text-primary: #fafafa` (zinc-50)
- Border: `--border-primary: #27272a` (zinc-800)
- Page accent for life: `--page-accent: #f59e0b` (amber)
- Glass: `bg-zinc-900/75 backdrop-blur-xl`
- Cards: `rounded-xl border border-zinc-800/60 bg-zinc-900/30`
- Fonts: Geist (body), JetBrains Mono (code), DM Serif Display (headings)

## MCP COMPONENTS AVAILABLE
- shadcn: card, badge, button, tooltip, separator, skeleton, tabs, scroll-area
- Magic UI: number-ticker, border-beam, magic-card, shimmer-button, particles
- Lucide: 1500+ icons (Clock, Target, FolderHeart, Sparkles, ChevronDown, etc.)

## CONSTRAINTS
- Dark theme only (no light mode variants)
- Must preserve RD morphogen decoration (right 55%)
- Must preserve CoreSample ring system (just improve quality)
- Must preserve phase CRUD (add/edit/delete/reflect)
- No new dependencies
- Build = `npx vite build`
