import * as fs from 'fs';
import * as path from 'path';

export interface Request {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  linked_problems: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateRequestData {
  title: string;
  description?: string;
  priority?: string;
  category?: string;
}

export class RequestsService {
  private baseDir: string;
  private requestsFile: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || this.getDefaultBaseDir();
    this.requestsFile = path.join(this.baseDir, 'agent', 'REQUESTS.md');
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

  parseRequests(content: string): Request[] {
    const requests: Request[] = [];

    // Pattern 1: ### Request #XX - Title
    const pattern1 = /### Request #(\d+)\s*-\s*(.+?)\n([\s\S]*?)(?=### Request #|\n## |\n---\n$|$)/gi;
    let match;
    while ((match = pattern1.exec(content)) !== null) {
      const id = match[1];
      const title = match[2].trim();
      const body = match[3] || '';

      const statusMatch = body.match(/\*\*Status:\*\*\s*(.+?)(?:\n|$)/i);
      const priorityMatch = body.match(/\*\*Priority:\*\*\s*(.+?)(?:\n|$)/i);
      const categoryMatch = body.match(/\*\*Category:\*\*\s*(.+?)(?:\n|$)/i);
      const descMatch = body.match(/\*\*Request:\*\*\n(.+?)(?=\*\*|$)/i);

      requests.push({
        id,
        title,
        description: descMatch?.[1]?.trim() || '',
        status: statusMatch?.[1]?.trim() || 'Pending',
        priority: priorityMatch?.[1]?.trim() || 'Medium',
        category: categoryMatch?.[1]?.trim() || 'Feature',
        linked_problems: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    return requests;
  }

  generateMarkdown(requests: Request[]): string {
    let md = '# 📋 User Requests Log\n\n';
    md += '> **DO NOT EDIT MANUALLY** - This file is managed by Tracker Mind.\n\n';
    md += '> Last sync: ' + new Date().toISOString() + '\n\n';
    md += '## 📝 How to Use This File\n\n';
    md += '### Adding New Requests:\n';
    md += '```markdown\n';
    md += '### Request #XXX - [Short Title]\n\n';
    md += '**Status:** Pending\n';
    md += '**Priority:** High\n';
    md += '**Category:** Feature\n\n';
    md += '**Request:** \n';
    md += '"What the user asked for"\n';
    md += '```\n\n';
    md += '---\n\n';

    for (const req of requests) {
      md += `### Request #${req.id} - ${req.title}\n\n`;
      md += `**Status:** ${req.status}\n`;
      md += `**Priority:** ${req.priority}\n`;
      md += `**Category:** ${req.category}\n`;
      md += `**Created:** ${req.created_at}\n`;
      md += `**Updated:** ${req.updated_at}\n`;
      if (req.description) {
        md += `\n**Request:** \n${req.description}\n`;
      }
      if (req.linked_problems.length > 0) {
        md += `\n**Linked Issues:** ${req.linked_problems.map(p => `#${p}`).join(', ')}\n`;
      }
      md += '\n---\n\n';
    }

    return md;
  }

  getRequests(): Request[] {
    this.ensureAgentDir();

    if (!fs.existsSync(this.requestsFile)) {
      const initialContent = `# 📋 User Requests Log

> **DO NOT EDIT MANUALLY** - This file is managed by Tracker Mind.

> Last sync: ${new Date().toISOString()}

<!-- No requests yet. Use the Terminal workspace to create new requests. -->

---
`;
      fs.writeFileSync(this.requestsFile, initialContent, 'utf-8');
      console.log('[RequestsService] Created initial REQUESTS.md');
      return [];
    }

    const content = fs.readFileSync(this.requestsFile, 'utf-8');
    return this.parseRequests(content);
  }

  getRequest(id: string): Request | null {
    const requests = this.getRequests();
    return requests.find(r => r.id === id) || null;
  }

  createRequest(data: CreateRequestData): Request {
    this.ensureAgentDir();
    
    const requests = this.getRequests();
    const maxId = requests.reduce((max, r) => Math.max(max, parseInt(r.id) || 0), 0);
    const id = String(maxId + 1);

    const now = new Date().toISOString();
    const request: Request = {
      id,
      title: data.title,
      description: data.description || '',
      status: 'Pending',
      priority: data.priority || 'Medium',
      category: data.category || 'Feature',
      linked_problems: [],
      created_at: now,
      updated_at: now
    };

    requests.push(request);
    fs.writeFileSync(this.requestsFile, this.generateMarkdown(requests), 'utf-8');
    
    return request;
  }

  updateStatus(id: string, status: string): boolean {
    const requests = this.getRequests();
    const idx = requests.findIndex(r => r.id === id);
    
    if (idx === -1) return false;

    requests[idx].status = status;
    requests[idx].updated_at = new Date().toISOString();
    fs.writeFileSync(this.requestsFile, this.generateMarkdown(requests), 'utf-8');
    
    return true;
  }

  linkProblem(requestId: string, problemId: string): boolean {
    const requests = this.getRequests();
    const idx = requests.findIndex(r => r.id === requestId);
    
    if (idx === -1) return false;

    if (!requests[idx].linked_problems.includes(problemId)) {
      requests[idx].linked_problems.push(problemId);
      requests[idx].updated_at = new Date().toISOString();
      fs.writeFileSync(this.requestsFile, this.generateMarkdown(requests), 'utf-8');
    }
    
    return true;
  }

  deleteRequest(id: string): boolean {
    const requests = this.getRequests();
    const filtered = requests.filter(r => r.id !== id);
    
    if (filtered.length === requests.length) return false;

    fs.writeFileSync(this.requestsFile, this.generateMarkdown(filtered), 'utf-8');
    return true;
  }
}