# Context Bundle: Self-Expanding Agentic System

> Target AI has **zero file access**. All source code is inlined below.
> DeskFlow: Electron + React + better-sqlite3 + Tailwind CSS

---

## 1. System Architecture Overview

```
Renderer (React SPA)            Electron Main Process
┌────────────────────┐          ┌──────────────────────┐
│ React Router v6    │  IPC     │ main.ts (28881 lines) │
│ HashRouter         │◄────────►│ - 20+ service modules │
│                    │          │ - SQLite via          │
│ Components         │          │   better-sqlite3       │
│  ├── pages/        │          │ - Window management   │
│  ├── components/   │          │ - PTY terminal mgmt   │
│  └── lib/          │          │ - IPC handlers        │
└────────────────────┘          └──────────────────────┘
         │                              │
         │ localStorage                 │ SQLite DB
         ▼                              ▼
  localStore state            %APPDATA%/DeskFlow/
  (goals, UI prefs)           deskflow-data.db
```

**Key patterns:**
- IPC calls return wrapped objects: `{ goals: [...] }`, `{ entries: [...] }`
- Some features use dual storage: DB for persistence + localStorage store for reactive UI
- localStorage access always wrapped in try/catch
- Files are CRLF — preserve line endings
- All new dashboard components use glass pattern: `bg-[rgba(24,24,27,0.80)] backdrop-blur-xl border border-[rgba(63,63,70,0.50)]`

---

## 2. Goals Subsystem

### DB Schema (main.ts:4051-4110)
```sql
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  tier TEXT DEFAULT 'aspirational' CHECK(tier IN ('core','aspirational','daily_habit','one_time','milestone')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','abandoned')),
  progress INTEGER DEFAULT 0,
  target_date TEXT,
  start_date TEXT DEFAULT (date('now')),
  completed_at TEXT,
  is_pinned INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS goal_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  remind_at TEXT NOT NULL,
  type TEXT DEFAULT 'goal',
  note TEXT,
  is_sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS goal_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  note TEXT,
  duration_sec INTEGER,
  category TEXT,
  reviewed_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS goal_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','dismissed')),
  source TEXT DEFAULT 'system',
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
```

### Goal Type (goals-types.ts)
```typescript
export interface Goal {
  id: number;
  title: string;
  description: string;
  category: string;
  tier: 'core' | 'aspirational' | 'daily_habit' | 'one_time' | 'milestone';
  status: 'active' | 'completed' | 'abandoned';
  progress: number;
  target_date: string | null;
  start_date: string;
  completed_at: string | null;
  is_pinned: number;
  sort_order: number;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalSuggestion {
  id: number;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'accepted' | 'dismissed';
  source: string;
  created_at: string;
}

export interface GoalProgress {
  active: number;
  completed: number;
  abandoned: number;
  total: number;
  completionRate: number;
}

export interface GoalReview {
  id: number;
  goal_id: number;
  rating: number;
  note: string;
  duration_sec: number;
  category: string;
  reviewed_at: string;
}
```

### Goal State Machine
```typescript
function getGoalState(goal: any): { progress: number; statusLabel: string; color: string } {
  if (goal.status === 'completed') return { progress: 100, statusLabel: 'Completed', color: '#10b981' };
  if (goal.status === 'abandoned') return { progress: goal.progress || 0, statusLabel: 'Abandoned', color: '#6b7280' };
  if (goal.tier === 'daily_habit') return { progress: goal.progress || 0, statusLabel: 'Daily', color: '#8b5cf6' };
  if (goal.tier === 'core') return { progress: goal.progress || 0, statusLabel: 'Core', color: '#f59e0b' };
  if (goal.tier === 'milestone') return { progress: goal.progress || 0, statusLabel: 'Milestone', color: '#3b82f6' };
  return { progress: goal.progress || 0, statusLabel: 'Active', color: '#10b981' };
}
```

### IPC Handlers (main.ts)
Key channels:
- `goals:get` → `SELECT * FROM goals ORDER BY sort_order, created_at DESC`
- `goals:create` → `INSERT INTO goals (title, description, category, tier, ...)`
- `goals:update` → `UPDATE goals SET ... WHERE id=?`
- `goals:delete` → `DELETE FROM goals WHERE id=?`
- `goals:accept-suggestion` → INSERT from suggestion
- `goals:dismiss-suggestion` → `UPDATE goal_suggestions SET status='dismissed'`
- `goals:save-review` → `INSERT INTO goal_reviews (goal_id, rating, note, duration_sec, category)`
- `goals:get-reviews` → `SELECT * FROM goal_reviews WHERE goal_id=?`
- `goals:get-progress` → aggregated stats (active count, completion rate, streak calc)
- `goals:get-suggestions` → `SELECT * FROM goal_suggestions WHERE status='pending'`
- `goals:prompt` → generates suggestion using callProvider
- `goals:get-insight-strip` → weekly delta stats
- `goals:search-goals` → `SELECT * FROM goals WHERE title LIKE ?`
- `goals:get-timeline` → `SELECT * FROM goals ORDER BY target_date`
- `goals:get-streak` → streak calculation from goal_reviews
- `goals:duplicate` → INSERT copy of existing goal
- `goals:reorder` → UPDATE sort_order

### Preload Bindings (preload.ts)
```typescript
goalsGet: () => ipcRenderer.invoke('goals:get'),
goalsCreate: (data: any) => ipcRenderer.invoke('goals:create', data),
goalsUpdate: (data: any) => ipcRenderer.invoke('goals:update', data),
goalsDelete: (id: number) => ipcRenderer.invoke('goals:delete', id),
goalsGetProgress: () => ipcRenderer.invoke('goals:get-progress'),
goalsGetSuggestions: () => ipcRenderer.invoke('goals:get-suggestions'),
goalsAcceptSuggestion: (id: number) => ipcRenderer.invoke('goals:accept-suggestion', id),
goalsDismissSuggestion: (id: number) => ipcRenderer.invoke('goals:dismiss-suggestion', id),
goalsSaveReview: (data: any) => ipcRenderer.invoke('goals:save-review', data),
goalsGetReviews: (goalId: number) => ipcRenderer.invoke('goals:get-reviews', goalId),
goalsPrompt: (text: string) => ipcRenderer.invoke('goals:prompt', text),
goalsGetInsightStrip: (period: string) => ipcRenderer.invoke('goals:get-insight-strip', period),
goalsSearchGoals: (query: string) => ipcRenderer.invoke('goals:search-goals', query),
goalsGetTimeline: () => ipcRenderer.invoke('goals:get-timeline'),
goalsGetStreak: () => ipcRenderer.invoke('goals:get-streak'),
goalsDuplicate: (id: number) => ipcRenderer.invoke('goals:duplicate', id),
goalsReorder: (ids: number[]) => ipcRenderer.invoke('goals:reorder', ids),
```

### Key Components
- `src/pages/GoalsPage.tsx` — main goals page with carousel/card/list views, progress strip, AI suggestions panel
- `src/components/goals/GoalForm.tsx` — create/edit modal with tier selector, date picker
- `src/components/goals/GoalCard.tsx` — card with progress bar, tier badge, pin/complete/delete actions
- `src/components/goals/GoalList.tsx` — list view with reorder (drag-and-drop)
- `src/components/goals/GoalDetailModal.tsx` — full detail view with reviews, timeline, edit
- `src/components/goals/GoalProgressRing.tsx` — SVG ring visualization
- `src/components/goals/GoalCarousel.tsx` — horizontal scroll carousel
- `src/components/goals/GoalSuggestionCard.tsx` — AI suggestion display with accept/dismiss

---

## 3. Learning Subsystem

### DB Schema (22 tables in main.ts:4100-4200ish)
Key tables:
- `learn_curricula` — curricula with name, description, skill_level, is_active
- `learn_chapters` — chapters within curricula, ordered by sort_order
- `learn_lessons` — lessons with content (JSON blocks), status, estimated_minutes, xp_reward
- `learn_flashcards` — spaced-repetition flashcards with ease_factor, interval, repetitions, next_review
- `learn_assessments` — assessments/reviews tied to lesson_id or chapter_id
- `learn_user_progress` — per-user progress tracking per lesson/chapter
- `learn_mastery` — mastery scores per curriculum/chapter
- `learn_tags` — tag definitions
- `learn_lesson_tags` — lesson-tag junction table
- `lyceum_*` tables — learning path, quest, achievement, streak tracking

### Key IPC Handlers
```typescript
// Profile
learnGetProfile: (key: string) => ipcRenderer.invoke('learn:get-profile', key)
learnSaveProfile: (data: any) => ipcRenderer.invoke('learn:save-profile', data)

// Curriculum
learnGetCurricula: () => ipcRenderer.invoke('learn:get-curricula')
learnGetCurriculum: (id: number) => ipcRenderer.invoke('learn:get-curriculum', id)
learnCreateCurriculum: (data: any) => ipcRenderer.invoke('learn:create-curriculum', data)
learnGetChapters: (curriculumId: number) => ipcRenderer.invoke('learn:get-chapters', curriculumId)
learnGetLessons: (chapterId: number) => ipcRenderer.invoke('learn:get-lessons', chapterId)
learnGetLesson: (id: number) => ipcRenderer.invoke('learn:get-lesson', id)
learnCreateLesson: (data: any) => ipcRenderer.invoke('learn:create-lesson', data)
learnUpdateLesson: (data: any) => ipcRenderer.invoke('learn:update-lesson', data)
learnDeleteLesson: (id: number) => ipcRenderer.invoke('learn:delete-lesson', id)

// Assessment & Tutor
learnAssess: (text: string) => ipcRenderer.invoke('learn:assess', text)
learnTutor: (messages: any[]) => ipcRenderer.invoke('learn:tutor', messages)
learnBuildPrompt: (data: any) => ipcRenderer.invoke('learn:build-prompt', data)
learnGenerateLdoc: (data: any) => ipcRenderer.invoke('learn:generate-ldoc', data)

// Flashcards
learnGetFlashcards: (lessonId: number) => ipcRenderer.invoke('learn:get-flashcards', lessonId)
learnSaveFlashcard: (data: any) => ipcRenderer.invoke('learn:save-flashcard', data)
learnUpdateFlashcard: (data: any) => ipcRenderer.invoke('learn:update-flashcard', data)
learnDeleteFlashcard: (id: number) => ipcRenderer.invoke('learn:delete-flashcard', id)

// Progress
learnGetMastery: (curriculumId: number) => ipcRenderer.invoke('learn:get-mastery', curriculumId)
learnGetStats: () => ipcRenderer.invoke('learn:get-stats')
learnGetXpHistory: (days: number) => ipcRenderer.invoke('learn:get-xp-history', days)
```

### Key Components
- `src/pages/LearnPage.tsx` — tabbed learning page (Home, Library, Generate, Tutor, Flashcards)
- `src/components/learn/LearnHome.tsx` — dashboard with mastery overview, XP, streak, continue learning
- `src/components/learn/LessonLibrary.tsx` — curriculum/chapter/lesson browser with progress indicators
- `src/components/learn/ReaderView.tsx` — full lesson reader with rendered blocks
- `src/components/learn/CreateLessonDialog.tsx` — lesson creation form (title, description, blocks)
- `src/components/learn/BlockRenderer.tsx` — renders lesson content blocks (text, code, image, quiz, embed)
- `src/components/learn/TutorPanel.tsx` — AI chat tutor for current lesson context
- `src/components/learn/MasteryRing.tsx` — circular mastery visualization
- `src/components/learn/OnboardingPanel.tsx` — first-time onboarding flow

---

## 4. IDE Projects Subsystem

### DB Schema (main.ts:4190-4310)
```sql
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT,
  type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'active',
  metadata TEXT,
  last_active TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);
-- Also columns: run_config TEXT, plugin_type TEXT, plugin_config TEXT

CREATE TABLE IF NOT EXISTS project_line_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  lines_added INTEGER DEFAULT 0,
  lines_deleted INTEGER DEFAULT 0,
  files_changed INTEGER DEFAULT 0,
  total_lines INTEGER DEFAULT 0,
  UNIQUE(project_id, date)
);

CREATE TABLE IF NOT EXISTS project_tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id),
  tool_name TEXT NOT NULL,
  category TEXT,
  session_count INTEGER DEFAULT 1,
  last_used TEXT,
  metadata TEXT,
  UNIQUE(project_id, tool_name)
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT,
  tool_name TEXT NOT NULL,
  tool_type TEXT NOT NULL,
  agent_type TEXT,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost REAL DEFAULT 0,
  model TEXT,
  duration_sec INTEGER DEFAULT 0,
  task_type TEXT,
  status TEXT DEFAULT 'completed',
  error TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
```

### IPC Handlers (main.ts)
```typescript
// Projects overview
getIdeProjectsOverview: () => ipcRenderer.invoke('get-ide-projects-overview')
getIdeProjects: () => ipcRenderer.invoke('get-ide-projects')
createIdeProject: (data: any) => ipcRenderer.invoke('create-ide-project', data)
updateIdeProject: (data: any) => ipcRenderer.invoke('update-ide-project', data)
deleteIdeProject: (id: string) => ipcRenderer.invoke('delete-ide-project', id)
detectIdeProjectsWindow: () => ipcRenderer.invoke('detect-ide-projects-window')

// Sessions
getProjectSessions: (projectId: string) => ipcRenderer.invoke('get-project-sessions', projectId)

// AI Usage
getAiUsageSummary: (projectId: string) => ipcRenderer.invoke('get-ai-usage-summary', projectId)
getProjectCodeAnalytics: (projectId: string) => ipcRenderer.invoke('get-project-code-analytics', projectId)

// File operations
getProjectFiles: (projectId: string) => ipcRenderer.invoke('get-project-files', projectId)
buildProjectTree: (path: string) => ipcRenderer.invoke('build-project-tree', path)
saveProjectFile: (data: any) => ipcRenderer.invoke('save-project-file', data)

// Workflow detection
getProjectWorkflow: (projectId: string) => ipcRenderer.invoke('get-project-workflow', projectId)
```

### AI Tool Types (7 agent parsers)
```typescript
const AI_AGENT_PLUGINS = [
  { name: 'claude-code', pattern: /claude/, detect: async (p: string) => {/* checks .claude dir */} },
  { name: 'cursor', pattern: /cursor/, detect: async (p: string) => {/* checks .cursor dir */} },
  { name: 'opencode', pattern: /opencode/, detect: async (p: string) => {/* checks opencode.json */} },
  { name: 'gemini', pattern: /gemini/, detect: async (p: string) => {/* checks gemini dir */} },
  { name: 'codex', pattern: /codex/, detect: async (p: string) => {/* checks codex config */} },
  { name: 'kilo-code', pattern: /kilo/, detect: async (p: string) => {/* checks kilocode dir */} },
  { name: 'windsurf', pattern: /windsurf/, detect: async (p: string) => {/* checks .windsurf dir */} },
];
```

### Key Components
- `src/pages/IDEProjectsPage.tsx` — project grid, sessions tab, code analytics tab, AI usage tab
- SessionsTab — commit-style timeline of project sessions with duration, tool, status
- CodeAnalyticsTab — lines added/deleted chart, file change frequency
- AIUsageTab — cost/tokens chart per agent type, summary stats

---

## 5. Finance Subsystem

### DB Tables (main.ts:2919-3266)
```
finance_accounts          — personal/joint/custodial/business accounts
finance_wallets           — bank/debit_card/credit_card/crypto/cash/ewallet/other
finance_categories        — income/expense/transfer categories (15 seed categories)
finance_transactions      — core transaction log (income/expense/transfer)
finance_subscriptions     — recurring subscriptions with status tracking
finance_crypto_prices     — cached CoinGecko prices
finance_crypto_history    — price history points
finance_budgets           — monthly/weekly/yearly budgets with alert thresholds
finance_fixed_expenses    — recurring fixed expenses with billing_day
finance_fixed_expense_payments — monthly payment tracking
finance_transfer_routes   — cross-wallet transfer efficiency tracking
finance_wallet_snapshots  — daily balance snapshots
finance_daily_summaries   — aggregated daily income/expense/net
crypto_asset_history      — per-wallet per-coin historical holdings
finance_person_balances   — per-person per-wallet balance tracking (Follow Through)
finance_settings          — key/value config store (password hash, etc.)
audit_log                 — encrypted event trail
```

### Key Finance Types (finance-types.ts)
```typescript
interface FinanceAccount    { id: number; name: string; type: 'personal'|'joint'|'custodial'|'business'; ... balance: number }
interface FinanceWallet     { id: number; account_id: number; name: string; type: 'bank'|'debit_card'|'credit_card'|'crypto'|'cash'|'ewallet'|'physical'|'other'; ... balance: number; metadata?: string; initial_balance: number }
interface FinanceTransaction { id: number; account_id: number; wallet_id: number|null; category_id: number; type: 'income'|'expense'|'transfer'; amount: number; fee: number; merchant: string|null; description: string|null; note: string|null; date: string; tags: string|null; on_behalf_of: number; ... }
interface FinanceCategory   { id: number; name: string; type: 'income'|'expense'|'transfer'; icon: string; color: string }
interface FinanceSubscription { id: number; wallet_id: number; name: string; price: number; billing_cycle: string; billing_interval: number; next_renewal_date: string|null; status: 'active'|'cancelled'|'paused'|'expired'; ... }
interface FinanceBudget     { id: number; name: string; type: 'total'|'category'; amount: number; period: 'monthly'|'weekly'|'yearly'; alert_threshold: number; ... }
interface FinanceFixedExpense { id: number; wallet_id: number; name: string; amount: number; billing_day: number; frequency: string; type: string; next_due_date: string|null; ... }
interface BudgetStatus      { budgets: Array<{id; name; type; limit; spent; remaining; percentage; status: 'ok'|'warning'|'over'}>; ... }
interface SubscriptionIntelligence { totalMonthlyCost; burdenPercentage; monthlyIncome; subscriptionCount; growthTrend; radarData; ... }
interface RunwayData        { runwayMonths; dailyBurnRate; monthlyBurnRate; liquidNetWorth; projectedBalances; ... }
interface WalletHealth      { walletId; healthScore; balanceDrift; transactionFrequency; feeBurden; sparklineData; alerts; ... }
interface TransferMatrixData { matrix: TransferMatrixCell[]; optimalRoutes; walletCount; }
type FinanceTabKey = 'overview'|'wallets'|'transactions'|'categories'|'people'|'subscriptions'|'budget'|'audit'|'charts';
```

### IPC Handlers (~87 channels, main.ts:24021-25200)
```typescript
// Security (main.ts:24021-24289)
checkPasswordSetup, getLockState, isLocked, lock, unlock, verifyPassword, setPassword,
changePassword, setRememberDevice, setLockTimeout, biometricUnlock, getWebauthnCredential,
storeWebauthnCredential, getDisplayCurrency, setDisplayCurrency, getAutoSave, setAutoSave,
getAutoRecalc, setAutoRecalc, getSecuritySettings, checkPageAccess

// Accounts (main.ts:24311-24361)
getAccounts, createAccount, updateAccount, archiveAccount

// Wallets (main.ts:24398-24686)
getWallets, createWallet, updateWallet, updateWalletFees, adjustBalance,
updateInitialBalance, archiveWallet, getWallet, updateWalletMetadata

// Crypto (main.ts:24688-24766)
getAllCoins, fetchCryptoPrices, getCryptoHistory, getCryptoAssetHistory

// Universal Assets (main.ts:24884-24915)
searchAssets, fetchAssetPrices

// Transactions (main.ts:24917-25020 approx)
getTransactions, addTransaction, updateTransaction, deleteTransaction

// Subscriptions (main.ts:25021-25100 approx)
getSubscriptions, addSubscription, updateSubscription, deleteSubscription
getSubscriptionIntelligence

// Budgets
getBudgets, addBudget, updateBudget, deleteBudget, getBudgetStatus

// Fixed Expenses
getFixedExpenses, addFixedExpense, updateFixedExpense, deleteFixedExpense
markFixedExpensePaid, getFixedExpenseSummary

// Analytics
getFinanceSummary, getSpendingByCategory, getMonthlyTrends, getBalanceHistory,
getLiquidityData, getRunwayData, getWalletHealth, getTransferMatrix

// Follow Through
getOnBehalfOfSummary, getFtPersons, getFtPersonBalances
```

### Encryption Pattern (main.ts:24060-24126)
Finance data uses optional AES-256 encryption via password-derived key:
```typescript
financeDataKey: Buffer | null;   // derived from password + salt on unlock
// If financeDataKey is set, balance/last_four/metadata are encrypted:
const encBalance = financeDataKey ? encryptField(enc(data.balance), financeDataKey) : String(data.balance);
// Decrypt on read:
if (financeDataKey && row.balance && isEncrypted(row.balance))
  row.balance = Number(decryptField(String(row.balance), financeDataKey)) || 0;
```

---

## 6. AiPage Canvas Subsystem

### Canvas Types (src/types/canvas.ts)
```typescript
export interface CanvasNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: any;
  zIndex: number;
  layerId: string;
  locked: boolean;
  visible: boolean;
  opacity: number;
  rotation: number;
  transform: any;
}

export interface CanvasCard {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  icon?: string;
  color?: string;
  status: 'idle' | 'running' | 'done' | 'error';
  type: 'note' | 'task' | 'code' | 'agent' | 'chart' | 'file' | 'memory';
  position: { x: number; y: number };
  size?: { width: number; height: number };
  zIndex: number;
  parentId?: string;
  connections: string[];
  metadata: any;
  createdAt: string;
  updatedAt: string;
}
```

### Canvas Data Flow (canvasPersistence.ts)
```typescript
// Saves canvas state to localStorage with optional DB sync
function saveCanvasToLocalStorage(cards: CanvasCard[], canvasId: string): void {
  try {
    localStorage.setItem(`canvas_${canvasId}`, JSON.stringify(cards));
  } catch (e) { console.error('Failed to save canvas:', e); }
}

function loadCanvasFromLocalStorage(canvasId: string): CanvasCard[] {
  try {
    const data = localStorage.getItem(`canvas_${canvasId}`);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
}
```

### IPC: AI Provider System (preload.ts)
```typescript
callProvider: (data: any) => ipcRenderer.invoke('call-provider', data),
getAvailableProviders: () => ipcRenderer.invoke('get-available-providers'),
getProviderModels: (provider: string) => ipcRenderer.invoke('get-provider-models', provider),
getDefaultProvider: () => ipcRenderer.invoke('get-default-provider'),
```

### Key Components
- `src/pages/AiPage.tsx` — main AI page with canvas, cards, focus manager, provider router
- `src/components/ai/canvas/CanvasContainer.tsx` — infinite canvas with pan/zoom, card rendering
- `src/components/ai/canvas/CanvasGrid.tsx` — background grid rendering
- `src/components/ai/canvas/CanvasCard.tsx` — draggable/resizable card component
- `src/components/ai/canvas/canvas.css` — canvas styling
- `src/services/providers/callProvider.ts` — AI provider routing (OpenAI, Anthropic, Ollama, LMStudio, OpenRouter, Google, Grok, DeepSeek, Custom)
- `src/services/providers/router.ts` — provider selection logic
- `src/services/providers/types.ts` — provider type definitions

---

## 7. General IPC Map (preload.ts)

Common non-feature-specific IPC channels:
```typescript
// Window operations
minimizeWindow, maximizeWindow, closeWindow, isWindowMaximized

// App info
getVersion, getPlatform, getAppPath, openExternal

// Notifications
showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body)

// File dialogs
openFileDialog, openFolderDialog, showSaveDialog

// Data export
exportData: (options: any) => ipcRenderer.invoke('export-data', options)
exportToJson: (data: any) => ipcRenderer.invoke('export-to-json', data)

// Database operations
dbQuery: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params)
dbRun: (sql: string, params?: any[]) => ipcRenderer.invoke('db:run', sql, params)
dbGet: (sql: string, params?: any[]) => ipcRenderer.invoke('db:get', sql, params)

// Context system (problems/requests)
getProblems, createProblem, updateProblem, deleteProblem
getRequests, createRequest, updateRequest, deleteRequest
linkProblemToRequest, unlinkProblemFromRequest
assembleContext

// Events
onForegroundChange, onBrowserTrackingEvent  // active window/tab tracking
onContextChanged                             // problems/requests/checklists changes

// Terminal
terminalCreate, spawnTerminal, terminalWriteRaw, terminalWriteDisplay
writeTerminal, resizeTerminal, getTerminalState

// Workspace state
workspaceSave, workspaceList, workspaceLoad, workspaceDelete
```

---

## 8. Design Tokens

### Glass Pattern (used everywhere)
```
bg-[rgba(24,24,27,0.80)] backdrop-blur-xl border border-[rgba(63,63,70,0.50)]
```
Top-edge highlight: pseudo-element with `linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)`

### Accent Colors
- Primary emerald: `#10b981` / `rgb(16,185,129)`
- Warning amber: `#f59e0b`
- Error red: `#ef4444`
- Purple: `#8b5cf6`
- Blue: `#3b82f6`
- Neutral text: `#d4d4d8` (text-primary), `#a1a1aa` (text-secondary), `#71717a` (text-muted)

### Typography
- Body: Geist (sans-serif)
- Mono: JetBrains Mono

### Border radius: `rounded-xl` max
### Padding: `p-5` standard card padding

### shadcn Components Installed
accordion, alert, badge, button, card, collapsible, dialog, input, select, separator, skeleton, switch, tabs, toggle, tooltip

### Lucide Icons (1500+ via lucide-react)
Common: Activity, TrendingUp, TrendingDown, CircleDollarSign, Wallet, PiggyBank, ShoppingCart, Target, CheckCircle, XCircle, Clock, Calendar, BarChart3, PieChart, LineChart, ArrowLeftRight, Handshake, FolderTree, Bot, ChevronDown, Search, Filter, Plus, MoreHorizontal, Trash2, Pencil, Copy, ExternalLink, Sparkles, Brain, BookOpen, GraduationCap, Layers, GripVertical, Pin, Bell

---

## 9. Data Flow Patterns

### Feature Connection Points (current gaps)
Features that CAN already cross-connect (via existing IPC + DB):

| Source Feature | Can Read From | Can Write To | Mechanism |
|---|---|---|---|
| Goals | — | — | localStorage store + DB |
| Learning | Goals (via generic DB) | — | manual |
| IDE Projects | — | — | isolated |
| Finance | — | — | isolated |
| AiPage Canvas | All (via callProvider) | All (via callProvider) | AI provider |
| Terminal/Workspace | Problems, Requests | Problems, Requests | assemble-context IPC |

### The Missing "Connection Fabric"
No feature currently reads from or writes to another feature's data automatically. Each subsystem is an island. The idea doc proposes a **connectivity mesh**:
1. A DSL that defines composable primitives
2. An event bus that lets features emit/receive cross-domain events
3. AI compositions that combine read/write operations across subsystems

### Potential Connection Primitives (examples)
```
goals → IDE:   "if IDE project X hasn't had commits in 3 days, mark goal Y as failed"
finance → goals: "if wallet balance drops below threshold, create goal 'reduce spending'"
learning → goals: "if curriculum mastery reaches 80%, create milestone goal 'complete X'"
canvas → all:  "agent card on canvas reads goals progress, writes learning lesson plan"
timing → goals: "if screen-time exceeds 10pm, auto-fail 'sleep by 10pm' goal"
```

---

## 10. The Idea Document (verbatim)

See `agent/docs/feature-docs/self-expanding-agentic-system-idea.md` for the raw transcript.
Core concepts: Ambient Goal Evaluation, App-Provided Feature Building Blocks, Domain-Specific DSL,
Data-Driven Feature Connectivity Mesh, Self-Expansion Without Code Access, Safety Guardrails.
