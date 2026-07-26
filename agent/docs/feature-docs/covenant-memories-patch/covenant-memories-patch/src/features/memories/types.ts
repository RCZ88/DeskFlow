// A warm collage/timeline space for photos and videos celebrating
// relationships and life as a whole -- emotionally distinct from the rest of
// DeskFlow's productivity/analytics surface. Everything here is local media
// (see mediaStore.ts): no cloud sync, no analysis, just a place to keep what
// matters.

export type MemoryKind = 'photo' | 'video';

export interface MemoryItem {
  id: string;
  kind: MemoryKind;
  // YYYY-MM-DD the memory is *of* (user-editable; defaults to upload date)
  date: string;
  caption?: string;
  people: string[]; // freeform relationship/person tags, e.g. "Mom", "Sam"
  createdAt: number;
  width?: number;
  height?: number;
  durationSec?: number; // video only
}
