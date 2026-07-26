# CONTEXT_BUNDLE.md — AI Page UI Overhaul (Complete Source Code)

## Files to Modify

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/ai/canvas/canvas.css` | 679 | Canvas grid, cards, input, rail, all canvas styles |
| `src/components/ai/canvas/CanvasGrid.tsx` | 31 | Grid rendering, card layout |
| `src/components/ai/canvas/CanvasInput.tsx` | 80 | Input bar at bottom |
| `src/components/ai/canvas/CanvasCard.tsx` | ~170 | Card rendering, drag, error boundary |
| `src/components/ai/deck/deck.css` | 1340 | All deck mode styles |
| `src/components/ai/deck/AiPageDeck.tsx` | ~475 | Deck layout |
| `src/pages/AiPage.tsx` | ~1450 | Mode toggle, container |

---

## 1. Canvas Grid — `src/components/ai/canvas/canvas.css` (FULL)

```css
/* ═══ Canvas Grid ═══ */
.dk-canvas-grid {
  position: relative;
  width: 100%;
  min-height: 100%;
  background-color: var(--bg, #09090b);  /* ← NEAR BLACK */
  background-image:
    radial-gradient(ellipse at 20% 50%, rgba(34, 211, 238, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(167, 139, 250, 0.03) 0%, transparent 50%),
    linear-gradient(rgba(63, 63, 70, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(63, 63, 70, 0.06) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;
  overflow: auto;  /* ← NO PAN/ZOOM, just scroll */
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(63, 63, 70, 0.2);  /* ← VERY FAINT */
}

/* Card base */
.dk-canvas-card {
  background: rgba(9, 9, 11, 0.6);  /* ← NEAR BLACK, 60% opacity */
  backdrop-filter: blur(12px);
  border: 1px solid rgba(63, 63, 70, 0.3);  /* ← FAINT */
  border-radius: 12px;
  cursor: grab;
  user-select: none;
}
.dk-canvas-card:hover {
  border-color: rgba(63, 63, 70, 0.5);
  box-shadow: 0 0 30px rgba(34, 211, 238, 0.04), 0 4px 20px rgba(0, 0, 0, 0.3);
}
.dk-canvas-card.dragging {
  cursor: grabbing;
  border-color: #22d3ee;
  box-shadow: 0 0 40px rgba(34, 211, 238, 0.1), 0 8px 32px rgba(0, 0, 0, 0.4);
  transform: scale(1.02);
}

/* Card body */
.dk-canvas-card-body {
  padding: 14px;
  font-size: 13px;
  line-height: 1.5;
  color: #a1a1aa;  /* ← MUTED, hard to read on dark bg */
}

/* Input bar */
.dk-canvas-input-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  width: 560px;
  max-width: 90vw;
}
.dk-canvas-input-inner {
  background: rgba(9, 9, 11, 0.8);  /* ← NEAR BLACK */
  border: 1px solid rgba(63, 63, 70, 0.4);
  border-radius: 14px;
}
.dk-canvas-input::placeholder { color: #27272a; }  /* ← INVISIBLE on dark bg */

/* Input hints — COMPLETELY INVISIBLE */
.dk-canvas-input-hint {
  font-size: 10px;
  color: #18181b;  /* ← BLACK TEXT ON NEAR-BLACK BG = INVISIBLE */
  font-family: 'JetBrains Mono', monospace;
}
```

## 2. Canvas Grid Component — `src/components/ai/canvas/CanvasGrid.tsx`

```tsx
import { CanvasCard } from './CanvasCard'
import type { CanvasCard as CanvasCardType } from '../../../types/canvas'
import './canvas.css'

interface CanvasGridProps {
  cards: CanvasCardType[]
  onMoveCard: (id: string, position: { x: number; y: number }) => void
  onDismissCard: (id: string) => void
}

export function CanvasGrid({ cards, onMoveCard, onDismissCard }: CanvasGridProps) {
  return (
    <div className="dk-canvas-grid">
      {cards.length === 0 && (
        <div className="dk-canvas-empty">
          <span>Cards will appear here as you interact with the AI</span>
        </div>
      )}
      {cards
        .sort((a, b) => a.zIndex - b.zIndex)
        .map(card => (
          <CanvasCard
            key={card.id}
            card={card}
            onDragEnd={onMoveCard}
            onDismiss={onDismissCard}
          />
        ))}
    </div>
  )
}
```

**NO pan/zoom. NO infinite canvas. Just a scrollable div with absolute-positioned cards.**

## 3. Canvas Input — `src/components/ai/canvas/CanvasInput.tsx`

```tsx
export function CanvasInput({ onSend, onStop, streaming, thinking, voice }: CanvasInputProps) {
  return (
    <div className="dk-canvas-input-bar">
      <div className="dk-canvas-input-inner">
        <input placeholder="Ask anything, or type / for commands..." className="dk-canvas-input" />
        <button className="dk-canvas-input-btn send"><Send size={16} /></button>
      </div>
      <div className="dk-canvas-input-hint">
        <span>Ctrl+K commands</span>
        <span>Enter send</span>
        <span>Esc close palette</span>
      </div>
    </div>
  )
}
```

## 4. Deck CSS — `src/components/ai/deck/deck.css` (KEY SECTIONS)

```css
:root {
  --canvas: #09090b;
  --surface: rgba(24,24,27,.72);
  --surface-2: #151518;
  --surface-3: rgba(30,30,34,.85);
  --raised: rgba(39,39,42,.7);
  --line: rgba(255,255,255,.07);
  --line-2: rgba(255,255,255,.12);
  --tp: #fafafa;
  --ts: rgba(250,250,250,.60);
  --tm: rgba(250,250,250,.38);
  --pink: #ec4899;
  --cyan: #22d3ee;
  --violet: #a78bfa;
}

.dk-root {
  background:
    radial-gradient(1400px 600px at 85% -10%, rgba(236,72,153,.10), transparent 65%),
    radial-gradient(1000px 500px at 5% -5%, rgba(167,139,250,.08), transparent 60%),
    radial-gradient(800px 400px at 50% 120%, rgba(34,211,238,.05), transparent 50%),
    var(--canvas);
  height: 100%;
  overflow: hidden;
}

.dk-wrap {
  max-width: 1400px;  /* ← CONSTRAINED */
  padding: 20px 32px 32px;
}

.dk-chat-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  height: calc(100vh - 200px);  /* ← MAGIC NUMBER */
}

/* Input area */
.dk-input-wrap {
  background: var(--surface-2);  /* #151518 */
  border: 1px solid var(--line);  /* rgba(255,255,255,.07) — VERY FAINT */
}
.dk-input-wrap:focus-within {
  border-color: var(--zm);  /* ← UNDEFINED VARIABLE — BROKEN */
  box-shadow: 0 0 0 3px rgba(161,161,170,.08);
}
.dk-textarea {
  color: var(--tp);
  font-family: var(--sans);
  font-size: 14px;
  placeholder: var(--tm);  /* rgba(250,250,250,.38) — FAINT */
}
.dk-send {
  background: var(--pink);  /* #ec4899 — PINK */
}
```

## 5. Transcript Rail Toggle — `src/components/ai/canvas/canvas.css`

```css
/* FLOATING BUTTON — confusing, should be removed */
.dk-rail-toggle {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #111118;
  border: 1px solid #1e1e2a;
  color: #71717a;
  z-index: 150;
}
.dk-rail-badge {
  position: absolute;
  top: -4px; right: -4px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #22d3ee;
}
```

## 6. Canvas Card Sizes (CELL = 40px)

Cards are positioned absolutely with `transform: translate(x, y)`:
- Focus: `{w:8,h:6}` = 320×240px at (40,40)
- Plan: `{w:8,h:6}` = 320×240px at (400,40)
- Finance: `{w:6,h:4}` = 240×160px at (40,320)
- Digest: `{w:6,h:4}` = 240×160px at (320,320)
- Reflect: `{w:6,h:4}` = 240×160px at (320,600)
- Schedule: `{w:14,h:10}` = 560×400px at (600,40)
- Deadlines: `{w:6,h:8}` = 240×320px at (600,520)
- Planner: `{w:8,h:8}` = 320×320px at (40,760)
- Connectors: `{w:10,h:8}` = 400×320px at (40,40)

**Total canvas area needed: ~1200×1100px minimum. At 1920×1080 viewport with header, this overflows.**

## 7. Auto-Save

`src/services/canvasPersistence.ts` — saves to localStorage via `saveCanvasLayout(state)` with 500ms debounce. No visual feedback. No "Saving..." indicator. No "Saved" confirmation.

## 8. Canvas State

```ts
// src/types/canvas.ts
export type CardType = 'focus' | 'plan' | 'reflect' | 'finance' | 'digest' | 'approval' | 'transient' | 'annotation' | 'response' | 'group' | 'connectors' | 'schedule' | 'deadlines' | 'planner'

export interface CanvasCard {
  id: string
  type: CardType
  position: { x: number; y: number }
  size: { w: number; h: number }
  zIndex: number
  pinned: boolean
  data: Record<string, any>
  source: 'ai' | 'user' | 'system'
  status: CardStatus
  createdAt: number
  dismissedAt?: number
}
```

## 9. Mode Toggle in AiPage.tsx

```tsx
const [canvasMode, setCanvasMode] = useState(true);

// Canvas mode (default):
{canvasMode ? (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
    <div style={{ flex: 1, minHeight: 500 }}>
      <CanvasGrid cards={canvas.cards} onMoveCard={canvas.moveCard} onDismissCard={canvas.dismissCard} />
    </div>
    <CanvasInput onSend={handleSend} onStop={chat.stop} streaming={chat.streaming} thinking={chat.thinking} voice={voice} />
  </div>
) : (
  // Deck mode:
  <AiPageDeck ... />
)}
```

## 10. CSS Color Audit — What's Wrong

| Element | Current Color | Problem |
|---------|--------------|---------|
| Canvas bg | `#09090b` | Near-black, invisible |
| Card bg | `rgba(9,9,11,0.6)` | Near-black at 60% |
| Card border | `rgba(63,63,70,0.3)` | Nearly invisible |
| Card body text | `#a1a1aa` | Muted on dark bg |
| Input bg | `rgba(9,9,11,0.8)` | Near-black |
| Input placeholder | `#27272a` | Invisible on dark |
| Input hints | `#18181b` | BLACK on near-black = INVISIBLE |
| Deck input bg | `#151518` | Very dark |
| Deck input border | `rgba(255,255,255,.07)` | Nearly invisible |
| Focus ring | `var(--zm)` | UNDEFINED — BROKEN |
| Deck chat card | `height: calc(100vh - 200px)` | Magic number |

## 11. Transcript Rail (to REMOVE)

The floating toggle button at bottom-right opens a side panel for chat history. The user says this is confusing and unnecessary. The chat should only be in Deck mode. Remove:
- `.dk-rail-toggle` button from CanvasInput or AiPage
- The rail toggle state and rendering
- Keep the rail CSS for Deck mode if needed
