# Collaboration Request: Life Interconnected River

## Your Role
You are the Specialist AI. I am the Project Owner AI. I know the codebase; you know how to design and architect solutions. We will collaborate through a structured back-and-forth to refine this idea into an implementable specification.

## The Idea (user's verbatim requirement — preserve intent exactly)

> **User:** "The Life page currently has three separate tabs (Covenant, Memories, Gold) — each a silo. I want ONE interconnected 'whole page' instead. Turn the whole Life experience into a single flowing 'Life River': a continuous visual journey where my commitments/covenants, my memories/photos, my gold goals, and my life phases are all strands feeding into the same river and shown TOGETHER — not in separate tabs.
> Concrete requirements:
> 1. Phase/journey cards must be individually color-customizable (per-card color override).
> 2. Color bands on cards must be FULLY VISIBLE (solid), never a translucent dark shade over the card content — no black/dark overlay dimming the color.
> 3. The page should feel like one living thing — one continuous visual flow — not tab-switching between pages."

## Current Context (What I Have)
The complete context bundle is attached in the same folder. Read these files in order:

- `CONTEXT_BUNDLE.md` — Project overview, design system, LifePage host (current 3-tab structure), Part B fetch-on-request inventory
- `CONTEXT_BUNDLE_PART_2_COVENANT.md` — Covenant sub-feature, verbatim (CovenantPage, useCovenant, storage, streak, colors)
- `CONTEXT_BUNDLE_PART_3_MEMORIES.md` — Memories sub-feature, verbatim (MemoriesPage, useMemories, mediaStore/IndexedDB, all cards/reels/reveal)
- `CONTEXT_BUNDLE_PART_4_LIFE_RIVER.md` — River of Years UI, verbatim (LifeRiver, RiverCanvas SVG, PhaseDrawer + color picker, PhaseFormDialog, ReflectionFlow, EraTrendsCard, EmptyRiver, riverMath.ts, useLifePhases.ts)
- `CONTEXT_BUNDLE_PART_5_BACKEND.md` — DB schema (life_phases, life_timeline_meta), all 8 lifePhase IPC handlers verbatim, preload bridge, GoldPage structure, routing

Key facts you must respect:
- **Project:** DeskFlow — Electron + React 18 + Vite + Tailwind + framer-motion + lucide-react + better-sqlite3. HashRouter. Dark glass theme (zinc-900), warmth accent palette (clay #e8866b, sage #6fb38f, amber #fbbf24, sky #5ab0c9 + feature accents).
- **Data split is asymmetric:** Covenant = localStorage (commitments/events/journal). Memories = IndexedDB blobs + meta. Gold + Life Phases = SQLite via `lifePhase:*` IPC (8 handlers, all wired through preload — no backend work needed).
- **Existing primitives to reuse:** WarmCard, color-as-alpha idiom, framer-motion crossfade/pills, the PhaseDrawer color picker (COLOR_CHOICES), ReflectionFlow Q&A, EraTrendsCard, MemoryReveal lightbox, useLifePhases hook.
- **Gold page already embeds `<LifeRiver />`** at the bottom of the Gold tab — that is today's only interconnection.

## Context Gaps (What I Don't Have Yet)
- If you need the full GoldPage.tsx source (1303 lines; currently only structure included in Part 5 §5.5), ask: `REQUEST: src/features/warmth/gold/GoldPage.tsx` and I will paste it.
- If you need any leaf component source (CommitmentCard, NewCommitmentModal, JournalDrawer, ReflectionPromptCard, ReflectionEcho, ConstellationHero, GraceResetMoment, MilestoneCelebration, MemoryUploader, RecapPlayer, PersonChip, videoThumbnail, useLongTermGoals, useCommitmentDetection, prompts), use the Part B inventory in CONTEXT_BUNDLE.md §3 and REQUEST it.
- If you need App.tsx routing/sidebar details beyond what Part 5 §5.6 provides, ask.
- If you need the CSS for `warmth-aurora` / `warmth-serif` / `ws-scroll`, ask (they are small utility classes in index.css).

## Conversation Protocol
**How we communicate:**

1. **You ask specific questions.** Format: `REQUEST: [specific file, schema, or clarification]`
2. **I fetch and respond.** Format: `CONTEXT: [file path]` + actual source code.
3. **You refine your understanding.** Ask follow-ups or propose a design.
4. **When ready, you produce RESULT.md.** Format follows our standard specification (design spec + file-by-file implementation plan + backend audit).

**Rules:**
- Do NOT assume context you don't have. Ask for it.
- Do NOT design for features whose backend doesn't exist. Flag them. (Note: lifePhase backend is COMPLETE; Covenant/Memories have NO backend by design — any change must stay client-side or we add new IPC, which you must flag.)
- Do NOT produce a monolithic answer in round 1. Iterate with me.
- Start with 3-5 questions about the idea, not a full design.

## Scope
- IN: Redesign of the `/life` page experience — replacing the 3-tab structure with one interconnected Life River page weaving together Covenant + Memories + Gold goals + Life Phases; per-phase color customization with SOLID fully-visible color bands; all states (empty/loading/error/populated); motion; responsive behavior.
- IN: Reuse of existing components/hooks where possible; flagging any new IPC/backend needs.
- OUT: Changes to other app pages (Dashboard, Finance, Terminal, etc.). Out: changes to the tracking engine. Out: backend migration of Covenant/Memories to SQLite unless you justify it and we agree.
- OUT (hard constraint): You never touch the database — all data writes happen through the app's own IPC/localStorage/IndexedDB when the user acts.

## Expected Output
After our conversation converges, produce:
1. **RESULT.md** — The complete design specification (following the standard generate-prompt RESULT format: every deliverable, every state, every component, exact copy).
2. **Implementation Plan** — File-by-file changes.
3. **Backend Audit** — Any missing IPC/services/DB schemas flagged.

## First Question
Start by asking me your first 3-5 clarifying questions about the idea, the current structure, or any context you need. Begin with `REQUEST:` lines where you need specific files.

IMPORTANT: Do not produce the design yet. Round 1 = your questions only.
