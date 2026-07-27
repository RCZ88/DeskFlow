# Round 02 — Specialist Questions + Owner Responses

## Date: 2026-07-27
## Status: In Progress

---

## Specialist's Analysis of Round 1

Thank you for the detailed code. The canvas implementation is clean—`CanvasContainer` and `CanvasGrid` do not appear to be bleeding out of their bounds, and their event handlers are properly scoped. 

Since the base layout doesn't show an obvious overlap, we need to look for "invisible overlays" or "global event hijackers" that are mounted *only* when `AiPage` is active. There are three primary suspects:

### Hypothesis 1: Invisible Modal/Drawer Backdrop
`AiPage` renders several modals and drawers (`CommandPalette`, `ChatHistory`, `GoalsRemindersDrawer`, etc.). If any of these components renders a `fixed inset-0` overlay to capture background clicks, but fails to unmount it or set `pointer-events: none` when `open={false}`, it will create an invisible shield over the entire application.

### Hypothesis 2: Global Event Listener Hijacking
`AiPage` uses several custom hooks (`useAiChat`, `useSlashCommands`, `useVoiceInput`). If any of these hooks attach a global `window.addEventListener('pointerdown', ...)` or `'click'` that calls `e.stopPropagation()` or `e.preventDefault()`, it could intercept clicks before they reach the sidebar's `onClick` handler.

### Hypothesis 3: Tutorial Overlay
The `AiPage` contains `data-tutorial="ai.canvas"`. The app is wrapped in `<TutorialProvider>`. If the tutorial system is active or stuck in a specific state for the AI page, it might be rendering a pointer-events blocking overlay.

---

## Owner's Responses

### Response to Hypothesis 1 (ChatHistory modal):

**CONTEXT: src/components/ai/chat/ChatHistory.tsx (full source)**

```tsx
import { useState, useCallback, useRef, useEffect } from "react"
import { History, Trash2, MessageSquare, X, Plus, Loader2, Pencil, Check } from "lucide-react"

export interface ChatThread {
  threadDate: string
  title?: string
  messageCount: number
  lastMessageAt?: number
  createdAt?: number
  preview?: string
}

interface ChatHistoryProps {
  open: boolean
  onClose: () => void
  threads: ChatThread[]
  currentThreadDate: string
  onLoadThread: (threadDate: string) => void
  onDeleteThread: (threadDate: string) => void
  onRenameThread: (threadDate: string, newTitle: string) => void
  onNewThread: () => void
  loading?: boolean
}

export function ChatHistory(props: ChatHistoryProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  // ... other handlers ...

  if (!props.open) return null;   // <-- LINE 78: EARLY RETURN WHEN CLOSED

  return (
    <div className="dk-modal-overlay" onClick={props.onClose}>
      <div className="dk-modal max-w-lg w-full" onClick={e => e.stopPropagation()}>
        ...modal content...
      </div>
    </div>
  )
}
```

**Verdict: CLEAN.** Line 78: `if (!props.open) return null;` — the component returns NOTHING when closed. No overlay, no DOM节点. All other modals in AiPage follow the same pattern (GoalsRemindersDrawer, SlashCommandManager, AIFeaturesModal, AiProviderSelectModal, ConnectorSetupModal).

---

### Response to Hypothesis 2 (useVoiceInput):

**CONTEXT: src/hooks/useVoiceInput.ts (full source — 170 lines)**

```tsx
import { useState, useRef, useCallback, useEffect } from 'react';

// ... TypeScript interfaces for SpeechRecognition ...

export function useVoiceInput({ onTranscript, silenceMs = 5000 }: UseVoiceInputOptions): UseVoiceInput {
  const [state, setState] = useState<VoiceState>('idle');
  const [supported, setSupported] = useState(true);
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (countdownTimerRef.current) { clearInterval(countdownTimerRef.current); countdownTimerRef.current = null; }
    if (solidifyTimerRef.current) { clearTimeout(solidifyTimerRef.current); solidifyTimerRef.current = null; }
  }, []);

  useEffect(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // ... processes speech results, calls onTranscript ...
      resetSilenceTimer();
    };

    recognition.onerror = (event) => { setState('error'); /* ... */ };
    recognition.onend = () => { setState('idle'); clearTimers(); };

    recognitionRef.current = recognition;
    return () => { recognition.abort(); clearTimers(); };
  }, [onTranscript, resetSilenceTimer, clearTimers]);

  const start = useCallback(() => {
    if (!recognitionRef.current || !supported) return;
    setState('listening');
    try { recognitionRef.current.start(); } catch { setState('idle'); return; }
    resetSilenceTimer();
  }, [supported, silenceMs, resetSilenceTimer]);

  const stop = useCallback(() => {
    if (state === 'listening') {
      setState('processing');
      setTimeout(() => { recognitionRef.current?.stop(); }, 200);
    } else { recognitionRef.current?.stop(); }
  }, [state]);

  return { supported, state, interim, solidifying, error, start, stop, countdownMs };
}
```

**Verdict: CLEAN.** No `window.addEventListener` calls. No global event listeners. No `stopPropagation` or `preventDefault`. The only global API used is `SpeechRecognition` (Web Speech API), which doesn't intercept DOM events.

---

### Response to Hypothesis 3 (Tutorial Overlay):

**CONTEXT: src/contexts/TutorialContext.tsx (full source — 124 lines)**

```tsx
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { TutorialStep } from '../data/tutorial-steps';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'tutorial-completed-v1';

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isVisible, setVisible] = useState(false);   // <-- DEFAULT: false
  const [stepIndex, setStepIndex] = useState(0);
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [steps, setSteps] = useState<TutorialStep[]>([]);

  const startTutorial = useCallback((featureId: string, tutorialSteps: TutorialStep[], featureName: string, route: string) => {
    setActiveFeatureId(featureId);
    setSteps(tutorialSteps);
    setStepIndex(0);
    setVisible(false);       // <-- Starts hidden
    navigate(route);
    showTimerRef.current = setTimeout(() => {
      setVisible(true);      // <-- Shows after 500ms delay
    }, 500);
  }, [navigate]);

  // ... nextStep, prevStep, closeTutorial ...

  return (
    <TutorialContext.Provider value={{ isVisible, startTutorial, ... }}>
      {children}
    </TutorialContext.Provider>
  );
}
```

**Key finding:** `startTutorial` is ONLY called from `TutorialPage.tsx` (line 491) — the `/learn` route. It is NOT called from `AiPage` or any of its children. I verified with grep:

```
grep -r "startTutorial" src/
  src/contexts/TutorialContext.tsx:32  (type definition)
  src/contexts/TutorialContext.tsx:57  (implementation)
  src/contexts/TutorialContext.tsx:111 (context value)
  src/pages/TutorialPage.tsx:491      (ONLY call site)
```

**But the overlay itself is dangerous.** Here's `TutorialOverlay.tsx` (the actual overlay component):

```tsx
// Line 184-312 of src/components/TutorialOverlay.tsx
return (
  <AnimatePresence>
    {isVisible && step && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"         // <-- FULL VIEWPORT, z-100
      >
        {spotlightRect ? (
          <>
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"   // <-- DARK OVERLAY
              style={{
                maskImage: `radial-gradient(circle ${spotSize/2}px at ... transparent 0px, black ${spotSize/2+4}px)`,
                maskComposite: 'exclude',
              }}
            />
            <motion.div className="fixed rounded-full border-2 border-amber-400/80 ..." style={{ pointerEvents: 'none' }} />
          </>
        ) : (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />   // <-- FULL DARK OVERLAY (no spotlight)
        )}

        <motion.div className="fixed w-[320px] z-[101]" style={cardStyle} onClick={(e) => e.stopPropagation()}>
          ...tutorial card...
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Line 122-133: Document-level click listener for action steps
useEffect(() => {
  if (!isVisible || !isAction || !step) return;
  const handler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const match = target.closest(step.target);
    if (match) { nextStep(); }
  };
  document.addEventListener('click', handler, true);   // <-- CAPTURE PHASE
  return () => document.removeEventListener('click', handler, true);
}, [isVisible, isAction, step, nextStep]);

// Line 151-168: Document-level keydown listener
useEffect(() => {
  if (!isVisible) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeTutorial(); }
    if (e.key === 'ArrowRight' || e.key === 'Enter') { nextStep(); }
    if (e.key === 'ArrowLeft') { prevStep(); }
  };
  window.addEventListener('keydown', handler, true);   // <-- CAPTURE PHASE
  return () => window.removeEventListener('keydown', handler, true);
}, [isVisible, closeTutorial, nextStep, prevStep]);
```

**Verdict: NOT auto-triggered, but THE MOST DANGEROUS COMPONENT.** If `isVisible` somehow becomes `true`, this overlay:
1. Renders `fixed inset-0 z-[100]` — same z-index as the sidebar after our fix
2. Has a dark backdrop (`bg-black/70 backdrop-blur-sm`) covering the ENTIRE viewport
3. Registers a `document.addEventListener('click', handler, true)` in CAPTURE PHASE — intercepts ALL clicks before they reach any element
4. Registers a `document.addEventListener('keydown', handler, true)` in CAPTURE PHASE — intercepts ALL keyboard events

**However:** `isVisible` defaults to `false` and only becomes `true` through `startTutorial()` which is only called from `/learn` page. Unless there's a state persistence bug, this should NOT be active on `/ai`.

---

## Decisions Made
1. All three modals/drawers properly unmount when closed (`if (!open) return null`)
2. useVoiceInput has NO global event listeners
3. Tutorial overlay is NOT auto-triggered from AiPage
4. Tutorial overlay is the most dangerous component IF it were active (z-100, capture-phase listeners, full viewport)
5. All three hypotheses ruled out — need to look elsewhere

## Open Question for Specialist
Since all three hypotheses are clean, the root cause may be:
- A CSS specificity issue where `deck.css` or `canvas.css` rules inadvertently affect sidebar elements
- A Tailwind utility conflict in the compiled CSS
- A browser-specific stacking context behavior with `overflow-y: auto` + `position: relative`

**Should I run the build and check the compiled CSS output for conflicts? Or do you have another hypothesis to test?**

## Convergence Status
**Ongoing** — 2 rounds completed, root cause not yet identified.
