import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('deskflowAPI', {
  // Listen for foreground window changes
  onForegroundChange: (callback: (data: any) => void) => {
    ipcRenderer.on('foreground-changed', (_event, data) => callback(data));
  },

  // Listen for tracking heartbeat
  onTrackingHeartbeat: (callback: (data: any) => void) => {
    ipcRenderer.on('tracking-heartbeat', (_event, data) => callback(data));
  },

  // Listen for browser tracking live events
  onBrowserTrackingEvent: (callback: (data: any) => void) => {
    ipcRenderer.on('browser-tracking-event', (_event, data) => callback(data));
  },

  // Get recent activity logs
  getLogs: () => ipcRenderer.invoke('get-logs'),

  // Get logs filtered by period
  getLogsByPeriod: (period: 'today' | 'week' | 'month' | 'all') => ipcRenderer.invoke('get-logs-by-period', period),

  // Get aggregated stats
  getStats: () => ipcRenderer.invoke('get-stats'),

  // Get per-app detailed stats (optional period filter: 'today', 'week', 'month', 'all')
  getAppStats: (period?: 'today' | 'week' | 'month' | 'all') => ipcRenderer.invoke('get-app-stats', period),

  // Get daily stats
  getDailyStats: (period: 'week' | 'month' | 'all') => ipcRenderer.invoke('get-daily-stats', period),

  // Toggle tracking on/off
  toggleTracking: () => ipcRenderer.invoke('toggle-tracking'),

  // Clear all stored data
  clearData: () => ipcRenderer.invoke('clear-data'),

  // Clear only today's data (preserve history)
  clearToday: () => ipcRenderer.invoke('clear-today'),

  // Get database file path
  getDbPath: () => ipcRenderer.invoke('get-db-path'),

  // Get storage status and health
  getStorageStatus: () => ipcRenderer.invoke('get-storage-status'),

  // Get user preferences
  getPreferences: () => ipcRenderer.invoke('get-preferences'),

  // Set user preference
  setPreference: (key: string, value: any) => ipcRenderer.invoke('set-preference', key, value),

  // Browser tracking methods (optional period: 'today', 'week', 'month', 'all')
  getBrowserLogs: (period?: 'today' | 'week' | 'month' | 'all') => ipcRenderer.invoke('get-browser-logs', period),
  getBrowserDomainStats: (period?: 'today' | 'week' | 'month' | 'all') => ipcRenderer.invoke('get-browser-domain-stats', period),
  getBrowserCategoryStats: (period?: 'today' | 'week' | 'month' | 'all') => ipcRenderer.invoke('get-browser-category-stats', period),
  setBrowserTracking: (enabled: boolean) => ipcRenderer.invoke('set-browser-tracking', enabled),
  getBrowserTrackingStatus: () => ipcRenderer.invoke('get-browser-tracking-status'),
  setBrowserExcludedDomains: (domains: string[]) => ipcRenderer.invoke('set-browser-excluded-domains', domains),
  setBrowserWithExtension: (browser: string) => ipcRenderer.invoke('set-browser-with-extension', browser),

  // Get tracked browsers (apps categorized as Browser)
  getTrackedBrowsers: () => ipcRenderer.invoke('get-tracked-browsers'),

  // Productivity tracking
  getDailyProductivity: (date: string) => ipcRenderer.invoke('get-daily-productivity', date),
  getProductivityRange: (startDate: string, endDate: string) => ipcRenderer.invoke('get-productivity-range', startDate, endDate),

  // Clean corrupted data
  cleanCorruptedData: () => ipcRenderer.invoke('clean-corrupted-data'),

  // Deep cleanup and rebuild
  deepCleanAndRebuild: () => ipcRenderer.invoke('deep-clean-and-rebuild'),

  // Database schema and table management
  migrateToAggregates: () => ipcRenderer.invoke('migrate-to-aggregates'),
  getDailyAggregates: () => ipcRenderer.invoke('get-daily-aggregates'),
  getBrowserSessions: () => ipcRenderer.invoke('get-browser-sessions'),
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  getTableSchema: (tableName: string) => ipcRenderer.invoke('get-table-schema', tableName),
  getDatabaseTables: () => ipcRenderer.invoke('get-database-tables'),
  getTableData: (tableName: string, limit?: number) => ipcRenderer.invoke('get-table-data', tableName, limit),
  updateCategoriesFromOverrides: (appOverrides: Record<string, string>, domainOverrides: Record<string, string>) => 
    ipcRenderer.invoke('update-categories-from-overrides', appOverrides, domainOverrides),

  // App control
  quitApp: () => ipcRenderer.invoke('quit-app'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  getAutoStartStatus: () => ipcRenderer.invoke('get-auto-start-status'),
  setAutoStart: (enabled: boolean) => ipcRenderer.invoke('set-auto-start', enabled),

  // Category Configuration
  getCategoryConfig: () => ipcRenderer.invoke('get-category-config'),
  setAppCategory: (appName: string, category: string) => ipcRenderer.invoke('set-app-category', appName, category),
  setDomainCategory: (domain: string, category: string) => ipcRenderer.invoke('set-domain-category', domain, category),
  setAppTier: (appName: string, tier: string) => ipcRenderer.invoke('set-app-tier', appName, tier),
  setDomainTier: (domain: string, tier: string) => ipcRenderer.invoke('set-domain-tier', domain, tier),
  setTierAssignments: (assignments: { productive: string[]; neutral: string[]; distracting: string[] }) => ipcRenderer.invoke('set-tier-assignments', assignments),
  applyCategoryToHistorical: (tierAssignments: any) => ipcRenderer.invoke('apply-category-to-historical', tierAssignments),
  getTierAssignments: () => ipcRenderer.invoke('get-tier-assignments'),
  getDefaultCategories: () => ipcRenderer.invoke('get-default-categories'),
  addCategory: (name: string) => ipcRenderer.invoke('add-category', name),
  removeCategory: (name: string) => ipcRenderer.invoke('remove-category', name),
  
  // NEW: Keyword-based productivity categorization
  getDomainKeywordRules: (domain: string) => ipcRenderer.invoke('get-domain-keyword-rules', domain),
  setDomainKeywordRules: (domain: string, keywordSets: { category: string; keywords: string[] }[]) => ipcRenderer.invoke('set-domain-keyword-rules', domain, keywordSets),
  getKeywordEnabledDomains: () => ipcRenderer.invoke('get-keyword-enabled-domains'),
  addKeywordDomain: (domain: string, keywordSets: { category: string; keywords: string[] }[]) => ipcRenderer.invoke('add-keyword-domain', domain, keywordSets),
  removeKeywordDomain: (domain: string) => ipcRenderer.invoke('remove-keyword-domain', domain),

  // AI Features
  generateAIColors: (apps: string[]) => ipcRenderer.invoke('generate-ai-colors', apps),
  generateAICategorization: (items: Array<{name: string, category: string}>) => ipcRenderer.invoke('generate-ai-categorization', items),
  testOpenRouterKey: () => ipcRenderer.invoke('test-openrouter-key'),

  // File operations
  saveFile: (options: { content: string; filename: string; fileType: string }) => ipcRenderer.invoke('save-file', options),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),

  // ========== IDE Projects ==========
  // IDE Detection
  detectIDEs: () => ipcRenderer.invoke('detect-ides'),
  getIDEs: () => ipcRenderer.invoke('get-ides'),
  getExtensions: (ideId?: string) => ipcRenderer.invoke('get-extensions', ideId),

  // Tool Detection
  scanTools: () => ipcRenderer.invoke('scan-tools'),
  getTools: (category?: string) => ipcRenderer.invoke('get-tools', category),
  getToolCategories: () => ipcRenderer.invoke('get-tool-categories'),

  // Project Management
  addProject: (projectData: { name: string; path: string; repositoryUrl?: string; vcsType?: string; primaryLanguage?: string; defaultIde?: string }) =>
    ipcRenderer.invoke('add-project', projectData),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  getAllProjects: () => ipcRenderer.invoke('get-all-projects'),
  updateProject: (projectId: string, updates: { name?: string; path?: string; repositoryUrl?: string; vcsType?: string; primaryLanguage?: string; defaultIde?: string }) =>
    ipcRenderer.invoke('update-project', projectId, updates),
  deleteProject: (projectId: string) => ipcRenderer.invoke('delete-project', projectId),
  restoreProject: (projectId: string) => ipcRenderer.invoke('restore-project', projectId),
  getProjectTools: (projectId: string) => ipcRenderer.invoke('get-project-tools', projectId),
  removeProject: (projectId: string) => ipcRenderer.invoke('remove-project', projectId),
  openProject: (projectId: string, ideId?: string) => ipcRenderer.invoke('open-project', projectId, ideId),

  // AI & Git Metrics
  getAIUsageSummary: (period?: 'week' | 'month') => ipcRenderer.invoke('get-ai-usage-summary', period),
  getCommitStats: (projectId?: string, period?: 'week' | 'month') => ipcRenderer.invoke('get-commit-stats', projectId, period),

  // Dashboard Overview
  getIDEProjectsOverview: () => ipcRenderer.invoke('get-ide-projects-overview'),

  // AI Usage Sync
  syncAIUsage: () => ipcRenderer.invoke('sync-ai-usage'),
  debugAIAgents: () => ipcRenderer.invoke('debug-ai-agents'),
  onAISyncProgress: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('ai-sync-progress', handler);
    return () => { ipcRenderer.removeListener('ai-sync-progress', handler); };
  },

  // Git & DORA Metrics
  syncCommits: (projectId: string, repoPath?: string) => ipcRenderer.invoke('sync-commits', projectId, repoPath),
  syncGitHubCommits: (projectId: string, owner: string, repo: string, token?: string) => 
    ipcRenderer.invoke('sync-github-commits', projectId, owner, repo, token),
  getDORAMetrics: (projectId: string, period?: 'week' | 'month') => ipcRenderer.invoke('get-dora-metrics', projectId, period),
  getCommitHistory: (projectId: string, limit?: number) => ipcRenderer.invoke('get-commit-history', projectId, limit),
  getContributorStats: (projectId: string) => ipcRenderer.invoke('get-contributor-stats', projectId),

  // ========== Terminal Window ==========
  createTerminalWindow: () => ipcRenderer.invoke('create-terminal-window'),
  spawnTerminal: (terminalId: string, cwd?: string) => ipcRenderer.invoke('spawn-terminal', terminalId, cwd),
  writeTerminal: (terminalId: string, data: string) => ipcRenderer.invoke('write-terminal', terminalId, data),
  resizeTerminal: (terminalId: string, cols: number, rows: number) => ipcRenderer.invoke('resize-terminal', terminalId, cols, rows),
  killTerminal: (terminalId: string) => ipcRenderer.invoke('kill-terminal', terminalId),
  onTerminalData: (callback: (data: { terminalId: string; data: string }) => void) => {
    const handler = (_event: any, terminalId: string, data: string) => callback({ terminalId, data });
    ipcRenderer.on('terminal:data', handler);
    return () => ipcRenderer.removeListener('terminal:data', handler);
  },
  onTerminalExit: (callback: (data: { terminalId: string; exitCode: number; signal: string }) => void) => {
    const handler = (_event: any, terminalId: string, exitCode: number, signal: string) => callback({ terminalId, exitCode, signal });
    ipcRenderer.on('terminal-exit', handler);
    return () => ipcRenderer.removeListener('terminal-exit', handler);
  },

  // ========== New Terminal API (node-pty based) ==========
  terminalAPI: {
    create: (id: string, cwd: string, cols: number, rows: number) => ipcRenderer.invoke('terminal:create', id, cwd, cols, rows),
    write: (id: string, data: string) => ipcRenderer.invoke('terminal:write', id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
    destroy: (id: string) => ipcRenderer.invoke('terminal:destroy', id),
    onData: (callback: (id: string, data: string) => void) => {
      ipcRenderer.on('terminal:data', (_event, id, data) => callback(id, data));
    },
    removeDataListener: () => {
      ipcRenderer.removeAllListeners('terminal:data');
    }
  },

  // ========== Terminal Presets ==========
  getTerminalPresets: (projectId?: string) => ipcRenderer.invoke('get-terminal-presets', projectId),
  addTerminalPreset: (preset: { projectId?: string; name: string; command: string; workingDirectory?: string; category?: string }) =>
    ipcRenderer.invoke('add-terminal-preset', preset),
  removeTerminalPreset: (presetId: string) => ipcRenderer.invoke('remove-terminal-preset', presetId),
  executeTerminalPreset: (presetId: string, terminalId?: string) => ipcRenderer.invoke('execute-terminal-preset', presetId, terminalId),

  // ========== Terminal Layouts ==========
  saveTerminalLayout: (layout: { id?: string; name: string; layoutData: string; isActive?: boolean }) =>
    ipcRenderer.invoke('save-terminal-layout', layout),
  getTerminalLayouts: (projectId?: string) => ipcRenderer.invoke('get-terminal-layouts', projectId),
  deleteTerminalLayout: (layoutId: string) => ipcRenderer.invoke('delete-terminal-layout', layoutId),
  setActiveTerminalLayout: (layoutId: string) => ipcRenderer.invoke('set-active-terminal-layout', layoutId),

  // ========== Terminal Sessions (Resume) ==========
  saveTerminalSession: (session: { projectId?: string; agent: string; resumeId?: string; topic?: string; workingDirectory?: string; totalTokens?: number; totalCost?: number }) =>
    ipcRenderer.invoke('save-terminal-session', session),
  getTerminalSessions: (projectId?: string, limit?: number) => ipcRenderer.invoke('get-terminal-sessions', projectId, limit),
  getTerminalSessionResumeId: (sessionId: string) => ipcRenderer.invoke('get-terminal-session-resume-id', sessionId),
  getSessionMessages: (sessionId: string, agentType?: string) => ipcRenderer.invoke('get-session-messages', sessionId, agentType),

  // ========== Workspace TODOs ==========
  getWorkspaceTodos: (projectId?: string) => ipcRenderer.invoke('get-workspace-todos', projectId),
  addWorkspaceTodo: (data: { projectId?: string; text: string; priority?: string }) => ipcRenderer.invoke('add-workspace-todo', data),
  toggleWorkspaceTodo: (todoId: string) => ipcRenderer.invoke('toggle-workspace-todo', todoId),
  deleteWorkspaceTodo: (todoId: string) => ipcRenderer.invoke('delete-workspace-todo', todoId),

  // ========== Prompt Templates ==========
  getPromptTemplates: (projectId?: string) => ipcRenderer.invoke('get-prompt-templates', projectId),
  savePromptTemplate: (data: { id?: string; projectId?: string; name: string; content: string; category?: string; isFormattingTemplate?: boolean }) =>
    ipcRenderer.invoke('save-prompt-template', data),
  deletePromptTemplate: (templateId: string) => ipcRenderer.invoke('delete-prompt-template', templateId),

  // ========== Project File System ==========
  readProjectFile: (relativePath: string, projectPath?: string) => ipcRenderer.invoke('read-project-file', relativePath, projectPath),
  listProjectFiles: (subDir?: string, projectPath?: string) => ipcRenderer.invoke('list-project-files', subDir, projectPath),

  // ========== Project Health ==========
  calculateProjectHealth: (projectId: string) => ipcRenderer.invoke('calculate-project-health', projectId),

  // ========== External Tracker ==========
  // External Activities
  getExternalActivities: () => ipcRenderer.invoke('get-external-activities'),
  addExternalActivity: (activity: { name: string; type: string; color?: string; icon?: string; default_duration?: number }) =>
    ipcRenderer.invoke('add-external-activity', activity),
  updateExternalActivity: (id: string, updates: { name?: string; color?: string; icon?: string; default_duration?: number; is_visible?: boolean; is_default?: boolean }) =>
    ipcRenderer.invoke('update-external-activity', id, updates),
  deleteExternalActivity: (id: string) => ipcRenderer.invoke('delete-external-activity', id),

  // External Sessions
  startExternalSession: (activityId: string) => ipcRenderer.invoke('start-external-session', activityId),
  startAfkSession: () => ipcRenderer.invoke('start-afk-session'),
  stopAfkSession: () => ipcRenderer.invoke('stop-afk-session'),
  stopExternalSession: (sessionId: string, endTime?: string) => ipcRenderer.invoke('stop-external-session', sessionId, endTime),
  updateExternalSession: (sessionId: string, updates: { duration_seconds?: number; started_at?: string; ended_at?: string }) => ipcRenderer.invoke('update-external-session', sessionId, updates),
  deleteExternalSession: (sessionId: string) => ipcRenderer.invoke('delete-external-session', sessionId),
   getExternalSessions: (period: 'today' | 'week' | 'month' | 'all') => ipcRenderer.invoke('get-external-sessions', period),
   getActivityStats: (activityId: string) => ipcRenderer.invoke('get-activity-stats', activityId),
  getActiveExternalSession: () => ipcRenderer.invoke('get-active-external-session'),
  getMorningPrompt: () => ipcRenderer.invoke('get-morning-prompt'),
  dismissMorningPrompt: () => ipcRenderer.invoke('dismiss-morning-prompt'),
  addManualSleep: (sleepData: { started_at: string; ended_at: string; device_off_to_sleep_seconds?: number; wake_up_to_app_seconds?: number }) => ipcRenderer.invoke('add-manual-sleep', sleepData),
  addExternalTime: (activityId: string, durationMinutes: number) => ipcRenderer.invoke('add-external-time', { activityId, durationMinutes }),
  getExternalStats: (period: 'today' | 'week' | 'month' | 'all') => ipcRenderer.invoke('get-external-stats', period),
  updateActivityChartPreference: (activityId: string, chartType: string) => ipcRenderer.invoke('update-activity-chart-preference', activityId, chartType),
  getSleepTrends: (period: 'week' | 'month') => ipcRenderer.invoke('get-sleep-trends', period),
  getConsistencyScore: (period: 'week' | 'month') => ipcRenderer.invoke('get-consistency-score', period),
  getExternalSettings: (key: string) => ipcRenderer.invoke('get-external-settings', key),
  setExternalSettings: (key: string, value: string) => ipcRenderer.invoke('set-external-settings', key, value),
  getTrackingSettings: () => ipcRenderer.invoke('get-tracking-settings'),
  setTrackingSetting: (key: string, value: string) => ipcRenderer.invoke('set-tracking-setting', key, value),
  getTypicalDay: (days?: number) => ipcRenderer.invoke('get-typical-day', days),
  getHourlyHeatmap: (days?: number) => ipcRenderer.invoke('get-hourly-heatmap', days),
  getBestDays: () => ipcRenderer.invoke('get-best-days'),
   getDayDetail: (date: string) => ipcRenderer.invoke('get-day-detail', date),
   getHourDetail: (date: string, hour: number) => ipcRenderer.invoke('get-hour-detail', date, hour),

   // ========== Workspace Save/Load ==========
   saveWorkspace: (data: {
     scope: 'session' | 'project' | 'global';
     projectId?: string;
     name?: string;
     layout?: any;
     openFiles?: string[];
     activeTerminalId?: string;
     todos?: any[];
     presets?: any[];
   }) => ipcRenderer.invoke('workspace:save', data),
    loadWorkspace: (data: {
      scope: 'session' | 'project' | 'global';
      projectId?: string;
      name?: string;
    }) => ipcRenderer.invoke('workspace:load', data),

  // ========= Tracker Mind - Problem Management =========
  getProblems: (projectId?: string) => ipcRenderer.invoke('get-problems', projectId),
  createProblem: (data: any) => ipcRenderer.invoke('create-problem', data),
  updateProblemStatus: (data: { problemId: string; status: string; projectId?: string }) =>
    ipcRenderer.invoke('update-problem-status', data),
  assignProblemToTerminal: (data: {
    problemId: string;
    terminalId?: string;
    skillId?: string;
    systemPrompt?: string;
  }) => ipcRenderer.invoke('assign-problem-to-terminal', data),
  getTerminalBindings: () => ipcRenderer.invoke('get-terminal-bindings'),
  getSkills: () => ipcRenderer.invoke('get-skills'),
  syncProblemsMd: () => ipcRenderer.invoke('sync-problems-md'),
  trackerMindSetup: (step: string, projectId?: string) => ipcRenderer.invoke('tracker-mind-setup', { step, projectId }),

  // ========= Tracker Mind - Requests =========
  getRequests: () => ipcRenderer.invoke('get-requests'),
  createRequest: (data: { title: string; description?: string; priority?: string; category?: string }) =>
    ipcRenderer.invoke('create-request', data),
  updateRequestStatus: (data: { requestId: string; status: string }) =>
    ipcRenderer.invoke('update-request-status', data),

  // ========= Tracker Mind - Terminal Binding =========
  registerTerminal: (data: { terminalId: string; projectId?: string; agentType?: string; status?: string }) =>
    ipcRenderer.invoke('register-terminal', data),
  updateTerminalBinding: (data: { terminalId: string; updates: { status?: string; active_problem_id?: string; session_context?: string } }) =>
    ipcRenderer.invoke('update-terminal-binding', data),
  saveTerminalBinding: (data: { terminalId: string; problemId?: string; sessionContext?: string; status?: string }) =>
    ipcRenderer.invoke('save-terminal-binding', data),
  getTerminalBinding: (terminalId: string) => ipcRenderer.invoke('get-terminal-binding', terminalId),
  sendInstructionsToTerminal: (data: { terminalId: string; instructions: string }) =>
    ipcRenderer.invoke('send-instructions-to-terminal', data),
  terminalWrite: (terminalId: string, text: string) =>
    ipcRenderer.invoke('write-terminal', { terminalId, text }),

  // ========= Tracker Mind - Live Parsing =========
  watchAgentFiles: () => ipcRenderer.invoke('watch-agent-files'),
  onAgentFileChanged: (callback: (data: { file: string; mtime: string }) => void) => {
    ipcRenderer.on('agent-file-changed', (_event, file, mtime) => callback({ file, mtime }));
    return () => { ipcRenderer.removeListener('agent-file-changed', () => {}); };
  },

  // ========= Agent Files (from project) =========
  readAgentFiles: (projectPath: string) => ipcRenderer.invoke('read-agent-files', projectPath),
  readAgentFile: (filePath: string, projectPath: string) => ipcRenderer.invoke('read-agent-file', filePath, projectPath),
  
  // ========= State Updates from AI =========
  updateStateFromAgent: (data: any) => ipcRenderer.invoke('update-state-from-agent', data),
});
