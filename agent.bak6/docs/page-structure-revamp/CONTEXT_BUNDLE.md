# Page Structure Revamp — Context Bundle

## Target
Complete restructuring of TerminalPage.tsx (6499 lines), sidebar (12 flat tabs → 5 groups), and route cleanup.

## Routes
| Route | Page | Status |
|-------|------|--------|
| `/` | Home/Dashboard | Keep |
| `/external` | ExternalPage | Keep |
| `/settings` | SettingsPage | Keep |
| `/stats` | StatsPage | Keep |
| `/database` | DatabasePage | Keep |
| `/terminal?projectId=X` | TerminalPage (workspace mode) | Keep |
| `/terminal` | TerminalPage (default) | Keep |
| `/ai` | AiPage | Keep |
| `/tutorial` | TutorialPage | Keep |
| `/browser` | BrowserActivityPage | Keep |
| `/projects` | IDEProjectsPage | Keep |
| `/productivity` | ProductivityPage | Keep |
| `/old-dashboard` | Redirect → /external | REMOVE |
| `/design-workspace` | Claimed in FEATURE_TRACKER but no Route | REMOVE from docs |

## TerminalPage Sidebar (12 flat → 5 groups)

### Setup
- Initialize (InitializeProgressModal)
- Setup (WorkspaceSettingsDialog)

### Work
- Skills (extracted to SkillsTab.tsx)
- Context (ContextMaintenanceTab)
- Problems (extracted to ProblemsTab.tsx)
- Requests (extracted to RequestsTab.tsx)
- Files (extracted to FilesTab.tsx)

### Insights
- Analytics (AnalyticsDashboard)
- Session Detail

### Studio
- Design (DesignWorkspaceTab)

### Context
- Page Context (PageContextPanel)

## 7 Categories of Redundancy

1. **Duplicate routes**: `/old-dashboard` same as `/external`
2. **Split domains**: `context` + `context-maintenance` → merge
3. **Ghost routes**: `design-workspace` listed in FEATURE_TRACKER, no Route
4. **Empty tabs**: History tab — completely empty
5. **Ghost tabs**: FEATURE_TRACKER lists Prompts Tab + Checklists Tab — don't exist
6. **Inline bloat**: ProblemsTab, RequestsTab, FilesTab, SkillsTab inside TerminalPage.tsx
7. **Orphan components**: PageContextPanel exists but not wired to sidebar

## Architectural Constraints

- `activeTab` → `activeGroup: 'setup' | 'work' | 'insights' | 'studio' | 'context'`
- Sub-tab persistence via `usePersistentSubTab('group-key')`
- Each group renders `<WorkspaceShell>` with sub-tab definitions
- Workspace save/load JSON field: `activeTab` (backward compat)
