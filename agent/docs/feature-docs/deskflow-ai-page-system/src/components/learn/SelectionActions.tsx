import { useCallback, useEffect, useRef, useState } from 'react';
import { Highlighter, StickyNote, Trash2, Palette, Lightbulb, MessageSquare, Search, ArrowRight } from 'lucide-react';
import type { Highlight } from '../../services/learn/highlightAnchor';

const HIGHLIGHT_COLORS: { value: Highlight['color']; label: string; css: string }[] = [
  { value: 'yellow', label: 'Yellow', css: '#eab308' },
  { value: 'green', label: 'Green', css: '#22c55e' },
  { value: 'blue', label: 'Blue', css: '#3b82f6' },
  { value: 'pink', label: 'Pink', css: '#ec4899' },
  { value: 'orange', label: 'Orange', css: '#f97316' },
];

const TUTOR_MODES = [
  { key: 'explain' as const, label: 'Explain', icon: Lightbulb },
  { key: 'ask' as const, label: 'Ask…', icon: MessageSquare },
  { key: 'simpler' as const, label: 'Simpler', icon: Search },
  { key: 'deeper' as const, label: 'Deeper', icon: ArrowRight },
];

interface SelectionActionsProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onCreateHighlight: (text: string, startOffset: number, endOffset: number, color: Highlight['color']) => void;
  onCreateNote: (text: string, startOffset: number, endOffset: number) => void;
  onDeleteHighlight?: (id: string) => void;
  selectedHighlightId?: string | null;
  onAskTutor?: (text: string, mode: 'explain' | 'ask' | 'simpler' | 'deeper') => void;
  isSelecting?: boolean;
}

export function SelectionActions({
  containerRef,
  onCreateHighlight,
  onCreateNote,
  onDeleteHighlight,
  selectedHighlightId,
  onAskTutor,
}: SelectionActionsProps) {
  const [selection, setSelection] = useState<{
    text: string;
    rect: DOMRect;
    startOffset: number;
    endOffset: number;
  } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const getTextOffset = useCallback(
    (node: Node, offset: number): number => {
      if (node === containerRef.current) return offset;
      let total = 0;
      const walk = (n: Node): boolean => {
        if (n === node) {
          total += offset;
          return true;
        }
        if (n.nodeType === Node.TEXT_NODE) {
          total += (n.textContent ?? '').length;
        } else {
          for (let i = 0; i < n.childNodes.length; i++) {
            if (walk(n.childNodes[i])) return true;
          }
        }
        return false;
      };
      if (containerRef.current) walk(containerRef.current);
      return total;
    },
    [containerRef],
  );

  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount || !containerRef.current) {
        setSelection(null);
        setShowColorPicker(false);
        return;
      }

      const range = sel.getRangeAt(0);
      const text = sel.toString().trim();
      if (!text || text.length > 500 || !containerRef.current.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      const startOffset = getTextOffset(range.startContainer, range.startOffset);
      const endOffset = getTextOffset(range.endContainer, range.endOffset);

      setSelection({ text, rect, startOffset, endOffset });
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [containerRef, getTextOffset]);

  const handleHighlight = useCallback(
    (color: Highlight['color']) => {
      if (!selection) return;
      onCreateHighlight(selection.text, selection.startOffset, selection.endOffset, color);
      window.getSelection()?.removeAllRanges();
      setSelection(null);
      setShowColorPicker(false);
    },
    [selection, onCreateHighlight],
  );

  const handleNote = useCallback(() => {
    if (!selection) return;
    onCreateNote(selection.text, selection.startOffset, selection.endOffset);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, [selection, onCreateNote]);

  const handleDeleteHighlight = useCallback(() => {
    if (!selectedHighlightId || !onDeleteHighlight) return;
    onDeleteHighlight(selectedHighlightId);
  }, [selectedHighlightId, onDeleteHighlight]);

  const handleTutorMode = useCallback((mode: 'explain' | 'ask' | 'simpler' | 'deeper') => {
    if (!selection || !onAskTutor) return;
    onAskTutor(selection.text, mode);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, [selection, onAskTutor]);

  if (!selection && !selectedHighlightId) return null;

  // Floating toolbar for new selection
  if (selection) {
    const viewportW = window.innerWidth;
    const toolbarW = onAskTutor ? 420 : 220;
    let left = selection.rect.left + selection.rect.width / 2 - toolbarW / 2;
    left = Math.max(8, Math.min(left, viewportW - toolbarW - 8));
    const top = selection.rect.top - 44;

    return (
      <div
        ref={toolbarRef}
        className="lyceum-selection-toolbar"
        style={{
          position: 'fixed',
          left: `${left}px`,
          top: `${Math.max(4, top)}px`,
          zIndex: 9999,
        }}
      >
        {showColorPicker ? (
          <div className="lyceum-selection-colors">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.value}
                className="lyceum-selection-color-btn"
                onClick={() => handleHighlight(c.value)}
                title={c.label}
                style={{ backgroundColor: c.css }}
                aria-label={`Highlight ${c.label}`}
              />
            ))}
            <button
              className="lyceum-selection-color-btn lyceum-selection-color-back"
              onClick={() => setShowColorPicker(false)}
              title="Back"
            >
              <Palette size={12} />
            </button>
          </div>
        ) : (
          <>
            {/* Tutor modes */}
            {onAskTutor && TUTOR_MODES.map((mode) => (
              <button
                key={mode.key}
                className="lyceum-selection-action"
                onClick={() => handleTutorMode(mode.key)}
                title={mode.label}
              >
                <mode.icon size={14} />
                <span className="text-[11px] font-medium ml-1">{mode.label}</span>
              </button>
            ))}
            <div className="w-px h-4 bg-zinc-700 mx-1" />
            {/* Highlight */}
            <button
              className="lyceum-selection-action"
              onClick={() => setShowColorPicker(true)}
              title="Highlight"
            >
              <Highlighter size={14} />
            </button>
            {/* Note */}
            <button
              className="lyceum-selection-action"
              onClick={handleNote}
              title="Add note"
            >
              <StickyNote size={14} />
            </button>
          </>
        )}
      </div>
    );
  }

  // Toolbar for existing highlight
  if (selectedHighlightId && onDeleteHighlight) {
    return (
      <div className="lyceum-selection-toolbar lyceum-selection-toolbar-existing">
        <button
          className="lyceum-selection-action lyceum-selection-action-delete"
          onClick={handleDeleteHighlight}
          title="Remove highlight"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  return null;
}
