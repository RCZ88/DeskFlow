import type {
  SkillPlugin,
  SkillPluginDescriptor,
  SkillSidebarEntry,
  SkillCategory,
  WorkspaceRegistryListener,
} from '../types/SkillPlugin';

const BUILT_IN_DESCRIPTORS: SkillPluginDescriptor[] = [
  {
    id: 'design-workspace',
    name: 'Design Workspace',
    category: 'design',
    version: '1.0.0',
    description:
      'Frontend design workspace with taste knobs, style references, and compose outlet',
    sidebarEntry: {
      label: 'Design',
      icon: 'palette',
      route: '/workspace/design',
      order: 50,
    },
    workspace: {
      componentKey: 'DesignWorkspace',
      minWidth: 800,
    },
  },
];

const KNOWN_DESIGN_SKILL_IDS: string[] = [
  'frontend-design',
  'impeccable',
  'ui-ux-pro-max',
  'taste-skill',
  'design-taste',
];

class WorkspaceRegistryService {
  private plugins: Map<string, SkillPlugin> = new Map();

  private composeContextFns: Map<string, () => Promise<string>> = new Map();

  private listeners: Set<WorkspaceRegistryListener> = new Set();

  private initialized = false;

  private projectPath: string | undefined;

  async initialize(projectPath?: string): Promise<void> {
    this.projectPath = projectPath;

    for (const descriptor of BUILT_IN_DESCRIPTORS) {
      if (!this.plugins.has(descriptor.id)) {
        this.addPlugin(descriptor);
      }
    }

    try {
      const discovered = await this.discoverFromIPC(projectPath);
      for (const descriptor of discovered) {
        if (!this.plugins.has(descriptor.id)) {
          this.addPlugin(descriptor);
        }
      }
    } catch (error) {
      console.warn('[WorkspaceRegistry] IPC discovery failed (non-fatal):', error);
    }

    this.initialized = true;
    this.notify();
  }

  async refresh(): Promise<void> {
    this.initialized = false;
    await this.initialize(this.projectPath);
  }

  register(descriptor: SkillPluginDescriptor): void {
    this.addPlugin(descriptor);
    this.notify();
  }

  unregister(id: string): void {
    this.plugins.delete(id);
    this.composeContextFns.delete(id);
    this.notify();
  }

  getPlugin(id: string): SkillPlugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): SkillPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPluginsByCategory(category: SkillCategory): SkillPlugin[] {
    return this.getAllPlugins().filter((p) => p.category === category);
  }

  getSidebarEntries(): SkillSidebarEntry[] {
    return this.getAllPlugins()
      .filter((p) => p.sidebarEntry)
      .map((p) => p.sidebarEntry!)
      .sort((a, b) => a.order - b.order);
  }

  hasPlugin(id: string): boolean {
    return this.plugins.has(id);
  }

  get size(): number {
    return this.plugins.size;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  registerComposeContext(pluginId: string, fn: () => Promise<string>): void {
    this.composeContextFns.set(pluginId, fn);
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.composeContext = fn;
    }
  }

  unregisterComposeContext(pluginId: string): void {
    this.composeContextFns.delete(pluginId);
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.composeContext = this.defaultComposeContext(plugin.name);
    }
  }

  getComposeContext(pluginId: string): (() => Promise<string>) | undefined {
    return this.composeContextFns.get(pluginId);
  }

  async collectAllContext(): Promise<string> {
    const snippets: string[] = [];
    for (const plugin of this.getAllPlugins()) {
      try {
        const context = await plugin.composeContext();
        if (context && context.trim()) {
          snippets.push(context);
        }
      } catch (error) {
        console.warn(`[WorkspaceRegistry] composeContext failed for ${plugin.id}:`, error);
      }
    }
    return snippets.join('\n\n');
  }

  subscribe(listener: WorkspaceRegistryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private addPlugin(descriptor: SkillPluginDescriptor): void {
    const existingFn = this.composeContextFns.get(descriptor.id);
    const plugin: SkillPlugin = {
      ...descriptor,
      composeContext: existingFn ?? this.defaultComposeContext(descriptor.name),
    };
    this.plugins.set(descriptor.id, plugin);
  }

  private defaultComposeContext(name: string): () => Promise<string> {
    return async () => `[${name}] Workspace context not yet configured`;
  }

  private async discoverFromIPC(projectPath?: string): Promise<SkillPluginDescriptor[]> {
    try {
      const api = (window as any).deskflowAPI;
      if (api?.getWorkspaceSkills) {
        const result = await api.getWorkspaceSkills(projectPath);
        if (result?.success && Array.isArray(result.data)) {
          return result.data as SkillPluginDescriptor[];
        }
      }
    } catch {
    }

    try {
      const api = (window as any).deskflowAPI;
      if (api?.getSkills) {
        const result = await api.getSkills();
        if (result?.success && Array.isArray(result.data)) {
          return this.filterWorkspaceSkills(result.data);
        }
      }
    } catch {
    }

    return [];
  }

  private filterWorkspaceSkills(skills: any[]): SkillPluginDescriptor[] {
    return skills
      .filter((skill) => {
        if (skill.sidebarEntry || skill.workspace) return true;
        if (KNOWN_DESIGN_SKILL_IDS.includes(skill.id)) return true;
        if (skill.category === 'design') return true;
        return false;
      })
      .map((skill) => this.skillToDescriptor(skill));
  }

  private skillToDescriptor(skill: any): SkillPluginDescriptor {
    const isKnownDesign = KNOWN_DESIGN_SKILL_IDS.includes(skill.id);
    const category: SkillCategory = skill.category || (isKnownDesign ? 'design' : 'custom');

    const descriptor: SkillPluginDescriptor = {
      id: skill.id,
      name: skill.name || skill.id,
      category,
      version: skill.version,
      description: skill.description,
      skillPath: skill.path || skill.skillPath,
    };

    if (isKnownDesign && !skill.sidebarEntry) {
      descriptor.workspace = {
        componentKey: 'DesignWorkspace',
      };
    }

    if (skill.sidebarEntry) {
      descriptor.sidebarEntry = skill.sidebarEntry;
    }
    if (skill.workspace) {
      descriptor.workspace = skill.workspace;
    }

    return descriptor;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.error('[WorkspaceRegistry] Listener error:', error);
      }
    }
  }
}

export const WorkspaceRegistry = new WorkspaceRegistryService();

export default WorkspaceRegistry;
