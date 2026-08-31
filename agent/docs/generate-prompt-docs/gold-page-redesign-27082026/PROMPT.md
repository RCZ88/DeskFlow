# Gold Page Redesign — PROMPT.md

> **Generated:** 2026-08-27 | **Target AI:** Architect (Lead Designer AND Engineer)
> **Context bundle:** `CONTEXT_BUNDLE.md` (same folder — read it fully)
> **Deliverable: `RESULT.md`**

---

## 1. RAW REQUEST (verbatim)

> "WHY IS THE SCHEDULE STILL THE SAME SHIT. THE GOLD PAGE LOOKS WORSE. WHERE'S THE CALENDAR? WHERE'S THE DESIGN OF THE LIFE? ITS ABOUT THE LIFE ITS THE GOLD PAGE THAT IS SUPPOSED TO BE GOALS SCHEDULES DEADLINES AND A CALENDAR FOR THOSE. The schedule looks exactly the same. The Gold page looks worse. WHERE'S THE CALENDAR? WHERE'S THE DESIGN OF THE LIFE? ITS ABOUT THE LIFE ITS THE GOLD PAGE THAT IS SUPPOSED TO BE GOALS SCHEDULES DEADLINES AND A CALENDAR FOR THOSE. I want the goals connected to all the other features — the language parsing, the AI adjustment, everything. I want the schedule redesigned, not the same old component. I want the calendar to actually show goals and deadlines on dates. I want the life page gold tab to feel like a LIFE page — warm, personal, meaningful."

---

## 2. WHAT THIS PAGE IS

The Gold Tab on the Life page is the user's **daily planning and reflection surface**. It's not a dashboard. It's not a task manager. It's where someone sits down each morning or evening and thinks about their life — what they want to do today, what matters this week, what's coming up, and how yesterday went.

**The page contains:**
- A date display with stats (goals done, time tracked, streak)
- A calendar strip for picking dates
- A weekly habit grid (7 days × habits, with completion dots)
- A deadline radar (mini month calendar with deadline dots + countdown)
- Reminders/events with quick date chips
- A schedule (time blocks for the day)
- A goal list (today's goals with progress)
- Long-term goals (The Vault — progress rings)
- A reflection journal (with smart prompts)
- A weekly recap (Mon→Sun)
- A life river (river of years visualization)

**What's broken right now:**
- A separate `GoalsSection` component was created that duplicates and replaces GoldPage's internal rendering — this broke the layout and lost the warm feel
- The schedule component is still the old pink-500 version, not redesigned
- The calendar doesn't show goals or deadlines on dates
- Goals aren't connected to schedules, deadlines, or reminders
- The page lost its personal, life-oriented feeling

---

## 3. MANDATE

You are redesigning the **Gold Page goals section** so that goals, schedules, deadlines, and calendar work together as ONE cohesive system — not separate disconnected pieces.

The page should feel like **someone's personal life planner** — warm, intentional, meaningful. Not a cold data dashboard. Not a generic task manager. A place where a person reflects on their day, plans tomorrow, and tracks what matters to them.

### What to do:
1. **Remove** `GoalsSection.tsx` — it duplicates GoldPage's internals and broke the layout
2. **Restore** GoldPage's own goal rendering (it already had GoldHeader, WeekBoard, DeadlineRadar, BellBoard, GoalCard list, TheVault, ReflectionCard, WeekReview, LifeRiver)
3. **Redesign** the schedule to feel like part of this page, not a foreign component
4. **Connect** goals to schedules, deadlines, and reminders so they feel like one system
5. **Integrate** the new goal features (AI language parser, habit tracker, AI coach, missed recovery) into the existing page structure
6. **Make the calendar show** goals and deadlines on each date

### What NOT to do:
- Don't force specific design skills or component libraries — design freely based on the page's meaning
- Don't create yet another separate component — integrate into GoldPage
- Don't lose what already works (GoldHeader, WeekBoard, DeadlineRadar, BellBoard, TheVault, ReflectionCard, WeekReview, LifeRiver)
- Don't make it look like a generic dashboard — it's a LIFE page

---

## 4. CONSTRAINTS

1. Read CONTEXT_BUNDLE.md fully — it has all the source code
2. DO NOT use `git checkout` or any restore — work with the current code
3. The GoldPage already has all the data loading, CRUD handlers, and state management — use them, don't recreate
4. All existing IPC channels are real and stay
5. No new npm dependencies
6. The page lives at route `/life?tab=gold` inside the Life page
7. Preserve the warm amber accent (the Life page accent) — not pink-500
8. Preserve existing sub-components that work (GoldHeader, WeekBoard, DeadlineRadar, BellBoard, TheVault, ReflectionCard, WeekReview, LifeRiver)
9. Every component must handle empty, loading, error, and populated states

---

## 5. OUTPUT FORMAT — RESULT.md

1. **Executive Summary** — what changed and why
2. **What Was Removed** — GoalsSection.tsx and what was restored
3. **What Was Redesigned** — ScheduleCard and how it connects to goals
4. **What Was Enhanced** — Calendar showing goals/deadlines, goal-schedule linking
5. **Integration Map** — how goals connect to schedules, deadlines, reminders, AI
6. **Component Specifications** — for each changed/new component: props, states, behavior
7. **Layout** — the final component hierarchy and visual structure
8. **Implementation Phases** — ordered, independently buildable
9. **Verification Checklist**
