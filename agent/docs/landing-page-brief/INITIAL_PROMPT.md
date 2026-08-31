# Collaboration Request: RHEO Landing Page

## Your Role

You are the **Specialist AI**. I am the **Project Owner AI**. I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to refine this landing page idea into an implementable specification.

This is **90% planning**. We are NOT writing code yet. We are brainstorming, discussing, and thinking together. Your job is to help us arrive at a clear, concrete vision for this landing page.

---

## The Raw Idea (verbatim from the user)

> I would like to make a landing page, and I would like the landing page to be exceptionally insanely good. What I mean by this is not a single AI Slope element — it needs to be a scrolling animation since it is a website, right? That means that we can fully utilize every single MCP, every single tool, every single element that is provided, right? Like those scrolling animations, those scrolling assets, those backgrounds that are moving, those animations, right?
>
> But we got to think of an idea, we got to have to brainstorm everything, right? Now, we would like to utilize it very properly as well as the background force to communicate to a better and more experienced and way higher quality AI model.
>
> One of the more important things that I would like to be implemented there is just basically — it doesn't need to be much actually. I kind of consider whether or not I would like to add a feature, a list of features part of the website to show that list of features, because the app itself already have a list of features and maybe we can utilize those. It's mainly to — we need to have the idea of the application for, because it's like a multi-functional application, and it's not really that we have an account and then stuff like that. We just show that it is a local thing and so on and so forth, local database or everything is stored inside the computer, everything is secured.
>
> But at the same time we are going to mention that it is the beauty of the process with the light thing, how we can make those components as items to sell, items that you can select from the store and then you can put that and attach that to your application. It doesn't come with those list of features, but maybe we can add a way where for now for gimmick purposes, like make a paywall for each feature and so on and so forth, but for an account, an admin account can be able to have access to all of those.
>
> So those are the things that I want to implement in the future. I'm not necessarily thinking that that's the best idea. It's just my initial idea and I would like those ideas to be fully refined before ever starting.

---

## What I Understand So Far (your raw ideas, organized)

### Core Concept
A single-page marketing/landing site for **RHEO** — a local-first, privacy-first, multi-functional desktop productivity app.

### Key Messages
1. **Local-first** — No accounts, no cloud, no subscription. Everything on your machine.
2. **Privacy** — Your data never leaves your computer. Secured locally.
3. **Multi-functional** — It's not one thing. It's 15+ subsystems that work together.
4. **Beautiful** — The landing page itself should be stunning. Scrolling animations, moving backgrounds, no "AI slop."
5. **The beauty of the process** — The components could theoretically be modular, sellable, attachable.

### The "Store" Concept (gimmick / future idea)
- Each feature could be displayed with a price tag (like a store)
- An admin account unlocks everything
- For now this is a visual gimmick, not real commerce
- The user wants this idea refined — is it the right approach?

### Planning Phase
- 90% planning, 10% execution
- Brainstorm together before any code
- Integrate the human's (CZ's) decisions and thoughts
- The external AI should drive the conversation by asking questions

---

## Current Context (What I Have)

### The App: RHEO
- Desktop app: Electron + React + TypeScript + Tailwind CSS
- Database: better-sqlite3 (single local file)
- No accounts, no cloud, no sync — 100% local
- Dark mode only, glass morphism design system
- 15+ major subsystems (see Context Bundle)

### Available Visual Mechanics (10 motion demos)
Each is a standalone HTML/CSS/JS file — complete landing page structures with hero, stats, how-it-works, pricing, FAQ, footer. Pure canvas/DOM, no frameworks.

| # | Name | Visual | Possible Landing Page Use |
|---|------|--------|--------------------------|
| 01 | Morphogen | Reaction-diffusion (organic growth) | Hero — "RHEO is alive" |
| 02 | Overpass | Orbital wireframe Earth | Global reach / local everywhere |
| 03 | Adjacent | Force-directed graph | Feature network / connections |
| 04 | Nearside | Voronoi tessellation | Already near you / distributed |
| 05 | Freeboard | Contour isolines | Data landscape |
| 06 | Headway | Flow-field streamlines | Workflow / how data moves |
| 07 | Foreshock | Seismograph traces | Real-time monitoring |
| 08 | Quorum | Game of Life grid | Emergent behavior / agents |
| 09 | Harmonic | Rotating wireframe gears | Precision engineering |
| 10 | Deident | Redaction bars | Privacy / data protection |

### Available MCP Tools (for pulling real components)
- shadcn: Landing sections (hero, pricing, features, bento, testimonials)
- Magic UI: Animated effects (beams, particles, text animations, backgrounds)
- Lucide: 1500+ icons
- @21st-dev: Prompt-to-component generation
- React Bits: 135+ animated components
- Unsplash: Stock photography
- Google Design: Material icons, fonts, color schemes

### Design Tokens (DeskFlow)
- Dark mode only: `#09090b` background, `#fbbf24` amber accent
- Glass morphism: `bg-[rgba(24,24,27,0.60)]` + backdrop-blur
- Fonts: Geist (body), JetBrains Mono (mono)
- Border radius: max `rounded-xl` (12px)

---

## Context Gaps (What I Don't Have Yet)

These are the things we need to figure out together:

| Gap | Status | How to Obtain |
|-----|--------|---------------|
| Hero motion mechanic choice | ❌ Open question | Discuss together |
| Tagline / headline | ❌ Not decided | Brainstorm together |
| Tone of voice | ❌ Not decided | Discuss together |
| Which features to showcase | ❌ Not decided | Discuss together |
| "Store" concept refinement | ❌ Raw idea only | Refine together |
| Paywall gimmick details | ❌ Raw idea only | Refine together |
| CTA (what action to take) | ❌ Not decided | Discuss together |
| Section order / flow | ❌ Not decided | Design together |
| Inspiration / references | ❌ None provided | Ask CZ |
| Technical constraints | ⚠️ Partial — static HTML/React site | Already known |

---

## Conversation Protocol

**How we communicate:**

1. **You ask specific questions.** Start with the big-picture questions first — tone, identity, what RHEO *feels* like. Don't jump to section layouts yet.
2. **I provide context and answer.** I have full codebase access. If you need to see how a feature works, ask for it.
3. **You propose a design direction.** After gathering enough context, propose a landing page structure.
4. **We iterate.** Refine the structure, copy, visual direction.
5. **When converged, produce RESULT.md.** Complete spec with section-by-section layout, copy, visual direction, and component sources.

**Rules:**
- Do NOT assume you know what RHEO feels like. Ask CZ.
- Do NOT propose layouts until you understand the identity.
- Do NOT produce a monolithic answer. Iterate with me.
- Ask one thing at a time. Don't ask 10 questions at once.
- If CZ's answer is ambiguous, ask a follow-up.
- When you need to see code or a component, ask for the EXACT file.

---

## Scope

- **IN:** Landing page design (structure, copy, visual direction, component selection, animation choices)
- **OUT:** Actual implementation (that comes after RESULT.md)

---

## Expected Output

After our conversation converges, produce:
1. **RESULT.md** — Complete landing page specification (section-by-section, with copy, visual direction, motion mechanic assignments, component sources from MCP)
2. **Section Map** — Visual flow of the page (what comes after what, how scrolling feels)
3. **Component List** — Which MCP components to pull for each section
4. **Copy Draft** — Headlines, subtitles, CTAs, feature card text

---

## First Question

Before we talk about layouts, colors, or animations — **what does RHEO feel like to you?**

Not what it does. Not what features it has. What's the *feeling* when you open it? Is it:
- A command center? (controlled, precise, powerful)
- A living organism? (organic, growing, breathing)
- A private vault? (secure, impenetrable, yours)
- A workshop? (hands-on, build-it-yourself, craft)
- Something else entirely?

This identity will drive every design decision — the hero mechanic, the tone, the copy, the motion. Let's start here.
