import type { Database } from 'better-sqlite3';

// ===================================================================
// AI Debug Vault — append-only verbatim audit log of EVERY AI interaction
// inside DeskFlow. Captured at main-process chokepoints (provider router,
// assistant chat calls, prompt routing, terminal agent send/status) plus
// renderer-side `parsed` events the main process cannot see.
// Table: ai_debug_events | Retention: newest 25,000 rows | payload cap 300 KB
// ===================================================================

let db: Database | null = null;
let ready = false;
const MAX_ROWS = 25000;
const MAX_PAYLOAD_CHARS = 300 * 1024;
const EXPORT_MAX_EVENTS = 3000;

export interface DebugEvent {
  source: string;      // 'ai-assistant' | 'ai-chat' | 'provider-router' | 'route-prompt' | 'terminal-agent' | 'renderer' | 'system'
  event: string;       // 'prompt' | 'thinking' | 'output' | 'parsed' | 'chunk' | 'state' | 'error' | 'info'
  feature?: string;
  provider?: string;
  model?: string;
  contextId?: string;  // threadDate / terminalId / sessionId
  role?: string;
  tokensIn?: number;
  tokensOut?: number;
  payload?: unknown;
  epochMs?: number;
}

export interface DebugQueryOpts {
  sources?: string[];
  events?: string[];
  search?: string;
  fromMs?: number;
  toMs?: number;
  limit?: number;
  offset?: number;
}

function ser(payload: unknown): string | null {
  if (payload === undefined || payload === null) return null;
  try {
    const s = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    return s.length > MAX_PAYLOAD_CHARS ? s.slice(0, MAX_PAYLOAD_CHARS) + '\n…[TRUNCATED]' : s;
  } catch {
    try { return String(payload); } catch { return null; }
  }
}

function unrow(r: any): any {
  return {
    id: r.id,
    ts: r.ts,
    epochMs: r.epoch_ms,
    source: r.source,
    event: r.event,
    feature: r.feature || undefined,
    provider: r.provider || undefined,
    model: r.model || undefined,
    contextId: r.context_id || undefined,
    role: r.role || undefined,
    tokensIn: r.tokens_in || 0,
    tokensOut: r.tokens_out || 0,
    payload: r.payload,
  };
}

export function initVault(database: Database) {
  db = database;
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS ai_debug_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      epoch_ms INTEGER NOT NULL,
      source TEXT NOT NULL,
      event TEXT NOT NULL,
      feature TEXT,
      provider TEXT,
      model TEXT,
      context_id TEXT,
      role TEXT,
      tokens_in INTEGER DEFAULT 0,
      tokens_out INTEGER DEFAULT 0,
      payload TEXT
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_ai_debug_epoch ON ai_debug_events(epoch_ms)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ai_debug_source ON ai_debug_events(source)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ai_debug_event ON ai_debug_events(event)');
    db.exec(`DELETE FROM ai_debug_events WHERE id NOT IN (SELECT id FROM ai_debug_events ORDER BY id DESC LIMIT ${MAX_ROWS})`);
    ready = true;
    console.log('[DebugVault] ✅ initialized (table ai_debug_events, retention ' + MAX_ROWS + ' rows)');
  } catch (err: any) {
    console.error('[DebugVault] init failed:', err?.message);
  }
}

export function vaultLog(ev: DebugEvent) {
  if (!db || !ready) return;
  try {
    const now = ev.epochMs ?? Date.now();
    db.prepare(`INSERT INTO ai_debug_events (ts, epoch_ms, source, event, feature, provider, model, context_id, role, tokens_in, tokens_out, payload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      new Date(now).toISOString(), now,
      String(ev.source || 'system').slice(0, 64),
      String(ev.event || 'info').slice(0, 32),
      ev.feature ? String(ev.feature).slice(0, 64) : null,
      ev.provider ? String(ev.provider).slice(0, 128) : null,
      ev.model ? String(ev.model).slice(0, 128) : null,
      ev.contextId ? String(ev.contextId).slice(0, 200) : null,
      ev.role ? String(ev.role).slice(0, 32) : null,
      ev.tokensIn || 0,
      ev.tokensOut || 0,
      ser(ev.payload),
    );
  } catch { /* vault is best-effort, never throws */ }
}

export function vaultQuery(opts: DebugQueryOpts = {}) {
  if (!db || !ready) return { events: [], total: 0 };
  try {
    const clauses: string[] = [];
    const params: any[] = [];
    if (opts.sources && opts.sources.length) {
      clauses.push(`source IN (${opts.sources.map(() => '?').join(',')})`);
      params.push(...opts.sources);
    }
    if (opts.events && opts.events.length) {
      clauses.push(`event IN (${opts.events.map(() => '?').join(',')})`);
      params.push(...opts.events);
    }
    if (opts.search && opts.search.trim()) {
      clauses.push(`(payload LIKE ? OR feature LIKE ? OR provider LIKE ? OR model LIKE ?)`);
      const like = `%${opts.search.trim()}%`;
      params.push(like, like, like, like);
    }
    if (opts.fromMs != null) { clauses.push('epoch_ms >= ?'); params.push(opts.fromMs); }
    if (opts.toMs != null) { clauses.push('epoch_ms <= ?'); params.push(opts.toMs); }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    const limit = Math.min(Math.max(opts.limit || 100, 1), 500);
    const offset = Math.max(opts.offset || 0, 0);
    const total = (db.prepare(`SELECT COUNT(*) as c FROM ai_debug_events ${where}`).get(...params) as any)?.c || 0;
    const rows = db.prepare(`SELECT * FROM ai_debug_events ${where} ORDER BY epoch_ms DESC, id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    return { events: rows.map(unrow), total };
  } catch (err: any) {
    return { events: [], total: 0, error: err?.message };
  }
}

export function vaultStats() {
  if (!db || !ready) return { total: 0, bySource: {}, byEvent: {}, oldestMs: null, newestMs: null, capturePoints: CAPTURE_POINTS };
  try {
    const total = (db.prepare('SELECT COUNT(*) as c FROM ai_debug_events').get() as any)?.c || 0;
    const bySource: Record<string, number> = {};
    for (const r of db.prepare('SELECT source, COUNT(*) as c FROM ai_debug_events GROUP BY source').all() as any[]) bySource[r.source] = r.c;
    const byEvent: Record<string, number> = {};
    for (const r of db.prepare('SELECT event, COUNT(*) as c FROM ai_debug_events GROUP BY event').all() as any[]) byEvent[r.event] = r.c;
    const bounds = db.prepare('SELECT MIN(epoch_ms) as mn, MAX(epoch_ms) as mx FROM ai_debug_events').get() as any;
    return {
      total,
      bySource,
      byEvent,
      oldestMs: bounds?.mn ?? null,
      newestMs: bounds?.mx ?? null,
      capturePoints: CAPTURE_POINTS,
    };
  } catch (err: any) {
    return { total: 0, bySource: {}, byEvent: {}, oldestMs: null, newestMs: null, capturePoints: CAPTURE_POINTS, error: err?.message };
  }
}

const CAPTURE_POINTS = [
  { source: 'ai-assistant', where: 'AiPage AI Assistant chat (provider-chat-call / provider-chat-basic)', captures: 'prompt, output, thinking, error' },
  { source: 'ai-chat', where: 'Persistent chat threads (ai-chat:send)', captures: 'prompt, output, parsed, error' },
  { source: 'provider-router', where: 'Routed features via router.runWithFallback (researchDigest, goalAssistant, resumeBuilder, category, colors, lifeAssistant, monthlyRecap)', captures: 'prompt, output, thinking, error, usage tokens' },
  { source: 'route-prompt', where: 'Terminal prompt auto-routing (route-prompt)', captures: 'prompt, routing decision' },
  { source: 'terminal-agent', where: 'Terminal AI agents (agent:send + agent:status)', captures: 'prompt, state transitions (ready/busy/error)' },
  { source: 'renderer', where: 'Renderer-side parsed results (ai-debug:log)', captures: 'parsed' },
];

export function vaultExport(opts: DebugQueryOpts = {}) {
  const q = vaultQuery({ ...opts, limit: Math.min(opts.limit || EXPORT_MAX_EVENTS, EXPORT_MAX_EVENTS), offset: 0 });
  const st = vaultStats();
  const now = new Date().toISOString();
  const lines: string[] = [];
  lines.push(`# DeskFlow AI Debug Vault — Export`);
  lines.push(``);
  lines.push(`**What this is:** A complete, verbatim audit log of every AI interaction made inside the DeskFlow desktop productivity app (Electron + React + better-sqlite3). It contains the exact prompts sent to AI providers, the raw model outputs, any provider reasoning (thinking), the parsed JSON the app extracted from responses, routing decisions, provider/model used, token usage, and errors.`);
  lines.push(``);
  lines.push(`**If you are an AI coding agent receiving this:** treat this export as ground-truth evidence of how the app's AI assistant behaved. \`prompt\` events show exactly what context the app injected; \`output\` events show verbatim what the model returned; \`parsed\` events show how the app interpreted responses; \`error\` events show failures with provider/model info; \`state\` events show terminal-agent phase transitions. Always quote the event id (e.g. \`#42\`) when reporting a problem.`);
  lines.push(``);
  lines.push(`- **Exported:** ${now}`);
  lines.push(`- **Events in export:** ${q.events.length} (of ${q.total} matching)`);
  lines.push(`- **Total in vault:** ${st.total} | **Retention:** newest ${MAX_ROWS} rows | **Payload cap:** ${MAX_PAYLOAD_CHARS} chars`);
  lines.push(``);
  lines.push(`## Capture points`);
  lines.push(``);
  lines.push(`| source | where | events |`);
  lines.push(`|--------|-------|--------|`);
  for (const c of CAPTURE_POINTS) lines.push(`| ${c.source} | ${c.where} | ${c.captures} |`);
  lines.push(``);
  lines.push(`## Events (newest first)`);
  lines.push(``);
  q.events.forEach((e: any, i: number) => {
    lines.push(`### #${e.id} — ${e.ts} — \`${e.source}/${e.event}\``);
    const meta: string[] = [];
    if (e.provider) meta.push(`provider: ${e.provider}`);
    if (e.model) meta.push(`model: ${e.model}`);
    if (e.feature) meta.push(`feature: ${e.feature}`);
    if (e.contextId) meta.push(`context: ${e.contextId}`);
    if (e.role) meta.push(`role: ${e.role}`);
    if (e.tokensIn || e.tokensOut) meta.push(`tokens in/out: ${e.tokensIn}/${e.tokensOut}`);
    if (meta.length) { lines.push(``); lines.push(`> ${meta.join(' | ')}`); }
    lines.push(``);
    lines.push('```json');
    lines.push(e.payload ?? '(no payload)');
    lines.push('```');
    lines.push(``);
  });
  return { markdown: lines.join('\n'), count: q.events.length, total: q.total };
}

export function vaultClear(opts: { sources?: string[]; events?: string[]; olderThanMs?: number } = {}) {
  if (!db || !ready) return { deleted: 0 };
  try {
    const clauses: string[] = [];
    const params: any[] = [];
    if (opts.sources && opts.sources.length) {
      clauses.push(`source IN (${opts.sources.map(() => '?').join(',')})`);
      params.push(...opts.sources);
    }
    if (opts.events && opts.events.length) {
      clauses.push(`event IN (${opts.events.map(() => '?').join(',')})`);
      params.push(...opts.events);
    }
    if (opts.olderThanMs != null) { clauses.push('epoch_ms < ?'); params.push(opts.olderThanMs); }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    const info = db.prepare(`DELETE FROM ai_debug_events ${where}`).run(...params);
    return { deleted: info.changes };
  } catch (err: any) {
    return { deleted: 0, error: err?.message };
  }
}