import type { TutorialStep } from '../hooks/useTutorial';

export const TUTORIAL_STEPS: Record<string, TutorialStep[]> = {
  dashboard: [
    {
      target: '[data-tutorial="orbit"]',
      title: '3D Orbit System',
      instruction: '• Drag to rotate the camera around your usage solar system\n• Scroll to zoom in and out of app-planets',
      position: 'center',
    },
    {
      target: '[data-tutorial="heatmap"]',
      title: 'Activity Heatmap',
      instruction: '• Click any cell to drill into hourly data\n• Hover for tooltips showing exact usage minutes',
      position: 'bottom',
    },
    {
      target: '[data-tutorial="weekly-overview"]',
      title: 'Weekly Overview',
      instruction: '• View total hours per day in the bar chart\n• Top apps appear below with individual breakdowns',
      position: 'bottom',
    },
    {
      target: '[data-tutorial="recent-sessions"]',
      title: 'Recent Sessions',
      instruction: '• Browse your most recent app and website sessions\n• Click a session for detailed time breakdown',
      position: 'bottom',
    },
  ],
  'ai-assistant': [
    {
      target: '[data-tutorial="ai.daily-plan"]',
      title: 'Daily plan',
      instruction: '• Read today\'s focus goals',
      position: 'right',
    },
    {
      target: '[data-tutorial="ai.context"]',
      title: 'Context summary',
      instruction: '• Confirm AI knows your week',
      position: 'left',
    },
    {
      target: '[data-tutorial="ai.my-plan"]',
      title: 'Edit your plan',
      instruction: '• Toggle goals as you complete them\n• Add a new goal inline',
      position: 'top',
    },
    {
      target: '[data-tutorial="ai.review"]',
      title: 'Evening review',
      instruction: '• Compose end-of-day notes\n• Save to capture reflection',
      position: 'top',
    },
  ],
  orbit: [
    {
      target: '[data-tutorial="orbit-scene"]',
      title: 'Interactive Canvas',
      instruction: '• Drag anywhere to rotate the 3D solar system\n• Use scroll wheel to zoom in and out',
      position: 'center',
    },
    {
      target: '[data-tutorial="planet"]',
      title: 'App Planets',
      instruction: '• Each planet scales by app usage time\n• Click any planet for detailed app stats',
      position: 'center',
    },
    {
      target: '[data-tutorial="orbit-controls"]',
      title: 'Orbit Controls',
      instruction: '• Use orbit rings to see category relationships\n• Hover over planets for quick tooltip stats',
      position: 'top',
    },
  ],
  stats: [
    {
      target: '[data-tutorial="app-list"]',
      title: 'Sorted App List',
      instruction: '• View apps ranked by time spent\n• Switch between focus time and total time modes',
      position: 'right',
    },
    {
      target: '[data-tutorial="category-breakdown"]',
      title: 'Category Charts',
      instruction: '• Switch between pie, bar, and line chart views\n• Click chart segments to drill into filtered data',
      position: 'left',
    },
    {
      target: '[data-tutorial="period-selector"]',
      title: 'Time Range',
      instruction: '• Select date range to filter all stats\n• Export filtered data as CSV or JSON',
      position: 'top',
    },
  ],
  browser: [
    {
      target: '[data-tutorial="browser-selector"]',
      title: 'Browser Selection',
      instruction: '• Choose which browser to view data from\n• Check extension connection status indicator',
      position: 'top',
    },
    {
      target: '[data-tutorial="domain-list"]',
      title: 'Domain Stats',
      instruction: '• Browse domains sorted by time spent\n• View category tags per domain',
      position: 'right',
    },
    {
      target: '[data-tutorial="live-toggle"]',
      title: 'Live Tracking',
      instruction: '• Toggle live browser tracking on and off\n• Summary cards show top domains at a glance',
      position: 'bottom',
    },
  ],
  external: [
    {
      target: '[data-tutorial="active-timer"]',
      title: 'Activity Timer',
      instruction: '• Click Start to begin tracking an activity\n• Stop or pause the timer when finished',
      position: 'top',
    },
    {
      target: '[data-tutorial="activity-grid"]',
      title: 'Quick Logging',
      instruction: '• Click activity tiles to log sessions instantly\n• Add category tags to organize your entries',
      position: 'center',
    },
    {
      target: '[data-tutorial="sleep-chart"]',
      title: 'Sleep Timeline',
      instruction: '• View your sleep patterns on a 24-hour timeline\n• Log sleep sessions manually with the entry form',
      position: 'bottom',
    },
    {
      target: '[data-tutorial="consistency-score"]',
      title: 'Consistency Tracking',
      instruction: '• View your streak count and consistency trends\n• Track patterns over days, weeks, and months',
      position: 'bottom',
    },
  ],
  productivity: [
    {
      target: '[data-tutorial="productivity-score"]',
      title: 'Productivity Score',
      instruction: '• View your 0-to-100 productivity rating\n• Score updates based on app category weights',
      position: 'top',
    },
    {
      target: '[data-tutorial="time-breakdown"]',
      title: 'Time Breakdown',
      instruction: '• See time split across productive, neutral, and distracting\n• Compare app vs website productivity',
      position: 'center',
    },
    {
      target: '[data-tutorial="trend-chart"]',
      title: 'Trend Analysis',
      instruction: '• Track productivity trends over selected periods\n• Identify your most distracting apps and patterns',
      position: 'bottom',
    },
  ],
  settings: [
    {
      target: '[data-tutorial="category-manager"]',
      title: 'Categories',
      instruction: '• Create and edit categories with custom colors\n• Assign color coding and labels to each category',
      position: 'right',
    },
    {
      target: '[data-tutorial="productivity-tiers"]',
      title: 'Productivity Tiers',
      instruction: '• Drag and drop apps into productive, neutral, or distracting\n• Reassign apps between tiers at any time',
      position: 'center',
    },
    {
      target: '[data-tutorial="ai-settings"]',
      title: 'AI Configuration',
      instruction: '• Configure AI-powered auto-categorization\n• Adjust timer behavior and manage data sync backups',
      position: 'bottom',
    },
  ],
  terminal: [
    {
      target: '[data-tutorial="terminal-panes"]',
      title: 'Terminal Panes',
      instruction: '• Split and manage multiple xterm.js terminal panes\n• Each pane runs independently with full shell access',
      position: 'center',
    },
    {
      target: '[data-tutorial="session-panel"]',
      title: 'Session Management',
      instruction: '• Save, load, and categorize terminal sessions\n• Switch between sessions without losing state',
      position: 'right',
    },
    {
      target: '[data-tutorial="project-selector"]',
      title: 'Project Context',
      instruction: '• Select active projects for targeted agent context\n• Assign agents from 5 available types to tasks',
      position: 'top',
    },
  ],
  context: [
    {
      target: '[data-tutorial="system-toggles"]',
      title: 'Knowledge Systems',
      instruction: '• Toggle 6 main knowledge systems on and off\n• Each system feeds context to AI agents',
      position: 'right',
    },
    {
      target: '[data-tutorial="token-sliders"]',
      title: 'Token Budgets',
      instruction: '• Adjust token budget sliders per knowledge system\n• Fine-tune how much context each system provides',
      position: 'center',
    },
    {
      target: '[data-tutorial="model-selector"]',
      title: 'Model Tiers',
      instruction: '• Select the AI model tier for interactions\n• Preview assembled context before sending to agents',
      position: 'bottom',
    },
  ],
  problems: [
    {
      target: '[data-tutorial="problem-list"]',
      title: 'Problem Tracker',
      instruction: '• Browse bugs and features with status filters\n• Use priority colors to identify critical issues',
      position: 'center',
    },
    {
      target: '[data-tutorial="checklist"]',
      title: 'Checklist Items',
      instruction: '• Track checklist items that auto-update from AI agents\n• Create new items directly from problem descriptions',
      position: 'right',
    },
    {
      target: '[data-tutorial="activity-log"]',
      title: 'Activity History',
      instruction: '• Review every change and assignment in the log\n• Assign problems directly to terminal sessions',
      position: 'bottom',
    },
  ],
  design: [
    {
      target: '[data-tutorial="taste-knobs"]',
      title: 'Taste Controls',
      instruction: '• Adjust taste knobs to tune design output direction\n• Control variance, motion, and density sliders',
      position: 'top',
    },
    {
      target: '[data-tutorial="skill-modules"]',
      title: 'Design Skills',
      instruction: '• Toggle 5 skill modules covering layout and color\n• Manage style references for brand consistency',
      position: 'center',
    },
    {
      target: '[data-tutorial="stitch-integration"]',
      title: 'Screen Generation',
      instruction: '• Generate screens directly via Stitch integration\n• Apply design system tokens to generated output',
      position: 'bottom',
    },
  ],
  skills: [
    {
      target: '[data-tutorial="skills-browser"]',
      title: 'Skills Browser',
      instruction: '• Search and filter available agent skills\n• Browse SKILL.md file definitions inline',
      position: 'center',
    },
    {
      target: '[data-tutorial="skill-toggles"]',
      title: 'Skill Toggles',
      instruction: '• Toggle individual skills on and off\n• Compose skill stacks to define agent behavior',
      position: 'right',
    },
    {
      target: '[data-tutorial="skill-stack"]',
      title: 'Skill Composition',
      instruction: '• Combine multiple skills to create custom behaviors\n• Create new skill definitions for custom agents',
      position: 'bottom',
    },
  ],
  graphify: [
    {
      target: '[data-tutorial="graph-canvas"]',
      title: 'Knowledge Graph',
      instruction: '• View AST analysis of your codebase structure\n• See community-detected logical code groupings',
      position: 'center',
    },
    {
      target: '[data-tutorial="community-view"]',
      title: 'Communities',
      instruction: '• Browse clustered community groups from graph analysis\n• Each community represents related code modules',
      position: 'right',
    },
    {
      target: '[data-tutorial="export-controls"]',
      title: 'Export Options',
      instruction: '• Export graphs as HTML for interactive viewing\n• Export as JSON for programmatic analysis',
      position: 'bottom',
    },
  ],
  'ide-projects': [
    {
      target: '[data-tutorial="ide-tabs"]',
      title: 'Workspace Tabs',
      instruction: '• Switch between overview, IDEs, tools, and projects\n• Navigate AI, git, and trash tab views',
      position: 'top',
    },
    {
      target: '[data-tutorial="metric-cards"]',
      title: 'Workspace Stats',
      instruction: '• View workspace statistics in compact metric cards\n• Track project counts, tool usage, and activity',
      position: 'center',
    },
    {
      target: '[data-tutorial="ai-usage-chart"]',
      title: 'AI Usage Chart',
      instruction: '• View token counts and cost breakdowns\n• Track AI agent consumption across projects',
      position: 'bottom',
    },
  ],
  'feature-specs': [
    {
      target: '[data-tutorial="feature-spec-sidebar"]',
      title: 'Spec Sidebar',
      instruction: '• Browse all features organized by category\n• Search to filter specs by name or description\n• Click any feature to view its full specification',
      position: 'right',
    },
    {
      target: '[data-tutorial="feature-spec-detail"]',
      title: 'Feature Detail',
      instruction: '• View sections, components, IPC endpoints, and data flows\n• See connected pages for cross-feature dependencies',
      position: 'left',
    },
    {
      target: '[data-tutorial="feature-spec-copy-all"]',
      title: 'Copy Specs',
      instruction: '• Click "Copy All" to copy all specs as markdown\n• Click the copy icon on any spec for individual markdown',
      position: 'top',
    },
    {
      target: '[data-tutorial="feature-spec-md-toggle"]',
      title: 'MD View',
      instruction: '• Toggle MD View to see the raw markdown version\n• Great for reviewing what the AI will use',
      position: 'top',
    },
    {
      target: '[data-tutorial="feature-spec-sections"]',
      title: 'Sections & Components',
      instruction: '• Each section lists its components with file paths\n• Component props and descriptions provide implementation detail',
      position: 'center',
    },
    {
      target: '[data-tutorial="feature-spec-ipc"]',
      title: 'IPC Endpoints',
      instruction: '• Every IPC method is documented with params and return types\n• Use this as a reference when adding new IPC calls',
      position: 'center',
    },
  ],
  database: [
    {
      target: '[data-tutorial="table-browser"]',
      title: 'Table Browser',
      instruction: '• Browse all database tables with live search\n• View schema details including column types',
      position: 'top',
    },
    {
      target: '[data-tutorial="data-table"]',
      title: 'Data View',
      instruction: '• Scroll through paginated, sortable table data\n• Click column headers to sort by any field',
      position: 'center',
    },
    {
      target: '[data-tutorial="analytics-charts"]',
      title: 'Analytics Charts',
      instruction: '• Switch chart views for tokens, costs, and sessions\n• Export table data to CSV for external analysis',
      position: 'bottom',
    },
  ],
};
