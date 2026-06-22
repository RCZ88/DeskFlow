import { useCallback } from 'react';

const STORAGE_KEY = 'finance-tx-prefs';

interface TxPrefs {
  lastType: string;
  lastCategoryId: number | null;
}

type StoredPrefs = Record<string, TxPrefs>;

function loadPrefs(): StoredPrefs {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function savePrefs(walletType: string, prefs: TxPrefs) {
  const all = loadPrefs();
  all[walletType] = prefs;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Get the last-used type for a wallet type. Returns undefined if not set. */
export function getLastType(walletType: string): string | undefined {
  return loadPrefs()[walletType]?.lastType;
}

/** Get the last-used category ID for a wallet type. Returns null if not set. */
export function getLastCategoryId(walletType: string): number | null {
  return loadPrefs()[walletType]?.lastCategoryId ?? null;
}

/** Save the user's last-used preferences for a wallet type. */
export function saveLastTxPrefs(walletType: string, type: string, categoryId: number | null) {
  savePrefs(walletType, { lastType: type, lastCategoryId: categoryId });
}
