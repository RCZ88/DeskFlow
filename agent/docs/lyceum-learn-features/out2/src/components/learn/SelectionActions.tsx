// SelectionActions — the floating pill that appears when the learner selects text
// inside a lesson node. This is the enhanced version of SelectionFloatingPill: it
// keeps the four tutor modes (explain / ask / simpler / deeper) AND adds the
// highlight + save-to-notes actions, because selection and highlighting are the
// same gesture.
//
// HOW SELECTION WORKS (this was the confusing part — see RESULT.md for the full
// writeup): on mouseup we read window.getSelection(). If it is a non-empty range
// INSIDE our content root and within the length bounds, we measure its bounding
// rect and position the pill just above it. Picking a tutor mode passes the exact
// selected text to the tutor; picking a color hands the live Range to useHighlights,
// which converts it into a durable text-quote anchor.

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import type { HighlightColor } from './useHighlights';

export type TutorMode = 'explain' | 'ask' | 'simpler' | 'deeper';

export interface SelectionActionsProps {
  /** The scroll/content container that holds the lesson node text. */
  rootRef: React.RefObject<HTMLElement>;
  /** Ask the tutor about the current selection. */
  onAsk: (text: string, mode: TutorMode) => void;
  /** Highlight the current selection in a color. Receives the live Range. */
  onHighlight: (range: Range, color: HighlightColor) => void;
  /** Optional: save the selection to notes. */
  onSaveNote?: (text: string, range: Range) => void;
  minLen?: number;
  maxLen?: number;
}

interface PillState {
  text: string;
  x: number;
  y: number;
}

const MODES: { id: TutorMode; label: string; icon: string }[] = [
  { id: 'explain', label: 'Explain', icon: '💡' },
  { id: 'simpler', label: 'Simpler', icon: '🧭' },
  { id: 'deeper', label: 'Deeper', icon: '🔬' },
  { id: 'ask', label: 'Ask', icon: '💬' },
];

function swatchStyle(color: string): React.CSSProperties {
  return { backgroundColor: color };
}

const COLORS: { id: HighlightColor; swatch: string }[] = [
  { id: 'amber', swatch: '#fbbf24' },
  { id: 'clay', swatch: '#e8866b' },
  { id: 'sage', swatch: '#6fb38f' },
  { id: 'sky', swatch: '#5ab0c9' },
];

export function SelectionActions({
  rootRef,
  onAsk,
  onHighlight,
  onSaveNote,
  minLen = 2,
  maxLen = 500,
}: SelectionActionsProps) {
  const [pill, setPill] = useState<PillState | null>(null);
  const rangeRef = useRef<Range | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setPill(null);
    rangeRef.current = null;
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onMouseUp = (e: MouseEvent) => {
      // Ignore clicks that originate inside the pill itself.
      if (pillRef.current && pillRef.current.contains(e.target as Node)) return;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        close();
        return;
      }
      const range = sel.getRangeAt(0);
      const text = range.toString().trim();
      if (text.length < minLen || text.length > maxLen) {
        close();
        return;
      }
      // Selection must be inside our content root.
      if (!root.contains(range.commonAncestorContainer)) {
        close();
        return;
      }
      const rect = range.getBoundingClientRect();
      rangeRef.current = range.cloneRange();
      setPill({
        text,
        x: rect.left + rect.width / 2,
        y: Math.max(8, rect.top - 8),
      });
    };

    const onScroll = () => close();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('mouseup', onMouseUp);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [rootRef, minLen, maxLen, close]);

  if (!pill) return null;

  const handleMode = (mode: TutorMode) => {
    onAsk(pill.text, mode);
    close();
  };

  const handleColor = (color: HighlightColor) => {
    const range = rangeRef.current;
    if (range) onHighlight(range, color);
    window.getSelection()?.removeAllRanges();
    close();
  };

  const handleNote = () => {
    const range = rangeRef.current;
    if (range && onSaveNote) onSaveNote(pill.text, range);
    close();
  };

  const pillStyle: React.CSSProperties = {
    left: pill.x,
    top: pill.y,
    transform: 'translate(-50%, -100%)',
  };

  return (
    <div
      ref={pillRef}
      role="toolbar"
      aria-label="Selection actions"
      className="lyceum-selection-pill glass-heavy"
      style={pillStyle}
    >
      <div className="lyceum-selection-modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className="lyceum-selection-btn"
            onClick={() => handleMode(m.id)}
            title={`${m.label} this selection`}
          >
            <span aria-hidden="true">{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>
      <div className="lyceum-selection-divider" aria-hidden="true" />
      <div className="lyceum-selection-colors">
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            className="lyceum-selection-swatch"
            style={swatchStyle(c.swatch)}
            onClick={() => handleColor(c.id)}
            title={`Highlight (${c.id})`}
            aria-label={`Highlight ${c.id}`}
          />
        ))}
        {onSaveNote ? (
          <button
            type="button"
            className={cn('lyceum-selection-btn', 'lyceum-selection-note')}
            onClick={handleNote}
            title="Save to notes"
          >
            <span aria-hidden="true">📌</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
