# Prompt: Context Systems Visual Feedback

## Raw Request

> "i want to use the generate-prompt skill to design the visual feedback for context systems"

## Context

All code references are in `agent/docs/context-visuals/CONTEXT_BUNDLE.md`. Read it first.

## Problem

The app has 7 context systems (LLM Wiki, Obsidian Skills, Graphify, PARA, QMD Templates, Automations, Design Skills) that users toggle on/off in a New Session dialog. There is **zero real-time feedback** about whether they're alive and working:

- Backend `get-context-systems` IPC handler discovers all 7 systems with real counts — frontend never calls it, uses ad-hoc checks covering only 3 systems
- `itemCount` is hardcoded or stale (graphify shows `0` or `1` "nodes", PARA always `0`, automations always `0`)
- `lastBuilt` is always `null` — no freshness indication
- No health status — users can't tell if a system is working, empty, or missing
- No verify/sync button — only way to refresh is close and reopen
- No auto-refresh — `checkInfra()` runs once on mount, never again
- No error handling — if backend call fails, nothing happens, no fallback
- No loading state on initial mount — cards appear with zeros, then data arrives silently
- No animations — count changes and health transitions are jarring

The cards look decorative, not functional.

## The Mandate

Design and implement a **complete, production-ready live monitoring system** for all 7 context systems. Every piece — frontend UI, backend IPC, data flow, error handling, animations — must work correctly for end users.

---

### 1 — Backend: Extend `get-context-systems` Handler

The existing handler in `main.ts:8134` returns `{ id, name, itemCount, itemLabel, available }` per system. **Extend it** to also return:

```typescript
{
  id: string;
  name: string;
  itemCount: number;
  itemLabel: string;
  available: boolean;
  lastBuilt: string | null;   // ISO timestamp of newest file mtime in this system's directory
  error: string | null;        // if filesystem read failed, error message
}
```

`lastBuilt` logic per system:
- **LLM Wiki** — max mtime of all `.md` files in `agent/`
- **Obsidian Skills** — max mtime of all `SKILL.md` files in `agent/skills/*/`
- **Graphify** — mtime of `graphify-out/graph.json`
- **PARA** — mtime of newest `.md` in `CZVault/**/*.md` (recursive)
- **QMD Templates** — max mtime of all `.qmd` files in `agent/templates/`
- **Automations** — mtime of `agent/automations/automations.json`
- **Design Skills** — same as Obsidian Skills (they share the directory)

If a directory doesn't exist or read fails, `available: false`, `lastBuilt: null`, `error: "Path not found"`.

**File scope change:** Edit `main.ts` (IPC handler) and `preload.ts` (keep existing bridge — it already proxies through). Update the types in `NewSessionDialog.tsx` to accept the extended response.

---

### 2 — Frontend: `SystemInfo` Interface

```typescript
interface SystemInfo {
  id: string;
  name: string;
  icon: any;
  accentColor: string;
  itemCount: number;
  itemLabel: string;
  lastBuilt: string | null;       // from backend (file mtime)
  maxTokens: number;
  enabled: boolean;
  onToggle: () => void;
  health: 'healthy' | 'degraded' | 'missing' | 'unknown' | 'error';
  lastSynced: string | null;      // when frontend last fetched (client timestamp)
  onVerify: () => void;
  refreshing: boolean;
  lastError: string | null;       // error message from backend, shown in tooltip
}
```

Health derivation:
- `available === true && itemCount > 0` → `healthy`
- `available === true && itemCount === 0` → `degraded`
- `available === false && lastBuilt === null` → `missing`
- `error !== null` → `error`
- initial state before first fetch → `unknown`

---

### 3 — Data Pipeline

#### 3a. Initial Load (`loadSystemStatus`)
Replace `checkInfra()` with a single `loadSystemStatus()` call:
1. Call `getContextSystems(projectPath)` once on mount
2. If success → `setCtxSystemData(result.data)`, `setCtxLastSynced(now)`
3. If failure or timeout → `setCtxSystemData([])`, all cards show `health: 'error'`
4. If `mode === 'create'` (session creation, not setup), do NOT fetch — systems aren't shown

#### 3b. Auto-Refresh
- `useEffect` with `setInterval(30000)` while dialog is open and not in `'create'` mode
- Cleanup: `clearInterval` on unmount or dialog close
- Does NOT reset `lastSynced` on stale data — only updates on successful response

#### 3c. Per-System Verify (`verifySystem`)
1. Set `refreshingId = systemId` (triggers spinner on card)
2. Call `getContextSystems(projectPath)` 
3. On success:
   - Update `ctxSystemData` with fresh data
   - Update `ctxLastSynced`
   - **Trigger green flash animation** on the verified card's health dot
   - Clear `refreshingId`
4. On failure:
   - **Trigger red flash animation** on the health dot
   - Keep previous `ctxSystemData` intact (don't overwrite good data with empty)
   - Set `lastError` on affected systems
   - Clear `refreshingId`

#### 3d. State Management
State variables needed:
- `ctxSystemData: Array<{id, name, itemCount, itemLabel, available, lastBuilt, error}>`
- `ctxLastSynced: string | null`
- `refreshingId: string | null`
- Remove old `infraStatus` state entirely

---

### 4 — Visual Specs: SystemToggleCard

Each card is a live status card with these visual elements:

```
 ┌──────────────────────────────┐
 │ ●  [icon] System Name    ↻ ═│  ← health dot, verify btn, toggle
 │    12 files · ~500t · 2m ago│  ← live count, token budget, last synced
 └──────────────────────────────┘
```

#### 4a. Health Dot (top-left, absolute positioned)
- `w-2 h-2 rounded-full absolute top-2 left-2`
- Colors:
  - `healthy` → `bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]`
  - `degraded` → `bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]`
  - `missing` → `bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]`
  - `error` → `bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]`
  - `unknown` → `bg-zinc-600`

#### 4b. Health Dot Animations
- **On verify success:** Add `animate-pulse` class for 1 second (green glow pulse), then remove
- **On verify failure:** Flash red briefly (1s pulse), then revert to previous color
- **On fresh mount (first data arrives):** Brief scale-up pulse (from `scale-75` to `scale-100` over 300ms)
- Use `useState` for animation trigger + `useEffect` timeout to clear it

#### 4c. Health Dot Tooltip
- CSS tooltip on hover using `group/tooltip` pattern: `absolute left-0 top-3 hidden group-hover/tooltip:block`
- Content varies by health:
  - `healthy`: `"Live: {count} {label} · updated {formatRelTime(lastSynced)}"`
  - `degraded`: `"System exists but no items found"` + `"last built {formatRelTime(lastBuilt)}"` if `lastBuilt` exists
  - `missing`: `"Not configured — run Initialize or create the directory"`
  - `error`: `"Error: {lastError}"`
  - `unknown`: `"Checking..."`

#### 4d. Live Count + Number Animation
- Shows real `itemCount` from backend, formatted as `"{count} {itemLabel}"`
- **When count changes on refresh:** Apply `text-emerald-400` color to the number span for 800ms, then revert to original color
- Track previous count via `useRef` in the card, compare on each render
- If count = 0 and system is degraded: show `"Empty"` in amber instead of `"0 files"`

#### 4e. Last Synced / Last Built
- Show `formatRelTime(lastSynced)` after the count
- If no `lastSynced` yet but `lastBuilt` exists from backend: show `"Built {formatRelTime(lastBuilt)}"`
- Stale dimming:
  - `<5 minutes` → `text-zinc-500`
  - `5-30 minutes` → `text-zinc-600`
  - `>30 minutes` → `text-amber-600/70` (warning tint)

#### 4f. Verify Button
- `w-3 h-3 RefreshCw` icon, `p-1 rounded-md hover:bg-zinc-700/50`
- When `system.refreshing === true`: add `animate-spin text-cyan-400`
- Otherwise: `text-zinc-600 hover:text-zinc-400`
- Positioned between the icon+name and the toggle switch

#### 4g. Token Budget
- Keep as `"~{maxTokens}t"` in `text-zinc-600 text-[9px]`

#### 4h. Layout
- `grid grid-cols-2 gap-2` container (UNCHANGED)
- Card: `pl-3` on content to make room for the absolute health dot
- Toggle switch: dimensions UNCHANGED (`w-8 h-4`, dot `w-3 h-3`)

#### 4i. Loading State (before first fetch completes)
- All cards show `health: 'unknown'` (gray dot, no animation)
- Count area shows `"..."` instead of a number
- Verify button disabled (no-op, no spin)
- After first `loadSystemStatus()` resolves, cards populate with real data

---

### 5 — UX Flow Summary

| Event | Action | Visual |
|-------|--------|--------|
| Dialog opens | `loadSystemStatus()` called | Gray dots, `"..."` counts |
| First data arrives | `setCtxSystemData()` | Health dots transition gray→color, counts populate, brief scale pulse on dots |
| 30s timer fires | `loadSystemStatus()` again | Counts update silently, `lastSynced` refreshes |
| User clicks verify | `verifySystem(id)` | That card's `RefreshCw` spins. On success: green pulse on health dot. On fail: red pulse, keep old data. |
| System missing | `available: false` | Red dot, `"Not configured"` text |
| Backend error | `error` field set | Red dot + tooltip shows error message |
| Dialog closes | Clear interval | — |

---

### 6 — Error Handling

1. **Backend call fails entirely** (network, crash) → `setCtxSystemData([])`, all cards show `health: 'error'`, tooltip shows `"Failed to load system status"`
2. **Backend returns partial data** (some systems, some errors) → show each system's individual `error` field in its tooltip; healthy systems unaffected
3. **Verify failure** → red pulse on health dot, keep previous data, show error in tooltip, clear `refreshingId`
4. **Race conditions** — if a verify finishes after a newer auto-refresh or vice versa, always keep the latest `ctxLastSynced` + its corresponding data (compare timestamps)

---

### 7 — Animation Implementation Notes

Use **no new npm packages** — `framer-motion` is already available for complex animations, but `useState` + CSS classes + `useEffect` timeouts are preferred for simple flash/pulse effects (simpler, no overhead).

**Trigger variables** per card (computed from state, not stored):
- `showGreenFlash: boolean` — true for 1s after verify success → apply `animate-pulse` to health dot with emerald glow
- `showRedFlash: boolean` — true for 1s after verify failure → apply `animate-pulse` to health dot with red glow
- Previous count stored in `useRef<number>` → compare on each render, if changed → apply `text-emerald-400` for 800ms

Implementation approach:
```typescript
const [flashState, setFlashState] = useState<'none' | 'green' | 'red'>('none');
const prevCount = useRef(system.itemCount);

useEffect(() => {
  if (flashState !== 'none') {
    const t = setTimeout(() => setFlashState('none'), 1000);
    return () => clearTimeout(t);
  }
}, [flashState]);

const countChanged = prevCount.current !== system.itemCount && prevCount.current !== 0;
prevCount.current = system.itemCount;
```

---

### 8 — Files to Modify

| File | Changes |
|------|---------|
| `src/main.ts:8134-8178` | Extend get-context-systems handler to return `lastBuilt` and `error` fields per system |
| `src/components/NewSessionDialog.tsx` | Update SystemInfo, SystemToggleCard, loadSystemStatus, verifySystem, auto-refresh useEffect, systems array, animations, error handling, loading states |
| `src/components/WorkspaceSettingsDialog.tsx` | (only if needed — update SystemCardDef to show health info when viewing workspace settings) |

---

### 9 — Constraints

- **No new npm packages** — use `lucide-react`, `framer-motion` (existing), CSS classes
- **No emojis** — Lucide icons only
- **Tailwind v4** — utility classes only, no custom CSS
- **Dark glassmorphic** aesthetic: `bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50`
- **Build must pass** after implementation
- **Do not remove** the ContextMapVisualization section
- **Do not change** the grid layout (`grid grid-cols-2 gap-2`)
- **Do not break** the toggle switch interaction
- **TypeScript** — strict types, non-any where possible

---

### 10 — Acceptance Criteria

1. ✅ Health dot shows correct color per system (green/amber/red/gray)
2. ✅ Tooltip on health dot shows meaningful message
3. ✅ Live item counts from backend, not hardcoded
4. ✅ `lastBuilt` shows actual file modification time from backend
5. ✅ `lastSynced` shows when frontend last fetched
6. ✅ Stale dimming works at 5min and 30min thresholds
7. ✅ Verify button spins and triggers green/red pulse
8. ✅ Count change animates with green flash
9. ✅ Auto-refresh every 30s with proper cleanup
10. ✅ Error handling: backend failure → red dots + tooltip, verify failure → red pulse + keep data
11. ✅ Loading state: gray dots + "..." until first data arrives
12. ✅ Build passes with no new dependencies
