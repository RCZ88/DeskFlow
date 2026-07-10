// routes/devices.ts — Paired device management
import type { FastifyInstance } from "fastify"
import { requireAuth } from "../auth.js"
import { getDb } from "../db/client.js"

export async function deviceRoutes(app: FastifyInstance) {
  // GET /v1/devices — list all devices for the authenticated user
  app.get("/", { preHandler: requireAuth }, async (req, reply) => {
    const { sub: userId } = (req as any).user
    const db = getDb()
    try {
      const result = await db.execute({
        sql: "SELECT id, name, platform, paired_at as created_at, last_seen FROM devices WHERE user_id = ? ORDER BY last_seen DESC",
        args: [userId],
      })
      return { devices: result.rows }
    } catch (err: any) {
      req.log.error(err, "devices:list failed")
      return reply.status(500).send({ error: "failed to list devices" })
    }
  })

  // POST /v1/devices/:id/revoke — revoke a single device
  app.post("/:id/revoke", { preHandler: requireAuth }, async (req, reply) => {
    const { sub: userId } = (req as any).user
    const { id: deviceId } = req.params as { id: string }
    const db = getDb()
    try {
      // Verify device belongs to user
      const check = await db.execute({
        sql: "SELECT id FROM devices WHERE id = ? AND user_id = ?",
        args: [deviceId, userId],
      })
      if (check.rows.length === 0) {
        return reply.status(404).send({ error: "device not found" })
      }
      // Delete the device (cascade deletes refresh_tokens)
      await db.execute({
        sql: "DELETE FROM devices WHERE id = ? AND user_id = ?",
        args: [deviceId, userId],
      })
      // Audit log
      await db.execute({
        sql: "INSERT INTO audit_log (user_id, event, entity_type, entity_id, detail) VALUES (?, 'device_revoked', 'device', ?, ?)",
        args: [userId, deviceId, JSON.stringify({ revoked_at: new Date().toISOString() })],
      })
      return { success: true }
    } catch (err: any) {
      req.log.error(err, "devices:revoke failed")
      return reply.status(500).send({ error: "failed to revoke device" })
    }
  })

  // POST /v1/devices/revoke-all — revoke ALL devices for the user
  app.post("/revoke-all", { preHandler: requireAuth }, async (req, reply) => {
    const { sub: userId } = (req as any).user
    const db = getDb()
    try {
      const result = await db.execute({
        sql: "DELETE FROM devices WHERE user_id = ?",
        args: [userId],
      })
      // Audit log
      await db.execute({
        sql: "INSERT INTO audit_log (user_id, event, entity_type, detail) VALUES (?, 'device_revoked_all', 'device', ?)",
        args: [userId, JSON.stringify({ revoked_at: new Date().toISOString(), count: result.rowsAffected })],
      })
      return { success: true }
    } catch (err: any) {
      req.log.error(err, "devices:revoke-all failed")
      return reply.status(500).send({ error: "failed to revoke all devices" })
    }
  })
}
