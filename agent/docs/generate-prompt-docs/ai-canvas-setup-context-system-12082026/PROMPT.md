# PROMPT — AI Canvas: Default Setup, UX Pass, Digest/Fallback Verify, Context System

> For the ARCHITECT (external AI). Read `CONTEXT_BUNDLE.md` in this folder FIRST —
> it is self-contained and authoritative. Repo: DeskFlow (App Tracker) at
> `C:\Users\cleme\Documents\COMPUTAH_SAYENCE\App Tracker`.
> Deliverable: `RESULT.md` (full implementation spec) + patch ZIP, per the standard
> back-and-forth contract.

---

## 1. Raw Request (user's verbatim words — the SOURCE of truth)

> "have you fixed the SAVING SYSTEM??? AND HAVE YOU MADE SURE THAT WE CAN HAVE THE
> SAVED CONFIGURATION? LIKE THE INITIAL THING? THE SETUP? WHERE WE CAN SETUP AND SAVE
> OUR SETUP for what to include in a new blank canvas so that the blank new canvas
> has those as default? and have you fixed and made the UI proper for all of the cards
> on the canvas so that it passes all @humancentred-UIUX skill and uses proper
> frontend MCP and skills? have you made sure that the daily research works properly,
> and the fallback system works? have you made sure that the system is fully adaptive
> dynamic to the list of features that we have? how do we handle the context system
> in using RAG or more advanced systems like Graph RAG, Tiered Memory, multi-strategy
> retrieval and stuff like that? use @generate-prompt to make sure all of the features
> like this works and implemented PROPERLY."

---

## 2. Design Skills You MUST Apply (in this order)

1. **frontend-design** — DeskFlow-specific component patterns, tokens, spacing,
   typography, glass cards.
2. **humancentred-UIUX** — the 6 pillars in CONTEXT_BUNDLE §F2. THIS IS THE CORE
   SKILL FOR THIS ROUND. Every card, every state.
3. **impeccable** — 7 design dimensions (typography, color, spatial, motion,
   interaction, responsive, UX writing), 27 anti-patterns.
4. **motion — bring the UI alive** — Liveliness Levels (L1 Composed / L2 Responsive /
   L3 Expressive), motion taxonomy.
5. **UI UX pro max** — industry-specific rules for dev tools / AI / productivity apps.
6. **design-taste-system** — master aggregator, variance knobs, anti-repetition.
7. **frontend-external-infra** — source routing (which MCP for which need),
   re-skin rules (CONTEXT_BUNDLE §F1), anti-slop checklist (§F3).

## 3. MCP Inventory (real components — use these, never invent)

| Component | Source | Use for |
|-----------|--------|---------|
| card, dialog, input, button, tooltip, skeleton | shadcn (installed in repo) | Standard UI + loading states |
| Animated Beam, Border Beam, Number Ticker, Particles | Magic UI (vendored in repo) | Card accents, stat ticks, connecting lines |
| Target, Calendar, TrendingUp, Newspaper, Plug, Clock, ListTodo, Bell, MessageSquare, Layers, Save, FilePlus, LayoutGrid | lucide-react (installed) | Card + toolbar icons |
| React Bits (135+), Iconify (200k+) | MCP | Fallbacks for missing effects/icons |

After sourcing ANY component: re-skin to DeskFlow tokens (§F1 of bundle), max
rounded-xl, p-5, dark-only, Geist + JetBrains Mono, glass layer, real empty states.

---

## 4. Requirements (implement EVERYTHING — zero omission rule)

### R1 — Default Canvas Setup (headline feature)
- A user-configurable "default setup": which cards appear (and their initial
  data/position/size/pinned state) on every NEW blank canvas.
- UI: a setup dialog reachable from the canvas (toolbar button + Manager panel),
  listing all CardDrawer templates with toggles, and "Save as Default Setup".
- Storage: recommend + implement ONE mechanism (localStorage key
  `deskflow-canvas-default-setup` suggested) — see §H of bundle. PURELY frontend,
  no IPC needed.
- Behavior: New Canvas seeds the saved setup instead of the hardcoded list.
  If no saved setup exists, fall back to the current built-in default cards.
  Seeding invariant (§A3): only on fresh canvases or explicit New Canvas.

### R2 — Full humancentred-UIUX pass on ALL canvas cards
- Apply §F2 to every card type: focus, plan, finance, digest, reflect, response,
  annotation, connectors, schedule, deadlines, planner, automation, generated, group.
- Each data-driven card gets 4 explicit states: Empty (icon + one-line explanation
  + CTA), Loading (content-shaped skeleton), Error (plain cause + Retry),
  Populated. Overflow: truncation.
- Hover/focus/active/disabled on all controls; 150-300ms transitions; destructive
  actions via CustomConfirmDialog (window.confirm BANNED); submit feedback.
- Keyboard: focus rings, Escape closes drawers/dialogs, Enter confirms.

### R3 — Daily Research (Digest) + Fallback system — VERIFY + FIX
- Trace the FULL chain: Settings digest topics → `get-topic-digest` IPC (main.ts:15963)
  → provider chain `buildChain(pState,'researchDigest')` → `runWithFallback` →
  digest-generation-complete event → AiPage poll → digest card render.
- Fix any broken link found (polling, empty topics, provider assignment, error
  surfacing in the digest card). The digest card must show its provider badge,
  generation state, and a Configure button (exists — verify it works).
- Fallback: every AI feature must go through buildChain/runWithFallback; if any
  feature bypasses it, spec the fix. OpenRouter direct fallback when no providers.

### R4 — Adaptive/dynamic feature system
- Cards must react to DATA PRESENCE: no finance data → finance card shows empty
  state + CTA; no connectors configured → connectors card shows setup CTA; digest
  with no topics → "add topics in Settings" empty state. Never a blank/broken card.
- The canvas must not show cards for features that don't exist in the feature list.

### R5 — Context system design (RAG / Graph RAG / Tiered Memory / multi-strategy)
- Produce a CONCRETE buildable design (this is a design deliverable, files+IPC+
  schema level), NOT an essay. Answer: how the AI page (chat + canvas + digest)
  retrieves context from the existing knowledge stores (Graphify graph.json,
  LLM Wiki agent/*.md, Obsidian Skills, PARA CZVault, QMD templates, Automations).
- Cover: chunking, indexing (main process), retrieval strategies (BM25/keyword +
  graph adjacency + recency/tiered memory), a single `context:query` IPC, and a
  phased build plan (what ships in this patch vs next).
- Multi-strategy retrieval must be designed so it works WITHOUT an embedding API
  key (keyword+graph+recency as baseline; embeddings optional upgrade).

---

## 5. Constraints (never violate)

- Mouse-event drag architecture (A1.1) — never convert to pointer events.
- window.confirm/alert BANNED.
- localStorage in try/catch; CRLF files; dark-only.
- Save-on-change is synchronous (B3) — do not debounce it away.
- CardData: `data: Record<string, any>` — do NOT add required typed fields that
  break existing cards in storage.
- Build chain: renderer `npx vite build`, preload esbuild, main rebuild-main.mjs.
- Seeding invariant (§A3) — never re-seed loaded canvases.
- The AI page is route `/` (AiPage) — canvas components live in
  `src/components/ai/canvas/`, hooks in `src/hooks/useCanvasState.ts`,
  persistence in `src/services/canvasPersistence.ts`.

---

## 6. Output Format

Produce `RESULT.md` with:
1. **Feature-by-feature spec** (R1-R5): files to create/modify with exact paths,
   component APIs, state shapes, IPC channels, storage keys, edge cases.
2. **UI/UX spec** per card: the 4 states rendered, layout, tokens used.
3. **Implementation order** (what depends on what).
4. **Verification checklist** — how the implementer proves each feature works in
   the running app (console stamps, click paths, edge cases).
5. **Open questions resolved** (address §H of the bundle with a definitive choice).
