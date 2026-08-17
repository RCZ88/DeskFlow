/**
 * ContextBackfill — history catch-up for the Context Brain
 *
 * The Context Brain is a NEW system: without this pass it only ever sees
 * events that happen AFTER install, so the profile/graph start empty even
 * though months of real data exist. This miner replays EXISTING DeskFlow
 * data into episodes + signals so the brain catches up on day one.
 *
 * Idempotency: a `context_backfill_meta` table stores the last-processed
 * watermark per source. New rows created after the first run are captured
 * by the live episode writers (episodeWriters.ts) — the two paths do not
 * double-write.
 */

import * as fs from 'fs'
import * as path from 'path'
import * as brain from './contextBrain'
import * as userContext from './userContextService'
import { writeGoalEpisode, writeLifePhaseEpisode, writeDeadlineEpisode } from './episodeWriters'

let dbRef: any = null
export function setContextDb(db: any) { dbRef = db }

const BATCH_SIZE = 250
const TEXT_PK_SOURCES = ['terminal_sessions', 'goals', 'life_phases', 'deadlines']

function ensureMeta() {
  dbRef.exec(`CREATE TABLE IF NOT EXISTS context_backfill_meta (
    source TEXT PRIMARY KEY,
    last_id TEXT,
    run_at TEXT
  )`)
}

function getWatermark(source: string): string | null {
  const row = dbRef.prepare('SELECT last_id FROM context_backfill_meta WHERE source = ?').get(source)
  return row ? row.last_id : null
}

function setWatermark(source: string, lastId: string) {
  dbRef.prepare(`INSERT INTO context_backfill_meta (source, last_id, run_at) VALUES (?, ?, ?)
    ON CONFLICT(source) DO UPDATE SET last_id = excluded.last_id, run_at = excluded.run_at`)
    .run(source, String(lastId), new Date().toISOString())
}

function rowId(row: any): string {
  return String(row.id)
}

// ═══ Terminal sessions — topic + agent type as interest signals + episodes ═══
function mineTerminalSessions(): number {
  const wm = getWatermark('terminal_sessions')
  const rows = wm
    ? dbRef.prepare('SELECT * FROM terminal_sessions WHERE id > ? AND topic IS NOT NULL AND topic != ? ORDER BY id ASC LIMIT ?')
        .all(wm, '', BATCH_SIZE)
    : dbRef.prepare('SELECT * FROM terminal_sessions WHERE topic IS NOT NULL AND topic != ? ORDER BY id ASC LIMIT ?')
        .all('', BATCH_SIZE)
  for (const row of rows) {
    const content = `[Terminal session] "${row.topic}" (agent: ${row.agent || 'unknown'})${row.total_tokens ? ` — ${row.total_tokens} tokens` : ''}`
    brain.logEpisode('terminal', content.slice(0, 600), row.id, {
      sessionId: row.id,
      agentType: row.agent,
      topic: row.topic,
      backfilled: true,
    })
    const signals = userContext.extractSignalsFromText(`I am working on ${row.topic}`, 'terminal')
    for (const s of signals) userContext.addSignal(s.signalType, s.content, 'terminal', s.confidence, { sourceRef: `terminal_session:${row.id}` })
    setWatermark('terminal_sessions', rowId(row))
  }
  return rows.length
}

// ═══ Terminal messages — user prompts → interest/topic signals ═══
function mineTerminalMessages(): number {
  const wm = getWatermark('terminal_messages')
  const rows = wm
    ? dbRef.prepare('SELECT id, session_id, role, content FROM terminal_messages WHERE id > ? AND role = ? ORDER BY id ASC LIMIT ?')
        .all(Number(wm), 'user', BATCH_SIZE)
    : dbRef.prepare('SELECT id, session_id, role, content FROM terminal_messages WHERE role = ? ORDER BY id ASC LIMIT ?')
        .all('user', BATCH_SIZE)
  for (const row of rows) {
    const text = String(row.content || '').slice(0, 500)
    if (text.length < 20) { setWatermark('terminal_messages', rowId(row)); continue }
    const signals = userContext.extractSignalsFromText(text, 'terminal')
    for (const s of signals) userContext.addSignal(s.signalType, s.content, 'terminal', s.confidence, { sourceRef: `terminal_msg:${row.id}` })
    setWatermark('terminal_messages', rowId(row))
  }
  return rows.length
}

// ═══ Goals — reuse the live writer so the graph stays consistent ═══
function mineGoals(): number {
  const wm = getWatermark('goals')
  const rows = wm
    ? dbRef.prepare('SELECT * FROM goals WHERE id > ? ORDER BY id ASC LIMIT ?').all(wm, BATCH_SIZE)
    : dbRef.prepare('SELECT * FROM goals ORDER BY id ASC LIMIT ?').all(BATCH_SIZE)
  for (const row of rows) {
    try { writeGoalEpisode(row, 'created') } catch {}
    setWatermark('goals', rowId(row))
  }
  return rows.length
}

// ═══ Life phases — milestones/reflections are high-value context ═══
function mineLifePhases(): number {
  const wm = getWatermark('life_phases')
  const rows = wm
    ? dbRef.prepare('SELECT * FROM life_phases WHERE id > ? ORDER BY id ASC LIMIT ?').all(wm, BATCH_SIZE)
    : dbRef.prepare('SELECT * FROM life_phases ORDER BY id ASC LIMIT ?').all(BATCH_SIZE)
  for (const row of rows) {
    try { writeLifePhaseEpisode(row, 'created') } catch {}
    setWatermark('life_phases', rowId(row))
  }
  return rows.length
}

// ═══ Deadlines — due dates/courses as goal_pattern signals ═══
function mineDeadlines(): number {
  const wm = getWatermark('deadlines')
  const rows = wm
    ? dbRef.prepare('SELECT * FROM deadlines WHERE id > ? ORDER BY id ASC LIMIT ?').all(wm, BATCH_SIZE)
    : dbRef.prepare('SELECT * FROM deadlines ORDER BY id ASC LIMIT ?').all(BATCH_SIZE)
  for (const row of rows) {
    try { writeDeadlineEpisode(row, 'created') } catch {}
    setWatermark('deadlines', rowId(row))
  }
  return rows.length
}

// ═══ Problems & requests (agent/ JSON store) — user priorities as signals ═══
function mineProblemFiles(): number {
  let mined = 0
  const projectRoot = process.cwd()
  const candidates = [
    path.join(projectRoot, 'agent', 'problems.json'),
    path.join(projectRoot, 'agent', 'requests.json'),
  ]
  for (const file of candidates) {
    const source = file.endsWith('problems.json') ? 'problems' : 'requests'
    let items: any[] = []
    try { items = JSON.parse(fs.readFileSync(file, 'utf8')) } catch { continue }
    if (!Array.isArray(items)) continue
    for (const item of items) {
      const title = item.title || item.name
      const desc = item.description || item.details || ''
      const text = `${title}${desc ? ` — ${desc}` : ''}`.slice(0, 400)
      if (text.length < 15) continue
      const signals = userContext.extractSignalsFromText(`My priority: ${text}`, source)
      for (const s of signals) userContext.addSignal(s.signalType, s.content, source, s.confidence, { sourceRef: `${source}:${item.id || item.title}` })
      mined++
    }
  }
  return mined
}

export function runContextBackfill(): { ok: boolean; sources: Record<string, number>; total: number } {
  const results: Record<string, number> = {}
  let total = 0
  if (!dbRef) return { ok: false, sources: results, total: 0 }
  try { ensureMeta() } catch (e: any) { console.warn('[ContextBackfill] meta init failed:', e?.message); return { ok: false, sources: results, total: 0 } }

  const miners: Array<[string, () => number]> = [
    ['terminal_sessions', mineTerminalSessions],
    ['terminal_messages', mineTerminalMessages],
    ['goals', mineGoals],
    ['life_phases', mineLifePhases],
    ['deadlines', mineDeadlines],
    ['problems', mineProblemFiles],
  ]
  for (const [name, fn] of miners) {
    try {
      const n = fn()
      results[name] = n
      total += n
    } catch (e: any) {
      console.warn(`[ContextBackfill] ${name} failed:`, e?.message)
      results[name] = -1
    }
  }
  if (total > 0) console.log(`[ContextBackfill] processed ${total} existing record(s) into the context brain`, results)
  else console.log('[ContextBackfill] nothing to backfill — all sources already caught up')
  return { ok: true, sources: results, total }
}