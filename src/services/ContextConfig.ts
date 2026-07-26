export type ModelTier = 'top' | 'mid' | 'low';

export interface ContextConfig {
  total_token_budget: number;
  model_tier: ModelTier;
  systems: {
    llm_wiki: { enabled: boolean; files: string[]; max_tokens: number };
    obsidian_skills: { enabled: boolean; skills: string[]; max_tokens: number };
    graphify: { enabled: boolean; include_graph: boolean; include_summary: boolean; max_tokens: number };
    para: { enabled: boolean; areas: string[]; max_tokens: number };
    qmd: { enabled: boolean; templates: string[]; max_tokens: number };
    automations: { enabled: boolean; max_tokens: number };
    design_skills: {
      enabled: boolean;
      max_tokens: number;
      skills: string[];
      levels: {
        design_variance: number;
        motion_intensity: number;
        visual_density: number;
      };
      include_references: boolean;
    };
  };
  summarization: { enabled: boolean; message_threshold: number; max_recent_messages: number; summary_style: 'brief' | 'detailed' };
  deep_memory: {
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
  };
}

export const TIER_PROFILES: Record<ModelTier, Partial<ContextConfig>> = {
  top: {
    total_token_budget: 10000,
    systems: {
      llm_wiki: { enabled: true, files: [], max_tokens: 3000 },
      obsidian_skills: { enabled: true, skills: [], max_tokens: 800 },
      graphify: { enabled: true, include_graph: false, include_summary: true, max_tokens: 800 },
      para: { enabled: true, areas: [], max_tokens: 500 },
      qmd: { enabled: true, templates: [], max_tokens: 300 },
      automations: { enabled: true, max_tokens: 200 },
      design_skills: { enabled: true, max_tokens: 1000, skills: ['frontend-design', 'impeccable', 'ui-ux-pro-max', 'taste-skill'], levels: { design_variance: 5, motion_intensity: 5, visual_density: 7 }, include_references: true },
    },
    summarization: { enabled: true, message_threshold: 15, max_recent_messages: 8, summary_style: 'detailed' },
    deep_memory: {
      enabled: true, pattern_detection: true, max_patterns: 20, retention_days: 120,
      hot: { max_entries: 20, max_tokens: 2000, min_importance: 0.7 },
      warm: { max_entries: 60, max_tokens: 3000, min_importance: 0.4 },
      cold: { auto_archive_after_days: 180 },
      scoring: { base_correction: 0.7, base_invariant: 0.85, base_pattern: 0.6, user_repeat_bonus: 0.1, access_bonus: 0.02, decay_daily: 0.01, stale_threshold: 0.3 },
    },
  },
  mid: {
    total_token_budget: 7000,
    systems: {
      llm_wiki: { enabled: true, files: [], max_tokens: 2000 },
      obsidian_skills: { enabled: true, skills: [], max_tokens: 500 },
      graphify: { enabled: true, include_graph: false, include_summary: true, max_tokens: 500 },
      para: { enabled: false, areas: [], max_tokens: 300 },
      qmd: { enabled: true, templates: [], max_tokens: 200 },
      automations: { enabled: false, max_tokens: 100 },
      design_skills: { enabled: true, max_tokens: 800, skills: ['frontend-design', 'impeccable', 'ui-ux-pro-max', 'taste-skill'], levels: { design_variance: 5, motion_intensity: 5, visual_density: 7 }, include_references: true },
    },
    summarization: { enabled: true, message_threshold: 10, max_recent_messages: 5, summary_style: 'brief' },
    deep_memory: {
      enabled: true, pattern_detection: true, max_patterns: 15, retention_days: 90,
      hot: { max_entries: 15, max_tokens: 1200, min_importance: 0.7 },
      warm: { max_entries: 40, max_tokens: 2000, min_importance: 0.4 },
      cold: { auto_archive_after_days: 120 },
      scoring: { base_correction: 0.7, base_invariant: 0.85, base_pattern: 0.6, user_repeat_bonus: 0.1, access_bonus: 0.02, decay_daily: 0.01, stale_threshold: 0.3 },
    },
  },
  low: {
    total_token_budget: 4000,
    systems: {
      llm_wiki: { enabled: true, files: [], max_tokens: 1000 },
      obsidian_skills: { enabled: true, skills: [], max_tokens: 300 },
      graphify: { enabled: false, include_graph: false, include_summary: false, max_tokens: 0 },
      para: { enabled: false, areas: [], max_tokens: 0 },
      qmd: { enabled: false, templates: [], max_tokens: 0 },
      automations: { enabled: false, max_tokens: 0 },
      design_skills: { enabled: false, max_tokens: 0, skills: [], levels: { design_variance: 5, motion_intensity: 5, visual_density: 7 }, include_references: false },
    },
    summarization: { enabled: true, message_threshold: 8, max_recent_messages: 3, summary_style: 'brief' },
    deep_memory: {
      enabled: true, pattern_detection: false, max_patterns: 10, retention_days: 30,
      hot: { max_entries: 10, max_tokens: 800, min_importance: 0.7 },
      warm: { max_entries: 30, max_tokens: 1500, min_importance: 0.4 },
      cold: { auto_archive_after_days: 90 },
      scoring: { base_correction: 0.7, base_invariant: 0.85, base_pattern: 0.6, user_repeat_bonus: 0.1, access_bonus: 0.02, decay_daily: 0.01, stale_threshold: 0.3 },
    },
  },
};

export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  total_token_budget: 7000,
  model_tier: 'mid',
  systems: {
    llm_wiki: { enabled: true, files: [], max_tokens: 2000 },
    obsidian_skills: { enabled: true, skills: [], max_tokens: 500 },
    graphify: { enabled: true, include_graph: false, include_summary: true, max_tokens: 500 },
    para: { enabled: false, areas: [], max_tokens: 300 },
    qmd: { enabled: true, templates: [], max_tokens: 200 },
    automations: { enabled: false, max_tokens: 100 },
    design_skills: {
      enabled: true,
      max_tokens: 800,
      skills: ['frontend-design', 'impeccable', 'ui-ux-pro-max', 'taste-skill'],
      levels: {
        design_variance: 5,
        motion_intensity: 5,
        visual_density: 7,
      },
      include_references: true,
    },
  },
  summarization: { enabled: true, message_threshold: 10, max_recent_messages: 5, summary_style: 'brief' },
  deep_memory: {
    enabled: true, pattern_detection: true, max_patterns: 15, retention_days: 90,
    hot: { max_entries: 15, max_tokens: 1200, min_importance: 0.7 },
    warm: { max_entries: 40, max_tokens: 2000, min_importance: 0.4 },
    cold: { auto_archive_after_days: 120 },
    scoring: { base_correction: 0.7, base_invariant: 0.85, base_pattern: 0.6, user_repeat_bonus: 0.1, access_bonus: 0.02, decay_daily: 0.01, stale_threshold: 0.3 },
  },
};