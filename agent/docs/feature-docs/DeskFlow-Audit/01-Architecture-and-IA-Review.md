# Doc 1 — Architecture & Information-Architecture Review

> **Scope.** The structural health of DeskFlow: where the boundaries have eroded, and the concrete page-consolidation plan you asked for (merge tracking? Insights?). Format is `Symptom -> Fix -> Principle`.

## A. The god-object problem (the #1 architecture risk)

### A1 — `main.ts` is 21,432 lines with 460 IPC handlers `[P1 · main.ts]`

**Symptom.** The entire Electron main process — DB schema/migrations, tracking loop, git/tool scanning, MCP spawning, a local HTTP server, AI sync, and 460 `ipcMain.handle` registrations — lives in one file. Any change risks unrelated systems; you can't unit-test a handler without booting everything; merge conflicts are guaranteed.

**Fix.** Carve by *domain*, behind a typed IPC registry. Target layout:

```
electron/
  db/            schema.ts  migrations.ts  connection.ts
  ipc/           registry.ts        # one place that wires channels -> handlers
  domains/
    tracking/    trackingLoop.ts  handlers.ts
    browser/     server.ts  handlers.ts
    projects/    scan.ts  git.ts  handlers.ts
    ai/          sync.ts  handlers.ts
    insights/    rollups.ts  handlers.ts   # <- Rewind engine lands here (Doc 4)
  main.ts        # ~200 lines: app lifecycle + registry.registerAll()
```

The registry pattern (so channels are typed and discoverable):

```ts
// ipc/registry.ts
type Handler = (args: any, e: IpcMainInvokeEvent) => unknown | Promise<unknown>;
const handlers = new Map<string, Handler>();
export const defineHandler = (channel: string, fn: Handler) => handlers.set(channel, fn);
export const registerAll = () => handlers.forEach((fn, ch) =>
  ipcMain.handle(ch, (e, args) => fn(args, e)));
```

**Do it incrementally** (strangler-fig): create the folders, move ONE domain (start with `insights/` since it's new), prove it, repeat. Never big-bang a 21k-line file.

**Principle.** *A module should have one reason to change.* File size is a proxy for how many responsibilities you've fused. When you can't name a file without "and," split it. Typed registries turn a 460-entry string soup into a discoverable, testable surface.

### A2 — `App.tsx` is a 3,347-line prop hub (71 `useState`, 37 `useEffect`) `[P1 · App.tsx]`

**Symptom.** App.tsx owns global state and passes ~15 props to every page (`selectedPeriod`, `dateOffset`, `tierAssignments`, `allLogs`, `filteredLogs`...). This is prop-drilling at scale: every page re-renders when any of these change, and adding a shared field means editing every page signature.

**Fix.** Introduce **scoped context providers** (or a light store like Zustand) for the three real concerns:
- `TimeRangeContext` (`selectedPeriod`, `dateOffset`, `timeMode`) — changes rarely, read everywhere.
- `TrackingDataContext` (logs, appStats, browserLogs) — the big payloads.
- `SettingsContext` (tierAssignments, categoryOverrides).

Pages `useTimeRange()` instead of receiving 15 props. Memoize context values so consumers only re-render on the slice they read.

**Principle.** *Prop-drilling is a coupling smell; context/stores are for cross-cutting state.* The test: if a prop passes through a component that doesn't use it, it shouldn't be a prop. Colocate state with the concern that owns it.

## B. Repo hygiene

### B1 — 29 `.bak`/`.backup` files committed in-tree `[P2 · repo]`

**Symptom.** `TerminalPage.tsx.backup`, `IDEProjectsPage.tsx.tsx.backup-pre-setup-init-2026-05-27`, `AiPage.tsx.bak.*`, a `backups/` dir with live `.tsx`, `.bak.20260607` service files, etc. These get imported by accident, bloat search, confuse grep, and drift from reality.

**Fix.** Delete them all; add `*.bak`, `*.backup`, `*.bak.*` to `.gitignore`. **Git is your backup** — use branches/tags (`git tag pre-setup-init`) instead of copy-paste files. If you fear reverts, that's a workflow fix (protect branches, commit small), not a reason to keep shadow copies.

**Principle.** *There is exactly one source of truth for each file.* Version control already solves "I might need the old version." Parallel copies are entropy: they rot, mislead, and eventually someone edits the wrong one.

## C. The Information-Architecture decision you asked about

You have **~16 routed pages**. That's the real problem behind "I don't want to make another page." Here's the objective call.

### C1 — The overlap map

| Page | Core job | Overlaps with |
| --- | --- | --- |
| Stats / Applications | app usage tables + distribution | Dashboard, Productivity |
| Browser Activity | domain/website usage | Stats (same `liveActivityLogs`), Productivity |
| Productivity | tier-weighted score, focus | Stats, Insights, Dashboard |
| Insights / Reports | day/weekly/activity aggregations | Productivity, External, Dashboard |

Four pages are all answering "where did my computer time go, and was it good?" with different cuts. That's the redundancy your users feel.

### C2 — Recommendation: **2 destinations, not 4**

> **Merge App + Website + Productivity -> one "Activity" page** (tabbed: *Apps / Websites / Productivity*). **Keep "Insights" as the narrative + Rewind home** (the "what does it mean / here's your story" destination). Dashboard stays the landing page.

**Why this split (and not "productivity with insights"):**
- **Apps + Websites + Productivity are the same mental model** — "raw behavioral tracking, sliced." They already share `liveActivityLogs`, `tierAssignments`, and period props. Tabs over one dataset = no context switch, one data fetch, shared filters. This is the "combine the tracking" option you floated, and it's the right one.
- **Insights is a *different* mode** — exploration/aggregation/story, not live tracking. Merging Productivity *into* Insights would fuse "live raw view" with "reflective summary," muddying both. Keep the *tracking* together and the *meaning* together.
- Result: a user's loop becomes **Dashboard (now) -> Activity (drill into raw) -> Insights (reflect + Rewind)** — three clear altitudes instead of a flat menu of near-duplicates.

### C3 — How to merge without a rewrite

The pages are already tab-shaped internally (Stats has a TabBar; Browser has a 7-tab bar). Mechanics:
1. Create `ActivityPage.tsx` as a thin shell that renders a top-level `TabBar` and lazy-loads the **existing** page bodies as tab panels (`<Suspense>`), so you reuse code rather than rewrite it.
2. Hoist the shared data fetch (logs/appStats/browserStats) to `ActivityPage` and pass down — one fetch instead of three.
3. Redirect old routes (`/stats`, `/browser`, `/productivity`) to `/activity?tab=...` so deep links and the tutorial don't break.
4. Delete the three page entries from the sidebar; add one **Activity** entry.

**Principle.** *Organize navigation around user intent, not around data tables.* Pages should map to "what am I trying to do," not "which SQL view exists." When several screens answer one question, they're tabs, not routes.

## D. Smaller structural notes

- **`DatabasePage` uses `(window as any).deskflowAPI`** instead of the typed bridge — inconsistent and unsafe. Standardize on the typed `deskflowAPI`. `[P2]`
- **Self-contained pages refetch their own data** (IDE, Terminal, AI) while others get props — two data-loading paradigms coexist. Pick one (React Query-style cache keyed by `{page, period, offset}`) so caching/invalidation is uniform. `[P2]`
- **`main.ts` embeds a full HTML string for the terminal window via `data:` URL** (`main.ts:11705`) — move to a real file + IPC; `data:` URLs are a CSP/security smell (see Doc 2). `[P2]`

## E. This doc's mini-backlog

1. `[P1]` Extract `insights/` domain out of `main.ts` first (greenfield, low risk) — proves the module pattern.
2. `[P1]` Introduce `TimeRangeContext` + `TrackingDataContext`; delete the drilled props page-by-page.
3. `[P1]` Build `ActivityPage` shell; fold in Stats/Browser/Productivity as tabs; add route redirects.
4. `[P2]` Purge 29 backup files; add gitignore rules.
5. `[P2]` Standardize the typed IPC bridge everywhere; unify data-fetching.
