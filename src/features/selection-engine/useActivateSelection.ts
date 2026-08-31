import { useCallback } from 'react';
import { useSelectionEngine } from './SelectionContext';
import type { SelectionTool } from './types';

export function useActivateSelection(tool: SelectionTool = 'rectangle') {
  const { activate, setTool, isActive } = useSelectionEngine();
  return useCallback(() => {
    if (!isActive) {
      setTool(tool);
      activate();
    }
  }, [activate, setTool, isActive, tool]);
}
