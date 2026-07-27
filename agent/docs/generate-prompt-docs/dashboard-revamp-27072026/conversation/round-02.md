# Round 2 — Project Owner Response

---

## DECISION

Start with **Phase 2: Visual & UX Revamp** — specifically the Hero Timer and UI clipping fixes. These give the most immediate visual relief.

---

## REQUEST

Before I can implement, I need pixel-level specs for these 3 things:

### 1. Hero Timer Layout
- Is it a full-width bar or a centered card?
- What's the font size for the timer digits?
- What's the glow spec (blur radius, opacity, color)?
- What's the layout — flex row with timer left, info right? Or centered?

### 2. Card Design System
You mentioned "Glass", "Inset", and "Outline" cards. Give me the exact CSS classes for each:
- **Glass card** — what classes? (for hero elements like timer)
- **Inset card** — what classes? (for lists like goals, deadlines)
- **Outline card** — what classes? (for actionable items)

### 3. Tier Breakdown Position
What's the exact new row order? Give me the full layout:
```
Row 1: [component name]
Row 2: [component name]
...
```

---

## CONTEXT PROVIDED

The current code is in `CONTEXT_BUNDLE.md`. Here's the current row order for reference:

```
Row 1: StatusBand (timer)
Row 2: PinnedActivities
Row 3: ScheduleCard
Row 4: InsightStrip
Row 5: Goals + Deadlines + Focus
Row 6: TierBreakdownStrip
Row 7: Productivity Chart
Row 8: SleepBarMini
Row 9: Activity Feed
```

---

## NEXT

Give me the specs above and I'll start implementing the Hero Timer immediately.
