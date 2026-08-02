import { ipcMain, BrowserWindow } from 'electron';
import crypto from 'crypto';
import type Database from 'better-sqlite3';
import { ensureCompositionsSchema } from './compositionSchema';
import { CompositionEngine } from './compositionEngine';
import { CompositionEventBus } from './compositionEventBus';
import { registerAdapter } from './dataSourceRegistry';
import { createFinanceAdapter } from './dataAdapterFinance';
import { createFocusAdapter } from './dataAdapterFocus';
import { createGoalsAdapter } from './dataAdapterGoals';
import { createLearningAdapter } from './dataAdapterLearning';
import { createIdeAdapter } from './dataAdapterIde';
import { createSystemAdapter } from './dataAdapterSystem';
import { lex } from './compositionLexer';
import { parse } from './compositionParser';
import { scopeCheck } from './compositionScopeChecker';
import { CompositionEngineService } from './CompositionEngineService';
import { querySource, listRegisteredSources, listAdapterEvents } from './dataSourceRegistry';

export class CompositionEngineManager {
  private engine: CompositionEngine;
  private eventBus: CompositionEventBus;
  private service: CompositionEngineService;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private db: Database.Database,
    private getMainWindow: () => BrowserWindow | null,
  ) {
    ensureCompositionsSchema(db);
    this.eventBus = new CompositionEventBus();
    this.eventBus.setDb(db);
    this.engine = new CompositionEngine(db, this.eventBus);
    this.service = new CompositionEngineService(db, this.engine, this.eventBus);
    this.registerAdapters(db);
    this.registerIpc();
    this.eventBus.startFlushTimer(10000);

    const count = this.engine.loadRules();
    console.log(`[Compositions] Loaded ${count} active rules`);
  }

  private registerAdapters(db: Database.Database) {
    registerAdapter(createFinanceAdapter(db));
    registerAdapter(createFocusAdapter(db));
    registerAdapter(createGoalsAdapter(db));
    registerAdapter(createLearningAdapter(db));
    registerAdapter(createIdeAdapter(db));
    registerAdapter(createSystemAdapter(db));
  }

  private registerIpc() {
    ipcMain.handle('compositions:list', () => {
      return this.db.prepare('SELECT * FROM composition_rules ORDER BY priority ASC').all();
    });

    ipcMain.handle('compositions:get', (_e, id: string) => {
      return this.db.prepare('SELECT * FROM composition_rules WHERE id = ?').get(id);
    });

    ipcMain.handle('compositions:create', (_e, data: any) => {
      const id = data.id || crypto.randomUUID();
      this.db.prepare(`
        INSERT INTO composition_rules (id, name, description, dsl_source, version, enabled, priority, category, lifecycle, schedule_cron, schedule_tz, metadata)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.name, data.description || null, data.dsl_source, data.enabled ?? 1, data.priority ?? 500, data.category || 'general', data.lifecycle || 'manual', data.schedule_cron || null, data.schedule_tz || null, data.metadata ? JSON.stringify(data.metadata) : null);

      this.db.prepare(`INSERT INTO composition_versions (rule_id, version, dsl_source, changelog) VALUES (?, 1, ?, 'initial')`)
        .run(id, data.dsl_source);

      this.engine.reloadRule(id);
      return { id };
    });

    ipcMain.handle('compositions:update', (_e, id: string, data: any) => {
      const existing = this.db.prepare('SELECT * FROM composition_rules WHERE id = ?').get(id) as any;
      if (!existing) throw new Error(`Rule ${id} not found`);

      this.db.prepare(`
        UPDATE composition_rules SET
          name = ?, description = ?, dsl_source = ?, enabled = ?, priority = ?,
          category = ?, lifecycle = ?, schedule_cron = ?, schedule_tz = ?,
          metadata = ?, version = version + 1, updated_at = datetime('now','localtime')
        WHERE id = ?
      `).run(
        data.name ?? existing.name, data.description ?? existing.description,
        data.dsl_source ?? existing.dsl_source,
        data.enabled ?? existing.enabled, data.priority ?? existing.priority,
        data.category ?? existing.category, data.lifecycle ?? existing.lifecycle,
        data.schedule_cron ?? existing.schedule_cron, data.schedule_tz ?? existing.schedule_tz,
        data.metadata ? JSON.stringify(data.metadata) : existing.metadata, id
      );

      const newVersion = (existing.version || 0) + 1;
      this.db.prepare(`INSERT INTO composition_versions (rule_id, version, dsl_source, changelog) VALUES (?, ?, ?, ?)`)
        .run(id, newVersion, data.dsl_source ?? existing.dsl_source, data.changelog || 'updated');

      this.engine.reloadRule(id);
      return { id };
    });

    ipcMain.handle('compositions:delete', (_e, id: string) => {
      this.db.prepare('DELETE FROM composition_rules WHERE id = ?').run(id);
      this.engine.reloadRule(id);
      return { deleted: true };
    });

    ipcMain.handle('compositions:compile', (_e, dslSource: string) => {
      return this.engine.compileRule(dslSource);
    });

    ipcMain.handle('compositions:validate', (_e, dslSource: string, manifestId: string) => {
      return this.engine.validateRule(dslSource, manifestId);
    });

    ipcMain.handle('compositions:evaluate', async (_e, ruleId: string, context?: any) => {
      return await this.engine.evaluate(ruleId, context || {});
    });

    ipcMain.handle('compositions:history', (_e, ruleId?: string, limit = 50) => {
      if (ruleId) {
        return this.db.prepare('SELECT * FROM composition_execution_log WHERE rule_id = ? ORDER BY started_at DESC LIMIT ?').all(ruleId, limit);
      }
      return this.db.prepare('SELECT * FROM composition_execution_log ORDER BY started_at DESC LIMIT ?').all(limit);
    });

    ipcMain.handle('compositions:status', (_e, ruleId?: string) => {
      if (ruleId) {
        return this.db.prepare('SELECT * FROM composition_execution_status WHERE rule_id = ?').get(ruleId);
      }
      return this.db.prepare('SELECT * FROM composition_execution_status').all();
    });

    ipcMain.handle('compositions:settings:get', (_e, key: string) => {
      const row = this.db.prepare('SELECT value FROM composition_settings WHERE key = ?').get(key) as any;
      return row ? row.value : null;
    });

    ipcMain.handle('compositions:settings:set', (_e, key: string, value: string) => {
      this.db.prepare('INSERT OR REPLACE INTO composition_settings (key, value) VALUES (?, ?)').run(key, value);
      return { key, value };
    });

    ipcMain.handle('compositions:list-events', () => {
      const sources = listRegisteredSources();
      const events: Record<string, string[]> = {};
      for (const s of sources) {
        events[s] = listAdapterEvents(s);
      }
      return events;
    });

    ipcMain.handle('compositions:enqueue-event', (_e, topic: string, source: string, payload: any) => {
      this.eventBus.enqueue(topic, source, payload);
      return { enqueued: true };
    });
  }

  pushState() {
    const win = this.getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('compositions:state', {
        ruleCount: this.db.prepare('SELECT COUNT(*) as c FROM composition_rules').get() as any,
      });
    }
  }

  destroy() {
    this.eventBus.destroy();
  }
}
