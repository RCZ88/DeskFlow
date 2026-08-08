# PROMPT: Life Phases — Personal Timeline Overhaul

> **Target AI:** Claude / Gemini 2.5 / any capable model
> **Task Type:** Design + Engineering Specification
> **Creativity:** High — this is about soul, not just pixels

---

## Raw Request (verbatim)

> I would like you to just improve the ui and the input and the detailness of the phase thing so the input is like more detailed and its more personal and stuff like that and the VISUALIZATION NEEDS TO BE TOP TIER.
>
> The purpose of the main idea of having this feature is to basically value the time and value — it's have further than you put in everything where you want to be able to see and look back and to reflect whether all of the stuff, all of the things that you do is already impact — whether it's just basically reflecting your past and seeing how much you've changed and how much you've improved as a person, whether or not you've improved or not.
>
> So it's very much something that is very intimate, something that is very intricate, something that is very personal. And I think the ability for it to have a proper UI and everything like that is very much important — and how is it able to connect to the other things like the gold stuff and the fact that not all the stuff is documented on the application. Where this application is relatively — especially if you're like new people, new users, it won't be like the same thing. It's going to be very different.
>
> But we can still nonetheless use the features that we have — the goals that we have, the things that we're doing right now — not in just a messy manner where we're just inputting text, but rather it's mostly utilize AI to be able to convert those into more neat systems. Where it's going to be categorizing to different sectors — for example your goals that time, what have you been focusing on that time, the tools that you've been using, the time you're spending on stuff. And the ability to connect with the focus group stuff where you can have seen — I mean, it's not necessarily too complicated because you can't really connect everything if you're with your laptop, because not everything part of your life is related to your device.
>
> And there's the reason why we have those external activities and we have those pictures and stuff. And I feel like it's very beautiful in a way that we have all these infrastructure that is related to your daily life — and how are we using it in your daily life to the point where we can take those and see how we change. Right — it's an app that gets your data about your life, and we have the ability to see the different phases of it. And it's just a very beautiful thing.

---

## Context Bundle

Read `CONTEXT_BUNDLE.md` in this directory for the **full app context** — every page, every feature, how the warmth system works, how phases connect to goals/memories/tracking/finance/sleep/AI usage, and the design system. The target AI MUST understand the entire app to design something that connects properly.

---

## The Mandate

Design a **complete overhaul** of the Life Phases feature — both the **input experience** (PhaseFormDialog) and the **visualization** (PhaseCard + timeline). This is not a form with fields. This is a **personal artifact** — a way for someone to look back on their life and feel the weight, beauty, and meaning of each chapter.

### What You Must Design

#### A. The Phase Input Form (PhaseFormDialog)

The current form is 5 fields (title, description, category, magnitude, dates). That's not enough. Design a **rich, personal, guided input experience** that captures:

1. **The Basics** — title, category, dates (keep these)
2. **The Story** — a richer description field that guides the user to write about what this phase was *about*, not just what happened. Prompt questions like: "What defined this period?" "What were you becoming?"
3. **Key Moments** — milestones within the phase (the type supports this: `LifePhaseMilestone[]`). Design how users add, edit, and arrange these. Each moment should have a date, a label, and optionally a photo/note.
4. **The People** — who mattered during this phase? A new field: `{ name: string, role: string }[]`. Not a full contact system — just a way to remember the faces.
5. **Feelings & Mood** — a way to capture the emotional texture. Could be: a mood slider (struggling → thriving), a set of emotion tags, or a freeform "how did this phase feel?" field.
6. **Lessons Learned** — what did this phase teach you? A textarea, but with AI-assisted prompts: "What would you tell your past self?"
7. **Impact Notes** — how did this phase change you? (This field already exists in the type but the form doesn't expose it.)
8. **Color** — let the user pick a custom color for this phase, or auto-generate from category. Show a preview of how the phase card will look.
9. **Magnitude** — keep the slider, but make it more expressive. Show magnitude words dynamically.
10. **Connections** — link this phase to other phases. Show a mini-map of the timeline so the user can visually connect phases.

#### B. The Phase Visualization (PhaseCard + Timeline)

The current card has an h-36 header and a body with reflection + memories. Design something **top tier**:

1. **The Header Band** — keep the massive solid color block, but add:
   - A subtle animated texture (grain, particles, or a slow-moving gradient) that makes the color feel alive
   - The magnitude as a large, ghosted number
   - An optional background image (from the phase's first memory photo)

2. **The Body** — redesign to show:
   - The story/description in a beautiful serif typography
   - Key moments as a **vertical timeline** within the card (dots on a line, dates + labels)
   - People as **avatar chips** (just initials + role)
   - Feelings/mood as a **visual indicator** (color gradient, emoji, or abstract shape)
   - Lessons as a **pull-quote** (large italic serif text)
   - Connections as **links to other phase cards** (clicking scrolls to that phase)

3. **Memory Pearls** — keep the scattered polaroid style, but:
   - Photos should be the *first thing* you see in the body (above the text)
   - Arrange them as a scattered gallery with depth (some larger, some smaller, some rotated more)
   - Clicking opens a lightbox with the memory's full context

4. **The Timeline View** — in addition to individual cards, design a **scrollable timeline** that shows all phases as colored blocks on a horizontal axis. Phases can be clicked to expand. The "Now" marker pulses.

5. **AI Integration** — the reflection field should be AI-assisted:
   - When a user creates a phase, offer to generate a reflection based on the story + milestones + feelings they entered
   - The AI should have empathy — this is personal, not corporate
   - The reflection should feel like a wise friend summarizing your chapter

#### C. Connection to Other Features

The phase system should connect to:
- **Gold (Goals)** — show which goals were active during this phase
- **Focus Groups** — show time spent per focus group during this phase
- **External Activities** — show tracked activities (from the External page)
- **Memories** — show photos/memories from this phase's date range
- **Tracking Data** — show app usage patterns if available

Not all of these need to be implemented now — but the design should **show where they connect** so the architecture supports it.

---

## Constraints

1. **Existing Type**: The `LifePhase` interface is already defined. You can extend it (add new fields) but cannot remove existing fields. Any new fields must be nullable/optional.
2. **Backend**: IPC handlers exist for `lifePhase:get/save/delete/saveAll/reflect/eraTrends/summarize`. DB table `life_phases` already has all current fields. New fields will need a migration (add columns with DEFAULT NULL).
3. **Dark Mode Only**: The app is dark mode. All colors must work on zinc-900/950 backgrounds.
4. **Typography**: Use `warmth-serif` for emotional text, `font-mono` for dates/numbers, `font-display` for large numbers. These are already configured.
5. **Motion**: Use framer-motion. Every element should have purposeful animation.
6. **MCP Components Available**: shadcn (dialog, input, textarea, select, slider, button, badge, card), Magic UI (animated-beam, border-beam, number-ticker, particles), Lucide icons, React Bits (135+ components).
7. **No New Dependencies**: Work with what's installed. No new npm packages.

---

## Output Format

Provide a single, comprehensive specification that includes:

1. **PhaseFormDialog Spec** — every field, every interaction, every state. Show the exact form layout with field types, validation, and AI-assist prompts.
2. **PhaseCard Spec** — every section, every visual element, every animation. Show the exact JSX structure with Tailwind classes and framer-motion props.
3. **Timeline View Spec** — the horizontal scrollable timeline showing all phases.
4. **AI Reflection Spec** — how the AI generates reflections, what data it receives, what the output looks like.
5. **Connection Points** — how phases connect to goals, focus groups, memories, and tracking data.
6. **Type Extensions** — any new fields needed on `LifePhase` or new types needed.
7. **Migration Spec** — SQL to add new columns to `life_phases` table.

Do not provide options A/B/C. Provide the single best design. Make it beautiful, personal, and soulful. This is someone's life story — treat it with the weight it deserves.
