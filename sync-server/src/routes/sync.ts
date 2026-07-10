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
])

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

    for (const change of parsed.data.changes) {
      if (!VALID_TABLES.has(change.table)) continue
      const row = { ...change.row, user_id: userId }

      const cols = Object.keys(row)
      const placeholders = cols.map(() => "?").join(", ")
      const updates = cols.filter(c => c !== "id" && c !== "user_id")
        .map(c => `${c} = excluded.${c}`)
        .join(", ")

      try {
        await db.execute({
          sql: `INSERT INTO ${change.table} (${cols.join(", ")}) VALUES (${placeholders})
                ON CONFLICT(id) DO UPDATE SET ${updates}`,
          args: cols.map(c => row[c] as any),
        })
        applied++
      } catch (err: any) {
        console.error(`[sync] push error for ${change.table}:`, err.message)
      }
    }

    // Update cursor
    const cursor = Date.now()
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
      const result = await db.execute({
        sql: `SELECT * FROM ${table} WHERE user_id = ? AND updated_at > datetime(?, 'unixepoch') LIMIT 500`,
        args: [userId, since],
      })
      if (result.rows.length > 0) {
        changes[table] = result.rows
        for (const row of result.rows) {
          const ts = Date.parse(row.updated_at as string) / 1000
          if (ts > maxCursor) maxCursor = ts
        }
      }
    }

    return { changes, cursor: maxCursor }
  })
}
