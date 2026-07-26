// routes/sync.ts — Push + pull endpoints
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { requireAuth } from "../auth.js"
import { getDb } from "../db/client.js"

const PushBody = z.object({
  changes: z.array(z.object({
    table: z.string(),
    row: z.record(z.unknown()),
  })),
})

const VALID_TABLES = new Set([
  "terminal_sessions",
  "terminal_messages",
  "workspace_problems",
  "workspace_requests",
  "finance",
  "goals",
  "learning",
  "phone_tracking",
])

// Server-side column whitelists — drop unknown columns before INSERT to prevent schema mismatches
const ALLOWED_COLUMNS: Record<string, Set<string>> = {
  terminal_sessions: new Set(["id", "user_id", "device_id", "topic", "status", "agent", "working_directory", "total_tokens", "total_cost", "created_at", "updated_at", "deleted"]),
  terminal_messages: new Set(["id", "user_id", "device_id", "session_id", "role", "content_enc", "status", "created_at", "updated_at", "deleted"]),
  workspace_problems: new Set(["id", "user_id", "device_id", "title", "status", "priority", "category", "description", "created_at", "updated_at", "deleted"]),
  workspace_requests: new Set(["id", "user_id", "device_id", "title", "status", "priority", "category", "description", "created_at", "updated_at", "deleted"]),
  finance: new Set(["id", "device_id", "value_json", "updated_at", "deleted", "rev"]),
  goals: new Set(["id", "device_id", "value_json", "updated_at", "deleted", "rev"]),
  learning: new Set(["id", "device_id", "value_json", "updated_at", "deleted", "rev"]),
  phone_tracking: new Set(["id", "device_id", "value_json", "updated_at", "deleted", "rev"]),
}

// Tables that use (user_id, id) composite PK — ON CONFLICT must exclude user_id from updates
const COMPOSITE_PK_TABLES = new Set(["finance", "goals", "learning", "phone_tracking"])

export async function syncRoutes(app: FastifyInstance) {
  // POST /v1/sync/push — upload local changes
  app.post("/push", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = PushBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() })
    }
    const { sub: userId } = (req as any).user
    const db = getDb()
    let applied = 0
    let maxTs = 0

    for (const change of parsed.data.changes) {
      if (!VALID_TABLES.has(change.table)) continue
      const allowed = ALLOWED_COLUMNS[change.table]
      // Filter to only columns the server knows about (defense against schema drift)
      const filteredRow: Record<string, unknown> = { user_id: userId }
      for (const [k, v] of Object.entries(change.row)) {
        if (allowed.has(k)) filteredRow[k] = v
      }
      const row = filteredRow

      // Track the max timestamp from the pushed rows' updated_at or created_at
      const tsField = row.updated_at ?? row.created_at
      if (tsField != null) {
        const ts = typeof tsField === "number"
          ? tsField
          : Date.parse(String(tsField)) / 1000
        if (!isNaN(ts) && ts > maxTs) maxTs = ts
      }

      const cols = Object.keys(row)
      const placeholders = cols.map(() => "?").join(", ")
      const isComposite = COMPOSITE_PK_TABLES.has(change.table)
      const conflictTarget = isComposite ? "(user_id, id)" : "id"
      const updates = cols.filter(c => c !== "id" && c !== "user_id")
        .map(c => `${c} = excluded.${c}`)
        .join(", ")

      try {
        await db.execute({
          sql: `INSERT INTO ${change.table} (${cols.join(", ")}) VALUES (${placeholders})
                ON CONFLICT${conflictTarget} DO UPDATE SET ${updates}`,
          args: cols.map(c => row[c] as any),
        })
        applied++
      } catch (err: any) {
        console.error(`[sync] push error for ${change.table}:`, err.message)
      }
    }

    // Update cursor — use max timestamp of pushed rows, not Date.now()
    // This prevents skipping un-pushed rows when cursor jumps ahead
    const cursor = maxTs || Date.now()
    await db.execute({
      sql: `INSERT INTO sync_cursors (user_id, table_name, cursor) VALUES (?, '__push__', ?)
            ON CONFLICT(user_id, table_name) DO UPDATE SET cursor = excluded.cursor`,
      args: [userId, cursor],
    })

    return { applied, cursor }
  })

  // GET /v1/sync/pull?since=<cursor> — download remote changes
  app.get("/pull", { preHandler: requireAuth }, async (req, reply) => {
    const { sub: userId } = (req as any).user
    const since = Number((req.query as any).since) || 0
    const db = getDb()

    const changes: Record<string, any[]> = {}
    let maxCursor = since

    for (const table of VALID_TABLES) {
      const isComposite = COMPOSITE_PK_TABLES.has(table)
      // New tables use INTEGER updated_at; existing tables use TEXT
      const sql = isComposite
        ? `SELECT * FROM ${table} WHERE user_id = ? AND updated_at > ? LIMIT 500`
        : `SELECT * FROM ${table} WHERE user_id = ? AND updated_at > datetime(?, 'unixepoch') LIMIT 500`
      const result = await db.execute({
        sql,
        args: [userId, since],
      })
      if (result.rows.length > 0) {
        changes[table] = result.rows
        for (const row of result.rows) {
          const ts = isComposite
            ? (row.updated_at as number)
            : Date.parse(row.updated_at as string) / 1000
          if (ts > maxCursor) maxCursor = ts
        }
      }
    }

    return { changes, cursor: maxCursor }
  })
}
