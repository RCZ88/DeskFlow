# CONTEXT BUNDLE — Universal Voice Input for DeskFlow

> **Task:** Build a native speech-to-text feature for every text input in the app
> **Date:** 2026-07-28
> **Target AI:** Claude (Lead Designer + Engineer)

---

## 1. Existing Voice Input Implementations

### 1A. `useVoiceInput` Hook (AI Chat)
**File:** `src/hooks/useVoiceInput.ts` (170 lines)

```typescript
// Full source — the existing hook used by AI Chat
import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
    SpeechRecognition?: new () => SpeechRecognition;
  }
}

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  silenceMs?: number;
}

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';
export type VoiceError = 'no-permission' | 'no-speech' | 'aborted' | 'unknown';

export interface UseVoiceInput {
  supported: boolean;
  state: VoiceState;
  interim: string;
  solidifying: boolean;
  error?: VoiceError;
  start: () => void;
  stop: () => void;
  countdownMs: number;
}

export function useVoiceInput({ onTranscript, silenceMs = 5000 }: UseVoiceInputOptions): UseVoiceInput {
  const [state, setState] = useState<VoiceState>('idle');
  const [supported, setSupported] = useState(true);
  const [interim, setInterim] = useState('');
  const [solidifying, setSolidifying] = useState(false);
  const [error, setError] = useState<VoiceError | undefined>();
  const [countdownMs, setCountdownMs] = useState(silenceMs);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const solidifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    if (solidifyTimerRef.current) { clearTimeout(solidifyTimerRef.current); solidifyTimerRef.current = null; }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setCountdownMs(silenceMs);
    silenceTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, silenceMs);
  }, [silenceMs]);

  useEffect(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimStr = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) { interimStr += result[0].transcript; }
      }
      setInterim(interimStr);
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          setInterim('');
          setSolidifying(true);
          onTranscript(result[0].transcript);
          if (solidifyTimerRef.current) clearTimeout(solidifyTimerRef.current);
          solidifyTimerRef.current = setTimeout(() => setSolidifying(false), 800);
        }
      }
      resetSilenceTimer();
    };

    recognition.onerror = (event: Event & { error: string }) => {
      setState('error');
      if (event.error === 'not-allowed') setError('no-permission');
      else if (event.error === 'no-speech') setError('no-speech');
      else if (event.error === 'aborted') setError('aborted');
      else setError('unknown');
      clearTimers();
      setTimeout(() => { setState('idle'); setError(undefined); }, 1200);
    };

    recognition.onend = () => {
      setState('idle');
      setInterim('');
      clearTimers();
    };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); clearTimers(); };
  }, [onTranscript, resetSilenceTimer, clearTimers]);

  const start = useCallback(() => {
    if (!recognitionRef.current || !supported) return;
    setInterim('');
    setError(undefined);
    setCountdownMs(silenceMs);
    setState('listening');
    startedAtRef.current = Date.now();
    try { recognitionRef.current.start(); } catch { setState('idle'); return; }
    resetSilenceTimer();
    countdownTimerRef.current = setInterval(() => {
      setCountdownMs(prev => Math.max(0, prev - 100));
    }, 100);
  }, [supported, silenceMs, resetSilenceTimer]);

  const stop = useCallback(() => {
    if (state === 'listening') {
      setState('processing');
      setTimeout(() => {
        if (recognitionRef.current) recognitionRef.current.stop();
      }, 200);
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [state]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return { supported, state, interim, solidifying, error, start, stop, countdownMs };
}
```

### 1B. `VoiceInputButton` Component (AI Chat)
**File:** `src/components/VoiceInputButton.tsx` (97 lines)

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { type UseVoiceInput } from '../hooks/useVoiceInput';
import { MOTION } from './ai/tokens';

interface VoiceInputButtonProps {
  voice: UseVoiceInput;
  disabled?: boolean;
}

const circumference = 2 * Math.PI * 8;

export function VoiceInputButton({ voice, disabled }: VoiceInputButtonProps) {
  if (!voice.supported) return null;

  const isListening = voice.state === 'listening';
  const isProcessing = voice.state === 'processing';
  const isError = voice.state === 'error';
  const countdownRatio = voice.countdownMs / 5000;
  const strokeDashoffset = circumference * (1 - countdownRatio);
  const isNearEnd = countdownRatio < 0.3;

  const label = isListening ? 'Listening, tap to stop' : 'Start voice input';
  const shortcutHint = 'Ctrl+Shift+M';

  return (
    <div className="relative">
      <button
        onClick={isListening ? voice.stop : voice.start}
        disabled={disabled || isProcessing}
        aria-label={label}
        aria-pressed={isListening}
        className={`relative grid place-items-center rounded-lg
          w-8 h-8 min-w-[44px] min-h-[44px] p-0
          transition-all duration-150
          focus-visible:ring-2 focus-visible:ring-pink-500/60 focus-visible:outline-none
          disabled:opacity-40 disabled:cursor-not-allowed
          ${isListening
            ? 'bg-pink-500/15 text-pink-400 ring-1 ring-pink-500/30'
            : isError
              ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/40'
              : 'text-zinc-400 bg-zinc-900/60 ring-1 ring-zinc-800/60 hover:text-pink-300 hover:ring-pink-500/30'
          }`}
        title={`${label} (${shortcutHint})`}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />
        )}

        {isListening && (
          <>
            <span className="absolute inset-0 rounded-lg v-ring pointer-events-none" />
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 22 22">
              <circle cx="11" cy="11" r="8" fill="none" stroke="rgba(244,114,182,0.2)" strokeWidth="2.5" />
              <circle
                cx="11" cy="11" r="8" fill="none"
                stroke={isNearEnd ? '#fbbf24' : '#f472b6'}
                strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 100ms linear, stroke 200ms ease' }}
              />
            </svg>
          </>
        )}

        {isListening && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end gap-[1.5px] h-3 pointer-events-none">
            <span className="w-[2px] rounded-full bg-pink-400/70 v-bar" />
            <span className="w-[2px] rounded-full bg-pink-400/70 v-bar" style={{ animationDelay: '0.15s' }} />
            <span className="w-[2px] rounded-full bg-pink-400/70 v-bar" style={{ animationDelay: '0.3s' }} />
          </div>
        )}
      </button>

      <AnimatePresence>
        {isListening && voice.interim && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: MOTION.fast }}
            className="absolute bottom-full right-0 mb-2 z-30"
            role="status"
            aria-live="polite"
          >
            <div className="rounded-lg bg-zinc-900/95 ring-1 ring-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 max-w-[240px]">
              {voice.interim}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### 1C. `VoiceInput` Component (Resume — standalone duplicate)
**File:** `src/features/resume/components/VoiceInput.tsx` (206 lines)

```typescript
// Has its OWN SpeechRecognition setup + Web Audio API visualization
// Does NOT use the useVoiceInput hook
// Has audio visualizer via AnalyserNode → frequency bars
// Key feature: real-time volume meter with animated bars
export function VoiceInput({ value, onChange, disabled, lang = 'en-US' }: VoiceInputProps) {
  // ... (full source above in research)
  // Key difference: uses navigator.mediaDevices.getUserMedia for audio viz
  // Key difference: auto-restarts recognition on end (continuous loop)
  // Key difference: appends transcript with space separator
}
```

---

## 2. Input Components

### 2A. shadcn Input Component
**File:** `src/components/ui/input.tsx` (17 lines)

```typescript
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, ...props }: InputPrimitive.Props) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        "flex h-8 w-full rounded-lg border border-border bg-background px-2.5 py-1 text-sm text-foreground shadow-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

### 2B. No Textarea Component Exists
There is NO `src/components/ui/textarea.tsx`. All textareas are raw `<textarea>` HTML with inline Tailwind classes.

---

## 3. CSS Animations

**File:** `src/index.css` (relevant sections)

```css
/* Voice solidify animation — text glows and brightens when transcription completes */
.voice-solidify {
  animation: voiceSolidify 0.8s ease-out forwards;
}
@keyframes voiceSolidify {
  0% { color: rgba(161, 161, 170, 0.6); text-shadow: 0 0 8px rgba(244, 114, 182, 0.3); }
  50% { color: rgba(244, 114, 182, 0.9); text-shadow: 0 0 12px rgba(244, 114, 182, 0.5); }
  100% { color: rgb(244, 244, 245); text-shadow: none; }
}

/* VoiceInputButton references v-ring and v-bar classes — NOT defined in any CSS file! */
/* These are missing — the bars only render via inline Tailwind classes, not CSS */
```

---

## 4. Design Tokens

**File:** `src/index.css` — key tokens:

```css
@theme {
  --ws-surface: #09090b;
  --ws-surface-raised: #18181b;
  --ws-border: rgb(39 39 42 / 0.6);
  --ws-border-strong: rgb(63 63 70 / 0.6);
  --ws-accent: #06b6d4;
  --ws-radius-card: 0.5rem;
  --ws-dur: 150ms;
  --ws-ease: cubic-bezier(0.2, 0, 0, 1);

  --color-clay-300: #f0a892;
  --color-clay-400: #e8866b;
  --color-clay-500: #d96846;
  --color-sage-400: #6fb38f;
  --color-amber-400: #fbbf24;
  --color-sky-400: #5ab0c9;
  --color-glow: #f7f3ee;

  --font-serif: "Source Serif 4", Georgia, serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
}
```

**Glass pattern (from AGENTS.md):**
```css
bg-[rgba(24,24,27,0.80)] backdrop-blur-xl border border-[rgba(63,63,70,0.50)]
```

---

## 5. Pages with Text Inputs (Scope: EVERYWHERE)

| Page | Input Types | Raw `<input>` | Raw `<textarea>` | Uses `Input` component |
|------|-------------|---------------|------------------|----------------------|
| `SettingsPage.tsx` | 10+ inputs, textareas | Yes | Yes | No |
| `IDEProjectsPage.tsx` | inputs, textarea | Yes | Yes | No |
| `TerminalPage.tsx` | textarea | No | Yes | No |
| `StatsPage.tsx` | inputs | Yes | No | Yes |
| `BrowserActivityPage.tsx` | inputs | Yes | No | Yes |
| `ExternalPage.tsx` | date/text inputs | Yes | No | No |
| `DatabasePage.tsx` | input | Yes | No | No |
| `ConductorPage.tsx` | input | Yes | No | No |
| `SubscriptionsPage.tsx` | input | Yes | No | No |
| `ResumeBuilderPage.tsx` | Input + textarea | Yes | Yes | Yes |
| `ResumeImportPage.tsx` | textarea | No | Yes | No |
| `NewSessionDialog.tsx` | textarea | No | Yes | No |
| `AiChat/ChatInput.tsx` | textarea | No | Yes | No |
| `ai/canvas/CanvasInput.tsx` | input | Yes | No | No |
| `finance/*.tsx` (modals) | textareas | No | Yes | No |
| `learn/*.tsx` | textareas | No | Yes | No |
| `InstructionPanel.tsx` | textarea | No | Yes | No |
| `PromptsWorkspace.tsx` | textarea | No | Yes | No |
| `IssuesWorkspace.tsx` | textareas | No | Yes | No |
| `RequestsTab.tsx` | textarea | No | Yes | No |
| `SkillsTab.tsx` | textareas | No | Yes | No |
| `workspace/ConfigsTab.tsx` | Input | No | No | Yes |

---

## 6. MCP Component Candidates (with source code)

### From Magic UI:

**PulsatingButton** — mic button with pulse glow:
```bash
npx shadcn@latest add "https://magicui.design/r/pulsating-button.json"
```
- Props: `pulseColor`, `duration`, `distance`, `variant: "pulse" | "ripple"`
- Uses CSS `animate-pulse` or `animate-pulse-ripple`
- Auto-detects background color from computed style

**ShimmerButton** — idle mic button shimmer:
```bash
npx shadcn@latest add "https://magicui.design/r/shimmer-button.json"
```
- Props: `shimmerColor`, `shimmerSize`, `borderRadius`, `shimmerDuration`, `background`
- Conic gradient spark rotating around border

**Ripple** — expanding ripple rings behind active mic:
```bash
npx shadcn@latest add "https://magicui.design/r/ripple.json"
```
- Props: `mainCircleSize`, `mainCircleOpacity`, `numCircles`
- 8 concentric expanding rings with staggered delays

**BorderBeam** — animated light beam on mic button border:
```bash
npx shadcn@latest add "https://magicui.design/r/border-beam.json"
```
- Props: `size`, `duration`, `delay`, `colorFrom`, `colorTo`, `reverse`, `borderWidth`
- Light beam traveling along container border

**TypingAnimation** — text appearing char-by-char:
```bash
npx shadcn@latest add "https://magicui.design/r/typing-animation.json"
```
- Props: `words`, `duration`, `typeSpeed`, `deleteSpeed`, `loop`, `showCursor`, `cursorStyle`
- Depends on `motion/react` (framer-motion)

**AnimatedCircularProgressBar** — silence countdown ring:
```bash
npx shadcn@latest add "https://magicui.design/r/animated-circular-progress-bar.json"
```
- Props: `max`, `min`, `value`, `gaugePrimaryColor`, `gaugeSecondaryColor`

**NeonGradientCard** — voice panel container:
```bash
npx shadcn@latest add "https://magicui.design/r/neon-gradient-card.json"
```
- Props: `borderSize`, `borderRadius`, `neonColors`
- Animated gradient border with blur glow

**MagicCard** — spotlight card:
```bash
npx shadcn@latest add "https://magicui.design/r/magic-card.json"
```
- Props: `mode: "gradient" | "orb"`, `gradientFrom`, `gradientTo`, `gradientSize`
- Mouse-following spotlight effect

### From ReactBits:

**ClickSpark** — spark on mic click:
```typescript
// Canvas-based spark particles on click
// Props: sparkColor, sparkSize, sparkRadius, sparkCount, duration
```

**FadeContent** — content fade-in:
```typescript
// GSAP ScrollTrigger-based fade
// Props: blur, duration, threshold, initialOpacity
// NOTE: Uses GSAP — check if GSAP is in package.json before using
```

### From Lucide (icons):

| Icon | Use |
|------|-----|
| `Mic` | Active mic button |
| `MicOff` | Inactive mic |
| `Loader2` | Processing state |
| `Backspace` | Edit/correct transcribed text |
| `Languages` | Language selector |
| `Volume2` | Audio level indicator |
| `Settings` | Voice settings |
| `Keyboard` | Toggle voice off |

---

## 7. Architecture Notes

### Current Voice Flow (AI Chat only):
```
User clicks mic → VoiceInputButton.start() → useVoiceInput.start()
  → SpeechRecognition.start() (browser native)
  → onresult fires → interim text → voice.interim state
  → on final result → voice.solidifying animation → onTranscript callback
  → ChatInput inserts text into textarea
```

### Desired Universal Flow:
```
User clicks mic on ANY input → VoiceManager.start()
  → AudioContext + AnalyserNode (for waveform visualization)
  → SpeechRecognition.start() (browser native, configurable lang)
  → onresult → interim text → floating panel with waveform + preview
  → on final → text appended to input value via onChange
  → Backspace support: undo last transcribed sentence
```

### Key Design Decisions Needed:
1. **Single mic instance** — only one voice input active at a time (global state)
2. **Two modes:** append (default) vs replace (when text selected)
3. **Floating panel position:** below the input, or fixed bottom-center?
4. **Waveform visualization:** real-time frequency bars from AnalyserNode
5. **Language picker:** Settings > General, or inline on mic button?
6. **Textarea vs Input:** both need voice, textarea is more common
7. **No npm dependencies** — Web Speech API is built into Chromium/Electron

---

## 8. Relevant Existing Files

| File | Lines | Relevance |
|------|-------|-----------|
| `src/hooks/useVoiceInput.ts` | 170 | Core speech recognition hook to extend |
| `src/components/VoiceInputButton.tsx` | 97 | Mic button UI to enhance |
| `src/features/resume/components/VoiceInput.tsx` | 206 | Audio viz pattern to unify |
| `src/components/ui/input.tsx` | 17 | Input component to wrap |
| `src/index.css` | 111 | CSS tokens + voice-solidify animation |
| `src/components/AiChat/ChatInput.tsx` | ~200 | Consumer of voice input |
| `src/components/ai/canvas/CanvasInput.tsx` | ~150 | Consumer of voice input |
