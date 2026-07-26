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
