# 📌 Project State — Live Dashboard

> **Purpose:** Lightweight live state tracker for AI context. Full history in `state.archive.md`.

## Metadata
- version: 4.138
- last_updated: 2026-06-23
- agent: opencode
- current_focus: Cycle 24 — AI Assistant expansion (navigation, long-term goals, workspace tools, tutorials)

## Current Focus
Cycle 24: Major AI Assistant expansion complete — deep-link navigation system, long-term goal CRUD, workspace/terminal data tools, research topic management, tutorial tools, section IDs across 5 pages, enhanced system prompt.

## Next / Blockers
Runtime verification: Open AI page, test `>> navigation` blocks (verify tab switching + scroll-to-section), test `saveLongtermGoal` tool, test `getWorkspaceState` tool.

## Recent Changelog

### 2026-06-23 — Cycle 24: AI Assistant expansion (navigation, goals, workspace, tutorials)
- **Phase 1 (long-term goals):** Added `saveLongtermGoal` and `deleteLongtermGoal` AI tools in toolRegistry.ts. Reuses existing `save-goal`/`delete-goal` IPC with `period='longterm'`. Privacy-gated via `checkAccess('goals')`.
- **Phase 5 (research topics):** Added `getInterestTopics`, `addInterestTopic`, `removeInterestTopic` AI tools. Reuses existing IPC handlers.
- **Phase 2 (workspace data):** Added `getWorkspaceState`, `getTerminalSessionsRich`, `getTerminalMessages` AI tools. Added new `get-terminal-messages` IPC handler in main.ts + preload binding.
- **Phase 3a (section IDs):** Added `data-section` attributes to 27 sections across 5 tabbed pages (SettingsPage, IDEProjectsPage, InsightsPage, FinancePage, AiPage).
- **Phase 3b (deepNav.ts):** Created `src/lib/deepNav.ts` with `navigateTo()`, `consumeSectionHint()`, `consumeSubpageHint()`, `scrollToSection()`, `useScrollToSection()`.
- **Phase 3d (NavigationBlock):** Updated BlockRenderer.tsx to pass `section` and `tab` fields from navigation blocks to `onNavigate`. Updated AiChat.tsx to use `navigateTo()` with deep nav params.
- **Phase 3e (tab pages):** Added `useLocation` + `useEffect` to 5 tabbed pages to accept `location.state.tab`/`location.state.group` for deep-link tab navigation.
- **Phase 4 (tutorials):** Added `getTutorialStatus` and `startFeatureTutorial` AI tools. Tutorial status reads localStorage; startTutorial writes signal to localStorage.
- **Phase 6 (system prompt):** Updated `SYSTEM_PROMPT_BASE` in aiAgentService.ts with navigation block syntax docs, new tool descriptions, and section ID reference.
- **Files:** `src/services/ai/toolRegistry.ts`, `src/main.ts`, `src/preload.ts`, `src/lib/deepNav.ts` (new), `src/components/AiChat/BlockRenderer.tsx`, `src/components/AiChat/AiChat.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/IDEProjectsPage.tsx`, `src/pages/InsightsPage.tsx`, `src/pages/FinancePage.tsx`, `src/pages/AiPage.tsx`, `src/services/ai/aiAgentService.ts`
- **Build:** ✅ (renderer 21s, preload 49.9KB, main.cjs 709KB)

### 2026-06-23 — Cycle 22: AI privacy data access + digest raw-JSON fix + Ollama/local models
- **Digest fix (main.ts):** Strengthened provider-chain system prompt to forbid markdown/code fences. Added `cleanDigestJson()` robust parser (strips fences, depth-match brackets) before `JSON.parse()` — prevents the raw AI response from leaking as a single "digest" topic.

## Recent Changelog

### 2026-06-23 — Cycle 22: AI privacy data access + digest raw-JSON fix + Ollama/local models
- **Digest fix (main.ts):** Strengthened provider-chain system prompt to forbid markdown/code fences. Added `cleanDigestJson()` robust parser (strips fences, depth-match brackets) before `JSON.parse()` — prevents the raw AI response from leaking as a single "digest" topic.
- **toolRegistry.ts:** Added `checkAccess` privacy gate. 3 new tools: `getRequests` (requests), `getAIUsageSummary` (aiUsage), `getDashboardAggregates` (dashboardStats). Privacy-gated existing `getProjects`, `getProblems`, `getIDEProjectsOverview`.
- **SettingsPage.tsx:** Added `'ai'` to activeTab union. `dataAccess` state with 7 toggles (projects, problems, requests, aiUsage, dashboardStats, goals, finance). Load/save via `ai_dataAccess` preference.
- **AiPage.tsx:** Settings button navigates to `/settings` with activeTab=ai.
- **Ollama:** Already fully supported (template + default provider in list). No code changes needed.
- **Files:** `src/main.ts`, `src/services/ai/toolRegistry.ts`, `src/pages/SettingsPage.tsx`, `src/pages/AiPage.tsx`
- **Build:** ✅ (renderer 52s, preload rebuilt, main.cjs 706KB)

### 2026-06-23 — Cycle 22: Cityscape Visual Overhaul (IN PROGRESS)
- **Goal:** Add textures, roads, neon cyberpunk aesthetic to the AI Usage Cityscape
- **Status:** Creating prompt for Architect via generate-prompt skill
- **Next:** Create CONTEXT_BUNDLE.md + prompt.md, send to Architect

### 2026-06-23 — Cycle 21: AI Usage Cityscape (3 files)
- **Goal:** Replace flat charts with a 3D skyline visualization on the AI Tools tab
- **cityscape.utils.ts (created):** Spiral phyllotaxis layout, log/sqrt metric scaling, agent palette, window texture pool, model family normalization, `buildCityModel`/`extractDateRange`/`formatMetricValue` data transforms.
- **AICityscape.tsx (created):** R3F component with InstancedMesh buildings, Environment + Lightformer lighting, Bloom+Vignette+ToneMapping post-processing, OrbitControls, hover labels (Html), click→detail panel slide-in, Agent/Model/Time-lapse mode pills, time-lapse scrubber with play/pause.
- **IDEProjectsPage.tsx (modified):** Lazy import of AICityscape, City/Charts toggle in trend header, city view at top of AI Charts section, I/O Ratio card always visible, legacy charts hidden when city active.
- **Build:** ✅ (renderer 35s, preload rebuilt, AICityscape.js 145KB chunk produced)
- **Files backed up:** `.opencode-backups/IDEProjectsPage.tsx.20260623-005236.bak` (and companion files)
- **Needs:** Runtime verification in real app
- **Fix 1 — Compact header still too large:** Reduced compact height 56px→36px. Single-row layout: "NW" label + value inline + smaller icon buttons (w-7 h-7). No more double-line layout covering content.
- **Fix 2 — Wallet balance not syncing with denominations:** `handleSave` now computes `denominations.reduce(sum, d.value * d.count)` for cash/physical wallets and calls `onUpdateWallet` with `balance: totalFromDenoms`. Balance reflects actual cash/physical contents.
- **Fix 3 — Save button had no feedback:** Added `saved` state — button shows "✓ Saved!" for 2s after save completes.
- **Fix 4 — Wallet cards missing description:** AccountsTab wallet rows now parse `metadata` JSON and show `description` or `notes` as a 9px gray line below the wallet name.
- **Files:** `src/components/finance/FinanceStickyHeader.tsx`, `src/components/finance/WalletDetailView.tsx`, `src/components/finance/AccountsTab.tsx`
- **Build:** ✅ (renderer built, preload rebuilt, src.zip updated)

### 2026-06-22 — Cycle 19: Human vs AI token split visualization
- **Problem:** All AI agent usage data showed only combined token totals. Users couldn't see how many tokens they wrote (input/human) vs the AI generated (output/AI).
- **Backend:** Changed all 5 SQL queries in `get-ide-projects-overview` to select `SUM(input_tokens)` as `tokens_in` and `SUM(output_tokens)` as `tokens_out` separately (alongside the combined `tokens`). Both `daily`, `projects`, `modelBreakdown`, and `modelDaily` levels now carry the split.
- **AIAgent interface:** Added `tokensIn` and `tokensOut` fields alongside existing `tokens` (combined).
- **Ratio Bar (new card):** Beautiful glass card in the AI Tools tab showing aggregate input vs output across all agents with: split bar visualization (blue input / green output), per-agent ratio breakdown with mini progress bars, and average ratio math.
- **Stacked bars in detail popup:** The per-agent Daily Usage chart now shows stacked bars (input blue bottom + output green top) when "Tokens" metric is selected, with tooltips showing per-day split and totals.
- **Token sub-selector:** When "Tokens" metric is active, sub-buttons appear for All / In / Out — controlling what the distribution doughnut and per-agent trend charts display.
- **Agent detail metrics:** Added Input Tokens (blue), Output Tokens (green), In:Out Ratio (amber), Input %, Output % cards in the top metrics grid.
- **Files:** `src/main.ts`, `src/pages/IDEProjectsPage.tsx`
- **Build:** ✅ (renderer 31s, preload rebuilt, main.cjs 703KB)
- **Needs:** Runtime verification in real app
- **SettingsPage.tsx:** Added `'ai'` to activeTab union type. Added `dataAccess` state with 6 toggles (projects, problems, requests, aiUsage, dashboardStats, goals). Loaded from `ai_dataAccess` preference. Data Access UI section in AI tab.
- **AiPage.tsx:** Added Settings button in header (sets `settings-activeTab` to `'ai'` and navigates to `/settings`). Imported `useNavigate` + `Settings` icon.
- **Files:** `src/services/ai/toolRegistry.ts`, `src/pages/SettingsPage.tsx`, `src/pages/AiPage.tsx`
- **Build:** ✅ (renderer 39s, preload rebuilt, main.cjs 702KB)
- **Context gathered:** Full schema of 8 DB tables (ai_usage, terminal_sessions, terminal_messages, session_parsed_items, terminal_bindings, workspace_problems, workspace_requests, projects), 6 IPC endpoint shapes, existing UI audit, library availability.
- **Outputs:** `agent/docs/ai-usage-city-viz/CONTEXT_BUNDLE.md` (full data context), `agent/docs/ai-usage-city-viz/prompt.md` (design prompt, detail level 8/10, creativity 25/100).
- **Status:** Prompt delivered. Ready for CZ to relay to Architect.

### 2026-06-22 — Cycle 15: Make session-id source honest (local_ prefix + polling capture)
- **Change 1:** Fallback id prefix changed `ses_`→`local_` (main.ts L9443, TerminalPage.tsx L1069/L4492). Real opencode ids stay `ses_*` — fake vs real instantly distinguishable.
- **Change 2:** `capture-opencode-session-id` now accepts `sinceTimestamp` parameter, narrows query with `time_created >= ?`. Returns `source: 'generated'` instead of `null` on miss.
- **Change 3:** Capture gate runs when `local_` or missing; skips when `ses_`. Banner prints real source; loud warning on fallback: `"[resume] WARNING: no real opencode session in db — using LOCAL stub, resume WILL fail"`.
- **Change 4:** Replaced `setTimeout(5000)` with 10-attempt polling loop (1s intervals, 10s total). DB narrowed by spawn timestamp via `sinceTimestamp` parameter.
- **Files:** `src/main.ts`, `src/pages/TerminalPage.tsx`
- **Build:** ✅ (renderer 35s, preload rebuilt, main.cjs 702KB)

### 2026-06-22 — Cycle 14: Workspace sidebar pages don't fill height (GroupPanel flex fix)
- **Root cause:** GroupPanel inner content div used `space-y-3` (static flow) — children couldn't stretch vertically. IssuesWorkspace (Checklist tab) empty state had `py-8` fixed padding, leaving a gap below.
- **Fix:** GroupPanel content div changed from `flex-1 px-3 py-3 space-y-3 min-w-0` to `flex-1 px-3 py-3 min-w-0 flex flex-col`. IssuesWorkspace root changed from `space-y-3` to `flex flex-col flex-1 space-y-3 min-h-0`; empty state changed from `py-8` to `flex flex-col items-center justify-center flex-1`.
- **Files:** `src/components/IssuesWorkspace.tsx`, `src/pages/TerminalPage.tsx`
- **Build:** ✅ (renderer 41s, preload rebuilt, main.cjs 700KB)
- **Needs:** Runtime verification in real app

### 2026-06-22 — Cycle 13: Solar system freeze + 5GB RAM fix (all 4 phases from Architect RESULT.md)
- **Phase 1 (memory leak):** Added refcounted texture cache (acquirePlanetTextures/releasePlanetTextures) in OrbitSystem.tsx. Textures cached by hash, disposed only when refcount hits 0. GLCleanup skips cached textures; disposes all on full teardown.
- **Phase 2 (freeze):** Halved planet texture resolution 1024×512 → 512×256 across both createProceduralTexture and createProceduralNormalMap (~50 coordinate literals scaled).
- **Phase 3 (main-process):** Added module-level dashboard cache (period→data) with statsDirty flag, 60s TTL, in-flight dedupe via dashboardInFlight promise map. Added covering index idx_stats_daily_date_app_sec on stats_daily(date, app_name, total_seconds). Added markStatsDirty() call after every stats_daily write. Wrapped handler body in pInner lambda for clean cache lifecycle.
- **Phase 4 (lifecycle):** GLCleanup cache-awareness (Phase 4.3). Skipped 4.1/4.2 (useDisposable + Moon/Rings/Atmosphere/Trail) — R3F handles JSX-created geometries.
- **Files:** `src/components/OrbitSystem.tsx`, `src/main.ts`
- **Build:** ✅ (renderer 41s, preload rebuilt, main.cjs baked 700KB)

### 2026-06-22 — Cycle 12: 4 bug fixes + 2 feature requests (Settings AI providers)
- **Fix #1 (AI Chat flickering):** Memoized `handleTypingDone` callback with `useCallback` — inline arrow function caused TypewriterText animation to restart on every parent re-render (60fps flicker loop).
- **Fix #2 (stale provider names):** Added `migrateProviderNames` with case-insensitive matching. Renames `CloudFlayer`→`cloudflare`, `Ollamah`→`ollama`, filters out `invilier`. Applied in both `get-ai-providers` and `test-ai-provider` handlers.
- **Fix #3 (test always warning):** Same migration in `test-ai-provider` handler. Improved error message from `'Unknown template'` to readable text.
- **Fix #4 (DevTools broke):** Removed `mainWindow.isFocused()` guard from `before-input-event` listener (prevented shortcut when any child element had focus).
- **Feature 1:** API key hide/show (Eye/EyeOff) toggle per provider in Settings.
- **Feature 2:** Per-provider model and base URL inputs in Settings.
- **Files:** `src/components/AiChat/AiChat.tsx`, `src/main.ts`, `src/pages/SettingsPage.tsx`
- **Build:** ✅ (renderer 29s, preload rebuilt, main.cjs baked, src.zip updated)

### 2026-06-22 — Cycle 9: opencode session-id capture + resume fix
- **Part 1:** Visible banners in xterm display (`[resume] found opencode session <id> (source: db)`) via new `terminal:write-display` IPC channel that broadcasts `terminal:data`.
- **Part 2:** Display fix: `.slice(0, 12)` → `.slice(-12)` at `TerminalPage.tsx:4007` — shows unique tail of opencode UUID.
- **Part 3:** Real session capture: `capture-opencode-session-id` IPC handler queries opencode.db's `session` table; `update-session-resume-id` handler overwrites fake `ses_*` IDs with real UUIDs. Background capture fires 5s after fresh launch and after resume.
- **New IPC:** `terminal:write-display`, `capture-opencode-session-id`, `update-session-resume-id`
- **Files:** `src/main.ts`, `src/preload.ts`, `src/pages/TerminalPage.tsx`
- **Build:** ✅ (renderer 38s, preload rebuilt, main.cjs baked)

### 2026-06-22 — Cycle 8: Finance spec audit gap fixes (7 modals)
- **Audit:** Compared 7 per-wallet transaction modals against RESULT.md spec. Found 6 gaps: Debit missing daily-limit bar, Credit missing utilization bar, 5 modals missing context bands, Ewallet wrong icon.
- **Delivered:** Debit daily-limit progress bar, Credit utilization bar with due day, Bank/Ewallet/Crypto context bands, Ewallet icon `Banknote→Smartphone`, Crypto "You hold" line.
- **Files:** `BankTransactionModal.tsx`, `CreditTransactionModal.tsx`, `DebitTransactionModal.tsx`, `CryptoTransactionModal.tsx`, `EwalletTransactionModal.tsx`
- **Build:** ✅ (52s renderer, full build OK)

### 2026-06-22 — Cycle 6: opencode.json instructions fixed (v3 prompt now loads)
- **Root cause:** `agent/DEFAULT_SYSTEM_PROMPT` (no `.md`) → silent load failure. Also: `agent/state.md`, `agent/context.md`, `agent/PROBLEMS.md`, `agent/FEATURE_TRACKER.md` were missing.
- **Fix:** Full 8-item array with `.md` extensions: `["AGENTS.md","agent/DEFAULT_SYSTEM_PROMPT.md","MEMORY.md","agent/state.md","agent/dictionary.md","agent/FEATURE_TRACKER.md","agent/context.md","agent/PROBLEMS.md"]`
- **Files:** `opencode.json` only
- **Build:** N/A

### 2026-06-22 — Infra install: terminology-kit + v3 system prompt + opencode.json
- Merged "High-confusion terms" into `dictionary.md`. Added TERMINOLOGY RESOLUTION to AGENTS.md. Replaced 774-line old prompt with 84-line v3 in both `src/lib/defaults.ts` and `agent/DEFAULT_SYSTEM_PROMPT.md`. Instructions array: 5→7 items.
- **Files:** `agent/dictionary.md`, `agent/AGENTS.md`, `opencode.json`, `src/lib/defaults.ts`
- **Created:** `scripts/zip-src.mjs`
- **Build:** ✅

### 2026-06-22 — Finance page sticky header + physical wallet + 7 per-wallet transaction modals
- **Sticky header:** Replaced IntersectionObserver oscillation with scroll hysteresis (shrink at 96px, expand at 48px) + crossfade layers.
- **Physical wallet type:** Orange accent, denomination counter, quick-add pills. Wired into WalletDetailView + AccountsTab.
- **7 modals:** TransactionModalShell + DenominationPicker + autoFill + CategoryChipGrid + useFormattedAmount + txPrefs. Bank/Debit/Credit/Crypto/Physical/Cash/Ewallet variants.
- **UX:** Form stays open after submit, comma formatting, last-used type/category persisted.
- **Files created:** 15 new files under `src/components/finance/modals/`
- **Build:** ✅

### 2026-06-21 — Fix IDE AI agent data loading
- **Root cause:** `fetchAnalytics`/`loadOverview` deps missing `selectedPeriod` + `dateOffset` → period changes never re-fetched. KiloCode parser returned 0 tokens. FreeUsageStats capped to 0.
- **Fix:** Added missing deps (triggers re-fetch on period change). KiloCode parser estimates tokens via ~4 chars/token. FreeUsageStats shows actual usage vs limit, over-limit indicator, estimated badge. Added daily model breakdown + stacked bar chart.
- **Files:** `src/pages/IDEProjectsPage.tsx`, `src/main.ts`
- **Build:** ✅

### 2026-06-21 — TDZ fix + Terminal Map/Drag/Fit verification
- **TDZ:** `ReferenceError: Cannot access 'handleSaveWorkspace'` — moved handler before dependent `useEffect`.
- **Gate A (Map grouping):** PASS — pagination, groups, counter, DndLiveRegion.
- **Gate B (Cross-group drag):** PASS (structural) — dnd-kit with PointerSensor, GroupDropTarget, draggable panes.
- **Gate C (Terminal fit):** PASS — 970×796px, mount-time tryFit loop succeeds.
- **Build:** ✅

### 2026-06-21 — Provider names fix + AI Features modal
- Fixed fake names: CloudFlayer→Cloudflare, deleted Invilier, Olamah→Ollama. Created AIFeaturesModal (Features button in AiPage). Fixed v1 markdown fallback in AI chat.
- **Files:** `src/services/providers/templates.ts`, `src/main.ts`, `src/services/parseBlocks.ts`, `src/pages/AiPage.tsx`, `src/pages/SettingsPage.tsx`, new `AIFeaturesModal.tsx`
- **Build:** ✅

### 2026-06-21 — Crypto portfolio dashboard
- Rewrote CryptoDetail with live CoinGecko prices, 24h change, P&L, Chart.js performance chart (7d/30d/90d), skeleton loading, stale/error banners. Header shows crypto units (0.5000 BTC).
- **Files:** `src/components/finance/WalletDetailView.tsx`
- **Build:** ✅

### 2026-06-21 — Phase 5: Wallet detail view + metadata schema + CoinGecko IPC
- DB migration: `metadata TEXT` on `finance_wallets`, new `finance_crypto_prices`/`finance_crypto_history` tables. 4 new IPC handlers + preload bindings. WalletDetailView with AnimatePresence, per-type body components, cash bill counter (11 denoms). Wallet rows clickable.
- **Files created:** `src/components/finance/WalletDetailView.tsx`
- **Files modified:** `src/main.ts`, `src/preload.ts`, `src/components/finance/finance-types.ts`, `src/pages/FinancePage.tsx`, `src/components/finance/AccountsTab.tsx`
- **Build:** ✅

### 2026-06-22 — Cycle 10: Solar System "All Time" freeze + 5GB RAM leak (diagnosis)
- **Root cause (memory):** TexturedPlanet creates THREE.CanvasTexture objects at 1024×512 (~2MB each) in useMemo with NO dispose on unmount. With 80 planets × 3 textures each (color + normal + glow) = ~328MB leaked per period switch. After 16+ switches → 5GB RAM.
- **Root cause (freeze):** Synchronous canvas drawing for 80 planet textures at 1024×512 resolution blocks React render thread for hundreds of ms.
- **Additional:** `computePeriodRange('all')` sets start=2000-01-01 causing full-table SQL scans in main process; main process blocked by synchronous better-sqlite3.
- **Status:** Diagnosed, generating prompt for Architect AI via generate-prompt skill.

## Invariants
- PTY event order: mark-spawned → spawn → created → initialize. Never reorder.
- Prefer renderer-side fixes; read full IPC handler before editing main.ts.
- All localStorage access wrapped in try/catch.
- Build = `node scripts/build.mjs` + `npx esbuild src/preload.ts ...`
- DB: `%APPDATA%/DeskFlow/deskflow-data.db`
