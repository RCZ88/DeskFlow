// useHighlights — persistent, re-render-safe highlights for one lesson node.
//
// Stores HighlightAnchors (text-quote anchors, see services/learn/highlightAnchor.ts),
// NOT DOM ranges, so highlights survive streaming tutor answers, revealed layers,
// and reloads. Re-applies them by wrapping matched text in <mark> elements after
// every render. Persists to localStorage keyed by node id (swap for an IPC call to
// the main process if you want them in SQLite — the shape is identical).

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type HighlightAnchor,
  anchorId,
  anchorToRange,
  serializeRange,
} from '../../services/learn/highlightAnchor';

export type HighlightColor = 'amber' | 'clay' | 'sage' | 'sky';

export interface StoredHighlight {
  id: string;
  color: HighlightColor;
  anchor: HighlightAnchor;
  note?: string;
  createdAt: number;
}

function storageKey(nodeId: string): string {
  return `lyceum:highlights:${nodeId}`;
}

function load(nodeId: string): StoredHighlight[] {
  try {
    const raw = localStorage.getItem(storageKey(nodeId));
    return raw ? (JSON.parse(raw) as StoredHighlight[]) : [];
  } catch {
    return [];
  }
}

function save(nodeId: string, items: StoredHighlight[]): void {
  try {
    localStorage.setItem(storageKey(nodeId), JSON.stringify(items));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export interface UseHighlightsResult {
  highlights: StoredHighlight[];
  /** Persist a highlight from a live selection Range. Returns the new id, or null. */
  addFromRange: (range: Range, color: HighlightColor, note?: string) => string | null;
  removeHighlight: (id: string) => void;
  setNote: (id: string, note: string) => void;
  clearAll: () => void;
}

const MARK_CLASS = 'lyceum-hl';

export function useHighlights(
  nodeId: string,
  rootRef: React.RefObject<HTMLElement>,
): UseHighlightsResult {
  const [highlights, setHighlights] = useState<StoredHighlight[]>(() => load(nodeId));
  const rafRef = useRef<number | null>(null);

  // Reload when the node changes.
  useEffect(() => {
    setHighlights(load(nodeId));
  }, [nodeId]);

  // Persist on change.
  useEffect(() => {
    save(nodeId, highlights);
  }, [nodeId, highlights]);

  const addFromRange = useCallback(
    (range: Range, color: HighlightColor, note?: string): string | null => {
      const root = rootRef.current;
      if (!root) return null;
      const anchor = serializeRange(root, range);
      if (!anchor) return null;
      const id = anchorId(nodeId, anchor);
      setHighlights((prev) => {
        if (prev.some((h) => h.id === id)) return prev;
        return [...prev, { id, color, anchor, note, createdAt: Date.now() }];
      });
      return id;
    },
    [nodeId, rootRef],
  );

  const removeHighlight = useCallback((id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const setNote = useCallback((id: string, note: string) => {
    setHighlights((prev) => prev.map((h) => (h.id === id ? { ...h, note } : h)));
  }, []);

  const clearAll = useCallback(() => setHighlights([]), []);

  // Paint highlights into the DOM after every render of the content root.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const paint = () => {
      // Remove previous marks (unwrap them) to avoid double-wrapping.
      root.querySelectorAll(`mark.${MARK_CLASS}`).forEach((m) => {
        const parent = m.parentNode;
        if (!parent) return;
        while (m.firstChild) parent.insertBefore(m.firstChild, m);
        parent.removeChild(m);
        parent.normalize();
      });

      for (const h of highlights) {
        const range = anchorToRange(root, h.anchor);
        if (!range) continue;
        try {
          const mark = document.createElement('mark');
          mark.className = `${MARK_CLASS} ${MARK_CLASS}-${h.color}`;
          mark.dataset.hlId = h.id;
          if (h.note) mark.title = h.note;
          range.surroundContents(mark);
        } catch {
          // surroundContents throws if the range spans multiple block elements;
          // skip those rather than corrupt the DOM.
        }
      }
    };

    // Debounce paints to the next frame so we run after React commits.
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(paint);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [highlights, rootRef]);

  return { highlights, addFromRange, removeHighlight, setNote, clearAll };
}
