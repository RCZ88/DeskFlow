// routes/pairing.ts — Phone pairing code management
// Desktop POSTs generated codes here; phone redeems via POST /v1/auth/pair
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import crypto from "crypto"
import { requireAuth } from "../auth.js"
import { getDb } from "../db/client.js"

const CreateCodeBody = z.object({
  code: z.string().regex(/^[A-Z0-9]{8}$/),
  terminal_id: z.string().min(1),
  relay_host: z.string().min(1),
  relay_port: z.number().int().default(8788),
  expires_at: z.number().int(),
})

export async function pairingRoutes(app: FastifyInstance) {
  // POST /v1/pairing/codes — desktop registers a generated pairing code
  app.post("/codes", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = CreateCodeBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() })
    }

    const { code, terminal_id, relay_host, relay_port, expires_at } = parsed.data
    const { sub: userId } = (req as any).user
    const codeHash = crypto.createHash("sha256").update(code).digest("hex")
    const now = Math.floor(Date.now() / 1000)

    if (expires_at <= now) {
      return reply.status(400).send({ error: "code already expired" })
    }

    const db = getDb()

    // Check for duplicate hash
    const existing = await db.execute({
      sql: "SELECT code_hash FROM pairing_codes WHERE code_hash = ?",
      args: [codeHash],
    })
    if (existing.rows.length > 0) {
      return reply.status(409).send({ error: "duplicate code (hash collision)" })
    }

    await db.execute({
      sql: `INSERT INTO pairing_codes (code_hash, terminal_id, relay_host, relay_port, expires_at, used, user_id)
            VALUES (?, ?, ?, ?, ?, 0, ?)`,
      args: [codeHash, terminal_id, relay_host, relay_port, expires_at, userId],
    })

    // Audit
    await db.execute({
      sql: "INSERT INTO audit_log (user_id, event, entity_type, entity_id, detail) VALUES (?, 'pairing_code_created', 'pairing', ?, ?)",
      args: [userId, codeHash, JSON.stringify({ terminal_id, relay_host, relay_port, expires_at })],
    })

    return { success: true }
  })

  // GET /v1/pairing/codes — list active pairing codes (for debugging)
  app.get("/codes", { preHandler: requireAuth }, async (_req, reply) => {
    const db = getDb()
    const now = Math.floor(Date.now() / 1000)
    const result = await db.execute({
      sql: "SELECT terminal_id, relay_host, relay_port, expires_at, used, created_at FROM pairing_codes WHERE expires_at > ? ORDER BY created_at DESC LIMIT 50",
      args: [now],
    })
    return { codes: result.rows }
  })
}
