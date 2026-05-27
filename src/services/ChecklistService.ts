import * as fs from 'fs';
import * as path from 'path';

export interface ChecklistItem {
  id: string;
  parentType: 'problem' | 'request';
  parentId: string;
  step: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  requiresHuman: boolean;
  humanApproved: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateChecklistItemData {
  parentType: 'problem' | 'request';
  parentId: string;
  description: string;
  requiresHuman?: boolean;
}

export class ChecklistService {
  private baseDir: string;
  private jsonFile: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || this.getDefaultBaseDir();
    this.jsonFile = path.join(this.baseDir, 'agent', 'checklists.json');
  }

  private getDefaultBaseDir(): string {
    return process.cwd();
  }

  private ensureAgentDir(): void {
    const agentDir = path.join(this.baseDir, 'agent');
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }
  }

  private writeJson(items: ChecklistItem[]): void {
    this.ensureAgentDir();
    fs.writeFileSync(this.jsonFile, JSON.stringify(items, null, 2), 'utf-8');
  }

  getChecklists(): ChecklistItem[] {
    this.ensureAgentDir();
    if (fs.existsSync(this.jsonFile)) {
      try {
        const content = fs.readFileSync(this.jsonFile, 'utf-8');
        const items = JSON.parse(content);
        if (Array.isArray(items)) return items;
      } catch (e) {
        console.error('[ChecklistService] Failed to parse checklists.json:', e);
      }
    }
    this.writeJson([]);
    return [];
  }

  getChecklistForParent(parentType: 'problem' | 'request', parentId: string): ChecklistItem[] {
    return this.getChecklists().filter(i => i.parentType === parentType && i.parentId === parentId);
  }

  createItem(data: CreateChecklistItemData): ChecklistItem {
    this.ensureAgentDir();
    const items = this.getChecklists();
    const step = items.filter(i => i.parentType === data.parentType && i.parentId === data.parentId).length + 1;
    const id = `${data.parentType}-${data.parentId}-step-${step}`;
    const now = new Date().toISOString();
    const item: ChecklistItem = {
      id,
      parentType: data.parentType,
      parentId: data.parentId,
      step,
      description: data.description,
      status: 'pending',
      requiresHuman: data.requiresHuman ?? true,
      humanApproved: false,
      notes: '',
      created_at: now,
      updated_at: now,
    };
    items.push(item);
    this.writeJson(items);
    return item;
  }

  updateItem(id: string, updates: Partial<Pick<ChecklistItem, 'status' | 'humanApproved' | 'notes' | 'description'>>): boolean {
    const items = this.getChecklists();
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return false;
    items[idx] = { ...items[idx], ...updates, updated_at: new Date().toISOString() };
    this.writeJson(items);
    return true;
  }

  deleteItem(id: string): boolean {
    const items = this.getChecklists();
    const filtered = items.filter(i => i.id !== id);
    if (filtered.length === items.length) return false;
    this.writeJson(filtered);
    return true;
  }

  deleteChecklistForParent(parentType: 'problem' | 'request', parentId: string): boolean {
    const items = this.getChecklists().filter(i => !(i.parentType === parentType && i.parentId === parentId));
    this.writeJson(items);
    return true;
  }
}
