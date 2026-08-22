export type CurrentMode =
  | 'stream'      // Dashboard — daily trajectory, event deviations
  | 'network'     // Life — self + people/goals branches
  | 'flow'        // Finance — income/expense streams
  | 'signal'      // Activity, Reports — parallel temporal traces
  | 'trajectory'  // Goals — path toward destination
  | 'workflow'    // Projects — branching process
  | 'inflow'      // External — incoming streams
  | 'knowledge'   // Learn — branching knowledge
  | 'mechanical'  // IDE — gear rotation
  | 'partition'   // Database — Voronoi regions
  | 'cellular'    // AI — grid evolution
  | 'redaction';  // Settings — masking zones

export interface Entity {
  id: string;
  type: 'node' | 'branch' | 'stream' | 'milestone' | 'cell' | 'signal' | 'gear' | 'mask';
  x: number;
  y: number;
  radius?: number;
  weight?: number;
  label?: string;
  importance?: number;
  progress?: number;
  metadata?: Record<string, unknown>;
}

export interface Topology {
  mode: CurrentMode;
  entities: Entity[];
  accent: string;
}

export interface TransitionState {
  active: boolean;
  startedAt: number;
  duration: number;
  from: Topology;
  to: Topology;
}

export interface CurrentState {
  currentPhase: number;       // 0..1, persistent clock, NEVER resets
  mode: CurrentMode;
  accent: string;
  entities: Entity[];
  transition: TransitionState;
}

export const CURRENT_CYCLE_MS = 12000;
export const TRANSITION_DURATION = 200;

export const ROUTE_MODE_MAP: Record<string, CurrentMode> = {
  '/': 'stream',
  '/activity': 'signal',
  '/ai': 'cellular',
  '/studio': 'workflow',
  '/learn': 'knowledge',
  '/resume': 'redaction',
  '/ide': 'mechanical',
  '/external': 'inflow',
  '/finance': 'flow',
  '/reports': 'signal',
  '/database': 'partition',
  '/life': 'network',
  '/settings': 'redaction',
  '/terminal': 'stream',
};

export const PAGE_ACCENTS: Record<string, string> = {
  '/': '#10b981',
  '/activity': '#06b6d4',
  '/ai': '#8b5cf6',
  '/studio': '#a78bfa',
  '/learn': '#6366f1',
  '/resume': '#cbd5e1',
  '/ide': '#6366f1',
  '/external': '#f59e0b',
  '/finance': '#10b981',
  '/reports': '#ec4899',
  '/database': '#a78bfa',
  '/life': '#fbbf24',
  '/settings': '#06b6d4',
  '/terminal': '#22c55e',
};
