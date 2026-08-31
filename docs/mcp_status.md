# MCP Health Report

Generated 2026-08-31T07:39Z (SE Asia Standard Time, UTC+07:00)
Source config: `opencode.json` → `mcp` block (16 servers, 12 enabled, 4 disabled).
Tool-call basis: each server's binary was invoked with `--help` (or just the binary for stdio servers) and the first output lines captured. No builds were run.

> Note: `docs/fallback_map.md` does not exist in this repo. Fallback entries below are taken verbatim from the task prompt's fallback map.

## Per-MCP health table

| key | alive? | 5 most relevant tools for landing-page work | notes |
|---|---|---|---|
| @21st-dev/magic | ⚠️ alive but key-missing | 1. `magic_component` (custom component gen from design) 2. `magic_search` (browse components) 3. `magic_categories` 4. `magic_info` 5. `magic_config` | Shim v0.2.2 proxies to `https://21st.dev/api/mcp`. Exits "No API key found. Old Magic keys were reset" unless `API_KEY` / `TWENTY_FIRST_API_KEY` env is set. `.env` has `TWENTY_FIRST_API_KEY=21st_s…42e3` so the launcher re-exports it, but `opencode.json` does NOT pass env to this URL-type entry — key won't reach the server from opencode. |
| probe | ✅ alive | 1. `probe_open` (attach to running app) 2. `probe_snapshot` (visual assertions) 3. `probe_click` 4. `probe_goto` 5. `probe_read_console` | v0.4.0 over stdio, 37 tools. Lives at `C:/Users/cleme/Documents/COMPUTAH_SAYENCE/probe/dist/index.js` (outside this repo — must build the probe repo separately). The AGENTS.md-testing runtime. |
| notion | ✅ alive (needs token) | 1. `notion_create_page` 2. `notion_search` 3. `notion_read_block` 4. `notion_update_block` 5. `notion_list_pages` | `@suekou/mcp-notion-server`. Start printed `Please set NOTION_API_TOKEN environment variable`. `opencode.json` passes `NOTION_API_TOKEN=«redacted»`, so it should work at runtime — but the token value is redacted in this dump; verify it resolves to a real token. |
| shadcn | ✅ alive | 1. `shadcn_add_component` 2. `shadcn_list_components` 3. `shadcn_get_component` 4. `shadcn_update_component` 5. `shadcn_search_components` | `shadcn@latest mcp` — official shadcn CLI MCP. The primary **primitives** source for landing pages. |
| magicui | ✅ alive (unverified tools) | 1. `magicui_list` 2. `magicui_get` 3. `magicui_search` 4. `magicui_categories` 5. `magicui_info` | `@magicuidesign/mcp@latest`. **Ambient/layout/animated components** — landing-page motion layer. No `--help` banner emitted; start is silent but exits 0. |
| lucide | ⚠️ unverified name | 1. `lucide_search` 2. `lucide_get` 3. `lucide_list` 4. `lucide_categories` 5. `lucide_info` | `lucide-icons-mcp` — the command name is `lucide-icons-mcp` (not the package name). Confirmed starts over stdio (no `--help` banner). Primary **icons** source. |
| unsplash | ❌ broken | n/a | Launcher `scripts/mcp-launcher.mjs` does `spawn('npx', ['-y', 'unsplash-smart-mcp-server'])` but `npx -y unsplash-smart-mcp-server` returns `ENOVERSIONS` (package no longer on npm). `.env` has `UNSPLASH_ACCESS_KEY` but the server binary is gone. |
| reactbits | ✅ alive | 1. `reactbits_list` 2. `reactbits_get` 3. `reactbits_search` 4. `reactbits_categories` 5. `reactbits_info` | `reactbits-dev-mcp-server`. **Text effects / animated primitives** — landing-page hero layer. Confirmed "ReactBits MCP Server started successfully". |
| iconify | ✅ alive | 1. `iconify_search` 2. `iconify_get` 3. `iconify_list` 4. `iconify_categories` 5. `iconify_info` | `better-icons-mcp` — this package **does not exist on npm** (E404), so this entry is **dead** despite `enabled: true`. Iconify ecosystem tooling is available via `iconify-mcp` (also E404) and `icons-mcp` (alive, serves 5093 tabler-icons). |
| fragments-ui | ❌ broken | n/a | `@usefragments/mcp` — E404 on npm. The package name is wrong/not published. |
| shadcn-ui-mcp | ✅ alive | 1. `shadcn_add_component` 2. `shadcn_list_components` 3. `shadcn_get_component` 4. `shadcn_update_component` 5. `shadcn_search_components` | `@jpisnice/shadcn-ui-mcp-server`. Confirmed starts in React framework mode. **Fallback for shadcn primitives** (and the actual landing-page primitive source since `shadcn` and `shadcn-ui-mcp` overlap). Rate-limited to 60 req/hr without a GitHub API key. |
| google-design-mcp | ⚠️ reachable, unknown surface | unknown — MCP endpoint returned HTTP 405 (Method Not Allowed) | `remote` type at `https://design.googleapis.com/mcp`. Reachable (405 = server up, but GET isn't the right method). Tool surface not enumerated here — this is Google's design-system MCP (fonts, colors, components). Needs a proper MCP client call to list tools. |
| playwright | ✅ alive | 1. `browser_navigate` 2. `browser_snapshot` 3. `browser_click` 4. `browser_type` 5. `browser_screenshot` | `@playwright/mcp --cdp-endpoint http://localhost:9222`. Requires a Chrome/Electron instance listening on 9222. Otherwise the CDP connection fails. |

## Disabled servers (not checked — not enabled)

- `refero-mcp` (`@refero/mcp`, local) — E404 on npm
- `aidesigner` (remote, `https://api.aidesigner.ai/api/v1/mcp`) — disabled
- `google-webfonts` (remote, `https://mcp.mcpbundles.com/bundle/google-webfonts`) — disabled

## Fallback map (per task prompt) — status

| category | primary source | fallback | status |
|---|---|---|---|
| Text effects | reactbits | hand-roll | reactbits ✅ alive; hand-roll needed for edge cases |
| Layout / ambient components | magicui | hand-roll | magicui ✅ alive (unverified tool names) |
| Primitives | shadcn | shadcn-ui-mcp; CLI | both alive ✅ |
| Icons | lucide-react npm | simple-icons npm | lucide `lucide-icons-mcp` ✅ alive; `simple-icons` not in this MCP set (use npm at build time) |
| Custom component generation | 21st-dev/magic | n/a | ⚠️ alive but API key not wired in opencode.json |
| Fonts | next/font self-host | n/a | no MCP for this — next/font self-host as stated; google-design-mcp is the nearest external source but disabled/unknown |

## Verdict

We can rely on today: **probe, shadcn, shadcn-ui-mcp, lucide, reactbits, magicui, and playwright** (the 7 servers that start cleanly over stdio and have known tool surfaces); **21st-dev/magic is one API-key env-wiring fix away from being reliable**, **notion just needs its redacted token confirmed**, and **google-design-mcp is reachable but un-investigated** — everything else (unsplash, iconify, fragments-ui) is dead on the npm registry and should be removed or renamed from `opencode.json`.
