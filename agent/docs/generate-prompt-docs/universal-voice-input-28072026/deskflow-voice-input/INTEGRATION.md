# DeskFlow Universal Voice Input — Integration Guide

## Quick Start

### 1. Wrap your app with `VoiceProvider`

```tsx
// src/App.tsx or root layout
import { VoiceProvider } from './context/VoiceContext';

function App() {
  return (
    <VoiceProvider>
      {/* ... rest of app */}
    </VoiceProvider>
  );
}
```

### 2. Replace inputs on key pages

**For pages using raw `<input>`:**

```tsx
// Before
<input
  value={name}
  onChange={e => setName(e.target.value)}
  className="..."
/>

// After
import { VoiceInput } from '@/components/ui/voice-input';

<VoiceInput
  value={name}
  onChange={e => setName(e.target.value)}
  className="..."
/>
```

**For pages using raw `<textarea>`:**

```tsx
// Before
<textarea
  value={bio}
  onChange={e => setBio(e.target.value)}
  className="..."
/>

// After
import { VoiceTextarea } from '@/components/ui/voice-textarea';

<VoiceTextarea
  value={bio}
  onChange={e => setBio(e.target.value)}
  className="..."
/>
```

**For the existing AI Chat (`ChatInput.tsx`):**

The existing `useVoiceInput` hook is **backwards-compatible**. Keep the existing wiring but wrap the textarea:

```tsx
// In ChatInput.tsx
import { VoiceInputWrapper } from '@/components/VoiceInputWrapper';

<VoiceInputWrapper>
  <textarea
    ref={textareaRef}
    value={input}
    onChange={handleInputChange}
    // ... existing props
  />
</VoiceInputWrapper>
```

Or keep the existing `VoiceInputButton` + `useVoiceInput` pair — the hook detects if `VoiceProvider` is present and uses global state; otherwise falls back to local state.

### 3. Bulk migration script (30+ pages)

For rapid migration across all 30+ pages, use find-and-replace patterns:

| Pattern | Replacement |
|---------|-------------|
| `<input {...props} />` (controlled) | `<VoiceInput {...props} />` |
| `<textarea {...props} />` (controlled) | `<VoiceTextarea {...props} />` |
| `import { Input } from "@/components/ui/input"` | `import { VoiceInput } from "@/components/ui/voice-input"` |

For uncontrolled inputs, wrap with `<VoiceInputWrapper>` instead.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         VoiceProvider                           │
│              (Global singleton — one mic at a time)             │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌─────────────────┐    ┌──────────────┐
│  useVoiceInput │    │ useAudioVisualizer│    │ VoiceContext │
│  (Speech API)  │    │  (Web Audio API)  │    │  (Global state)│
└───────────────┘    └─────────────────┘    └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                   ┌────────────────────┐
                   │ VoiceInputWrapper  │
                   │  (HOC / Wrapper)   │
                   └────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │VoiceInput│   │VoiceTextarea│  │VoiceFloatingPanel│
        │ (shadcn) │   │ (native)  │   │  (Glass UI)    │
        └──────────┘   └──────────┘   └──────────────┘
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **React Context (not Zustand)** | Already have React; zero deps. Context is sufficient for single global state. |
| **Backwards-compatible hook** | Existing AI Chat code continues working without changes. |
| **AudioContext per session** | Created on start, destroyed on stop. No persistent mic permission. |
| **Logarithmic frequency spacing** | Human hearing is logarithmic; bars feel more "musical" and responsive. |
| **Lerp smoothing (0.3 factor)** | Prevents jittery bars while maintaining responsiveness. |
| **Synthetic event dispatch** | Allows controlled components to receive voice-inserted text via their `onChange`. |
| **Sentence boundary split** | Natural undo granularity — users expect backspace to remove a full thought. |
| **Glass morphism panel** | Matches DeskFlow's existing design language (`bg-zinc-900/95 backdrop-blur-xl`). |

---

## Anti-Slop Verification

- ✅ **Clay palette** — `#e8866b` (clay-400) and `#d96846` (clay-500) throughout
- ✅ **Varied radii** — mic `rounded-lg` (8px), panel `rounded-xl` (12px)
- ✅ **Empty states** — "Listening…" placeholder when no interim text
- ✅ **Error states** — Auto-recovery after 1.2s, descriptive messages
- ✅ **Motion** — Pulse ring, sound wave bars, panel slide-in, border beam
- ✅ **Lucide icons only** — `Mic`, `MicOff`, `Backspace`, `Square`, `Loader2`, `AlertCircle`
- ✅ **Accessibility** — `aria-label`, `aria-pressed`, `aria-live="polite"`, `Escape` to stop
- ✅ **Dark mode only** — No light mode variants
- ✅ **Geist + JetBrains Mono** — Timer uses `font-mono`
- ✅ **Glass morphism** — `bg-zinc-900/95 backdrop-blur-xl border-zinc-700/50`
- ✅ **Zero npm deps** — Web Speech API + Web Audio API only
- ✅ **Single mic instance** — Global context enforces this
- ✅ **localStorage persistence** — `voice-lang` key
- ✅ **No GSAP / no next-themes** — Framer Motion only, no MagicCard

---

## Files Created / Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/voice-utils.ts` | **New** | ~140 |
| `src/context/VoiceContext.tsx` | **New** | ~120 |
| `src/hooks/useAudioVisualizer.ts` | **New** | ~170 |
| `src/hooks/useVoiceInput.ts` | **Rewrite** | ~280 |
| `src/components/ui/border-beam.tsx` | **New** | ~50 |
| `src/components/VoiceMicButton.tsx` | **New** | ~140 |
| `src/components/SoundWaveVisualizer.tsx` | **New** | ~60 |
| `src/components/VoiceFloatingPanel.tsx` | **New** | ~130 |
| `src/components/VoiceInputWrapper.tsx` | **New** | ~180 |
| `src/components/ui/voice-input.tsx` | **New** | ~35 |
| `src/components/ui/voice-textarea.tsx` | **New** | ~45 |
| `src/components/ui/textarea.tsx` | **New** | ~30 |
| `src/index.css` | **Append** | ~80 |
| `INTEGRATION.md` | **New** | — |
