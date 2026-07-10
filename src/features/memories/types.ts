export type MemoryKind = 'photo' | 'video';

export interface MemoryItem {
  id: string;
  kind: MemoryKind;
  date: string;
  capturedAt: string;
  caption?: string;
  people: string[];
  createdAt: number;
  width?: number;
  height?: number;
  durationSec?: number;
}
