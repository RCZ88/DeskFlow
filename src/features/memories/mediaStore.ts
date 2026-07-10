import { putBlobRecord, getBlobRecord, listBlobRecords, deleteBlobRecord } from '../warmth/localBlobStore';
import type { MemoryItem } from './types';
import exifr from 'exifr';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function extractCaptureDate(file: File): Promise<string | null> {
  try {
    if (!file.type.startsWith('image/')) return null;
    const exif = await exifr.parse(file, ['DateTimeOriginal']);
    if (exif?.DateTimeOriginal) {
      const d = new Date(exif.DateTimeOriginal);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
  } catch {
    // EXIF parsing failed, fall back to current date
  }
  return null;
}

export async function addMemory(file: File, overrides: Partial<MemoryItem> = {}): Promise<MemoryItem> {
  const kind = file.type.startsWith('video/') ? 'video' : 'photo';
  const id = uid();
  const today = new Date().toISOString().slice(0, 10);
  const capturedAt = overrides.capturedAt || (await extractCaptureDate(file)) || today;
  const meta: MemoryItem = {
    id,
    kind,
    date: capturedAt,
    capturedAt,
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
