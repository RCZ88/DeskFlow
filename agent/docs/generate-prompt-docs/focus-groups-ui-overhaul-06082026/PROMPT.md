# PROMPT — Focus Groups UI Overhaul (06082026)

> Target AI: **Claude** (or any frontier coding model with no access to the repo)
> Read **`CONTEXT_BUNDLE.md` in the same folder FIRST** — it is your only window into the
> DeskFlow codebase (verbatim source of every file you will touch). Design against that
> exact code, not against assumptions.

---

## Raw Request (verbatim, from the user — do not reinterpret)

1. **A proper dedicated page/section** that shows Focus Groups as first-class content — NOT a
   button that opens a dialog. Groups must be prominent, visible, and opaque.
2. The group editor's **app/site input must be a real picker connected to the tracked-apps
   data** (`get-known-apps` IPC → real apps/websites from the tracking logs), NOT free-text
   tag entry.
3. A **complete visual redesign** of the entire Focus area — timer, groups, stats, history,
   insights — into one beautiful, cohesive, opaque, goal-configurable interface with
   beautiful progress views.

## Problem Statement

Today the Focus tab (`/activity?tab=focus`) is a single embedded section whose groups
only appear as a small dialog opened from inside the timer card. The group editor asks
the user to type app names by hand into a free-text `TagInput` — the app has real
tracked-app data it never surfaces. Progress cards exist but are computed as placeholders
(`FocusGroupProgress` never computes progress from `history`). The user is frustrated:
the UI is minimal, invisible, transparent, and has no goal configuration.

## Your Role

Act as the **Lead Designer and Engineer**. Produce ONE comprehensive, well-reasoned
design for the complete Focus area — data flow, component architecture, visual specs,
interaction design. Do not offer "Option A / B / C". Own the solution end-to-end, from
logic to pixels.

## Deliverable Format

A single **spec document (RESULT.md)** containing:

1. **Architecture decision** — dedicated page vs. embedded section, and how it mounts
   (`FocusPage.tsx` exists but is dead — imported at `src/App.tsx:41`, never routed;
   `FocusSection.tsx` is the live composition root under ActivityPage's `focus` tab).
   State the decision and the exact mount point changes.
2. **Component breakdown** — every component you create/rewrite, its props, its states
   (empty / loading / error / populated), and its relationship to the existing files in
   the bundle.
3. **Data processing pipeline** — the exact math for: per-group daily goal progress
   (from `focus_group_usage` attribution + `history`), streak, weekly trend, best hour,
   average session length. Show the aggregation functions (pure TS, as in
   `focusHelpers.ts`).
4. **App/site picker spec** — full interaction + visual design for the searchable
   multi-select picker wired to `getKnownApps()`. NOTE: no combobox/select component
   exists in any MCP registry (verified) — design a custom one.
5. **Visual spec** — per-card: exact tokens, hex values, spacing, typography sizes,
   animation curves, empty states, hover/focus/disabled states.
6. **UX flow** — step by step: creating a group, picking apps, setting duration presets,
   setting a daily goal + goal category, running a session, watching progress accrue.
7. **Edge cases** — see below.

## Engineering Task

- The `daily_goal_sec` / `goal_category` fields exist in the renderer (`useFocusGroups.ts`
  types + `FocusGroupEditor.tsx`) but are **DROPPED by the backend**:
  `focusGroupManager.save()` (missing from its arg type + SQL statements),
  `focusSchema.ts` (no columns), and the `focusGroup:save` IPC whitelist in `main.ts`.
  ⚠️ **BACKEND GAP.** Design the fix (ALTER TABLE migration following the PRAGMA
  `table_info` + guarded-ALTER pattern in the bundle; manager + IPC pass-through) — but
  only as a clearly-marked implementation-phase appendix. The UI must be designed to
  render these fields regardless.
- `FocusGroupProgress` accepts a `history` prop but never computes progress (renders
  placeholder text). Design the real computation using `focus_group_usage` rows +
  `history`.
- Group attribution flows through `useActiveFocusGroup` (module-level singleton,
  `setActiveGroup`) → sessions record `focus_group_usage` rows. Keep that event flow
  intact; do not reorder or replace it.
- The free-text `TagInput` in `FocusGroupEditor.tsx` must be REPLACED by the picker
  (optionally keep free-text as a secondary "add custom app" affordance, clearly
  secondary).

## Design Task

Golden rules (hard, from the DeskFlow design system — see GlassCard.tsx + tokens in bundle):

- **Dark-only** — no light mode, no dual themes.
- **NO purple anywhere** — the Focus tab accent is pink `#ec4899` → `#f472b6` gradient
  family; page accents elsewhere are indigo/blue/emerald. Stay in the pink/rose family.
- **Max `rounded-xl`** — never larger radii.
- **Max `p-5`** padding on cards; white-space breathing room (more gap, less cramming).
- Fonts: **Inter/Geist** for UI text, **JetBrains Mono** for numbers/timers.
- **Opaque cards** — `bg-zinc-900/95`-class surfaces (user explicitly rejected
  transparency). No see-through dialogs.
- Glass layer pattern: `bg-[rgba(24,24,27,0.90)] backdrop-blur-xl` where glass is used.
- Every MCP-sourced component MUST be **re-skinned** to DeskFlow tokens (see anti-slop).

## Component Scope (minimum — design these)

- **Focus Groups surface** — first-class, prominent, NOT hidden in a dialog: name,
  description, goal (duration + category), member apps/sites with per-member
  edit/remove, strictness toggle, duration presets, active/archived states.
- **Group editor** — opaque panel (sheet/modal), searchable multi-select **app picker**
  from `getKnownApps()` (`{ app, category, last_used }` payload), **site/domain picker**
  from website rows, category picker, daily goal input (`dailyGoalSec`), goal category
  selection.
- **Timer card** — the redesign (currently `text-6xl` ring + presets + `DragDurationBar`).
- **Progress cards** — real goal bars (`AnimatedCircularProgressBar` + `NumberTicker` are
  available), active-group highlight, category badges.
- **Stats / History / Insights / Leaderboard / Distraction Log** — cohesive redesign to
  match.

## MCP Component Inventory (verified — real, installed or available)

| Component | Source | Use for |
|-----------|--------|---------|
| `dialog`, `button`, `badge`, `input`, `select` (native `<select>`, not combobox) | shadcn (installed) | Standard UI |
| `AnimatedCircularProgressBar`, `NumberTicker`, `Particles` | Magic UI (installed) | Goal rings, progress numbers, background depth |
| `framer-motion` (`motion`, `AnimatePresence`) | installed | Tab crossfades, card entrances |
| `lucide-react` icons | installed | `Target`, `Clock`, `Flame`, `TrendingUp`, `Focus`, `Plus`, `Search`, `X`, `Check`, `Trophy`, `AlarmClock`, `Layers`, `ListFilter`, `History` etc. |
| **Searchable multi-select combobox** | ❌ DOES NOT EXIST in any registry (verified shadcn/magicui/reactbits: 0 results) | Custom-built picker — full design required |

## Anti-Slop Checklist (applies to every component)

1. Re-skin everything to DeskFlow tokens — no default Tailwind/Magic UI colors.
2. Max `rounded-xl`, max `p-5`, `space-y-*` breathing room.
3. Dark only. No purple. Pink `#ec4899`→`#f472b6` accent family.
4. Geist/Inter + JetBrains Mono.
5. No generic "hero pattern" — the Focus area is a dense productivity surface.
6. Every section has a proper **empty state** with a CTA, a **loading state**, an
   **error state**, and a **populated state**.
7. No decorative-only cards — every element is either data or an action.
8. Consistent section labels (use `SectionHeader` from the bundle), consistent
   iconography, consistent hover/focus/disabled styles.
9. Motion used for feedback (pulse on active session, smooth progress transitions,
   confetti on goal completion via `focusConfetti.ts`), not decoration.

## Constraints (hard limits)

- Stay within the existing files listed in the bundle's file table — no new app-level
  routes unless your architecture decision section explicitly justifies one.
- Do NOT break the PTY/session/IPC event flow — Focus changes are renderer + focus
  domain only (plus the flagged backend gap).
- `localStorage` access must stay wrapped in try/catch (project invariant).
- Files are CRLF — preserve line endings, no mass reformatting.
- No test suite exists — do not propose tests.
- Do NOT redesign pages outside the Focus area (ActivityPage tabs other than `focus`,
  Dashboard, etc.).
- No backend persistence redesign beyond the flagged `daily_goal_sec`/`goal_category`
  gap.

## Edge Cases (cover all)

- Group with zero apps selected — saveable? warning?
- App appears in `getKnownApps()` with `category` but the group's strictness toggle
  conflicts with tier rules (`allowed: { tiers: [...] }` in the bundle).
- Duplicate app in a group; app renamed between sessions (match by `app` name only).
- Daily goal with `0` / unset — what does the progress bar show?
- Goal category with no matching apps.
- Long group names / long app lists — truncation + scroll behavior.
- Deleting a group that has usage history — cascade, archive, or orphan?
- First session with no active group selected — the attribution singleton behavior.
- Empty `history` array for a fresh group — progress must show 0%, not break.

## Acceptance Criteria

- The design reads as ONE coherent system (not bolted-together pieces).
- Every component has all 4 states (empty/loading/error/populated) specified.
- The picker spec is complete enough that a frontend engineer could build it without
  further questions (keyboard navigation, filtering, selection UX, custom-entry
  secondary path).
- Progress math is specified as pure functions with named inputs/outputs.
- Every file you propose to create/modify exists in the bundle with verbatim source —
  if you need something NOT in the bundle, say so explicitly in a "NEEDED FROM REPO"
  section instead of guessing.

---

## Skills to load (target AI, if available)

Load these in order before designing: Frontend Design → Human-Centric UX →
Impeccable → Motion (Bring the UI Alive) → UI UX Pro Max → Design Taste System →
frontend-external-infra (source routing + re-skin + anti-slop).
