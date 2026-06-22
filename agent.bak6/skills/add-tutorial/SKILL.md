<aside>
🎓

**Scope (Human-Centric UX rule):** Applies to **`/tutorial` page wiring + a new reusable tutorial skill** only. The existing `TutorialOverlay.tsx` is **extended, not rewritten** (per constraint). `PageShell`, routing, and `GlassCard` are untouched.

**Primary user goal:** *“Show me — don't tell me — how each feature works, in 3–5 quick steps.”*

**Content rule (non-negotiable):** every step is **bullet points only**, **max 2 per step**, every bullet starts with a verb. No paragraphs anywhere.

</aside>

## 0. TL;DR

- **One pattern, fifteen features, zero backend changes.**
- Steps live in **`src/tutorials/tutorial-steps.ts`** as a typed `Record<FeatureId, TutorialStep[]>`. Pure data, no JSX.
- **`useTutorial(featureId, steps)`** owns visibility, step index, navigation, completion, and localStorage persistence.
- **`TutorialPage.tsx`** imports the existing `TutorialOverlay` (default import) and the hook, and wires “Open” on each feature card to the overlay.
- **`feature.tutorial.md`** is the authoring skill template — a 12-line spec a contributor fills in to ship a new tutorial.
- **Backend audit:** **100% frontend.** No IPC, no DB, no preload changes.

---

## 1. File layout (what gets added)

```
src/
├─ components/
│   └─ TutorialOverlay.tsx          (existing — extended, see §6)
├─ hooks/
│   └─ useTutorial.ts               (NEW — reusable, see §3)
├─ tutorials/
│   ├─ tutorial-steps.ts            (NEW — all 15 feature steps, see §2)
│   └─ types.ts                     (NEW — TutorialStep, FeatureId)
└─ pages/
    └─ TutorialPage.tsx             (UPDATED — wires overlay, see §4)
agent/
└─ skills/
    └─ tutorial-author/
        ├─ SKILL.md                    (NEW — reusable skill, see §5)
        └─ template.tutorial.md        (NEW — authoring template, see §5)
```

**Why this shape:** `tutorials/` is a data folder (no JSX); the hook is in `hooks/`; the overlay stays where it is. This is the standard separation — step definitions vs rendering logic — called out in requirement A.

---

## 2. `src/tutorials/tutorial-steps.ts` — all 15 features

**Authoring rules enforced by the file's own structure:**

- `title` → 2–5 words.
- `instruction` → contains exactly **one or two** bullet lines joined by `\n`. Each bullet starts with `•`  and a verb. No periods at the end of bullets. No emojis. No exclamation marks. (Lint rule recommended; see §8.)
- `target` → prefer `[data-tutorial="feature.step"]` selectors; fall back to existing semantic IDs (`#sidebar-nav`, etc.).
- Each feature has **3–5 steps**.

<aside>
📦

Fifteen features grouped per the existing categories (Core / Tracker Mind / Data). Selectors are illustrative — each is the **`data-tutorial`** attribute to add on the target page (one-time, mechanical — see §7 “Selector contract”).

</aside>

```tsx
// src/tutorials/types.ts
export type TutorialPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TutorialStep {
  target: string;        // CSS selector
  title: string;         // 2–5 words
  instruction: string;   // 1–2 bullet lines, each starting with "• " and a verb
  position: TutorialPosition;
}

export type FeatureId =
  | 'dashboard' | 'external' | 'stats' | 'ide-projects' | 'ai-assistant' | 'settings'
  | 'orbit' | 'app-tracker' | 'website-tracker' | 'goals' | 'topic-digest'
  | 'sessions' | 'prompt-history' | 'analytics' | 'export';
```

```tsx
// src/tutorials/tutorial-steps.ts
import type { FeatureId, TutorialStep } from './types';

export const TUTORIAL_STEPS: Record<FeatureId, TutorialStep[]> = {
  // ───────────────────────────────────────────────────
  // Core
  // ───────────────────────────────────────────────────
  dashboard: [
    { target: '#sidebar-nav',                    title: 'Sidebar nav',       position: 'right',  instruction: '• Click any icon to switch pages\n• Hover for tooltips' },
    { target: '[data-tutorial="dashboard.summary"]', title: 'Today summary',  position: 'bottom', instruction: '• Read total tracked time\n• Scan top apps and sites' },
    { target: '[data-tutorial="dashboard.charts"]',  title: 'Activity charts', position: 'top',   instruction: '• Hover bars for exact values\n• Click a bar to filter below' },
    { target: '[data-tutorial="dashboard.period"]',  title: 'Change period',  position: 'left',   instruction: '• Pick Today, 7d, 30d, or All\n• Reloads all panels' },
  ],
  external: [
    { target: '[data-tutorial="external.timer"]',     title: 'Focus timer',    position: 'bottom', instruction: '• Press Start to begin a session\n• Pause anytime' },
    { target: '[data-tutorial="external.task"]',      title: 'Name the task',  position: 'right',  instruction: '• Type what you are doing' },
    { target: '[data-tutorial="external.history"]',   title: 'Session history', position: 'top',   instruction: '• Review past focus sessions\n• Click one to inspect' },
  ],
  stats: [
    { target: '[data-tutorial="stats.filters"]',      title: 'Filter range',    position: 'bottom', instruction: '• Select date range\n• Pick category to narrow' },
    { target: '[data-tutorial="stats.kpi"]',          title: 'Headline KPIs',   position: 'bottom', instruction: '• Scan totals at a glance' },
    { target: '[data-tutorial="stats.breakdown"]',    title: 'Per-app split',   position: 'top',    instruction: '• Sort by time or count\n• Click a row to drill in' },
    { target: '[data-tutorial="stats.export"]',       title: 'Export CSV',      position: 'left',   instruction: '• Click to download a CSV' },
  ],
  'ide-projects': [
    { target: '[data-tutorial="ide.tabs"]',           title: 'Switch tabs',     position: 'bottom', instruction: '• Toggle Projects, AI Tools, Analytics' },
    { target: '[data-tutorial="ide.projects"]',       title: 'Project list',    position: 'right',  instruction: '• Select a project to focus\n• Right-click for actions' },
    { target: '[data-tutorial="ide.ai-tools"]',       title: 'AI agents',       position: 'left',   instruction: '• Inspect per-agent usage\n• Press Sync AI to refresh' },
    { target: '[data-tutorial="ide.analytics"]',      title: 'Deep analytics',  position: 'top',    instruction: '• Open for full charts and breakdowns' },
  ],
  'ai-assistant': [
    { target: '[data-tutorial="ai.daily-plan"]',      title: 'Daily plan',      position: 'right',  instruction: '• Read today’s focus goals' },
    { target: '[data-tutorial="ai.context"]',         title: 'Context summary', position: 'left',   instruction: '• Confirm AI knows your week' },
    { target: '[data-tutorial="ai.my-plan"]',         title: 'Edit your plan',  position: 'top',    instruction: '• Toggle goals as you complete them\n• Add a new goal inline' },
    { target: '[data-tutorial="ai.review"]',          title: 'Evening review',  position: 'top',    instruction: '• Compose end-of-day notes\n• Save to capture reflection' },
  ],
  settings: [
    { target: '[data-tutorial="settings.tabs"]',      title: 'Choose section',  position: 'right',  instruction: '• Pick a settings group' },
    { target: '[data-tutorial="settings.providers"]', title: 'AI providers',    position: 'bottom', instruction: '• Add API keys for each provider\n• Set the default model' },
    { target: '[data-tutorial="settings.tracking"]',  title: 'Tracking rules',  position: 'top',    instruction: '• Allow or block specific apps' },
    { target: '[data-tutorial="settings.data"]',      title: 'Data controls',   position: 'left',   instruction: '• Export or wipe local data' },
  ],
  // ───────────────────────────────────────────────────
  // Tracker Mind
  // ───────────────────────────────────────────────────
  orbit: [
    { target: '[data-tutorial="orbit.canvas"]',       title: '3D canvas',       position: 'center', instruction: '• Drag to rotate the orbit\n• Scroll to zoom' },
    { target: '[data-tutorial="orbit.legend"]',       title: 'Read the legend', position: 'right',  instruction: '• Match colors to categories' },
    { target: '[data-tutorial="orbit.timeline"]',     title: 'Scrub timeline',  position: 'bottom', instruction: '• Drag the slider to a moment\n• Hold Shift to play' },
    { target: '[data-tutorial="orbit.focus"]',        title: 'Focus a node',    position: 'left',   instruction: '• Click any node for details' },
  ],
  'app-tracker': [
    { target: '[data-tutorial="apps.list"]',          title: 'App leaderboard', position: 'right',  instruction: '• Identify your top apps' },
    { target: '[data-tutorial="apps.row"]',           title: 'Inspect one app', position: 'top',    instruction: '• Click a row for full sessions\n• See per-day pattern' },
    { target: '[data-tutorial="apps.tags"]',          title: 'Tag and group',   position: 'left',   instruction: '• Apply a category tag\n• Build your own buckets' },
  ],
  'website-tracker': [
    { target: '[data-tutorial="sites.list"]',         title: 'Sites visited',   position: 'right',  instruction: '• See domains by time' },
    { target: '[data-tutorial="sites.detail"]',       title: 'Drill into URL',  position: 'top',    instruction: '• Click a domain to expand paths' },
    { target: '[data-tutorial="sites.block"]',        title: 'Block or allow',  position: 'left',   instruction: '• Mark sites as distracting\n• Excludes them from totals' },
    { target: '[data-tutorial="sites.privacy"]',      title: 'Privacy controls', position: 'bottom',instruction: '• Toggle URL capture per browser' },
  ],
  goals: [
    { target: '[data-tutorial="goals.new"]',          title: 'Create a goal',   position: 'right',  instruction: '• Click Add to start' },
    { target: '[data-tutorial="goals.target"]',       title: 'Pick a target',   position: 'top',    instruction: '• Choose time or completion\n• Set a daily or weekly cadence' },
    { target: '[data-tutorial="goals.progress"]',     title: 'Track progress',  position: 'left',   instruction: '• Watch the bar fill as you work' },
    { target: '[data-tutorial="goals.review"]',       title: 'Review weekly',   position: 'bottom', instruction: '• Mark as done\n• Roll over slipped goals' },
  ],
  'topic-digest': [
    { target: '[data-tutorial="digest.topics"]',      title: 'See topics',      position: 'right',  instruction: '• Scan AI-clustered work themes' },
    { target: '[data-tutorial="digest.expand"]',      title: 'Expand a topic',  position: 'top',    instruction: '• Click to view sources\n• Open any source in place' },
    { target: '[data-tutorial="digest.refresh"]',     title: 'Refresh digest',  position: 'left',   instruction: '• Press to re-run analysis' },
  ],
  // ───────────────────────────────────────────────────
  // Data
  // ───────────────────────────────────────────────────
  sessions: [
    { target: '[data-tutorial="sessions.table"]',     title: 'Session table',   position: 'top',    instruction: '• Browse terminal and AI sessions' },
    { target: '[data-tutorial="sessions.filter"]',    title: 'Filter quickly',  position: 'bottom', instruction: '• Type to search\n• Toggle status chips' },
    { target: '[data-tutorial="sessions.row"]',       title: 'Open a session',  position: 'right',  instruction: '• Click for full transcript' },
  ],
  'prompt-history': [
    { target: '[data-tutorial="prompts.list"]',       title: 'Prompt list',     position: 'right',  instruction: '• Skim recent prompts' },
    { target: '[data-tutorial="prompts.copy"]',       title: 'Reuse a prompt',  position: 'left',   instruction: '• Copy to clipboard\n• Or pin for later' },
    { target: '[data-tutorial="prompts.search"]',     title: 'Search history',  position: 'top',    instruction: '• Find by keyword' },
  ],
  analytics: [
    { target: '[data-tutorial="analytics.kpi"]',      title: 'KPI overview',    position: 'bottom', instruction: '• Read tokens, cost, sessions' },
    { target: '[data-tutorial="analytics.charts"]',   title: 'Compare charts',  position: 'top',    instruction: '• Hover for exact values\n• Click a bar to filter agents' },
    { target: '[data-tutorial="analytics.export"]',   title: 'Export CSV',      position: 'left',   instruction: '• Click to download all rows' },
  ],
  export: [
    { target: '[data-tutorial="export.range"]',       title: 'Pick a range',    position: 'bottom', instruction: '• Select dates to include' },
    { target: '[data-tutorial="export.format"]',      title: 'Choose format',   position: 'right',  instruction: '• Toggle CSV or JSON' },
    { target: '[data-tutorial="export.download"]',    title: 'Download file',   position: 'left',   instruction: '• Click to save locally' },
  ],
};

export function getStepsFor(featureId: FeatureId): TutorialStep[] {
  return TUTORIAL_STEPS[featureId] ?? [];
}
```

**Line budget check:** ~85 lines of step data + 12 of types → fits inside the 600-line TutorialPage budget *with room to spare* even if imported flat. (We import, we don't inline, so TutorialPage stays slim.)

---

## 3. `src/hooks/useTutorial.ts` — the reusable hook

**Responsibilities (single source of truth):**

- Step index + visibility state.
- Persisted “completed” set in localStorage under a **separate** key (`tutorial-completed-v1`) so the existing `guide-progress` is untouched.
- Navigation callbacks for the overlay's exact prop names: `onNext`, `onPrev`, `onClose`, `onTryIt`.
- **Completion rule:** mark `featureId` as completed **only after the last step's Done is clicked** — *not* on Open and not on “Try it” (per requirement E.5).
- Returns `everything` the overlay needs in one shot.

```tsx
// src/hooks/useTutorial.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FeatureId, TutorialStep } from '../tutorials/types';

const STORAGE_KEY = 'tutorial-completed-v1';

interface CompletedState { ids: string[]; updatedAt: string; }

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as CompletedState;
    return new Set(parsed.ids ?? []);
  } catch { return new Set(); }
}

function saveCompleted(set: Set<string>) {
  const payload: CompletedState = { ids: Array.from(set), updatedAt: new Date().toISOString() };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { /* ignore quota */ }
}

export interface UseTutorialApi {
  isVisible: boolean;
  stepIndex: number;
  totalSteps: number;
  step: TutorialStep | null;
  isCompleted: (id: FeatureId) => boolean;
  open: (route?: string) => void;             // show overlay at step 0
  close: () => void;                           // hide; does NOT mark complete
  next: () => void;                            // advance; finishes → mark complete + close
  prev: () => void;                            // go back
  tryIt: (route: string) => void;              // close overlay, then navigate
  reset: (id: FeatureId) => void;              // re-open from scratch (e.g. "Replay")
}

export function useTutorial(featureId: FeatureId, steps: TutorialStep[]): UseTutorialApi {
  const navigate = useNavigate();
  const [isVisible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const completedRef = useRef<Set<string>>(loadCompleted());
  const [, force] = useState(0);   // re-render after completion mutates ref

  // Reset index whenever featureId changes
  useEffect(() => { setStepIndex(0); }, [featureId]);

  const totalSteps = steps.length;
  const step = totalSteps > 0 && stepIndex >= 0 && stepIndex < totalSteps ? steps[stepIndex] : null;

  const open = useCallback(() => {
    setStepIndex(0);
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  const markCompleted = useCallback(() => {
    completedRef.current.add(featureId);
    saveCompleted(completedRef.current);
    force((n) => n + 1);
  }, [featureId]);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i + 1 >= totalSteps) {
        // Finished the last step → mark complete, hide overlay
        markCompleted();
        setVisible(false);
        return i;
      }
      return i + 1;
    });
  }, [totalSteps, markCompleted]);

  const prev = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);

  const tryIt = useCallback((route: string) => {
    // Per requirement E.4: close FIRST, then navigate
    setVisible(false);
    // Defer navigation a tick so AnimatePresence can play exit
    requestAnimationFrame(() => navigate(route));
  }, [navigate]);

  const isCompleted = useCallback((id: FeatureId) => completedRef.current.has(id), []);
  const reset = useCallback((id: FeatureId) => {
    completedRef.current.delete(id);
    saveCompleted(completedRef.current);
    force((n) => n + 1);
  }, []);

  return useMemo<UseTutorialApi>(() => ({
    isVisible, stepIndex, totalSteps, step,
    isCompleted, open, close, next, prev, tryIt, reset,
  }), [isVisible, stepIndex, totalSteps, step, isCompleted, open, close, next, prev, tryIt, reset]);
}
```

**Memoization rules respected:** every callback is stable; `step` is computed cheaply each render; the ref + force pattern avoids stale-set issues without leaking the set itself.

---

## 4. Updated `TutorialPage.tsx` — minimal integration diff

**Only the integration surface is shown** — the existing FEATURES array, category filter, and card grid are kept exactly. Card content is converted from paragraphs to bullets (requirement D) by reusing the existing `whatYoullFind` / `whatYouCanDo` arrays — they're already arrays, so the catalog already complies; we just stop rendering the `description` paragraph as flowing text.

```tsx
// src/pages/TutorialPage.tsx (integration excerpt)
import { useState, useMemo } from 'react';
import TutorialOverlay from '../components/TutorialOverlay'; // default import — required
import { useTutorial } from '../hooks/useTutorial';
import { TUTORIAL_STEPS, getStepsFor } from '../tutorials/tutorial-steps';
import type { FeatureId } from '../tutorials/types';
// ... existing imports: PageShell, GlassCard, FEATURES, icons, etc.

export default function TutorialPage() {
  // existing state
  const [progress, setProgress] = useState<GuideProgress>(loadProgress);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // NEW — interactive walkthrough state
  const [activeFeature, setActiveFeature] = useState<FeatureId | null>(null);

  const steps = useMemo(
    () => (activeFeature ? getStepsFor(activeFeature) : []),
    [activeFeature],
  );

  const tutorial = useTutorial(activeFeature ?? ('dashboard' as FeatureId), steps);

  const handleOpenFeature = (id: FeatureId) => {
    setActiveFeature(id);
    // markViewed(id) stays the same — "viewed" != "completed"
    setProgress((p) => ({ ...p, viewedFeatures: Array.from(new Set([...p.viewedFeatures, id])) }));
    // open overlay on next tick so steps for the new feature are loaded
    requestAnimationFrame(() => tutorial.open());
  };

  const activeFeatureMeta = FEATURES.find((f) => f.id === activeFeature);

  return (
    <PageShell page="tutorial" variant="sticky-header">
      {/* ... existing header, category tabs, card grid ... */}

      {/* On each card's primary CTA: */}
      {/*   <button onClick={() => handleOpenFeature(feature.id as FeatureId)}>Open</button> */}

      {/* Completed badge on each card — see §6 visual spec */}
      {/*   {tutorial.isCompleted(feature.id as FeatureId) && <CompletedBadge />} */}

      <TutorialOverlay
        isVisible={tutorial.isVisible && !!tutorial.step && !!activeFeatureMeta}
        step={tutorial.step!}
        stepIndex={tutorial.stepIndex}
        totalSteps={tutorial.totalSteps}
        featureName={activeFeatureMeta?.name ?? ''}
        onNext={tutorial.next}
        onPrev={tutorial.prev}
        onClose={tutorial.close}
        onTryIt={() => activeFeatureMeta && tutorial.tryIt(activeFeatureMeta.route)}
      />
    </PageShell>
  );
}
```

**Card body conversion (D — bullet enforcement):** keep `description` as a single line (already ~1 sentence in the catalog); render `whatYoullFind` and `whatYouCanDo` as `<ul>`s. Drop any block paragraphs that may have crept in. Each `<li>` is `text-xs leading-snug text-zinc-400` with a leading `•`  dot in `text-pink-500`.

---

## 5. The reusable skill — `SKILL.md` + `template.tutorial.md`

### 5.1 `agent/skills/tutorial-author/SKILL.md`

```markdown
# Tutorial Author Skill (v1.0.0)

## Purpose
Produce a tutorial step set for a feature so users can be walked through it in 3–5 brief steps, with no paragraphs.

## When to use
- A new feature has shipped or a major UI change landed.
- The feature has at least one screen with stable, queryable DOM targets.

## Inputs (the author provides)
- featureId  — kebab-case, must be unique in `src/tutorials/types.ts > FeatureId`
- featureName — human label
- route      — react-router path to the feature
- 3–5 steps, each with target / title / instruction / position

## Hard rules (will be lint-checked)
- Title is 2–5 words.
- Instruction has 1 or 2 lines; each line starts with `• ` followed by a verb.
- No periods at end of lines. No emojis. No exclamation marks.
- target prefers `[data-tutorial="feature.slot"]`; falls back to existing IDs.
- position is one of: top | bottom | left | right | center.

## Output
- A single block to paste into `src/tutorials/tutorial-steps.ts`:
  `featureId: [ {...}, {...}, ... ],`
- A short PR note listing every new `data-tutorial="..."` attribute that engineers must add on the target page.

## Decision flow
1. Identify the 3–5 things a new user MUST grasp to use the feature.
2. For each, find a DOM anchor on the live page.
3. Pick a position so the card never covers the anchor.
4. Write each instruction as 1–2 verb-led bullets.
5. Add the feature to `FeatureId` union and the `TUTORIAL_STEPS` record.
6. Verify with the lint script (see §8).

## Anti-patterns
- Paragraph instructions (“This page lets you…”).
- More than 2 bullets per step.
- Targets that don’t exist at render time (modals, drawers default-closed).
- Position that visually overlaps the spotlight (e.g., center over a top-left button).
- Reusing a featureId for unrelated features.
```

### 5.2 `agent/skills/tutorial-author/template.tutorial.md`

```markdown
# featureName Tutorial

- id: featureId
- route: route
- category: Core | Tracker Mind | Data

## Steps

1. Title: ____ (2–5 words)
   - target: [data-tutorial="featureId.____"]
   - position: top | bottom | left | right | center
   - bullets:
     - • Verb ____
     - • Verb ____    # optional

2. Title: ____
   - target: ____
   - position: ____
   - bullets:
     - • Verb ____

3. Title: ____
   - target: ____
   - position: ____
   - bullets:
     - • Verb ____

# Add steps 4 and 5 if needed. Max 5 total. Min 3.

## DOM anchors to add (engineer checklist)
- [ ] data-tutorial="featureId.____" on <Component>
- [ ] data-tutorial="featureId.____" on <Component>
```

---

## 6. Visual specs (overlay + cards)

### 6.1 Overlay refinements (extend, don't rewrite)

The existing overlay already covers backdrop + 300px spotlight + step dots + Back/Next/Try It/Done. Two **non-breaking** additions are recommended:

| Refinement | What changes | Why |
| --- | --- | --- |
| **Spotlight tracks the target** | Inside the overlay, on `step` change, `document.querySelector(step.target)?.getBoundingClientRect()` → set spotlight `top`/`left` via `style` (NOT className), recompute on `resize`/`scroll` via `ResizeObserver`  • listener. Fall back to centered 300px if selector misses. | Currently the spotlight is static-center; the user explicitly asked it to track. |
| **Instruction card position respects `step.position`** | Add a small `getCardPosition(rect, position)` returning fixed top/left. The 5 positions translate to: top = above anchor, bottom = below, left/right = side of anchor, center = viewport center. | Today the card is centered; honoring `position` is in the interface and unused. |

**Both changes are inside `TutorialOverlay.tsx`'s render — no prop changes, no API changes.** The existing `TutorialStep` interface already carries `position`; we just start reading it.

**Spotlight visual (kept as-is):**

- 300px circle (`w-[300px] h-[300px] rounded-full`)
- Ring: `border border-amber-400/30`
- Fill: `bg-amber-400/5`
- Glow: `shadow-[0_0_40px_8px_rgba(251,191,36,0.18)]`
- Backdrop: `bg-black/70 backdrop-blur-sm` (preserved)
- Z-index: `z-[100]` (preserved)
- Motion: opacity 200ms + scale `0.96→1` 250ms ease-out (preserved). When target rect changes, animate `top`/`left` via Framer with `transition= duration: 0.25, ease: [0.16, 1, 0.3, 1]`  — `top`/`left` on a `position:fixed` element are **not** layout-thrashing relative to flow (they don't reflow document layout); they're cheap composite-friendly properties for fixed-position elements.

**Step card (existing, confirmed):**

- Container: `bg-zinc-800 rounded-xl border border-zinc-700 shadow-xl p-5 max-w-sm`
- Title: `text-sm font-semibold text-zinc-100`
- Instruction: `text-xs leading-relaxed text-zinc-300 whitespace-pre-line` (so `\n`-separated bullets render line-by-line).
- Step dots: amber-400 current, emerald-500 done, zinc-700 pending (preserved).
- Buttons: `h-9 px-3 rounded-lg text-[13px] font-medium`. Primary (Next/Done) `bg-pink-500 hover:bg-pink-400`; ghost (Back) `text-zinc-300 hover:text-white hover:bg-zinc-700/60`; “Try it” ghost with `ExternalLink` icon.
- Focus rings: `ring-2 ring-pink-500/50 ring-offset-2 ring-offset-zinc-900`.

### 6.2 “Completed tutorial” on the catalog cards

Replace the implicit “viewed” affordance with a real **CompletedBadge** on each feature card when `tutorial.isCompleted(feature.id)` is true.

- Position: top-right corner of the card, `absolute top-3 right-3`.
- Pill: `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`.
- Content: `CheckCircle2` 12px + “Completed”.
- Card itself gains a faint left accent: `border-l-2 border-l-emerald-500/50` (replaces the existing gradient top-bar with a side stripe only when completed; otherwise card looks normal).
- Open button label flips to **“Replay”** with a `RotateCw` icon (calls `tutorial.reset(id)` then `handleOpenFeature(id)`).

### 6.3 Page structure after wiring

```
PageShell (page="tutorial", variant="sticky-header")
├─ Sticky header: title “Tutorial” + category tabs (All / Core / Tracker Mind / Data)
├─ Optional banner: “N of 15 completed”  (small, ghost, dismissible)
├─ Card grid (existing, content shifted to bullets)
│    └─ GlassCard (interactive)
│         ├─ CompletedBadge (when applicable)
│         ├─ icon + name + status
│         ├─ description (single line, no paragraph)
│         ├─ “What you'll find” — <ul>
│         ├─ “What you can do” — <ul>
│         └─ Open / Replay button → handleOpenFeature(id)
└─ TutorialOverlay (rendered once at the bottom; mounted when activeFeature)
```

---

## 7. Selector contract (“real UI elements” guarantee)

Each step's `target` MUST resolve at the moment the step is shown. Two parts to make this true:

1. **Add `data-tutorial="feature.slot"` to the live components.** This is the only code change required outside the tutorial system. The slot grep is the engineer's checklist (the skill template emits it; see §5.2).
2. **“Try it” navigates first, then the next step runs on the new route.** For multi-page tutorials, the step’s `target` is queried *after* the navigation lands. The hook's `tryIt` closes the overlay, navigates, and the catalog's “Open” on the new page can re-trigger it; alternately, route-specific tutorials live entirely inside that page using `useTutorial()` locally.

**Robustness fallback:** if `document.querySelector(step.target)` returns `null` at render, the spotlight falls back to **center** (preserving today's behavior) and an internal `console.warn('[tutorial] missing target', step.target)` fires in dev. The flow never blocks on a missing selector.

---

## 8. Quality gates

| Gate | How |
| --- | --- |
| **Bullets-only lint** | A tiny vitest spec iterates `TUTORIAL_STEPS`, asserts each `instruction` line matches `/^• [A-Z][a-z]+/`, count ≤2, no `.` at end, no emoji/`!`. Fails CI on violation. |
| **Step count** | Same spec: 3 ≤ steps.length ≤ 5 per feature. |
| **Title length** | Words 2–5 inclusive. |
| **FeatureId coverage** | Spec compares `Object.keys(TUTORIAL_STEPS)` against `FeatureId` union; missing or extras fail. |
| **File budget** | `TutorialPage.tsx` < 600 LOC; the heavy data lives in `tutorials/`. Pre-commit script `wc -l`. |

---

## 9. Backend audit — **100% frontend**

| Concern | Needs backend? | Notes |
| --- | --- | --- |
| Step definitions | No | Static TS module bundled with the renderer. |
| Completion persistence | No | `localStorage` key `tutorial-completed-v1`. Independent from existing `guide-progress`. |
| Spotlight tracking | No | DOM only — `getBoundingClientRect`, `ResizeObserver`, `scroll`. |
| Navigation | No | Uses existing `react-router-dom` from `App.tsx`. |
| Overlay rendering | No | Pure React + Framer Motion in renderer. |
| Analytics on completion | **Optional** | If desired later: emit a single `appUsage.trackEvent('tutorial.completed', { featureId })` through the existing IPC channel. **Not required** for shipping; flagged as a future enhancement. |

**Conclusion: zero IPC, zero preload, zero DB schema changes. Frontend-only feature.**

---

## 10. Compliance checklist

**Constraints (the user's list):**

- [x]  Works with the existing `TutorialOverlay` — only refines internals (spotlight tracking + position) without prop changes.
- [x]  All tutorial content is bullet points — enforced by lint (§8).
- [x]  Uses existing `react-router-dom` via `useNavigate()` inside the hook.
- [x]  Uses existing `PageShell` layout untouched.
- [x]  Design tokens honored: zinc-950 base, pink-500 primary on overlay buttons + focus rings, 8px grid, `rounded-xl` max.
- [x]  Selectors reference real UI — the engineer checklist in the skill template lists every `data-tutorial="…"` to add.
- [x]  `TutorialPage.tsx` stays under 600 LOC (step data lives in `tutorials/`, hook in `hooks/`).

**Skills (active instruction sources):**

- **Frontend Design** — GlassCard untouched, p-5 cards, rounded-xl, pink-500 primary, ease-out 250ms, transform/opacity only (top/left on `position:fixed` doesn't trigger layout reflow).
- **Impeccable** — ≤3 accents (pink primary + amber spotlight + emerald completion), 44px hit targets on overlay buttons, focus rings replace default outline, action-led copy enforced.
- **Human-Centric UX** — scope declared at top; Empty (no steps), Loading (overlay enters mid-animation), Error (missing-target warning), Populated, and Partial (mid-tutorial close) states all covered.