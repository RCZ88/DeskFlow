# Round 02 — Life Phases Overhaul (Implementation Status + Problems + Requests)

> **Date:** 2026-08-08
> **Stage:** RESULT (10).md received → steps 1–3 implemented → user critique on visualization → continuation prompt sent to Specialist
> **Convergence status:** continuing (user opened a new design thread: multi-dimensional phases)

---

## PROMPT (paste into external AI chat)

### What has been implemented (current state)

Implemented so far from your RESULT (10).md (steps 1–3) plus the surrounding app work:

- **Mode toggle on Life page:** `Pages ↔ River` (persisted to localStorage `life-view-mode`). Pages mode = old separated 3-tab UI (Covenant / Memories / Gold). River mode = the new combined design.
- **Type extensions (step 1):** `LifePhase` now has optional `people`, `moodStart/moodEnd`, `moodTags`, `feelingsNote`, `lessonsLearned`, `headerImageMemoryId`, `colorSource`, `reflectionSource`, `reflectionGeneratedAt`; `LifePhaseMilestone` = `{ id, date, label, note?, photoMemoryId? }`; `LifePhaseConnection` = `{ targetPhaseId, note? }`; magnitude 1–10 with `MAGNITUDE_LABELS`.
- **Migration (step 2):** new `life_phases` columns added via guarded ALTER (main.ts).
- **PhaseCard overhaul (step 3):** h-64 gradient header band with ghost magnitude numeral + 8 body sections (memory pearls, story, key-moments timeline, people chips, mood bar, lessons pull-quote, impact notes, feelings note).
- **River mode visuals (pre-RESULT):** RiverMap = sweeping SVG curve with pulsing "now" star + scroll parallax; TodayTributary = asymmetric Confluence layout; Vital Thread gradient line; framer-motion entry animations.
- **NOT yet implemented (steps 4–10):** Timeline View, 9-step PhaseFormDialog wizard, `getPeriodContext` IPC + ConnectionDataStrip, AI reflection payload extension, Ring & Grain hero, 4-lens system, Today's Edge.

### Problems (user verbatim)

1. **"I think the visualization is complete chaos. It's like squashed. And it's not being displayed properly."** — the current River-mode rendering is broken/squashed; layout does not hold up.
2. **"What about the features connected to the phase?"** — the goals at that time, the app usage at that time for that phase — nothing connects phase data to the rest of the tracker data (goals, usage, activities, memories).
3. **"How is it able to auto detect different phases to recommend to add?"** — no auto-detection of phases from data (no recommendations).
4. **"The circle itself I don't think is enough to represent the many layers, because the layering of the circle only represents the timeline, but doesn't account for the hierarchy of multiple different aspects of different phases happening at the same time."** — one timeline is not enough; multiple aspects of a life run concurrently.
5. **Example given:** "on the external side of things I'm on phase A and now I'm on phase B, but in terms of productivity, I'm still in phase Z for both of those phases."

### Requests

- **Redesign the phase visualization** so it is not chaos/squashed — it must display properly and be readable.
- **Represent phases as multi-dimensional:** a phase is not a single timeline slice; a person is in DIFFERENT phases per aspect (external/situation, productivity, health, relationships, career, money, etc.) at the SAME time. The visualization must show concurrent phase states across aspects, not just sequential layers on one timeline.
- **Wire connected features into each phase:** goals at that time, app usage at that time, activities/sessions, memories, sleep — per phase, not just stored text.
- **Auto-detect phases** from the tracker data and recommend them as additions to the user's phase map.
- **The interpretation is the important part:** "how u interpret it into the visualization is the more important part" — the conceptual model (multi-dimensional phase space) must drive the visual design, not the other way around.

### What we need from you

Produce an updated design (RESULT v11 / extension of RESULT (10).md) that:

1. Proposes a **visualization concept** that can represent, in one view:
   - the timeline dimension (when phases start/end),
   - the aspect dimension (multiple simultaneous phases across life aspects),
   - the intensity/hierarchy dimension (how dominant each concurrent phase is),
   - and per-phase connected data (goals, app usage, activities, memories) in a way that does not collapse into visual chaos at real data volumes.
2. Specifies how **phase detection/recommendation** works: which existing tracker data feeds it (goals, focus groups, activity/app-usage patterns, external sessions, sleep, memories), the algorithm shape, and the recommendation UX.
3. Specifies the **per-phase data wiring**: what queries/IPC shape would supply "goals at that time" and "app usage at that time" per phase, and where they render.
4. Re-specifies the **River-mode layout** so it cannot render squashed (viewport handling, scroll vs fit, min/max sizes, responsive rules).
5. Keeps the spirit of the existing RESULT (10).md where it still works (PhaseCard, form wizard, AI reflection, tone contract) — supersede only what the critique invalidates.

### Constraints

- Dark mode glass-morphism design system; `--bg-primary`, `--accent-primary`, `--page-accent` tokens; rounded-xl max; p-5; Geist body + JetBrains Mono code; warmth-serif accents (Source Serif 4).
- Existing DB: `life_phases` table + new columns already migrated. Backend IPC pattern: `lifePhase:*` handlers returning `{ ok, data?, error? }`.
- App data available: `finance_transactions`, `focus_groups` (+ usage), `logs` (app/browser tracking), `external_sessions`, `memories`, `goals` (life page), `terminal_sessions` (AI agents).
- No new native deps. framer-motion + lucide-react + tailwind only.
- Ask REQUEST questions if anything is ambiguous — but this round the user wants a direct design continuation, so lead with the concept, ask only what is truly blocking.

---

## Owner Notes (for CZ)

- Do NOT paste the owner notes into the external AI chat — paste only the PROMPT section above.
- The old RESULT (10).md remains the baseline; this round asks for a superseding extension, not a rewrite from zero.
