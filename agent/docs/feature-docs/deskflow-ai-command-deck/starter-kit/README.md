# Command Deck — starter kit (real code)

These are working React/TSX components that produce the approved
`command-deck.png` look. They are framework-agnostic: styling lives in one
scoped stylesheet (`deck.css`, everything under `.dk-root`), so there's no
Tailwind/config dependency. Drop them in, or copy the patterns into your
existing components.

## Files

| File | What it is |
|---|---|
| `deck.css` | All styling, scoped under `.dk-root`. Import once. |
| `deck-types.ts` | Types mirroring your `parsed.ts` union + `CardAction`. |
| `CardShell.tsx` | Wrapper for every AI instrument card (spine + mono badge). |
| `renderers/StatsSummaryCard.tsx` | `stats_summary` → metric grid w/ trend chips. |
| `renderers/GoalSuggestionCard.tsx` | `goal_suggestion` → accept/dismiss rows. |
| `renderers/PlanUpdateCard.tsx` | `plan_update` → +/~/✓ diff + Apply all. |
| `renderers/ChartDataCard.tsx` | `chart_data` → dependency-free bars (px-height, no collapse bug). |
| `ParsedMessageRouter.tsx` | Switch that maps a parsed payload → renderer. |
| `MessageBubble.tsx` | User bubble vs AI avatar + router. |
| `ChatPanel.tsx` | Header + auto-scroll stream + command-line input. |
| `QuickCommands.tsx` | `/`-command palette rail card. |
| `AiPageDeck.tsx` | Full page shell (topbar, grid, rail, bottom strip). |

## Wiring into the real app (surgical)

1. Copy this folder to `src/components/ai/deck/` (or merge file-by-file into your
   existing `components/ai/chat/` — the names match your Phase 5 structure).
2. In `AiPage.tsx`, render `<AiPageDeck ... />` (or copy its JSX), passing your
   **existing** `useAiChat()` state and the `onCardAction` dispatcher you already
   built. Do not re-implement chat logic — this is presentation only.
3. Replace the demo `deck-types.ts` shapes with your real `parsed.ts` exports if
   field names differ; only `ParsedMessageRouter.tsx` needs the mapping tweak.
4. Mount your existing `DailyDigestBoard`, `ConnectorsPanel`, Focus/Plan/
   `ReflectFeed` inside the marked `.dk-card .dk-acc .dk-<accent> .dk-sec`
   containers in `AiPageDeck.tsx`.

## Guardrails (unchanged from the spec)

- Do NOT modify existing IPC handlers in `main.ts`.
- Dark-only, no pure black (`#09090b` floor), `rounded-xl`, `p-5`.
- Motion = transform/opacity only, ease `cubic-bezier(.16,1,.3,1)`,
  `prefers-reduced-motion` respected (already in `deck.css`).
- Chart bars use pixel heights — keep that, or they collapse to 0.

## Example: feeding a parsed message

```tsx
const msg: ChatMessage = {
  id: "m1", role: "assistant",
  text: "You're ahead of last week — here's the snapshot:",
  parsed: {
    type: "stats_summary",
    title: "Weekly performance",
    metrics: [
      { label: "Focus time", value: "6h 12m", icon: "⏱", accent: "pink",    trend: { dir: "up", text: "14%" } },
      { label: "Goals done", value: "5 / 8",  icon: "◎", accent: "emerald", trend: { dir: "up", text: "2" } },
    ],
  },
}
```
