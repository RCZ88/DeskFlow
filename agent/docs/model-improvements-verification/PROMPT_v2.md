# Model Improvement — Settings Dashboard & Visualization

## Raw Request

> "so? idd your prompt not ask the ai to do any frontend designs and like logics for the settings and tweaks and visualization and stuff?"
> "how does it actually improve the stuff? there should be some things that can be viewed to see the concrete prove of the system existing."

---

## Context

Read `agent/docs/model-improvements-verification/CONTEXT_BUNDLE.md` as the single source of truth. It contains exact file paths, line numbers, and code for all improvements from `agent/docs/model_improv.md`.

The improvements currently exist only in code (main.ts, ContextService.ts, TerminalPage.tsx, etc.) with no UI to see them working. The user needs a **live dashboard** showing real-time stats, configurable knobs, and proof the system is active.

## Existing Design Tokens & Patterns

Reference these existing components for consistent design language:

1. **Settings panel pattern**: `src/components/context-ui/SettingsPanel.tsx` (range sliders with `accent-emerald-500`, checkbox toggles, `bg-gray-800 rounded-lg p-4 border border-gray-700` cards, `text-xs font-semibold text-gray-300 uppercase` headers, `font-mono text-emerald-400` value displays)

2. **Stat card pattern**: Look at `src/pages/DatabasePage.tsx` for analytics-style stat cards showing numbers with labels

3. **Tab system**: `src/components/ContextMaintenanceTab.tsx` for tabbed navigation pattern with `renderTabs()`

4. **Color scheme**: Dark theme (`bg-zinc-900`, `bg-gray-800`, `text-zinc-400`, `text-gray-300`), accent colors (`emerald-500`, `cyan-500`, `green-500`)

## The Mandate

Design a comprehensive **Model Improvement Dashboard** — a new UI section in the existing Context Maintenance tab (or as a standalone sub-tab) that provides:

### 1. Live Status Cards (Data Processing Logic)

For each improvement, render a live stat card showing **real data from the running system**:

| Card | Data Source | Processing Logic |
|------|-------------|------------------|
| **Auto-Reinject Status** | `terminalMessageCounts` Map capacity + per-terminal count | Read via new IPC `get-model-improvement-stats` that returns per-terminal message counts, reinjection count, threshold value |
| **Rule Injection Stats** | Count of RULES_COMPACT injections made this session | Counter in main.ts that increments each time `maybeReinjectRules()` writes |
| **Actions Parse Rate** | Actions attempted vs failed (from `actionCount` / `failCount` in `parseAndExecuteActions`) | Aggregate success rate as percentage: `(actions_attempted - actions_failed) / actions_attempted * 100` |
| **Tier Distribution** | Active terminal tabs grouped by modelTier | Count terminals by tier: `top: 2, mid: 1, low: 0` |
| **Context Budget Used** | `usedTokens` / `budget` per active session | Percentage bar: `6300 / 7000 = 90%` |

Each card must fetch real data through IPC, not hardcoded mock values.

### 2. Settings & Tweaks Panel (Configurable Controls)

A settings section with controls that actually change the live system behavior:

| Control | What It Changes | How | Default |
|---------|----------------|-----|---------|
| **Re-inject Threshold** | `RULES_REINJECT_THRESHOLD` | New IPC `set-reinject-threshold` writes to a runtime variable in main.ts (falls back to const on restart) | 10 |
| **Default Model Tier** | localStorage `default-model-tier` | `window.localStorage.setItem('default-model-tier', value)` | 'mid' |
| **Debug Mode Toggle** | Enables verbose `[SYSTEM]` logging for all actions | New IPC `set-model-debug` writes to main.ts runtime variable | off |
| **View actions_error.log** | Read latest entries from file | IPC `read-actions-error-log` reads `agent/actions_error.log` and returns last 10 lines | — |

Each control must persist its value (localStorage or IPC write to runtime variable in main.ts) and show visual feedback when changed.

### 3. Rules Card Preview (Visual Display)

A preview pane that shows the current RULES_COMPACT.md content with:
- Template variables highlighted/filled (replace `{{PROBLEM_ID}}` with actual values)
- Syntax-highlighted markdown rendering (use the same markdown style as the terminal)
- "Copy to clipboard" button
- "Inject Now" button that triggers the Remind preset programmatically

### 4. Context Assembly Map (Visualization)

A visual diagram showing the LAYER 0-4 structure with:
- Each layer as a colored block with size proportional to its token count
- Layer 0-2 blocks marked as "Always Injected" with an emerald badge
- Layer 3-4 blocks with percentage bars showing budget used vs remaining
- Tier profile selector (top/mid/low) that re-renders the map to show what changes

### 5. Actions.json Monitor (Live Feed)

A small terminal-like log view showing:
- When actions.json was last modified
- Last parse result (success / fail / partial)
- Last error message (truncated to 200 chars)
- Link to open `agent/actions_error.log`

This updates in real-time when `executeActionsFromFile` fires.

### 6. UX Flow

- **Default state**: Dashboard shows all cards with real data. Cards with no data show `--` instead of zero.
- **Loading state**: Each card fetches independently via `Promise.allSettled`. Failed cards show a red error state with retry button.
- **Empty state**: If no terminals exist, cards show "No active sessions" with a link to create one.
- **Settings change**: When a slider/toggle is changed, a save button appears (same pattern as SettingsPanel.tsx `hasChanges` state). Changes persist on dialog close.
- **Animation**: Stat numbers animate from 0 to target on mount (use CSS transition + `useEffect` — no animation library needed).

## IPC Endpoints Needed (Backend)

New IPC handlers to add in `src/main.ts`:

| Channel | Input | Output | Implementation |
|---------|-------|--------|----------------|
| `get-model-improvement-stats` | `{ terminalId?: string }` | `{ messageCounts: Record<string,number>, reinjectionCount: number, threshold: number, actionsAttempted: number, actionsFailed: number }` | Read `terminalMessageCounts` Map, return snapshot |
| `set-reinject-threshold` | `{ threshold: number }` | `{ success: boolean }` | Write to runtime `RULES_REINJECT_THRESHOLD` variable (or use a new runtime var that shadows the const) |
| `set-model-debug` | `{ enabled: boolean }` | `{ success: boolean }` | Write to runtime `modelDebugMode` variable in main.ts |
| `read-actions-error-log` | — | `{ entries: string[], exists: boolean }` | Read last 10 lines of `agent/actions_error.log`, return array |

These handlers insert into main.ts near the existing `save-terminal-session` handler (~line 6094).

---

## Requirements Checklist

- [ ] 5 live status cards with real data from main.ts via IPC
- [ ] Settings controls that actually change behavior (persisted)
- [ ] Rules card preview pane with copy/inject actions
- [ ] Context assembly map with LAYER 0-4 visualization
- [ ] Actions.json live monitor showing parse status
- [ ] Loading / empty / error states for every card
- [ ] 4 new IPC endpoints in main.ts
- [ ] Uses existing design tokens (dark theme, emerald accents, range sliders, toggle switches)
- [ ] Stat numbers animate on mount
- [ ] No new dependencies (use existing lucide-react icons, chart.js if needed)

---

## Constraints

- All IPC handlers go in `src/main.ts` — check for existing patterns (e.g., line 6094 `save-terminal-session`)
- Renderer accesses IPC through `window.deskflowAPI?.xxx` — new channels must be added to `src/preload.ts`
- Do NOT create new files if possible — add to existing components
- Use `Promise.allSettled` for independent data fetches (existing pattern in DatabasePage.tsx)
- Model tier badge already exists at `TerminalPage.tsx:1511-1518` — do not redesign it, but reference it in the dashboard
- Settings panel pattern reference: `src/components/context-ui/SettingsPanel.tsx`
- Dark theme only (no light mode in this project)
