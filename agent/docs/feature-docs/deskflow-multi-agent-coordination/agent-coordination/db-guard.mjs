#!/usr/bin/env node
/**
 * agent-coordination/db-guard.mjs
 * ---------------------------------------------------------------------------
 * Protects the ONE SQLite file (userData/deskflow-data.db) that DeskFlow uses.
 * better-sqlite3 is a single-writer engine, so two processes writing = lock
 * errors, corruption, and the "database disconnected" symptom.
 *
 * This does two things:
 *   1) backup   — timestamped copy of the DB + its JSON sidecars BEFORE any
 *                 destructive / migration / bulk-import operation. Keeps the
 *                 last N backups. This is your undo button against
 *                 "an agent deleted/overwrote everything".
 *   2) run      — wrap a DB-touching command so it can only run while holding
 *                 the exclusive "db" lock AND no app instance is running.
 *
 * Usage:
 *   node db-guard.mjs backup                 # take a snapshot now
 *   node db-guard.mjs run -- node scripts/migrate.mjs
 *   node db-guard.mjs where                  # print the resolved db path
 *
 * DB path resolution order:
 *   --db <path>  →  $DESKFLOW_DB  →  OS default userData/deskflow-data.db
 * ---------------------------------------------------------------------------
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { acquireLock, releaseLock, getState, done } from './coord.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const BACKUP_DIR = path.join(HERE, 'backups')
const KEEP = 20
const APP_NAME = process.env.DESKFLOW_APP_NAME || 'deskflow' // Electron app name / folder

function defaultUserData() {
  const home = os.homedir()
  if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), APP_NAME)
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', APP_NAME)
  return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), APP_NAME)
}

function resolveDbPath(argv) {
  const flagIdx = argv.indexOf('--db')
  if (flagIdx !== -1 && argv[flagIdx + 1]) return argv[flagIdx + 1]
  if (process.env.DESKFLOW_DB) return process.env.DESKFLOW_DB
  return path.join(defaultUserData(), 'deskflow-data.db')
}

// The sidecar files that travel with the DB (from main.ts userData paths).
function sidecars(dbPath) {
  const dir = path.dirname(dbPath)
  return [
    dbPath,
    dbPath + '-wal', dbPath + '-shm', // in case WAL is ever enabled
    path.join(dir, 'deskflow-data.json'),
    path.join(dir, 'deskflow-sleep-state.json'),
    path.join(dir, 'deskflow-sleep-pattern.json'),
    path.join(dir, 'deskflow-categories.json'),
  ]
}

function backup(dbPath) {
  if (!fs.existsSync(dbPath)) {
    console.error(`db-guard: no DB at ${dbPath} — nothing to back up (set --db or $DESKFLOW_DB).`)
    return null
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = path.join(BACKUP_DIR, stamp)
  fs.mkdirSync(dest, { recursive: true })
  let n = 0
  for (const f of sidecars(dbPath)) {
    if (fs.existsSync(f)) { fs.copyFileSync(f, path.join(dest, path.basename(f))); n++ }
  }
  // prune old backups
  const all = fs.readdirSync(BACKUP_DIR).filter((d) => fs.statSync(path.join(BACKUP_DIR, d)).isDirectory()).sort()
  for (const old of all.slice(0, Math.max(0, all.length - KEEP))) {
    fs.rmSync(path.join(BACKUP_DIR, old), { recursive: true, force: true })
  }
  console.error(`db-guard: backed up ${n} file(s) → ${dest}`)
  return dest
}

const [sub, ...rest] = process.argv.slice(2)
const dbPath = resolveDbPath(rest)

if (sub === 'where') {
  console.log(dbPath)
  process.exit(0)
}

if (sub === 'backup') {
  backup(dbPath)
  process.exit(0)
}

if (sub === 'run') {
  const dd = rest.indexOf('--')
  const cmd = dd === -1 ? [] : rest.slice(dd + 1)
  if (cmd.length === 0) { console.error('db-guard run: expected -- <command...>'); process.exit(2) }

  const AGENT = process.env.AGENT_ID || `db-${process.pid}`
  const st = getState()
  if (st.locks.app) {
    console.error(`REFUSED: the app is running (lock "app" held by ${st.locks.app.agent}). It owns the SQLite writer.`)
    console.error(`Stop the app before running DB work, or you will hit "database is locked".`)
    process.exit(3)
  }
  const got = acquireLock(AGENT, 'db', undefined, cmd.join(' '))
  if (!got.ok) {
    console.error(`REFUSED: another agent holds the "db" lock (${got.heldBy}).`)
    process.exit(3)
  }
  try {
    backup(dbPath) // always snapshot before touching data
    const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, DESKFLOW_DB: dbPath } })
    process.exitCode = r.status ?? 1
  } finally {
    releaseLock(AGENT, 'db')
    done(AGENT)
  }
  process.exit(process.exitCode)
}

console.log(`db-guard.mjs — usage:
  node db-guard.mjs where
  node db-guard.mjs backup [--db <path>]
  node db-guard.mjs run   [--db <path>] -- <command...>`)
