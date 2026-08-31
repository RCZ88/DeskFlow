import { ASTNode, CompositionRule, EventPattern, SchedulePattern, ConditionClause, ActionBlock, ActionItem, ExpressionNode, ScopeReport, ScopeError, ScopeWarning } from './compositionTypes';

const ALLOWED_EVENT_SOURCES = ['finance', 'focus', 'goals', 'learning', 'ide', 'system', 'tracking'];
const ALLOWED_ACTIONS = [
  'notify', 'log', 'query', 'update', 'create', 'delete', 'http', 'transform', 'filter', 'trigger', 'sleep', 'exec',
  'open_link', 'goal:create', 'goal:complete', 'deadline:add', 'schedule:add', 'test:notify',
];
const ALLOWED_ACTION_PARAMS: Record<string, string[]> = {
  notify: ['message', 'title', 'subject', 'body', 'text', 'level', 'channel'],
  log: ['level', 'message', 'data', 'text', 'body'],
  query: ['table', 'columns', 'where', 'order', 'limit', 'source'],
  update: ['table', 'set', 'where'],
  create: ['table', 'data'],
  delete: ['table', 'where'],
  http: ['url', 'endpoint', 'method', 'headers', 'body'],
  transform: ['expression', 'as'],
  filter: ['source', 'condition', 'as'],
  trigger: ['event', 'source', 'payload'],
  sleep: ['ms', 'duration'],
  exec: ['command', 'cwd', 'timeout'],
  open_link: ['url', 'link', 'href'],
  'goal:create': ['title', 'name', 'description', 'category', 'period'],
  'goal:complete': ['title', 'id'],
  'deadline:add': ['title', 'name', 'due_date', 'due', 'date', 'description', 'priority'],
  'schedule:add': ['title', 'name', 'entries'],
  'test:notify': ['title', 'message', 'body'],
};

export function scopeCheck(manifestId: string, dslSource: string, ast: ASTNode[]): ScopeReport {
  const errors: ScopeError[] = [];
  const warnings: ScopeWarning[] = [];

  for (const node of ast) {
    if (node.kind === 'rule') {
      checkRule(manifestId, node as CompositionRule, dslSource, errors, warnings);
    }
  }

  return {
    manifestId,
    valid: errors.length === 0,
    errors,
    warnings,
    suggestedFix: errors.length > 0 ? 'Review errors above and correct the DSL source' : undefined,
  };
}

function checkRule(manifestId: string, rule: CompositionRule, dslSource: string, errors: ScopeError[], warnings: ScopeWarning[]) {
  if (!rule.trigger && !rule.schedule) {
    warnings.push({
      line: 1, col: 1,
      message: `Rule '${manifestId}' has no trigger or schedule — will never fire`,
    });
  }

  if (rule.trigger) checkEventPattern(rule.trigger, errors, warnings);
  if (rule.schedule) checkSchedulePattern(rule.schedule, errors, warnings);
  checkConditionClause(rule.conditions, errors, warnings, 1);

  if (rule.actions.items.length === 0) {
    errors.push({ line: 1, col: 1, message: 'Rule has no actions', code: 'EMPTY_ACTIONS' });
  }

  for (const item of rule.actions.items) {
    checkActionItem(item, errors, warnings, 1);
  }

  for (const b of rule.bindings || []) {
    if (!ALLOWED_EVENT_SOURCES.includes(b.source)) {
      warnings.push({
        line: 1, col: 1,
        message: `Binding '${b.name}' sources from '${b.source}' which is not a registered data source`,
      });
    }
  }
}

function checkEventPattern(ep: EventPattern, errors: ScopeError[], warnings: ScopeWarning[]) {
  if (!ALLOWED_EVENT_SOURCES.includes(ep.source)) {
    warnings.push({
      line: 1, col: 1,
      message: `Event source '${ep.source}' is not a recognized data source`,
    });
  }
}

function checkSchedulePattern(sp: SchedulePattern, errors: ScopeError[], warnings: ScopeWarning[]) {
  if (!/^(\S+ ){4}\S+$/.test(sp.cron)) {
    warnings.push({
      line: 1, col: 1,
      message: `Cron expression '${sp.cron}' may not be valid (expected 5 fields)`,
    });
  }
}

function checkConditionClause(cc: ConditionClause, errors: ScopeError[], warnings: ScopeWarning[], depth: number) {
  if (depth > 10) {
    errors.push({ line: 1, col: 1, message: 'Condition nesting exceeds maximum depth of 10', code: 'MAX_DEPTH' });
    return;
  }
  for (const op of cc.operands) {
    if (op.kind === 'condition') checkConditionClause(op, errors, warnings, depth + 1);
  }
}

function checkActionItem(item: ActionItem, errors: ScopeError[], warnings: ScopeWarning[], depth: number) {
  if (ALLOWED_ACTIONS.includes(item.name)) {
    const allowed = ALLOWED_ACTION_PARAMS[item.name];
    if (allowed) {
      for (const key of Object.keys(item.params)) {
        if (!allowed.includes(key)) {
          warnings.push({
            line: 1, col: 1,
            message: `Unknown parameter '${key}' for action '${item.name}'`,
          });
        }
      }
    }
  }
  if (item.fallback && depth < 3) {
    for (const fb of item.fallback) checkActionItem(fb, errors, warnings, depth + 1);
  }
}

export function getActionParamSchema(actionName: string): string[] {
  return ALLOWED_ACTION_PARAMS[actionName] || [];
}

export function getAllowedActions(): string[] {
  return [...ALLOWED_ACTIONS];
}

export function getAllowedEventSources(): string[] {
  return [...ALLOWED_EVENT_SOURCES];
}
