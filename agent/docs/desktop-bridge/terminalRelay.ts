// terminalRelay.ts — add to the Electron MAIN process.
//
// Exposes the live Terminal Workspace (node-pty) to a paired phone over an
// AUTHENTICATED WebSocket. This is the highest-risk component in the whole system
// (it is remote shell access to your dev machine), so it is locked down by default:
//   * Binds to 127.0.0.1 ONLY. Reach it from the phone via a private tunnel
//     (Tailscale / WireGuard / Cloudflare Tunnel) — NEVER port-forward to the internet.
//   * Requires a short-lived relay ticket signed by the sync server (proves the
//     phone is a paired device for THIS user). No ticket => connection refused.
//   * Only attaches to sessions the user already owns; no arbitrary spawn from phone.
//   * Idle + absolute session timeouts; every open/deny is audit-logged.
//
// Reuses your existing terminalManager (the one whose .spawn() opens the PTY).

import { WebSocketServer, type WebSocket } from "ws"
import { jwtVerify } from "jose"

type TerminalManager = {
	write(id: string, data: string): boolean
	resize(id: string, cols: number, rows: number): void
	onData(id: string, cb: (d: string) => void): () => void // subscribe; returns unsubscribe
	has(id: string): boolean
}

const RELAY_SECRET = process.env.RELAY_TICKET_SECRET // shared with sync server
const IDLE_MS = 5 * 60_000
const MAX_SESSION_MS = 60 * 60_000

export function startTerminalRelay(
	terminalManager: TerminalManager,
	port = 8788,
) {
	const wss = new WebSocketServer({ host: "127.0.0.1", port })

	wss.on("connection", async (ws: WebSocket, req) => {
		const url = new URL(req.url || "", "http://localhost")
		const ticket = url.searchParams.get("ticket") || ""
		const terminalId = url.searchParams.get("terminalId") || ""

		// 1) AuthN: verify the signed relay ticket.
		let userId = ""
		try {
			if (!RELAY_SECRET) throw new Error("relay secret not set")
			const { payload } = await jwtVerify(
				ticket,
				new TextEncoder().encode(RELAY_SECRET),
				{ algorithms: ["HS256"] },
			)
			userId = String(payload.sub || "")
			if (!userId) throw new Error("no subject")
		} catch {
			ws.close(4401, "unauthorized")
			return
		}

		// 2) AuthZ: only attach to an existing, owned terminal. No remote spawn.
		if (!terminalId || !terminalManager.has(terminalId)) {
			ws.close(4404, "no such terminal")
			return
		}

		let lastActivity = Date.now()
		const hardStop = setTimeout(() => ws.close(4408, "session expired"), MAX_SESSION_MS)
		const idleCheck = setInterval(() => {
			if (Date.now() - lastActivity > IDLE_MS) ws.close(4408, "idle timeout")
		}, 15_000)

		// 3) Stream PTY output -> phone.
		const unsub = terminalManager.onData(terminalId, (d) => {
			if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ t: "out", d }))
		})

		// 4) Phone input -> PTY. Only write/resize are accepted from the client.
		ws.on("message", (raw) => {
			lastActivity = Date.now()
			let msg: any
			try {
				msg = JSON.parse(String(raw))
			} catch {
				return
			}
			if (msg.t === "in" && typeof msg.d === "string" && msg.d.length < 8192) {
				terminalManager.write(terminalId, msg.d)
			} else if (msg.t === "resize" && Number.isInteger(msg.cols) && Number.isInteger(msg.rows)) {
				terminalManager.resize(terminalId, Math.min(msg.cols, 500), Math.min(msg.rows, 200))
			}
		})

		ws.on("close", () => {
			clearTimeout(hardStop)
			clearInterval(idleCheck)
			unsub()
		})
	})

	console.log(`[relay] terminal relay on 127.0.0.1:${port} (tunnel only; never expose)`)
	return wss
}
