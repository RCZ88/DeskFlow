# PROMPT — Design Library Integration Research

## Persona
You are a senior full-stack engineer (TypeScript/React/Electron) with deep expertise in MCP (Model Context Protocol) integration, design systems, and AI agent workflows. You design complete, implementable solutions. You produce specs so precise that another AI can implement them without asking follow-up questions. You never produce vague "consider this" suggestions — every statement is either a concrete code path or a file diff.

---

## Raw Request (User's Verbatim)

> refero aceternity componentry. [@agent\skills\generate-prompt\SKILL.md] Okay, I have this list of websites. These websites are all related to design systems. There's Refero, Aceternity, and componentry. I'm using a text to speech so there might be some typos in the paragraph. Okay, but the first few things are in the names of the website anyways. I would like to be able to implement those any of those, any three of those that you can implement three of three if it's only a few of them. Yeah as much as possible right as much as how we can improve the workspace theme management right so far. We only have like the list of skills and using those skills and having the UI to be able to configure certain stuff. But I feel like these stuff were actually the libraries and plus this Aceternity and 21st.dev MCP that we already have that's also something that we can utilize for the theme infrastructure of our application and what I would like you to do is to generate a research prompt to be able to research on how we can connect those into our infrastructure whether it's through MCP, it's API or for example if it's manual needs to be manually actors by humans can be sort of in a sensible way in a human way and so that we're able to use those designs without having without having manually accessing how we can integrate AI and see into them how the AI is able to access those things and select the components or select the design that can fit into the website to improve the design. How can those be combined list of skills and MCP servers that we have for example the state MCP um the 21st.dev MCP and how we can integrate it into the UI of the sidebar of the workspace. Right because currently we're in the UI for the style the stuff right how we can implement these stuff and where are these and how we can implement it uh how we can add them to the tutorial because remember that there's a guidebook for the workspace and we need to make sure that everything is displayed the logic is displayed and how it works is displayed properly with full transparency.

---

## Problem Statement

The DeskFlow terminal workspace already has a Design tab with taste knobs (variance, motion, density), style references (Claude, Linear, Vercel, etc.), color picker, and text description. It generates XML-based design context that's sent to AI agents via terminal write.

However, this infrastructure is **limited**:

1. **Only 5 design skills** (frontend-design, design-taste, taste-skill, impeccable, ui-ux-pro-max)
2. **Only 8 local style references** (stored in `agent/design-references/`)
3. **No access to external design libraries** like Refero, Aceternity UI
4. **21st.dev MCP is configured** (`@21st-dev/magic` in opencode.json) but not integrated into the workspace UI
5. **No way for AI agents to browse/search/select designs** from libraries that actually exist
6. **Users cannot leverage the extensive component libraries** that these platforms provide
7. **The workspace guidebook has no documentation** on design resources or how to use them

The user wants to integrate three external design resources into the workspace theme management:
- **Refero** (styles.refero.design) — 2,000+ AI-readable design systems with DESIGN.md files
- **Aceternity UI** (ui.aceternity.com) — 200+ Tailwind CSS + Framer Motion components
- **21st.dev** — Already configured as MCP, should be surfaced in workspace UI

The goal is to make these accessible via MCP, API, or manual integration in a human-sensible way, so that:
- AI agents can access and select components/designs that fit the user's needs
- The workspace UI surfaces these resources
- The tutorial/guidebook documents how this works with full transparency

---

## Context Bundle Reference

**Read this first:** `agent/docs/design-library-integration-06062026/CONTEXT_BUNDLE.md`

The context bundle provides:
- Full source code of DesignWorkspacePage.tsx (188 lines)
- 5 workspace component implementations (TasteKnobs, StyleReferences, DesignComposeOutlet, StyleDescription, ColorPicker)
- Current MCP configuration (opencode.json with @21st-dev/magic)
- Design skills SKILL.md file summaries
- Preload bridge IPC endpoints for file reading and terminal write
- Current data flow pipeline for design context

---

## Engineering Task

Design the **complete integration architecture** for connecting Refero, Aceternity UI, and 21st.dev into the workspace theme infrastructure.

For each of the three libraries, determine:

### A. Integration Method

**Research and specify:**
1. Does an API exist? What are the endpoints, authentication requirements, rate limits?
2. Is there an MCP server available? How is it configured, what tools does it provide?
3. What CLI commands are available? (e.g., `npx aceternity-ui init`, `npx aceternity-ui add`)
4. What is the file structure format for DESIGN.md or component metadata?
5. Can we fetch assets programmatically or must they be manually downloaded?

**For each library, specify one of:**
- `MCP_INTEGRATION` — Use Model Context Protocol to give AI agents direct access
- `API_INTEGRATION` — Implement fetch-based calls from main process
- `CLI_BRIDGE` — Electron spawns CLI processes and captures output
- `MANUAL_SYNC` — User manually downloads files, app parses them
- `HYBRID` — Multiple methods (specify which)

**For Refero (styles.refero.design):**
- Research API endpoints for fetching design systems, list of available systems, DESIGN.md content
- Research Refero MCP server configuration and tool definitions
- Specify how to integrate into Electron main process → IPC bridge → renderer

**For Aceternity UI (ui.aceternity.com):**
- research CLI commands: init, add, list-all, options
- Research shadcn MCP server tool definitions
- Research registry format for component discovery
- Specify npm package management (local vs global, version pinning)

**For 21st.dev:**
- Document how to surface the existing opencode.json MCP configuration in the workspace UI
- Design how the renderer can invoke MCP tools (even though MCP runs in separate opencode process)
- If not possible, design alternative: main process as MCP client → IPC → renderer

### B. Backend Architecture

For each integration method that requires backend changes, specify:

**IPC Channels (if needed):**
- Channel name, payload shape, response shape
- Should be in `preload.ts` and `main.ts`
- Example: `get-refero-systems`, `get-aceternity-components`, `query-21st-components`

**Service Layer (if needed):**
- New service class in `src/services/` or existing service extension
- Methods for caching, rate limiting, authentication
- Error handling and fallback strategies

**File System:**
- Where to store downloaded/cached assets (e.g., `agent/design-caches/refero/`, `agent/design-caches/aceternity/`)
- How to refresh cached data
- How to detect new/updated designs

**Data Structures:**
- TypeScript interfaces for each library's response format
- For Refero: `ReferoSystem`, `ReferoDesignSystem` (tokens, components, metadata)
- For Aceternity: `AceternityComponent`, `AceternityRegistry`
- For 21st.dev: `ComponentSearchResult`, `ComponentDetail`

### C. State Management

**In renderer (localStorage + React state):**
- Which configuration should be persisted (e.g., enabled libraries, API keys, preferred sources)
- How to sync changes across sessions
- How to handle API keys (secure storage? user-provided?)

**Storage schema:**
- `design-library-config` — { refero: {enabled, apiKey}, aceternity: {enabled}, "21st-dev": {enabled} }
- `design-library-cache` — { refero: {systems: [...], lastFetched: ISO}, aceternity: {components: [...], lastFetched: ISO} }

---

## Design Task

Design the **workspace sidebar UI enhancements** to surface design library integration.

### A. Current Design Tab Layout

Document what exists now (see DesignWorkspacePage.tsx):
- TasteKnobs (top-left grid)
- StyleReferences (top-right grid)
- StyleDescription (bottom-left grid)
- ColorPicker (bottom-right grid)
- DesignComposeOutlet (full-width preview + send button)

### B. Proposed UI Changes

**Design the enhanced Design tab layout:**
- Add **Design Library Sources** section (new row in grid?)
- Show 3 cards/sources: Refero, Aceternity UI, 21st.dev
- Each card should show: status (connected/disconnected), item count, "Configure" button, "Browse" button
- Configure button opens a settings modal (API keys, MCP config)
- Browse button opens a component/gallery browser panel

**Component Browser Panel (new modal or inline expansion):**
- How to display search/filter of available components
- Card/list view vs. grid view
- Code preview capability
- "Add to design context" button per component
- Tags/categories for filtering (e.g., buttons, cards, layouts, animations)

**Integration with existing components:**
- Should DesignComposeOutlet show which sources contributed to the current context?
- Should there be badges indicating "3 Refero components imported", "2 Aceternity animations selected"?
- How does this interact with the existing StyleReferences checkboxes?

**Visual specifications:**
- Exact Tailwind classes for all new UI elements
- Color scheme (existing pink accent for Design, or new colors per source?)
- Iconography (lucide-react icons for each source)
- Loading states, error states, empty states
- Animation curves (use existing `--ws-dur` and `--ws-ease` tokens)

### C. Settings Modal (for library configuration)

**Design a new modal or panel for configuring design libraries:**
- Refero configuration: API key field (if applicable), enable/disable toggle, "Refresh cache" button
- Aceternity configuration: npm path validation, "Sync local components" button, CLI status
- 21st.dev configuration: "View MCP config" link, enable/disable toggle
- "Test connection" button per source
- Status indicator with description (green = connected, amber = partial, red = disconnected)

---

## UX Task

Design the **user interaction flow** for accessing and using design libraries.

### A. Discovery Flow

**How users discover design resources:**
- On first workspace open, should there be a "You can now browse 2000+ design systems" banner in Design tab?
- How does the user know Refero/Aceternity/21st.dev are available?
- Should there be a tutorial step in INITIALIZE.md explaining design libraries?
- Click path: Design tab → "Design Library Sources" section → ?

### B. Search and Selection Flow

**User wants to find a specific component:**
1. User clicks "Browse" on Aceternity UI card
2. Modal slides in with search input and categorized grid
3. User types "card" → filters show Hero Card, Feature Card, Testimonial Card
4. User clicks "Hero Card" → shows code preview + description + "Add to context" button
5. User clicks "Add to context" → component added to active design context
6. Preview panel updates to show the new component in XML format
7. User clicks "Send Design Context to Terminal" → AI agent sees the component in its context

**What if multiple sources have similar components?**
- Should user see which source each result comes from?
- How to disambiguate?

### C. Configuration Flow

**User wants to set up API key for Refero:**
1. User clicks "Configure" on Refero card
2. Settings modal opens with API key input field
3. User pastes API key → "Test connection" button becomes enabled
4. User clicks "Test connection" → spinner → success/error feedback
5. If success, card status changes from "Disconnected" to "Connected (2,145 systems)"
6. "Browse" button becomes enabled

### D. AI Agent Usage Flow

**How AI agents access design libraries:**
- Current pipeline: XML design context sent via terminal write
- New pipeline: Should XML include references to imported components?
  ```xml
  <design_sources>
    <source name="Refero" system="Linear" />
    <source name="Aceternity" component="Hero Card" />
  </design_sources>
  ```
- Or should the actual component code be included in the context?
  ```xml
  <imported_components>
    <component name="Hero Card" source="Aceternity UI">
      <code>function HeroCard() { ... }</code>
    </component>
  </imported_components>
  ```
- How does the agent know it can browse more components if needed?

**What if the agent requests a component during the session?**
- Can the agent make an IPC call to browse components?
- Or must human pre-select all components before the session starts?

### E. Error and Edge Case Handling

**What happens when:**
- API key is invalid or expired?
- API rate limit is reached?
- Network is offline?
- Refero/Aceternity API is down?
- CLI command fails (npx not found)?
- Component is not compatible with Tailwind v4?

**Design error states:**
- Inline error messages per card
- Retry buttons
- Fallback suggestions ("Try the 5 built-in skills instead")
- Graceful degradation (show local references if external sources fail)

---

## Requirements

### R1 — Refero Integration

- **R1.1:** Research and document Refero API endpoints (if any exist)
- **R1.2:** Research and document Refero MCP server configuration
- **R1.3:** Specify IPC channels for fetching Refero design systems (MCP_INTEGRATION or API_INTEGRATION)
- **R1.4:** Design UI card for Refero showing connection status and system count
- **R1.5:** Design component browser modal for Refero systems
- **R1.6:** Specify how Refero DESIGN.md files are integrated into the design context XML

### R2 — Aceternity UI Integration

- **R2.1:** Research and document Aceternity UI CLI commands
- **R2.2:** Research and document Aceternity shadcn MCP server
- **R2.3:** Specify IPC channels for fetching/listing Aceternity components (CLI_BRIDGE or HYBRID)
- **R2.4:** Design UI card for Aceternity showing connection status and component count
- **R2.5:** Design component browser modal for Aceternity components
- **R2.6:** Specify how Aceternity component code is integrated into the design context

### R3 — 21st.dev Surface

- **R3.1:** Document how to expose existing opencode.json 21st.dev MCP in the workspace UI
- **R3.2:** If MCP not accessible from renderer, design alternative (main process as client)
- **R3.3:** Design UI card for 21st.dev showing connection status
- **R3.4:** Design component search interface for 21st.dev
- **R3.5:** Specify how 21st.dev components are integrated into design context

### R4 — UI/UX Unified Experience

- **R4.1:** Design unified "Design Library Sources" section layout
- **R4.2:** Ensure all three sources share consistent UI patterns (cards, modals, buttons)
- **R4.3:** Design how imported components are displayed in DesignComposeOutlet preview
- **R4.4:** Ensure integration works with existing TasteKnobs, StyleReferences, ColorPicker

### R5 — Configuration Management

- **R5.1:** Design settings modal for configuring all three sources
- **R5.2:** Specify localStorage schema for configuration persistence
- **R5.3:** Define API key storage approach (if security-sensitive)
- **R5.4:** Design connection testing flow per source

### R6 — Backend Architecture

- **R6.1:** Specify all new IPC channels (preload.ts + main.ts)
- **R6.2:** Define TypeScript interfaces for all API responses
- **R6.3:** Document file system structure for cached data
- **R6.4:** Specify caching strategy (TTL, invalidation, refresh triggers)

### R7 — AI Agent Integration

- **R7.1:** Specify enhanced design context XML format
- **R7.2:** Determine whether to include full code or references
- **R7.3:** Design how agents can request/browse additional components during session

### R8 — Documentation

- **R8.1:** Specify what sections to add to `agent/TERMINAL_SIDEBAR_REFERENCE.md`
- **R8.2:** Specify what sections to add to `agent/AGENTS.md` (workspace guidebook)
- **R8.3:** Design tutorial flow for INITIALIZE.md explaining design libraries
- **R8.4:** Ensure full transparency: users must understand what each source provides and how

---

## Constraints

### C1 — Electron Architecture

- **NO direct Node access in renderer:** All fetch/process/file operations must go through IPC
- **Preload bridge pattern:** New capabilities require `preload.ts` expose + `main.ts` handler
- **Cannot use require()/renderer-side Node APIs**

### C2 — Tailwind v4

- `src/index.css` uses `@import "tailwindcss";` (v4 syntax)
- Never change to `@tailwind base/components/utilities` (v3 syntax)
- Use CSS variables (`--ws-*`) for reusable design tokens

### C3 — MCP Server Isolation

- **MCP servers run in opencode.ai process, NOT in Electron**
- The renderer cannot directly invoke MCP tools
- Design alternative architectures if MCP invocation is impossible fromrenderer

### C4 — Backward Compatibility

- **Must not break existing design context pipeline**
- Existing TasteKnobs, StyleReferences, ColorPicker must continue to work
- Existing XML format should be extensible, not replaced wholesale

### C5 — No New Build Tooling

- **Should not require installing new CLI tools globally**
- If CLI is used, must work via `npx -y` or similar local invocation
- Avoid requiring users to configure npm globally

### C6 — Offline Fallback

- **Should work with local references even when external APIs are down**
- graceful degradation: show "Refero unavailable (network error)" but don't break entire Design tab

### C7 — Performance

- **Don't fetch/parse thousands of components on every render** — cache aggressively
- Lazy load component browser modal (only fetch when opened)
- Debounce search input (300ms minimum)

### C8 — Security

- **API keys should not be exposed in UI logs or IPC logs**
- If storing keys, consider encryption or at least avoid printing them
- Validate all API responses before persisting

---

## Output Format

Your RESULT.md must be a **single comprehensive document** with the following structure:

1. **Summary** — High-level overview of proposed integration approach
2. **Architecture Overview** — Diagram or text explaining how all pieces connect
3. **Detailed Specifications** — One section per library (Refero, Aceternity, 21st.dev):
   - Integration method selected (MCP/API/CLI/Manual/Hybrid) with justification
   - API endpoints or MCP tools documented
   - IPC channels defined (if backend needed)
   - TypeScript interfaces for data structures
4. **Backend Implementation Spec** — All IPC channels, preload.ts bridges, main.ts handlers
5. **Frontend Design Spec** — Exact UI layouts with Tailwind classes
6. **UX Flow Spec** — Step-by-step interaction flows
7. **Data Storage Spec** — localStorage schema, file system structure
8. **AI Agent Integration Spec** — Enhanced XML context format
9. **Documentation Spec** — What sections to add to which .md files
10. **Implementation Checklist** — Ordered list of all changes needed (file by file)

Do NOT provide multiple options (Option A/B/C). Design the **single best approach** that balances all constraints.

---

## Notes for Research

Before designing the solution, you may need to visit these resources:

- Refero: https://styles.refero.design/ (look for API docs, MCP documentation)
- Aceternity: https://ui.aceternity.com/docs/cli (CLI documentation, MCP server info)
- 21st.dev: (MCP tool definitions, how opencode.json MCP is used)

If you cannot find API information, state this explicitly and propose fallback architectures.

---

**IMPORTANT:** This is a **research + design** prompt, not an implementation prompt. Your RESULT.md should specify exactly how everything should work, but you do NOT need to write the actual code. Provide comprehensive specifications so another AI (or the user) can implement them directly.