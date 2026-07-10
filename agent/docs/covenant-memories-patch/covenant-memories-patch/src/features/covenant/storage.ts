import type { Commitment, DayCompletion, JournalEntry } from './types';

// All state for this module lives in localStorage, namespaced under
// deskflow.covenant.*. This is a deliberate choice: the shipped DeskFlow
// codebase (as attached) does not include the Electron main-process source,
// only the renderer, so this module cannot safely wire brand-new IPC/SQLite
// tables sight-unseen. localStorage keeps the feature fully local (satisfies
// the privacy requirement trivially) and fully working without touching
// main-process code you haven't shared. If/when you want this backed by the
// real SQLite db, the storage functions below are the only file that needs
// to change -- everything else calls these functions, not localStorage directly.

const COMMITMENTS_KEY = 'deskflow.covenant.commitments.v1';
const COMPLETIONS_KEY = 'deskflow.covenant.completions.v1';
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
