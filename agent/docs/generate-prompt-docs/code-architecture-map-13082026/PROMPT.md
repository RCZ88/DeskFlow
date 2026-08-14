# PROMPT.md — Code Architecture Map: Per-Feature Visualization

## Raw Request

> "It's not supposed to just show the folder structure. I want a proper, per-feature, per-page architecture map. Narrowing down from the tallest hierarchy to the most specific features and components. That's why we need AI involvement. Also, the map visualization for this doesn't exist — it still only has the text of files/folders in the sidebar."

## Problem Statement

The current Architecture Map in the workspace (Context → Architecture Map) shows a file tree and a force-directed graph of files. This is useless — it duplicates what you can see in a file explorer. The user needs a **semantic architecture map** that understands WHAT each part of the app does, not just WHERE files live.

## Mandate

**Design and implement a per-feature, per-page architecture visualization** that replaces the current file-based Architecture Map. The visualization must show the hierarchy from the broadest level (app routes/pages) down to specific features and components, with AI understanding of relationships.

## Technical Requirements

### Data Layer
1. Define a static `ARCHITECTURE_DATA` constant (no runtime scanning needed — the app structure is known) containing:
   - App → Pages (routes) → Features → Components → Files
   - Each node has: id, label, type, description, children, fileCount
   - Cross-references: components used by multiple features

2. The data structure:
```typescript
interface ArchNode {
  id: string;
  label: string;
  type: 'app' | 'page' | 'feature' | 'component' | 'file';
  route?: string;
  description?: string;
  icon?: string;
  accent?: string;
  children: ArchNode[];
  fileCount?: number;
  crossRefs?: string[]; // other feature IDs that use this component
}
```

### Visualization Layer
1. **Left Panel: Hierarchical Tree** — collapsible nodes, each level indented:
   - Page nodes (colored by route accent)
   - Feature nodes (colored by page accent)
   - Component nodes (colored by type: component=green, hook=amber, lib=purple, service=rose)
   - File nodes (gray, leaf level)

2. **Right Panel: Interactive Graph** — using cytoscape + dagre:
   - Page nodes: large, colored by accent
   - Feature nodes: medium, colored by page
   - Component nodes: small, colored by type
   - Edges: parent-child + cross-references (dashed lines for cross-refs)
   - Click a node → detail panel with description, files, dependencies

3. **Search** — filter tree and graph by name
4. **Filter by type** — show only pages, features, or components
5. **Zoom/Pan** on graph
6. **Click a file node** → open file viewer (existing readProjectFile IPC)

### UI/UX
- Replace the current `CodeArchitectureMap` component entirely
- Keep the same location: Context → Architecture Map subtab
- Header shows: "Architecture Map" + total counts
- Tree uses workspace design system (zinc palette, glass cards, accent colors)
- Graph uses dark background with colored nodes
- Smooth transitions when expanding/collapsing tree nodes

## Anti-Patterns to Avoid
- Do NOT show a flat file tree (that's what exists now and it's useless)
- Do NOT require runtime scanning (the app structure is static and known)
- Do NOT use placeholder/mock data — use the REAL feature hierarchy from the context bundle
- Do NOT make the graph too dense — aggregate at the page level by default, expand on click

## Constraints
- Must work with existing cytoscape + cytoscape-dagre (already in package.json)
- Must use workspace design tokens (zinc-900, cyan-400 accent, etc.)
- Must fit in the existing Context group subtab (no new routes)
- Must be performant with 250+ components (use virtualization or lazy rendering if needed)
