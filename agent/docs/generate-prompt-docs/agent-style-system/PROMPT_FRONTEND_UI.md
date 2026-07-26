# PROMPT 1: Frontend UI — Design Co-Pilot Tabs & Command Palette

## Raw Request

> "you havent include this in the workspace: agent/docs/agent-style-system/spec.md you havent acutally like implemented the ui and like how you would give those features to the users to use for the ai cli system. i would like you to use generateprompt skill for any complcitaed engineering decisiongs like what ui to includ and whata are the things to consider adding for the humancentred-UIUX to make sue it is intuitive to use and like works properly."

## Context

Read `agent/docs/agent-style-system/CONTEXT_BUNDLE.md` for the full codebase reference. The key facts:

- DeskFlow has an existing `DesignWorkspacePage.tsx` (653 lines) at route `studio/design` inside the Terminal Workspace's Studio group
- Current tabs: `sources | motion | registry`
- The spec (`agent/docs/agent-style-system/spec.md`) describes 3 new features to add:
  1. **Moodboard Tab** — visual grid of parsed images from CARI.institute and Refero, with "Inject Context" on hover
  2. **Tokens Tab** — live Realtime Colors URL preview, CSS variable parsing, "Sync to Project" action
  3. **Command Palette** — Cmd/Ctrl+K overlay for text commands like `> generate theme Frutiger Aero`
- The existing DesignWorkspacePage already handles: Taste Knobs, Style References, Style Description, Color Picker, Library Sources, Global Search, Component Browser, Motion Explorer, Cult UI Registry, Design Compose Outlet
- All UI must follow DeskFlow's dark-mode-only design system with specific tokens (see Context Bundle §2.4)

## Engineering Task

Design the complete frontend implementation for integrating the Agent Style System's UI features into the existing DesignWorkspacePage. You are the **Lead Frontend Engineer** — produce a single, comprehensive solution.

### Task A: Moodboard Tab (`MoodboardTab.tsx`)

Design a new tab component that displays a visual grid of parsed images from aesthetic sources (CARI.institute, Refero). Requirements:

1. **Visual Grid Layout** — responsive masonry or card grid showing images with titles and descriptions
2. **Source Integration** — images come from the custom MCP server's `get_aesthetic_context` tool (backend will provide this — design the frontend assuming the data shape: `{ title: string, description: string, imageUrl: string, source: string }[]`)
3. **Hover Interaction** — hovering over an image reveals an "Inject Context" button that sends the image URL + metadata to the agent's context window via `agentSend()` IPC
4. **Search/Filter** — text input to filter by aesthetic name or tag
5. **Loading State** — skeleton grid while images are being fetched
6. **Empty State** — friendly message when no images are loaded yet, with a call-to-action to search for an aesthetic
7. **Error State** — if scraping fails, show retry option
8. **Persistence** — should moodboard items persist per-project (stored in localStorage or design library config)?

### Task B: Tokens Tab (`TokensTab.tsx`)

Design a new tab that provides live color scheme preview and CSS variable synchronization. Requirements:

1. **Realtime Colors Integration** — Realtime Colors stores themes in URL hashes (`?colors=050816...hex...`). Build a URL generator that takes the current ColorPicker entries and generates a Realtime Colors preview URL. Also build a URL parser that extracts CSS variables from a Realtime Colors URL.
2. **Live Preview** — embed an iframe or visual preview showing the color scheme applied to a sample UI
3. **CSS Variable Display** — show the generated CSS `:root` variables from the current color scheme
4. **"Sync to Project" Action** — button that writes the CSS variables to the project's `globals.css` or `tailwind.config.js` (requires new IPC endpoint — flag this as a backend gap)
5. **Typography Sync** — display the current font pairing (Geist + JetBrains Mono) and allow override
6. **Export** — copy CSS variables to clipboard, download as `.css` file

### Task C: Command Palette (`CommandPalette.tsx`)

Design a keyboard-triggered command palette overlay (Cmd/Ctrl+K). Requirements:

1. **Trigger** — Cmd+K (Mac) / Ctrl+K (Windows/Linux) opens the palette
2. **Command Input** — text input with `>` prefix for agent commands, plain text for search
3. **Command Types:**
   - `> generate theme [aesthetic]` — triggers CARI scraping + font pair generation
   - `> audit motion` — triggers Motion.dev frame rate analysis
   - `> sync tokens` — triggers Tokens sync
   - `> install [component]` — triggers `npx shadcn add` via CLI wrapper
   - Search commands: filter through available components, libraries, skills
4. **Command Results** — output appears in a results panel below the input, or gets sent to the active terminal
5. **Recent Commands** — show last 5 used commands
6. **Keyboard Navigation** — arrow keys to navigate results, Enter to execute, Escape to close
7. **Integration** — should this be a standalone overlay or part of the DesignWorkspacePage?

### Task D: Tab Integration

Design how the new tabs integrate with the existing `sources | motion | registry` tab bar:

1. Should Moodboard and Tokens be added as new tabs alongside the existing 3? (Recommended: yes, making it `moodboard | tokens | sources | motion | registry`)
2. Or should they be grouped under a new parent tab?
3. How does the Command Palette coexist with the tab system?

## Design Task

Produce high-fidelity visual specs for each component:

1. **MoodboardTab** — card dimensions, grid gap, image aspect ratios, hover overlay styling, skeleton shape
2. **TokensTab** — iframe embedding approach, CSS variable table layout, sync button styling
3. **CommandPalette** — overlay positioning, input styling, result list layout, keyboard shortcut hints
4. **Tab bar updates** — how the new tabs look, active/inactive states, icon choices from lucide-react

Apply DeskFlow re-skin rules:
- `rounded-xl` max, `p-5` padding
- Dark mode only (`bg-zinc-900/80 backdrop-blur-xl` for glass)
- Geist body font (13px), JetBrains Mono for code
- Icons from lucide-react
- Transitions: 150ms duration, `cubic-bezier(0.2, 0, 0, 1)` easing

## UX Task (Human-Centric UX Skill)

Apply the 6 pillars from `agent/skills/humancentred-UIUX/SKILL.md`:

1. **Clarity** — every label, button, tooltip in plain language. No raw system tokens visible.
2. **Progressive Disclosure** — Moodboard search is primary; advanced filtering hidden. Command Palette shows top 5 results, scroll for more.
3. **Visual Hierarchy** — one focal point per tab. Moodboard = images dominant. Tokens = preview dominant. Command Palette = input dominant.
4. **Complete State Coverage** — EVERY data-driven component must have Empty / Loading / Error / Populated states. Design each explicitly.
5. **Feedback & Micro-interactions** — hover states on moodboard cards, loading spinners on fetch, success toast on sync, confirmation on destructive actions.
6. **Forgiveness & Affordance** — obvious click targets (≥44px), visible focus rings, keyboard navigation works everywhere.

## Constraints

- MUST extend existing `DesignWorkspacePage.tsx`, not create a new page
- MUST use existing IPC endpoints where available; flag new IPC needs as backend gaps
- MUST follow DeskFlow design tokens (no new color schemes, no new fonts)
- MUST preserve ALL existing functionality (Taste Knobs, Style References, Color Picker, Library Sources, Motion Explorer, Cult UI, Compose Outlet)
- Files to create: `src/components/workspace/MoodboardTab.tsx`, `src/components/workspace/TokensTab.tsx`, `src/components/workspace/CommandPalette.tsx`
- File to modify: `src/pages/DesignWorkspacePage.tsx` (add new tabs + Cmd+K listener)

## Output Format

Return a complete implementation plan with:
1. Component interfaces (TypeScript props)
2. State management approach
3. Data flow diagrams (how data moves between components and IPC)
4. Visual specs (exact Tailwind classes, spacing, colors)
5. All 4 states for each data-driven component (Empty/Loading/Error/Populated)
6. Keyboard interaction map
7. Backend gaps list (IPC endpoints that don't exist yet)
