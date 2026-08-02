import type Database from 'better-sqlite3';
import { ASTNode, CompositionRule, EventPattern, SchedulePattern, ConditionClause, ActionItem, ExpressionNode, LiteralNode, IdentifierNode, EventBusEvent, ExecutionResult } from './compositionTypes';
import { lex } from './compositionLexer';
import { parse } from './compositionParser';
import { scopeCheck } from './compositionScopeChecker';
import { CompositionEventBus } from './compositionEventBus';
import { querySource, getAdapter } from './dataSourceRegistry';

export class CompositionEngine {
  private rules = new Map<string, { manifest: any; ast: ASTNode[] }>();
  private compiledCache = new Map<string, ASTNode[]>();

  constructor(
    private db: Database.Database,
    private eventBus: CompositionEventBus,
  ) {}

  loadRules(): number {
    const rows = this.db.prepare(`SELECT * FROM composition_rules WHERE enabled = 1 ORDER BY priority ASC`).all() as any[];
    let count = 0;
    for (const row of rows) {
      try {
        const tokens = lex(row.dsl_source);
        const ast = parse(tokens);
        this.rules.set(row.id, { manifest: row, ast });
        this.compiledCache.set(row.id, ast);
        count++;
      } catch (err) {
        console.error(`[Compositions] Failed to compile rule ${row.id}:`, err);
      }
    }
    return count;
  }

  reloadRule(ruleId: string): boolean {
    const row = this.db.prepare(`SELECT * FROM composition_rules WHERE id = ?`).get(ruleId) as any;
    if (!row) { this.rules.delete(ruleId); this.compiledCache.delete(ruleId); return false; }
    try {
      const tokens = lex(row.dsl_source);
      const ast = parse(tokens);
      this.rules.set(row.id, { manifest: row, ast });
      this.compiledCache.set(row.id, ast);
      return true;
    } catch {
      this.rules.delete(ruleId); this.compiledCache.delete(ruleId);
      return false;
    }
  }

  compileRule(dslSource: string) {
    const tokens = lex(dslSource);
    const ast = parse(tokens);
    return ast;
  }

  validateRule(dslSource: string, manifestId: string) {
    const ast = this.compileRule(dslSource);
    return scopeCheck(manifestId, dslSource, ast);
  }

  async evaluate(ruleId: string, context: Record<string, any> = {}): Promise<ExecutionResult[]> {
    const entry = this.rules.get(ruleId);
    if (!entry) throw new Error(`Rule ${ruleId} not found or not loaded`);

    const { manifest, ast } = entry;
    const results: ExecutionResult[] = [];

    for (const node of ast) {
      if (node.kind === 'rule') {
        const r = node as CompositionRule;

        if (r.conditions) {
          const passed = this.evaluateConditions(r.conditions, context);
          if (!passed) {
            return [{ ruleId, actionId: 'all', action: 'skip', status: 'skipped', startedAt: new Date().toISOString(), result: 'conditions not met' }];
          }
        }

        for (const item of r.actions.items) {
          try {
            const result = await this.executeAction(item, context, ruleId);
            results.push(result);
          } catch (err: any) {
            results.push({ ruleId, actionId: item.name, action: item.name, status: 'error', startedAt: new Date().toISOString(), error: err.message });
          }
        }
      }
    }

    this.logExecution(ruleId, results);
    return results;
  }

  private evaluateConditions(cc: ConditionClause, context: Record<string, any>): boolean {
    const values = cc.operands.map(op => {
      if (op.kind === 'condition') return this.evaluateConditions(op, context);
      return this.evaluateExpression(op, context);
    });

    if (cc.operator === 'not') return !values[0];
    if (cc.operator === 'or') return values.some(v => v === true);
    return values.every(v => v === true);
  }

  private evaluateExpression(node: ExpressionNode | LiteralNode | IdentifierNode, context: Record<string, any>): any {
    if (node.kind === 'literal') return node.value;
    if (node.kind === 'identifier') {
      const { name, path } = node;
      if (path && path.length > 0) {
        const source = context[name];
        if (source && typeof source === 'object') {
          let val = source;
          for (const key of path) { if (val != null) val = (val as any)[key]; else return undefined; }
          return val;
        }
        const eventPayload = context.event?.payload;
        if (eventPayload) {
          let val = eventPayload;
          for (const key of [name, ...path]) { if (val != null) val = (val as any)[key]; else return undefined; }
          return val;
        }
        return undefined;
      }
      return context[name] ?? context.event?.payload?.[name];
    }
    if (node.kind === 'expr') {
      const left = this.evaluateExpression(node.left, context);
      const right = node.right ? this.evaluateExpression(node.right, context) : undefined;
      return this.applyOperator(node.operator, left, right);
    }
    return undefined;
  }

  private applyOperator(op: string, left: any, right: any): boolean {
    switch (op) {
      case '==': return left == right;
      case '!=': return left != right;
      case '>': return left > right;
      case '>=': return left >= right;
      case '<': return left < right;
      case '<=': return left <= right;
      case 'not': return !left;
      case 'and': return left && right;
      case 'or': return left || right;
      default: return false;
    }
  }

  private async executeAction(item: ActionItem, context: Record<string, any>, ruleId: string): Promise<ExecutionResult> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    try {
      const resolvedParams: Record<string, any> = {};
      for (const [key, expr] of Object.entries(item.params)) {
        resolvedParams[key] = this.evaluateExpression(expr, context);
      }

      let result: any;
      switch (item.name) {
        case 'notify':
          this.eventBus.enqueue('compositions.notification', 'engine', resolvedParams);
          result = { sent: true, ...resolvedParams };
          break;
        case 'log':
          console.log(`[Composition:${ruleId}] ${resolvedParams.message || ''}`, resolvedParams.data || '');
          result = { logged: true };
          break;
        case 'query':
          result = this.executeQuery(resolvedParams);
          break;
        case 'trigger':
          this.eventBus.enqueue(resolvedParams.event || 'compositions.custom', 'engine', resolvedParams.payload || {});
          result = { triggered: true };
          break;
        case 'sleep':
          await new Promise(r => setTimeout(r, resolvedParams.ms || 1000));
          result = { slept: resolvedParams.ms || 1000 };
          break;
        default:
          result = { action: item.name, params: resolvedParams, note: 'action dispatched' };
      }

      return {
        ruleId, actionId: item.name, action: item.name,
        status: 'success', startedAt, completedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs, result,
      };
    } catch (err: any) {
      if (item.fallback && item.fallback.length > 0) {
        return this.executeAction(item.fallback[0], context, ruleId);
      }
      return {
        ruleId, actionId: item.name, action: item.name,
        status: 'error', startedAt, completedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs, error: err.message,
      };
    }
  }

  private executeQuery(params: Record<string, any>): any[] {
    const source = params.source || 'system';
    const table = params.table;
    const columns = params.columns || ['*'];
    const where = params.where || undefined;
    const order = params.order || undefined;
    const limit = params.limit || undefined;

    return querySource(source, {
      table, columns,
      where: where ? JSON.parse(JSON.stringify(where)) : undefined,
      orderBy: order ? { column: order, dir: 'ASC' } : undefined,
      limit,
    });
  }

  private logExecution(ruleId: string, results: ExecutionResult[]) {
    const stmt = this.db.prepare(`
      INSERT INTO composition_execution_log (rule_id, action_id, action_name, status, result, error, duration_ms, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of results) {
      stmt.run(ruleId, r.actionId, r.action, r.status, r.result ? JSON.stringify(r.result) : null, r.error || null, r.durationMs || null, r.startedAt, r.completedAt || null);
    }

    const last = results[results.length - 1];
    this.db.prepare(`
      INSERT INTO composition_execution_status (rule_id, last_status, last_error, consecutive_failures, last_run_at)
      VALUES (?, ?, ?, ?, datetime('now','localtime'))
      ON CONFLICT(rule_id) DO UPDATE SET
        last_status = excluded.last_status,
        last_error = excluded.last_error,
        consecutive_failures = CASE WHEN excluded.last_status = 'error' THEN consecutive_failures + 1 ELSE 0 END,
        last_run_at = excluded.last_run_at
    `).run(ruleId, last?.status || 'unknown', last?.error || null, last?.status === 'error' ? 1 : 0);
  }

  matchAndFire(event: EventBusEvent): Promise<ExecutionResult[]>[] {
    const results: Promise<ExecutionResult[]>[] = [];
    for (const [ruleId, entry] of this.rules.entries()) {
      for (const node of entry.ast) {
        if (node.kind === 'rule') {
          const rule = node as CompositionRule;
          if (rule.trigger && rule.trigger.source === event.source && rule.trigger.eventName === event.topic.split('.').pop()) {
            results.push(this.evaluate(ruleId, { event, ...event.payload }));
          }
        }
      }
    }
    return results;
  }
}
