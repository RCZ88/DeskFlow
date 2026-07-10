# Lyceum — Dashboard Re-evaluation + Library-Themed Motion Spec

Scope: (1) honest effectiveness review of the current Mastery Dashboard/Library relationship, grounded in the *actual current code* (the Task A integration from the earlier Learner Profile spec has **not** been applied yet — `DashboardView`/`StatCard` still live, isolated, in `LearnPage.tsx` ⁄~L827–920), and (2) a concrete, book-themed micro-animation pass that builds on the motion language you already have (`framer-motion` + `BlurFade`, already used well in `BookCard.tsx`/`LessonLibrary.tsx`/`TutorPanel.tsx`). Curriculum/topic-sourcing (North-Star-only content) is intentionally **out of scope here** — flagged as a later, separately-solvable problem per your call.

---

## Part A — Is the dashboard effective? (verdict: not really, and integration alone won't fully fix it)

### What exists today
`DashboardView` (LearnPage.tsx) is a separate nav destination (`view==='dashboard'`) with three `StatCard`s (Total Nodes / Mastered / Due for Review), a bar-height "Level Distribution" chart, and a flat, **non-clickable** list of due node ids.

### Scored against what a progress view is actually *for*

| Criterion | Current dashboard | Verdict |
|---|---|---|
| **Visible without cost** (do you see it without deciding to go look for it?) | Requires clicking a separate nav item, away from the library you actually browse in | ❌ Fails — out of sight, out of mind |
| **Actionable** (can you act on what you see immediately?) | Due-review list is plain text with a date; clicking does nothing | ❌ Fails — shows you work without a way to start it |
| **Motivating, not scoreboard-y** | Three raw numeric stat cards read like a KPI dashboard, not a personal reading room | ⚠️ Weak — correct data, wrong framing |
| **Visually consistent with the rest of the app** | Bar-height chart + `StatCard` boxes don't share the cloth/gilt/ring visual language used everywhere else in Learn | ⚠️ Inconsistent |
| **Accurate** | Math (mastered/due counts) is correct | ✅ Fine |

**Verdict:** the earlier plan to fold it into the library (Task A, not yet built) is still the right call — but *just moving the same widgets* would keep problems 2 and 3. The fix needs to change what the dashboard *does*, not just where it lives.

### Revised recommendation

1. **Kill the separate `dashboard` view and `StatCard`.** Confirmed — proceed with removing them from `LearnPage.tsx` and repurposing the header "Dashboard" nav button (see prior spec, Task A).
2. **Replace bar-height encoding with `MasteryRing`s.** You already have a themed ring component (`MasteryRing.tsx`) used everywhere else; reusing it for the level distribution (instead of ad-hoc colored bars) makes the strip feel like *part of the library*, not a bolted-on chart.
3. **Make due items clickable and actionable.** Each due node in the strip's popover should open directly into a review flow for that node (jump straight to the reader at that node, or eventually a dedicated "review" mode) — not just display a date. A count you can't act on is just anxiety; a count you can tap to resolve is useful.
4. **Reframe the headline stat.** Instead of three flat numbers ("Total / Mastered / Due"), lead with one framing number — `proficient / total` as a ring with a short label ("You've reached Proficient+ on 8 of 34 topics") — and treat the L0–L5 distribution and the due pill as secondary, collapsible detail. One clear signal beats three competing ones.
5. **Collapse by default.** The strip should be a compact single row at the top of the library (ring + due pill), expandable to the full distribution on click/hover — so it's *visible without cost* (item 1) without becoming a wall of stats every time you just want to grab a book.
6. **Keep a deep-dive view optional, not primary.** If you still want a full analytics page (streaks, per-part mastery history, review calendar), keep it reachable but not the default — the day-to-day signal belongs in the library, the deep-dive is for when you go looking for it.

This is additive to (not a replacement for) the previously-specced `useMasteryStats` + `MasteryStrip` design — apply that design with points 2–6 above as amendments to its behavior.

---

## Part B — Library-themed micro-animations & transitions

### Principle
You already have the right motion vocabulary — `BookCard.tsx` defines shared variants (`lift`, `springy`, `tap`) for the hover-lift/press feel, and `BlurFade` staggers shelf reveals. The fix isn't "add a framework" (framer-motion is already used in 130+ files) — it's **applying that same restrained, springy, book-flavored motion language to a few more high-value moments**, consistently, and respecting reduced-motion (which the Learn module currently does *not* check, unlike `components/ai/chat/*`, which already calls `useReducedMotion()`).

### Do first: a shared motion module
Create `src/components/learn/motion.ts` and move `lift` / `springy` / `tap` out of `BookCard.tsx` into it, so every component below imports the *same* tokens instead of re-inventing timing. Add a `useLearnMotion()` helper that wraps `useReducedMotion()` and returns instant/no-op variants when the user prefers reduced motion — call it once, use everywhere in Learn.

### Concrete additions (each tied to a real interaction, not decoration for its own sake)

| # | Moment | Animation | Why it's "library-themed" |
|---|--------|-----------|---------------------------|
| 1 | Opening a book from the shelf into the reader | `layoutId` shared-element transition: the clicked `BookCard`'s cover morphs/expands into the reader's header band (color + title carry over) instead of a hard cut | Feels like opening the book you clicked, not navigating to an unrelated page |
| 2 | Shelf load | Formalize the existing `BlurFade delay={0.04*index}` stagger into the shared module so every shelf/grid in Learn (library, due-review popover, onboarding chip grid) staggers the same way | One consistent "settling onto the shelf" feel everywhere |
| 3 | Mastery ring reaching a new level | `MasteryRing` animates its fill from the previous % to the new one (not an instant jump) and does a single soft glow-pulse in the level's color the moment L5 is hit | Turns a state change into a small, earned moment — not a UI update |
| 4 | Due-reviews pill | Gentle amber breathing pulse (slow, low-amplitude) until first opened this session, then settles — not a constant nag | Draws the eye once without becoming an alarm |
| 5 | Quiz answer feedback | Correct: quick scale+sage-glow flash on the option. Incorrect: a small 2px horizontal shake, no red flash | Same restrained language as the hover-lift on books — tactile, not punitive |
| 6 | `::: layer` reveal (deeper/remedial content) | Animate height/opacity open instead of hard show/hide (framer-motion `layout` on the wrapper) | Reads as "a page unfolding" rather than a UI toggle |
| 7 | Tutor panel open/close | Already implemented well (`AnimatePresence` + `motion.div` in `TutorPanel.tsx`) — no change needed, just keep as the reference example for timing/easing when building the rest | Already matches the intended feel |
| 8 | Table of contents | A slide-in highlight bar (like a bookmark ribbon) animates between sections as you scroll/navigate, rather than an instant active-state swap | Physical "bookmark" metaphor fits the library theme directly |
| 9 | Moving between nodes in the reader | Subtle horizontal slide+fade between consecutive nodes (prev/next), echoing a page turn — keep it fast (150–200ms) so it never feels like it's in the way of reading | The one place a literal "page turn" cue earns its keep |
| 10 | Empty library state | Replace the static empty-state graphic with a very slow, low-amplitude ambient float/breathe loop (a few px, several seconds per cycle) | Adds life to a dead-end screen without being distracting |

### Guardrails
- Every new animation goes through `useLearnMotion()` so `prefers-reduced-motion` disables it app-wide in one place — match the pattern already in `components/ai/chat/*`.
- Keep durations short (120–300ms for interaction feedback, up to ≤8s for ambient loops) and easing springy/soft, matching `springy` in `BookCard.tsx` — don't introduce a second motion "accent" that fights the existing one.
- This is deliberately **"here and there,"** per your own framing — items 1, 3, 5, 6, 8, 9 are the highest-value five to build first; 2/4/10 are cheap polish; skip anything not in this list rather than animating every hover state.

---

## Explicitly deferred
Curriculum/topic sourcing (everything currently keyed off the North Star page) is **not addressed here** per your note that it's a separate, later, easily-solvable problem. Flag it back to me when you want it scoped — it's independent of both the dashboard and animation work above and shouldn't block shipping either.

## Files touched (for the Architect)
- `src/components/learn/LearnPage.tsx` — remove `dashboard` view + `StatCard`/`DashboardView` (per Task A), repurpose header button.
- `src/components/learn/blocks/MasteryRing.tsx` — animate fill transitions + level-up glow pulse (item 3).
- NEW `src/components/learn/motion.ts` — shared variants + `useLearnMotion()`.
- `src/components/learn/BookCard.tsx` — import shared tokens instead of local ones; add `layoutId` for the open transition (item 1).
- `src/components/learn/blocks/LayerBlock.tsx` — animate reveal (item 6).
- `src/components/learn/blocks/QuizBlock.tsx` — feedback micro-motion (item 5).
- `src/components/learn/TableOfContents.tsx` — sliding active-section bar (item 8).
- Reader node navigation (wherever prev/next is handled in `LearnPage.tsx`) — slide+fade transition (item 9).
- `WelcomeEmptyState.tsx` — ambient loop (item 10).
