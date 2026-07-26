export type MemoryTier = 'hot' | 'warm' | 'cold';
export type MemoryCategory =
  | 'correction'
  | 'invariant'
  | 'root_cause'
  | 'pattern'
  | 'preference'
  | 'decision'
  | 'workflow'
  | 'error_recovery';

export interface MemoryEntry {
  id: string;
  content: string;
  category: MemoryCategory;
  tier: MemoryTier;
  importance: number;
  accessCount: number;
  lastAccessedAt: number;
  createdAt: number;
  correctedAt: number[];
  dedupKey: string;
  source: {
    type: 'user_correction' | 'agent_self_reflect' | 'reflection_log' | 'common_errors' | 'manual';
    sessionId?: string;
    cycleNumber?: number;
    originalMessage?: string;
  };
  decayRate: number;
  staleAfterDays: number;
}

export interface MemoryStore {
  version: number;
  hot: MemoryEntry[];
  warm: MemoryEntry[];
  cold: MemoryEntry[];
  stats: {
    totalCaptured: number;
    totalDeduped: number;
    lastCompactionAt: number;
    lastDecayRunAt: number;
  };
}

export interface DeepMemoryConfig {
  enabled: boolean;
  pattern_detection: boolean;
  max_patterns: number;
  retention_days: number;
  hot: { max_entries: number; max_tokens: number; min_importance: number };
  warm: { max_entries: number; max_tokens: number; min_importance: number };
  cold: { auto_archive_after_days: number };
  scoring: {
    base_correction: number;
    base_invariant: number;
    base_pattern: number;
    user_repeat_bonus: number;
    access_bonus: number;
    decay_daily: number;
    stale_threshold: number;
  };
}

export interface CompactionResult {
  promoted: number;
  demoted: number;
  archived: number;
}

export interface CaptureResult {
  captured: boolean;
  memory?: MemoryEntry;
  action: 'new' | 'updated' | 'deduped' | 'ignored';
}
