import * as fs from 'fs';
import * as path from 'path';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  filePath: string;
}

export class SkillsService {
  private baseDir: string;
  private skillsDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || this.getDefaultBaseDir();
    this.skillsDir = path.join(this.baseDir, 'agent', 'skills');
  }

  private getDefaultBaseDir(): string {
    return path.join(process.cwd());
  }

  private ensureSkillsDir(): void {
    if (!fs.existsSync(this.skillsDir)) {
      fs.mkdirSync(this.skillsDir, { recursive: true });
    }
  }

  getSkills(): Skill[] {
    this.ensureSkillsDir();
    const skills: Skill[] = [];

    if (!fs.existsSync(this.skillsDir)) {
      return skills;
    }

    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(this.skillsDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          const skill = this.loadSkillFromFile(entry.name, skillPath);
          if (skill) skills.push(skill);
        }
      } else if (entry.name.endsWith('.md') && entry.name !== 'README.md') {
        const skillPath = path.join(this.skillsDir, entry.name);
        const skill = this.loadSkillFromFile(entry.name.replace('.md', ''), skillPath);
        if (skill) skills.push(skill);
      }
    }

    return skills;
  }

  private loadSkillFromFile(id: string, filePath: string): Skill | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Parse frontmatter if present
      let name = id.replace(/-/g, ' ').replace(/_/g, ' ');
      let description = '';
      let category = 'general';

      // Try to extract from frontmatter or first lines
      const nameMatch = content.match(/^#\s+(.+?)\n/m) || content.match(/^name:\s*(.+?)$/m);
      if (nameMatch) name = nameMatch[1].trim();

      const descMatch = content.match(/description:\s*(.+?)$/m);
      if (descMatch) description = descMatch[1].trim();

      const catMatch = content.match(/category:\s*(.+?)$/m);
      if (catMatch) category = catMatch[1].trim();

      return {
        id,
        name,
        description: description || this.generateDescription(content),
        category,
        content,
        filePath
      };
    } catch (err) {
      console.error('[SkillsService] Failed to load skill:', filePath, err);
      return null;
    }
  }

  private generateDescription(content: string): string {
    // Extract first non-header line as description
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---') && trimmed.length > 10) {
        return trimmed.substring(0, 150);
      }
    }
    return 'No description available';
  }

  getSkillById(id: string): Skill | null {
    const skills = this.getSkills();
    return skills.find(s => s.id === id) || null;
  }

  getSkillContext(skillId: string): string {
    const skill = this.getSkillById(skillId);
    if (!skill) return '';
    
    // Extract key instructions from skill content
    const lines = skill.content.split('\n');
    const contextLines: string[] = [];
    let inKeySection = false;

    for (const line of lines) {
      // Skip frontmatter and metadata
      if (line.startsWith('---') || line.startsWith('# ') || line.match(/^(name|description|category):/i)) {
        continue;
      }
      // Keep important sections
      if (line.startsWith('## ') || line.startsWith('### ')) {
        if (line.toLowerCase().includes('instructions') || line.toLowerCase().includes('task') || line.toLowerCase().includes('workflow')) {
          inKeySection = true;
        }
        contextLines.push(line);
      } else if (inKeySection && line.trim()) {
        contextLines.push(line);
      }
    }

    return `[Skill: ${skill.name}]\n${contextLines.slice(0, 50).join('\n')}`;
  }
}