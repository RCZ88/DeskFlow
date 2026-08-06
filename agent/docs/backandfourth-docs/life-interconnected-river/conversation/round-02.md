# Round 02 — Life Interconnected River

> **Date:** 2026-08-07
> **Stage:** Specialist confirmed all technical context closed; asked 2 final UX/visual decisions before producing RESULT.md.
> **Convergence status:** ongoing — awaiting RESULT.md after owner answers.

## Specialist Questions (verbatim)

1. **Conceptual Question 1 — Physical Layout of the "River":** To achieve the "one continuous visual flow" and replace the 3-tab silo, how should the unified page be physically laid out?
   - **(A) Horizontal Flow:** river flows left-to-right (left = past/birth, right = future); "Today / Current Season" tributary is a prominent docked panel on the right edge (or center); Memories and Phases dot the horizontal arc.
   - **(B) Vertical Timeline:** page scrolls top-to-bottom; "Today / Current Season" tributary sticky at top; Phase/Memory cards flow downward chronologically (past to present).
   - **(C) Map + Detail (Dashboard):** horizontal SVG `RiverCanvas` pinned at top as navigational map; below it a vertical feed of "Phase Cards" (with memories and LTGs attached) + the "Today Tributary"; clicking the map scrolls the feed. *Specialist recommends C (preserves existing SVG river math, gives cards their own solid-color geometry) but defers to owner.*
2. **Conceptual Question 2 — "Solid Color Band" Geometry:** How should the solid color be applied to Phase/Tributary cards?
   - **(A) Solid Header Strip:** solid colored bar across the top (8-12px), rest = standard dark zinc-900/60 glass body.
   - **(B) Solid Left Rail:** thick solid `border-l-4`, dark body.
   - **(C) Solid Full Background:** entire card is the solid color (text contrast management, dark text on bright bands). *Specialist recommends (A) — strong block of color without compromising text legibility.*

## Owner Responses

### Answer — Q1 Physical Layout: **(C) Map + Detail, confirmed — with two refinements**

1. **The Today Tributary must be a FULL-WIDTH section of the feed directly beneath the map** (the "you are here" anchor), NOT a floating/docked side panel. A docked panel would recreate a silo — the user's core demand is "everything shown TOGETHER in one living flow", one page, one scroll.
2. **Feed order = Today Tributary first, then Phase Cards oldest→newest** (matching the arc's left→right direction), so map and feed share ONE direction; clicking a phase/decade on the map scrolls the feed to it (scroll-scrub navigation).

Rationale: (C) preserves the existing RiverCanvas math + ZOOM_STOPS (already built, working, and user-polished across several cycles — never discard working code); it elegantly solves the time-scale split (arc = whole-life overview/navigation, feed = readable detail); one page with a scrubbing map IS "one living thing". (A) squeezes day-scale items into a panel and breaks the continuous feel; (B) throws away the river math and the literal "river" the user asked for.

### Answer — Q2 Color Band Geometry: **(A) Solid Header Strip, confirmed — upgraded to a TITLE-BEARING BAND**

- The band is a **solid fill of the phase's color** (from `life_phases.color`, already user-customizable via the PhaseFormDialog color picker), height ~28-36px — NOT a thin 8-12px sliver (the user said "fully visible"; a thin strip reads as an underline, not a band).
- **The band carries the phase title (+ era years) in a computed contrast text color** — dark text on bright bands, white on dark bands — so the color block is undeniable AND readable.
- Card body below stays the standard dark zinc glass (WarmCard) for description/reflection/attached memories/LTGs. **Never any translucent color overlay over card content — ever.**
- (B) `border-l-4` allowed only as a compact fallback for list/row items, not primary cards. (C) full solid background reserved for non-text moments only (e.g., era marker chips / dividers), never card bodies.

## Decisions Reached

- **Layout: (C) Map + Detail** — SVG RiverCanvas pinned top (keeps river math + ZOOM_STOPS), vertical feed below = Today Tributary (full-width, under map) + Phase Cards oldest→newest; map click scrolls feed.
- **Color band: (A) Title-bearing solid header strip** (~28-36px, phase color from `life_phases.color`, computed contrast title text), dark glass body, zero translucent overlays.
- Specialist confirmed: goalSchema.ts absence noted, LTG runtime payload (deadline/progress/streak) understood, GoldPage self-loads LTG (doesn't use hook) — no open gaps.

## Notes

- Implementation anchors the Specialist cannot see: `LifeRiver` currently renders at GoldPage.tsx L1300; the unified page host is `LifePage.tsx` (today a 3-tab switch: covenant / memories / gold). RESULT.md must specify the new LifePage structure (map + tributary + phase cards) and how existing Covenant/Gold/Memories UIs are absorbed: Covenant streak+habits → tributary, Gold dailies+reminders+Vault → tributary, Memories → attach to phase cards + Today strip.
- Next: CZ relays these two answers → Specialist produces RESULT.md → CZ pastes it back here → owner implements (build + verify).
