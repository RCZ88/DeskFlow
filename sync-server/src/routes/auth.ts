// routes/auth.ts — Pair + refresh endpoints
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import crypto from "crypto"
import { signAccess, signRefresh, verifyToken } from "../auth.js"
import { getDb } from "../db/client.js"
import { randomUUID } from "crypto"

const PairBody = z.object({
  code: z.string().regex(/^[A-Z0-9]{8}$/).optional(),
  email: z.string().email().optional(),
  deviceName: z.string().optional(),
  platform: z.string().optional(),
})

const RefreshBody = z.object({
  refreshToken: z.string(),
})

export async function authRoutes(app: FastifyInstance) {
  // POST /v1/auth/pair — create or retrieve a user + device, return tokens
  //
  // Two modes:
  //   1. With `code` — phone pairing flow. Validates 8-char code against
  //      pairing_codes table, marks used, creates anonymous user + device.
  //   2. Without `code` — legacy email flow (backward compat).
  app.post("/pair", async (req, reply) => {
    const parsed = PairBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() })
    }
    const { code, email, deviceName, platform } = parsed.data
    const db = getDb()

    let relayHost: string | null = null
    let relayPort = 8788
    let terminalId: string | null = null

    // ── Code-based pairing (phone flow) ───────────────────────────
    if (code) {
      const codeHash = crypto.createHash("sha256").update(code).digest("hex")
      const now = Math.floor(Date.now() / 1000)

      const row = await db.execute({
        sql: "SELECT terminal_id, relay_host, relay_port, expires_at FROM pairing_codes WHERE code_hash = ? AND used = 0 AND expires_at > ?",
        args: [codeHash, now],
      })

      if (row.rows.length === 0) {
        return reply.status(401).send({ error: "invalid, expired, or already-used pairing code" })
      }

      const match = row.rows[0]
      terminalId = match.terminal_id as string
      relayHost = match.relay_host as string
      relayPort = (match.relay_port as number) || 8788

      // Mark code as used (one-time)
      await db.execute({
        sql: "UPDATE pairing_codes SET used = 1 WHERE code_hash = ?",
        args: [codeHash],
      })
    }

    // ── Find or create user ───────────────────────────────────────
    let userId: string
    if (email) {
      const existing = await db.execute({
        sql: "SELECT id FROM users WHERE email = ?",
        args: [email],
      })
      if (existing.rows.length > 0) {
        userId = existing.rows[0].id as string
      } else {
        userId = randomUUID()
        await db.execute({
          sql: "INSERT INTO users (id, email) VALUES (?, ?)",
          args: [userId, email],
        })
      }
    } else {
      userId = randomUUID()
      await db.execute({
        sql: "INSERT INTO users (id) VALUES (?)",
        args: [userId],
      })
    }

    // ── Create device ─────────────────────────────────────────────
    const deviceId = randomUUID()
    await db.execute({
      sql: "INSERT INTO devices (id, user_id, name, platform) VALUES (?, ?, ?, ?)",
      args: [deviceId, userId, deviceName || "unknown", platform || "unknown"],
    })

    // If code-based pairing, update consumed_by_device_id
    if (code) {
      const codeHash = crypto.createHash("sha256").update(code).digest("hex")
      await db.execute({
        sql: "UPDATE pairing_codes SET consumed_by_device_id = ?, consumed_at = ? WHERE code_hash = ?",
        args: [deviceId, Math.floor(Date.now() / 1000), codeHash],
      })
    }

    // ── Sign tokens ───────────────────────────────────────────────
    const accessToken = await signAccess(userId, deviceId, "1h")
    const refreshToken = await signRefresh(userId, deviceId, "30d")

    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 3600
    await db.execute({
      sql: "INSERT INTO refresh_tokens (token, user_id, device_id, expires_at) VALUES (?, ?, ?, ?)",
      args: [refreshToken, userId, deviceId, expiresAt],
    })

    // Audit
    await db.execute({
      sql: "INSERT INTO audit_log (user_id, event, entity_type, entity_id, detail) VALUES (?, 'pair', 'device', ?, ?)",
      args: [userId, deviceId, JSON.stringify({ code: !!code, deviceName, platform })],
    })

    const response: Record<string, any> = { accessToken, refreshToken, userId, deviceId }
    if (code && relayHost) {
      response.relayUrl = `ws://${relayHost}:${relayPort}`
      response.terminalId = terminalId
    }
    return response
  })

  // POST /v1/auth/refresh — exchange refresh token for new access token
  app.post("/refresh", async (req, reply) => {
    const parsed = RefreshBody.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() })
    }
    const db = getDb()

    try {
      const payload = await verifyToken(parsed.data.refreshToken)
      if (payload.type !== "refresh") {
        return reply.status(401).send({ error: "not a refresh token" })
      }

      // Check token exists in DB
      const row = await db.execute({
        sql: "SELECT user_id, device_id, expires_at FROM refresh_tokens WHERE token = ?",
        args: [parsed.data.refreshToken],
      })
      if (row.rows.length === 0) {
        return reply.status(401).send({ error: "refresh token revoked" })
      }

      const { user_id, device_id } = row.rows[0]
      const newAccessToken = await signAccess(user_id as string, device_id as string, "1h")

      return { accessToken: newAccessToken }
    } catch {
      return reply.status(401).send({ error: "invalid refresh token" })
    }
  })
}
