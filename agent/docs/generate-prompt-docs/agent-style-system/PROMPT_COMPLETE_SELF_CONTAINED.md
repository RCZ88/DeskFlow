# PROMPT: Complete Agent Style System — UI + UX + Engineering (Self-Contained)

## MANDATORY: Read Context Bundle First

This prompt is SELF-CONTAINED. All source code, design tokens, IPC endpoints, and specs are included below. The Architect has NO access to the codebase — everything needed is in this prompt.

---

## SECTION 1: THE SPEC (What We're Building)

The Agent Style System is a "Design Co-Pilot" that bridges unstructured web data (aesthetic sites, typography galleries) with structured developer tools (MCP servers, NPM packages, CLI commands). It lives inside the existing Design Workspace at `studio/design` subtab.

### Features:
1. **Moodboard Tab** — Visual grid of parsed images from CARI.institute. Hover → "Inject Context" sends image to agent.
2. **Tokens Tab** — Live Realtime Colors URL preview, CSS variable display, "Sync to Project" writes to globals.css.
3. **Command Palette** — Cmd+K overlay. `> generate theme Frutiger Aero` scrapes CARI + fetches fonts + generates CSS.
4. **CLI Wrappers** — Programmatic `npx shadcn add` via IPC.
5. **CARI Scraper** — Axios+Cheerio scraper for CARI.institute.
6. **FontsInUse Scraper** — Same for FontsInUse.
7. **Motion Templates** — GSAP/Lenis/Vanta code templates.
8. **Custom MCP Server** — `design-suite-mcp/` wrapping all tools.
9. **Color Sync** — Write CSS variables to project files.

---

## SECTION 2: EXISTING CODEBASE (Source Code Included)

### 2.1 ColorPicker (the color source)
```typescript
// src/components/workspace/ColorPicker.tsx
interface ColorEntry {
  id: string;
  color: string;   // hex value, e.g. "#ec4899"
  role: string;    // "primary" | "accent" | "background" | "surface" | "text" | "muted" | "success" | "warning" | "error" | "border" | "custom"
  label: string;   // human-readable label
}

const COLOR_ROLES = [
  { value: 'primary', label: 'Primary', desc: 'Main brand color' },
  { value: 'accent', label: 'Accent', desc: 'Highlight / interactive' },
  { value: 'background', label: 'Background', desc: 'Page / card base' },
  { value: 'surface', label: 'Surface', desc: 'Elevated cards / panels' },
  { value: 'text', label: 'Text', desc: 'Body / heading color' },
  { value: 'muted', label: 'Muted', desc: 'Secondary / disabled text' },
  { value: 'success', label: 'Success', desc: 'Positive states' },
  { value: 'warning', label: 'Warning', desc: 'Caution states' },
  { value: 'error', label: 'Error', desc: 'Error / destructive' },
  { value: 'border', label: 'Border', desc: 'Divider / outline' },
  { value: 'custom', label: 'Custom', desc: 'Other' },
];

const COLOR_SCHEMES: ColorScheme[] = [
  { name: 'Galaxy Dark', desc: 'Deep zinc + pink/rose accents', colors: [
    { role: 'background', color: '#09090b', label: 'Bg' },
    { role: 'surface', color: '#18181b', label: 'Surface' },
    { role: 'primary', color: '#ec4899', label: 'Primary' },
    { role: 'accent', color: '#f43f5e', label: 'Accent' },
    { role: 'text', color: '#f4f4f5', label: 'Text' },
    { role: 'muted', color: '#71717a', label: 'Muted' },
    { role: 'border', color: '#27272a', label: 'Border' },
  ]},
  // ... 5 more schemes (Cyberpunk, Warm Earth, Ocean, Minimal Light, Sunset)
];
```

### 2.2 Design System Primitives (MUST USE these)
```typescript
// src/components/workspace/_ds/primitives.tsx
export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; hint?: string }> = ...
export const Skeleton: React.FC<{ className?: string }> = ...
export const IconButton: React.FC<{ onClick?: ...; title: string; children: React.ReactNode; danger?: boolean; className?: string }> = ...
export const Chip: React.FC<{ active?: boolean; onClick?: () => void; children: React.ReactNode; title?: string }> = ...
export const StatusPill: React.FC<{ status: WorkStatus; icon?: React.ReactNode; compact?: boolean }> = ...
export const ProgressBar: React.FC<{ value: number; total: number }> = ...
```

```typescript
// src/components/workspace/_ds/controls.tsx
export const INPUT_CLS = 'w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[color:var(--page-accent)]/40 focus:border-[color:var(--page-accent)]/40 transition-colors';
export const BTN_PRIMARY = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-[color:var(--page-accent)] hover:brightness-110 transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none';
export const BTN_GHOST = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 ring-1 ring-zinc-700/60 hover:bg-zinc-700/60 hover:text-zinc-100 transition active:scale-95';
export const filterChipCls = (active: boolean) => `inline-flex items-center gap-1.5 rounded-full text-[11px] font-medium px-2.5 min-h-[26px] transition-colors active:scale-95 ${active ? 'text-[color:var(--page-accent)] bg-[color-mix(in_srgb,var(--page-accent)_16%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--page-accent)_38%,transparent)]' : 'text-zinc-400 bg-zinc-800/70 ring-1 ring-zinc-700/50 hover:text-zinc-200 hover:bg-zinc-700/60'}`;
```

```typescript
// src/components/workspace/_ds/motion.ts
export const EASE_OUT: number[] = [0.16, 1, 0.3, 1];
export const DUR = { fast: 0.15, normal: 0.25, slow: 0.4 } as const;
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 };
export const SPRING_SNAPPY: Transition = { type: 'spring', stiffness: 420, damping: 28, mass: 0.6 };
export const listContainer: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } };
export const riseItem: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: DUR.normal, ease: EASE_OUT } } };
export const expandPanel: Variants = ...;
export const popItem: Variants = ...;
export const tabPanel: Variants = ...;
```

### 2.3 SubTabBar (existing tab component)
```typescript
// src/components/workspace/SubTabBar.tsx
export interface SubTabDef { key: string; label: string; icon: LucideIcon; accent?: string; }
export function SubTabBar({ tabs, active, onChange, accent }: {
  tabs: SubTabDef[]; active: string; onChange: (k: string) => void; accent?: string;
}) {
  // Renders rounded-full chip pills with accent dot, role="tab", aria-selected
}
```

### 2.4 DesignComposeOutlet (existing send context panel)
```typescript
// src/components/workspace/DesignComposeOutlet.tsx
interface DesignComposeOutletProps {
  contextSnippet: string; onSend: () => void; onCopy: () => void;
  isSending?: boolean; lastSent?: string | null; terminalMissing?: boolean;
  importedCounts?: SourceCount[]; totalImported?: number;
}
// Shows XML preview, Send/Copy buttons, imported component counts
```

### 2.5 Design Tokens (from index.css)
```css
@theme {
  --ws-surface: #09090b;
  --ws-surface-raised: #18181b;
  --ws-border: rgb(39 39 42 / 0.6);
  --ws-border-strong: rgb(63 63 70 / 0.6);
  --ws-accent: #06b6d4;
  --ws-radius-card: 0.5rem;
  --ws-dur: 150ms;
  --ws-ease: cubic-bezier(0.2, 0, 0, 1);
}
```

### 2.6 IPC Endpoints (already wired)
| Channel | Input | Output |
|---------|-------|--------|
| `design-suite:scrape-cari` | `{ query: string }` | `{ success, data: AestheticResult[] }` |
| `design-suite:scrape-fontsinuse` | `{ mood: string }` | `{ success, data: FontPair[] }` |
| `design-suite:get-motion-template` | `{ id: string }` | `{ success, data: MotionTemplate }` |
| `design-suite:list-motion-templates` | `{}` | `{ success, data: MotionTemplate[] }` |
| `design-suite:install-component` | `{ registryUrl, projectPath }` | `{ success, data: InstallResult }` |
| `design-suite:sync-tokens` | `{ cssVariables, projectPath, targetFile }` | `{ success, message }` |
| `design-suite:generate-color-url` | `{ colors }` | `{ success, data: string }` |
| `design-suite:parse-color-url` | `{ url }` | `{ success, data: ColorEntry[] }` |
| `design-suite:generate-css-vars` | `{ colors }` | `{ success, data: string }` |

### 2.7 Preload Bridges (window.deskflowAPI)
```typescript
designSuiteScrapeCari: (query: string) => ipcRenderer.invoke('design-suite:scrape-cari', { query })
designSuiteScrapeFontsInUse: (mood: string) => ipcRenderer.invoke('design-suite:scrape-fontsinuse', { mood })
designSuiteGetMotionTemplate: (id: string) => ipcRenderer.invoke('design-suite:get-motion-template', { id })
designSuiteListMotionTemplates: () => ipcRenderer.invoke('design-suite:list-motion-templates')
designSuiteInstallComponent: (url: string, path: string) => ipcRenderer.invoke('design-suite:install-component', { registryUrl: url, projectPath: path })
designSuiteSyncTokens: (css: string, path: string, file: string) => ipcRenderer.invoke('design-suite:sync-tokens', { cssVariables: css, projectPath: path, targetFile: file })
designSuiteGenerateColorUrl: (colors: any[]) => ipcRenderer.invoke('design-suite:generate-color-url', { colors })
designSuiteParseColorUrl: (url: string) => ipcRenderer.invoke('design-suite:parse-color-url', { url })
designSuiteGenerateCssVars: (colors: any[]) => ipcRenderer.invoke('design-suite:generate-css-vars', { colors })
```

### 2.8 DesignWorkspacePage (current state — 761 lines)
- 3-tab layout: `sources | motion | registry` (needs to become 5 tabs)
- State: taste, selectedRefs, styleDescription, colors (ColorEntry[]), libraries, importedComponents
- `buildFullContext()` assembles XML string with design context
- `handleSend()` sends XML to terminal via `agentSend()` IPC
- New tabs added: `moodboard | tokens | sources | motion | registry`
- New state added: `paletteOpen`, `moodboardItems`
- Cmd+K listener added
- `handleInjectContext()` adds moodboard items to state
- `handleExecuteCommand()` runs palette commands

---

## SECTION 3: WHAT'S BROKEN (Bugs to Fix)

### Bug 1: MoodboardTab doesn't use design system primitives
Uses raw `<div className="animate-pulse">` instead of `Skeleton` from `_ds/primitives.tsx`.
Uses raw error/empty states instead of `EmptyState` from `_ds/primitives.tsx`.
**FIX:** Rewrite using `EmptyState`, `Skeleton`, `IconButton` from `_ds/primitives.tsx`.

### Bug 2: TokensTab doesn't use design system primitives
Same issue — raw divs instead of shared components.
**FIX:** Rewrite using `Skeleton`, `IconButton`, `BTN_PRIMARY`, `BTN_GHOST` from `_ds/`.

### Bug 3: CommandPalette doesn't use design system primitives
Raw divs instead of shared components.
**FIX:** Rewrite using `IconButton`, `Chip` from `_ds/primitives.tsx`.

### Bug 4: Tab bar in DesignWorkspacePage doesn't use SubTabBar
Custom inline tab bar ignores the existing `SubTabBar` component which has proper accessibility.
**FIX:** Replace custom tab bar with `SubTabBar` component.

### Bug 5: No onboarding/discovery
Users don't know Moodboard/Tokens exist or that Cmd+K works.
**FIX:** Add first-visit badges and Cmd+K tooltip.

### Bug 6: Moodboard "Inject Context" UX gap
User clicks Inject but nothing visible happens — item silently added to state.
**FIX:** Show a toast/notification when item is staged. Show count of staged items in DesignComposeOutlet.

---

## SECTION 4: WHAT TO BUILD (Complete Engineering Specs)

### For EACH component, provide:

#### A. MoodboardTab.tsx — FULL REWRITE
**Must use:** `EmptyState`, `Skeleton`, `IconButton` from `_ds/primitives.tsx`
**Must use:** `listContainer`, `riseItem` from `_ds/motion.ts` for stagger animation
**Must use:** `INPUT_CLS` from `_ds/controls.tsx` for search input
**Must use:** `filterChipCls` from `_ds/controls.tsx` for source filter chips

**States:**
- Empty: `EmptyState` with Sparkles icon, "Search for an aesthetic vibe", hint text
- Loading: 6 `Skeleton` cards matching masonry shape
- Error: `EmptyState` with AlertCircle icon, error message, Retry button using `BTN_GHOST`
- Populated: CSS masonry grid with hover overlay, "Inject Context" button using `BTN_PRIMARY`

**Data flow:** User types → debounce 500ms → `designSuiteScrapeCari(query)` → results → masonry grid
**Inject:** Click button → `onInjectContext(item)` → parent adds to `moodboardItems` → toast confirmation

#### B. TokensTab.tsx — FULL REWRITE
**Must use:** `Skeleton`, `IconButton`, `BTN_PRIMARY`, `BTN_GHOST` from `_ds/`
**Must use:** `tabPanel` from `_ds/motion.ts` for section transitions

**States:**
- Empty (no colors): `EmptyState` with Palette icon, "Add colors in the Color Scheme panel first"
- Loading: `Skeleton` for CSS var display, `Skeleton` for iframe area
- Error (sync failed): Red toast with retry
- Populated: Split view — CSS vars left, Realtime Colors iframe right, color swatches below

**Data flow:** `colorEntries` (ColorPicker format) → map roles internally → generate URL + CSS vars
**Sync:** Click button → `designSuiteSyncTokens(css, path, file)` → toast success/error

#### C. CommandPalette.tsx — FULL REWRITE
**Must use:** `IconButton` from `_ds/primitives.tsx`
**Must use:** `SPRING_SNAPPY` from `_ds/motion.ts` for open animation

**States:**
- Empty (no input): Show recent commands or all 4 built-in commands
- Loading: Inline `Loader2` spinner next to command
- Error: Inline red text with retry hint
- Populated: Filtered command list with keyboard navigation

**Commands:**
- `> generate theme [aesthetic]` → `designSuiteScrapeCari(aesthetic)` → format as XML → `agentSend()`
- `> typography [mood]` → `designSuiteScrapeFontsInUse(mood)` → format as XML → `agentSend()`
- `> install [url]` → `designSuiteInstallComponent(url, projectPath)`
- `> motion [id]` → `designSuiteGetMotionTemplate(id)` → format as XML → `agentSend()`

**Keyboard:** ArrowUp/Down navigate, Enter executes, Escape closes, `>` prefix enters command mode

#### D. DesignWorkspacePage.tsx — TAB BAR FIX
Replace custom tab bar with `SubTabBar`:
```typescript
import { SubTabBar, type SubTabDef } from '../components/workspace/SubTabBar';
import { Sparkle, Palette, Package, Wind, Paintbrush } from 'lucide-react';

const DESIGN_TABS: SubTabDef[] = [
  { key: 'moodboard', label: 'Moodboard', icon: Sparkle, accent: 'cyan' },
  { key: 'tokens', label: 'Tokens', icon: Palette, accent: 'cyan' },
  { key: 'sources', label: 'Sources', icon: Package, accent: 'cyan' },
  { key: 'motion', label: 'Motion', icon: Wind, accent: 'cyan' },
  { key: 'registry', label: 'Registry', icon: Paintbrush, accent: 'cyan' },
];

// In render:
<SubTabBar tabs={DESIGN_TABS} active={activeTab} onChange={(k) => setActiveTab(k as any)} accent="cyan" />
```

#### E. Onboarding/Discovery
Add first-visit indicator:
- localStorage key: `deskflow-design-workspace-seen-v1`
- On first visit to Studio → Design, show subtle "New" badges on Moodboard and Tokens tabs
- After user visits both tabs, dismiss badges
- Add small `⌘K` tooltip near the Cmd+K hint explaining the Command Palette

#### F. Staged Items Indicator
In `DesignComposeOutlet`, show count of staged moodboard items:
```typescript
// Add prop: stagedMoodboardCount?: number
// Show: "3 moodboard items staged" when count > 0
```

---

## SECTION 5: HUMAN-CENTRIC UX REQUIREMENTS

Apply the 6 pillars to EVERY component:

### 1. Clarity
- Every label in plain language
- Primary action obvious in < 1s
- Icons always paired with labels

### 2. Progressive Disclosure
- Moodboard: search is primary, filters hidden
- Tokens: CSS vars visible, advanced sync options behind disclosure
- Command Palette: recent commands shown first, full list on demand

### 3. Visual Hierarchy
- One focal point per tab
- Moodboard = images dominant
- Tokens = preview dominant
- Command Palette = input dominant

### 4. Complete State Coverage
- EVERY data-driven component has Empty/Loading/Error/Populated
- Use `EmptyState` and `Skeleton` from `_ds/primitives.tsx`

### 5. Feedback & Micro-interactions
- Hover/focus/active/disabled on all buttons
- 150-300ms transitions
- Toast on inject, sync, install
- Loading spinners on async actions

### 6. Forgiveness & Affordance
- Click targets >= 44px
- Visible focus rings
- Keyboard navigation works everywhere

---

## SECTION 6: ANTI-SLOP CHECKLIST

- [ ] Uses DeskFlow tokens (`--ws-*`, `--page-accent`)
- [ ] Max `rounded-xl`, `p-5` padding
- [ ] Dark mode only
- [ ] Geist body (13px), JetBrains Mono code
- [ ] All icons from lucide-react
- [ ] No emoji as UI icons
- [ ] Uses `_ds/primitives.tsx` (EmptyState, Skeleton, IconButton, Chip)
- [ ] Uses `_ds/motion.ts` animations
- [ ] Uses `_ds/controls.tsx` class tokens
- [ ] Glass layer: `bg-zinc-900/80 backdrop-blur-xl`
- [ ] Respects `prefers-reduced-motion`

---

## OUTPUT FORMAT

For each component, return:
1. **Full TypeScript/React source code** — complete, copy-pasteable
2. **Props interface** — exact types
3. **State management** — what state, where it lives
4. **All 4 UI states** — with exact Tailwind classes
5. **Data flow** — component → IPC → main process → response
6. **Error handling** — what happens when IPC fails
7. **UX decisions log** — what was designed and why

Return the code for:
1. `MoodboardTab.tsx` (full rewrite)
2. `TokensTab.tsx` (full rewrite)
3. `CommandPalette.tsx` (full rewrite)
4. `DesignWorkspacePage.tsx` diff (tab bar replacement + staged items indicator)
5. Onboarding badge component (new)
