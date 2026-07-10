# CONTEXT_BUNDLE — Layout Deck Fix

> Self-contained reference for the target AI. All relevant code, data shapes, and architecture are documented here.

---

## 1. File Map

| File | Role |
|------|------|
| `src/components/ai/deck/AiPageDeck.tsx` | Layout shell — topbar, grid (2 cols), strip, foot |
| `src/components/ai/deck/deck.css` | All deck CSS — root, grid, strip, cards, chat, metrics |
| `src/components/ai/chat/ChatPanel.tsx` | Chat panel — messages scroll + input at bottom |
| `src/components/ai/chat/ChatEmptyState.tsx` | Welcome/empty state ("How can I help?") |
| `src/pages/AiPage.tsx` | Consumer — wires deck with digest, focus, plan, reflect |

---

## 2. Layout Architecture (current)

```
.dk-root (position:relative; min-height:100%; padding:28px 34px 40px; overflow-x:hidden)
  .dk-wrap (max-width:1372px; margin:0 auto; position:relative)
    .dk-topbar (flex, fixed height ~50px)
    .dk-grid (display:grid; grid-template-columns: 1fr 400px; gap:20px)
      .dk-col (left — ChatPanel)
        .dk-microlabel
        .dk-card.dk-acc.dk-pink.dk-deck (ChatPanel)
          .dk-deckhead (fixed ~50px)
          .dk-stream (flex:1; overflow-y:auto; padding:20px 18px)
            messages or ChatEmptyState
          AgentProgressBar + ChatInput (at bottom, ~60px)
      .dk-col (right)
        .dk-microlabel
        glance metrics card
        digestSlot (DailyDigestBoard)
        connectorsSlot
        QuickCommands
    .dk-strip (display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px; margin-top:20px)
      Focus, Plan, Reflect cards
    .dk-foot (text-align:center; margin-top:26px)
```

## 3. CSS (deck.css) — Key Lines

```css
/* Lines 8-14: .dk-root */
.dk-root {
  position:relative; min-height:100%; overflow-x:hidden;
  padding:28px 34px 40px;
  /* gradient backgrounds + background grid pattern via ::before */
}

/* Line 19: .dk-wrap */
.dk-wrap{max-width:1372px;margin:0 auto;position:relative}

/* Line 21: .dk-topbar */
.dk-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:26px}

/* Lines 35-36: .dk-grid */
.dk-grid{display:grid;grid-template-columns:1fr 400px;gap:20px}
.dk-grid > *{min-width:0}

/* Line 37: .dk-col */
.dk-col{display:flex;flex-direction:column;gap:20px}

/* Line 50: .dk-deck */
.dk-deck{padding:0;flex:1}

/* Line 55: .dk-stream (messages area) */
.dk-stream{padding:20px 18px;display:flex;flex-direction:column;gap:18px}

/* Lines 118-124: .dk-cmd (input) */
.dk-cmd{margin:4px 14px 16px;border:1px solid var(--line-2);border-radius:13px;
  background:rgba(10,10,12,.7);padding:11px 12px 11px 14px;
  display:flex;align-items:center;gap:11px}

/* Line 148: .dk-strip */
.dk-strip{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:20px}
.dk-strip > *{min-width:0}

/* Lines 165-171: responsive */
@media (max-width:1024px){
  .dk-grid{grid-template-columns:1fr}
  .dk-strip{grid-template-columns:1fr}
}
```

## 4. ChatPanel.tsx — Structure

```tsx
// Lines 81-146
<div className="dk-card dk-acc dk-pink dk-deck" style={{ display: "flex", flexDirection: "column" }}>
  <div className="dk-deckhead">  // ← fixed header
    <span>DeskFlow Assistant</span>
    <status chip + clear button />
  </div>

  <div ref={scrollRef} onScroll={onScroll} className="dk-stream" style={{ flex: 1, overflowY: "auto" }}>
    {empty ? <ChatEmptyState /> : messages.map(...)}
    {thinking ? <ThinkingIndicator /> : null}
  </div>

  <div style={{ padding: "0 0 4px" }}>  // ← bottom area
    <AgentProgressBar />
    <ChatInput />
  </div>
</div>
```

## 5. ChatEmptyState.tsx

```tsx
// Renders "How can I help?" with suggestion chips
export function ChatEmptyState({ suggestions, onPick }: {
  suggestions?: ChatSuggestion[]
  onPick?: (text: string) => void
})
```

## 6. Design Tokens (from deck.css)

```
--canvas:#09090b           (page background)
--surface:rgba(24,24,27,.72) (card surface)
--surface-2:#151518        (deeper surface)
--raised:rgba(39,39,42,.7) (elevated)
--line:rgba(255,255,255,.07) (subtle border)
--line-2:rgba(255,255,255,.12) (visible border)
--tp:#fafafa              (primary text)
--ts:rgba(250,250,250,.60) (secondary text)
--tm:rgba(250,250,250,.38) (muted text)
Accents: --pink, --emerald, --amber, --violet, --cyan, --red
Fonts: --mono (JetBrains Mono), --sans (Inter)
```
