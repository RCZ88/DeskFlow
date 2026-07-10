// routes/relay.ts — Relay ticket issuance for phone pairing
import type { FastifyInstance } from "fastify"
import { SignJWT } from "jose"
import { requireAuth } from "../auth.js"
import { getDb } from "../db/client.js"

function getRelaySecret(): Uint8Array {
  const secret = process.env.RELAY_TICKET_SECRET
  if (!secret) throw new Error("RELAY_TICKET_SECRET not set")
  return new TextEncoder().encode(secret)
}

export async function relayRoutes(app: FastifyInstance) {
  // POST /v1/relay/ticket — issue a short-lived relay ticket
  app.post("/ticket", { preHandler: requireAuth }, async (req, reply) => {
    const { sub: userId } = (req as any).user
    const db = getDb()

    try {
      const key = getRelaySecret()
      const ticket = await new SignJWT({ sub: userId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("60s")
        .sign(key)

      // Audit log
      await db.execute({
        sql: "INSERT INTO audit_log (user_id, event, entity_type, detail) VALUES (?, 'relay_ticket', 'relay', ?)",
        args: [userId, JSON.stringify({ issued_at: new Date().toISOString() })],
      })

      return { ticket }
    } catch (err: any) {
      req.log.error(err, "failed to issue relay ticket")
      return reply.status(500).send({ error: "failed to issue ticket" })
    }
  })
}
