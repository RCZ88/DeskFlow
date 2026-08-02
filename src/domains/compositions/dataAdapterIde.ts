import { DataAdapter, SafeQuery } from './compositionTypes';

export function createIdeAdapter(db: any): DataAdapter {
  return {
    name: 'ide',
    safeQuery(query: SafeQuery): any[] {
      try {
        const cols = query.columns.join(', ');
        const stmt = db.prepare(`SELECT ${cols} FROM ${query.table}`);
        return query.where ? stmt.all(query.where) : stmt.all();
      } catch { return []; }
    },
    listEvents() {
      return ['ide.project.opened', 'ide.project.closed', 'ide.ai.tool_used'];
    },
    subscribe() { return () => {}; },
  };
}
