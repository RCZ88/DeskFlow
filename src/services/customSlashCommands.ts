import { generateUUID } from '../lib/uuid'

const STORAGE_KEY = 'deskflow-custom-slash-commands';

export interface CustomSlashCommand {
  id: string;
  name: string;
  description: string;
  prompt: string;
  createdAt: number;
}

function safeRead(): CustomSlashCommand[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function safeWrite(commands: CustomSlashCommand[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commands));
  } catch {}
}

export function getAllCommands(): CustomSlashCommand[] {
  return safeRead();
}

export function addCommand(name: string, description: string, prompt: string): CustomSlashCommand {
  const commands = safeRead();
  const cmd: CustomSlashCommand = {
    id: generateUUID(),
    name: name.replace(/^\//, '').toLowerCase(),
    description,
    prompt,
    createdAt: Date.now(),
  };
  commands.push(cmd);
  safeWrite(commands);
  return cmd;
}

export function updateCommand(id: string, updates: Partial<Pick<CustomSlashCommand, 'name' | 'description' | 'prompt'>>): boolean {
  const commands = safeRead();
  const idx = commands.findIndex(c => c.id === id);
  if (idx === -1) return false;
  if (updates.name) commands[idx].name = updates.name.replace(/^\//, '').toLowerCase();
  if (updates.description !== undefined) commands[idx].description = updates.description;
  if (updates.prompt !== undefined) commands[idx].prompt = updates.prompt;
  safeWrite(commands);
  return true;
}

export function deleteCommand(id: string): boolean {
  const commands = safeRead();
  const filtered = commands.filter(c => c.id !== id);
  if (filtered.length === commands.length) return false;
  safeWrite(filtered);
  return true;
}

export function findCommand(name: string): CustomSlashCommand | null {
  const commands = safeRead();
  return commands.find(c => c.name === name.toLowerCase()) || null;
}

export function fillPrompt(template: string, args: string): string {
  return template.replace(/\{args\}/g, args).replace(/\{input\}/g, args);
}
