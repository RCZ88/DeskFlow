// index.ts — DeskFlow Sync Server (Fastify v5)
import "dotenv/config"
import Fastify from "fastify"
import { initDatabase } from "./db/init.js"
import { closeDb } from "./db/client.js"
import { authRoutes } from "./routes/auth.js"
import { syncRoutes } from "./routes/sync.js"
import { relayRoutes } from "./routes/relay.js"
import { learnRoutes } from "./routes/learn.js"
import { pairingRoutes } from "./routes/pairing.js"
import { deviceRoutes } from "./routes/devices.js"
import { phoneRoutes } from "./routes/phone.js"
import { workspaceRoutes } from "./routes/workspace.js"

const PORT = parseInt(process.env.PORT || "8787", 10)
const HOST = process.env.HOST || "0.0.0.0"

async function main() {
  const app = Fastify({
    logger: {
      level: "info",
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    },
    bodyLimit: 10 * 1024 * 1024, // 10MB — encrypted terminal messages can be large
  })

  // CORS
  await app.register(import("@fastify/cors"), {
    origin: process.env.CORS_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })

  // Health check
  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }))

  // Initialize database
  await initDatabase()

  // Register routes
  await app.register(authRoutes, { prefix: "/v1/auth" })
  await app.register(syncRoutes, { prefix: "/v1/sync" })
  await app.register(relayRoutes, { prefix: "/v1/relay" })
  await app.register(pairingRoutes, { prefix: "/v1/pairing" })
  await app.register(deviceRoutes, { prefix: "/v1/devices" })
  await app.register(phoneRoutes, { prefix: "/v1/phone" })
  await app.register(learnRoutes, { prefix: "/v1/learn" })
  await app.register(workspaceRoutes, { prefix: "/v1/workspace" })

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n[server] shutting down...")
    await app.close()
    await closeDb()
    process.exit(0)
  }
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)

  // Start
  try {
    await app.listen({ port: PORT, host: HOST })
    console.log(`[server] listening on ${HOST}:${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
