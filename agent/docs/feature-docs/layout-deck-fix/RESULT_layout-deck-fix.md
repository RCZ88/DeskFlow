# RESULT — Layout Deck Fix

**Session:** AI Command Deck — Vertical Fill + Bottom-Anchored Chat
**Role:** Lead Designer & Engineer
**Scope:** `deck.css`, `ChatPanel.tsx` (+ tiny `ChatEmptyState` usage). No new deps. All `dk-` tokens & `.dk-card`/`.dk-acc` preserved.

---

## 0. Root cause (why the gap exists)

`.dk-root` is `min-height:100%` and `.dk-grid` is a plain CSS grid whose **row height collapses to its tallest content**. The chat card (`.dk-deck{flex:1}`) has nothing to be `flex:1` *of* — its parent `.dk-col` only grows to content height, and the grid row only grows to the taller column. So:

- The left card height = whatever the messages happen to be → short → **huge gap** down to `.dk-strip`.
- The input sits at the bottom of that short card, but the *page* is tall (right rail is long), so the input ends up **below the fold** → user scrolls to type.
- `ChatEmptyState` renders first-child in a `flex-start` column → **“How can I help?” pinned to the top**, far from the input.

**Fix:** make the page a real viewport-height flex column so `.dk-grid` receives the leftover height, stretch both columns to that height, and let the chat card be a 3-row flex (header / scrolling stream / pinned input). Anchor the empty state to the bottom of the stream.

---

## 1. CSS changes (`deck.css`) — diff

```diff
 /* Lines 8-14: .dk-root */
 .dk-root {
-  position:relative; min-height:100%; overflow-x:hidden;
+  position:relative; overflow-x:hidden;
+  display:flex; flex-direction:column;   /* page becomes a vertical stack */
+  min-height:100vh;                      /* fill the viewport, not just content */
   padding:28px 34px 40px;
   /* gradient backgrounds + background grid pattern via ::before */
 }

 /* Line 19: .dk-wrap */
-.dk-wrap{max-width:1372px;margin:0 auto;position:relative}
+.dk-wrap{max-width:1372px;margin:0 auto;position:relative;width:100%;
+  flex:1;min-height:0;display:flex;flex-direction:column}

 /* Line 21: .dk-topbar */
-.dk-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:26px}
+.dk-topbar{display:flex;align-items:center;justify-content:space-between;
+  margin-bottom:26px;flex:none}            /* never grows/shrinks */

 /* Lines 35-36: .dk-grid */
-.dk-grid{display:grid;grid-template-columns:1fr 400px;gap:20px}
+.dk-grid{display:grid;grid-template-columns:1fr 420px;gap:20px;
+  flex:1;min-height:0;align-items:stretch} /* fills space between topbar & strip */
 .dk-grid > *{min-width:0}
+.dk-grid > *{min-height:0}                  /* allow inner scroll areas to size */

 /* Line 37: .dk-col */
-.dk-col{display:flex;flex-direction:column;gap:20px}
+.dk-col{display:flex;flex-direction:column;gap:20px;min-height:0}

 /* Line 50: .dk-deck (the chat card) */
-.dk-deck{padding:0;flex:1}
+.dk-deck{padding:0;flex:1;min-height:0;display:flex;flex-direction:column}

 /* Line 55: .dk-stream (messages area) */
-.dk-stream{padding:20px 18px;display:flex;flex-direction:column;gap:18px}
+.dk-stream{padding:20px 18px;display:flex;flex-direction:column;gap:18px;
+  flex:1;min-height:0;overflow-y:auto}     /* takes all space + scrolls */
+/* empty state: push “How can I help?” to the bottom, next to the input */
+.dk-stream.dk-stream--empty{justify-content:flex-end}
+/* pinned command bar wrapper (was an inline-styled div) */
+.dk-cmdbar{flex:none}

 /* Line 148: .dk-strip */
-.dk-strip{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:20px}
+.dk-strip{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:20px;flex:none}
 .dk-strip > *{min-width:0}

+/* .dk-foot never grows */
+.dk-foot{flex:none}
```

### Design task — card weight + bigger digest (append to `deck.css`)

```diff
+/* ---- heavier cards (more padding + a stronger, still-subtle edge) ---- */
+.dk-card{border-color:var(--line-2)}                 /* was --line: brighter edge */
+.dk-card::after{content:"";position:absolute;inset:0;border-radius:16px;
+  pointer-events:none;box-shadow:0 1px 2px rgba(0,0,0,.35),0 10px 30px rgba(0,0,0,.22)}
+.dk-sec{padding:18px 18px}                            /* was 15px 16px */
+.dk-glancegrid{gap:12px}
+.dk-metric{padding:14px 15px}                         /* was 12px 13px */
+
+/* ---- right rail: let the digest be the dominant, space-filling card ---- */
+.dk-col .dk-digest{flex:1;min-height:0;display:flex;flex-direction:column}
+.dk-col .dk-digest .dk-digest-body{flex:1;min-height:0;overflow-y:auto}
+/* glance stays compact, quick-commands/connectors stay natural height,
+   digest absorbs the remaining column height so both columns end level */
```

> **Why `1fr 420px` (was `400px`):** the rail now carries the visually-dominant digest; +20px gives it enough measure for headline + stats rows without wrapping. Purely cosmetic — revert to `400px` if you prefer.

---

## 2. TSX changes (`ChatPanel.tsx`) — diff

The current markup caps height via inline styles (`style={ {285} }`, `{286}`, `{287}` in the bundle). Remove those inline height caps and let the flex layout own sizing. Anchor the empty state and give the input wrapper a class.

```diff
-<div className="dk-card dk-acc dk-pink dk-deck" style={ { /* fixed/max height */ } }>
+<div className="dk-card dk-acc dk-pink dk-deck">
   <div className="dk-deckhead">
     <span>DeskFlow Assistant</span>
     {/* status chip + clear button */}
   </div>

-  <div ref={scrollRef} onScroll={onScroll} className="dk-stream" style={ { /* height */ } }>
-    {empty ? <ChatEmptyState suggestions={suggestions} onPick={onPick} /> : messages.map(renderMsg)}
-    {thinking ? <ThinkingIndicator /> : null}
-  </div>
+  <div
+    ref={scrollRef}
+    onScroll={onScroll}
+    className={`dk-stream${empty ? " dk-stream--empty" : ""}`}
+  >
+    {empty
+      ? <ChatEmptyState suggestions={suggestions} onPick={onPick} />
+      : messages.map(renderMsg)}
+    {thinking ? <ThinkingIndicator /> : null}
+  </div>

-  <div style={ { /* bottom area */ } }>
+  <div className="dk-cmdbar">
     <AgentProgressBar />
     <ChatInput />
   </div>
 </div>
```

**Behavioral notes (all preserved):**
- `scrollRef` + `onScroll` untouched → your “scrolled up / jump to latest” logic still works.
- Auto-scroll-to-bottom effect still works: `.dk-stream` is the scroll container; `scrollTop = scrollHeight` behaves identically now that it has a real bounded height.
- Streaming/thinking indicators unaffected.
- When messages exist, the stream is `flex:1` and scrolls; when empty, `dk-stream--empty` flips it to `justify-content:flex-end` so the welcome + suggestion chips sit **just above the input**.

### Right rail wiring (`AiPageDeck.tsx` / `AiPage.tsx`) — one class add

Give the digest slot the `dk-digest` class so it absorbs remaining column height, and mark its scrollable body:

```diff
-<div className="dk-card dk-acc dk-cyan dk-sec">{digestSlot}</div>
+<div className="dk-card dk-acc dk-cyan dk-sec dk-digest">
+  {/* SectionHead stays fixed; wrap the list in dk-digest-body so only it scrolls */}
+  {digestSlot}
+</div>
```

Inside `DailyDigestBoard`, wrap the card grid/list in `<div className="dk-digest-body">…</div>` (the header/SectionHead stays outside it, pinned).

---

## 3. Responsive (≤ 1024px) — verify, no breakage

The existing media query already collapses to one column. Add two lines so the viewport-fill logic relaxes on mobile (stacked content should scroll the page normally, not trap the chat in a short box):

```diff
 @media (max-width:1024px){
   .dk-grid{grid-template-columns:1fr}
   .dk-strip{grid-template-columns:1fr}
+  .dk-grid{flex:none;min-height:0}          /* stack naturally, page scrolls */
+  .dk-deck{min-height:70vh}                  /* chat still gets real height */
 }
```

At narrow widths: rail drops under the chat, chat keeps a usable `70vh`, input stays reachable, reading order preserved.

---

## 4. Final layout (mockup description)

```
┌─ viewport (100vh) ─────────────────────────────────────┐
│ TOPBAR  DeskFlow AI // command deck        [mode][prov][live]  │ flex:none
├──────────────────────────────┬─────────────────┤
│ CHAT DECK (fills height)          │ RAIL (equal height)     │ flex:1
│  ╭─ deckhead (fixed) ────────╮  │  glance (compact)       │ min-height:0
│  │ messages…            ░↑scroll│  ╭──────────────────╮  │
│  │  ▲ stream = flex:1     ░      │  │ DAILY DIGEST      │  │  ← now the
│  │                       ░      │  │ (flex:1, fills)   │  │     dominant
│  │  [empty state sits ───────┐  │  │ news cards… scroll │  │     rail card
│  │   at BOTTOM when no  ↓      │  ╰──────────────────╯  │
│  │   messages]                 │  connectors             │
│  ╰─ ›_ input (pinned, ALWAYS visible) ─╯  quick commands         │
├──────────────────────────────┴─────────────────┤
│ (scroll down ↓ — no gap)                                        │
│ STRIP   [ Focus · today ] [ Plan · long-term ] [ Reflect ]     │ flex:none
│ FOOT                                                           │ flex:none
└────────────────────────────────────────────────┘
```

**Before → After**

| | Before | After |
|---|---|---|
| Chat card height | collapses to content → big gap | fills topbar→strip space |
| Input | below the fold, needs scroll | pinned, always visible |
| “How can I help?” | top of stream | anchored bottom, above input |
| Columns | unequal heights | stretched equal (grid `align-items:stretch`) |
| Digest | one of several equal rail cards | dominant, space-filling, own scroll |
| Cards | thin, light | heavier padding + brighter edge + subtle static shadow |

---

## 5. Acceptance checklist

- [ ] No vertical gap between chat card bottom and the strip.
- [ ] Input visible without scrolling on a 900px-tall viewport.
- [ ] Empty-state welcome sits just above the input, not at the top.
- [ ] Messages scroll inside `.dk-stream`; page doesn't jump.
- [ ] Left and right columns are the same height (stretch).
- [ ] Digest is the tallest rail card and scrolls internally.
- [ ] `.dk-card`/`.dk-acc` accent bars intact; only tokens/`dk-` classes used.
- [ ] ≤ 1024px: single column, chat keeps `70vh`, input reachable.
- [ ] `prefers-reduced-motion` still honored (unchanged).
