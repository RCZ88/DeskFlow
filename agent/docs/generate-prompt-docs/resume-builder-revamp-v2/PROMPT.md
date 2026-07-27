# PROMPT.md — Resume Builder Page Revamp

## Raw Request

> "So what I would like you to do is to focus on the fucking resume page, right? The resume page, the reason being is that the foundation defauses to creating the Regime is not yet revamped and I need you to make sure that it's revamped properly and it is shown properly. And for the resume preview for some weird reason the adjustments of like the split between the questions and the live preview is The the bar that's versus split it is on the right off to the two things, but it should be in the middle between the two, right? Second thing is is that they Zooming in thing features are kind of weird. How does the AI You know And why is it that the air provider setting is not connected to the settings you need to be connected to the settings It needs to be connected to the settings to providing the providing system thing provider thing is all needs to be every single AI Connected feature is needs to be really connected to the settings because the settings we've already set up the models instead of the users already added, right? You know already have the UI for everything like that So it should just be reusing those and utilizing that the the thing is already selected and all you got to do is to Use the ones on the thing and properly Connected the ones to this settings page and you need to look at the settings page and the AI system sub page of the The settings page right maybe utilizing those and make sure to revamp the This is an important point. You make sure to really revamp the phases right currently your answer thing is not working It's not the text input is very why is it only one line and why is it like why is the font so big and why is the text input only one line Why does it not expand downwards and why is the end to button submitting the answer and why is the AI coach is able to start and why am I unable to go to the previous version previous question and then I haven't even connected to the API AI provider is already providing a thing and like there's this like journey checklist and then it's locked and stuff like that I am unable to View the previous questions are we can only switch between the phases but not the previous questions and stuff like that So I need to make sure that the page is revamped properly I would like you to use the generic prompt skills to do this to design everything to use them all the front-end skills like the human Centric AI human centric UI UX and every single front-end skills known to humankind that is available on the agents slash skills you can see what are you or what are the front-end skills and mcp some The agents that md file and you need to be knowing and planning everything properly"

---

## Problem Statement

The Resume Builder page (`/resume/build`) has multiple critical UX and integration issues that make it feel unfinished and broken:

1. **Split panel drag handle is mispositioned** — The `ResizablePanel` component renders its drag handle INSIDE the preview panel, but it should be a visible divider BETWEEN the builder and preview panels.
2. **AI provider is disconnected from settings** — The resume feature has its own isolated `AiSettings.tsx` with 3 hardcoded providers stored in `localStorage`. It should use the main app's multi-provider routing system (6+ providers, API keys, model management, fallback chains) via `AiProviderSelectModal`.
3. **Text input is single-line with oversized font** — The default text input renders a single-line `<Input>` with `h-14 text-base`. Most questions need multi-line auto-expanding textarea with consistent `text-sm` sizing.
4. **No question history or back navigation** — Users can only see the current question. There's no way to review previous questions, see answers, or go back.
5. **Enter key breaks textarea** — `handleKeyDown` intercepts Enter for ALL input types, preventing newlines in textarea mode.
6. **AI coach is hardcoded** — The `submitAnswer` handler returns canned feedback based on answer string length, not real AI evaluation.
7. **Journey checklist is confusing** — Phase locking prevents revisiting completed phases.

---

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` in this directory for the complete source code of every affected file. The context bundle contains:
- All type definitions (`resume.ts`)
- Full source of `ResumeBuilderPage.tsx` (353 lines)
- Full source of `AnswerInput.tsx` (150 lines)
- Full source of `ResizablePanel.tsx` (100 lines)
- Full source of `AiSettings.tsx` (238 lines) — the disconnected standalone provider
- The main AI provider system (`AiProviderSelectModal.tsx`, `router.ts`)
- Backend `submitAnswer` handler (hardcoded feedback)
- Available UI components and design tokens

---

## MANDATORY: Frontend Design Skills Reference

The target AI MUST apply ALL of these design skills:

1. **Frontend Design** — DeskFlow-specific component patterns, tokens (glass cards, `rounded-xl`, `p-5`), spacing scale, typography scale, per-page accent colors, animation tokens (150ms/250ms/400ms), 4 page layout patterns
2. **Human-Centric UX** — 6 pillars (Clarity, Progressive Disclosure, Visual Hierarchy, Complete State Coverage, Feedback, Forgiveness). EVERY data-driven component must have Empty/Loading/Error/Populated states. No raw system tokens visible. Primary action obvious in <1s.
3. **Impeccable** — 7 design dimensions (typography, color, spatial, motion, interaction, responsive, UX writing), 27 anti-patterns. Modular type scale 1.25x, 8px grid, 5-tier motion duration, 44px touch targets.
4. **Motion — Bring the UI Alive** — Liveliness Level: **L2 (Responsive)** for this productivity tool. Micro-interactions on hover/press, AnimatePresence for question transitions, stagger for history items. 150-250ms, ease-out `cubic-bezier(0.16, 1, 0.3, 1)`. No ambient/particles/scroll choreography.
5. **UI UX Pro Max** — Developer Tools + AI/ML interface rules. Dark glass palette, Terminal Chic style reference, anti-patterns for AI interfaces.
6. **Design Taste System** — DESIGN_VARIANCE: 5, MOTION_INTENSITY: 5, VISUAL_DENSITY: 7. Anti-repetition rules: font rotation, color shift, shape variation.
7. **frontend-external-infra** — Source routing table (shadcn for standard UI, Magic UI for animations, Lucide for icons). Re-skin rules (DeskFlow tokens, dark mode only, Geist+JetBrains Mono). Anti-slop checklist (10 points).

---

## MCP Component Inventory

### shadcn-ui-mcp (61 components available)
| Component | Use for |
|-----------|---------|
| textarea | Auto-expanding answer input |
| slider | Preview zoom control |
| resizable | Split panel between builder and preview |
| tabs | Question history tabs (Current / History) |
| scroll-area | Question history scrolling |
| badge | Phase status, question number badges |
| tooltip | Zoom controls, action hints |
| separator | Visual dividers |
| skeleton | Loading states |
| card | Question cards, history items |
| progress | Phase progress bar |
| dialog | AI settings modal |
| sheet | Mobile question history panel |

### Magic UI MCP (77 components)
| Component | Use for |
|-----------|---------|
| blur-fade | Question enter/exit animation |
| animated-list | Question history stagger animation |
| number-ticker | Score counter animation |
| animated-gradient-text | Phase title accent |
| border-beam | Active question highlight |
| confetti | Phase completion celebration |
| glare-hover | Interactive card hover effect |

### Lucide Icons (relevant)
| Icon | Use for |
|------|---------|
| ArrowLeft, ArrowRight | Back/Next navigation |
| ChevronLeft, ChevronRight | Question navigation |
| History | Question history toggle |
| Sparkles | AI coach indicator |
| CheckCircle, Lock, Clock | Phase status |
| Settings | AI provider settings |
| ZoomIn, ZoomOut, Maximize | Preview zoom controls |
| GripVertical | Split panel drag handle |
| Send | Submit answer |
| Mic, MicOff | Voice input |

### React Bits MCP
| Component | Use for |
|-----------|---------|
| AnimatedContent | Question transition |
| GlareHover | Card hover effect |
| Magnet | Button interaction |

---

## Engineering Task

### Task A: Restructure Split Panel Layout

**Current:** `ResizablePanel` wraps only the preview panel. The drag handle is rendered INSIDE it on the left edge. The builder panel uses `flex-[3]` (hardcoded ratio).

**Target:** A true split panel where:
- The drag handle is a visible 6px vertical bar BETWEEN the two panels
- Dragging the handle adjusts the split ratio (stored as percentage, default 55/45)
- The handle has a `GripVertical` icon centered vertically
- When dragging, both panels resize smoothly (use `transform` + `opacity` only for the handle feedback, NOT `width` on panels during drag — use `flex-basis` percentage)
- Store split position in `localStorage` under key `resume-split-ratio`

**Implementation approach:** Either refactor `ResizablePanel` to accept `left` and `right` children, OR restructure `ResumeBuilderPage.tsx` to use a flat flex container with the drag handle between the two `flex-basis` panels.

### Task B: Connect AI Settings to Main Provider System

**Current:** `AiSettings.tsx` is standalone with 3 hardcoded providers in `localStorage`.

**Target:**
1. Delete `AiSettings.tsx` entirely
2. Replace with `AiProviderSelectModal` from `src/components/AiProviderSelectModal.tsx`
3. Add `'resumeBuilder'` to the `featureKey` union type in `AiProviderSelectModal` (currently `'researchDigest' | 'goalAssistant'`)
4. Add `'resumeBuilder'` to the `feature` parameter in `router.ts`'s `buildChain` function
5. The settings gear button in the builder header opens `AiProviderSelectModal` with:
   - `featureKey="resumeBuilder"`
   - `featureLabel="Resume Builder AI"`
   - `accentColor="from-indigo-500/20 to-indigo-600/5"`
6. In the backend `submitAnswer` handler, read the resume builder's routing config and use `buildChain` + `runWithFallback` to call the actual AI provider for feedback
7. If no provider is configured or the AI call fails, fall back to the current length-based heuristic with a note "Configure AI in Settings for real feedback"

### Task C: Revamp Text Input — Auto-Expanding, Proper Sizing

**Current:** Default text input is single-line `<Input>` with `h-14 text-base` (16px). `textarea` inputType uses `rows={16}` fixed height with `min-h-[320px]`.

**Target:**
- For `inputType === 'text'`: Use auto-expanding `<textarea>` starting at 2 rows, growing as user types (max 8 rows before scroll). Font: `text-sm` (14px). Remove `h-14` fixed height.
- For `inputType === 'textarea'`: Same auto-expanding pattern but starting at 4 rows, max 12 rows. Keep `min-h-[120px]`.
- For `inputType === 'metric'`: Keep single-line `<Input>` but reduce to `h-10 text-sm`.
- For `inputType === 'tags'`: Keep existing implementation (works fine).
- All inputs: consistent `text-sm` font size, `leading-relaxed` line height.
- Voice input button positioned at top-right of textarea (not center-right).
- Character count shown at bottom-right when content exists.

### Task D: Add Question History & Back Navigation

**Current:** `builderProgress.answers` stores answers but UI has no way to show them. No back button.

**Target:**
1. Add `questionHistory` array to `BuilderProgress` type:
   ```typescript
   questionHistory: Array<{
     questionId: string;
     question: Question;
     answer: any;
     aiFeedback: AiFeedback | null;
     timestamp: string;
   }>;
   ```
2. When `submitAnswer` is called, push the current question + answer + feedback into `questionHistory` before advancing
3. Add a "History" toggle button in the builder header (next to Settings). When clicked, shows a collapsible panel below the current question with all answered questions in the current phase
4. Each history item shows: truncated question text, answer preview (first 80 chars), quality badge (strong/good/needs_work/weak), timestamp
5. Clicking a history item loads that question back into the main input with the previous answer pre-filled, and shows the AI feedback again
6. Add a "Previous" button next to the Submit button (disabled when on question 1 of the phase). Clicking it loads the previous question.
7. Keyboard shortcut: `Alt+Left` for previous question

### Task E: Fix Enter Key / Submit UX

**Current:** `handleKeyDown` intercepts Enter for ALL input types, preventing newlines in textarea.

**Target:**
- For `inputType === 'text'` and `inputType === 'metric'`: Enter submits (keep current behavior)
- For `inputType === 'textarea'`: Enter creates newlines. Submit via button click OR `Ctrl+Enter` / `Cmd+Enter`
- For `inputType === 'tags'`: Enter adds a tag (keep current behavior in AnswerInput.tsx)
- Show subtle hint below textarea: "Ctrl+Enter to submit" when user is typing

### Task F: Real AI Feedback (Backend)

**Current:** `submitAnswer` handler returns `{ quality: answer.length > 30 ? 'strong' : ... }`.

**Target:**
1. In the `submitAnswer` handler in `main.ts`, after determining the next question:
   - Read the resume builder's routing config from `userPreferences.aiProviders.routing.resumeBuilder`
   - Build the provider chain using `buildChain(state, 'resumeBuilder')`
   - Construct a prompt: "You are a resume coach. The user was asked: [question]. Their answer: [answer]. Rate the quality (strong/good/needs_work/weak), provide a brief comment, a suggestion for improvement, and a draft bullet point if applicable. Return JSON: { quality, comment, suggestion, bulletDraft }"
   - Call `runWithFallback(chain, { messages: [...], maxTokens: 500 })`
   - Parse the response into `AiFeedback` shape
   - If the call fails, fall back to the length-based heuristic with a note

2. Update `testAiConnection` handler to actually call the provider with a simple test prompt instead of always returning success.

### Task G: Polish Journey Checklist & Preview Zoom

**Current:** Journey checklist shows locked phases. Preview zoom uses −/+ buttons with fixed 10% steps.

**Target:**
- **Journey Checklist:** Completed phases show green checkmark + "Done". Current phase shows indigo icon + "Current". Upcoming phases show gray lock + question count (e.g., "0/7"). Clicking a completed phase loads its first question. Clicking the current phase does nothing (already there).
- **Preview Zoom:** Replace −/+ buttons with a compact slider or use `Ctrl+scroll` for zoom. Add a "Fit" button that auto-scales to fill panel width. Show zoom percentage as a badge.
- **Preview Empty State:** When no content exists yet, show: "Start answering questions to see your resume build here" with a small rocket icon, instead of a blank white page.

---

## Design Task

### High-Fidelity Visual Specs

**Split Panel Divider:**
- Width: 6px (`w-1.5`)
- Background: `bg-zinc-700/50` idle, `bg-[var(--page-accent)]` dragging
- Hover: `bg-zinc-500`
- Grip icon: `GripVertical` from lucide, `w-3 h-3`, `text-zinc-500` idle, `text-white` dragging
- Cursor: `cursor-col-resize`
- Transition: 150ms ease-out on color changes

**Auto-Expanding Textarea:**
- Border: `ring-1 ring-zinc-700/50` idle, `ring-2 ring-[var(--page-accent)]/50` focus
- Background: `bg-gradient-to-br from-zinc-900/80 to-zinc-800/40`
- Font: `text-sm text-white placeholder-zinc-500 leading-relaxed`
- Padding: `p-5`
- Border radius: `rounded-xl`
- Min height: 2 rows (~56px) for text, 4 rows (~120px) for textarea
- Max height: 8 rows for text, 12 rows for textarea, then scroll
- Character count: `text-[10px] text-zinc-600 tabular-nums` at bottom-right

**Question History Panel:**
- Container: `rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 border border-zinc-800/60`
- Each history item: `p-3 rounded-lg hover:bg-zinc-800/30 cursor-pointer transition-colors`
- Active/revisited item: `ring-1 ring-[var(--page-accent)]/30 bg-[var(--page-accent)]/5`
- Question text: `text-xs text-zinc-300` truncated to 2 lines
- Answer preview: `text-[11px] text-zinc-500` truncated to 1 line
- Quality badge: colored pill (strong=emerald, good=blue, needs_work=amber, weak=red)
- Timestamp: `text-[10px] text-zinc-600`

**AI Settings Button:**
- Opens `AiProviderSelectModal` (existing component, no visual changes needed)
- The modal already has the correct DeskFlow styling (dark glass, rounded-xl, violet accent)

**Preview Zoom Controls:**
- Slider: `h-1.5 rounded-full bg-zinc-700` track, `accent-[var(--page-accent)]` thumb
- "Fit" button: `text-[10px] px-2 py-0.5 rounded-lg bg-zinc-800/50 text-zinc-400 hover:text-white`
- Percentage badge: `text-[10px] tabular-nums text-zinc-500 w-10 text-center`

---

## UX Task

### Interaction Flow

1. **Page Load:** Show loading skeleton (3 skeleton blocks matching question card + input + button shapes). Load first question via `nextQuestion` IPC. Show question card with blur-fade enter animation.

2. **Answering a Question:**
   - User types in auto-expanding textarea (grows as they type)
   - Character count appears at bottom-right
   - Submit button shows "Submit Answer" with ChevronRight icon
   - On submit: button shows spinner + "Analyzing your answer...", answer is saved to `questionHistory`, next question loads with enter animation, AI feedback appears below input with 8s auto-dismiss

3. **Navigating Back:**
   - "Previous" button (ChevronLeft icon) appears next to Submit, disabled on question 1
   - Clicking it loads the previous question from `questionHistory` with the answer pre-filled
   - AI feedback for that question is restored

4. **Viewing History:**
   - "History" button in header toggles the history panel
   - History panel slides down below the current question (AnimatePresence height animation)
   - Each item shows question, answer preview, quality badge
   - Clicking an item loads it into the main input area (revisit mode)
   - In revisit mode, the Submit button changes to "Update Answer" and saves back to the same history entry

5. **Phase Navigation:**
   - CareerTapestry compact bar at top shows all 7 phases
   - Clicking a completed phase loads its first question
   - Clicking the current phase does nothing
   - Clicking a locked phase shows a tooltip "Complete previous phases first"
   - Skip warning banner appears if jumping ahead

6. **AI Settings:**
   - Gear icon in header opens `AiProviderSelectModal`
   - Modal shows all enabled providers from Settings → AI
   - User selects provider + model for resume builder
   - Selection is saved to `aiProviderRouting.resumeBuilder` in main process
   - If no provider is configured, a subtle link "Configure AI in Settings" appears below the feedback box

7. **Empty/Loading/Error States:**
   - **Loading:** 3 skeleton blocks matching content shapes
   - **Empty (no questions loaded):** Centered spinner + "Loading first question..."
   - **Error:** Red bordered card with error message + "Retry" button
   - **Preview empty:** Rocket icon + "Start answering to see your resume" instead of blank white

---

## Constraints

1. **Must work with existing IPC infrastructure** — All resume IPC endpoints already exist. The only new IPC usage is calling the provider router for AI feedback.
2. **Must not break existing data persistence** — Resume data lives in `resume-data.json`. Builder progress lives in Zustand (localStorage). AI provider routing lives in `deskflow-prefs.json`.
3. **Must maintain all 7 phases** — The 37 questions across 7 phases must remain unchanged. Only the UI/UX around them changes.
4. **Must preserve the CareerTapestry** — The phase navigation bar works correctly and should remain as-is (compact mode in builder, full mode in hub).
5. **Must use L2 (Responsive) motion level** — No ambient particles, no scroll choreography, no spring physics. Micro-interactions on hover/press, AnimatePresence for transitions, stagger for lists. 150-250ms durations.
6. **Must follow DeskFlow design tokens** — `rounded-xl` max, `p-5` padding, `--page-accent: rgb(99, 102, 241)`, Geist + JetBrains Mono fonts, dark mode only, glass patterns.
7. **Must pass anti-slop checklist** — No default fonts, no purple-on-everything, no repeated section kickers, no hero clichés, all empty/loading/error states styled.
8. **Must implement EVERYTHING in this spec** — No triage, no "skip this as minor". Every directive must be implemented.

---

## Output Format

The target AI should produce a `RESULT.md` containing:

1. **Phase 1: Split Panel Restructure** — Complete code for the new split panel layout in `ResumeBuilderPage.tsx` and refactored `ResizablePanel.tsx`
2. **Phase 2: AI Provider Connection** — Updated `AiProviderSelectModal` type, router changes, backend `submitAnswer` handler with real AI calls
3. **Phase 3: Input Revamp** — New `AnswerInput.tsx` with auto-expanding textarea
4. **Phase 4: Question History** — Updated types, store, and UI for history navigation
5. **Phase 5: Enter Key Fix** — Updated `handleKeyDown` logic
6. **Phase 6: Backend AI Feedback** — Updated `submitAnswer` and `testAiConnection` handlers
7. **Phase 7: Polish** — Checklist improvements, preview zoom, empty states

Each phase should include:
- Exact file paths and line ranges to modify
- Complete code for new/changed sections
- CSS/Tailwind classes for all visual elements
- Animation specifications (duration, easing, properties)
- State management changes
- IPC usage patterns
