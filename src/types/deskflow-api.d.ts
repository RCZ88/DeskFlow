interface ProjectBackupManifest {
  id: string;
  projectId: string;
  label: string;
  timestamp: string;
  fileCount: number;
  totalSize: number;
  compressionRatio: number;
  autoBackup: boolean;
  trigger?: string;
}

interface ProjectBackupDiff {
  added: string[];
  deleted: string[];
  modified: string[];
  unchanged: string[];
  totalChanged: number;
}

interface BackupManifest {
  createdAt: string;
  trigger: 'startup' | 'interval' | 'quit' | 'manual' | 'pre-restore' | 'agent-session';
  dbPath: string;
  backupFile: string;
  bytes: number;
  sha256: string;
  rowCounts: Record<string, number>;
  totalRows: number;
  integrityOk: boolean;
}

interface BackupSettings {
  mirrorDir: string;
  retention: { hourly: number; daily: number; weekly: number; monthly: number };
  autoBackup: boolean;
}

interface BackupStatus {
  settings: BackupSettings;
  backupDir: string;
  dbPath: string;
  lastBackup: BackupManifest | null;
  backupCount: number;
  totalBytes: number;
  schedulerRunning: boolean;
  intervalMs: number;
  triggers: string[];
}

interface DeskflowAPI {
  onForegroundChange: (cb: (data: any) => void) => () => void;
  onTrackingHeartbeat: (cb: (data: any) => void) => () => void;
  onBrowserTrackingEvent: (cb: (data: any) => void) => () => void;
  onTrackerMindInitProgress: (cb: (data: any) => void) => () => void;
  onRecapProgress: (cb: (data: { month: string; stage: 'reading' | 'analyzing' | 'writing' | 'saving' | 'done' }) => void) => () => void;
  getLogs: () => Promise<any[]>;
  getLogsByPeriod: (params: { period: 'today' | 'week' | 'month' | 'all'; dateOffset?: number }) => Promise<any[]>;
  getDashboardData: (params: { period: string; dateOffset?: number }) => Promise<{ success: boolean; data?: any; error?: string }>;
  getPageStats: (params: { page: string; period: string; dateOffset?: number }) => Promise<{ success: boolean; data?: any; error?: string }>;
  backfillAggregations: () => Promise<{ success: boolean; message?: string }>;
  getStats: () => Promise<any[]>;
  getAppStats: (period?: 'today' | 'week' | 'month' | 'all') => Promise<any[]>;
  getDailyStats: (period: 'week' | 'month' | 'all') => Promise<any>;
  toggleTracking: () => Promise<boolean>;
  setTracking: (enabled: boolean) => Promise<boolean>;
  clearData: () => Promise<boolean>;
  clearToday: () => Promise<boolean>;
  getDbPath: () => Promise<string>;
  getStorageStatus: () => Promise<{
    type: 'sqlite' | 'json' | 'none';
    working: boolean;
    path: string;
    error?: string;
    logCount: number;
  }>;
  getPreferences: () => Promise<Record<string, any>>;
  setPreference: (key: string, value: any) => Promise<boolean>;
  sttGetStatus: () => Promise<{ engine: 'api' | 'native' | 'browser'; apiConfigured: boolean; nativeAvailable: boolean; label: string }>;
  sttTranscribe: (payload: { audioBase64: string; mime?: string; lang?: string }) => Promise<{ ok: boolean; text?: string; error?: string }>;
  sttNativeStart: (lang?: string) => Promise<{ ok: boolean; error?: string }>;
  sttNativeStop: () => Promise<{ ok: boolean }>;
  onSttNativeEvent: (callback: (ev: { type: string; text?: string }) => void) => () => void;
  getBrowserLogs: () => Promise<any[]>;
  getBrowserDomainStats: () => Promise<any[]>;
  getAllBrowserDomainStats: () => Promise<any[]>;
  getBrowserCategoryStats: () => Promise<any[]>;
  setBrowserTracking: (enabled: boolean) => Promise<boolean>;
  getBrowserTrackingStatus: () => Promise<{
    enabled: boolean;
    serverRunning: boolean;
    port: number;
    excludedDomains: string[];
  }>;
  setBrowserExcludedDomains: (domains: string[]) => Promise<boolean>;
  setRecordingMode: (type: 'browser' | 'app', mode: 'always' | 'on-view') => Promise<boolean>;
  getRecordingModes: () => Promise<{
    browser: string;
    app: string;
    browserPageVisible: boolean;
    dashboardPageVisible: boolean;
  }>;
  setPageVisibility: (page: 'browser' | 'dashboard', visible: boolean) => Promise<boolean>;
  getDailyProductivity: (date: string) => Promise<any>;
  getProductivityRange: (startDate: string, endDate: string) => Promise<any[]>;
  saveProductivitySession: (session: any) => Promise<any>;
  getProductivitySessions: (opts?: any) => Promise<any>;
  clearProductivitySessions: () => Promise<void>;
  getLongestFocus: () => Promise<{ today: any[]; week: any[]; allTime: any[] }>;
  getCurrentForeground: () => Promise<any>;
  cleanCorruptedData: () => Promise<{ success: boolean; deletedCount: number; error?: string }>;
  deepCleanAndRebuild: () => Promise<{ success: boolean; logsCleared?: number; aggregatesCleared?: number; message?: string }>;
  migrateToAggregates: () => Promise<{ success: boolean; aggregatesUpdated?: number; browserAggregatesUpdated?: number; message?: string }>;
  getDailyAggregates: () => Promise<any[]>;
  getBrowserSessions: () => Promise<any[]>;
  getSessions: () => Promise<any[]>;
  getTableSchema: (tableName: string) => Promise<any>;
  getDatabaseTables: () => Promise<{ tables: string[]; type: string; error?: string }>;
  getTableData: (tableName: string, limit?: number) => Promise<any[] | { error: string }>;
  updateCategoriesFromOverrides: (appOverrides: Record<string, string>, domainOverrides: Record<string, string>) => Promise<{ success: boolean; updatedCount: number; error?: string }>;
  previewCategoriesFromOverrides: (appOverrides: Record<string, string>, domainOverrides: Record<string, string>) => Promise<{ success: boolean; preview: boolean; totalMismatch: number; mismatches: { kind: 'app' | 'domain'; key: string; current: string | null; next: string; count: number }[]; byCategory: Record<string, number>; error?: string }>;
  saveFile: (options: { content: string; filename: string; fileType: string }) => Promise<{ success: boolean; path?: string; message?: string }>;
  pickFolder: () => Promise<{ success: boolean; path: string | null }>;
  scanCustomDirectory: (rootDir: string) => Promise<{ success: boolean; projects: any[] }>;
  getCustomScanDirs: () => Promise<string[]>;
  saveCustomScanDirs: (dirs: string[]) => Promise<{ success: boolean }>;
  detectIDEs: () => Promise<any[]>;
  getIDEs: () => Promise<any[]>;
  getExtensions: (ideId?: string) => Promise<any[]>;
  scanTools: () => Promise<any[]>;
  getTools: (category?: string) => Promise<any[]>;
  getToolCategories: () => Promise<{ category: string }[]>;
  agentSend: (terminalId: string, data: string, agentType?: string) => Promise<{
    success: boolean;
    queued?: boolean;
    written?: boolean;
    verified?: boolean;
    error?: string;
  }>;
  resetTools: () => Promise<{ success: boolean; message: string }>;
  addProject: (data: { name: string; path: string; repositoryUrl?: string; vcsType?: string; primaryLanguage?: string; defaultIde?: string }) => Promise<{ success: boolean; id?: string; name?: string; message?: string }>;
  getProjects: () => Promise<any[]>;
  getProjectTools: (projectId: string) => Promise<any[]>;
  removeProject: (projectId: string) => Promise<{ success: boolean }>;
  openProject: (projectId: string, ideId?: string) => Promise<{ success: boolean; ide?: string; message?: string }>;
  getAIUsageSummary: (period?: string, dateOffset?: number, projectId?: string) => Promise<any>;
  getAIUsageDetails: (period?: string, dateOffset?: number) => Promise<{ languageDistribution: Record<string, { count: number; tokens: number }>; avgResponseTime: number; responseTimeByDay: Record<string, number> }>;
  getCommitStats: (projectId?: string, period?: string) => Promise<any>;
  getIDEProjectsOverview: (period?: string, dateOffset?: number) => Promise<any>;
  getCodeChangeStats: (period?: string, dateOffset?: number, projectId?: string) => Promise<any>;
  getCodeActivityStats: (period?: string, dateOffset?: number, projectId?: string) => Promise<any>;
  scanIdeDefaultProjects: () => Promise<{ ide: string; projects: { name: string; path: string }[] }[]>;
  detectProjectScripts: (projectPath: string) => Promise<any>;
  getProjectRunConfig: (projectId: string) => Promise<any>;
  saveProjectRunConfig: (projectId: string, config: any) => Promise<any>;
  getAllRunConfigs: () => Promise<{ success: boolean; configs?: Array<{ projectId: string; name: string; path: string; config: any }>; message?: string }>;
  runProject: (projectId: string, config: any) => Promise<any>;
  executeProjectCommand: (terminalId: string, command: string) => Promise<any>;
  stopProject: (terminalId: string) => Promise<any>;
  getRunningProjects: () => Promise<any>;
  openUrl: (url: string) => Promise<any>;
  syncAIUsage: () => Promise<{ success: boolean; [key: string]: number | boolean | string }>;
  onAISyncProgress: (callback: (data: any) => void) => () => void;
  debugAIAgents: () => Promise<Record<string, { detected: boolean; paths: string[] }>>;
  syncCommits: (projectId: string, repoPath?: string) => Promise<{ success: boolean; count: number }>;
  syncGitHubCommits: (projectId: string, owner: string, repo: string, token?: string) => Promise<{ success: boolean; count: number }>;
  getDORAMetrics: (projectId: string, period?: 'week' | 'month') => Promise<any>;
  getCommitHistory: (projectId: string, limit?: number) => Promise<any[]>;
  getContributorStats: (projectId: string) => Promise<any>;
  createTerminalWindow: () => Promise<boolean>;
  spawnTerminal: (terminalId: string, cwd?: string, agentType?: string, cols?: number, rows?: number) => Promise<boolean>;
  writeTerminal: (terminalId: string, data: string) => Promise<boolean>;
  resizeTerminal: (terminalId: string, cols: number, rows: number) => Promise<boolean>;
  killTerminal: (terminalId: string) => Promise<boolean>;
  onTerminalData: (callback: (data: { terminalId: string; data: string }) => void) => void;
  onTerminalExit: (callback: (data: { terminalId: string; exitCode: number; signal: number }) => void) => void;
  getTerminalPresets: (projectId?: string) => Promise<any[]>;
  addTerminalPreset: (preset: { projectId?: string; name: string; command: string; workingDirectory?: string; category?: string }) => Promise<{ success: boolean; id?: string; message?: string }>;
  removeTerminalPreset: (presetId: string) => Promise<{ success: boolean; message?: string }>;
  executeTerminalPreset: (presetId: string, terminalId?: string) => Promise<{ success: boolean; command?: string; terminalId?: string; message?: string }>;
  saveTerminalLayout: (layout: { id?: string; name: string; layoutData: string; isActive?: boolean }) => Promise<{ success: boolean; id?: string; message?: string }>;
  getTerminalLayouts: (projectId?: string) => Promise<any[]>;
  deleteTerminalLayout: (layoutId: string) => Promise<{ success: boolean; message?: string }>;
  setActiveTerminalLayout: (layoutId: string) => Promise<{ success: boolean; message?: string }>;
  saveTerminalSession: (session: { projectId?: string; agent: string; resumeId?: string; topic?: string; workingDirectory?: string; totalTokens?: number; totalCost?: number; category?: string; status?: string; productArea?: string; description?: string; autoTags?: string[]; categoryConfirmed?: boolean }) => Promise<{ success: boolean; id?: string }>;
  getTerminalSessions: (projectId?: string, limit?: number) => Promise<any[]>;
  getTerminalSessionResumeId: (sessionId: string) => Promise<string | null>;
  deleteTerminalSession: (sessionId: string) => Promise<{ success: boolean }>;
  getSessionMessages: (sessionId: string, agentType?: string) => Promise<{ success: boolean; data: any[] }>;
  saveTerminalMessage: (data: { sessionId: string; role: string; content: string }) => Promise<{ success: boolean; id?: any }>;
  getPromptHistory: (opts?: { projectId?: string; limit?: number }) => Promise<{ success: boolean; data: any[]; error?: string }>;
  deleteTerminalMessage: (id: number) => Promise<{ success: boolean; error?: string }>;
  getPromptStatus: () => Promise<{ success: boolean; data: any[] }>;
  aiTaskAdd: (data: { terminalId: string; prompt: string; agent: string; sessionId: string; projectPath: string }) => void;
  aiTaskWatch: (projectPath: string) => Promise<any>;
  aiTaskStopWatch: (projectPath: string) => Promise<any>;
  onAiTaskUpdated: (callback: (data: any) => void) => () => void;
  onAiTaskFileChanged: (callback: (data: any) => void) => () => void;
  updateSessionCategory: (data: { sessionId: string; category?: string; productArea?: string; description?: string; status?: string; tags?: string[]; categoryConfirmed?: boolean }) => Promise<{ success: boolean }>;
  getParsedSessionItems: (sessionId: string) => Promise<{ success: boolean; data: any[] }>;
  analyzeSessionCategory: (sessionId: string) => Promise<{ success: boolean; category: string; confidence: number; tags: string[]; productArea: string }>;
  saveSessionConfig: (sessionId: string, config: any, projectPath?: string) => Promise<{ success: boolean; error?: string }>;
  loadSessionConfig: (sessionId: string, projectPath?: string) => Promise<{ success: boolean; data: any; error?: string }>;
  listInitFiles: (projectPath?: string) => Promise<{ success: boolean; data: string[] }>;
  resolveAtMention: (data: { input: string; terminalTabs: Array<{ id: string; name: string }> }) => Promise<{ terminalId: string | null; message: string; resolved: boolean }>;
  getAISyncStatus: () => Promise<{ lastRunAt: string | null; agentLastRun: Record<string, string>; paths: Record<string, any> }>;
  calculateProjectHealth: (projectId: string) => Promise<{ healthScore: number; activityLevel: string; aiSessions: number; commits: number }>;
  getProjectDetails: (projectId: string) => Promise<{ project: any; tools: any[]; sessions: any[]; health: any; presets: any[]; aiUsage: any }>;
  getModelImprovementStats: (opts?: { terminalId?: string }) => Promise<{ messageCounts: Record<string, number>; reinjectionCount: number; threshold: number; actionsAttempted: number; actionsFailed: number } | null>;
  setReinjectThreshold: (payload: { threshold: number }) => Promise<{ success: boolean; error?: string }>;
  setModelDebug: (payload: { enabled: boolean }) => Promise<{ success: boolean; error?: string }>;
  readActionsErrorLog: () => Promise<{ entries: string[]; exists: boolean }>;
  routePrompt: (request: { prompt: string; projectPath?: string }) => Promise<{ action: string; sessionId?: string; sessionName?: string; terminalId?: string; confidence?: number; suggestedName?: string; suggestedSummary?: string; reason?: string }>;
  updateSessionSummary: (request: { sessionId: string; force?: boolean }) => Promise<{ success: boolean; skipped?: boolean; summary?: string; topic?: string; autoNamed?: boolean; reason?: string; error?: string }>;
  getRoutingCosts: () => Promise<{ today: any; week: any; month: any; total: any; byType: any[] }>;
  resetRoutingCosts: () => Promise<{ success: boolean }>;
  getAutoAssignConfig: () => Promise<any>;
  saveAutoAssignConfig: (config: any) => Promise<{ success: boolean }>;
  lockFile: (filePath: string, terminalId: string, sessionId?: string | null, action?: string) => Promise<{ acquired: boolean; heldBy?: string }>;
  releaseFileLock: (filePath: string, terminalId: string) => Promise<{ success: boolean }>;
  getFileLocks: () => Promise<Array<{ filePath: string; terminalId: string; sessionId: string | null; timestamp: number; action: string }>>;
  getLocksForTerminal: (terminalId: string) => Promise<Array<{ filePath: string; terminalId: string; sessionId: string | null; timestamp: number; action: string }>>;
  getTouchedFiles: (opts?: { terminalId?: string; filePath?: string; limit?: number }) => Promise<{ success: boolean; data: any[]; error?: string }>;
  compileSyncSummary: (terminalId: string) => Promise<{ success: boolean; summary: string; error?: string }>;
  broadcastContextDelta: (data: { terminalId: string; type: string; payload: any }) => Promise<{ success: boolean; sentCount: number }>;
  onFileConflict: (callback: (data: { filePath: string; requestingTerminal: string; lockingTerminal: string; sessionId: string | null; timestamp: number }) => void) => () => void;
  getCrossSessionSyncConfig: () => Promise<{ enabled: boolean; lockTTL: number; contextBroadcast: boolean; conflictWarningMode: string; syncCommand: boolean }>;
  setCrossSessionSyncConfig: (config: any) => Promise<{ success: boolean }>;
  executeCommand: (command: string, cwd?: string) => Promise<{ stdout: string; stderr: string; error?: string }>;
  getTopicDigest: () => Promise<{ success: boolean; topics?: any[]; error?: string }>;
  saveAiConfig: (config: any) => Promise<{ success: boolean }>;
  getAiConfig: () => Promise<any>;
  getAiProviders: () => Promise<any>;
  saveAiProviders: (state: any) => Promise<{ success: boolean }>;
  testAiProvider: (providerId: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  getInterestTopics: () => Promise<string[]>;
  addInterestTopic: (topic: string) => Promise<{ success: boolean }>;
  removeInterestTopic: (topic: string) => Promise<{ success: boolean }>;
  // Knowledge Base (R5: self-contained context/RAG — deskflow-kb.json + BM25)
  kbIngest: (file: { name: string; type: string; content: string }) => Promise<{ success: boolean; docId?: string; chunkCount?: number; error?: string }>;
  kbQuery: (query: string, limit?: number) => Promise<Array<{ id: string; docId: string; docName: string; content: string }>>;
  kbList: () => Promise<Array<{ id: string; name: string; type: string; addedAt: number }>>;
  kbRemove: (docId: string) => Promise<{ success: boolean; error?: string }>;
  // Feature Studio: AI Director pipeline
  featureStudioCompile: (script: string) => Promise<{ success: boolean; content?: string; providerId?: string; error?: string }>;
  readPlanningMd: () => Promise<{ content: string; error?: string }>;
  writePlanningMd: (content: string) => Promise<{ success: boolean; error?: string }>;
  writeFeatureSpecFile: (content: string) => Promise<{ success: boolean; error?: string }>;
  getGoalContext: () => Promise<{ success: boolean; last7dByCategory?: any[]; yesterday?: any; error?: string }>;
  parseGoalFeedback: (data: { message: string; goals: string[] }) => Promise<{ completed: string[]; added: any[]; note: string }>;
  // Life Phases Timeline (The River of Years)
  lifePhaseGet: () => Promise<{ ok: boolean; data?: any[]; error?: string }>;
  lifePhaseGetSummary: () => Promise<{ ok: boolean; data?: string | null; error?: string }>;
  lifePhaseSave: (phase: any) => Promise<{ ok: boolean; data?: any; error?: string }>;
  lifePhaseDelete: (phaseId: string) => Promise<{ ok: boolean; data?: any; error?: string }>;
  lifePhaseSaveAll: (phases: any[]) => Promise<{ ok: boolean; data?: any[]; error?: string }>;
  lifePhaseAiAssist: (params: { kind?: string; context?: any }) => Promise<{ ok: boolean; data?: { questions: string[] }; error?: string }>;
  lifePhaseGetPeriodContext: (params: { startDate: string; endDate: string }) => Promise<{ ok: boolean; data?: any; error?: string }>;
  lifePhaseAiReflect: (params: any) => Promise<{ ok: boolean; data?: any; error?: string }>;
  lifePhaseAiEraTrends: (params: { startYear: number; endYear: number | null; title: string }) => Promise<{ ok: boolean; data?: string; error?: string }>;
  lifePhaseAiSummarize: (phases: any[]) => Promise<{ ok: boolean; data?: string; error?: string }>;
  connectors: {
    list: () => Promise<{ success: boolean; connectors: any[]; error?: string }>;
    add: (connector: { type: string; provider: string; displayName: string; config: any }) => Promise<{ success: boolean; connector?: any; error?: string }>;
    remove: (id: string) => Promise<{ success: boolean; error?: string }>;
    test: (id: string) => Promise<{ success: boolean; message: string; latencyMs?: number }>;
    sync: (id: string) => Promise<{ success: boolean; itemsAdded: number; itemsUpdated: number; error?: string }>;
    items: (id: string, opts?: { type?: string; limit?: number }) => Promise<{ success: boolean; items: any[]; error?: string }>;
    status: (id: string) => Promise<{ success: boolean; status: string; lastSync?: string; errorMessage?: string }>;
  };
  mcpListTools: (serverId: string) => Promise<{ success: boolean; tools: any[]; error?: string }>;
  mcpCallTool: (serverId: string, toolName: string, args: Record<string, any>) => Promise<{ success: boolean; result: any; error?: string }>;
  mcpServerStatus: (serverId: string) => Promise<{ status: string; toolCount?: number; uptime?: number }>;
  mcpStartServer: (serverId: string) => Promise<{ success: boolean; tools?: any[]; error?: string }>;
  mcpStopServer: (serverId: string) => Promise<{ success: boolean; error?: string }>;
  aceternityFetchRegistry: () => Promise<{ success: boolean; components: any[]; total: number; error?: string }>;
  aceternityFetchComponent: (slug: string) => Promise<{ success: boolean; component?: any; error?: string }>;
  aceternityInstallComponent: (slug: string, cwd: string) => Promise<{ success: boolean; filesWritten?: string[]; error?: string }>;
  fetchReferoCatalog: (forceRefresh?: boolean, query?: string) => Promise<{ success: boolean; systems: any[]; total: number; error?: string }>;
  fetchReferoSystem: (slug: string) => Promise<{ success: boolean; system?: any; error?: string }>;
  searchReferoSystems: (query: string) => Promise<{ success: boolean; systems: any[]; total: number; error?: string }>;
  getDesignLibraryConfig: () => Promise<any>;
  setDesignLibraryConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
  getDesignCachedData: (key: string) => Promise<{ success: boolean; data?: any; timestamp?: number; stale?: boolean }>;
  testDesignLibraryConnection: (serverId: string) => Promise<{ success: boolean; latency?: number; toolCount?: number; error?: string }>;
  financeGetAccounts: () => Promise<any[]>;
  financeCreateAccount: (data: any) => Promise<any>;
  financeUpdateAccount: (data: any) => Promise<any>;
  financeArchiveAccount: (id: number) => Promise<any>;
  financeGetWallets: (accountId?: number) => Promise<any[]>;
  financeCreateWallet: (data: any) => Promise<any>;
  financeUpdateWallet: (data: any) => Promise<any>;
  financeAdjustBalance: (id: number, newBalance: number) => Promise<any>;
  financeGetCategories: () => Promise<any[]>;
  financeCreateCategory: (data: any) => Promise<any>;
  financeUpdateCategory: (data: any) => Promise<any>;
  financeGetTransactions: (filters?: any) => Promise<any[]>;
  financeCreateTransaction: (data: any) => Promise<any>;
  financeCreateTransfer: (data: any) => Promise<any>;
  financeUpdateTransaction: (data: any) => Promise<any>;
  financeDeleteTransaction: (id: number) => Promise<any>;
  financeBatchUpdateCategory: (ids: number[], categoryId: number) => Promise<{ success: boolean; updated?: number; error?: string }>;
  financeGetSummary: () => Promise<any>;
  financeGetSpendingByCategory: () => Promise<any[]>;
  financeGetMonthlyTrends: () => Promise<any[]>;
  financeGetOnBehalfOfSummary: () => Promise<{ totalExpense: number; breakdown: { label: string; total: number; count: number }[] }>;
  financeGetFtPersons: () => Promise<{ id: number; name: string; email: string | null; phone: string | null; notes: string; created_at: string; updated_at: string; transaction_count: number; total_owed: number; total_paid: number; balance: number; wallet_id: number | null }[]>;
  financeGetFtPersonBalances: () => Promise<{ id: number; name: string; email: string | null; phone: string | null; total_owed: number; total_repaid: number; transaction_count: number }[]>;
  financeCreateFtPerson: (data: { name: string; email?: string; phone?: string; notes?: string }) => Promise<{ id: number; name: string; email: string | null; phone: string | null; notes: string; transaction_count: number; total_owed: number; total_paid: number } | null>;
  financeUpdateFtPerson: (data: { id: number; name?: string; email?: string; phone?: string; notes?: string }) => Promise<{ success: boolean; error?: string }>;
  financeDeleteFtPerson: (id: number) => Promise<{ success: boolean }>;
  financeRecordFtRepayment: (data: {
    originalTxId: number; personId?: number; amount: number; date: string;
    walletId?: number; accountId?: number; description?: string; isOverpayment?: boolean;
  }) => Promise<{ success: boolean; repaymentTxId?: number; error?: string }>;
  financeGetDashboardOverview: (currency?: string) => Promise<{
    summary: { totalIncome: number; totalExpense: number; netBalance: number };
    recentTransactions: any[];
    monthlyTrends: any[];
    spendingByCategory: any[];
    subscriptionCount: number;
  }>;
  financeIsLocked: () => Promise<any>;
  financeGetLockState: () => Promise<any>;
  financeUnlock: (password: string) => Promise<any>;
  financeLock: () => Promise<any>;
  financeSetPassword: (password: string) => Promise<any>;
  financeChangePassword: (currentPassword: string, nextPassword: string) => Promise<any>;
  financeCheckPasswordSetup: () => Promise<any>;
  financeSetRememberDevice: (remember: boolean, days: number) => Promise<any>;
  financeSetLockTimeout: (timeoutMs: number) => Promise<any>;
  financeGetSecuritySettings: () => Promise<any>;
  financeCheckPageAccess: () => Promise<any>;
  financeBiometricUnlock: () => Promise<any>;
  financeGetWebAuthnCredential: () => Promise<any>;
  financeStoreWebAuthnCredential: (credentialId: string) => Promise<any>;
  financeGetDisplayCurrency: () => Promise<{ currency: string }>;
  financeSetDisplayCurrency: (currency: string) => Promise<{ success: boolean }>;
  financeRecapList: () => Promise<{ ok: boolean; data?: any[]; error?: string }>;
  financeRecapGet: (month: string) => Promise<{ ok: boolean; data?: any; error?: string }>;
  financeRecapGenerate: (month: string, force?: boolean) => Promise<{ ok: boolean; data?: any; error?: string }>;
  financeRecapDelete: (month: string) => Promise<{ ok: boolean; error?: string }>;
  financeRecapMonthsWithData: () => Promise<{ ok: boolean; data?: string[]; error?: string }>;
  financeCryptoCacheStatus: () => Promise<{ lastFetch: number; cacheAgeS: number; rateLimited: boolean; retryIn: number; coinsTracked: number }>;
  financeFetchCryptoPrices: (coinIds: string[], currency?: string) => Promise<any[]>;
  financeGetCryptoHistory: (coinId: string, days?: number, currency?: string) => Promise<any[]>;
  financeRecalculateBalances: (walletId: number, dryRun?: boolean) => Promise<{ success: boolean; newBalance?: number; oldBalance?: number; breakdown?: any[]; initialBalance?: number; walletName?: string; error?: string }>;
  financeApplyRecalculatedBalance: (walletId: number) => Promise<{ success: boolean; newBalance?: number; oldBalance?: number; breakdown?: any[]; initialBalance?: number; walletName?: string; error?: string }>;
  financeUpdateTransactionSortOrder: (updates: { id: number; sort_order: number }[]) => Promise<{ success: boolean; error?: string }>;
  financeRecalculateAllBalances: () => Promise<{ success: boolean; results?: any[]; error?: string }>;
  auditList: (params?: { entityType?: string; entityId?: number; limit?: number; offset?: number }) => Promise<{ rows: any[]; total: number }>;
  auditGet: (id: number) => Promise<any>;
  learnGetProfile: (key: string) => Promise<string | null>;
  learnSetProfile: (key: string, value: string) => Promise<{ ok: boolean; error?: string }>;
  learnDeleteProfile: (key: string) => Promise<{ ok: boolean; error?: string }>;
  learnGetAllProfile: () => Promise<Record<string, string>>;

  // Insight Engine
  getDailyFunFact: () => Promise<any | null>;
  buildInsightRollup: (date: string) => Promise<{ ok: boolean; error?: string }>;
  getInsightStrip: (params?: { period?: string }) => Promise<any[]>;
  getRewind: (period: string) => Promise<any | null>;
  logInsightEvent: (atomId: string, eventType: string) => Promise<void>;
  getHomeSummary: () => Promise<{
    focusMinutes: number;
    walletCount: number;
    totalBalance: number;
    dueReviews: number;
    sleepSeconds: number;
    financeLocked: boolean;
  } | null>;

  // Backup & Restore
  backup: {
    create: () => Promise<any>;
    list: () => Promise<any[]>;
    restore: (name: string) => Promise<{ success: boolean; error?: string }>;
    exportJSON: () => Promise<string>;
    exportCSV: (tables: string[]) => Promise<string[]>;
  };

  // Subscriptions
  subscriptionsList: (walletId?: number) => Promise<any[]>;
  subscriptionsCreate: (data: any) => Promise<any>;
  subscriptionsUpdate: (data: any) => Promise<{ success: boolean }>;
  subscriptionsDelete: (id: number) => Promise<{ success: boolean }>;
  subscriptionsGetUpcomingRenewals: (days?: number) => Promise<any[]>;
  subscriptionsGenerateDueTransactions: () => Promise<{ created: number; subscriptions: { subId: number; txnId: number; name: string; amount: number }[] }>;
  subscriptionsSkipRenewal: (id: number) => Promise<{ success: boolean; error?: string }>;

  // Pairing & Relay (mobile phone connection)
  pairGenerateCode: (terminalId: string) => Promise<{
    success: boolean; code?: string; terminalId?: string; expiresAt?: number;
    wsUrl?: string; syncUrl?: string; port?: number; error?: string;
  }>;
  pairRevoke: (code: string) => Promise<{ success: boolean }>;
  onRelayPaired: (callback: (data: { terminalId: string }) => void) => () => void;

  // Device management
  listDevices: () => Promise<{ success: boolean; devices?: any[]; error?: string }>;
  revokeDevice: (deviceId: string) => Promise<{ success: boolean; error?: string }>;
  revokeAllDevices: () => Promise<{ success: boolean; error?: string }>;

  // Auth: register, login, pair generate, state, logout
  authGetState: () => Promise<{ authenticated: boolean; userId: string | null; deviceId: string | null; syncUrl: string }>;
  authRegister: (args: { email: string; password: string }) => Promise<{ success: boolean; userId?: string; deviceId?: string; error?: string }>;
  authLogin: (args: { email: string; password: string }) => Promise<{ success: boolean; userId?: string; deviceId?: string; error?: string }>;
  authPairGenerate: () => Promise<{ success: boolean; code?: string; expiresAt?: number; expiresAtMs?: number; syncUrl?: string; lanHost?: string; syncPort?: string; error?: string }>;
  authLogout: () => Promise<{ success: boolean }>;

  // Learn profile
  learnGetProfile: ({ key }: { key: string }) => Promise<any>;
  learnSetProfile: ({ key, value }: { key: string; value: string }) => Promise<any>;
  learnDeleteProfile: ({ key }: { key: string }) => Promise<any>;
  learnGetAllProfile: () => Promise<Record<string, string>>;

  // Deep Focus Sessions
  focus: {
    start: (cfg: { durationSec: number; strictness?: 'distracting' | 'non_allowed'; allowed?: { apps?: string[]; domains?: string[]; tiers?: string[] } }) => Promise<any>;
    end: (outcome?: string) => Promise<void>;
    getState: () => Promise<{ active: boolean; endsAt: number | null; remainingSec: number; strictness: string; paused: boolean }>;
    history: (opts?: { limit?: number }) => Promise<any[]>;
    onState: (cb: (state: { active: boolean; endsAt: number | null; remainingSec: number; strictness: string; paused: boolean }) => void) => (() => void);
    onEnded: (cb: (data: { outcome: string; reason: string | null; id: number }) => void) => (() => void);
  };

  // Focus goals (daily per-strictness targets)
  focusGoal: {
    get: () => Promise<{ lenient_goal_sec: number; strict_goal_sec: number; updated_at: string | null }>;
    save: (cfg: { lenient_goal_sec?: number; strict_goal_sec?: number }) => Promise<{ lenient_goal_sec: number; strict_goal_sec: number; updated_at: string | null }>;
  };

  // Focus Groups (named allowed-app sets for Deep Focus sessions)
  focusGroup: {
    list: () => Promise<any[]>;
    get: (id: number) => Promise<any>;
    save: (g: any) => Promise<{ success: boolean; id?: number; error?: string }>;
    remove: (id: number) => Promise<{ success: boolean; error?: string }>;
    startWith: (id: number, durationSec?: number, strictness?: string) => Promise<any>;
    linkUsage: (args: { sessionId: number; groupId: number; goalIds: string[] }) => Promise<{ success: boolean; error?: string }>;
    getUsage: () => Promise<Array<{ group_id: number; session_id: number }>>;
  };

  // ========== Project Backup (Design Workspace) ==========
  projectBackup: {
    create: (projectId: string, projectPath: string, label?: string, extra?: Record<string, unknown>) => Promise<{ success: boolean; data?: ProjectBackupManifest; error?: string }>;
    list: (projectId?: string) => Promise<{ success: boolean; data: ProjectBackupManifest[]; error?: string }>;
    get: (backupId: string) => Promise<{ success: boolean; data?: ProjectBackupManifest; error?: string }>;
    delete: (backupId: string, projectId: string) => Promise<{ success: boolean; error?: string }>;
    restore: (projectId: string, backupId: string) => Promise<{ success: boolean; data?: { restoredCount: number }; error?: string }>;
    diff: (projectId: string, backupId: string) => Promise<{ success: boolean; data?: ProjectBackupDiff; error?: string }>;
    schedule: (projectId: string, minutes: number, projectPath?: string) => Promise<{ success: boolean; error?: string }>;
    getSchedules: () => Promise<{ success: boolean; data?: Array<{ projectId: string; minutes: number; projectPath?: string; enabled: boolean; lastRunAt?: string | null }>; error?: string }>;
  };

  // ========== Database Backup ==========
  backup: {
    create: () => Promise<BackupManifest>;
    list: () => Promise<BackupManifest[]>;
    restore: (name: string) => Promise<{ success: boolean }>;
    exportJSON: () => Promise<string>;
    exportCSV: (tables: string[]) => Promise<string[]>;
    status: () => Promise<BackupStatus>;
    verify: (name: string) => Promise<{ ok: boolean; rows: number; error?: string }>;
    settingsGet: () => Promise<BackupSettings>;
    settingsSet: (patch: Partial<BackupSettings>) => Promise<BackupSettings>;
    pickMirrorDir: () => Promise<{ canceled: boolean; mirrorDir?: string; settings?: BackupSettings }>;
  };

  // ========== Git Safety Layer ==========
  gitSafety: {
    check: (command: string) => Promise<GitSafetyCheckResult>;
    getSettings: () => Promise<GitSafetySettings>;
    setSettings: (settings: Partial<GitSafetySettings>) => Promise<{ success: boolean }>;
    getPending: () => Promise<GitSafetyPending | null>;
    confirmPending: (terminalId: string) => Promise<{ success: boolean; command?: string }>;
    cancelPending: (terminalId: string) => Promise<{ success: boolean }>;
  };
}

export interface GitSafetySettings {
  enabled: boolean;
  blockHardReset: boolean;
  blockForcePush: boolean;
  blockDestructive: boolean;
  blockBranchDelete: boolean;
  customPatterns: string[];
  askBeforeAction: boolean;
}

export interface GitSafetyCheckResult {
  dangerous: boolean;
  patterns: string[];
  command: string;
  suggestion: string;
}

export interface GitSafetyPending {
  terminalId: string;
  command: string;
  patterns: string[];
  suggestion: string;
  timestamp: number;
}

declare global {
  interface Window {
    deskflowAPI?: DeskflowAPI;
  }
}
