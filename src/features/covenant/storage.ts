import type { Commitment, DayCompletion, DayViolation, JournalEntry } from './types';

const COMMITMENTS_KEY = 'deskflow.covenant.commitments.v1';
const COMPLETIONS_KEY = 'deskflow.covenant.completions.v1';
const VIOLATIONS_KEY = 'deskflow.covenant.violations.v1';
const JOURNAL_KEY = 'deskflow.covenant.journal.v1';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadCommitments(): Commitment[] {
  return readJSON<Commitment[]>(COMMITMENTS_KEY, []);
}

export function saveCommitments(list: Commitment[]) {
  writeJSON(COMMITMENTS_KEY, list);
}

export function loadCompletions(): DayCompletion[] {
  return readJSON<DayCompletion[]>(COMPLETIONS_KEY, []);
}

export function saveCompletions(list: DayCompletion[]) {
  writeJSON(COMPLETIONS_KEY, list);
}

export function loadViolations(): DayViolation[] {
  return readJSON<DayViolation[]>(VIOLATIONS_KEY, []);
}

export function saveViolations(list: DayViolation[]) {
  writeJSON(VIOLATIONS_KEY, list);
}

export function loadJournal(): JournalEntry[] {
  return readJSON<JournalEntry[]>(JOURNAL_KEY, []);
}

export function saveJournal(list: JournalEntry[]) {
  writeJSON(JOURNAL_KEY, list);
}

export function todayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}
