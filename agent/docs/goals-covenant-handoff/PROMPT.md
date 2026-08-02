# PROMPT: Goals + Covenant Page Combination

## Raw Request

> "for some reason, after hibernating, the app tracking feature doesnt really work because now its always tracking the lockapp.exe whatever that is, can you find why and fix the problem."
> 
> "can you make the glow so that its actually visible. because currently it is so incredibly thin and like the glow is so minimal that i cant really even see anything properly."
> 
> "remove the ai assistant card from the dashboard"
> 
> "hows the logic for the today's goal on the dashboard? is it like different for each day? i think the ones where like if we want to set it different for each day. So here's my take on the situation here, right? For the goals, since we wanted to make it customizable goals and how each of the goals can be achieved and there are certain criteria of meeting and finishing the goals, for example, spending 30 minutes on an application or spending a lot of money on an application and stuff like that. So I need you to make sure that there's an actual UI for those, because currently there's enough for UI on creating the today goals and the deadlines as well, although it's already pretty good on the dashboard, but there's not really a full page and a full detail page where we're able to customize those properly. And like, we can't just rely on the AI system page, right? And so, there needs to be a solution on the AI system page side or maybe the deck mount or something like that, but there needs to be a proper UI that is able to be used by the user to be able to manually input those stuff if in case the AI fails, because it's not way that every time a physical time is always an AI challenge and stuff like that. So, and also, we need to also remember that the AI is supposed to respond with a UI and it's supposed to be able to pass the input and stuff like that. And where if the user wants to create an input, for example, if there's something to feel that are missing some variables that the AI needs to feel that is missing, it should just either ask for the user, but it also means that it needs to provide the UI for us to input it in some way or like to maybe respond to by the Java. Yeah, I don't know. What's the best thing here? We just responded through the chat and it's able to configure everything from it. So, yeah, just make sure that the UI, we don't rely 100% on the AI capabilities, but also have meaning that we need to improve the UI and everything. so like either the change should be on the a assistant page or like we need to have the acces through te dahbaird by some buttons or things like that."
> 
> "combine it with like the covenant pages. like the streak pages. where theres like the memories and stuff on the covenant page where the first subpage actually is related to keeping a schedule and daily goals consistent and trying to be consistent on having a fixed schedule and everything like that to stay on track."

## Problem Statement

The current Goals system is fragmented across dashboard cards, AI page, and Covenant — none of which provide a proper full-page UI for manual goal management. Users cannot:
- Create goals with specific criteria (time on app, spending thresholds) without AI
- Customize goals per day (different targets for different days)
- See a calendar view of their goals
- Access streak/consistency features from the goals view
- Manually configure all goal fields (the AI page hardcodes `target: { type: 'completion' }` even when AI suggests time-based goals)

## Context Bundle

Read `agent/docs/goals-covenant-handoff/HANDOFF.md` for full context including:
- All type definitions (Goal, Commitment, Deadline, LongTermGoal)
- IPC endpoints and DB schema
- Current UI capabilities and gaps
- File paths and line numbers

## Engineering Task

Design a **Goals Page** that combines:
1. **Calendar strip** — click a day to see/create goals for that specific date
2. **Goal list** — show all goals for selected day with full CRUD
3. **Criteria builder** — visual form for:
   - Time-based: "Spend 30 min on IDE"
   - Completion-based: "Complete task X"
   - App-tracking: "Use app Y for Z minutes" (using existing `detection` field)
   - Custom: keyword-based detection
4. **Long-term goals section** — separate section for goals with `period: 'longterm'`
5. **Streak integration** — show streak flame and progress for goals with `cadence` and `weeklyTargetDays`
6. **Journal/reflection** — integrate Covenant's journal system for goal-related reflections

## Design Task

Create high-fidelity visual specs for:
- Calendar strip (month view with day indicators)
- Goal card with criteria display
- Criteria builder form
- Long-term goals section
- Streak/flame indicator
- Empty states, loading states, error states

Use existing design tokens:
- Glass pattern: `bg-[rgba(24,24,27,0.80)] backdrop-blur-xl border border-[rgba(63,63,70,0.50)]`
- Colors: productive=#10b981, distracting=#ef4444, neutral=#3b82f6, external=#8b5cf6
- Covenant colors: clay=#e8866b, sage=#6fb38f, amber=#fbbf24, sky=#5ab0c9

## UX Task

Define the interaction flow:
- How does the user create a goal from the dashboard vs from the Goals Page?
- How does the user set per-day targets?
- How does the AI assist without replacing manual input?
- How do streaks and milestones display?
- What happens when a goal is completed?

## Constraints

- Must work with existing IPC endpoints (goals CRUD already exists in main.ts)
- Must not break existing dashboard GoalsCard or Covenant functionality
- Must support both manual and AI-created goals
- Must handle the unused Goal fields (`isHabit`, `cadence`, `weeklyTargetDays`, `detection`)
- Build command: `npx vite build` then `npx esbuild src/preload.ts --bundle --platform=node --format=cjs --external:electron --outfile=dist-electron/preload.cjs`

## Requirement Checklist

- [ ] Calendar strip with day selection
- [ ] Goal list for selected day
- [ ] Full goal editor with ALL fields exposed
- [ ] Criteria builder (time, completion, app-tracking, custom)
- [ ] Per-day target customization
- [ ] Long-term goals section
- [ ] Streak/flame integration
- [ ] Journal/reflection integration
- [ ] Empty states for all sections
- [ ] Loading states
- [ ] Error states
- [ ] Manual goal creation (no AI required)
- [ ] AI goal creation preserves time-based targets
- [ ] Dashboard GoalsCard links to Goals Page
- [ ] Covenant streaks visible on Goals Page
