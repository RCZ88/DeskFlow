# AI Assistant — Complete Feature Compilation

## Context & Problem Statement

DeskFlow is a desktop productivity tracker (Electron + React + SQLite). The AI Assistant page (`/ai`) has two modes: **Canvas** (infinite spatial grid) and **Deck** (linear chat + expandable cards). The user wants every feature to work end-to-end in both modes, with proper UI, proper data flow, and no broken features.

---

## Feature 1: Canvas Mode — Infinite Pan & Zoom

**User Problem:** Cards are placed on a fixed grid. Can't zoom out to see all cards, can't zoom in to read details. Background grid stops at a fixed boundary.

**What It Should Do:**
- Drag background to pan anywhere (unlimited)
- Scroll wheel to zoom in/out (0.15x to 3x), centered on cursor
- Grid background tiles infinitely (CSS pattern syncs with pan/zoom)
- Zoom percentage shown in toolbar
- Zoom in/out buttons in toolbar
- Minimap dynamically adapts to card positions

**Current State:** Partially implemented. Grid background is infinite. Zoom works. But drag is broken (React re-renders overwrite transform during drag).

**What's Broken:**
- Card drag uses React state for position → re-renders overwrite inline style.transform during drag, causing lag/jump
- Need direct DOM manipulation during drag, commit to state only on pointer up

---

## Feature 2: Canvas Mode — Auto-Center on Load

**User Problem:** When opening the app, cards are scattered. User has to manually pan to find them.

**What It Should Do:**
- On mount, compute bounding box of all non-dismissed cards
- Pan viewport so card cluster center is at viewport center
- If no cards, center on grid origin

**Current State:** Implemented in CanvasContainer.tsx. Works correctly.

---

## Feature 3: Canvas Mode — Find Cards Arrow

**User Problem:** User pans away from cards and gets lost. No way to know where cards are.

**What It Should Do:**
- When no cards are visible in viewport, show floating pill at edge
- Arrow character (8 directions) points toward card cluster
- Bounce animation draws attention
- Click pill → smooth animated pan to card cluster center
- "Recenter" button always in toolbar

**Current State:** Implemented. FindCardsArrow.tsx renders correctly. Arrow direction computed from atan2.

---

## Feature 4: Canvas Mode — Minimap

**User Problem:** Can't see where you are on the infinite canvas. No overview.

**What It Should Do:**
- 160×120px overlay in bottom-right
- Shows bird's-eye view of all cards (colored dots)
- Viewport rectangle shows current view
- Click anywhere → pan to that location
- Drag → continuous pan navigation
- Dynamically computes bounds from card positions (not fixed 4000×4000)
- Hover → scale 1.05 + glow effect

**Current State:** Implemented. CanvasMinimap.tsx with dynamic bounds. Click/drag works.

---

## Feature 5: Canvas Mode — Auto-Arrange

**User Problem:** Cards scattered randomly. Hard to find anything.

**What It Should Do:**
- Sort cards by type, then by creation time
- Lay out in rows (max 800px wide), 40px gaps
- Center entire layout around origin (0, 0)
- Smooth animated transition when rearranging

**Current State:** Implemented. autoArrange.ts centers layout. CSS transition handles animation.

---

## Feature 6: Canvas Mode — Card Drag & Snap

**User Problem:** Cards need to be repositioned manually. Drag is inconsistent — sometimes works, sometimes card jumps or lags.

**What It Should Do:**
- Click and drag any card to reposition
- Card follows cursor in real-time (no lag, no offset)
- On release, snap to nearest 40px grid cell
- Card gets elevated z-index during drag
- Smooth visual feedback

**Current State:** BROKEN. React re-renders overwrite inline style.transform during drag. Fix: use direct DOM manipulation during drag, commit to state only on pointer up.

**What's Broken:**
- `dragOffset` in React state → every pointermove triggers re-render → React overwrites the transform
- The grid layer's CSS transition (`dk-pan-animate`) can also interfere
- Need: ref-based DOM manipulation during drag, state commit only on pointerup

---

## Feature 7: Canvas Mode — Fullscreen Toggle

**User Problem:** Canvas is inside a container. Want to use full screen for presentations.

**What It Should Do:**
- Toggle button in toolbar
- Canvas fills entire viewport (position: fixed, inset: 0)
- Same pan/zoom/drag behavior in fullscreen
- Exit fullscreen returns to normal

**Current State:** Implemented. CSS class `.fullscreen` handles it.

---

## Feature 8: Canvas Mode — Save Indicator

**User Problem:** Don't know if card positions are being saved.

**What It Should Do:**
- Show "Saving..." when persisting
- Show "Saved ✓" when done
- Fade out after 2 seconds
- Auto-save on any card position change (debounced 500ms)

**Current State:** Implemented. SaveIndicator.tsx + useCanvasState.ts.

---

## Feature 9: Canvas Mode — Command Palette (⌘K)

**User Problem:** Need quick way to create cards, ask questions, navigate.

**What It Should Do:**
- Press Ctrl+K to open
- Type commands: /focus, /plan, /schedule, /finance, etc.
- Creates appropriate card type on canvas
- Type natural language → AI processes it

**Current State:** CommandPalette.tsx exists. Wired to AiPage. Works.

---

## Feature 10: Deck Mode — Chat Interface

**User Problem:** Linear chat for conversation-based interaction.

**What It Should Do:**
- ChatPanel with message list
- Input bar with send/stop
- Streaming responses
- Voice input support
- Provider selector

**Current State:** AiPageDeck.tsx + ChatPanel.tsx. Works.

---

## Feature 11: Deck Mode — Expandable Cards

**User Problem:** Want to see data summaries without leaving chat.

**What It Should Do:**
- Cards below chat: Daily Digest, Connectors, Focus, Plan, Reflect
- Each card expandable/collapsible
- Full-page overlay for detailed view
- Spotlight effect on hover
- Animated expand/collapse

**Current State:** AiPageDeck.tsx has ExpandableCard component. Works for existing cards.

---

## Feature 12: Deck Mode — Daily Planner, Schedule, Deadlines

**User Problem:** Deck mode doesn't show schedule, deadlines, or daily goals.

**What It Should Do:**
- Daily Planner card: timeline + goals + progress + AI suggestions
- Weekly Schedule card: 7-day grid with goal dots + completion bars
- Deadline Tracker card: sorted by priority, goal linking, auto-create goals
- All three cards expandable in deck mode

**Current State:** JUST ADDED slots to AiPageDeck. But dailyPlannerSlot variable reference was wrong (fixed). Needs testing.

---

## Feature 13: Daily Goals — Real-Time Progress Tracking

**User Problem:** Set goals like "3 hours project work" but no way to track progress automatically.

**What It Should Do:**
- Goals with `target.type === 'time'` and `target.matchCategory`
- Poll session logs every 30 seconds
- Aggregate duration by category
- Show progress bar (red→orange→yellow→green)
- Auto-update as user works

**Current State:** useGoalProgress.ts hook implemented. Polls get-logs-by-period. Progress bar component exists.

---

## Feature 14: Daily Goals — Focus Integration

**User Problem:** Focus sessions and goals are disconnected. Want goals to auto-track during focus.

**What It Should Do:**
- When focus session active, match goals by category
- Accumulate seconds per second (tick)
- When focus breaks, pause accumulation
- When focus resumes, resume accumulation
- On focus end, persist accumulated progress to DB

**Current State:** useFocusGoals.ts implemented. Polls focus:get-state every 2s. Ticks during active focus. Persists on end.

---

## Feature 15: Daily Goals — AI Suggestions

**User Problem:** Don't know what goals to set. Want AI to suggest based on schedule + deadlines + past productivity.

**What It Should Do:**
- Build context from schedule, deadlines, past productivity
- Call suggest-goals IPC
- Save suggestions with status 'suggested'
- Rate limit: max 10 suggestions per hour
- User can accept/dismiss suggestions

**Current State:** DailyPlannerCard has handleSuggest. buildSuggestionContext builds the prompt. Rate limiting via localStorage.

---

## Feature 16: Daily Goals — Deadline Auto-Linking

**User Problem:** Deadlines approaching but no goals created to prepare.

**What It Should Do:**
- When deadline within 3 days, auto-suggest a preparation goal
- Goal linked to deadline via links array
- User can dismiss auto-suggested goals
- Don't duplicate if goal already exists

**Current State:** DailyPlannerCard useEffect watches deadlines. Creates goals via saveGoal. DeadlineTrackerCard has createGoalFromDeadline.

---

## Feature 17: Daily Goals — End-of-Day Review

**User Problem:** No way to see what was accomplished vs planned.

**What It Should Do:**
- AI-generated summary of goals completed/missed
- Store in goal_reviews table
- Show in DailyPlannerCard as collapsible section

**Current State:** get-goal-review IPC exists. DailyPlannerCard shows review if available.

---

## Feature 18: Schedule — Natural Language Input

**User Problem:** Adding schedule entries is tedious.

**What It Should Do:**
- Type "Mon 9am-10:30am Math 101" → parsed into schedule entry
- Quick input in WeeklyScheduleCard
- Template system for recurring schedules

**Current State:** WeeklyScheduleCard has quick input. parse-schedule IPC exists.

---

## Feature 19: Deadlines — Priority Sorting

**User Problem:** Can't tell which deadlines are most urgent.

**What It Should Do:**
- Sort by priority (high > medium > low), then by due date
- Show days remaining
- Urgent styling for deadlines within 3 days
- Overdue styling for past deadlines

**Current State:** DeadlineTrackerCard sorts correctly. CSS classes for urgent/overdue.

---

## Feature 20: Security Hardening

**User Problem:** AI-generated code may have security vulnerabilities.

**What It Should Do:**
- All SQL parameterized (no string concat)
- Goal titles sanitized (no XSS via innerHTML)
- Rate limiting on AI suggestion endpoints
- Input validation on all IPC parameters
- No secrets/keys in goal data

**Current State:** Main.ts handlers use parameterized queries. Date regex validation. Rate limiting via localStorage.

---

## Feature 21: Tutorial System — AI Assistant Steps

**User Problem:** New users don't know how to use the AI assistant features.

**What It Should Do:**
- 7 tutorial steps covering: mode toggle, canvas, minimap, card types, command palette, auto-arrange, input
- data-tutorial attributes on actual DOM elements
- TutorialPage FEATURES array updated with new descriptions

**Current State:** Tutorial steps expanded. data-tutorial attributes added. FEATURES array updated.

---

## Feature 22: Feature Showcase & Documentation

**User Problem:** Features exist but aren't documented or showcased properly.

**What It Should Do:**
- Every feature has tutorial steps
- Every feature has data-tutorial attributes
- Every feature is in TutorialPage FEATURES array
- Feature spec viewer shows all features
- In-app help panel for AI page

**Current State:** Partially done. AI assistant tutorial steps expanded. FEATURES array updated.

---

## Summary of What's Broken / Needs Work

| Issue | Severity | Status |
|-------|----------|--------|
| Card drag lag (React re-renders overwrite transform) | CRITICAL | Fix applied, needs verification |
| `dailyPlannerSlot` reference error | CRITICAL | Fixed |
| IPC response handling (wrapped objects vs raw arrays) | HIGH | Fixed in all cards |
| Focus API calls (bracket notation vs camelCase) | HIGH | Fixed |
| Deck mode missing schedule/deadline/planner slots | HIGH | Added, needs testing |
| Error boundary at bottom of page | MEDIUM | Card-level, not page-level |
| Schedule card not showing data | MEDIUM | IPC response fix should resolve |
| Deadlines not showing | MEDIUM | IPC response fix should resolve |

---

## Feature 23: Automations System (Visual Builder) — "the fully automation"

**User Problem:** The user wants a feature where the AI (or the user) can *create* behavior — "the feature thing where the AI is able to be the ones creating the stuff." This is the **Automations** tab on the AI page (the `CompositionsPanel` component literally renders the Automations list).

**What It Should Do:**
- A "Create Automation" button opens a **Visual Builder** (5 steps): Trigger → Conditions → Action → Configure → Review
- Trigger picks an event from one of 6 data sources: `finance`, `focus`, `goals`, `learning`, `ide`, `system`
- Conditions filter the trigger (operator map: equals / not-equals / greater-than / contains …)
- Action is one of: `notify` (send notification), `goal:create`, `goal:complete`, `schedule:add`, `deadline:add`, `email:send`, `calendar:create`, `log`
- Natural-language input: the AI can describe an automation and `nlParser` + `dslGenerator` turn it into a config
- Stored in `agent/automations/automations.json`
- Toggle on/off per automation, delete, and "Test Run" (fires `compositionsEvaluate` on the engine)

**Current State:** UI is built end-to-end. `CompositionPanel` → `AutomationList`/`AutomationCard` → `VisualBuilderModal` (5 steps) → `useAutomationActions` (create/toggle/delete/testRun). Triggers (`triggerRegistry.ts`) and actions (`actionRegistry.ts`) are registered. The builder and the list render. **NOT YET VERIFIED at runtime** — the open question is whether real app events (e.g. a transaction created) actually propagate to the engine and fire the action. If automations never fire on real events, the wiring from `compositions:enqueue-event` to the live event sources is missing.

**What's Broken / Unknown:**
- The executor is the **compositions engine** (see Feature 24). `testRun` calls `compositionsEvaluate`, so a manual test can work even if live event propagation does not.
- Need to confirm: does anything call `compositions:enqueue-event` when a real transaction/goal/session event happens? If no caller exists, automations only run on manual Test Run.

**How to verify (idiot-proof):**
1. Open `/ai` → switch mode to **Compositions** (the third canvas-mode tab).
2. Click **Create Automation** → the 5-step Visual Builder modal must open (Trigger step visible first).
3. Pick trigger `finance.transaction.created`, add no conditions, action `notify` with message "test".
4. Save → the automation appears in the list with a toggle.
5. Toggle it ON, click **Test Run** → a notification titled "test" should appear (or the action log entry written). If nothing happens → engine wiring broken.

---

## Feature 24: Self-Expanding Agentic System / Composition Engine (the "AI feature maker")

**User Problem:** From the voice memo `self-expanding-agentic-system-30072026`: a system where the AI composes NEW capabilities by *connecting existing data*, without writing code. "Why not make the AI have the capabilities to do whatever?" — e.g. "sleep by 10pm" goal auto-evaluates from tracked sleep data; the system is the sole judge.

**What It Should Do (the mandate):**
1. **Ambient Goal Evaluation ("AI Judge")** — goals like "sleep by 10pm" auto-evaluate from tracked data; system decides pass/fail, no manual tick.
2. **Constrained Composition DSL** — `WHEN {event} IF {condition} THEN {action}`; bounded, auditable, reviewable. NOT arbitrary code.
3. **Data Connectivity Mesh** — every subsystem registers data sources + triggers; any feature can subscribe (polling + push events).
4. **Self-Expansion Without Code Access** — new "feature" = new composition of existing primitives; saved in a registry.
5. **Safety Guardrails** — rate limits, scope limits, kill switch, audit trail, human review for finance/destructive actions.
6. **User-Facing UI** — Compositions tab: cards (active/paused/error), create/edit modal, activity feed, per-item toggle, kill switch.

**What Actually Exists In The Repo (verified):**
- Backend engine: `src/domains/compositions/` — `compositionEngine.ts`, `CompositionEngineManager.ts`, `CompositionEngineService.ts`, `compositionEventBus.ts`, `compositionLexer.ts`, `compositionParser.ts`, `compositionSchema.ts`, `compositionScopeChecker.ts`, `dataSourceRegistry.ts`, and 6 data adapters (`dataAdapterFinance/Goals/Focus/Ide/Learning/System.ts`).
- Initialized in `src/main.ts` (~line 5160): `compositionEngine = new CompositionEngineManager(db, …)`.
- IPC handlers present: `compositions:validate`, `compositions:evaluate`, `compositions:enqueue-event` (+ more registered by the manager). Preload bridges: `compositionsList/Get/Create/Update/Delete/Compile/Validate/Evaluate/History/Status/SettingsGet/SettingsSet`.
- Frontend: `CompositionPanel` (renders the Automations list), `CompositionEditorModal`, `CompositionHistoryDrawer`, `CompositionRuleCard`.
- DB schema + scope checker (sandbox) + event bus are implemented.

**Current State:** The engine and DSL infrastructure are implemented and wired into `main.ts` + preload. This is the actual realization of the "self-expanding" plan. **Gaps to verify:** (a) are the DSL tables actually created on first run? (b) does the event bus receive real app events, or only manual `evaluate`? (c) is the guided DSL editor (`CompositionEditorModal`) reachable from the UI, or is only the Visual Builder (Feature 23) exposed? (d) kill switch + rate limiter + audit trail wired to the toggle?

**How to verify (idiot-proof):**
1. In the Compositions tab, open an existing automation (or create one) → does a DSL/source editor show the actual `WHEN/IF/THEN` rule? If only the Visual Builder shows, the raw DSL editor may be unreachable.
2. Run `window.deskflowAPI.compositionsList()` in DevTools console → should return an array (even empty) without throwing. If it throws "No handler" → engine not registered.
3. Run `window.deskflowAPI.compositionsStatus()` → should return status object. A thrown error = engine init failed (check main console for `[DeskFlow] Failed to init CompositionEngine`).

---

## Feature 25: Brain Chat (Context Brain integration)

**What It Should Do:** A chat surface (`BrainChatPanel.tsx`) that talks to the Context Brain (knowledge graph + retrieval). Show memory/entity/signal results inline.

**Current State:** Component exists at `src/components/ai/BrainChatPanel.tsx`. NOT referenced in the doc before. Status unknown — verify it mounts on the AI page and queries the brain.

---

## Feature 26: AI Context Panel (grounding / capture viewer)

**What It Should Do:** `AiContextPanel.tsx` — shows captured AI-context (from the browser extension), topics, brain facts/entities/signals, with copy / send-to-AI / manual capture.

**Current State:** Component exists and is imported by `AiPage.tsx`. This is the viewer for the Context Brain capture pipeline.

---

## Feature 27: Slash Commands

**What It Should Do:** `/focus`, `/plan`, `/schedule`, `/finance` etc. typed in chat or canvas input create the right card or run an action. Managed by `useSlashCommands` + `SlashCommandManager`.

**Current State:** Hook + manager exist; `SlashCommandManager` is lazy-loaded in `AiPage.tsx`. Verify the palette opens and commands resolve.

---

## Feature 28: Voice Input

**What It Should Do:** `useVoiceInput` lets the user dictate into chat/canvas inputs (speech-to-text fallback chain).

**Current State:** Hook exists. Verify mic permission + transcription reaches the input.

---

## Feature 29: AIFeaturesModal (feature catalog)

**What It Should Do:** A modal listing every AI capability (the in-app showcase of Features 1–28). Lazy-loaded in `AiPage.tsx` as `AIFeaturesModal`.

**Current State:** Component exists. This is the natural home for the checklist below.

---

## Feature 30: Connectors

**What It Should Do:** `ConnectorsPanel` + `ConnectorItemModal` — configure external data connectors (e.g. finance/calendar sources) the automations/compositions can read.

**Current State:** Component exists and is a lazy-loaded canvas mode. Verify connector setup + status display.

---

## IDIOT-PROOF VERIFICATION CHECKLIST

> Run the app, open DevTools (F12) → Console. For every item: do the ACTION, look for the EXPECTED result. If you see the PASS sign → done. If you see the FAIL sign → that feature is broken, report it.
> Rule from AGENTS.md: if the app is NOT launched with `--remote-debugging-port`, mark the feature **NOT LAUNCHED** and do NOT claim PASS.

### A. Canvas basics
- [ ] **A1 Pan** — ACTION: click empty canvas, drag. EXPECTED: everything moves with cursor, no jump. PASS: smooth drag. FAIL: nothing moves / card jumps.
- [ ] **A2 Zoom** — ACTION: scroll wheel over canvas. EXPECTED: zoom % in toolbar changes, zooms toward cursor. PASS: % changes. FAIL: stuck at one value.
- [ ] **A3 Minimap** — ACTION: look bottom-right. EXPECTED: dots for cards + viewport rectangle. PASS: visible. FAIL: absent.
- [ ] **A4 Find arrow** — ACTION: pan far away from all cards. EXPECTED: floating pill with arrow appears. PASS: arrow points to cards. FAIL: lost, no help.
- [ ] **A5 Auto-arrange** — ACTION: open command palette (Ctrl+K) → arrange. EXPECTED: cards line up in rows. PASS: tidy. FAIL: still scattered.

### B. The "AI creates stuff" (Automations + Composition Engine)
- [ ] **B1 Open** — ACTION: `/ai` → Compositions tab. EXPECTED: "Automations" header + Create button. PASS: visible. FAIL: tab missing / blank.
- [ ] **B2 Build** — ACTION: Create Automation → pick `finance.transaction.created` → action `notify "hi"` → Save. EXPECTED: card appears in list. PASS: card listed. FAIL: save does nothing.
- [ ] **B3 Test run** — ACTION: click Test Run on that automation. EXPECTED: notification "hi" appears. PASS: notification. FAIL: silent.
- [ ] **B4 Engine alive** — ACTION: console → `await window.deskflowAPI.compositionsList()`. EXPECTED: returns `[]` or array, no throw. PASS: array. FAIL: "No handler registered" / throws.
- [ ] **B5 Live fire** — ACTION: create a real finance transaction while an automation watching `transaction.created` is ON. EXPECTED: the action fires automatically. PASS: auto-fired. FAIL: only manual Test Run works → event wiring missing.

### C. Chat (thinking / loading / result / process)
- [ ] **C1 Send** — ACTION: type a question, press Enter. EXPECTED: your message appears immediately. PASS: appears. FAIL: nothing shows.
- [ ] **C2 Thinking** — ACTION: watch while AI answers. EXPECTED: a "thinking" indicator / ThoughtSection shows BEFORE the text streams. PASS: thinking shown. FAIL: text just pops with no thinking state.
- [ ] **C3 Loading description** — ACTION: during generation. EXPECTED: a clear loading label (e.g. "Generating…", progress) is visible. PASS: label visible. FAIL: blank / frozen / spinner with no text.
- [ ] **C4 Result** — ACTION: after generation. EXPECTED: full answer rendered (markdown + any cards). PASS: answer shown. FAIL: truncated / error / blank.
- [ ] **C5 Process of interacting w/ UI** — ACTION: ask AI to "add a goal" / "create a schedule entry". EXPECTED: an ActionConfirmCard or card appears on canvas/deck and the action is reflected in data. PASS: action executed + visible. FAIL: AI says it did but nothing changes.

### D. Goals / Schedule separation (the mixing complaint)
- [ ] **D1 Separation** — ACTION: open canvas / deck. EXPECTED: Goals cards and Schedule/Weekly cards are in distinct card types, not merged into one blob. PASS: separate cards. FAIL: goals and schedule interleaved confusingly in one view.
- [ ] **D2 Default size** — ACTION: fresh load (no saved layout). EXPECTED: cards are readable (not tiny). PASS: readable. FAIL: everything zoomed out to specks → default zoom too small (see Feature 1 / CanvasContainer fitZoom).

### E. Brain / Context / Connectors
- [ ] **E1 Context panel** — ACTION: open AI Context panel. EXPECTED: shows captured contexts / topics. PASS: data shown. FAIL: empty even after captures.
- [ ] **E2 Connectors** — ACTION: open Connectors mode. EXPECTED: list of connectors + add/setup. PASS: manageable. FAIL: blank/broken.
- [ ] **E3 Brain chat** — ACTION: open Brain Chat, ask a question. EXPECTED: brain-backed answer or retrieval. PASS: responds. FAIL: errors.

### How to read the result
- Count PASS / FAIL / NOT LAUNCHED per section. A feature is **working** only if its PASS items all pass at runtime. "NOT LAUNCHED" is NOT a pass.
- Any FAIL in B (Automations/Engine) or C (chat thinking/loading/result) is exactly the "none of the features work" complaint — report which letter failed.
