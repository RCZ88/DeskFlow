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
  fix_description: string | null;
  files: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateProblemData {
  title: string;
  priority?: string;
  category?: string;
  description?: string;
  projectId?: string;
}

export class ProblemsService {
  private baseDir: string;
  private problemsFile: string;
  private projectId: string | null;

  constructor(baseDir?: string, projectId?: string) {
    this.projectId = projectId || null;
    this.baseDir = baseDir || this.getDefaultBaseDir();
    this.problemsFile = path.join(this.baseDir, 'agent', 'PROBLEMS.md');
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

  parseProblems(content: string): Problem[] {
    const problems: Problem[] = [];

    // Pattern 1: ## **Issue XX.Y:** Title (new format with section headers)
    const pattern1 = /## \*\*Issue (\d+\.\d+):\*\*\s*(.+?)(?=\n##|\n--+)/gi;
    let match;
    while ((match = pattern1.exec(content)) !== null) {
      const id = match[1];
      const title = match[2].trim();

      const section = match[0];
      const statusMatch = section.match(/\*\*Status:\*\*\s*(.+?)(?:\n|$)/i);
      const priorityMatch = section.match(/\*\*Priority:\*\*\s*(.+?)(?:\n|$)/i);
      const categoryMatch = section.match(/\*\*Category:\*\*\s*(.+?)(?:\n|$)/i);
      const filesMatch = section.match(/\*\*Files:\*\*\s*(.+?)(?:\n|$)/i);
      const notesMatch = section.match(/\*\*User Notes:\*\*\s*([\s\S]*?)(?=\n\*\*|\n--+)/i);
      const fixMatch = section.match(/\*\*Fix Description:\*\*\s*([\s\S]*?)(?=\n\*\*|\n--+)/i);

      // Extract file paths from **Files:** line
      let files: string[] = [];
      if (filesMatch?.[1]) {
        const filesStr = filesMatch[1].trim();
        files = filesStr.split(',').map(f => f.trim()).filter(f => f.length > 0);
      }

      problems.push({
        id,
        title,
        status: statusMatch?.[1]?.trim() || 'NEW',
        priority: priorityMatch?.[1]?.trim() || 'medium',
        category: categoryMatch?.[1]?.trim() || 'other',
        terminal_id: null,
        skill_used: null,
        user_notes: notesMatch?.[1]?.trim() || null,
        fix_description: fixMatch?.[1]?.trim() || null,
        files,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Pattern 2: **Issue XX: Title** (one-liner, no ## prefix)
    // This is the format used in legacy PROBLEMS.md like: **Issue 73: Title**
    const pattern2 = /\*\*Issue (\d+):\s*(.+?)\*\*\s*\n([\s\S]*?)(?=\n\*\*Issue|\n## |\n---\n|$)/gi;
    while ((match = pattern2.exec(content)) !== null) {
      const id = match[1];
      const title = match[2].trim();
      const body = match[3] || '';

      // Avoid duplicates
      if (problems.some(p => p.id === id || p.id === id + '.1')) continue;

      // Extract status - look for - Status: or Status:
      const statusMatch = body.match(/(?:^|\n)-\s*Status:\s*(.+?)(?:\n|$)/i) 
                       || body.match(/(?:^|\n)Status:\s*(.+?)(?:\n|$)/i);
      
      // Extract priority
      const priorityMatch = body.match(/(?:^|\n)-\s*Priority:\s*(.+?)(?:\n|$)/i)
                          || body.match(/(?:^|\n)Priority:\s*(.+?)(?:\n|$)/i);
      
      // Extract files
      const filesMatch = body.match(/(?:^|\n)-\s*Files:\s*(.+?)(?:\n|$)/i)
                       || body.match(/(?:^|\n)Files:\s*(.+?)(?:\n|$)/i);
      
      let files: string[] = [];
      if (filesMatch?.[1]) {
        const filesStr = filesMatch[1].trim();
        files = filesStr.split(',').map(f => f.trim()).filter(f => f.length > 0);
      }

      // Extract any remaining description (User Notes, etc.)
      const notesLines = body.split('\n')
        .filter(line => line.trim() && !line.match(/^(?:Status|Priority|Files):/i))
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 5); // Limit to first 5 lines

      problems.push({
        id: id + '.1',
        title,
        status: statusMatch?.[1]?.trim() || 'NEW',
        priority: priorityMatch?.[1]?.trim() || 'medium',
        category: 'other',
        terminal_id: null,
        skill_used: null,
        user_notes: notesLines.length > 0 ? notesLines.join('\n') : null,
        fix_description: null,
        files,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Pattern 3: Section headers like ## 🚨 2026-05-06 SESSION - Issue Title
    // These have the issue title in the section header but status in the body
    const pattern3 = /## [🚨📋] [\d-]+ SESSION\s*-\s*(.+?)\n([\s\S]*?)(?=\n## [🚨📋]|\n---\n$)/gi;
    while ((match = pattern3.exec(content)) !== null) {
      const title = match[1].trim();
      const body = match[2] || '';

      // Look for **Issue XX:** patterns within the body
      const issueMatch = body.match(/\*\*Issue (\d+):\*\*/i);
      if (issueMatch) {
        const id = issueMatch[1];
        if (problems.some(p => p.id === id || p.id === id + '.1')) continue;

        const statusMatch = body.match(/(?:^|\n)-\s*Status:\s*(.+?)(?:\n|$)/i);
        const filesMatch = body.match(/(?:^|\n)-\s*Files:\s*(.+?)(?:\n|$)/i);

        let files: string[] = [];
        if (filesMatch?.[1]) {
          const filesStr = filesMatch[1].trim();
          files = filesStr.split(',').map(f => f.trim()).filter(f => f.length > 0);
        }

        problems.push({
          id: id + '.1',
          title,
          status: statusMatch?.[1]?.trim() || 'NEW',
          priority: 'medium',
          category: 'other',
          terminal_id: null,
          skill_used: null,
          user_notes: null,
          fix_description: null,
          files,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    return problems;
  }

  generateMarkdown(problems: Problem[]): string {
    let md = '# ⚠️ Problems & Issues Tracker\n\n';
    md += '> **DO NOT EDIT MANUALLY** - This file is managed by Tracker Mind AI agents.\n\n';
    md += '> Last sync: ' + new Date().toISOString() + '\n\n';

    for (const problem of problems) {
      md += `## **Issue ${problem.id}:** ${problem.title}\n\n`;
      md += `**Status:** ${problem.status}\n`;
      md += `**Priority:** ${problem.priority}\n`;
      md += `**Category:** ${problem.category}\n`;
      if (problem.terminal_id) md += `**Terminal:** ${problem.terminal_id}\n`;
      if (problem.skill_used) md += `**Skill Used:** ${problem.skill_used}\n`;
      if (problem.files.length > 0) md += `**Files:** ${problem.files.join(', ')}\n`;
      md += `**Created:** ${problem.created_at}\n`;
      md += `**Updated:** ${problem.updated_at}\n`;
      md += '\n';
      if (problem.user_notes) {
        md += '**User Notes:**\n';
        md += problem.user_notes + '\n\n';
      }
      if (problem.fix_description) {
        md += '**Fix Description:**\n';
        md += problem.fix_description + '\n\n';
      }
      md += '---\n\n';
    }

    return md;
  }

  getProblems(): Problem[] {
    this.ensureAgentDir();

    if (!fs.existsSync(this.problemsFile)) {
      // Create initial PROBLEMS.md file
      const initialContent = `# ⚠️ Problems & Issues Tracker

> **DO NOT EDIT MANUALLY** - This file is managed by Tracker Mind AI agents.

> Last sync: ${new Date().toISOString()}

<!-- No problems reported yet. Use the Problems tab in the Terminal workspace to create new issues. -->

---
`;
      fs.writeFileSync(this.problemsFile, initialContent, 'utf-8');
      console.log('[ProblemsService] Created initial PROBLEMS.md');
      return [];
    }

    const content = fs.readFileSync(this.problemsFile, 'utf-8');
    return this.parseProblems(content);
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
      user_notes: data.description || null,
      fix_description: null,
      files: [],
      created_at: now,
      updated_at: now
    };

    problems.push(problem);
    fs.writeFileSync(this.problemsFile, this.generateMarkdown(problems), 'utf-8');
    
    return problem;
  }

  updateStatus(id: string, status: string): boolean {
    const problems = this.getProblems();
    const idx = problems.findIndex(p => p.id === id);
    
    if (idx === -1) return false;

    problems[idx].status = status;
    problems[idx].updated_at = new Date().toISOString();
    fs.writeFileSync(this.problemsFile, this.generateMarkdown(problems), 'utf-8');
    
    return true;
  }

  updateProblem(id: string, updates: Partial<Problem>): boolean {
    const problems = this.getProblems();
    const idx = problems.findIndex(p => p.id === id);
    
    if (idx === -1) return false;

    problems[idx] = { ...problems[idx], ...updates, updated_at: new Date().toISOString() };
    fs.writeFileSync(this.problemsFile, this.generateMarkdown(problems), 'utf-8');
    
    return true;
  }

  deleteProblem(id: string): boolean {
    const problems = this.getProblems();
    const filtered = problems.filter(p => p.id !== id);
    
    if (filtered.length === problems.length) return false;

    fs.writeFileSync(this.problemsFile, this.generateMarkdown(filtered), 'utf-8');
    return true;
  }
}