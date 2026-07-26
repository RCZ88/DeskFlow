import { useState, useCallback, useEffect } from 'react';
import type { Highlight } from '../../services/learn/highlightAnchor';
import {
  getHighlightsForLesson,
  addHighlight,
  updateHighlight,
  removeHighlight,
} from '../../services/learn/highlightAnchor';

interface UseHighlightsOptions {
  lessonId: string;
  partSlug: string;
}

export function useHighlights({ lessonId, partSlug }: UseHighlightsOptions) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  const refresh = useCallback(() => {
    setHighlights(getHighlightsForLesson(lessonId));
  }, [lessonId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createHighlight = useCallback(
    (text: string, startOffset: number, endOffset: number, color: Highlight['color'] = 'yellow') => {
      const h = addHighlight({
        lessonId,
        partSlug,
        text,
        color,
        startOffset,
        endOffset,
      });
      setHighlights((prev) => [...prev, h]);
      return h;
    },
    [lessonId, partSlug],
  );

  const editNote = useCallback(
    (id: string, note: string) => {
      const updated = updateHighlight(id, { note });
      if (updated) {
        setHighlights((prev) => prev.map((h) => (h.id === id ? updated : h)));
      }
    },
    [],
  );

  const changeColor = useCallback(
    (id: string, color: Highlight['color']) => {
      const updated = updateHighlight(id, { color });
      if (updated) {
        setHighlights((prev) => prev.map((h) => (h.id === id ? updated : h)));
      }
    },
    [],
  );

  const deleteHighlight = useCallback(
    (id: string) => {
      removeHighlight(id);
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    },
    [],
  );

  return {
    highlights,
    isSelecting,
    setIsSelecting,
    createHighlight,
    editNote,
    changeColor,
    deleteHighlight,
  };
}
