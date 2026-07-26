# Design Prompt: Lyceum Learn Module — CreateLessonDialog & Welcome Screen

---

## Raw Request

> "there should be another mode that allows us to just input one long strand of text instead of having those numbers, and the prompt designed should ask the ai those stuff based on the user input. so the user input i just needs to be like 1 text input... there needs to be a button that switches between them... the UI still really bad. Currently, it still looks like a vibe-coded shit... use their front end skills like the impeccable skill, the UI-UX skill... use the MCP or SOC before creating the prompt because the AI doesn't have the access to the MCP so I would like you to use the MCP to make the initial design choices... make sure that it has the best UI possible even in the initial screen where it is the welcome to listen, the welcoming page should be the best because it should like show that is a good page."

---

## Problem Statement

The Lyceum Learn module's lesson creation dialog and welcome screen look generic and "AI-generated." The CreateLessonDialog has two modes (Simple = one textarea, Detailed = multiple fields with node count) but the UI doesn't communicate sophistication. The welcome screen is a flat, centered card with no personality. Both surfaces need to feel polished enough to demonstrate that DeskFlow is a premium product.

---

## Design Mandate

Act as **Lead Designer and Engineer**. Design a complete, high-fidelity solution for both surfaces. Do not provide options — deliver one well-reasoned design with exact visual specifications.

---

## Skills to Activate (in order)

Before writing ANY code, the receiving AI must read and apply guidance from:

1. **`agent/skills/humancentred-UIUX/SKILL.md`** — Human-Centric UX (6 pillars, anti-patterns, checklist)
   - Primary action must be obvious in <1 second
   - Complete state coverage: empty/loading/error for every data-driven element
   - Progressive disclosure: hide complexity until needed
   - Micro-interactions on every interactive element

2. **`agent/skills/impeccable/SKILL.md`** — Impeccable Design (7 dimensions)
   - Typography: Geist + JetBrains Mono, modular scale, `max-w-[65ch]` measure
   - Color: HSL for dark theme, opacity layers for depth, max 3 accent colors per view
   - Spatial: 8px grid, density zones (low density for hero/empty states)
   - Motion: duration scale (150ms/250ms/400ms), easing curves, `transform`+`opacity` only
   - Interaction: hover/active/focus/disabled states for every element

3. **`agent/skills/frontend-design/SKILL.md`** — DeskFlow Frontend Design (tokens, patterns)
   - Page accent: Learn module uses `indigo-500`
   - Border radius max: `rounded-xl` (12px)
   - Card padding: `p-5` (20px)
   - Animation: `150ms ease-out` for micro, `250ms ease-out` for modals
   - Modal pattern: overlay `bg-black/70 backdrop-blur-md`, card `bg-zinc-900/95 backdrop-blur-xl`

4. **`agent/skills/frontend-external-infra/SKILL.md`** — Frontend External Infra (MCP tools)
   - **MUST consult MCP tools** before selecting components (see Source Routing table)
   - For animated effects: use **magicui** MCP
   - For icons: use **lucide** MCP (never emoji)
   - Source routing: standard UI → shadcn MCP, animated → magicui MCP, specific variants → @21st-dev/magic

---

## MCP Consultation (REQUIRED before coding)

The receiving AI does NOT have live MCP access. It must simulate consulting these tools by:

1. **For the mode toggle (Simple | Detailed)**: Search **lucide** MCP for `SegmentedControl`, `Toggle`, `Pills` — or use a styled div with two buttons using the pattern from `frontend-design/SKILL.md` Section "TabBar (Pills Pattern)": `bg-zinc-900/50 p-1 rounded-xl inline-flex` with `bg-zinc-800 text-white shadow-sm` for active, `text-zinc-400 hover:text-zinc-200` for inactive.

2. **For the Simple mode textarea**: Consider a **magicui** animated border or glow effect on focus. Search for `animated-beam`, `border-beam`, or `noise-texture` in magicui registry for inspiration on how to make the textarea feel premium.

3. **For decorative/welcome screen elements**: Consider **magicui** animated grid patterns, gradient meshes, or floating orbs to give the welcome screen depth without being cluttered. Look for `gradient-text`, `spotlight`, `shimmer`, or `fade-text` variants.

4. **For icons**: Always use **lucide** MCP. Confirm the exact icon name and import path. For the welcome screen, find an icon that communicates "intelligent learning" — not just `BookOpen`.

5. **For the prompt preview area (Step 2)**: Consider a **magicui** component for the code block or a `border-beam` effect on the card. Or use a `spotlight` effect behind the card.

---

## Surface 1: CreateLessonDialog

### What it does
- 3-step flow: Describe → Prompt preview → Result
- 2 input modes: **Simple** (one textarea + optional reference) and **Detailed** (topic + reference + node count)
- Mode toggle is a segmented control between the header and content area

### Design Requirements

**Step 1 — Input (both modes):**

- **Mode toggle**: Styled segmented control with two options: "Simple" (AlignLeft icon) and "Detailed" (List icon). Active state: `bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg`. Inactive: `text-zinc-500 hover:text-zinc-300`. Use lucide icons `AlignLeft` and `List`.
- **Simple mode textarea**: Minimum 200px tall, auto-expanding. On focus: subtle indigo glow (`focus:ring-2 focus:ring-indigo-500/20`). Placeholder text in zinc-500 showing a good example (CS student, OSTEP, visual preference). Character counter in bottom-right corner. No external dependencies for the glow — pure Tailwind border/shadow.
- **Detailed mode**: Same topic textarea (80px min), reference material (60px min), node count selector with pill buttons. Default selected: 5. Active pill: `bg-indigo-500/20 text-indigo-300 border-indigo-500/30`. Inactive: `bg-zinc-800/40 text-zinc-400 border-zinc-700/40`.
- **Reference material**: Two-column layout on wider screens (textarea + file upload button side-by-side). File upload: `Paperclip` icon button. When file attached: show filename chip with `X` to remove.
- **Validation**: If < 10 chars (simple) or < 3 chars (detailed), show inline amber warning below textarea.
- **Primary CTA**: "Generate Prompt" button — `px-5 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-medium`. When building: show spinner + "Building...". Disabled when validation fails: `opacity-40 cursor-not-allowed`.

**Step 2 — Prompt Preview:**

- **Info callout**: Top of content area. Icon (Sparkles from lucide) + short explanatory text. `bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-3`.
- **Prompt block**: `<pre>` with `bg-zinc-950/60 border border-zinc-700/50 rounded-xl p-4 text-zinc-300 text-xs font-mono max-h-[280px] overflow-y-auto`. White-space: `pre-wrap`.
- **Copy button**: Top-right of prompt block. Toggle between "Copy" (Copy icon) and "Copied!" (Check icon + emerald color) for 2 seconds after click.
- **Save button**: Next to Copy. FileText icon + "Save". Downloads prompt as `.md` file.
- **Generate Here card**: Below prompt block. `rounded-xl border border-zinc-700/40 bg-zinc-800/20 p-4`. Left: Wand2 icon in indigo glow circle + "Generate Here" heading + subtitle "Uses DeskFlow's built-in AI". Right: "Generate" button. On generating: spinner + "Generating...". On done: emerald check + "Done". On error: red callout below card.
- **Done button** (footer): When generation is done: label changes to "View Library" with ChevronRight.

**Step 3 — Result:**
- Success: emerald card with CheckCircle2 icon + "Lesson generated and imported successfully!" + lesson ID
- Error: red callout with AlertCircle icon + error message

**States:**
- `building = true`: primary CTA shows spinner, disabled
- `genStatus === 'generating'`: Generate button disabled, shows spinner
- `genStatus === 'done'`: Generate button replaced with emerald "Done" state
- `genStatus === 'error'`: red callout appears below the Generate Here card
- Empty `contextDoc`: file upload area shows placeholder text

**Dialog chrome:**
- Overlay: `fixed inset-0 z-50 bg-black/70 backdrop-blur-md`
- Card: `w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl border border-zinc-700/60 bg-zinc-900/95 backdrop-blur-xl shadow-2xl`
- Header: `px-6 py-4 border-b border-zinc-800`, icon + title, close button
- Step indicators: 3 steps as pills, active = `bg-indigo-500/20 text-indigo-300 border-indigo-500/30`, inactive = `text-zinc-600`
- Footer: `px-6 py-4 border-t border-zinc-800`, Back/Cancel + primary action
- Motion: `initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ type: 'spring', duration: 0.3, bounce: 0.08 }}`

---

## Surface 2: LearnPage Welcome Screen

### What it does
Shown when `lessons.length === 0 && view === 'library'`. First impression of the Learn module.

### Design Requirements

**Personality**: This page should communicate "intelligent, structured learning" — not a generic empty state. Think: a premium textbook's opening page, or a well-designed course platform.

**Layout**: Centered column layout. NOT a flat card floating in nothing. Use visual depth.

**Elements (top to bottom):**

1. **Ambient background element**: A subtle animated gradient orb or spotlight in indigo/violet behind the content — using a CSS radial gradient with `blur` and low opacity. NOT a hard gradient. Just enough to give the page depth. Can be achieved with a `div` behind the content, `absolute inset-0 -z-10`, `bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)]`.

2. **Icon container**: `BookOpen` icon from lucide. But instead of `rounded-2xl` (which violates the 12px radius limit), use `rounded-xl` with a subtle indigo glow border: `border border-indigo-500/25`. Container: `w-16 h-16` (larger than current 56px). Icon: `w-8 h-8 text-indigo-400`. Background: `bg-gradient-to-br from-indigo-500/15 to-violet-500/15`.

3. **Heading**: "Welcome to Lyceum" — `text-2xl font-semibold text-zinc-100` (NOT `text-xl`). More presence. Centered.

4. **Subheading**: One-line description — `text-sm text-zinc-500 text-center max-w-sm`. This should be the ONLY text besides the CTA. Keep it tight.

5. **Primary CTA ("Create New Lesson")**: This MUST be the most visually prominent element. Style it with a stronger indigo treatment:
   - Background: `bg-indigo-500` (full color, not just 20% tint)
   - Text: `text-white font-semibold`
   - Border: `border border-indigo-400/30`
   - Shadow: `shadow-[0_0_20px_rgba(99,102,241,0.3)]` (subtle glow)
   - Hover: `bg-indigo-400` + brighter shadow
   - Size: `px-6 py-3.5` (slightly taller)
   - Icon: `Wand2` in white
   - Full width on mobile, max-w-sm on desktop

6. **Secondary actions** (below primary CTA, 12px gap):
   - Three equal-weight buttons in a horizontal row: "Try the example" (Download icon), "Import file" (FileUp icon), "Paste" (FileCode2 icon)
   - Style: `bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 rounded-xl px-4 py-2.5 text-sm font-medium`
   - These should visually recede from the primary CTA — no equal weight
   - On mobile: stack vertically if needed

7. **"How it works" link**: Below the secondary actions, 16px gap. `text-zinc-600 hover:text-zinc-400 text-xs`. Icon: `HelpCircle`.

8. **Progress hint** (optional, if it fits): A tiny line like "Lessons are saved locally and persist across sessions" in `text-zinc-700 text-xs` at the very bottom. This addresses the "where does this go?" question without clutter.

**Visual polish checklist:**
- No `rounded-2xl` anywhere — only `rounded-xl` or `rounded-lg`
- Primary CTA has a `box-shadow` glow in indigo — this is the ONE intentional glow effect (it marks the primary action)
- The ambient background uses `pointer-events-none` so it doesn't interfere with clicks
- All buttons have `transition-all duration-150` for snappy hover responses
- Text hierarchy is clear: heading (semibold) > subheading (regular zinc-500) > secondary text (regular zinc-400) > hint text (zinc-700)
- Font: Geist for all text, JetBrains Mono for any code-like elements

---

## Engineering Task

For each surface, provide:

1. **Visual specification**: exact Tailwind classes, color tokens, spacing values, animation properties
2. **Component structure**: what state variables are needed, what IPC calls fire on submit
3. **Interaction flows**: what happens on each click, hover, focus — including all state transitions
4. **State coverage**: loading, error, empty for every async operation
5. **Code**: complete React + Tailwind implementation for each file

---

## Constraints

- **Must not break existing IPC wiring**: `learnBuildPrompt` and `learnGenerateLdoc` handlers are already deployed. The dialog's `handleBuildPrompt` and `handleGenerate` functions must call these with the correct params.
- **File path**: Write to `src/components/learn/CreateLessonDialog.tsx` and `src/components/learn/LearnPage.tsx` (replace only the empty state section, lines ~274-328)
- **Framework**: React + Tailwind CSS v4 + Framer Motion (already imported in both files)
- **Icons**: lucide-react only (already imported in both files)
- **Design tokens**: Use DeskFlow tokens from `src/index.css` — do not introduce new hex codes
- **Accessibility**: All interactive elements must have `focus-visible` rings, keyboard navigation, and ARIA labels
- **No breaking changes**: The `CreateLessonDialog` props (`open`, `onClose`, `onImported`) must remain unchanged

---

## Output Format

Deliver the solution as:
1. A brief **design rationale** explaining the key decisions (2-4 sentences per surface)
2. **Complete code** for `CreateLessonDialog.tsx` (full file, ready to write)
3. **Diff/patch** for the relevant section of `LearnPage.tsx` (the empty state, lines ~274-328)

Do NOT provide options. Deliver one complete, well-reasoned design.
