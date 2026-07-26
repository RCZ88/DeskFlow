export interface Highlight {
  id: string;
  lessonId: string;
  partSlug: string;
  text: string;
  note?: string;
  color: 'yellow' | 'green' | 'blue' | 'pink' | 'orange';
  createdAt: number;
  startOffset: number;
  endOffset: number;
}

export interface HighlightGroup {
  lessonId: string;
  partSlug: string;
  highlights: Highlight[];
}

const STORAGE_KEY = 'lyceum-highlights';

function loadAll(): Record<string, Highlight> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Highlight>;
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, Highlight>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota exceeded — silent */
  }
}

export function getHighlightsForLesson(lessonId: string): Highlight[] {
  const map = loadAll();
  return Object.values(map).filter((h) => h.lessonId === lessonId);
}

export function getHighlightsForPart(partSlug: string): Highlight[] {
  const map = loadAll();
  return Object.values(map).filter((h) => h.partSlug === partSlug);
}

export function addHighlight(h: Omit<Highlight, 'id' | 'createdAt'>): Highlight {
  const map = loadAll();
  const id = `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const highlight: Highlight = { ...h, id, createdAt: Date.now() };
  map[id] = highlight;
  saveAll(map);
  return highlight;
}

export function updateHighlight(
  id: string,
  patch: Partial<Pick<Highlight, 'note' | 'color'>>,
): Highlight | null {
  const map = loadAll();
  const existing = map[id];
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  map[id] = updated;
  saveAll(map);
  return updated;
}

export function removeHighlight(id: string): boolean {
  const map = loadAll();
  if (!map[id]) return false;
  delete map[id];
  saveAll(map);
  return true;
}

export function clearHighlightsForLesson(lessonId: string): void {
  const map = loadAll();
  const toRemove = Object.keys(map).filter((k) => map[k].lessonId === lessonId);
  toRemove.forEach((k) => delete map[k]);
  saveAll(map);
}

export function exportHighlights(): Highlight[] {
  const map = loadAll();
  return Object.values(map).sort((a, b) => b.createdAt - a.createdAt);
}

export function importHighlights(highlights: Highlight[]): number {
  const map = loadAll();
  let count = 0;
  for (const h of highlights) {
    if (!map[h.id]) {
      map[h.id] = h;
      count++;
    }
  }
  saveAll(map);
  return count;
}
