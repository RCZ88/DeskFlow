import { DataAdapter, SafeQuery } from './compositionTypes';

export function createSystemAdapter(db: any): DataAdapter {
  return {
    name: 'system',
    safeQuery(query: SafeQuery): any[] {
      try {
        const cols = query.columns.join(', ');
        const stmt = db.prepare(`SELECT ${cols} FROM ${query.table}`);
        return query.where ? stmt.all(query.where) : stmt.all();
      } catch { return []; }
    },
    listEvents() {
      return ['system.tracking.foreground_changed', 'system.tracking.sleep_detected', 'system.app.started', 'system.app.closing'];
    },
    subscribe() { return () => {}; },
  };
}
