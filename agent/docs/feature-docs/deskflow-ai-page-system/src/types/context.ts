/**
 * Context Maintenance System — Type Definitions
 * 
 * Defines all types for RAG index, project context, compactions, and related operations.
 * Location: src/types/context.ts
 */

// ──────────────────────────────────────────────────────────────
// Context Metadata Types
// ──────────────────────────────────────────────────────────────

export type ContextType = 'llm-wiki' | 'graphify' | 'skill' | 'qmd' | 'other';
export type ContextCategory = 'design' | 'architecture' | 'wiki' | 'skill' | 'research' | 'other';

export interface ContextMetadata {
  id: string;
  projectId: string;
  name: string;
  category: ContextCategory;
  type: ContextType;
  source: string; // Path to source file
  tokens: number;
  description?: string;
  enabled: boolean;
  lastUpdated: Date;
  createdAt: Date;
}

export interface ProjectContextManifest {
  id: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  
  // Active contexts in this project
  contexts: ContextMetadata[];
  
  // RAG index metadata
  ragIndex: {
    totalMessages: number;
    indexedMessages: number;
    indexFile: string;
    lastCompacted: Date;
    messagesSinceCompaction: number;
  };
  
  // Compaction history
  compactions: CompactionRecord[];
  
  // Per-session context tracking
  sessionContexts: SessionContextEntry[];
}

export interface SessionContextEntry {
  sessionId: string;
  createdAt: Date;
  contextIds: string[];
  tokenBudget: number;
  tokensUsed: number;
}

// ──────────────────────────────────────────────────────────────
// RAG Message Types
// ──────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageMetadata {
  category?: string; // bug-fix, feature, research, review, etc.
  productArea?: string;
  problemId?: string;
  requestId?: string;
  sessionStatus?: string;
  agentName?: string;
  tags?: string[];
}

export interface RAGMessage {
  id: string;
  sessionId: string;
  timestamp: Date;
  role: MessageRole;
  content: string;
  tokens: number;
  
  // Metadata for filtering and context
  metadata?: MessageMetadata;
  
  // Vector embedding for semantic search
  embedding?: Float32Array | null;
  
  // Audit
  createdAt: Date;
}

export interface RAGSearchResult {
  message: RAGMessage;
  score: number; // Relevance score (0-1)
  type: 'semantic' | 'fulltext';
  matchedText?: string;
}

// ──────────────────────────────────────────────────────────────
// Compaction Types
// ──────────────────────────────────────────────────────────────

export interface CompactionRecord {
  id: string;
  compactDate: Date;
  periodStart: Date;
  periodEnd: Date;
  
  // Input
  inputMessageCount: number;
  inputTokens: number;
  
  // Output
  outputSummaryTokens: number;
  removedMessageIds: string[];
  compressionRatio: number; // inputTokens / outputSummaryTokens
  
  // Summary content
  summaryFile: string; // Path to markdown summary
  keyDecisions?: string[];
  patterns?: string[];
  antiPatterns?: string[];
  
  createdAt: Date;
}

export interface CompactionSummary {
  period: string; // "May 2026" or "2026-05-01 to 2026-05-31"
  inputMessages: number;
  outputTokens: number;
  compressionRatio: number;
  keyDecisions: string[];
  patterns: string[];
  antiPatterns: string[];
  relatedProblems?: string[];
  relatedRequests?: string[];
}

// ──────────────────────────────────────────────────────────────
// Context Assembly Types
// ──────────────────────────────────────────────────────────────

export interface ContextAssemblyConfig {
  projectId: string;
  sessionId: string;
  maxTokens: number; // Total token budget for context
  includeRAGResults: boolean;
  ragSearchLimit: number; // Max number of RAG results to include
  compactionThreshold: number; // Messages before auto-compaction
}

export interface AssembledContext {
  projectContextTokens: number;
  sessionContextTokens: number;
  ragResultsTokens: number;
  totalTokens: number;
  
  // Actual context blocks
  projectContext: string; // Markdown
  sessionContext: string; // Markdown
  ragResults: RAGSearchResult[];
  
  // Metadata
  assembledAt: Date;
  contextIds: string[];
}

// ──────────────────────────────────────────────────────────────
// UI Component Props
// ──────────────────────────────────────────────────────────────

export interface ContextMaintenanceTabProps {
  projectId: string;
  projectPath: string;
  sessionId?: string;
}

export interface MemoryStatusCardProps {
  projectContextUsage: { tokens: number; max: number };
  sessionContextUsage: { tokens: number; max: number };
  ragIndexStats: {
    totalMessages: number;
    lastUpdated: Date;
  };
}

export interface ActiveContextsListProps {
  contexts: ContextMetadata[];
  onToggle: (contextId: string, enabled: boolean) => Promise<void>;
  onEdit: (contextId: string) => void;
  onRefresh: (contextId: string) => Promise<void>;
}

export interface RecentChatHistoryProps {
  messages: RAGMessage[];
  limit: number;
  onSelectMessage: (messageId: string) => void;
  onDelete: (messageId: string) => Promise<void>;
}

export interface CompactionsPanelProps {
  compactions: CompactionRecord[];
  onExpandSummary: (compactionId: string) => void;
  onDownload: (compactionId: string) => void;
}

export interface ContextSearchBarProps {
  onSemanticSearch: (query: string) => Promise<RAGSearchResult[]>;
  onFullTextSearch: (query: string) => Promise<RAGSearchResult[]>;
  onSelectResult: (result: RAGSearchResult) => void;
}

export interface SettingsPanelProps {
  config: ContextMaintenanceConfig;
  onSave: (newConfig: ContextMaintenanceConfig) => Promise<void>;
}

export interface ContextMaintenanceConfig {
  autoCompactionEnabled: boolean;
  includeRAGInPrompt: boolean;
  compactionTrigger: {
    messageCount: number;
    interval: 'daily' | 'weekly' | 'monthly';
  };
  ragSearchMode: ('semantic' | 'fulltext')[];
  tokenBudgets: {
    projectContext: number;
    sessionContext: number;
  };
}

// ──────────────────────────────────────────────────────────────
// Database Query Results
// ──────────────────────────────────────────────────────────────

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sessionId?: string;
  category?: string;
  since?: Date;
  until?: Date;
}

export interface PaginatedResults<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ──────────────────────────────────────────────────────────────
// Service Response Types
// ──────────────────────────────────────────────────────────────

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface CompactionResult {
  success: boolean;
  compactionId: string;
  inputMessages: number;
  outputTokens: number;
  compressionRatio: number;
  error?: string;
}

export interface ContextAssemblyResult {
  success: boolean;
  assembledContext: AssembledContext;
  warnings?: string[];
  error?: string;
}
