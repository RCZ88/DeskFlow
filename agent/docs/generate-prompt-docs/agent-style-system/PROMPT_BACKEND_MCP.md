# PROMPT 2: Backend — Custom Design Suite MCP Server & Connectors

## Raw Request

> "you havent actually like implemented the ui and like how you would give those features to the users to use for the ai cli system. i would like you to use generateprompt skill for any complicated engineering decisions like what ui to include and what are the things to consider adding for the humancentred-UIUX to make sure it is intuitive to use and like works properly. you also need to consider the other aspects that is already in the workspace like the initialize, and whether those requires initialization and whether it needs to be separated or combined with the main initialization thing."

## Context

Read `agent/docs/agent-style-system/CONTEXT_BUNDLE.md` for the full codebase reference. Key backend facts:

- DeskFlow is an Electron app with main process (`src/main.ts`) and renderer
- IPC bridge: `src/preload.ts` exposes `window.deskflowAPI` methods
- Existing MCP integration: `mcpStartServer(id)`, `mcpStopServer(id)`, `mcpServerStatus(id)` — these manage external MCP server processes
- The spec (`agent/docs/agent-style-system/spec.md`) describes a custom "design-suite" MCP server with:
  - CARI.institute scraper (Puppeteer/Playwright)
  - FontsInUse scraper
  - Realtime Colors URL parser
  - CLI wrappers (`npx shadcn add`)
  - Motion boilerplate templates (GSAP/Lenis/Vanta)
- The existing initialization flow uses `tracker-mind-setup` IPC for project scaffolding (AGENTS.md, INITIALIZE.md, etc.)

## Engineering Task

Design the complete backend architecture for the Design Suite MCP Server and its connectors. You are the **Lead Backend Engineer** for the MCP infrastructure.

### Task A: MCP Server Architecture

Design the architecture for a custom MCP server that wraps web scrapers, API calls, and CLI executions into standard MCP tools. Decisions to make:

1. **Process Model:**
   - Option 1: Standalone Node.js process (launched via `child_process.spawn`)
   - Option 2: Embedded in Electron main process (runs as a service)
   - Option 3: Hybrid — main process manages lifecycle, worker threads do scraping
   - **Recommend and justify** one approach considering: Electron context, Puppeteer/Playwright requirements, IPC overhead, error isolation

2. **Transport Layer:**
   - Standard MCP uses stdio (`StdioServerTransport`)
   - But Electron main↔renderer uses IPC
   - How does the MCP server communicate with: (a) the renderer process, (b) the AI agent in the terminal?
   - Design the bridge architecture

3. **Tool Registration:**
   - Design the tool schema for each MCP tool (name, description, inputSchema)
   - Tools needed:
     - `get_aesthetic_context(query: string)` — scrape CARI.institute
     - `get_typography_pairs(mood: string)` — scrape FontsInUse
     - `generate_color_url(colors: ColorEntry[])` — generate Realtime Colors URL
     - `parse_color_url(url: string)` — parse Realtime Colors URL to CSS vars
     - `install_component(registryUrl: string)` — run `npx shadcn add`
     - `get_motion_boilerplate(type: string)` — return GSAP/Lenis/Vanta code templates

### Task B: CARI.institute Scraper

Design a robust web scraper for CARI.institute (a design aesthetics encyclopedia). Considerations:

1. **Page Structure:** CARI has aesthetic cards with titles, descriptions, and images. The scraper needs to:
   - Navigate to `https://cari.institute/aesthetics?q={query}`
   - Extract aesthetic names, descriptions, and image URLs
   - Handle pagination if results span multiple pages
2. **Anti-Scraping:** CARI may have rate limiting, CAPTCHAs, or bot detection. Design:
   - Rate limiting (max N requests per minute)
   - Retry logic with exponential backoff
   - User-Agent rotation
   - Graceful degradation (return cached results if scraping fails)
3. **Caching:** Cache scraped results to avoid repeated requests:
   - Cache key: query string (normalized)
   - Cache TTL: 24 hours
   - Cache storage: SQLite or JSON file?
4. **Multimodal Output:** The scraper returns both text (descriptions) and images (URLs). Design the MCP response format for multimodal content.

### Task C: FontsInUse Scraper

Design a scraper for FontsInUse (a typography encyclopedia). Considerations:

1. **Data to Extract:** Font pairings, usage context, aesthetic associations
2. **Search Interface:** FontsInUse has a search/browse interface. Design the scraping strategy.
3. **Output Format:** Return structured font pairing recommendations with rationale.

### Task D: Realtime Colors URL Engine

Design a utility that generates and parses Realtime Colors URLs. Realtime Colors stores color themes in URL hashes:

```
https://www.realtimecolors.com?colors=050816-ffffff-222222-3366ff-ff3366
```

The hash format: `{bg}-{text}-{primary}-{secondary}-{accent}` as hex without `#`.

1. **URL Generator:** Takes ColorPicker entries → generates Realtime Colors URL
2. **URL Parser:** Takes Realtime Colors URL → extracts CSS variables
3. **CSS Variable Generator:** Takes parsed colors → generates `:root` CSS variable block
4. **Tailwind Config Generator:** Takes parsed colors → generates `tailwind.config.js` extension

### Task E: CLI Wrappers

Design Node.js wrappers for terminal commands:

1. **`npx shadcn add [url]`** — install a shadcn component from a registry URL
   - Capture stdout/stderr
   - Return installed file paths
   - Handle errors (network failure, invalid URL, dependency conflicts)
2. **Working directory:** The CLI runs in the project's root directory
3. **Concurrency:** What if multiple install commands run simultaneously?

### Task F: Motion Boilerplate Templates

Design a template system for motion/animation code:

1. **Template Storage:** Store as `.ts` or `.md` files in a known location
2. **Template Types:**
   - Lenis smooth scroll setup
   - GSAP entrance animations
   - Vanta.js background effects (Waves, Birds, Fog, etc.)
   - Framer Motion layout animations
3. **Template Injection:** How does the agent receive and inject the template code?

### Task G: Integration with Existing Initialize Flow

The spec mentions initialization. Analyze:

1. **`tracker-mind-setup`** creates project scaffolding (AGENTS.md, etc.)
2. **Design system initialization** is separate (library config in DesignWorkspacePage)
3. **Should there be a unified initialize flow?** Consider:
   - User perspective: "Set up my project" vs "Set up my design system" are different intents
   - Technical: `tracker-mind-setup` writes files to disk; design config persists in app settings
   - Recommendation: Keep separate, but add a "Design System" step to the provision flow

### Task H: Error Handling & Resilience

Design the error handling strategy:

1. **Scraper failures:** What happens when CARI is down? (Fallback to cache, show degraded UI)
2. **CLI failures:** What happens when `npx shadcn add` fails? (Show error in UI, suggest manual install)
3. **MCP server crashes:** How to restart? Auto-restart with backoff?
4. **Rate limiting:** Global rate limit across all scrapers?

## Constraints

- Must work within Electron's main process constraints (no browser APIs, Node.js only)
- Must not block the main process (all scraping in worker threads or child processes)
- Must integrate with existing `mcpStartServer`/`mcpStopServer`/`mcpServerStatus` IPC pattern
- Puppeteer/Playwright must be installed as a dependency
- All file I/O must use async APIs
- Must handle Windows paths (backslashes, spaces in paths)

## Output Format

Return:
1. Architecture diagram (text-based) showing process model and communication flow
2. TypeScript interfaces for all tool schemas
3. Implementation plan per tool (file paths, function signatures, error handling)
4. Database schema if caching uses SQLite
5. IPC endpoint definitions for new endpoints needed
6. Dependency list (npm packages required)
7. File structure for `design-suite-mcp/` directory
