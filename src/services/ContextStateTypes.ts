/**
 * Workspace State Machine — tracks implementation progress
 * NOT RAG. NOT semantic search. Structured state tracking.
 */
export interface WorkspaceState {
  version: string;
  lastUpdated: string;
  modules: Record<string, ModuleState>;
  decisions: Decision[];
  sessions: SessionSnapshot[];
}

export interface ModuleState {
  status: 'not_started' | 'in_progress' | 'done' | 'blocked';
  components: Record<string, ComponentState>;
  dependencies: string[];
}

export interface ComponentState {
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  lines?: string;
  tested?: boolean;
  blocker?: string;
  depends_on?: string[];
}

export interface Decision {
  id: string;
  topic: string;
  choice: string;
  rationale: string;
  date: string;
  alternatives_considered?: string[];
  superseded_by?: string;
}

export interface SessionSnapshot {
  id: string;
  timestamp: string;
  summary: string;
  filesModified: string[];
  decisionsMade: string[];
  nextSteps: string[];
}

/**
 * AST Symbol Index — for precise code navigation
 * Populated by Tree-sitter parsing, NOT by text search
 */
export interface SymbolIndex {
  version: string;
  lastIndexed: string;
  symbols: SymbolEntry[];
  callGraph: CallEdge[];
}

export interface SymbolEntry {
  id: string;
  name: string;
  kind: 'function' | 'class' | 'method' | 'variable' | 'interface' | 'type';
  file: string;
  lineStart: number;
  lineEnd: number;
  signature?: string;
  language: string;
  parent?: string;
  children?: string[];
}

export interface CallEdge {
  caller: string;
  callee: string;
  file: string;
  line: number;
  type: 'direct' | 'indirect' | 'dynamic';
}

export interface ModuleTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: Record<string, ModuleTreeNode>;
  symbols?: SymbolEntry[];
}

export interface CallGraphNode {
  symbol: SymbolEntry;
  callers: CallGraphNode[];
  callees: CallGraphNode[];
}
