# AiPage Redesign — Design Brief / Prompt

## Raw Request

> "i see 0 change in the ai assistant page, AND WHERES MY DAILY DIGEST???? WHY IS THERE NOTHING REVAMPED????"
> "have you implement everything properly? why is hte ui so ugly? theres barely any changes? theres no style, the ui is not alive, its so boring and plain? if everything is alreayd implemented, i need you to generate a new prompt saying that the ui is ugly and unalive, theres no characther whatsoeevr. and a lot of them are like colliding fwith oen another ( the cards) the measurement and every part of the ai pagei s NOT NEAT at all. its very messy. yknow wut, i would like fory ou to do it. so i would like you to use all skills like the @agent/skills/frontend-design/SKILL.md @agent/skills/impeccable\ @agent/skills/humancentred-UIUX\ @agent/skills/ui-ux-pro-max\ @agent/skills/motion-alive\ @agent/skills/taste-skill\ and all the mcp to redesign most of them. make it more alive, have CHARACTHER. be the best designer.  plan out first.  the daily digest feature which is supposed to do the research daily thing on the internet to gather some new nnews are gone. my previous model ai does a REALLY BAD job on revamping. i needyou to do the best design possible. make it more alive, make it have a characther."

## Diagnosis

1. **HashRouter navigation:** The app uses `HashRouter`; direct `/ai` renders Dashboard. The correct path is `/#/ai`.
2. **AiPage renders, but is empty:** Focus/Plan/Reflect all show 0 items in the current data state.
3. **Daily Digest is buried:** The digest lives inside `ReflectFeed` as a "Research (0)" filter tab, so it appears "gone."
4. **Backend is real:** `getTopicDigest`, `isDigestGenerating`, `onDigestGenerationComplete` exist in `preload.ts` and `main.ts`. Interest topics are configured in Settings → AI Assistant.
5. **Previous redesign was too subtle:** A 1px gradient bar, tiny timeline dots, and a sliding filter tab are not enough character for an AI Assistant page.
6. **Layout feels messy:** Stacked full-width sections with inconsistent spacing and no clear visual rhythm make cards feel like they collide.

## Design Mandate

Redesign the DeskFlow AI Assistant page (`/ai`) so it feels **alive, intentional, and human-centered**. Give it **character** through:

- A clear bento-style information architecture.
- A prominent, first-class **Daily Digest** section.
- Stronger visual hierarchy, consistent spacing, and deliberate color accents.
- Purposeful motion (L2–L3 responsive/expressive) — hover lift, press feedback, staggered entrances, ambient background glow.
- Rich empty states that tell the user what to do next.

## Scope

- `src/pages/AiPage.tsx` — page shell, layout, routing to sections.
- `src/components/ai/focus/FocusBoard.tsx` — daily goals, suggestions, review.
- `src/components/ai/plan/PlanBoard.tsx` — weekly plan + long-term goals.
- `src/components/ai/reflect/ReflectFeed.tsx` — reflection timeline.
- **New:** `src/components/ai/digest/DailyDigestBoard.tsx` — dedicated daily research digest section.

## Design Tokens (from skills)

- **Base:** `zinc-950` background; `zinc-900/40` glass cards; `zinc-800/60` borders.
- **Accents:** pink (AI/Focus), emerald (Plan), amber/cyan (Daily Digest), violet (suggestions).
- **Typography:** Geist/Inter UI, JetBrains Mono for data; 11px meta, 13px body, 15px section titles.
- **Radius:** `rounded-xl` (12px) max.
- **Spacing:** 8px grid; sections separated by 24–32px.
- **Motion budget:** L2–L3 — 150–300ms micro-interactions, staggered list entrances, one restrained ambient aurora background, reduced-motion fallback.

## Layout Plan

```
AiPage
├── Subtle ambient aurora background (very low opacity, behind content)
├── Sticky glass header: AI Assistant | date | mode badge | Settings/Features
├── Main chat hero: AiChat in a large, elevated GlassCard
├── Context rail (right or below chat): SummaryGrid + Connectors
├── Bento content grid
│   ├── DailyDigestBoard (full-width hero card, amber/cyan accent)
│   ├── FocusBoard + PlanBoard (side-by-side on xl, stacked on mobile)
│   └── ReflectFeed (full-width timeline)
└── Footer status line
```

## Component-Specific Changes

### DailyDigestBoard (new)

- Header: calendar/date badge, "Daily Digest" title, topic count, Configure/Generate/Refresh actions.
- **No topics configured:** friendly empty state explaining the feature, CTA to Settings → AI Assistant.
- **Topics configured, no digest:** "Ready to research today's topics" with a primary "Generate digest" button.
- **Loading:** shimmer skeleton matching topic cards.
- **Populated:** expandable topic cards with icon, title, summary, source links.

### FocusBoard

- Larger metric strip with animated numbers and a circular progress ring.
- Mode indicator as a prominent accent pill with pulsing dot.
- Goal rows with clear category badges and hover/active states.
- AI suggestions as distinct cards with Accept/Dismiss.
- Review panel only in review mode, with reflection textarea.

### PlanBoard

- Cleaner separation: weekly plan markdown preview vs. long-term goals.
- Long-term goal cards with category-colored left border and visible reorder/delete on hover/focus.
- Bulk import dialog kept but styled consistently.

### ReflectFeed

- Prominent pill filter tabs with icons and counts, sliding active indicator.
- Timeline as a structured card list, not a thin line.
- Digest entries: rich cards with summary preview, expand for sources.
- Goal history entries: day cards with completion stats and goal list.
- Empty states per filter.

## Motion Plan

- **Page load:** sections stagger in with `y: 12 → 0`, `opacity: 0 → 1`, 250ms, `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Cards:** hover `y: -2`, accent ring glow; press `scale: 0.98`.
- **Tabs:** `layoutId` sliding indicator.
- **Lists:** staggered children `0.04–0.06s`.
- **Ambient:** single slow aurora gradient drift behind header (18s loop, very low opacity), never behind body text.
- **Reduced motion:** disable transforms and ambient loops.

## Backend Verification

| Feature | IPC Channel | Handler | Service | Status |
|---|---|---|---|---|
| Daily digest load | `get-topic-digest` | ✅ main.ts | AIService | ✅ Real |
| Digest generation status | `is-digest-generating` | ✅ main.ts | state var | ✅ Real |
| Digest complete event | `onDigestGenerationComplete` | ✅ main.ts | event | ✅ Real |
| Goals | `getGoals`, `saveGoal`, `deleteGoal` | ✅ main.ts | GoalStore | ✅ Real |
| Long-term goals | `getLongtermGoals`, `saveGoalsBatch` | ✅ main.ts | GoalStore | ✅ Real |
| Plan markdown | `readPlanningMd`, `writePlanningMd` | ✅ main.ts | fs | ✅ Real |
| AI providers/routing | `getAiProviders`, `saveAiProviders` | ✅ main.ts | preferences | ✅ Real |

No new backend needed; redesign is renderer-only.

## Anti-Patterns to Avoid

- No pure black backgrounds.
- No `rounded-2xl`/`rounded-3xl`.
- No animating width/height/top/left.
- No more than 3 accent colors per view.
- No missing empty/loading/error states.
- No icon-only buttons without tooltips.

## Implementation Order

1. Backup `src/components/ai` and `src/pages/AiPage.tsx`.
2. Write `DailyDigestBoard.tsx`.
3. Rewrite `AiPage.tsx` shell/layout.
4. Rewrite `FocusBoard.tsx`.
5. Rewrite `PlanBoard.tsx`.
6. Rewrite `ReflectFeed.tsx`.
7. Build and verify in running Electron app at `/#/ai`.
8. Update `FEATURE_TRACKER.md` and `state.md`.

## Success Criteria

- `/ai` shows a visually distinct, alive AI Assistant page.
- Daily Digest is visible and prominent even when empty, with clear next steps.
- No console errors.
- Build passes (`node scripts/build.mjs`).
- Cards have clear spacing, hover states, and do not visually collide.
