# CONTEXT_BUNDLE.md — AI Assistant Provider & Diagnostics

## Architecture Overview

Two completely separate code paths call AI providers:

- **PATH A (digest/features)**: `get-topic-digest` IPC handler → `buildChain()` in `router.ts` → `runWithFallback()` → `callWithTokenTiers()` → `callProvider()` in `callProvider.ts` → HTTP POST
- **PATH B (chat)**: `aiAgentService.callLLM()` in `aiAgentService.ts` → builds request template by ID → HTTP POST (no router, no fallback chain, no shared provider template)

PATH B is used for ALL chat interactions. PATH A is used for topic digest + goal features.

---

## File: `src/services/providers/callProvider.ts` (66 lines)

Logs full request body + full raw JSON response (up to 2000 chars) + parsed content. Used ONLY by PATH A.

- Line 34: `bodyStr = JSON.stringify(body); console.log([PROV] FULL REQUEST BODY: ${bodyStr});`
- Line 57: `console.log([PROV] FULL RAW RESPONSE: ${JSON.stringify(raw).slice(0,2000)});`
- Line 64: `console.log([PROV] PARSED content len=... PARSED CONTENT: ...);`
- Uses `template.buildBody(req)` or default `{ model, messages, max_tokens, temperature }`
- Uses `template.parseResponse(raw)` or default `{ content: raw.choices?.[0]?.message?.content, usage: raw.usage }`
- Has `template.auth.type: bearer | header | query`
- Timeout: 10s

## File: `src/services/providers/router.ts` (106 lines)

- `buildChain(state, feature)` → builds array of `{provider, model}` from enabled providers sorted by priority, with primary from routing assignment
- `callWithTokenTiers(provider, req)` → tries tiers [req.maxTokens, 100, 50, 40] on credit errors (402)
- `runWithFallback(chain, req)` → iterates chain, returns first success, throws if all fail
- Path: A → B → C fallback order

## File: `src/services/providers/templates.ts`

Defines templates for `openrouter`, `cloudflare`, `ollama`, `custom`. Each has:
- `id`, `label`, `defaultBaseUrl`
- `auth: { type }` (+ `headerName` for header auth, `queryParam` for query auth)
- `staticHeaders`
- `interpolateUrl(baseUrl, config)` — Cloudflare substitutes `{account_id}` from `config.extraConfig.cloudflareAccountId`
- `buildBody(req)` — Cloudflare wraps in `{ messages: body.messages, max_tokens: body.max_tokens, stream: false }`
- `parseResponse(raw)` — Cloudflare: `raw.result?.response || ''`, OpenAI-compatible: `raw.choices?.[0]?.message?.content`
- Ollama: uses default OpenAI-compatible format, defaultBaseUrl `http://localhost:11434/api/chat`

## File: `src/services/ai/aiAgentService.ts` (446 lines)

**CRITICAL: Has its OWN HTTP fetch at line 281-368 that does NOT use the router.**

- `callLLM(systemPrompt, tools, round, totalRounds, onChunk?)` — completely independent
- Has its OWN template definitions at lines 370-395 (openrouter, cloudflare, ollama, custom)
- Uses streaming: reads `response.body.getReader()`, parses SSE `data:` lines
- Logging is MINIMAL: `[AiAgent] ${target.label} error ${response.status}: ${errText.slice(0, 300)}` on error, `contentLen=${fullContent.length}` on success
- NO request body logging
- NO response body logging (only accumulated content)
- Does NOT use `callProvider.ts`, `router.ts`, or `templates.ts` at all
- Base URL for Ollama: `http://localhost:11434/v1/chat/completions` (note: v1 path, different from router.ts which uses `/api/chat`)
- `processMessage(userMessage)` — main entry point, up to 5 rounds, max 8 tool calls per round
- Tool execution: prompts user for confirm on write operations via `requestConfirm`/`resolveConfirm`
- `getSystemPrompt()` — dynamically builds system prompt from tool list
- Line 207: `callLLM` — loads provider config from IPC, picks first enabled or routing default

## File: `src/main.ts` — `migrateProviderNames()` (lines 12773-12799)

```
function migrateProviderNames(state) {
  oldToNew = { cloudflayer: 'cloudflare', ollamah: 'ollama', olamah: 'ollama' };
  labelFixes = { cloudflayer: 'Cloudflare', ollamah: 'Ollama', olamah: 'Ollama' };
  // filters out invilier
  // for each provider: fixes id, templateId, label, baseUrl
}
```

## File: `src/main.ts` — `get-topic-digest` IPC handler (lines 12200-12433)

- Line 12200: `ipcMain.handle('get-topic-digest', async (_event, opts?) => {`
- Checks `ai_interests` table for enabled topics
- Caches result in `ai_briefs` table per date
- Force refresh: deletes cache, then regenerates
- PATH A: uses `buildChain(pState, 'researchDigest')` → `runWithFallback()`
- Parses JSON response with fallback `cleanDigestJson()` that strips markdown fences
- Logs content type and length but not actual response text
- Falls back to legacy OpenRouter API key if no provider chain

## File: `src/main.ts` — `get-ai-providers` handler (lines 12802-12821)

- Loads from `userPreferences.aiProviders` JSON
- Runs through `migrateProviderNames()` on load
- Default: OpenRouter enabled, Cloudflare/Ollama disabled

## File: `src/main.ts` — `test-ai-provider` handler (lines 12830-12851)

- Takes `providerId`, finds config, loads template
- Calls `callProvider()` from PATH A
- Returns `{ success, content }` or `{ success: false, error }`
- Used by Settings → Test button

## File: `src/preload.ts` (lines 180-199)

IPC channels exposed:
- `getTopicDigest(opts?)` → `get-topic-digest`
- `isDigestGenerating()` → `is-digest-generating`
- `onDigestGenerationComplete(callback)` → listener on `digest-generation-complete`
- `getInterestTopics()` / `addInterestTopic()` / `removeInterestTopic()`
- `getAiConfig()` / `saveAiConfig()`
- `generateAIColors()` / `generateAICategorization()` / `testOpenRouterKey()` / `summarizeWithLLM()`

## File: `src/services/ai/toolRegistry.ts` (420 lines)

- `ToolRegistry` class: registers tools, gets by name/category, generates OpenAI function specs
- `checkAccess(key)` — gates data access per preference
- 70+ registered tools across: goals, projects, external activities, sleep, preferences, categories, IDE, problems, requests, AI usage, dashboard, interest topics, checklists, workspace, prompts
- Tools check `securityGuard.isLevelAllowed(tool.securityLevel)` before executing
- Security levels: `read` (auto), `confirm` (user must approve), `admin` (not implemented)

## File: `src/components/AIFeaturesModal.tsx` (386 lines)

- Static UI showing what the AI can do — purely informational
- Groups: Read Data, Create & Update, Track Time, Manage Projects, Configure
- No backend wiring — marketing overlay only

## Key Design Tokens

- Colors: `zinc-950` bg, `zinc-800/60` borders, `emerald-500` accent, `zinc-100` text
- Radius: `rounded-2xl` for modals, `rounded-lg` for cards, `rounded-md` for small UI
- Typography: `text-sm` (14px) headers, `text-xs` (12px) body, `text-[11px]` (11px) captions, `text-[10px]` (10px) tags
- Transitions: `duration-150` for hovers, `duration-200` for modals, `duration-0.15` for expand
- Fonts: Geist (UI), JetBrains Mono (code)

## DB Schema (relevant)

```
ai_interests: id INTEGER PK, topic TEXT UNIQUE, enabled INTEGER DEFAULT 1, created_at TEXT
ai_briefs: type TEXT, date TEXT, content TEXT, model_used TEXT, tokens_used INTEGER, created_at TEXT
goals: id TEXT PK, title TEXT, description TEXT, category TEXT, period TEXT (daily/longterm), status TEXT, source TEXT, priority INTEGER, parent_id TEXT, date TEXT, target TEXT
```

## State Management

- `userPreferences` object in main process, updated via `savePreferences()`
- `_digestGenerationInProgress` flag prevents concurrent digest generation
- `aiAgentService` singleton in renderer — holds `conversationHistory[]`, `confirmQueue[]`, `config`
- Provider config stored as JSON string in `userPreferences.aiProviders`
