# DeskFlow Conductor — Complete Autonomous Multi-Agent Orchestration System

> Lead Design & Engineering Document  
> Date: 2026-07-12  
> Scope: Full Conductor redesign (backend, frontend, DB, IPC, workspace integration)

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Database Schema](#2-database-schema)
3. [Backend Service Redesign](#3-backend-service-redesign)
4. [IPC Endpoints](#4-ipc-endpoints)
5. [Mission Creation Wizard](#5-mission-creation-wizard)
6. [Agent Type System](#6-agent-type-system)
7. [Role Configuration](#7-role-configuration)
8. [Workflow Templates](#8-workflow-templates)
9. [Visualization System](#9-visualization-system)
10. [Budget & Token Tracking](#10-budget--token-tracking)
11. [Workspace Integration](#11-workspace-integration)
12. [Configuration Panel](#12-configuration-panel)
13. [Frontend Changes](#13-frontend-changes)
14. [Build & Test](#14-build--test)

---

## 1. System Architecture

### 1.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DESKFLOW WORKSPACE                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Sessions   │  │  Terminal   │  │   Files     │  │    Performance      │  │
│  │   Tab       │  │    Map      │  │   Tab       │  │      Tab            │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                │                    │            │
│         └────────────────┴────────────────┴────────────────────┘            │
│                                      │                                       │
│                           ┌──────────┴──────────┐                            │
│                           │   CONDUCTOR CORE    │                            │
│                           │  (Service Layer)    │                            │
│                           └──────────┬──────────┘                            │
│                                      │                                       │
│         ┌────────────┬───────────────┼───────────────┬────────────┐         │
│         ▼            ▼               ▼               ▼            ▼         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Agent   │  │ Workflow │  │  Budget  │  │  Metrics │  │ Recovery │      │
│  │Registry  │  │ Engine   │  │ Manager  │  │Collector │  │ Manager  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│         │            │               │               │            │           │
│         └────────────┴───────────────┴───────────────┴────────────┘       │
│                                      │                                       │
│                           ┌──────────┴──────────┐                            │
│                           │   AGENT POOL        │                            │
│                           │  (Terminal PTYs)    │                            │
│                           └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

1. **User creates mission** → Wizard captures objective, selects template, configures agents
2. **AI engineers workflow** → Director AI analyzes objective, generates role tree + file boundaries
3. **Conductor spawns agents** → Each agent gets: git worktree, terminal session, file boundaries, budget
4. **Agents execute** → Write REPORT.json, ESCALATE.json, PLAN.json to worktree
5. **Conductor polls** → 3s tick processes JSON files, updates progress, tracks tokens
6. **Merge & audit** → Worker branches merged into integration, auditor verifies
7. **Promotion** → Integration merged into user's branch
8. **Metrics collected** → Token usage, costs, performance logged to DB

### 1.3 Integration Points

| Workspace Feature | Conductor Integration |
|-------------------|----------------------|
| Sessions Tab | Agent sessions shown alongside user sessions, labeled with role |
| Terminal Map | Agent terminals rendered with role color + status indicator |
| Files Tab | Files being modified highlighted with agent ownership badge |
| Performance Tab | Per-agent CPU/memory usage added to resource stats |
| Insights > Prompts | Conductor agent prompts tracked in prompt history |
| Context > Page | Active conductor mission shown in page context |

---

## 2. Database Schema

### 2.1 conductor_missions

```sql
CREATE TABLE IF NOT EXISTS conductor_missions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  template_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  autonomy_level INTEGER DEFAULT 3,
  integration_branch TEXT,
  user_branch TEXT,
  repo_path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  paused_at DATETIME,
  budget_total_tokens INTEGER DEFAULT 1000000,
  budget_total_cost REAL DEFAULT 50.0,
  budget_used_tokens INTEGER DEFAULT 0,
  budget_used_cost REAL DEFAULT 0.0,
  progress_pct REAL DEFAULT 0.0,
  tasks_total INTEGER DEFAULT 0,
  tasks_done INTEGER DEFAULT 0,
  config_json TEXT DEFAULT '{}',
  error_log TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### 2.2 conductor_nodes

```sql
CREATE TABLE IF NOT EXISTS conductor_nodes (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  parent_id TEXT,
  role TEXT NOT NULL,
  role_config TEXT DEFAULT '{}',
  agent_type TEXT NOT NULL,
  agent_config TEXT DEFAULT '{}',
  terminal_id TEXT,
  session_id TEXT,
  worktree_path TEXT,
  branch TEXT,
  objective TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  depth INTEGER DEFAULT 0,
  retries INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  boundaries TEXT DEFAULT '[]',
  files_accessed TEXT DEFAULT '[]',
  files_modified TEXT DEFAULT '[]',
  tokens_used INTEGER DEFAULT 0,
  cost REAL DEFAULT 0.0,
  budget_limit_tokens INTEGER DEFAULT 100000,
  budget_limit_cost REAL DEFAULT 5.0,
  started_at DATETIME,
  completed_at DATETIME,
  last_activity_at DATETIME,
  error_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  FOREIGN KEY (mission_id) REFERENCES conductor_missions(id) ON DELETE CASCADE
);
```

### 2.3 conductor_messages

```sql
CREATE TABLE IF NOT EXISTS conductor_messages (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  from_node_id TEXT,
  to_node_id TEXT,
  type TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost REAL DEFAULT 0.0,
  FOREIGN KEY (mission_id) REFERENCES conductor_missions(id) ON DELETE CASCADE
);
```

### 2.4 conductor_escalations

```sql
CREATE TABLE IF NOT EXISTS conductor_escalations (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  node_id TEXT,
  reason TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME,
  resolution TEXT,
  note TEXT,
  FOREIGN KEY (mission_id) REFERENCES conductor_missions(id) ON DELETE CASCADE
);
```

### 2.5 conductor_configs

```sql
CREATE TABLE IF NOT EXISTS conductor_configs (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  scope TEXT NOT NULL DEFAULT 'global',
  config_type TEXT NOT NULL,
  name TEXT NOT NULL,
  value_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, scope, config_type, name)
);
```

### 2.6 conductor_metrics

```sql
CREATE TABLE IF NOT EXISTS conductor_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id TEXT NOT NULL,
  node_id TEXT,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value REAL DEFAULT 0.0,
  unit TEXT,
  ts INTEGER NOT NULL,
  FOREIGN KEY (mission_id) REFERENCES conductor_missions(id) ON DELETE CASCADE
);
```

### 2.7 conductor_templates

```sql
CREATE TABLE IF NOT EXISTS conductor_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  icon TEXT,
  roles_json TEXT NOT NULL,
  boundaries_json TEXT DEFAULT '[]',
  budget_estimate_tokens INTEGER DEFAULT 500000,
  budget_estimate_cost REAL DEFAULT 25.0,
  expected_duration_min INTEGER DEFAULT 60,
  workflow_json TEXT NOT NULL,
  is_builtin INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.8 conductor_budgets

```sql
CREATE TABLE IF NOT EXISTS conductor_budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_id TEXT NOT NULL,
  node_id TEXT,
  period TEXT NOT NULL DEFAULT 'mission',
  tokens_allocated INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_allocated REAL DEFAULT 0.0,
  cost_used REAL DEFAULT 0.0,
  alerts_triggered TEXT DEFAULT '[]',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mission_id) REFERENCES conductor_missions(id) ON DELETE CASCADE
);
```

### 2.9 conductor_sessions

```sql
CREATE TABLE IF NOT EXISTS conductor_sessions (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  terminal_id TEXT NOT NULL,
  session_id TEXT,
  agent_type TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  FOREIGN KEY (mission_id) REFERENCES conductor_missions(id) ON DELETE CASCADE
);
```

---

## 3. Backend Service Redesign

### 3.1 ConductorService.ts — Complete Rewrite

```typescript
// src/services/conductor/ConductorService.ts
// ~2000 lines — complete autonomous multi-agent orchestration system

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { simpleGit, SimpleGit } from 'simple-git';
import { spawn } from 'child_process';

// ─── Types ─────────────────────────────────────────────────────────────────

export type ConductorRole = 'director' | 'planner' | 'worker' | 'qa' | 'auditor' | 'resolver' | 'custom';
export type ConductorStatus = 'pending' | 'spawning' | 'running' | 'blocked' | 'awaiting-review' | 'done' | 'failed' | 'killed';
export type AgentProvider = 'opencode' | 'claude' | 'gemini' | 'codex' | 'custom';
export type EscalationReason = 'boundary-violation' | 'merge-conflict' | 'budget-exceeded' | 'stuck' | 'error' | 'needs-clarification' | 'security-concern';

export interface AgentProviderConfig {
  id: string;
  name: string;
  provider: AgentProvider;
  apiKey?: string;
  endpoint?: string;
  model: string;
  maxTokens: number;
  rateLimitRpm: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  capabilities: string[];
  isDefault: boolean;
}

export interface RoleConfig {
  role: ConductorRole;
  customName?: string;
  agentTypeId: string;
  canSpawnChildren: boolean;
  maxDepth: number;
  maxChildren: number;
  fileAccess: 'read' | 'write' | 'none';
  terminalAccess: boolean;
  gitAccess: boolean;
  autoAudit: boolean;
  promptTemplate: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  roles: RoleConfig[];
  boundaries: string[];
  budgetEstimateTokens: number;
  budgetEstimateCost: number;
  expectedDurationMin: number;
  workflow: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  role: ConductorRole;
  dependsOn: string[];
  objective: string;
  boundaries: string[];
  budgetTokens: number;
  timeoutMin: number;
}

export interface ConductorMission {
  id: string;
  projectId: string;
  name: string;
  objective: string;
  templateId?: string;
  status: ConductorStatus;
  autonomyLevel: number;
  integrationBranch: string;
  userBranch: string;
  repoPath: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  pausedAt?: number;
  budget: BudgetState;
  progress: ProgressState;
  config: MissionConfig;
  nodes: Map<string, ConductorNode>;
  messages: ConductorMessage[];
  escalations: EscalationItem[];
}

export interface ConductorNode {
  id: string;
  missionId: string;
  parentId: string | null;
  role: ConductorRole;
  roleConfig: RoleConfig;
  agentType: string;
  agentConfig: AgentProviderConfig;
  terminalId: string;
  sessionId?: string;
  worktreePath: string;
  branch: string;
  objective: string;
  status: ConductorStatus;
  depth: number;
  retries: number;
  maxRetries: number;
  boundaries: string[];
  filesAccessed: string[];
  filesModified: string[];
  tokensUsed: number;
  cost: number;
  budgetLimitTokens: number;
  budgetLimitCost: number;
  startedAt?: number;
  completedAt?: number;
  lastActivityAt: number;
  errorCount: number;
  successCount: number;
  avgResponseTimeMs: number;
}

export interface ConductorMessage {
  id: string;
  missionId: string;
  ts: number;
  fromNodeId: string | null;
  toNodeId: string | null;
  type: 'TASK' | 'REPORT' | 'ESCALATE' | 'DIRECTIVE' | 'MERGE_OK' | 'MERGE_CONFLICT' | 'INFO' | 'BUDGET_ALERT' | 'PROGRESS';
  summary: string;
  payload?: any;
  tokensUsed: number;
  cost: number;
}

export interface EscalationItem {
  id: string;
  missionId: string;
  nodeId: string | null;
  reason: EscalationReason;
  detail: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  decidedAt?: number;
  resolution?: string;
  note?: string;
}

export interface BudgetState {
  totalTokens: number;
  totalCost: number;
  usedTokens: number;
  usedCost: number;
  perAgent: Map<string, { tokens: number; cost: number }>;
  alerts: BudgetAlert[];
}

export interface BudgetAlert {
  id: string;
  nodeId?: string;
  type: 'warning' | 'critical' | 'exceeded';
  message: string;
  triggeredAt: number;
}

export interface ProgressState {
  pct: number;
  tasksTotal: number;
  tasksDone: number;
  tasksFailed: number;
  phases: PhaseProgress[];
}

export interface PhaseProgress {
  phase: string;
  status: 'pending' | 'active' | 'done' | 'failed';
  pct: number;
}

export interface MissionConfig {
  autoAuditInterval: number;
  mergeStrategy: 'sequential' | 'parallel' | 'smart';
  conflictResolution: 'manual' | 'auto-resolver' | 'abort';
  maxConcurrentAgents: number;
  timeoutDefaultMin: number;
  retryPolicy: 'none' | 'linear' | 'exponential';
  notifyOnComplete: boolean;
}

export interface ConductorSnapshot {
  mission: ConductorMission;
  nodes: ConductorNode[];
  messages: ConductorMessage[];
  escalations: EscalationItem[];
  budget: BudgetState;
  progress: ProgressState;
  metrics: AgentMetrics[];
}

export interface AgentMetrics {
  nodeId: string;
  role: string;
  tokensUsed: number;
  cost: number;
  avgResponseTimeMs: number;
  successRate: number;
  filesModified: number;
  tasksCompleted: number;
  errors: number;
}

// ─── Service Class ──────────────────────────────────────────────────────────

export class ConductorService extends EventEmitter {
  private db: any;
  private missions: Map<string, ConductorMission> = new Map();
  private ticks: Map<string, ReturnType<typeof setInterval>> = new Map();
  private agentProviders: Map<string, AgentProviderConfig> = new Map();
  private workflowTemplates: Map<string, WorkflowTemplate> = new Map();
  private fileLocks: Map<string, string> = new Map();
  private host: any;
  private dbPath: string;

  constructor(db: any, host: any, dbPath: string) {
    super();
    this.db = db;
    this.host = host;
    this.dbPath = dbPath;
    this.loadBuiltinTemplates();
    this.loadSavedConfigs();
  }

  // ─── Configuration ───────────────────────────────────────────────────────

  async loadSavedConfigs(): Promise<void> {
    const rows = await this.db.all('SELECT * FROM conductor_configs WHERE scope = ?', ['global']);
    for (const row of rows) {
      const value = JSON.parse(row.value_json);
      if (row.config_type === 'agent_provider') {
        this.agentProviders.set(value.id, value);
      } else if (row.config_type === 'workflow_template') {
        this.workflowTemplates.set(value.id, value);
      }
    }
  }

  async saveConfig(configType: string, name: string, value: any, projectId?: string): Promise<void> {
    const scope = projectId ? 'project' : 'global';
    await this.db.run(
      `INSERT INTO conductor_configs (id, project_id, scope, config_type, name, value_json)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(project_id, scope, config_type, name) DO UPDATE SET
       value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`,
      [uuidv4(), projectId || null, scope, configType, name, JSON.stringify(value)]
    );
  }

  async getConfig(configType: string, projectId?: string): Promise<any[]> {
    const scope = projectId ? 'project' : 'global';
    const rows = await this.db.all(
      'SELECT * FROM conductor_configs WHERE config_type = ? AND scope = ? AND (project_id = ? OR project_id IS NULL)',
      [configType, scope, projectId || null]
    );
    return rows.map(r => JSON.parse(r.value_json));
  }

  // ─── Agent Provider Registry ─────────────────────────────────────────────

  registerAgentProvider(config: AgentProviderConfig): void {
    this.agentProviders.set(config.id, config);
    this.saveConfig('agent_provider', config.name, config);
  }

  getAgentProvider(id: string): AgentProviderConfig | undefined {
    return this.agentProviders.get(id);
  }

  getDefaultAgentProvider(): AgentProviderConfig | undefined {
    return Array.from(this.agentProviders.values()).find(p => p.isDefault);
  }

  listAgentProviders(): AgentProviderConfig[] {
    return Array.from(this.agentProviders.values());
  }

  // ─── Workflow Template Engine ──────────────────────────────────────────────

  loadBuiltinTemplates(): void {
    const templates: WorkflowTemplate[] = [
      {
        id: 'tpl-code-review',
        name: 'Code Review',
        description: 'Systematic code review with director oversight',
        category: 'review',
        icon: 'Search',
        roles: [
          { role: 'director', agentTypeId: 'default', canSpawnChildren: true, maxDepth: 2, maxChildren: 3, fileAccess: 'read', terminalAccess: false, gitAccess: true, autoAudit: true, promptTemplate: 'director' },
          { role: 'worker', agentTypeId: 'default', canSpawnChildren: false, maxDepth: 0, maxChildren: 0, fileAccess: 'read', terminalAccess: false, gitAccess: true, autoAudit: false, promptTemplate: 'worker' },
          { role: 'qa', agentTypeId: 'default', canSpawnChildren: false, maxDepth: 0, maxChildren: 0, fileAccess: 'read', terminalAccess: false, gitAccess: true, autoAudit: false, promptTemplate: 'qa' },
          { role: 'auditor', agentTypeId: 'default', canSpawnChildren: false, maxDepth: 0, maxChildren: 0, fileAccess: 'read', terminalAccess: false, gitAccess: true, autoAudit: true, promptTemplate: 'auditor' },
        ],
        boundaries: ['src/**/*', 'tests/**/*'],
        budgetEstimateTokens: 300000,
        budgetEstimateCost: 15.0,
        expectedDurationMin: 30,
        workflow: [
          { id: 'w1', role: 'director', dependsOn: [], objective: 'Analyze codebase and identify review targets', boundaries: ['src/**/*'], budgetTokens: 50000, timeoutMin: 10 },
          { id: 'w2', role: 'worker', dependsOn: ['w1'], objective: 'Review assigned files for issues', boundaries: ['src/**/*'], budgetTokens: 100000, timeoutMin: 15 },
          { id: 'w3', role: 'qa', dependsOn: ['w2'], objective: 'Verify review findings', boundaries: ['src/**/*', 'tests/**/*'], budgetTokens: 50000, timeoutMin: 10 },
          { id: 'w4', role: 'auditor', dependsOn: ['w3'], objective: 'Final audit of review completeness', boundaries: ['src/**/*'], budgetTokens: 30000, timeoutMin: 5 },
        ],
      },
      {
        id: 'tpl-bug-fix',
        name: 'Bug Fix',
        description: 'Structured bug investigation and resolution',
        category: 'fix',
        icon: 'Bug',
        roles: [
          { role: 'director', agentTypeId: 'default', canSpawnChildren: true, maxDepth: 2, maxChildren: 4, fileAccess: 'read', terminalAccess: true, gitAccess: true, autoAudit: true, promptTemplate: 'director' },
          { role: 'planner', agentTypeId: 'default', canSpawnChildren: false, maxDepth: 0, maxChildren: 0, fileAccess: 'read', terminalAccess: false, gitAccess: true, autoAudit: false, promptTemplate: 'planner' },
          { role: 'worker', agentTypeId: 'default', canSpawnChildren: false, maxDepth: 0, maxChildren: 0, fileAccess: 'write', terminalAccess: true, gitAccess: true, autoAudit: false, promptTemplate: 'worker' },
          { role: 'qa', agentTypeId: 'default', canSpawnChildren: false, maxDepth: 0, maxChildren: 0, fileAccess: 'read', terminalAccess: true, gitAccess: true, autoAudit: false, promptTemplate: 'qa' },
          { role: 'resolver', agentTypeId: 'default', canSpawnChildren: false, maxDepth: 0, maxChildren: 0, fileAccess: 'write', terminalAccess: true, gitAccess: true, autoAudit: false, promptTemplate: 'resolver' },
        ],
        boundaries: ['src/**/*', 'tests/**/*', 'package.json'],
        budgetEstimateTokens: 500000,
        budgetEstimateCost: 25.0,
        expectedDurationMin: 45,
        workflow: [
          { id: 'w1', role: 'director', dependsOn: [], objective: 'Analyze bug report and assign investigation', boundaries: ['src/**/*', 'package.json'], budgetTokens: 50000, timeoutMin: 10 },
          { id: 'w2', role: 'planner', dependsOn: ['w1'], objective: 'Create detailed fix plan with file targets', boundaries: ['src/**/*'], budgetTokens: 50000, timeoutMin: 10 },
          { id: 'w3', role: 'worker', dependsOn: ['w2'], objective: 'Implement the fix', boundaries: ['src/**/*'], budgetTokens: 150000, timeoutMin: 20 },
          { id: 'w4', role: 'qa', dependsOn: ['w3'], objective: 'Test the fix and verify no regressions', boundaries: ['src/**/*', 'tests/**/*'], budgetTokens: 100000, timeoutMin: 15 },
          { id: 'w5', role: 'resolver', dependsOn: ['w4'], objective: 'Resolve any merge conflicts', boundaries: ['src/**/*'], budgetTokens: 50000, timeoutMin: 10 },
        ],
      },
      {
        id: 'tpl-feature-build',
        name: 'Feature Build',
        description: 'Parallel feature implementation with QA integration',
        category: 'build',
        icon: 'Hammer',
        roles: [
          { role: 'director', agentTypeId: 'default', canSpawnChildren: true, maxDepth: 3, maxChildren: 6, fileAccess: 'read', terminalAccess: true, gitAccess: true, autoAudit: true, promptTemplate: 'director' },
          { role: 'planner', agentTypeId: 'default', canSpawnChildren: false, maxDepth: 0, maxChildren: 0, fileAccess: 'read', terminalAccess: false, gitAccess: true, autoAudit: false, promptTemplate: 'planner' },
          { role: 'worker', agentTypeId: 'default', canSpawnChildren: false, maxDepth: 0, maxChildren: 0, fileAccess: 'write', terminalAccess: true, gitAccess: true, autoAudit: false, promptTemplate: 'worker' },
          { role: 'qa', agentTypeId: 'default', canSpawnChildren: false, maxDepth: 0, maxChildren: 0, fileAccess: 'read', terminalAccess: true, gitAccess: true, autoAudit: false, promptTemplate: 'qa' },
        ],
        boundaries: ['src/**/*', 'tests/**/*', 'package.json', 'README.md'],
        budgetEstimateTokens: 800000,
        budgetEstimateCost: 40.0,
        expectedDurationMin: 90,
        workflow: [
          { id: 'w1', role: 'director', dependsOn: [], objective: 'Design feature architecture and assign modules', boundaries: ['src/**/*', 'package.json'], budgetTokens: 100000, timeoutMin: 15 },
          { id: 'w2', role: 'planner', dependsOn: ['w1'], objective: 'Create implementation plan with parallel tracks', boundaries: ['src/**/*'], budgetTokens: 50000, timeoutMin: 10 },
          { id: 'w3', role: 'worker', dependsOn: ['w2'], objective: 'Implement core feature modules', boundaries: ['src/**/*'], budgetTokens: 300000, timeoutMin: 30 },
          { id: 'w4', role: 'worker', dependsOn: ['w2'], objective: 'Implement tests and documentation', boundaries: ['tests/**/*', 'README.md'], budgetTokens: 150000, timeoutMin: 20 },
          { id: 'w5', role: 'qa', dependsOn: ['w3', 'w4'], objective: 'Integration testing and validation', boundaries: ['src/**/*', 'tests/**/*'], budgetTokens: 200000, timeoutMin: 25 },
        ],
      },
      {
        id: 'tpl-refactor',
        name: 'Refactoring',
        description: 'Safe codebase refactoring with regression prevention',
        category: 'refactor',
        icon: 'RefreshCw',
        roles: [
          { role: 'director', agentTypeId: 'default', canSpawnChildren: true, maxDepth: 2, maxChildren: 3, fileAccess: 'read', terminalAccess: false, gitAccess: true, autoAudit: true, promptTemplate: 'director' },
          { role: 'worker', agentTypeId: 'default', canSpawnChildren: false, maxDepth: 0, maxChildren: 0, fileAccess: 'write', terminalAccess: true, gitAccess: true, autoAudit: false, promptTemplate: 'worker' },
          { role: 'qa', agentTypeId: 'default', canSpawnChildren: false, maxDepth: 0, maxChildren: 0, fileAccess: 'read', terminalAccess: true, gitAccess: true, autoAudit: false, promptTemplate: 'qa' },
        ],
        boundaries: ['src/**/*', 'tests/**/*'],
        budgetEstimateTokens: 400000,
        budgetEstimateCost: 20.0,
        expectedDurationMin: 60,
        workflow: [
          { id: 'w1', role: 'director', dependsOn: [], objective: 'Identify refactoring targets and create plan', boundaries: ['src/**/*'], budgetTokens: 50000, timeoutMin: 10 },
          { id: 'w2', role: 'worker', dependsOn: ['w1'], objective: 'Execute refactoring', boundaries: ['src/**/*'], budgetTokens: 200000, timeoutMin: 30 },
          { id: 'w3', role: 'qa', dependsOn: ['w2'], objective: 'Verify no regressions', boundaries: ['src/**/*', 'tests/**/*'], budgetTokens: 150000, timeoutMin: 20 },
        ],
      },
    ];

    for (const tpl of templates) {
      this.workflowTemplates.set(tpl.id, tpl);
    }
  }

  async saveWorkflowTemplate(template: WorkflowTemplate): Promise<void> {
    this.workflowTemplates.set(template.id, template);
    await this.db.run(
      `INSERT INTO conductor_templates (id, name, description, category, icon, roles_json, boundaries_json, budget_estimate_tokens, budget_estimate_cost, expected_duration_min, workflow_json, is_builtin, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
       ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, description = excluded.description, roles_json = excluded.roles_json,
       boundaries_json = excluded.boundaries_json, workflow_json = excluded.workflow_json, updated_at = CURRENT_TIMESTAMP`,
      [template.id, template.name, template.description, template.category, template.icon,
       JSON.stringify(template.roles), JSON.stringify(template.boundaries),
       template.budgetEstimateTokens, template.budgetEstimateCost, template.expectedDurationMin,
       JSON.stringify(template.workflow)]
    );
  }

  async listWorkflowTemplates(): Promise<WorkflowTemplate[]> {
    const rows = await this.db.all('SELECT * FROM conductor_templates WHERE is_active = 1 ORDER BY name');
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      icon: r.icon,
      roles: JSON.parse(r.roles_json),
      boundaries: JSON.parse(r.boundaries_json),
      budgetEstimateTokens: r.budget_estimate_tokens,
      budgetEstimateCost: r.budget_estimate_cost,
      expectedDurationMin: r.expected_duration_min,
      workflow: JSON.parse(r.workflow_json),
    }));
  }

  // ─── Prompt Assembler ──────────────────────────────────────────────────

  assemblePrompt(node: ConductorNode, mission: ConductorMission, context: any): string {
    const provider = this.getAgentProvider(node.agentType) || this.getDefaultAgentProvider();
    const roleMeta = this.getRoleMeta(node.role);
    const boundaries = node.boundaries.length > 0 ? node.boundaries.join(', ') : 'all project files';
    const budget = `Token budget: ${node.budgetLimitTokens - node.tokensUsed} remaining of ${node.budgetLimitTokens}. Cost budget: $${(node.budgetLimitCost - node.cost).toFixed(2)} remaining of $${node.budgetLimitCost}.`;
    const missionContext = `Mission: ${mission.name}. Objective: ${mission.objective}. Phase: ${this.getCurrentPhase(mission)}.`;
    const parentContext = node.parentId && mission.nodes.has(node.parentId)
      ? `Parent agent (${mission.nodes.get(node.parentId)!.role}): ${mission.nodes.get(node.parentId)!.objective}`
      : 'You report directly to the mission director.';
    const fileContext = node.filesModified.length > 0
      ? `Files you have modified: ${node.filesModified.join(', ')}`
      : 'No files modified yet.';
    const autonomy = `Autonomy level: ${mission.autonomyLevel}/5. At level ${mission.autonomyLevel}, you ${mission.autonomyLevel >= 4 ? 'can make decisions without escalation' : mission.autonomyLevel >= 2 ? 'can make minor decisions but escalate major ones' : 'must escalate all decisions'}.';
    const capabilities = provider ? `Your capabilities: ${provider.capabilities.join(', ')}.` : '';

    const basePrompts: Record<ConductorRole, string> = {
      director: `You are the DIRECTOR agent for this mission. Your role is to orchestrate the team, break down objectives into subtasks, assign work to other agents, and ensure the mission succeeds. You have full visibility into all agent progress. ${missionContext} ${parentContext} ${autonomy} ${budget} ${capabilities} ${fileContext} Boundaries: ${boundaries}. When you complete your analysis, write a PLAN.json with subtasks. If you need help, write ESCALATE.json.`,
      planner: `You are a PLANNER agent. Your role is to analyze requirements and create detailed implementation plans. You do not write code — you design the approach. ${missionContext} ${parentContext} ${autonomy} ${budget} ${capabilities} ${fileContext} Boundaries: ${boundaries}. Write your plan to PLAN.json.`,
      worker: `You are a WORKER agent. Your role is to implement changes, write code, fix bugs, and execute tasks. You have write access to your assigned files. ${missionContext} ${parentContext} ${autonomy} ${budget} ${capabilities} ${fileContext} Boundaries: ${boundaries}. When done, write REPORT.json. If stuck, write ESCALATE.json.`,
      qa: `You are a QA agent. Your role is to verify correctness, test implementations, and ensure no regressions. You have read access to all files. ${missionContext} ${parentContext} ${autonomy} ${budget} ${capabilities} ${fileContext} Boundaries: ${boundaries}. Write findings to REPORT.json.`,
      auditor: `You are the AUDITOR agent. Your role is to perform final review of all work, check for completeness, security issues, and code quality. ${missionContext} ${parentContext} ${autonomy} ${budget} ${capabilities} ${fileContext} Boundaries: ${boundaries}. Write audit report to REPORT.json.`,
      resolver: `You are a RESOLVER agent. Your role is to fix merge conflicts, resolve integration issues, and reconcile divergent changes. ${missionContext} ${parentContext} ${autonomy} ${budget} ${capabilities} ${fileContext} Boundaries: ${boundaries}. Write resolution to REPORT.json.`,
      custom: `You are a ${node.roleConfig.customName || 'custom'} agent. ${missionContext} ${parentContext} ${autonomy} ${budget} ${capabilities} ${fileContext} Boundaries: ${boundaries}.`,
    };

    return basePrompts[node.role] || basePrompts.custom;
  }

  getRoleMeta(role: ConductorRole): { label: string; color: string } {
    const meta: Record<ConductorRole, { label: string; color: string }> = {
      director: { label: 'Director', color: '#8b5cf6' },
      planner: { label: 'Planner', color: '#3b82f6' },
      worker: { label: 'Worker', color: '#22d3ee' },
      qa: { label: 'QA', color: '#14b8a6' },
      auditor: { label: 'Auditor', color: '#f59e0b' },
      resolver: { label: 'Resolver', color: '#f43f5e' },
      custom: { label: 'Custom', color: '#a855f7' },
    };
    return meta[role];
  }

  getCurrentPhase(mission: ConductorMission): string {
    const statuses = Array.from(mission.nodes.values()).map(n => n.status);
    if (statuses.every(s => s === 'pending')) return 'initialization';
    if (statuses.some(s => s === 'running' || s === 'spawning')) return 'execution';
    if (statuses.some(s => s === 'awaiting-review')) return 'review';
    if (statuses.some(s => s === 'blocked')) return 'blocked';
    if (statuses.every(s => ['done', 'failed', 'killed'].includes(s))) return 'completed';
    return 'planning';
  }

  // ─── Budget Manager ──────────────────────────────────────────────────────

  async trackTokenUsage(nodeId: string, tokens: number, cost: number): Promise<void> {
    const mission = this.findMissionByNodeId(nodeId);
    if (!mission) return;
    const node = mission.nodes.get(nodeId);
    if (!node) return;

    node.tokensUsed += tokens;
    node.cost += cost;
    node.lastActivityAt = Date.now();

    mission.budget.usedTokens += tokens;
    mission.budget.usedCost += cost;

    const agentBudget = mission.budget.perAgent.get(nodeId) || { tokens: 0, cost: 0 };
    agentBudget.tokens += tokens;
    agentBudget.cost += cost;
    mission.budget.perAgent.set(nodeId, agentBudget);

    await this.db.run(
      'UPDATE conductor_nodes SET tokens_used = ?, cost = ?, last_activity_at = ? WHERE id = ?',
      [node.tokensUsed, node.cost, node.lastActivityAt, nodeId]
    );
    await this.db.run(
      'UPDATE conductor_missions SET budget_used_tokens = ?, budget_used_cost = ? WHERE id = ?',
      [mission.budget.usedTokens, mission.budget.usedCost, mission.id]
    );

    await this.checkBudgetAlerts(mission, node);
  }

  async checkBudgetAlerts(mission: ConductorMission, node: ConductorNode): Promise<void> {
    const alerts: BudgetAlert[] = [];
    const tokenPct = node.tokensUsed / node.budgetLimitTokens;
    const costPct = node.cost / node.budgetLimitCost;

    if (tokenPct >= 1.0 || costPct >= 1.0) {
      alerts.push({
        id: uuidv4(),
        nodeId: node.id,
        type: 'exceeded',
        message: `Agent ${node.role} (${node.id}) exceeded budget. Tokens: ${node.tokensUsed}/${node.budgetLimitTokens}, Cost: $${node.cost.toFixed(2)}/$${node.budgetLimitCost}.`,
        triggeredAt: Date.now(),
      });
      node.status = 'blocked';
      await this.createEscalation(mission.id, node.id, 'budget-exceeded', `Budget exceeded for ${node.role}`);
    } else if (tokenPct >= 0.9 || costPct >= 0.9) {
      alerts.push({
        id: uuidv4(),
        nodeId: node.id,
        type: 'critical',
        message: `Agent ${node.role} approaching budget limit. ${Math.round((1 - tokenPct) * 100)}% tokens remaining.`,
        triggeredAt: Date.now(),
      });
    } else if (tokenPct >= 0.75 || costPct >= 0.75) {
      alerts.push({
        id: uuidv4(),
        nodeId: node.id,
        type: 'warning',
        message: `Agent ${node.role} at 75% budget usage.`,
        triggeredAt: Date.now(),
      });
    }

    mission.budget.alerts.push(...alerts);
    for (const alert of alerts) {
      this.emit('budget-alert', { missionId: mission.id, alert });
    }
  }

  async getBudgetStatus(missionId: string): Promise<BudgetState | null> {
    const mission = this.missions.get(missionId);
    return mission ? mission.budget : null;
  }

  // ─── Progress Tracker ────────────────────────────────────────────────────

  async updateProgress(missionId: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) return;

    const nodes = Array.from(mission.nodes.values());
    const total = nodes.length;
    const done = nodes.filter(n => n.status === 'done').length;
    const failed = nodes.filter(n => n.status === 'failed').length;
    const pct = total > 0 ? (done / total) * 100 : 0;

    mission.progress = {
      pct,
      tasksTotal: total,
      tasksDone: done,
      tasksFailed: failed,
      phases: [
        { phase: 'planning', status: nodes.some(n => n.role === 'director' && n.status === 'done') ? 'done' : nodes.some(n => n.role === 'director' && n.status === 'running') ? 'active' : 'pending', pct: 0 },
        { phase: 'execution', status: nodes.some(n => n.role === 'worker' && n.status === 'running') ? 'active' : nodes.some(n => n.role === 'worker' && n.status === 'done') ? 'done' : 'pending', pct: 0 },
        { phase: 'review', status: nodes.some(n => n.role === 'qa' && n.status === 'running') ? 'active' : nodes.some(n => n.role === 'qa' && n.status === 'done') ? 'done' : 'pending', pct: 0 },
        { phase: 'audit', status: nodes.some(n => n.role === 'auditor' && n.status === 'running') ? 'active' : nodes.some(n => n.role === 'auditor' && n.status === 'done') ? 'done' : 'pending', pct: 0 },
      ],
    };

    await this.db.run(
      'UPDATE conductor_missions SET progress_pct = ?, tasks_total = ?, tasks_done = ? WHERE id = ?',
      [pct, total, done, missionId]
    );

    this.emit('progress', { missionId, progress: mission.progress });
  }

  async getProgress(missionId: string): Promise<ProgressState | null> {
    const mission = this.missions.get(missionId);
    return mission ? mission.progress : null;
  }

  // ─── Concurrency Manager ─────────────────────────────────────────────────

  async acquireFileLock(filePath: string, nodeId: string): Promise<boolean> {
    if (this.fileLocks.has(filePath)) {
      const holder = this.fileLocks.get(filePath)!;
      if (holder === nodeId) return true;
      return false;
    }
    this.fileLocks.set(filePath, nodeId);
    return true;
  }

  releaseFileLock(filePath: string, nodeId: string): void {
    if (this.fileLocks.get(filePath) === nodeId) {
      this.fileLocks.delete(filePath);
    }
  }

  async checkBoundaryOverlap(nodeA: ConductorNode, nodeB: ConductorNode): Promise<string[]> {
    const overlap: string[] = [];
    for (const boundaryA of nodeA.boundaries) {
      for (const boundaryB of nodeB.boundaries) {
        if (this.pathsOverlap(boundaryA, boundaryB)) {
          overlap.push(boundaryA);
        }
      }
    }
    return overlap;
  }

  pathsOverlap(a: string, b: string): boolean {
    const normalize = (p: string) => p.replace(/\/g, '/').replace(/\*\/$/, '');
    const na = normalize(a);
    const nb = normalize(b);
    return na.startsWith(nb) || nb.startsWith(na) || na === nb;
  }

  async enforceBoundaries(nodeId: string, filePath: string): Promise<boolean> {
    const mission = this.findMissionByNodeId(nodeId);
    if (!mission) return false;
    const node = mission.nodes.get(nodeId);
    if (!node) return false;

    const normalized = filePath.replace(/\/g, '/');
    const withinBoundary = node.boundaries.some(b => {
      const nb = b.replace(/\/g, '/').replace(/\*\/$/, '');
      return normalized.startsWith(nb) || normalized === nb;
    });

    if (!withinBoundary) {
      await this.createEscalation(mission.id, nodeId, 'boundary-violation', `Agent attempted to access ${filePath} outside boundaries ${node.boundaries.join(', ')}`);
      return false;
    }

    return await this.acquireFileLock(filePath, nodeId);
  }

  // ─── Recovery Manager ────────────────────────────────────────────────────

  async detectStuckAgents(): Promise<void> {
    const now = Date.now();
    const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

    for (const mission of this.missions.values()) {
      for (const node of mission.nodes.values()) {
        if (node.status !== 'running') continue;
        const idleTime = now - node.lastActivityAt;
        if (idleTime > STUCK_THRESHOLD_MS) {
          node.retries++;
          if (node.retries >= node.maxRetries) {
            node.status = 'failed';
            await this.createEscalation(mission.id, node.id, 'stuck', `Agent ${node.role} stuck for ${Math.round(idleTime / 60000)} minutes after ${node.maxRetries} retries`);
          } else {
            node.lastActivityAt = now;
            this.emit('recovery', { missionId: mission.id, nodeId: node.id, action: 'retry', attempt: node.retries });
            await this.sendDirectiveToNode(mission.id, node.id, `You have been idle for ${Math.round(idleTime / 60000)} minutes. Please provide a status update or write REPORT.json if complete.`);
          }
          await this.db.run('UPDATE conductor_nodes SET retries = ?, status = ?, last_activity_at = ? WHERE id = ?', [node.retries, node.status, node.lastActivityAt, node.id]);
        }
      }
    }
  }

  async recoverAgent(missionId: string, nodeId: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) return;
    const node = mission.nodes.get(nodeId);
    if (!node) return;

    node.status = 'spawning';
    node.retries = 0;
    node.lastActivityAt = Date.now();
    await this.db.run('UPDATE conductor_nodes SET status = ?, retries = ?, last_activity_at = ? WHERE id = ?', [node.status, node.retries, node.lastActivityAt, nodeId]);

    await this.spawnAgentNode(mission, node);
    this.emit('recovery', { missionId, nodeId, action: 'respawn' });
  }

  // ─── Metrics Collector ───────────────────────────────────────────────────

  async collectMetrics(missionId: string): Promise<AgentMetrics[]> {
    const mission = this.missions.get(missionId);
    if (!mission) return [];

    const metrics: AgentMetrics[] = [];
    for (const node of mission.nodes.values()) {
      const totalTasks = node.successCount + node.errorCount;
      metrics.push({
        nodeId: node.id,
        role: node.role,
        tokensUsed: node.tokensUsed,
        cost: node.cost,
        avgResponseTimeMs: node.avgResponseTimeMs,
        successRate: totalTasks > 0 ? node.successCount / totalTasks : 0,
        filesModified: node.filesModified.length,
        tasksCompleted: node.successCount,
        errors: node.errorCount,
      });
    }

    for (const m of metrics) {
      await this.db.run(
        'INSERT INTO conductor_metrics (mission_id, node_id, metric_type, metric_name, value, unit, ts) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [missionId, m.nodeId, 'agent', 'tokens_used', m.tokensUsed, 'tokens', Date.now()]
      );
    }

    return metrics;
  }

  async getMetrics(missionId: string): Promise<AgentMetrics[]> {
    return await this.collectMetrics(missionId);
  }

  // ─── Session Integrator ──────────────────────────────────────────────────

  async linkNodeToSession(nodeId: string, terminalId: string, sessionId: string): Promise<void> {
    const mission = this.findMissionByNodeId(nodeId);
    if (!mission) return;
    const node = mission.nodes.get(nodeId);
    if (!node) return;

    node.terminalId = terminalId;
    node.sessionId = sessionId;

    await this.db.run(
      'UPDATE conductor_nodes SET terminal_id = ?, session_id = ? WHERE id = ?',
      [terminalId, sessionId, nodeId]
    );
    await this.db.run(
      'INSERT INTO conductor_sessions (id, mission_id, node_id, terminal_id, session_id, agent_type, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), mission.id, nodeId, terminalId, sessionId, node.agentType, node.role, 'active']
    );

    this.emit('session-linked', { missionId: mission.id, nodeId, terminalId, sessionId });
  }

  async getNodeSessions(missionId: string): Promise<any[]> {
    return await this.db.all('SELECT * FROM conductor_sessions WHERE mission_id = ? ORDER BY created_at', [missionId]);
  }

  // ─── Mission Lifecycle ───────────────────────────────────────────────────

  async createMission(params: {
    projectId: string;
    name: string;
    objective: string;
    templateId?: string;
    repoPath: string;
    userBranch: string;
    autonomyLevel?: number;
    budgetTokens?: number;
    budgetCost?: number;
  }): Promise<ConductorMission> {
    const mission: ConductorMission = {
      id: uuidv4(),
      projectId: params.projectId,
      name: params.name,
      objective: params.objective,
      templateId: params.templateId,
      status: 'pending',
      autonomyLevel: params.autonomyLevel || 3,
      integrationBranch: `conductor/${uuidv4().slice(0, 8)}`,
      userBranch: params.userBranch,
      repoPath: params.repoPath,
      createdAt: Date.now(),
      budget: {
        totalTokens: params.budgetTokens || 1000000,
        totalCost: params.budgetCost || 50.0,
        usedTokens: 0,
        usedCost: 0.0,
        perAgent: new Map(),
        alerts: [],
      },
      progress: { pct: 0, tasksTotal: 0, tasksDone: 0, tasksFailed: 0, phases: [] },
      config: {
        autoAuditInterval: 30000,
        mergeStrategy: 'sequential',
        conflictResolution: 'auto-resolver',
        maxConcurrentAgents: 5,
        timeoutDefaultMin: 30,
        retryPolicy: 'exponential',
        notifyOnComplete: true,
      },
      nodes: new Map(),
      messages: [],
      escalations: [],
    };

    await this.db.run(
      `INSERT INTO conductor_missions (id, project_id, name, objective, template_id, status, autonomy_level, integration_branch, user_branch, repo_path, budget_total_tokens, budget_total_cost, config_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [mission.id, mission.projectId, mission.name, mission.objective, mission.templateId || null,
       mission.status, mission.autonomyLevel, mission.integrationBranch, mission.userBranch,
       mission.repoPath, mission.budget.totalTokens, mission.budget.totalCost, JSON.stringify(mission.config)]
    );

    this.missions.set(mission.id, mission);
    return mission;
  }

  async startMission(missionId: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) throw new Error('Mission not found');

    mission.status = 'running';
    mission.startedAt = Date.now();

    const git = simpleGit(mission.repoPath);
    await git.checkoutLocalBranch(mission.integrationBranch);

    await this.db.run('UPDATE conductor_missions SET status = ?, started_at = ? WHERE id = ?', [mission.status, mission.startedAt, missionId]);

    const directorNode = await this.createNode(mission, {
      role: 'director',
      parentId: null,
      objective: mission.objective,
      boundaries: [mission.repoPath],
    });

    await this.spawnAgentNode(mission, directorNode);
    this.startTick(missionId);
    this.emit('mission-started', { missionId });
  }

  async createNode(mission: ConductorMission, params: {
    role: ConductorRole;
    parentId: string | null;
    objective: string;
    boundaries: string[];
    customRoleConfig?: RoleConfig;
  }): Promise<ConductorNode> {
    const parent = params.parentId ? mission.nodes.get(params.parentId) : null;
    const depth = parent ? parent.depth + 1 : 0;
    const template = mission.templateId ? this.workflowTemplates.get(mission.templateId) : null;
    const roleConfig = params.customRoleConfig || template?.roles.find(r => r.role === params.role) || this.getDefaultRoleConfig(params.role);
    const provider = this.getDefaultAgentProvider();

    const node: ConductorNode = {
      id: uuidv4(),
      missionId: mission.id,
      parentId: params.parentId,
      role: params.role,
      roleConfig,
      agentType: provider?.id || 'default',
      agentConfig: provider || { id: 'default', name: 'Default', provider: 'opencode', model: 'default', maxTokens: 4000, rateLimitRpm: 60, costPer1kInput: 0.003, costPer1kOutput: 0.015, capabilities: ['file-access', 'terminal-access'], isDefault: true },
      terminalId: '',
      worktreePath: path.join(mission.repoPath, '.conductor', mission.id, `node-${depth}-${uuidv4().slice(0, 6)}`),
      branch: `conductor/${mission.id.slice(0, 8)}/${params.role}/${depth}`,
      objective: params.objective,
      status: 'pending',
      depth,
      retries: 0,
      maxRetries: 3,
      boundaries: params.boundaries,
      filesAccessed: [],
      filesModified: [],
      tokensUsed: 0,
      cost: 0,
      budgetLimitTokens: roleConfig ? 100000 : 50000,
      budgetLimitCost: roleConfig ? 5.0 : 2.5,
      lastActivityAt: Date.now(),
      errorCount: 0,
      successCount: 0,
      avgResponseTimeMs: 0,
    };

    mission.nodes.set(node.id, node);
    mission.progress.tasksTotal = mission.nodes.size;

    await this.db.run(
      `INSERT INTO conductor_nodes (id, mission_id, parent_id, role, role_config, agent_type, agent_config, worktree_path, branch, objective, status, depth, max_retries, boundaries, budget_limit_tokens, budget_limit_cost, last_activity_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [node.id, node.missionId, node.parentId, node.role, JSON.stringify(node.roleConfig), node.agentType,
       JSON.stringify(node.agentConfig), node.worktreePath, node.branch, node.objective, node.status,
       node.depth, node.maxRetries, JSON.stringify(node.boundaries), node.budgetLimitTokens, node.budgetLimitCost, node.lastActivityAt]
    );

    return node;
  }

  getDefaultRoleConfig(role: ConductorRole): RoleConfig {
    return {
      role,
      agentTypeId: 'default',
      canSpawnChildren: role === 'director' || role === 'planner',
      maxDepth: role === 'director' ? 3 : role === 'planner' ? 2 : 0,
      maxChildren: role === 'director' ? 6 : role === 'planner' ? 4 : 0,
      fileAccess: role === 'worker' || role === 'resolver' ? 'write' : 'read',
      terminalAccess: role === 'worker' || role === 'resolver' || role === 'director',
      gitAccess: true,
      autoAudit: role === 'auditor' || role === 'director',
      promptTemplate: role,
    };
  }

  async spawnAgentNode(mission: ConductorMission, node: ConductorNode): Promise<void> {
    node.status = 'spawning';
    await this.db.run('UPDATE conductor_nodes SET status = ? WHERE id = ?', [node.status, node.id]);

    await fs.mkdir(node.worktreePath, { recursive: true });

    const git = simpleGit(mission.repoPath);
    await git.raw(['worktree', 'add', '-b', node.branch, node.worktreePath, mission.integrationBranch]);

    const conductorDir = path.join(node.worktreePath, '.conductor');
    await fs.mkdir(conductorDir, { recursive: true });

    const sessionJson = {
      missionId: mission.id,
      nodeId: node.id,
      role: node.role,
      objective: node.objective,
      boundaries: node.boundaries,
      autonomyLevel: mission.autonomyLevel,
      parentId: node.parentId,
    };
    await fs.writeFile(path.join(conductorDir, 'SESSION.json'), JSON.stringify(sessionJson, null, 2));

    const prompt = this.assemblePrompt(node, mission, {});
    await fs.writeFile(path.join(conductorDir, 'PROMPT.md'), prompt);

    const terminalId = `conductor-${mission.id.slice(0, 8)}-${node.role}-${node.depth}`;
    node.terminalId = terminalId;

    this.emit('node-spawned', { missionId: mission.id, nodeId: node.id, terminalId });

    if (this.host?.spawnAgentTerminal) {
      await this.host.spawnAgentTerminal(terminalId, node.worktreePath, node.agentType, prompt);
    }

    node.status = 'running';
    node.startedAt = Date.now();
    node.lastActivityAt = Date.now();
    await this.db.run('UPDATE conductor_nodes SET status = ?, terminal_id = ?, started_at = ?, last_activity_at = ? WHERE id = ?', [node.status, node.terminalId, node.startedAt, node.lastActivityAt, node.id]);

    await this.linkNodeToSession(node.id, terminalId, `session-${node.id.slice(0, 8)}`);
  }

  // ─── Tick Loop ───────────────────────────────────────────────────────────

  startTick(missionId: string): void {
    if (this.ticks.has(missionId)) return;
    const interval = setInterval(() => this.tick(missionId), 3000);
    this.ticks.set(missionId, interval);
  }

  stopTick(missionId: string): void {
    const interval = this.ticks.get(missionId);
    if (interval) {
      clearInterval(interval);
      this.ticks.delete(missionId);
    }
  }

  async tick(missionId: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission || mission.status === 'killed' || mission.status === 'done') {
      this.stopTick(missionId);
      return;
    }

    await this.detectStuckAgents();
    await this.processNodeFiles(mission);
    await this.processMergeQueue(mission);
    await this.checkCompletion(mission);
    await this.updateProgress(missionId);
    await this.collectMetrics(missionId);

    this.emit('snapshot', await this.getSnapshot(missionId));
  }

  async processNodeFiles(mission: ConductorMission): Promise<void> {
    for (const node of mission.nodes.values()) {
      if (node.status !== 'running') continue;

      const conductorDir = path.join(node.worktreePath, '.conductor');

      const reportPath = path.join(conductorDir, 'REPORT.json');
      const escalatePath = path.join(conductorDir, 'ESCALATE.json');
      const planPath = path.join(conductorDir, 'PLAN.json');
      const newGoalsPath = path.join(conductorDir, 'NEW_GOALS.json');

      try {
        const reportStat = await fs.stat(reportPath);
        if (reportStat) {
          const report = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
          await this.handleReport(mission, node, report);
          await fs.unlink(reportPath);
        }
      } catch {}

      try {
        const escalateStat = await fs.stat(escalatePath);
        if (escalateStat) {
          const escalate = JSON.parse(await fs.readFile(escalatePath, 'utf-8'));
          await this.handleEscalation(mission, node, escalate);
          await fs.unlink(escalatePath);
        }
      } catch {}

      try {
        const planStat = await fs.stat(planPath);
        if (planStat) {
          const plan = JSON.parse(await fs.readFile(planPath, 'utf-8'));
          await this.handlePlan(mission, node, plan);
          await fs.unlink(planPath);
        }
      } catch {}

      try {
        const goalsStat = await fs.stat(newGoalsPath);
        if (goalsStat) {
          const goals = JSON.parse(await fs.readFile(newGoalsPath, 'utf-8'));
          await this.handleNewGoals(mission, node, goals);
          await fs.unlink(newGoalsPath);
        }
      } catch {}
    }
  }

  async handleReport(mission: ConductorMission, node: ConductorNode, report: any): Promise<void> {
    node.status = 'awaiting-review';
    node.completedAt = Date.now();
    node.successCount++;
    node.lastActivityAt = Date.now();

    if (report.filesModified) {
      node.filesModified = [...new Set([...node.filesModified, ...report.filesModified])];
    }
    if (report.tokensUsed) {
      await this.trackTokenUsage(node.id, report.tokensUsed, report.cost || 0);
    }

    await this.db.run('UPDATE conductor_nodes SET status = ?, completed_at = ?, success_count = ?, files_modified = ? WHERE id = ?',
      [node.status, node.completedAt, node.successCount, JSON.stringify(node.filesModified), node.id]);

    const message: ConductorMessage = {
      id: uuidv4(),
      missionId: mission.id,
      ts: Date.now(),
      fromNodeId: node.id,
      toNodeId: node.parentId,
      type: 'REPORT',
      summary: report.summary || `${node.role} completed task`,
      payload: report,
      tokensUsed: report.tokensUsed || 0,
      cost: report.cost || 0,
    };
    mission.messages.push(message);
    await this.logMessage(message);

    this.emit('node-report', { missionId: mission.id, nodeId: node.id, report });
  }

  async handleEscalation(mission: ConductorMission, node: ConductorNode, escalate: any): Promise<void> {
    node.status = 'blocked';
    await this.db.run('UPDATE conductor_nodes SET status = ? WHERE id = ?', [node.status, node.id]);

    const reason = escalate.reason || 'needs-clarification';
    await this.createEscalation(mission.id, node.id, reason as EscalationReason, escalate.detail || 'Agent requested help');

    const message: ConductorMessage = {
      id: uuidv4(),
      missionId: mission.id,
      ts: Date.now(),
      fromNodeId: node.id,
      toNodeId: node.parentId,
      type: 'ESCALATE',
      summary: escalate.summary || `${node.role} escalated: ${reason}`,
      payload: escalate,
      tokensUsed: 0,
      cost: 0,
    };
    mission.messages.push(message);
    await this.logMessage(message);

    this.emit('escalation', { missionId: mission.id, nodeId: node.id, reason });
  }

  async handlePlan(mission: ConductorMission, node: ConductorNode, plan: any): Promise<void> {
    if (!plan.subtasks || !Array.isArray(plan.subtasks)) return;

    const template = mission.templateId ? this.workflowTemplates.get(mission.templateId) : null;
    const maxChildren = node.roleConfig.maxChildren || 3;

    for (let i = 0; i < Math.min(plan.subtasks.length, maxChildren); i++) {
      const subtask = plan.subtasks[i];
      const role = subtask.role || 'worker';
      const boundaries = subtask.boundaries || node.boundaries;

      const overlap = await this.checkBoundaryOverlapWithSiblings(mission, node.id, boundaries);
      if (overlap.length > 0) {
        await this.createEscalation(mission.id, node.id, 'boundary-violation', `Subtask boundary overlap detected: ${overlap.join(', ')}`);
        continue;
      }

      const childNode = await this.createNode(mission, {
        role: role as ConductorRole,
        parentId: node.id,
        objective: subtask.objective,
        boundaries,
      });

      await this.spawnAgentNode(mission, childNode);
    }

    node.status = 'done';
    await this.db.run('UPDATE conductor_nodes SET status = ? WHERE id = ?', [node.status, node.id]);

    const message: ConductorMessage = {
      id: uuidv4(),
      missionId: mission.id,
      ts: Date.now(),
      fromNodeId: node.id,
      toNodeId: null,
      type: 'DIRECTIVE',
      summary: `Director spawned ${plan.subtasks.length} subtasks`,
      payload: plan,
      tokensUsed: 0,
      cost: 0,
    };
    mission.messages.push(message);
    await this.logMessage(message);
  }

  async checkBoundaryOverlapWithSiblings(mission: ConductorMission, parentId: string, boundaries: string[]): Promise<string[]> {
    const siblings = Array.from(mission.nodes.values()).filter(n => n.parentId === parentId && n.status !== 'killed');
    const overlap: string[] = [];
    for (const sibling of siblings) {
      for (const b1 of boundaries) {
        for (const b2 of sibling.boundaries) {
          if (this.pathsOverlap(b1, b2)) {
            overlap.push(b1);
          }
        }
      }
    }
    return [...new Set(overlap)];
  }

  async handleNewGoals(mission: ConductorMission, node: ConductorNode, goals: any): Promise<void> {
    if (!goals.objectives || !Array.isArray(goals.objectives)) return;
    for (const obj of goals.objectives) {
      const childNode = await this.createNode(mission, {
        role: 'worker',
        parentId: node.id,
        objective: obj,
        boundaries: node.boundaries,
      });
      await this.spawnAgentNode(mission, childNode);
    }
  }

  async processMergeQueue(mission: ConductorMission): Promise<void> {
    const readyNodes = Array.from(mission.nodes.values()).filter(n => n.status === 'awaiting-review');
    if (readyNodes.length === 0) return;

    const git = simpleGit(mission.repoPath);

    for (const node of readyNodes) {
      try {
        await git.mergeFromTo(node.branch, mission.integrationBranch, ['--no-ff', '-m', `Merge ${node.role} (${node.id.slice(0, 8)})`]);
        node.status = 'done';
        await this.db.run('UPDATE conductor_nodes SET status = ? WHERE id = ?', [node.status, node.id]);

        const message: ConductorMessage = {
          id: uuidv4(),
          missionId: mission.id,
          ts: Date.now(),
          fromNodeId: node.id,
          toNodeId: null,
          type: 'MERGE_OK',
          summary: `Merged ${node.role} branch into integration`,
          tokensUsed: 0,
          cost: 0,
        };
        mission.messages.push(message);
        await this.logMessage(message);
      } catch (err: any) {
        if (err.message?.includes('CONFLICT')) {
          const message: ConductorMessage = {
            id: uuidv4(),
            missionId: mission.id,
            ts: Date.now(),
            fromNodeId: node.id,
            toNodeId: null,
            type: 'MERGE_CONFLICT',
            summary: `Merge conflict in ${node.role} branch`,
            payload: { error: err.message },
            tokensUsed: 0,
            cost: 0,
          };
          mission.messages.push(message);
          await this.logMessage(message);
          await this.spawnResolver(mission, node);
        } else {
          node.status = 'failed';
          await this.db.run('UPDATE conductor_nodes SET status = ? WHERE id = ?', [node.status, node.id]);
        }
      }
    }
  }

  async spawnResolver(mission: ConductorMission, conflictNode: ConductorNode): Promise<void> {
    const resolverNode = await this.createNode(mission, {
      role: 'resolver',
      parentId: conflictNode.parentId,
      objective: `Resolve merge conflicts from ${conflictNode.role} (${conflictNode.id.slice(0, 8)})`,
      boundaries: conflictNode.boundaries,
    });
    await this.spawnAgentNode(mission, resolverNode);
  }

  async checkCompletion(mission: ConductorMission): Promise<void> {
    const allNodes = Array.from(mission.nodes.values());
    const allDone = allNodes.every(n => ['done', 'failed', 'killed'].includes(n.status));
    const anyRunning = allNodes.some(n => n.status === 'running' || n.status === 'spawning');

    if (!allDone || anyRunning || allNodes.length === 0) return;

    const hasFailures = allNodes.some(n => n.status === 'failed');
    if (hasFailures && mission.config.conflictResolution === 'abort') {
      mission.status = 'failed';
    } else if (!hasFailures) {
      await this.spawnAuditor(mission);
    }

    await this.db.run('UPDATE conductor_missions SET status = ? WHERE id = ?', [mission.status, mission.id]);
  }

  async spawnAuditor(mission: ConductorMission): Promise<void> {
    const auditorNode = await this.createNode(mission, {
      role: 'auditor',
      parentId: null,
      objective: `Audit mission ${mission.name} for completeness, security, and quality`,
      boundaries: [mission.repoPath],
    });
    await this.spawnAgentNode(mission, auditorNode);
  }

  // ─── Escalation System ───────────────────────────────────────────────────

  async createEscalation(missionId: string, nodeId: string | null, reason: EscalationReason, detail: string): Promise<EscalationItem> {
    const mission = this.missions.get(missionId);
    if (!mission) throw new Error('Mission not found');

    const escalation: EscalationItem = {
      id: uuidv4(),
      missionId,
      nodeId,
      reason,
      detail,
      status: 'pending',
      createdAt: Date.now(),
    };

    mission.escalations.push(escalation);

    await this.db.run(
      'INSERT INTO conductor_escalations (id, mission_id, node_id, reason, detail, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [escalation.id, missionId, nodeId, reason, detail, escalation.status, escalation.createdAt]
    );

    this.emit('escalation-created', escalation);
    return escalation;
  }

  async resolveEscalation(escalationId: string, decision: 'approved' | 'rejected', note?: string): Promise<void> {
    for (const mission of this.missions.values()) {
      const escalation = mission.escalations.find(e => e.id === escalationId);
      if (!escalation) continue;

      escalation.status = decision;
      escalation.decidedAt = Date.now();
      escalation.note = note;

      await this.db.run(
        'UPDATE conductor_escalations SET status = ?, decided_at = ?, note = ? WHERE id = ?',
        [decision, escalation.decidedAt, note || null, escalationId]
      );

      if (escalation.nodeId && decision === 'approved') {
        const node = mission.nodes.get(escalation.nodeId);
        if (node) {
          node.status = 'running';
          node.retries = 0;
          node.lastActivityAt = Date.now();
          await this.db.run('UPDATE conductor_nodes SET status = ?, retries = ?, last_activity_at = ? WHERE id = ?', [node.status, node.retries, node.lastActivityAt, node.id]);
          await this.sendDirectiveToNode(mission.id, node.id, `Escalation approved. ${note || 'Continue with your task.'}`);
        }
      }

      this.emit('escalation-resolved', escalation);
      return;
    }
  }

  // ─── Control Operations ─────────────────────────────────────────────────

  async pauseMission(missionId: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) return;
    mission.status = 'blocked';
    mission.pausedAt = Date.now();
    await this.db.run('UPDATE conductor_missions SET status = ?, paused_at = ? WHERE id = ?', [mission.status, mission.pausedAt, missionId]);
    this.emit('mission-paused', { missionId });
  }

  async resumeMission(missionId: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) return;
    mission.status = 'running';
    mission.pausedAt = undefined;
    await this.db.run('UPDATE conductor_missions SET status = ?, paused_at = NULL WHERE id = ?', [mission.status, missionId]);
    this.startTick(missionId);
    this.emit('mission-resumed', { missionId });
  }

  async killMission(missionId: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) return;
    mission.status = 'killed';
    this.stopTick(missionId);

    for (const node of mission.nodes.values()) {
      node.status = 'killed';
      if (node.terminalId && this.host?.killTerminal) {
        await this.host.killTerminal(node.terminalId);
      }
    }

    await this.db.run('UPDATE conductor_missions SET status = ? WHERE id = ?', [mission.status, missionId]);
    await this.db.run('UPDATE conductor_nodes SET status = ? WHERE mission_id = ?', ['killed', missionId]);
    this.emit('mission-killed', { missionId });
  }

  async setAutonomy(missionId: string, level: number): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) return;
    mission.autonomyLevel = Math.max(1, Math.min(5, level));
    await this.db.run('UPDATE conductor_missions SET autonomy_level = ? WHERE id = ?', [mission.autonomyLevel, missionId]);
    this.emit('autonomy-changed', { missionId, level: mission.autonomyLevel });
  }

  async sendDirective(missionId: string, text: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) return;

    const director = Array.from(mission.nodes.values()).find(n => n.role === 'director' && n.status === 'running');
    if (director) {
      await this.sendDirectiveToNode(missionId, director.id, text);
    }

    const message: ConductorMessage = {
      id: uuidv4(),
      missionId,
      ts: Date.now(),
      fromNodeId: null,
      toNodeId: null,
      type: 'DIRECTIVE',
      summary: text,
      tokensUsed: 0,
      cost: 0,
    };
    mission.messages.push(message);
    await this.logMessage(message);
  }

  async sendDirectiveToNode(missionId: string, nodeId: string, text: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) return;
    const node = mission.nodes.get(nodeId);
    if (!node) return;

    const directivePath = path.join(node.worktreePath, '.conductor', 'DIRECTIVE.json');
    await fs.writeFile(directivePath, JSON.stringify({ directive: text, ts: Date.now() }, null, 2));
  }

  async promoteIntegration(missionId: string): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) return;

    const git = simpleGit(mission.repoPath);
    await git.checkout(mission.userBranch);
    await git.merge([mission.integrationBranch, '--no-ff', '-m', `Promote conductor mission: ${mission.name}`]);

    mission.status = 'done';
    mission.completedAt = Date.now();
    await this.db.run('UPDATE conductor_missions SET status = ?, completed_at = ? WHERE id = ?', [mission.status, mission.completedAt, missionId]);

    this.stopTick(missionId);
    this.emit('mission-completed', { missionId });
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  async getSnapshot(missionId: string): Promise<ConductorSnapshot | null> {
    const mission = this.missions.get(missionId);
    if (!mission) return null;

    const metrics = await this.collectMetrics(missionId);
    return {
      mission,
      nodes: Array.from(mission.nodes.values()),
      messages: mission.messages.slice(-100),
      escalations: mission.escalations,
      budget: mission.budget,
      progress: mission.progress,
      metrics,
    };
  }

  async listMissions(): Promise<ConductorMission[]> {
    return Array.from(this.missions.values());
  }

  async getMissionHistory(): Promise<any[]> {
    return await this.db.all('SELECT * FROM conductor_missions ORDER BY created_at DESC LIMIT 100');
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private findMissionByNodeId(nodeId: string): ConductorMission | undefined {
    for (const mission of this.missions.values()) {
      if (mission.nodes.has(nodeId)) return mission;
    }
    return undefined;
  }

  private async logMessage(message: ConductorMessage): Promise<void> {
    await this.db.run(
      'INSERT INTO conductor_messages (id, mission_id, ts, from_node_id, to_node_id, type, summary, payload, tokens_used, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [message.id, message.missionId, message.ts, message.fromNodeId, message.toNodeId, message.type, message.summary, JSON.stringify(message.payload), message.tokensUsed, message.cost]
    );
  }
}
```

---

## 4. IPC Endpoints

### 4.1 Existing Handlers (preserve)

```typescript
// src/main.ts — existing handlers (already wired)
ipcMain.handle('conductor:start', async (_event, opts) => {
  const mission = await conductorService.createMission({
    projectId: opts.projectId,
    name: opts.name,
    objective: opts.objective,
    templateId: opts.templateId,
    repoPath: opts.repoPath,
    userBranch: opts.userBranch || 'main',
    autonomyLevel: opts.autonomyLevel,
    budgetTokens: opts.budgetTokens,
    budgetCost: opts.budgetCost,
  });
  await conductorService.startMission(mission.id);
  return { success: true, data: { missionId: mission.id } };
});

ipcMain.handle('conductor:pause', async (_event, missionId) => {
  await conductorService.pauseMission(missionId);
  return { success: true };
});

ipcMain.handle('conductor:resume', async (_event, missionId) => {
  await conductorService.resumeMission(missionId);
  return { success: true };
});

ipcMain.handle('conductor:kill', async (_event, missionId) => {
  await conductorService.killMission(missionId);
  return { success: true };
});

ipcMain.handle('conductor:set-autonomy', async (_event, missionId, level) => {
  await conductorService.setAutonomy(missionId, level);
  return { success: true };
});

ipcMain.handle('conductor:send-directive', async (_event, missionId, text) => {
  await conductorService.sendDirective(missionId, text);
  return { success: true };
});

ipcMain.handle('conductor:resolve-escalation', async (_event, escId, decision, note) => {
  await conductorService.resolveEscalation(escId, decision, note);
  return { success: true };
});

ipcMain.handle('conductor:promote', async (_event, missionId) => {
  await conductorService.promoteIntegration(missionId);
  return { success: true };
});

ipcMain.handle('conductor:get-snapshot', async (_event, missionId) => {
  const snapshot = await conductorService.getSnapshot(missionId);
  return { success: true, data: snapshot };
});

ipcMain.handle('conductor:list-missions', async () => {
  const missions = await conductorService.listMissions();
  return { success: true, data: missions };
});
```

### 4.2 New Handlers

```typescript
// src/main.ts — NEW handlers

ipcMain.handle('conductor:get-config', async (_event, configType, projectId) => {
  const configs = await conductorService.getConfig(configType, projectId);
  return { success: true, data: configs };
});

ipcMain.handle('conductor:save-config', async (_event, configType, name, value, projectId) => {
  await conductorService.saveConfig(configType, name, value, projectId);
  return { success: true };
});

ipcMain.handle('conductor:get-metrics', async (_event, missionId) => {
  const metrics = await conductorService.getMetrics(missionId);
  return { success: true, data: metrics };
});

ipcMain.handle('conductor:get-templates', async () => {
  const templates = await conductorService.listWorkflowTemplates();
  return { success: true, data: templates };
});

ipcMain.handle('conductor:save-template', async (_event, template) => {
  await conductorService.saveWorkflowTemplate(template);
  return { success: true };
});

ipcMain.handle('conductor:get-progress', async (_event, missionId) => {
  const progress = await conductorService.getProgress(missionId);
  return { success: true, data: progress };
});

ipcMain.handle('conductor:get-budget', async (_event, missionId) => {
  const budget = await conductorService.getBudgetStatus(missionId);
  return { success: true, data: budget };
});

ipcMain.handle('conductor:recover-agent', async (_event, missionId, nodeId) => {
  await conductorService.recoverAgent(missionId, nodeId);
  return { success: true };
});

ipcMain.handle('conductor:enforce-boundary', async (_event, nodeId, filePath) => {
  const result = await conductorService.enforceBoundaries(nodeId, filePath);
  return { success: true, data: { allowed: result } };
});

ipcMain.handle('conductor:register-provider', async (_event, config) => {
  conductorService.registerAgentProvider(config);
  return { success: true };
});

ipcMain.handle('conductor:list-providers', async () => {
  const providers = conductorService.listAgentProviders();
  return { success: true, data: providers };
});

ipcMain.handle('conductor:delete-provider', async (_event, providerId) => {
  conductorService.agentProviders.delete(providerId);
  return { success: true };
});

ipcMain.handle('conductor:get-mission-history', async () => {
  const history = await conductorService.getMissionHistory();
  return { success: true, data: history };
});

ipcMain.handle('conductor:engineer-workflow', async (_event, objective, templateId) => {
  const template = conductorService.workflowTemplates.get(templateId);
  const workflow = await conductorService.engineerWorkflow(objective, template);
  return { success: true, data: workflow };
});
```

### 4.3 Preload Bridges

```typescript
// src/preload.ts — add to existing conductor bridges

conductorGetConfig: (configType, projectId) => ipcRenderer.invoke('conductor:get-config', configType, projectId),
conductorSaveConfig: (configType, name, value, projectId) => ipcRenderer.invoke('conductor:save-config', configType, name, value, projectId),
conductorGetMetrics: (missionId) => ipcRenderer.invoke('conductor:get-metrics', missionId),
conductorGetTemplates: () => ipcRenderer.invoke('conductor:get-templates'),
conductorSaveTemplate: (template) => ipcRenderer.invoke('conductor:save-template', template),
conductorGetProgress: (missionId) => ipcRenderer.invoke('conductor:get-progress', missionId),
conductorGetBudget: (missionId) => ipcRenderer.invoke('conductor:get-budget', missionId),
conductorRecoverAgent: (missionId, nodeId) => ipcRenderer.invoke('conductor:recover-agent', missionId, nodeId),
conductorEnforceBoundary: (nodeId, filePath) => ipcRenderer.invoke('conductor:enforce-boundary', nodeId, filePath),
conductorRegisterProvider: (config) => ipcRenderer.invoke('conductor:register-provider', config),
conductorListProviders: () => ipcRenderer.invoke('conductor:list-providers'),
conductorDeleteProvider: (providerId) => ipcRenderer.invoke('conductor:delete-provider', providerId),
conductorGetMissionHistory: () => ipcRenderer.invoke('conductor:get-mission-history'),
conductorEngineerWorkflow: (objective, templateId) => ipcRenderer.invoke('conductor:engineer-workflow', objective, templateId),
```

---

## 5. Mission Creation Wizard

### 5.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    MISSION CREATION WIZARD                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Objective                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  "Describe what you want to accomplish..."              │   │
│  │  [Natural language textarea]                            │   │
│  │                                                         │   │
│  │  Auto-detected: Project: MyApp  Branch: main             │   │
│  │  [No manual repo path selection needed]                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  Step 2: Template Selection                                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │  🔍 Code   │ │  🐛 Bug    │ │  🔨 Feature│ │  🔄 Refactor│  │
│  │   Review   │ │    Fix     │ │    Build   │ │             │  │
│  │  ~30min    │ │  ~45min    │ │  ~90min    │ │  ~60min     │  │
│  │  $15 est   │ │  $25 est   │ │  $40 est   │ │  $20 est    │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  Step 3: AI-Engineered Workflow                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🤖 AI is analyzing your objective...                   │   │
│  │                                                         │   │
│  │  Generated Role Tree:                                   │   │
│  │         Director (Claude)                               │   │
│  │            ├── Planner (Gemini)                         │   │
│  │            │     ├── Worker A (OpenCode) - src/auth     │   │
│  │            │     └── Worker B (Claude) - src/api        │   │
│  │            └── QA (Codex) - tests/                      │   │
│  │                                                         │   │
│  │  [Regenerate] [Customize Roles] [Adjust Boundaries]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  Step 4: Agent Assignment & Budget                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Role          │ Agent Provider   │ Budget    │ Actions   │   │
│  │  ──────────────┼─────────────────┼───────────┼────────── │   │
│  │  Director      │ Claude 3.5 Sonnet│ 100k tok │ ⚙️        │   │
│  │  Planner       │ Gemini 1.5 Pro │  50k tok │ ⚙️        │   │
│  │  Worker A      │ OpenCode        │ 150k tok │ ⚙️        │   │
│  │  Worker B      │ Claude 3.5 Sonnet│ 150k tok │ ⚙️        │   │
│  │  QA            │ Codex           │ 100k tok │ ⚙️        │   │
│  │                                                         │   │
│  │  Total Budget: 550k tokens (~$27.50)                   │   │
│  │  [──────────────●────────────────────] 50% warning       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  Step 5: Review & Launch                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Mission: Fix auth bug in login flow                    │   │
│  │  Template: Bug Fix                                      │   │
│  │  Agents: 5 | Budget: 550k tokens | Est: 45 min          │   │
│  │                                                         │   │
│  │  [🚀 Launch Mission]    [💾 Save as Draft]             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Component: MissionWizard.tsx

```tsx
// src/components/conductor/MissionWizard.tsx
// ~600 lines — multi-step wizard with AI workflow engineering

import { useState, useCallback, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Sparkles, Bot, Settings, Coins, Play, Save, Check, Loader2, GitBranch, Folder, Zap, Search, Bug, Hammer, RefreshCw } from 'lucide-react';

interface WizardStep {
  key: 'objective' | 'template' | 'workflow' | 'agents' | 'review';
  label: string;
  icon: any;
}

const STEPS: WizardStep[] = [
  { key: 'objective', label: 'Objective', icon: Zap },
  { key: 'template', label: 'Template', icon: Search },
  { key: 'workflow', label: 'Workflow', icon: Sparkles },
  { key: 'agents', label: 'Agents', icon: Bot },
  { key: 'review', label: 'Launch', icon: Play },
];

const TEMPLATE_CARDS = [
  { id: 'tpl-code-review', name: 'Code Review', icon: Search, desc: 'Systematic review with director oversight', time: '30 min', cost: '$15', color: 'text-cyan-300', bg: 'bg-cyan-500/10', ring: 'ring-cyan-500/30' },
  { id: 'tpl-bug-fix', name: 'Bug Fix', icon: Bug, desc: 'Investigation and resolution pipeline', time: '45 min', cost: '$25', color: 'text-rose-300', bg: 'bg-rose-500/10', ring: 'ring-rose-500/30' },
  { id: 'tpl-feature-build', name: 'Feature Build', icon: Hammer, desc: 'Parallel implementation with QA', time: '90 min', cost: '$40', color: 'text-emerald-300', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/30' },
  { id: 'tpl-refactor', name: 'Refactoring', icon: RefreshCw, desc: 'Safe refactoring with regression prevention', time: '60 min', cost: '$20', color: 'text-amber-300', bg: 'bg-amber-500/10', ring: 'ring-amber-500/30' },
];

export function MissionWizard({ projectId, repoPath, userBranch, onLaunch, onClose }: {
  projectId: string;
  repoPath: string;
  userBranch: string;
  onLaunch: (config: any) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [objective, setObjective] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [engineeredWorkflow, setEngineeredWorkflow] = useState<any>(null);
  const [isEngineering, setIsEngineering] = useState(false);
  const [agentAssignments, setAgentAssignments] = useState<Record<string, any>>({});
  const [budgetTotal, setBudgetTotal] = useState(550000);
  const [providers, setProviders] = useState<any[]>([]);

  useEffect(() => {
    window.deskflowAPI?.conductorListProviders?.().then((r: any) => {
      if (r?.success) setProviders(r.data || []);
    });
  }, []);

  const engineerWorkflow = useCallback(async () => {
    if (!selectedTemplate || !objective.trim()) return;
    setIsEngineering(true);
    const result = await window.deskflowAPI?.conductorEngineerWorkflow?.(objective, selectedTemplate);
    if (result?.success) {
      setEngineeredWorkflow(result.data);
      const assignments: Record<string, any> = {};
      for (const role of result.data.roles || []) {
        assignments[role.role] = providers.find(p => p.isDefault) || providers[0];
      }
      setAgentAssignments(assignments);
    }
    setIsEngineering(false);
  }, [objective, selectedTemplate, providers]);

  const currentStep = STEPS[step];
  const canNext = step === 0 ? objective.trim().length > 10 : step === 1 ? selectedTemplate !== null : step === 2 ? engineeredWorkflow !== null : step === 3 ? Object.keys(agentAssignments).length > 0 : true;

  const totalBudget = Object.values(agentAssignments).reduce((sum: number, provider: any, idx: number) => {
    const role = engineeredWorkflow?.roles?.[idx];
    return sum + (role?.budgetTokens || 100000) * ((provider?.costPer1kOutput || 0.015) / 1000);
  }, 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="w-[720px] max-h-[90vh] rounded-2xl bg-zinc-950 ring-1 ring-inset ring-zinc-800/70 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-rose-400" />
            <h2 className="text-sm font-semibold text-zinc-100">New Mission</h2>
          </div>
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.key} className={`flex items-center gap-1 ${i > 0 ? 'ml-2' : ''}`}>
                {i > 0 && <div className={`w-4 h-px ${i <= step ? 'bg-rose-500/50' : 'bg-zinc-800'}`} />}
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  i === step ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30' :
                  i < step ? 'bg-emerald-500/10 text-emerald-300' : 'text-zinc-600'
                }`}>
                  <s.icon className="w-3 h-3" />
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-4">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">Mission Objective</label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Describe what you want to accomplish. Be specific about the feature, bug, or refactoring task."
                  className="w-full h-32 bg-zinc-950/50 border border-zinc-800/70 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500/40 resize-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1.5">{objective.length} chars · {objective.trim().split(/\s+/).filter(Boolean).length} words</p>
              </div>
              <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-4">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 block">Project Context</label>
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <div className="flex items-center gap-1.5"><Folder className="w-3.5 h-3.5 text-zinc-500" /><span>{repoPath}</span></div>
                  <div className="flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5 text-zinc-500" /><span>{userBranch}</span></div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATE_CARDS.map((tpl) => {
                const Icon = tpl.icon;
                const isSelected = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`flex flex-col items-start gap-2 p-4 rounded-xl text-left transition-all ${
                      isSelected ? `${tpl.bg} ring-1 ${tpl.ring}` : 'bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${tpl.color}`} />
                      <span className={`text-sm font-semibold ${isSelected ? tpl.color : 'text-zinc-200'}`}>{tpl.name}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{tpl.desc}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-zinc-500">{tpl.time}</span>
                      <span className="text-[10px] text-zinc-500">{tpl.cost}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              {!engineeredWorkflow && !isEngineering && (
                <button onClick={engineerWorkflow} className="flex items-center justify-center gap-2 py-8 rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 hover:bg-zinc-800/40 transition-colors">
                  <Sparkles className="w-5 h-5 text-rose-400" />
                  <span className="text-sm font-medium text-zinc-200">Generate Workflow from Objective</span>
                </button>
              )}
              {isEngineering && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
                  <p className="text-xs text-zinc-400">AI is engineering the optimal workflow...</p>
                </div>
              )}
              {engineeredWorkflow && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-4">
                    <h3 className="text-xs font-semibold text-zinc-300 mb-3">Generated Role Hierarchy</h3>
                    <div className="flex flex-col gap-2">
                      {engineeredWorkflow.roles?.map((role: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-zinc-950/50">
                          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-zinc-200">{role.customName || role.role}</p>
                            <p className="text-[10px] text-zinc-500">{role.canSpawnChildren ? 'Can spawn children' : 'Leaf agent'} · {role.fileAccess} access</p>
                          </div>
                          <span className="text-[10px] text-zinc-500">{role.maxChildren || 0} max children</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-4">
                    <h3 className="text-xs font-semibold text-zinc-300 mb-2">File Boundaries</h3>
                    <div className="flex flex-wrap gap-1">
                      {engineeredWorkflow.boundaries?.map((b: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-zinc-800/60 text-[10px] text-zinc-400">{b}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && engineeredWorkflow && (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-4">
                <h3 className="text-xs font-semibold text-zinc-300 mb-3">Agent Provider Assignment</h3>
                <div className="flex flex-col gap-2">
                  {engineeredWorkflow.roles?.map((role: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-zinc-950/50">
                      <div className="w-24 shrink-0">
                        <p className="text-xs font-medium text-zinc-200">{role.customName || role.role}</p>
                      </div>
                      <select
                        value={agentAssignments[role.role]?.id || ''}
                        onChange={(e) => {
                          const provider = providers.find(p => p.id === e.target.value);
                          setAgentAssignments(prev => ({ ...prev, [role.role]: provider }));
                        }}
                        className="flex-1 bg-zinc-900 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40"
                      >
                        {providers.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.provider}) — {p.model}</option>
                        ))}
                      </select>
                      <div className="w-24 text-right">
                        <p className="text-[10px] text-zinc-500">{role.budgetTokens?.toLocaleString() || '100k'} tok</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-zinc-300">Budget</h3>
                  <span className="text-xs text-zinc-400">${totalBudget.toFixed(2)} estimated</span>
                </div>
                <input
                  type="range"
                  min={100000}
                  max={2000000}
                  step={50000}
                  value={budgetTotal}
                  onChange={(e) => setBudgetTotal(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                  <span>100k tokens</span>
                  <span>{budgetTotal.toLocaleString()} tokens</span>
                  <span>2M tokens</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-4">
                <h3 className="text-xs font-semibold text-zinc-300 mb-3">Mission Summary</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-zinc-950/50 p-3">
                    <p className="text-[10px] text-zinc-500 uppercase">Objective</p>
                    <p className="text-xs text-zinc-200 mt-1 line-clamp-3">{objective}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-950/50 p-3">
                    <p className="text-[10px] text-zinc-500 uppercase">Template</p>
                    <p className="text-xs text-zinc-200 mt-1">{TEMPLATE_CARDS.find(t => t.id === selectedTemplate)?.name || 'Custom'}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-950/50 p-3">
                    <p className="text-[10px] text-zinc-500 uppercase">Agents</p>
                    <p className="text-xs text-zinc-200 mt-1">{engineeredWorkflow?.roles?.length || 0} agents</p>
                  </div>
                  <div className="rounded-lg bg-zinc-950/50 p-3">
                    <p className="text-[10px] text-zinc-500 uppercase">Budget</p>
                    <p className="text-xs text-zinc-200 mt-1">{budgetTotal.toLocaleString()} tokens · ${totalBudget.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-rose-500/10 ring-1 ring-inset ring-rose-500/30 p-4">
                <div className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-rose-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-rose-200">Ready to Launch</p>
                    <p className="text-[11px] text-rose-300/70 mt-0.5">The AI will engineer the workflow, assign roles, and begin execution. You can monitor progress in real-time.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800/60">
          <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-300 text-xs font-medium hover:bg-zinc-700/60">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => canNext && setStep(s => s + 1)} disabled={!canNext} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 text-xs font-medium hover:bg-rose-500/25 disabled:opacity-40 disabled:cursor-not-allowed">
                Next <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <button onClick={() => onLaunch({ objective, templateId: selectedTemplate, repoPath, userBranch, projectId, budgetTokens: budgetTotal, agentAssignments })} className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-medium hover:bg-rose-600">
                <Play className="w-3 h-3" /> Launch Mission
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Agent Type System

### 6.1 Configuration Schema

```typescript
// src/types/conductor.ts

export interface AgentProviderConfig {
  id: string;
  name: string;
  provider: 'opencode' | 'claude' | 'gemini' | 'codex' | 'custom';
  apiKey?: string;
  endpoint?: string;
  model: string;
  maxTokens: number;
  rateLimitRpm: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  capabilities: ('file-access' | 'terminal-access' | 'git-access' | 'web-access' | 'mcp-access' | 'image-access')[];
  isDefault: boolean;
  description?: string;
}
```

### 6.2 Provider Configuration Panel

```tsx
// src/components/conductor/AgentProviderPanel.tsx

import { useState, useEffect } from 'react';
import { Bot, Key, Globe, Zap, Trash2, Plus, Check, AlertTriangle } from 'lucide-react';

const PROVIDER_OPTIONS = [
  { value: 'opencode', label: 'OpenCode', defaultModel: 'opencode-default', defaultEndpoint: 'internal' },
  { value: 'claude', label: 'Claude (Anthropic)', defaultModel: 'claude-3-5-sonnet-20241022', defaultEndpoint: 'https://api.anthropic.com' },
  { value: 'gemini', label: 'Gemini (Google)', defaultModel: 'gemini-1.5-pro', defaultEndpoint: 'https://generativelanguage.googleapis.com' },
  { value: 'codex', label: 'Codex (OpenAI)', defaultModel: 'codex-latest', defaultEndpoint: 'https://api.openai.com' },
  { value: 'custom', label: 'Custom API', defaultModel: 'custom', defaultEndpoint: '' },
];

export function AgentProviderPanel() {
  const [providers, setProviders] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => {
    window.deskflowAPI?.conductorListProviders?.().then((r: any) => {
      if (r?.success) setProviders(r.data || []);
    });
  }, []);

  const saveProvider = async (config: any) => {
    await window.deskflowAPI?.conductorRegisterProvider?.(config);
    const r = await window.deskflowAPI?.conductorListProviders?.();
    if (r?.success) setProviders(r.data || []);
    setEditing(null);
  };

  const deleteProvider = async (id: string) => {
    await window.deskflowAPI?.conductorDeleteProvider?.(id);
    setProviders(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="flex flex-col gap-3 p-3 min-h-0 overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">AI Providers</h3>
        <button onClick={() => setEditing({ id: `new-${Date.now()}`, isDefault: false, capabilities: ['file-access', 'terminal-access', 'git-access'] })} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 text-rose-300 text-[11px] font-medium hover:bg-rose-500/25">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {providers.map((p) => (
        <div key={p.id} className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bot className={`w-4 h-4 ${p.isDefault ? 'text-rose-400' : 'text-zinc-500'}`} />
              <span className="text-xs font-medium text-zinc-200">{p.name}</span>
              {p.isDefault && <span className="px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[9px] font-medium">Default</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setEditing(p)} className="p-1 rounded hover:bg-zinc-800 text-zinc-500"><Zap className="w-3 h-3" /></button>
              {!p.isDefault && <button onClick={() => deleteProvider(p.id)} className="p-1 rounded hover:bg-zinc-800 text-zinc-500"><Trash2 className="w-3 h-3" /></button>}
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            <span>{p.provider}</span>
            <span>{p.model}</span>
            <span>{p.maxTokens.toLocaleString()} tokens</span>
            <span>${p.costPer1kOutput}/1k out</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {p.capabilities.map((c: string) => (
              <span key={c} className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-[9px] text-zinc-400">{c}</span>
            ))}
          </div>
        </div>
      ))}

      {editing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[480px] rounded-2xl bg-zinc-950 ring-1 ring-inset ring-zinc-800/70 shadow-2xl p-5">
            <h3 className="text-sm font-semibold text-zinc-100 mb-4">{editing.id.startsWith('new-') ? 'Add Provider' : 'Edit Provider'}</h3>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Name</label>
                  <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Provider</label>
                  <select value={editing.provider || 'custom'} onChange={e => {
                    const opt = PROVIDER_OPTIONS.find(o => o.value === e.target.value);
                    setEditing({ ...editing, provider: e.target.value, model: opt?.defaultModel || '', endpoint: opt?.defaultEndpoint || '' });
                  }} className="w-full bg-zinc-900 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40">
                    {PROVIDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Model</label>
                <input value={editing.model || ''} onChange={e => setEditing({ ...editing, model: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase mb-1 block">API Key</label>
                  <div className="relative">
                    <input type="password" value={editing.apiKey || ''} onChange={e => setEditing({ ...editing, apiKey: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
                    <Key className="absolute right-2 top-1.5 w-3 h-3 text-zinc-600" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Endpoint</label>
                  <div className="relative">
                    <input value={editing.endpoint || ''} onChange={e => setEditing({ ...editing, endpoint: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
                    <Globe className="absolute right-2 top-1.5 w-3 h-3 text-zinc-600" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Max Tokens</label>
                  <input type="number" value={editing.maxTokens || 4000} onChange={e => setEditing({ ...editing, maxTokens: Number(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase mb-1 block">$/1k In</label>
                  <input type="number" step="0.001" value={editing.costPer1kInput || 0.003} onChange={e => setEditing({ ...editing, costPer1kInput: Number(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase mb-1 block">$/1k Out</label>
                  <input type="number" step="0.001" value={editing.costPer1kOutput || 0.015} onChange={e => setEditing({ ...editing, costPer1kOutput: Number(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Capabilities</label>
                <div className="flex flex-wrap gap-1">
                  {['file-access', 'terminal-access', 'git-access', 'web-access', 'mcp-access', 'image-access'].map(cap => (
                    <button
                      key={cap}
                      onClick={() => {
                        const caps = new Set(editing.capabilities || []);
                        caps.has(cap) ? caps.delete(cap) : caps.add(cap);
                        setEditing({ ...editing, capabilities: Array.from(caps) });
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                        (editing.capabilities || []).includes(cap)
                          ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
                          : 'bg-zinc-800/60 text-zinc-500 hover:bg-zinc-700/60'
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <input type="checkbox" checked={editing.isDefault} onChange={e => setEditing({ ...editing, isDefault: e.target.checked })} className="accent-rose-500" />
                <span className="text-[11px] text-zinc-400">Set as default provider</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-300 text-xs font-medium hover:bg-zinc-700/60">Cancel</button>
              <button onClick={() => saveProvider(editing)} className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-medium hover:bg-rose-600">Save Provider</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 7. Role Configuration

### 7.1 Role Editor

```tsx
// src/components/conductor/RoleEditor.tsx

import { useState } from 'react';
import { Shield, FileText, Terminal, GitBranch, Users, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const DEFAULT_ROLES = [
  { role: 'director', label: 'Director', color: '#8b5cf6', desc: 'Orchestrates the mission, assigns tasks, makes decisions' },
  { role: 'planner', label: 'Planner', color: '#3b82f6', desc: 'Analyzes requirements and creates implementation plans' },
  { role: 'worker', label: 'Worker', color: '#22d3ee', desc: 'Implements changes, writes code, executes tasks' },
  { role: 'qa', label: 'QA', color: '#14b8a6', desc: 'Verifies correctness, tests, ensures no regressions' },
  { role: 'auditor', label: 'Auditor', color: '#f59e0b', desc: 'Final review for completeness, security, quality' },
  { role: 'resolver', label: 'Resolver', color: '#f43f5e', desc: 'Fixes merge conflicts and integration issues' },
];

export function RoleEditor({ roles, onChange }: { roles: any[]; onChange: (roles: any[]) => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const updateRole = (index: number, updates: any) => {
    const next = [...roles];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const addRole = () => {
    onChange([...roles, {
      role: 'custom',
      customName: 'New Role',
      agentTypeId: 'default',
      canSpawnChildren: false,
      maxDepth: 0,
      maxChildren: 0,
      fileAccess: 'read',
      terminalAccess: false,
      gitAccess: true,
      autoAudit: false,
      promptTemplate: 'custom',
    }]);
  };

  return (
    <div className="flex flex-col gap-2 p-3 min-h-0 overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Role Configuration</h3>
        <button onClick={addRole} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 text-rose-300 text-[11px] font-medium hover:bg-rose-500/25">
          <Plus className="w-3 h-3" /> Custom Role
        </button>
      </div>

      {roles.map((role, i) => {
        const isOpen = expanded === `${role.role}-${i}`;
        const meta = DEFAULT_ROLES.find(r => r.role === role.role) || { label: role.customName || 'Custom', color: '#a855f7', desc: 'Custom role' };
        return (
          <div key={`${role.role}-${i}`} className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 overflow-hidden">
            <button onClick={() => setExpanded(isOpen ? null : `${role.role}-${i}`)} className="w-full flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                <span className="text-xs font-medium text-zinc-200">{meta.label}</span>
                <span className="text-[10px] text-zinc-500">{meta.desc}</span>
              </div>
              <div className="flex items-center gap-1">
                {role.role === 'custom' && (
                  <button onClick={(e) => { e.stopPropagation(); onChange(roles.filter((_, idx) => idx !== i)); }} className="p-1 rounded hover:bg-zinc-800 text-zinc-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
              </div>
            </button>
            {isOpen && (
              <div className="px-3 pb-3 border-t border-zinc-800/40 pt-2">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Agent Provider</label>
                    <select value={role.agentTypeId} onChange={e => updateRole(i, { agentTypeId: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40">
                      <option value="default">Default</option>
                      <option value="claude">Claude</option>
                      <option value="gemini">Gemini</option>
                      <option value="opencode">OpenCode</option>
                      <option value="codex">Codex</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase mb-1 block">File Access</label>
                    <select value={role.fileAccess} onChange={e => updateRole(i, { fileAccess: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40">
                      <option value="none">None</option>
                      <option value="read">Read Only</option>
                      <option value="write">Read + Write</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <input type="checkbox" checked={role.canSpawnChildren} onChange={e => updateRole(i, { canSpawnChildren: e.target.checked })} className="accent-rose-500" />
                    <Users className="w-3 h-3" /> Spawn Children
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <input type="checkbox" checked={role.terminalAccess} onChange={e => updateRole(i, { terminalAccess: e.target.checked })} className="accent-rose-500" />
                    <Terminal className="w-3 h-3" /> Terminal
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                    <input type="checkbox" checked={role.gitAccess} onChange={e => updateRole(i, { gitAccess: e.target.checked })} className="accent-rose-500" />
                    <GitBranch className="w-3 h-3" /> Git
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Max Depth</label>
                    <input type="number" value={role.maxDepth} onChange={e => updateRole(i, { maxDepth: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Max Children</label>
                    <input type="number" value={role.maxChildren} onChange={e => updateRole(i, { maxChildren: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## 8. Workflow Templates

### 8.1 Template Gallery

```tsx
// src/components/conductor/TemplateGallery.tsx

import { useState, useEffect } from 'react';
import { Search, Clock, Coins, Users, Plus, Copy, Check, Sparkles } from 'lucide-react';

export function TemplateGallery({ onSelect, onCreate }: { onSelect: (tpl: any) => void; onCreate: () => void }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    window.deskflowAPI?.conductorGetTemplates?.().then((r: any) => {
      if (r?.success) setTemplates(r.data || []);
    });
  }, []);

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3 p-3 min-h-0 overflow-y-auto">
      <div className="flex items-center gap-2 mb-1">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1.5 w-3.5 h-3.5 text-zinc-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-zinc-950/50 border border-zinc-800/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500/40"
          />
        </div>
        <button onClick={onCreate} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 text-[11px] font-medium hover:bg-rose-500/25">
          <Plus className="w-3 h-3" /> New
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {filtered.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => onSelect(tpl)}
            className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 text-left hover:bg-zinc-800/40 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-800/60 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-zinc-200">{tpl.name}</span>
                {tpl.is_builtin && <span className="px-1.5 py-0.5 rounded-full bg-zinc-700/50 text-[9px] text-zinc-400">Built-in</span>}
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-2 mb-1.5">{tpl.description}</p>
              <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {tpl.expectedDurationMin} min</span>
                <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> ${tpl.budgetEstimateCost}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {tpl.roles?.length || 0} roles</span>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(tpl); }}
              className="px-2.5 py-1 rounded-lg bg-zinc-800/60 text-zinc-300 text-[10px] font-medium hover:bg-zinc-700/60 shrink-0"
            >
              Use
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## 9. Visualization System

### 9.1 Enhanced OrgTreeGraph

The existing `OrgTreeGraph.tsx` is preserved but enhanced with:
- Real-time status pulsing
- Token usage badges
- Budget health indicators
- Message flow animations
- Click-to-focus on node details

### 9.2 File Boundary Map

```tsx
// src/components/conductor/FileBoundaryMap.tsx

import { useMemo } from 'react';
import { FileText, AlertTriangle, CheckCircle, Lock } from 'lucide-react';

export function FileBoundaryMap({ nodes }: { nodes: any[] }) {
  const fileMap = useMemo(() => {
    const map: Record<string, { owners: string[]; overlap: boolean }> = {};
    for (const node of nodes) {
      for (const boundary of node.boundaries || []) {
        if (!map[boundary]) map[boundary] = { owners: [], overlap: false };
        map[boundary].owners.push(node.id);
        if (map[boundary].owners.length > 1) map[boundary].overlap = true;
      }
    }
    return map;
  }, [nodes]);

  return (
    <div className="flex flex-col gap-2 p-3 min-h-0 overflow-y-auto">
      <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">File Boundaries</h3>
      {Object.entries(fileMap).map(([path, info]) => (
        <div key={path} className={`flex items-center gap-2 py-2 px-3 rounded-lg ${info.overlap ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : 'bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70'}`}>
          <FileText className={`w-3.5 h-3.5 shrink-0 ${info.overlap ? 'text-amber-400' : 'text-zinc-500'}`} />
          <span className="text-xs text-zinc-200 flex-1 truncate">{path}</span>
          {info.overlap && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
          <div className="flex items-center gap-1">
            {info.owners.map((ownerId, i) => (
              <div key={i} className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] text-zinc-300" title={ownerId}>
                {ownerId.slice(0, 2)}
              </div>
            ))}
          </div>
          {!info.overlap && <Lock className="w-3 h-3 text-emerald-400 shrink-0" />}
        </div>
      ))}
    </div>
  );
}
```

### 9.3 Decision Tree Flow

```tsx
// src/components/conductor/DecisionTreeFlow.tsx

import { ArrowRight, Crown, Cog, Hammer, FlaskConical, Search, GitMerge, CheckCircle, XCircle, Clock } from 'lucide-react';

const ROLE_ICONS: Record<string, any> = {
  director: Crown, planner: Cog, worker: Hammer, qa: FlaskConical, auditor: Search, resolver: GitMerge,
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-zinc-500', running: 'text-cyan-400', done: 'text-emerald-400', failed: 'text-red-400', blocked: 'text-amber-400',
};

export function DecisionTreeFlow({ nodes }: { nodes: any[] }) {
  const tree = useMemo(() => {
    const root = nodes.find(n => n.parentId === null);
    if (!root) return null;
    const buildTree = (parentId: string): any[] => {
      return nodes.filter(n => n.parentId === parentId).map(n => ({
        ...n,
        children: buildTree(n.id),
      }));
    };
    return { ...root, children: buildTree(root.id) };
  }, [nodes]);

  const renderNode = (node: any, depth = 0): React.ReactNode => {
    const Icon = ROLE_ICONS[node.role] || Cog;
    const color = STATUS_COLORS[node.status] || 'text-zinc-500';
    return (
      <div key={node.id} className="flex flex-col">
        <div className={`flex items-center gap-2 py-1.5 px-3 rounded-lg bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 ml-${depth * 4}`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-xs font-medium text-zinc-200">{node.roleConfig?.customName || node.role}</span>
          <span className={`text-[10px] ${color}`}>{node.status}</span>
          {node.status === 'running' && <Clock className="w-3 h-3 text-cyan-400 animate-pulse" />}
          {node.status === 'done' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
          {node.status === 'failed' && <XCircle className="w-3 h-3 text-red-400" />}
          <span className="text-[10px] text-zinc-500 ml-auto">{node.tokensUsed?.toLocaleString() || 0} tok</span>
        </div>
        {node.children?.length > 0 && (
          <div className="flex flex-col gap-1 ml-4 mt-1 border-l border-zinc-800/50 pl-2">
            {node.children.map((child: any) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!tree) return <p className="text-xs text-zinc-500 py-8 text-center">No decision tree available</p>;

  return (
    <div className="flex flex-col gap-2 p-3 min-h-0 overflow-y-auto">
      <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">Decision Flow</h3>
      {renderNode(tree)}
    </div>
  );
}
```

---

## 10. Budget & Token Tracking

### 10.1 Budget Dashboard

```tsx
// src/components/conductor/BudgetDashboard.tsx

import { useState, useEffect } from 'react';
import { Coins, AlertTriangle, TrendingUp, PieChart, BarChart3 } from 'lucide-react';

export function BudgetDashboard({ missionId }: { missionId: string }) {
  const [budget, setBudget] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    if (!missionId) return;
    window.deskflowAPI?.conductorGetBudget?.(missionId).then((r: any) => {
      if (r?.success) setBudget(r.data);
    });
    window.deskflowAPI?.conductorGetMetrics?.(missionId).then((r: any) => {
      if (r?.success) setMetrics(r.data || []);
    });
  }, [missionId]);

  if (!budget) return <p className="text-xs text-zinc-500 py-8 text-center">Loading budget...</p>;

  const tokenPct = (budget.usedTokens / budget.totalTokens) * 100;
  const costPct = (budget.usedCost / budget.totalCost) * 100;

  return (
    <div className="flex flex-col gap-3 p-3 min-h-0 overflow-y-auto">
      <div className="flex items-center gap-2 mb-1">
        <Coins className="w-4 h-4 text-amber-400" />
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Budget</h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-zinc-500 uppercase">Tokens</span>
            <span className={`text-[10px] font-medium ${tokenPct > 90 ? 'text-red-400' : tokenPct > 75 ? 'text-amber-400' : 'text-emerald-400'}`}>{tokenPct.toFixed(1)}%</span>
          </div>
          <p className="text-lg font-semibold text-zinc-100">{budget.usedTokens.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-500">of {budget.totalTokens.toLocaleString()}</p>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2">
            <div className={`h-full rounded-full transition-all ${tokenPct > 90 ? 'bg-red-500' : tokenPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(tokenPct, 100)}%` }} />
          </div>
        </div>

        <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-zinc-500 uppercase">Cost</span>
            <span className={`text-[10px] font-medium ${costPct > 90 ? 'text-red-400' : costPct > 75 ? 'text-amber-400' : 'text-emerald-400'}`}>{costPct.toFixed(1)}%</span>
          </div>
          <p className="text-lg font-semibold text-zinc-100">${budget.usedCost.toFixed(2)}</p>
          <p className="text-[10px] text-zinc-500">of ${budget.totalCost.toFixed(2)}</p>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2">
            <div className={`h-full rounded-full transition-all ${costPct > 90 ? 'bg-red-500' : costPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(costPct, 100)}%` }} />
          </div>
        </div>
      </div>

      {budget.alerts?.length > 0 && (
        <div className="rounded-xl bg-amber-500/10 ring-1 ring-inset ring-amber-500/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-200">Budget Alerts</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {budget.alerts.map((alert: any) => (
              <div key={alert.id} className="flex items-center gap-2 text-[11px] text-amber-300/80">
                <span className={`w-1.5 h-1.5 rounded-full ${alert.type === 'exceeded' ? 'bg-red-500' : alert.type === 'critical' ? 'bg-amber-500' : 'bg-yellow-500'}`} />
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-300">Per-Agent Breakdown</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {metrics.map((m) => (
            <div key={m.nodeId} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-zinc-950/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.role === 'director' ? '#8b5cf6' : m.role === 'worker' ? '#22d3ee' : '#71717a' }} />
                <span className="text-[11px] text-zinc-300">{m.role}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500">{m.tokensUsed.toLocaleString()} tok</span>
                <span className="text-[10px] text-zinc-500">${m.cost.toFixed(2)}</span>
                <span className="text-[10px] text-zinc-500">{m.successRate.toFixed(0)}% success</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 11. Workspace Integration

### 11.1 Sessions Tab Integration

In the Work > Sessions subtab, add a "Conductor Agents" section:

```tsx
// In Work > Sessions render
{activeSubTab === 'sessions' && (
  <div className="flex flex-col gap-3 p-3 min-h-0 overflow-y-auto">
    {/* User sessions */}
    <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Your Sessions</h3>
    {/* ... existing session list ... */}

    {/* Conductor agents */}
    <h3 className="text-xs font-semibold text-rose-300 uppercase tracking-wider mt-2">Conductor Agents</h3>
    {conductorSessions.length === 0 && (
      <p className="text-xs text-zinc-500 py-2">No active conductor agents</p>
    )}
    {conductorSessions.map((s: any) => (
      <div key={s.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-rose-500/5 ring-1 ring-inset ring-rose-500/20">
        <Bot className="w-3.5 h-3.5 text-rose-400" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-200">{s.role} · {s.agent_type}</p>
          <p className="text-[10px] text-zinc-500">{s.terminal_id}</p>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${s.status === 'active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-700/50 text-zinc-400'}`}>{s.status}</span>
      </div>
    ))}
  </div>
)}
```

### 11.2 Terminal Map Integration

In the Work > Map subtab, add conductor agent nodes:

```tsx
// In TerminalMapView, add conductor nodes
const allNodes = [
  ...Object.entries(terminalTabs).map(([id, info]) => ({ id, ...info, type: 'user' })),
  ...conductorSessions.map((s: any) => ({
    id: s.terminal_id,
    name: `${s.role} (${s.agent_type})`,
    agent: s.agent_type,
    type: 'conductor',
    role: s.role,
    status: s.status,
  })),
];
```

Render conductor nodes with role color:
```tsx
{node.type === 'conductor' && (
  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-zinc-950" title="Conductor Agent" />
)}
```

### 11.3 Files Tab Integration

In the Work > Files subtab, show agent ownership:

```tsx
// In file list items
{fileAgents[file.path]?.map((agent: any) => (
  <span key={agent.nodeId} className="px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 text-[9px] font-medium">
    {agent.role}
  </span>
))}
```

### 11.4 Performance Tab Integration

In the Performance tab, add conductor agent resource usage:

```tsx
// In PerformanceMetricsPanel
<div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3 mt-3">
  <div className="flex items-center gap-2 mb-2">
    <Bot className="w-3.5 h-3.5 text-rose-400" />
    <span className="text-xs font-medium text-zinc-300">Conductor Agents</span>
  </div>
  {conductorMetrics.map((m: any) => (
    <div key={m.nodeId} className="flex items-center justify-between py-1 px-2 rounded bg-zinc-950/50">
      <span className="text-[11px] text-zinc-300">{m.role}</span>
      <span className="text-[10px] text-zinc-500">{m.tokensUsed.toLocaleString()} tok · ${m.cost.toFixed(2)}</span>
    </div>
  ))}
</div>
```

---

## 12. Configuration Panel

### 12.1 Global Conductor Settings

```tsx
// src/components/conductor/ConductorConfigPanel.tsx

import { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Shield, Zap, GitMerge, Clock, AlertTriangle } from 'lucide-react';

export function ConductorConfigPanel() {
  const [config, setConfig] = useState({
    autoAuditInterval: 30,
    mergeStrategy: 'sequential',
    conflictResolution: 'auto-resolver',
    maxConcurrentAgents: 5,
    timeoutDefaultMin: 30,
    retryPolicy: 'exponential',
    notifyOnComplete: true,
    defaultBudgetTokens: 1000000,
    defaultBudgetCost: 50.0,
    defaultAutonomy: 3,
  });

  const saveConfig = async () => {
    await window.deskflowAPI?.conductorSaveConfig?.('conductor_defaults', 'global', config);
  };

  return (
    <div className="flex flex-col gap-3 p-3 min-h-0 overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Conductor Settings</h3>
        <button onClick={saveConfig} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 text-[11px] font-medium hover:bg-rose-500/25">
          <Save className="w-3 h-3" /> Save
        </button>
      </div>

      <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-4">
        <h4 className="text-xs font-medium text-zinc-300 mb-3 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Behavior
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Auto-Audit Interval</label>
            <div className="flex items-center gap-2">
              <input type="number" value={config.autoAuditInterval} onChange={e => setConfig({ ...config, autoAuditInterval: Number(e.target.value) })} className="w-20 bg-zinc-950 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
              <span className="text-[10px] text-zinc-500">seconds</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Max Concurrent Agents</label>
            <input type="number" value={config.maxConcurrentAgents} onChange={e => setConfig({ ...config, maxConcurrentAgents: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Merge Strategy</label>
            <select value={config.mergeStrategy} onChange={e => setConfig({ ...config, mergeStrategy: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40">
              <option value="sequential">Sequential</option>
              <option value="parallel">Parallel</option>
              <option value="smart">Smart (Auto)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Conflict Resolution</label>
            <select value={config.conflictResolution} onChange={e => setConfig({ ...config, conflictResolution: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40">
              <option value="manual">Manual</option>
              <option value="auto-resolver">Auto-Resolver</option>
              <option value="abort">Abort Mission</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-4">
        <h4 className="text-xs font-medium text-zinc-300 mb-3 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400" /> Defaults
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Default Budget (tokens)</label>
            <input type="number" value={config.defaultBudgetTokens} onChange={e => setConfig({ ...config, defaultBudgetTokens: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Default Budget ($)</label>
            <input type="number" step="0.5" value={config.defaultBudgetCost} onChange={e => setConfig({ ...config, defaultBudgetCost: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Default Autonomy</label>
            <input type="range" min={1} max={5} value={config.defaultAutonomy} onChange={e => setConfig({ ...config, defaultAutonomy: Number(e.target.value) })} className="w-full accent-rose-500" />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
              <span>Strict</span>
              <span>{config.defaultAutonomy}/5</span>
              <span>Full</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase mb-1 block">Timeout</label>
            <div className="flex items-center gap-2">
              <input type="number" value={config.timeoutDefaultMin} onChange={e => setConfig({ ...config, timeoutDefaultMin: Number(e.target.value) })} className="w-20 bg-zinc-950 border border-zinc-800/70 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/40" />
              <span className="text-[10px] text-zinc-500">min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 13. Frontend Changes

### 13.1 ConductorWorkspaceTab.tsx — Complete Rewrite

```tsx
// src/components/workspace/ConductorWorkspaceTab.tsx

import { useState, useEffect, useCallback } from 'react';
import { Bot, Play, Pause, Square, Activity, CheckCircle, XCircle, Clock, Sparkles, Shield, GitBranch, Coins, BarChart3, Settings, Plus } from 'lucide-react';
import { MissionWizard } from '../conductor/MissionWizard';
import { AgentProviderPanel } from '../conductor/AgentProviderPanel';
import { TemplateGallery } from '../conductor/TemplateGallery';
import { BudgetDashboard } from '../conductor/BudgetDashboard';
import { ConductorConfigPanel } from '../conductor/ConductorConfigPanel';
import { OrgTreeGraph } from '../conductor/OrgTreeGraph';

export function ConductorWorkspaceTab({ activeTab, projectId, repoPath, userBranch }: { activeTab: string; projectId: string; repoPath: string; userBranch: string }) {
  const [missions, setMissions] = useState<any[]>([]);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    refreshMissions();
    const unsub = window.deskflowAPI?.onConductorSnapshot?.((s: any) => setSnapshot(s));
    return () => { if (unsub) unsub(); };
  }, []);

  const refreshMissions = useCallback(async () => {
    const r = await window.deskflowAPI?.conductorListMissions?.();
    if (r?.success) setMissions(r.data || []);
  }, []);

  const handleLaunch = useCallback(async (config: any) => {
    await window.deskflowAPI?.conductorStart?.(config);
    setShowWizard(false);
    await refreshMissions();
  }, [refreshMissions]);

  if (activeTab === 'missions') {
    return (
      <div className="flex flex-col gap-3 p-3 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Active Missions</h3>
          <button onClick={() => setShowWizard(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 text-[11px] font-medium hover:bg-rose-500/25">
            <Plus className="w-3 h-3" /> New Mission
          </button>
        </div>

        {missions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Bot className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No active missions</p>
            <button onClick={() => setShowWizard(true)} className="mt-3 text-[11px] text-rose-400 hover:text-rose-300 underline">Create your first mission</button>
          </div>
        )}

        {missions.map((m) => (
          <div key={m.id} className={`rounded-xl bg-zinc-900/50 ring-1 ring-inset p-3 transition-all ${selectedMission?.id === m.id ? 'ring-rose-500/40' : 'ring-zinc-800/70'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${m.status === 'running' ? 'bg-emerald-500 animate-pulse' : m.status === 'blocked' ? 'bg-amber-500' : 'bg-zinc-500'}`} />
                <span className="text-xs font-medium text-zinc-200">{m.name}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                m.status === 'running' ? 'bg-emerald-500/15 text-emerald-300' :
                m.status === 'blocked' ? 'bg-amber-500/15 text-amber-300' :
                m.status === 'done' ? 'bg-zinc-700/50 text-zinc-400' :
                'bg-zinc-700/50 text-zinc-400'
              }`}>{m.status}</span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-2 line-clamp-2">{m.objective}</p>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full">
                <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${m.progress?.pct || 0}%` }} />
              </div>
              <span className="text-[10px] text-zinc-500">{Math.round(m.progress?.pct || 0)}%</span>
            </div>
            <div className="flex items-center gap-1">
              {m.status === 'running' && (
                <button onClick={() => window.deskflowAPI?.conductorPause?.(m.id)} className="p-1 rounded hover:bg-zinc-800 text-zinc-400"><Pause className="w-3 h-3" /></button>
              )}
              {m.status === 'blocked' && (
                <button onClick={() => window.deskflowAPI?.conductorResume?.(m.id)} className="p-1 rounded hover:bg-zinc-800 text-zinc-400"><Play className="w-3 h-3" /></button>
              )}
              <button onClick={() => window.deskflowAPI?.conductorKill?.(m.id)} className="p-1 rounded hover:bg-zinc-800 text-zinc-400"><Square className="w-3 h-3" /></button>
              <button onClick={() => setSelectedMission(m)} className="p-1 rounded hover:bg-zinc-800 text-zinc-400"><Activity className="w-3 h-3" /></button>
              {m.status === 'done' && (
                <button onClick={() => window.deskflowAPI?.conductorPromoteIntegration?.(m.id)} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-medium hover:bg-emerald-500/25 ml-auto">
                  <GitBranch className="w-3 h-3" /> Promote
                </button>
              )}
            </div>
            {selectedMission?.id === m.id && snapshot && (
              <div className="mt-3 pt-3 border-t border-zinc-800/40">
                <OrgTreeGraph nodes={snapshot.nodes || []} messages={snapshot.messages || []} />
              </div>
            )}
          </div>
        ))}

        {showWizard && (
          <MissionWizard
            projectId={projectId}
            repoPath={repoPath}
            userBranch={userBranch}
            onLaunch={handleLaunch}
            onClose={() => setShowWizard(false)}
          />
        )}
      </div>
    );
  }

  if (activeTab === 'approvals') {
    const escalations = snapshot?.escalations || [];
    return (
      <div className="flex flex-col gap-3 p-3 min-h-0 overflow-y-auto">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Pending Approvals</h3>
        {escalations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <CheckCircle className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No pending approvals</p>
          </div>
        )}
        {escalations.map((esc: any) => (
          <div key={esc.id} className="rounded-xl bg-zinc-900/50 ring-1 ring-inset ring-zinc-800/70 p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-zinc-200">{esc.reason}</span>
            </div>
            <p className="text-[11px] text-zinc-400 mb-2">{esc.detail}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => window.deskflowAPI?.conductorResolveEscalation?.(esc.id, 'approved', '')} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-medium hover:bg-emerald-500/25"><CheckCircle className="w-3 h-3" /> Approve</button>
              <button onClick={() => window.deskflowAPI?.conductorResolveEscalation?.(esc.id, 'rejected', '')} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 text-red-300 text-[10px] font-medium hover:bg-red-500/25"><XCircle className="w-3 h-3" /> Reject</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activeTab === 'trace') {
    const trace = snapshot?.messages || [];
    return (
      <div className="flex flex-col gap-2 p-3 min-h-0 overflow-y-auto">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Execution Trace</h3>
        {trace.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Activity className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No trace data</p>
          </div>
        )}
        {trace.map((t: any, i: number) => (
          <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded-lg bg-zinc-950/50">
            <Clock className="w-3 h-3 mt-0.5 shrink-0 text-zinc-600" />
            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                t.type === 'REPORT' ? 'bg-emerald-500/10 text-emerald-300' :
                t.type === 'ESCALATE' ? 'bg-amber-500/10 text-amber-300' :
                t.type === 'MERGE_CONFLICT' ? 'bg-red-500/10 text-red-300' :
                'bg-zinc-800/60 text-zinc-400'
              }`}>{t.type}</span>
              <span className="text-[11px] text-zinc-400 ml-1.5">{t.summary}</span>
            </div>
            <span className="text-[10px] text-zinc-600 shrink-0">{new Date(t.ts).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    );
  }

  if (activeTab === 'budget') {
    return <BudgetDashboard missionId={selectedMission?.id} />;
  }

  if (activeTab === 'providers') {
    return <AgentProviderPanel />;
  }

  if (activeTab === 'templates') {
    return <TemplateGallery onSelect={(tpl) => { setShowWizard(true); }} onCreate={() => {}} />;
  }

  if (activeTab === 'settings') {
    return <ConductorConfigPanel />;
  }

  return null;
}
```

### 13.2 Updated Workspace Sidebar Tabs

```tsx
// In TerminalPage.tsx — Conductor group tabs
{activeGroup === 'conductor' && (
  <WorkspaceShell accent="rose" tabs={[
    { key: 'missions', icon: Bot, label: 'Missions' },
    { key: 'approvals', icon: Shield, label: 'Approvals' },
    { key: 'trace', icon: Activity, label: 'Trace' },
    { key: 'budget', icon: Coins, label: 'Budget' },
    { key: 'providers', icon: Zap, label: 'Providers' },
    { key: 'templates', icon: Sparkles, label: 'Templates' },
    { key: 'settings', icon: Settings, label: 'Settings' },
  ]} storageKey="conductor" render={(key) => (
    <ConductorWorkspaceTab activeTab={key} projectId={propProjectId || selectedProject} repoPath={propProjectPath} userBranch="main" />
  )} />
)}
```

---

## 14. Build & Test

### 14.1 Database Migration

```bash
# Run this SQL to create all new tables
sqlite3 deskflow.db < conductor_schema.sql
```

### 14.2 Type Check

```bash
npm run type-check
# Fix any missing imports (lucide-react icons, uuid types)
```

### 14.3 Manual Test Matrix

| Feature | Test Steps | Expected Result |
|---------|-----------|-----------------|
| Mission Wizard | Click New Mission → fill objective → select template → generate workflow | AI generates role tree, file boundaries, agent assignments |
| Agent Providers | Open Settings > Providers → Add Claude → set API key | Provider saved, available in mission wizard |
| Role Config | Open Settings > Roles → modify Worker file access | Role config persists, affects new missions |
| Budget Tracking | Launch mission → watch token usage | Real-time token/cost tracking, alerts at 75%/90%/100% |
| File Boundaries | Open Budget > File Boundaries | Shows file ownership, overlap detection |
| Decision Tree | Open Trace > Decision Flow | Interactive tree of roles, statuses, token usage |
| Workspace Integration | Open Work > Sessions | Conductor agents shown with role badges |
| Recovery | Simulate stuck agent (wait 10 min) | Auto-retry, then escalation if max retries exceeded |
| Escalation | Create mission with low autonomy → agent escalates | Approval inbox shows escalation, approve resumes agent |
| Promotion | Complete mission → click Promote | Integration branch merged to user branch |

### 14.4 Files Modified / Created

| File | Action | Purpose |
|------|--------|---------|
| `src/services/conductor/ConductorService.ts` | Replace | Complete backend rewrite with all new logic |
| `src/main.ts` | Modify | Add 13 new IPC handlers |
| `src/preload.ts` | Modify | Add 13 new preload bridges |
| `src/components/conductor/MissionWizard.tsx` | Create | Multi-step mission creation wizard |
| `src/components/conductor/AgentProviderPanel.tsx` | Create | AI provider configuration UI |
| `src/components/conductor/TemplateGallery.tsx` | Create | Workflow template gallery |
| `src/components/conductor/BudgetDashboard.tsx` | Create | Budget tracking dashboard |
| `src/components/conductor/ConductorConfigPanel.tsx` | Create | Global conductor settings |
| `src/components/conductor/FileBoundaryMap.tsx` | Create | File ownership visualization |
| `src/components/conductor/DecisionTreeFlow.tsx` | Create | Decision tree flow visualization |
| `src/components/conductor/RoleEditor.tsx` | Create | Role configuration UI |
| `src/components/workspace/ConductorWorkspaceTab.tsx` | Replace | Complete rewrite with all tabs |
| `src/pages/TerminalPage.tsx` | Modify | Add Conductor group to sidebar |
| `src/types/conductor.ts` | Create | Type definitions |

---

*End of Conductor design document. Complete autonomous multi-agent orchestration system specified.*
