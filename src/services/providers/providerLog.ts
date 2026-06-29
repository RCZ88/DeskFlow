export interface ProviderCallRecord {
  id: string;
  ts: number;
  path: 'A-digest' | 'A-test' | 'B-chat';
  provider: string;
  model: string;
  request: { url: string; method: string; headers: Record<string, string>; body: unknown };
  response?: { status: number; headers: Record<string, string>; body: unknown };
  error?: { status?: number; message: string; raw?: string };
  parse?: { ok: boolean; extracted?: string; discarded?: string };
  durationMs?: number;
  streamed?: boolean;
}

const RING: ProviderCallRecord[] = [];
const MAX = 50;

export function pushDiag(rec: ProviderCallRecord): void {
  RING.push(rec);
  while (RING.length > MAX) RING.shift();
}

export function getDiagnostics(): ProviderCallRecord[] {
  return [...RING].reverse();
}

export function clearDiagnostics(): void {
  RING.length = 0;
}

export function maskKey(v?: string): string {
  if (!v) return '';
  const s = String(v);
  return s.length <= 12 ? s : s.slice(0, 12) + '…(+' + (s.length - 12) + ')';
}

const SENSITIVE = /(authorization|api[-_]?key|x-api-key|token|bearer)/i;

export function maskHeaders(h: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(h)) out[k] = SENSITIVE.test(k) ? maskKey(h[k]) : h[k];
  return out;
}
