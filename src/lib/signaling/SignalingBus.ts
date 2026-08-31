// SignalingBus — typed pub/sub for Conductor orchestration events.
// Renderer and main process subscribe to the same signal vocabulary so the
// UI can drive the autonomous loop (autonomy ladders, reviewer handoffs,
// budget gates) without polling snapshots.

export type SignalType =
  | 'mission.started'
  | 'mission.paused'
  | 'mission.resumed'
  | 'mission.killed'
  | 'mission.done'
  | 'node.spawned'
  | 'node.blocked'
  | 'node.done'
  | 'node.failed'
  | 'autonomy.changed'
  | 'directive.sent'
  | 'escalation.raised'
  | 'escalation.resolved'
  | 'review.requested'
  | 'review.completed'
  | 'budget.exceeded'
  | 'goal.proposed'
  | 'merge.conflict'
  | 'merge.ok'
  | 'integration.promoted'
  | 'signal.in';

export interface ConductorSignal {
  type: SignalType;
  missionId: string;
  nodeId?: string;
  payload?: any;
  ts: number;
  id: string;
}

function nowId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export class SignalingBus {
  private listeners = new Set<(s: ConductorSignal) => void>();

  on(cb: (s: ConductorSignal) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  emit(signal: ConductorSignal): void {
    signal.ts = signal.ts || Date.now();
    signal.id = signal.id || nowId('sig');
    for (const l of this.listeners) {
      try {
        l(signal);
      } catch {
        /* a broken subscriber must never break the orchestration loop */
      }
    }
  }
}
