# CONTEXT BUNDLE — Life Interconnected River (Life page overhaul)

> **Project Owner:** opencode (DeskFlow repo). **Specialist:** external AI with ZERO repo access.
> Every relevant file is embedded **verbatim** in this bundle (parts 1-5). If you need a file
> listed in Part B (fetch-on-request), ask with `REQUEST: <path>` and it will be pasted in the
> next CONTEXT message.
>
> **Bundle layout:** this file = overview + design system + Life page host + Part B inventory.
> `CONTEXT_BUNDLE_PART_2_COVENANT.md` = Covenant sub-feature. `CONTEXT_BUNDLE_PART_3_MEMORIES.md`
> = Memories sub-feature. `CONTEXT_BUNDLE_PART_4_LIFE_RIVER.md` = River of Years UI + hook + math.
> `CONTEXT_BUNDLE_PART_5_BACKEND.md` = DB schema + IPC handlers + preload + Gold page host.

---

## 0. Project Overview (the 30-second version)

- **App:** DeskFlow — an Electron + React (Vite) + better-sqlite3 desktop productivity tracker. HashRouter SPA. Windows.
- **Stack:** React 18, TypeScript, Tailwind, framer-motion, lucide-react, base-ui primitives (NOT radix), Chart.js, three.js (dashboard orbit).
- **Theme:** dark, zinc-900 glass cards (`rounded-xl`, `border-zinc-800/50`, `bg-zinc-900/60`), custom fonts: Space Grotesk (display), Inter (body), Source Serif 4 (`font-serif` italic for warm/personal copy), JetBrains Mono (mono).
- **"Warmth" pages** (Life, Gold, Memories, Covenant) use a warmer palette: clay `#e8866b`, sage `#6fb38f`, amber `#fbbf24`, sky `#5ab0c9`, plus feature accents (sky `#38bdf8`, violet `#a78bfa`, pink `#f472b6`, teal `#2dd4bf`).
- **Route:** `/life` → `src/features/warmth/LifePage.tsx` (lazy-loaded in App.tsx L69, routed L2895).
- **Backend:** everything in `src/main.ts` (~30k lines) — IPC handlers + SQLite. `src/preload.ts` exposes `window.deskflowAPI`.
- **Data split:** Covenant + Memories are **100% client-side** (localStorage / IndexedDB). Gold + River of Years are **SQLite via IPC**.
- **Hard rule (user):** ALL DB access is READ-ONLY for agents. The app writes via its own IPC. Never delete/modify the DB file directly.

## 1. Design System Essentials (DeskFlow warmth pages)

- Cards: `WarmCard` (see below) or raw divs `rounded-xl border border-zinc-800/50 bg-zinc-900/60 p-4`.
- Color-as-alpha idiom: accent colors used as `${hex}22` (bg tint), `${hex}40`/`${hex}44` (borders), `${hex}10`/`${hex}14` (chip bg).
- Serif italic for reflective/personal copy: `font-serif text-[13px] italic text-zinc-300`.
- Tiny uppercase labels: `text-[10px] tracking-wide uppercase text-zinc-500` (or accent-colored).
- Motion: framer-motion, ease `[0.16, 1, 0.3, 1]`, spring pills `{ type: 'spring', stiffness: 400, damping: 32 }`.
- `warmth-aurora` = ambient aurora backdrop div; `warmth-serif` = serif font class. `ws-scroll` = custom scrollbar.
- Lucide icons at `size-3.5` / `size-4` / `w-4 h-4`.
- **KNOWN RENDERER GOTCHA:** lucide-react here does NOT export `Loader2` or `Globe2` — use `LoaderCircle` and `Globe`.

### 1.1 `src/features/warmth/WarmCard.tsx` (VERBATIM)

```tsx
import type { ReactNode } from 'react';

interface WarmCardProps {
  children: ReactNode;
  className?: string;
  ambient?: boolean;
}

export function WarmCard({ children, className = '', ambient }: WarmCardProps) {
  return (
    <div
      className={`relative rounded-xl border border-zinc-800/50 p-4 ${ambient ? 'bg-zinc-900/20' : 'bg-zinc-900/60'} ${className}`}
    >
      {ambient && <div className="warmth-aurora" />}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
```

---

## 2. The Life Page Host — `src/features/warmth/LifePage.tsx` (VERBATIM, 125 lines)

Three tabs: **Covenant** (clay #e8866b), **Memories** (sage #6fb38f), **Gold** (amber #fbbf24).
Each embeds its subpage with `embedded` prop; crossfade on switch; `?tab=` URL param persisted.
**This is the structure the redesign must replace/extend — the user wants ONE interconnected
"whole page" instead of three siloed tabs.**

```tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartHandshake, Images, Target, Calendar, ListChecks, Flame } from 'lucide-react';
import CovenantPage from '../covenant/CovenantPage';
import MemoriesPage from '../memories/MemoriesPage';
import GoldPage from './gold/GoldPage';

const TABS = [
  { key: 'covenant', label: 'Covenant', icon: HeartHandshake, accent: '#e8866b' },
  { key: 'memories', label: 'Memories', icon: Images, accent: '#6fb38f' },
  { key: 'gold', label: 'Gold', icon: Target, accent: '#fbbf24' },
] as const;

type TabKey = typeof TABS[number]['key'];

const crossfade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};

const pillTransition = { type: 'spring' as const, stiffness: 400, damping: 32 };

export default function LifePage() {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'memories' || tab === 'covenant' || tab === 'gold') return tab as TabKey;
    } catch { /* ignore */ }
    return 'covenant';
  });

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', url.toString());
    } catch { /* ignore */ }
  }, [activeTab]);

  const activeConfig = TABS.find(t => t.key === activeTab) || TABS[0];
  const iconWrapStyle = { background: `${activeConfig.accent}22` };
  const iconStyle = { color: activeConfig.accent };

  return (
    <div className="flex flex-col h-full" data-page={activeTab}>
      <div className="sticky top-0 z-30 -mx-5 px-5 bg-zinc-900/20 backdrop-blur-md border-b border-zinc-800/50">
        <div className="flex items-center gap-1 py-2">
          <div className="h-9 w-9 rounded-xl grid place-items-center mr-2" style={iconWrapStyle}>
            <activeConfig.icon className="w-5 h-5" style={iconStyle} />
          </div>

          <div className="flex gap-1 bg-zinc-800/50 p-0.5 rounded-lg">
            {TABS.map(tab => {
              const pillStyle = { background: `${tab.accent}22`, border: `1px solid ${tab.accent}40` };
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-3 py-1.5 text-xs rounded-md transition-colors min-h-[36px] flex items-center gap-1.5 ${
                    activeTab === tab.key ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="life-tab-pill"
                      className="absolute inset-0 rounded-md"
                      style={pillStyle}
                      transition={pillTransition}
                    />
                  )}
                  <tab.icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10 font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'covenant' && (
            <motion.div
              key="covenant"
              initial={crossfade.initial}
              animate={crossfade.animate}
              exit={crossfade.exit}
              transition={crossfade.transition}
              className="max-w-3xl mx-auto"
            >
              <CovenantPage embedded />
            </motion.div>
          )}
          {activeTab === 'memories' && (
            <motion.div
              key="memories"
              initial={crossfade.initial}
              animate={crossfade.animate}
              exit={crossfade.exit}
              transition={crossfade.transition}
              className="max-w-4xl mx-auto"
            >
              <MemoriesPage embedded />
            </motion.div>
          )}
          {activeTab === 'gold' && (
            <motion.div
              key="gold"
              initial={crossfade.initial}
              animate={crossfade.animate}
              exit={crossfade.exit}
              transition={crossfade.transition}
              className="max-w-5xl mx-auto"
            >
              <GoldPage embedded />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

---

## 3. Part B — FETCH-ON-REQUEST INVENTORY (not embedded yet; ask and it will be pasted)

Small/leaf files (ask by path):
- `src/features/covenant/CommitmentCard.tsx` (includes `buildRecentDates`)
- `src/features/covenant/NewCommitmentModal.tsx`
- `src/features/covenant/JournalDrawer.tsx`
- `src/features/covenant/ReflectionPromptCard.tsx`
- `src/features/covenant/ReflectionEcho.tsx`
- `src/features/covenant/ConstellationHero.tsx`
- `src/features/covenant/GraceResetMoment.tsx`
- `src/features/covenant/MilestoneCelebration.tsx`
- `src/features/covenant/useCommitmentDetection.ts` (auto-detection from tracked apps)
- `src/features/covenant/prompts.ts` (reflection prompt packs)
- `src/features/memories/MemoryUploader.tsx`
- `src/features/memories/RecapPlayer.tsx`
- `src/features/memories/PersonChip.tsx`
- `src/features/memories/videoThumbnail.ts`
- `src/features/warmth/gold/GoldPage.tsx` (1303 lines; sections: GoldHeader, DayRing, WeekBoard, DeadlineRadar, ProgressRing, TheVault, BellBoard, ReflectionCard, WeekReview, GoalCard + goal CRUD IPC)
- `src/features/warmth/gold/useLongTermGoals.ts`
- `src/features/warmth/gold/goalSchema.ts` (if exists)

Large/context-heavy (ask ONLY if needed — summary in Part 5):
- Full `src/main.ts` goal/finance IPC handlers (only the `lifePhase:*` block is embedded)
- `src/App.tsx` sidebar/routing (Life page entry)

> **What exists but is NOT required for this task:** the app's tracking/finance/terminal features. The Life page is self-contained.
