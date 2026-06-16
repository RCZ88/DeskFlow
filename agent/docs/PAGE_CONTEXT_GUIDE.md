# Page Context System — AI Agent Guide

## What

A living markdown file (`agent/PAGE_CONTEXT.md`) that tracks every page/view in the application. Each page entry answers:

- **What is this page?** — purpose, route, primary user goal
- **What are its parts?** — components, subcomponents, visual sections
- **What data does it touch?** — IPC endpoints, state, props, localStorage
- **How does it connect?** — links to other pages, shared state, navigation flows
- **How should it be updated?** — conventions, gotchas, patterns to follow
- **What can go wrong?** — known edge cases, race conditions, anti-patterns

## Why

AI agents lack persistent memory. Without a page context file, every session starts from zero — the agent re-discovers the same architecture, misses the same edge cases, and repeats the same mistakes. This file is the agent's long-term memory for the UI layer.

## How to create / update

### When to update

- A new page is added
- A page's data flow changes (new IPC calls, new state management)
- A page's component structure changes significantly
- A bug is fixed that reveals a subtle page interaction (document the gotcha)
- **Not** for trivial styling or one-line changes

### Format rules

Each page entry uses this structure:

```markdown
## Page: [Name]

### Identity
- **Route:** `/path`
- **File:** `src/pages/PageName.tsx`
- **Line count:** ~N
- **Primary props:** [list of props received from parent]
- **Primary state:** [list of key useState/useRef hooks]

### Component Tree
```
PageShell > main sections...
```

### IPC Endpoints Called
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `ipc-channel` | read/write | what it does |

### Data Flow
- **Reads:** what data it consumes and where from
- **Writes:** what data it modifies
- **Shared state:** any state shared with other pages

### Connections to Other Pages
- What pages it links to
- What pages link to it
- Shared global state dependencies

### Update Conventions
- Patterns to follow when modifying this page
- Code style specifics

### Known Pitfalls
- Race conditions, edge cases, anti-patterns
- Bugs that have been fixed here before
```

### Process

1. Read `agent/PAGE_CONTEXT.md` at session start
2. After making changes to a page, check if the context needs updating
3. If updating, read the page source to verify current structure
4. Update the entry — don't rewrite the whole file, just the relevant section
5. Keep descriptions concise but precise (agents need signal, not prose)
