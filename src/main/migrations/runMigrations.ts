import type Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'

interface MigrationRow {
  version: number
  applied_at: string
}

function ensureMigrationsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

function getAppliedVersions(db: Database.Database): Set<number> {
  const rows = db.prepare('SELECT version FROM schema_migrations').all() as MigrationRow[]
  return new Set(rows.map(r => r.version))
}

export function runMigrations(db: Database.Database) {
  ensureMigrationsTable(db)
  const applied = getAppliedVersions(db)

  const migrations = [
    { version: 1, file: '001_relax_role_check.sql' },
  ]

  for (const m of migrations) {
    if (applied.has(m.version)) continue

    const sql = readFileSync(join(__dirname, m.file), 'utf8')
    const tx = db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(m.version)
    })
    tx()

    console.log(`[Migration] Applied v${m.version}: ${m.file}`)
  }
}
