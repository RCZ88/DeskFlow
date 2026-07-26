import { ContextConfig } from './ContextConfig';

// Token estimation helper
function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

// File reading helper (browser-safe via preload API)
async function readFile(projectPath: string, relativePath: string): Promise<string> {
  try {
    const result = await (window as any).deskflowAPI?.readProjectFile?.(relativePath, projectPath);
    if (result?.success && result.data) return result.data as string;
  } catch {}
  return '';
}

// Directory listing helper
async function listDir(projectPath: string, relativePath: string): Promise<string[]> {
  try {
    const result = await (window as any).deskflowAPI?.listDirectory?.(projectPath, relativePath);
    if (result?.success && result.data) return result.data as string[];
  } catch {}
  return [];
}

// Parse skill frontmatter for name/description/category
function parseSkillFrontmatter(content: string): { name: string; description: string; category: string } {
  const nameMatch = content.match(/^#\s+(.+?)\n/m) || content.match(/^name:\s*(.+?)$/m);
  const descMatch = content.match(/description:\s*(.+?)$/m) || content.match(/##?\s*Description\s*\n(.+?)(?=\n##|\n---|$)/s);
  const catMatch = content.match(/category:\s*(.+?)$/m);
  return {
    name: nameMatch?.[1]?.trim() || 'Unknown Skill',
    description: descMatch?.[1]?.trim() || descMatch?.[0]?.trim() || 'No description',
    category: catMatch?.[1]?.trim() || 'general',
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN ENTRY: assembleContext
// ─────────────────────────────────────────────────────────────

export async function assembleContext(
  projectPath: string,
  config: ContextConfig,
  sessionId?: string
): Promise<string> {
  const budget = config.total_token_budget || 7000;
  let prompt = '';
  let usedTokens = 0;

  const add = async (content: string) => {
    const tokens = estimateTokens(content);
    if (usedTokens + tokens <= budget) {
      prompt += content;
      usedTokens += tokens;
    }
  };

  if (config.systems.llm_wiki.enabled) {
    await add(await buildLLMWikiContext(projectPath, config));
  }
  if (config.systems.obsidian_skills.enabled) {
    await add(await buildSkillIndex(projectPath, config));
  }
  if (config.systems.graphify.enabled) {
    await add(await buildGraphifyContext(projectPath, config));
  }
  if (config.systems.para.enabled) {
    await add(await buildPARAContext(projectPath, config));
  }
  if (config.systems.qmd.enabled) {
    await add(await buildQMDContext(projectPath, config));
  }
  if (config.systems.automations.enabled) {
    await add(await buildAutomationsContext(projectPath, config));
  }
  // ─── NEW: Design Skills ───
  if (config.systems.design_skills?.enabled) {
    await add(await buildDesignSkillsContext(projectPath, config));
  }
  if (config.deep_memory.enabled) {
    await add(await buildDeepMemoryContext(projectPath, config));
  }

  return prompt;
}

// ─────────────────────────────────────────────────────────────
// DESIGN SKILLS CONTEXT BUILDER (NEW)
// ─────────────────────────────────────────────────────────────

async function buildDesignSkillsContext(
  projectPath: string,
  config: ContextConfig
): Promise<string> {
  const ds = config.systems.design_skills;
  if (!ds?.enabled) return '';

  const maxTokens = ds.max_tokens || 800;
  const enabledSkills = ds.skills || [];
  const levels = ds.levels || { design_variance: 5, motion_intensity: 5, visual_density: 7 };
  const includeRefs = ds.include_references ?? true;

  let content = '## Design Skills System\n';
  content += `DESIGN_VARIANCE: ${levels.design_variance} (1=Conservative, 10=Experimental)\n`;
  content += `MOTION_INTENSITY: ${levels.motion_intensity} (1=Static, 10=Cinematic)\n`;
  content += `VISUAL_DENSITY: ${levels.visual_density} (1=Airy, 10=Maximal)\n\n`;

  // Load each enabled design skill
  const designSkillDirs = ['frontend-design', 'impeccable', 'ui-ux-pro-max', 'taste-skill', 'design-taste'];
  let skillEntries = '';
  let skillCount = 0;

  for (const skillDir of designSkillDirs) {
    if (enabledSkills.length > 0 && !enabledSkills.includes(skillDir)) continue;

    const skillContent = await readFile(projectPath, `agent/skills/${skillDir}/SKILL.md`);
    if (!skillContent) continue;

    const parsed = parseSkillFrontmatter(skillContent);
    // Include condensed skill header + first 800 chars of content
    const excerpt = skillContent.slice(0, 1200).replace(/---[\s\S]*?---/, '').trim();
    const entry = `\n### ${parsed.name}\n${parsed.description}\n${excerpt.slice(0, 600)}\n`;

    if (estimateTokens(content + skillEntries + entry) > maxTokens) break;
    skillEntries += entry;
    skillCount++;
  }

  content += `Active Skills: ${skillCount}\n`;
  content += skillEntries;

  // Include design-taste master skill last (it references the others)
  const tasteContent = await readFile(projectPath, 'agent/skills/design-taste/SKILL.md');
  if (tasteContent && estimateTokens(content + tasteContent.slice(0, 400)) <= maxTokens) {
    content += `\n### Design Taste Master\n`;
    content += tasteContent.replace(/---[\s\S]*?---/, '').slice(0, 400).trim() + '\n';
  }

  // Include DESIGN.md reference index if enabled
  if (includeRefs) {
    const refDirs = await listDir(projectPath, 'agent/design-references');
    const refs = refDirs.filter(d => !d.endsWith('.md') && d !== 'README.md');
    if (refs.length > 0 && estimateTokens(content + 'refs') <= maxTokens) {
      content += `\n### Design References Available\n`;
      for (const ref of refs.slice(0, 8)) {
        content += `- ${ref}: agent/design-references/${ref}/DESIGN.md\n`;
      }
    }
  }

  content += `\n[END DESIGN SKILLS CONTEXT]\n\n`;
  return content;
}

// ─────────────────────────────────────────────────────────────
// EXISTING BUILDERS (stubs for completeness)
// ─────────────────────────────────────────────────────────────

async function buildLLMWikiContext(projectPath: string, config: ContextConfig): Promise<string> {
  const maxTokens = config.systems.llm_wiki.max_tokens || 2000;
  let content = '## LLM Wiki\n';
  const files = ['state.md', 'context.md', 'patterns.md', 'data.md', 'debugging.md'];
  for (const file of files) {
    const data = await readFile(projectPath, `agent/${file}`);
    if (data) {
      const excerpt = data.slice(0, 800);
      const entry = `\n### ${file}\n${excerpt}\n`;
      if (estimateTokens(content + entry) > maxTokens) break;
      content += entry;
    }
  }
  return content;
}

async function buildSkillIndex(projectPath: string, config: ContextConfig): Promise<string> {
  const maxTokens = config.systems.obsidian_skills.max_tokens || 500;
  const enabledSkills = config.systems.obsidian_skills.skills;
  let content = '## Available Skills\n';
  const skillDirs = await listDir(projectPath, 'agent/skills');
  for (const skillDir of skillDirs) {
    if (!skillDir || skillDir.endsWith('.md')) continue;
    const skillContent = await readFile(projectPath, `agent/skills/${skillDir}/SKILL.md`);
    if (!skillContent) continue;
    const parsed = parseSkillFrontmatter(skillContent);
    if (enabledSkills.length > 0 && !enabledSkills.includes(parsed.name)) continue;
    const entry = `- **${parsed.name}** (${parsed.category}): ${parsed.description}\n`;
    if (estimateTokens(content + entry) > maxTokens) break;
    content += entry;
  }
  return content;
}

async function buildGraphifyContext(projectPath: string, config: ContextConfig): Promise<string> {
  const maxTokens = config.systems.graphify.max_tokens || 500;
  let content = '## Graphify Knowledge Graph\n';
  const report = await readFile(projectPath, 'graphify-out/GRAPH_REPORT.md');
  if (report) {
    content += report.slice(0, maxTokens * 4);
  }
  return content;
}

async function buildPARAContext(projectPath: string, config: ContextConfig): Promise<string> {
  const maxTokens = config.systems.para.max_tokens || 300;
  let content = '## PARA Knowledge System\n';
  const areas = config.systems.para.areas;
  for (const area of areas.slice(0, 3)) {
    const data = await readFile(projectPath, `CZVault/01_Areas/${area}/index.md`);
    if (data) content += `\n### ${area}\n${data.slice(0, 400)}\n`;
  }
  return content;
}

async function buildQMDContext(projectPath: string, config: ContextConfig): Promise<string> {
  const maxTokens = config.systems.qmd.max_tokens || 200;
  let content = '## QMD Templates\n';
  const templates = config.systems.qmd.templates;
  for (const tmpl of templates.slice(0, 3)) {
    const data = await readFile(projectPath, `agent/templates/${tmpl}.qmd`);
    if (data) content += `\n### ${tmpl}\n${data.slice(0, 300)}\n`;
  }
  return content;
}

async function buildAutomationsContext(projectPath: string, config: ContextConfig): Promise<string> {
  const maxTokens = config.systems.automations.max_tokens || 100;
  return '## Automations\nAvailable automation scripts in agent/automations/\n';
}

async function buildDeepMemoryContext(projectPath: string, config: ContextConfig): Promise<string> {
  return '## Deep Memory\nPattern detection enabled. Cross-session patterns tracked.\n';
}
