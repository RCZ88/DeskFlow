# Canvas Card Design Revamp — Full Audit & Redesign

## Raw Request

> "i need you to provide the ai using generate-prompt with enough context of the skills and the elements of the mcp stuff so that it is able to audit and revamp the canvas cards and every mechanisms and logic and like everything so that it is more pleasing to work with and like just better design in general. also the calendar and stuff that was previously on the canvas — where is it? why is there no calendar now? and why is the schedule ui of the card on the canvas so bad where its just text? i need a full revamp."

## Context

Read CONTEXT_BUNDLE.md first — it contains all current card source code, CSS, and the design token system. The target AI must audit every card against the design skills listed below and produce a complete redesign spec.

---

## Part A: Design Skills (MANDATORY reference — the target AI MUST follow these)

### 1. frontend-external-infra — Source Routing & Re-skin Rules

**Source Routing Table:**
| UI Need | MCP Source | Components to Use |
|---------|-----------|-------------------|
| Standard card/block | shadcn | `card`, `badge`, `progress`, `tabs`, `separator`, `skeleton`, `tooltip` |
| Animated effect | Magic UI | `magic-card`, `animated-beam`, `border-beam`, `number-ticker`, `particles`, `shimmer-button`, `glare-hover` |
| Icon | Lucide | `Calendar`, `Clock`, `Target`, `CheckCircle`, `AlertTriangle`, `TrendingUp`, `Zap`, `Brain`, `Sparkles`, `ChevronDown`, `Plus`, `X` |
| Custom component | 21st.dev | Prompt-to-component generation for unique variations |
| Animated variant | React Bits | `spotlight-card`, `count-up`, `animated-list`, `scroll-stack`, `tilted-card` |

**Re-skin Rules (MANDATORY after sourcing):**
1. Replace source colors → `--dk-accent` (#22d3ee), `--dk-bg-surface`, `--dk-bg-raised`, etc.
2. Max `rounded-xl` (12px) border radius
3. `p-5` (20px) standard card padding
4. Geist + JetBrains Mono fonts only
5. Dark mode only — strip all light-mode variants
6. Glass layer: `bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50`

**Anti-Slop Checklist:**
- [ ] Correct font pairing (Geist body + JetBrains Mono code)
- [ ] No purple-gradient-on-everything
- [ ] No hero clichés, no repeated uppercase kicker labels
- [ ] Empty/loading/error states styled
- [ ] All icons from lucide-react (no emoji as UI icons)
- [ ] Focus-visible rings use `--dk-accent`
- [ ] Animation respects `prefers-reduced-motion`

### 2. frontend-design — DeskFlow Component Patterns

**Card Pattern (GlassCard):**
```
bg: var(--dk-bg-surface) = rgba(20, 20, 25, 0.92)
backdrop-filter: blur(16px)
border: 1px solid var(--dk-border-default)
border-radius: var(--dk-radius-lg) = 12px
padding: 14px (card body)
header: 10px 14px, border-bottom, bg: var(--dk-bg-raised)
```

**Typography:**
- Badge: 11px/500, uppercase, tracking 0.08em
- Body: 13px/400, color: var(--dk-text-secondary)
- Section label: 11px/600, uppercase, tracking 0.5px, color: var(--dk-text-faint)
- Card title: 14px/600, color: var(--dk-text-primary)

**Spacing:** 4px grid. Use `--dk-space-1` through `--dk-space-6`.

**Animation:** `--dk-fast: 150ms`, `--dk-normal: 250ms`, `--dk-slow: 400ms`, easing `--dk-ease: cubic-bezier(0.16, 1, 0.3, 1)`

### 3. humancentred-UIUX — Complete State Coverage

**Every data-driven component MUST have:**
1. **Empty state** — icon + explanation + CTA (e.g., "No goals yet. Add some or get AI suggestions.")
2. **Loading state** — skeleton placeholders matching content shape (not spinners)
3. **Error state** — plain-language cause + recovery action
4. **Populated state** — the actual content
5. **Partial/overflow** — scroll, collapse, or "show more" for long lists

**Anti-patterns to fix in current cards:**
- FocusCard: has loading skeleton ✓, has empty state ✓, but no error state
- PlanCard: has loading ✓, has empty ✓, but textarea has no validation feedback
- DigestCard: has loading ✓, has empty ✓, no error state
- ApprovalCard: has states ✓, but no loading state
- AnnotationCard: no loading/empty/error states
- DailyPlannerCard: has empty ✓, has error ✓, but error is just text — should be styled
- WeeklyScheduleCard: no loading/empty states
- DeadlineTrackerCard: has loading ✓, has empty ✓

### 4. impeccable — 27 Anti-Patterns (top 10 to check)

1. More than 2 font families in one view → CHECK: all cards use Geist + JetBrains Mono ✓
2. Body text below 14px on desktop → CHECK: cards use 12-13px, which is fine for dense card UI
3. Pure black backgrounds → CHECK: cards use `--dk-bg-raised` not #000 ✓
4. More than 3 accent colors in a single view → CHECK: work=cyan, personal=green, health=red, learning=purple — 4 colors, acceptable for category coding
5. Cards without clear boundaries → CHECK: cards have borders ✓
6. Animating layout properties → CHECK: progress bars use `width` transition — SHOULD use transform instead
7. `transition: all` → CHECK: some cards use `transition: all 0.15s` — should specify properties
8. No reduced-motion fallback → CHECK: MISSING — need to add

### 5. motion-alive — L2 Responsive (default for DeskFlow)

**L2 Rules:**
- Micro-interactions: 150-300ms
- ONE ambient accent max
- Standard easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- Stagger children: 0.04-0.06s
- Entrance offsets: y/x 4-12px, scale 0.96-1.0

**Current card motion issues:**
- Progress bars animate `width` (layout property) → should use ` scaleX()` transform
- Goal completion has pulse animation ✓
- No stagger on goal list items
- No entrance animations on cards

### 6. taste-skill — Anti-Repetition

**Knobs for this revamp:**
- DESIGN_VARIANCE: 6 (slightly above balanced — we want visual variety between cards)
- MOTION_INTENSITY: 5 (moderate — L2 level)
- VISUAL_DENSITY: 7 (dense — cards are compact data views)

**Anti-repetition checks:**
- Don't make all cards look the same (same header pattern, same body layout)
- Vary card headers: some with icon+title, some with title+badge, some with avatar
- Vary card footers: some with actions, some with metadata, some with progress
- Rotate accent colors per card type

---

## Part B: MCP Component Inventory (real names, not descriptions)

### shadcn (61 components available)
Key components for cards:
- `card` — base card with header, content, footer
- `badge` — status/category labels
- `progress` — progress bars
- `tabs` — switch between views within a card
- `separator` — visual dividers
- `skeleton` — loading placeholders
- `tooltip` — hover information
- `button` — action buttons with variants
- `scroll-area` — custom scrollbars

### Magic UI (98 components available)
Key components for cards:
- `magic-card` — spotlight follows mouse cursor on card
- `animated-beam` — light beam connecting elements
- `border-beam` — animated border light
- `number-ticker` — animated number counter (for stats)
- `shimmer-button` — shimmering perimeter light
- `glare-hover` — diagonal glare on hover
- `animated-list` — sequenced item animation
- `bento-grid` — feature showcase layout
- `particles` — interactive particle effects
- `sparkles-text` — animated sparkle text

### React Bits (135+ components)
Key components for cards:
- `spotlight-card` — hover spotlight effect
- `count-up` — number count animation
- `animated-list` — staggered list entrance
- `scroll-stack` — cards stack on scroll
- `tilted-card` — 3D tilt on hover
- `bounce-cards` — bouncing card stack

### Lucide Icons (relevant subset)
- `Calendar`, `Clock`, `Target`, `CheckCircle2`, `AlertTriangle`
- `TrendingUp`, `TrendingDown`, `Zap`, `Brain`, `Sparkles`
- `ChevronDown`, `ChevronRight`, `Plus`, `X`, `RefreshCw`
- `BarChart3`, `PieChart`, `Activity`, `Timer`, `Focus`
- `BookOpen`, `GraduationCap`, `Dumbbell`, `Heart`, `Briefcase`

---

## Part C: Current Card Problems (what to fix)

### 1. DailyPlannerCard — UI is text-heavy, no visual hierarchy
**Problems:**
- Timeline is just colored rectangles with text labels — no visual distinction between schedule blocks
- Goal list is flat text with checkboxes — no visual progress indication
- "Suggest Goals" button is plain text — should be a prominent CTA
- No visual separation between timeline, goals, and review sections
- Review section is just a text block — should be a styled card

**Fix direction:**
- Timeline: use gradient fills on schedule blocks, add subtle glow on current-time indicator
- Goals: each goal should be a mini-card with category color stripe, progress ring, time display
- Suggest button: use shimmer-button or pulsating-button from Magic UI
- Add section dividers with subtle gradient lines
- Review: collapsible card with styled markdown

### 2. WeeklyScheduleCard — Just text in a grid
**Problems:**
- Schedule blocks are plain colored rectangles with text
- No visual weight differentiation between classes
- Goal dots are tiny and hard to see
- No visual feedback for "today"
- Grid lines are harsh

**Fix direction:**
- Schedule blocks: use gradient fills, add icon per category
- Today column: glowing border + subtle background highlight
- Goal dots: larger, with tooltip on hover, animated on completion
- Grid: softer lines, subtle grid background pattern
- Add "current time" indicator line across all columns

### 3. DeadlineTrackerCard — Plain list with no urgency visual
**Problems:**
- Priority is just a colored dot — no visual urgency
- Days left is just text — should be a countdown visual
- No visual connection between deadline and linked goal
- Delete button is hidden until hover — should be more accessible

**Fix direction:**
- Priority: use animated badge with color + icon (exclamation for high, clock for medium, check for low)
- Days left: countdown ring or progress-to-deadline visual
- Linked goal: show as a connected card with line/beam
- Add urgency animation for deadlines within 24 hours

### 4. FocusCard — Too minimal
**Problems:**
- Just a list of goals with checkboxes
- No visual indication of which goals are active vs completed
- No progress tracking
- No connection to focus sessions

**Fix direction:**
- Each goal: mini-card with category color, progress ring, time tracking
- Active focus session: glowing indicator
- Completed goals: checkmark animation with confetti

### 5. PlanCard — Just a list
**Problems:**
- Long-term goals are just text items
- Notes textarea is plain
- No visual hierarchy between goals

**Fix direction:**
- Goals: cards with category color, priority badge, deadline indicator
- Notes: markdown preview with edit toggle
- Add progress tracking for long-term goals

### 6. DigestCard — Minimal text
**Problems:**
- Just topic titles and truncated summaries
- No visual engagement
- No source attribution

**Fix direction:**
- Each topic: card with gradient background, source icons, confidence indicator
- Add expand/collapse for full summaries
- Animated entrance for topics

### 7. ApprovalCard — Plain buttons
**Problems:**
- Just approve/reject buttons
- No visual feedback on action
- No context about what's being approved

**Fix direction:**
- Use animated buttons (shimmer on approve, shake on reject)
- Add confirmation animation
- Show approval context more prominently

---

## Part D: Design Specifications for Revamp

### Card Container (applies to ALL cards)
```css
background: var(--dk-bg-surface);
backdrop-filter: blur(16px);
border: 1px solid var(--dk-border-default);
border-radius: var(--dk-radius-lg); /* 12px */
overflow: hidden;
transition: border-color var(--dk-fast) var(--dk-ease), box-shadow var(--dk-fast) var(--dk-ease);
```

**Hover state:**
```css
border-color: var(--dk-border-strong);
box-shadow: var(--dk-shadow-md), var(--dk-shadow-glow);
```

**Card Header:**
```css
display: flex;
align-items: center;
justify-content: space-between;
padding: 10px 14px;
border-bottom: 1px solid var(--dk-border-subtle);
background: var(--dk-bg-raised);
```

**Card Body:**
```css
flex: 1;
padding: 14px;
font-size: 13px;
line-height: 1.5;
color: var(--dk-text-secondary);
overflow: auto;
```

### Goal Item (revamped)
```css
.dk-daily-goal {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--dk-bg-raised);
  border-radius: var(--dk-radius-md);
  border-left: 3px solid var(--category-color);
  transition: all var(--dk-fast) var(--dk-ease);
}
.dk-daily-goal:hover {
  border-color: var(--dk-border-default);
  background: var(--dk-bg-surface);
}
```

### Progress Ring (new component)
Circular SVG progress indicator replacing flat progress bars for goals:
- Size: 36px diameter
- Stroke width: 3px
- Color: category color
- Animated fill on mount
- Percentage text in center (10px)

### Schedule Block (revamped)
```css
.dk-schedule-block {
  position: absolute;
  left: 2px; right: 2px;
  border-radius: var(--dk-radius-sm);
  background: linear-gradient(135deg, var(--block-color)20, var(--block-color)08);
  border-left: 3px solid var(--block-color);
  padding: 6px 8px;
  font-size: 11px;
  transition: all var(--dk-fast) var(--dk-ease);
}
.dk-schedule-block:hover {
  background: linear-gradient(135deg, var(--block-color)30, var(--block-color)15);
  transform: translateX(2px);
}
```

### Deadline Item (revamped)
```css
.dk-deadline-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--dk-bg-raised);
  border-radius: var(--dk-radius-md);
  border: 1px solid transparent;
  transition: all var(--dk-fast) var(--dk-ease);
}
.dk-deadline-item.urgent {
  border-color: rgba(251, 191, 36, 0.3);
  background: rgba(251, 191, 36, 0.05);
  animation: dk-urgency-pulse 2s infinite;
}
```

### Countdown Visual (new)
For deadlines: circular progress showing days remaining vs total period:
- Green: > 7 days
- Yellow: 3-7 days
- Orange: 1-3 days
- Red: < 1 day / overdue
- Animated ring fill

---

## Part E: Constraints

1. Use ONLY existing IPC endpoints — no new backend
2. All SQL parameterized
3. Dark mode only, use --dk-* tokens
4. No new npm dependencies
5. Transform + opacity only for animation (no width/height/top/left)
6. Reduced motion fallback required
7. Empty/loading/error/populated states on every card
8. All icons from lucide-react
9. Max 2 font families per card
10. 44px minimum touch targets

## Part F: Output Format

The target AI must produce:
1. **Audit Report** — each card rated on: visual hierarchy, state coverage, animation, accessibility, anti-slop compliance
2. **Redesigned Components** — complete replacement source code for each card
3. **New Components** — any new components needed (ProgressRing, CountdownVisual, etc.)
4. **Updated CSS** — complete replacement for cards.css with all new styles
5. **Integration Notes** — what changes in CanvasCard.tsx renderCardContent() and AiPageDeck.tsx
