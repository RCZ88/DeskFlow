export interface Point {
  x: number;
  y: number;
}

export type SelectionTool = 'rectangle' | 'freehand' | 'element';

export interface ElementInfo {
  tagName: string;
  className: string;
  id: string;
  xpath: string;
  cssSelector: string;
  rect: DOMRect;
  textContent: string;
  attributes: Record<string, string>;
  componentStack?: string;
}

export interface SelectionPath {
  tool: SelectionTool;
  points: Point[];
  boundingRect: { x: number; y: number; width: number; height: number };
}

export interface SelectionResult {
  id: string;
  timestamp: number;
  path: SelectionPath;
  element?: ElementInfo;
  imageDataUrl?: string;
  mimeType: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
}

export interface SelectionState {
  isActive: boolean;
  activeTool: SelectionTool;
  isDrawing: boolean;
  currentPath: Point[];
  currentRect: { x: number; y: number; width: number; height: number } | null;
  hoveredElement: ElementInfo | null;
  highlightRect: DOMRect | null;
  selections: SelectionResult[];
  lastResult: SelectionResult | null;
}

export interface SelectionContextValue extends SelectionState {
  activate: () => void;
  deactivate: () => void;
  setTool: (tool: SelectionTool) => void;
  startDrawing: (point: Point) => void;
  updateDrawing: (point: Point) => void;
  endDrawing: () => void;
  cancelDrawing: () => void;
  addSelection: (result: SelectionResult) => void;
  removeSelection: (id: string) => void;
  clearSelections: () => void;
  setHoveredElement: (element: ElementInfo | null) => void;
  setHighlightRect: (rect: DOMRect | null) => void;
  onSelectionComplete?: (result: SelectionResult) => void;
}
