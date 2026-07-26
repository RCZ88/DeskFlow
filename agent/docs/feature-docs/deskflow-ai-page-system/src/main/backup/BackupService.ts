import { app } from 'electron'
import {
  existsSync, mkdirSync, readdirSync, statSync, copyFileSync,
  unlinkSync, renameSync, writeFileSync, readFileSync, createReadStream, createWriteStream,
} from 'fs'
import { join, basename, dirname } from 'path'
import { createHash } from 'crypto'
import { createGzip, createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'

function getDbPath() {
  return join(app.getPath('userData'), 'deskflow-data.db')
}

function getBackupDir() {
  return join(app.getPath('userData'), 'backups')
}

const RETENTION = {
  hourly: 24,
  daily: 14,
  weekly: 8,
  monthly: 12,
}

const INTERVAL_MS = 30 * 60 * 1000

export class IntegrityError extends Error {
  constructor(public detail: string) {
    super(`DB integrity failed: ${detail}`)
  }
}

export function openDatabaseSafely(): ReturnType<typeof import('better-sqlite3')> {
  const dbPath = getDbPath()
  if (/dist-electron|app\.asar|resources/i.test(dbPath)) {
    throw new Error(`[DBGuard] Refusing unsafe DB path: ${dbPath}`)
  }
  mkdirSync(dirname(dbPath), { recursive: true })

  const Database = require('better-sqlite3')
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = FULL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')

  try { db.pragma('wal_checkpoint(TRUNCATE)') } catch (e) { console.error('[DBGuard] checkpoint failed', e) }

  const integrity = db.pragma('integrity_check', { simple: true }) as string
  if (integrity !== 'ok') {
    console.error('[DBGuard] integrity_check =', integrity)
    db.close()
    throw new IntegrityError(integrity)
  }
  return db
}

export function rowCounts(db: any): Record<string, number> {
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all() as { name: string }[]
  const out: Record<string, number> = {}
  for (const { name } of tables) {
    try { out[name] = (db.prepare(`SELECT COUNT(*) c FROM "${name}"`).get() as any).c } catch { }
  }
  return out
}

export interface BackupManifest {
  createdAt: string
  trigger: 'startup' | 'interval' | 'quit' | 'manual' | 'pre-restore'
  dbPath: string
  backupFile: string
  bytes: number
  sha256: string
  rowCounts: Record<string, number>
  totalRows: number
  integrityOk: boolean
}

function sha256File(path: string): string {
  const h = createHash('sha256')
  h.update(readFileSync(path))
  return h.digest('hex')
}

export async function createBackup(
  db: any,
  trigger: BackupManifest['trigger'] = 'manual',
): Promise<BackupManifest> {
  const backupDir = getBackupDir()
  mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const rawPath = join(backupDir, `deskflow-${stamp}.db`)

  db.pragma('wal_checkpoint(TRUNCATE)')
  const srcDbPath = getDbPath()
  copyFileSync(srcDbPath, rawPath)

  const Database = require('better-sqlite3')
  const vdb = new Database(rawPath)
  const integrityOk = (vdb.pragma('integrity_check', { simple: true }) as string) === 'ok'
  const counts = rowCounts(vdb)
  vdb.close()
  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0)

  if (!integrityOk) { unlinkSync(rawPath); throw new Error('[Backup] integrity check FAILED, discarded') }
  if (totalRows === 0 && trigger !== 'manual') {
    unlinkSync(rawPath)
    throw new Error('[Backup] refused: 0 rows — not overwriting good backups')
  }

  const gzPath = rawPath + '.gz'
  await pipeline(createReadStream(rawPath), createGzip(), createWriteStream(gzPath))
  const sha = sha256File(gzPath)
  unlinkSync(rawPath)

  const manifest: BackupManifest = {
    createdAt: new Date().toISOString(),
    trigger, dbPath: getDbPath(), backupFile: basename(gzPath),
    bytes: statSync(gzPath).size, sha256: sha, rowCounts: counts, totalRows, integrityOk,
  }
  writeFileSync(gzPath + '.json', JSON.stringify(manifest, null, 2))
  rotate()
  console.log(`[Backup] ${trigger}: ${totalRows} rows -> ${basename(gzPath)}`)
  return manifest
}

function rotate() {
  const backupDir = getBackupDir()
  let files: { f: string; t: number }[] = []
  try {
    files = readdirSync(backupDir)
      .filter(f => f.endsWith('.db.gz'))
      .map(f => ({ f, t: statSync(join(backupDir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t)
  } catch { return }

  const keep = new Set<string>()
  const byBucket = (fmt: (d: Date) => string, limit: number) => {
    const seen = new Set<string>()
    for (const { f, t } of files) {
      const key = fmt(new Date(t))
      if (!seen.has(key)) { seen.add(key); keep.add(f) }
      if (seen.size >= limit) break
    }
  }
  files.slice(0, RETENTION.hourly).forEach(x => keep.add(x.f))
  byBucket(d => d.toISOString().slice(0, 10), RETENTION.daily)
  byBucket(d => `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`, RETENTION.weekly)
  byBucket(d => d.toISOString().slice(0, 7), RETENTION.monthly)

  for (const { f } of files) {
    if (!keep.has(f)) {
      try { unlinkSync(join(backupDir, f)); unlinkSync(join(backupDir, f + '.json')) } catch { }
    }
  }
}

export function listBackups(): BackupManifest[] {
  const backupDir = getBackupDir()
  if (!existsSync(backupDir)) return []
  return readdirSync(backupDir)
    .filter(f => f.endsWith('.json'))
    .map(f => { try { return JSON.parse(readFileSync(join(backupDir, f), 'utf8')) } catch { return null } })
    .filter(Boolean)
    .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)) as BackupManifest[]
}

export function exportJSON(db: any, destDir?: string): string {
  const backupDir = destDir || getBackupDir()
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).all() as { name: string }[]
  const dump: Record<string, unknown[]> = {}
  for (const { name } of tables) {
    try { dump[name] = db.prepare(`SELECT * FROM "${name}"`).all() } catch { }
  }
  mkdirSync(backupDir, { recursive: true })
  const out = join(backupDir, `deskflow-export-${new Date().toISOString().slice(0, 10)}.json`)
  writeFileSync(out, JSON.stringify({ exportedAt: new Date().toISOString(), tables: dump }, null, 2))
  return out
}

export function exportCSV(db: any, tables: string[], destDir?: string): string[] {
  const backupDir = destDir || getBackupDir()
  mkdirSync(backupDir, { recursive: true })
  const paths: string[] = []
  for (const t of tables) {
    const rows = db.prepare(`SELECT * FROM "${t}"`).all() as Record<string, unknown>[]
    if (!rows.length) continue
    const cols = Object.keys(rows[0])
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')
    const p = join(backupDir, `${t}-${new Date().toISOString().slice(0, 10)}.csv`)
    writeFileSync(p, csv)
    paths.push(p)
  }
  return paths
}

export async function restoreFromBackup(backupGzName: string): Promise<void> {
  const gzPath = join(getBackupDir(), backupGzName)
  if (!existsSync(gzPath)) throw new Error(`[Restore] backup not found: ${backupGzName}`)

  const tmp = getDbPath() + '.restore.tmp'
  await pipeline(createReadStream(gzPath), createGunzip(), createWriteStream(tmp))

  const Database = require('better-sqlite3')
  const vdb = new Database(tmp, { readonly: true })
  const ok = (vdb.pragma('integrity_check', { simple: true }) as string) === 'ok'
  vdb.close()
  if (!ok) { unlinkSync(tmp); throw new Error('[Restore] candidate failed integrity check') }

  const dbPath = getDbPath()
  if (existsSync(dbPath)) {
    renameSync(dbPath, dbPath + `.replaced-${Date.now()}.db`)
  }
  for (const ext of ['-wal', '-shm']) { try { unlinkSync(dbPath + ext) } catch { } }
  renameSync(tmp, dbPath)
  console.log(`[Restore] restored from ${backupGzName} (previous DB kept as .replaced-*.db)`)
}

let timer: NodeJS.Timeout | null = null

export function startBackupScheduler(db: any) {
  createBackup(db, 'startup').catch((e: any) => console.error('[Backup] startup backup failed', e))
  timer = setInterval(() => { createBackup(db, 'interval').catch((e: any) => console.error(e)) }, INTERVAL_MS)
}

export function stopBackupScheduler() { if (timer) clearInterval(timer) }

export async function backupOnQuit(db: any) {
  stopBackupScheduler()
  try { await createBackup(db, 'quit') } catch (e) { console.error('[Backup] quit backup failed', e) }
}
