# PROMPT — AI Canvas: Make Drag / Resize / Grouping Actually Work

> For: Architect AI (external). You have NO repo access — read `CONTEXT_BUNDLE.md` in this folder first; it contains the real code.
> Today: 2026-08-07.

---

## 0. RAW REQUEST (verbatim from the user — this is the spec, do not dilute it)

> "use @agent/skills/generate-prompt/SKILL.md to make sure that grouping and the dragging and the resizing actually works and for the grouping, IT SHOULD SHOW THE CARD, IT SHOULDNT CHANGE HOW THE CARD THAT IS BEING GROUPED IS DISPLAYED"

User context (also verbatim): "IM USING A NEW VERSION. EVERY TIME THERE'S A NEW CHANGE I ALWAYS RELOAD MY APPLICATION" — the failures reproduce on freshly built, freshly relaunched builds. Do not dismiss the reports as stale artifacts.

---

## 1. PROBLEM STATEMENT

The AI Canvas (route `/ai`, `AiPage.tsx` → `CanvasContainer` → `CanvasGrid` → `CanvasCard`) is DeskFlow's agent-activity board. Three user-visible failures:

1. **Dragging cards doesn't work** for automation cards (and feels broken/snap-back for others). Root cause VERIFIED in source: automation cards (`id: auto-*`) are rendered from `automationCanvasCards` (AiPage.tsx:234-263) — a `useMemo` derived from the automations list — and are NOT members of the canvas store. The reducer `MOVE_CARD` (types/canvas.ts:106-108) does `if (!state.cards[action.id]) return state` → the move is silently dropped → the memo recomputes positions → the card snaps back. (CONTEXT_BUNDLE §11 R1.)
2. **Drop-to-group silently no-ops** when the drag target is an automation card (`onGroupCards` filters via `canvas.allCards`, which lacks `auto-*` ids; `createGroup` reads `state.cards[id]` — same gap). (R2.)
3. **Grouping display**: user HARD requirement — grouping must SHOW THE REAL CARD and must NOT change how the grouped card is displayed. Current GroupCard renders real children via `renderChild` — this behavior is correct and MUST be preserved. Never reintroduce preview chips / mini-cards / scaled-down bodies / hidden originals. (R5.)

Plus: verify resize commits & persists for ALL card types (R4) and that normal-card drag has no residual snap-back/jump perception issues (R3).

---

## 2. ENGINEERING TASK (what to design)

Read CONTEXT_BUNDLE §3-§10, then produce a precise fix design:

1. **Make automation cards first-class, movable/resizable canvas cards.**
   - Choose ONE architecture and justify it: (a) persist automation cards into the canvas store (sync from automations list into `state.cards` under `auto-*` ids, reconcile on automations change), or (b) store per-card position/size overrides for derived cards (e.g. a `positionOverrides: Record<string, {x,y}>` + `sizeOverrides` in `CanvasState`, read by the memo, cleared on delete).
   - The chosen path MUST flow through `canvasReducer` (invariant §6.7) and MUST keep automation cards' `onToggle/onDelete/onTestRun` handlers working (they currently live in the memo's `data` as closures — if you move cards into the store, re-inject handlers at render time from the automations list, do NOT serialize closures into localStorage).
   - Fix `MOVE_CARD`/`RESIZE_CARD`/`PIN_CARD`/`DISMISS_CARD`/`UPDATE_CARD` + `onGroupCards` + `createGroup` so automation cards participate fully (drag, resize, group, ungroup, remove-from-group).
2. **Drop-to-group must work for every card type**, including grouping an automation card with a normal card. Group membership source of truth stays `state.groups[id].cardIds` + the group card's `data.childCards` snapshot — ensure snapshots include everything needed to restore the card on ungroup (see `UNGROUP` reducer, it restores from snapshot).
3. **Eliminate drag snap-back perception** for normal cards (CONTEXT_BUNDLE R3): inspect the 0.2s CSS transition interplay and the commit-on-pointerup path; if the card visually jumps at drop (transition animating from dragged transform to committed position), fix by committing the DOM transform synchronously before React re-renders (or an equivalent). Do NOT remove the `CELL=40` snapping.
4. **Regression audit** of these invariants after your change: `suppressClickRef` (click-after-drag must not select/pan), `draggingRef` auto-focus guard (CanvasContainer:366), `hasMovedRef` 2px threshold, pointercancel/blur/unmount cleanup, `filter(card => !card.groupId)` grid rendering, `UNGROUP` restore/scatter paths, `ARRANGE_GROUP` grid/stack/mosaic.
5. **Grouping UX polish (design task):** GroupCard must visibly contain its REAL children at their real grid positions/sizes (already true — keep it true), with a correct group bounding box that resizes when members move/are added/removed, and a collapse/expand that animates height without clipping card bodies (current `AnimatePresence height` animation: verify no clip at any size).

## 3. DESIGN TASK (visual, for the grouping result)

- The group = a labeled container (header with name/count/actions) + a body that shows each member card EXACTLY as it renders standalone (same component, same size `size.w/h × 40px`, same content). No scaling, no text previews, no "mini" cards, no opacity/overlay changes to member content.
- Group header styling exists (CONTEXT_BUNDLE §10) — reuse tokens. Colors from GROUP_COLORS via `--group-accent/--group-bg/--group-border`.
- Add per-group **orientation** (vertical/horizontal split) + **ratio** only if it can be done without changing how member cards display (the types already carry `orientation`/`ratio` — the UPDATE_GROUP patch type accepts them). If it conflicts with "show the real card", SKIP it and say why.
- Empty-group state exists (`.group-empty`) — keep.

## 4. UX TASK

- Dragging any card (AI response, focus, digest, automation, generated) must move it and STAY moved after release, with snap feedback, at any zoom (0.15–3.0) and any pan. Dragging must never pan/scroll the camera.
- Dropping card A onto card B (center-overlap math, existing logic) must highlight B (existing `.drop-target`), and on release create/join a group containing BOTH real cards, visibly wrapped, unchanged.
- Resizing via the bottom-right handle must work on every card type and persist across reload.
- Existing behaviors stay: click selects (and auto-focus pans when content changes — not on user move), wheel zoom at cursor, drag-pan on empty space, pin/dismiss buttons, color picker, rename, ungroup (restore/scatter).

## 5. CONSTRAINTS

- **No new npm dependencies.** Available: react 18, framer-motion, zustand, lucide-react, tailwind v4, base-ui (NOT radix). Electron 34-ish + Chromium. No test runner — verification is `npx tsc -p tsconfig.app.json` + `npx vite build` + manual runtime checks.
- All canvas state through `canvasReducer`; localStorage persistence via the existing hook (wrap in try/catch). Read CONTEXT_BUNDLE §11 R1-R5 and §14 invariants before designing.
- Files you may specify changes for: `src/types/canvas.ts`, `src/hooks/useCanvasState.ts`, `src/components/ai/canvas/CanvasCard.tsx`, `CanvasGrid.tsx`, `GroupCard.tsx`, `CanvasContainer.tsx`, `canvas.css`, `src/pages/AiPage.tsx` (only the automation-cards memo + onGroupCards + props). If another file is truly required, flag it explicitly.
- Do NOT touch: main process, preload, DB, terminal/PTY code, other pages.
- Deliver an exact RESULT.md: per-issue resolution, file-by-file change list with function names + line numbers, new state shape, migration path for existing persisted canvas JSON (users have saved canvases — old `childCards` snapshots without automation entries must still load), and a manual test script (steps + expected result) for CZ.

## 6. MANDATORY FRONTEND PROMPT SECTIONS (for any UI your fix touches)

### 6a. Frontend design skills (load & follow — they're reference knowledge for you)
1. frontend-external-infra — external library sourcing, re-skin rules
2. frontend-design — foundational design principles
3. impeccable — interaction polish
4. humancentred-UIUX — 6 pillars, anti-patterns, 4 states (empty/loading/error/populated)
5. prompt-perfect-copy — copy tone
6. design-tokens — token discipline
7. designtokens-applied — applying tokens to components

### 6b. MCP inventory available to the implementer (use if sourcing NEW components — prefer reuse of existing code first)
- **shadcn** (`npx shadcn@latest mcp`) — browse/search/read shadcn-compatible Tailwind+React components
- **magicui** (`@magicuidesign/mcp`) — animated components (particles, beams, text animations)
- **lucide** (`lucide-icons-mcp`) — 1500+ icons (project already uses lucide-react directly)
- **@21st-dev/magic** — prompt→polished React component generation (needs API key in .env)
- **motion-dev** — Motion.dev docs + animation codegen
- **unsplash** — stock photography (not applicable here)
- **reactbits** (`reactbits-dev-mcp-server`) — 135+ animated components (CSS + Tailwind variants)
- **iconify** (`better-icons-mcp`) — 200,000+ icons
- Also available: shadcn-ui-mcp (v4 docs), fragments-ui, swishy-motion presets.

Source routing rule: standard block → shadcn; animated effect → Magic UI/ReactBits; icon → Lucide; unique variation → 21st.dev. Then RE-SKIN everything to DeskFlow tokens (§12 of CONTEXT_BUNDLE): `--bg-primary`, `--accent-primary`, max `rounded-xl` (16px), `p-5` padding, Geist/JetBrains Mono fonts, dark only.

### 6c. Anti-slop checklist (the implementer must pass ALL)
1. Typography: no default font — Geist Sans + JetBrains Mono, correct sizes (13px group name, 10px mono count).
2. Geometry: consistent 16px max radius, aligned spacing — no random radii.
3. Colors: only GROUP_COLORS accents + zinc/neutral scale — no purple-gradient defaults, no un-tokened colors.
4. Hero pattern: no generic "hero" — canvas cards are data surfaces.
5. Section labels: no floating "AI ✦" decorative labels.
6. Motion: only existing patterns (0.15-0.2s easeOut, AnimatePresence) — no auto-playing marquees/confetti.
7. Imagery: none needed (no stock photos).
8. Empty states: `.group-empty` and canvas empty state exist — keep.
9. Icons: lucide-react only.
10. Accessibility: focusable controls, contrast ≥ 4.5:1, pointer/touch handling via pointer events with capture + cancel fallbacks.

## 7. EXPECTED DELIVERABLE — RESULT.md (in THIS folder, same directory)

1. **Root-cause confirmation** for each of R1-R5 with the evidence from the bundle.
2. **Chosen architecture for automation-card moves** (option a or b + why) with the exact new reducer cases / state shape (code-level, ready to implement).
3. **File-by-file change list**: file → functions → line anchors → what changes. Every file you need, including the migration of persisted canvas JSON.
4. **Grouping spec**: exact JSX structure for GroupCard body that guarantees "shows the real card, unchanged" + how group bounds track member moves.
5. **Manual test script**: ordered steps, expected results, and the specific assertions CZ should run (drag every card type incl. auto-*, zoom 0.5/1/2, group automation+normal, ungroup restore/scatter, resize, reload persistence).
6. **Risks**: what could regress (suppressClickRef, auto-focus guard, snap animation, UNGROUP) and the guard code for each.
7. **Open questions** (if any) that block implementation — keep to zero if possible.
