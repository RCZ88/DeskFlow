import { DataAdapter, SafeQuery } from './compositionTypes';

export function createFinanceAdapter(db: any): DataAdapter {
  return {
    name: 'finance',
    safeQuery(query: SafeQuery): any[] {
      try {
        const cols = query.columns.join(', ');
        const sql = `SELECT ${cols} FROM ${query.table}`;
        const stmt = db.prepare(sql);
        return query.where ? stmt.all(query.where) : stmt.all();
      } catch { return []; }
    },
    listEvents() {
      return ['finance.transaction.created', 'finance.transaction.updated', 'finance.budget.exceeded', 'finance.subscription.due'];
    },
    subscribe() { return () => {}; },
  };
}
