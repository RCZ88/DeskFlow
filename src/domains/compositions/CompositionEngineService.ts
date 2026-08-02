import type Database from 'better-sqlite3';
import { CompositionEngine } from './compositionEngine';
import { CompositionEventBus } from './compositionEventBus';
import { EventBusEvent, ExecutionResult } from './compositionTypes';

export class CompositionEngineService {
  private eventSubscriptions: (() => void)[] = [];

  constructor(
    private db: Database.Database,
    private engine: CompositionEngine,
    private eventBus: CompositionEventBus,
  ) {}

  start() {
    this.eventBus.subscribeAll((event: EventBusEvent) => {
      const promises = this.engine.matchAndFire(event);
      for (const p of promises) {
        p.catch(err => console.error(`[Compositions] Error firing rule for event ${event.topic}:`, err));
      }
    });
  }

  stop() {
    for (const unsub of this.eventSubscriptions) { unsub(); }
    this.eventSubscriptions = [];
  }

  async fireOnEvent(event: EventBusEvent): Promise<ExecutionResult[][]> {
    const results = this.engine.matchAndFire(event);
    return Promise.all(results);
  }

  getRuleReport(ruleId: string) {
    const rule = this.db.prepare('SELECT * FROM composition_rules WHERE id = ?').get(ruleId) as any;
    if (!rule) return null;

    const history = this.db.prepare('SELECT * FROM composition_execution_log WHERE rule_id = ? ORDER BY started_at DESC LIMIT 20').all(ruleId);
    const status = this.db.prepare('SELECT * FROM composition_execution_status WHERE rule_id = ?').get(ruleId);
    const versions = this.db.prepare('SELECT version, changelog, created_at FROM composition_versions WHERE rule_id = ? ORDER BY version DESC LIMIT 10').all(ruleId);

    return { rule, history, status, versions };
  }
}
