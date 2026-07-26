export interface ParsedProblem {
  id: string;
  title: string;
  status: string;
  priority: string;
  files: string[];
  description: string;
  user_notes: string;
  fix_description: string;
  root_cause: string;
  category: string;
  session_date: string | null;
}

export class ProblemsParser {

  /**
   * Parse the PROBLEMS.md file content into structured problems
   */
  parse(content: string): ParsedProblem[] {
    const problems: ParsedProblem[] = [];

    // Split by issue pattern: **Issue XX: Title**
    const issuePattern = /\*\*Issue (\d+):\s*(.+?)\*\*/g;
    let match;

    // Find all issue matches first
    const issues: { index: number; id: string; title: string }[] = [];
    while ((match = issuePattern.exec(content)) !== null) {
      issues.push({
        index: match.index,
        id: `Issue ${match[1]}`,
        title: match[2].trim()
      });
    }

    // Parse each issue's content
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const nextIndex = i + 1 < issues.length ? issues[i + 1].index : content.length;
      const issueContent = content.substring(issue.index, nextIndex);

      const problem = this.parseIssueBlock(issue.id, issue.title, issueContent);
      problems.push(problem);
    }

    return problems;
  }

  private parseIssueBlock(id: string, title: string, content: string): ParsedProblem {
    const problem: ParsedProblem = {
      id,
      title,
      status: 'NEW',
      priority: 'medium',
      files: [],
      description: '',
      user_notes: '',
      fix_description: '',
      root_cause: '',
      category: '',
      session_date: null
    };

    // Extract status
    const statusMatch = content.match(/- Status:\s*(.+)/);
    if (statusMatch) {
      problem.status = statusMatch[1].trim();
    }

    // Extract files
    const filesMatch = content.match(/- Files:\s*(.+)/);
    if (filesMatch) {
      problem.files = filesMatch[1].split(',').map(f => f.trim()).filter(Boolean);
    }

    // Extract user notes (User said:)
    const userSaidMatch = content.match(/- User said:\s*"(.+?)"/s);
    if (userSaidMatch) {
      problem.user_notes = userSaidMatch[1].trim();
    }

    // Extract fix description
    const fixMatch = content.match(/- Fix:\s*([\s\S]+?)(?=- |\*\*Issue|\n##|$)/);
    if (fixMatch) {
      problem.fix_description = fixMatch[1].trim();
    }

    // Extract root cause
    const rootCauseMatch = content.match(/- Root Cause:\s*(.+)/);
    if (rootCauseMatch) {
      problem.root_cause = rootCauseMatch[1].trim();
    }

    // Check for session date (## 🚨 YYYY-MM-DD SESSION)
    const sessionMatch = content.match(/## 🚨 (\d{4}-\d{2}-\d{2}) SESSION/);
    if (sessionMatch) {
      problem.session_date = sessionMatch[1];
    }

    // Determine category from content
    if (content.includes('Terminal') || content.includes('terminal')) {
      problem.category = 'terminal';
    } else if (content.includes('Dashboard') || content.includes('dashboard')) {
      problem.category = 'dashboard';
    } else if (content.includes('External') || content.includes('external')) {
      problem.category = 'external';
    }

    return problem;
  }

  /**
   * Generate PROBLEMS.md content from structured problems
   */
  generate(problems: ParsedProblem[], headerInfo?: { lastUpdated: string; totalIssues: number }): string {
    let content = `# PROBLEMS.md - Comprehensive Issue List

**Last Updated:** ${headerInfo?.lastUpdated || new Date().toISOString().split('T')[0]}
**Total Issues:** ${headerInfo?.totalIssues || problems.length}

---

## 🚨 STATUS LEGEND (MUST READ)

| Status | Meaning | What to do |
|--------|---------|------------|
| **NEW** | Just reported, not looked at yet | Investigate and reproduce |
| **Not Started** | Has been looked at but not fixed yet | Start working on it |
| **In Progress** | Currently being fixed | Keep working |
| **AI Attempted Fix** | Made changes, needs user testing | Wait for user to test |
| **User Testing** | User is testing the fix | Wait for user feedback |
| **Fixed** | User confirmed it works | Document solution |
| **Irrelevant** | Feature changed, issue no longer applies | Document why |

---

`;

    // Group by session date (most recent first)
    const bySession = this.groupBySession(problems);
    const sortedSessions = Object.keys(bySession).sort((a, b) => b.localeCompare(a));

    for (const sessionDate of sortedSessions) {
      if (sessionDate !== 'unknown') {
        content += `## 🚨 ${sessionDate} SESSION\n\n`;
      }

      for (const problem of bySession[sessionDate]) {
        content += this.formatProblem(problem);
      }
    }

    // Add category summary at the end
    content += this.generateCategorySummary(problems);

    return content;
  }

  private formatProblem(problem: ParsedProblem): string {
    let block = `**${problem.id}: ${problem.title}**\n`;
    block += `- Status: ${problem.status}\n`;

    if (problem.user_notes) {
      block += `- User said: "${problem.user_notes}"\n`;
    }

    if (problem.files.length > 0) {
      block += `- Files: ${problem.files.join(', ')}\n`;
    }

    if (problem.fix_description) {
      block += `- Fix: ${problem.fix_description}\n`;
    }

    if (problem.root_cause) {
      block += `- Root Cause: ${problem.root_cause}\n`;
    }

    block += '\n';
    return block;
  }

  private groupBySession(problems: ParsedProblem[]): Record<string, ParsedProblem[]> {
    const grouped: Record<string, ParsedProblem[]> = {};

    for (const problem of problems) {
      const session = problem.session_date || 'unknown';
      if (!grouped[session]) {
        grouped[session] = [];
      }
      grouped[session].push(problem);
    }

    return grouped;
  }

  private generateCategorySummary(problems: ParsedProblem[]): string {
    const categories: Record<string, string[]> = {};

    for (const problem of problems) {
      const cat = problem.category || 'other';
      if (!categories[cat]) {
        categories[cat] = [];
      }
      categories[cat].push(problem.id);
    }

    let summary = '\n---\n\n## 📋 ISSUES BY CATEGORY\n\n';

    for (const [category, ids] of Object.entries(categories)) {
      const categoryName = this.formatCategoryName(category);
      summary += `### ${categoryName} Issues\n`;
      summary += `${ids.join(', ')}\n\n`;
    }

    return summary;
  }

  private formatCategoryName(category: string): string {
    const names: Record<string, string> = {
      'terminal': 'Terminal',
      'dashboard': 'Dashboard',
      'external': 'External Page',
      'other': 'Other'
    };
    return names[category] || category;
  }
}
