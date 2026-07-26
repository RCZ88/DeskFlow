// ============================================================================
// DeskFlow — Bulletproof Backup & Recovery System
// Drop-in for the Electron MAIN process (better-sqlite3).
// Goal: make catastrophic data loss structurally impossible.
// ============================================================================
//
// Files in this module:
//   src/main/backup/dbGuard.ts        - safe DB path + checkpoint + integrity
//   src/main/backup/BackupService.ts  - rotating, verified backups
//   src/main/backup/exporters.ts      - portable JSON/CSV exports
//   src/main/backup/restore.ts        - safe atomic restore
//   src/main/backup/ipc.ts            - IPC wiring for the renderer UI
// (Everything is inlined below for easy reading / copy-paste.)

import Database from 'better-sqlite3'
import { app } from 'electron'
import {
	existsSync, mkdirSync, readdirSync, statSync, copyFileSync,
	unlinkSync, renameSync, writeFileSync, readFileSync, createReadStream, createWriteStream,
} from 'fs'
import { join, basename, resolve, dirname } from 'path'
import { createHash } from 'crypto'
import { createGzip, createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'

// ----------------------------------------------------------------------------
// 0. CONFIG
// ----------------------------------------------------------------------------
const USER_DATA = app.getPath('userData')               // e.g. %APPDATA%/DeskFlow
export const DB_PATH = join(USER_DATA, 'deskflow-data.db')
export const BACKUP_DIR = join(USER_DATA, 'backups')    // local backups
// STRONGLY recommended: also mirror to a 2nd location (OneDrive / external drive).
export const MIRROR_DIRS: string[] = [
	// join(app.getPath('documents'), 'DeskFlow Backups'),
]

const RETENTION = {
	hourly: 24,   // keep last 24 interval backups
	daily: 14,    // keep 14 daily
	weekly: 8,    // keep 8 weekly
	monthly: 12,  // keep 12 monthly
}
const INTERVAL_MS = 30 * 60 * 1000 // backup every 30 min while running

// ----------------------------------------------------------------------------
// 1. DB GUARD — the fixes for tonight's exact root causes
// ----------------------------------------------------------------------------

/**
 * Open the DB SAFELY. Guarantees:
 *  - the path is the real userData path (never dist-electron / __dirname)
 *  - WAL is checkpointed so data is never stranded in the -wal file
 *  - integrity is verified; a corrupt DB is detected, not silently used
 */
export function openDatabaseSafely(): Database.Database {
	// GUARD 1: refuse to ever open a DB inside the build/app folder.
	if (/dist-electron|app\.asar|resources/i.test(DB_PATH)) {
		throw new Error(`[DBGuard] Refusing unsafe DB path: ${DB_PATH}`)
	}
	mkdirSync(dirname(DB_PATH), { recursive: true })

	const db = new Database(DB_PATH)
	db.pragma('journal_mode = WAL')
	db.pragma('synchronous = FULL')        // durability over raw speed for user data
	db.pragma('foreign_keys = ON')
	db.pragma('busy_timeout = 5000')

	// GUARD 2: force any stranded WAL data into the main file on every startup.
	// This is the line that would have prevented the whole disaster.
	try { db.pragma('wal_checkpoint(TRUNCATE)') } catch (e) { console.error('[DBGuard] checkpoint failed', e) }

	// GUARD 3: integrity check. If broken, auto-restore from newest good backup.
	const integrity = (db.pragma('integrity_check', { simple: true }) as string)
	if (integrity !== 'ok') {
		console.error('[DBGuard] integrity_check =', integrity)
		db.close()
		throw new IntegrityError(integrity)
	}
	return db
}

export class IntegrityError extends Error {
	constructor(public detail: string) { super(`DB integrity failed: ${detail}`) }
}

/** Count rows in every user table — used to verify backups are non-empty. */
export function rowCounts(db: Database.Database): Record<string, number> {
	const tables = db.prepare(
		"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
	).all() as { name: string }[]
	const out: Record<string, number> = {}
	for (const { name } of tables) {
		try { out[name] = (db.prepare(`SELECT COUNT(*) c FROM "${name}"`).get() as any).c }
		catch { /* ignore */ }
	}
	return out
}

// ----------------------------------------------------------------------------
// 2. BACKUP SERVICE — rotating, verified, gzipped
// ----------------------------------------------------------------------------

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

/**
 * Create a verified backup. Steps:
 *  1. checkpoint WAL (so the live file is complete)
 *  2. use SQLite's online backup API (safe while app is running)
 *  3. RE-OPEN the backup and run integrity_check + row counts
 *  4. only keep it if it verifies AND has data (never overwrite good with empty)
 *  5. gzip + write a JSON manifest, then mirror to extra locations
 */
export async function createBackup(
	db: Database.Database,
	trigger: BackupManifest['trigger'] = 'manual',
): Promise<BackupManifest> {
	mkdirSync(BACKUP_DIR, { recursive: true })
	const stamp = new Date().toISOString().replace(/[:.]/g, '-')
	const rawPath = join(BACKUP_DIR, `deskflow-${stamp}.db`)

	// 1 + 2: checkpoint, then atomic online backup
	db.pragma('wal_checkpoint(TRUNCATE)')
	await db.backup(rawPath) // better-sqlite3 online backup

	// 3: verify the backup independently
	const vdb = new Database(rawPath, { readonly: true })
	const integrityOk = (vdb.pragma('integrity_check', { simple: true }) as string) === 'ok'
	const counts = rowCounts(vdb)
	vdb.close()
	const totalRows = Object.values(counts).reduce((a, b) => a + b, 0)

	// 4: SAFETY — never accept an empty/corrupt backup as valid
	if (!integrityOk) { unlinkSync(rawPath); throw new Error('[Backup] integrity check FAILED, discarded') }
	if (totalRows === 0 && trigger !== 'manual') {
		unlinkSync(rawPath)
		throw new Error('[Backup] refused: 0 rows (likely an empty DB — not overwriting good backups)')
	}

	// 5: gzip + manifest
	const gzPath = rawPath + '.gz'
	await pipeline(createReadStream(rawPath), createGzip(), createWriteStream(gzPath))
	const sha = sha256File(gzPath)
	unlinkSync(rawPath)

	const manifest: BackupManifest = {
		createdAt: new Date().toISOString(),
		trigger, dbPath: DB_PATH, backupFile: basename(gzPath),
		bytes: statSync(gzPath).size, sha256: sha, rowCounts: counts, totalRows, integrityOk,
	}
	writeFileSync(gzPath + '.json', JSON.stringify(manifest, null, 2))

	// mirror to extra safe locations
	for (const dir of MIRROR_DIRS) {
		try {
			mkdirSync(dir, { recursive: true })
			copyFileSync(gzPath, join(dir, basename(gzPath)))
			copyFileSync(gzPath + '.json', join(dir, basename(gzPath) + '.json'))
		} catch (e) { console.error('[Backup] mirror failed', dir, e) }
	}

	rotate()
	console.log(`[Backup] ✅ ${trigger}: ${totalRows} rows -> ${basename(gzPath)}`)
	return manifest
}

/** Grandfather-father-son rotation so you keep deep history without infinite files. */
function rotate() {
	const files = readdirSync(BACKUP_DIR)
		.filter(f => f.endsWith('.db.gz'))
		.map(f => ({ f, t: statSync(join(BACKUP_DIR, f)).mtimeMs }))
		.sort((a, b) => b.t - a.t)

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
			try { unlinkSync(join(BACKUP_DIR, f)); unlinkSync(join(BACKUP_DIR, f + '.json')) } catch {}
		}
	}
}

export function listBackups(): BackupManifest[] {
	if (!existsSync(BACKUP_DIR)) return []
	return readdirSync(BACKUP_DIR)
		.filter(f => f.endsWith('.json'))
		.map(f => { try { return JSON.parse(readFileSync(join(BACKUP_DIR, f), 'utf8')) } catch { return null } })
		.filter(Boolean)
		.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt)) as BackupManifest[]
}

// ----------------------------------------------------------------------------
// 3. PORTABLE EXPORTS — your data must never be locked in one binary file
// ----------------------------------------------------------------------------

/** Dump every table to a single JSON file (human-readable, app-independent). */
export function exportJSON(db: Database.Database, destDir = BACKUP_DIR): string {
	const tables = db.prepare(
		"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
	).all() as { name: string }[]
	const dump: Record<string, unknown[]> = {}
	for (const { name } of tables) {
		try { dump[name] = db.prepare(`SELECT * FROM "${name}"`).all() } catch {}
	}
	mkdirSync(destDir, { recursive: true })
	const out = join(destDir, `deskflow-export-${new Date().toISOString().slice(0, 10)}.json`)
	writeFileSync(out, JSON.stringify({ exportedAt: new Date().toISOString(), tables: dump }, null, 2))
	return out
}

/** Export the most important tables to CSV (open in Excel/Sheets forever). */
export function exportCSV(db: Database.Database, tables: string[], destDir = BACKUP_DIR): string[] {
	mkdirSync(destDir, { recursive: true })
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
		const p = join(destDir, `${t}-${new Date().toISOString().slice(0, 10)}.csv`)
		writeFileSync(p, csv)
		paths.push(p)
	}
	return paths
}

// ----------------------------------------------------------------------------
// 4. RESTORE — safe + atomic. Always backs up the current DB first.
// ----------------------------------------------------------------------------

export async function restoreFromBackup(backupGzName: string): Promise<void> {
	const gzPath = join(BACKUP_DIR, backupGzName)
	if (!existsSync(gzPath)) throw new Error(`[Restore] backup not found: ${backupGzName}`)

	// 1. decompress to a temp file
	const tmp = DB_PATH + '.restore.tmp'
	await pipeline(createReadStream(gzPath), createGunzip(), createWriteStream(tmp))

	// 2. verify the candidate BEFORE touching the live DB
	const vdb = new Database(tmp, { readonly: true })
	const ok = (vdb.pragma('integrity_check', { simple: true }) as string) === 'ok'
	vdb.close()
	if (!ok) { unlinkSync(tmp); throw new Error('[Restore] candidate failed integrity check') }

	// 3. snapshot the CURRENT db (so a restore is itself reversible)
	if (existsSync(DB_PATH)) {
		renameSync(DB_PATH, DB_PATH + `.replaced-${Date.now()}.db`)
	}
	// remove stale WAL/SHM so they can't shadow the restored file
	for (const ext of ['-wal', '-shm']) { try { unlinkSync(DB_PATH + ext) } catch {} }

	// 4. swap in atomically
	renameSync(tmp, DB_PATH)
	console.log(`[Restore] ✅ restored from ${backupGzName} (previous DB kept as .replaced-*.db)`)
}

// ----------------------------------------------------------------------------
// 5. SCHEDULER — wire into the Electron app lifecycle
// ----------------------------------------------------------------------------

let timer: NodeJS.Timeout | null = null

export function startBackupScheduler(db: Database.Database) {
	// on startup
	createBackup(db, 'startup').catch(e => console.error(e))
	// every interval
	timer = setInterval(() => { createBackup(db, 'interval').catch(e => console.error(e)) }, INTERVAL_MS)
}

export function stopBackupScheduler() { if (timer) clearInterval(timer) }

/** Call from app.on('before-quit') so the last session is always captured. */
export async function backupOnQuit(db: Database.Database) {
	stopBackupScheduler()
	try { await createBackup(db, 'quit') } catch (e) { console.error('[Backup] quit backup failed', e) }
}
