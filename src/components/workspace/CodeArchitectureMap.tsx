// ============================================================================
// Code Architecture Map — Per-Feature Hierarchy Visualization
// Shows Pages → Features → Components → Files with interactive graph.
// Uses static ARCHITECTURE_DATA (no runtime scanning needed).
// ============================================================================
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Network, Folder, FileText, ChevronRight, ChevronDown, Search,
  Filter, ZoomIn, ZoomOut, Maximize2, X, LayoutGrid, FileCode,
  Eye, Copy, CheckCircle2, ExternalLink, Route, Puzzle, Box, Cpu
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

interface ArchNode {
  id: string;
  label: string;
  type: 'app' | 'page' | 'feature' | 'component' | 'file';
  route?: string;
  description?: string;
  accent?: string;
  children?: ArchNode[];
  file?: string;
}

// ─── Node type config ─────────────────────────────────────────────

const NODE_CONFIG: Record<ArchNode['type'], { color: string; label: string; icon: any; size: number }> = {
  app:       { color: '#fbbf24', label: 'App',       icon: Cpu,     size: 40 },
  page:      { color: '#3b82f6', label: 'Page',      icon: Route,   size: 32 },
  feature:   { color: '#22c55e', label: 'Feature',   icon: Puzzle,  size: 24 },
  component: { color: '#a855f7', label: 'Component', icon: Box,     size: 18 },
  file:      { color: '#64748b', label: 'File',      icon: FileText, size: 14 },
};

// ─── Static Architecture Data ─────────────────────────────────────

const ARCHITECTURE_DATA: ArchNode = {
  id: 'app',
  label: 'DeskFlow',
  type: 'app',
  accent: '#fbbf24',
  children: [
    {
      id: 'dashboard', label: 'Dashboard', type: 'page', route: '/', accent: '#3b82f6',
      children: [
        { id: 'dash-timer', label: 'Status Band & Timer', type: 'feature', description: 'Current app display, live stopwatch, timer behavior', children: [
          { id: 'c-statusband', label: 'StatusBand', type: 'component', file: 'src/pages/dashboard/StatusBand.tsx' },
          { id: 'c-tierbreakdown', label: 'TierBreakdownStrip', type: 'component', file: 'src/pages/dashboard/TierBreakdownStrip.tsx' },
        ]},
        { id: 'dash-momentum', label: 'Momentum Hero', type: 'feature', description: 'Productivity score card with animated ring', children: [
          { id: 'c-momentum', label: 'MomentumHero', type: 'component', file: 'src/components/dashboard/MomentumHero.tsx' },
        ]},
        { id: 'dash-goals', label: 'Goals', type: 'feature', description: 'Daily goals + AI suggestions', children: [
          { id: 'c-goalscard', label: 'GoalsCard', type: 'component', file: 'src/components/dashboard/GoalsCard.tsx' },
          { id: 'c-usefocusgoals', label: 'useFocusGoals', type: 'component', file: 'src/hooks/useFocusGoals.ts' },
        ]},
        { id: 'dash-focus', label: 'Quick Focus', type: 'feature', description: 'Deep focus mode launcher', children: [
          { id: 'c-quickfocus', label: 'QuickFocusCard', type: 'component', file: 'src/components/focus/QuickFocusCard.tsx' },
        ]},
        { id: 'dash-deadlines', label: 'Deadlines', type: 'feature', description: 'Deadline tracker with countdown', children: [
          { id: 'c-deadlines', label: 'DeadlinesCard', type: 'component', file: 'src/components/dashboard/DeadlinesCard.tsx' },
        ]},
        { id: 'dash-heatmap', label: 'Heatmap & Orbit', type: 'feature', description: 'Weekly activity heatmap + 3D solar system', children: [
          { id: 'c-daydetail', label: 'DayDetailPopup', type: 'component', file: 'src/components/DayDetailPopup.tsx' },
          { id: 'c-orbit', label: 'OrbitSystem', type: 'component', file: 'src/components/OrbitSystem.tsx' },
        ]},
        { id: 'dash-sessions', label: 'Recent Sessions', type: 'feature', description: 'Activity feed with live stopwatches', children: [
          { id: 'c-recentact', label: 'RecentActivityFeed (inline)', type: 'component', file: 'src/pages/DashboardPage.tsx' },
        ]},
        { id: 'dash-data', label: 'Data Hooks', type: 'feature', description: 'All dashboard data aggregation', children: [
          { id: 'c-usedashdata', label: 'useDashboardData', type: 'component', file: 'src/components/dashboard/useDashboardData.ts' },
          { id: 'c-usehomesummary', label: 'useHomeSummary', type: 'component', file: 'src/hooks/useHomeSummary.ts' },
          { id: 'c-usedeepfocus', label: 'useDeepFocus', type: 'component', file: 'src/hooks/useDeepFocus.ts' },
        ]},
      ],
    },
    {
      id: 'terminal', label: 'Terminal Workspace', type: 'page', route: '/terminal', accent: '#22c55e',
      children: [
        { id: 'term-shell', label: 'Workspace Shell', type: 'feature', description: 'Sidebar groups + content frame + resize', children: [
          { id: 'c-workspaceshell', label: 'WorkspaceShell', type: 'component', file: 'src/components/workspace/WorkspaceShell.tsx' },
          { id: 'c-grouprail', label: 'WorkspaceGroupRail', type: 'component', file: 'src/components/workspace/WorkspaceGroupRail.tsx' },
          { id: 'c-subtabbar', label: 'SubTabBar', type: 'component', file: 'src/components/workspace/SubTabBar.tsx' },
        ]},
        { id: 'term-sessions', label: 'Session Management', type: 'feature', description: 'Create, edit, import, resume agent sessions', children: [
          { id: 'c-newsessdlg', label: 'NewSessionDialog', type: 'component', file: 'src/components/NewSessionDialog.tsx' },
          { id: 'c-sessedit', label: 'SessionEditDialog', type: 'component', file: 'src/components/SessionEditDialog.tsx' },
          { id: 'c-importsess', label: 'ImportSessionsDialog', type: 'component', file: 'src/components/ImportSessionsDialog.tsx' },
          { id: 'c-instructpanel', label: 'InstructionPanel', type: 'component', file: 'src/components/InstructionPanel.tsx' },
        ]},
        { id: 'term-panes', label: 'Terminal Panes', type: 'feature', description: 'Split pane layout, minimap, drag reorder', children: [
          { id: 'c-termwindow', label: 'TerminalWindow', type: 'component', file: 'src/components/TerminalWindow.tsx' },
          { id: 'c-termmminimap', label: 'TerminalMiniMap', type: 'component', file: 'src/components/TerminalMiniMap.tsx' },
          { id: 'c-mapeditor', label: 'MapEditor', type: 'component', file: 'src/components/MapEditor.tsx' },
        ]},
        { id: 'term-setup', label: 'Setup Group', type: 'feature', description: 'Presets, configs, fortress, backups', children: [
          { id: 'c-presets', label: 'PresetsTab', type: 'component', file: 'src/components/workspace/PresetsTab.tsx' },
          { id: 'c-configs', label: 'ConfigsTab', type: 'component', file: 'src/components/workspace/ConfigsTab.tsx' },
          { id: 'c-fortress', label: 'FortressProtocolSetup', type: 'component', file: 'src/components/workspace/FortressProtocolSetup.tsx' },
        ]},
        { id: 'term-insights', label: 'Insights Group', type: 'feature', description: 'Analytics, code stats, prompts, issues', children: [
          { id: 'c-analyticsdash', label: 'AnalyticsDashboard', type: 'component', file: 'src/components/AnalyticsDashboard.tsx' },
          { id: 'c-promptstab', label: 'PromptHistoryTab', type: 'component', file: 'src/components/PromptHistoryTab.tsx' },
          { id: 'c-issues', label: 'IssuesWorkspace', type: 'component', file: 'src/components/IssuesWorkspace.tsx' },
        ]},
        { id: 'term-context', label: 'Context Group', type: 'feature', description: 'Context sidebar, maintenance, architecture map', children: [
          { id: 'c-contextsidebar', label: 'ContextSidebar', type: 'component', file: 'src/components/ContextSidebar.tsx' },
          { id: 'c-contextmaint', label: 'ContextMaintenanceTab', type: 'component', file: 'src/components/ContextMaintenanceTab.tsx' },
          { id: 'c-archmap', label: 'CodeArchitectureMap', type: 'component', file: 'src/components/workspace/CodeArchitectureMap.tsx' },
        ]},
      ],
    },
    {
      id: 'finance', label: 'Finance', type: 'page', route: '/finance', accent: '#f43f5e',
      children: [
        { id: 'fin-overview', label: 'Overview', type: 'feature', description: 'Net worth, income vs expense, spending by category', children: [
          { id: 'c-overviewtab', label: 'OverviewTab', type: 'component', file: 'src/components/finance/OverviewTab.tsx' },
          { id: 'c-networth', label: 'NetWorthLineChart', type: 'component', file: 'src/components/finance/NetWorthLineChart.tsx' },
          { id: 'c-spendcat', label: 'SpendingCategoryChart', type: 'component', file: 'src/components/finance/SpendingCategoryChart.tsx' },
          { id: 'c-recenttxns', label: 'RecentTxnsCard', type: 'component', file: 'src/components/finance/RecentTxnsCard.tsx' },
        ]},
        { id: 'fin-wallets', label: 'Wallets', type: 'feature', description: 'Account management, wallet detail, balance recalculation', children: [
          { id: 'c-walletstab', label: 'WalletsTab', type: 'component', file: 'src/components/finance/WalletsTab.tsx' },
          { id: 'c-walletdetail', label: 'WalletDetailView', type: 'component', file: 'src/components/finance/WalletDetailView.tsx' },
          { id: 'c-wallethealth', label: 'WalletHealthScorecards', type: 'component', file: 'src/components/finance/WalletHealthScorecards.tsx' },
        ]},
        { id: 'fin-transactions', label: 'Transactions', type: 'feature', description: 'Transaction list + 8 wallet-type modals', children: [
          { id: 'c-transactionstab', label: 'TransactionsTab', type: 'component', file: 'src/components/finance/TransactionsTab.tsx' },
          { id: 'c-txdetail', label: 'TransactionDetailModal', type: 'component', file: 'src/components/finance/TransactionDetailModal.tsx' },
        ]},
        { id: 'fin-people', label: 'Follow-Through People', type: 'feature', description: 'Track transactions on behalf of others', children: [
          { id: 'c-persondetail', label: 'PersonDetailModal', type: 'component', file: 'src/components/finance/PersonDetailModal.tsx' },
          { id: 'c-repayment', label: 'RepaymentModal', type: 'component', file: 'src/components/finance/RepaymentModal.tsx' },
        ]},
        { id: 'fin-subscriptions', label: 'Subscriptions', type: 'feature', description: 'Subscription tracking, renewal, burden radar', children: [
          { id: 'c-substab', label: 'SubscriptionsTab', type: 'component', file: 'src/components/finance/SubscriptionsTab.tsx' },
          { id: 'c-submodal', label: 'SubscriptionModal', type: 'component', file: 'src/components/finance/SubscriptionModal.tsx' },
          { id: 'c-subburden', label: 'SubscriptionBurdenRadar', type: 'component', file: 'src/components/finance/SubscriptionBurdenRadar.tsx' },
        ]},
        { id: 'fin-budget', label: 'Budget & Expenses', type: 'feature', description: 'Bills, budget dashboard, expense tracking', children: [
          { id: 'c-budgetdash', label: 'BudgetExpensesDashboard', type: 'component', file: 'src/components/finance/budget-expenses/BudgetExpensesDashboard.tsx' },
        ]},
        { id: 'fin-recap', label: 'Monthly Recap', type: 'feature', description: 'AI-generated monthly financial summary', children: [
          { id: 'c-recap', label: 'RecapPanel', type: 'component', file: 'src/components/finance/RecapPanel.tsx' },
        ]},
        { id: 'fin-charts', label: 'Charts', type: 'feature', description: 'Spending analytics, wallet monthly chart', children: [
          { id: 'c-fincharts', label: 'FinanceChartsTab', type: 'component', file: 'src/components/finance/FinanceChartsTab.tsx' },
          { id: 'c-walletmonthly', label: 'WalletMonthlyChart', type: 'component', file: 'src/components/finance/WalletMonthlyChart.tsx' },
        ]},
      ],
    },
    {
      id: 'ai', label: 'AI Assistant', type: 'page', route: '/ai', accent: '#a855f7',
      children: [
        { id: 'ai-chat', label: 'Chat System', type: 'feature', description: 'Conversational AI with slash commands, voice, markdown', children: [
          { id: 'c-chatpanel', label: 'ChatPanel', type: 'component', file: 'src/components/ai/chat/ChatPanel.tsx' },
          { id: 'c-chatinput', label: 'ChatInput', type: 'component', file: 'src/components/ai/chat/ChatInput.tsx' },
          { id: 'c-messagebubble', label: 'MessageBubble', type: 'component', file: 'src/components/ai/chat/MessageBubble.tsx' },
          { id: 'c-useaichat', label: 'useAiChat', type: 'component', file: 'src/hooks/useAiChat.ts' },
          { id: 'c-slashcmd', label: 'SlashCommandManager', type: 'component', file: 'src/components/ai/chat/SlashCommandManager.tsx' },
        ]},
        { id: 'ai-canvas', label: 'Canvas Mode', type: 'feature', description: 'Freeform spatial card layout with drag/drop', children: [
          { id: 'c-canvascontainer', label: 'CanvasContainer', type: 'component', file: 'src/components/ai/canvas/CanvasContainer.tsx' },
          { id: 'c-canvasgrid', label: 'CanvasGrid', type: 'component', file: 'src/components/ai/canvas/CanvasGrid.tsx' },
          { id: 'c-canvascard', label: 'CanvasCard', type: 'component', file: 'src/components/ai/canvas/CanvasCard.tsx' },
          { id: 'c-groupcard', label: 'GroupCard', type: 'component', file: 'src/components/ai/canvas/GroupCard.tsx' },
        ]},
        { id: 'ai-cards', label: 'Card Types', type: 'feature', description: 'Focus, Plan, Finance, Digest, Reflect, Dynamic cards', children: [
          { id: 'c-focuscard', label: 'FocusCard', type: 'component', file: 'src/components/ai/canvas/cards/FocusCard.tsx' },
          { id: 'c-plancard', label: 'PlanCard', type: 'component', file: 'src/components/ai/canvas/cards/PlanCard.tsx' },
          { id: 'c-financecard', label: 'FinanceCard', type: 'component', file: 'src/components/ai/canvas/cards/FinanceCard.tsx' },
          { id: 'c-digestcard', label: 'DigestCard', type: 'component', file: 'src/components/ai/canvas/cards/DigestCard.tsx' },
          { id: 'c-reflectcard', label: 'ReflectCard', type: 'component', file: 'src/components/ai/canvas/cards/ReflectCard.tsx' },
          { id: 'c-dynamiccard', label: 'DynamicCard', type: 'component', file: 'src/components/ai/canvas/cards/DynamicCard.tsx' },
        ]},
        { id: 'ai-deck', label: 'Deck Mode', type: 'feature', description: 'Card-based layout with slot system', children: [
          { id: 'c-aipagedeck', label: 'AiPageDeck', type: 'component', file: 'src/components/ai/deck/AiPageDeck.tsx' },
          { id: 'c-focusboard', label: 'FocusBoard', type: 'component', file: 'src/components/ai/focus/FocusBoard.tsx' },
          { id: 'c-planboard', label: 'PlanBoard', type: 'component', file: 'src/components/ai/plan/PlanBoard.tsx' },
          { id: 'c-reflectfeed', label: 'ReflectFeed', type: 'component', file: 'src/components/ai/reflect/ReflectFeed.tsx' },
        ]},
        { id: 'ai-automations', label: 'Automations', type: 'feature', description: 'Rule-based actions with visual builder', children: [
          { id: 'c-automationlist', label: 'AutomationList', type: 'component', file: 'src/components/ai/automations/AutomationList.tsx' },
          { id: 'c-visualbuilder', label: 'VisualBuilderModal', type: 'component', file: 'src/components/ai/automations/VisualBuilder/VisualBuilderModal.tsx' },
        ]},
        { id: 'ai-compositions', label: 'Compositions', type: 'feature', description: 'DSL-based automation compositions', children: [
          { id: 'c-compositionpanel', label: 'CompositionPanel', type: 'component', file: 'src/components/ai/compositions/CompositionPanel.tsx' },
        ]},
        { id: 'ai-connectors', label: 'Connectors', type: 'feature', description: 'External data source integrations', children: [
          { id: 'c-connectorspanel', label: 'ConnectorsPanel', type: 'component', file: 'src/components/ai/connectors/ConnectorsPanel.tsx' },
        ]},
      ],
    },
    {
      id: 'ide', label: 'IDE Projects', type: 'page', route: '/ide', accent: '#06b6d4',
      children: [
        { id: 'ide-projects', label: 'Project Grid', type: 'feature', description: 'Project cards, detection, language info', children: [
          { id: 'c-projgrid', label: 'ProjectGrid (inline)', type: 'component', file: 'src/pages/IDEProjectsPage.tsx' },
        ]},
        { id: 'ide-aitools', label: 'AI Tools', type: 'feature', description: 'AI agent usage analytics, model/tool timelines', children: [
          { id: 'c-aitoolstab', label: 'AIToolsTab', type: 'component', file: 'src/components/ai/AIToolsTab.tsx' },
        ]},
        { id: 'ide-git', label: 'Git History', type: 'feature', description: 'Commits, contributors, DORA metrics', children: [
          { id: 'c-gitsection', label: 'GitSection (inline)', type: 'component', file: 'src/pages/IDEProjectsPage.tsx' },
        ]},
        { id: 'ide-workspace', label: 'Workspace Overlay', type: 'feature', description: 'Opens TerminalPage inside IDE page', children: [
          { id: 'c-termpage', label: 'TerminalPage (embedded)', type: 'component', file: 'src/pages/TerminalPage.tsx' },
        ]},
      ],
    },
    {
      id: 'external', label: 'External Activities', type: 'page', route: '/external', accent: '#ec4899',
      children: [
        { id: 'ext-mosaic', label: 'Activity Mosaic', type: 'feature', description: 'Treemap visualization of app/website usage', children: [
          { id: 'c-extpage', label: 'ExternalPage', type: 'component', file: 'src/pages/ExternalPage.tsx' },
        ]},
        { id: 'ext-sleep', label: 'Sleep Patterns', type: 'feature', description: 'Sleep tracking, popups, chart', children: [
          { id: 'c-sleepbar', label: 'SleepBarMini', type: 'component', file: 'src/components/dashboard/SleepBarMini.tsx' },
        ]},
        { id: 'ext-gaps', label: 'Gap Fill', type: 'feature', description: 'Smart fill for untracked time gaps', children: [
          { id: 'c-gapfillmodal', label: 'GapFillModal', type: 'component', file: 'src/components/external/GapFillModal.tsx' },
          { id: 'c-gapslist', label: 'GapsListModal', type: 'component', file: 'src/components/external/GapsListModal.tsx' },
        ]},
      ],
    },
    {
      id: 'settings', label: 'Settings', type: 'page', route: '/settings', accent: '#64748b',
      children: [
        { id: 'set-category', label: 'Category (Tier Assignment)', type: 'feature', description: 'Drag-drop app/website tier classification', children: [
          { id: 'c-settingspage', label: 'SettingsPage', type: 'component', file: 'src/pages/SettingsPage.tsx' },
        ]},
        { id: 'set-ai', label: 'AI Assistant Config', type: 'feature', description: 'Provider routing, API keys, diagnostics', children: [
          { id: 'c-providerdiag', label: 'ProviderDiagnostics', type: 'component', file: 'src/components/ProviderDiagnostics.tsx' },
        ]},
        { id: 'set-tracking', label: 'Tracking Config', type: 'feature', description: 'Browser profiles, sleep detection, game detection', children: [
          { id: 'c-browserprof', label: 'BrowserProfileSettings', type: 'component', file: 'src/components/BrowserProfileSettings.tsx' },
        ]},
      ],
    },
    {
      id: 'life', label: 'Life Phases', type: 'page', route: '/life', accent: '#f59e0b',
      children: [
        { id: 'life-river', label: 'River of Years', type: 'feature', description: 'Visual life timeline with phases, memories, covenant', children: [
          { id: 'c-liferiver', label: 'LifePage', type: 'component', file: 'src/features/warmth/LifePage.tsx' },
          { id: 'c-coresample', label: 'CoreSample', type: 'component', file: 'src/components/life-river/CoreSample.tsx' },
          { id: 'c-phasecard', label: 'PhaseCard', type: 'component', file: 'src/components/life-river/PhaseCard.tsx' },
          { id: 'c-rivermap', label: 'RiverMap', type: 'component', file: 'src/components/life-river/RiverMap.tsx' },
          { id: 'c-ringcanvas', label: 'RingCanvas', type: 'component', file: 'src/components/life-river/RingCanvas.tsx' },
        ]},
        { id: 'life-gold', label: 'Gold (Goals)', type: 'feature', description: 'Long-term goals, day ring, vault', children: [
          { id: 'c-goldpage', label: 'GoldPage', type: 'component', file: 'src/features/warmth/gold/GoldPage.tsx' },
        ]},
      ],
    },
    {
      id: 'learn', label: 'Lyceum Learn', type: 'page', route: '/learn', accent: '#8b5cf6',
      children: [
        { id: 'learn-library', label: 'Lesson Library', type: 'feature', description: 'Book cards, curriculum, search', children: [
          { id: 'c-learnpage', label: 'LearnPage', type: 'component', file: 'src/components/learn/LearnPage.tsx' },
          { id: 'c-bookcard', label: 'BookCard', type: 'component', file: 'src/components/learn/BookCard.tsx' },
          { id: 'c-lessonlibrary', label: 'LessonLibrary', type: 'component', file: 'src/components/learn/LessonLibrary.tsx' },
        ]},
        { id: 'learn-blocks', label: 'Lesson Blocks', type: 'feature', description: 'Mermaid, charts, illustrations, code, knowledge graph', children: [
          { id: 'c-blockrenderer', label: 'BlockRenderer', type: 'component', file: 'src/components/learn/blocks/BlockRenderer.tsx' },
          { id: 'c-mermaid', label: 'MermaidBlock', type: 'component', file: 'src/components/learn/blocks/MermaidBlock.tsx' },
          { id: 'c-chartblock', label: 'ChartBlock', type: 'component', file: 'src/components/learn/blocks/ChartBlock.tsx' },
          { id: 'c-illust', label: 'IllustrationBlock', type: 'component', file: 'src/components/learn/blocks/IllustrationBlock.tsx' },
          { id: 'c-knowledgegraph', label: 'KnowledgeGraphBlock', type: 'component', file: 'src/components/learn/blocks/KnowledgeGraphBlock.tsx' },
        ]},
        { id: 'learn-curriculum', label: 'Curriculum', type: 'feature', description: 'Branch hierarchy, prerequisite DAG', children: [
          { id: 'c-curriculum', label: 'CurriculumShowcase', type: 'component', file: 'src/components/learn/CurriculumShowcase.tsx' },
          { id: 'c-hierarchy', label: 'HierarchyGuide', type: 'component', file: 'src/components/learn/HierarchyGuide.tsx' },
          { id: 'c-curriculumgraph', label: 'CurriculumGraph', type: 'component', file: 'src/components/learn/CurriculumGraph.tsx' },
        ]},
      ],
    },
    {
      id: 'shared', label: 'Shared Infrastructure', type: 'page', accent: '#78716c',
      children: [
        { id: 'sh-ui', label: 'UI Primitives', type: 'feature', description: 'badge, button, dialog, switch, skeleton, tooltip, particles', children: [
          { id: 'c-button', label: 'Button', type: 'component', file: 'src/components/ui/button.tsx' },
          { id: 'c-dialog', label: 'Dialog', type: 'component', file: 'src/components/ui/dialog.tsx' },
          { id: 'c-switch', label: 'Switch', type: 'component', file: 'src/components/ui/switch.tsx' },
          { id: 'c-skeleton', label: 'Skeleton', type: 'component', file: 'src/components/ui/skeleton.tsx' },
          { id: 'c-particles', label: 'Particles', type: 'component', file: 'src/components/ui/particles.tsx' },
        ]},
        { id: 'sh-layout', label: 'Layout', type: 'feature', description: 'PageShell, GlassCard, SectionHeader, ErrorBoundary', children: [
          { id: 'c-pageshell', label: 'PageShell', type: 'component', file: 'src/components/PageShell.tsx' },
          { id: 'c-glasscard', label: 'GlassCard', type: 'component', file: 'src/components/GlassCard.tsx' },
          { id: 'c-sectionheader', label: 'SectionHeader', type: 'component', file: 'src/components/SectionHeader.tsx' },
          { id: 'c-errorboundary', label: 'ErrorBoundary', type: 'component', file: 'src/components/ErrorBoundary.tsx' },
        ]},
        { id: 'sh-services', label: 'Services', type: 'feature', description: 'Canvas persistence, intent parsing, notifications', children: [
          { id: 'c-canvaspersist', label: 'canvasPersistence', type: 'component', file: 'src/services/canvasPersistence.ts' },
          { id: 'c-intentparser', label: 'intentParser', type: 'component', file: 'src/services/intentParser.ts' },
          { id: 'c-notif', label: 'NotificationService', type: 'component', file: 'src/services/NotificationService.ts' },
        ]},
      ],
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────

function flattenNodes(node: ArchNode, acc: ArchNode[] = []): ArchNode[] {
  acc.push(node);
  if (node.children) {
    for (const child of node.children) flattenNodes(child, acc);
  }
  return acc;
}

function findNode(id: string, node: ArchNode = ARCHITECTURE_DATA): ArchNode | null {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNode(id, child);
      if (found) return found;
    }
  }
  return null;
}

function countDescendants(node: ArchNode, type: ArchNode['type']): number {
  let count = 0;
  if (node.type === type) count++;
  if (node.children) {
    for (const child of node.children) count += countDescendants(child, type);
  }
  return count;
}

// ─── Main Component ───────────────────────────────────────────────

export function CodeArchitectureMap({ projectPath }: { projectPath: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set(['dashboard', 'terminal', 'finance', 'ai']));
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [viewingFile, setViewingFile] = useState<{ path: string; name: string; content: string } | null>(null);
  const [typeFilter, setTypeFilter] = useState<Set<ArchNode['type']>>(new Set());
  const [showFilter, setShowFilter] = useState(false);
  const graphRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);

  // Count stats
  const stats = useMemo(() => ({
    pages: countDescendants(ARCHITECTURE_DATA, 'page'),
    features: countDescendants(ARCHITECTURE_DATA, 'feature'),
    components: countDescendants(ARCHITECTURE_DATA, 'component'),
  }), []);

  // Search filtering
  const searchMatches = useMemo(() => {
    if (!searchQuery) return null;
    const q = searchQuery.toLowerCase();
    const all = flattenNodes(ARCHITECTURE_DATA);
    return new Set(all.filter(n => n.label.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q)).map(n => n.id));
  }, [searchQuery]);

  // Toggle page expansion
  const togglePage = (id: string) => {
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle feature expansion
  const toggleFeature = (id: string) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // View file content
  const handleViewFile = useCallback(async (file: string) => {
    if (!window.deskflowAPI?.readProjectFile) return;
    try {
      const result = await (window.deskflowAPI as any).readProjectFile(file, projectPath);
      if (result?.success && typeof result.data === 'string') {
        const name = file.split('/').pop() || file;
        setViewingFile({ path: file, name, content: result.data });
      }
    } catch {}
  }, [projectPath]);

  // Build graph data for cytoscape
  const graphElements = useMemo(() => {
    const nodes: any[] = [];
    const edges: any[] = [];
    const pages = ARCHITECTURE_DATA.children || [];

    for (const page of pages) {
      // Page node
      nodes.push({
        data: { id: page.id, label: page.label, type: 'page', color: NODE_CONFIG.page.color },
        classes: 'page',
      });

      if (page.children) {
        for (const feature of page.children) {
          // Feature node
          nodes.push({
            data: { id: feature.id, label: feature.label, type: 'feature', color: page.accent || NODE_CONFIG.feature.color },
            classes: 'feature',
          });
          edges.push({ data: { source: page.id, target: feature.id, type: 'hierarchy' } });

          if (feature.children) {
            for (const comp of feature.children) {
              // Component node
              nodes.push({
                data: { id: comp.id, label: comp.label, type: 'component', color: NODE_CONFIG.component.color },
                classes: 'component',
              });
              edges.push({ data: { source: feature.id, target: comp.id, type: 'hierarchy' } });
            }
          }
        }
      }
    }

    return { nodes, edges };
  }, []);

  // Initialize cytoscape
  useEffect(() => {
    if (!graphRef.current || graphElements.nodes.length === 0) return;

    let cy: any = null;

    import('cytoscape').then((cytoscapeModule) => {
      const cytoscape = cytoscapeModule.default;
      import('cytoscape-dagre').then((dagreModule) => {
        cytoscape.use(dagreModule.default);

        if (cyRef.current) cyRef.current.destroy();

        cy = cytoscape({
          container: graphRef.current,
          elements: graphElements,
          style: [
            {
              selector: 'node',
              style: {
                'label': 'data(label)',
                'background-color': 'data(color)',
                'color': '#e4e4e7',
                'font-size': '9px',
                'text-valign': 'bottom',
                'text-margin-y': 3,
                'width': 16,
                'height': 16,
                'border-width': 1,
                'border-color': 'data(color)',
                'border-opacity': 0.4,
              } as any,
            },
            {
              selector: 'node.page',
              style: { width: 30, height: 30, 'font-size': '11px', 'font-weight': 'bold' as any, 'text-margin-y': 6 },
            },
            {
              selector: 'node.feature',
              style: { width: 20, height: 20, 'font-size': '10px' },
            },
            {
              selector: 'node:selected',
              style: { 'background-color': '#fbbf24', 'border-color': '#fbbf24', 'border-width': 2, 'color': '#fbbf24' } as any,
            },
            {
              selector: 'edge',
              style: { 'width': 0.8, 'line-color': '#27272a', 'opacity': 0.3, 'curve-style': 'bezier' } as any,
            },
          ],
          layout: { name: 'dagre', rankDir: 'TB', padding: 30, spacingFactor: 1.3, nodeDimensionsIncludeLabels: true } as any,
          minZoom: 0.15,
          maxZoom: 3,
          wheelSensitivity: 0.2,
        });

        cy.on('tap', 'node', (evt: any) => setSelectedNode(evt.target.id()));
        cyRef.current = cy;
      });
    }).catch(() => {});

    return () => { if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; } };
  }, [graphElements]);

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.3);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() / 1.3);
  const handleFit = () => cyRef.current?.fit(undefined, 30);

  const selectedNodeData = selectedNode ? findNode(selectedNode) : null;

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60 shrink-0">
        <Network className="w-4 h-4 text-cyan-400" />
        <h2 className="text-sm font-semibold text-zinc-200">Architecture Map</h2>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span>{stats.pages} pages</span>
          <span>·</span>
          <span>{stats.features} features</span>
          <span>·</span>
          <span>{stats.components} components</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setShowFilter(!showFilter)} className={`p-1.5 rounded transition-colors ${showFilter ? 'bg-cyan-500/15 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40'}`} title="Filter">
            <Filter className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleZoomIn} className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors" title="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></button>
          <button onClick={handleZoomOut} className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors" title="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></button>
          <button onClick={handleFit} className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors" title="Fit"><Maximize2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-zinc-800/40 shrink-0">
        <div className="relative">
          <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search pages, features, components..." className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/40" />
        </div>
      </div>

      {/* Type filter */}
      {showFilter && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-800/40 shrink-0 flex-wrap">
          {(['page', 'feature', 'component'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(prev => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n; })}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${typeFilter.has(t) ? 'ring-1' : 'opacity-40 hover:opacity-70'}`}
              style={{ backgroundColor: typeFilter.has(t) ? `${NODE_CONFIG[t].color}20` : 'transparent', color: NODE_CONFIG[t].color } as any}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: NODE_CONFIG[t].color }} />
              {NODE_CONFIG[t].label}
            </button>
          ))}
        </div>
      )}

      {/* Main: tree + graph */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Feature tree */}
        <div className="w-[280px] shrink-0 border-r border-zinc-800/40 overflow-y-auto">
          {ARCHITECTURE_DATA.children?.map(page => (
            <FeatureTreePage
              key={page.id}
              node={page}
              expandedPages={expandedPages}
              expandedFeatures={expandedFeatures}
              togglePage={togglePage}
              toggleFeature={toggleFeature}
              selectedNode={selectedNode}
              onSelect={setSelectedNode}
              searchMatches={searchMatches}
              typeFilter={typeFilter}
            />
          ))}
        </div>

        {/* Right: graph or file viewer */}
        <div className="flex-1 relative min-w-0">
          {viewingFile ? (
            <FileViewerPanel path={viewingFile.path} name={viewingFile.name} content={viewingFile.content} onClose={() => setViewingFile(null)} />
          ) : (
            <>
              <div ref={graphRef} className="absolute inset-0" />
              {selectedNodeData && (
                <FeatureDetailPanel node={selectedNodeData} onClose={() => setSelectedNode(null)} onViewFile={handleViewFile} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Feature Tree: Page node ──────────────────────────────────────

function FeatureTreePage({ node, expandedPages, expandedFeatures, togglePage, toggleFeature, selectedNode, onSelect, searchMatches, typeFilter }: {
  node: ArchNode;
  expandedPages: Set<string>;
  expandedFeatures: Set<string>;
  togglePage: (id: string) => void;
  toggleFeature: (id: string) => void;
  selectedNode: string | null;
  onSelect: (id: string) => void;
  searchMatches: Set<string> | null;
  typeFilter: Set<ArchNode['type']>;
}) {
  const isExpanded = expandedPages.has(node.id);
  const isSelected = selectedNode === node.id;
  const featureCount = node.children?.length || 0;

  // Filter check
  if (typeFilter.size > 0 && !typeFilter.has('page')) return null;
  if (searchMatches && !searchMatches.has(node.id) && !node.children?.some(f => searchMatches.has(f.id) || f.children?.some(c => searchMatches.has(c.id)))) return null;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-cyan-500/10' : 'hover:bg-zinc-800/40'}`}
        onClick={() => { togglePage(node.id); onSelect(node.id); }}
      >
        {isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />}
        <Route className="w-3.5 h-3.5 shrink-0" style={{ color: node.accent || NODE_CONFIG.page.color }} />
        <span className="text-xs font-semibold text-zinc-200 truncate">{node.label}</span>
        {node.route && <span className="text-[9px] text-zinc-600 font-mono">{node.route}</span>}
        <span className="text-[9px] text-zinc-600 ml-auto">{featureCount}</span>
      </div>

      {isExpanded && node.children?.map(feature => (
        <FeatureTreeFeature
          key={feature.id}
          node={feature}
          pageAccent={node.accent}
          expandedFeatures={expandedFeatures}
          toggleFeature={toggleFeature}
          selectedNode={selectedNode}
          onSelect={onSelect}
          searchMatches={searchMatches}
          typeFilter={typeFilter}
        />
      ))}
    </div>
  );
}

// ─── Feature Tree: Feature node ───────────────────────────────────

function FeatureTreeFeature({ node, pageAccent, expandedFeatures, toggleFeature, selectedNode, onSelect, searchMatches, typeFilter }: {
  node: ArchNode;
  pageAccent?: string;
  expandedFeatures: Set<string>;
  toggleFeature: (id: string) => void;
  selectedNode: string | null;
  onSelect: (id: string) => void;
  searchMatches: Set<string> | null;
  typeFilter: Set<ArchNode['type']>;
}) {
  const isExpanded = expandedFeatures.has(node.id);
  const isSelected = selectedNode === node.id;
  const compCount = node.children?.length || 0;

  if (typeFilter.size > 0 && !typeFilter.has('feature') && !typeFilter.has('component')) return null;
  if (searchMatches && !searchMatches.has(node.id) && !node.children?.some(c => searchMatches.has(c.id))) return null;

  return (
    <div>
      <div
        className={`flex items-center gap-2 pl-7 pr-3 py-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-cyan-500/10' : 'hover:bg-zinc-800/30'}`}
        onClick={() => { toggleFeature(node.id); onSelect(node.id); }}
      >
        {isExpanded ? <ChevronDown className="w-3 h-3 text-zinc-600 shrink-0" /> : <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />}
        <Puzzle className="w-3 h-3 shrink-0" style={{ color: pageAccent || NODE_CONFIG.feature.color }} />
        <span className="text-[11px] text-zinc-300 truncate">{node.label}</span>
        <span className="text-[9px] text-zinc-600 ml-auto">{compCount}</span>
      </div>

      {isExpanded && node.children?.map(comp => (
        <div
          key={comp.id}
          className={`flex items-center gap-2 pl-14 pr-3 py-1 cursor-pointer transition-colors ${selectedNode === comp.id ? 'bg-cyan-500/10' : 'hover:bg-zinc-800/20'}`}
          onClick={() => onSelect(comp.id)}
        >
          <Box className="w-3 h-3 shrink-0" style={{ color: NODE_CONFIG.component.color }} />
          <span className="text-[10px] text-zinc-400 truncate">{comp.label}</span>
          {comp.file && <ExternalLink className="w-2.5 h-2.5 text-zinc-600 ml-auto shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// ─── Feature Detail Panel ─────────────────────────────────────────

function FeatureDetailPanel({ node, onClose, onViewFile }: {
  node: ArchNode;
  onClose: () => void;
  onViewFile: (file: string) => void;
}) {
  const config = NODE_CONFIG[node.type];
  const Icon = config.icon;
  const children = node.children || [];

  return (
    <div className="absolute bottom-3 right-3 w-72 bg-zinc-900/95 border border-zinc-800/60 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/40">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: config.color }} />
          <span className="text-xs font-medium text-zinc-200 truncate">{node.label}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800/40 text-zinc-500 hover:text-zinc-300 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="px-3 py-2 space-y-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${config.color}20`, color: config.color }}>
            {config.label}
          </span>
          {node.route && <span className="text-[10px] text-zinc-500 font-mono">{node.route}</span>}
        </div>
        {node.description && <div className="text-zinc-400 text-[11px]">{node.description}</div>}
        {node.file && (
          <button onClick={() => onViewFile(node.file!)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors">
            <Eye className="w-3 h-3" /> View file
          </button>
        )}
        {children.length > 0 && (
          <div>
            <div className="text-zinc-500 mb-1">{children.length} child{children.length !== 1 ? 'ren' : ''}</div>
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {children.map(c => {
                const cc = NODE_CONFIG[c.type];
                const CIcon = cc.icon;
                return (
                  <div key={c.id} className="flex items-center gap-1.5 text-[10px]">
                    <CIcon className="w-2.5 h-2.5 shrink-0" style={{ color: cc.color }} />
                    <span className="text-zinc-400 truncate">{c.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── File Viewer Panel (kept from original) ───────────────────────

function FileViewerPanel({ path, name, content, onClose }: { path: string; name: string; content: string; onClose: () => void }) {
  const lines = content.split('\n');
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => { try { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };
  const ext = name.split('.').pop() || '';
  const lang = ext === 'tsx' || ext === 'jsx' ? 'tsx' : ext === 'ts' ? 'ts' : ext === 'css' ? 'css' : ext === 'json' ? 'json' : ext === 'md' ? 'md' : 'text';

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/60 shrink-0 bg-zinc-900/60">
        <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-zinc-200 truncate">{name}</div>
          <div className="text-[10px] text-zinc-500 truncate">{path}</div>
        </div>
        <span className="text-[10px] text-zinc-600 shrink-0">{lines.length} lines</span>
        <button onClick={handleCopy} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-colors">
          {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button onClick={onClose} className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex-1 overflow-auto font-mono text-[11px] leading-[1.6]">
        <table className="w-full border-collapse"><tbody>
          {lines.map((line, i) => (
            <tr key={i} className="hover:bg-zinc-800/30">
              <td className="w-12 shrink-0 text-right pr-4 pl-4 py-0 text-zinc-600 select-none text-[10px] align-top">{i + 1}</td>
              <td className="px-4 py-0 whitespace-pre text-zinc-300"><CodeLine text={line} lang={lang} /></td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}

// ─── CodeLine (kept from original) ────────────────────────────────

function CodeLine({ text, lang }: { text: string; lang: string }) {
  if (lang === 'tsx' || lang === 'ts') {
    return <span>{text.split(/(\b(?:import|export|from|const|let|var|function|return|if|else|for|while|class|extends|implements|interface|type|enum|async|await|new|try|catch|throw|typeof|instanceof|switch|case|default|break|continue|null|undefined|true|false|this|super)\b)/g).map((part, i) => /^(import|export|from|const|let|var|function|return|if|else|for|while|class|extends|implements|interface|type|enum|async|await|new|try|catch|throw|typeof|instanceof|switch|case|default|break|continue|null|undefined|true|false|this|super)$/.test(part) ? <span key={i} className="text-purple-400">{part}</span> : <span key={i}>{part}</span>)}</span>;
  }
  if (lang === 'css') {
    return <span>{text.split(/(\b(?:display|flex|grid|position|margin|padding|width|height|color|background|border|font|text|align|justify|gap|overflow|opacity|transition|transform|animation|z-index)\b)/g).map((part, i) => /^(display|flex|grid|position|margin|padding|width|height|color|background|border|font|text|align|justify|gap|overflow|opacity|transition|transform|animation|z-index)$/.test(part) ? <span key={i} className="text-sky-400">{part}</span> : <span key={i}>{part}</span>)}</span>;
  }
  if (lang === 'json') {
    return <span>{text.split(/("[\w-]+")\s*:/g).map((part, i) => i % 2 === 1 ? <span key={i} className="text-amber-400">{part}</span> : <span key={i}>{part}</span>)}</span>;
  }
  if (lang === 'md') {
    if (text.startsWith('#')) return <span className="text-cyan-400 font-semibold">{text}</span>;
    if (text.startsWith('-') || text.startsWith('*')) return <span className="text-zinc-400">{text}</span>;
    if (text.startsWith('```')) return <span className="text-purple-400">{text}</span>;
  }
  return <span>{text}</span>;
}
