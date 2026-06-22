# MEMORY.md — DeskFlow Durable Memory

> Auto-loaded into every opencode prompt via opencode.json "instructions".
> This is long-term memory. Append durable lessons (Section rules in AGENTS.md #4).
> Format: `- [YYYY-MM-DD] <one-line durable lesson>`
> Transient/current state does NOT go here — it goes in agent/state.md.

## PIPELINE ROLE (never forget)
- [2026-06-21] This is a two-AI relay pipeline. Architect (Notion AI) patches + ships ZIP + FIX PACKET; I (opencode) build, verify in the real app, and reply in CYCLE REPORT format. CZ relays. NEVER treat a session as standalone.
- [2026-06-21] On startup ALWAYS read agent/state.md to recover cycle # and open packet before doing anything. "What did we do so far?" is answered from state.md + this file, NOT by asking CZ.
- [2026-06-21] After ANY source change, RE-ZIP src and hand it back. Stale src.zip caused multiple false "your fix doesn't work" reports.

## RESPONSE FORMAT (corrected repeatedly — stop forgetting)
- [2026-06-21] Final responses MUST use the CYCLE REPORT format in AGENTS.md #3. Do not freeform. CZ corrected this 4+ times; the cost of forgetting is high.

## TESTING (avoid false PASS)
- [2026-06-21] IPC probe success ≠ feature works. Verdict PASS needs the actual layer: UI = real clicks (no programmatic React input — onChange won't fire), Terminal = read [TERMINAL_DEBUG] C2 data callback FIRED logs.

## BUILD / DEBUG GOTCHAS
- [2026-06-21] All-data-shows-0 → preload.cjs was not rebuilt. Rebuild preload separately with esbuild after build.mjs.
- [2026-06-21] "Cannot access 'z' before initialization" = TDZ / circular import.
- [2026-06-21] "symbol X already declared" = duplicate const.
- [2026-06-21] Exit code -1073741510 = STATUS_CONTROL_C_EXIT (Ctrl-C / terminated), not a code bug.
- [2026-06-21] PTY event order is sacred: mark-spawned → spawn → created → initialize. Never reorder.

## CODEBASE FACTS
- [2026-06-21] Workspace persistence backend is COMPLETE (workspace:save/load/list/delete in main.ts; saveWorkspace/loadWorkspace/listWorkspaces/deleteWorkspace in preload). UI surfaces it via the Work group "Workspaces" subtab.
- [2026-06-21] Resume fix: verifyAgent is a false-negative for opencode (cmd.exe prompt matches SHELL_PROMPT_REGEXES) — warn-and-proceed, don't early-return. Launch uses terminalWriteRaw to bypass the queue.
- [2026-06-21] $[FIT-DBG] log (TerminalWindow.tsx:273) only fires on isActive transitions; in remount-on-group-switch architecture it never fires. Absence does NOT indicate fit failure - mount-time tryFit loop (lines 145-155) is the real mechanism.
- [2026-06-21] dnd-kit in TerminalMiniMap uses PointerSensor with 5px activation - native pointer events, NOT HTML drag-and-drop. Cannot be tested through accessibility API; structural verification (DndContext, GroupDropTarget, draggable attribute) is the correct approach.
- [2026-06-21] Clicking the New Terminal header button (title="New Terminal") creates a second group by splitting, causing BOTH TerminalPane components to remount (remount-on-group-switch architecture).
- [2026-06-22] DEFAULT_SYSTEM_PROMPT lives in src/lib/defaults.ts as a hardcoded template literal (84 lines post-v3 rewrite) AND is loaded into agent context via opencode.json instructions referencing agent/DEFAULT_SYSTEM_PROMPT.md. Both must be kept in sync; the opencode.json entry controls what the AI agent receives.
- [2026-06-22] opencode.json "instructions" paths MUST include exact file extensions (.md). Missing-extensions cause silent load failure — the entry is ignored with no error, and the file never enters agent context. Always verify that referenced files actually exist on disk with matching names and extensions.
- [2026-06-22] Finance modal context band pattern: parse `(wallet.metadata as any)` at the top of each modal component, then render a compact info bar after the opening `{() => (<>` and before the type toggle buttons. Accent colors match wallet type (Bank=#3B82F6, Debit=#8B5CF6, Credit=#F59E0B, Ewallet=#06B6D4, Crypto=#8B5CF6).
- [2026-06-22] TypewriterText flickering: inline arrow functions in `onDone` prop cause the animation effect to restart on every parent re-render because `onDone` is in the effect's dependency array. Always memoize callbacks passed to TypewriterText with `useCallback`.
- [2026-06-22] Provider name migration must use case-insensitive matching (toLowerCase) because saved `id`/`templateId` may have inconsistent capitalization (e.g. `CloudFlayer` vs `cloudflayer`).
- [2026-06-22] DevTools `before-input-event` should NOT check `mainWindow.isFocused()` — the webContents listener already scopes to the window, and `isFocused()` fails when any child element has focus.
- [2026-06-22] Cache invalidation for get-dashboard-aggregates: add a `markStatsDirty()` call after every `INSERT INTO stats_daily` write. Use module-level `dashboardCache` + `statsDirty` boolean + 60s TTL + `dashboardInFlight` promise map for dedupe.
- [2026-06-22] Phase 4.1/4.2 (useDisposable hook + Moon/Rings/Atmosphere/Trail) can be skipped in R3F projects — R3F handles JSX-created geometry lifecycle automatically. Only `new THREE.*` objects created outside JSX need manual disposal.
- [2026-06-22] Input/output token split: DB columns `input_tokens`/`output_tokens` exist in `ai_usage` but all queries used `SUM(input_tokens + output_tokens) as tokens`. To add human-vs-AI split: change all 5 queries in `get-ide-projects-overview` to select separate sums (`tokens_in`, `tokens_out`) at every level (top, daily, projects, modelBreakdown, modelDaily). Then propagate `tokensIn`/`tokensOut` through AIAgent interface → stacked bars in charts + ratio card + metrics grid.
- [2026-06-22] Wallet balance sync: Cash/Physical wallet denominations (metadata) are just metadata — they don't auto-update `wallet.balance` in DB. Must compute total from `localMetadata.denominations.reduce((sum, d) => sum + d.value * d.count, 0)` and call `onUpdateWallet` with `balance: totalFromDenoms` in `handleSave`. Only applies to cash/physical types. Other wallet types rely on explicit transaction creation for balance changes.
- [2026-06-23] AI tool registration pattern: Use `r(name, desc, params, securityLevel, category, handler)` helper in toolRegistry.ts. Read-level tools should gate with `checkAccess(key)` returning `{ _privacy: true, message }` when disabled. Confirm-level write tools call `api.methodName()` directly (preload binding). Long-term goals reuse the same `saveGoal` IPC handler with `period: 'longterm'`.
- [2026-06-23] Deep navigation: AI outputs `[type: navigation][page: /route][tab: key][section: id][label: text]` blocks. BlockRenderer passes section+tab to onNavigate. AiChat calls navigateTo() from deepNav.ts. Tab pages read location.state.tab on mount via useEffect with [] deps. Section IDs are `data-section="section.id"` attributes on section wrapper divs.
- [2026-06-23] parseBlocks.legacy.ts already handles `[key: value]` patterns generically (line 85-89). Any `[section: X]` or `[tab: Y]` in navigation blocks is automatically extracted into `block.fields.section` / `block.fields.tab` — no parser changes needed for new block fields.
