# CONTEXT_BUNDLE: Feature Guide Revamp

Self-contained context for designing the new Feature Guide page. The target AI does NOT have access to this codebase — this bundle replaces that gap.

---

## 1. Problem Statement

### Current State (TutorialPage.tsx — 353 lines, already partially modified)

The page at `/tutorial` currently has a rushed "Feature Guide" that was hastily converted from an earlier interactive tutorial system. The earlier system had:

1. **Feature cards** in a grid with "Tutorial" (spotlight overlay walkthrough) and "Try it" (navigate) buttons
2. **TutorialOverlay** — a full-screen dim with a 300px circle spotlight + tooltip card that was supposed to guide users through features step-by-step with `data-tutorial` attribute targets

**Problems with the old system:**
- The circle spotlight was purely decorative — it showed a floating amber circle in the center of the screen that didn't actually highlight any real UI element. No `data-tutorial` attributes exist anywhere in the codebase.
- The "Tutorial" and "Try it" buttons did the same thing (navigate to the feature page), confusing users
- The step-by-step walkthrough had hardcoded steps with CSS selectors that targeted nothing
- No actual guide/documentation content — just "here's what this feature is" sentences

**What was changed (my rushed attempt):**
- Removed `TutorialOverlay` import and overlay state management
- Replaced `tutorialSteps` with `keyPoints` (bullet points) and `visualIcons`
- Changed card layout to show larger icon, bullet points, icon clusters, and a single "Open" button
- But the content is still GENERIC — just reformatted old descriptions, not real guide content

### What the User Actually Wants

A **proper static guide/manual** page that:
- Shows all features with WELL-PLANNED, meaningful content
- Content reads like a reference manual, not marketing blurbs
- Text is scannable and not too long
- Has visual elements (not just walls of text)
- Has buttons to navigate to each feature
- The navigation actually works (unlike the old broken circle)
- Content is organized so each feature entry tells you:
  - What the page actually contains (UI elements/widgets)
  - What you can DO there (actions/controls)

---

## 2. Relevant Source Code

### TutorialPage.tsx (current — `src/pages/TutorialPage.tsx`)

The page is registered at route `/tutorial` in `src/App.tsx` (line ~2462):
```tsx
<Route path="/tutorial" element={<TutorialPage />} />
```

Sidebar entry in `src/App.tsx` (line ~2160):
```tsx
{ icon: HelpCircle, label: 'Tutorial', path: '/tutorial' },
```

Current full source (353 lines):

**Imports:**
```tsx
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Home, BarChart3, Globe, Moon, Terminal, BookOpen, Sparkles,
  AlertTriangle, Palette, Network, Database, Activity, Settings,
  HelpCircle, ExternalLink, Trophy, RotateCcw, Check, Timer,
  Target, PieChart, Code2, Clock4, Zap, Users, FileText,
  Sliders, Search, Layers, Cpu, Grip, Layout,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
```

**Feature data interface:**
```tsx
interface Feature {
  id: string;
  name: string;
  icon: any;
  category: string;
  status: 'released' | 'beta' | 'planned';
  description: string;
  keyPoints: string[];
  visualIcons: any[];
  route: string;
}
```

**Categories:** `['All', 'Core', 'Tracker Mind', 'Data']`

**Status styles:**
```tsx
released: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Released' }
beta:     { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Beta' }
planned:  { bg: 'bg-zinc-500/10', text: 'text-zinc-400', label: 'Planned' }
```

**Category meta (colors):**
```tsx
Core:         { gradient: 'from-emerald-500/20 to-emerald-500/5', iconBg: 'bg-emerald-500/10 text-emerald-400' }
Tracker Mind: { gradient: 'from-purple-500/20 to-purple-500/5', iconBg: 'bg-purple-500/10 text-purple-400' }
Data:         { gradient: 'from-blue-500/20 to-blue-500/5', iconBg: 'bg-blue-500/10 text-blue-400' }
```

**Progress tracking:**
- localStorage key: `guide-progress`
- Shape: `{ viewedFeatures: string[] }`
- On "Open" button click: add feature.id to viewedFeatures, navigate to feature.route

**Current card layout JSX (simplified):**
```tsx
<div className="glass rounded-2xl overflow-hidden border border-zinc-700/30">
  <div className="h-1 bg-gradient-to-r {meta.gradient}" />
  <div className="p-5">
    {/* Header: icon circle + name + status */}
    <div className="flex items-start gap-4 mb-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br {meta.gradient}">
        <feature.icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{feature.name}</h3>
        <span className="status-badge">{status.label}</span>
        <p className="text-xs text-zinc-400">{feature.description}</p>
      </div>
    </div>
    
    {/* Bullet points */}
    <div className="space-y-1.5 mb-4">
      {feature.keyPoints.map(point => (
        <div className="flex items-start gap-2 text-xs text-zinc-500">
          <span className="w-1 h-1 rounded-full bg-zinc-600" />
          {point}
        </div>
      ))}
    </div>

    {/* Footer: icon cluster + Open button */}
    <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
      <div className="flex items-center gap-2">
        {feature.visualIcons.map(VIcon => (
          <div className="w-7 h-7 rounded-lg {meta.iconBg}">
            <VIcon className="w-3.5 h-3.5" />
          </div>
        ))}
      </div>
      <button onClick={() => openFeature(feature)}>
        <ExternalLink /> Open
      </button>
    </div>
  </div>
</div>
```

**Current feature entries data (all 15):**

Available features organized by category:

**Core (7 features):** Dashboard, 3D Orbit Visualization, Usage Statistics, External Tracker, Browser Activity, Productivity, Settings

**Tracker Mind (7 features):** Terminal & Agent Sessions, Context Management, Problems & Requests, Design Skills System, Skills Framework, Knowledge Graph, IDE Projects

**Data (1 feature):** Database Analytics

Each has: `id`, `name`, `icon` (Lucide icon), `category`, `status`, `description` (1-liner), `keyPoints` (4 bullets), `visualIcons` (3 Lucide icons), `route`

Route mapping:
- `/` — Dashboard (Dashboard + 3D Orbit)
- `/stats` — Usage Statistics
- `/productivity` — Productivity
- `/browser` — Browser Activity
- `/external` — External Tracker
- `/ide` — IDE Projects, Terminal, Context Management, Problems, Design, Skills, Knowledge Graph
- `/database` — Database Analytics
- `/settings` — Settings

### TutorialOverlay.tsx (old — `src/components/TutorialOverlay.tsx` — 122 lines)

**This component is now ORPHANED.** It was the previous tutorial system:
- Full-screen dim with `bg-black/70 backdrop-blur-sm`
- 300px circle with `border-amber-400/30`, `bg-amber-400/5`, `shadow-[0_0_60px_rgba(245,158,11,0.15)]`
- Tooltip card positioned relative to `data-tutorial` target
- Step progress dots, Back/Next/Try it/Done buttons
- Used `TutorialStep` interface with `target`, `title`, `instruction`, `position`

**Problem:** No `data-tutorial` attributes exist on ANY page component. The overlay was decorative only.

---

## 3. Design System & UI Patterns

### Glass-morphism aesthetic (from `src/index.css`):
```css
.glass {
  background: rgba(24, 24, 27, 0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(63, 63, 70, 0.3);
}
```

### Common Tailwind classes used across pages:
- Background: `bg-zinc-950/80`, `bg-zinc-800/90`, `bg-black`
- Glass: `glass` class, `backdrop-blur-xl`, `border-zinc-700/30`
- Hover: `hover:border-zinc-600/50`, `hover:bg-zinc-700/40`
- Transitions: `transition-all`, `transition-colors`, `duration-200`
- Border: `border-b border-zinc-800/60`
- Buttons: `rounded-lg`, `text-[11px]`, `px-2.5 py-1.5`
- Text: `text-xs (12px)`, `text-sm (14px)`, `text-[11px]`

### Framer Motion:
```tsx
import { motion } from 'framer-motion';
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: i * 0.04, duration: 0.2 }}
/>
```

### Icon usage (Lucide React):
```tsx
import { Home, BarChart3, Globe, ... } from 'lucide-react';
<Home className="w-5 h-5" />
```

---

## 4. Architecture Notes

### Data Layer (TutorialPage is UI-only — no IPC):
- This page uses ZERO IPC calls
- Feature data is hardcoded in `FEATURES` array
- Progress is localStorage only (`guide-progress` key)
- No backend, no DB, no services needed
- Pure frontend component

### Navigation:
- Uses `useNavigate()` from react-router-dom
- `openFeature(feature)` → saves progress → `navigate(feature.route)`
- Routes are: `/`, `/stats`, `/productivity`, `/browser`, `/external`, `/ide`, `/database`, `/settings`

### Page Layout Structure:
```
┌─────────────────────────────────────────────┐
│ Header (icon, title, subtitle, reset btn)    │
│ Category filter pills                        │
├─────────────────────────────────────────────┤
│                                             │
│  Feature cards in 2-column grid             │
│  (scrollable)                               │
│                                             │
└─────────────────────────────────────────────┘
```

### What Each Page Actually Contains (for guide content accuracy):

| Page | Route | Key UI Elements |
|------|-------|-----------------|
| Dashboard | `/` | 3D orbit system (Three.js), activity heatmap (7x24 grid), weekly overview bar chart, quick stats cards, recent sessions feed, timer |
| Usage Statistics | `/stats` | Sorted app list, category breakdown (pie/bar/line charts), time mode toggle (focus/total), period selector, export CSV/JSON |
| Productivity | `/productivity` | Circular productivity score (0-100), time breakdown grid (productive/neutral/distracting), app vs website comparison, trend charts |
| Browser Activity | `/browser` | Browser selector + extension status, domain stats list, category distribution charts, live mode toggle, summary cards |
| External Tracker | `/external` | Active timer (stopwatch/sleep mode), activity grid, sleep timeline chart, consistency score, manual session entry |
| IDE Projects | `/ide` | 7-tab layout (overview/ides/tools/projects/ai/git/trash), metric cards, AI usage chart, project list, scan tools |
| Terminal & Agent | `/ide` (terminal) | Multi-pane xterm.js, session management, project selector, 12 sidebar tabs, instruction panel, context sidebar, problems workspace |
| Context Management | `/ide` (sidebar) | System toggles (6 systems), token budget sliders, model tier selector, design skills panel |
| Problems & Requests | `/ide` (sidebar) | Problem list with status filters, priority colors, checklist items, activity log, terminal assignment |
| Design Skills | `/ide` (sidebar) | Taste knobs, style references, 5 skill modules, Stitch integration |
| Skills Framework | `/ide` (sidebar) | Skills browser, toggle controls, skill stack composition |
| Knowledge Graph | `/ide` (sidebar/context) | AST analysis, community detection, HTML/JSON export, Obsidian vault sync |
| Database | `/database` | Table browser with search, schema display, data table with pagination, CSV export, analytics charts |
| Settings | `/settings` | Category management, productivity tiers (drag-and-drop), app carousel, AI categorization, timer behavior, data sync |

---

## 5. Constraints

1. **Tailwind v4 ONLY** — `index.css` uses `@import "tailwindcss";` NOT v3 directives
2. **No git commands** — never use git checkout/restore/reset/stash
3. **Framer Motion** — must use for animations (0.2s duration)
4. **Lucide React** — all icons from this library
5. **Glass aesthetic** — `glass` class, zinc tones, border-zinc-700/30
6. **No IPC needed** — this is a pure frontend page
7. **The page is at `/tutorial` route** — sidebar label is "Tutorial"
8. **File to modify:** ONLY `src/pages/TutorialPage.tsx`
9. **Orphaned component:** `src/components/TutorialOverlay.tsx` — no longer imported (can be removed or kept)
10. **No new files** — modify existing TutorialPage.tsx only
