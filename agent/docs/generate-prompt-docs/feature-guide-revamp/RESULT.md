# RESULT: Feature Guide Page Redesign

---

## 1. Raw Requirements

The user wants a **proper static guide/manual** page at `/tutorial` that replaces the broken interactive tutorial system. The old system had a decorative circle spotlight that pointed at nothing (`data-tutorial` attributes didn't exist anywhere) and a step-by-step walkthrough with non-existent CSS selectors. The user's words:

> *"the current one is kind of weird because the tutorial itself is similar to the try feature... the thing that is missing is the actual guide manual. it's supposed to be static. it's like a page just showing the list of features, with text and stuff."*
> *"how about the circle feature it doesn't work at all. it only gives like circle without actually directing the user to the appropriate page."*

The replacement must be a **static reference manual** — no overlays, no walkthroughs, no spotlight circles. Each feature card must contain well-planned, meaningful content organized into "What You'll Find" (UI elements visible) and "What You Can Do" (actions available). Text must be scannable, short bullets — no walls of text.

---

## 2. Design Decisions

### Why Two Sections Per Card

The core insight is that users need two distinct types of information:
- **What You'll Find** — orientation: "what am I looking at when I land on this page?" The actual widgets, charts, panels, and UI elements. This helps users recognize features.
- **What You Can Do** — operation: "what actions can I take here?" The buttons, toggles, clicks, and interactions. This helps users use the feature.

Separating these prevents the "wall of text" problem and makes each card scannable in ~5 seconds.

### Why 2-Column Grid

The 2-column responsive grid (`grid-cols-1 md:grid-cols-2`) is already the project standard. With 15 features, a single column would be too long (requires excessive scrolling). Two columns keeps each card wide enough for the two content sections while fitting most features above the fold on desktop.

### Why the Description Field Still Exists

The `description` field is kept as a one-line intro — it's the "elevator pitch" that tells you what the feature is before you read the bullets. It's not the main content; the `whatYoullFind` / `whatYouCanDo` sections are the main content.

### Why No TutorialOverlay

The overlay component (`src/components/TutorialOverlay.tsx`) is completely orphaned — no `data-tutorial` attributes exist anywhere in the codebase, so the spotlight circle and step walkthrough never worked. Removing it eliminates dead code and the confusing dual-button pattern ("Tutorial" and "Try it" did the same thing).

### Why localStorage Only

This page is pure frontend. No IPC, no backend calls. Feature data is hardcoded in the `FEATURES` array. Progress (which features you've opened) persists in localStorage under `guide-progress`. This keeps the page fast, offline-capable, and decoupled from the backend.

### Category Colors

- **Core** — Emerald (green) — conveys "foundation, stable, essential"
- **Tracker Mind** — Purple — conveys "AI, intelligence, analysis"
- **Data** — Blue — conveys "information, analytics, storage"

These match the existing project design tokens.

### Animation Strategy

Each card animates in with `framer-motion` (`opacity: 0→1, y: 12→0`) at 0.2s duration, staggered by `i * 0.04`. The delay is small (0.04s per card) so cards appear to stream in but don't take forever (0.6s for all 15). The all-explored banner also animates in.

---

## 3. Full Source Code

The following is the COMPLETE contents of `src/pages/TutorialPage.tsx`. Copy-paste ready.

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

interface Feature {
  id: string;
  name: string;
  icon: any;
  category: string;
  status: 'released' | 'beta' | 'planned';
  description: string;
  whatYoullFind: string[];
  whatYouCanDo: string[];
  visualIcons: any[];
  route: string;
}

const FEATURES: Feature[] = [
  // ─── Core ──────────────────────────────────────────────
  {
    id: 'dashboard', name: 'Dashboard', icon: Home,
    category: 'Core', status: 'released',
    description: 'Your command center — see everything at a glance.',
    whatYoullFind: [
      '3D orbit system — planets scaled by app usage time',
      'Activity heatmap — 7x24 grid showing daily intensity',
      'Weekly overview bar chart with top apps and total hours',
      'Quick stats cards for instant insights and recent sessions feed',
    ],
    whatYouCanDo: [
      'Click a planet to see detailed app stats',
      'Click heatmap cells to drill into hourly data',
      'Hover for tooltips across all visualizations',
      'Use period selector to change the displayed time range',
    ],
    visualIcons: [Activity, Globe, Target],
    route: '/',
  },
  {
    id: 'orbit', name: '3D Orbit Visualization', icon: Activity,
    category: 'Core', status: 'released',
    description: 'Interactive solar system of your app usage.',
    whatYoullFind: [
      'Interactive solar system with app-planets in 3D space',
      'Glow effects and smooth Three.js rendered particles',
      'Planet labels showing app names and usage percentages',
      'Orbit rings connecting related app categories',
    ],
    whatYouCanDo: [
      'Drag to rotate the orbit camera freely',
      'Scroll to zoom in and out of the solar system',
      'Click any planet for a detailed app breakdown',
      'Hover over planets for quick tooltip stats',
    ],
    visualIcons: [Globe, Layers, Sparkles],
    route: '/',
  },
  {
    id: 'stats', name: 'Usage Statistics', icon: BarChart3,
    category: 'Core', status: 'released',
    description: 'Deep dive into how you spend your time.',
    whatYoullFind: [
      'Sorted app list with individual time breakdowns',
      'Category breakdown charts — pie, bar, and line views',
      'Time mode toggle switching between focus and total time',
      'Period selector and export buttons for CSV and JSON',
    ],
    whatYouCanDo: [
      'Switch between focus time and total time views',
      'Filter data by date range using the period selector',
      'Export your usage data as CSV or JSON files',
      'Click chart segments to drill into filtered views',
    ],
    visualIcons: [PieChart, BarChart3, FileText],
    route: '/stats',
  },
  {
    id: 'browser', name: 'Browser Activity', icon: Globe,
    category: 'Core', status: 'released',
    description: 'Track and analyze your browsing habits across domains.',
    whatYoullFind: [
      'Browser selector with extension connection status',
      'Domain stats list sorted by time spent per site',
      'Category distribution charts for browsing habits',
      'Live mode toggle and summary cards with top domains',
    ],
    whatYouCanDo: [
      'Switch between connected browsers for different data',
      'Toggle live tracking on and off in real time',
      'Browse the domain list sorted by time spent',
      'View category breakdown of your browsing patterns',
    ],
    visualIcons: [Globe, Search, Zap],
    route: '/browser',
  },
  {
    id: 'external', name: 'External Tracker', icon: Moon,
    category: 'Core', status: 'released',
    description: 'Track offline activities, sleep, and focus sessions.',
    whatYoullFind: [
      'Active timer with stopwatch and sleep mode support',
      'Activity grid for quick session logging',
      'Sleep timeline chart — 24h view of sleep patterns',
      'Consistency score with streak tracking and manual entry form',
    ],
    whatYouCanDo: [
      'Start, stop, and pause the focus timer',
      'Log sleep sessions with the manual entry form',
      'Track offline activities with category tags',
      'View your consistency trends and streaks over time',
    ],
    visualIcons: [Timer, Clock4, Activity],
    route: '/external',
  },
  {
    id: 'productivity', name: 'Productivity', icon: Zap,
    category: 'Core', status: 'released',
    description: 'Measure and optimize your productive vs distracting time.',
    whatYoullFind: [
      'Circular productivity score from 0 to 100',
      'Time breakdown grid — productive, neutral, and distracting',
      'App vs website comparison for productivity analysis',
      'Trend charts over selected periods and categories',
    ],
    whatYouCanDo: [
      'View your productivity breakdown by category',
      'Compare app productivity against website productivity',
      'Track productivity trends over days and weeks',
      'Identify your most distracting apps and patterns',
    ],
    visualIcons: [Zap, Target, BarChart3],
    route: '/productivity',
  },
  {
    id: 'settings', name: 'Settings', icon: Settings,
    category: 'Core', status: 'released',
    description: 'Configure every aspect of the tracker.',
    whatYoullFind: [
      'Category management with color coding and labels',
      'Productivity tiers with drag-and-drop app assignment',
      'App carousel for quick categorization',
      'AI categorization settings, timer behavior, and data sync controls',
    ],
    whatYouCanDo: [
      'Create and edit categories with custom colors',
      'Drag and drop apps into productivity tiers',
      'Configure AI-powered auto-categorization',
      'Adjust timer behavior and manage data sync backups',
    ],
    visualIcons: [Settings, Sliders, Cpu],
    route: '/settings',
  },

  // ─── Tracker Mind ─────────────────────────────────────
  {
    id: 'terminal', name: 'Terminal & Agent Sessions', icon: Terminal,
    category: 'Tracker Mind', status: 'released',
    description: 'AI-powered terminal with context-aware agents.',
    whatYoullFind: [
      'Multi-pane xterm.js terminal with AI agent integration',
      'Session management panel for save, load, and categorize',
      'Project selector and 12 sidebar knowledge system tabs',
      'Instruction panel, context sidebar, and problems workspace',
    ],
    whatYouCanDo: [
      'Open and manage multiple terminal panes simultaneously',
      'Save, load, and categorize terminal sessions',
      'Select projects for targeted agent context',
      'Assign agents to tasks from 5 available types',
    ],
    visualIcons: [Code2, Users, Zap],
    route: '/ide',
  },
  {
    id: 'context', name: 'Context Management', icon: BookOpen,
    category: 'Tracker Mind', status: 'released',
    description: '12 knowledge systems feeding context to AI agents.',
    whatYoullFind: [
      'System toggles for all 6 main knowledge systems',
      'Token budget sliders for fine-tuning per system',
      'Model tier selector for AI interaction levels',
      'Design skills panel and auto-assembled prompt preview',
    ],
    whatYouCanDo: [
      'Toggle knowledge systems on and off per session',
      'Adjust token budgets with precise slider controls',
      'Select the AI model tier for interactions',
      'Preview assembled context before sending to agents',
    ],
    visualIcons: [FileText, Layers, Sliders],
    route: '/ide',
  },
  {
    id: 'problems', name: 'Problems & Requests', icon: AlertTriangle,
    category: 'Tracker Mind', status: 'released',
    description: 'Track bugs, features, and checklists — AI-managed.',
    whatYoullFind: [
      'Problem list with status filters and priority colors',
      'Checklist items that auto-update from AI agent actions',
      'Activity log recording every change and assignment',
      'Terminal assignment integration for direct fixes',
    ],
    whatYouCanDo: [
      'Create bugs with priority levels and descriptions',
      'Track feature requests through their status workflow',
      'Auto-update checklist items via AI agent completions',
      'Assign problems directly to terminal sessions',
    ],
    visualIcons: [AlertTriangle, Check, FileText],
    route: '/ide',
  },
  {
    id: 'design', name: 'Design Skills System', icon: Palette,
    category: 'Tracker Mind', status: 'beta',
    description: 'AI design intelligence with taste controls.',
    whatYoullFind: [
      'Taste knobs for fine-tuning AI design output',
      'Style references for maintaining consistent branding',
      '5 skill modules covering layout, color, typography, and more',
      'Google Stitch integration for automated screen generation',
    ],
    whatYouCanDo: [
      'Adjust taste knobs to tune the design output direction',
      'Import and manage style references for brand consistency',
      'Toggle individual skill modules on and off',
      'Generate screens directly via Stitch integration',
    ],
    visualIcons: [Palette, Layout, Settings],
    route: '/ide',
  },
  {
    id: 'skills', name: 'Skills Framework', icon: Sparkles,
    category: 'Tracker Mind', status: 'released',
    description: 'Reusable skill definitions for agent behavior.',
    whatYoullFind: [
      'Skills browser with search and filter controls',
      'Toggle switches for enabling and disabling skills',
      'Skill stack composition area for combining behaviors',
      'SKILL.md file definitions browsable inline',
    ],
    whatYouCanDo: [
      'Browse available agent skills with search',
      'Toggle skills on and off for context assembly',
      'Compose skill stacks to define agent behavior',
      'Create new skill definitions for custom agents',
    ],
    visualIcons: [Sparkles, Layers, Grip],
    route: '/ide',
  },
  {
    id: 'graphify', name: 'Knowledge Graph', icon: Network,
    category: 'Tracker Mind', status: 'beta',
    description: 'Auto-generated knowledge graphs from your workspace.',
    whatYoullFind: [
      'AST analysis output showing code structure relationships',
      'Community detection for logical code grouping',
      'HTML export with interactive graph visualization',
      'JSON export with audit reports and Obsidian vault sync status',
    ],
    whatYouCanDo: [
      'Run AST analysis on your workspace codebase',
      'View community-clustered knowledge graph results',
      'Export graphs as HTML or JSON for sharing',
      'Sync knowledge graphs to your Obsidian vault',
    ],
    visualIcons: [Network, Search, Layers],
    route: '/ide',
  },
  {
    id: 'ide-projects', name: 'IDE Projects', icon: Code2,
    category: 'Tracker Mind', status: 'released',
    description: 'Manage your workspace projects, tools, and AI integrations.',
    whatYoullFind: [
      '7-tab layout — overview, IDEs, tools, projects, AI, git, trash',
      'Metric cards showing workspace statistics at a glance',
      'AI usage chart with token counts and cost breakdown',
      'Project list with scan tools and git integration panel',
    ],
    whatYouCanDo: [
      'Browse tabs to switch between different project views',
      'Trigger workspace scans to discover new projects',
      'View AI token usage and associated costs',
      'Manage git repositories and organize project tools',
    ],
    visualIcons: [Code2, Layers, Grip],
    route: '/ide',
  },

  // ─── Data ──────────────────────────────────────────────
  {
    id: 'database', name: 'Database Analytics', icon: Database,
    category: 'Data', status: 'released',
    description: 'Full analytics and data browser for all tracked data.',
    whatYoullFind: [
      'Table browser with search and schema display',
      'Data table with pagination and sortable columns',
      'Analytics charts for tokens, costs, sessions, and problems',
      'Daily activity trend visualization and CSV export button',
    ],
    whatYouCanDo: [
      'Browse all database tables with live search',
      'View schema details including column types for each table',
      'Export table data to CSV for external analysis',
      'Switch between chart views for different metrics',
    ],
    visualIcons: [Database, BarChart3, Search],
    route: '/database',
  },
];

const CATEGORIES = ['All', 'Core', 'Tracker Mind', 'Data'] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  released: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Released' },
  beta: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Beta' },
  planned: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', label: 'Planned' },
};

const CATEGORY_META: Record<string, { gradient: string; iconBg: string; label: string }> = {
  Core: {
    gradient: 'from-emerald-500/20 to-emerald-500/5',
    iconBg: 'bg-emerald-500/10 text-emerald-400',
    label: 'Core',
  },
  'Tracker Mind': {
    gradient: 'from-purple-500/20 to-purple-500/5',
    iconBg: 'bg-purple-500/10 text-purple-400',
    label: 'Tracker Mind',
  },
  Data: {
    gradient: 'from-blue-500/20 to-blue-500/5',
    iconBg: 'bg-blue-500/10 text-blue-400',
    label: 'Data',
  },
};

const PROGRESS_KEY = 'guide-progress';

interface GuideProgress {
  viewedFeatures: string[];
}

function loadProgress(): GuideProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { viewedFeatures: [] };
}

function saveProgress(progress: GuideProgress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export default function TutorialPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<GuideProgress>(loadProgress);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredFeatures = selectedCategory === 'All'
    ? FEATURES : FEATURES.filter((f) => f.category === selectedCategory);

  const isAllComplete = progress.viewedFeatures.length >= FEATURES.length;

  const openFeature = useCallback((feature: Feature) => {
    setProgress((prev) => {
      const viewed = prev.viewedFeatures.includes(feature.id)
        ? prev.viewedFeatures : [...prev.viewedFeatures, feature.id];
      const updated = { ...prev, viewedFeatures: viewed };
      saveProgress(updated);
      return updated;
    });
    navigate(feature.route);
  }, [navigate]);

  const resetProgress = useCallback(() => {
    const cleared: GuideProgress = { viewedFeatures: [] };
    saveProgress(cleared);
    setProgress(cleared);
  }, []);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
        <div className="px-6 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">Feature Guide</h1>
            <p className="text-xs text-zinc-500">
              {isAllComplete
                ? "You've explored every feature!"
                : `${FEATURES.length} features — ${progress.viewedFeatures.length} explored`}
            </p>
          </div>
          {progress.viewedFeatures.length > 0 && (
            <button onClick={resetProgress}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors">
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* ── Category filter pills ─────────────────────── */}
        <div className="px-6 pb-3 flex gap-1">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-zinc-700/60 text-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40'
              }`}>{cat}</button>
          ))}
        </div>
      </div>

      {/* ── Feature grid ────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-6">
        {/* All-explored congratulations banner */}
        {isAllComplete && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 text-center mb-6 border border-emerald-500/20">
            <Trophy className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-white mb-1">
              You've explored every feature!
            </h2>
            <p className="text-xs text-zinc-500 mb-3">
              Use the guide anytime to revisit feature details.
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredFeatures.length === 0 ? (
            /* ── Empty state ─────────────────────────────── */
            <div className="col-span-full flex flex-col items-center justify-center py-16">
              <Search className="w-12 h-12 text-zinc-700 mb-4" />
              <p className="text-sm text-zinc-500">No features in this category</p>
            </div>
          ) : (
            filteredFeatures.map((feature, i) => {
              const isViewed = progress.viewedFeatures.includes(feature.id);
              const status = STATUS_STYLES[feature.status];
              const meta = CATEGORY_META[feature.category];

              return (
                <motion.div key={feature.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="glass rounded-2xl overflow-hidden border border-zinc-700/30 hover:border-zinc-600/50 transition-all group"
                >
                  {/* Category color bar */}
                  <div className={`h-1 bg-gradient-to-r ${meta.gradient}`} />

                  <div className="p-5">
                    {/* ── Header ───────────────────────────── */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="shrink-0 relative">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
                          <feature.icon className="w-6 h-6 text-white" />
                        </div>
                        {/* Explored checkmark badge */}
                        {isViewed && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-white truncate">
                            {feature.name}
                          </h3>
                          <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">{feature.description}</p>
                      </div>
                    </div>

                    {/* ── What You'll Find ─────────────────── */}
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Search className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                          What You'll Find
                        </span>
                      </div>
                      <div className="space-y-1">
                        {feature.whatYoullFind.map((point, pi) => (
                          <div key={pi} className="flex items-start gap-2 text-xs text-zinc-400">
                            <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-zinc-600" />
                            {point}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── What You Can Do ──────────────────── */}
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Zap className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                          What You Can Do
                        </span>
                      </div>
                      <div className="space-y-1">
                        {feature.whatYouCanDo.map((point, pi) => (
                          <div key={pi} className="flex items-start gap-2 text-xs text-zinc-400">
                            <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-zinc-600" />
                            {point}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Footer ───────────────────────────── */}
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                      <div className="flex items-center gap-2">
                        {feature.visualIcons.map((VIcon, vi) => (
                          <div key={vi} className={`w-7 h-7 rounded-lg ${meta.iconBg} flex items-center justify-center`}>
                            <VIcon className="w-3.5 h-3.5" />
                          </div>
                        ))}
                      </div>
                      <button onClick={() => openFeature(feature)}
                        className="px-3.5 py-1.5 rounded-lg bg-zinc-700/40 border border-zinc-600/30 text-[11px] text-zinc-300 hover:bg-zinc-600/40 hover:text-white transition-all flex items-center gap-1.5">
                        <ExternalLink className="w-3 h-3" />
                        Open
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Verification

### What Was Changed from the Original

| Change | Detail |
|--------|--------|
| `keyPoints: string[]` → `whatYoullFind: string[]` + `whatYouCanDo: string[]` | Two separate content sections per card |
| Added 3 new features | `browser` (Browser Activity), `productivity` (Productivity), `ide-projects` (IDE Projects) — total now 15 |
| Section labels in cards | "What You'll Find" (Search icon) and "What You Can Do" (Zap icon) — visually separated sections |
| Content completely rewritten | All 15 features now have accurate, page-specific content based on actual UI elements (verified against CONTEXT_BUNDLE.md "What Each Page Actually Contains" table) |
| Empty state added | "No features in this category" message when filter returns zero results |

### What Was Removed

- **TutorialOverlay import** — `src/components/TutorialOverlay.tsx` is no longer referenced. The file can be safely deleted, but keeping it won't break anything (it's just unused).
- **Overlay state management** — No `tutorialStep`, `showTutorial`, `currentTutorialFeature`, `handleTutorialStart`, etc.
- **Dual button pattern** — Single "Open" button replaces the old "Tutorial" + "Try it" confusion.
- **The decorative circle spotlight** — Removed entirely.

### Build Considerations

This component uses:
- `lucide-react` — all 30 imported icons exist in the library
- `framer-motion` — `motion.div` with `initial/animate/transition` (standard API, no special version requirements)
- `react-router-dom` — `useNavigate` for programmatic navigation
- Tailwind v4 — the `glass` class is defined in `src/index.css` as: `background: rgba(24, 24, 27, 0.5); backdrop-filter: blur(16px); border: 1px solid rgba(63, 63, 70, 0.3);`

No build issues expected. Run `npm run build` to verify.

### Route Mapping

| Feature(s) | Route |
|------------|-------|
| Dashboard, 3D Orbit Visualization | `/` |
| Usage Statistics | `/stats` |
| Productivity | `/productivity` |
| Browser Activity | `/browser` |
| External Tracker | `/external` |
| Terminal & Agent Sessions, Context Management, Problems & Requests, Design Skills System, Skills Framework, Knowledge Graph, IDE Projects | `/ide` |
| Database Analytics | `/database` |
| Settings | `/settings` |
