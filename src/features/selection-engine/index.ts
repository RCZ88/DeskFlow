export { SelectionProvider, useSelectionEngine, generateSelectionId } from './SelectionContext';
export { SelectionOverlay } from './SelectionOverlay';
export { SelectionToolbar } from './SelectionToolbar';
export { SelectionResultPanel } from './SelectionResultPanel';
export { SelectionEngineActivator } from './SelectionEngineActivator';
export { useActivateSelection } from './useActivateSelection';
export { detectElement, getHoverableElementsInRect } from './elementDetection';
export { pointInPolygon, boundingRect, simplifyPath, clipCanvasToPath, canvasPathFromPoints } from './geometry';
export type { Point, SelectionTool, ElementInfo, SelectionPath, SelectionResult, SelectionState, SelectionContextValue } from './types';
