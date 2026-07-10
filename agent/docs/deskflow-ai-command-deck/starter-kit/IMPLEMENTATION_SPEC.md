# DeskFlow AI — “Command Deck” Implementation Spec

This package is a **design handoff**, not drop-in code. It contains a pixel-accurate
reference (`command-deck.html` + `command-deck.png`) and the spec below. Implement
the look in the **real React components** — do NOT paste the HTML into the app.

---

## 0. Golden rules (do not violate)

1. **Surgical edits only.** Touch only the files listed in §5. Do NOT rewrite
   `AiPage.tsx` wholesale. Do NOT reformat unrelated files.
2. **Do NOT modify existing IPC handlers** in `main.ts`. The UI consumes the
   existing preload bridge (`window.deskflowAPI`) as-is.
3. **Dark-only.** No light theme. No `prefers-color-scheme` branches.
4. **Motion:** transform + opacity only. Easing `cubic-bezier(0.16,1,0.3,1)`.
   No box-shadow animation, no layout-thrash, respect `prefers-reduced-motion`.
5. **No pure black.** Canvas floor is `#09090b` (zinc-950).
6. **Radius:** `rounded-xl` (12–16px). **Padding:** cards `p-5`.
7. Reuse the existing `parsed_json` response contract and the renderer files
   already in `components/ai/chat/renderers/`. This spec restyles them; it does
   not add new response types.

---

## 1. Theme: what makes it “Command Deck”

Mission-control / instrument-panel language:
- The chat input is a **command line** (mono prompt glyph, `/` command hint).
- Every AI reply renders as an **accent-coded instrument card** (colored left
  spine + mono `badge` naming the response type).
- **Mono microlabels** above every region: uppercase, `letter-spacing:1.6px`,
  muted, with a fading hairline rule to the right.
- Glass surfaces (`backdrop-blur`) over a faint 44px grid + two corner radial
  glows (pink top-right, violet top-left).
- Borders over shadows. Tabular numerics for all metrics.

---

## 2. Design tokens (add to `theme/tokens.ts`)

```ts
export const DECK = {
  canvas:   "#09090b",
  surface:  "rgba(24,24,27,0.72)",  // glass card
  surface2: "#151518",
  raised:   "rgba(39,39,42,0.70)",
  line:     "rgba(255,255,255,0.07)",
  line2:    "rgba(255,255,255,0.12)",
  textP:    "#fafafa",
  textS:    "rgba(250,250,250,0.60)",
  textM:    "rgba(250,250,250,0.38)",
} as const

// Semantic accents (map to your existing ACCENT keys in tokens.ts)
export const ACCENT = {
  pink:    "#ec4899", // primary / assistant / focus
  emerald: "#34d399", // positive / connectors / reflect
  amber:   "#fbbf24", // attention / quick-commands
  violet:  "#a78bfa", // plan / glance
  cyan:    "#22d3ee", // charts / digest
  red:     "#f87171", // risk / errors
} as const

export const MOTION = {
  fast: 0.15, normal: 0.25, slow: 0.4,
  ease: [0.16, 1, 0.3, 1] as const,
  stagger: 0.05,
}
```

Each accent is used as: 3px left card spine, 12–15% tint for icon chips /
semantic surfaces, and full-strength for the primary button + status dots.

---

## 3. Typography

- Sans: system stack (`-apple-system, Inter, Segoe UI, Roboto, sans-serif`).
- Mono: `ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas` — used for
  microlabels, `badge`s, the command prompt, `/commands`, metric deltas, dates.
- Body 13.5–14px / 1.5. Metric values 21px/680 weight, `-0.5px` tracking,
  `font-variant-numeric: tabular-nums`. Microlabels 10.5px.

---

## 4. Layout (see `command-deck.png`)

```
TopBar:  logo · “DeskFlow AI // command deck”        [mode][provider][connected]

Grid (1fr / 400px, gap 20):
  LEFT  — Command Deck (chat)
    · microlabel “ASSISTANT · STRUCTURED COMMAND DECK”
    · Card (pink spine): header row → message stream → command-line input
         messages: user (right, raised bubble) / ai (avatar + text + instrument card)
  RIGHT — rail (stacked cards, each with its own microlabel)
    · Today at a glance   (violet)  2x2 metric grid
    · Daily digest        (cyan)    provider badge + collapsible topic rows
    · Connectors          (emerald) status dot + relative sync time + Sync/Add
    · Quick commands      (amber)   icon + label + /shortcut

Bottom strip (3 cols, gap 20):
    Focus·today (pink) checklist · Plan·long-term (violet) P1/P2 diff · Reflect·7days (emerald) completion rings
```

Responsive: below ~1024px, rail drops under the deck; bottom strip stacks to 1
col; keep reading order; interactive targets ≥ 44px.

---

## 5. File-by-file changes (the ONLY files to touch)

| File | Change |
|---|---|
| `theme/tokens.ts` | Add `DECK`, extend `ACCENT`, keep `MOTION`. |
| `components/ai/chat/renderers/CardShell.tsx` | Add `accent` prop → 3px left spine; header row = `icon + title + <span className="badge">{type}</span>`; glass bg `DECK.surface`, border `DECK.line`, radius 14. All other renderers wrap in CardShell. |
| `.../renderers/StatsSummaryCard.tsx` | 2-col metric grid; each metric = icon chip + label + trend chip (▲/▼ mono) + big tabular value. |
| `.../renderers/GoalSuggestionCard.tsx` | Rows: title + category `tag` + reason line + Accept(primary pink)/Dismiss(ghost). Wire to existing `onCardAction('accept-goal'|'dismiss-goal')`. |
| `.../renderers/PlanUpdateCard.tsx` | Diff rows: `+`(emerald) add / `~`(amber) modify / `✓`(emerald, strikethrough) done + `P1/P2` pill. “Apply all” → `apply-plan`. |
| `.../renderers/ChartDataCard.tsx` | Keep dependency-free SVG/flex bars; cyan gradient fill; give bar container an explicit height so % bars render (see note †). |
| `.../renderers/*` (others) | Restyle to CardShell + accent; no logic change. |
| `components/ai/chat/ChatPanel.tsx` | Header row + mono `meta`; command-line input styling (mono prompt glyph, `/` hint, mic + send). Keep existing props/handlers. |
| `components/ai/chat/MessageBubble.tsx` | User = right-aligned raised bubble; AI = avatar + delegate parsed → `ParsedMessageRouter`. (Already delegates; restyle only.) |
| `pages/AiPage.tsx` | Layout shell only: topbar chips, grid, microlabels, mount the rail cards (glance / digest / connectors / quick-commands) + bottom strip (Focus/Plan/Reflect). Reuse existing state + handlers already wired. |
| `components/rail/QuickCommands.tsx` (NEW) | Small palette: 4 rows (icon + label + `/cmd`). On click → `chat.send('/plan')` etc. |

† **Chart bar gotcha:** percentage-height bars collapse unless the bar column has
an explicit height. Set the bar wrapper `height:100%` with a fixed-height chart
track (e.g. 140px) and `justify-content:flex-end`, OR compute px heights. This
exact bug is why the first render showed an empty chart.

---

## 6. Component style recipe (Tailwind-ish, adapt to your setup)

```tsx
// CardShell
<div className="relative overflow-hidden rounded-2xl border border-white/[.07]
                bg-zinc-900/70 backdrop-blur-xl">
  <span className={`absolute left-0 inset-y-0 w-[3px] ${spine[accent]}`} />
  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[.07]">
    <div className="flex items-center gap-2 text-[12.5px] font-semibold">{icon}{title}</div>
    <span className="font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5
                     rounded-md border border-white/[.12] text-white/60">{type}</span>
  </div>
  <div className="p-4">{children}</div>
</div>

// microlabel
<div className="flex items-center gap-2.5 font-mono text-[10.5px] uppercase
                tracking-[1.6px] text-white/40">
  {label}<span className="flex-1 h-px bg-gradient-to-r from-white/12 to-transparent" />
</div>

// primary button
<button className="h-[30px] px-3 rounded-lg text-xs font-semibold
                   bg-[#ec4899] text-[#1a0b12]">Accept</button>
```

---

## 7. Acceptance checklist (agent must self-verify)

- [ ] Only files in §5 changed; `git diff --stat` shows no unrelated churn.
- [ ] No IPC handler in `main.ts` modified.
- [ ] `npm run build` passes with no new TS errors.
- [ ] Chat renders each `parsed_json` type as its accent-coded CardShell.
- [ ] Chart bars are visible (not empty).
- [ ] Accept/Dismiss/Apply-all fire the existing `onCardAction` events.
- [ ] Dark-only; no pure black; radius/padding per §0.
- [ ] Reduced-motion respected; no shadow/layout animation.
- [ ] Matches `command-deck.png` at 1440px and stacks cleanly at ~390px.

---

## 8. Files in this package

- `command-deck.html` — the reference implementation (open in a browser).
- `command-deck.png` — 1440px full-page render (the approved look).
- `IMPLEMENTATION_SPEC.md` — this file.
