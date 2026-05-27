export interface SkillSidebarEntry {
  label: string;
  icon: string;
  route: string;
  order: number;
  badge?: string;
}

export interface SkillWorkspaceConfig {
  componentKey: string;
  minWidth?: number;
}

export interface SkillPluginDescriptor {
  id: string;
  name: string;
  category: SkillCategory;
  version?: string;
  description?: string;
  sidebarEntry?: SkillSidebarEntry;
  workspace?: SkillWorkspaceConfig;
  skillPath?: string;
}

export interface SkillPlugin extends SkillPluginDescriptor {
  composeContext: () => Promise<string>;
}

export interface SkillWorkspaceProps {
  skill: SkillPluginDescriptor;
  projectPath?: string;
  projectId?: string;
  onCompose: (context: string) => void;
  onError: (error: Error) => void;
}

export interface ComposeSource {
  id: string;
  label: string;
  type: 'workspace' | 'problems' | 'requests' | 'checklists' | 'skills' | 'custom';
  enabled: boolean;
  contextSnippet?: string;
}

export type WorkspaceRegistryListener = () => void;

export type SkillCategory =
  | 'design'
  | 'debug'
  | 'research'
  | 'writing'
  | 'testing'
  | 'automation'
  | 'custom';

export const CATEGORY_ICONS: Record<SkillCategory, string> = {
  design: 'palette',
  debug: 'bug',
  research: 'search',
  writing: 'pen-tool',
  testing: 'test-tubes',
  automation: 'zap',
  custom: 'puzzle',
};

export const BUILTIN_PLUGIN_IDS = {
  DESIGN_WORKSPACE: 'design-workspace',
} as const;

export type BuiltinPluginId = (typeof BUILTIN_PLUGIN_IDS)[keyof typeof BUILTIN_PLUGIN_IDS];

export interface GetWorkspaceSkillsRequest {
  projectPath?: string;
}

export interface GetWorkspaceSkillsResponse {
  success: boolean;
  data?: SkillPluginDescriptor[];
  error?: string;
}
