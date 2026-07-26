import { putBlobRecord, getBlobRecord, listBlobRecords, deleteBlobRecord } from '../warmth/localBlobStore';
import type { MemoryItem } from './types';

// All photo/video bytes live in IndexedDB on this device (see
// src/features/warmth/localBlobStore.ts) -- nothing is uploaded anywhere.
// The MemoryItem metadata is stored as the record's `meta` field so a single
// local store covers both the binary and its description.

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function addMemory(file: File, overrides: Partial<MemoryItem> = {}): Promise<MemoryItem> {
  const kind = file.type.startsWith('video/') ? 'video' : 'photo';
  const id = uid();
  const meta: MemoryItem = {
    id,
    kind,
    date: overrides.date || new Date().toISOString().slice(0, 10),
    caption: overrides.caption,
    people: overrides.people || [],
    createdAt: Date.now(),
  };
  await putBlobRecord('memories', { id, blob: file, meta, createdAt: meta.createdAt });
  return meta;
}

export async function updateMemoryMeta(id: string, patch: Partial<MemoryItem>): Promise<void> {
  const record = await getBlobRecord<MemoryItem>('memories', id);
  if (!record) return;
  const meta = { ...record.meta, ...patch };
  await putBlobRecord('memories', { ...record, meta });
}

export async function removeMemory(id: string): Promise<void> {
  await deleteBlobRecord('memories', id);
}

export async function listMemories(): Promise<{ meta: MemoryItem; blob: Blob }[]> {
  const records = await listBlobRecords<MemoryItem>('memories');
  return records
    .map(r => ({ meta: r.meta, blob: r.blob }))
    .sort((a, b) => (b.meta.date || '').localeCompare(a.meta.date || ''));
}

export async function getMemoryBlob(id: string): Promise<Blob | null> {
  const record = await getBlobRecord<MemoryItem>('memories', id);
  return record?.blob ?? null;
}
