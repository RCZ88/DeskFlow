# Round 03 — Specialist Questions + Owner Responses

## Date: 2026-07-27
## Status: In Progress

---

## Specialist's Analysis of Round 2

Ruling out invisible overlays and tutorial overlay was correct. Now looking at "Global Event Hijackers" — hooks that might attach listeners to `window` or `document`.

### New Hypotheses

1. **Slash Command Menu Listener** — `useSlashCommands` might attach `document.addEventListener('click', ...)` to close menu
2. **Canvas Drag Listener** — `useCanvasState` might attach global `pointerdown`/`mousedown` for card dragging
3. **Command Palette Listener** — `CommandPalette` might attach global click listener to dismiss

---

## Owner's Responses

### Response to Hypothesis 1 (useSlashCommands):

**CONTEXT: src/hooks/useSlashCommands.ts (full source — 266 lines)**

```tsx
import { useCallback } from "react"
import type { ChatMsg } from "./useAiChat"
import { findCommand, fillPrompt, getAllCommands, type CustomSlashCommand } from "../services/customSlashCommands"
import { generateUUID } from "../lib/uuid"

export interface SlashCommandResult {
  handled: boolean
  messages?: ChatMsg[]
  shouldSendToAI?: boolean
  promptToSend?: string
}

export interface SlashCommandContext {
  connectors: any[]
  currentThreadDate: string
}

export function useSlashCommands() {
  const parseAndExecute = useCallback(async (
    text: string,
    ctx: SlashCommandContext
  ): Promise<SlashCommandResult> => {
    const trimmed = text.trim()
    if (!trimmed.startsWith("/")) return { handled: false }

    const [command, ...args] = trimmed.slice(1).split(" ")
    const argStr = args.join(" ").trim()

    switch (command.toLowerCase()) {
      case "unread": return await handleUnread(ctx)
      case "inbox": return await handleInbox(ctx, argStr)
      case "calendar": return await handleCalendar(ctx, argStr)
      case "today": return await handleToday(ctx)
      case "sync": return await handleSync(ctx, argStr)
      case "email": return await handleEmailSearch(ctx, argStr)
      case "plan": return { handled: true, shouldSendToAI: true }
      case "digest": return { handled: true, shouldSendToAI: true }
      case "reflect": return { handled: true, shouldSendToAI: true }
      case "focus": return { handled: true, shouldSendToAI: true }
      default:
        const custom = findCommand(command.toLowerCase())
        if (custom) {
          const prompt = fillPrompt(custom.prompt, argStr)
          return { handled: true, shouldSendToAI: true, promptToSend: prompt }
        }
        return { handled: true, messages: [makeAssistantMsg(`Unknown command: /${command}`)] }
    }
  }, [])

  return { parseAndExecute }
}

// ... handler functions (handleUnread, handleInbox, etc.) are pure async functions
// that call window.deskflowAPI and return results. No event listeners.
```

**Verdict: CLEAN.** Pure function hook. Zero `addEventListener` calls. Zero event listeners. Just parses slash command text and returns results. The hook has NO side effects on the DOM.

---

### Response to Hypothesis 2 (useCanvasState):

**CONTEXT: src/hooks/useCanvasState.ts (full source — 165 lines)**

```tsx
import { useReducer, useState, useCallback, useEffect, useRef } from 'react'
import { canvasReducer, DEFAULT_STATE } from '../types/canvas'
import { loadCanvasLayout, saveCanvasLayout } from '../services/canvasPersistence'
import { generateUUID } from '../lib/uuid'
import type { CanvasCard, CanvasState, CardStatus, CardType, CanvasGroup } from '../types/canvas'

const DISMISS_TIMEOUT_MS = 30_000

export function useCanvasState() {
  const [state, dispatch] = useReducer(canvasReducer, null, () => {
    return loadCanvasLayout() || DEFAULT_STATE
  })
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Debounced persist — saves to localStorage on state change
  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      setSaveStatus('saving')
      try {
        saveCanvasLayout(state)
        setSaveStatus('saved')
      } catch { setSaveStatus('error') }
    }, 500)
    return () => { if (persistTimer.current) clearTimeout(persistTimer.current) }
  }, [state.cards, state.groups])

  // Cleanup dismiss timers on unmount
  useEffect(() => {
    return () => { dismissTimers.current.forEach(t => clearTimeout(t)); dismissTimers.current.clear() }
  }, [])

  const addCard = useCallback((type, data, opts?) => {
    const id = generateUUID()
    const card = { id, type, position: opts?.position ?? { x: 40, y: 40 }, size: opts?.size ?? { w: 8, h: 5 }, zIndex: 0, pinned: opts?.pinned ?? false, data, source: opts?.source ?? 'ai', status: 'live', createdAt: Date.now() }
    dispatch({ type: 'ADD_CARD', card })
    if (!card.pinned) {
      const timer = setTimeout(() => { dispatch({ type: 'DISMISS_CARD', id }) }, DISMISS_TIMEOUT_MS)
      dismissTimers.current.set(id, timer)
    }
    return id
  }, [])

  // ... other state operations: updateCard, removeCard, moveCard, resizeCard, pinCard, etc.
  // ALL are pure dispatch wrappers. NO event listeners.

  return { cards, allCards: state.cards, groups, nextZIndex: state.nextZIndex, saveStatus, addCard, updateCard, removeCard, moveCard, resizeCard, pinCard, dismissCard, setStatus, resetLayout, arrangeCards, createGroup, deleteGroup, addToGroup, removeFromGroup }
}
```

**Verdict: CLEAN.** Pure state management hook using `useReducer`. Zero `addEventListener` calls. Zero global event listeners. All operations are dispatch wrappers. The only side effect is debounced localStorage persistence.

---

### Response to Hypothesis 3 (CommandPalette):

**CONTEXT: src/components/ai/canvas/CommandPalette.tsx (full source — 139 lines)**

```tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Command, ArrowRight, Zap } from 'lucide-react'
import { parseIntent, getSuggestions, type Intent } from '../../../services/intentParser'
import './canvas.css'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onIntent: (intent: Intent) => void
}

export function CommandPalette({ open, onClose, onIntent }: CommandPaletteProps) {
  const [input, setInput] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) { setInput(''); setSelectedIndex(0); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  // ... keyboard handler (Enter, Escape, ArrowUp/Down) — scoped to input element

  if (!open) return null    // <-- LINE 83: EARLY RETURN WHEN CLOSED

  return (
    <div className="dk-cmd-overlay" onClick={onClose}>         // <-- Overlay: plain div, NO global listener
      <div className="dk-cmd-palette-new" onClick={e => e.stopPropagation()}>
        ...palette content...
      </div>
    </div>
  )
}
```

**Additional finding — `dk-cmd-overlay` CSS class is UNDEFINED:**

I searched all CSS files in the project:
```
grep -r "dk-cmd-overlay" src/**/*.css
  (no results)
```

The `dk-cmd-overlay` class has NO CSS definition. This means the overlay div is:
- Not `position: fixed`
- Not `inset: 0`
- Not full-viewport
- Just a plain unstyled div

**Verdict: CLEAN.** Line 83: `if (!open) return null;` — returns nothing when closed. When open, the overlay is a plain unstyled div (no CSS for `dk-cmd-overlay`). No global event listeners. No `stopPropagation` on document level.

---

## Summary — All 6 Hypotheses Ruled Out

| # | Hypothesis | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | Invisible modal backdrop | ✅ CLEAN | All modals use `if (!open) return null` |
| 2 | Global event listener hijacking | ✅ CLEAN | useVoiceInput has zero addEventListener |
| 3 | Tutorial overlay | ✅ CLEAN | Only triggered from /learn page |
| 4 | Slash command listener | ✅ CLEAN | Pure function hook, zero DOM side effects |
| 5 | Canvas drag listener | ✅ CLEAN | Pure useReducer hook, zero event listeners |
| 6 | Command palette listener | ✅ CLEAN | `if (!open) return null`, unstyled overlay |

## Root Cause Analysis

After 3 rounds of investigation, ALL JavaScript-level hypotheses have been ruled out. The root cause is most likely **CSS stacking context behavior**, specifically:

1. The AI page's `dk-root` has `position: relative; overflow: hidden; height: 100%`
2. The `dk-wrap` inside it has `position: relative; overflow-y: auto`
3. The canvas viewport (`dk-canvas-viewport`) has `position: absolute; inset: 0`
4. These nested positioned elements create stacking contexts that, in certain browsers, can trap pointer events within the main content area

**The fix already applied (z-20 → z-[100]) addresses this** by ensuring the sidebar sits above all content-area stacking contexts.

## Convergence Status
**Ready for RESULT.md** — All hypotheses exhausted. Fix applied and built. Needs user verification.
