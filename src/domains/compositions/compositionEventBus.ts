import { EventBusEvent } from './compositionTypes';
import type Database from 'better-sqlite3';

type TopicHandler = (event: EventBusEvent) => void | Promise<void>;

export class CompositionEventBus {
  private handlers = new Map<string, Set<TopicHandler>>();
  private globalHandlers = new Set<TopicHandler>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private db: Database.Database | null = null;

  setDb(db: Database.Database) { this.db = db; }

  startFlushTimer(intervalMs = 5000) {
    if (this.timer) return;
    this.timer = setInterval(() => this.flushOutbox(), intervalMs);
  }

  stopFlushTimer() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  subscribe(topic: string, handler: TopicHandler): () => void {
    if (!this.handlers.has(topic)) this.handlers.set(topic, new Set());
    this.handlers.get(topic)!.add(handler);
    return () => this.handlers.get(topic)?.delete(handler);
  }

  subscribeAll(handler: TopicHandler): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  async emit(event: EventBusEvent): Promise<void> {
    const topicHandlers = this.handlers.get(event.topic);
    const promises: Promise<void>[] = [];

    if (topicHandlers) {
      for (const h of topicHandlers) {
        try { promises.push(Promise.resolve(h(event))); } catch {}
      }
    }
    for (const h of this.globalHandlers) {
      try { promises.push(Promise.resolve(h(event))); } catch {}
    }
    await Promise.allSettled(promises);
  }

  emitSync(event: EventBusEvent) {
    const topicHandlers = this.handlers.get(event.topic);
    if (topicHandlers) {
      for (const h of topicHandlers) {
        try { h(event); } catch {}
      }
    }
    for (const h of this.globalHandlers) {
      try { h(event); } catch {}
    }
  }

  enqueue(topic: string, source: string, payload: any, dedupeKey?: string, ttlMs?: number) {
    const event: EventBusEvent = {
      topic, source, payload,
      timestamp: new Date().toISOString(),
      dedupeKey, ttlMs,
    };

    if (this.db) {
      this.db.prepare(`
        INSERT INTO composition_event_outbox (topic, source, payload_json, dedupe_key, ttl_ms, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(topic, source, JSON.stringify(payload), dedupeKey || null, ttlMs || null);
    }

    this.emitSync(event);
  }

  flushOutbox() {
    if (!this.db || !this.db.open) {
      this.stopFlushTimer();
      return;
    }
    try {
      const rows = this.db.prepare(`
        SELECT * FROM composition_event_outbox WHERE status = 'pending' ORDER BY id ASC LIMIT 50
      `).all() as any[];

      for (const row of rows) {
        try {
          const event: EventBusEvent = {
            topic: row.topic,
            source: row.source,
            payload: JSON.parse(row.payload_json),
            timestamp: row.created_at,
            dedupeKey: row.dedupe_key,
            ttlMs: row.ttl_ms,
          };
          this.emitSync(event);
          this.db.prepare(`UPDATE composition_event_outbox SET status = 'delivered' WHERE id = ?`).run(row.id);
        } catch (err) {
          try { this.db.prepare(`UPDATE composition_event_outbox SET status = 'failed' WHERE id = ?`).run(row.id); } catch {}
        }
      }
    } catch {
      this.stopFlushTimer();
    }
  }

  destroy() {
    this.stopFlushTimer();
    this.handlers.clear();
    this.globalHandlers.clear();
  }
}
