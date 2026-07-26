import { useState, useCallback, useEffect, useRef } from 'react';
import { WorkspaceStateService } from '../services/WorkspaceStateService';
import { SymbolIndexService } from '../services/SymbolIndexService';
import { WorkspaceState, SymbolIndex, ModuleTreeNode, CallGraphNode } from '../services/ContextStateTypes';

/**
 * React hook that gives components access to the workspace state + symbol index
 * This is what the UI (and the AI) query to "remember" the project state
 */
export function useWorkspaceContext(projectPath: string) {
  const stateServiceRef = useRef<WorkspaceStateService | null>(null);
  const indexServiceRef = useRef<SymbolIndexService | null>(null);

  if (!stateServiceRef.current && projectPath) {
    stateServiceRef.current = new WorkspaceStateService(projectPath);
  }
  if (!indexServiceRef.current && projectPath) {
    indexServiceRef.current = new SymbolIndexService(projectPath);
  }

  const [workspaceState, setWorkspaceState] = useState<WorkspaceState | null>(null);
  const [symbolIndex, setSymbolIndex] = useState<SymbolIndex | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  const refresh = useCallback(() => {
    if (stateServiceRef.current) {
      setWorkspaceState(stateServiceRef.current.getState());
    }
    if (indexServiceRef.current) {
      setSymbolIndex(indexServiceRef.current.getIndex());
    }
  }, []);

  const buildIndex = useCallback(async (files?: string[]) => {
    if (!indexServiceRef.current) return;
    setIsIndexing(true);
    await indexServiceRef.current.buildIndex(files);
    setIsIndexing(false);
    refresh();
  }, [refresh]);

  const getDashboard = useCallback(() => {
    return stateServiceRef.current?.getDashboard() || { completion: 0, blocked: [], inProgress: [], recentActivity: [] };
  }, []);

  const getModuleTree = useCallback((): ModuleTreeNode[] => {
    return indexServiceRef.current?.getModuleTree() || [];
  }, []);

  const getCallGraph = useCallback((symbolId: string, depth?: number): CallGraphNode | null => {
    try {
      return indexServiceRef.current?.getCallGraphForSymbol(symbolId, depth) || null;
    } catch {
      return null;
    }
  }, []);

  const findSymbol = useCallback((name: string, kind?: string) => {
    return indexServiceRef.current?.findSymbol(name, kind) || [];
  }, []);

  const updateComponent = useCallback((module: string, component: string, update: any) => {
    stateServiceRef.current?.updateComponent(module, component, update);
    refresh();
  }, [refresh]);

  const recordDecision = useCallback((decision: any) => {
    stateServiceRef.current?.recordDecision(decision);
    refresh();
  }, [refresh]);

  const snapshotSession = useCallback((summary: string, files: string[], decisions: string[], next: string[]) => {
    stateServiceRef.current?.snapshotSession(summary, files, decisions, next);
    refresh();
  }, [refresh]);

  useEffect(() => { refresh(); }, [refresh]);

  return {
    workspaceState,
    symbolIndex,
    isIndexing,
    refresh,
    buildIndex,
    getDashboard,
    getModuleTree,
    getCallGraph,
    findSymbol,
    updateComponent,
    recordDecision,
    snapshotSession
  };
}
