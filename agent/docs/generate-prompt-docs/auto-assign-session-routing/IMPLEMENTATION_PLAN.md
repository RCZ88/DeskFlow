# Implementation Plan: Auto-Assign Session Routing

Maps RESULT.md proposals to the actual codebase. Every step has exact line numbers and verification.

---

## Step 1 — DB schema: `routing_costs` table + `auto_named` column

**File:** `src/main.ts`

**Where:** After the `app_totals` table creation at line 1920, before the indexes at line 1922.

**Changes:**
```typescript
// After line 1920 (closing of app_totals CREATE TABLE)
db.exec(`
  CREATE TABLE IF NOT EXISTS routing_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    call_type TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    session_id TEXT,
    prompt_preview TEXT
  )
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_routing_costs_timestamp ON routing_costs(timestamp)');

// Also add auto_named column to terminal_sessions (safe migration)
try { db.exec("ALTER TABLE terminal_sessions ADD COLUMN auto_named INTEGER DEFAULT 0"); } catch {}
```

**Verify:** App starts without error, `routing_costs` table exists.

---

## Step 2 — Helper functions in main.ts

**File:** `src/main.ts`

**Where:** After the `extractJsonFromResponse` function at line 8126, BEFORE `OPENROUTER_BASE_URL` at line 8129.

**Changes:** Insert:
1. `callOpenRouter` — shared helper that wraps the existing `summarize-with-llm` pattern (reuses `getOpenRouterApiKey`, `OPENROUTER_BASE_URL`)
2. `AutoAssignConfig` interface + defaults
3. `loadAutoAssignConfig` / `saveAutoAssignConfig`
4. `generateSessionName`
5. `computeCost` + `MODEL_PRICING` map
6. `logRoutingCost`

Note: `callOpenRouter` reuses the same fetch pattern as `summarize-with-llm` at line 8303, but is a standalone function for routing calls (different endpoint model, smaller max_tokens, temp 0.1).

**Verify:** `npm run build:electron` passes.

---

## Step 3-5 — IPC handlers in main.ts

**File:** `src/main.ts`

**Where:** After the `summarize-session` handler (ends at line 7360) and `summarize-with-llm` handler (ends at line 8344). Actually, the helpers go near `getOpenRouterApiKey` at line 8089, and the IPC handlers go near the existing routing-related handlers.

Better placement:
- Helpers: after line 8126 (before OPENROUTER_BASE_URL)
- IPC handlers: after `summarize-with-llm` at line 8344 (after the AI features section)

**Handlers to add (5 total):**
1. `route-prompt` (core routing — gathers sessions, calls LLM, returns result)
2. `update-session-summary` (async summary generation)
3. `get-routing-costs` (SQLite aggregation queries)
4. `reset-routing-costs` (DELETE FROM routing_costs)
5. `get-auto-assign-config` / `save-auto-assign-config` (file-based config)

**Code adaptation from RESULT.md:**
- Replace `callOpenRouter()` with direct fetch (reuse OPENROUTER_BASE_URL + getOpenRouterApiKey pattern)
- Replace `loadAutoAssignConfig` JSON path with `path.join(app.getPath('userData'), 'auto-assign-config.json')`
- Config file path already has `userDataPath` variable at line 27

**Verify:** `npm run build:electron` passes.

---

## Step 6 — Preload bridges

**File:** `src/preload.ts`

**Where:** Before the closing `});` at line 533. After `readActionsErrorLog` at line 531.

**5 bridges to add:**
```typescript
// Auto-assign routing
routePrompt: (request: { prompt: string; projectPath?: string }) =>
  ipcRenderer.invoke('route-prompt', request),
updateSessionSummary: (request: { sessionId: string; force?: boolean }) =>
  ipcRenderer.invoke('update-session-summary', request),
getRoutingCosts: () => ipcRenderer.invoke('get-routing-costs'),
resetRoutingCosts: () => ipcRenderer.invoke('reset-routing-costs'),
getAutoAssignConfig: () => ipcRenderer.invoke('get-auto-assign-config'),
saveAutoAssignConfig: (config: any) => ipcRenderer.invoke('save-auto-assign-config', config),
```

**Also add type declarations in `src/App.tsx`** — at line 221 (after `readActionsErrorLog`), before the `};` at line 222:
```typescript
routePrompt: (request: { prompt: string; projectPath?: string }) => Promise<{ action: string; sessionId?: string; sessionName?: string; terminalId?: string; confidence?: number; suggestedName?: string; suggestedSummary?: string; reason?: string }>;
updateSessionSummary: (request: { sessionId: string; force?: boolean }) => Promise<{ success: boolean; skipped?: boolean; summary?: string; topic?: string; autoNamed?: boolean; reason?: string; error?: string }>;
getRoutingCosts: () => Promise<{ today: any; week: any; month: any; total: any; byType: any[] }>;
resetRoutingCosts: () => Promise<{ success: boolean }>;
getAutoAssignConfig: () => Promise<any>;
saveAutoAssignConfig: (config: any) => Promise<{ success: boolean }>;
```

**Verify:** `npm run build:renderer` passes.

---

## Step 7-8 — New components

### RoutingDisambiguationDialog.tsx
**File:** `src/components/RoutingDisambiguationDialog.tsx` (new file)

**Code:** From RESULT.md section 5a (lines 536-627), adapted to use the same zinc/purple glass-card pattern as existing dialogs (ProblemDetailModal, FeaturesDialog). Uses existing `lucide-react` imports.

### RoutingToast.tsx
**File:** `src/components/RoutingToast.tsx` (new file)

**Code:** From RESULT.md section 5b (lines 631-682). The `animate-in` class needs to be checked against existing Tailwind v4 animations.

**Verify:** No import errors.

---

## Step 9 — TerminalPage.tsx: state + handlers + UI wiring

**File:** `src/pages/TerminalPage.tsx`

**Changes (9a through 9e):**

### 9a — New imports (near line 1-30, where existing imports are)
Add `Sparkles`, `DollarSign`, `Loader2` to lucide-react import.
Add `RoutingDisambiguationDialog`, `RoutingToast` imports.

### 9b — New state variables (near line 185, alongside `sendTargetSession`)
RESULT.md section 5c lists 8 new state vars (lines 697-707).

### 9c — Config loading effect (new useEffect)
After existing useEffects (around line 713). Loads `autoAssignConfig` on mount.

### 9d — Modify `sendInstruction` function (line 514-557)
Insert auto-assign routing BEFORE the existing `@mention` check (before line 521).

**Strategy:** The current flow is:
1. Check `@mention` → resolve target
2. Fallback to `sendTargetSession` → resolve target
3. `terminalWrite` to resolved target

Auto-assign changes this to:
1. If `autoAssignConfig.enabled && !explicitTarget` → route via IPC
   - `create_new` → spawn terminal + save session + send
   - `route` with high conf → send directly
   - `route` with med conf → show toast
   - `route` with low conf → show disambiguation
2. Else → existing flow unchanged

The existing flow should still work when auto-assign is OFF.

### 9e — Render routing UI elements (near FeaturesDialog at line 2374)
Add RoutingToast + RoutingDisambiguationDialog + routing spinner

**Verify:** `npm run build` passes.

---

## Step 10 — Configs tab UI additions

**File:** `src/pages/TerminalPage.tsx`

**Where:** After the existing Debug Mode toggle at line ~2351.

**Changes:**
1. "Auto-Assign Routing" section with toggle, model selector, frequency selector
2. "Auto-Rename" toggle + threshold selector
3. "Infrastructure Cost" card with 4-grid display + by-type breakdown + Reset button
4. Add `loadRoutingCosts` function + effect that loads when `activeTab === 'configs'`

**Adaptations from RESULT.md:**
- Section 5d code from lines 932-1129
- Uses existing toggle pattern (same as debug mode toggle near line 2340)
- Uses existing grid pattern (same as model improvement stats display)
- Add `DollarSign` to lucide import if not already added in step 9a

**Verify:** Refresh Configs tab, see new controls. Toggle works.

---

## Step 11 — Session list summary line

**File:** `src/pages/TerminalPage.tsx`

**Where:** Inside the session list rendering (find where each session is rendered in the `activeTab === 'sessions'` section, around line 1903+).

**Changes:** After each session's topic line, add:
- `session.description` truncated to 1 line (zinc-600, text-[10px])
- `session.auto_named` badge (cyan-600, text-[9px])

**Verify:** Sessions show descriptions in sidebar list.

---

## Edge Cases (from RESULT.md Section 8)

| Case | How Code Handles It |
|------|---------------------|
| No API key | `getOpenRouterApiKey` returns "" → `route-prompt` throws → caught → returns `{ action: "manual" }` |
| No active sessions | SQL returns empty → handler returns `{ action: "create_new", confidence: 1.0 }` |
| LLM returns invalid JSON | `extractJsonFromResponse` throws → caught → fallback manual |
| Manually named sessions | `auto_named = 0` → auto-rename skips topic update |
| Summary frequency = 0 | `msgCount % 0` is NaN → `update-session-summary` skips |
| Routing call times out | Fetch timeout (default) → catch block → manual fallback |
| `@term` explicit routing | Auto-assign ONLY runs when no `@term` present (check `instructionText.includes('@')` first) |
| Cost table missing | `CREATE TABLE IF NOT EXISTS` is idempotent |
| Duplicate `auto_named` column | ALTER TABLE in try/catch → silently ignored |
| Session has <2 messages | `update-session-summary` returns `{ skipped: true }` |

---

## Build Order

```
Step 1: main.ts — DB schema           → build:electron
Step 2: main.ts — helpers             → build:electron
Step 3-5: main.ts — IPC handlers      → build:electron
Step 6: preload.ts + App.tsx — bridges → build:renderer + build:electron
Step 7: RoutingDisambiguationDialog   → build:renderer
Step 8: RoutingToast                  → build:renderer
Step 9: TerminalPage.tsx — wiring     → npm run build
Step 10: TerminalPage.tsx — Configs UI → npm run build
Step 11: TerminalPage.tsx — session list → npm run build
```

Each step produces a passing build before moving to the next.
