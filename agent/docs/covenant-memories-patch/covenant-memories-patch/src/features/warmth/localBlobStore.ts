// Minimal local-only IndexedDB helper for binary content (photos, videos, voice notes).
// Nothing in this file ever leaves the device: no network calls, no analytics, no sync.
// This is intentionally the "lightest suitable addition" — DeskFlow has no existing
// local binary-storage primitive to extend, and localStorage is unsuitable for
// photo/video/audio payloads, so a tiny IndexedDB wrapper is the right-sized tool.

const DB_NAME = 'deskflow-warmth';
const DB_VERSION = 1;

export type BlobStoreName = 'memories' | 'voiceNotes';

export interface BlobRecord<TMeta = Record<string, unknown>> {
  id: string;
  blob: Blob;
  meta: TMeta;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('memories')) {
        db.createObjectStore('memories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('voiceNotes')) {
        db.createObjectStore('voiceNotes', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function putBlobRecord<TMeta>(store: BlobStoreName, record: BlobRecord<TMeta>): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getBlobRecord<TMeta>(store: BlobStoreName, id: string): Promise<BlobRecord<TMeta> | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result as BlobRecord<TMeta> | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function listBlobRecords<TMeta>(store: BlobStoreName): Promise<BlobRecord<TMeta>[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result || []) as BlobRecord<TMeta>[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBlobRecord(store: BlobStoreName, id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
