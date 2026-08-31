import { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type {
  SelectionTool,
  SelectionState,
  SelectionContextValue,
  SelectionResult,
  Point,
  ElementInfo,
} from './types';

type Action =
  | { type: 'ACTIVATE' }
  | { type: 'DEACTIVATE' }
  | { type: 'SET_TOOL'; tool: SelectionTool }
  | { type: 'START_DRAWING'; point: Point }
  | { type: 'UPDATE_DRAWING'; point: Point }
  | { type: 'END_DRAWING' }
  | { type: 'CANCEL_DRAWING' }
  | { type: 'ADD_SELECTION'; result: SelectionResult }
  | { type: 'REMOVE_SELECTION'; id: string }
  | { type: 'CLEAR_SELECTIONS' }
  | { type: 'SET_HOVERED_ELEMENT'; element: ElementInfo | null }
  | { type: 'SET_HIGHLIGHT_RECT'; rect: DOMRect | null };

const initialState: SelectionState = {
  isActive: false,
  activeTool: 'rectangle',
  isDrawing: false,
  currentPath: [],
  currentRect: null,
  hoveredElement: null,
  highlightRect: null,
  selections: [],
  lastResult: null,
};

function reducer(state: SelectionState, action: Action): SelectionState {
  switch (action.type) {
    case 'ACTIVATE':
      return { ...state, isActive: true };
    case 'DEACTIVATE':
      return { ...state, isActive: false, isDrawing: false, currentPath: [], currentRect: null, hoveredElement: null, highlightRect: null };
    case 'SET_TOOL':
      return { ...state, activeTool: action.tool, isDrawing: false, currentPath: [], currentRect: null };
    case 'START_DRAWING':
      return { ...state, isDrawing: true, currentPath: [action.point], currentRect: { x: action.point.x, y: action.point.y, width: 0, height: 0 } };
    case 'UPDATE_DRAWING': {
      if (!state.isDrawing) return state;
      if (state.activeTool === 'freehand') {
        return { ...state, currentPath: [...state.currentPath, action.point] };
      }
      if (state.currentPath.length > 0) {
        const start = state.currentPath[0];
        return {
          ...state,
          currentRect: {
            x: Math.min(start.x, action.point.x),
            y: Math.min(start.y, action.point.y),
            width: Math.abs(action.point.x - start.x),
            height: Math.abs(action.point.y - start.y),
          },
        };
      }
      return state;
    }
    case 'END_DRAWING':
      return { ...state, isDrawing: false };
    case 'CANCEL_DRAWING':
      return { ...state, isDrawing: false, currentPath: [], currentRect: null };
    case 'ADD_SELECTION':
      return {
        ...state,
        selections: [...state.selections, action.result],
        lastResult: action.result,
        currentPath: [],
        currentRect: null,
        isDrawing: false,
      };
    case 'REMOVE_SELECTION':
      return { ...state, selections: state.selections.filter(s => s.id !== action.id) };
    case 'CLEAR_SELECTIONS':
      return { ...state, selections: [], lastResult: null };
    case 'SET_HOVERED_ELEMENT':
      return { ...state, hoveredElement: action.element };
    case 'SET_HIGHLIGHT_RECT':
      return { ...state, highlightRect: action.rect };
    default:
      return state;
  }
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function useSelectionEngine(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error('useSelectionEngine must be used within SelectionProvider');
  return ctx;
}

let selectionCounter = 0;

export function SelectionProvider({
  children,
  onSelectionComplete,
}: {
  children: ReactNode;
  onSelectionComplete?: (result: SelectionResult) => void;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const callbackRef = useRef(onSelectionComplete);
  callbackRef.current = onSelectionComplete;

  const activate = useCallback(() => dispatch({ type: 'ACTIVATE' }), []);
  const deactivate = useCallback(() => dispatch({ type: 'DEACTIVATE' }), []);
  const setTool = useCallback((tool: SelectionTool) => dispatch({ type: 'SET_TOOL', tool }), []);
  const startDrawing = useCallback((point: Point) => dispatch({ type: 'START_DRAWING', point }), []);
  const updateDrawing = useCallback((point: Point) => dispatch({ type: 'UPDATE_DRAWING', point }), []);
  const endDrawing = useCallback(() => dispatch({ type: 'END_DRAWING' }), []);
  const cancelDrawing = useCallback(() => dispatch({ type: 'CANCEL_DRAWING' }), []);

  const addSelection = useCallback((result: SelectionResult) => {
    dispatch({ type: 'ADD_SELECTION', result });
    callbackRef.current?.(result);
  }, []);

  const removeSelection = useCallback((id: string) => dispatch({ type: 'REMOVE_SELECTION', id }), []);
  const clearSelections = useCallback(() => dispatch({ type: 'CLEAR_SELECTIONS' }), []);
  const setHoveredElement = useCallback((element: ElementInfo | null) => dispatch({ type: 'SET_HOVERED_ELEMENT', element }), []);
  const setHighlightRect = useCallback((rect: DOMRect | null) => dispatch({ type: 'SET_HIGHLIGHT_RECT', rect }), []);

  const value: SelectionContextValue = {
    ...state,
    activate,
    deactivate,
    setTool,
    startDrawing,
    updateDrawing,
    endDrawing,
    cancelDrawing,
    addSelection,
    removeSelection,
    clearSelections,
    setHoveredElement,
    setHighlightRect,
    onSelectionComplete: callbackRef.current,
  };

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function generateSelectionId(): string {
  return `sel_${Date.now()}_${++selectionCounter}`;
}
