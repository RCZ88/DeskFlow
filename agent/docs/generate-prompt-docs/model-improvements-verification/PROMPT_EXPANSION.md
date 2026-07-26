# Model Improvement System — Feature Expansion & Customizability Design

## Raw Request

> "GENERATE P ROPMT THAT CAN CLARIFY AND DESIGN THOSE UI STUFF THAT CAN DEVELOP FROM THE FEATURES, EXPAND THE FEATURES MORE, MAKE MORE CUSTOMIZABILITY, WHATEVER, etc"
> "how does it actually improve the stuff? there should be some things that can be viewed to see the concrete prove of the system existing"

---

## Context

Read `agent/docs/model-improvements-verification/CONTEXT_BUNDLE.md` first. It contains EXACT code snippets, file paths, and line numbers for every improvement already implemented.

These improvements exist in code ONLY — no UI, no settings panels, no live monitors, no way to see them working. Your job is to **design the entire UI layer** that exposes, visualizes, and expands every one of these systems with full customizability.

## The Mandate

Act as **Lead Designer & Engineer**. Design a comprehensive **Model Improvement System** — a complete suite of UI panels, settings, live monitors, and configuration tools that:

1. **Expose every improvement** as a visible, interactive UI element
2. **Add customizability** — every hardcoded value becomes a user-tunable setting
3. **Provide live monitoring** — real-time stats pulled via IPC, not mock data
4. **Visualize the invisible** — context assembly, token budgets, injection stats become charts and meters

---

## What to Design

### 1. Model Improvement Dashboard (Main Panel)

A tabbed or scrollable dashboard accessible from the sidebar (add a new icon tab or add to the existing Configs/Maintenance tabs). Contains:

**Statistics Cards Row (top bar):**
- **Active Terminals** — count grouped by tier (top/mid/low) with colored dots
- **Auto-Reinjections Today** — total injections performed this session
- **Actions Parse Rate** — success rate as percentage + bar (green > 90%, yellow > 70%, red < 70%)
- **Context Budget Usage** — total tokens used vs available across all terminals
- **Rule Coverage** — % of sessions where RULES_COMPACT was injected (either at init or via reinject)

Each card shows a 7-day sparkline trend (use existing chart.js in this project).

**Context Assembly Monitor (middle):**
A live-updating visualization showing the LAYER 0-4 stack for the currently active terminal:
- Each layer is a distinct colored horizontal bar
- Bar width = proportion of token budget consumed
- Layer 0-2 bars have a green "🔒 Always" badge (cannot be trimmed)
- Layer 3-4 bars have a blue "💰 Budgeted" badge with a slider to adjust their allocation
- Hover shows exact token count: "LAYER 2 — PATTERNS: 1,200 / 1,500 tokens"
- A dropdown at top selects which terminal to view

**Settings Tabs (bottom):**

Each tab contains controls that ACTUALLY change system behavior via IPC:

#### Tab A: Re-injection Settings
| Control | Type | What It Changes | Persistence |
|---------|------|----------------|-------------|
| Threshold | Range slider (1-50) | `RULES_REINJECT_THRESHOLD` runtime var | IPC `set-reinject-threshold` → main.ts runtime |
| Enable/Disable | Toggle switch | Whether auto-reinject runs at all | IPC `set-reinject-enabled` |
| Per-terminal override | Dropdown + slider per terminal | Override threshold for specific terminal | localStorage |
| Manual inject button | Button | Triggers `maybeReinjectRules()` immediately | Instant |
| Last injection timestamp | Read-only text | Shows when last reinject happened per terminal | Polled from main.ts |

#### Tab B: Tier Profiles
| Control | Type | What It Changes |
|---------|------|----------------|
| Default tier | Dropdown (top/mid/low) | localStorage `default-model-tier` |
| Per-tier token budgets | 3 sliders (top/mid/low) | Stored in localStorage, sent to `ContextConfig` at session creation |
| Tier feature matrix | Read-only table | Shows what each tier enables/disables (columns: LLM Wiki, Skills, Graphify, PARA, QMD, Automations) |
| Custom tier (advanced) | Collapsible section | User selects individual system toggles to build a custom profile |
| Profile templates | Dropdown + Save/Load buttons | Save named profiles to localStorage, load them in New Session Dialog |

#### Tab C: Rules Management
| Control | Type | What It Changes |
|---------|------|----------------|
| Rules preview | Full editor (read-only by default, editable with toggle) | Shows current `RULES_COMPACT.md` with filled template vars |
| Edit rules | Textarea (unlocked with "Edit" button) | Writes back to `agent/RULES_COMPACT.md` via IPC |
| Add custom rule | Text input + Add button | Appends new rule to the file |
| Inject now | Button | Triggers Remind preset programmatically |
| Copy to clipboard | Button | Copies formatted rules to clipboard |
| Rule count | Badge | Shows "9 rules active" |

#### Tab D: Actions & Feedback
| Control | Type | What It Changes |
|---------|------|----------------|
| Actions.json monitor | Log view (last 20 lines) | Watches `agent/actions_error.log`, updates in real-time |
| Parse success rate | Percentage + mini chart | Aggregated from main.ts counters |
| Clear error log | Button | Truncates `actions_error.log` via IPC |
| Debug mode | Toggle switch | Enables verbose `[SYSTEM]` logging for all parse attempts |
| Manual actions test | Text input + Send button | Lets user type a `## Actions` block and see parse result |

#### Tab E: Visualization & Monitoring
| Control | Type | What It Changes |
|---------|------|----------------|
| Context budget pie | Doughnut chart (chart.js) | Shows per-system allocation: LLM Wiki / Skills / Graphify / PARA / QMD / Automations / Free |
| Injection timeline | Bar chart | Shows when reinjections happened this session (x=time, y=injection count) |
| Terminal activity | Heatmap-like grid | Shows per-terminal message count, tier, last activity time |
| Export stats | Button | Downloads current stats as JSON |

### 2. New Session Dialog Expansion

Add to the existing `NewSessionDialog.tsx`:
- **Tier selector** already exists — enhance it with a "Show profile details" expandable section that shows what the selected tier enables
- **Budget preview** — live counter showing "You have X tokens. Selected systems use Y tokens. Z tokens remaining."
- **Profile templates** — dropdown to load saved profiles from Tab B
- **Quick compare** — small button that opens a modal comparing top/mid/low side by side

### 3. Terminal Tab Enhancement

Already has the model tier badge (green/blue/yellow). Add:
- **Tier badge tooltip** on hover: shows budget, enabled systems, reinjection count
- **Right-click context menu** on badge: quick tier change without reopening New Session
- **Tier distribution bar** at the top of the tab bar: small colored mini-bars showing what % of terminals are top/mid/low

### 4. Configs Tab Enhancement

Already has Save/Load workspace. Add:
- **"Import Model Profile"** button — loads tier + budget + reinject settings from a JSON file
- **"Export Model Profile"** button — dumps current settings to JSON
- **Profile presets list** — saved named profiles with delete/rename/duplicate

### 5. Real-Time Notifications

When the system detects something interesting, write a `[SYSTEM]` notice to the active terminal:
- "Re-injection threshold changed to 15"
- "Terminal #2 switched to low tier — budget reduced to 4000"
- "Rules file updated — 10 rules active"
- "Actions parse rate dropped below 50% — check actions_error.log"

---

## Data Processing Logic

All stats must come from real data, not mock values:

1. **IPC channels to add in `src/main.ts`:**
   - `get-model-improvement-stats` → returns `{ messageCounts: Record<string,number>, reinjectionCount: number, threshold: number, actionsAttempted: number, actionsFailed: number, parseErrors: string[] }`
   - `set-reinject-threshold` → sets runtime variable shadowing the const
   - `set-reinject-enabled` → toggles runtime boolean
   - `read-actions-error-log` → returns last 20 lines
   - `clear-actions-error-log` → truncates the file
   - `write-rules-compact` → writes content to `agent/RULES_COMPACT.md`
   - `get-tier-profiles` → returns current tier profile configs
   - `set-tier-budget` → updates per-tier budget in localStorage

2. **Aggregation math:**
   - Parse success rate = `actionsAttempted === 0 ? 0 : ((actionsAttempted - actionsFailed) / actionsAttempted) * 100`
   - Budget usage = `usedTokens / budget * 100` (per terminal, averaged across all)
   - Injection frequency = `totalInjections / sessionDurationInMinutes`
   - Tier distribution = count by tier / total terminals * 100

3. **Data sources:**
   - `terminalMessageCounts` Map in main.ts → terminal-level message counts
   - `RULES_REINJECT_THRESHOLD` → current threshold
   - `actionCount` / `failCount` in `parseAndExecuteActions` → success rate
   - `agent/actions_error.log` file → error entries
   - `agent/RULES_COMPACT.md` file → rules content
   - localStorage → persisted settings
   - `terminalTabs` state in TerminalPage.tsx → tier distribution

---

## UX Flow & States

**Default state:** Dashboard shows all cards with "-" for zero/unavailable data. No empty scare messages — just clean dashes.

**Loading state:** Each card uses `Promise.allSettled` to fetch independently. Cards show a pulsing skeleton (`animate-pulse bg-zinc-800` pattern — existing in this project).

**Error state:** Red tinted card with "Failed to load" text + a small retry button. Individual card failure doesn't affect other cards.

**Empty state (no terminals):** A single centered card: "No active terminals. Create one to see stats." with a "Create Terminal" button.

**Settings change:** Unsaved changes show a "• Unsaved" indicator on the tab. Sliders show current value in a monospace badge next to the label. Save button enables only when changes exist.

**Animation:**
- Stat numbers count up from 0 over 800ms on mount (`requestAnimationFrame` or CSS transition — no animation library)
- Settings sliders snap to tick marks
- Tab transitions use fade (opacity 0→1 over 200ms)
- Context assembly bars animate width changes over 300ms
- Error log new entries fade in

---

## Design Tokens (Use These)

Reference existing component patterns:
- Cards: `bg-zinc-800 rounded-lg p-4 border border-zinc-700`
- Section headers: `text-xs font-semibold text-zinc-400 uppercase tracking-wider`
- Stat values: `text-2xl font-bold text-white font-mono`
- Sliders: `accent-emerald-500` with range input
- Toggles: Checkbox with `accent-emerald-500`, `w-4 h-4 rounded`
- Badges: `text-[10px] px-1.5 py-0.5 rounded font-medium`
- Active tab: `bg-zinc-800 text-white border-t border-t-green-500`
- Inactive tab: `bg-zinc-900 text-zinc-400`
- Buttons: `bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded`
- Danger buttons: `bg-red-600 hover:bg-red-500 text-white`
- Loading skeleton: `animate-pulse bg-zinc-800 rounded`

Icons: Use lucide-react (already installed): `Activity`, `Sliders`, `FileText`, `Terminal`, `PieChart`, `BarChart3`, `Settings2`, `RefreshCw`, `Copy`, `Download`, `Upload`, `AlertTriangle`

---

## Constraints

- No new npm dependencies — only chart.js (already in package.json), react-chartjs-2, lucide-react
- All IPC channels must be added to both `src/preload.ts` (whitelist) and `src/main.ts` (handler)
- All new components should be created as new files in `src/components/model-improvements/` directory
- Settings data persisted via: IPC to runtime var (volatile), localStorage (persists across app restarts), or file writes to agent/ directory
- Must work with existing dark theme only (no light mode)
- The app is an Electron + Vite + React app with Tailwind CSS v4
- All file reads through IPC preload bridge (no direct Node in renderer)
- New IPC handlers in main.ts should follow the pattern of existing handlers (ipcMain.handle, returns { success, data } or similar)

---

## Deliverable

Create `agent/docs/model-improvements-verification/RESULT_v2.md` containing:

1. **Full component tree** — every new component, its props, its file path
2. **IPC specification** — every new channel, its input/output shape, where it goes in main.ts
3. **Data flow** — how each stat card fetches, processes, and displays data
4. **Settings schema** — every setting, its type, default, persistence mechanism
5. **UX specification** — every interaction, state, animation, error handling
6. **File-by-file implementation guide** — exactly what changes in each file

Be comprehensive. The receiving engineer should be able to implement every piece from this document.
