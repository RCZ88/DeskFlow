import * as fs from 'fs';
import * as path from 'path';

export interface Problem {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  terminal_id: string | null;
  skill_used: string | null;
  user_notes: string | null;
  description?: string;
  fix_description?: string;
  root_cause?: string;
  files: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateProblemData {
  title: string;
  priority?: string;
  category?: string;
  description?: string;
  root_cause?: string;
  projectId?: string;
}

export class ProblemsService {
  private baseDir: string;
  private jsonFile: string;
  private mdFile: string;
  private projectId: string | null;

  constructor(baseDir?: string, projectId?: string) {
    this.projectId = projectId || null;
    this.baseDir = baseDir || this.getDefaultBaseDir();
    this.jsonFile = path.join(this.baseDir, 'agent', 'problems.json');
    this.mdFile = path.join(this.baseDir, 'agent', 'PROBLEMS.md');
  }

  setProjectId(projectId: string): void {
    this.projectId = projectId;
  }

  getProjectId(): string | null {
    return this.projectId;
  }

  getProjectPath(): string {
    return this.baseDir;
  }

  private getDefaultBaseDir(): string {
    return path.join(process.cwd());
  }

  private ensureAgentDir(): void {
    const agentDir = path.join(this.baseDir, 'agent');
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }
  }

  private getNextIssueNumber(problems: Problem[]): number {
    let maxNum = 0;
    for (const p of problems) {
      const match = p.id.match(/^(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return maxNum + 1;
  }

  private migrateFromMd(): Problem[] {
    const mdPath = this.mdFile;
    if (!fs.existsSync(mdPath)) return [];

    try {
      const content = fs.readFileSync(mdPath, 'utf-8');
      const problems = this.parseProblemsLegacy(content);
      if (problems.length > 0) {
        fs.writeFileSync(this.jsonFile, JSON.stringify(problems, null, 2), 'utf-8');
        console.log(`[ProblemsService] Migrated ${problems.length} problems from markdown to JSON`);
      }
      return problems;
    } catch (e) {
      console.error('[ProblemsService] Migration failed:', e);
      return [];
    }
  }

  private writeJson(problems: Problem[]): void {
    this.ensureAgentDir();
    fs.writeFileSync(this.jsonFile, JSON.stringify(problems, null, 2), 'utf-8');
  }

  private writeMarkdown(problems: Problem[]): void {
    this.ensureAgentDir();
    let md = '# PROBLEMS.md\n\n';
    md += '> **Purpose:** Issue tracker for AI agents and humans — all known bugs, feature requests, and their resolution status.\n';
    md += '> **Last Updated:** ' + new Date().toISOString().split('T')[0] + '\n\n';
    md += '---\n\n';

    for (const problem of problems) {
      md += `### Issue #${problem.id}: ${problem.title}\n`;
      md += `- Status: ${problem.status}\n`;
      md += `- Priority: ${problem.priority}\n`;
      md += `- Category: ${problem.category}\n`;
      if (problem.terminal_id) md += `- Terminal: ${problem.terminal_id}\n`;
      if (problem.skill_used) md += `- Skill Used: ${problem.skill_used}\n`;
      if (problem.files.length > 0) md += `- Files: \`${problem.files.join('`, `')}\`\n`;
      md += `- Created: ${problem.created_at}\n`;
      md += `- Updated: ${problem.updated_at}\n`;
      if (problem.description) {
        md += `- Description: ${problem.description}\n`;
      }
      if (problem.user_notes) {
        md += `- User Notes: ${problem.user_notes}\n`;
      }
      if (problem.fix_description) {
        md += `- Fix Description: ${problem.fix_description}\n`;
      }
      if (problem.root_cause) {
        md += `- Root Cause: ${problem.root_cause}\n`;
      }
      md += '\n---\n\n';
    }

    fs.writeFileSync(this.mdFile, md, 'utf-8');
  }

  getProblems(): Problem[] {
    this.ensureAgentDir();

    if (fs.existsSync(this.jsonFile)) {
      try {
        const content = fs.readFileSync(this.jsonFile, 'utf-8');
        const problems = JSON.parse(content);
        if (Array.isArray(problems) && problems.length > 0) return problems;
        if (Array.isArray(problems) && problems.length === 0) {
          const migrated = this.migrateFromMd();
          if (migrated.length > 0) return migrated;
        }
      } catch (e) {
        console.error('[ProblemsService] Failed to parse problems.json:', e);
      }
    }

    const migrated = this.migrateFromMd();
    if (migrated.length > 0) return migrated;

    this.writeJson([]);
    this.writeMarkdown([]);
    return [];
  }

  getProblem(id: string): Problem | null {
    const problems = this.getProblems();
    return problems.find(p => p.id === id) || null;
  }

  createProblem(data: CreateProblemData): Problem {
    this.ensureAgentDir();

    const problems = this.getProblems();
    const nextNum = this.getNextIssueNumber(problems);
    const subNum = problems.filter(p => p.id.startsWith(`${nextNum}.`)).length + 1;
    const id = `${nextNum}.${subNum}`;

    const now = new Date().toISOString();
    const problem: Problem = {
      id,
      title: data.title,
      status: 'NEW',
      priority: data.priority || 'medium',
      category: data.category || 'other',
      terminal_id: null,
      skill_used: null,
      user_notes: null,
      description: data.description || null,
      root_cause: data.root_cause || null,
      fix_description: null,
      files: [],
      created_at: now,
      updated_at: now
    };

    problems.push(problem);
    this.writeJson(problems);
    this.writeMarkdown(problems);

    return problem;
  }

  updateStatus(id: string, status: string): boolean {
    const problems = this.getProblems();
    const idx = problems.findIndex(p => p.id === id);

    if (idx === -1) return false;

    problems[idx].status = status;
    problems[idx].updated_at = new Date().toISOString();
    this.writeJson(problems);
    this.writeMarkdown(problems);

    return true;
  }

  updateProblem(id: string, updates: Partial<Problem>): boolean {
    const problems = this.getProblems();
    const idx = problems.findIndex(p => p.id === id);

    if (idx === -1) return false;

    problems[idx] = { ...problems[idx], ...updates, updated_at: new Date().toISOString() };
    this.writeJson(problems);
    this.writeMarkdown(problems);

    return true;
  }

  deleteProblem(id: string): boolean {
    const problems = this.getProblems();
    const filtered = problems.filter(p => p.id !== id);

    if (filtered.length === problems.length) return false;

    this.writeJson(filtered);
    this.writeMarkdown(filtered);
    return true;
  }

  parseProblemsLegacy(content: string): Problem[] {
    const problems: Problem[] = [];
    content = content.replace(/\r\n/g, '\n');

    const pattern4 = /### Issue #([\d.]+):\s*(.+?)\n([\s\S]*?)(?=\n### Issue #|\n## |\n---+\n|$)/gi;
    let match;
    while ((match = pattern4.exec(content)) !== null) {
      const id = match[1];
      const title = match[2].trim();
      const body = match[3] || '';

      if (problems.some(p => p.id === id || p.id === `${id}.1`)) continue;

      const statusMatch = body.match(/(?:^|\n)-\s*Status:\s*(.+?)(?:\n|$)/i);
      const filesMatch = body.match(/(?:^|\n)-\s*Files:\s*(.+?)(?:\n|$)/i);
      const userNotesMatch = body.match(/(?:^|\n)-\s*User said:\s*(.+?)(?:\n|$)/i);
      const fixMatch = body.match(/(?:^|\n)-\s*Fix:\s*([\s\S]*?)(?=\n-\s+(?:Status|User|Files|Root|Category|Priority)\b|\n###|\n##|\n---+\n|$)/i);
      const categoryMatch = body.match(/(?:^|\n)-\s*Category:\s*(.+?)(?:\n|$)/i);

      let files: string[] = [];
      if (filesMatch?.[1]) {
        const filesStr = filesMatch[1].trim().replace(/`/g, '');
        files = filesStr.split(',').map(f => f.trim()).filter(f => f.length > 0);
      }

      problems.push({
        id,
        title,
        status: statusMatch?.[1]?.trim() || 'NEW',
        priority: 'medium',
        category: categoryMatch?.[1]?.trim() || 'other',
        terminal_id: null,
        skill_used: null,
        user_notes: userNotesMatch?.[1]?.trim() || null,
        fix_description: fixMatch?.[1]?.trim() || null,
        files,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    return problems;
  }
}
