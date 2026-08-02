import { DataAdapter, SafeQuery } from './compositionTypes';

export function createGoalsAdapter(db: any): DataAdapter {
  return {
    name: 'goals',
    safeQuery(query: SafeQuery): any[] {
      try {
        const cols = query.columns.join(', ');
        const stmt = db.prepare(`SELECT ${cols} FROM ${query.table}`);
        return query.where ? stmt.all(query.where) : stmt.all();
      } catch { return []; }
    },
    listEvents() {
      return ['goals.goal.created', 'goals.goal.completed', 'goals.goal.updated', 'goals.deadline.approaching'];
    },
    subscribe() { return () => {}; },
  };
}
