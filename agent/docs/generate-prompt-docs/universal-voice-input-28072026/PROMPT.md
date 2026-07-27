# PROMPT — Universal Voice Input for DeskFlow

## Raw Request

> I would like to create a native speech-to-text feature for every single text input. So what I would like is a feature where every text input has an ability to do a proper speech-to-text. And the speech-to-text needs to work properly and has a proper UI. It needs to have a proper animation of like the text being added alongside the user's talking. And it needs to have all of the quality, all these lives features like for example, if they want to edit something they could just click Backspace to modify anything that they say that is parsed incorrectly. And all the other features that might not have the idea of what are the features. But I think we can do research on one of the best things that we can do on a speech-to-text feature to make sure that the input of the text is most efficient. And like just basically the typing experience and stuff like that is the most exquisite and the best animations. And like for example, the sound wave representing the sound and it is being able to display the cleanest and the best looking UI with all the front end skills and stuff like that. And the elements I would like you to search up the elements on. I would like you to use the generate prompt for all of this and ask the ai to find elements from the internet like existing animations elements for the stuff related to this, like the sound wave or the text input and some sort of still clean animations that can improve everything. So I would like you to use the generate prompt skill alongside all front end skills as a context bundle and tell mcp whatever you want to use and try to find and find the candidates and include them in the context bundle and everything like that.

---

## Problem Statement

DeskFlow has **3 separate, disconnected voice input implementations** that are:
1. Only wired to AI Chat — not available on the 30+ pages with text inputs
2. Inconsistent UX — `useVoiceInput` hook, `VoiceInputButton` component, and `VoiceInput` (resume) all behave differently
3. No audio visualization — only the resume VoiceInput has volume bars, no frequency waveform
4. No floating preview — interim text only shows as a tiny tooltip on the AI Chat button
5. No backspace/edit — once text is transcribed, user must manually delete with keyboard
6. No language configuration — hardcoded to `en-US`

**The user wants:** A single, universal voice input system that works on EVERY text input across the entire app, with a beautiful floating panel featuring real-time sound wave visualization, animated text appearing as the user speaks, backspace support for correcting misheard words, and a language picker.

---

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` in the same directory for:
- Full source of `useVoiceInput.ts` (170 lines) — the existing hook
- Full source of `VoiceInputButton.tsx` (97 lines) — the existing mic button
- Full source of `VoiceInput.tsx` (206 lines) — the resume duplicate
- Full source of `input.tsx` (17 lines) — the shadcn Input component
- CSS animations (voice-solidify, v-ring, v-bar)
- Design tokens (colors, fonts, glass pattern)
- Complete page-to-input mapping (30+ components)
- MCP component candidates with source code

---

## Engineering Task

Design a **Universal Voice Input System** for DeskFlow's Electron + React + Tailwind stack. The system must:

### A. Core Architecture

1. **Single global voice manager** — one SpeechRecognition instance active at a time across the entire app. Use a React Context or zustand store to manage global voice state (`idle | listening | processing | error`).

2. **Enhanced `useVoiceInput` hook** — extend the existing hook at `src/hooks/useVoiceInput.ts` with:
   - Configurable `lang` parameter (default `'en-US'`)
   - Mode: `'append'` (add to end of text) vs `'replace'` (overwrite selected text)
   - `lastSentence` state for backspace/undo support
   - `backspace()` method that removes the last transcribed sentence
   - Audio context reference for visualization

3. **`useAudioVisualizer` hook** — NEW hook that:
   - Creates `AudioContext` + `AnalyserNode` from `navigator.mediaDevices.getUserMedia`
   - Returns `frequencyData: Uint8Array` updated via `requestAnimationFrame`
   - Returns `volume: number` (0-1) for simple level metering
   - Cleans up on unmount (stops tracks, closes context)

4. **`VoiceInputWrapper` HOC** — wraps any `<input>` or `<textarea>` with voice capability:
   - Adds a mic button inside/adjacent to the input
   - When voice is active, shows floating panel below the input
   - Handles text insertion via `onChange` (controlled) or DOM manipulation (uncontrolled)
   - Supports both single-line `<input>` and multi-line `<textarea>`
   - Detects input type and positions mic button accordingly

### B. Text Editing Features

5. **Backspace/Undo** — when user clicks backspace in the floating panel:
   - Remove the last transcribed sentence from the input value
   - Use `onTranscript` callback pattern: track sentence boundaries (period, exclamation, question mark)
   - Visual feedback: animate the removed text out

6. **Sentence boundaries** — split transcription at natural boundaries:
   - Period (`.`), exclamation (`!`), question mark (`?`)
   - Comma (`,`) as secondary break point
   - Newline (`\n`) for textarea mode

7. **Cursor position awareness** — insert text at cursor position, not just append:
   - For `<input>`: use `selectionStart` / `selectionEnd`
   - For `<textarea>`: same, but preserve multi-line structure

### C. Audio Visualization

8. **Sound wave bars** — real-time frequency visualization:
   - 20-32 vertical bars representing frequency bins
   - Heights animated from `AnalyserNode.getByteFrequencyData()`
   - Color transitions: idle → muted zinc, listening → accent (clay-400/500), near-end → amber-400
   - Smooth interpolation (lerp between frames, not raw jumps)

9. **Volume meter** — secondary indicator:
   - Simple average of frequency data → single bar or dot
   - Pulse animation synced to volume level

### D. Floating Panel

10. **Voice panel design:**
    - Position: absolute, anchored below the input element
    - Width: matches input width
    - Glass morphism: `bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl`
    - Contents (left to right):
      - Sound wave visualizer (20 bars)
      - Interim text preview (truncated, italic)
      - Backspace button
      - Stop button (red circle)
      - Timer/counterdown display
    - Animate in: `framer-motion` scale + opacity from `scale(0.95) opacity(0)` → `scale(1) opacity(1)`
    - Animate out: reverse

11. **Mic button states:**
    - **Idle:** Muted zinc icon, subtle ring, `Mic` icon
    - **Listening:** Accent glow (clay-400), pulsating ring animation, `Mic` icon, sound wave bars active
    - **Processing:** Spinner (`Loader2` icon), brief state before idle
    - **Error:** Red ring, `MicOff` icon, auto-recover after 1.2s
    - Use `BorderBeam` from Magic UI for the active listening state (animated light traveling around button border)

12. **Language picker:**
    - Small dropdown attached to mic button (on hover or long-press)
    - Languages: en-US, en-GB, es-ES, fr-FR, de-DE, ja-JP, ko-KR, zh-CN, pt-BR
    - Persisted to localStorage
    - Default: system locale detection via `navigator.language`

---

## Design Task

### High-Fidelity Visual Specifications

#### Color System for Voice States
```
Idle:        text-zinc-500, bg-transparent, border-zinc-800/60
Listening:   text-clay-400 (#e8866b), bg-clay-500/10, border-clay-500/30
Processing:  text-zinc-400, bg-zinc-900/60
Error:       text-red-400, bg-red-500/10, border-red-500/40
Near-end:    text-amber-400 (countdown < 30%)
```

#### Sound Wave Bars
- Bar width: 3px
- Bar gap: 2px  
- Bar radius: 1.5px (rounded-full)
- Bar color: gradient from clay-400 to clay-600 based on frequency
- Bar height range: 4px (min) to 32px (max)
- Animation: CSS transition `height 75ms ease-out` per bar
- Bar count: 24 (evenly spaced)

#### Mic Button
- Size: 32x32px (w-8 h-8) inside input, or 44x44px (min-w/min-h) standalone
- Border radius: rounded-lg (8px)
- Icon size: 16x16px (h-4 w-4)
- Pulse ring: `animate-pulse` with 1.5s duration, expanding from button center
- Border beam: clay-400 color, 6s duration, 1px border width

#### Floating Panel
- Width: 100% of input (min 320px, max 600px)
- Height: 80px
- Padding: p-3 (12px)
- Background: bg-zinc-900/95
- Border: 1px solid zinc-700/50
- Border radius: rounded-xl (12px)
- Shadow: shadow-xl shadow-black/20
- Backdrop blur: backdrop-blur-xl
- Z-index: z-50

#### Interim Text
- Font: text-sm (14px)
- Color: text-zinc-300
- Italic: italic
- Max width: 200px
- Overflow: truncate
- Animation: text appearing with `voice-solidify` glow on finalization

#### Backspace Button
- Size: 28x28px
- Border radius: rounded-md (6px)
- Icon: `Backspace` from lucide-react, 14px
- Color: text-zinc-400 hover:text-zinc-200
- Background: bg-zinc-800/60 hover:bg-zinc-700/60
- Click animation: scale(0.95) → scale(1) via framer-motion

#### Timer Display
- Format: MM:SS
- Font: font-mono (JetBrains Mono), text-xs
- Color: text-zinc-500 (listening), text-amber-400 (near-end)
- Position: right side of panel

---

## UX Task

### Interaction Flow

1. **Activation:** User clicks mic button on any input → floating panel appears below, sound wave starts, text begins appearing as user speaks
2. **Live preview:** Interim text shown in real-time in the floating panel (italic, slightly transparent)
3. **Finalization:** When speech recognition produces a final result, text is inserted into the input at cursor position with `voice-solidify` glow animation
4. **Backspace:** User clicks backspace button in panel → last sentence removed from input
5. **Stop:** User clicks stop button or mic button again → panel fades out, returns to idle
6. **Auto-stop:** After 5 seconds of silence, recognition stops automatically (existing countdown behavior)
7. **Error recovery:** On error, show red state for 1.2s, then auto-return to idle
8. **Language switch:** Hover/click mic button → language dropdown appears → select language → recognition restarts with new lang

### Empty State
- When no text has been transcribed yet, show "Listening..." placeholder in the panel
- Sound wave bars animate even without audio (idle animation with reduced height)

### Error State
- "Microphone not available" — if `getUserMedia` fails
- "Permission denied" — if user denied mic access
- "No speech detected" — if silence timeout fires without any speech
- All errors shown as brief toast-like message in the panel, auto-dismiss after 2s

### Accessibility
- `aria-label` on mic button: "Start voice input" / "Stop voice input"
- `aria-pressed` toggles on mic button
- `role="status"` + `aria-live="polite"` on interim text
- Keyboard: `Escape` stops voice input
- `prefers-reduced-motion` — disable pulse animation, use opacity transitions only

---

## Frontend Design Skills Reference

Apply these skills when designing the UI:

1. **Frontend Design** — DeskFlow-specific component patterns, tokens, spacing, typography, glass cards
2. **Human-Centric UX** — empty/loading/error states, progressive disclosure, visual hierarchy, feedback
3. **Impeccable** — 7 design dimensions (typography, color, spatial, motion, interaction, responsive, UX writing), 27 anti-patterns
4. **Motion — Bring the UI Alive** — Liveliness Levels (L1 Composed / L2 Responsive / L3 Expressive), motion taxonomy, recipes
5. **UI UX Pro Max** — industry-specific design rules (dev tools, AI/ML, financial), style library
6. **Design Taste System** — master aggregator, design variance knobs, anti-repetition rules
7. **frontend-external-infra** — source routing, re-skin rules, anti-slop checklist

---

## MCP Component Inventory

### Selected for this feature:

| Component | Source | Install | Use for |
|-----------|--------|---------|---------|
| `PulsatingButton` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/pulsating-button.json"` | Mic button pulse glow while recording |
| `BorderBeam` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/border-beam.json"` | Animated light beam on active mic border |
| `Ripple` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/ripple.json"` | Expanding rings behind active mic |
| `AnimatedCircularProgressBar` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/animated-circular-progress-bar.json"` | Silence countdown visualization |
| `TypingAnimation` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/typing-animation.json"` | Text appearing char-by-char as user speaks |
| `ShimmerButton` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/shimmer-button.json"` | Idle mic button shimmer to attract attention |
| `NeonGradientCard` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/neon-gradient-card.json"` | Voice panel container (optional) |
| `MagicCard` | Magic UI | `npx shadcn@latest add "https://magicui.design/r/magic-card.json"` | Spotlight effect on voice panel (optional) |
| `ClickSpark` | ReactBits | Source: `src/ts-tailwind/Animations/ClickSpark/ClickSpark.tsx` | Spark effect on mic button click |
| ~~`FadeContent`~~ | ~~ReactBits~~ | ~~NOT可用 — requires GSAP~~ | ~~Panel fade~~ Use framer-motion instead |
| `Mic`, `MicOff`, `Backspace`, `Languages`, `Loader2` | Lucide | `lucide-react` | Icons |
| `Input` | shadcn (existing) | Already installed | Base input component to wrap |

### Source Routing:
- Standard UI → shadcn (`Input`)
- Animated effects → Magic UI (`PulsatingButton`, `BorderBeam`, `Ripple`)
- Icons → Lucide
- Canvas animations → custom (sound wave visualizer)

---

## Anti-Slop Checklist

After building, verify:
- [ ] NOT default purple/indigo gradient — uses DeskFlow's clay palette (`--color-clay-400: #e8866b`)
- [ ] NOT same radius everywhere — mic button `rounded-lg`, panel `rounded-xl`
- [ ] NOT no empty states — panel shows "Listening..." when idle
- [ ] NOT no error states — mic errors handled with auto-recovery
- [ ] NOT no motion — pulse ring, sound wave bars, panel slide-in
- [ ] NOT generic icons — all from lucide-react, no emoji as UI icons
- [ ] NOT no accessibility — aria labels, keyboard support, reduced motion
- [ ] Dark mode only — strip any light mode variants
- [ ] Geist + JetBrains Mono fonts — no third font introduced
- [ ] Glass morphism applied — `bg-zinc-900/95 backdrop-blur-xl`

---

## Constraints

1. **Zero npm dependencies** — use browser-native Web Speech API and Web Audio API only. No `@react-speech-recognition`, no `annyang`, no `openai-whisper`.
2. **Single mic instance** — only one voice input active at a time globally. Clicking mic on another input stops the current one.
3. **Must work in Electron** — Web Speech API is Chromium-only, which is fine since Electron uses Chromium.
4. **Preserve existing voice input in AI Chat** — the existing `useVoiceInput` + `VoiceInputButton` in AiChat must continue working. The new system should unify them but not break the existing wiring.
5. **All 30+ text input locations** — the voice button must appear on every `<input>` and `<textarea>` in the app.
6. **localStorage persistence** — language preference saved to `localStorage` key `'voice-lang'`.
7. **framer-motion already installed** — use it for panel animations. No new animation library.
8. **No `useTheme` dependency** — `MagicCard` uses `next-themes` which is NOT in this project. Avoid `MagicCard` or adapt it to work without `useTheme`.
9. **GSAP is NOT installed** — `FadeContent` from ReactBits requires GSAP which is not in this project. Do NOT use FadeContent. Use `framer-motion` or `motion/react` for all fade/transition animations instead.

---

## Deliverables

Design the complete specification including:
1. File structure (which files to create/modify)
2. TypeScript interfaces for all new components
3. The enhanced `useVoiceInput` hook API
4. The `useAudioVisualizer` hook API
5. The `VoiceInputWrapper` component props and behavior
6. CSS for sound wave bars (keyframes + utility classes)
7. Floating panel component specification
8. Integration pattern for wrapping existing inputs
9. Settings UI for language selection
10. Error handling strategy
