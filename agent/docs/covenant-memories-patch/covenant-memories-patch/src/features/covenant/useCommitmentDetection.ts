import { useEffect, useRef } from 'react';
import type { Commitment } from './types';
import { todayStr } from './storage';

// Optional, opt-in hook that reuses DeskFlow's existing foreground-app
// monitoring bridge (window.deskflowAPI.onForegroundChange /
// getCurrentForeground -- see src/types/deskflow-api.d.ts) so a commitment
// like "practice guitar" or "read" can be auto-detected instead of requiring
// a manual tap, if the user opts in and configures keywords. Nothing new is
// added to the monitoring system itself -- this only reads from it.
//
// Tracks accumulated matched-foreground minutes per commitment per day, in
// memory plus a small localStorage mirror so it survives a page reload
// within the same day.

const PROGRESS_KEY = 'deskflow.covenant.detectionProgress.v1';

type ProgressMap = Record<string, { date: string; seconds: number }>;

function loadProgress(): ProgressMap {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveProgress(p: ProgressMap) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

function matches(commitment: Commitment, foregroundLabel: string): boolean {
  if (!commitment.detection.enabled || commitment.detection.keywords.length === 0) return false;
  const label = foregroundLabel.toLowerCase();
  return commitment.detection.keywords.some(k => k.trim() && label.includes(k.trim().toLowerCase()));
}

export function useCommitmentDetection(
  commitments: Commitment[],
  onAutoSatisfied: (commitmentId: string) => void,
) {
  const progressRef = useRef<ProgressMap>(loadProgress());
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    const api = (window as any).deskflowAPI;
    if (!api?.onForegroundChange) return; // graceful no-op outside Electron (e.g. web preview)

    const today = todayStr();

    const tick = (label: string) => {
      const now = Date.now();
      const elapsedSec = Math.min(60, Math.max(0, (now - lastTickRef.current) / 1000));
      lastTickRef.current = now;
      if (!label) return;

      let changed = false;
      for (const c of commitments) {
        if (!matches(c, label)) continue;
        const key = `${c.id}:${today}`;
        const prev = progressRef.current[key];
        const seconds = (prev && prev.date === today ? prev.seconds : 0) + elapsedSec;
        progressRef.current[key] = { date: today, seconds };
        changed = true;
        if (seconds >= c.detection.minMinutes * 60) {
          onAutoSatisfied(c.id);
        }
      }
      if (changed) saveProgress(progressRef.current);
    };

    const off = api.onForegroundChange((data: any) => {
      const label = [data?.app, data?.title, data?.domain].filter(Boolean).join(' ');
      tick(label);
    });

    return () => { off?.(); };
  }, [commitments, onAutoSatisfied]);
}
