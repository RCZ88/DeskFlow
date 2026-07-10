import { DEFAULT_PROFILE, PROFILE_KNOBS } from '../../shared/learn/types';
import type { LearnerProfile, ProfileKnob, MasteryLevel } from '../../shared/learn/types';

const KEY = 'lyceum.learnerProfile.v1';
const SETUP_COMPLETE_KEY = 'lyceum.setupComplete.v1';

const api = window.deskflowAPI;

export function isSetupComplete(): boolean {
  try {
    return localStorage.getItem(SETUP_COMPLETE_KEY) === 'true';
  } catch { return false; }
}

export function markSetupComplete(): void {
  try {
    localStorage.setItem(SETUP_COMPLETE_KEY, 'true');
  } catch { /* ignore */ }
}

export function clearSetupComplete(): void {
  try {
    localStorage.removeItem(SETUP_COMPLETE_KEY);
  } catch { /* ignore */ }
}

export function hasProfile(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    return raw != null;
  } catch { return false; }
}

export function loadProfile(): LearnerProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE, ...parsed,
      confidence: { ...DEFAULT_PROFILE.confidence, ...(parsed.confidence ?? {}) },
      priorKnowledge: { ...(parsed.priorKnowledge ?? {}) },
      version: 1,
    };
  } catch { return { ...DEFAULT_PROFILE }; }
}

export function saveProfile(p: LearnerProfile): LearnerProfile {
  const next = { ...p, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('[LearnerProfile] localStorage write failed:', e);
  }
  // Also persist to DB (fire-and-forget)
  if (api?.learnSetProfile) {
    api.learnSetProfile({ key: KEY, value: JSON.stringify(next) }).catch((e) => {
      console.warn('[LearnerProfile] DB write failed:', e);
    });
  }
  window.dispatchEvent(new CustomEvent('lyceum:profile-changed', { detail: next }));
  return next;
}

export function updateKnob<K extends ProfileKnob>(
  knob: K, value: LearnerProfile[K], confidence?: number,
): LearnerProfile {
  const p = loadProfile();
  (p as any)[knob] = value;
  if (confidence != null) p.confidence[knob] = Math.max(0, Math.min(1, confidence));
  return saveProfile(p);
}

export function setPriorKnowledge(part: number, level: MasteryLevel): LearnerProfile {
  const p = loadProfile(); p.priorKnowledge[part] = level; return saveProfile(p);
}

export function getPartMastery(part: number): MasteryLevel | undefined {
  return loadProfile().priorKnowledge[part];
}

export function resetProfile(): void {
  localStorage.removeItem(KEY);
  clearSetupComplete();
  if (api?.learnDeleteProfile) {
    api.learnDeleteProfile({ key: KEY }).catch(() => {});
  }
  window.dispatchEvent(new CustomEvent('lyceum:profile-changed', { detail: null }));
}

// Sync from DB to localStorage on startup (DB is source of truth)
export async function syncProfileFromDB(): Promise<void> {
  if (!api?.learnGetProfile) return;
  try {
    const dbRaw = await api.learnGetProfile({ key: KEY });
    if (dbRaw) {
      const localRaw = localStorage.getItem(KEY);
      const dbParsed = JSON.parse(dbRaw);
      const localParsed = localRaw ? JSON.parse(localRaw) : null;
      // Use DB version if it's newer or localStorage is empty
      if (!localParsed || (dbParsed.updatedAt && localParsed.updatedAt && dbParsed.updatedAt > localParsed.updatedAt)) {
        localStorage.setItem(KEY, dbRaw);
        window.dispatchEvent(new CustomEvent('lyceum:profile-changed', { detail: dbParsed }));
      }
    }
  } catch { /* ignore sync errors */ }
}
