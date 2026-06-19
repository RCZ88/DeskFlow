# Page Structure Revamp — Redesign Prompt

## Raw Request
Restructure TerminalPage sidebar from 12 flat tabs into 5 logical groups. Extract inline components. Remove stale routes.

## Context Reference
See `CONTEXT_BUNDLE.md` in this directory.

## Engineering Tasks

1. **Type definition**: Replace `activeTab` state with `activeGroup: 'setup' | 'work' | 'insights' | 'studio' | 'context'`
2. **Sidebar rewrite**: 12 flat `<SidebarItem>` → 5 `<SidebarGroup>` components with expandable sub-items
3. **Component extraction**: Pull ProblemsTab, RequestsTab, FilesTab, SkillsTab into separate files
4. **WorkspaceShell**: Create shared shell component with scroll container + SubTabBar
5. **SubTabBar**: Create sub-tab navigation component
6. **usePersistentSubTab**: Create hook for sub-tab persistence per group

## Design Tasks

- Sidebar groups: collapsible headers with count badges
- Active group: accent color (amber for Setup, blue for Work, green for Insights, purple for Studio, teal for Context)
- WorkspaceShell: unified padding, scroll area, optional SubTabBar integration

## UX Tasks

- Sub-tab persists when switching between groups
- Workspace save/load backward compatible (JSON still uses `activeTab`)
- Empty groups show helpful state
- Smooth transitions between groups

## Constraints

- Do NOT remove `/old-dashboard` Route immediately — add redirect first, remove after verification
- PageContextPanel mounts as `page-context` sub-tab of Context group
- Keep WsEmptyState until verified replaced by EmptyState
