# Collaboration Request: Life Phases — Personal Timeline Overhaul

## Your Role

You are the **Specialist AI**. I am the **Project Owner AI**. I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to refine this idea into an implementable specification.

You have **zero codebase access**. All context is provided inline. If you need to see a specific file, ask for it using the `REQUEST:` format and I will paste the exact source code.

## The Idea (verbatim from the user)

> I would like you to just improve the ui and the input and the detailness of the phase thing so the input is like more detailed and its more personal and stuff like that and the VISUALIZATION NEEDS TO BE TOP TIER.
>
> The purpose of the main idea of having this feature is to basically value the time and value — it's have further than you put in everything where you want to be able to see and look back and to reflect whether all of the stuff, all of the things that you do is already impact — whether it's just basically reflecting your past and seeing how much you've changed and how much you've improved as a person, whether or not you've improved or not.
>
> So it's very much something that is very intimate, something that is very intricate, something that is very personal. And I think the ability for it to have a proper UI and everything like that is very much important — and how is it able to connect to the other things like the gold stuff and the fact that not all the stuff is documented on the application. Where this application is relatively — especially if you're like new people, new users, it won't be like the same thing. It's going to be very different.
>
> But we can still nonetheless use the features that we have — the goals that we have, the things that we're doing right now — not in just a messy manner where we're just inputting text, but rather it's mostly utilize AI to be able to convert those into more neat systems. Where it's going to be categorizing to different sectors — for example your goals that time, what have you been focusing on that time, the tools that you've been using, the time you're spending on stuff. And the ability to connect with the focus group stuff where you can have seen — I mean, it's not necessarily too complicated because you can't really connect everything if you're with your laptop, because not everything part of your life is related to your device.
>
> And there's the reason why we have those external activities and we have those pictures and stuff. And I feel like it's very beautiful in a way that we have all these infrastructure that is related to your daily life — and how are we using it in your daily life to the point where we can take those and see how we change. Right — it's an app that gets your data about your life, and we have the ability to see the different phases of it. And it's just a very beautiful thing.

## What We're Building

A **complete overhaul** of the Life Phases feature — both the **input experience** (PhaseFormDialog) and the **visualization** (PhaseCard + timeline). This is not a form with fields. This is a **personal artifact** — a way for someone to look back on their life and feel the weight, beauty, and meaning of each chapter.

## Current Context (What I Have)

**App:** DeskFlow — Electron + React + SQLite desktop productivity tracker. Dark mode only. Glass-morphism design (zinc-900/950, backdrop-blur, WarmCard).

**Life Phases feature currently has:**
- `LifePhase` type: id, title, description, category, startMonth, startYear, endMonth, endYear, magnitude (0-100), color, reflection, eraTrends, impactNotes, milestones[], connections[]
- 8 categories: Growth, Career, Love, Challenge, Joy, Rest, Adventure, Creation
- Backend: 7 IPC handlers (get/save/delete/saveAll/aiReflect/aiEraTrends/aiSummarize), DB table `life_phases`
- PhaseFormDialog: Very basic — title, description, category, magnitude slider, start/end dates. That's it.
- PhaseCard: h-36 solid color header, body with description, LTGs, scattered memory pearls, reflection, Reflect/Edit buttons.
- RiverMap: SVG curve with phase markers, "Now" pulsing star, scroll parallax.
- TodayTributary: Asymmetric layout — Covenant (Current Vows), Gold (Today's Seal), Vault (Horizon).
- Vital Thread: Gradient line connecting everything.

**The app also has these features that phases should connect to:**
- **Gold (Goals)** — daily goals, long-term goals, habits, completions
- **Covenant (Commitments)** — daily promises, streaks
- **Memories** — photos, videos, dates, "On This Day"
- **External Activities** — AI tools usage, websites, tracked activities
- **Focus Groups** — time spent per focus group
- **App Usage** — app sessions, productive/distracting time
- **Finance** — income, expenses, subscriptions
- **Sleep** — sleep patterns, trends
- **Productivity** — productivity score, focus sessions
- **AI Usage** — tokens, cost, models used

## Context Gaps (What I Don't Have Yet)

- The full `LifePhase` type definition with all fields — I can provide it if you need exact types
- The current `PhaseFormDialog` source code — I can paste it
- The current `PhaseCard` source code — I can paste it
- The current `LifePage` source code — I can paste it
- How the backend `lifePhase:*` IPC handlers work — I can fetch them
- How memories are stored and fetched — I can fetch the hook
- How goals are stored and fetched — I can fetch the hook
- The design system tokens (exact hex codes, fonts) — I can include them
- How the `WarmCard` component works — I can paste it

**If you need to see any of these, ask using `REQUEST: [file path]` and I will paste the exact source code.**

## Conversation Protocol

**How we communicate:**

1. **You ask specific questions.** Format: `REQUEST: [specific file, schema, or clarification]`
2. **I fetch and respond.** Format: `CONTEXT: [file path]\n[actual source code]`
3. **You refine your understanding.** Ask follow-ups or propose a design.
4. **When ready, you produce RESULT.md.** Format: complete design specification with exact visual specs, field layouts, animation curves, and connection points.

**Rules:**
- Do NOT assume context you don't have. Ask for it.
- Do NOT design for features whose backend doesn't exist. Flag them.
- Do NOT produce a monolithic answer. Iterate with me.
- When you need to see code, ask for the EXACT file path.
- This is about SOUL, not just pixels. The user wants something intimate, personal, beautiful.

## Scope

- **IN:** PhaseFormDialog overhaul (richer input), PhaseCard visualization (top tier), timeline view, AI reflection integration, connection points to goals/memories/activities
- **OUT:** Backend changes (we'll flag what's needed but implement later), other pages (Dashboard, Stats, etc.)

## Expected Output

After our conversation converges, produce:
1. **RESULT.md** — The complete design specification (every field, every visual element, every animation, every connection)
2. **Implementation Plan** — File-by-file changes
3. **Backend Audit** — Any missing IPC/services/DB schemas flagged

## First Question

What would you like to explore first? I suggest starting with one of:
1. The **PhaseFormDialog** — what fields should exist, how should they be organized, what AI-assist prompts should guide the user
2. The **PhaseCard visualization** — how should the card look, what sections, what animations, what typography
3. The **connection architecture** — how phases connect to goals, memories, activities, and other features

Pick one and we'll dive deep.
