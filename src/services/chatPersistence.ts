import type { ParsedResponse } from './wireFormat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  parsed: ParsedResponse;
  timestamp: number;
}

interface ThreadMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

const INDEX_KEY = 'aichat:index';
const ACTIVE_KEY = 'aichat:active';
const THREAD_PREFIX = 'aichat:thread:';
const LEGACY_PREFIX = 'aichat:thread:';
const MAX_THREADS = 30;

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* quota/private-mode: degrade silently */
  }
}

function safeDelete(key: string): void {
  try { localStorage.removeItem(key); } catch {}
}

function getIndex(): ThreadMeta[] {
  return safeRead<ThreadMeta[]>(INDEX_KEY, []);
}

function saveIndex(index: ThreadMeta[]): void {
  safeWrite(INDEX_KEY, index);
}

function isLegacyKey(key: string): boolean {
  return /^aichat:thread:\d{4}-\d{2}-\d{2}$/.test(key);
}

function migrateLegacyIfNeeded(): void {
  const index = getIndex();
  if (index.length > 0) return;

  const legacyKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isLegacyKey(key)) {
      legacyKeys.push(key);
    }
  }

  if (legacyKeys.length === 0) return;

  const migrated: ThreadMeta[] = [];
  for (const key of legacyKeys) {
    const date = key.replace(LEGACY_PREFIX, '');
    const raw = safeRead<any[]>(key, []);
    if (raw.length === 0) continue;
    const threadId = crypto.randomUUID();
    const messages: ChatMessage[] = raw.map((m: any, i: number) => ({
      id: `msg_${threadId}_${i}`,
      role: m.role,
      content: m.content,
      parsed: m.parsed_json ? JSON.parse(m.parsed_json) : { nodes: [], refs: {}, blocks: [], raw: m.content },
      timestamp: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
    }));
    safeWrite(`${THREAD_PREFIX}${threadId}`, messages);
    safeDelete(key);
    migrated.push({
      id: threadId,
      title: date,
      createdAt: messages[0]?.timestamp ?? Date.now(),
      updatedAt: messages[messages.length - 1]?.timestamp ?? Date.now(),
      messageCount: messages.length,
    });
  }

  migrated.sort((a, b) => b.updatedAt - a.updatedAt);
  saveIndex(migrated);

  if (migrated.length > 0) {
    safeWrite(ACTIVE_KEY, migrated[0].id);
  }
}

function enforceCap(): void {
  const index = getIndex();
  if (index.length <= MAX_THREADS) return;
  const sorted = [...index].sort((a, b) => b.updatedAt - a.updatedAt);
  const toRemove = sorted.slice(MAX_THREADS);
  for (const t of toRemove) {
    safeDelete(`${THREAD_PREFIX}${t.id}`);
  }
  saveIndex(sorted.slice(0, MAX_THREADS));
}

export function loadThreads(): ThreadMeta[] {
  migrateLegacyIfNeeded();
  return getIndex();
}

export function loadActiveThreadId(): string | null {
  migrateLegacyIfNeeded();
  return safeRead<string | null>(ACTIVE_KEY, null);
}

export function loadThread(id: string): ChatMessage[] {
  return safeRead<ChatMessage[]>(`${THREAD_PREFIX}${id}`, []);
}

const SAVE_DEBOUNCE_MS = 300;
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function saveThread(threadId: string, messages: ChatMessage[], title?: string): void {
  if (saveTimers.has(threadId)) {
    clearTimeout(saveTimers.get(threadId)!);
  }
  saveTimers.set(threadId, setTimeout(() => {
    saveTimers.delete(threadId);
    safeWrite(`${THREAD_PREFIX}${threadId}`, messages);

    const index = getIndex();
    const existing = index.find(t => t.id === threadId);
    if (existing) {
      existing.updatedAt = Date.now();
      existing.messageCount = messages.length;
      if (title) existing.title = title;
    } else {
      index.push({
        id: threadId,
        title: title ?? messages[0]?.content?.slice(0, 60) ?? 'New chat',
        createdAt: messages[0]?.timestamp ?? Date.now(),
        updatedAt: Date.now(),
        messageCount: messages.length,
      });
    }

    index.sort((a, b) => b.updatedAt - a.updatedAt);
    saveIndex(index);
    enforceCap();
  }, SAVE_DEBOUNCE_MS));
}

export function createThread(messages: ChatMessage[], title?: string): string {
  const threadId = crypto.randomUUID();
  safeWrite(`${THREAD_PREFIX}${threadId}`, messages);
  const index = getIndex();
  index.push({
    id: threadId,
    title: title ?? messages[0]?.content?.slice(0, 60) ?? 'New chat',
    createdAt: messages[0]?.timestamp ?? Date.now(),
    updatedAt: Date.now(),
    messageCount: messages.length,
  });
  index.sort((a, b) => b.updatedAt - a.updatedAt);
  saveIndex(index);
  safeWrite(ACTIVE_KEY, threadId);
  enforceCap();
  return threadId;
}

export function resetThread(threadId: string): void {
  safeWrite(`${THREAD_PREFIX}${threadId}`, []);
  const index = getIndex();
  const existing = index.find(t => t.id === threadId);
  if (existing) {
    existing.updatedAt = Date.now();
    existing.messageCount = 0;
    saveIndex(index);
  }
}

export function renameThread(threadId: string, newTitle: string): void {
  const index = getIndex();
  const existing = index.find(t => t.id === threadId);
  if (existing) {
    existing.title = newTitle;
    existing.updatedAt = Date.now();
    saveIndex(index);
  }
}

export function setActiveThread(threadId: string): void {
  safeWrite(ACTIVE_KEY, threadId);
}

export function getTitleSuggestion(messages: ChatMessage[]): string {
  if (messages.length === 0) return 'New chat';
  const firstUser = messages.find(m => m.role === 'user');
  if (firstUser) return firstUser.content.slice(0, 60);
  return `Chat ${new Date().toLocaleDateString()}`;
}
