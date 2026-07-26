import { ProblemsParser, ParsedProblem } from './ProblemsParser';
import * as fs from 'fs';
import * as path from 'path';

export class ProblemsSyncService {
  private parser: ProblemsParser;
  private db: any;
  private projectPath: string;
  private projectId: string;

  constructor(db: any, projectPath: string, projectId: string) {
    this.parser = new ProblemsParser();
    this.db = db;
    this.projectPath = projectPath;
    this.projectId = projectId;
  }

  /**
   * Sync from PROBLEMS.md to database
   * Call this on app startup or when file changes
   */
  async syncFromMarkdown(): Promise<{ added: number; updated: number; unchanged: number }> {
    const filePath = path.join(this.projectPath, 'agent', 'PROBLEMS.md');

    if (!fs.existsSync(filePath)) {
      return { added: 0, updated: 0, unchanged: 0 };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const parsedProblems = this.parser.parse(content);

    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const parsed of parsedProblems) {
      const existing = await this.db.get(
        'SELECT * FROM workspace_problems WHERE id = ?',
        [parsed.id]
      );

      if (existing) {
        // Check if anything changed
        if (existing.status !== parsed.status ||
            existing.title !== parsed.title ||
            existing.user_notes !== parsed.user_notes) {

          await this.db.run(
            `UPDATE workspace_problems
             SET title = ?, status = ?, user_notes = ?, fix_description = ?,
                 files = ?, root_cause = ?, category = ?, updated_at = ?
             WHERE id = ?`,
            [
              parsed.title,
              parsed.status,
              parsed.user_notes,
              parsed.fix_description,
              JSON.stringify(parsed.files),
              parsed.root_cause,
              parsed.category,
              new Date().toISOString(),
              parsed.id
            ]
          );
          updated++;
        } else {
          unchanged++;
        }
      } else {
        // Insert new problem
        await this.db.run(
          `INSERT INTO workspace_problems
           (id, title, status, priority, files, user_notes, fix_description,
            root_cause, category, source, project_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'markdown', ?, ?)`,
          [
            parsed.id,
            parsed.title,
            parsed.status,
            parsed.priority,
            JSON.stringify(parsed.files),
            parsed.user_notes,
            parsed.fix_description,
            parsed.root_cause,
            parsed.category,
            this.projectId,
            new Date().toISOString()
          ]
        );
        added++;
      }
    }

    return { added, updated, unchanged };
  }

  /**
   * Sync from database to PROBLEMS.md
   * Call this after UI changes or AI updates
   */
  async syncToMarkdown(): Promise<void> {
    const problems = await this.db.all(
      `SELECT * FROM workspace_problems
       WHERE project_id = ? OR project_id IS NULL
       ORDER BY created_at DESC`,
      [this.projectId]
    );

    const parsedProblems: ParsedProblem[] = problems.map((p: any) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      priority: p.priority,
      files: p.files ? JSON.parse(p.files) : [],
      description: p.description || '',
      user_notes: p.user_notes || '',
      fix_description: p.fix_description || '',
      root_cause: p.root_cause || '',
      category: p.category || '',
      session_date: p.created_at ? p.created_at.split('T')[0] : null
    }));

    const content = this.parser.generate(parsedProblems, {
      lastUpdated: new Date().toISOString().split('T')[0],
      totalIssues: parsedProblems.length
    });

    const agentDir = path.join(this.projectPath, 'agent');
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }

    const filePath = path.join(agentDir, 'PROBLEMS.md');
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Update a single problem and sync to markdown
   */
  async updateProblem(problemId: string, updates: Partial<{
    status: string;
    terminal_id: string;
    skill_used: string;
    fix_description: string;
    user_notes: string;
  }>): Promise<void> {
    const setClause = Object.keys(updates)
      .map((k: string) => `${k} = ?`)
      .join(', ');
    const values: any[] = [...Object.values(updates), new Date().toISOString(), problemId];

    await this.db.run(
      `UPDATE workspace_problems SET ${setClause}, updated_at = ? WHERE id = ?`,
      values
    );

    // Add to history
    for (const [key, value] of Object.entries(updates)) {
      await this.db.run(
        `INSERT INTO problem_history (problem_id, action, new_value, actor)
         VALUES (?, ?, ?, 'user')`,
        [problemId, `${key}_changed`, value]
      );
    }

    // Sync to markdown
    await this.syncToMarkdown();
  }

  /**
   * Create a new problem from user input
   */
  async createProblem(data: {
    title: string;
    description?: string;
    user_notes?: string;
    files?: string[];
    priority?: string;
    category?: string;
  }): Promise<string> {
    // Get next issue number
    const lastIssue = await this.db.get(
      `SELECT id FROM workspace_problems
       WHERE id LIKE 'Issue %'
       ORDER BY CAST(SUBSTR(id, 7) AS INTEGER) DESC
       LIMIT 1`
    );

    let nextNum = 1;
    if (lastIssue) {
      const match = lastIssue.id.match(/Issue (\d+)/);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }

    const id = `Issue ${nextNum}`;

    await this.db.run(
      `INSERT INTO workspace_problems
       (id, title, description, status, priority, files, user_notes, category,
        source, project_id, created_at)
       VALUES (?, ?, ?, 'NEW', ?, ?, ?, ?, 'user', ?, ?)`,
      [
        id,
        data.title,
        data.description || '',
        data.priority || 'medium',
        JSON.stringify(data.files || []),
        data.user_notes || '',
        data.category || '',
        this.projectId,
        new Date().toISOString()
      ]
    );

    // Add to history
    await this.db.run(
      `INSERT INTO problem_history (problem_id, action, actor)
       VALUES (?, 'created', 'user')`,
      [id]
    );

    // Sync to markdown
    await this.syncToMarkdown();

    return id;
  }
}
