# CONTEXT_BUNDLE.md — Learn Module Navigation Redesign

## Overview

The Learn module is a single-route SPA (`/learn`) in `LearnPage.tsx` that uses `useState<View>` to switch between 8 views. The user wants to consolidate views, fix navigation, and merge content.

---

## 1. Route & Entry Point

**File:** `src/App.tsx` (line 2670)
```tsx
<Route path="/learn" element={<LearnPage />} />
```

**Sidebar entry (line 2314):**
```tsx
{ icon: GraduationCap, label: 'Learn', path: '/learn' }
```

---

## 2. View State Machine

**File:** `src/components/learn/LearnPage.tsx`

```tsx
type View = 'welcome' | 'showcase' | 'library' | 'reader' | 'import' | 'intents' | 'progress' | 'study';
```

8 views managed by `useState<View>('welcome')`.

---

## 3. View Rendering Logic (lines 458-755)

### Welcome view (lines 458-476)
- Returns `<WelcomeEmptyState>` with NO header bar — full editorial page
- Also renders overlays: OnboardingPanel, LearnerSetup, LearnerProfilePanel, CreateLessonDialog
- Callbacks: `onCompose`, `onTryExample`, `onImport`, `onPaste`, `onBrowse`, `onShowcase`

### Non-welcome views (lines 478-754)
- Wrapped in `<div className="h-full flex flex-col">` with a header bar
- Header (lines 481-584):
  - Left: BookOpen icon + "Learn" title + conditional "Back to Library" button
  - Right: nav buttons — Home, Curriculum, Profile, Ideas, Progress, Study, How it works
  - Nav buttons only shown when `view === 'library' || view === 'showcase'`
  - Reader view shows keyboard shortcuts + grid/graph toggle instead
- Content area (lines 628-738): AnimatePresence switches between views

### Key observations:
- "Back to Library" appears for ALL non-library views (line 485: `view !== 'library'`)
- Nav buttons (Home, Curriculum, Profile, Ideas, Progress, Study) only appear on library/showcase
- From reader view, there's NO way to get back to showcase/home — only "Back to Library"
- The `welcome` view has zero navigation — it's a dead-end landing page

---

## 4. WelcomeEmptyState Component

**File:** `src/components/learn/WelcomeEmptyState.tsx` (224 lines)

### Layout:
```tsx
<div className="lyceum-welcome relative flex min-h-full w-full items-center justify-center overflow-hidden px-6 py-16">
  {/* ambient glow */}
  <div className="relative mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
    {/* Left: invitation (badge, heading, CTA buttons) */}
    {/* Right: floating book hero */}
  </div>
  {/* Quick actions — ABSOLUTE POSITIONED at bottom */}
  <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-6 pb-10">
    <div className="grid gap-3 sm:grid-cols-4">
      {/* 4 action cards + Copy Lesson Prompt */}
    </div>
  </div>
</div>
```

### Problems:
- `min-h-full` + `items-center` centers vertically but the content sits low because the quick actions are `absolute bottom-0`
- The hero content is at optical center but the page feels empty above it
- Quick actions are pinned to viewport bottom, not flowing naturally below hero

### Props:
```tsx
interface WelcomeEmptyStateProps {
  onCompose: () => void;
  onTryExample: () => void;
  onImport: () => void;
  onPaste: () => void;
  onBrowse?: () => void;
  onShowcase?: () => void;
}
```

---

## 5. FeatureShowcase Component

**File:** `src/components/showcase/FeatureShowcase.tsx` (182 lines)

### Structure:
- Full standalone page with its own hero section ("Feature Showcase")
- Sticky filter bar with category pills (All, Text, Diagrams, Interactive, Visualization, AI, Structure)
- Search input
- Expand/Collapse all toggle
- Grid of FeatureCard components (each expandable with live demo + .lmd syntax)

### Key detail:
- The component has its own `min-h-screen bg-[#0f0e0d]` wrapper — it's designed as a full page
- Uses `features` from `src/data/features` and `CATEGORY_META` from `src/types/showcase`
- No back button or navigation — relies on parent LearnPage header

---

## 6. ProgressDashboard Component

**File:** `src/components/learn/ProgressDashboard.tsx` (187 lines)

### Content:
- HeatmapBlock (90-day study activity)
- 4 LedgerCards: Cards Due, Q&A Total, Day Streak, Avg Confidence
- Active Learning panel: conversations, proposals, notes
- Most Studied panel: top nodes with counts

### Data fetched via IPC:
```tsx
api.learnGetDashboard() // returns { total_answers, total_questions, avg_confidence, recent_notes, open_proposals, active_conversations, streak_days, top_nodes }
api.learnGetHeatmap() // returns HeatmapCell[]
```

---

## 7. LessonLibrary Component

**File:** `src/components/learn/LessonLibrary.tsx` (228 lines)

### Already shows:
- MasteryStrip (mastery level distribution bar)
- TutorDashboardSection (Q&A stats)
- Lesson grid (covers/spines toggle)
- Compose/Import buttons

### Props:
```tsx
interface LessonLibraryProps {
  lessons: LessonSummary[];
  loading?: boolean;
  onOpen: (id: string) => void;
  onInfo?: (id: string) => void;
  onCompose: () => void;
  onImport: () => void;
  onWelcome?: () => void;
  stats?: MasteryStats;
  onOpenProfile?: () => void;
  getDashboard?: () => Promise<TutorDashboardData>;
  onNavigateToNode?: (nodeId: string) => void;
}
```

### Note:
- `onWelcome` callback exists but is wired to `setView('showcase')` NOT `setView('welcome')` (LearnPage line 646)

---

## 8. IntentLibrary Component

**File:** `src/components/learn/IntentLibrary.tsx` (211 lines)

### Content:
- List of saved learning intents (ideas/seed topics)
- Search filter
- Each intent: category badge, title, description, time ago, expand, "Generate lesson from this" button, delete

### Data fetched via IPC:
```tsx
api.learnListIntents() // returns Intent[]
```

---

## 9. ImportView Component

**File:** `src/components/learn/ImportView.tsx`

### Content:
- File picker or paste textarea for .lmd/.ldoc files
- Worked example card
- ValidationReport
- Import button

---

## 10. StudyView Component

**File:** `src/components/learn/StudyView.tsx`

### Content:
- Flashcard spaced-repetition review session
- 3D flip cards, rating buttons (Again/Hard/Good/Easy)
- Progress bar, stats bar

---

## 11. Design System / Tokens

- **Colors:** clay (orange-brown), sage (green), amber (yellow), zinc (grays)
- **Fonts:** serif for headings, mono for labels, sans for body
- **Patterns:** glass cards (`bg-[#1c1917]`, `border-white/10`, `backdrop-blur-sm`), `BlurFade` animations
- **Icons:** Lucide React
- **Animations:** Framer Motion (springy variants, AnimatePresence)
- **Shared components:** `BlurFade`, `BorderBeam`, `Button`, `Skeleton`

---

## 12. Navigation Flow Summary

```
welcome (no header)
  → library (via "browse your library")
  → showcase (via "explore all features")
  → import (via quick actions)

library/showcase (full nav header)
  → welcome (via "Home" button)
  → showcase (via "Curriculum" button)
  → intents (via "Ideas" button)
  → progress (via "Progress" button)
  → study (via "Study" button)
  → reader (via clicking a lesson)

reader (reader-specific header)
  → library (via "Back to Library")
  NO path to: welcome, showcase, intents, progress, study

intents/progress/study (full nav header)
  → library (via "Back to Library")
  → welcome (via "Home" button — but only if view === 'library || view === 'showcase')
```

### Critical navigation bugs:
1. From `reader`, you can ONLY go back to Library — no path to Home/Showcase
2. From `intents` or `progress`, the "Home" button doesn't appear (nav buttons only show for library/showcase)
3. The `welcome` view has NO header/nav at all — once you leave, you can only get back via Library → Home button
4. `onWelcome` in Library is wired to `setView('showcase')` not `setView('welcome')` (line 646)
