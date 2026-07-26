# PROMPT: Build Everything Missing from the Agent Style System

## Raw Request

> "look at the result. there might be a lot of stuff still missing. i would like you to see whats already there, and whats missing. generate a prompt for like the instruction of like to build whats missing"

## Context Bundle

Read `agent/docs/agent-style-system/CONTEXT_BUNDLE.md` for full codebase reference.

## Gap Analysis — What Exists vs What's Missing

### WHAT EXISTS (DO NOT TOUCH — working features in DesignWorkspacePage)
| Component | File | Lines | Status |
|-----------|------|-------|--------|
| TasteKnobs | `src/components/workspace/TasteKnobs.tsx` | 83 | Working |
| StyleReferences | `src/components/workspace/StyleReferences.tsx` | 113 | Working |
| StyleDescription | `src/components/workspace/StyleDescription.tsx` | 117 | Working |
| ColorPicker | `src/components/workspace/ColorPicker.tsx` | 285 | Working (basic — no sync) |
| DesignLibrarySources | `src/components/workspace/DesignLibrarySources.tsx` | 189 | Working |
| GlobalSearch | `src/components/workspace/GlobalSearch.tsx` | 197 | Working |
| ComponentBrowserModal | `src/components/workspace/ComponentBrowserModal.tsx` | 356 | Working |
| LibraryConfigModal | `src/components/workspace/LibraryConfigModal.tsx` | 418 | Working |
| DesignComposeOutlet | `src/components/workspace/DesignComposeOutlet.tsx` | 139 | Working |
| MotionExplorer | `src/components/workspace/MotionExplorer.tsx` | 309 | Working |
| MotionPresets | `src/components/workspace/MotionPresets.tsx` | 227 | Working |
| EasingCurveBrowser | `src/components/workspace/EasingCurveBrowser.tsx` | 127 | Working |
| CultUIRegistry | `src/components/workspace/CultUIRegistry.tsx` | 263 | Working |
| Shared primitives | `src/components/workspace/_ds/primitives.tsx` | 106 | Working |
| Shared motion | `src/components/workspace/_ds/motion.ts` | 51 | Working |
| Shared controls | `src/components/workspace/_ds/controls.tsx` | 80 | Working |
| DesignWorkspacePage | `src/pages/DesignWorkspacePage.tsx` | 653 | Working (3 tabs only) |

### WHAT'S MISSING (9 features from spec.md — none implemented)

#### MISSING #1: Moodboard Tab
**Spec requirement:** `spec.md` Part 1, Tab 1 — "Art & UX (The Moodboard)"
- Visual grid of parsed images from CARI.institute and Refero
- Hover → "Inject Context" button → sends image URL + metadata to agent context
- Search by aesthetic name
- Empty/Loading/Error states

**What exists instead:** Nothing. No component, no scraper, no data source.

**Build:**
- `src/components/workspace/MoodboardTab.tsx` — new component
- Data source: CARI scraper results (see MISSING #5) OR pre-seeded aesthetic data
- Grid layout: responsive masonry with image cards
- Hover overlay: "Inject Context" button using existing `agentSend()` IPC
- Search input with debounced filtering
- States: Empty (no results yet), Loading (skeleton grid), Error (retry), Populated (image cards)

#### MISSING #2: Tokens Tab
**Spec requirement:** `spec.md` Part 1, Tab 2 — "Foundations (Tokens)"
- Live preview of Realtime Colors URL (embeds `realtimecolors.com` with theme hash)
- Parses URL hash → CSS variables display
- "Sync to Project" → writes CSS variables to `globals.css` or `tailwind.config.js`

**What exists instead:** `ColorPicker.tsx` is a basic hex picker with preset schemes. No iframe, no URL generation, no sync to disk.

**Build:**
- `src/components/workspace/TokensTab.tsx` — new component
- Realtime Colors URL generator: takes ColorPicker entries → builds URL hash (`?colors=bg-text-primary-secondary-accent`)
- Realtime Colors iframe embed: `<iframe src="https://www.realtimecolors.com?colors=...">` for live preview
- CSS variable display: generate `:root { --bg: #...; --text: #...; }` block from current colors
- "Sync to Project" button: calls `writeProjectFile()` IPC (already exists in preload) to append CSS variables to project's `index.css` or `globals.css`
- Typography display: show current font pairing (Geist + JetBrains Mono)
- Export: copy CSS to clipboard, download as `.css` file

#### MISSING #3: Command Palette
**Spec requirement:** `spec.md` Part 1, Section 2 — "The Command Palette (Cmd/Ctrl + K)"
- Cmd+K opens overlay
- `> generate theme Frutiger Aero` → scrapes CARI + fetches font pairs + generates CSS variables
- `> audit motion` → triggers Motion.dev analysis
- `> sync tokens` → triggers token sync
- `> install [component]` → runs `npx shadcn add`
- Recent commands, keyboard navigation

**What exists instead:** Nothing for design workspace. `SlashCommandPalette.tsx` exists for AI chat `/` commands (different system).

**Build:**
- `src/components/workspace/CommandPalette.tsx` — new overlay component
- Global `Cmd+K` / `Ctrl+K` keyboard listener (register in DesignWorkspacePage or App.tsx)
- Command input with `>` prefix detection
- Command registry: array of `{ name, description, handler, icon }` objects
- Built-in commands: `generate theme`, `audit motion`, `sync tokens`, `install component`
- Search mode: filter through connected library components when no `>` prefix
- Results panel: shows output or sends to terminal
- Recent commands: localStorage persistence, last 5
- Keyboard: arrow keys navigate, Enter executes, Escape closes

#### MISSING #4: CLI Wrappers (generic `npx shadcn add`)
**Spec requirement:** `spec.md` Part 2 — "Cult / Skipper — CLI Wrappers"
- Node.js child_process wrapper that executes `npx shadcn add [url]` programmatically
- Returns installed file paths
- Handles errors, concurrency

**What exists instead:** Only `aceternity-install-component` IPC (hardcoded to Aceternity). `CultUIRegistry.tsx` copies `npx shadcn@latest add <url>` to clipboard but doesn't execute.

**Build:**
- IPC handler in `src/main.ts`: `design-suite:install-component`
  - Input: `{ registryUrl: string, projectPath: string }`
  - Execution: `child_process.spawn('npx', ['shadcn@latest', 'add', registryUrl], { cwd: projectPath })`
  - Output: stdout/stderr capture, exit code, installed file paths
  - Mutex: prevent concurrent installs (queue or lock)
- Preload bridge in `src/preload.ts`: `designSuiteInstallComponent(url, projectPath)`
- Wire CultUIRegistry "Install" button to actually execute (not just copy)

#### MISSING #5: CARI Scraper
**Spec requirement:** `spec.md` Part 2 — "CARI / FontsInUse — Headless Scraping"
- Playwright scraper for CARI.institute
- Extracts: aesthetic names, descriptions, image URLs
- Returns multimodal context (text + image URLs)
- Rate limiting, caching, retry logic

**What exists instead:** Nothing. Only in spec docs.

**Build:**
- `src/services/design/CariScraperService.ts` — scraper service
  - Uses Playwright (not Puppeteer — better Electron integration)
  - Method: `scrapeAesthetics(query: string): Promise<AestheticResult[]>`
  - Navigate to `https://cari.institute/aesthetics?q={query}`
  - Extract from `.aesthetic-card` elements: title, description, imageUrl
  - Rate limit: max 10 requests/minute
  - Cache: SQLite table or JSON file with 24h TTL
  - Retry: exponential backoff, max 3 retries
- IPC handler: `design-suite:scrape-cari`
- Preload bridge: `designSuiteScrapeCari(query)`

#### MISSING #6: FontsInUse Scraper
**Spec requirement:** `spec.md` Part 2 — same section as CARI
- Scraper for fontsinuse.com
- Extracts: font pairings, usage context, aesthetic associations

**What exists instead:** Nothing.

**Build:**
- `src/services/design/FontsInUseScraperService.ts`
  - Method: `getTypographyPairs(mood: string): Promise<FontPair[]>`
  - Extract: heading font, body font, usage context, source URL
  - Cache + rate limit (same pattern as CARI)
- IPC handler: `design-suite:scrape-fontsinuse`
- Preload bridge: `designSuiteScrapeFontsInUse(mood)`

#### MISSING #7: Motion Templates (GSAP/Lenis/Vanta)
**Spec requirement:** `spec.md` Part 2 — "GSAP / Lenis / Vanta — Boilerplate Templates"
- Store code patterns as local `.md` or `.ts` templates
- Agent reads locally rather than fetching externally

**What exists instead:** `MotionPresets.tsx` has 12 Framer Motion presets only. No GSAP, Lenis, or Vanta.

**Build:**
- `src/services/design/MotionTemplates.ts` — template store
  - Templates for: Lenis smooth scroll, GSAP entrance animations, Vanta.js (Waves, Birds, Fog, Net, Rings, Globe)
  - Each template: `{ id, name, framework, code: string, description: string }`
  - Method: `getTemplate(type: string): MotionTemplate`
  - Method: `listTemplates(): MotionTemplate[]`
- IPC handler: `design-suite:get-motion-template`
- Optionally: extend `MotionExplorer.tsx` with a "GSAP/Lenis/Vanta" category tab

#### MISSING #8: Custom MCP Server (`design-suite-mcp`)
**Spec requirement:** `spec.md` Part 3 — "Building the Custom Design Suite MCP Server"
- Standalone MCP server wrapping scrapers + CLI + templates
- TypeScript with `@modelcontextprotocol/sdk`
- Tools: `get_aesthetic_context`, `get_typography_pairs`, `install_component`, `generate_motion_boilerplate`

**What exists instead:** Directory does not exist. App only connects to external MCP servers.

**Build:**
- `design-suite-mcp/` directory at project root
  - `package.json` — deps: `@modelcontextprotocol/sdk`, `playwright`, `zod`
  - `tsconfig.json`
  - `src/index.ts` — MCP server entry point (use spec.md scaffolding)
  - `src/tools/scrapers.ts` — CARI + FontsInUse tools
  - `src/tools/cli-wrappers.ts` — shadcn add wrapper
  - `src/tools/templates.ts` — motion template tool
  - `src/cache.ts` — SQLite or JSON caching layer
- Register in DesignWorkspacePage's `DEFAULT_LIBRARIES` as `design-suite`
- Wire to existing `mcpStartServer`/`mcpStopServer` lifecycle

#### MISSING #9: Color Sync to Project
**Spec requirement:** `spec.md` Part 1, Tab 2 — "Sync to Project writes directly to globals.css or tailwind.config.js"
- Takes current color scheme → writes CSS `:root` variables to project file
- Uses existing `writeProjectFile` IPC (already in preload.ts line 521)

**What exists instead:** `writeProjectFile` IPC exists but is only used by `PromptDesignDialog.tsx`. No color sync logic.

**Build:**
- IPC handler in main.ts: `design-suite:sync-tokens`
  - Input: `{ cssVariables: string, projectPath: string, targetFile: 'globals.css' | 'tailwind.config.js' }`
  - Reads existing file, finds `:root` block or creates one, writes CSS variables
  - Returns success/failure
- Preload bridge: `designSuiteSyncTokens(cssVars, projectPath, targetFile)`
- Wire to TokensTab's "Sync to Project" button

---

## Build Order (dependency-aware)

```
Phase 1 — Foundation (no UI dependencies)
├── MISSING #5: CARI Scraper Service
├── MISSING #6: FontsInUse Scraper Service
├── MISSING #7: Motion Templates Store
├── MISSING #4: CLI Wrappers (IPC handler)
└── MISSING #9: Color Sync (IPC handler)

Phase 2 — MCP Server (depends on Phase 1 services)
└── MISSING #8: Custom MCP Server (wraps Phase 1 services)

Phase 3 — UI Components (depends on Phase 1 IPC)
├── MISSING #1: MoodboardTab
├── MISSING #2: TokensTab
└── MISSING #3: Command Palette

Phase 4 — Integration (depends on Phase 3)
└── Wire new tabs into DesignWorkspacePage + Cmd+K listener
```

## Engineering Requirements

### For EACH missing feature, design:

1. **TypeScript interfaces** — exact props, return types, data shapes
2. **State management** — where state lives (React state vs localStorage vs IPC)
3. **Data flow** — component → IPC → main process → service → DB/file
4. **All 4 UI states** — Empty, Loading, Error, Populated (per Human-Centric UX skill)
5. **Error handling** — what happens when scraper fails, CLI fails, file write fails
6. **IPC endpoints** — channel name, payload shape, response type
7. **File paths** — exact location for each new file
8. **Dependencies** — npm packages needed (playwright, @modelcontextprotocol/sdk, etc.)

### Design Constraints (from frontend-external-infra skill)
- Dark mode only
- `rounded-xl` max, `p-5` padding
- Geist body (13px), JetBrains Mono code
- Icons from lucide-react
- Transitions: 150ms, `cubic-bezier(0.2, 0, 0, 1)`
- Glass: `bg-zinc-900/80 backdrop-blur-xl`
- Respect `prefers-reduced-motion`

### Human-Centric UX Checklist (mandatory for all new UI)
- [ ] Primary action obvious in < 1s
- [ ] No raw system tokens visible
- [ ] Empty/Loading/Error/Populated states for every data element
- [ ] Clear visual hierarchy — one focal point per view
- [ ] Secondary complexity hidden behind disclosure
- [ ] Hover/focus/active/disabled states on all interactive elements
- [ ] 150-300ms transitions on state changes
- [ ] Submit/save gives immediate feedback
- [ ] Copy is plain-language
- [ ] Keyboard navigation + visible focus rings
- [ ] Touch targets ≥ 44px

### Anti-Slop Checklist (from frontend-external-infra)
- [ ] NOT purple/indigo gradient-on-everything
- [ ] NOT default Inter/only — use Geist + JetBrains Mono
- [ ] Radius + padding from DeskFlow scale
- [ ] No hero clichés (tiny eyebrow + oversized headline)
- [ ] Real micro-interactions on key actions
- [ ] All icons from lucide-react
- [ ] No emoji as UI icons

## Output Format

Return a complete implementation specification with:

1. **Per-feature spec** — interface definitions, state management, data flow, all 4 UI states, error handling, IPC endpoints, file paths
2. **Build order** — dependency graph with phases
3. **IPC endpoint table** — all new endpoints with channel name, input, output
4. **File creation list** — every new file with its purpose
5. **File modification list** — every existing file that changes and what changes
6. **Dependency list** — npm packages to install
7. **Integration plan** — how new tabs wire into DesignWorkspacePage
8. **Testing plan** — manual verification steps for each feature
