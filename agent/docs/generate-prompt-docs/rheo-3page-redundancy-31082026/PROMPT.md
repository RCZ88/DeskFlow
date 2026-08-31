# PROMPT — RHEO Landing Page Section Redundancy Overhaul

> Send this + `CONTEXT_BUNDLE.md` to the target AI. The bundle is the source of truth
> for code structure; the target AI reads it first and designs from it.

## Raw Request

```
IT NEEDS OT BE FULLY REVAMPED . THE DESINGOF THIS IS ASSSSS. ITS AGAIN REDUDNAT FOR
THE3 PAGES TOS HOW TEH SAMETHIGNS>i need you to generate promtp to ask for the
solution for the 3 page redudnacy thing
```

(User's words, verbatim. Do not reinterpret.)

## Context

Read `CONTEXT_BUNDLE.md` (same folder) first — it contains the full source of every
affected file, the WARPS data model, the design tokens, the section order, and the
verified redundancy map. Summary: the RHEO landing page (`rheo-landing/`, React 19 + Vite +
Tailwind v4) introduces its subsystems **three times** with overlapping copy — Hero shows 3
caption boxes (MONEY/LEARNING/TERMINAL), Shuttle shows the **same 3 captions again**, and
Threads re-shows them inside its all-7 pass. The user experiences this as "3 pages showing
the same things" and rates the design as poor. The fix is an information-architecture
restructure, not a visual tweak (the canvas/type are already premium).

## The Mandate

Act as **Lead Designer and Engineer** for this landing page. Design a comprehensive,
single, well-reasoned solution that eliminates the 3-section redundancy by giving each
section exactly ONE job, with no overlap in what content they present. Do NOT present
options A/B/C — deliver the best version.

## Required Deliverable (single solution)

### 1. Final section flow (top to bottom)
A numbered list, each section with:
- **ONE sentence job statement** (what this section alone is responsible for).
- **What content lives here and ONLY here.**
- **What it explicitly does NOT do** (to prove no overlap with neighbours).

The five required messages (metaphor / AI-native / local-first / what-subystems-are /
open-source CTA) must each land exactly once.

### 2. Content ownership map
For each of the 7 core warps (TIME, MONEY, FOCUS, LEARNING, CHAT, TERMINAL, TIMELINE) and
the 12 store modules, state the **SINGLE section** where it is first named + described.
No subsystem may be introduced in more than one section.

### 3. Resolution of the Hero/Shuttle duplication
State which of Hero-captions vs Shuttle-captions is **deleted**, and what the survivor's
new distinct purpose becomes. Then give the Shuttle beat a genuinely distinct job — it must
express "the AI *acts on* a subsystem" (the shuttle passing through a warp and doing
something representative), NOT re-list a subsystem's name + one-liner.

### 4. Merge / delete candidates
Call out any section that should be merged or deleted outright to kill redundancy.

### 5. Live loom canvas role-per-section
Specify how `LiveLoomCanvas` (already built; props: `activeWarpIndex`, `warpStiffness`,
`weftTension`, `reducedMotion`) changes ROLE across sections — e.g. ambient in Hero, one
warp goes taut + glowing in the "AI acts" beat, the whole system relaxes in the Fabric/zoom
beat. The canvas is the through-line; text must not duplicate what the canvas already shows.

## Engineering Task
Specify the concrete code changes per file (`Hero.tsx`, `Shuttle.tsx`, `Threads.tsx`,
`ModuleStore.tsx`, `App.tsx` order if it changes): which arrays/props/JSX blocks to remove,
what new minimal markup expresses the distinct job, and how scroll mapping feeds the canvas.
Keep it pure-frontend (static arrays only). Respect `noUnusedLocals`/`noUnusedParameters`.

## Design Task (high-fidelity visual specs)
Exact hex codes, spacing, type scale, animation curves (use the tokens in the bundle:
`--color-amber #fbbf24`, `--color-terracotta #c2703d`, `--font-display Fraunces`,
`--ease-premium cubic-bezier(0.16,1,0.3,1)`). Dark mode only. Single motif (thread/stitch).

## UX Task (interaction flow)
For the new Shuttle "AI acts" beat: what the user sees on scroll-in, at peak, on scroll-out.
Empty/edge states for reduced-motion.

## Constraints (hard limits)
- Keep the Loom motif + amber/terracotta palette + Fraunces/JetBrains Mono. No new visual language.
- Keep `LiveLoomCanvas` as the through-line.
- Each subsystem named exactly once in the scroll narrative.
- No backend/IPC — static arrays only.
- Build target: `npm run build` (outputs `dist-tmp/`).

---

## MANDATORY: Frontend Design Skills (load + follow these)

1. **Frontend Design** — DeskFlow component patterns, tokens, spacing, typography, glass cards.
2. **Human-Centric UX** — empty/loading/error states, progressive disclosure, visual hierarchy, feedback.
3. **Impeccable** — 7 dimensions (typography, color, spatial, motion, interaction, responsive, UX writing), 27 anti-patterns.
4. **Motion — Bring the UI Alive** — Liveliness Levels (L1 Composed / L2 Responsive / L3 Expressive), motion taxonomy.
5. **UI UX Pro Max** — industry rules (dev tools, AI/ML, financial), style library.
6. **Design Taste System** — variance knobs, anti-repetition rules.
7. **frontend-external-infra** — source routing, re-skin rules, anti-slop checklist.

## MCP Inventory (query + list real component names)

| Component | Source | Use for |
|-----------|--------|---------|
| card | shadcn | Section reference cards |
| dialog | shadcn | Modals (if any) |
| Animated Beam | Magic UI | Connecting shuttle→warp line |
| Border Beam | Magic UI | Card hover accent (already used in ModuleStore) |
| Number Ticker | Magic UI | Stat counters (if used) |
| Bot | Lucide | AI/shuttle icon |
| Sparkles | Lucide | AI-action accent |
| Target | Lucide | Focus warp |

## Anti-Slop Checklist (apply after any component)
1. Re-skin to tokens (`--color-amber`, `--color-terracotta`, `--color-surface`).
2. Max `rounded-xl`, `p-5` padding.
3. Dark mode only.
4. Fraunces (display) + JetBrains Mono (labels) only.
5. Glass layer (`bg-surface/80 backdrop-blur-xl`) where cards sit over the canvas.

## Output Format
Return a single markdown spec with: (A) final section list + jobs, (B) content ownership
map, (C) Hero/Shuttle resolution, (D) merge/delete calls, (E) canvas role-per-section,
(F) per-file code-change instructions, (G) visual specs, (H) UX flow. No menu of options.
