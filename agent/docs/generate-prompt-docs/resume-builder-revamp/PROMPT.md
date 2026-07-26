# PROMPT.md — Resume Builder Revamp

## Raw Request (Verbatim)

"it should be that the user is able to freely navigate between which steps that they want to do first. So, I mean, it will break the system in a sense that the preview is going to be bad or something like that. It needs to be warned, but I'm going to make sure to update the system so that we're able to have a feature where it's very dynamic and it's very free for the user to have their own way and steps and not everything needs to be methodically the same. Everyone can have their own steps on which to complete first and so on and so forth. So, if it's something that is complicated and stuff, I would like you to use the Generate Prompt Skill to tackle this and also the UI and everything. It's like really, really, really, really, really, really, really, really, really extra bad. So, what I would like you to do is to also use all those skills along with the Generate Prompt Skill to make sure that it's showing the resume properly and we can resize the display preview of the resume and there's also like proper showing of those stuff and like it needs to be that so that we can also voice input, right? So, I mean, aside from just a user text input, voice input inside of that, internally, locally in the application also be nice, that the user didn't have to use the external voice recording text, which to text feature on those to make your work properly so that long stuff, long inputs can be done very much easier than compared to typing it. And that's pretty much it. also not to mention like the detailed guides on like the instructions on how to answer stuff and what to include and not include and everything like that. how is the ai connection system how does it connect to the providers on the settings and where's the ability to adjust which provider are we using and everything like that."

---

## Context Bundle Reference

Read `agent/docs/resume-builder-revamp/CONTEXT_BUNDLE.md` first. It contains:
- All current source code for affected files
- UI component inventory (25 shadcn + Magic UI components)
- Design system tokens
- IPC endpoint list
- Backend status audit

---

## Problem Statement

The Resume Builder has 5 critical issues:

1. **Sequential-only navigation** — Users MUST complete phases in order (1→2→3→...→7). The PhaseNavigator disables locked phases. Users want to jump freely between phases — do skills first, then experience, then come back to Foundation.

2. **No voice input** — Long answers (describing projects, writing bullets) require heavy typing. The Web Speech API is built into Chromium/Electron and can provide local speech-to-text without external services.

3. **Fixed preview width** — The preview panel is hardcoded to 400px. Users need to resize it to see more/less of the resume while building.

4. **No answer guides** — Questions show text + whyItMatters, but don't tell users WHAT to include, WHAT to exclude, or give pro tips. Users don't know what makes a strong answer vs. a weak one.

5. **No AI provider settings** — The system hardcodes OpenAI. Users need to configure which AI provider to use, set API keys, and choose models from a settings UI.

---

## Engineering Tasks

### Task A: Non-Linear Phase Navigation

**What:** Allow users to click ANY phase tab to jump directly to that phase's questions, regardless of completion status.

**How:**
1. In `PhaseNavigator.tsx`: Remove `disabled={status === 'locked'}` and the `cursor-not-allowed opacity-50` styling for locked phases
2. In `ResumeBuilderPage.tsx`: When user clicks a phase:
   - Load that phase's first question (or last answered question if resuming)
   - Show a toast/warning if the phase has incomplete prior phases: "You're skipping ahead. The preview may show partial data."
   - Update `builderProgress.currentPhase` immediately
   - Don't require completing previous phases first
3. In the backend (`main.ts` `resume:nextQuestion`): Accept any `currentPhase` value, not just sequential progression
4. Add a "completion indicator" per phase — show how many questions are answered vs total

**Files to modify:**
- `src/features/resume/components/PhaseNavigator.tsx` (remove disabled logic)
- `src/pages/ResumeBuilderPage.tsx` (add warning toast, phase jump logic)
- `src/main.ts` (ensure nextQuestion handles any phase)

### Task B: Voice Input (Web Speech API)

**What:** Add a microphone button to text/textarea inputs that uses the browser's built-in SpeechRecognition for speech-to-text.

**How:**
1. Create a new `VoiceInput` component that wraps the existing text input
2. Use `window.SpeechRecognition` (with `webkitSpeechRecognition` fallback)
3. Configuration: `{ continuous: true, interimResults: true, lang: 'en-US' }`
4. UI: Microphone icon button, pulsing red when recording, green when idle
5. Behavior: Append transcribed text to existing input value (don't replace)
6. Show real-time transcript preview while recording
7. Auto-stop after 30 seconds of silence
8. Fallback: If SpeechRecognition not available, hide the button gracefully

**Files to create/modify:**
- `src/features/resume/components/VoiceInput.tsx` (new component)
- `src/features/resume/components/AnswerInput.tsx` (integrate VoiceInput for text/textarea types)
- `src/pages/ResumeBuilderPage.tsx` (pass voice support to AnswerInput)

### Task C: Resizable Preview Panel

**What:** Make the preview panel resizable with a draggable divider.

**How:**
1. Create a `ResizablePanel` component with a drag handle
2. Store preferred width in localStorage (`resume-preview-width`)
3. Default width: 400px, Min: 300px, Max: 60% of viewport
4. Drag handle: 4px wide bar with a grip icon, hover effect
5. Smooth resize with `requestAnimationFrame` during drag
6. On mobile (< 768px): Preview collapses to a toggleable overlay instead of side panel

**Files to create/modify:**
- `src/features/resume/components/ResizablePanel.tsx` (new component)
- `src/pages/ResumeBuilderPage.tsx` (replace fixed-width preview with ResizablePanel)
- `src/pages/ResumePreviewPage.tsx` (optional: use ResizablePanel for zoom control)

### Task D: Detailed Answer Guides

**What:** Show "what to include", "what to exclude", and "pro tips" below each question.

**How:**
1. Extend the `Question` type with new fields:
   ```typescript
   guideInclude?: string[];  // "Include: specific numbers, outcomes, your role"
   guideExclude?: string[];  // "Avoid: team-only descriptions, vague verbs"
   guideTips?: string[];     // "Pro tip: Use XYZ format — Accomplished [X] as measured by [Y]"
   ```
2. Create a `QuestionGuide` component that renders these as collapsible sections
3. Show by default for first-time users, collapsible for returning users
4. Style: Small text, muted colors, bulleted lists with green (include), red (exclude), amber (tips) indicators

**Files to create/modify:**
- `src/features/resume/components/QuestionGuide.tsx` (new component)
- `src/types/resume.ts` (extend Question interface)
- `src/pages/ResumeBuilderPage.tsx` (render QuestionGuide below QuestionCard)
- `src/main.ts` (add guide data to the questions in resumePhases)

### Task E: AI Provider Settings

**What:** Add a settings panel for configuring which AI provider to use, setting API keys, and choosing models.

**How:**
1. Create an `AiSettings` component with:
   - Provider selector (OpenAI, Anthropic, Local/Ollama)
   - API key input (masked, with show/hide toggle)
   - Model selector (dropdown per provider)
   - Temperature slider (0-1)
   - Test connection button
   - Connection status indicator (green/red dot)
2. Store settings in localStorage + pass to main process via IPC
3. Main process reads provider config before making AI calls
4. Add IPC handlers: `resume:getAiSettings`, `resume:saveAiSettings`, `resume:testAiConnection`

**Files to create/modify:**
- `src/features/resume/components/AiSettings.tsx` (new component)
- `src/pages/ResumePage.tsx` (add settings button/modal)
- `src/main.ts` (add IPC handlers, refactor AI calls to use configurable provider)
- `src/preload.ts` (add settings IPC bridge)

---

## Design Tasks

### Visual Specs

1. **Phase Navigator Update:**
   - All phases clickable (remove disabled state)
   - Locked phases: `bg-zinc-800/50 text-zinc-400 ring-1 ring-zinc-700/30` (not opacity-50)
   - Active phase: `bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30`
   - Add small completion dot: green if all questions answered, amber if partial, gray if none

2. **Voice Input Button:**
   - Position: Right side of text input, inside the input field
   - Idle: `Mic` icon, `text-zinc-500 hover:text-zinc-300`
   - Recording: `MicOff` icon, `text-red-400`, pulsing animation (`animate-pulse`)
   - Disabled (not supported): Hidden

3. **Resizable Divider:**
   - Width: 4px
   - Color: `bg-zinc-700 hover:bg-zinc-500`
   - Grip icon: 3 vertical dots centered
   - Cursor: `col-resize`

4. **Question Guide:**
   - Collapsible section below question
   - Include items: `CheckCircle` icon, `text-emerald-400`
   - Exclude items: `XCircle` icon, `text-red-400`
   - Tips: `Lightbulb` icon, `text-amber-400`
   - Default expanded for first question, collapsed after

5. **AI Settings Modal:**
   - Standard dialog pattern (from existing dialog.tsx)
   - Provider cards: clickable cards with provider logo placeholder
   - API key: masked input with eye toggle
   - Test button: sends a simple prompt, shows success/failure

---

## UX Tasks

### Interaction Flow: Non-Linear Navigation
1. User clicks Phase 4 (Skills) while on Phase 1 (Foundation)
2. Toast appears: "Jumping to Skills. Complete Foundation first for best results."
3. Phase 4 loads, shows its first question
4. User can answer and submit normally
5. Phase 4 status changes to "in_progress"
6. User can jump back to Phase 1 anytime

### Interaction Flow: Voice Input
1. User sees microphone icon in textarea
2. Clicks mic → icon turns red, pulsing, "Listening..." label appears
3. User speaks → text appears in real-time in the textarea
4. User clicks mic again → recording stops, final text appended
5. User can continue typing after voice input
6. If SpeechRecognition not available → mic button hidden, no error

### Interaction Flow: Resizable Preview
1. User sees divider between builder and preview panels
2. Hovers divider → cursor changes to col-resize, handle highlights
3. Drags left/right → preview panel resizes smoothly
4. Reaches min/max → stops resizing
5. Releases → width persisted to localStorage
6. Next visit → restores preferred width

### Empty/Loading/Error States
- **Empty phase:** "No questions in this phase yet. Answer previous phases first."
- **Loading question:** Skeleton placeholder matching question card shape
- **Error loading:** "Failed to load question. Retry?" with retry button
- **Voice not supported:** Mic button hidden, no error shown
- **AI settings missing:** Yellow badge "AI not configured" on Resume hub

---

## Constraints

1. Must work with existing IPC handlers (resume:nextQuestion, resume:submitAnswer, etc.)
2. Must use existing UI components from src/components/ui/ (Button, Input, Badge, Tabs, etc.)
3. Must follow DeskFlow design system (glass morphism, rounded-xl, p-5, indigo accent)
4. Must support reduced motion (prefers-reduced-motion)
5. Must work in Electron (Chromium) — Web Speech API is available
6. Must not break existing functionality (chat import, export, versions, etc.)

---

## Backend Gaps

| Feature | IPC Channel | Exists? | Action Needed |
|---------|-------------|---------|---------------|
| Non-linear navigation | resume:nextQuestion | ✅ | Modify to accept any phase |
| Voice input | n/a (frontend only) | N/A | No backend change needed |
| Resizable preview | n/a (frontend only) | N/A | No backend change needed |
| Question guides | resume:nextQuestion | ✅ | Add guide fields to question objects |
| AI provider settings | resume:getAiSettings | ❌ | Create new IPC handlers |
| AI provider settings | resume:saveAiSettings | ❌ | Create new IPC handlers |
| AI connection test | resume:testAiConnection | ❌ | Create new IPC handler |
