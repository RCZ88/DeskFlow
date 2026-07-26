# PROMPT 3: Integration — Workspace Synergy, Initialization & Data Flow

## Raw Request

> "you also need to consider the other aspects that is already in the workspace like the initialize, and whether those requires initialization and whether it needs to be separated or combined with the main initialization thing. make sure to use all frontend skills"

## Context

Read `agent/docs/agent-style-system/CONTEXT_BUNDLE.md` for the full codebase reference.

DeskFlow has multiple interconnected systems that the Agent Style System must integrate with:

1. **Project Initialization** — `tracker-mind-setup` IPC creates project scaffolding files
2. **Design Workspace** — `studio/design` subtab with library sources, taste knobs, color picker
3. **Terminal Workspace** — agent conversations that receive design context via `agentSend()`
4. **MCP Server Management** — existing `mcpStartServer`/`mcpStopServer` lifecycle
5. **Context Assembly** — `ContextAssemblyService` builds agent prompts from multiple sources
6. **Knowledge Systems** — 6 toggleable systems (Graphify, LLM Wiki, Obsidian Skills, PARA, QMD, Automations)

## Engineering Task

Design the integration architecture that connects the Agent Style System with DeskFlow's existing systems. You are the **Systems Architect** — ensure all pieces work together coherently.

### Task A: Initialization Flow Analysis

Analyze the relationship between project initialization and design system initialization:

1. **Current `tracker-mind-setup` flow:**
   - Creates: AGENTS.md, INITIALIZE.md, PROBLEMS.md, REQUESTS.md, state.md
   - Triggered from: IDE page "Provision" button or "New Agent" dialog
   - Persists to: file system (project directory)

2. **Design system initialization (current):**
   - Configures: library sources, MCP server connections
   - Triggered from: Design Workspace "Start All" button
   - Persists to: app settings (via `setDesignLibraryConfig`)

3. **Design system initialization (new — from spec):**
   - Additional: CARI/FontsInUse scrapers, Realtime Colors, CLI wrappers
   - These need: npm dependencies (Puppeteer), process management, caching

**Design the integration:**
- Should "Provision" also set up design system dependencies?
- Should there be a separate "Design Setup" step in the provision flow?
- Or should design system setup be completely independent?
- Consider user mental model: "I'm setting up a new project" vs "I'm configuring my design tools"

### Task B: Data Flow Architecture

Map the complete data flow for the Agent Style System:

```
User Input → Design Workspace → Context Assembly → Terminal Agent
                    ↓
            MCP Server (design-suite)
                    ↓
            Scrapers / CLI / Templates
                    ↓
            Cached Results
```

Design:
1. **How does moodboard data flow?**
   - User searches aesthetic → MCP server scrapes CARI → results cached → displayed in MoodboardTab
   - User clicks "Inject Context" → image URL + metadata → `agentSend()` → terminal agent

2. **How does token data flow?**
   - User adjusts colors in ColorPicker → TokensTab generates Realtime Colors URL → preview iframe
   - User clicks "Sync to Project" → CSS variables → write to `globals.css` (new IPC needed)

3. **How does command palette data flow?**
   - User types `> generate theme Frutiger Aero` → command parsed → MCP tool called → results displayed
   - OR: command parsed → sent to terminal agent as context

4. **How does design context compose with existing context?**
   - Design Workspace already builds XML context via `buildFullContext()`
   - How do new moodboard images, token syncs, and command results integrate?
   - Should they be part of the XML context? Or separate?

### Task C: Context Assembly Integration

The `ContextAssemblyService` builds agent prompts from multiple sources. How does the Agent Style System integrate?

1. **Current context sources:** state.md, context.md, design skills, style references, color scheme, imported components, library access
2. **New context sources:** moodboard images, token sync state, command history
3. **Should moodboard be part of the XML context?** Consider:
   - XML context is sent to terminal agent
   - Images are URLs — agent can't see them directly
   - Agent needs: image URLs + descriptions for multimodal processing
   - Design: add `<moodboard>` section to XML context

4. **Should token sync state be part of context?** Consider:
   - Tokens define the visual language for generated code
   - Agent needs to know: current color scheme, font pairing, CSS variables
   - Design: add `<design_tokens>` section to XML context

### Task D: MCP Server Lifecycle Integration

The existing `mcpStartServer`/`mcpStopServer` manages MCP server processes. How does the custom design-suite MCP integrate?

1. **Registration:** Add `design-suite` to the library sources list in `DEFAULT_LIBRARIES`
2. **Lifecycle:** Start/stop alongside other MCP servers
3. **Status:** Report connection status, tool count, last scrape time
4. **Configuration:** Allow user to enable/disable individual tools (scrapers, CLI wrappers)

### Task E: Relationship with Knowledge Systems

The 6 knowledge systems (Graphify, LLM Wiki, Obsidian Skills, PARA, QMD, Automations) are toggleable context sources. How does the Agent Style System relate?

1. **Is "Design Suite" a 7th knowledge system?** Consider:
   - It provides design context to the agent
   - It has its own data sources (scrapers, templates)
   - It can be toggled on/off
   - Design: yes, it fits the pattern — add as a toggleable system

2. **Or is it a sub-feature of the existing Design Workspace?** Consider:
   - Design Workspace already manages design context
   - The Agent Style System extends it with new data sources
   - Design: keep it as part of Design Workspace, not a separate system

3. **Recommendation and justification**

### Task F: Persistence Strategy

Design how all the new state persists:

| Data | Current Storage | Recommended | Rationale |
|------|----------------|-------------|-----------|
| Library config | `setDesignLibraryConfig` IPC | Keep | Already works |
| Moodboard items | localStorage? | Design | Per-project or global? |
| Token sync state | ColorPicker state | Keep in React state | Ephemeral |
| Command history | localStorage | Design | Max N entries? |
| Scraped cache | SQLite? JSON file? | Design | Consider size, query patterns |
| Realtime Colors URLs | Generated on-the-fly | N/A | No persistence needed |

### Task G: Error Recovery & Offline Behavior

Design how the system behaves when:
1. **MCP server is offline** — scrapers can't reach CARI/FontsInUse
2. **Network is completely offline** — all remote sources unavailable
3. **Puppeteer is not installed** — scraping tools unavailable
4. **Project directory is read-only** — "Sync to Project" can't write files

For each case: what degrades gracefully? What shows errors? What's blocked entirely?

## Frontend Skills to Apply

Apply these skills to the integration design:

1. **Frontend Design** — component patterns, tokens, spacing for any new UI
2. **Human-Centric UX** — state coverage, clarity, progressive disclosure for integration points
3. **Impeccable** — 7 design dimensions for the overall flow
4. **Motion — Bring the UI Alive** — transitions between states, loading animations
5. **UI UX Pro Max** — dev tools specific patterns (this IS a dev tool)
6. **Design Taste System** — anti-repetition, variance knobs for the integration UX
7. **frontend-external-infra** — source routing for any new component needs

## Constraints

- MUST preserve all existing functionality
- MUST NOT break the existing `buildFullContext()` → `handleSend()` flow
- MUST integrate with existing IPC patterns (don't invent new communication methods)
- MUST work offline with degraded functionality (cached data, no scraping)
- MUST handle the case where Puppeteer is not installed (graceful fallback)

## Output Format

Return:
1. Architecture diagram showing all system interconnections
2. Initialization flow diagram (what happens when, in what order)
3. Data flow tables for each feature (moodboard, tokens, commands)
4. Persistence strategy table
5. Error recovery matrix (failure → behavior → user message)
6. IPC endpoint list (existing + new needed)
7. File modification list (which existing files change, how)
8. Migration plan (how to add new features without breaking existing ones)
