# Per-Page Context System for Workspace Terminal

## Raw Request

"HOW IS THE CONTEXT SYSTEM FOR ALL OF THE PAGES SYSTEM WHERE EACH CHANGES AND EACH CONTEXT AND STUFF WHEN AI WORKS ON THOSE PAGE, DO THEY CHANGE AND UPDATE THE CONTEXT OF THE PAGE??? WHERE'S THAT SYSTEM ON THE WORKSPACE??"

## Problem Statement

The `assemble-context` IPC (main.ts:15375) is PROJECT-scoped only. Agents don't know which page the user is viewing. Page-specific data (Dashboard stats, Finance budgets, Life phases, IDE projects) is never injected. `PAGE_CONTEXT.md` exists but is read-only. ContextSidebar config is ignored by the IPC. `context-changed` events notify but don't re-inject context.

**Result:** An AI agent working on the Finance page has no idea what the user's budgets are. The agent is blind to the page the user is actively working on.

## Context Bundle Reference

Read `CONTEXT_BUNDLE.md` in the same directory as this prompt. It contains VERBATIM source code for every file this solution touches. The target AI must read this first.

## MANDATORY: Frontend Design Skills List

1. **Frontend Design** — DeskFlow-specific component patterns, tokens, spacing, typography, glass cards
2. **Human-Centric UX** — empty/loading/error states, progressive disclosure, visual hierarchy, feedback
3. **Impeccable** — 7 design dimensions, 27 anti-patterns
4. **Motion — Bring the UI Alive** — Liveliness Levels, motion taxonomy, recipes
5. **UI UX Pro Max** — industry-specific design rules
6. **Design Taste System** — master aggregator, design variance knobs
7. **frontend-external-infra** — source routing, re-skin rules, anti-slop checklist

## MANDATORY: MCP Inventory

| Component | Source | Use for |
|-----------|--------|---------|
| card | shadcn | Page context display cards |
| dialog | shadcn | Page context detail modals |
| badge | shadcn | Page context status indicators |
| switch | shadcn | Page context toggle in sidebar |
| slider | shadcn | Token budget controls |
| separator | shadcn | Section dividers |
| skeleton | shadcn | Loading states |
| Animated Beam | Magic UI | Context flow visualization |
| Border Beam | Magic UI | Active page highlight |
| Number Ticker | Magic UI | Token count animation |
| Particles | Magic UI | Background ambiance |
| Bot | Lucide | AI agent icon |
| Brain | Lucide | Context brain icon |
| MapPin | Lucide | Page location icon |
| RefreshCw | Lucide | Context refresh icon |
| Layers | Lucide | Page stack icon |
| FileText | Lucide | Page documentation icon |

## MANDATORY: Anti-Slop Checklist

After any MCP-sourced component:
1. Re-skin to DeskFlow tokens (bg-zinc-900/80 backdrop-blur-xl glass)
2. Max rounded-xl, p-5 padding
3. Dark mode only (or respect light mode via `useIsLight`)
4. Geist + JetBrains Mono fonts
5. Glass layer pattern

---

## Engineering Task

Design a complete Per-Page Context System that makes the workspace terminal page-aware. The system must:

### Task A — Page Context Registry (NEW FILE: `src/main/pageContextRegistry.ts`)

Create a registry that maps each page route to its context providers:

```typescript
interface PageContextEntry {
  route: string;           // '/' | '/finance' | '/external' | etc.
  name: string;            // 'dashboard' | 'finance' | etc.
  description: string;     // What this page shows
  contextProviders: Array<{
    name: string;
    description: string;
    dataShape: string;     // Markdown description of data structure
    queryFn: string;       // IPC channel or DB query to get the data
  }>;
  ipcChannels: string[];   // Which IPC channels this page uses
  keyComponents: string[]; // Main React components
}
```

Include entries for ALL 14 pages: Dashboard (`/`), Activity (`/activity`), AI Assistant (`/ai`), Feature Studio (`/studio`), Learn (`/learn`), Resume (`/resume`), IDE Projects (`/ide`), External (`/external`), Finance (`/finance`), Insights (`/reports`), Database (`/database`), Life (`/life`), Settings (`/settings`), Guide (`/guide`).

### Task B — Page Context IPC Handlers (in `src/main.ts`)

Add two new IPC handlers:

1. **`get-page-context`** — Given `{ page, projectId, tokenBudget }`, returns formatted markdown context for that page:
   - Read PAGE_CONTEXT.md section for the page (documentation layer)
   - Query the page's data providers (DB queries for live data)
   - Query ContextBrain for page-relevant episodes/entities
   - Format and return with token budget cap

2. **`notify-page-change`** — Given `{ page, projectId, sessionId? }`:
   - Log as episode in ContextBrain via `writePageContextEpisode`
   - Fire `context-changed` event with page info
   - If sessionId provided, write `[Page: {page}] User navigated to {pageName} page` to terminal

### Task C — Page Context Episode Writer (extension to `src/main/ai/episodeWriters.ts`)

Add `writePageContextEpisode(page, action, data?)` that:
- Logs episode with source `'page_context'`
- Upserts entity type `'page'` with page name
- Adds facts for page data (e.g., `has_budget_count`, `has_total_spending`)

### Task D — Page Change Detection (modification to `src/App.tsx`)

Extend the existing `useEffect` that sets `data-page` attribute:

```typescript
useEffect(() => {
  const page = location.pathname === '/' ? 'dashboard'
    : location.pathname.replace('/', '') || 'dashboard';
  document.documentElement.setAttribute('data-page', page);
  
  // NEW: Notify workspace terminal about page change
  if (selectedProject) {
    (window as any).deskflowAPI?.notifyPageChange?.({
      page,
      projectId: selectedProject,
      sessionId: activeTerminalId || undefined,
    });
  }
}, [location.pathname, selectedProject, activeTerminalId]);
```

### Task E — assemble-context Extension (modification to `src/main.ts`)

Add a new block in the `assemble-context` handler between Block 4 (backup protocol) and Block 5 (user context profile):

```typescript
// [PAGE-CONTEXT] Inject page-specific context
if (data.page) {
  try {
    const pageCtx = getPageContextMarkdown(data.page, data.projectId, maxChars - totalChars - 200);
    if (pageCtx && pageCtx.length > 0) {
      parts.push(pageCtx);
      totalChars += pageCtx.length;
    }
  } catch (e) {
    console.warn('[assemble-context] Page context injection failed (non-fatal):', e);
  }
}
```

The `assemble-context` IPC handler signature must be extended to accept optional `page?: string`.

### Task F — Preload Bridge Extensions (modification to `src/preload.ts`)

Add bridges:
```typescript
getPageContext: (data: { page: string; projectId: string; tokenBudget?: number }) =>
  ipcRenderer.invoke('get-page-context', data),
notifyPageChange: (data: { page: string; projectId: string; sessionId?: string }) =>
  ipcRenderer.invoke('notify-page-change', data),
```

### Task G — Type Definitions (modification to `src/types/deskflow-api.d.ts`)

Add to DeskflowAPI interface:
```typescript
getPageContext: (data: { page: string; projectId: string; tokenBudget?: number }) => Promise<{ success: boolean; context?: string; error?: string }>;
notifyPageChange: (data: { page: string; projectId: string; sessionId?: string }) => Promise<{ success: boolean; error?: string }>;
```

### Task H — ContextSidebar Extension (modification to `src/components/ContextSidebar.tsx`)

Add a "Page Context" section with:
- Toggle: `page_context.enabled` (boolean)
- Token budget slider: `page_context.max_tokens` (100-2000, default 1000)
- Auto-inject toggle: `page_context.auto_inject` (boolean, default true)
- Notify on change toggle: `page_context.notify_on_change` (boolean, default true)

### Task I — System Prompt Extension

Add to the agent's system prompt (in `src/lib/defaults.ts` or assembled via ContextService):

```markdown
## Page Context

You have access to PAGE CONTEXT — information about the page the user is currently viewing.
Page context is automatically injected when you start a session and updates when the user navigates.

When the user asks about what's on screen, reference the injected page context.
When you see "[Page: X] User navigated to X page", note the context has changed.
Use page context to answer questions about data, suggest improvements, and understand user intent.
```

---

## Design Task

Design the UI for the Page Context section in ContextSidebar:
- Glass card with Brain icon header
- Token budget slider with live count
- Toggle switches for auto-inject and notify-on-change
- Page preview section showing current page name + description
- Must match existing ContextSidebar aesthetic (GlassCard, zinc-800/30 backgrounds, border-zinc-700/30)

## UX Task

Design the interaction flow:
1. User navigates to Finance page → terminal gets `[Page: finance]` notification
2. User asks "what are my budgets?" → agent answers from injected context
3. User navigates to Dashboard → terminal gets new notification, context updates
4. Agent starts new session → page context for current page is auto-injected
5. Page context toggle off → no injection, no notifications

## Constraints

- No new npm dependencies
- Page context injection is BEST-EFFORT (never crashes session if it fails)
- Token budget is hard-capped (never exceed maxChars)
- PAGE_CONTEXT.md is optional (if missing, skip documentation block)
- Database queries for page context must be fast (< 100ms)
- Episode writer is non-blocking (fire-and-forget)
- Must work with existing ContextConfig tier profiles (top/mid/low)
- Must not break existing assemble-context behavior when page param is absent
