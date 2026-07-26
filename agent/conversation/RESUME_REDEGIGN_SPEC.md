# Resume Page Redesign — Design Specification
> For: DeskFlow Electron App (React + Tailwind + Framer Motion)
> Scope: Resume Hub (`ResumePage.tsx`) + Resume Builder (`ResumeBuilderPage.tsx`) + sub-components
> Design Skills Applied: frontend-design, humancentred-UIUX, motion-alive (L2), impeccable, signature-design, ui-ux-pro-max, frontend-external-infra
> Date: 2026-07-25

---

## 0. CONTEXT FOR IMPLEMENTER

You are implementing a complete UI redesign of the Resume feature in DeskFlow. Read this spec first, then implement in order. Every file change is specified below. Do NOT improvise — follow the spec exactly.

Current file locations to reference:
- `src/pages/ResumePage.tsx` — Hub page (redesign completely)
- `src/pages/ResumeBuilderPage.tsx` — Builder page (redesign layout + components)
- `src/features/resume/components/*.tsx` — Sub-components (many need updates)
- `src/types/resume.ts` — Types (add new if needed, do NOT break existing)
- `src/stores/resumeStore.ts` — Zustand store (do NOT break existing API)

---

## 1. DESIGN TOKENS (Use exactly)

### Colors
```
Base bg:          bg-zinc-950          #09090b
Elevated bg:      bg-zinc-900/80 + backdrop-blur-xl
Glass border:     border-zinc-800/60
Hover border:     border-zinc-700/60
Page accent:      rgb(99, 102, 241)    --page-accent (indigo-500)
Accent hover:     rgb(129, 140, 248)   indigo-400
Completed glow:   rgb(251, 191, 36)    amber-400
Completed bg:     bg-amber-500/10      ring-amber-500/20
Success:          rgb(52, 211, 153)    emerald-400
Warning:          rgb(251, 191, 36)    amber-400
Error:            rgb(248, 113, 113)   red-400
Text primary:     text-zinc-100
Text secondary:   text-zinc-400
Text muted:       text-zinc-500
Text disabled:    text-zinc-600
```

### Typography
```
Page title:       text-lg font-semibold    (18px/600)
Section h2:       text-[15px] font-semibold (15px/600)
Card title:       text-sm font-semibold     (13px/600)
Body:             text-sm                   (13px/400)
Body+:            text-[14px]               (14px/400)
Meta:             text-xs                   (12px/400)
Badge:            text-[10px] font-medium   (10px/500)
Tapestry label:   text-[11px] font-medium uppercase tracking-wider
```

### Spacing
```
Card padding:     p-5 (20px) — NEVER p-6 or p-8
Card radius:      rounded-xl (12px) — NEVER rounded-2xl or rounded-3xl
Section gap:      space-y-6 (24px)
Card gap:         gap-4 (16px)
Inner gap:        gap-3 (12px)
Touch target:     min 44px
```

### Animation Tokens
```
fast:     150ms   cubic-bezier(0.16, 1, 0.3, 1)
normal:   250ms   cubic-bezier(0.16, 1, 0.3, 1)
slow:     400ms   cubic-bezier(0.16, 1, 0.3, 1)
ambient:  12000ms linear (tapestry beam loop)
spring:   stiffness 300, damping 30 (L2 gentle spring)
stagger:  50ms between list items
```

### Z-Index Scale
```
0:   page content
10:  elevated cards, sticky headers
20:  dropdowns, tooltips
30:  modals
40:  toasts
50:  overlays
```

---

## 2. SIGNATURE ELEMENT: CareerTapestry

### Concept
A horizontal SVG timeline with 7 circular nodes connected by a path. Represents the resume building journey.

### File: `src/features/resume/components/CareerTapestry.tsx` (NEW)

**Props:**
```ts
interface CareerTapestryProps {
  phaseStatus: Record<number, 'locked' | 'in_progress' | 'complete'>;
  currentPhase: number;
  onPhaseClick?: (phase: number) => void;
  compact?: boolean; // true for builder mini version
}
```

**Visual spec:**

1. **Container:** Full width, height = `compact ? 60 : 140`px. Relative positioning. Overflow hidden.

2. **Base path:** Horizontal line, 2px stroke, color `rgb(63, 63, 70)` (zinc-700). Centered vertically.

3. **Completed path overlay:** Same geometry but stroke = gradient from `rgb(99,102,241)` (indigo) to `rgb(251,191,36)` (amber). Stroke-dasharray animated so it appears to "fill" as phases complete. Opacity 0.6.

4. **Nodes (7 circles):**
   - Size: `compact ? 28 : 44`px diameter
   - Spacing: Evenly distributed across width
   - **Locked:** Empty ring (2px stroke, zinc-700 fill, no glow)
   - **In progress:** Filled with indigo-500/20, 2px ring indigo-500/40, pulsing glow (CSS animation `breathe`, 2.4s ease-in-out infinite, scale 1→1.08, opacity 0.5→0.9)
   - **Complete:** Filled with amber-500/20, 2px ring amber-500/40, static amber glow (box-shadow style via SVG filter or CSS drop-shadow)
   - **Hover (interactive):** Scale 1.08, ring intensifies, cursor pointer

5. **Icons inside nodes:** Phase icons from `src/types/resume.ts` PHASE_ICONS mapping. Use lucide-react icons. Size: `compact ? 14 : 20`px.

6. **Labels (non-compact only):**
   - Below each node: phase name (first word only), text-[11px] uppercase tracking-wider
   - Color: locked=zinc-600, in_progress=indigo-400, complete=amber-400

7. **Beam effect (non-compact only, ambient accent):**
   - A subtle light shimmer travels along the completed portion of the path
   - Pure CSS: Use a linearGradient with animated `offset` on an SVG `<animate>` element, or CSS `@keyframes shimmer` moving a mask
   - Duration: 12s, linear, infinite
   - Opacity: 0.25 (very subtle)
   - Colors: transparent → indigo-500/40 → amber-400/40 → transparent
   - **Reduced motion:** Static, no shimmer animation

8. **Empty state (no progress):**
   - All nodes muted
   - Text overlay centered: "Start building your resume"
   - CTA button below: "Begin Journey" → navigates to `/resume/build`

9. **Complete state (all phases done):**
   - All nodes amber glow
   - Confetti micro-animation: 20 small particles (divs) burst from center, fade out over 1s. Use framer-motion AnimatePresence.
   - Text: "Resume complete! Ready to export."

**CSS needed in index.css or inline:**
```css
@keyframes tapestry-breathe {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.08); opacity: 0.9; }
}
@keyframes tapestry-shimmer {
  0% { stroke-dashoffset: 200; }
  100% { stroke-dashoffset: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .tapestry-pulse { animation: none !important; }
  .tapestry-shimmer { animation: none !important; }
}
```

---

## 3. HUB PAGE: ResumePage.tsx (COMPLETE REWRITE)

### Layout Structure (top to bottom)

```
<PageShell>
  ├─ CareerTapestry (hero, full width, ~140px)
  ├─ IdentityCard
  ├─ JourneyPath
  ├─ StatsRow
  ├─ VersionsGallery
  ├─ [ChatImportsAccordion]
  ├─ [EmptyStateFallback]
</PageShell>
```

### A. CareerTapestry (hero)
- Full width within the max-w-6xl container
- Margin bottom: 24px (mb-6)
- Props: `phaseStatus`, `currentPhase`, `onPhaseClick`
- `onPhaseClick`: navigates to `/resume/build` and sets builder to that phase
- Border: `rounded-xl border border-zinc-800/60`
- Background: `bg-zinc-900/50 backdrop-blur-xl`
- Padding: `p-5`

### B. IdentityCard (NEW COMPONENT or inline)
- Horizontal layout: flex row, items-center, gap-6
- Left side:
  - Avatar placeholder: `w-14 h-14 rounded-xl bg-[var(--page-accent)]/15 flex items-center justify-center`
  - Icon: `FileText` from lucide, w-7 h-7, text-[var(--page-accent)]
  - Next to it:
    - Name: `text-lg font-semibold text-white` — show `profile?.fullName || "Your Resume"`
    - Target role + career level: `text-sm text-zinc-400` — e.g., "Senior Frontend Engineer"
    - Edit profile button: small text link, `text-xs text-[var(--page-accent)] hover:text-[var(--page-accent)]/80`
- Right side:
  - ScoreGauge component (wrap existing `ScoreGauge`)
  - Below it: `text-[10px] text-zinc-500 uppercase tracking-widest` "Resume Score"

### C. JourneyPath (replaces quickActions grid)
- Horizontal flow, NOT a grid
- 4 steps in a row: Import → Build → Preview → Export
- Each step is a card-like button
- Connecting arrows (`ArrowRight` icon or thin line) between steps
- Layout: `flex items-center gap-2`

**Step styling:**
```
Step card:
  - width: flex-1 or fixed ~180px
  - bg-zinc-900/80 backdrop-blur-xl
  - border: border-zinc-800/60, rounded-xl, p-4
  - Icon container: w-10 h-10 rounded-lg bg-{color}/15
  - Icon: w-5 h-5 text-{color}
  - Label: text-sm font-semibold text-white mt-2
  - Desc: text-[11px] text-zinc-500 mt-1
  - Status indicator:
    - Completed: green check circle + "Done"
    - Available: indigo dot + "Start"
    - Locked: gray lock icon + "Locked"
  - Hover (available): y: -2, border glow, scale 1.01
  - Click: navigates to respective route
```

**Step definitions:**
```ts
const journeySteps = [
  { key: 'import', label: 'Import', desc: 'Extract from chats & docs', path: '/resume/import', icon: Upload, color: 'emerald' },
  { key: 'build', label: 'Build', desc: 'Answer questions with AI help', path: '/resume/build', icon: Rocket, color: 'indigo' },
  { key: 'preview', label: 'Preview', desc: 'See your live resume', path: '/resume/preview', icon: Eye, color: 'blue' },
  { key: 'export', label: 'Export', desc: 'PDF, Markdown, JSON', path: '/resume/export', icon: Download, color: 'amber' },
];
```

**Determining status:**
- If versions.length > 0: all steps available (build might be "Continue" instead of "Start")
- If builder has progress: build step shows partial progress
- If no data at all: only Import and Build available, Preview and Export locked

**Connecting arrows:**
- Between each step: `ArrowRight` icon, w-4 h-4, text-zinc-700
- If preceding step is complete: arrow turns emerald-400
- If locked: arrow is zinc-800, dimmed

### D. StatsRow
- Keep the 4 stat cards from current implementation
- But redesign each card:
```
Card:
  - bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5
  - Top: icon container (w-9 h-9 rounded-xl bg-{color}/10) + label
  - Middle: NumberTicker value (text-2xl font-bold)
  - Bottom: subtle progress bar showing relative fullness
    - e.g., "Score" bar shows score/100 as a thin colored bar
```

Stats:
1. Versions — icon FileText, color indigo, bar = versions.length / 5
2. Chat Imports — icon Upload, color emerald, bar = chatCompilations.length / 10
3. Confirmed Takeaways — icon CheckCircle, color amber, bar = confirmedTakeaways / 20
4. Score — icon TrendingUp, color violet, bar = score.current / 100

### E. VersionsGallery (replaces list)
- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Each version card:
```
Card:
  - bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5
  - Hover: y:-2, border-zinc-700/60, cursor-pointer
  - Preview thumbnail area:
    - Height: 120px
    - bg-zinc-950 rounded-lg overflow-hidden
    - Render a mini ResumePreview with scale={35} or smaller
    - If no content: show "Preview" placeholder text centered
  - Below preview:
    - Version name: text-sm font-semibold truncate
    - Role + Company: text-xs text-zinc-500
    - Score badge: right-aligned, colored by score range
      - >=75: bg-emerald-500/10 text-emerald-400
      - >=50: bg-amber-500/10 text-amber-400
      - <50: bg-red-500/10 text-red-400
    - Date: text-[10px] text-zinc-600
```

- Click navigates to `/resume/preview` or opens version detail
- Header: "Recent Versions" + count badge + "View All" link to `/resume/export`

### F. Chat Imports / Takeaways (Collapsible)
- Use shadcn Accordion (if available) or custom collapsible
- Each section:
  - Header: flex row with title + count badge + Chevron icon
  - Content: small cards for recent items
  - ChatCompilationCard: keep existing but restyle to compact form
  - TakeawayCard: keep existing but restyle

### G. Empty State (when no versions AND no progress)
- Centered, large icon (FileText, w-16 h-16, in page-accent container)
- Title: "No resume yet"
- Description: "Start building your resume to create your first version. You can import from chats, scan documents, or answer AI-guided questions."
- CTA: "Start Building" button (primary, large) → `/resume/build`
- Secondary: "Import from Chat" link

### H. Loading State
- Skeleton version of CareerTapestry: 7 dim circles on a line
- Skeleton IdentityCard: circle + 3 lines
- Skeleton JourneyPath: 4 cards with pulsing bg
- Skeleton VersionsGallery: 3 cards with pulsing preview areas

---

## 4. BUILDER PAGE: ResumeBuilderPage.tsx (LAYOUT REWRITE)

### Layout Structure

```
<div className="h-full flex flex-col" style={{'--page-accent': 'rgb(99, 102, 241)'}}>
  ├─ StickyHeader (h-14, border-b, backdrop blur)
  ├─ MiniTapestry (compact CareerTapestry, ~60px, sticky)
  ├─ [SkipWarningToast]
  ├─ MainContent (flex-1 flex gap-0)
  │   ├─ BuilderPanel (flex-1, overflow-y-auto, pr-5)
  │   │   ├─ PhaseHeader
  │   │   ├─ QuestionCard (editorial style)
  │   │   ├─ QuestionGuide
  │   │   ├─ AnswerInputContainer
  │   │   ├─ AiFeedbackBox
  │   │   ├─ SubmitButton
  │   │   └─ PhaseChecklistAccordion
  │   └─ PreviewPanel (resizable, defaultWidth=420)
  │       ├─ PreviewHeader (mode toggle + zoom)
  │       └─ ResumePreview
  └─ AiSettingsModal
</div>
```

### A. StickyHeader
- Height: h-14 (56px)
- `shrink-0 border-b border-zinc-800 px-5`
- `bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-10`
- Content: flex row, items-center, justify-between
- Left:
  - Back button: `ArrowLeft` + "Hub" text
  - Phase indicator: icon + phase name, e.g., `Briefcase` icon + "Experience Archaeology"
  - Small: "Phase 2 of 7" text-[10px] text-zinc-500
- Right:
  - Score: small circular gauge (40px) or just number
  - AI settings: icon button (Settings, ghost variant)
  - Save: icon button (Save, ghost variant)

### B. MiniTapestry
- Compact CareerTapestry (`compact={true}`)
- Height: 60px
- No labels, just dots + connecting line
- Current phase: larger dot (32px vs 28px), pulsing
- Click to jump phases (same as full tapestry)
- `shrink-0 border-b border-zinc-800/40 px-5 py-2`

### C. PhaseHeader (inline in builder panel)
- Not a separate card. Part of the flow.
```
<div className="flex items-center gap-3 mb-1">
  <div className="w-10 h-10 rounded-xl bg-[var(--page-accent)]/15 flex items-center justify-center">
    <PhaseIcon className="w-5 h-5 text-[var(--page-accent)]" />
  </div>
  <div>
    <h2 className="text-[15px] font-semibold text-white">
      Phase {currentPhase}: {PHASE_NAMES[currentPhase]}
    </h2>
    <p className="text-xs text-zinc-500">
      {answeredInPhase} of {totalInPhase} questions answered
    </p>
  </div>
</div>
<ProgressBar value={phasePercent} className="mb-4" />
```

### D. QuestionCard (REDESIGN)
- File: `src/features/resume/components/QuestionCard.tsx`
- Replace the generic glass card with an EDITORIAL style card
```
<motion.div
  key={question.id}
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
  className="relative border-l-4 border-[var(--page-accent)] bg-zinc-900/60 backdrop-blur-xl rounded-r-xl rounded-bl-xl p-5"
>
```
- Top bar: flex row, justify-between
  - Left: `MessageSquare` icon (lucide) in page-accent container + phase name tag
  - Right: input type badge (small, secondary)
- Question text: `text-[15px] font-medium text-white leading-relaxed` (slightly larger)
- "Why it matters" section:
  - Collapsible, default expanded
  - Icon: `Lightbulb`, amber color
  - Text: text-xs text-zinc-400
  - Border: subtle top border, pt-3 mt-3
- Example answer:
  - Collapsible accordion, default collapsed
  - Label: "See example" text-[11px] text-[var(--page-accent)]
  - Content: text-xs text-zinc-400 italic, bg-[var(--page-accent)]/5 rounded-lg p-3

### E. AnswerInputContainer
- Wrap the existing `AnswerInput` in a styled container:
```
<div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5">
  <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 block">
    Your Answer
  </label>
  <AnswerInput ... />
</div>
```

### F. AiFeedbackBox (REDESIGN)
- File: `src/features/resume/components/AiFeedbackBox.tsx`
- Keep AnimatePresence slide-in animation
- But redesign the content layout:
```
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -10 }}
  transition={{ duration: 0.25 }}
  className="border-l-4 ${config.border} ${config.bg} rounded-r-xl p-4"
>
  <div className="flex items-start gap-3">
    <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
      <Icon className={`w-4 h-4 ${config.color}`} />
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-white">AI Coach</span>
        <Badge variant={config.badge}>{config.label}</Badge>
      </div>
      <p className="text-sm text-zinc-300 leading-relaxed">{feedback.comment}</p>
      {suggestion && (
        <p className="text-xs text-zinc-400 mt-2 italic">
          "{feedback.suggestion}"
        </p>
      )}
      {bulletDraft && (
        <div className="mt-3 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
          <p className="text-[10px] text-zinc-500 mb-1">Suggested bullet</p>
          <p className="text-xs text-white font-mono">{feedback.bulletDraft}</p>
          <button className="mt-1.5 text-[10px] text-[var(--page-accent)] hover:underline">
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
    <button onClick={onDismiss} className="text-zinc-500 hover:text-white">
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
</motion.div>
```

- Auto-dismiss timer: 8s (increased from 5s)
- Show a thin progress bar at bottom indicating time until dismiss
- Add "Keep open" button to cancel auto-dismiss

### G. SubmitButton
- Full width within container
```
<motion.button
  whileHover={{ scale: 1.01 }}
  whileTap={{ scale: 0.98 }}
  onClick={handleSubmit}
  disabled={!answer || isSaving}
  className="w-full h-12 rounded-xl bg-[var(--page-accent)] text-white font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--page-accent)]/90 transition-colors"
>
  {isSaving ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Analyzing...</span>
    </>
  ) : (
    <>
      <span>Submit Answer</span>
      <ChevronRight className="w-4 h-4" />
    </>
  )}
</motion.button>
```

### H. PhaseChecklistAccordion
- Replace the inline checklist with a collapsible accordion
- Default: collapsed (show only header)
- Header: "Journey Checklist" + progress fraction (e.g., "4/7 phases")
- Expanded: show all 7 phases
  - Each phase: icon + name + status
  - Status: complete (green check), in_progress (indigo dot + "In Progress"), locked (gray)
  - Click complete phase: jumps to that phase
  - Click locked phase: shows tooltip "Complete prior phases first"

### I. PreviewPanel
- Keep ResizablePanel
- Add header bar above preview:
```
<div className="flex items-center justify-between mb-2">
  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Live Preview</span>
  <div className="flex items-center gap-1.5">
    <button className="text-[10px] text-zinc-400 hover:text-white px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors">
      Styled
    </button>
    <button className="text-[10px] text-zinc-400 hover:text-white px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors">
      ATS Raw
    </button>
    <div className="w-px h-3 bg-zinc-700 mx-1" />
    <button className="text-[10px] text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800">
      <ZoomOut className="w-3 h-3" />
    </button>
    <span className="text-[10px] text-zinc-500">{scale}%</span>
    <button className="text-[10px] text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800">
      <ZoomIn className="w-3 h-3" />
    </button>
  </div>
</div>
```
- Preview container: `rounded-xl overflow-hidden border border-zinc-800/60 shadow-lg shadow-black/20`
- When content updates: brief crossfade overlay (opacity flash 0.5→1, 200ms)

---

## 5. SUB-COMPONENT UPDATES

### PhaseNavigator.tsx
- REDESIGN: Replace pill row with a more visual stepper
- OR: Remove entirely and use CareerTapestry instead
- **Decision:** Replace PhaseNavigator in builder with MiniTapestry. Delete or repurpose PhaseNavigator.
- If keeping: restyle to match tapestry aesthetic (dots instead of pills)

### ProgressBar.tsx
- Restyle to use page-accent color
- Make it slightly thicker: `h-2` instead of `h-1.5`
- Add subtle glow on the progress fill
- Remove the duplicate phase mini-pills at bottom (redundant with MiniTapestry)

### ResumePreview.tsx
- Keep existing logic, but add:
  - Smooth transition when content changes (CSS transition on container)
  - Better empty state: "Start answering questions to see your resume come to life"
  - Add a subtle border-glow when content is updated (1s flash of page-accent border)

### QuestionGuide.tsx
- Restyle to be more compact
- Use `Info` icon instead of generic bullet list
- Collapsible, default expanded

---

## 6. NEW COMPONENTS TO CREATE

### A. CareerTapestry.tsx
- File: `src/features/resume/components/CareerTapestry.tsx`
- Implements the signature element spec in Section 2
- MUST be usable both full-size and compact
- Use framer-motion for node enter/exit animations
- Use inline SVG for the path and nodes (no external libraries needed)

### B. JourneyPath.tsx
- File: `src/features/resume/components/JourneyPath.tsx`
- 4 horizontal step cards with connecting arrows
- Accepts completion status for each step
- Renders different states: locked, available, completed

### C. IdentityCard.tsx (optional — can be inline in ResumePage)
- If creating as separate component: `src/features/resume/components/IdentityCard.tsx`
- Otherwise, inline it in ResumePage

---

## 7. STATE COVERAGE (Every data-driven component)

| Component | Empty | Loading | Error | Populated |
|-----------|-------|---------|-------|-----------|
| CareerTapestry | "Start building" CTA | 7 pulsing skeleton dots | "Failed to load progress" + Retry | Glowing path |
| IdentityCard | "Set up your profile" CTA | Skeleton circle + lines | "Profile unavailable" | Name + role |
| JourneyPath | All steps available/locked | Skeleton cards | "Navigation failed" | Status indicators |
| VersionsGallery | "No versions" + CTA | 3 skeleton cards | "Couldn't load" + Retry | Card grid |
| QuestionCard | "No question loaded" | Skeleton text lines | "Failed to load" + Retry | Full question |
| AiFeedbackBox | Hidden | "Analyzing..." with shimmer | "Analysis failed" | Quality badge + comment |
| ResumePreview | "Start building to preview" | Skeleton page | "Preview unavailable" | Live content |
| PhaseChecklist | Hidden (no progress) | Skeleton list | "Failed to load" | Phase list |

---

## 8. COPY TEXT (Use exactly)

### Hub Page
- Hero empty: "Start building your resume"
- Identity title: "Your Resume"
- Journey step labels: "Import", "Build", "Preview", "Export"
- Journey step descs: "Extract from chats & docs", "Answer questions with AI help", "See your live resume", "PDF, Markdown, JSON"
- Stats labels: "Versions", "Chat Imports", "Confirmed", "Score"
- Versions header: "Recent Versions"
- Versions empty title: "No versions yet"
- Versions empty desc: "Start building your resume to create your first version. You can save, compare, and export multiple versions."
- Versions CTA: "Create Your First Resume"

### Builder Page
- Back button: "Hub"
- Phase header pattern: "Phase {n}: {PHASE_NAMES[n]}"
- Question subheader: "{answered} of {total} questions answered in this phase"
- Answer label: "Your Answer"
- Submit button default: "Submit Answer"
- Submit button loading: "Analyzing..."
- AI feedback header: "AI Coach"
- Suggested bullet label: "Suggested bullet"
- Checklist header: "Journey Checklist"
- Checklist locked tooltip: "Complete prior phases first"
- Preview header: "Live Preview"
- Preview empty: "Start answering questions to see your resume come to life"
- Skip warning: "You're skipping {n} incomplete phase(s). The preview may show partial data."

---

## 9. DEPENDENCIES & IMPORTS

### Already available (use these)
```
framer-motion (motion, AnimatePresence)
lucide-react (all icons)
@/components/ui/* (Button, Badge, Skeleton, Progress, Input, etc.)
@/components/ui/blur-fade (BlurFade)
@/components/ui/animated-gradient-text (AnimatedGradientText)
@/components/ui/border-beam (BorderBeam)
@/components/ui/dot-pattern (DotPattern)
@/components/ui/number-ticker (NumberTicker)
```

### May need to add (check first)
- shadcn Accordion: `npx shadcn@latest add accordion`
- If `accordion` not available, build custom collapsible with `details/summary` or framer-motion AnimatePresence

### NO new animation libraries needed
- All motion done with framer-motion (already in project)
- Ambient beam: pure CSS/SVG animations

---

## 10. FILE CHANGE CHECKLIST

### Create New Files:
- [ ] `src/features/resume/components/CareerTapestry.tsx` (signature element)
- [ ] `src/features/resume/components/JourneyPath.tsx` (hub journey steps)
- [ ] `src/features/resume/components/IdentityCard.tsx` (optional, can inline)

### Rewrite Completely:
- [ ] `src/pages/ResumePage.tsx` (hub page)
- [ ] `src/pages/ResumeBuilderPage.tsx` (builder page layout)

### Modify/Update:
- [ ] `src/features/resume/components/QuestionCard.tsx` (editorial style)
- [ ] `src/features/resume/components/AiFeedbackBox.tsx` (slide-in style)
- [ ] `src/features/resume/components/ProgressBar.tsx` (thicker, glow)
- [ ] `src/features/resume/components/PhaseNavigator.tsx` (remove or repurpose)
- [ ] `src/features/resume/components/ResumePreview.tsx` (smooth transitions)
- [ ] `src/index.css` (add tapestry CSS animations)

### Do NOT Touch:
- `src/stores/resumeStore.ts` (store API must remain unchanged)
- `src/types/resume.ts` (types are fine, only add new interfaces if needed)
- `src/features/resume/components/AnswerInput.tsx` (already redesigned)
- `src/features/resume/components/VoiceInput.tsx` (already redesigned)
- `src/features/resume/components/ResizablePanel.tsx` (keep as-is)
- IPC handlers in main.ts

---

## 11. ANTI-SLOP VERIFICATION

Before declaring done, verify:
- [ ] No `rounded-2xl` or `rounded-3xl` used anywhere (max `rounded-xl`)
- [ ] No card padding > p-5
- [ ] No third font introduced (Geist + JetBrains Mono only)
- [ ] No purple/indigo gradients on everything (intentional gradients only on tapestry)
- [ ] No tiny uppercase eyebrow + oversized headline cliché
- [ ] All interactive elements have hover/focus/active/disabled states
- [ ] All data-driven components have Empty + Loading + Error states
- [ ] Icons all from lucide-react (no emoji)
- [ ] `prefers-reduced-motion` respected (tapestry static, no pulse)
- [ ] Touch targets >= 44px
- [ ] Focus rings visible: `ring-2 ring-[var(--page-accent)]/50`
- [ ] No animated width/height/top/left (transform + opacity only)

---

## 12. BUILD & TEST INSTRUCTIONS

After implementing:
1. Run `npx vite build` — must exit 0
2. Run `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`
3. Run `node scripts/rebuild-main.mjs`
4. Launch app: `npx electron .`
5. Navigate to Resume page via sidebar
6. Verify:
   - CareerTapestry renders with 7 nodes
   - Hub page shows JourneyPath, IdentityCard, Stats, Versions
   - Builder page shows MiniTapestry, editorial QuestionCard
   - AI feedback slides in after submit
   - Preview panel shows live resume
   - No black screen, no console errors

---

## 13. RATIONALE SUMMARY

**Why Career Tapestry?** A resume is a journey through 7 phases. A timeline is the most honest visual metaphor for this process. It gives users instant orientation: "I am here, these are done, these remain."

**Why JourneyPath instead of 4 cards?** Cards are disconnected. A path shows the natural workflow: you import, then build, then preview, then export. Users understand the relationship between features.

**Why editorial QuestionCard?** The builder asks personal questions. It should feel like a conversation with a coach, not a form. The left-border accent and conversational copy create this feeling.

**Why L2 motion?** The app needs to feel alive and modern, but the primary task (data entry) requires focus. L2 gives micro-interactions and smooth transitions without distraction.

**Why indigo + amber?** Indigo is the existing page accent. Amber represents warmth, completion, and success — the emotional payoff of finishing a phase. Together they create a narrative arc: cool beginning (indigo) → warm completion (amber).

---

*End of specification. Implementer: read this once fully, then implement top to bottom. Ask questions only if a spec item is genuinely ambiguous or contradictory.*
