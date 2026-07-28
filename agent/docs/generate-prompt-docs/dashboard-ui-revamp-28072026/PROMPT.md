# PROMPT.md — Dashboard UI Revamp (with ALL Frontend Skills)

## Raw Request
"Okay, we now got to focus on planning those, you know, deadlines and goals and stuff. So what I like to do since you haven't been doing those stuff, and I know it's quite complicated and in fact that we have the AI has been patriotic, its features of automatically adding those. Feel like it is a necessity for us to, you know, just have another AI to be the ones that decide on the features and how the UI will be to, what are the UI's and the necessary for those stuff. I think that's pretty much it. I don't know maybe, how can we improve this system and how we can separate those. I feel like that's a really good thing to discuss too and it's very important for me to be able to discuss those and have it complete. But yeah, I guess how can we make so that we can have those pages for specifically for the schedule? How can we separate the AI system, right? It's not that I want to separate it, it's just that I want the AI to be on some modules. It's supposed to be forwarded entirely, right? The current system is that it is a place where the features are specifically on those specific features and only on the AI system page, but the AI system page has the access to the other page but there's some sort of gap and there's some sort of weird, unfinished logic. There's a logic gap here in which in the designing of the UI and stuff like that, so we need to configure we need to figure those out properly. So it might take a while but I'm willing to spend the time and the event to be discussing and proving the front end of the dashboard whether we should even consider putting those schedules. I mean like the calendars are the most important, right? So yeah, just basically focus on two things which is the UI on the front end and how, yeah, it's just the dashboard for now. Let's just ignore everything. Just how we can add it so that the UI on the dashboard is properly, you can add stuff properly and so that, yeah, I mean, the UI is just improved. Yeah, I want the full improvement of the UI by using all front end skills, properly all front end skills. Generate the problem now, include the front end skills, actual skills, because the edit doesn't have access to the skills, right? So those stuff, okay, now, do that now."

## Context Bundle
Read `CONTEXT_BUNDLE.md` for all actual source code, IPC endpoints, design tokens, and architecture.

## The Mandate

Design a comprehensive dashboard UI revamp that:
1. Makes goals, deadlines, and schedules fully functional with proper add/edit/delete
2. Uses ALL frontend design skills (included below)
3. Uses real MCP components (included below)
4. Fixes the logic gap between AI system page and dashboard
5. Makes the schedule a first-class citizen on the dashboard

---

## FRONTEND SKILLS (The receiving AI MUST follow these)

### Skill 1: Frontend Design
**Philosophy:** Design is communication. Every pixel serves cognitive load reduction.

**Core Principles:**
1. Progressive Disclosure — Show what matters, hide complexity
2. Density Without Clutter — Data-heavy UIs need tight spacing (8px grid)
3. Glass as Structure — `backdrop-filter: blur()` for depth cues
4. Motion as Feedback — Every state change gets 150-300ms micro-interaction
5. Type as UI — Typography carries 60% of visual hierarchy in dark dashboards

**Color System:**
```
Background:     zinc-950 (base), zinc-900 (elevated), zinc-900/50 (glass)
Primary:        pink-500 (accent), pink-400 (hover), pink-600 (active)
Secondary:      cyan-400 (info), emerald-400 (success), amber-400 (warning)
Text:           zinc-100 (primary), zinc-400 (secondary), zinc-600 (disabled)
Border:         zinc-800 (subtle), zinc-700 (active), zinc-600/50 (glass edge)
```

**Animation Tokens:**
```
fast:    150ms (hover states, toggles)
normal:  250ms (modals, dropdowns)
slow:    400ms (page transitions)
ease-out: cubic-bezier(0.16, 1, 0.3, 1)
```

**Typography Scale:**
```
Badge:      11px/500
Meta:       12px/400
Body:       13px/400
Body+:      14px/400
Card title: 13px/600
Section h2: 15px/600
Page title: 18px/600
Display:    24-32px/700
```

**Card Padding:** ALL cards → `p-5` (20px). Never `p-6` or `p-8`.
**Border Radius:** ALL cards → `rounded-xl` (12px). Never `rounded-2xl` or `rounded-3xl`.

**Anti-Patterns:**
- NEVER use `box-shadow` for elevation in dark themes
- NEVER use pure black (`#000`) backgrounds
- NEVER use more than 2 font families in a single view
- NEVER animate layout properties (width/height)
- NEVER use default browser focus rings
- NEVER place interactive elements closer than 44px

### Skill 2: Human-Centric UX
**Philosophy:** A UI is done when a human can look at it and immediately know where they are, what is happening, and what to do next.

**The 6 Pillars:**
1. Clarity Over Cleverness — Every label in plain human language
2. Progressive Disclosure — Show what matters now, hide complexity
3. Visual Hierarchy — Guide the eye with weight, color, spacing
4. Complete State Coverage — Empty / Loading / Error / Populated for EVERY data component
5. Feedback & Micro-interactions — Every interactive element has hover/focus/active/disabled
6. Forgiveness & Affordance — Make right action easy, mistakes cheap

**Pre-Return Checklist:**
- [ ] Primary action obvious in <1s
- [ ] No raw system tokens visible
- [ ] Empty, Loading, Error states exist
- [ ] Clear visual hierarchy
- [ ] Secondary complexity hidden
- [ ] All interactive elements have states
- [ ] State changes animate 150-300ms
- [ ] Submit gives feedback, destructive actions confirm
- [ ] Copy is plain-language
- [ ] Meaning never by color alone
- [ ] Targets ≥ 44px

### Skill 3: Impeccable Design
**Philosophy:** Impeccable design is invisible — it removes friction so completely users don't notice it.

**7 Design Dimensions:**
1. **Typography** — Modular scale (1.25 ratio), line height 1.5, 45-75 chars per line
2. **Color** — HSL for dark themes, opacity layers for depth, one primary accent
3. **Spatial** — 8px grid, density zones (high/medium/low)
4. **Motion** — Duration scale (micro/fast/normal/slow/dramatic), natural easing
5. **Interaction** — Hover states mandatory, active states 10% darker, focus visible
6. **Responsive** — Mobile-first, 44px touch targets
7. **UX Writing** — Direct, concise, action-oriented

### Skill 4: Motion — Bring the UI Alive
**Philosophy:** Life comes from motion that responds to the human and breathes on its own.

**Liveliness Levels:**
- **L1 Composed** — Motion only for feedback & orientation (120-200ms)
- **L2 Responsive** — Micro-interactions + smooth transitions (150-300ms) — DEFAULT
- **L3 Expressive** — Scroll choreography, ambient backgrounds (200-600ms)

**For Dashboard:** Use L2 (Responsive)

**Motion Taxonomy:**
- **Reactive** — hover lift, press/tap, focus ring, toggle
- **Transitional** — enter/exit, tab swap, skeleton→content, list stagger
- **Ambient** — breathing glow, gradient drift, shimmer sweep
- **Narrative** — scroll-reveal, parallax (L3 only)

**Recipes:**
```tsx
// Hover lift + press
<motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }} />

// List stagger
const list = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

// Number count-up
const v = useSpring(0, { stiffness: 90, damping: 20 })
useEffect(() => v.set(target), [target])
```

### Skill 5: frontend-external-infra (MCP Components)
**Source Routing:**
| You need… | Use… |
|-----------|------|
| Standard UI block | shadcn MCP |
| Animated effect | Magic UI MCP |
| Icon | Lucide MCP |
| Specific component | @21st.dev/magic |

**Available Components (src/components/ui/):**
| Component | File | Use For |
|-----------|------|---------|
| GlareHover | glare-hover.tsx | Diagonal glare on hover |
| MagicCard | magic-card.tsx | Mouse spotlight |
| BorderBeam | border-beam.tsx | Animated border |
| NumberTicker | number-ticker.tsx | Animated counter |
| AnimatedCircularProgressBar | animated-circular-progress-bar.tsx | Progress rings |
| AnimatedShinyText | animated-shiny-text.tsx | Shimmer text |
| AnimatedGradientText | animated-gradient-text.tsx | Gradient text |
| Confetti | confetti.tsx | Celebration |
| Particles | particles.tsx | Background |
| DotPattern | dot-pattern.tsx | Background pattern |
| Button/Input/Badge/Select | shadcn | Forms |
| Popover/Calendar | shadcn | Date pickers |

**Re-Skin Rules:**
1. Colors → DeskFlow CSS vars
2. Border radius → max `rounded-xl`
3. Padding → `p-5`
4. Fonts → Geist + JetBrains Mono
5. Dark mode only
6. Glass layer → `bg-zinc-900/80 backdrop-blur-xl`

**Anti-Slop Checklist:**
- [ ] NOT purple/indigo gradient-on-everything
- [ ] Radius + padding from DeskFlow scale
- [ ] No tiny uppercase eyebrow + oversized headline
- [ ] Real micro-interactions
- [ ] Empty/loading/error states
- [ ] All icons from lucide-react

---

## BACKEND AUDIT (All IPC endpoints exist and work)

| Feature | IPC Channel | Handler Exists? | Status |
|---------|-------------|-----------------|--------|
| Get daily goals | getGoals | ✅ main.ts | ✅ Real |
| Save goal | saveGoal | ✅ main.ts | ✅ Real |
| Delete goal | deleteGoal | ✅ main.ts | ✅ Real |
| Get long-term goals | getLongtermGoals | ✅ main.ts | ✅ Real |
| AI suggest goals | suggestGoals | ✅ main.ts | ✅ Real |
| Get deadlines | getDeadlines | ✅ main.ts | ✅ Real |
| Add deadline | addDeadline | ✅ main.ts | ✅ Real |
| Update deadline | updateDeadline | ✅ main.ts | ✅ Real |
| Delete deadline | deleteDeadline | ✅ main.ts | ✅ Real |
| Get schedule | getSchedule | ✅ main.ts | ✅ Real |
| Add schedule entry | addScheduleEntry | ✅ main.ts | ✅ Real |
| Update schedule entry | updateScheduleEntry | ✅ main.ts | ✅ Real |
| Delete schedule entry | deleteScheduleEntry | ✅ main.ts | ✅ Real |

---

## REQUIREMENTS

### Data Processing
- [ ] AI reads long-term goals and generates daily breakdown
- [ ] Each daily goal links to parent long-term goal (parentId)
- [ ] Progress tracking via app usage (matchCategory)
- [ ] Streak calculation across days
- [ ] Momentum score formula
- [ ] Category balance analysis

### Visual Specs (use MCP components)
- [ ] StatusBand: Mouse spotlight orb (MagicCard), BorderBeam, focus CTA
- [ ] GoalsCard: GlareHover on each item, AI suggestions, parent link, edit/delete
- [ ] DeadlinesCard: GlareHover, urgency colors, priority badges, edit/delete
- [ ] ScheduleCard: GlareHover, color-coded time blocks, inline add/edit/delete
- [ ] All cards: Empty/Loading/Error states, hover effects, animations

### UX Flow
- [ ] Dashboard loads → AI generates suggestions → Human reviews
- [ ] Human adds goal → Form with category, period, target, parent link
- [ ] Human clicks goal → Shows connected long-term goal, deadline, schedule
- [ ] Focus session starts → Goal linked, progress tracked
- [ ] Day ends → Survey card appears, AI asks about completion
- [ ] Streak hits milestone → Celebration animation

### Logic Gap Fix
- [ ] AI system page and dashboard share the same goal/deadline/schedule data
- [ ] Changes on dashboard reflect on AI system page immediately
- [ ] No duplicate data stores
- [ ] Consistent UI patterns across both surfaces
