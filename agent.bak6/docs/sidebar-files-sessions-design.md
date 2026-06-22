# Sidebar Design — Files, Sessions & Maintenance Tabs

**Date:** 2026-06-03
**Context:** TerminalPage 12-tab sidebar, tabs: Files (yellow), Sessions (green), Maintenance (violet)

## Design Principles

1. **No emojis ever** — use Lucide React icons exclusively
2. **Use GlassCard** for all card containers (no raw `bg-zinc-800/50 rounded` divs)
3. **Consistent font scale**: Meta 11px/400 (`text-[11px]`), Badge 10px/500 (`text-[10px]`), Body 12px/400 (`text-xs`)
4. **Consistent inputs**: `w-full bg-zinc-900/60 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600`
5. **Consistent buttons**: Tab-accent color for primary, zinc-700 for secondary
6. **No custom hover classes** like `hover:bg-zinc-750` — use only Tailwind defaults
7. **Status indicators** use StatusDot component or inline `w-1.5 h-1.5 rounded-full bg-{color}`

## Files Tab Design

### Header
- Status badge: `text-[10px] font-medium {color}` (no emoji — use Lucide icons like CheckCircle, AlertCircle, Clock, Loader)
- Project path card: `<GlassCard className="p-2.5 space-y-0.5">` with Folder icon + project name + path text

### File List
- Each item: `<GlassCard variant="interactive" className="p-2 flex items-center gap-2">`
- Selected: `border-cyan-500/40` (yellow=tab accent)
- File icon: `FileText` or `Folder` in tab accent color
- File name: `text-xs text-zinc-200 truncate`
- File path: `text-[10px] text-zinc-500 truncate`

### File Content Preview
- Container: `<GlassCard className="p-0 overflow-hidden">`
- Header bar: `flex items-center justify-between px-3 py-1.5 bg-zinc-800/40 border-b border-zinc-700/30`
- File icon: `FileText className="w-3.5 h-3.5 text-zinc-400"`
- File name: `text-xs text-zinc-400`
- Size display: `text-[10px] text-zinc-600`
- Content body: `p-3` with scroll

### States
- Loading: `<LoadingState variant="spinner" />`
- Error: `<div className="flex items-center gap-1.5 text-[10px] text-rose-400"><AlertCircle className="w-3 h-3" />{message}</div>`
- Empty: `<EmptyState icon={FileText} title="No files" description="..." />`

## Sessions Tab Design

### Session List Items
- Container: `<GlassCard variant="interactive" className="p-3 relative overflow-hidden">`
- Left accent bar: `absolute left-0 top-2 bottom-2 w-0.5 rounded-full` — emerald gradient for active, zinc-600 for closed
- Session header line: StatusDot + CategoryBadge + agent badge + topic
- Agent badge: `text-[10px] font-medium text-green-400 bg-green-500/15 px-1.5 py-0.5 rounded-md`
- Date/terminal info line: `text-[10px]` with status indicators
- Description: `text-[11px] text-zinc-400 line-clamp-1`
- Tags: small pill badges

### Action Buttons
Standardize on tab accent (green):
- Primary action: `px-1.5 py-1 bg-green-600/60 hover:bg-green-500/80 text-green-200 text-[10px] font-medium rounded-md`
- Secondary actions: `px-1.5 py-1 bg-zinc-700/50 hover:bg-zinc-600 text-zinc-300 text-[10px] font-medium rounded-md`
- Destructive: `px-1.5 py-1 bg-rose-600/50 hover:bg-rose-500/80 text-rose-200 text-[10px] font-medium rounded-md`
- NO per-color buttons (no cyan for details, no blue for messages, etc.)

### Session Detail View
- Header card: `<GlassCard className="p-4">` with left accent bar (cyan gradient)
- Session title: `text-sm font-bold text-white`
- Agent badge: consistent with list
- Metadata grid: `grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]`
- Action buttons: consistent accent buttons (use green-600 for Focus/Open)

### Messages
- Container: `<GlassCard className="p-4">` with Messages header
- Message rows: `flex items-start gap-2 px-2.5 py-2 rounded-lg text-[10px]`
- Role coloring: assistant=cyan-900/15, user=blue-900/15, system=zinc-900/40
- Role dots: assistant=cyan-400, user=blue-400, system=amber-400

### Category Filter Pills
- Inactive: `bg-zinc-900/40 backdrop-blur-sm text-zinc-400 border border-zinc-800/50 hover:bg-zinc-800/60 hover:text-zinc-300`
- Active: category-specific colors (same as current — works well)

### Top Buttons Row
- Primary (New Session): `px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5`
- Secondary (Import, Save, Load): `px-2.5 py-1.5 bg-zinc-900/60 backdrop-blur-sm hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 text-[10px] font-medium rounded-lg border border-zinc-800/50`

## Maintenance Tab Design

### Header
- Remove the `text-base` title — sidebar tabs use the sidebar's own header ("Terminal")
- No separate border header — flows within sidebar content area (`p-2` padding like other tabs)
- Title text should be `text-xs` to `text-sm`, not `text-base`

### Section Tabs (Overview, Contexts, History, Compactions, Search, Settings)
- Use **pill-style TabBar** pattern (like the main 12-tab bar but smaller):
  - Inactive: `bg-zinc-900/40 backdrop-blur-sm text-zinc-400 border border-zinc-800/50 hover:bg-zinc-800/60 hover:text-zinc-300`
  - Active: tab accent (violet) — `bg-violet-500/20 text-violet-400 border border-violet-500/30`
- Replace current bottom-border tab style with consistent pill pattern

### Cards
- Use `GlassCard` instead of raw `bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/50`
- Stat cards in overview: `<GlassCard variant="interactive" className="p-3">`

### Layout
- Content area: `p-2` (consistent with other sidebar tabs) not `p-4`
- Sub-descriptions: `text-[11px] text-zinc-500 mb-2` not `text-xs text-zinc-400 mb-3`

### Loading State
- Use `<LoadingState variant="spinner" />` — not raw `RefreshCw` spinner

### Error Alert
- Use consistent pattern: `flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg`

### Action Buttons
- Refresh: `p-1.5 hover:bg-zinc-800/80 rounded-md text-zinc-500 hover:text-zinc-200 transition-colors`

## Implementation Order
1. Files tab: replace emojis with icons, use GlassCard, fix hover classes
2. Sessions tab: standardize action buttons, use GlassCard for list items, fix hover classes
3. Maintenance tab: remove oversized header, fix internal tabs to pill pattern, use GlassCard for cards
4. Verify build passes
