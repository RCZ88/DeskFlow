# CONTEXT_BUNDLE.md — Code Architecture Map Feature

## Raw Request

> "It's not supposed to just show the folder structure. I want a proper, per-feature, per-page architecture map. Narrowing down from the tallest hierarchy to the most specific features and components. That's why we need AI involvement. Also, the map visualization for this doesn't exist — it still only has the text of files/folders in the sidebar."

## What Exists Today

The current `CodeArchitectureMap.tsx` (src/components/workspace/) shows:
- Left panel: flat file tree (just file names organized by directory)
- Right panel: cytoscape force-directed graph of files

This is **useless** — it duplicates what you can see in a file explorer. No semantic understanding, no feature grouping, no component relationships.

## What's Needed

A **per-feature, per-page architecture visualization** that shows the hierarchy:

```
APP (DeskFlow)
├── Dashboard (/)
│   ├── Timer Feature
│   │   ├── StopwatchTimer (component)
│   │   ├── TimerBehavior (lib)
│   │   └── timer settings (in SettingsPage)
│   ├── Momentum Hero
│   │   └── MomentumHero (component)
│   ├── Goals
│   │   ├── GoalsCard (component)
│   │   └── useFocusGoals (hook)
│   └── Heatmap
│       └── DayDetailPopup (component)
├── Terminal Workspace (/terminal)
│   ├── Session Management
│   │   ├── NewSessionDialog
│   │   ├── SessionEditDialog
│   │   └── ImportSessionsDialog
│   ├── Presets
│   │   └── PresetsTab
│   └── Context Map
│       ├── ContextSidebar
│       └── CodeArchitectureMap
├── Finance (/finance)
│   ├── Overview
│   │   ├── OverviewTab
│   │   ├── NetWorthLineChart
│   │   └── SpendingCategoryChart
│   ├── Transactions
│   │   ├── TransactionsTab
│   │   └── 8 transaction modals
│   └── Subscriptions
│       ├── SubscriptionsTab
│       └── SubscriptionModal
└── ... (all pages)
```

## Feature Hierarchy Data (from codebase analysis)

### APP ROUTES → PAGES
| Route | Page | Component Count |
|-------|------|-----------------|
| / | DashboardPage | ~17 |
| /terminal | TerminalPage | ~30 |
| /finance | FinancePage | ~55 |
| /ai | AiPage | ~85+ |
| /ide | IDEProjectsPage | ~10 |
| /settings | SettingsPage | ~8 |
| /external | ExternalPage | ~12 |
| /life | LifePage | ~15 |
| /activity | ActivityPage | ~8 |
| /learn | LearnPage | ~20 |

### DASHBOARD FEATURES
- Status Band → StatusBand.tsx
- Momentum Hero → MomentumHero.tsx
- Tier Breakdown → TierBreakdownStrip.tsx
- Goals → GoalsCard.tsx + useFocusGoals.ts
- Quick Focus → QuickFocusCard.tsx
- Deadlines → DeadlinesCard.tsx
- Schedule → ScheduleCard.tsx
- Heatmap → DayDetailPopup.tsx
- Solar System → OrbitSystem.tsx
- Recent Sessions → inline in DashboardPage.tsx

### TERMINAL WORKSPACE FEATURES
- Session Management → NewSessionDialog, SessionEditDialog, ImportSessionsDialog
- Terminal Panes → TerminalWindow, TerminalMiniMap, MapEditor
- Workspace Shell → WorkspaceShell, WorkspaceGroupRail, SubTabBar
- Presets → PresetsTab
- Configs → ConfigsTab
- Fortress → FortressProtocolSetup
- Analytics → AnalyticsDashboard
- Code Stats → CodeStatsTab
- Issues → IssuesWorkspace, ProblemsTab
- Skills → SkillsTab
- Design → DesignWorkspacePage
- Architecture Map → CodeArchitectureMap
- Context Sidebar → ContextSidebar

### FINANCE FEATURES
- Lock Screen → FinanceLockScreen, PasswordConfirmDialog
- Overview → OverviewTab, NetWorthLineChart, SpendingCategoryChart, RecentTxnsCard
- Wallets → WalletsTab, WalletDetailView
- Transactions → TransactionsTab + 8 modals (Bank/Debit/Credit/Crypto/Physical/Cash/Ewallet/Prepaid)
- People → PeopleTab, PersonCard, PersonDetailModal
- Categories → CategoriesTab
- Budget → BudgetExpensesDashboard, BudgetTab
- Subscriptions → SubscriptionsTab, SubscriptionModal
- Charts → FinanceChartsTab
- Recap → RecapPanel

### AI PAGE FEATURES
- Chat System → ChatPanel, ChatInput, ChatHistory, MessageBubble, useAiChat
- Canvas Mode → CanvasContainer, CanvasGrid, CanvasCard, 10+ card types
- Deck Mode → AiPageDeck, FocusBoard, PlanBoard, ReflectFeed
- Compositions → CompositionPanel, CompositionEditorModal
- Connectors → ConnectorsPanel, ConnectorSetupModal
- Automations → AutomationList, AutomationCard, VisualBuilderModal
- Goals → GoalsRemindersDrawer

### SHARED COMPONENTS
- UI Primitives → badge, button, dialog, switch, skeleton, tooltip, border-beam, particles
- Layout → PageShell, GlassCard, SectionHeader, TabBar, EmptyState, LoadingState
- Hooks → useHomeSummary, useDeepFocus, useCanvasState, usePersistentSubTab

## Data Model for Visualization

Each node in the hierarchy:
```typescript
interface ArchNode {
  id: string;
  label: string;
  type: 'app' | 'page' | 'feature' | 'component' | 'file';
  route?: string;        // for pages
  description?: string;  // what it does
  children: ArchNode[];
  fileCount?: number;
  color?: string;        // accent color per type
}
```

## Visualization Requirements

1. **Hierarchical tree view** (left panel) — collapsible, per-page, per-feature
2. **Interactive graph** (right panel) — nodes sized by complexity, colored by type
3. **Click a feature** → see its components and files
4. **Click a component** → see its dependencies and which features use it
5. **Search** — find any feature or component by name
6. **Filter** — show only certain pages or feature types
7. **Cross-references** — lines connecting components used by multiple features

## Existing Infrastructure
- cytoscape + cytoscape-dagre (in package.json, used by KnowledgeGraphBlock)
- useWorkspaceContext hook (file tree + symbol index)
- readProjectFile IPC (read any file from project)
- Fallback tree with 200+ known paths
