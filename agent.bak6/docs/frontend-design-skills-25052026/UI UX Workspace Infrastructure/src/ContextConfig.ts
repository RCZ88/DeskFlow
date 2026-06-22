export interface ContextConfig {
  total_token_budget: number;
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
      skills: string[];        // which design skills to include
      levels: {
        design_variance: number;   // 1-10
        motion_intensity: number;  // 1-10
        visual_density: number;    // 1-10
      };
      include_references: boolean; // include DESIGN.md files?
    };
  };
  summarization: { enabled: boolean; message_threshold: number; max_recent_messages: number; summary_style: 'brief' | 'detailed' };
  deep_memory: { enabled: boolean; pattern_detection: boolean; max_patterns: number; retention_days: number };
}

export const DEFAULT_CONTEXT_CONFIG: ContextConfig = {
  total_token_budget: 7000,
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
  deep_memory: { enabled: true, pattern_detection: true, max_patterns: 20, retention_days: 90 },
};
