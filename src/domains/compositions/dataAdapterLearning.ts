import { DataAdapter, SafeQuery } from './compositionTypes';

export function createLearningAdapter(db: any): DataAdapter {
  return {
    name: 'learning',
    safeQuery(query: SafeQuery): any[] {
      try {
        const cols = query.columns.join(', ');
        const stmt = db.prepare(`SELECT ${cols} FROM ${query.table}`);
        return query.where ? stmt.all(query.where) : stmt.all();
      } catch { return []; }
    },
    listEvents() {
      return ['learning.flashcard.reviewed', 'learning.item.matured', 'learning.item.overdue'];
    },
    subscribe() { return () => {}; },
  };
}
