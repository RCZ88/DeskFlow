import { Database } from 'better-sqlite3';
import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs';

export interface Card {
  id: string;
  deck_id: string;
  card_type: string;
  front: string;
  back: string;
  front_media: string | null;
  back_media: string | null;
  tags: string;
  due: string | null;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
  created_at: string;
}

export interface Deck {
  id: string;
  lesson_id: string;
  title: string;
  node_ids: string;
  created_at: string;
  updated_at: string;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const f = fsrs(generatorParameters({ maximum_interval: 365 }));

export function createDeck(db: Database, deck: Omit<Deck, 'created_at' | 'updated_at'>): Result<Deck> {
  try {
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO learn_decks (id, lesson_id, title, node_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(deck.id, deck.lesson_id, deck.title, deck.node_ids, now, now);
    return { ok: true, data: { ...deck, created_at: now, updated_at: now } };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export function getDueCards(db: Database, deckId?: string, limit = 20): Result<Card[]> {
  try {
    const now = new Date().toISOString();
    const query = deckId
      ? `SELECT * FROM learn_cards WHERE deck_id = ? AND (due IS NULL OR due <= ?) ORDER BY due IS NULL DESC, due ASC LIMIT ?`
      : `SELECT * FROM learn_cards WHERE (due IS NULL OR due <= ?) ORDER BY due IS NULL DESC, due ASC LIMIT ?`;
    const params = deckId ? [deckId, now, limit] : [now, limit];
    const cards = db.prepare(query).all(...params) as Card[];
    return { ok: true, data: cards };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export function processReview(db: Database, cardId: string, rating: Rating): Result<{ card: Card; nextDue: string; interval: number }> {
  try {
    const card = db.prepare('SELECT * FROM learn_cards WHERE id = ?').get(cardId) as Card;
    if (!card) return { ok: false, error: 'Card not found' };

    const fsrsCard = {
      due: card.due ? new Date(card.due) : new Date(),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state as 0 | 1 | 2 | 3,
      last_review: card.last_review ? new Date(card.last_review) : undefined,
    };

    const scheduling = f.repeat(fsrsCard, new Date());
    const next = scheduling[rating];
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE learn_cards SET
        due = ?, stability = ?, difficulty = ?, elapsed_days = ?, scheduled_days = ?,
        reps = ?, lapses = ?, state = ?, last_review = ?
      WHERE id = ?
    `).run(
      next.card.due.toISOString(), next.card.stability, next.card.difficulty,
      next.card.elapsed_days, next.card.scheduled_days, next.card.reps,
      next.card.lapses, next.card.state, now, cardId
    );

    db.prepare(`
      INSERT INTO learn_card_reviews (card_id, rating, review_date, scheduled_days, elapsed_days, stability, difficulty, state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cardId, rating, now, next.card.scheduled_days, next.card.elapsed_days, next.card.stability, next.card.difficulty, next.card.state);

    const updatedCard = db.prepare('SELECT * FROM learn_cards WHERE id = ?').get(cardId) as Card;
    return { ok: true, data: { card: updatedCard, nextDue: next.card.due.toISOString(), interval: next.card.scheduled_days } };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export function importGeneratedCards(db: Database, deckId: string, generatedCards: Array<{ type?: string; front: string; back: string; tags?: string[] }>): Result<{ imported: number; failed: number }> {
  try {
    const insert = db.prepare(`INSERT INTO learn_cards (id, deck_id, card_type, front, back, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    let imported = 0, failed = 0;
    const now = new Date().toISOString();
    for (const card of generatedCards) {
      try {
        const id = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        insert.run(id, deckId, card.type || 'basic', card.front, card.back, JSON.stringify(card.tags || []), now);
        imported++;
      } catch { failed++; }
    }
    return { ok: true, data: { imported, failed } };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export function getDeckStats(db: Database, deckId: string): Result<{ total: number; new: number; learning: number; review: number; due: number }> {
  try {
    const stats = db.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN reps = 0 THEN 1 ELSE 0 END) as new,
        SUM(CASE WHEN state = 1 THEN 1 ELSE 0 END) as learning,
        SUM(CASE WHEN state = 2 THEN 1 ELSE 0 END) as review,
        SUM(CASE WHEN due <= ? THEN 1 ELSE 0 END) as due
      FROM learn_cards WHERE deck_id = ?
    `).get(new Date().toISOString(), deckId) as any;
    return { ok: true, data: { total: stats.total || 0, new: stats.new || 0, learning: stats.learning || 0, review: stats.review || 0, due: stats.due || 0 } };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
