import { DataAdapter, SafeQuery } from './compositionTypes';

export function createFocusAdapter(db: any): DataAdapter {
  return {
    name: 'focus',
    safeQuery(query: SafeQuery): any[] {
      try {
        const cols = query.columns.join(', ');
        const stmt = db.prepare(`SELECT ${cols} FROM ${query.table}`);
        return query.where ? stmt.all(query.where) : stmt.all();
      } catch { return []; }
    },
    listEvents() {
      return ['focus.session.started', 'focus.session.ended', 'focus.session.broken', 'focus.overlay.shown'];
    },
    subscribe() { return () => {}; },
  };
}
