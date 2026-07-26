export interface ComponentSpec {
  name: string;
  file: string;
  description: string;
  props?: Array<{ name: string; type: string; description: string }>;
}

export interface PageSection {
  name: string;
  selector?: string;
  description: string;
  components: ComponentSpec[];
}

export interface IPCEndpoint {
  method: string;
  params: string;
  returns: string;
  description: string;
}

export interface DataFlow {
  from: string;
  to: string;
  data: string;
  description: string;
}

export interface FeatureSpec {
  id: string;
  name: string;
  route: string;
  icon: string;
  category: string;
  status: 'released' | 'beta' | 'planned' | 'deprecated';
  description: string;
  filePath: string;
  whatYoullFind: string[];
  whatYouCanDo: string[];
  sections: PageSection[];
  ipcEndpoints: IPCEndpoint[];
  dataFlows: DataFlow[];
  connectedPages: string[];
  pitfalls?: string[];
}

export interface NavItemSpec {
  label: string;
  icon: string;
  path: string;
  group: 'primary' | 'secondary';
  order: number;
}

export interface GlobalFeature {
  name: string;
  description: string;
  location: string;
}

export const SIDEBAR_NAV: NavItemSpec[] = [
  { label: 'Dashboard', icon: 'Home', path: '/', group: 'primary', order: 0 },
  { label: 'Productivity', icon: 'Target', path: '/productivity', group: 'primary', order: 1 },
  { label: 'Applications', icon: 'PieChart', path: '/stats', group: 'primary', order: 2 },
  { label: 'Browser Activity', icon: 'Globe', path: '/browser', group: 'primary', order: 3 },
  { label: 'IDE Projects', icon: 'Code2', path: '/ide', group: 'primary', order: 4 },
  { label: 'External', icon: 'Clock4', path: '/external', group: 'primary', order: 5 },
  { label: 'AI Assistant', icon: 'Bot', path: '/ai', group: 'primary', order: 6 },
  { label: 'Insights', icon: 'BarChart3', path: '/reports', group: 'secondary', order: 7 },
  { label: 'Database', icon: 'Database', path: '/database', group: 'secondary', order: 8 },
  { label: 'Settings', icon: 'Settings', path: '/settings', group: 'secondary', order: 9 },
  { label: 'Tutorial', icon: 'HelpCircle', path: '/tutorial', group: 'secondary', order: 10 },
];

export const TOP_NAV_FEATURES: GlobalFeature[] = [
  { name: 'Timer', description: 'Live tracking timer with pause/stop/start + idle detection', location: 'App top bar, left of period selector' },
  { name: 'Period Selector', description: 'Today/Week/Month/All dropdown with date offset navigation', location: 'App top bar' },
  { name: 'Time Mode Toggle', description: 'Focus time vs Total time mode switch', location: 'App top bar, right side' },
  { name: 'Search Command Palette', description: 'Quick navigation and command search (Cmd+K)', location: 'App-wide via keyboard shortcut' },
  { name: 'Live Activity Feed', description: 'Real-time activity stream showing app/browser/IDE switches', location: 'App top bar dropdown' },
];

export const GLOBAL_COMPONENTS: GlobalFeature[] = [
  { name: 'PageShell', description: 'Consistent layout wrapper with sticky header, overflow handling, and page accent', location: 'src/components/PageShell.tsx' },
  { name: 'GlassCard', description: 'Dark glass-morphism card with blur backdrop, variants for interactive/elevated/default', location: 'src/components/GlassCard.tsx' },
  { name: 'SectionHeader', description: 'Section title component with optional action button and icon', location: 'src/components/SectionHeader.tsx' },
  { name: 'EmptyState', description: 'Centered empty state with icon, title, and description', location: 'src/components/EmptyState.tsx' },
  { name: 'AfkPromptModal', description: 'Modal shown after idle period to confirm return or continue sleep', location: 'src/components/AfkPromptModal.tsx' },
  { name: 'GapPanel', description: 'Panel showing gaps in tracking with sleep/away suggestions', location: 'src/components/GapPanel.tsx' },
];

export const FEATURE_SPECS: FeatureSpec[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    route: '/',
    icon: 'Home',
    category: 'Core',
    status: 'released',
    description: 'Your command center — see everything at a glance with 3D orbit, heatmap, and weekly stats.',
    filePath: 'src/App.tsx (inline), src/components/OrbitSystem.tsx',
    whatYoullFind: [
      '3D orbit system — planets scaled by app usage time',
      'Activity heatmap — 7x24 grid showing daily intensity',
      'Weekly overview bar chart with top apps and total hours',
      'Quick stats cards for instant insights and recent sessions feed',
    ],
    whatYouCanDo: [
      'Click a planet to see detailed app stats',
      'Click heatmap cells to drill into hourly data',
      'Hover for tooltips across all visualizations',
      'Use period selector to change the displayed time range',
    ],
    sections: [
      {
        name: '3D Orbit System',
        selector: '[data-tutorial="orbit"]',
        description: 'Interactive Three.js solar system with app-planets, glow effects, and orbit rings',
        components: [
          { name: 'OrbitSystem', file: 'src/components/OrbitSystem.tsx', description: 'Three.js rendered 3D scene with planets, particles, orbit controls' },
          { name: 'OrbitSystemWrapper', file: 'src/App.tsx', description: 'Memoized wrapper with suspense fallback for lazy loading' },
        ],
      },
      {
        name: 'Activity Heatmap',
        selector: '[data-tutorial="heatmap"]',
        description: '7-day x 24-hour grid with color-coded intensity per half-hour block',
        components: [
          { name: 'App.tsx inline heatmap', file: 'src/App.tsx', description: 'Heatmap grid rendered inline in App.tsx with color intensity mapping' },
        ],
      },
      {
        name: 'Weekly Overview',
        selector: '[data-tutorial="weekly-overview"]',
        description: 'Bar chart showing total hours per day with top apps breakdown below',
        components: [
          { name: 'App.tsx inline chart', file: 'src/App.tsx', description: 'Weekly bar chart using Chart.js Bar with rounded corners and custom tooltips' },
        ],
      },
      {
        name: 'Recent Sessions',
        selector: '[data-tutorial="recent-sessions"]',
        description: 'Live feed of the most recent app, browser, and IDE sessions',
        components: [
          { name: 'App.tsx inline session feed', file: 'src/App.tsx', description: 'Scrollable recent sessions list with app icons and duration' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'getDashboardData', params: '{ period, dateOffset }', returns: '{ success, data, error }', description: 'Pre-computed dashboard data including hourly,daily,topApps,recentSessions' },
      { method: 'getLogsByPeriod', params: '{ period, dateOffset }', returns: 'Log[]', description: 'Filtered activity logs by period with offset' },
    ],
    dataFlows: [
      { from: 'main.ts (SQLite)', to: 'App.tsx', data: 'ActivityLog[] via getLogs()', description: 'All activity logs loaded on mount, filtered by period' },
      { from: 'Electron main process', to: 'App.tsx', data: 'Foreground change events via onForegroundChange', description: 'Real-time app switch events update timer and live feed' },
    ],
    connectedPages: ['stats', 'productivity', 'browser'],
    pitfalls: ['Heatmap and chart data duplicated in App.tsx and DashboardPage.tsx — keep in sync'],
  },
  {
    id: 'orbit',
    name: '3D Orbit Visualization',
    route: '/',
    icon: 'Activity',
    category: 'Core',
    status: 'released',
    description: 'Interactive solar system of your app usage with Three.js rendering.',
    filePath: 'src/components/OrbitSystem.tsx',
    whatYoullFind: [
      'Interactive solar system with app-planets in 3D space',
      'Glow effects and smooth Three.js rendered particles',
      'Planet labels showing app names and usage percentages',
      'Orbit rings connecting related app categories',
    ],
    whatYouCanDo: [
      'Drag to rotate the orbit camera freely',
      'Scroll to zoom in and out of the solar system',
      'Click any planet for a detailed app breakdown',
      'Hover over planets for quick tooltip stats',
    ],
    sections: [
      {
        name: '3D Scene',
        selector: '[data-tutorial="orbit-scene"]',
        description: 'Three.js canvas with planets, sun, particles, and orbit controls',
        components: [
          { name: 'OrbitSystem', file: 'src/components/OrbitSystem.tsx', description: 'Main Three.js component with scene, camera, renderer, controls' },
        ],
      },
      {
        name: 'App Planets',
        selector: '[data-tutorial="planet"]',
        description: 'Sphere meshes scaled by usage time with color-coding by category',
        components: [
          { name: 'Planet meshes (inline)', file: 'src/components/OrbitSystem.tsx', description: 'SphereGeometry instances with MeshPhongMaterial, sized by app duration' },
        ],
      },
      {
        name: 'Orbit Controls',
        selector: '[data-tutorial="orbit-controls"]',
        description: 'Camera controls for rotation, zoom, and pan around the solar system',
        components: [
          { name: 'OrbitControls', file: 'three.js addon', description: 'Three.js OrbitControls for camera manipulation' },
        ],
      },
    ],
    ipcEndpoints: [],
    dataFlows: [
      { from: 'App.tsx', to: 'OrbitSystem', data: 'logs, browserLogs, appColors, categoryOverrides', description: 'Usage data passed as props for planet sizing and coloring' },
    ],
    connectedPages: ['dashboard'],
  },
  {
    id: 'stats',
    name: 'Usage Statistics',
    route: '/stats',
    icon: 'BarChart3',
    category: 'Core',
    status: 'released',
    description: 'Deep dive into how you spend your time with sorted lists and charts.',
    filePath: 'src/pages/StatsPage.tsx',
    whatYoullFind: [
      'Sorted app list with individual time breakdowns',
      'Category breakdown charts — pie, bar, and line views',
      'Time mode toggle switching between focus and total time',
      'Period selector and export buttons for CSV and JSON',
    ],
    whatYouCanDo: [
      'Switch between focus time and total time views',
      'Filter data by date range using the period selector',
      'Export your usage data as CSV or JSON files',
      'Click chart segments to drill into filtered views',
    ],
    sections: [
      {
        name: 'App List',
        selector: '[data-tutorial="app-list"]',
        description: 'Sortable list of all detected apps with usage time and percentage',
        components: [
          { name: 'StatsPage', file: 'src/pages/StatsPage.tsx', description: 'Main stats page with app list, charts, export controls' },
        ],
      },
      {
        name: 'Category Charts',
        description: 'Pie, bar, and line charts showing category distribution of time',
        components: [
          { name: 'Chart.js Pie/Bar', file: 'StatsPage.tsx', description: 'React-chartjs-2 based charts for category breakdown' },
        ],
      },
      {
        name: 'Export Controls',
        description: 'Buttons to download data as CSV or JSON',
        components: [
          { name: 'Export buttons (inline)', file: 'StatsPage.tsx', description: 'Download triggers for CSV and JSON export' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'getPageStats', params: '{ page, period, dateOffset }', returns: '{ success, data, error }', description: 'Page-specific stats with app breakdowns' },
    ],
    dataFlows: [
      { from: 'App.tsx', to: 'StatsPage', data: 'filteredLogs, allLogs, selectedPeriod, dateOffset', description: 'Logs filtered by period passed as props' },
    ],
    connectedPages: ['dashboard', 'productivity', 'browser'],
  },
  {
    id: 'browser',
    name: 'Browser Activity',
    route: '/browser',
    icon: 'Globe',
    category: 'Core',
    status: 'released',
    description: 'Track and analyze your browsing habits across domains.',
    filePath: 'src/pages/BrowserActivityPage.tsx',
    whatYoullFind: [
      'Browser selector with extension connection status',
      'Domain stats list sorted by time spent per site',
      'Category distribution charts for browsing habits',
      'Live mode toggle and summary cards with top domains',
    ],
    whatYouCanDo: [
      'Switch between connected browsers for different data',
      'Toggle live tracking on and off in real time',
      'Browse the domain list sorted by time spent',
      'View category breakdown of your browsing patterns',
    ],
    sections: [
      {
        name: 'Browser Selector',
        description: "Dropdown to select which browser's data to view",
        components: [
          { name: 'BrowserSelector (inline)', file: 'BrowserActivityPage.tsx', description: 'Browser selection with extension status indicator' },
        ],
      },
      {
        name: 'Domain Stats',
        description: 'Sorted list of domains with time spent and visit count',
        components: [
          { name: 'DomainList (inline)', file: 'BrowserActivityPage.tsx', description: 'Scrollable domain list with time metrics' },
        ],
      },
      {
        name: 'Browser Charts',
        description: 'Category distribution and time trend charts',
        components: [
          { name: 'Chart.js charts', file: 'BrowserActivityPage.tsx', description: 'React-chartjs-2 based charts for browsing data' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'getBrowserLogs', params: 'none', returns: 'Log[]', description: 'All browser tracking logs' },
      { method: 'getBrowserDomainStats', params: 'none', returns: 'DomainStat[]', description: 'Aggregated domain statistics' },
      { method: 'setBrowserTracking', params: 'enabled: boolean', returns: 'boolean', description: 'Enable/disable browser tracking' },
      { method: 'getBrowserTrackingStatus', params: 'none', returns: '{ enabled, serverRunning, port, excludedDomains }', description: 'Current browser tracking status' },
    ],
    dataFlows: [
      { from: 'Browser extension', to: 'main.ts', data: 'Website visit events via WebSocket', description: 'Real-time browsing data from browser extension' },
      { from: 'main.ts (SQLite)', to: 'BrowserActivityPage', data: 'Domain stats via getBrowserDomainStats()', description: 'Aggregated browser stats for display' },
    ],
    connectedPages: ['settings', 'productivity'],
  },
  {
    id: 'external',
    name: 'External Tracker',
    route: '/external',
    icon: 'Moon',
    category: 'Core',
    status: 'released',
    description: 'Track offline activities, sleep, and focus sessions.',
    filePath: 'src/pages/ExternalPage.tsx',
    whatYoullFind: [
      'Active timer with stopwatch and sleep mode support',
      'Activity grid for quick session logging',
      'Sleep timeline chart — 24h view of sleep patterns',
      'Consistency score with streak tracking and manual entry form',
    ],
    whatYouCanDo: [
      'Start, stop, and pause the focus timer',
      'Log sleep sessions with the manual entry form',
      'Track offline activities with category tags',
      'View your consistency trends and streaks over time',
    ],
    sections: [
      {
        name: 'Timer Bar',
        description: 'Always-visible timer with start/stop/pause controls and activity selector',
        components: [
          { name: 'TimerBar (inline)', file: 'ExternalPage.tsx', description: 'Persistent timer bar with controls and elapsed time display' },
        ],
      },
      {
        name: 'Activity Management',
        description: 'Activity grid for creating, editing, and deleting custom activities',
        components: [
          { name: 'ActivityGrid (inline)', file: 'ExternalPage.tsx', description: 'Grid of activity cards with color coding and quick-start' },
        ],
      },
      {
        name: 'Sleep Tracking',
        description: 'Sleep timeline, manual entry form, and consistency streak tracking',
        components: [
          { name: 'SleepTimelineChart', file: 'ExternalPage.tsx', description: '24h sleep pattern visualization chart' },
          { name: 'ManualSleepForm', file: 'ExternalPage.tsx', description: 'Form for manual sleep log entry' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'getExternalActivities', params: 'none', returns: 'ExternalActivity[]', description: 'All defined external activities' },
      { method: 'getActiveExternalSession', params: 'none', returns: 'ExternalSession | null', description: 'Currently active session if any' },
    ],
    dataFlows: [
      { from: 'ExternalPage', to: 'main.ts (SQLite)', data: 'Timer sessions via saveExternalSession()', description: 'External timer sessions persisted to SQLite' },
      { from: 'Electron IPC', to: 'ExternalPage', data: 'external-data-changed window event', description: 'Real-time refresh when external data changes' },
    ],
    connectedPages: ['settings'],
  },
  {
    id: 'ai-assistant',
    name: 'AI Assistant',
    route: '/ai',
    icon: 'Sparkles',
    category: 'Core',
    status: 'released',
    description: 'Your intelligent companion for goal achievement and daily planning.',
    filePath: 'src/pages/AiPage.tsx',
    whatYoullFind: [
      "Daily plan card with today's focus goals and AI suggestions",
      'Context summary showing unfinished goals and weekly completions',
      'Editable planning document with checklist parsing',
      'Evening review mode for end-of-day reflection notes',
    ],
    whatYouCanDo: [
      "Read today's focus goals from the daily plan card",
      'Confirm AI has your weekly context for relevant suggestions',
      'Toggle goals as you complete them and add new goals inline',
      'Compose evening review notes and save reflections',
    ],
    sections: [
      {
        name: 'Daily Plan Card',
        selector: '[data-tutorial="ai.daily-plan"]',
        description: "Today's focus goals with AI-generated suggestions and progress",
        components: [
          { name: 'DailyPlanCard', file: 'src/components/DailyPlanCard.tsx', description: 'Daily goals display with check items and AI suggestions' },
        ],
      },
      {
        name: 'Context Summary',
        selector: '[data-tutorial="ai.context"]',
        description: 'Weekly context handoff showing unfinished goals and completed work',
        components: [
          { name: 'ContextSummaryCard', file: 'src/components/ContextSummaryCard.tsx', description: 'Summary card with weekly completions and unfinished goals' },
        ],
      },
      {
        name: 'Evening Review',
        selector: '[data-tutorial="ai.review"]',
        description: 'End-of-day reflection mode for capturing notes and progress',
        components: [
          { name: 'ReviewCard (inline)', file: 'AiPage.tsx', description: 'Evening review form with compose and save actions' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'readPlanningMd', params: 'none', returns: '{ content, error }', description: 'Read planning.md for daily goals' },
      { method: 'writePlanningMd', params: 'content: string', returns: '{ success, error }', description: 'Write updated goals to planning.md' },
      { method: 'getGoalContext', params: 'none', returns: '{ last7dByCategory, yesterday }', description: 'Weekly context for AI suggestions' },
    ],
    dataFlows: [
      { from: 'AiPage', to: 'src/planning.md', data: 'Goals via readPlanningMd/writePlanningMd', description: 'Goals stored in planning.md on disk' },
      { from: 'AiPage', to: 'AI service', data: 'Context + goals for AI suggestions', description: 'AI-powered goal suggestions and context' },
    ],
    connectedPages: ['terminal', 'settings'],
  },
  {
    id: 'productivity',
    name: 'Productivity',
    route: '/productivity',
    icon: 'Zap',
    category: 'Core',
    status: 'released',
    description: 'Measure and optimize your productive vs distracting time.',
    filePath: 'src/pages/ProductivityPage.tsx',
    whatYoullFind: [
      'Circular productivity score from 0 to 100',
      'Time breakdown grid — productive, neutral, and distracting',
      'App vs website comparison for productivity analysis',
      'Trend charts over selected periods and categories',
    ],
    whatYouCanDo: [
      'View your productivity breakdown by category',
      'Compare app productivity against website productivity',
      'Track productivity trends over days and weeks',
      'Identify your most distracting apps and patterns',
    ],
    sections: [
      {
        name: 'Productivity Score',
        description: 'Circular gauge showing combined productivity score with color coding',
        components: [
          { name: 'ProductivityScore (inline)', file: 'ProductivityPage.tsx', description: 'Circular progress gauge from 0-100 with tier coloring' },
        ],
      },
      {
        name: 'Time Breakdown Grid',
        description: 'Grid showing productive, neutral, and distracting time categories',
        components: [
          { name: 'CategoryGrid (inline)', file: 'ProductivityPage.tsx', description: 'Three-column grid of time categories with totals' },
        ],
      },
      {
        name: 'Trend Charts',
        description: 'Line/bar charts showing productivity trends over time',
        components: [
          { name: 'Chart.js trend charts', file: 'ProductivityPage.tsx', description: 'Chart.js based productivity trend visualization' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'getDailyProductivity', params: 'date: string', returns: 'ProductivityDay', description: 'Single day productivity data' },
      { method: 'getProductivityRange', params: 'startDate, endDate', returns: 'ProductivityDay[]', description: 'Productivity data for date range' },
    ],
    dataFlows: [
      { from: 'App.tsx', to: 'ProductivityPage', data: 'allLogs, browserLogs, tierAssignments', description: 'All logs with tier assignments for productivity calculation' },
    ],
    connectedPages: ['dashboard', 'stats', 'settings'],
  },
  {
    id: 'settings',
    name: 'Settings',
    route: '/settings',
    icon: 'Settings',
    category: 'Core',
    status: 'released',
    description: 'Configure every aspect of the tracker.',
    filePath: 'src/pages/SettingsPage.tsx',
    whatYoullFind: [
      'Category management with color coding and labels',
      'Productivity tiers with drag-and-drop app assignment',
      'App carousel for quick categorization',
      'AI categorization settings, timer behavior, and data sync controls',
    ],
    whatYouCanDo: [
      'Create and edit categories with custom colors',
      'Drag and drop apps into productivity tiers',
      'Configure AI-powered auto-categorization',
      'Adjust timer behavior and manage data sync backups',
    ],
    sections: [
      {
        name: 'Category Manager',
        description: 'Create, edit, and delete categories with color picker and label settings',
        components: [
          { name: 'CategoryManager (inline)', file: 'SettingsPage.tsx', description: 'Full category management UI with color customization' },
        ],
      },
      {
        name: 'Productivity Tiers',
        description: 'Drag-and-drop interface for assigning apps to productive/neutral/distracting',
        components: [
          { name: 'TierAssignment (inline)', file: 'SettingsPage.tsx', description: 'DnD tier assignment with app list per category' },
        ],
      },
      {
        name: 'Timer Configuration',
        description: 'Timer behavior settings including idle threshold, auto-pause, and recording modes',
        components: [
          { name: 'TimerConfig (inline)', file: 'SettingsPage.tsx', description: 'Timer settings panel' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'getPreferences', params: 'none', returns: 'Record<string, any>', description: 'All user preferences' },
      { method: 'setPreference', params: 'key, value', returns: 'boolean', description: 'Set individual preference' },
      { method: 'setRecordingMode', params: 'type, mode', returns: 'boolean', description: 'Set always/on-view recording mode' },
      { method: 'updateCategoriesFromOverrides', params: 'appOverrides, domainOverrides', returns: '{ success, updatedCount }', description: 'Batch update category overrides' },
    ],
    dataFlows: [
      { from: 'SettingsPage', to: 'localStorage', data: 'Category overrides via deskflow-app-category-overrides', description: 'Category overrides persisted to localStorage' },
      { from: 'SettingsPage', to: 'main.ts (SQLite)', data: 'Preferences via setPreference()', description: 'Preferences synced to SQLite' },
    ],
    connectedPages: ['all'],
  },
  {
    id: 'terminal',
    name: 'Terminal & Agent Sessions',
    route: '/terminal',
    icon: 'Terminal',
    category: 'Tracker Mind',
    status: 'released',
    description: 'AI-powered terminal with context-aware agents.',
    filePath: 'src/pages/TerminalPage.tsx',
    whatYoullFind: [
      'Multi-pane xterm.js terminal with AI agent integration',
      'Session management panel for save, load, and categorize',
      'Project selector and 12 sidebar knowledge system tabs',
      'Instruction panel, context sidebar, and problems workspace',
    ],
    whatYouCanDo: [
      'Open and manage multiple terminal panes simultaneously',
      'Save, load, and categorize terminal sessions',
      'Select projects for targeted agent context',
      'Assign agents to tasks from 5 available types',
    ],
    sections: [
      {
        name: 'Terminal Workspace',
        description: 'Multi-pane xterm.js terminal with split panes and resize support',
        components: [
          { name: 'TerminalWindow', file: 'src/components/TerminalWindow.tsx', description: 'Xterm.js based terminal with multi-pane support' },
          { name: 'TerminalTab', file: 'src/components/TerminalTab.tsx', description: 'Individual terminal tab with resize and controls' },
        ],
      },
      {
        name: 'Session Manager',
        description: 'Save, load, categorize, and manage terminal sessions',
        components: [
          { name: 'SessionCard', file: 'src/components/SessionCard.tsx', description: 'Session item with metadata and actions' },
          { name: 'SessionEditDialog', file: 'src/components/SessionEditDialog.tsx', description: 'Dialog for editing session details' },
        ],
      },
      {
        name: 'Context Sidebar',
        description: '12-tab knowledge system sidebar with toggles, token budgets, and prompt preview',
        components: [
          { name: 'ContextSidebar', file: 'src/components/ContextSidebar.tsx', description: 'Knowledge system sidebar with tabs and controls' },
          { name: 'InstructionPanel', file: 'src/components/InstructionPanel.tsx', description: 'AI instruction panel for agent behavior' },
        ],
      },
      {
        name: 'Prompt System',
        description: 'Prompt history, design dialog, and routing disambiguation',
        components: [
          { name: 'PromptHistoryTab', file: 'src/components/PromptHistoryTab.tsx', description: 'Prompt history browser with search' },
          { name: 'PromptDesignDialog', file: 'src/components/PromptDesignDialog.tsx', description: 'AI prompt design and configuration dialog' },
        ],
      },
      {
        name: 'Workspace Panel',
        description: 'Problems workspace, issues tracker, and initialization progress',
        components: [
          { name: 'IssuesWorkspace', file: 'src/components/IssuesWorkspace.tsx', description: 'Problems and issues tracking workspace' },
          { name: 'InitializeProgressModal', file: 'src/components/InitializeProgressModal.tsx', description: 'Project initialization progress modal' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'createTerminalWindow', params: 'none', returns: 'boolean', description: 'Create new terminal window' },
      { method: 'spawnTerminal', params: 'terminalId, cwd', returns: 'boolean', description: 'Spawn terminal process' },
      { method: 'writeTerminal', params: 'terminalId, data', returns: 'boolean', description: 'Write data to terminal' },
      { method: 'resizeTerminal', params: 'terminalId, cols, rows', returns: 'boolean', description: 'Resize terminal' },
      { method: 'killTerminal', params: 'terminalId', returns: 'boolean', description: 'Kill terminal process' },
      { method: 'saveTerminalSession', params: 'session object', returns: '{ success, id }', description: 'Save terminal session to database' },
      { method: 'getTerminalSessions', params: 'projectId, limit', returns: 'Session[]', description: 'Get terminal sessions' },
      { method: 'routePrompt', params: 'prompt, projectPath', returns: '{ action, sessionId, terminalId }', description: 'Route prompt to appropriate agent' },
    ],
    dataFlows: [
      { from: 'TerminalPage', to: 'main.ts (SQLite)', data: 'Sessions via saveTerminalSession()', description: 'Terminal sessions persisted to SQLite' },
      { from: 'TerminalPage', to: 'File system', data: 'Locking via lockFile/releaseFileLock', description: 'Cross-session file locking for multi-agent safety' },
    ],
    connectedPages: ['ide', 'ai-assistant', 'settings'],
  },
  {
    id: 'ide-projects',
    name: 'IDE Projects',
    route: '/ide',
    icon: 'Code2',
    category: 'Tracker Mind',
    status: 'released',
    description: 'Manage your workspace projects, tools, and AI integrations.',
    filePath: 'src/pages/IDEProjectsPage.tsx',
    whatYoullFind: [
      '7-tab layout — overview, IDEs, tools, projects, AI, git, trash',
      'Metric cards showing workspace statistics at a glance',
      'AI usage chart with token counts and cost breakdown',
      'Project list with scan tools and git integration panel',
    ],
    whatYouCanDo: [
      'Browse tabs to switch between different project views',
      'Trigger workspace scans to discover new projects',
      'View AI token usage and associated costs',
      'Manage git repositories and organize project tools',
    ],
    sections: [
      {
        name: 'Tab Navigation',
        description: '7 tabs — Overview, IDEs, Tools, Projects, AI, Git, Trash',
        components: [
          { name: 'TabBar', file: 'src/components/TabBar.tsx', description: 'Horizontal tab bar with active state and icons' },
        ],
      },
      {
        name: 'Overview Dashboard',
        description: 'Workspace stats cards showing project count, tool count, AI usage',
        components: [
          { name: 'StatCard', file: 'src/components/StatCard.tsx', description: 'Metric card with icon, value, and label' },
        ],
      },
      {
        name: 'AI Integration Tab',
        description: 'AI agent usage with token counts, costs, and sync controls',
        components: [
          { name: 'AiUsageCard', file: 'src/components/AiUsageCard.tsx', description: 'AI usage display with token and cost metrics' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'getIDEs', params: 'none', returns: 'IDE[]', description: 'List detected IDEs' },
      { method: 'getProjects', params: 'none', returns: 'Project[]', description: 'List all projects' },
      { method: 'addProject', params: '{ name, path, ... }', returns: '{ success, id }', description: 'Add new project' },
      { method: 'syncAIUsage', params: 'none', returns: '{ success, ... }', description: 'Sync AI usage data' },
      { method: 'getDORAMetrics', params: 'projectId, period', returns: 'DORAMetrics', description: 'DORA metrics for project' },
    ],
    dataFlows: [
      { from: 'IDEProjectsPage', to: 'File system', data: 'Project scanning via scanIdeDefaultProjects()', description: 'Discovers IDE projects from file system' },
      { from: 'IDEProjectsPage', to: 'main.ts (SQLite)', data: 'Projects, tools, sessions via CRUD IPCs', description: 'Project data persisted to SQLite' },
    ],
    connectedPages: ['terminal', 'settings'],
  },
  {
    id: 'context',
    name: 'Context Management',
    route: '/ide',
    icon: 'BookOpen',
    category: 'Tracker Mind',
    status: 'released',
    description: '12 knowledge systems feeding context to AI agents.',
    filePath: 'src/components/ContextSidebar.tsx',
    whatYoullFind: [
      'System toggles for all 12 knowledge systems',
      'Token budget sliders for fine-tuning per system',
      'Model tier selector for AI interaction levels',
      'Design skills panel and auto-assembled prompt preview',
    ],
    whatYouCanDo: [
      'Toggle knowledge systems on and off per session',
      'Adjust token budgets with precise slider controls',
      'Select the AI model tier for interactions',
      'Preview assembled context before sending to agents',
    ],
    sections: [
      {
        name: 'System Toggles',
        description: 'Toggle switches for all 12 knowledge systems',
        components: [
          { name: 'SystemCard', file: 'src/components/SystemCard.tsx', description: 'Individual system toggle with description' },
        ],
      },
      {
        name: 'Token Budget',
        description: 'Sliders for fine-tuning token allocation per system',
        components: [
          { name: 'KnobSlider', file: 'src/components/KnobSlider.tsx', description: 'Precision slider with value display' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'getAiConfig', params: 'none', returns: 'AiConfig', description: 'AI configuration including system toggles' },
      { method: 'saveAiConfig', params: 'config', returns: '{ success }', description: 'Save AI configuration' },
    ],
    dataFlows: [
      { from: 'ContextSidebar', to: 'localStorage', data: 'System toggles and token budgets', description: 'Context settings persisted locally' },
    ],
    connectedPages: ['terminal', 'ide-projects'],
  },
  {
    id: 'problems',
    name: 'Problems & Requests',
    route: '/terminal',
    icon: 'AlertTriangle',
    category: 'Tracker Mind',
    status: 'released',
    description: 'Track bugs, features, and checklists — AI-managed.',
    filePath: 'src/components/IssuesWorkspace.tsx',
    whatYoullFind: [
      'Problem list with status filters and priority colors',
      'Checklist items that auto-update from AI agent actions',
      'Activity log recording every change and assignment',
      'Terminal assignment integration for direct fixes',
    ],
    whatYouCanDo: [
      'Create bugs with priority levels and descriptions',
      'Track feature requests through their status workflow',
      'Auto-update checklist items via AI agent completions',
      'Assign problems directly to terminal sessions',
    ],
    sections: [
      {
        name: 'Issue List',
        description: 'Filterable list of bugs, features, and checklists with priority colors',
        components: [
          { name: 'IssuesWorkspace', file: 'src/components/IssuesWorkspace.tsx', description: 'Main issues workspace with filtering and CRUD' },
        ],
      },
      {
        name: 'Activity Log',
        description: 'Chronological log of all changes and AI agent actions',
        components: [
          { name: 'ActivityLog (inline)', file: 'IssuesWorkspace.tsx', description: 'Timeline of issue changes' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'getTouchedFiles', params: '{ terminalId, filePath, limit }', returns: '{ success, data }', description: 'Get files modified by agents' },
    ],
    dataFlows: [
      { from: 'IssuesWorkspace', to: 'Discord webhook', data: 'Issue notifications', description: 'Webhook integration for issue notifications' },
    ],
    connectedPages: ['terminal', 'design'],
  },
  {
    id: 'design',
    name: 'Design Skills System',
    route: '/ide',
    icon: 'Palette',
    category: 'Tracker Mind',
    status: 'beta',
    description: 'AI design intelligence with taste controls and skill modules.',
    filePath: 'src/components/ContextSidebar.tsx',
    whatYoullFind: [
      'Taste knobs for fine-tuning AI design output',
      'Style references for maintaining consistent branding',
      '5 skill modules covering layout, color, typography, and more',
      'Google Stitch integration for automated screen generation',
    ],
    whatYouCanDo: [
      'Adjust taste knobs to tune the design output direction',
      'Import and manage style references for brand consistency',
      'Toggle individual skill modules on and off',
      'Generate screens directly via Stitch integration',
    ],
    sections: [
      {
        name: 'Taste Controls',
        description: 'Variance, motion, density knobs for AI design output',
        components: [
          { name: 'KnobSlider', file: 'src/components/KnobSlider.tsx', description: 'Taste tuning sliders with labels' },
        ],
      },
      {
        name: 'Skill Modules',
        description: 'Toggle-able skill definitions for frontend design',
        components: [
          { name: 'SkillDynamicForm', file: 'src/components/SkillDynamicForm.tsx', description: 'Dynamic form for skill configuration' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'mcpListTools', params: 'serverId', returns: '{ tools }', description: 'List MCP server tools for design library' },
      { method: 'mcpCallTool', params: 'serverId, toolName, args', returns: '{ result }', description: 'Call MCP tool on design library server' },
      { method: 'aceternityFetchRegistry', params: 'none', returns: '{ components }', description: 'Fetch Aceternity component registry' },
    ],
    dataFlows: [
      { from: 'ContextSidebar (Design tab)', to: 'MCP servers', data: 'Tool calls via mcpCallTool()', description: 'Design library integration via MCP' },
      { from: 'ContextSidebar', to: 'Google Stitch API', data: 'Screen generation requests', description: 'Stitch integration for UI generation' },
    ],
    connectedPages: ['terminal', 'problems'],
  },
  {
    id: 'database',
    name: 'Database Analytics',
    route: '/database',
    icon: 'Database',
    category: 'Data',
    status: 'released',
    description: 'Full analytics and data browser for all tracked data.',
    filePath: 'src/pages/DatabasePage.tsx',
    whatYoullFind: [
      'Table browser with search and schema display',
      'Data table with pagination and sortable columns',
      'Analytics charts for tokens, costs, sessions, and problems',
      'Daily activity trend visualization and CSV export button',
    ],
    whatYouCanDo: [
      'Browse all database tables with live search',
      'View schema details including column types for each table',
      'Export table data to CSV for external analysis',
      'Switch between chart views for different metrics',
    ],
    sections: [
      {
        name: 'Table Browser',
        description: 'Sidebar list of all database tables with schema viewer',
        components: [
          { name: 'TableBrowser (inline)', file: 'DatabasePage.tsx', description: 'Table list sidebar with expandable schema' },
        ],
      },
      {
        name: 'Data View',
        description: 'Paginated, sortable table data with search',
        components: [
          { name: 'DataTable (inline)', file: 'DatabasePage.tsx', description: 'Paginated table view with column sorting' },
        ],
      },
      {
        name: 'Analytics Charts',
        description: 'Charts for tokens, costs, sessions, and daily trends',
        components: [
          { name: 'Chart.js charts', file: 'DatabasePage.tsx', description: 'Analytics visualization charts' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'getDatabaseTables', params: 'none', returns: '{ tables, type }', description: 'List all database tables' },
      { method: 'getTableSchema', params: 'tableName', returns: 'TableSchema', description: 'Get table schema with column types' },
      { method: 'getTableData', params: 'tableName, limit', returns: 'Row[]', description: 'Get table data with optional limit' },
    ],
    dataFlows: [
      { from: 'DatabasePage', to: 'main.ts (SQLite)', data: 'SQL queries via getTableData/getTableSchema', description: 'Direct database inspection queries' },
    ],
    connectedPages: ['settings'],
  },
  {
    id: 'insights',
    name: 'Insights & Reports',
    route: '/reports',
    icon: 'BarChart3',
    category: 'Data',
    status: 'released',
    description: 'Deep reports and trend analysis across all tracked data.',
    filePath: 'src/pages/InsightsPage.tsx',
    whatYoullFind: [
      'Daily activity trends with aggregate summaries',
      'Category distribution reports for deep analysis',
      'Cross-period comparison tools',
      'Exportable report data for external tools',
    ],
    whatYouCanDo: [
      'View detailed daily activity trends',
      'Analyze category distribution over time',
      'Compare metrics across different periods',
      'Export report data for external analysis',
    ],
    sections: [
      {
        name: 'Trend Analysis',
        description: 'Line/bar charts showing daily activity over time',
        components: [
          { name: 'Chart.js charts', file: 'InsightsPage.tsx', description: 'Trend visualization charts' },
        ],
      },
      {
        name: 'Report Controls',
        description: 'Period selectors and export controls for reports',
        components: [
          { name: 'ReportControls (inline)', file: 'InsightsPage.tsx', description: 'Filter and export controls for reports' },
        ],
      },
    ],
    ipcEndpoints: [
      { method: 'getDailyAggregates', params: 'none', returns: 'Aggregate[]', description: 'Daily aggregate data for reports' },
    ],
    dataFlows: [],
    connectedPages: ['stats', 'productivity'],
  },
  {
    id: 'tutorial',
    name: 'Feature Guide',
    route: '/tutorial',
    icon: 'HelpCircle',
    category: 'Core',
    status: 'released',
    description: 'Interactive feature guide with overlay tutorials for every page.',
    filePath: 'src/pages/TutorialPage.tsx',
    whatYoullFind: [
      'Feature grid with status badges and category grouping',
      'Interactive overlay tutorial for step-by-step guidance',
      'Progress tracking across 16 features',
      'Category filters and reset progress option',
    ],
    whatYouCanDo: [
      'Browse the complete feature inventory',
      'Start interactive tutorials for any feature',
      'Track your exploration progress across features',
      'Filter features by category (Core, Tracker Mind, Data)',
    ],
    sections: [
      {
        name: 'Feature Grid',
        description: 'Card grid of all 16 features with status, category, and description',
        components: [
          { name: 'GlassCard feature cards', file: 'TutorialPage.tsx', description: 'Feature cards with icon, status badge, and details' },
        ],
      },
      {
        name: 'Tutorial Overlay',
        description: 'Step-by-step overlay with target highlighting and instructions',
        components: [
          { name: 'TutorialOverlay', file: 'src/components/TutorialOverlay.tsx', description: 'Overlay component with step navigation and Try It button' },
        ],
      },
    ],
    ipcEndpoints: [],
    dataFlows: [
      { from: 'TutorialPage', to: 'localStorage', data: 'Progress via guide-progress key', description: 'Tutorial progress persisted locally' },
    ],
    connectedPages: ['all'],
  },
  {
    id: 'feature-specs',
    name: 'Feature Specs Viewer',
    route: '/features',
    icon: 'FileText',
    category: 'Data',
    status: 'released',
    description: 'Structured hierarchical viewer of all app features, sections, components, and IPC endpoints.',
    filePath: 'src/components/FeatureSpecViewer.tsx, src/data/feature-specs.ts',
    whatYoullFind: [
      'Sidebar tree of all pages with collapsible sections',
      'Detail panel showing sections, components, and IPC endpoints',
      'Copy-to-clipboard for any spec as markdown',
      'Markdown source view toggle',
    ],
    whatYouCanDo: [
      'Browse the full hierarchical feature spec tree',
      'Click any page to view its complete spec',
      'Copy any spec as formatted markdown',
      'Toggle between rendered view and raw markdown',
    ],
    sections: [
      {
        name: 'Sidebar Tree',
        description: 'Collapsible tree view of all pages organized by category',
        components: [
          { name: 'FeatureSpecTree (inline)', file: 'FeatureSpecViewer.tsx', description: 'Hierarchical sidebar tree with search and collapse' },
        ],
      },
      {
        name: 'Detail Panel',
        description: 'Full spec view with sections, components, IPC, and data flows',
        components: [
          { name: 'FeatureSpecDetail (inline)', file: 'FeatureSpecViewer.tsx', description: 'Detailed spec panel with tabbed sections' },
        ],
      },
      {
        name: 'Markdown View',
        description: 'Rendered markdown version of feature specs',
        components: [
          { name: 'MarkdownPreview', file: 'src/components/MarkdownPreview.tsx', description: 'Markdown renderer for spec preview' },
        ],
      },
    ],
    ipcEndpoints: [],
    dataFlows: [
      { from: 'feature-specs.ts', to: 'FeatureSpecViewer', data: 'Static spec data import', description: 'All spec data is static, imported at build time' },
    ],
    connectedPages: ['tutorial'],
  },
];

export function generateMarkdown(feature: FeatureSpec): string {
  const lines: string[] = [];
  lines.push(`# ${feature.name}`);
  lines.push('');
  lines.push(`**Route:** \`${feature.route}\` | **Status:** ${feature.status} | **Category:** ${feature.category}`);
  lines.push('');
  lines.push(feature.description);
  lines.push('');
  lines.push('## What You\'ll Find');
  feature.whatYoullFind.forEach((item) => { lines.push(`- ${item}`); });
  lines.push('');
  lines.push('## What You Can Do');
  feature.whatYouCanDo.forEach((item) => { lines.push(`- ${item}`); });
  lines.push('');
  lines.push('## File Path');
  lines.push(`\`${feature.filePath}\``);
  lines.push('');
  if (feature.sections.length > 0) {
    lines.push('## Sections');
    lines.push('');
    feature.sections.forEach((section) => {
      lines.push(`### ${section.name}`);
      lines.push('');
      lines.push(section.description);
      lines.push('');
      section.components.forEach((comp) => {
        lines.push(`- **${comp.name}** (\`${comp.file}\`): ${comp.description}`);
      });
      lines.push('');
    });
  }
  if (feature.ipcEndpoints.length > 0) {
    lines.push('## IPC Endpoints');
    lines.push('');
    lines.push('| Method | Params | Returns | Description |');
    lines.push('|--------|--------|---------|-------------|');
    feature.ipcEndpoints.forEach((ipc) => {
      lines.push(`| \`${ipc.method}\` | \`${ipc.params}\` | \`${ipc.returns}\` | ${ipc.description} |`);
    });
    lines.push('');
  }
  if (feature.dataFlows.length > 0) {
    lines.push('## Data Flows');
    lines.push('');
    lines.push('| From | To | Data | Description |');
    lines.push('|------|-----|------|-------------|');
    feature.dataFlows.forEach((flow) => {
      lines.push(`| \`${flow.from}\` | \`${flow.to}\` | \`${flow.data}\` | ${flow.description} |`);
    });
    lines.push('');
  }
  return lines.join('\n');
}

export function generateAllSpecsMarkdown(): string {
  const lines: string[] = [];
  lines.push('# DeskFlow — Complete Feature Specifications');
  lines.push('');
  lines.push(`_${FEATURE_SPECS.length} features • ${SIDEBAR_NAV.length} navigation items • ${TOP_NAV_FEATURES.length} global features_`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Navigation');
  lines.push('');
  SIDEBAR_NAV.forEach((nav) => {
    lines.push(`- **${nav.label}** → \`${nav.path}\` (${nav.group}, order ${nav.order})`);
  });
  lines.push('');
  lines.push('---');
  lines.push('');
  for (const feature of FEATURE_SPECS) {
    lines.push(generateMarkdown(feature));
    lines.push('---');
    lines.push('');
  }
  return lines.join('\n');
}

export const FEATURE_CATEGORIES = ['Core', 'Tracker Mind', 'Data'] as const;
export const FEATURE_STATUSES = ['released', 'beta', 'planned', 'deprecated'] as const;
